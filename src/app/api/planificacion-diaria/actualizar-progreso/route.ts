import { NextRequest, NextResponse } from 'next/server';

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
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [ACTUALIZAR-PROGRESO] Inicio de actualización de progreso');
    
    const datos: ActualizacionProgreso = await request.json();
    
    console.log('📥 [ACTUALIZAR-PROGRESO] Datos recibidos:', {
      paqueteId: datos.paqueteId,
      clienteId: datos.clienteId,
      fecha: datos.fecha,
      hectareasEjecutadas: datos.hectareasEjecutadas,
      cantidadTractores: datos.tractores?.length || 0
    });

    if (!datos.paqueteId || !datos.fecha || !datos.hectareasEjecutadas) {
      return NextResponse.json({
        error: 'Datos incompletos: se requiere paqueteId, fecha y hectareasEjecutadas'
      }, { status: 400 });
    }

    const airtableApiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    if (!airtableApiKey || !baseId) {
      throw new Error('Configuración de Airtable faltante');
    }

    // 1. Buscar el registro de planificación diaria correspondiente
    const planificacionRecord = await buscarPlanificacionDiaria(
      baseId, 
      airtableApiKey, 
      datos.paqueteId, 
      datos.fecha
    );

    if (!planificacionRecord) {
      return NextResponse.json({
        error: 'No se encontró planificación diaria para la fecha especificada',
        fecha: datos.fecha,
        paqueteId: datos.paqueteId
      }, { status: 404 });
    }

    console.log('📋 [ACTUALIZAR-PROGRESO] Planificación encontrada:', {
      id: planificacionRecord.id,
      hectareasPlanificadas: planificacionRecord.fields['Hectareas Planificadas'],
      estadoActual: planificacionRecord.fields['Estado']
    });

    // 2. Calcular desviaciones y nuevos valores
    const hectareasPlanificadas = planificacionRecord.fields['Hectareas Planificadas'] || 0;
    const desviacion = datos.hectareasEjecutadas - hectareasPlanificadas;
    const porcentajeCumplimiento = (datos.hectareasEjecutadas / hectareasPlanificadas) * 100;
    
    // 3. Determinar nuevo estado basado en el progreso
    let nuevoEstado = 'EN_PROCESO';
    if (porcentajeCumplimiento >= 95) {
      nuevoEstado = 'COMPLETADA';
    } else if (porcentajeCumplimiento < 50) {
      nuevoEstado = 'ATRASADA';
    }

    // 4. Preparar datos de actualización
    const camposActualizacion = {
      'Hectareas Ejecutadas': datos.hectareasEjecutadas,
      'Estado': nuevoEstado,
      'Fecha Ejecucion': datos.fecha,
      'Desviacion Hectareas': desviacion,
      'Porcentaje Cumplimiento': Math.round(porcentajeCumplimiento),
      'Observaciones Ejecucion': datos.observaciones.join('; '),
      'Hora Inicio': datos.horaInicio,
      'Hora Fin': datos.horaSalida,
      'Fecha Actualizacion': new Date().toISOString()
    };

    console.log('📝 [ACTUALIZAR-PROGRESO] Actualizando campos:', {
      hectareasEjecutadas: datos.hectareasEjecutadas,
      hectareasPlanificadas,
      desviacion,
      porcentajeCumplimiento: Math.round(porcentajeCumplimiento),
      nuevoEstado
    });

    // 5. Actualizar registro en Airtable
    const updateUrl = `https://api.airtable.com/v0/${baseId}/Planificacion%20Diaria%20Aplicacion/${planificacionRecord.id}`;
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: camposActualizacion
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Error actualizando planificación: ${updateResponse.status} - ${errorText}`);
    }

    const registroActualizado = await updateResponse.json();

    // 6. Crear registro de seguimiento detallado
    await crearRegistroSeguimiento(
      baseId,
      airtableApiKey,
      datos,
      planificacionRecord.id,
      desviacion
    );

    // 7. Verificar si necesita generar alertas
    const alertas = await generarAlertasSiNecesario(datos, desviacion, porcentajeCumplimiento);

    console.log('✅ [ACTUALIZAR-PROGRESO] Progreso actualizado exitosamente:', {
      registroId: registroActualizado.id,
      nuevoEstado,
      alertasGeneradas: alertas.length
    });

    return NextResponse.json({
      success: true,
      registro: registroActualizado,
      resumen: {
        hectareasPlanificadas,
        hectareasEjecutadas: datos.hectareasEjecutadas,
        desviacion,
        porcentajeCumplimiento: Math.round(porcentajeCumplimiento),
        estadoAnterior: planificacionRecord.fields['Estado'],
        estadoNuevo: nuevoEstado
      },
      alertas,
      message: `Progreso actualizado: ${datos.hectareasEjecutadas} Ha ejecutadas vs ${hectareasPlanificadas} Ha planificadas`
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
    // Primero buscar eventos del paquete - usar filtro por linked record
    const filterPaquete = encodeURIComponent(`SEARCH("${paqueteId}", ARRAYJOIN({Paquete Aplicacion}))`);
    const eventosUrl = `https://api.airtable.com/v0/${baseId}/Aplicaciones%20Eventos?filterByFormula=${filterPaquete}`;
    
    const eventosResponse = await fetch(eventosUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!eventosResponse.ok) {
      throw new Error(`Error consultando eventos: ${eventosResponse.status}`);
    }

    const eventosData = await eventosResponse.json();
    const eventos = eventosData.records || [];

    if (eventos.length === 0) {
      console.log('⚠️ [BUSCAR-PLANIFICACION] No se encontraron eventos para el paquete');
      return null;
    }

    // Buscar planificación para la fecha específica
    const eventosIds = eventos.map((e: any) => e.id);
    const filterPlanificacion = encodeURIComponent(
      `AND(OR(${eventosIds.map((id: string) => `{Aplicacion Evento ID} = "${id}"`).join(',')}), {Fecha Programada} = "${fecha}")`
    );
    
    const planificacionUrl = `https://api.airtable.com/v0/${baseId}/Planificacion%20Diaria%20Aplicacion?filterByFormula=${filterPlanificacion}`;
    
    const planificacionResponse = await fetch(planificacionUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!planificacionResponse.ok) {
      throw new Error(`Error consultando planificación: ${planificacionResponse.status}`);
    }

    const planificacionData = await planificacionResponse.json();
    return planificacionData.records?.[0] || null;

  } catch (error) {
    console.error('❌ [BUSCAR-PLANIFICACION] Error:', error);
    return null;
  }
}

