import { NextRequest, NextResponse } from 'next/server';

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_TOKEN = process.env.AIRTABLE_API_KEY;

// POST - Crear nueva entrada de insumo
export async function POST(request: NextRequest) {
  try {
    if (!AIRTABLE_BASE_ID || !AIRTABLE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Configuración de Airtable incompleta' },
        { status: 500 }
      );
    }

    const body = await request.json();
    
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Entrada%20Insumos`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [
            {
              fields: {
                Name: body.name,
                Notes: body.notes,
                Status: "Todo",
                "Insumos Laboratorio": body.insumoIds
              }
            }
          ]
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating entrada insumo:', error);
    return NextResponse.json(
      { error: 'Error al crear entrada de insumo' },
      { status: 500 }
    );
  }
}

// GET - Obtener todas las entradas
export async function GET() {
  try {
    if (!AIRTABLE_BASE_ID || !AIRTABLE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Configuración de Airtable incompleta' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Entrada%20Insumos`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching entradas:', error);
    return NextResponse.json(
      { error: 'Error al obtener entradas' },
      { status: 500 }
    );
  }
}
