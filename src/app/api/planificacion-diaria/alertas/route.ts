import { NextRequest, NextResponse } from 'next/server';

interface Alerta {
  id: string;
  tipo: 'DESVIACION' | 'RETRASO' | 'SOBRECUMPLIMIENTO' | 'CLIMA' | 'RECURSOS';
  severidad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  titulo: string;
  descripcion: string;
  fecha: string;
  paqueteId: string;
  clienteNombre: string;
  hectareasAfectadas: number;
  planificacionId: string;
  datosAdicionales: {
    hectareasPlanificadas?: number;
    hectareasEjecutadas?: number;
    desviacion?: number;
    porcentajeCumplimiento?: number;
    observaciones?: string[];
  };
}

export async function GET(request: NextRequest) {
  try {
    console.log('🚨 [ALERTAS] Consultando alertas y desviaciones');
    
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fechaFin = searchParams.get('fechaFin') || new Date().toISOString().split('T')[0];
    const severidadMinima = searchParams.get('severidad') || 'BAJA';
    
    console.log('📅 [ALERTAS] Parámetros de consulta:', {
      fechaInicio,
      fechaFin,
      severidadMinima
    });

    const airtableApiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    if (!airtableApiKey || !baseId) {
      throw new Error('Configuración de Airtable faltante');
    }

    // 1. Consultar planificación diaria con problemas
    const alertas = await consultarAlertas(baseId, airtableApiKey, fechaInicio, fechaFin);
    
    // 2. Calcular estadísticas generales
    const estadisticas = calcularEstadisticas(alertas);
    
    // 3. Filtrar por severidad
    const alertasFiltradas = alertas.filter(alerta => {
      const severidades = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
      const indiceSeveridad = severidades.indexOf(alerta.severidad);
      const indiceMinimo = severidades.indexOf(severidadMinima as any);
      return indiceSeveridad >= indiceMinimo;
    });

    console.log('✅ [ALERTAS] Alertas procesadas:', {
      totalAlertas: alertas.length,
      alertasFiltradas: alertasFiltradas.length,
      alertasCriticas: alertas.filter(a => a.severidad === 'CRITICA').length,
      alertasAltas: alertas.filter(a => a.severidad === 'ALTA').length
    });

    return NextResponse.json({
      alertas: alertasFiltradas.sort((a, b) => {
        // Ordenar por severidad y luego por fecha
        const severidades = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
        const severidadA = severidades.indexOf(a.severidad);
        const severidadB = severidades.indexOf(b.severidad);
        
        if (severidadA !== severidadB) {
          return severidadB - severidadA; // Mayor severidad primero
        }
        
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime(); // Más reciente primero
      }),
      estadisticas,
      filtros: {
        fechaInicio,
        fechaFin,
        severidadMinima,
        totalResultados: alertasFiltradas.length
      }
    });

  } catch (error) {
    console.error('❌ [ALERTAS] Error:', error);
    return NextResponse.json({
      error: 'Error al consultar alertas',
      details: error instanceof Error ? error.message : 'Error desconocido',
      alertas: [],
      estadisticas: {}
    }, { status: 500 });
  }
}