async function crearRegistroSeguimiento(
  baseId: string, 
  apiKey: string, 
  datos: ActualizacionProgreso, 
  planificacionId: string,
  desviacion: number
) {
  try {
    console.log('📊 [SEGUIMIENTO] Creando registro de seguimiento detallado');
    
    // Verificar si existe tabla de Seguimiento (si no existe, solo log)
    const seguimientoUrl = `https://api.airtable.com/v0/${baseId}/Seguimiento%20Aplicaciones`;
    
    const registroSeguimiento = {
      fields: {
        'Planificacion Diaria ID': [planificacionId],
        'Fecha Seguimiento': datos.fecha,
        'Hectareas Ejecutadas': datos.hectareasEjecutadas,
        'Desviacion': desviacion,
        'Tractores Utilizados': datos.tractores.length,
        'Operadores': datos.tractores.map(t => t.operador).join(', '),
        'Lotes Trabajados': datos.tractores.flatMap(t => t.lotes.map(l => l.codigo)).join(', '),
        'Productos Aplicados': datos.productos.map(p => `${p.nombre}: ${p.cantidad}${p.unidad}`).join('; '),
        'Observaciones': datos.observaciones.join('; '),
        'Hora Inicio': datos.horaInicio,
        'Hora Fin': datos.horaSalida,
        'Timestamp': new Date().toISOString()
      }
    };

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
    } else {
      console.log('⚠️ [SEGUIMIENTO] Tabla de seguimiento no disponible o error al crear registro');
    }

  } catch (error) {
    console.log('⚠️ [SEGUIMIENTO] Error creando registro de seguimiento:', error);
    // No fallar la operación principal por esto
  }
}

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