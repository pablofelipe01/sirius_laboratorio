import { NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurar Airtable
const base = Airtable.base(process.env.AIRTABLE_BASE_ID!);

export async function GET() {
  try {
    const records = await base('tblezRGNqdPP56T4x') // Tabla Equipo Laboratorio
      .select({
        fields: ['fldMBrpppAM5X6G2t'], // Campo Nombre
        sort: [{ field: 'fldMBrpppAM5X6G2t', direction: 'asc' }]
      })
      .all();

    const responsables = records.map(record => ({
      id: record.id,
      nombre: record.fields['fldMBrpppAM5X6G2t'] as string,
    }));

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
