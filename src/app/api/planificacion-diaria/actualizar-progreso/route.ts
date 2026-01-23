import { NextRequest, NextResponse } from 'next/server';
import { debugLog, debugError } from '@/lib/debug';

interface ActualizacionProgreso {
  paqueteId: string;
  clienteId: string;
  fecha: string;
  hectareasEjecutadas: number;
  tractores: Array<{
    numero: number;
    operador: string;
    lotes: Array<{
      codigo: string;
      hectareas: number;
    }>;
    totalHectareas: number;
  }>;
  productos: Array<{
    nombre: string;
    cantidad: number;
    unidad: string;
  }>;
  observaciones: string[];
  horaInicio: string;
  horaSalida: string;
  mensajeOriginal?: string; // Mensaje de campo original
}

export async function POST(request: NextRequest) {
  try {
    debugLog('🔄 [ACTUALIZAR-PROGRESO] Inicio de actualización de progreso');
    
    const datos: ActualizacionProgreso = await request.json();
    
    debugLog('📥 [ACTUALIZAR-PROGRESO] Datos recibidos:', {
      paqueteId: datos.paqueteId,
      clienteId: datos.clienteId,
      fecha: datos.fecha,
      hectareasEjecutadas: datos.hectareasEjecutadas,
      cantidadTractores: datos.tractores?.length || 0
    });

    if (!datos.paqueteId || !datos.fecha || datos.hectareasEjecutadas === undefined || datos.hectareasEjecutadas === null) {
      console.error('❌ [ACTUALIZAR-PROGRESO] Validación fallida:', {
        tienePaqueteId: !!datos.paqueteId,
        tieneFecha: !!datos.fecha,
        tieneHectareas: datos.hectareasEjecutadas !== undefined && datos.hectareasEjecutadas !== null
      });
      return NextResponse.json({
        error: 'Datos incompletos: se requiere paqueteId, fecha y hectareasEjecutadas'
      }, { status: 400 });
    }

    const airtableApiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    if (!airtableApiKey || !baseId) {
      throw new Error('Configuración de Airtable faltante');
    }

    // 1. Buscar el registro de planificación diaria correspondiente (OPCIONAL)
    const planificacionRecord = await buscarPlanificacionDiaria(
      baseId, 
      airtableApiKey, 
      datos.paqueteId, 
      datos.fecha
    );

    // 2. Inicializar variables de métricas
    let hectareasPlanificadas = 0;
    let diaNumero = 1;
    let aplicacionEventoId: string | null = null;

    if (planificacionRecord) {
      hectareasPlanificadas = planificacionRecord.fields['Hectareas Objetivo'] || 0;
      diaNumero = planificacionRecord.fields['Dia Numero'] || 1;
      aplicacionEventoId = planificacionRecord.fields['Aplicacion Evento']?.[0] || null;
      
      debugLog('📋 [ACTUALIZAR-PROGRESO] Planificación encontrada:', {
        id: planificacionRecord.id,
        hectareasObjetivo: hectareasPlanificadas,
        diaNumero,
        aplicacionEvento: aplicacionEventoId
      });
    } else {
      // Sin planificación previa, usar valores por defecto
      hectareasPlanificadas = datos.hectareasEjecutadas; // Asumir que se ejecutó lo planificado
      debugLog('⚠️ [ACTUALIZAR-PROGRESO] Sin planificación previa, usando valores por defecto');
    }

    // 3. Buscar evento de aplicación si no se encontró en planificación
    if (!aplicacionEventoId) {
      aplicacionEventoId = await buscarEventoAplicacion(baseId, airtableApiKey, datos.paqueteId, datos.fecha);
      if (aplicacionEventoId) {
        debugLog('🎯 [ACTUALIZAR-PROGRESO] Evento de aplicación encontrado directamente:', aplicacionEventoId);
      } else {
        debugLog('⚠️ [ACTUALIZAR-PROGRESO] No se encontró evento de aplicación');
      }
    } else {
      debugLog('✅ [ACTUALIZAR-PROGRESO] Usando evento de aplicación de planificación:', aplicacionEventoId);
    }

    // 4. Calcular métricas finales

    const desviacion = datos.hectareasEjecutadas - hectareasPlanificadas;
    const porcentajeCumplimiento = hectareasPlanificadas > 0 
      ? (datos.hectareasEjecutadas / hectareasPlanificadas) * 100 
      : 100; // Si no hay planificación, asumir 100%
    
    // 3. Determinar estado del día
    let estadoDia = 'Parcial';
    if (porcentajeCumplimiento >= 95) {
      estadoDia = 'Completado';
    } else if (porcentajeCumplimiento === 0) {
      estadoDia = 'No Trabajado';
    }

    debugLog('📝 [ACTUALIZAR-PROGRESO] Calculando métricas:', {
      hectareasEjecutadas: datos.hectareasEjecutadas,
      hectareasPlanificadas,
      desviacion,
      porcentajeCumplimiento: Math.round(porcentajeCumplimiento),
      estadoDia
    });

    // 4. Crear registro en Mensajes Aplicacion primero (necesitamos el ID para el seguimiento)
    let mensajeId: string | null = null;
    if (datos.mensajeOriginal) {
      mensajeId = await crearMensajeAplicacion(
        baseId,
        airtableApiKey,
        datos.mensajeOriginal
      );
    }

    // 5. Crear registro de seguimiento en Seguimiento Diario Aplicacion
    debugLog('🚀 [ACTUALIZAR-PROGRESO] Creando seguimiento con datos:', {
      fecha: datos.fecha,
      diaNumero,
      hectareasPlanificadas,
      hectareasEjecutadas: datos.hectareasEjecutadas,
      estadoDia,
      aplicacionEventoId,
      mensajeId,
      tieneAplicacionEvento: !!aplicacionEventoId
    });
    
    const seguimientoId = await crearRegistroSeguimiento(
      baseId,
      airtableApiKey,
      datos.fecha,
      diaNumero,
      hectareasPlanificadas,
      datos.hectareasEjecutadas,
      estadoDia,
      datos.observaciones.join('; '),
      datos.tractores,
      aplicacionEventoId || undefined, // Convert null to undefined
      mensajeId
    );

    debugLog('✅ [ACTUALIZAR-PROGRESO] Registros creados:', { 
      mensajeId, 
      seguimientoId 
    });
    
    // 🔥 5.5. NUEVA FUNCIONALIDAD: Procesar lotes trabajados
    let lotesTrabajadasIds: string[] = [];
    let seguimientoLotesIds: string[] = [];
    
    if (seguimientoId && datos.tractores && datos.tractores.length > 0) {
      debugLog('🌱 [LOTES] Iniciando procesamiento de lotes trabajados');
      
      // Extraer todos los lotes de los tractores
      const lotesProgreso = extraerLotesDetractores(datos.tractores);
      
      if (lotesProgreso.length > 0) {
        // Buscar IDs de lotes en Cultivos Lotes Aplicaciones
        const nombresLotes = lotesProgreso.map(lp => lp.codigo);
        const lotesEncontrados = await buscarLotesEnAirtable(baseId, airtableApiKey, nombresLotes);
        
        // Obtener IDs para vincular con seguimiento diario
        lotesTrabajadasIds = lotesEncontrados.map(l => l.recordId);
        
        // Crear registros detallados en Seguimiento Lotes Aplicaciones
        seguimientoLotesIds = await actualizarProgresoLotes(
          baseId,
          airtableApiKey, 
          lotesProgreso,
          seguimientoId,
          datos.fecha
        );
        
        debugLog('📊 [LOTES] Resumen procesamiento:', {
          lotesExtraidos: lotesProgreso.length,
          lotesEncontradosEnBD: lotesEncontrados.length,
          seguimientoLotesCreados: seguimientoLotesIds.length
        });
        
        // Actualizar el seguimiento diario con las relaciones de lotes
        if (lotesTrabajadasIds.length > 0 || seguimientoLotesIds.length > 0) {
          await actualizarSeguimientoConLotes(
            baseId,
            airtableApiKey,
            seguimientoId,
            lotesTrabajadasIds,
            seguimientoLotesIds
          );
        }
      } else {
        debugLog('⚠️ [LOTES] No se encontraron lotes en los datos de tractores');
      }
    }
    
    // 6. Actualizar el mensaje con la relación al seguimiento
    if (mensajeId && seguimientoId) {
      await actualizarMensajeConSeguimiento(
        baseId,
        airtableApiKey,
        mensajeId,
        seguimientoId
      );
    }

    // 7. Generar alertas si hay desviaciones significativas
    const alertas = [];
    if (desviacion > hectareasPlanificadas * 0.2) {
      alertas.push({
        tipo: 'EXCESO',
        mensaje: `Se ejecutaron ${desviacion.toFixed(2)} Ha más de lo planificado`,
        severidad: 'INFO'
      });
    } else if (desviacion < -hectareasPlanificadas * 0.2) {
      alertas.push({
        tipo: 'DEFICIT',
        mensaje: `Faltan ${Math.abs(desviacion).toFixed(2)} Ha por ejecutar`,
        severidad: 'ADVERTENCIA'
      });
    }

    return NextResponse.json({
      success: true,
      seguimientoId,
      mensajeId,
      planificacionId: planificacionRecord?.id || null,
      metricas: {
        hectareasPlanificadas,
        hectareasEjecutadas: datos.hectareasEjecutadas,
        desviacion,
        porcentajeCumplimiento: Math.round(porcentajeCumplimiento),
        estadoDia,
        tienePlanificacionPrevia: !!planificacionRecord
      },
      lotes: {
        lotesTrabajadasIds: lotesTrabajadasIds.length,
        seguimientoLotesIds: seguimientoLotesIds.length,
        procesamientoExitoso: (lotesTrabajadasIds.length > 0 || seguimientoLotesIds.length > 0)
      },
      alertas,
      message: `Seguimiento creado: ${datos.hectareasEjecutadas} Ha ejecutadas${planificacionRecord ? ` vs ${hectareasPlanificadas} Ha planificadas` : ' (sin planificación previa)'}. ${lotesTrabajadasIds.length} lotes vinculados.`
    });

  } catch (error) {
    console.error('❌ [ACTUALIZAR-PROGRESO] Error:', error);
    return NextResponse.json({
      error: 'Error al actualizar progreso de planificación',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

async function buscarPlanificacionDiaria(baseId: string, apiKey: string, paqueteId: string, fecha: string) {
  try {
    debugLog('🔍 [BUSCAR-PLANIFICACION] Búsqueda directa por fecha:', { fecha, paqueteId });
    
    // Convertir fecha de YYYY-MM-DD a formato que pueda comparar con Airtable
    // Airtable puede almacenar como "26/1/2026" entonces necesitamos usar DATESTR o IS_SAME
    const fechaObj = new Date(fecha);
    // Using date parts for potential future enhancements
    console.log('📅 [BUSCAR-PLANIFICACION] Buscando planificación para fecha:', fecha);
    
    // Usar IS_SAME para comparar fechas ignorando formato
    const filterPlanificacion = encodeURIComponent(
      `IS_SAME({Fecha Planificada}, DATETIME_PARSE("${fecha}", "YYYY-MM-DD"), "day")`
    );
    
    const planificacionUrl = `https://api.airtable.com/v0/${baseId}/Planificacion%20Diaria%20Aplicacion?filterByFormula=${filterPlanificacion}`;
    
    debugLog('🌐 [BUSCAR-PLANIFICACION] URL directa:', planificacionUrl);
    debugLog('🔎 [BUSCAR-PLANIFICACION] Filtro:', decodeURIComponent(filterPlanificacion));
    
    const planificacionResponse = await fetch(planificacionUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!planificacionResponse.ok) {
      const errorText = await planificacionResponse.text();
      console.error('❌ [BUSCAR-PLANIFICACION] Error planificación:', errorText);
      throw new Error(`Error consultando planificación: ${planificacionResponse.status} - ${errorText}`);
    }

    const planificacionData = await planificacionResponse.json();
    const registros = planificacionData.records || [];
    
    console.log('📊 [BUSCAR-PLANIFICACION] Respuesta de Airtable:', {
      status: planificacionResponse.status,
      cantidadRegistros: registros.length,
      registros: registros.map((r: any) => ({
        id: r.id,
        fechaPlanificada: r.fields['Fecha Planificada'],
        hectareasObjetivo: r.fields['Hectareas Objetivo'],
        diaNumero: r.fields['Dia Numero'],
        aplicacionEvento: r.fields['Aplicacion Evento']
      }))
    });
    
    if (registros.length === 0) {
      debugLog('⚠️ [BUSCAR-PLANIFICACION] No hay planificación para fecha:', fecha);
      return null;
    }
    
    // Si hay múltiples registros, tomar el primero
    const planificacion = registros[0];
    
    console.log('✅ [BUSCAR-PLANIFICACION] Planificación encontrada:', {
      id: planificacion.id,
      fecha: planificacion.fields['Fecha Planificada'],
      hectareas: planificacion.fields['Hectareas Objetivo'],
      diaNumero: planificacion.fields['Dia Numero']
    });
    
    return planificacion;

  } catch (error) {
    console.error('❌ [BUSCAR-PLANIFICACION] Error:', error);
    return null;
  }
}

async function crearRegistroSeguimiento(
  baseId: string, 
  apiKey: string,
  fechaReporte: string,
  diaSecuencia: number,
  hectareasPlanificadas: number,
  hectareasReales: number,
  estadoDia: string,
  observaciones: string,
  tractores: any[],
  aplicacionEventoId: string | undefined,
  mensajeId: string | null
): Promise<string | null> {
  try {
    console.log('📊 [SEGUIMIENTO] Creando registro de seguimiento detallado');
    
    // Determinar responsable del reporte (primer operador)
    const responsable = tractores[0]?.operador || 'Sin especificar';
    
    // Crear registro en Seguimiento Diario Aplicacion
    const seguimientoUrl = `https://api.airtable.com/v0/${baseId}/Seguimiento%20Diario%20Aplicacion`;
    
    const registroSeguimiento: Record<string, any> = {
      fields: {
        'Fecha Reporte': fechaReporte,
        'Dia Secuencia': diaSecuencia,
        'Hectareas Planificadas': hectareasPlanificadas,
        'Hectareas Reales': hectareasReales,
        'Estado Dia': estadoDia,
        'Responsable': responsable,
        'Condiciones': 'Óptimas' // Por defecto, se puede mejorar con análisis
      }
    };
    
    // Agregar campos opcionales
    if (observaciones) {
      registroSeguimiento.fields['Observaciones'] = observaciones;
    }
    
    if (aplicacionEventoId) {
      registroSeguimiento.fields['Aplicacion Evento'] = [aplicacionEventoId];
      console.log('🔗 [SEGUIMIENTO] ✅ Vinculando con Aplicacion Evento:', aplicacionEventoId);
      debugLog('🔗 [SEGUIMIENTO] ✅ Aplicacion Evento vinculada:', aplicacionEventoId);
    } else {
      console.log('⚠️ [SEGUIMIENTO] Sin Aplicacion Evento para vincular - valor recibido:', aplicacionEventoId);
      debugLog('⚠️ [SEGUIMIENTO] Sin Aplicacion Evento - debugging:', {
        aplicacionEventoId,
        tipo: typeof aplicacionEventoId,
        esNull: aplicacionEventoId === null,
        esUndefined: aplicacionEventoId === undefined,
        esFalsy: !aplicacionEventoId
      });
    }
    
    if (mensajeId) {
      registroSeguimiento.fields['Mensajes Aplicacion'] = [mensajeId];
    }
    
    console.log('📤 [SEGUIMIENTO] Enviando datos:', {
      ...registroSeguimiento,
      tieneAplicacionEvento: !!aplicacionEventoId,
      aplicacionEventoId
    });

    const response = await fetch(seguimientoUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registroSeguimiento)
    });

    if (response.ok) {
      const registro = await response.json();
      console.log('✅ [SEGUIMIENTO] Registro creado:', registro.id);
      return registro.id;
    } else {
      const errorText = await response.text();
      console.log('⚠️ [SEGUIMIENTO] Error al crear registro:', errorText);
      return null;
    }

  } catch (error) {
    console.log('⚠️ [SEGUIMIENTO] Error creando registro de seguimiento:', error);
    return null;
  }
}

// Función para crear registro en Mensajes Aplicacion
async function crearMensajeAplicacion(
  baseId: string,
  apiKey: string,
  mensajeOriginal: string
): Promise<string | null> {
  try {
    console.log('💬 [MENSAJE-APLICACION] Creando registro de mensaje original');
    
    const mensajeUrl = `https://api.airtable.com/v0/${baseId}/Mensajes%20Aplicacion`;
    
    const registroMensaje = {
      fields: {
        'Mensaje Aplicacion': mensajeOriginal
      }
    };
    
    const response = await fetch(mensajeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registroMensaje)
    });
    
    if (response.ok) {
      const mensaje = await response.json();
      console.log('✅ [MENSAJE-APLICACION] Mensaje creado:', mensaje.id);
      return mensaje.id;
    } else {
      const errorText = await response.text();
      console.log('⚠️ [MENSAJE-APLICACION] Error creando mensaje:', errorText);
      return null;
    }
  } catch (error) {
    console.log('⚠️ [MENSAJE-APLICACION] Error:', error);
    return null;
  }
}

