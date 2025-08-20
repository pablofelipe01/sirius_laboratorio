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
    const microorganismoId = searchParams.get('microorganismo');
    
    console.log('🔍 Parámetros de búsqueda:', { microorganismoId });
    
    if (!microorganismoId) {
      return NextResponse.json({
        success: false,
        error: 'Parámetro microorganismo es requerido'
      }, { status: 400 });
    }
    
    // Consultar tabla de Inoculación
    const records = await base('tblbpGevTHV9JjEYc') // Inoculacion table ID
      .select({
        filterByFormula: `AND(
          FIND("${microorganismoId}", ARRAYJOIN({Microorganismos}, ",")),
          {Estado Lote} = "Incubacion",
          {Total Cantidad Bolsas} > 0
        )`,
        sort: [{ field: "Fecha Inoculacion", direction: "asc" }]
      })
      .all();
    
    console.log(`📊 Encontrados ${records.length} lotes disponibles en Inoculacion`);
    
    // Mapear los registros a formato esperado por el frontend
    const lotes = records.map(record => ({
      id: record.id,
      numeroLote: record.fields['Codigo Lote'] || record.id,
      microorganismo: Array.isArray(record.fields['Microorganismo (from Microorganismos)']) 
        ? record.fields['Microorganismo (from Microorganismos)'][0] 
        : 'No especificado',
      cantidadDisponible: Number(record.fields['Total Cantidad Bolsas']) || 0,
      fechaProduccion: record.fields['Fecha Inoculacion'] || new Date().toISOString().split('T')[0],
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
