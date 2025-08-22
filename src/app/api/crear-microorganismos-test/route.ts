import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_TABLE_FERMENTACION = process.env.AIRTABLE_TABLE_FERMENTACION;
    const AIRTABLE_TABLE_MICROORGANISMOS = process.env.AIRTABLE_TABLE_MICROORGANISMOS;

    console.log('🧪 [CREAR-MICROORGANISMOS-100L] ===== INICIANDO CREACIÓN =====');

    // 1. Buscar los IDs de microorganismos
    const microorganismosResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_MICROORGANISMOS}`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const microorganismosData = await microorganismosResponse.json();
    
    const microorganismosIds = {
      PseudoMonas: microorganismosData.records.find((r: any) => r.fields.Microorganismo === 'PseudoMonas')?.id,
      AzosPirillum: microorganismosData.records.find((r: any) => r.fields.Microorganismo === 'AzosPirillum')?.id,
      AzotoBacter: microorganismosData.records.find((r: any) => r.fields.Microorganismo === 'AzotoBacter')?.id,
    };

    console.log('🔍 IDs encontrados:', microorganismosIds);

    // 2. Crear registros en Fermentacion 100L para cada microorganismo
    const ahora = new Date();
    const ayer = new Date(ahora.getTime() - 24 * 60 * 60 * 1000); // Ayer para que estén "disponibles"
    
    const registrosACrear = [
      {
        fields: {
          'Fecha Inicia Fermentacion': ahora.toISOString(),
          'Fecha Termina Fermentacion': ayer.toISOString(), // Ayer para que esté "Disponible"
          'Fecha Inicia Fermentacion 100L': ahora.toISOString(),
          'Etapa Produccion': 'Fermentacion 100L',
          'Cantidad Litros': 100,
          'Observaciones': 'Microorganismo de prueba para SiriusBacter - Creado automáticamente en 100L',
          'Realiza Registro': 'Sistema Test',
          'Microorganismos': [microorganismosIds.PseudoMonas]
        }
      },
      {
        fields: {
          'Fecha Inicia Fermentacion': ahora.toISOString(),
          'Fecha Termina Fermentacion': ayer.toISOString(), // Ayer para que esté "Disponible"
          'Fecha Inicia Fermentacion 100L': ahora.toISOString(),
          'Etapa Produccion': 'Fermentacion 100L',
          'Cantidad Litros': 100,
          'Observaciones': 'Microorganismo de prueba para SiriusBacter - Creado automáticamente en 100L',
          'Realiza Registro': 'Sistema Test',
          'Microorganismos': [microorganismosIds.AzosPirillum]
        }
      },
      {
        fields: {
          'Fecha Inicia Fermentacion': ahora.toISOString(),
          'Fecha Termina Fermentacion': ayer.toISOString(), // Ayer para que esté "Disponible"
          'Fecha Inicia Fermentacion 100L': ahora.toISOString(),
          'Etapa Produccion': 'Fermentacion 100L',
          'Cantidad Litros': 100,
          'Observaciones': 'Microorganismo de prueba para SiriusBacter - Creado automáticamente en 100L',
          'Realiza Registro': 'Sistema Test',
          'Microorganismos': [microorganismosIds.AzotoBacter]
        }
      }
    ];

    console.log('📦 Registros a crear:', JSON.stringify(registrosACrear, null, 2));

    // 3. Crear los registros
    const createResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_FERMENTACION}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: registrosACrear
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Error creando registros: ${createResponse.status}`);
    }

    const createData = await createResponse.json();
    console.log('✅ Registros creados:', createData.records.length);

    return NextResponse.json({
      success: true,
      message: 'Microorganismos de prueba creados en 100L',
      microorganismosCreados: createData.records.map((r: any) => ({
        id: r.id,
        microorganismo: r.fields.Microorganismo?.[0] || 'N/A',
        codigoLote: r.fields['Codigo Lote'],
        estado: r.fields.Estado,
        etapa: r.fields['Etapa Produccion'],
        litros: r.fields['Cantidad Litros']
      })),
      totalCreados: createData.records.length,
      instrucciones: 'Ahora puedes probar el botón "Iniciar Mezcla SiriusBacter"'
    });

  } catch (error) {
    console.error('❌ [CREAR-MICROORGANISMOS-100L] ERROR:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