// Función para actualizar mensaje con relación al seguimiento
async function actualizarMensajeConSeguimiento(
  baseId: string,
  apiKey: string,
  mensajeId: string,
  seguimientoId: string
): Promise<void> {
  try {
    console.log('🔗 [MENSAJE-APLICACION] Vinculando mensaje con seguimiento');
    
    const mensajeUrl = `https://api.airtable.com/v0/${baseId}/Mensajes%20Aplicacion/${mensajeId}`;
    
    const response = await fetch(mensajeUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Seguimiento Diario Aplicacion': [seguimientoId]
        }
      })
    });
    
    if (response.ok) {
      console.log('✅ [MENSAJE-APLICACION] Mensaje vinculado con seguimiento');
    } else {
      const errorText = await response.text();
      console.log('⚠️ [MENSAJE-APLICACION] Error vinculando mensaje:', errorText);
    }
  } catch (error) {
    console.log('⚠️ [MENSAJE-APLICACION] Error:', error);
  }
}

// TODO: Implement alerts system when needed
/*
async function generarAlertasSiNecesario(
  datos: ActualizacionProgreso,
  desviacion: number,
  porcentajeCumplimiento: number
): Promise<string[]> {
  const alertas: string[] = [];

  // Alerta por desviación significativa
  if (Math.abs(desviacion) > 5) {
    alertas.push(`Desviación significativa: ${desviacion > 0 ? '+' : ''}${desviacion.toFixed(1)} Ha`);
  }

  // Alerta por bajo cumplimiento
  if (porcentajeCumplimiento < 80) {
    alertas.push(`Cumplimiento bajo: ${porcentajeCumplimiento.toFixed(1)}%`);
  }

  // Alerta por retrasos
  if (datos.observaciones.some(obs => obs.toLowerCase().includes('lluvia') || obs.toLowerCase().includes('retraso'))) {
    alertas.push('Retrasos por condiciones climáticas reportados');
  }

  // Alerta por sobrecumplimiento
  if (porcentajeCumplimiento > 120) {
    alertas.push(`Sobrecumplimiento: ${porcentajeCumplimiento.toFixed(1)}% - revisar planificación`);
  }

  return alertas;
}
*/

