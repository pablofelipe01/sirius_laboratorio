import { NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurar Airtable
if (process.env.AIRTABLE_API_KEY) {
  Airtable.configure({ apiKey: process.env.AIRTABLE_API_KEY });
} else if (process.env.AIRTABLE_PAT) {
  Airtable.configure({ apiKey: process.env.AIRTABLE_PAT });
}

const base = Airtable.base(process.env.AIRTABLE_BASE_ID!);

export async function GET() {
  try {
    const tableId = process.env.AIRTABLE_TABLE_EQUIPO_LABORATORIO;
    
    if (!tableId) {
      throw new Error('Missing AIRTABLE_TABLE_EQUIPO_LABORATORIO environment variable');
    }
    
    const records = await base(tableId)
      .select({
        fields: ['Nombre'], // Usar el nombre del campo
        sort: [{ field: 'Nombre', direction: 'asc' }]
      })
      .all();

    const responsables = records.map(record => ({
      id: record.id,
      nombre: record.fields['Nombre'] as string, // Usar el nombre del campo en lugar del field ID
    })).filter(item => item.nombre && item.id !== 'recVfyi6V1HidiGVl'); // Filtrar los que no tienen nombre y excluir Fabian Bejarano

    return NextResponse.json({
      success: true,
      responsables
    });

  } catch (error) {
    console.error('Error fetching responsables:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener responsables' },
      { status: 500 }
    );
  }
}
