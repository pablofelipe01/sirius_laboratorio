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

    const tableId = process.env.AIRTABLE_TABLE_MICROORGANISMOS;
    const fieldId = process.env.AIRTABLE_FIELD_MICROORGANISMO_NOMBRE;
    const fieldTipo = process.env.AIRTABLE_FIELD_MICROORGANISMO_TIPO;
    
    if (!tableId || !fieldId) {
      throw new Error('Missing required environment variables for Airtable table or field IDs');
    }

    // Campos a obtener - incluir tipo si está configurado
    const fields = ['ID', fieldId];
    if (fieldTipo) {
      fields.push(fieldTipo);
    }

    const records = await base(tableId)
      .select({
        fields,
        sort: [{ field: fieldId, direction: 'asc' }]
      })
      .all();

    const microorganismos = records.map(record => ({
      id: record.id,
      nombre: record.fields[fieldId] as string,
      'Tipo Microorganismo': fieldTipo ? record.fields[fieldTipo] as string : undefined,
      tipo: fieldTipo ? record.fields[fieldTipo] as string : undefined, // Alias para compatibilidad
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
