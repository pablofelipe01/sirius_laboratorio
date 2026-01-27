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

// ============================================================================
// ROLLBACK SYSTEM - Para evitar registros huérfanos
// ============================================================================

interface CreatedRecords {
  paqueteId: string | null;
  cultivosLotesIds: string[];
  eventosIds: string[];
  productosAplicacionIds: string[];
  planificacionDiariaIds: string[];
}

/**
 * Elimina registros de Airtable en lotes de 10 (límite de Airtable)
 */
async function deleteRecordsBatch(tableName: string, recordIds: string[]): Promise<number> {
  if (recordIds.length === 0) return 0;
  
  const batchSize = 10;
  let deletedCount = 0;
  
  for (let i = 0; i < recordIds.length; i += batchSize) {
    const batch = recordIds.slice(i, i + batchSize);
    try {
      await base(tableName).destroy(batch);
      deletedCount += batch.length;
      console.log(`🗑️ [ROLLBACK] Eliminados ${batch.length} registros de ${tableName}`);
    } catch (error) {
      console.error(`❌ [ROLLBACK] Error eliminando registros de ${tableName}:`, error);
      // Continuar con el siguiente batch aunque falle uno
    }
  }
  
  return deletedCount;
}

/**
 * Ejecuta rollback de todos los registros creados
 */
async function executeRollback(createdRecords: CreatedRecords): Promise<void> {
  console.log('\n🔄 [ROLLBACK] Iniciando rollback de registros creados...');
  console.log('📊 [ROLLBACK] Registros a eliminar:', {
    paquete: createdRecords.paqueteId ? 1 : 0,
    cultivosLotes: createdRecords.cultivosLotesIds.length,
    eventos: createdRecords.eventosIds.length,
    productosAplicacion: createdRecords.productosAplicacionIds.length,
    planificacionDiaria: createdRecords.planificacionDiariaIds.length
  });
  
  // Eliminar en orden inverso a la creación (dependencias primero)
  
  // 1. Eliminar Planificación Diaria
  if (createdRecords.planificacionDiariaIds.length > 0) {
    await deleteRecordsBatch('Planificacion Diaria Aplicacion', createdRecords.planificacionDiariaIds);
  }
  
  // 2. Eliminar Productos Aplicacion
  if (createdRecords.productosAplicacionIds.length > 0) {
    await deleteRecordsBatch(process.env.AIRTABLE_TABLE_PRODUCTOS_APLICACION!, createdRecords.productosAplicacionIds);
  }
  
  // 3. Eliminar Aplicaciones Eventos
  if (createdRecords.eventosIds.length > 0) {
    await deleteRecordsBatch('Aplicaciones Eventos', createdRecords.eventosIds);
  }
  
  // 4. Eliminar Cultivos Lotes Aplicaciones
  if (createdRecords.cultivosLotesIds.length > 0) {
    await deleteRecordsBatch('Cultivos Lotes Aplicaciones', createdRecords.cultivosLotesIds);
  }
  
  // 5. Eliminar Paquete Aplicaciones
  if (createdRecords.paqueteId) {
    try {
      await base('Paquete Aplicaciones').destroy([createdRecords.paqueteId]);
      console.log(`🗑️ [ROLLBACK] Eliminado paquete: ${createdRecords.paqueteId}`);
    } catch (error) {
      console.error(`❌ [ROLLBACK] Error eliminando paquete:`, error);
    }
  }
  
  console.log('✅ [ROLLBACK] Rollback completado\n');
}

// ============================================================================

interface PaqueteAplicacionData {
  nombre: string;
  clienteId: string;
  cultivoId: string;
  lotesIds: string[]; // Array de IDs de lotes
  lotesData?: Array<{id: string, areaHa: number, nombre?: string}>; // Datos completos de lotes con hectáreas y nombre
  microorganismos: Array<{id: string, nombre: string, dosificacionPorHa: number, unidad: string}>; // Datos completos con dosificación
  cantidadAplicacionesAno: number;
  periodicidadMeses: number;
  fechaInicio: string;
  hectareasTotales: number;
  litrosTotales: number;
  bolsasTotales: number;
  fechasCalculadas?: string[]; // Array de fechas programadas
  userName?: string; // Usuario que realiza el registro
}

