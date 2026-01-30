import { NextResponse } from 'next/server';
import Airtable from 'airtable';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 API MICROORGANISMOS - Migrado a Sirius Product Core
// Filtra productos: Tipo = "Hongo" + Unidad Base = "L" (líquido)
// ═══════════════════════════════════════════════════════════════════════════════

// Configuración de Sirius Product Core
const PRODUCT_CORE_API_KEY = process.env.AIRTABLE_API_KEY_SIRIUS_PRODUCT_CORE;
const PRODUCT_CORE_BASE_ID = process.env.AIRTABLE_BASE_ID_SIRIUS_PRODUCT_CORE;
const PRODUCTOS_TABLE_ID = process.env.AIRTABLE_TABLE_PRODUCTOS;

// Validar configuración
if (!PRODUCT_CORE_API_KEY || !PRODUCT_CORE_BASE_ID || !PRODUCTOS_TABLE_ID) {
  console.error('⚠️ Variables de entorno de Sirius Product Core no configuradas para API microorganismos');
}

// Configurar Airtable para Sirius Product Core
const productBase = PRODUCT_CORE_API_KEY && PRODUCT_CORE_BASE_ID 
  ? new Airtable({ apiKey: PRODUCT_CORE_API_KEY }).base(PRODUCT_CORE_BASE_ID)
  : null;

export async function GET() {
  try {
    // Verificar que la base esté configurada
    if (!productBase || !PRODUCTOS_TABLE_ID) {
      console.error('❌ Sirius Product Core no configurado');
      return NextResponse.json(
        { success: false, error: 'Sistema de productos no configurado' },
        { status: 500 }
      );
    }

    console.log('🍄 Obteniendo productos Hongos (líquidos) de Sirius Product Core...');

    // Obtener productos activos, tipo Hongo, unidad líquida
    const records = await productBase(PRODUCTOS_TABLE_ID)
      .select({
        fields: ['Codigo Producto', 'Nombre Comercial', 'Tipo Producto', 'Unidad Base', 'Activo', 'Area', 'Abreviatura'],
        filterByFormula: `AND(
          {Activo} = 'Sí',
          {Tipo Producto} = 'Hongo',
          {Unidad Base} = 'L'
        )`,
        sort: [{ field: 'Nombre Comercial', direction: 'asc' }]
      })
      .all();

    console.log(`✅ ${records.length} productos de hongos (líquidos) encontrados`);

    // Mapear a la estructura esperada por el formulario
    const microorganismos = records.map(record => ({
      id: record.id,
      nombre: record.fields['Nombre Comercial'] as string || '',
      codigo: record.fields['Codigo Producto'] as string || '',
      tipo: record.fields['Tipo Producto'] as string || 'Hongo',
      'Tipo Microorganismo': record.fields['Tipo Producto'] as string || 'Hongo',
      unidadBase: record.fields['Unidad Base'] as string || 'L',
      area: record.fields['Area'] as string || '',
      abreviatura: record.fields['Abreviatura'] as string || '', // Abreviatura para código de lote
    })).filter(item => item.nombre); // Filtrar los que no tienen nombre

    return NextResponse.json({
      success: true,
      microorganismos
    });

  } catch (error) {
    console.error('❌ Error fetching microorganismos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener microorganismos', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
