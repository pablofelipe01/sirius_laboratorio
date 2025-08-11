import { NextRequest, NextResponse } from 'next/server';

// Configuración de Airtable para tabla Entrada Insumos
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_TABLE_ENTRADA_INSUMOS = process.env.AIRTABLE_TABLE_ENTRADA_INSUMOS || 'tblTO7MaIpQPgZr2s';

// Crear múltiples registros de entrada de insumos
export async function POST(request: NextRequest) {
  try {
    console.log('📥 ENTRADA-INSUMOS API: Iniciando POST request...');
    console.log('🔧 ENTRADA-INSUMOS API: Verificando variables de entorno...');
    console.log('   - AIRTABLE_BASE_ID:', AIRTABLE_BASE_ID ? 'Configurado' : 'NO CONFIGURADO');
    console.log('   - AIRTABLE_API_KEY:', AIRTABLE_API_KEY ? 'Configurado' : 'NO CONFIGURADO');
    console.log('   - AIRTABLE_TABLE_ENTRADA_INSUMOS:', AIRTABLE_TABLE_ENTRADA_INSUMOS);
    
    if (!AIRTABLE_BASE_ID || !AIRTABLE_API_KEY) {
      console.error('❌ ENTRADA-INSUMOS API: Faltan variables de entorno de Airtable');
      return NextResponse.json(
        { success: false, error: 'Configuración de Airtable incompleta' },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('📋 ENTRADA-INSUMOS API: Body recibido:', body);

    const { records, proveedor, numeroFactura, observaciones } = body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Se requiere al menos un registro de entrada' },
        { status: 400 }
      );
    }

    // Validar cada registro
    for (const record of records) {
      if (!record.fields) {
        return NextResponse.json(
          { success: false, error: 'Cada registro debe tener un objeto fields' },
          { status: 400 }
        );
      }
      
      if (!record.fields['Insumos Laboratorio'] || !Array.isArray(record.fields['Insumos Laboratorio']) || record.fields['Insumos Laboratorio'].length === 0) {
        return NextResponse.json(
          { success: false, error: 'Cada registro debe tener al menos un insumo en Insumos Laboratorio' },
          { status: 400 }
        );
      }
      
      if (!record.fields['Cantidad Ingresa Unidades'] || typeof record.fields['Cantidad Ingresa Unidades'] !== 'number' || record.fields['Cantidad Ingresa Unidades'] <= 0) {
        return NextResponse.json(
          { success: false, error: 'Cada registro debe tener una Cantidad Ingresa Unidades válida (número mayor a 0)' },
          { status: 400 }
        );
      }
    }

    console.log('🔍 ENTRADA-INSUMOS API: Validación completada, creando registros en Airtable...');
    console.log('📋 ENTRADA-INSUMOS API: Datos a enviar a Airtable:', JSON.stringify({ records }, null, 2));
    
    // Crear registros en Airtable
    const airtableResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ENTRADA_INSUMOS}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records }),
    });

    if (!airtableResponse.ok) {
      const errorText = await airtableResponse.text();
      console.error('❌ ENTRADA-INSUMOS API: Error de Airtable:', errorText);
      return NextResponse.json(
        { success: false, error: 'Error al crear registros en Airtable', details: errorText },
        { status: airtableResponse.status }
      );
    }

    const airtableData = await airtableResponse.json();
    console.log('✅ ENTRADA-INSUMOS API: Registros creados exitosamente:', airtableData);

    return NextResponse.json({
      success: true,
      message: `Se crearon ${airtableData.records?.length || 0} registros de entrada`,
      data: airtableData,
      proveedor,
      numeroFactura,
      observaciones
    });

  } catch (error) {
    console.error('❌ ENTRADA-INSUMOS API: Error general:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// Obtener registros de entrada de insumos
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 ENTRADA-INSUMOS API: Iniciando GET request...');
    
    if (!AIRTABLE_BASE_ID || !AIRTABLE_API_KEY) {
      console.error('❌ ENTRADA-INSUMOS API: Faltan variables de entorno de Airtable');
      return NextResponse.json(
        { success: false, error: 'Configuración de Airtable incompleta' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const maxRecords = searchParams.get('maxRecords') || '100';
    const view = searchParams.get('view') || 'Grid%20view';

    console.log('📋 ENTRADA-INSUMOS API: Obteniendo registros...');
    
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ENTRADA_INSUMOS}?maxRecords=${maxRecords}&view=${view}`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        },
      }
    );

    if (!airtableResponse.ok) {
      const errorText = await airtableResponse.text();
      console.error('❌ ENTRADA-INSUMOS API: Error de Airtable:', errorText);
      return NextResponse.json(
        { success: false, error: 'Error al obtener registros de Airtable', details: errorText },
        { status: airtableResponse.status }
      );
    }

    const airtableData = await airtableResponse.json();
    console.log('✅ ENTRADA-INSUMOS API: Registros obtenidos exitosamente:', airtableData.records?.length || 0);

    return NextResponse.json({
      success: true,
      entradas: airtableData.records || [],
      count: airtableData.records?.length || 0
    });

  } catch (error) {
    console.error('❌ ENTRADA-INSUMOS API: Error general:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
