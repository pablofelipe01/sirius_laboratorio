import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Validar configuración requerida para DataLab
if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
  throw new Error('Variables de entorno AIRTABLE_API_KEY y AIRTABLE_BASE_ID son requeridas para DataLab');
}

// Configurar Airtable DataLab
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

// Tabla de aplicaciones (REQUIRED - no usar IDs hardcodeados)
if (!process.env.AIRTABLE_TABLE_APLICACIONES) {
  throw new Error('Variable de entorno AIRTABLE_TABLE_APLICACIONES es requerida y no debe contener IDs hardcodeados');
}
const APLICACIONES_TABLE = process.env.AIRTABLE_TABLE_APLICACIONES;

// Tabla de paquetes de aplicaciones (opcional, usada para obtener información del cliente)
const PAQUETES_APLICACIONES_TABLE = process.env.AIRTABLE_TABLE_PAQUETES_APLICACIONES || 'Paquete Aplicaciones';

// Campos: usar nombres legibles por defecto o variables de entorno; NO caer de vuelta a field IDs como 'fldXXXX'
const FIELD_FECHA_PROGRAMADA = process.env.AIRTABLE_FIELD_FECHA_PROGRAMADA || 'Fecha Programada';
const FIELD_ESTADO_APLICACION = process.env.AIRTABLE_FIELD_ESTADO_APLICACION || 'Estado Aplicacion';
const FIELD_PAQUETES_APLICACIONES = process.env.AIRTABLE_FIELD_PAQUETES_APLICACIONES || 'Paquetes Aplicaciones';
const FIELD_ID_PAQUETE = process.env.AIRTABLE_FIELD_ID_PAQUETE || 'ID Paquete';
const FIELD_CULTIVOS_LOTES = process.env.AIRTABLE_FIELD_CULTIVOS_LOTES || 'Cultivos Lotes Aplicaciones';
const FIELD_HECTAREAS = process.env.AIRTABLE_FIELD_HECTAREAS || 'Hectareas Lotes (from Cultivos Lotes Aplicaciones)';
const FIELD_ID_LOTE = process.env.AIRTABLE_FIELD_ID_LOTE || 'ID Lote (from Cultivos Lotes Aplicaciones)';
const FIELD_PRODUCTOS_APLICADOS = process.env.AIRTABLE_FIELD_PRODUCTOS_APLICADOS || 'ID Productos Aplicados';
const FIELD_CANTIDAD_BIOLOGICOS = process.env.AIRTABLE_FIELD_CANTIDAD_BIOLOGICOS || 'Cantidad Total Biologicos Litros';
const FIELD_TOTAL_HECTAREAS = process.env.AIRTABLE_FIELD_TOTAL_HECTAREAS || 'Total Hectareas Aplicacion';
const FIELD_FECHA_CREACION = process.env.AIRTABLE_FIELD_FECHA_CREACION || 'Fecha de Creacion';
const FIELD_FECHA_ACTUALIZACION = process.env.AIRTABLE_FIELD_FECHA_ACTUALIZACION || 'Fecha Actualizacion';
const FIELD_PRIORIDAD = process.env.AIRTABLE_FIELD_PRIORIDAD || 'Prioridad';
const FIELD_RESPONSABLE = process.env.AIRTABLE_FIELD_RESPONSABLE || 'Responsable';
const FIELD_OBSERVACIONES = process.env.AIRTABLE_FIELD_OBSERVACIONES || 'Observaciones';

