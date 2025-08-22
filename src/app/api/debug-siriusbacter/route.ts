import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_TABLE_MICROORGANISMOS = process.env.AIRTABLE_TABLE_MICROORGANISMOS;
    const AIRTABLE_TABLE_FERMENTACION = process.env.AIRTABLE_TABLE_FERMENTACION;

    console.log('🧪 [DEBUG-SIRIUSBACTER] ===== INICIANDO DEBUG =====');
    console.log('🔑 AIRTABLE_API_KEY exists:', !!AIRTABLE_API_KEY);
    console.log('🔑 AIRTABLE_BASE_ID:', AIRTABLE_BASE_ID);
    console.log('🗄️ AIRTABLE_TABLE_MICROORGANISMOS:', AIRTABLE_TABLE_MICROORGANISMOS);
    console.log('🗄️ AIRTABLE_TABLE_FERMENTACION:', AIRTABLE_TABLE_FERMENTACION);

    // 1. Buscar microorganismo SiriusBacter
    const microorganismosUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_MICROORGANISMOS}`;
    console.log('🌐 URL microorganismos:', microorganismosUrl);

    const microorganismosResponse = await fetch(microorganismosUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!microorganismosResponse.ok) {
      throw new Error(`Error consultando microorganismos: ${microorganismosResponse.status}`);
    }

    const microorganismosData = await microorganismosResponse.json();
    console.log('📊 Total microorganismos encontrados:', microorganismosData.records.length);

    // Buscar SiriusBacter específicamente
    const siriusBacter = microorganismosData.records.find((record: any) => 
      record.fields.Microorganismo?.toLowerCase().includes('siriusbacter')
    );

    console.log('🧬 SiriusBacter encontrado:', !!siriusBacter);
    if (siriusBacter) {
      console.log('🧬 SiriusBacter ID:', siriusBacter.id);
      console.log('🧬 SiriusBacter nombre:', siriusBacter.fields.Microorganismo);
    }

    // 2. Buscar microorganismos en fermentación 100L
    const fermentacionUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_FERMENTACION}?filterByFormula=AND({Estado}="Disponible",{Etapa Produccion}="Fermentacion 100L")&sort[0][field]=Creada&sort[0][direction]=asc`;
    console.log('🌐 URL fermentación:', fermentacionUrl);

    const fermentacionResponse = await fetch(fermentacionUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!fermentacionResponse.ok) {
      throw new Error(`Error consultando fermentación: ${fermentacionResponse.status}`);
    }

    const fermentacionData = await fermentacionResponse.json();
    console.log('📊 Total registros en Fermentacion 100L disponibles:', fermentacionData.records.length);

    // Agrupar por tipo de microorganismo
    const microorganismosPorTipo: { [key: string]: any[] } = {};
    fermentacionData.records.forEach((record: any) => {
      const microorganismo = record.fields['Microorganismo']?.[0];
      if (microorganismo) {
        if (!microorganismosPorTipo[microorganismo]) {
          microorganismosPorTipo[microorganismo] = [];
        }
        microorganismosPorTipo[microorganismo].push({
          id: record.id,
          codigoLote: record.fields['Codigo Lote'],
          totalLitros: record.fields['Total Litros'],
          fechaCreacion: record.fields['Creada'],
          fechaTermina: record.fields['Fecha Termina Fermentacion']
        });
      }
    });

    const requiredTypes = ['PseudoMonas', 'AzosPirillum', 'AzotoBacter'];
    const available: { [key: string]: any[] } = {};
    const missing: string[] = [];

    requiredTypes.forEach(tipo => {
      const disponibles = microorganismosPorTipo[tipo] || [];
      available[tipo] = disponibles;
      if (disponibles.length === 0) {
        missing.push(tipo);
      }
    });

    return NextResponse.json({
      success: true,
      debug: {
        siriusBacterEncontrado: !!siriusBacter,
        siriusBacterId: siriusBacter?.id,
        siriusBacterNombre: siriusBacter?.fields.Microorganismo,
        totalMicroorganismos: microorganismosData.records.length,
        totalFermentacion100L: fermentacionData.records.length,
        microorganismosPorTipo,
        microorganismosRequeridos: requiredTypes,
        microorganismosDisponibles: available,
        microorganismosFaltantes: missing,
        puedeCrearSiriusBacter: missing.length === 0
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG-SIRIUSBACTER] ERROR:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      debug: {
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}
