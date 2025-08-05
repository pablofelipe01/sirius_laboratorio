import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Lista de variables de entorno requeridas para descartes
    const requiredEnvVars = [
      'AIRTABLE_API_KEY',
      'AIRTABLE_BASE_ID',
      'AIRTABLE_TABLE_DESCARTES',
      'AIRTABLE_TABLE_SALIDA_CEPAS',
      'AIRTABLE_TABLE_SALIDA_INOCULACION',
      'AIRTABLE_FIELD_DESCARTES_FECHA_EVENTO',
      'AIRTABLE_FIELD_DESCARTES_CANTIDAD_BOLSAS',
      'AIRTABLE_FIELD_DESCARTES_MOTIVO',
      'AIRTABLE_FIELD_DESCARTES_REALIZA_REGISTRO',
      'AIRTABLE_FIELD_DESCARTES_SALIDA_CEPAS',
      'AIRTABLE_FIELD_DESCARTES_SALIDA_INOCULACION',
      'AIRTABLE_FIELD_SALIDA_CEPAS_FECHA_EVENTO',
      'AIRTABLE_FIELD_SALIDA_CEPAS_CANTIDAD_BOLSAS',
      'AIRTABLE_FIELD_SALIDA_CEPAS_CEPAS',
      'AIRTABLE_FIELD_SALIDA_CEPAS_DESCARTES',
      'AIRTABLE_FIELD_SALIDA_INOCULACION_FECHA_EVENTO',
      'AIRTABLE_FIELD_SALIDA_INOCULACION_CANTIDAD_BOLSAS',
      'AIRTABLE_FIELD_SALIDA_INOCULACION_LOTE_ALTERADO',
      'AIRTABLE_FIELD_SALIDA_INOCULACION_DESCARTES'
    ];

    // Verificar cuáles variables están disponibles
    const envStatus = requiredEnvVars.map(varName => ({
      variable: varName,
      exists: !!process.env[varName],
      value: process.env[varName] ? `${process.env[varName]?.substring(0, 8)}...` : 'MISSING'
    }));

    const missingVars = envStatus.filter(env => !env.exists);
    const availableVars = envStatus.filter(env => env.exists);

    return NextResponse.json({
      success: true,
      message: 'Diagnóstico de variables de entorno para descartes',
      data: {
        totalRequired: requiredEnvVars.length,
        available: availableVars.length,
        missing: missingVars.length,
        missingVariables: missingVars.map(env => env.variable),
        environmentStatus: envStatus,
        isProduction: process.env.NODE_ENV === 'production',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error en diagnóstico de variables de entorno:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error al diagnosticar variables de entorno',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
