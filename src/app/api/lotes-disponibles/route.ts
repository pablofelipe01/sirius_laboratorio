import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configuración de Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_BASE_ID!);

export async function GET(request: NextRequest) {
  try {
    console.log('📦 API LOTES-DISPONIBLES: Iniciando consulta a Inoculacion...');
    
    const { searchParams } = new URL(request.url);
    const codigoProducto = searchParams.get('codigoProducto');
    
    console.log('🔍 Parámetros de búsqueda:', { codigoProducto });
    
    if (!codigoProducto) {
      return NextResponse.json({
        success: false,
        error: 'Parámetro codigoProducto es requerido'
      }, { status: 400 });
    }
    
    // Consultar tabla de Inoculación
    if (!process.env.AIRTABLE_TABLE_INOCULACION) {
      throw new Error('Variable de entorno AIRTABLE_TABLE_INOCULACION no está configurada');
    }

    // Sanitizar el código para evitar inyección en la fórmula
    const safeCodigoProducto = codigoProducto.replace(/["/\\]/g, '');

    // Buscar por ID Producto Core (campo de texto que guarda el código SIRIUS-PRODUCT-XXXX)
    // Para cepas, buscamos lotes en INCUBACION o REFRIGERACIÓN con cantidad > 0
    const records = await base(process.env.AIRTABLE_TABLE_INOCULACION)
      .select({
        filterByFormula: `AND(
          {ID Producto Core} = "${safeCodigoProducto}",
          OR({Estado Lote} = "Incubacion", {Estado Lote} = "Refrigeración"),
          {Cantidad Actual Bolsas} > 0
        )`,
        sort: [{ field: "Fecha Inoculacion", direction: "asc" }]
      })
      .all();
    
    console.log(`📊 Encontrados ${records.length} lotes disponibles en Inoculacion`);

    // Debug: Si no hay resultados, buscar sin el filtro de cantidad para ver cuántos lotes existen
    if (records.length === 0) {
      const debugRecords = await base(process.env.AIRTABLE_TABLE_INOCULACION)
        .select({
          filterByFormula: `{ID Producto Core} = "${safeCodigoProducto}"`,
          maxRecords: 10
        })
        .all();
      
      console.log(`🔍 Debug: Lotes con ID Producto Core="${safeCodigoProducto}": ${debugRecords.length}`);
      debugRecords.forEach(r => {
        console.log(`   - ${r.fields['Codigo Lote']}: Cantidad Actual=${r.fields['Cantidad Actual Bolsas']}, Estado=${r.fields['Estado Lote']}, ID Producto Core="${r.fields['ID Producto Core']}"`);
      });

      // Si tampoco hay con el código, mostrar algunos registros para ver qué códigos existen
      if (debugRecords.length === 0) {
        const allRecords = await base(process.env.AIRTABLE_TABLE_INOCULACION)
          .select({ maxRecords: 5 })
          .all();
        
        console.log(`📋 Debug: Primeros registros en Inoculacion (para ver códigos disponibles):`);
        allRecords.forEach(r => {
          console.log(`   - ${r.fields['Codigo Lote']}: ID Producto Core="${r.fields['ID Producto Core']}"`);
        });
      }
    }
    
    // Mapear los registros a formato esperado por el frontend
    const lotes = records.map(record => ({
      id: record.id,
      numeroLote: record.fields['Codigo Lote'] || record.id,
      microorganismo: Array.isArray(record.fields['Microorganismo (from Microorganismos)']) 
        ? record.fields['Microorganismo (from Microorganismos)'][0] 
        : 'No especificado',
      cantidadDisponible: Number(record.fields['Cantidad Actual Bolsas']) || 0,
      fechaProduccion: record.fields['Fecha Inoculacion'] || '',
      estado: record.fields['Estado Lote'] || 'Incubacion'
    }));
    
    console.log('✅ Lotes de Inoculacion procesados:', lotes.length);
    
    return NextResponse.json({
      success: true,
      lotes: lotes,
      total: lotes.length
    });

  } catch (error) {
    console.error('❌ Error en API lotes-disponibles (Inoculacion):', error);
    
    // Si es error de autorización o tabla no encontrada, devolver lista vacía
    if (error instanceof Error && (
      error.message.includes('NOT_AUTHORIZED') || 
      error.message.includes('NOT_FOUND') ||
      error.message.includes('UNKNOWN_FIELD_NAME')
    )) {
      console.log('📝 Tabla de Inoculacion no disponible, devolviendo lista vacía');
      return NextResponse.json({
        success: true,
        lotes: [],
        total: 0,
        message: 'No hay lotes disponibles. Se requiere acceso a la tabla de Inoculación.'
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Error al consultar lotes disponibles',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
