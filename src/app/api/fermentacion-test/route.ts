import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🔍 TEST: Endpoint de prueba llamado');
  return NextResponse.json({
    success: true,
    message: 'Endpoint de fermentación funcionando',
    timestamp: new Date().toISOString(),
    tableId: process.env.AIRTABLE_TABLE_FERMENTACION,
    baseId: process.env.AIRTABLE_BASE_ID,
    hasApiKey: !!process.env.AIRTABLE_API_KEY
  });
}

export async function POST(request: Request) {
  try {
    console.log('🔍 TEST: POST recibido en fermentación');
    const body = await request.json();
    console.log('🔍 TEST: Body recibido:', body);
    
    return NextResponse.json({
      success: true,
      message: 'Datos recibidos correctamente en fermentación',
      receivedData: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ TEST: Error en POST:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al procesar datos',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