async function consultarAlertas(baseId: string, apiKey: string, fechaInicio: string, fechaFin: string): Promise<Alerta[]> {
  const alertas: Alerta[] = [];

  try {
    // Consultar planificación diaria en el rango de fechas
    const filterFormula = encodeURIComponent(
      `AND(IS_AFTER({Fecha Programada}, "${fechaInicio}"), IS_BEFORE({Fecha Programada}, "${fechaFin}"))`
    );
    
    const planificacionUrl = `https://api.airtable.com/v0/${baseId}/Planificacion%20Diaria%20Aplicacion?filterByFormula=${filterFormula}`;
    
    const response = await fetch(planificacionUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error consultando planificación: ${response.status}`);
    }

    const data = await response.json();
    const registros = data.records || [];

    console.log('📊 [ALERTAS] Registros de planificación encontrados:', registros.length);

    // Obtener información adicional de paquetes y clientes
    const paquetesInfo = await obtenerInformacionPaquetes(baseId, apiKey, registros);

    // Analizar cada registro para generar alertas
    for (const registro of registros) {
      const hectareasPlanificadas = registro.fields['Hectareas Planificadas'] || 0;
      const hectareasEjecutadas = registro.fields['Hectareas Ejecutadas'] || 0;
      const estado = registro.fields['Estado'] || 'PROGRAMADA';
      const fecha = registro.fields['Fecha Programada'] || registro.fields['Fecha Ejecucion'];
      const desviacion = hectareasEjecutadas - hectareasPlanificadas;
      const porcentajeCumplimiento = hectareasPlanificadas > 0 ? (hectareasEjecutadas / hectareasPlanificadas) * 100 : 0;
      const observaciones = (registro.fields['Observaciones Ejecucion'] || '').split(';').filter(Boolean);
      
      // Obtener información del paquete
      const eventoId = registro.fields['Aplicacion Evento ID']?.[0];
      const paqueteInfo = eventoId ? paquetesInfo[eventoId] : null;

      // Generar alertas según criterios
      const alertasRegistro = generarAlertasParaRegistro({
        registroId: registro.id,
        fecha,
        hectareasPlanificadas,
        hectareasEjecutadas,
        desviacion,
        porcentajeCumplimiento,
        estado,
        observaciones,
        paqueteInfo
      });

      alertas.push(...alertasRegistro);
    }

  } catch (error) {
    console.error('❌ [ALERTAS] Error consultando alertas:', error);
  }

  return alertas;
}

async function obtenerInformacionPaquetes(baseId: string, apiKey: string, registros: any[]): Promise<Record<string, any>> {
  const eventosIds = registros
    .map(r => r.fields['Aplicacion Evento ID']?.[0])
    .filter(Boolean);

  if (eventosIds.length === 0) return {};

  try {
    const filterFormula = encodeURIComponent(`OR(${eventosIds.map(id => `RECORD_ID() = "${id}"`).join(',')})`);
    const eventosUrl = `https://api.airtable.com/v0/${baseId}/Aplicaciones%20Eventos?filterByFormula=${filterFormula}`;
    
    const eventosResponse = await fetch(eventosUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!eventosResponse.ok) return {};

    const eventosData = await eventosResponse.json();
    const eventos = eventosData.records || [];

    // Obtener información de paquetes
    const paquetesIds = eventos
      .map((e: Record<string, any>) => e.fields['Paquete Aplicacion']?.[0])
      .filter(Boolean);

    let paquetesData: any[] = [];
    
    if (paquetesIds.length > 0) {
      const paquetesFilter = encodeURIComponent(`OR(${paquetesIds.map((id: string) => `RECORD_ID() = "${id}"`).join(',')})`);
      const paquetesUrl = `https://api.airtable.com/v0/${baseId}/Paquete%20Aplicaciones?filterByFormula=${paquetesFilter}`;
      
      const paquetesResponse = await fetch(paquetesUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (paquetesResponse.ok) {
        const paquetesResult = await paquetesResponse.json();
        paquetesData = paquetesResult.records || [];
      }
    }

    // Mapear información
    const resultado: Record<string, any> = {};
    
    for (const evento of eventos) {
      const paqueteId = evento.fields['Paquete Aplicacion']?.[0];
      const paquete = paquetesData.find(p => p.id === paqueteId);
      
      resultado[evento.id] = {
        eventoId: evento.id,
        paqueteId,
        paqueteNombre: paquete?.fields['Nombre Paquete'] || 'Paquete desconocido',
        clienteNombre: 'Cliente no disponible', // Requeriría consulta adicional
        cultivo: evento.fields['Cultivo'] || 'Sin especificar',
        formula: evento.fields['Formula Aplicacion'] || ''
      };
    }

    return resultado;

  } catch (error) {
    console.error('❌ [ALERTAS] Error obteniendo información de paquetes:', error);
    return {};
  }
}

function generarAlertasParaRegistro(params: {
  registroId: string;
  fecha: string;
  hectareasPlanificadas: number;
  hectareasEjecutadas: number;
  desviacion: number;
  porcentajeCumplimiento: number;
  estado: string;
  observaciones: string[];
  paqueteInfo: any;
}): Alerta[] {
  const alertas: Alerta[] = [];
  const { registroId, fecha, hectareasPlanificadas, hectareasEjecutadas, desviacion, porcentajeCumplimiento, estado, observaciones, paqueteInfo } = params;

  // Alerta por desviación significativa
  if (Math.abs(desviacion) > 5) {
    const severidad = Math.abs(desviacion) > 15 ? 'ALTA' : Math.abs(desviacion) > 10 ? 'MEDIA' : 'BAJA';
    alertas.push({
      id: `${registroId}_desviacion`,
      tipo: 'DESVIACION',
      severidad,
      titulo: `Desviación de ${Math.abs(desviacion).toFixed(1)} Ha`,
      descripcion: `${desviacion > 0 ? 'Sobrecumplimiento' : 'Déficit'} de ${Math.abs(desviacion).toFixed(1)} hectáreas respecto a lo planificado`,
      fecha,
      paqueteId: paqueteInfo?.paqueteId || '',
      clienteNombre: paqueteInfo?.clienteNombre || 'Cliente no disponible',
      hectareasAfectadas: Math.abs(desviacion),
      planificacionId: registroId,
      datosAdicionales: {
        hectareasPlanificadas,
        hectareasEjecutadas,
        desviacion,
        porcentajeCumplimiento,
        observaciones
      }
    });
  }

  // Alerta por bajo cumplimiento
  if (porcentajeCumplimiento < 80 && hectareasEjecutadas > 0) {
    const severidad = porcentajeCumplimiento < 50 ? 'CRITICA' : porcentajeCumplimiento < 70 ? 'ALTA' : 'MEDIA';
    alertas.push({
      id: `${registroId}_bajo_cumplimiento`,
      tipo: 'RETRASO',
      severidad,
      titulo: `Cumplimiento bajo: ${porcentajeCumplimiento.toFixed(1)}%`,
      descripcion: `Solo se ejecutaron ${hectareasEjecutadas} Ha de las ${hectareasPlanificadas} Ha planificadas`,
      fecha,
      paqueteId: paqueteInfo?.paqueteId || '',
      clienteNombre: paqueteInfo?.clienteNombre || 'Cliente no disponible',
      hectareasAfectadas: hectareasPlanificadas - hectareasEjecutadas,
      planificacionId: registroId,
      datosAdicionales: {
        hectareasPlanificadas,
        hectareasEjecutadas,
        desviacion,
        porcentajeCumplimiento,
        observaciones
      }
    });
  }

  // Alerta por sobrecumplimiento excesivo
  if (porcentajeCumplimiento > 120) {
    alertas.push({
      id: `${registroId}_sobrecumplimiento`,
      tipo: 'SOBRECUMPLIMIENTO',
      severidad: 'MEDIA',
      titulo: `Sobrecumplimiento: ${porcentajeCumplimiento.toFixed(1)}%`,
      descripcion: `Se ejecutaron ${hectareasEjecutadas} Ha cuando se planificaron ${hectareasPlanificadas} Ha - revisar planificación`,
      fecha,
      paqueteId: paqueteInfo?.paqueteId || '',
      clienteNombre: paqueteInfo?.clienteNombre || 'Cliente no disponible',
      hectareasAfectadas: hectareasEjecutadas - hectareasPlanificadas,
      planificacionId: registroId,
      datosAdicionales: {
        hectareasPlanificadas,
        hectareasEjecutadas,
        desviacion,
        porcentajeCumplimiento,
        observaciones
      }
    });
  }

  // Alerta por condiciones climáticas
  const tieneProblemasClimaticos = observaciones.some(obs => 
    obs.toLowerCase().includes('lluvia') || 
    obs.toLowerCase().includes('clima') || 
    obs.toLowerCase().includes('retraso')
  );
  
  if (tieneProblemasClimaticos) {
    alertas.push({
      id: `${registroId}_clima`,
      tipo: 'CLIMA',
      severidad: 'BAJA',
      titulo: 'Afectación climática reportada',
      descripcion: 'Retrasos o modificaciones por condiciones climáticas adversas',
      fecha,
      paqueteId: paqueteInfo?.paqueteId || '',
      clienteNombre: paqueteInfo?.clienteNombre || 'Cliente no disponible',
      hectareasAfectadas: 0,
      planificacionId: registroId,
      datosAdicionales: {
        hectareasPlanificadas,
        hectareasEjecutadas,
        desviacion,
        porcentajeCumplimiento,
        observaciones
      }
    });
  }

  // Alerta por estado atrasado
  if (estado === 'ATRASADA') {
    alertas.push({
      id: `${registroId}_atrasado`,
      tipo: 'RETRASO',
      severidad: 'ALTA',
      titulo: 'Aplicación atrasada',
      descripcion: 'La aplicación está marcada como atrasada respecto a la planificación original',
      fecha,
      paqueteId: paqueteInfo?.paqueteId || '',
      clienteNombre: paqueteInfo?.clienteNombre || 'Cliente no disponible',
      hectareasAfectadas: hectareasPlanificadas,
      planificacionId: registroId,
      datosAdicionales: {
        hectareasPlanificadas,
        hectareasEjecutadas,
        desviacion,
        porcentajeCumplimiento,
        observaciones
      }
    });
  }

  return alertas;
}

function calcularEstadisticas(alertas: Alerta[]) {
  return {
    totalAlertas: alertas.length,
    porSeveridad: {
      criticas: alertas.filter(a => a.severidad === 'CRITICA').length,
      altas: alertas.filter(a => a.severidad === 'ALTA').length,
      medias: alertas.filter(a => a.severidad === 'MEDIA').length,
      bajas: alertas.filter(a => a.severidad === 'BAJA').length
    },
    porTipo: {
      desviacion: alertas.filter(a => a.tipo === 'DESVIACION').length,
      retraso: alertas.filter(a => a.tipo === 'RETRASO').length,
      sobrecumplimiento: alertas.filter(a => a.tipo === 'SOBRECUMPLIMIENTO').length,
      clima: alertas.filter(a => a.tipo === 'CLIMA').length,
      recursos: alertas.filter(a => a.tipo === 'RECURSOS').length
    },
    hectareasAfectadas: alertas.reduce((sum, a) => sum + a.hectareasAfectadas, 0),
    clientesAfectados: [...new Set(alertas.map(a => a.clienteNombre))].length,
    paquetesAfectados: [...new Set(alertas.map(a => a.paqueteId))].filter(Boolean).length
  };
}