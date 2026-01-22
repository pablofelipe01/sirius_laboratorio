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
        paqueteId: datos.paqueteId,
        sugerencia: 'Verifica que exista una planificación diaria creada para esta fecha y paquete. La fecha debe estar en formato YYYY-MM-DD.'
      }, { status: 404 });
    }

    debugLog('📋 [ACTUALIZAR-PROGRESO] Planificación encontrada:', {
      id: planificacionRecord.id,
      hectareasObjetivo: planificacionRecord.fields['Hectareas Objetivo'],
      diaNumero: planificacionRecord.fields['Dia Numero'],
      aplicacionEvento: planificacionRecord.fields['Aplicacion Evento']
    });

    // 2. Calcular desviaciones y determinar estado
    const hectareasPlanificadas = planificacionRecord.fields['Hectareas Objetivo'] || 0;
    const diaNumero = planificacionRecord.fields['Dia Numero'] || 1;
    const aplicacionEventoId = planificacionRecord.fields['Aplicacion Evento']?.[0];
    const desviacion = datos.hectareasEjecutadas - hectareasPlanificadas;
    const porcentajeCumplimiento = (datos.hectareasEjecutadas / hectareasPlanificadas) * 100;
    
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
      aplicacionEventoId,
      mensajeId
    );

    debugLog('✅ [ACTUALIZAR-PROGRESO] Registros creados:', { 
      mensajeId, 
      seguimientoId 
    });
    
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
      planificacionId: planificacionRecord.id,
      metricas: {
        hectareasPlanificadas,
        hectareasEjecutadas: datos.hectareasEjecutadas,
        desviacion,
        porcentajeCumplimiento: Math.round(porcentajeCumplimiento),
        estadoDia
      },
      alertas,
      message: `Seguimiento creado: ${datos.hectareasEjecutadas} Ha ejecutadas vs ${hectareasPlanificadas} Ha planificadas`
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
    const dia = fechaObj.getDate();
    const mes = fechaObj.getMonth() + 1;
    const ano = fechaObj.getFullYear();
    
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
    }
    
    if (mensajeId) {
      registroSeguimiento.fields['Mensajes Aplicacion'] = [mensajeId];
    }
    
    console.log('📤 [SEGUIMIENTO] Enviando datos:', registroSeguimiento);

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