import { NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurar Airtable
if (process.env.AIRTABLE_API_KEY) {
  Airtable.configure({ apiKey: process.env.AIRTABLE_API_KEY });
} else if (process.env.AIRTABLE_PAT) {
  Airtable.configure({ apiKey: process.env.AIRTABLE_PAT });
}

const base = Airtable.base(process.env.AIRTABLE_BASE_ID!);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tableId = searchParams.get('table');
  
  try {
    if (!tableId) {
      return NextResponse.json(
        { success: false, error: 'Parámetro table requerido' },
        { status: 400 }
      );
    }

    // Obtener algunos registros de muestra para ver su estructura
    const records = await base(tableId)
      .select({
        maxRecords: 5
      })
      .all();

    const sampleData = records.map(record => ({
      id: record.id,
      fields: record.fields
    }));

    return NextResponse.json({
      success: true,
      tableId,
      totalRecords: records.length,
      sampleData
    });

  } catch (error) {
    console.error(`Error fetching sample data from ${tableId}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al obtener datos de muestra', 
        details: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    );
  }
}
