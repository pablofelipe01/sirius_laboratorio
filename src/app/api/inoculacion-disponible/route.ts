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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const microorganismo = searchParams.get('microorganismo');
    
    console.log('🔍 Solicitud inoculaciones disponibles:', {
      microorganismo,
      timestamp: new Date().toISOString()
    });
    
    // Usar la tabla de Inoculaciones desde variables de entorno
    const tableId = process.env.AIRTABLE_TABLE_INOCULACION;
    
    if (!tableId) {
      console.error('❌ Missing AIRTABLE_TABLE_INOCULACION environment variable');
      throw new Error('Missing AIRTABLE_TABLE_INOCULACION environment variable');
    }

    let filterFormula = '{Total Cantidad Bolsas en Stock} > 0';
    
    if (microorganismo) {
      // Filtrar por microorganismo si se especifica
      const safeOrganism = microorganismo.replace(/['"]/g, '');
      filterFormula = `AND({Total Cantidad Bolsas en Stock} > 0, SEARCH("${safeOrganism}", ARRAYJOIN({Microorganismo (from Microorganismos)}, " ")))`;
      console.log('🔬 Filtrado por microorganismo:', safeOrganism);
    }

    console.log('📋 Fórmula de filtro:', filterFormula);

    // Obtener registros de Airtable filtrados
    const records = await base(tableId)
      .select({
        maxRecords: 100,
        sort: [{ field: 'Fecha Inoculacion', direction: 'desc' }],
        filterByFormula: filterFormula,
        fields: [
          'ID',
          'Microorganismo (from Microorganismos)',
          'Codigo Lote',
          'Total Cantidad Bolsas en Stock',
          'Fecha Inoculacion',
          'Nombre (from Responsables)'
        ]
      })
      .firstPage();

    const formattedRecords = records.map(record => ({
      id: record.get('ID'),
      microorganismo: record.get('Microorganismo (from Microorganismos)'),
      codigoLote: record.get('Codigo Lote'),
      totalCantidadBolsas: record.get('Total Cantidad Bolsas en Stock'),
      fechaCreacion: record.get('Fecha Inoculacion'),
      responsables: record.get('Nombre (from Responsables)')
    }));

    console.log('✅ Inoculaciones disponibles obtenidas:', {
      microorganismo,
      cantidadInoculaciones: formattedRecords.length,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      inoculaciones: formattedRecords,
      total: formattedRecords.length,
      filtros: { microorganismo }
    });

  } catch (error) {
    console.error('Error al obtener inoculaciones disponibles:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener datos de inoculaciones',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
