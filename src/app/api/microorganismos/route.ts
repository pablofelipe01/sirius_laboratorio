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
    // Verificar configuración
    if (!process.env.AIRTABLE_BASE_ID) {
      console.error('AIRTABLE_BASE_ID no está configurado');
      return NextResponse.json(
        { success: false, error: 'Configuración de Airtable incompleta' },
        { status: 500 }
      );
    }

    if (!process.env.AIRTABLE_API_KEY && !process.env.AIRTABLE_PAT) {
      console.error('AIRTABLE_API_KEY o AIRTABLE_PAT no está configurado');
      return NextResponse.json(
        { success: false, error: 'Token de Airtable no configurado' },
        { status: 500 }
      );
    }

    const records = await base('tblw4EqoP381U887L')
      .select({
        fields: ['ID', 'Microorganismo'],
        sort: [{ field: 'Microorganismo', direction: 'asc' }]
      })
      .all();

    const microorganismos = records.map(record => ({
      id: record.id,
      nombre: record.fields['Microorganismo'] as string,
    })).filter(item => item.nombre); // Filtrar los que no tienen nombre

    return NextResponse.json({
      success: true,
      microorganismos
    });

  } catch (error) {
    console.error('Error fetching microorganismos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener microorganismos', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
