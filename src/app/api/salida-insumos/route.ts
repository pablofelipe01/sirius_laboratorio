import { NextRequest, NextResponse } from 'next/server';

// Configuración de Airtable para tabla Salida Insumos
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_TABLE_SALIDA_INSUMOS = process.env.AIRTABLE_TABLE_SALIDA_INSUMOS;

// Crear múltiples registros de salida de insumos
export async function POST(request: NextRequest) {
  try {
    console.log('📤 SALIDA-INSUMOS API: Iniciando POST request...');
    console.log('🔧 SALIDA-INSUMOS API: Verificando variables de entorno...');
    console.log('   - AIRTABLE_BASE_ID:', AIRTABLE_BASE_ID ? 'Configurado' : 'NO CONFIGURADO');
    console.log('   - AIRTABLE_API_KEY:', AIRTABLE_API_KEY ? 'Configurado' : 'NO CONFIGURADO');
    console.log('   - AIRTABLE_TABLE_SALIDA_INSUMOS:', AIRTABLE_TABLE_SALIDA_INSUMOS);
    
    if (!AIRTABLE_BASE_ID || !AIRTABLE_API_KEY) {
      console.error('❌ SALIDA-INSUMOS API: Faltan variables de entorno de Airtable');
      return NextResponse.json(
        { success: false, error: 'Configuración de Airtable incompleta' },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('📋 SALIDA-INSUMOS API: Body recibido:', body);

    // El body puede ser un solo registro o un array de registros
    let records = [];
    
    if (Array.isArray(body)) {
      // Si es un array, cada elemento debe ser un registro completo
      records = body.map(item => ({
        fields: item
      }));
    } else if (body.records && Array.isArray(body.records)) {
      // Si viene en formato { records: [...] }
      records = body.records;
    } else {
      // Si es un solo objeto, lo convertimos a un registro
      records = [{
        fields: body
      }];
    }

    console.log('📋 SALIDA-INSUMOS API: Records procesados:', records.length);

    // Validar cada registro
    for (const record of records) {
      if (!record.fields) {
        return NextResponse.json(
          { success: false, error: 'Cada registro debe tener un objeto fields' },
          { status: 400 }
        );
      }
      
      // Validar campos requeridos
      if (!record.fields['Insumos Laboratorio'] || !Array.isArray(record.fields['Insumos Laboratorio']) || record.fields['Insumos Laboratorio'].length === 0) {
        return NextResponse.json(
          { success: false, error: 'Cada registro debe tener al menos un insumo en Insumos Laboratorio' },
          { status: 400 }
        );
      }
      
      if (!record.fields['Cantidad Salida Unidades'] || typeof record.fields['Cantidad Salida Unidades'] !== 'number' || record.fields['Cantidad Salida Unidades'] <= 0) {
        return NextResponse.json(
          { success: false, error: 'Cada registro debe tener una Cantidad Salida Unidades válida (número mayor a 0)' },
          { status: 400 }
        );
      }

      // Validar que tenga referencia a Entrada (entradaId)
      if (!record.fields['Entrada'] || !Array.isArray(record.fields['Entrada']) || record.fields['Entrada'].length === 0) {
        return NextResponse.json(
          { success: false, error: 'Cada registro debe tener una referencia a la Entrada específica' },
          { status: 400 }
        );
      }
    }

    console.log('🔍 SALIDA-INSUMOS API: Validación completada, creando registros en Airtable...');
    console.log('📋 SALIDA-INSUMOS API: Datos a enviar a Airtable:', JSON.stringify({ records }, null, 2));
    
    // Crear registros en Airtable
    const airtableResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_SALIDA_INSUMOS}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records }),
    });

    if (!airtableResponse.ok) {
      const errorText = await airtableResponse.text();
      console.error('❌ SALIDA-INSUMOS API: Error de Airtable:', errorText);
      return NextResponse.json(
        { success: false, error: 'Error al crear registros en Airtable', details: errorText },
        { status: airtableResponse.status }
      );
    }

    const airtableData = await airtableResponse.json();
    console.log('✅ SALIDA-INSUMOS API: Registros creados exitosamente:', airtableData);

    return NextResponse.json({
      success: true,
      message: `Se crearon ${airtableData.records?.length || 0} registros de salida`,
      data: airtableData
    });

  } catch (error) {
    console.error('❌ SALIDA-INSUMOS API: Error general:', error);
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

// Obtener registros de salida de insumos
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 SALIDA-INSUMOS API: Iniciando GET request...');
    
    if (!AIRTABLE_BASE_ID || !AIRTABLE_API_KEY) {
      console.error('❌ SALIDA-INSUMOS API: Faltan variables de entorno de Airtable');
      return NextResponse.json(
        { success: false, error: 'Configuración de Airtable incompleta' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const maxRecords = searchParams.get('maxRecords') || '100';

    console.log('📋 SALIDA-INSUMOS API: Obteniendo registros...');
    
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_SALIDA_INSUMOS}?maxRecords=${maxRecords}`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        },
      }
    );

    if (!airtableResponse.ok) {
      const errorText = await airtableResponse.text();
      console.error('❌ SALIDA-INSUMOS API: Error de Airtable:', errorText);
      return NextResponse.json(
        { success: false, error: 'Error al obtener registros de Airtable', details: errorText },
        { status: airtableResponse.status }
      );
    }

    const airtableData = await airtableResponse.json();
    console.log('✅ SALIDA-INSUMOS API: Registros obtenidos exitosamente:', airtableData.records?.length || 0);

    return NextResponse.json({
      success: true,
      salidas: airtableData.records || [],
      count: airtableData.records?.length || 0
    });

  } catch (error) {
    console.error('❌ SALIDA-INSUMOS API: Error general:', error);
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
