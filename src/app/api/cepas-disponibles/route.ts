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
    const abreviatura = searchParams.get('abreviatura');
    const idProductCore = searchParams.get('idProductCore'); // SIRIUS-PRODUCT-XXXX
    
    console.log('🔍 Solicitud cepas-disponibles:', {
      microorganismo,
      abreviatura,
      idProductCore,
      timestamp: new Date().toISOString()
    });
    
    // Usar la tabla de Cepas desde variables de entorno
    const tableId = process.env.AIRTABLE_TABLE_CEPAS;
    
    if (!tableId) {
      console.error('❌ Missing AIRTABLE_TABLE_CEPAS environment variable');
      throw new Error('Missing AIRTABLE_TABLE_CEPAS environment variable');
    }

    let filterFormula = '{Total Cantidad Bolsas} > 0';
    
    // Prioridad: idProductCore > microorganismo > abreviatura
    if (idProductCore) {
      // Filtrar por ID Product Core (más preciso)
      const safeProductCore = idProductCore.replace(/['"]/g, '');
      filterFormula = `AND({Total Cantidad Bolsas} > 0, {ID Product Core} = "${safeProductCore}")`;
      console.log('🏷️ Filtrado por ID Product Core:', safeProductCore);
    } else if (microorganismo) {
      // Limpiar el nombre del microorganismo:
      const safeOrganism = microorganismo
        .replace(/['"]/g, '')
        .replace(/\s*\(L\)\s*$/i, '')
        .replace(/\s*\(Kg\)\s*$/i, '')
        .replace(/\s*\(Bolsa\)\s*$/i, '')
        .replace(/\s*\(Unidad\)\s*$/i, '')
        .trim();
      
      filterFormula = `AND({Total Cantidad Bolsas} > 0, SEARCH("${safeOrganism}", ARRAYJOIN({Microorganismo (from Microorganismos)}, " ")))`;
      console.log('🔬 Filtrado por microorganismo:', safeOrganism);
    } else if (abreviatura) {
      const safeAbbrev = abreviatura.replace(/['"]/g, '');
      filterFormula = `AND({Total Cantidad Bolsas} > 0, SEARCH("${safeAbbrev}", ARRAYJOIN({Abreviatura Hongo}, " ")))`;
      console.log('🏷️ Filtrado por abreviatura:', safeAbbrev);
    } else {
      console.log('📌 Sin filtros específicos, mostrando todas las cepas con cantidad > 0');
    }

    console.log('📋 Fórmula de filtro:', filterFormula);

    // Obtener registros de Airtable filtrados
    const records = await base(tableId)
      .select({
        maxRecords: 100,
        sort: [{ field: 'Fecha Creacion', direction: 'desc' }],
        filterByFormula: filterFormula,
        fields: [
          'ID',
          'Microorganismo (from Microorganismos)',
          'Abreviatura Hongo',
          'Codigo Cepa',
          'Total Cantidad Bolsas',
          'Fecha Creacion',
          'Nombre (from Responsables)',
          'ID Product Core'
        ]
      })
      .firstPage();

    const formattedRecords = records.map(record => ({
      id: record.get('ID'),
      microorganismo: record.get('Microorganismo (from Microorganismos)'),
      abreviatura: record.get('Abreviatura Hongo'),
      codigoCepa: record.get('Codigo Cepa'),
      totalCantidadBolsas: record.get('Total Cantidad Bolsas'),
      fechaCreacion: record.get('Fecha Creacion'),
      responsables: record.get('Nombre (from Responsables)'),
      idProductCore: record.get('ID Product Core')
    }));

    console.log('✅ Cepas filtradas obtenidas:', {
      microorganismo,
      abreviatura,
      idProductCore,
      cantidadCepas: formattedRecords.length,
      cepas: formattedRecords.map(c => ({ codigo: c.codigoCepa, bolsas: c.totalCantidadBolsas })),
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      cepas: formattedRecords,
      total: formattedRecords.length,
      filtros: { microorganismo, abreviatura, idProductCore }
    });

  } catch (error) {
    console.error('Error al obtener cepas filtradas:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener datos de cepas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