// 🔧 NUEVAS FUNCIONES PARA MANEJO DE LOTES

interface LoteMatch {
  nombreLote: string;
  idLote: string;
  recordId: string;
  hectareasLote?: number;
}

interface LoteProgreso {
  codigo: string;
  hectareas: number;
  operador?: string;
}

/**
 * 1️⃣ Función de Búsqueda de Lotes en Cultivos Lotes Aplicaciones
 */
async function buscarLotesEnAirtable(
  baseId: string, 
  apiKey: string, 
  nombresLotes: string[]
): Promise<LoteMatch[]> {
  try {
    debugLog('🔍 [BUSCAR-LOTES] Iniciando búsqueda:', { nombresLotes });

    const lotesEncontrados: LoteMatch[] = [];
    const nombresNormalizados = nombresLotes.map(nombre => normalizarNombreLote(nombre));
    
    debugLog('📝 [BUSCAR-LOTES] Nombres normalizados:', { nombresNormalizados });

    // Procesar en lotes de 10 para evitar URLs muy largas
    for (let i = 0; i < nombresNormalizados.length; i += 10) {
      const lotesBatch = nombresNormalizados.slice(i, i + 10);
      
      // Crear filtro OR para buscar múltiples nombres
      const filtros = lotesBatch.map(nombre => `{Nombre Lote} = '${nombre}'`);
      const filterFormula = `OR(${filtros.join(', ')})`;
      
      const url = `https://api.airtable.com/v0/${baseId}/Cultivos%20Lotes%20Aplicaciones`;
      const response = await fetch(`${url}?filterByFormula=${encodeURIComponent(filterFormula)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        for (const record of data.records || []) {
          const nombreLote = record.fields['Nombre Lote'] || '';
          const idLote = record.fields['ID Lote'] || '';
          const hectareasLote = record.fields['Hectareas Lotes'] || 0;
          
          if (nombreLote && idLote) {
            lotesEncontrados.push({
              nombreLote,
              idLote,
              recordId: record.id,
              hectareasLote
            });
            
            debugLog(`✅ [BUSCAR-LOTES] Encontrado: ${nombreLote} → ${idLote}`);
          }
        }
      } else {
        debugError(`⚠️ [BUSCAR-LOTES] Error en batch ${i}:`, await response.text());
      }
    }

    debugLog('📊 [BUSCAR-LOTES] Resumen:', {
      buscados: nombresLotes.length,
      encontrados: lotesEncontrados.length,
      porcentajeExito: ((lotesEncontrados.length / nombresLotes.length) * 100).toFixed(1) + '%'
    });

    return lotesEncontrados;
    
  } catch (error) {
    debugError('❌ [BUSCAR-LOTES] Error:', error);
    return [];
  }
}

/**
 * 2️⃣ Normalizar nombres de lotes de WhatsApp a formato BD
 */
function normalizarNombreLote(nombreWhatsApp: string): string {
  // Ejemplo: "B 1 P 1-2" → "B.1-P.1-2" 
  let nombre = nombreWhatsApp.trim()
    .replace(/\s+/g, '') // Quitar espacios
    .replace(/–/g, '-')  // Normalizar guiones
    .toUpperCase();

  // Aplicar formato estándar: B.X-P.X
  const match = nombre.match(/B(\d+).*?P(\d+(?:-\d+)?)/);
  if (match) {
    const bloque = match[1];
    const parcela = match[2];
    nombre = `B.${bloque}-P.${parcela}`;
  }

  debugLog('🔧 [NORMALIZAR]:', { original: nombreWhatsApp, normalizado: nombre });
  return nombre;
}

/**
 * 3️⃣ Actualizar/Crear registros de progreso por lote
 */
async function actualizarProgresoLotes(
  baseId: string,
  apiKey: string,
  lotesProgreso: LoteProgreso[],
  seguimientoDiarioId: string,
  fecha: string
): Promise<string[]> {
  try {
    debugLog('📈 [PROGRESO-LOTES] Iniciando:', {
      cantidadLotes: lotesProgreso.length,
      seguimientoDiarioId,
      fecha
    });

    // Buscar lotes en BD
    const nombresLotes = lotesProgreso.map(lp => lp.codigo);
    const lotesEncontrados = await buscarLotesEnAirtable(baseId, apiKey, nombresLotes);
    
    if (lotesEncontrados.length === 0) {
      debugError('⚠️ [PROGRESO-LOTES] No se encontraron lotes en la BD');
      return [];
    }

    // Crear registros para Seguimiento Lotes Aplicaciones
    const seguimientoLotesIds: string[] = [];
    const registrosParaCrear = [];

    for (const loteProgreso of lotesProgreso) {
      const loteMatch = lotesEncontrados.find(l => 
        normalizarNombreLote(l.nombreLote) === normalizarNombreLote(loteProgreso.codigo)
      );

      if (loteMatch) {
        const registroSeguimientoLote = {
          fields: {
            'Nombre Cultivo Lote': loteMatch.nombreLote,
            'ID Lote': loteMatch.idLote,
            'Hectareas Lotes': loteMatch.hectareasLote || 0,
            'Hectareas Completadas': loteProgreso.hectareas,
            'Estado Lote': loteProgreso.hectareas >= (loteMatch.hectareasLote || 0) ? 'Completado' : 'En Proceso',
            'Fecha Inicio Lote': fecha,
            'Fecha Fin Lote': fecha,
            'Seguimiento Diario Aplicacion': [seguimientoDiarioId]
          }
        };

        registrosParaCrear.push(registroSeguimientoLote);
        debugLog(`✅ [PROGRESO-LOTES] Preparado: ${loteMatch.nombreLote}`);
      }
    }

    // Crear en lotes de 10
    for (let i = 0; i < registrosParaCrear.length; i += 10) {
      const batch = registrosParaCrear.slice(i, i + 10);
      
      const url = `https://api.airtable.com/v0/${baseId}/Seguimiento%20Lotes%20Aplicaciones`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ records: batch })
      });

      if (response.ok) {
        const data = await response.json();
        const nuevosIds = data.records?.map((r: any) => r.id) || [];
        seguimientoLotesIds.push(...nuevosIds);
        
        debugLog(`✅ [PROGRESO-LOTES] Batch creado: ${nuevosIds.length} registros`);
      } else {
        debugError('❌ [PROGRESO-LOTES] Error:', await response.text());
      }
    }

    return seguimientoLotesIds;

  } catch (error) {
    debugError('❌ [PROGRESO-LOTES] Error:', error);
    return [];
  }
}

