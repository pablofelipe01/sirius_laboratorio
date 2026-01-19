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

// Variable de entorno para la tabla Sirius Product Core
const SIRIUS_PRODUCT_CORE_TABLE_ID = process.env.AIRTABLE_TABLE_SIRIUS_PRODUCT_CORE;

interface SiriusProduct {
  id: string;
  nombre: string;
  categoria?: string;
  descripcion?: string;
  precio?: number;
  disponible?: boolean;
  fechaCreacion: string;
}

// GET - Obtener todos los productos de Sirius Core
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 SIRIUS-PRODUCT-CORE API: Iniciando GET request...');

    if (!SIRIUS_PRODUCT_CORE_TABLE_ID) {
      console.error('❌ SIRIUS-PRODUCT-CORE API: AIRTABLE_TABLE_SIRIUS_PRODUCT_CORE no configurado');
      return NextResponse.json(
        { success: false, error: 'Tabla Sirius Product Core no configurada' },
        { status: 500 }
      );
    }

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const maxRecords = parseInt(searchParams.get('maxRecords') || '100');
    const categoria = searchParams.get('categoria');
    const disponible = searchParams.get('disponible');

    console.log('📋 SIRIUS-PRODUCT-CORE API: Parámetros:', { maxRecords, categoria, disponible });

    // Construir filtro
    let filterFormula = '';
    const filters: string[] = [];

    if (categoria) {
      filters.push(`{Categoria} = "${categoria}"`);
    }

    if (disponible !== null) {
      filters.push(`{Disponible} = ${disponible === 'true' ? 'TRUE()' : 'FALSE()'}`);
    }

    if (filters.length > 0) {
      filterFormula = filters.length === 1 ? filters[0] : `AND(${filters.join(', ')})`;
    }

    // Opciones de consulta
    const selectOptions: any = {
      maxRecords,
      sort: [{ field: 'Nombre', direction: 'asc' }]
    };

    if (filterFormula) {
      selectOptions.filterByFormula = filterFormula;
    }

    console.log('🌐 SIRIUS-PRODUCT-CORE API: Consultando Airtable con opciones:', selectOptions);

    // Obtener registros de Airtable
    const records = await base(SIRIUS_PRODUCT_CORE_TABLE_ID)
      .select(selectOptions)
      .all();

    console.log(`✅ SIRIUS-PRODUCT-CORE API: ${records.length} registros obtenidos`);

    // Transformar datos
    const productos: SiriusProduct[] = records.map(record => ({
      id: record.id,
      nombre: record.fields['Nombre'] as string || '',
      categoria: record.fields['Categoria'] as string || '',
      descripcion: record.fields['Descripcion'] as string || '',
      precio: record.fields['Precio'] as number || 0,
      disponible: record.fields['Disponible'] as boolean ?? true,
      fechaCreacion: (record as any).createdTime
    }));

    return NextResponse.json({
      success: true,
      productos,
      count: productos.length,
      message: `${productos.length} productos obtenidos exitosamente`
    });

  } catch (error) {
    console.error('❌ SIRIUS-PRODUCT-CORE API: Error completo:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo producto en Sirius Core
export async function POST(request: NextRequest) {
  try {
    console.log('📝 SIRIUS-PRODUCT-CORE API: Iniciando POST request...');

    if (!SIRIUS_PRODUCT_CORE_TABLE_ID) {
      console.error('❌ SIRIUS-PRODUCT-CORE API: AIRTABLE_TABLE_SIRIUS_PRODUCT_CORE no configurado');
      return NextResponse.json(
        { success: false, error: 'Tabla Sirius Product Core no configurada' },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('📥 SIRIUS-PRODUCT-CORE API: Datos recibidos:', body);

    // Validaciones básicas
    if (!body.nombre || body.nombre.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'El nombre del producto es requerido' },
        { status: 400 }
      );
    }

    // Preparar datos para Airtable
    const recordData = {
      'Nombre': body.nombre,
      'Categoria': body.categoria || '',
      'Descripcion': body.descripcion || '',
      'Precio': body.precio || 0,
      'Disponible': body.disponible ?? true,
    };

    console.log('📦 SIRIUS-PRODUCT-CORE API: Datos para Airtable:', recordData);

    // Crear registro en Airtable
    const record = await base(SIRIUS_PRODUCT_CORE_TABLE_ID).create(recordData);

    console.log('✅ SIRIUS-PRODUCT-CORE API: Producto creado con ID:', record.id);

    // Transformar respuesta
    const nuevoProducto: SiriusProduct = {
      id: record.id,
      nombre: record.fields['Nombre'] as string,
      categoria: record.fields['Categoria'] as string || '',
      descripcion: record.fields['Descripcion'] as string || '',
      precio: record.fields['Precio'] as number || 0,
      disponible: record.fields['Disponible'] as boolean ?? true,
      fechaCreacion: (record as any).createdTime
    };

    return NextResponse.json({
      success: true,
      producto: nuevoProducto,
      message: 'Producto creado exitosamente'
    });

  } catch (error) {
    console.error('❌ SIRIUS-PRODUCT-CORE API: Error creando producto:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error creando producto',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un producto existente
export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 SIRIUS-PRODUCT-CORE API: Iniciando PUT request...');

    if (!SIRIUS_PRODUCT_CORE_TABLE_ID) {
      return NextResponse.json(
        { success: false, error: 'Tabla Sirius Product Core no configurada' },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('📥 SIRIUS-PRODUCT-CORE API: Datos de actualización:', body);

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'ID del producto es requerido para actualizar' },
        { status: 400 }
      );
    }

    // Preparar campos a actualizar
    const fieldsToUpdate: any = {};
    
    if (body.nombre !== undefined) fieldsToUpdate['Nombre'] = body.nombre;
    if (body.categoria !== undefined) fieldsToUpdate['Categoria'] = body.categoria;
    if (body.descripcion !== undefined) fieldsToUpdate['Descripcion'] = body.descripcion;
    if (body.precio !== undefined) fieldsToUpdate['Precio'] = body.precio;
    if (body.disponible !== undefined) fieldsToUpdate['Disponible'] = body.disponible;

    // Actualizar registro en Airtable
    const record = await base(SIRIUS_PRODUCT_CORE_TABLE_ID).update(body.id, fieldsToUpdate);

    const productoActualizado: SiriusProduct = {
      id: record.id,
      nombre: record.fields['Nombre'] as string,
      categoria: record.fields['Categoria'] as string || '',
      descripcion: record.fields['Descripcion'] as string || '',
      precio: record.fields['Precio'] as number || 0,
      disponible: record.fields['Disponible'] as boolean ?? true,
      fechaCreacion: (record as any).createdTime
    };

    return NextResponse.json({
      success: true,
      producto: productoActualizado,
      message: 'Producto actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ SIRIUS-PRODUCT-CORE API: Error actualizando producto:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error actualizando producto',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un producto
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ SIRIUS-PRODUCT-CORE API: Iniciando DELETE request...');

    if (!SIRIUS_PRODUCT_CORE_TABLE_ID) {
      return NextResponse.json(
        { success: false, error: 'Tabla Sirius Product Core no configurada' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID del producto es requerido' },
        { status: 400 }
      );
    }

    // Eliminar registro de Airtable
    await base(SIRIUS_PRODUCT_CORE_TABLE_ID).destroy(id);

    console.log('✅ SIRIUS-PRODUCT-CORE API: Producto eliminado con ID:', id);

    return NextResponse.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });

  } catch (error) {
    console.error('❌ SIRIUS-PRODUCT-CORE API: Error eliminando producto:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error eliminando producto',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}