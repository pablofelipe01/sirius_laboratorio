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
    const tableId = process.env.AIRTABLE_TABLE_FERMENTACION;
    
    if (!tableId) {
      throw new Error('Missing AIRTABLE_TABLE_FERMENTACION environment variable');
    }

    const records = await base(tableId)
      .select({
        fields: [
          'ID', 
          'Microorganismo', 
          'Etapa', 
          'Fecha Inicia Fermentacion', 
          'Fecha Termina Fermentacion',
          'Estado',
          'Cantidad Litros',
          'Total Litros',
          'Observaciones',
          'Realiza Registro',
          'Microorganismos'
        ],
        sort: [{ field: 'Fecha Inicia Fermentacion', direction: 'desc' }]
      })
      .all();

    const fermentaciones = records.map(record => ({
      id: record.id,
      microorganismo: record.fields['Microorganismo'],
      etapa: record.fields['Etapa'] as string,
      fechaIniciaFermentacion: record.fields['Fecha Inicia Fermentacion'] as string,
      fechaTerminaFermentacion: record.fields['Fecha Termina Fermentacion'] as string,
      estado: record.fields['Estado'],
      cantidadLitros: record.fields['Cantidad Litros'] as number,
      totalLitros: record.fields['Total Litros'],
      observaciones: record.fields['Observaciones'] as string,
      realizaRegistro: record.fields['Realiza Registro'] as string,
      microorganismos: record.fields['Microorganismos'] as string[]
    }));

    return NextResponse.json({
      success: true,
      fermentaciones
    });
  } catch (error) {
    console.error('Error fetching fermentaciones:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener fermentaciones' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const tableId = process.env.AIRTABLE_TABLE_FERMENTACION;
    
    console.log('🔍 FERMENTACION: Table ID:', tableId);
    console.log('🔍 FERMENTACION: Base ID:', process.env.AIRTABLE_BASE_ID);
    console.log('🔍 FERMENTACION: API Key present:', !!process.env.AIRTABLE_API_KEY);
    
    if (!tableId) {
      console.error('❌ FERMENTACION: Missing AIRTABLE_TABLE_FERMENTACION environment variable');
      throw new Error('Missing AIRTABLE_TABLE_FERMENTACION environment variable');
    }

    const body = await request.json();
    console.log('🧬 FERMENTACION: Datos recibidos:', body);

    const { 
      microorganismoId, 
      cantidadLitros, 
      fechaInicio, 
      observaciones, 
      realizaRegistro,
      responsablesEquipo 
    } = body;

    // Validaciones
    if (!microorganismoId || !cantidadLitros || !fechaInicio) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos: microorganismo, cantidad y fecha' },
        { status: 400 }
      );
    }

    // Calcular fecha de finalización (3 días después)
    // Asegurar que la fecha de inicio esté en el formato correcto
    const fechaInicioDate = new Date(fechaInicio + 'T05:00:00.000Z'); // Agregar hora para evitar problemas de zona horaria
    const fechaFinalizacion = new Date(fechaInicioDate);
    fechaFinalizacion.setDate(fechaFinalizacion.getDate() + 3);

    console.log('📅 FERMENTACION: Fechas calculadas:', {
      fechaInicioOriginal: fechaInicio,
      fechaInicio: fechaInicioDate.toISOString(),
      fechaFinalizacion: fechaFinalizacion.toISOString()
    });

    // Estructura de datos según la documentación de Airtable
    const recordData = {
      fields: {
        'Etapa': 'Fermentación',
        'Fecha Inicia Fermentacion': fechaInicioDate.toISOString(),
        'Fecha Termina Fermentacion': fechaFinalizacion.toISOString(),
        'Cantidad Litros': Number(cantidadLitros),
        'Observaciones': observaciones || '',
        'Realiza Registro': realizaRegistro || 'Sistema',
        'Microorganismos': [microorganismoId] // Array de IDs de microorganismos
      }
    };

    console.log('📝 FERMENTACION: Datos a crear:', recordData);

    // Crear el registro en Airtable usando el formato correcto con typecast
    const record = await base(tableId).create(recordData.fields, { typecast: true });

    console.log('✅ FERMENTACION: Registro creado exitosamente:', {
      id: record.id,
      fields: record.fields
    });

    return NextResponse.json({
      success: true,
      message: `Fermentación de ${cantidadLitros}L iniciada exitosamente`,
      fermentacionId: record.id,
      fechaInicio: fechaInicioDate.toISOString(),
      fechaFinalizacion: fechaFinalizacion.toISOString(),
      recordCreated: record.fields
    });

  } catch (error) {
    console.error('❌ FERMENTACION: Error completo:', error);
    
    if (error instanceof Error) {
      console.error('❌ FERMENTACION: Error message:', error.message);
      console.error('❌ FERMENTACION: Error stack:', error.stack);
    }
    
    // Si es un error de Airtable, mostrar detalles específicos
    if (typeof error === 'object' && error !== null && 'error' in error) {
      console.error('❌ FERMENTACION: Airtable error details:', error);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al crear fermentación: ' + (error instanceof Error ? error.message : 'Error desconocido'),
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
