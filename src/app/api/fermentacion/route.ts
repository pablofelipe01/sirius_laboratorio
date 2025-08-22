import { NextResponse } from 'next/server';

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_API_KEY; // Usar AIRTABLE_API_KEY en lugar de AIRTABLE_TOKEN
const FERMENTACION_TABLE_ID = process.env.AIRTABLE_TABLE_FERMENTACION;

// Interfaz para los registros de Fermentación
interface FermentacionRecord {
  id: string;
  createdTime: string;
  fields: {
    ID?: string;
    Creada?: string;
    'Microorganismo'?: string[];
    'Fecha Inicia Fermentacion'?: string;
    'Fecha Termina Fermentacion'?: string;
    'Fecha Inicia Escalado 50ml'?: string;
    'Fecha Inicia Escalado 250ml'?: string;
    'Fecha Inicia Escalado 800ml'?: string;
    'Fecha Inicia Fermentacion 12L'?: string;
    'Fecha Inicia Fermentacion 100L'?: string;
    'Fecha Empacado'?: string;
    'Etapa Produccion'?: string;
    Estado?: string;
    'Cantidad Litros'?: number;
    'Total Litros'?: number;
    Observaciones?: string;
    Responsables?: string[];
    'Realiza Registro'?: string;
    'Cantidad Litros Salida Fermentacion'?: number[];
    Microorganismos?: string[];
    'Salida Fermentacion'?: string[];
    'Salida Insumos'?: string[];
  };
}

export async function GET(request: Request) {
  console.log('🔬 FERMENTACION API: Iniciando request GET...');
  
  try {
    if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN || !FERMENTACION_TABLE_ID) {
      console.error('❌ FERMENTACION API: Variables de entorno faltantes', {
        AIRTABLE_BASE_ID: !!AIRTABLE_BASE_ID,
        AIRTABLE_API_KEY: !!AIRTABLE_TOKEN,
        AIRTABLE_TABLE_FERMENTACION: !!FERMENTACION_TABLE_ID
      });
      return NextResponse.json(
        { error: 'Configuración de Airtable incompleta' },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const filterByFormula = url.searchParams.get('filterByFormula');
    const maxRecords = url.searchParams.get('maxRecords') || '100';

    console.log('📡 FERMENTACION API: Parametros de consulta:', {
      filterByFormula,
      maxRecords
    });

    // Construir URL de Airtable
    const airtableUrl = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${FERMENTACION_TABLE_ID}`);
    airtableUrl.searchParams.append('maxRecords', maxRecords);
    
    if (filterByFormula) {
      airtableUrl.searchParams.append('filterByFormula', filterByFormula);
    }

    console.log('🌐 FERMENTACION API: URL construida:', airtableUrl.toString());

    const response = await fetch(airtableUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ FERMENTACION API: Error en response de Airtable:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ FERMENTACION API: Detalles del error:', errorText);
      return NextResponse.json(
        { error: `Error de Airtable: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ FERMENTACION API: Datos recibidos exitosamente', {
      recordCount: data.records?.length || 0,
      hasOffset: !!data.offset
    });

    // Log de algunos registros para debug
    if (data.records && data.records.length > 0) {
      console.log('📊 FERMENTACION API: Primer registro de muestra:', {
        id: data.records[0].id,
        microorganismo: data.records[0].fields?.['Microorganismo'],
        estado: data.records[0].fields?.['Estado'],
        cantidadLitros: data.records[0].fields?.['Cantidad Litros'],
        totalLitros: data.records[0].fields?.['Total Litros']
      });
    }

    return NextResponse.json({
      success: true,
      records: data.records as FermentacionRecord[],
      offset: data.offset
    });

  } catch (error) {
    console.error('❌ FERMENTACION API: Error en catch:', error);
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

export async function PUT(request: Request) {
  console.log('🔄 FERMENTACION API: Iniciando request PUT...');
  
  try {
    if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN || !FERMENTACION_TABLE_ID) {
      console.error('❌ FERMENTACION API: Variables de entorno faltantes', {
        AIRTABLE_BASE_ID: !!AIRTABLE_BASE_ID,
        AIRTABLE_API_KEY: !!AIRTABLE_TOKEN,
        AIRTABLE_TABLE_FERMENTACION: !!FERMENTACION_TABLE_ID
      });
      return NextResponse.json(
        { error: 'Configuración de Airtable incompleta' },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('📝 FERMENTACION API: Datos recibidos para actualización:', body);

    const { recordId, updates } = body;

    if (!recordId || !updates) {
      console.error('❌ FERMENTACION API: Faltan datos requeridos');
      return NextResponse.json(
        { error: 'Record ID y updates son requeridos' },
        { status: 400 }
      );
    }

    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${FERMENTACION_TABLE_ID}/${recordId}`;

    const response = await fetch(airtableUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: updates
      })
    });

    if (!response.ok) {
      console.error('❌ FERMENTACION API: Error al actualizar registro:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ FERMENTACION API: Detalles del error:', errorText);
      return NextResponse.json(
        { error: `Error de Airtable: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const updatedRecord = await response.json();
    console.log('✅ FERMENTACION API: Registro actualizado exitosamente:', updatedRecord.id);

    return NextResponse.json({
      success: true,
      record: updatedRecord
    });

  } catch (error) {
    console.error('❌ FERMENTACION API: Error en catch:', error);
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
