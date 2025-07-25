import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Validar configuración requerida
if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
  throw new Error('Variables de entorno AIRTABLE_API_KEY y AIRTABLE_BASE_ID son requeridas');
}

// Configurar Airtable de forma segura
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

// Usar variable de entorno para la tabla
const SALIDA_CEPAS_TABLE_ID = process.env.AIRTABLE_TABLE_SALIDA_CEPAS || 'tblk9eKsHNXhT6pnw';

interface SalidaCepaRecord {
  fechaEvento: string;
  cantidadBolsasUsadas: number;
  cepaId: string;
  inoculacionId: string;
}

export async function POST(request: NextRequest) {
  try {
    const { registros }: { registros: SalidaCepaRecord[] } = await request.json();
    
    console.log('🔄 Creando registros de Salida Cepas:', {
      cantidad: registros.length,
      timestamp: new Date().toISOString()
    });

    if (!registros || registros.length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron registros para crear' },
        { status: 400 }
      );
    }

    // Preparar los registros para Airtable
    const recordsToCreate = registros.map(registro => ({
      fields: {
        'Fecha Evento': registro.fechaEvento,
        'Cantidad Bolsas Usadas': registro.cantidadBolsasUsadas,
        'Cepas': [registro.cepaId],
        'Inoculacion': [registro.inoculacionId]
      }
    }));

    // Crear registros en lotes de 10 (límite de Airtable)
    const createdRecords = [];
    for (let i = 0; i < recordsToCreate.length; i += 10) {
      const batch = recordsToCreate.slice(i, i + 10);
      
      const response = await base(SALIDA_CEPAS_TABLE_ID)
        .create(batch);
      
      createdRecords.push(...response);
    }

    console.log('✅ Registros de Salida Cepas creados exitosamente:', {
      cantidad: createdRecords.length,
      ids: createdRecords.map(r => r.id),
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      registros: createdRecords.map(record => ({
        id: record.id,
        fechaEvento: record.get('Fecha Evento'),
        cantidadBolsasUsadas: record.get('Cantidad Bolsas Usadas'),
        cepas: record.get('Cepas'),
        inoculacion: record.get('Inoculacion')
      })),
      total: createdRecords.length
    });

  } catch (error) {
    console.error('❌ Error al crear registros de Salida Cepas:', error);
    return NextResponse.json(
      { 
        error: 'Error al crear registros de Salida Cepas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const inoculacionId = searchParams.get('inoculacionId');
    
    let filterFormula = '';
    if (inoculacionId) {
      filterFormula = `SEARCH("${inoculacionId}", ARRAYJOIN({Inoculacion}, " "))`;
    }

    console.log('🔍 Obteniendo registros de Salida Cepas:', {
      inoculacionId,
      filterFormula,
      timestamp: new Date().toISOString()
    });

    const records = await base(SALIDA_CEPAS_TABLE_ID)
      .select({
        maxRecords: 100,
        sort: [{ field: 'Fecha Creacion', direction: 'desc' }],
        ...(filterFormula && { filterByFormula: filterFormula }),
        fields: [
          'ID',
          'Fecha Creacion',
          'Fecha Evento',
          'Cantidad Bolsas Usadas',
          'Cepas',
          'Inoculacion'
        ]
      })
      .firstPage();

    const formattedRecords = records.map(record => ({
      id: record.get('ID'),
      fechaCreacion: record.get('Fecha Creacion'),
      fechaEvento: record.get('Fecha Evento'),
      cantidadBolsasUsadas: record.get('Cantidad Bolsas Usadas'),
      cepas: record.get('Cepas'),
      inoculacion: record.get('Inoculacion')
    }));

    console.log('✅ Registros de Salida Cepas obtenidos:', {
      cantidad: formattedRecords.length,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      registros: formattedRecords,
      total: formattedRecords.length
    });

  } catch (error) {
    console.error('❌ Error al obtener registros de Salida Cepas:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener registros de Salida Cepas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
