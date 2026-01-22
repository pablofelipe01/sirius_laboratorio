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

interface PaqueteAplicacionData {
  nombre: string;
  clienteId: string;
  cultivoId: string;
  lotesIds: string[]; // Array de IDs de lotes
  lotesData?: Array<{id: string, areaHa: number}>; // Datos completos de lotes con hectáreas
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

    // Crear el registro en la tabla Paquete Aplicaciones
    console.log('🔄 [PAQUETE-API] Creando registro en Airtable...');
    
    const paqueteRecord = await base('Paquete Aplicaciones').create({
      'Tipo Aplicacion': data.nombre, // Usar como identificador del paquete
      'ID Cliente': data.clienteId,
      // Nota: data.microorganismos contiene IDs de Sirius Product Core, no de DataLab
      // Por ahora solo guardamos la cantidad, los productos específicos estarán en Productos Aplicacion
      'Ciclo Dias': Math.round(365 / data.cantidadAplicacionesAno), // Calcular días por ciclo
      'Status': 'Activo',
      'Realiza Registro': data.userName || 'Usuario Desconocido'
    });

    console.log('✅ [PAQUETE-API] Paquete Aplicaciones creado:', paqueteRecord.id);

    // 🔄 NUEVA LÓGICA: Crear cultivos-lotes POR CADA fecha programada
    // Esto permite ajustar hectáreas/lotes de forma independiente para cada aplicación
    console.log('🔄 [PAQUETE-API] Creando registros de Cultivos Lotes Aplicaciones por fecha...');
    console.log(`📊 [PAQUETE-API] Se crearán: ${data.lotesIds.length} lotes × ${data.fechasCalculadas?.length || 0} fechas = ${data.lotesIds.length * (data.fechasCalculadas?.length || 0)} registros`);
    
    const eventosCreados = [];
    const todosCultivoLotesCreados = [];
    
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
          const ordenSecuencia = indexLote + 1; // Orden secuencial basado en el orden de selección
          
