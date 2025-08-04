import { NextResponse } from 'next/server';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_MICROORGANISMOS = process.env.AIRTABLE_TABLE_MICROORGANISMOS;

export async function GET() {
  try {
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_MICROORGANISMOS) {
      return NextResponse.json(
        { error: 'Configuración de Airtable incompleta' },
        { status: 500 }
      );
    }

    const filterFormula = encodeURIComponent("AND({Tipo Microorganismo} = 'Bacteria')");
    
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_MICROORGANISMOS}?filterByFormula=${filterFormula}&maxRecords=1`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Airtable error: ${response.status} - ${errorText}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    
    // Return raw data for debugging
    return NextResponse.json({
      success: true,
      rawData: data,
      firstRecord: data.records?.[0] || null,
      fieldTypes: data.records?.[0] ? Object.keys(data.records[0].fields).map(key => ({
        field: key,
        value: data.records[0].fields[key],
        type: typeof data.records[0].fields[key],
        isArray: Array.isArray(data.records[0].fields[key])
      })) : []
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Debug error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