export async function GET(request: NextRequest) {
  try {
    console.log('🔵 [APLICACIONES-API] Inicio de GET request');
    
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');
    const paqueteId = searchParams.get('paqueteId');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const estado = searchParams.get('estado');
    
    // Si se proporciona un eventId, obtener un evento individual
    if (eventId) {
      console.log('🔍 Obteniendo evento individual:', eventId);

      try {
        // Obtener el evento con todos sus datos
        const event = await base(APLICACIONES_TABLE).find(eventId);
        
        console.log('📋 Campos disponibles en el evento:', Object.keys(event.fields));
        console.log('📊 Datos completos del evento:', event.fields);
        
        // Obtener información del cliente del paquete de aplicaciones
        let clienteInfo = null;
        const paqueteId = event.fields[FIELD_PAQUETES_APLICACIONES] ? 
                         (Array.isArray(event.fields[FIELD_PAQUETES_APLICACIONES]) ? 
                          event.fields[FIELD_PAQUETES_APLICACIONES][0] : 
                          event.fields[FIELD_PAQUETES_APLICACIONES]) :
                         (event.fields[FIELD_ID_PAQUETE] || null);
        
        console.log('🔍 Obteniendo información del paquete:', paqueteId);
        
        if (paqueteId) {
          try {
            const paquete = await base(PAQUETES_APLICACIONES_TABLE).find(paqueteId);
            console.log('📦 Información del paquete:', paquete.fields);
            
            // Obtener ID del cliente del paquete (formato CL-XXXX)
            const clienteIdField = paquete.fields['ID Cliente'] || paquete.fields['Cliente ID'] || paquete.fields['id_cliente'];
            if (clienteIdField) {
              const clienteId = Array.isArray(clienteIdField) ? clienteIdField[0] : clienteIdField;
              console.log('👤 Cliente ID encontrado:', clienteId);
              clienteInfo = { clienteId };
            } else {
              console.warn('⚠️ No se encontró campo ID Cliente en el paquete');
              console.log('🔍 Campos disponibles en el paquete:', Object.keys(paquete.fields));
            }
          } catch (paqueteError) {
            console.warn('⚠️ Error obteniendo información del paquete:', paqueteError);
          }
        }
        
        const eventData = {
          id: event.id,
          fecha: event.fields[FIELD_FECHA_PROGRAMADA],
          estado: event.fields[FIELD_ESTADO_APLICACION],
          paqueteId,
          // Información del cliente
          clienteId: clienteInfo?.clienteId || null,
          cultivosLotes: event.fields[FIELD_CULTIVOS_LOTES] || [],
          hectareas: event.fields[FIELD_HECTAREAS] || [],
          lotesIds: event.fields[FIELD_ID_LOTE] || [],
          productosAplicados: event.fields[FIELD_PRODUCTOS_APLICADOS] || [],
          cantidadBiologicos: event.fields[FIELD_CANTIDAD_BIOLOGICOS] || 0,
          totalHectareas: event.fields[FIELD_TOTAL_HECTAREAS] || 0,
          fechaCreacion: event.fields[FIELD_FECHA_CREACION] || '',
          fechaActualizacion: event.fields[FIELD_FECHA_ACTUALIZACION] || '',
          prioridad: event.fields[FIELD_PRIORIDAD] || 'media',
          responsable: event.fields[FIELD_RESPONSABLE] || '',
          observaciones: event.fields[FIELD_OBSERVACIONES] || '',
          // Información adicional del paquete/cliente
          paqueteInfo: clienteInfo,
          // Campos adicionales para debugging
          allFields: event.fields
        };

        console.log('✅ Datos procesados del evento con cliente:', eventData);

        return NextResponse.json({
          success: true,
          evento: eventData
        });
      } catch (error) {
        console.error('❌ Error obteniendo evento individual:', error);
        return NextResponse.json({
          success: false,
          error: 'Error obteniendo datos del evento',
          details: error instanceof Error ? error.message : 'Error desconocido'
        }, { status: 500 });
      }
    }
    
    // Si no se proporciona eventId, hacer consulta general
    let formula = '';
    const conditions = [];
    
    if (paqueteId) {
      conditions.push(`FIND('${paqueteId}', ARRAYJOIN({${FIELD_PAQUETES_APLICACIONES}}))`);
    }
    
    if (fechaInicio) {
      conditions.push(`{${FIELD_FECHA_PROGRAMADA}} >= '${fechaInicio}'`);
    }
    
    if (fechaFin) {
      conditions.push(`{${FIELD_FECHA_PROGRAMADA}} <= '${fechaFin}'`);
    }
    
    if (estado) {
      conditions.push(`{Estado Aplicacion} = '${estado}'`);
    }
    
    if (conditions.length > 0) {
      formula = `AND(${conditions.join(', ')})`;
    }

    console.log('🔍 Consultando Aplicaciones Eventos:', {
      paqueteId,
      fechaInicio,
      fechaFin,
      estado,
      formula,
      timestamp: new Date().toISOString()
    });

    // Construir los parámetros de selección
    const selectParams: any = {
      sort: [{ field: FIELD_FECHA_PROGRAMADA, direction: 'asc' }]
    };

    // Solo agregar filterByFormula si hay condiciones
    if (formula) {
      selectParams.filterByFormula = formula;
    }

    console.log('📋 [APLICACIONES-API] Parámetros de selección:', selectParams);

    const records = await base(APLICACIONES_TABLE)
      .select(selectParams)
      .all();

    console.log('✅ [APLICACIONES-API] Registros encontrados:', records.length);

    const eventos = records.map((record, index) => {
      console.log(`🔍 [APLICACIONES-API] Procesando evento ${index + 1}/${records.length}:`, record.id);
      
      return {
        id: record.id,
        paqueteAplicaciones: record.get(FIELD_PAQUETES_APLICACIONES),
        idPaquete: record.get(FIELD_ID_PAQUETE),
        fechaProgramada: record.get(FIELD_FECHA_PROGRAMADA),
        fechaAplicacion: record.get('Fecha Aplicacion'),
        estadoAplicacion: record.get(FIELD_ESTADO_APLICACION),
        cantidadLitros: record.get(FIELD_CANTIDAD_BIOLOGICOS),
        observaciones: record.get(FIELD_OBSERVACIONES),
        createdTime: record.get(FIELD_FECHA_CREACION),
        fechaActualizacion: record.get(FIELD_FECHA_ACTUALIZACION)
      };
    });

    console.log('✅ [APLICACIONES-API] Eventos mapeados exitosamente:', eventos.length);

    return NextResponse.json({
      success: true,
      eventos,
      count: eventos.length
    });

  } catch (error) {
    console.error('❌ [APLICACIONES-API] Error completo consultando eventos aplicaciones:', {
      error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    if (error && typeof error === 'object' && 'error' in error) {
      const airtableError = error as any;
      console.error('❌ [APLICACIONES-API] Error de Airtable:', {
        type: airtableError.error?.type,
        message: airtableError.error?.message,
        statusCode: airtableError.statusCode
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { 
      status: 500 
    });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { eventoId, ...updateData } = await request.json();
    
    if (!eventoId) {
      return NextResponse.json({
        success: false,
        error: 'eventoId es requerido'
      }, { status: 400 });
    }

    console.log('🔄 Actualizando Evento Aplicación:', {
      eventoId,
      updateData,
      timestamp: new Date().toISOString()
    });

    const updatedRecord = await base(APLICACIONES_TABLE).update(eventoId, updateData);

    return NextResponse.json({
      success: true,
      eventoId: updatedRecord.id,
      message: 'Evento actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error actualizando evento:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { 
      status: 500 
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { 
      id, 
      fecha, 
      estado,
      updateFutureDates,
      paqueteId 
    } = await request.json();
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID del evento es requerido'
      }, { status: 400 });
    }

    console.log('🔄 Actualizando Evento Individual:', {
      id,
      fecha,
      estado,
      updateFutureDates,
      paqueteId,
      timestamp: new Date().toISOString()
    });

    // Campos requeridos para la operación (no deben ser IDs 'fld' hardcodeadas)
    const requiredFields = {
      'AIRTABLE_FIELD_FECHA_PROGRAMADA': FIELD_FECHA_PROGRAMADA,
      'AIRTABLE_FIELD_ESTADO_APLICACION': FIELD_ESTADO_APLICACION,
      'AIRTABLE_FIELD_PAQUETES_APLICACIONES': FIELD_PAQUETES_APLICACIONES,
      'AIRTABLE_FIELD_FECHA_ACTUALIZACION': FIELD_FECHA_ACTUALIZACION,
    };

    for (const [fieldName, fieldValue] of Object.entries(requiredFields)) {
      if (!fieldValue) {
        return NextResponse.json({
          success: false,
          error: `Variable de entorno ${fieldName} no está configurada`
        }, { status: 500 });
      }

      // Prohibir expresamente el uso de IDs de campo tipo 'fld' o 'tbl' hardcodeados
      if (typeof fieldValue === 'string' && /^(fld|tbl)/i.test(fieldValue)) {
        return NextResponse.json({
          success: false,
          error: `Uso de IDs de campo tipo 'fld' o 'tbl' detectado en ${fieldName}. No está permitido.`
        }, { status: 500 });
      }
    }

    // Preparar datos de actualización - solo campos que existen en Airtable
    const updateData: any = {};
    
    if (fecha) updateData['Fecha Programada'] = fecha;
    if (estado) updateData['Estado Aplicacion'] = estado.toUpperCase();
    
    // Siempre actualizar fecha de modificación
    updateData['Fecha Actualizacion'] = new Date().toISOString();

    // Obtener la fecha original ANTES de actualizar (para el efecto dominó)
    let originalDate: Date | null = null;
    if (updateFutureDates && fecha && paqueteId) {
      console.log('🔍 Obteniendo fecha original antes de actualizar para efecto dominó...');
        const eventBeforeUpdate = await base(APLICACIONES_TABLE).find(id);
      const fechaOriginalRaw = eventBeforeUpdate.fields['Fecha Programada'] as string;
      originalDate = new Date(fechaOriginalRaw);
      console.log('📅 Fecha original capturada:', {
        fechaOriginalRaw,
        originalDate,
        isValid: !isNaN(originalDate.getTime())
      });
    }

    // Actualizar el evento principal
    const updatedRecord = await base(APLICACIONES_TABLE).update(id, updateData);
    console.log('✅ Evento principal actualizado:', updatedRecord.id);

    let updatedFutureEvents = 0;

    // Si se cambió la fecha y se solicitó actualizar fechas futuras
    if (updateFutureDates && fecha && paqueteId) {
      console.log('🔄 Actualizando fechas de eventos futuros...');
      console.log('🎯 Condiciones para efecto dominó cumplidas:', {
        updateFutureDates,
        tieneNuevaFecha: !!fecha,
        tienePaqueteId: !!paqueteId,
        paqueteId: paqueteId
      });
      
      try {
        if (!originalDate || isNaN(originalDate.getTime())) {
          throw new Error(`Fecha original inválida: ${originalDate}`);
        }

        const newDate = new Date(fecha);
        if (isNaN(newDate.getTime())) {
          throw new Error(`Nueva fecha inválida: ${fecha}`);
        }

        console.log('📅 Procesamiento de fechas:', {
          fechaOriginal: originalDate.toISOString().split('T')[0],
          nuevaFecha: newDate.toISOString().split('T')[0],
          originalDateValid: !isNaN(originalDate.getTime()),
          newDateValid: !isNaN(newDate.getTime())
        });

        const daysDifference = Math.floor((newDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24));
        console.log('📊 Diferencia de días:', daysDifference);

        // Buscar eventos futuros del mismo paquete (posteriores a la fecha original)
        const futureEventsFilter = `AND(
          FIND('${paqueteId}', ARRAYJOIN({${FIELD_PAQUETES_APLICACIONES}})),
          {${FIELD_FECHA_PROGRAMADA}} > '${originalDate.toISOString().split('T')[0]}',
          RECORD_ID() != '${id}'
        )`;

        console.log('🔍 Filtro para eventos futuros:', futureEventsFilter);
        console.log('📅 Fecha original para comparar:', originalDate.toISOString().split('T')[0]);
        console.log('📅 Nueva fecha:', newDate.toISOString().split('T')[0]);
        console.log('🆔 Paquete ID:', paqueteId);

        const futureEvents = await base(APLICACIONES_TABLE)
          .select({
            filterByFormula: futureEventsFilter,
            sort: [{ field: FIELD_FECHA_PROGRAMADA, direction: 'asc' }]
          })
          .all();

        console.log(`📅 Eventos futuros encontrados: ${futureEvents.length}`);
        
        if (futureEvents.length > 0) {
          console.log('🗃️ Lista de eventos futuros encontrados:');
          futureEvents.forEach((event, index) => {
            console.log(`  ${index + 1}. ID: ${event.id}, Fecha: ${event.fields['Fecha Programada']}`);
          });
        } else {
          console.log('⚠️ No se encontraron eventos futuros para actualizar');
          console.log('🔍 Verificando datos del filtro:');
          console.log('   - Paquete ID existe:', !!paqueteId);
          console.log('   - Fecha original:', originalDate.toISOString().split('T')[0]);
          console.log('   - Filtro completo:', futureEventsFilter);
        }

        // Actualizar cada evento futuro
        for (const futureEvent of futureEvents) {
          const currentDate = new Date(futureEvent.fields['Fecha Programada'] as string);
          const newFutureDate = new Date(currentDate.getTime() + (daysDifference * 24 * 60 * 60 * 1000));
          
          await base(APLICACIONES_TABLE).update(futureEvent.id, {
            'Fecha Programada': newFutureDate.toISOString().split('T')[0],
            'Fecha Actualizacion': new Date().toISOString()
          });
          
          updatedFutureEvents++;
          console.log(`✅ Evento futuro ${futureEvent.id} actualizado: ${newFutureDate.toISOString().split('T')[0]}`);
        }

      } catch (futureUpdateError) {
        console.error('⚠️ Error actualizando eventos futuros:', futureUpdateError);
        // No fallar la operación principal, solo log el error
      }
    }

    return NextResponse.json({
      success: true,
      eventoId: updatedRecord.id,
      updatedFutureEvents,
      message: 'Aplicación actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error actualizando evento individual:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { 
      status: 500 
    });
  }
}