/**
 * 4️⃣ Extraer lotes de los tractores
 */
function extraerLotesDetractores(tractores: ActualizacionProgreso['tractores']): LoteProgreso[] {
  const lotesProgreso: LoteProgreso[] = [];

  for (const tractor of tractores) {
    for (const lote of tractor.lotes) {
      lotesProgreso.push({
        codigo: lote.codigo,
        hectareas: lote.hectareas,
        operador: tractor.operador
      });
    }
  }

  return lotesProgreso;
}

/**
 * 5️⃣ Actualizar seguimiento diario con relaciones de lotes
 */
async function actualizarSeguimientoConLotes(
  baseId: string,
  apiKey: string,
  seguimientoId: string,
  lotesTrabajadasIds: string[],
  seguimientoLotesIds: string[]
): Promise<void> {
  try {
    debugLog('🔗 [VINCULAR-LOTES] Actualizando seguimiento diario:', {
      seguimientoId,
      lotesTrabajadasIds: lotesTrabajadasIds.length,
      seguimientoLotesIds: seguimientoLotesIds.length
    });

    const url = `https://api.airtable.com/v0/${baseId}/Seguimiento%20Diario%20Aplicacion/${seguimientoId}`;
    
    const updateData: Record<string, any> = {};
    
    // Campo "Lotes Trabajados" (fldIMy9HUpVQawo66)
    if (lotesTrabajadasIds.length > 0) {
      updateData['Lotes Trabajados'] = lotesTrabajadasIds;
    }
    
    // Campo "Seguimiento Cultivos Lotes Aplicaciones" (fldtHSgYwgBPYKhmV)  
    if (seguimientoLotesIds.length > 0) {
      updateData['Seguimiento Cultivos Lotes Aplicaciones'] = seguimientoLotesIds;
    }

    if (Object.keys(updateData).length > 0) {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: updateData
        })
      });

      if (response.ok) {
        debugLog('✅ [VINCULAR-LOTES] Seguimiento diario actualizado correctamente');
      } else {
        debugError('❌ [VINCULAR-LOTES] Error actualizando:', await response.text());
      }
    }

  } catch (error) {
    debugError('❌ [VINCULAR-LOTES] Error:', error);
  }
}

