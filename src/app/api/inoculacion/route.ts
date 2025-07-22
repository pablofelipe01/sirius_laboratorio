import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurar Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY || 'patXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' // Reemplazar con tu API key
}).base(process.env.AIRTABLE_BASE_ID || 'appXXXXXXXXXXXXXX'); // Reemplazar con tu Base ID

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validar datos requeridos
    if (!data.bagQuantity || !data.microorganism || !data.inoculationDate || !data.researcher) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Generar código de lote único
    const generateBatchCode = () => {
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `INO-${date}-${random}`;
    };

    const batchCode = generateBatchCode();

    // Crear registro en Airtable
    const record = await base(process.env.AIRTABLE_TABLE_NAME || 'Inoculaciones').create([
      {
        fields: {
          'Codigo_Lote': batchCode,
          'Cantidad_Bolsas': parseInt(data.bagQuantity),
          'Microorganismo': data.microorganism,
          'Fecha_Inoculacion': data.inoculationDate,
          'Investigador': data.researcher,
          'Sustrato': data.substrate || '',
          'Temperatura': parseFloat(data.temperature) || 0,
          'Humedad': parseFloat(data.humidity) || 0,
          'Notas': data.notes || '',
          'Fecha_Registro': new Date().toISOString(),
          'Estado': 'Activo'
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      message: 'Inoculación registrada exitosamente',
      batchCode: batchCode,
      recordId: record[0].id
    });

  } catch (error) {
    console.error('Error al crear registro en Airtable:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Obtener registros de Airtable (útil para consultas)
    const records = await base(process.env.AIRTABLE_TABLE_NAME || 'Inoculaciones')
      .select({
        maxRecords: 50,
        sort: [{ field: 'Fecha_Registro', direction: 'desc' }]
      })
      .firstPage();

    const formattedRecords = records.map(record => ({
      id: record.id,
      codigoLote: record.get('Codigo_Lote'),
      cantidadBolsas: record.get('Cantidad_Bolsas'),
      microorganismo: record.get('Microorganismo'),
      fechaInoculacion: record.get('Fecha_Inoculacion'),
      investigador: record.get('Investigador'),
      sustrato: record.get('Sustrato'),
      temperatura: record.get('Temperatura'),
      humedad: record.get('Humedad'),
      notas: record.get('Notas'),
      fechaRegistro: record.get('Fecha_Registro'),
      estado: record.get('Estado')
    }));

    return NextResponse.json({
      success: true,
      records: formattedRecords,
      total: formattedRecords.length
    });

  } catch (error) {
    console.error('Error al obtener registros de Airtable:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener datos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
