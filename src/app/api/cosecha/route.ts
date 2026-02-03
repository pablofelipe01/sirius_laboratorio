import { NextRequest, NextResponse } from 'next/server';
import { 
  AIRTABLE_CONFIG,
  SIRIUS_INVENTARIO_CONFIG, 
  SIRIUS_PEDIDOS_CORE_CONFIG,
  buildSiriusInventarioUrl, 
  buildSiriusPedidosCoreUrl,
  getSiriusInventarioHeaders,
  getSiriusPedidosCoreHeaders
} from '@/lib/constants/airtable';
import { ClienteMigrationService } from '@/lib/services/ClienteMigrationService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🌾 ===== INICIO PROCESO DE COSECHA =====');
    console.log('🌾 Datos recibidos:', JSON.stringify({
      cliente: body.cliente,
      hongo: body.hongo,
      litros: body.litros,
      bidones: body.bidones,
      idPedidoCore: body.idPedidoCore,
      idProductoCore: body.idProductoCore,
      idDetallePedido: body.idDetallePedido,
      responsableEntregaId: body.responsableEntregaId,
      lotesSeleccionados: body.lotesSeleccionados?.length || 0,
      cepasSeleccionadas: body.cepasSeleccionadas?.length || 0,
      timestamp: new Date().toISOString()
    }, null, 2));

    // Buscar cliente en Sirius Client Core
    let clienteCoreId = null;
    let clienteCoreCode = null;
    
    if (body.cliente && body.cliente !== 'nuevo') {
      console.log('🔍 Buscando cliente en Sirius Client Core:', body.cliente);
      
      const clienteCore = await ClienteMigrationService.findClienteInCore(body.cliente);
      
      if (clienteCore) {
        clienteCoreId = clienteCore.id;
        clienteCoreCode = clienteCore.codigo; // CL-0001, CL-0002, etc.
        console.log('🏢 Cliente Core encontrado:', { id: clienteCoreId, codigo: clienteCoreCode });
      } else {
        console.log('⚠️ Cliente no encontrado en Sirius Client Core:', body.cliente);
      }
    }

    // NOTA: Ya no buscar el ID del microorganismo de DataLab
    // La función ahora guarda el nombre directamente como texto
    /*
    let microorganismoId = null;
    if (body.hongo) {
      const microResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_MICROORGANISMOS}?filterByFormula={Microorganismo}="${body.hongo}"`, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (microResponse.ok) {
        const microData = await microResponse.json();
        if (microData.records && microData.records.length > 0) {
          microorganismoId = microData.records[0].id;
          console.log('🍄 Microorganismo encontrado:', microorganismoId);
        }
      }
    }
    */
    console.log('🍄 Microorganismo (texto):', body.hongo);

    // Convertir horas a formato ISO completo con fecha actual en zona horaria de Colombia
    const now = new Date();
    // Obtener fecha actual en zona horaria de Colombia
    const colombiaDateString = now.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }); // formato YYYY-MM-DD
    const today = colombiaDateString;
    
    // Función para convertir hora local de Colombia a UTC
    const convertirHoraColombiaAUTC = (horaLocal: string): string => {
      // Crear fecha completa interpretando la hora como hora de Colombia
      const fechaCompleta = `${today}T${horaLocal}:00`;
      
      // Crear un objeto Date interpretando la fecha como si fuera UTC
      const fechaBase = new Date(fechaCompleta + 'Z');
      
      // Colombia está en UTC-5, así que para convertir a UTC necesitamos sumar 5 horas
      const offsetColombia = 5 * 60 * 60 * 1000; // 5 horas en milisegundos
      const fechaUTC = new Date(fechaBase.getTime() + offsetColombia);
      
      return fechaUTC.toISOString();
    };
    
    // Construir fechas ISO ajustadas para Colombia
    const horaInicioISO = body.horaInicio ? convertirHoraColombiaAUTC(body.horaInicio) : null;
    const horaFinISO = body.horaFin ? convertirHoraColombiaAUTC(body.horaFin) : null;

    // Procesar lotes
    const lotesTexto = body.lotes?.map((lote: { lote: string; bolsas: string }) => lote.lote).join(',') || '';
    const bolsasLotesTexto = body.lotes?.map((lote: { lote: string; bolsas: string }) => lote.bolsas).join(',') || '';
    const totalBolsas = body.lotes?.reduce((total: number, lote: { lote: string; bolsas: string }) => total + (parseInt(lote.bolsas) || 0), 0) || 0;

    console.log('📋 Lotes procesados:', { lotesTexto, bolsasLotesTexto, totalBolsas });

    // Verificar variables de entorno críticas para cosecha
    const envCheck = {
      AIRTABLE_BASE_ID: !!process.env.AIRTABLE_BASE_ID,
      AIRTABLE_API_KEY: !!process.env.AIRTABLE_API_KEY,
      AIRTABLE_TABLE_COSECHA_LABORATORIO: !!process.env.AIRTABLE_TABLE_COSECHA_LABORATORIO,
      AIRTABLE_FIELD_COSECHA_HORA_INICIO: !!process.env.AIRTABLE_FIELD_COSECHA_HORA_INICIO,
      AIRTABLE_FIELD_COSECHA_HORA_FIN: !!process.env.AIRTABLE_FIELD_COSECHA_HORA_FIN,
      AIRTABLE_FIELD_COSECHA_LITROS: !!process.env.AIRTABLE_FIELD_COSECHA_LITROS,
      AIRTABLE_FIELD_COSECHA_BIDONES: !!process.env.AIRTABLE_FIELD_COSECHA_BIDONES,
      AIRTABLE_FIELD_COSECHA_LOTES: !!process.env.AIRTABLE_FIELD_COSECHA_LOTES,
      AIRTABLE_FIELD_COSECHA_BOLSAS_LOTES: !!process.env.AIRTABLE_FIELD_COSECHA_BOLSAS_LOTES,
      AIRTABLE_FIELD_COSECHA_TOTAL_BOLSAS: !!process.env.AIRTABLE_FIELD_COSECHA_TOTAL_BOLSAS,
      AIRTABLE_FIELD_COSECHA_REALIZA_REGISTRO: !!process.env.AIRTABLE_FIELD_COSECHA_REALIZA_REGISTRO,
      AIRTABLE_FIELD_COSECHA_CLIENTE_CORE_CODE: !!process.env.AIRTABLE_FIELD_COSECHA_CLIENTE_CORE_CODE,
      AIRTABLE_FIELD_COSECHA_MICROORGANISMO_TEXTO: !!process.env.AIRTABLE_FIELD_COSECHA_MICROORGANISMO_TEXTO,
      FIELDS_COSECHA_ID_RESPONSABLE_CORE: !!AIRTABLE_CONFIG.FIELDS_COSECHA?.ID_RESPONSABLE_CORE,
      FIELDS_COSECHA_ID_PEDIDO_CORE: !!AIRTABLE_CONFIG.FIELDS_COSECHA?.ID_PEDIDO_CORE,
      FIELDS_COSECHA_ID_PRODUCTO_CORE: !!AIRTABLE_CONFIG.FIELDS_COSECHA?.ID_PRODUCTO_CORE,
    };
    
    const missingEnvVars = Object.entries(envCheck).filter(([, value]) => !value).map(([key]) => key);
    if (missingEnvVars.length > 0) {
      console.error('❌ Variables de entorno FALTANTES:', missingEnvVars);
    } else {
      console.log('✅ Todas las variables de entorno de cosecha están configuradas');
    }

    // Preparar los datos con Field IDs específicos
    const fields: Record<string, unknown> = {};

    // Campos obligatorios con Field IDs
    if (horaInicioISO && process.env.AIRTABLE_FIELD_COSECHA_HORA_INICIO) {
      fields[process.env.AIRTABLE_FIELD_COSECHA_HORA_INICIO] = horaInicioISO;
    }
    if (horaFinISO && process.env.AIRTABLE_FIELD_COSECHA_HORA_FIN) {
      fields[process.env.AIRTABLE_FIELD_COSECHA_HORA_FIN] = horaFinISO;
    }
    if (body.registradoPor && process.env.AIRTABLE_FIELD_COSECHA_REALIZA_REGISTRO) {
      fields[process.env.AIRTABLE_FIELD_COSECHA_REALIZA_REGISTRO] = body.registradoPor;
    }
    if (body.litros && process.env.AIRTABLE_FIELD_COSECHA_LITROS) {
      fields[process.env.AIRTABLE_FIELD_COSECHA_LITROS] = parseFloat(body.litros);
    }
    if (body.bidones && process.env.AIRTABLE_FIELD_COSECHA_BIDONES) {
      fields[process.env.AIRTABLE_FIELD_COSECHA_BIDONES] = parseFloat(body.bidones);
    }
    if (lotesTexto && process.env.AIRTABLE_FIELD_COSECHA_LOTES) {
      fields[process.env.AIRTABLE_FIELD_COSECHA_LOTES] = lotesTexto;
    }
    if (bolsasLotesTexto && process.env.AIRTABLE_FIELD_COSECHA_BOLSAS_LOTES) {
      fields[process.env.AIRTABLE_FIELD_COSECHA_BOLSAS_LOTES] = bolsasLotesTexto;
    }
    if (totalBolsas > 0 && process.env.AIRTABLE_FIELD_COSECHA_TOTAL_BOLSAS) {
      fields[process.env.AIRTABLE_FIELD_COSECHA_TOTAL_BOLSAS] = totalBolsas;
    }
    
    // Campo ID Responsable Core (texto con código SIRIUS-PER-XXXX)
    if (body.responsableEntregaId && AIRTABLE_CONFIG.FIELDS_COSECHA?.ID_RESPONSABLE_CORE) {
      console.log('🔍 Guardando ID Responsable Core:', body.responsableEntregaId);
      fields[AIRTABLE_CONFIG.FIELDS_COSECHA.ID_RESPONSABLE_CORE] = body.responsableEntregaId;
    } else if (body.responsableEntregaId) {
      console.log('⚠️ No se puede guardar ID Responsable Core: variable de entorno no configurada');
    }

    // Enlaces y campos de texto
    if (clienteCoreCode && process.env.AIRTABLE_FIELD_COSECHA_CLIENTE_CORE_CODE) {
      fields[process.env.AIRTABLE_FIELD_COSECHA_CLIENTE_CORE_CODE] = clienteCoreCode;
    }
    
    // ID Pedido Core (campo de texto)
    if (body.idPedidoCore && AIRTABLE_CONFIG.FIELDS_COSECHA?.ID_PEDIDO_CORE) {
      console.log('📦 Guardando ID Pedido Core:', body.idPedidoCore);
      fields[AIRTABLE_CONFIG.FIELDS_COSECHA.ID_PEDIDO_CORE] = body.idPedidoCore;
    } else if (body.idPedidoCore) {
      console.log('⚠️ No se puede guardar ID Pedido Core: variable de entorno no configurada');
    }
    
    // ID Producto Core (campo long text)
    if (body.idProductoCore && AIRTABLE_CONFIG.FIELDS_COSECHA?.ID_PRODUCTO_CORE) {
      console.log('🧪 Guardando ID Producto Core:', body.idProductoCore);
      fields[AIRTABLE_CONFIG.FIELDS_COSECHA.ID_PRODUCTO_CORE] = body.idProductoCore;
    } else if (body.idProductoCore) {
      console.log('⚠️ No se puede guardar ID Producto Core: variable de entorno no configurada');
    }
    
    // NUEVO: Guardar nombre de microorganismo como texto (desvincular tabla DataLab)
    if (body.hongo && process.env.AIRTABLE_FIELD_COSECHA_MICROORGANISMO_TEXTO) {
      fields[process.env.AIRTABLE_FIELD_COSECHA_MICROORGANISMO_TEXTO] = body.hongo;
    }
    
    // NOTA: Ya no vincular con tabla Microorganismos de DataLab
    // if (microorganismoId) fields[process.env.AIRTABLE_FIELD_COSECHA_MICROORGANISMOS!] = [microorganismoId];

    console.log('📝 Datos preparados para Airtable:', JSON.stringify(fields, null, 2));
    console.log('📝 Field IDs utilizados:', Object.keys(fields));

    // Variable para almacenar el código de cosecha (se actualizará después de crear el registro)
    let cosechaCode = '';

    console.log('🔗 URL Airtable:', `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_COSECHA_LABORATORIO}`);

    // Crear el registro en Airtable
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_COSECHA_LABORATORIO}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Error de Airtable al crear cosecha:');
      console.error('❌ Status:', response.status);
      console.error('❌ Respuesta:', JSON.stringify(errorData, null, 2));
      throw new Error(`Airtable API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log('✅ Cosecha creada en Airtable:', result.id);

    // Los campos calculados/fórmula NO se devuelven en respuesta POST, hacer GET
    console.log('🔄 Consultando registro para obtener campo ID (fórmula)...');
    try {
      const getRecordResponse = await fetch(
        `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_COSECHA_LABORATORIO}/${result.id}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (getRecordResponse.ok) {
        const fullRecord = await getRecordResponse.json();
        
        // DEBUG: Ver todos los campos que devuelve Airtable
        console.log('🔍 Campos disponibles en el registro:', Object.keys(fullRecord.fields));
        console.log('📋 Valores de campos relevantes:', {
          'ID (por nombre)': fullRecord.fields['ID'],
          'ID (por field ID)': fullRecord.fields[process.env.AIRTABLE_FIELD_COSECHA_ID!],
          'FIELD_ID usado': process.env.AIRTABLE_FIELD_COSECHA_ID,
        });
        
        // Intentar primero por nombre del campo "ID", luego por field ID
        const cosechaIdFormula = fullRecord.fields['ID'] || fullRecord.fields[process.env.AIRTABLE_FIELD_COSECHA_ID!] as string;
        console.log('📊 Campo ID (fórmula) obtenido:', cosechaIdFormula);
        
        if (cosechaIdFormula) {
          cosechaCode = cosechaIdFormula;
          console.log('🏷️ Código de cosecha obtenido de fórmula:', cosechaCode);
        } else {
          // Fallback: usar el ID de Airtable como parte del código
          cosechaCode = `LAB-COSE-${result.id}`;
          console.log('⚠️ Campo ID no disponible, usando ID de registro:', cosechaCode);
        }
      } else {
        console.log('⚠️ Error en GET:', getRecordResponse.status);
        cosechaCode = `LAB-COSE-${result.id}`;
      }
    } catch (error) {
      console.log('⚠️ Error al consultar registro:', error);
      cosechaCode = `LAB-COSE-${result.id}`;
    }

    console.log('✅ Cosecha creada exitosamente:', {
      id: result.id,
      cosechaCode: cosechaCode,
      cliente: body.cliente,
      timestamp: new Date().toISOString()
    });

    // PASO ADICIONAL: Crear registros en Salida Inoculacion para cada lote usado
    const salidaInoculacionIds: string[] = [];
    
    // Extraer lotes seleccionados del formulario
    const lotesSeleccionados = body.lotesSeleccionados || [];
    const cantidadesLotes = body.cantidadesLotes || {};
    
    if (lotesSeleccionados.length > 0) {
      try {
        console.log('📝 Creando registros en Salida Inoculacion...');
        
        for (const loteId of lotesSeleccionados) {
          const cantidad = parseInt(cantidadesLotes[loteId]) || 0;
          if (cantidad > 0) {
            console.log(`🔄 Procesando lote ${loteId} con cantidad ${cantidad}`);
            
            // Crear registro en Salida Inoculacion
            const salidaResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_SALIDA_INOCULACION}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fields: {
                  [process.env.AIRTABLE_FIELD_SALIDA_INOCULACION_FECHA_EVENTO!]: today, // Fecha Evento (fecha de cosecha)
                  [process.env.AIRTABLE_FIELD_SALIDA_INOCULACION_CANTIDAD_BOLSAS!]: cantidad, // Cantidad Bolsas utilizadas
                  [process.env.AIRTABLE_FIELD_SALIDA_INOCULACION_LOTE_ALTERADO!]: [loteId], // Lote Alterado (ID del lote de inoculación)
                  [process.env.AIRTABLE_FIELD_SALIDA_INOCULACION_COSECHA!]: [result.id], // Cosecha Laboratorio (vincular con el evento de cosecha)
                  'Realiza Registro': body.registradoPor || 'Usuario Desconocido' // Usuario que realizó la cosecha
                }
              }),
            });

            if (salidaResponse.ok) {
              const salidaResult = await salidaResponse.json();
              salidaInoculacionIds.push(salidaResult.id);
              console.log(`✅ Salida Inoculacion creada para lote ${loteId}:`, salidaResult.id);
            } else {
              const errorData = await salidaResponse.json();
              console.error(`❌ Error al crear Salida Inoculacion para lote ${loteId}:`, errorData);
            }
          }
        }

        // Si se crearon registros de Salida Inoculacion, vincular la cosecha con ellos
        if (salidaInoculacionIds.length > 0) {
          console.log('🔗 Vinculando Cosecha con Salida Inoculacion...');
          
          const updateResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_COSECHA_LABORATORIO}/${result.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fields: {
                [process.env.AIRTABLE_FIELD_COSECHA_SALIDA_INOCULACION!]: salidaInoculacionIds
              }
            }),
          });

          if (updateResponse.ok) {
            console.log('✅ Cosecha vinculada con Salida Inoculacion exitosamente');
          } else {
            const errorData = await updateResponse.json();
            console.error('❌ Error al vincular Cosecha con Salida Inoculacion:', errorData);
          }
        }

      } catch (error) {
        console.error('❌ Error al crear registros de Salida Inoculacion:', error);
        // No fallar el proceso principal, solo mostrar advertencia en logs
      }
    }

    // PASO ADICIONAL: Crear registros en Salida Cepas para cada cepa usada
    const salidaCepasIds: string[] = [];
    
    // Extraer cepas seleccionadas del formulario
    const cepasSeleccionadas = body.cepasSeleccionadas || [];
    const cantidadesCepas = body.cantidadesCepas || {};
    
    if (cepasSeleccionadas.length > 0) {
      try {
        console.log('🧫 Creando registros en Salida Cepas...');
        
        for (const cepaId of cepasSeleccionadas) {
          const cantidad = parseInt(cantidadesCepas[cepaId]) || 0;
          if (cantidad > 0) {
            console.log(`🔄 Procesando cepa ${cepaId} con cantidad ${cantidad}`);
            
            // Crear registro en Salida Cepas
            const salidaResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_SALIDA_CEPAS}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fields: {
                  [process.env.AIRTABLE_FIELD_SALIDA_CEPAS_FECHA_EVENTO!]: today, // Fecha Evento (fecha de cosecha)
                  [process.env.AIRTABLE_FIELD_SALIDA_CEPAS_CANTIDAD_BOLSAS!]: cantidad, // Cantidad Bolsas utilizadas
                  [process.env.AIRTABLE_FIELD_SALIDA_CEPAS_CEPAS!]: [cepaId], // Cepas (ID de la cepa)
                  [process.env.AIRTABLE_FIELD_SALIDA_CEPAS_COSECHA!]: [result.id], // Cosecha Laboratorio (vincular con el evento de cosecha)
                  'Realiza Registro': body.registradoPor || 'Usuario Desconocido' // Usuario que realizó la cosecha
                }
              }),
            });

            if (salidaResponse.ok) {
              const salidaResult = await salidaResponse.json();
              salidaCepasIds.push(salidaResult.id);
              console.log(`✅ Salida Cepas creada para cepa ${cepaId}:`, salidaResult.id);
            } else {
              const errorData = await salidaResponse.json();
              console.error(`❌ Error al crear Salida Cepas para cepa ${cepaId}:`, errorData);
            }
          }
        }

      } catch (error) {
        console.error('❌ Error al crear registros de Salida Cepas:', error);
        // No fallar el proceso principal, solo mostrar advertencia en logs
      }
    }

    // PASO ADICIONAL: Registrar movimiento en Inventario Production Core
    try {
      console.log('📦 Registrando movimiento de inventario...');
      
      // Buscar el código de producto centralizado del microorganismo seleccionado
      let productId = null;
      // NOTA: clienteCoreId ya se definió al inicio de la función
      
      // 1. Buscar código de producto directamente en Sirius Product Core por nombre
      if (body.hongo) {
        console.log('🔍 Buscando código de producto en Sirius Product Core:', body.hongo);
        
        // Verificar variables de entorno
        console.log('🔧 Verificando configuración Sirius Product Core:');
        console.log('  - Base ID:', process.env.AIRTABLE_BASE_ID_SIRIUS_PRODUCT_CORE ? 'Configurado' : 'FALTANTE');
        console.log('  - Table ID:', process.env.AIRTABLE_TABLE_PRODUCTOS ? 'Configurado' : 'FALTANTE');
        console.log('  - API Key:', process.env.AIRTABLE_API_KEY_SIRIUS_PRODUCT_CORE ? 'Configurado' : 'FALTANTE');
        
        const baseId = process.env.AIRTABLE_BASE_ID_SIRIUS_PRODUCT_CORE;
        const tableId = process.env.AIRTABLE_TABLE_PRODUCTOS;
        const apiKey = process.env.AIRTABLE_API_KEY_SIRIUS_PRODUCT_CORE;
        
        if (!baseId || !tableId || !apiKey) {
          console.log('❌ Variables de entorno faltantes para Sirius Product Core');
          console.log('⚠️ No se puede consultar código de producto, usando fallback');
        } else {
          console.log('✅ Variables de entorno configuradas correctamente');
          
          try {
            const testUrl = `https://api.airtable.com/v0/${baseId}/${tableId}?maxRecords=3`;
            console.log('🌐 URL de prueba:', testUrl);
            
            // Primero, listar algunos productos para ver el formato real
            const debugResponse = await fetch(testUrl, {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
            });
            
            console.log('📊 Status de consulta de prueba:', debugResponse.status);
            
            if (debugResponse.ok) {
              const debugData = await debugResponse.json();
              console.log('🔬 Productos de ejemplo en Sirius Product Core:', 
                debugData.records?.map((r: any) => ({
                  id: r.id,
                  nombreComercial: r.fields['Nombre Comercial'],
                  codigoProducto: r.fields['Codigo Producto'],
                  tipo: r.fields['Tipo Producto']
                })) || []
              );
              
              // Solo continuar con la búsqueda si la consulta de prueba funcionó
              if (debugData.records && debugData.records.length > 0) {
                const searchUrl = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula={Nombre Comercial}="${body.hongo}"`;
                console.log('🔍 URL de búsqueda:', searchUrl);
                
                // Buscar producto por nombre comercial en Sirius Product Core
                const productoResponse = await fetch(searchUrl, {
                  headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                  },
                });

                console.log('📊 Status de búsqueda específica:', productoResponse.status);

                if (productoResponse.ok) {
                  const productoData = await productoResponse.json();
                  console.log('📋 Resultados de búsqueda:', {
                    encontrados: productoData.records?.length || 0,
                    registros: productoData.records?.map((r: any) => ({
                      nombreComercial: r.fields['Nombre Comercial'],
                      codigoProducto: r.fields['Codigo Producto']
                    })) || []
                  });
                  
                  if (productoData.records && productoData.records.length > 0) {
                    const productoRecord = productoData.records[0];
                    productId = productoRecord.fields['Codigo Producto'] || productoRecord.fields['ID Producto'] || null;
                    console.log('💡 Código de producto encontrado en Sirius Product Core:', productId);
                  } else {
                    console.log('⚠️ Producto no encontrado en Sirius Product Core');
                  }
                } else {
                  const errorData = await productoResponse.text();
                  console.log('❌ Error en búsqueda específica:', errorData);
                }
              }
            } else {
              const errorData = await debugResponse.text();
              console.log('❌ Error en consulta de prueba:', errorData);
            }
          } catch (error) {
            console.error('❌ Error consultando Sirius Product Core:', error);
          }
        }
      }
      
      // 2. Usar el cliente Core ya encontrado anteriormente
      console.log('🏢 Usando cliente Core para inventario:', { 
        id: clienteCoreId, 
        codigo: clienteCoreCode,
        status: clienteCoreId ? 'Encontrado' : 'No encontrado'
      });
      
      // Si no se encontró el código, usar formato de fallback basado en el microorganismo
      if (!productId) {
        console.log('⚠️ No se encontró código de producto, usando formato de fallback');
        const microorganismoSlug = body.hongo ? body.hongo.toUpperCase().replace(/\s+/g, '-') : 'GENERICO';
        productId = `SIRIUS-${microorganismoSlug}-001`;
      }
      
      console.log('🏷️ Código de producto final:', productId);
      
      // NUEVO: Actualizar el registro de cosecha con el ID Producto Core
      try {
        const updateCosechaResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_COSECHA_LABORATORIO}/${result.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: {
              [process.env.AIRTABLE_FIELD_COSECHA_ID_PRODUCTO_CORE!]: productId
            }
          }),
        });
        
        if (updateCosechaResponse.ok) {
          console.log('✅ ID Producto Core guardado en cosecha:', productId);
        } else {
          console.log('⚠️ No se pudo actualizar ID Producto Core en cosecha');
        }
      } catch (error) {
        console.log('⚠️ Error actualizando ID Producto Core:', error);
      }
      
      console.log(' Cliente Core ID final:', clienteCoreId || 'No encontrado');
      console.log('🏢 Cliente Core Code final:', clienteCoreCode || 'No encontrado');
      console.log('🔖 Código de cosecha para inventario:', cosechaCode);
      
      // Crear observaciones detalladas con los lotes utilizados
      const observacionesInventario = `Cosecha de ${body.hongo || 'Microorganismo no especificado'} - Cliente: ${body.cliente || 'No especificado'} - Lotes: ${lotesTexto} - Cantidades: ${bolsasLotesTexto}`;
      
      const movimientoData = {
        fields: {
          [SIRIUS_INVENTARIO_CONFIG.FIELDS_MOVIMIENTOS.PRODUCT_ID]: productId,
          [SIRIUS_INVENTARIO_CONFIG.FIELDS_MOVIMIENTOS.TIPO_MOVIMIENTO]: "Entrada", // Cosecha = ingreso de producto para venta
          [SIRIUS_INVENTARIO_CONFIG.FIELDS_MOVIMIENTOS.CANTIDAD]: parseFloat(body.litros) || 0, // Usar litros de la cosecha
          [SIRIUS_INVENTARIO_CONFIG.FIELDS_MOVIMIENTOS.UNIDAD_MEDIDA]: "litros", // Cosecha se mide en litros
          [SIRIUS_INVENTARIO_CONFIG.FIELDS_MOVIMIENTOS.MOTIVO]: "Cosecha laboratorio",
          [SIRIUS_INVENTARIO_CONFIG.FIELDS_MOVIMIENTOS.DOCUMENTO_REFERENCIA]: `COSECHA-${result.id}`,
          [SIRIUS_INVENTARIO_CONFIG.FIELDS_MOVIMIENTOS.RESPONSABLE]: body.registradoPor || 'Usuario Desconocido',
          [SIRIUS_INVENTARIO_CONFIG.FIELDS_MOVIMIENTOS.FECHA_MOVIMIENTO]: new Date().toISOString(),
          [SIRIUS_INVENTARIO_CONFIG.FIELDS_MOVIMIENTOS.OBSERVACIONES]: observacionesInventario,
          // 🎯 TRAZABILIDAD CON CÓDIGOS LEGIBLES:
          // ubicacion_origen_id = LAB-COSE-XXXX (código de cosecha)
          // ubicacion_destino_id = SIRIUS-PED-XXXX (código de pedido)
          [SIRIUS_INVENTARIO_CONFIG.FIELDS_MOVIMIENTOS.UBICACION_ORIGEN_ID]: cosechaCode, // Código LAB-COSE-XXXX obtenido previamente
          [SIRIUS_INVENTARIO_CONFIG.FIELDS_MOVIMIENTOS.UBICACION_DESTINO_ID]: body.idPedidoCore || 'PED-NO-IDENTIFICADO' // ID del pedido
        }
      };

      console.log('📋 Datos para movimiento inventario:', JSON.stringify(movimientoData, null, 2));

      const inventarioResponse = await fetch(
        buildSiriusInventarioUrl(SIRIUS_INVENTARIO_CONFIG.TABLES.MOVIMIENTOS_INVENTARIO),
        {
          method: 'POST',
          headers: getSiriusInventarioHeaders(),
          body: JSON.stringify(movimientoData),
        }
      );

      if (inventarioResponse.ok) {
        const inventarioResult = await inventarioResponse.json();
        console.log('✅ Movimiento de inventario registrado:', inventarioResult.id);
        
        // ============================================================
        // MARCAR PRODUCTO COMO LISTO EN DETALLES DEL PEDIDO
        // ============================================================
        let productoListoActualizado = false;
        if (body.idDetallePedido) {
          try {
            console.log('📦 Marcando producto como listo en detalle del pedido:', body.idDetallePedido);
            
            const detalleUrl = buildSiriusPedidosCoreUrl(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.DETALLES_PEDIDO, body.idDetallePedido);
            
            const detalleResponse = await fetch(detalleUrl, {
              method: 'PATCH',
              headers: getSiriusPedidosCoreHeaders(),
              body: JSON.stringify({
                fields: {
                  [SIRIUS_PEDIDOS_CORE_CONFIG.FIELDS_DETALLES.PRODUCTO_LISTO]: true // Campo "Producto Listo" = checkbox marcado
                }
              }),
            });

            if (detalleResponse.ok) {
              productoListoActualizado = true;
              console.log('✅ Producto marcado como listo en detalle del pedido');
            } else {
              const errorDetalle = await detalleResponse.text();
              console.error('⚠️ Error al marcar producto como listo:', errorDetalle);
            }
          } catch (detalleError) {
            console.error('⚠️ Error al actualizar detalle del pedido:', detalleError);
          }
        }
        
        return NextResponse.json({
          success: true,
          message: 'Cosecha registrada exitosamente con movimiento de inventario',
          cosechaId: result.id,
          salidaInoculacionIds,
          salidaCepasIds,
          movimientoInventarioId: inventarioResult.id,
          productoListoActualizado,
          data: result.fields
        });
      } else {
        const errorData = await inventarioResponse.json();
        console.error('⚠️ Error al registrar movimiento de inventario:', errorData);
        // No fallar el proceso principal, la cosecha ya se creó correctamente
        
        // Aún así intentar marcar producto como listo
        let productoListoActualizado = false;
        if (body.idDetallePedido) {
          try {
            const detalleUrl = buildSiriusPedidosCoreUrl(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.DETALLES_PEDIDO, body.idDetallePedido);
            const detalleResponse = await fetch(detalleUrl, {
              method: 'PATCH',
              headers: getSiriusPedidosCoreHeaders(),
              body: JSON.stringify({ fields: { [SIRIUS_PEDIDOS_CORE_CONFIG.FIELDS_DETALLES.PRODUCTO_LISTO]: true } }),
            });
            productoListoActualizado = detalleResponse.ok;
          } catch (e) { console.error('⚠️ Error marcando producto listo:', e); }
        }
        
        return NextResponse.json({
          success: true,
          message: 'Cosecha registrada exitosamente (error en movimiento de inventario)',
          cosechaId: result.id,
          salidaInoculacionIds,
          salidaCepasIds,
          inventarioWarning: 'Error al registrar movimiento de inventario',
          productoListoActualizado,
          data: result.fields
        });
      }

    } catch (inventarioError) {
      console.error('❌ Error al procesar movimiento de inventario:', inventarioError);
      // No fallar el proceso principal
      
      // Aún así intentar marcar producto como listo
      let productoListoActualizado = false;
      if (body.idDetallePedido) {
        try {
          const detalleUrl = buildSiriusPedidosCoreUrl(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.DETALLES_PEDIDO, body.idDetallePedido);
          const detalleResponse = await fetch(detalleUrl, {
            method: 'PATCH',
            headers: getSiriusPedidosCoreHeaders(),
            body: JSON.stringify({ fields: { [SIRIUS_PEDIDOS_CORE_CONFIG.FIELDS_DETALLES.PRODUCTO_LISTO]: true } }),
          });
          productoListoActualizado = detalleResponse.ok;
        } catch (e) { console.error('⚠️ Error marcando producto listo:', e); }
      }
      
      return NextResponse.json({
        success: true,
        message: 'Cosecha registrada exitosamente (error en movimiento de inventario)',
        cosechaId: result.id,
        salidaInoculacionIds,
        salidaCepasIds,
        inventarioWarning: 'Error al procesar movimiento de inventario',
        productoListoActualizado,
        data: result.fields
      });
    }

  } catch (error) {
    console.error('❌ ===== ERROR EN PROCESO DE COSECHA =====');
    console.error('❌ Error:', error);
    console.error('❌ Stack:', error instanceof Error ? error.stack : 'No stack disponible');
    
    // Extraer mensaje de error más específico
    let errorMessage = 'Error al registrar la cosecha';
    let errorDetails = 'Error desconocido';
    
    if (error instanceof Error) {
      errorDetails = error.message;
      
      // Detectar errores comunes de Airtable
      if (error.message.includes('UNKNOWN_FIELD_NAME')) {
        errorMessage = 'Error de configuración: campo de Airtable no encontrado';
      } else if (error.message.includes('INVALID_REQUEST_UNKNOWN_FIELD')) {
        errorMessage = 'Error de configuración: campo inválido en la solicitud';
      } else if (error.message.includes('INVALID_PERMISSIONS')) {
        errorMessage = 'Error de permisos: sin acceso a la base de datos';
      } else if (error.message.includes('INVALID_API_KEY')) {
        errorMessage = 'Error de autenticación: API key inválida';
      } else if (error.message.includes('TABLE_NOT_FOUND')) {
        errorMessage = 'Error de configuración: tabla no encontrada';
      } else if (error.message.includes('NOT_FOUND')) {
        errorMessage = 'Error: registro o recurso no encontrado';
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    console.log('📋 Obteniendo cosechas:', {
      limit,
      timestamp: new Date().toISOString()
    });

    // Obtener registros de cosechas usando Field IDs
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_COSECHA_LABORATORIO}?maxRecords=${limit}&sort%5B0%5D%5Bfield%5D=${process.env.AIRTABLE_FIELD_COSECHA_FECHA_CREACION}&sort%5B0%5D%5Bdirection%5D=desc`, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();

    interface AirtableRecord {
      id: string;
      fields: Record<string, unknown>;
    }

    const formattedRecords = data.records.map((record: AirtableRecord) => {
      const clienteField = record.fields['Nombre (from Cliente)'] as string[] | undefined;
      const hongoField = record.fields['Microorganismo (from Microorganismos)'] as string[] | undefined;
      
      return {
        id: record.id,
        horaInicio: record.fields[process.env.AIRTABLE_FIELD_COSECHA_HORA_INICIO!],
        horaFin: record.fields[process.env.AIRTABLE_FIELD_COSECHA_HORA_FIN!],
        cliente: clienteField?.[0] || 'Cliente no especificado',
        hongo: hongoField?.[0] || 'Microorganismo no especificado',
        litros: record.fields[process.env.AIRTABLE_FIELD_COSECHA_LITROS!],
        bidones: record.fields[process.env.AIRTABLE_FIELD_COSECHA_BIDONES!],
        lotes: record.fields[process.env.AIRTABLE_FIELD_COSECHA_LOTES!],
        bolsasLotes: record.fields[process.env.AIRTABLE_FIELD_COSECHA_BOLSAS_LOTES!],
        totalBolsas: record.fields[process.env.AIRTABLE_FIELD_COSECHA_TOTAL_BOLSAS!],
        registradoPor: record.fields[process.env.AIRTABLE_FIELD_COSECHA_REALIZA_REGISTRO!],
        fechaCreacion: record.fields[process.env.AIRTABLE_FIELD_COSECHA_FECHA_CREACION!]
      };
    });

    console.log('✅ Cosechas obtenidas:', {
      cantidad: formattedRecords.length,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      cosechas: formattedRecords,
      total: formattedRecords.length
    });

  } catch (error) {
    console.error('Error al obtener cosechas:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener datos de cosechas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