/**
 * 6️⃣ Buscar evento de aplicación por paquete y fecha
 */
async function buscarEventoAplicacion(
  baseId: string,
  apiKey: string,
  paqueteId: string,
  fecha: string
): Promise<string | null> {
  try {
    debugLog('🔍 [BUSCAR-EVENTO] Buscando evento de aplicación:', { paqueteId, fecha });

    // Buscar en Aplicaciones Eventos por paquete y fecha
    const filterFormula = encodeURIComponent(
      `AND(FIND("${paqueteId}", ARRAYJOIN({Paquetes Aplicaciones})), IS_SAME({Fecha Programada}, DATETIME_PARSE("${fecha}", "YYYY-MM-DD"), "day"))`
    );
    
    const url = `https://api.airtable.com/v0/${baseId}/Aplicaciones%20Eventos?filterByFormula=${filterFormula}`;
    
    debugLog('🌐 [BUSCAR-EVENTO] URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.records && data.records.length > 0) {
        const eventoId = data.records[0].id;
        debugLog('✅ [BUSCAR-EVENTO] Evento encontrado:', eventoId);
        return eventoId;
      } else {
        debugLog('⚠️ [BUSCAR-EVENTO] No se encontró evento para paquete y fecha');
        return null;
      }
    } else {
      debugError('❌ [BUSCAR-EVENTO] Error en búsqueda:', await response.text());
      return null;
    }
    
  } catch (error) {
    debugError('❌ [BUSCAR-EVENTO] Error:', error);
    return null;
  }
}