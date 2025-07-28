import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🌾 Creando nuevo registro de cosecha:', {
      cliente: body.cliente,
      hongo: body.hongo,
      litros: body.litros,
      timestamp: new Date().toISOString()
    });

    // Primero, necesitamos encontrar el ID del cliente en Airtable
    let clienteId = null;
    
    if (body.cliente && body.cliente !== 'nuevo') {
      // Buscar el cliente existente por nombre
      const clienteResponse = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_CLIENTES_LABORATORIO}?filterByFormula={Nombre}="${body.cliente}"`, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (clienteResponse.ok) {
        const clienteData = await clienteResponse.json();
        if (clienteData.records && clienteData.records.length > 0) {
          clienteId = clienteData.records[0].id;
          console.log('🔍 Cliente encontrado:', clienteId);
        }
      }
    }

    // Buscar el ID del microorganismo
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
    const lotesTexto = body.lotes?.map((lote: any) => lote.lote).join(',') || '';
    const bolsasLotesTexto = body.lotes?.map((lote: any) => lote.bolsas).join(',') || '';
    const totalBolsas = body.lotes?.reduce((total: number, lote: any) => total + (parseInt(lote.bolsas) || 0), 0) || 0;

    // Preparar los datos con Field IDs específicos
    const fields: any = {};

    // Campos obligatorios con Field IDs
    if (horaInicioISO) fields[process.env.AIRTABLE_FIELD_COSECHA_HORA_INICIO!] = horaInicioISO;
    if (horaFinISO) fields[process.env.AIRTABLE_FIELD_COSECHA_HORA_FIN!] = horaFinISO;
    if (body.registradoPor) fields[process.env.AIRTABLE_FIELD_COSECHA_REALIZA_REGISTRO!] = body.registradoPor;
    if (body.litros) fields[process.env.AIRTABLE_FIELD_COSECHA_LITROS!] = parseFloat(body.litros);
    if (body.bidones) fields[process.env.AIRTABLE_FIELD_COSECHA_BIDONES!] = parseFloat(body.bidones);
    if (lotesTexto) fields[process.env.AIRTABLE_FIELD_COSECHA_LOTES!] = lotesTexto;
    if (bolsasLotesTexto) fields[process.env.AIRTABLE_FIELD_COSECHA_BOLSAS_LOTES!] = bolsasLotesTexto;
    if (totalBolsas > 0) fields[process.env.AIRTABLE_FIELD_COSECHA_TOTAL_BOLSAS!] = totalBolsas;
    
    // Campo responsable
    if (body.responsableEntregaId) {
      console.log('🔍 Intentando guardar responsable:', {
        fieldId: process.env.AIRTABLE_FIELD_COSECHA_RESPONSABLE,
        responsableId: body.responsableEntregaId
      });
      fields[process.env.AIRTABLE_FIELD_COSECHA_RESPONSABLE!] = [body.responsableEntregaId];
    }

    // Enlaces a otras tablas
    if (clienteId) fields[process.env.AIRTABLE_FIELD_COSECHA_CLIENTE!] = [clienteId];
    if (microorganismoId) fields[process.env.AIRTABLE_FIELD_COSECHA_MICROORGANISMOS!] = [microorganismoId];

    console.log('📝 Datos preparados para Airtable:', fields);

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
      console.error('❌ Error de Airtable:', errorData);
      throw new Error(`Airtable API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();

    console.log('✅ Cosecha creada exitosamente:', {
      id: result.id,
      cliente: body.cliente,
      timestamp: new Date().toISOString()
    });

    // PASO ADICIONAL: Crear registros en Salida Inoculacion para cada lote usado
    let salidaInoculacionIds: string[] = [];
    
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
                  [process.env.AIRTABLE_FIELD_SALIDA_INOCULACION_COSECHA!]: [result.id] // Cosecha Laboratorio (vincular con el evento de cosecha)
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
    let salidaCepasIds: string[] = [];
    
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
                  [process.env.AIRTABLE_FIELD_SALIDA_CEPAS_COSECHA!]: [result.id] // Cosecha Laboratorio (vincular con el evento de cosecha)
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

    return NextResponse.json({
      success: true,
      message: 'Cosecha registrada exitosamente',
      cosechaId: result.id,
      salidaInoculacionIds,
      salidaCepasIds,
      data: result.fields
    });

  } catch (error) {
    console.error('❌ Error al crear cosecha:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al registrar la cosecha',
        details: error instanceof Error ? error.message : 'Error desconocido'
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

    const formattedRecords = data.records.map((record: any) => ({
      id: record.id,
      horaInicio: record.fields[process.env.AIRTABLE_FIELD_COSECHA_HORA_INICIO!],
      horaFin: record.fields[process.env.AIRTABLE_FIELD_COSECHA_HORA_FIN!],
      cliente: record.fields['Nombre (from Cliente)']?.[0] || 'Cliente no especificado',
      hongo: record.fields['Microorganismo (from Microorganismos)']?.[0] || 'Microorganismo no especificado',
      litros: record.fields[process.env.AIRTABLE_FIELD_COSECHA_LITROS!],
      bidones: record.fields[process.env.AIRTABLE_FIELD_COSECHA_BIDONES!],
      lotes: record.fields[process.env.AIRTABLE_FIELD_COSECHA_LOTES!],
      bolsasLotes: record.fields[process.env.AIRTABLE_FIELD_COSECHA_BOLSAS_LOTES!],
      totalBolsas: record.fields[process.env.AIRTABLE_FIELD_COSECHA_TOTAL_BOLSAS!],
      registradoPor: record.fields[process.env.AIRTABLE_FIELD_COSECHA_REALIZA_REGISTRO!],
      fechaCreacion: record.fields[process.env.AIRTABLE_FIELD_COSECHA_FECHA_CREACION!]
    }));

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
