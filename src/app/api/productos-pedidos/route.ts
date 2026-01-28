import { NextRequest, NextResponse } from 'next/server';
import { 
  SIRIUS_PEDIDOS_CORE_CONFIG, 
  buildSiriusPedidosCoreUrl, 
  getSiriusPedidosCoreHeaders 
} from '@/lib/constants/airtable';

// ============================================================================
// Interface para productos del catálogo de pedidos
// ============================================================================
interface ProductoPedidoAirtable {
  id: string;
  createdTime: string;
  fields: {
    'ID Producto Pedido'?: string;
    'ID'?: number;
    'Nombre del Producto'?: string;
    'ID Producto Core'?: string;
    'Precio Unitario'?: number;
    'En Stock'?: number;
    'Descripción'?: string;
    'Imagen del Producto'?: any[];
    'Resumen AI del Producto'?: string;
  };
}

interface ProductoFormateado {
  id: string;
  idProductoPedido: string;
  idNumerico: number;
  nombre: string;
  idProductoCore: string;
  precioUnitario: number;
  enStock: number;
  descripcion: string;
  imagen: any[];
  resumenAI: string;
  createdTime: string;
}

// ============================================================================
// GET - Obtener productos del catálogo de Sirius Pedidos Core
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    console.log('📦 [PRODUCTOS-PEDIDOS-API] Obteniendo productos de Sirius Pedidos Core...');

    const { searchParams } = new URL(request.url);
    const conStock = searchParams.get('conStock') === 'true';
    const busqueda = searchParams.get('busqueda');

    // Construir URL
    let url = buildSiriusPedidosCoreUrl(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PRODUCTOS);
    const params = new URLSearchParams();

    // Filtro por stock
    if (conStock) {
      params.append('filterByFormula', '{En Stock} > 0');
    }

    // Filtro por búsqueda
    if (busqueda) {
      const formula = `SEARCH(LOWER("${busqueda}"), LOWER({Nombre del Producto}))`;
      if (conStock) {
        params.append('filterByFormula', `AND({En Stock} > 0, ${formula})`);
      } else {
        params.append('filterByFormula', formula);
      }
    }

    // Ordenar por nombre
    params.append('sort[0][field]', 'Nombre del Producto');
    params.append('sort[0][direction]', 'asc');

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    console.log('🔗 URL Productos:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: getSiriusPedidosCoreHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de Airtable:', errorText);
      throw new Error(`Error de Airtable: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const productos: ProductoPedidoAirtable[] = data.records || [];

    // Formatear productos
    const productosFormateados: ProductoFormateado[] = productos.map(producto => ({
      id: producto.id,
      idProductoPedido: producto.fields['ID Producto Pedido'] || '',
      idNumerico: producto.fields['ID'] || 0,
      nombre: producto.fields['Nombre del Producto'] || '',
      idProductoCore: producto.fields['ID Producto Core'] || '',
      precioUnitario: producto.fields['Precio Unitario'] || 0,
      enStock: producto.fields['En Stock'] || 0,
      descripcion: producto.fields['Descripción'] || '',
      imagen: producto.fields['Imagen del Producto'] || [],
      resumenAI: producto.fields['Resumen AI del Producto'] || '',
      createdTime: producto.createdTime,
    }));

    console.log(`✅ ${productosFormateados.length} productos obtenidos de Sirius Pedidos Core`);

    return NextResponse.json({
      success: true,
      productos: productosFormateados,
      total: productosFormateados.length,
      mensaje: 'Productos obtenidos exitosamente desde Airtable'
    });

  } catch (error) {
    console.error('❌ Error obteniendo productos:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor',
        productos: [],
        total: 0
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Crear un nuevo producto en el catálogo
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 [PRODUCTOS-PEDIDOS-API] Creando nuevo producto:', body);

    // Validaciones
    if (!body.nombre) {
      return NextResponse.json(
        { success: false, error: 'Se requiere el nombre del producto' },
        { status: 400 }
      );
    }

    const url = buildSiriusPedidosCoreUrl(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PRODUCTOS);
    
    const productoData = {
      fields: {
        'Nombre del Producto': body.nombre,
        'ID Producto Core': body.idProductoCore || '',
        'Precio Unitario': body.precioUnitario || 0,
        'En Stock': body.enStock || 0,
        'Descripción': body.descripcion || '',
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: getSiriusPedidosCoreHeaders(),
      body: JSON.stringify(productoData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error creando producto:', errorText);
      throw new Error(`Error creando producto: ${response.status} - ${errorText}`);
    }

    const productoCreado = await response.json();
    console.log('✅ Producto creado:', productoCreado.id);

    return NextResponse.json({
      success: true,
      producto: {
        id: productoCreado.id,
        idProductoPedido: productoCreado.fields['ID Producto Pedido'],
        nombre: productoCreado.fields['Nombre del Producto'],
      },
      mensaje: 'Producto creado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error creando producto:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - Actualizar un producto existente
// ============================================================================
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔄 [PRODUCTOS-PEDIDOS-API] Actualizando producto:', body);

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'ID del producto es requerido' },
        { status: 400 }
      );
    }

    const updateFields: any = {};
    
    if (body.nombre) updateFields['Nombre del Producto'] = body.nombre;
    if (body.idProductoCore !== undefined) updateFields['ID Producto Core'] = body.idProductoCore;
    if (body.precioUnitario !== undefined) updateFields['Precio Unitario'] = body.precioUnitario;
    if (body.enStock !== undefined) updateFields['En Stock'] = body.enStock;
    if (body.descripcion !== undefined) updateFields['Descripción'] = body.descripcion;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay campos para actualizar' },
        { status: 400 }
      );
    }

    const url = buildSiriusPedidosCoreUrl(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PRODUCTOS, body.id);
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: getSiriusPedidosCoreHeaders(),
      body: JSON.stringify({ fields: updateFields }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error actualizando producto:', errorText);
      throw new Error(`Error actualizando producto: ${response.status} - ${errorText}`);
    }

    const productoActualizado = await response.json();
    console.log('✅ Producto actualizado:', productoActualizado.id);

    return NextResponse.json({
      success: true,
      producto: {
        id: productoActualizado.id,
        idProductoPedido: productoActualizado.fields['ID Producto Pedido'],
        nombre: productoActualizado.fields['Nombre del Producto'],
      },
      mensaje: 'Producto actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error actualizando producto:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}
