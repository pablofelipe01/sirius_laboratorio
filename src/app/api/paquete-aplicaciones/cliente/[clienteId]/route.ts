import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  try {
    const { clienteId } = await params;
    console.log('🔍 [PAQUETES-CLIENTE] Consultando paquetes para cliente:', clienteId);
    
    const airtableApiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    if (!airtableApiKey || !baseId) {
      throw new Error('Configuración de Airtable faltante');
    }

    // Consultar paquetes del cliente específico
    // Necesitamos usar el ID Cliente (formato CL-XXXX) no el record ID
    const filterFormula = encodeURIComponent(`{ID Cliente} = "${clienteId}"`);
    const paquetesUrl = `https://api.airtable.com/v0/${baseId}/Paquete%20Aplicaciones?filterByFormula=${filterFormula}&sort[0][field]=Fecha%20de%20Creacion&sort[0][direction]=desc`;
    
    console.log('🔍 [PAQUETES-CLIENTE] URL consulta:', paquetesUrl);
    
    const paquetesResponse = await fetch(paquetesUrl, {
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!paquetesResponse.ok) {
      const errorText = await paquetesResponse.text();
      console.error('❌ [PAQUETES-CLIENTE] Error details:', {
        status: paquetesResponse.status,
        statusText: paquetesResponse.statusText,
        error: errorText,
        clienteId,
        filterFormula
      });
      throw new Error(`Error consultando paquetes: ${paquetesResponse.status} - ${errorText}`);
    }

    const paquetesData = await paquetesResponse.json();
    
    console.log('📦 [PAQUETES-CLIENTE] Paquetes encontrados:', paquetesData.records?.length || 0);

    if (!paquetesData.records || paquetesData.records.length === 0) {
      return NextResponse.json({
        paquetes: [],
        message: 'No se encontraron paquetes para este cliente'
      });
    }

    // Obtener información detallada de cada paquete con sus aplicaciones eventos
    const paquetesDetallados = await Promise.all(
      paquetesData.records.map(async (paquete: any) => {
        const paqueteId = paquete.id;
        const eventosIds = paquete.fields['Aplicaciones Eventos'] || [];
        
        console.log(`🎯 [PAQUETES-CLIENTE] Procesando paquete ${paqueteId} con ${eventosIds.length} eventos`);
        
        // Consultar eventos relacionados
        let eventosDetalle = [];
        if (eventosIds.length > 0) {
          const eventosFilter = encodeURIComponent(`OR(${eventosIds.map((id: string) => `RECORD_ID() = "${id}"`).join(',')})`);
          const eventosUrl = `https://api.airtable.com/v0/${baseId}/Aplicaciones%20Eventos?filterByFormula=${eventosFilter}`;
          
          const eventosResponse = await fetch(eventosUrl, {
            headers: {
              'Authorization': `Bearer ${airtableApiKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (eventosResponse.ok) {
            const eventosData = await eventosResponse.json();
            eventosDetalle = eventosData.records.map((evento: any) => ({
              id: evento.id,
              fechaProgramada: evento.fields['Fecha Programada'],
              estado: evento.fields['Estado Aplicacion'] || 'PROGRAMADA',
              hectareas: evento.fields['Total Hectareas'] || 0,
              formula: evento.fields['Formula Aplicacion'] || '',
              cultivo: evento.fields['Cultivo'] || 'Sin especificar'
            }));
          }
        }

        // Consultar planificación diaria para ver progreso
        const planificacionFilter = encodeURIComponent(`{Aplicacion Evento ID} = "${eventosIds[0] || ''}"`);
        const planificacionUrl = `https://api.airtable.com/v0/${baseId}/Planificacion%20Diaria%20Aplicacion?filterByFormula=${planificacionFilter}`;
        
        let planificacionInfo = { diasTotal: 0, diasCompletados: 0, hectareasTotal: 0, hectareasCompletadas: 0 };
        
        try {
          const planificacionResponse = await fetch(planificacionUrl, {
            headers: {
              'Authorization': `Bearer ${airtableApiKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (planificacionResponse.ok) {
            const planificacionData = await planificacionResponse.json();
            const registros = planificacionData.records || [];
            
            planificacionInfo = {
              diasTotal: registros.length,
              diasCompletados: registros.filter((r: any) => r.fields['Estado'] === 'COMPLETADA').length,
              hectareasTotal: registros.reduce((sum: number, r: any) => sum + (r.fields['Hectareas Planificadas'] || 0), 0),
              hectareasCompletadas: registros.reduce((sum: number, r: any) => sum + (r.fields['Hectareas Ejecutadas'] || 0), 0)
            };
          }
        } catch (planErr) {
          console.log('⚠️ [PAQUETES-CLIENTE] Error consultando planificación:', planErr);
        }

        return {
          id: paqueteId,
          nombre: paquete.fields['Tipo Aplicacion'] || `Paquete ${paqueteId.substring(0, 8)}`,
          fechaCreacion: paquete.fields['Fecha de Creacion'],
          status: paquete.fields['Status'] || 'Activo',
          idCliente: paquete.fields['ID Cliente'] || '',
          cicloDias: paquete.fields['Ciclo Dias'] || 0,
          totalHectareas: paquete.fields['Total Hectareas'] || 0,
          fechaInicio: paquete.fields['Fecha Inicio']?.[0] || null,
          fechaFin: paquete.fields['Fecha Fin']?.[0] || null,
          eventos: eventosDetalle,
          progreso: {
            ...planificacionInfo,
            porcentajeCompletado: planificacionInfo.hectareasTotal > 0 ? 
              Math.round((planificacionInfo.hectareasCompletadas / planificacionInfo.hectareasTotal) * 100) : 0
          },
          esActivo: paquete.fields['Status'] === 'Activo'
        };
      })
    );

    // Incluir todos los paquetes (por ahora no filtrar por estado activo)
    const paquetesProcesados = paquetesDetallados
      .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());

    console.log('✅ [PAQUETES-CLIENTE] Paquetes procesados:', {
      totalPaquetes: paquetesDetallados.length,
      paquetesDevueltos: paquetesProcesados.length,
      eventosTotal: paquetesProcesados.reduce((sum, p) => sum + p.eventos.length, 0),
      ejemplos: paquetesProcesados.slice(0, 2).map(p => ({
        id: p.id,
        nombre: p.nombre,
        status: p.status
      }))
    });

    return NextResponse.json({
      paquetes: paquetesProcesados,
      total: paquetesProcesados.length,
      clienteId
    });

  } catch (error) {
    console.error('❌ [PAQUETES-CLIENTE] Error:', error);
    return NextResponse.json({
      error: 'Error al consultar paquetes del cliente',
      details: error instanceof Error ? error.message : 'Error desconocido',
      paquetes: []
    }, { status: 500 });
  }
}