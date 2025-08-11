import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Validar configuración requerida
if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
  throw new Error('Variables de entorno AIRTABLE_API_KEY y AIRTABLE_BASE_ID son requeridas');
}

// Configurar Airtable de forma segura
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    console.log('🔍 API INSUMO-DETAILS: Iniciando obtención de detalles para ID:', resolvedParams.id);
    
    const insumoId = resolvedParams.id;
    
    // Obtener la información del insumo principal
    const insumoTableId = process.env.AIRTABLE_TABLE_INSUMOS_LABORATORIO;
    const entradaTableId = process.env.AIRTABLE_TABLE_ENTRADA_INSUMOS;
    const salidaTableId = process.env.AIRTABLE_TABLE_SALIDA_INSUMOS;
    
    if (!insumoTableId) {
      throw new Error('Missing AIRTABLE_TABLE_INSUMOS_LABORATORIO environment variable');
    }
    
    let insumoData = null;
    let entradaData: any[] = [];
    let salidaData: any[] = [];
    
    // 1. Obtener datos del insumo principal
    try {
      const insumoRecord = await base(insumoTableId).find(insumoId);
      insumoData = {
        id: insumoRecord.id,
        fields: insumoRecord.fields,
        createdTime: insumoRecord._rawJson.createdTime
      };
      console.log('📦 API INSUMO-DETAILS: Insumo encontrado:', insumoData);
    } catch (error) {
      console.error('❌ API INSUMO-DETAILS: Error al obtener insumo:', error);
      return NextResponse.json(
        { success: false, error: 'Insumo no encontrado' },
        { status: 404 }
      );
    }
    
    // 2. Obtener datos de Entrada Insumos si existe la tabla
    if (entradaTableId) {
      try {
        const entradaRecords: any[] = [];
        await base(entradaTableId)
          .select({
            filterByFormula: `FIND("${insumoId}", {Insumos Laboratorio})`
          })
          .eachPage((records, fetchNextPage) => {
            entradaRecords.push(...records.map(record => ({
              id: record.id,
              fields: record.fields,
              createdTime: record._rawJson.createdTime
            })));
            fetchNextPage();
          });
        entradaData = entradaRecords;
        console.log('📥 API INSUMO-DETAILS: Entradas encontradas:', entradaData.length);
      } catch (error) {
        console.error('⚠️ API INSUMO-DETAILS: Error al obtener entradas:', error);
        // No fallar si no se pueden obtener las entradas
      }
    }
    
    // 3. Obtener datos de Salida Insumos si existe la tabla
    if (salidaTableId) {
      try {
        const salidaRecords: any[] = [];
        await base(salidaTableId)
          .select({
            filterByFormula: `FIND("${insumoId}", {Insumos Laboratorio})`
          })
          .eachPage((records, fetchNextPage) => {
            salidaRecords.push(...records.map(record => ({
              id: record.id,
              fields: record.fields,
              createdTime: record._rawJson.createdTime
            })));
            fetchNextPage();
          });
        salidaData = salidaRecords;
        console.log('📤 API INSUMO-DETAILS: Salidas encontradas:', salidaData.length);
      } catch (error) {
        console.error('⚠️ API INSUMO-DETAILS: Error al obtener salidas:', error);
        // No fallar si no se pueden obtener las salidas
      }
    }
    
    const details = {
      insumo: insumoData,
      entradas: entradaData,
      salidas: salidaData,
      resumen: {
        totalEntradas: entradaData.length,
        totalSalidas: salidaData.length,
        fechaCreacion: insumoData?.createdTime,
        ultimaEntrada: entradaData.length > 0 ? entradaData.sort((a, b) => 
          new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
        )[0].createdTime : null,
        ultimaSalida: salidaData.length > 0 ? salidaData.sort((a, b) => 
          new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
        )[0].createdTime : null
      }
    };
    
    console.log('✅ API INSUMO-DETAILS: Detalles preparados');
    
    return NextResponse.json({
      success: true,
      details: details
    });
    
  } catch (error) {
    console.error('❌ API INSUMO-DETAILS: Error general:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al obtener detalles del insumo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      }, 
      { status: 500 }
    );
  }
}
