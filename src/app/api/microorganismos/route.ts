import { NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurar Airtable
const base = Airtable.base(process.env.AIRTABLE_BASE_ID!);

export async function GET() {
  try {

    const records = await base('tblw4EqoP381U887L')
      .select({
        fields: ['fldzlrbfygE3tFtdL', 'fld7wGB105JgBCWXj'],
        sort: [{ field: 'fld7wGB105JgBCWXj', direction: 'asc' }]
      })
      .all();

    const microorganismos = records.map(record => ({
      id: record.fields['fldzlrbfygE3tFtdL'] as string || record.id,
      nombre: record.fields['fld7wGB105JgBCWXj'] as string,
    }));

    return NextResponse.json({
      success: true,
      microorganismos
    });

  } catch (error) {
    console.error('Error fetching microorganismos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener microorganismos' },
      { status: 500 }
    );
  }
}
