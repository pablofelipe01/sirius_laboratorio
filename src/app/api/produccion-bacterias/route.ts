import { NextResponse } from 'next/server';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
// Usando el ID de tabla proporcionado
const AIRTABLE_TABLE_MICROORGANISMOS = process.env.AIRTABLE_TABLE_MICROORGANISMOS;

export async function GET() {
  try {
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_MICROORGANISMOS) {
      return NextResponse.json(
        { error: 'Configuración de Airtable incompleta. Verifica AIRTABLE_API_KEY, AIRTABLE_BASE_ID y AIRTABLE_TABLE_MICROORGANISMOS' },
        { status: 500 }
      );
    }

    // Filtramos solo microorganismos de tipo "Bacteria"
    const filterFormula = encodeURIComponent("AND({Tipo Microorganismo} = 'Bacteria')");
    
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_MICROORGANISMOS}?filterByFormula=${filterFormula}`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Airtable:', response.status, errorText);
      throw new Error(`Error de Airtable: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Helper function to extract string value from Airtable complex objects
    const extractValue = (field: any): string => {
      if (typeof field === 'string') return field;
      if (field && typeof field === 'object' && field.value) return field.value;
      if (field && typeof field === 'object' && field.state === 'generated') return field.value || '';
      return field?.toString() || '';
    };

    const microorganismos = data.records.map((record: any) => ({
      id: record.id,
      nombre: extractValue(record.fields.Microorganismo) || 'Sin nombre',
      tipo: extractValue(record.fields['Tipo Microorganismo']) || 'Bacteria',
      abreviatura: extractValue(record.fields.Abreviaturas) || '',
      bolsasPorLote: record.fields['Bolsas/Lote'] || 0,
      diasIncubacion: record.fields['Dias/Incubacion'] || 0,
      descripcion: extractValue(record.fields.descripcion) || `Microorganismo de tipo ${extractValue(record.fields['Tipo Microorganismo']) || 'Bacteria'} con código ${extractValue(record.fields.Abreviaturas) || 'N/A'}`,
      aplicaciones: extractValue(record.fields.aplicaciones) || `Producción en lotes de ${record.fields['Bolsas/Lote'] || 0} bolsas`,
      condicionesOptimas: extractValue(record.fields.condicionesOptimas) || `Incubación por ${record.fields['Dias/Incubacion'] || 0} días`,
      tiempoProduccion: `${record.fields['Dias/Incubacion'] || 0} días de incubación`,
      estado: 'Disponible para producción',
      // Campos adicionales para referencia
      productosRemisiones: record.fields['Productos Remisiones'] || [],
      cosechaLaboratorio: record.fields['Cosecha Laboratorio'] || [],
      inoculacion: record.fields.Inoculacion || [],
      cepas: record.fields.Cepas || []
    }));

    return NextResponse.json({
      success: true,
      microorganismos,
      total: microorganismos.length
    });

  } catch (error) {
    console.error('Error al obtener microorganismos para producción:', error);
    return NextResponse.json(
      { error: 'Error al conectar con Airtable', details: error },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { microorganismoId, loteData } = body;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { error: 'Configuración de Airtable incompleta' },
        { status: 500 }
      );
    }

    // Aquí puedes agregar lógica para crear un nuevo registro de producción
    // Por ejemplo, en una tabla de producciones o lotes

    return NextResponse.json({
      success: true,
      message: 'Producción iniciada exitosamente',
      data: {
        microorganismoId,
        loteData
      }
    });

  } catch (error) {
    console.error('Error al iniciar producción:', error);
    return NextResponse.json(
      { error: 'Error al iniciar producción', details: error },
      { status: 500 }
    );
  }
}
