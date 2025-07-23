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
    const records = await base('tblezRGNqdPP56T4x')
      .select({
        fields: ['ID', 'Nombre'],
        sort: [{ field: 'Nombre', direction: 'asc' }]
      })
      .all();

    const responsables = records.map(record => ({
      id: record.id,
      nombre: record.fields['Nombre'] as string,
    })).filter(item => item.nombre); // Filtrar los que no tienen nombre

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
