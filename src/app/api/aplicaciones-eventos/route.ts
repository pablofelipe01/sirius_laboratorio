import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { debugLog } from '@/lib/debug';

// Validar configuración requerida para DataLab
if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
  throw new Error('Variables de entorno AIRTABLE_API_KEY y AIRTABLE_BASE_ID son requeridas para DataLab');
}

// Configurar Airtable DataLab
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

// Configurar Airtable Sirius Product Core
const baseSiriusProductCore = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY_SIRIUS_PRODUCT_CORE || process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID_SIRIUS_PRODUCT_CORE || '');

// Configurar Airtable Sirius Client Core
const baseSiriusClientCore = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY_SIRIUS_CLIENTES_CORE || process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID_SIRIUS_CLIENTES_CORE || '');

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
    debugLog('🔵 [APLICACIONES-API] Inicio de GET request');
    
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');
    const paqueteId = searchParams.get('paqueteId');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const estado = searchParams.get('estado');
    
    // Si se proporciona un eventId, obtener un evento individual
    if (eventId) {
      debugLog('🔍 Obteniendo evento individual:', eventId);

      try {
        // Obtener el evento con todos sus datos
        const event = await base(APLICACIONES_TABLE).find(eventId);
        
        debugLog('📋 Campos disponibles en el evento:', Object.keys(event.fields));
        debugLog('📊 Datos completos del evento:', event.fields);
        
        // Obtener información del cliente del paquete de aplicaciones
        let clienteInfo = null;
        const paqueteId = event.fields[FIELD_PAQUETES_APLICACIONES] ? 
                         (Array.isArray(event.fields[FIELD_PAQUETES_APLICACIONES]) ? 
                          event.fields[FIELD_PAQUETES_APLICACIONES][0] : 
                          event.fields[FIELD_PAQUETES_APLICACIONES]) :
                         (event.fields[FIELD_ID_PAQUETE] || null);
        
        debugLog('🔍 Obteniendo información del paquete:', paqueteId);
        
        if (paqueteId) {
          try {
            const paquete = await base(PAQUETES_APLICACIONES_TABLE).find(paqueteId);
            debugLog('📦 Información del paquete:', paquete.fields);
            
            // Obtener ID del cliente del paquete (formato CL-XXXX)
            const clienteIdField = paquete.fields['ID Cliente'] || paquete.fields['Cliente ID'] || paquete.fields['id_cliente'];
            if (clienteIdField) {
              const clienteId = Array.isArray(clienteIdField) ? clienteIdField[0] : clienteIdField;
              debugLog('👤 Cliente ID encontrado:', clienteId);
              clienteInfo = { clienteId };
            } else {
              console.warn('⚠️ No se encontró campo ID Cliente en el paquete');
              debugLog('🔍 Campos disponibles en el paquete:', Object.keys(paquete.fields));
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

        debugLog('✅ Datos procesados del evento con cliente:', eventData);

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

    debugLog('🔍 Consultando Aplicaciones Eventos:', {
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

    debugLog('📋 [APLICACIONES-API] Parámetros de selección:', selectParams);

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
        fechaActualizacion: record.get(FIELD_FECHA_ACTUALIZACION),
        // Campos adicionales completos
        totalHectareasAplicacion: record.get('Total Hectareas Aplicacion') || 0,
        hectareasLotes: record.get('Hectareas Lotes (from Cultivos Lotes Aplicaciones)') || [],
        idLotes: record.get('ID Lote (from Cultivos Lotes Aplicaciones)') || [],
        productosAplicadosIds: record.get('ID Productos Aplicados') || [],
        diasPlanificados: record.get('Dias Planificados') || 0,
        progresoAplicacion: record.get('Progreso Aplicacion') || 0,
        estadoCronograma: record.get('Estado Cronograma') || '',
        fechaInicioAplicacion: record.get('Fecha Inicio Aplicacion') || '',
        fechaFinEstimada: record.get('Fecha Fin Estimada') || '',
        totalHectareasRealizadas: record.get('Total Hectareas Realizadas') || [],
        cultivosLotesAplicaciones: record.get('Cultivos Lotes Aplicaciones') || [],
        seguimientoDiario: record.get('Seguimiento Diario') || [],
        planificacionDiaria: record.get('Planificacion Diaria') || [],
        capacidadDiariaHa: record.get('Capacidad Diaria Ha') || 60
      };
    });

    console.log('✅ [APLICACIONES-API] Eventos mapeados exitosamente:', eventos.length);

    // Enriquecer con información de productos desde Sirius Product Core
    console.log('🔄 [APLICACIONES-API] Enriqueciendo con información de productos desde Sirius Product Core...');
    const eventosEnriquecidos = await Promise.all(eventos.map(async (evento) => {
      if (evento.productosAplicadosIds && Array.isArray(evento.productosAplicadosIds) && evento.productosAplicadosIds.length > 0) {
        try {
          console.log(`📦 [APLICACIONES-API] Procesando ${evento.productosAplicadosIds.length} productos para evento ${evento.id}`);
          
          const productosInfo = await Promise.all(
            evento.productosAplicadosIds.map(async (productoAplicacionId: string) => {
              try {
                // Primero obtener el registro de Productos Aplicacion en DataLab
                console.log(`🔍 [APLICACIONES-API] Buscando Producto Aplicacion: ${productoAplicacionId}`);
                const productoAplicacionRecord = await base('Productos Aplicacion').find(productoAplicacionId);
                
                // Mostrar todos los campos disponibles para debugging
                debugLog(`📋 [APLICACIONES-API] ========================================`);
                debugLog(`📋 [APLICACIONES-API] TODOS LOS CAMPOS DEL REGISTRO ${productoAplicacionId}:`);
                debugLog(JSON.stringify(productoAplicacionRecord.fields, null, 2));
                debugLog(`📋 [APLICACIONES-API] ========================================`);
                
                // Leer el campo correcto "Total Producto"
                const litrosTotales = productoAplicacionRecord.get('Total Producto') || 0;
                                     
                const dosificacionPorHa = productoAplicacionRecord.get('Dosificacion Por Ha') || 
                                         productoAplicacionRecord.get('Dosificacion por Ha') ||
                                         productoAplicacionRecord.get('Dosificacion') || 0;
                
                // El campo "ID Producto" contiene el código (SIRIUS-PRODUCT-XXXX)
                const codigoProductoSirius = productoAplicacionRecord.get('ID Producto');
                
                debugLog(`📊 [APLICACIONES-API] Valores extraídos:`, {
                  id: productoAplicacionId,
                  codigoProducto: codigoProductoSirius,
                  totalProducto: litrosTotales,
                  dosificacionPorHa: dosificacionPorHa
                });
                
                if (!codigoProductoSirius) {
                  console.warn(`⚠️ No se encontró ID Producto (Codigo) para ${productoAplicacionId}`);
                  debugLog(`📋 Campos disponibles:`, Object.keys(productoAplicacionRecord.fields));
                  return {
                    id: productoAplicacionId,
                    nombre: 'Producto sin código',
                    litrosTotales: litrosTotales,
                    dosificacionPorHa: dosificacionPorHa,
                    unidad: 'L/ha'
                  };
                }
                
                // Buscar el producto en Sirius Product Core por Codigo Producto
                debugLog(`🔍 [APLICACIONES-API] Buscando en Sirius Product Core por código: ${codigoProductoSirius}`);
                
                // Debug configuración
                debugLog(`🔧 [APLICACIONES-API] Configuración Sirius Product Core:`, {
                  baseId: process.env.AIRTABLE_BASE_ID_SIRIUS_PRODUCT_CORE ? 'Configurado' : 'FALTANTE',
                  apiKey: process.env.AIRTABLE_API_KEY_SIRIUS_PRODUCT_CORE ? 'Configurado' : 'FALTANTE',
                  tabla: process.env.AIRTABLE_TABLE_PRODUCTOS
                });
                
                const productosSirius = await baseSiriusProductCore(process.env.AIRTABLE_TABLE_PRODUCTOS!)
                  .select({
                    filterByFormula: `{Codigo Producto} = '${codigoProductoSirius}'`,
                    maxRecords: 1
                  })
                  .firstPage();
                
                if (!productosSirius || productosSirius.length === 0) {
                  console.warn(`⚠️ No se encontró producto en Sirius con código: ${codigoProductoSirius}`);
                  return {
                    id: productoAplicacionId,
                    nombre: `Producto ${codigoProductoSirius}`,
                    codigoProducto: codigoProductoSirius,
                    litrosTotales: litrosTotales,
                    dosificacionPorHa: dosificacionPorHa,
                    unidad: 'L/ha'
                  };
                }
                
                const productoSiriusRecord = productosSirius[0];
                const nombreComercial = productoSiriusRecord.get('Nombre Comercial') || 'Producto Desconocido';
                const tipoProducto = productoSiriusRecord.get('Tipo Producto') || '';
                
                console.log(`✅ [APLICACIONES-API] Producto encontrado: ${nombreComercial} (${codigoProductoSirius}) - ${litrosTotales}L`);
                
                return {
                  id: productoAplicacionId,
                  nombre: nombreComercial,
                  codigoProducto: codigoProductoSirius,
                  tipoProducto: tipoProducto,
                  litrosTotales: litrosTotales,
                  dosificacionPorHa: dosificacionPorHa,
                  unidad: 'L/ha'
                };
              } catch (error) {
                console.error(`❌ Error obteniendo producto ${productoAplicacionId}:`, error);
                return {
                  id: productoAplicacionId,
                  nombre: 'Error al cargar producto',
                  litrosTotales: 0,
                  dosificacionPorHa: 0,
                  unidad: 'L/ha'
                };
              }
            })
          );
          return { ...evento, productosAplicados: productosInfo };
        } catch (error) {
          console.error('❌ Error obteniendo productos:', error);
          return { ...evento, productosAplicados: [] };
        }
      }
      return { ...evento, productosAplicados: [] };
    }));

    console.log('✅ [APLICACIONES-API] Eventos enriquecidos con productos desde Sirius Product Core');

    // Enriquecer con nombres de lotes desde Sirius Client Core
    console.log('🔄 [APLICACIONES-API] Enriqueciendo con nombres de lotes desde Sirius Client Core...');
    console.log('🔍 [APLICACIONES-API] Variables de entorno:', {
      hasClientCoreKey: !!process.env.AIRTABLE_API_KEY_SIRIUS_CLIENTES_CORE,
      hasClientCoreBase: !!process.env.AIRTABLE_BASE_ID_SIRIUS_CLIENTES_CORE,
      baseId: process.env.AIRTABLE_BASE_ID_SIRIUS_CLIENTES_CORE ? `${process.env.AIRTABLE_BASE_ID_SIRIUS_CLIENTES_CORE.substring(0, 8)}...` : 'NO CONFIGURADO'
    });

    // Recopilar todos los lotes únicos de todos los eventos
    const todosLosLotes = new Set<string>();
    eventosEnriquecidos.forEach(evento => {
      if (evento.idLotes && Array.isArray(evento.idLotes) && evento.idLotes.length > 0) {
        evento.idLotes.forEach(loteId => todosLosLotes.add(loteId));
      }
    });

    console.log(`📍 [APLICACIONES-API] Obteniendo información para ${todosLosLotes.size} lotes únicos...`);
    
    // Obtener información de todos los lotes en batch queries
    const lotesArray = Array.from(todosLosLotes);
    const loteInfoMap = new Map<string, { nombre: string }>();
    
    if (process.env.AIRTABLE_BASE_ID_SIRIUS_CLIENTES_CORE && lotesArray.length > 0) {
      try {
        // Dividir en chunks de 20 lotes máximo por consulta para evitar límites de Airtable
        const chunkSize = 20;
        for (let i = 0; i < lotesArray.length; i += chunkSize) {
          const chunk = lotesArray.slice(i, i + chunkSize);
          const formula = `OR(${chunk.map(loteId => `{ID} = '${loteId}'`).join(', ')})`;
          
          console.log(`🔍 [APLICACIONES-API] Consultando chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(lotesArray.length / chunkSize)} (${chunk.length} lotes)`);
          
          const lotesResult = await baseSiriusClientCore('Lotes / Áreas Core')
            .select({
              filterByFormula: formula,
              fields: ['ID', 'nombre_lote']
            })
            .all();

          // Mapear los resultados
          lotesResult.forEach(record => {
            const loteId = record.get('ID') as string;
            const nombreLote = record.get('nombre_lote') as string;
            if (loteId && nombreLote) {
              loteInfoMap.set(loteId, { nombre: nombreLote });
            }
          });
        }

        console.log(`✅ [APLICACIONES-API] Obtenidos ${loteInfoMap.size}/${todosLosLotes.size} lotes desde Sirius Client Core`);
        
      } catch (error) {
        console.error('❌ [APLICACIONES-API] Error al obtener lotes en batch:', error);
      }
    }
    
    const eventosConLotesEnriquecidos = eventosEnriquecidos.map((evento) => {
      if (evento.idLotes && Array.isArray(evento.idLotes) && evento.idLotes.length > 0) {
        const lotesDetallados = evento.idLotes.map((loteId: string, index: number) => {
          const loteInfo = loteInfoMap.get(loteId);
          return {
            id: loteId,
            nombre: loteInfo ? loteInfo.nombre : loteId, // Fallback al ID si no se encuentra
            hectareas: (Array.isArray(evento.hectareasLotes) ? evento.hectareasLotes[index] : 0) || 0
          };
        });
        return { ...evento, lotesDetallados };
      }
      return { ...evento, lotesDetallados: [] };
    });

    console.log('✅ [APLICACIONES-API] Eventos enriquecidos con nombres de lotes desde Sirius Client Core');

    return NextResponse.json({
      success: true,
      eventos: eventosConLotesEnriquecidos,
      count: eventosConLotesEnriquecidos.length
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
    const body = await request.json();
    
    // Si solo viene id y estadoAplicacion, es una actualización simple de estado
    if (body.id && body.estadoAplicacion && Object.keys(body).length === 2) {
      console.log('🔄 [APLICACIONES-API] Actualizando solo estado de aplicación...');
      
      const { id, estadoAplicacion } = body;
      
      // Validar que el estado sea válido
      const estadosValidos = ['PRESUPUESTADA', 'CONFIRMADA', 'ENTREGADA', 'POSPUESTA'];
      if (!estadosValidos.includes(estadoAplicacion)) {
        return NextResponse.json({
          success: false,
          error: `Estado no válido. Estados válidos: ${estadosValidos.join(', ')}`
        }, { status: 400 });
      }
      
      console.log(`📝 [APLICACIONES-API] Actualizando aplicación ${id} a estado: ${estadoAplicacion}`);
      
      // Actualizar el registro en Airtable
      const updatedRecord = await base(APLICACIONES_TABLE).update(id, {
        [FIELD_ESTADO_APLICACION]: estadoAplicacion,
        [FIELD_FECHA_ACTUALIZACION]: new Date().toISOString()
      });
      
      console.log('✅ [APLICACIONES-API] Estado actualizado correctamente');
      
      return NextResponse.json({
        success: true,
        evento: {
          id: updatedRecord.id,
          estadoAplicacion: updatedRecord.get(FIELD_ESTADO_APLICACION),
          fechaActualizacion: updatedRecord.get(FIELD_FECHA_ACTUALIZACION)
        }
      });
    }
    
    // Caso completo: actualización con fechas y efecto dominó
    const { 
      id, 
      fecha, 
      estado,
      updateFutureDates,
      paqueteId 
    } = body;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID del evento es requerido'
      }, { status: 400 });
    }

    console.log('🔄 Actualizando Evento Completo:', {
      id, fecha, estado, updateFutureDates, paqueteId
    });

    // Preparar datos de actualización
    const updateData: any = {};
    
    if (fecha) updateData['Fecha Programada'] = fecha;
    if (estado) updateData['Estado Aplicacion'] = estado.toUpperCase();
    
    // Siempre actualizar fecha de modificación
    updateData['Fecha Actualizacion'] = new Date().toISOString();

    // Obtener la fecha original ANTES de actualizar (para el efecto dominó)
    let originalDate: Date | null = null;
    if (updateFutureDates && fecha && paqueteId) {
      const eventBeforeUpdate = await base(APLICACIONES_TABLE).find(id);
      const fechaOriginalRaw = eventBeforeUpdate.fields['Fecha Programada'] as string;
      originalDate = new Date(fechaOriginalRaw);
    }

    // Actualizar el evento principal
    const updatedRecord = await base(APLICACIONES_TABLE).update(id, updateData);
    console.log('✅ Evento principal actualizado:', updatedRecord.id);

    let updatedFutureEvents = 0;

    // Si se cambió la fecha y se solicitó actualizar fechas futuras
    if (updateFutureDates && fecha && paqueteId && originalDate) {
      const newDate = new Date(fecha);
      const daysDifference = Math.floor((newDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24));

      // Buscar eventos futuros del mismo paquete
      const futureEventsFilter = `AND(
        FIND('${paqueteId}', ARRAYJOIN({${FIELD_PAQUETES_APLICACIONES}})),
        {${FIELD_FECHA_PROGRAMADA}} > '${originalDate.toISOString().split('T')[0]}',
        RECORD_ID() != '${id}'
      )`;

      const futureEvents = await base(APLICACIONES_TABLE)
        .select({
          filterByFormula: futureEventsFilter,
          sort: [{ field: FIELD_FECHA_PROGRAMADA, direction: 'asc' }]
        })
        .all();

      // Actualizar cada evento futuro
      for (const futureEvent of futureEvents) {
        const currentDate = new Date(futureEvent.fields['Fecha Programada'] as string);
        const newFutureDate = new Date(currentDate.getTime() + (daysDifference * 24 * 60 * 60 * 1000));
        
        await base(APLICACIONES_TABLE).update(futureEvent.id, {
          'Fecha Programada': newFutureDate.toISOString().split('T')[0],
          'Fecha Actualizacion': new Date().toISOString()
        });
        
        updatedFutureEvents++;
      }
    }

    return NextResponse.json({
      success: true,
      eventoId: updatedRecord.id,
      updatedFutureEvents,
      message: 'Aplicación actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ [APLICACIONES-API] Error en actualización:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido actualizando aplicación'
    }, { status: 500 });
  }
}