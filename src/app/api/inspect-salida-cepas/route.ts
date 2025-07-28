import { NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurar Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID!);

const SALIDA_CEPAS_TABLE_ID = process.env.AIRTABLE_TABLE_SALIDA_CEPAS;

export async function GET() {
  try {
    if (!SALIDA_CEPAS_TABLE_ID) {
      throw new Error('Missing AIRTABLE_TABLE_SALIDA_CEPAS environment variable');
    }

    console.log('🔍 Inspeccionando estructura de tabla Salida Cepas...');

    // Obtener algunos registros para ver la estructura
    const records = await base(SALIDA_CEPAS_TABLE_ID)
      .select({
        maxRecords: 1,
      })
      .firstPage();

    const fieldsStructure = records.length > 0 ? Object.keys(records[0].fields) : [];
    
    console.log('📋 Campos disponibles en Salida Cepas:', fieldsStructure);

    return NextResponse.json({
      success: true,
      tableId: SALIDA_CEPAS_TABLE_ID,
      availableFields: fieldsStructure,
      recordCount: records.length,
      sampleRecord: records.length > 0 ? records[0].fields : null
    });

  } catch (error) {
    console.error('❌ Error inspeccionando Salida Cepas:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al inspeccionar tabla Salida Cepas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