          return {
            fields: {
              'Nombre Cultivo Lote': `${data.cultivoId}-${loteId}-F${indexFecha + 1}`, // Agregar indicador de fecha
              'ID Cultivo': data.cultivoId,
              'ID Lote': loteId,
              'Hectareas Lotes': hectareasLote,
              'Orden Secuencia': ordenSecuencia // Orden en que se seleccionó el lote
            }
          };
        });
        
        // Crear los cultivos-lotes para esta fecha en lotes de máximo 10
        const cultivoLotesFechaCreados = [];
        const batchSize = 10;
        for (let i = 0; i < cultivoLotesDataFecha.length; i += batchSize) {
          const batch = cultivoLotesDataFecha.slice(i, i + batchSize);
          console.log(`  📦 [PAQUETE-API] Creando batch ${Math.floor(i/batchSize) + 1} de cultivos-lotes para fecha ${indexFecha + 1}: ${batch.length} registros`);
          const batchResults = await base('Cultivos Lotes Aplicaciones').create(batch);
          cultivoLotesFechaCreados.push(...batchResults);
        }
        
        console.log(`  ✅ [PAQUETE-API] Cultivos-Lotes creados para fecha ${indexFecha + 1}: ${cultivoLotesFechaCreados.length}`);
        todosCultivoLotesCreados.push(...cultivoLotesFechaCreados);
        
        // Crear el evento SOLO para este grupo de cultivos-lotes
        const cultivoLotesIdsFecha = cultivoLotesFechaCreados.map(record => record.id);
        
        const eventoRecord = await base('Aplicaciones Eventos').create({
          'Cultivos Lotes Aplicaciones': cultivoLotesIdsFecha, // Solo los cultivos-lotes de esta fecha
          'Fecha Programada': fecha,
          'Estado Aplicacion': 'PRESUPUESTADA',
          'Cantidad Total Biologicos Litros': Math.round(data.litrosTotales)
        });
        
        eventosCreados.push(eventoRecord);
        console.log(`  ✅ [PAQUETE-API] Evento creado para fecha ${indexFecha + 1}: ${eventoRecord.id} (${cultivoLotesIdsFecha.length} cultivos-lotes)`);
      }
      
      console.log('\n📊 [PAQUETE-API] Resumen de creación:');
      console.log(`  - Total Cultivos-Lotes creados: ${todosCultivoLotesCreados.length}`);
      console.log(`  - Total Eventos creados: ${eventosCreados.length}`);
      console.log(`  - Cultivos-Lotes por evento: ${data.lotesIds.length}`);
      
      // 🚀 GENERAR PLANIFICACIÓN DIARIA AUTOMÁTICA PARA CADA EVENTO
      if (eventosCreados.length > 0) {
        console.log('\n📅 [PAQUETE-API] Generando planificación diaria automática para eventos...');
        
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
                capacidadDiariaHa: 50,
                estadoAplicacion: 'PRESUPUESTADA',
                skipCreacionEvento: true,
                eventoExistenteId: evento.id
              })
            } as any;
            
            const planificacionResponse = await autoPlanificarModule.POST(mockRequest);
            const planificacionData = await planificacionResponse.json();
            
            if (planificacionData.success) {
              console.log(`  ✅ Planificación generada: ${planificacionData.planificacion?.diasCreados || 0} días`);
            } else {
              console.warn(`  ⚠️ Error en planificación:`, planificacionData.error);
            }
          } catch (error) {
            console.error(`  ❌ Error en auto-planificación para evento ${evento.id}:`, error);
          }
        }
      }
      
      // Actualizar el paquete para incluir los IDs de los eventos creados
      if (eventosCreados.length > 0) {
        console.log('\n🔗 [PAQUETE-API] Actualizando paquete con eventos relacionados...');
        const eventosIds = eventosCreados.map(evento => evento.id);
        
        await base('Paquete Aplicaciones').update(paqueteRecord.id, {
          'Aplicaciones Eventos': eventosIds
        });
        
        console.log('✅ [PAQUETE-API] Paquete actualizado con eventos:', eventosIds.length);
        
        // Crear registros en la tabla Productos Aplicacion
        console.log('\n🔄 [PAQUETE-API] Creando registros de Productos Aplicacion...');
        console.log('🔍 [PAQUETE-API] Microorganismos con dosificación recibidos:', JSON.stringify(data.microorganismos, null, 2));
        console.log('🔍 [PAQUETE-API] Hectáreas totales:', data.hectareasTotales);
        
        // Obtener códigos de producto de Sirius Product Core para cada microorganismo
        const microorganismosCompletos = [];
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
        const productosAplicacionCreados = [];
        const batchSizeProductos = 10;
        for (let i = 0; i < productosAplicacionData.length; i += batchSizeProductos) {
          const batch = productosAplicacionData.slice(i, i + batchSizeProductos);
          console.log(`📦 [PAQUETE-API] Creando batch de productos aplicacion ${Math.floor(i/batchSizeProductos) + 1} con ${batch.length} registros`);
          
          try {
            const batchResults = await base(process.env.AIRTABLE_TABLE_PRODUCTOS_APLICACION!).create(batch);
            productosAplicacionCreados.push(...batchResults);
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
            throw batchError;
          }
        }
        
        console.log('✅ [PAQUETE-API] Registros Productos Aplicacion creados:', productosAplicacionCreados.length);
      }
    }

    return NextResponse.json({
      success: true,
      paqueteId: paqueteRecord.id,
      cultivoLotesCount: todosCultivoLotesCreados.length,
      eventosCount: eventosCreados.length,
      productosAplicacionCount: eventosCreados.length * data.microorganismos.length,
      message: `Paquete "${data.nombre}" creado exitosamente con ${todosCultivoLotesCreados.length} cultivos-lotes (${data.lotesIds.length} lotes × ${eventosCreados.length} fechas), ${eventosCreados.length} aplicaciones programadas y ${eventosCreados.length * data.microorganismos.length} registros de productos aplicacion`
    });

  } catch (error) {
    console.error('❌ [PAQUETE-API] Error completo creando paquete aplicaciones:', {
      error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      timestamp: new Date().toISOString()
    });
    
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
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido',
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