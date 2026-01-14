import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🧪 TEST: Verificando configuración de Airtable');
  
  const config = {
    AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY_SIRIUS_CLIENTES_CORE ? 'CONFIGURADO' : 'FALTANTE',
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID_SIRIUS_CLIENTES_CORE || 'FALTANTE',
    AIRTABLE_TABLE_CULTIVOS_CORE: process.env.AIRTABLE_TABLE_CULTIVOS_CORE || 'FALTANTE',
    AIRTABLE_TABLE_LOTES_CORE: process.env.AIRTABLE_TABLE_LOTES_CORE || 'FALTANTE',
    timestamp: new Date().toISOString()
  };
  
  console.log('📊 Configuración actual:', config);
  
  // Test simple a Airtable
  if (process.env.AIRTABLE_API_KEY_SIRIUS_CLIENTES_CORE) {
    try {
      console.log('🔍 Probando conexión a Airtable...');
      const testUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID_SIRIUS_CLIENTES_CORE}/${process.env.AIRTABLE_TABLE_CULTIVOS_CORE}?maxRecords=1`;
      
      const response = await fetch(testUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY_SIRIUS_CLIENTES_CORE}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Test response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          success: true,
          message: 'Conexión a Airtable exitosa',
          config,
          testData: {
            recordsFound: data.records?.length || 0,
            sampleRecord: data.records?.[0] || null
          }
        });
      } else {
        const errorText = await response.text();
        console.error('❌ Error en test:', errorText);
        return NextResponse.json({
          success: false,
          error: `Error ${response.status}: ${errorText}`,
          config
        });
      }
    } catch (error) {
      console.error('💥 Error en test:', error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        config
      });
    }
  }
  
  return NextResponse.json({
    success: false,
    error: 'API Key no configurada',
    config
  });
}