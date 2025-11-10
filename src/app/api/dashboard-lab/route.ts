import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableId = process.env.AIRTABLE_TABLE_PROYECCION_VENTAS; // ID de la tabla Proyecciones de Lina(Comercial)
    const apiKey = process.env.AIRTABLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    if (!baseId) {
      return NextResponse.json({ error: 'Base ID not configured' }, { status: 500 });
    }

    if (!tableId) {
      return NextResponse.json({ error: 'Table ID not configured' }, { status: 500 });
    }

    const url = `https://api.airtable.com/v0/${baseId}/${tableId}?view=Grid%20view`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching dashboard lab data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}