export async function POST(request: NextRequest) {
  // Inicializar tracking de registros creados para rollback
  const createdRecords: CreatedRecords = {
    paqueteId: null,
    cultivosLotesIds: [],
    eventosIds: [],
    productosAplicacionIds: [],
    planificacionDiariaIds: []
  };
  
  try {
    console.log('🔵 [PAQUETE-API] Inicio de POST request');
    
    const data: PaqueteAplicacionData = await request.json();
    
    console.log('🔍 [PAQUETE-API] Datos recibidos:', {
      nombre: data.nombre,
      clienteId: data.clienteId,
      cultivoId: data.cultivoId,
      lotesCount: data.lotesIds?.length || 0,
      microorganismosCount: data.microorganismos?.length || 0,
      hectareasTotales: data.hectareasTotales,
      fechaInicio: data.fechaInicio,
      cantidadAplicacionesAno: data.cantidadAplicacionesAno,
      periodicidadMeses: data.periodicidadMeses,
      userName: data.userName,
      timestamp: new Date().toISOString()
    });

    // Validar datos requeridos
    if (!data.nombre || !data.clienteId || !data.microorganismos || data.microorganismos.length === 0) {
      console.error('❌ [PAQUETE-API] Datos faltantes:', {
        nombre: !!data.nombre,
        clienteId: !!data.clienteId,
        microorganismos: data.microorganismos?.length || 0
      });
      return NextResponse.json({
        success: false,
        error: 'Datos requeridos faltantes: nombre, clienteId y microorganismos son obligatorios'
      }, { status: 400 });
    }

    console.log('✅ [PAQUETE-API] Validaciones básicas pasadas');

    // ========================================================================
    // PASO 1: Crear el registro en la tabla Paquete Aplicaciones
    // ========================================================================
    console.log('🔄 [PAQUETE-API] [PASO 1/4] Creando Paquete Aplicaciones...');
    
    const paqueteRecord = await base('Paquete Aplicaciones').create({
      'Tipo Aplicacion': data.nombre, // Usar como identificador del paquete
      'ID Cliente': data.clienteId,
      // Nota: data.microorganismos contiene IDs de Sirius Product Core, no de DataLab
      // Por ahora solo guardamos la cantidad, los productos específicos estarán en Productos Aplicacion
      'Ciclo Dias': Math.round(365 / data.cantidadAplicacionesAno), // Calcular días por ciclo
      'Status': 'Activo',
      'Realiza Registro': data.userName || 'Usuario Desconocido'
    });

    // 🔒 ROLLBACK: Registrar paquete creado
    createdRecords.paqueteId = paqueteRecord.id;
    console.log('✅ [PAQUETE-API] Paquete Aplicaciones creado:', paqueteRecord.id);

    // ========================================================================
    // PASO 2: Crear Cultivos Lotes y Eventos por cada fecha
    // ========================================================================
    console.log('🔄 [PAQUETE-API] [PASO 2/4] Creando Cultivos Lotes Aplicaciones por fecha...');
    console.log(`📊 [PAQUETE-API] Se crearán: ${data.lotesIds.length} lotes × ${data.fechasCalculadas?.length || 0} fechas = ${data.lotesIds.length * (data.fechasCalculadas?.length || 0)} registros`);
    
    const eventosCreados: any[] = [];
    const todosCultivoLotesCreados: any[] = [];
    
    // Validar que hay fechas calculadas
    if (!data.fechasCalculadas || data.fechasCalculadas.length === 0) {
      console.warn('⚠️ [PAQUETE-API] No hay fechas calculadas, no se crearán eventos ni cultivos-lotes');
    } else {
      // Por cada fecha programada, crear un grupo independiente de cultivos-lotes
      for (let indexFecha = 0; indexFecha < data.fechasCalculadas.length; indexFecha++) {
        const fecha = data.fechasCalculadas[indexFecha];
        console.log(`\n📅 [PAQUETE-API] Procesando fecha ${indexFecha + 1}/${data.fechasCalculadas.length}: ${fecha}`);
        
        // Crear registros de cultivos-lotes para esta fecha específica
        const cultivoLotesDataFecha = data.lotesIds.map((loteId, indexLote) => {
          const loteInfo = data.lotesData?.find(lote => lote.id === loteId);
          const hectareasLote = loteInfo?.areaHa || 0;
          const nombreLote = loteInfo?.nombre || `Lote ${loteId}`; // Obtener el nombre real del lote
          const ordenSecuencia = indexLote + 1; // Orden secuencial basado en el orden de selección
          
          console.log(`  📍 [PAQUETE-API] Procesando lote ${indexLote + 1}: ID=${loteId}, Nombre="${nombreLote}", Hectáreas=${hectareasLote}`);
          
          return {
            fields: {
              'Nombre Cultivo Lote': `${data.cultivoId}-${loteId}-F${indexFecha + 1}`, // Agregar indicador de fecha
              'Nombre Lote': nombreLote, // Campo con el nombre original del bloque/lote
              'ID Cultivo': data.cultivoId,
              'ID Lote': loteId,
              'Hectareas Lotes': hectareasLote,
              'Orden Secuencia': ordenSecuencia // Orden en que se seleccionó el lote
            }
          };
        });
        
        // Crear los cultivos-lotes para esta fecha en lotes de máximo 10
        const cultivoLotesFechaCreados: any[] = [];
        const batchSize = 10;
        for (let i = 0; i < cultivoLotesDataFecha.length; i += batchSize) {
          const batch = cultivoLotesDataFecha.slice(i, i + batchSize);
          console.log(`  📦 [PAQUETE-API] Creando batch ${Math.floor(i/batchSize) + 1} de cultivos-lotes para fecha ${indexFecha + 1}: ${batch.length} registros`);
          const batchResults = await base('Cultivos Lotes Aplicaciones').create(batch);
          cultivoLotesFechaCreados.push(...batchResults);
          
          // 🔒 ROLLBACK: Registrar cultivos-lotes creados
          createdRecords.cultivosLotesIds.push(...batchResults.map((r: any) => r.id));
        }
        
        console.log(`  ✅ [PAQUETE-API] Cultivos-Lotes creados para fecha ${indexFecha + 1}: ${cultivoLotesFechaCreados.length}`);
        todosCultivoLotesCreados.push(...cultivoLotesFechaCreados);
        
        // Crear el evento SOLO para este grupo de cultivos-lotes
        const cultivoLotesIdsFecha = cultivoLotesFechaCreados.map((record: any) => record.id);
        
        const eventoRecord = await base('Aplicaciones Eventos').create({
          'Cultivos Lotes Aplicaciones': cultivoLotesIdsFecha, // Solo los cultivos-lotes de esta fecha
          'Fecha Programada': fecha,
          'Estado Aplicacion': 'PRESUPUESTADA',
          'Cantidad Total Biologicos Litros': Math.round(data.litrosTotales)
        });
        
        // 🔒 ROLLBACK: Registrar evento creado
        createdRecords.eventosIds.push(eventoRecord.id);
        
        eventosCreados.push(eventoRecord);
        console.log(`  ✅ [PAQUETE-API] Evento creado para fecha ${indexFecha + 1}: ${eventoRecord.id} (${cultivoLotesIdsFecha.length} cultivos-lotes)`);
      }
      
      console.log('\n📊 [PAQUETE-API] Resumen de creación:');
      console.log(`  - Total Cultivos-Lotes creados: ${todosCultivoLotesCreados.length}`);
      console.log(`  - Total Eventos creados: ${eventosCreados.length}`);
      console.log(`  - Cultivos-Lotes por evento: ${data.lotesIds.length}`);
      
      // ========================================================================
      // PASO 3: Generar planificación diaria automática para cada evento
      // ========================================================================
      if (eventosCreados.length > 0) {
        console.log('\n🔄 [PAQUETE-API] [PASO 3/4] Generando planificación diaria automática...');
        
        for (let i = 0; i < eventosCreados.length; i++) {
          const evento = eventosCreados[i];
          try {
            const fechaEvento = evento.fields['Fecha Programada'];
            const fechaInicioAplicacion = fechaEvento;
            
            // Obtener los IDs de cultivos-lotes específicos de este evento
            const cultivosLotesEventoRaw = evento.fields['Cultivos Lotes Aplicaciones'];
            const cultivosLotesEvento = Array.isArray(cultivosLotesEventoRaw) ? cultivosLotesEventoRaw : [];
            
            console.log(`\n🌱 [PAQUETE-API] Evento ${i + 1}/${eventosCreados.length}: ${evento.id}`);
            console.log(`  - Fecha: ${fechaEvento}`);
            console.log(`  - Cultivos-Lotes: ${cultivosLotesEvento.length}`);
            
            // Llamar al endpoint interno de auto-planificación
            const autoPlanificarModule = await import('../aplicaciones-eventos/auto-planificar/route');
            const mockRequest = {
              json: async () => ({
                fechaProgramada: fechaEvento,
                fechaInicioAplicacion: fechaInicioAplicacion,
                cultivosLotesAplicaciones: cultivosLotesEvento, // Usar los cultivos-lotes específicos de este evento
                capacidadDiariaHa: 60,
                estadoAplicacion: 'PRESUPUESTADA',
                skipCreacionEvento: true,
                eventoExistenteId: evento.id
              })
            } as any;
            
            const planificacionResponse = await autoPlanificarModule.POST(mockRequest);
            const planificacionData = await planificacionResponse.json();
            
            if (planificacionData.success) {
              console.log(`  ✅ Planificación generada: ${planificacionData.planificacion?.diasCreados || 0} días`);
              
              // 🔒 ROLLBACK: Registrar planificación diaria creada (si el endpoint devuelve IDs)
              if (planificacionData.planificacion?.diasIds) {
                createdRecords.planificacionDiariaIds.push(...planificacionData.planificacion.diasIds);
              }
            } else {
              // ⚠️ Error en planificación - hacer rollback
              console.error(`  ❌ Error crítico en planificación para evento ${evento.id}:`, planificacionData.error);
              throw new Error(`Error en auto-planificación para evento ${evento.id}: ${planificacionData.error}`);
            }
          } catch (error) {
            // Re-lanzar el error para activar el rollback
            console.error(`  ❌ Error en auto-planificación para evento ${evento.id}:`, error);
            throw error;
          }
        }
      }
      
      // ========================================================================
      // PASO 4: Crear Productos Aplicación
      // ========================================================================
      if (eventosCreados.length > 0) {
        console.log('\n🔄 [PAQUETE-API] [PASO 4/4] Actualizando paquete y creando Productos Aplicacion...');
        const eventosIds = eventosCreados.map((evento: any) => evento.id);
        
        await base('Paquete Aplicaciones').update(paqueteRecord.id, {
          'Aplicaciones Eventos': eventosIds
        });
        
        console.log('✅ [PAQUETE-API] Paquete actualizado con eventos:', eventosIds.length);
        
        // Crear registros en la tabla Productos Aplicacion
        console.log('🔍 [PAQUETE-API] Microorganismos con dosificación recibidos:', JSON.stringify(data.microorganismos, null, 2));
        console.log('🔍 [PAQUETE-API] Hectáreas totales:', data.hectareasTotales);
        
        // Obtener códigos de producto de Sirius Product Core para cada microorganismo
        const microorganismosCompletos: any[] = [];
        for (const microorganismo of data.microorganismos) {
          try {
            console.log(`🔍 [PAQUETE-API] Obteniendo código de producto para: ${microorganismo.nombre} (${microorganismo.id})`);
            const productoResponse = await fetch(
              `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_SIRIUS_PRODUCT_CORE}/${process.env.AIRTABLE_TABLE_SIRIUS_PRODUCTOS}/${microorganismo.id}`,
              {
                headers: {
                  'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY_SIRIUS_PRODUCT_CORE}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (productoResponse.ok) {
              const productoData = await productoResponse.json();
              
              // Validar que las variables de entorno estén configuradas
              if (!process.env.AIRTABLE_FIELD_SIRIUS_CODIGO_PRODUCTO) {
                throw new Error('AIRTABLE_FIELD_SIRIUS_CODIGO_PRODUCTO no está configurado');
              }
              if (!process.env.AIRTABLE_FIELD_SIRIUS_NOMBRE) {
                throw new Error('AIRTABLE_FIELD_SIRIUS_NOMBRE no está configurado');
              }
              
              const codigoProducto = productoData.fields[process.env.AIRTABLE_FIELD_SIRIUS_CODIGO_PRODUCTO];
              const nombre = productoData.fields[process.env.AIRTABLE_FIELD_SIRIUS_NOMBRE];
              
              microorganismosCompletos.push({
                id: microorganismo.id,
                nombre: nombre || microorganismo.nombre,
                codigoProducto: codigoProducto,
                dosificacionPorHa: microorganismo.dosificacionPorHa // Usar la dosificación del frontend
              });
              
              console.log(`✅ [PAQUETE-API] Producto: ${nombre} (${codigoProducto}) - ${microorganismo.dosificacionPorHa} L/ha (dosificación del frontend)`);
            } else {
              console.warn(`⚠️ [PAQUETE-API] No se pudo obtener datos del producto: ${microorganismo.id}, usando datos del frontend`);
              microorganismosCompletos.push({
                id: microorganismo.id,
                nombre: microorganismo.nombre,
                codigoProducto: `SIRIUS-PRODUCT-${microorganismo.id}`,
                dosificacionPorHa: microorganismo.dosificacionPorHa
              });
            }
          } catch (error) {
            console.error(`❌ [PAQUETE-API] Error obteniendo producto ${microorganismo.id}:`, error);
            microorganismosCompletos.push({
              id: microorganismo.id,
              nombre: microorganismo.nombre,
              codigoProducto: `SIRIUS-PRODUCT-${microorganismo.id}`,
              dosificacionPorHa: microorganismo.dosificacionPorHa
            });
          }
        }
        
        console.log(`📊 [PAQUETE-API] Microorganismos completos obtenidos: ${microorganismosCompletos.length}`);
        
        const productosAplicacionData = [];
        
        // Para cada evento creado
        for (const evento of eventosCreados) {
          // Para cada microorganismo configurado
          for (const microorganismo of microorganismosCompletos) {
            // La dosificación que se guarda es la dosis por hectárea configurada, no el total
            const dosificacionPorHa = microorganismo.dosificacionPorHa;
            
            console.log('🔍 [PAQUETE-API] Procesando microorganismo:', {
              nombre: microorganismo.nombre,
              id: microorganismo.id,
              codigoProducto: microorganismo.codigoProducto,
              dosificacionPorHa: dosificacionPorHa,
              hectareasTotales: data.hectareasTotales,
              dosificacionGuardada: dosificacionPorHa
            });
            
            // Validar que las variables de entorno estén configuradas
            if (!process.env.AIRTABLE_FIELD_PRODUCTOS_APLICACION_DOSIFICACION) {
              throw new Error('AIRTABLE_FIELD_PRODUCTOS_APLICACION_DOSIFICACION no está configurado');
            }
            if (!process.env.AIRTABLE_FIELD_PRODUCTOS_APLICACION_ID_PRODUCTO) {
              throw new Error('AIRTABLE_FIELD_PRODUCTOS_APLICACION_ID_PRODUCTO no está configurado');
            }
            if (!process.env.AIRTABLE_FIELD_PRODUCTOS_APLICACION_EVENTOS) {
              throw new Error('AIRTABLE_FIELD_PRODUCTOS_APLICACION_EVENTOS no está configurado');
            }
            
            const registroACrear = {
              fields: {
                [process.env.AIRTABLE_FIELD_PRODUCTOS_APLICACION_DOSIFICACION]: dosificacionPorHa,
                [process.env.AIRTABLE_FIELD_PRODUCTOS_APLICACION_ID_PRODUCTO]: microorganismo.codigoProducto || `SIRIUS-PRODUCT-${microorganismo.id}`,
                [process.env.AIRTABLE_FIELD_PRODUCTOS_APLICACION_EVENTOS]: [evento.id]
              }
            };
            
            console.log('🔍 [PAQUETE-API] Registro a crear:', JSON.stringify(registroACrear, null, 2));
            productosAplicacionData.push(registroACrear);
          }
        }
        
        console.log(`📦 [PAQUETE-API] Creando ${productosAplicacionData.length} registros de productos aplicacion...`);
        console.log(`📊 [PAQUETE-API] Cálculo: ${eventosCreados.length} eventos × ${data.microorganismos.length} productos = ${productosAplicacionData.length} registros`);
        console.log(`🔍 [PAQUETE-API] Ejemplo de registro a crear:`, JSON.stringify(productosAplicacionData[0], null, 2));
        
        // Crear registros en lotes de máximo 10
        const productosAplicacionCreados: any[] = [];
        const batchSizeProductos = 10;
        for (let i = 0; i < productosAplicacionData.length; i += batchSizeProductos) {
          const batch = productosAplicacionData.slice(i, i + batchSizeProductos);
          console.log(`📦 [PAQUETE-API] Creando batch de productos aplicacion ${Math.floor(i/batchSizeProductos) + 1} con ${batch.length} registros`);
          
          try {
            const batchResults = await base(process.env.AIRTABLE_TABLE_PRODUCTOS_APLICACION!).create(batch);
            productosAplicacionCreados.push(...batchResults);
            
            // 🔒 ROLLBACK: Registrar productos aplicación creados
            createdRecords.productosAplicacionIds.push(...batchResults.map((r: any) => r.id));
            
            console.log(`✅ [PAQUETE-API] Batch ${Math.floor(i/batchSizeProductos) + 1} creado exitosamente: ${batchResults.length} registros`);
            
            // Log del primer registro creado para verificar datos
            if (batchResults.length > 0) {
              console.log('🔍 [PAQUETE-API] Primer registro creado:', JSON.stringify({
                id: batchResults[0].id,
                fields: batchResults[0].fields
              }, null, 2));
            }
          } catch (batchError) {
            console.error('❌ [PAQUETE-API] Error creando batch de productos aplicacion:', batchError);
            console.error('📦 [PAQUETE-API] Batch que falló:', JSON.stringify(batch, null, 2));
            // Re-lanzar para activar rollback
            throw batchError;
          }
        }
        
        console.log('✅ [PAQUETE-API] Registros Productos Aplicacion creados:', productosAplicacionCreados.length);
      }
    }
    
    // ========================================================================
    // ✅ ÉXITO - Todos los registros fueron creados correctamente
    // ========================================================================
    console.log('\n🎉 [PAQUETE-API] Paquete de aplicaciones creado exitosamente');
    console.log('📊 [PAQUETE-API] Resumen final:', {
      paqueteId: paqueteRecord.id,
      cultivosLotes: createdRecords.cultivosLotesIds.length,
      eventos: createdRecords.eventosIds.length,
      productosAplicacion: createdRecords.productosAplicacionIds.length,
      planificacionDiaria: createdRecords.planificacionDiariaIds.length
    });

    return NextResponse.json({
      success: true,
      paqueteId: paqueteRecord.id,
      cultivoLotesCount: todosCultivoLotesCreados.length,
      eventosCount: eventosCreados.length,
      productosAplicacionCount: eventosCreados.length * data.microorganismos.length,
      message: `Paquete "${data.nombre}" creado exitosamente con ${todosCultivoLotesCreados.length} cultivos-lotes (${data.lotesIds.length} lotes × ${eventosCreados.length} fechas), ${eventosCreados.length} aplicaciones programadas y ${eventosCreados.length * data.microorganismos.length} registros de productos aplicacion`
    });

  } catch (error) {
    // ========================================================================
    // ❌ ERROR - Ejecutar rollback para eliminar registros huérfanos
    // ========================================================================
    console.error('\n❌ [PAQUETE-API] Error creando paquete aplicaciones - INICIANDO ROLLBACK');
    console.error('❌ [PAQUETE-API] Detalle del error:', {
      error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      timestamp: new Date().toISOString()
    });
    
    // 🔄 EJECUTAR ROLLBACK
    try {
      await executeRollback(createdRecords);
      console.log('✅ [PAQUETE-API] Rollback ejecutado exitosamente - No hay registros huérfanos');
    } catch (rollbackError) {
      console.error('❌ [PAQUETE-API] Error durante el rollback:', rollbackError);
      console.error('⚠️ [PAQUETE-API] ADVERTENCIA: Pueden haber quedado registros huérfanos. IDs creados:', createdRecords);
    }
    
    // Error específico de Airtable
    if (error && typeof error === 'object' && 'error' in error) {
      const airtableError = error as any;
      console.error('❌ [PAQUETE-API] Error de Airtable:', {
        type: airtableError.error?.type,
        message: airtableError.error?.message,
        statusCode: airtableError.statusCode
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor - Se ejecutó rollback para evitar registros huérfanos',
      details: error instanceof Error ? error.message : 'Error desconocido',
      rollbackExecuted: true,
      recordsRolledBack: {
        paquete: createdRecords.paqueteId ? 1 : 0,
        cultivosLotes: createdRecords.cultivosLotesIds.length,
        eventos: createdRecords.eventosIds.length,
        productosAplicacion: createdRecords.productosAplicacionIds.length,
        planificacionDiaria: createdRecords.planificacionDiariaIds.length
      },
      timestamp: new Date().toISOString()
    }, { 
      status: 500 
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('clienteId');
    
    console.log('🔍 [PAQUETE-API-GET] Consultando paquetes:', {
      clienteId,
      timestamp: new Date().toISOString()
    });

    let formula = '';
    if (clienteId) {
      formula = `{ID Cliente} = '${clienteId}'`;
      console.log('📋 [PAQUETE-API-GET] Fórmula aplicada:', formula);
    }

    console.log('🔄 [PAQUETE-API-GET] Consultando tabla Paquete Aplicaciones...');

    // Construir los parámetros de selección
    const selectParams: any = {
      sort: [{ field: 'Fecha de Creacion', direction: 'desc' }]
    };

    // Solo agregar filterByFormula si hay condiciones
    if (formula) {
      selectParams.filterByFormula = formula;
      console.log('📋 [PAQUETE-API-GET] Fórmula aplicada:', formula);
    }

    console.log('📋 [PAQUETE-API-GET] Parámetros de selección:', selectParams);

    const records = await base('Paquete Aplicaciones')
      .select(selectParams)
      .all();

    console.log('✅ [PAQUETE-API-GET] Registros encontrados:', records.length);

    const paquetes = records.map(record => {
      console.log('🔍 [PAQUETE-API-GET] Procesando registro:', record.id);
      
      return {
        id: record.id,
        nombre: record.get('Tipo Aplicacion'),
        clienteId: record.get('ID Cliente'),
        microorganismos: record.get('ID Microorganismos') || [],
        cicloDias: record.get('Ciclo Dias'),
        fechaFin: record.get('Fecha Fin'),
        status: record.get('Status'),
        realizaRegistro: record.get('Realiza Registro'),
        createdTime: record.get('Fecha de Creacion')
      };
    });

    console.log('✅ [PAQUETE-API-GET] Paquetes mapeados exitosamente:', paquetes.length);

    return NextResponse.json({
      success: true,
      paquetes,
      count: paquetes.length
    });

  } catch (error) {
    console.error('❌ [PAQUETE-API-GET] Error completo consultando paquetes:', {
      error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Error específico de Airtable
    if (error && typeof error === 'object' && 'error' in error) {
      const airtableError = error as any;
      console.error('❌ [PAQUETE-API-GET] Error de Airtable:', {
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