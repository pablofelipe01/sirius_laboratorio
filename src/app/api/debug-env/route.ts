import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const envStatus = {
      AIRTABLE_API_KEY: !!process.env.AIRTABLE_API_KEY,
      AIRTABLE_BASE_ID: !!process.env.AIRTABLE_BASE_ID,
      AIRTABLE_TABLE_DESCARTES: !!process.env.AIRTABLE_TABLE_DESCARTES,
      AIRTABLE_TABLE_SALIDA_CEPAS: !!process.env.AIRTABLE_TABLE_SALIDA_CEPAS,
      AIRTABLE_TABLE_SALIDA_INOCULACION: !!process.env.AIRTABLE_TABLE_SALIDA_INOCULACION,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      NODE_ENV: process.env.NODE_ENV
    };

    return NextResponse.json({
      success: true,
      env: envStatus,
      missingVars: Object.entries(envStatus)
        .filter(([key, value]) => !value && key !== 'NODE_ENV')
        .map(([key]) => key)
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Error checking environment variables',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
