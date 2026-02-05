import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { 
  SIRIUS_REMISIONES_CORE_CONFIG, 
  SIRIUS_PEDIDOS_CORE_CONFIG,
  SIRIUS_PRODUCT_CORE_CONFIG,
  SIRIUS_INVENTARIO_CONFIG
} from '@/lib/constants/airtable';

// Configurar Airtable para Remisiones Core
const baseRemisiones = new Airtable({
  apiKey: SIRIUS_REMISIONES_CORE_CONFIG.API_KEY
}).base(SIRIUS_REMISIONES_CORE_CONFIG.BASE_ID);

// Configurar Airtable para Pedidos Core
const basePedidos = new Airtable({
  apiKey: SIRIUS_PEDIDOS_CORE_CONFIG.API_KEY
}).base(SIRIUS_PEDIDOS_CORE_CONFIG.BASE_ID);

// Configurar Airtable para Product Core
const baseProductCore = new Airtable({
  apiKey: SIRIUS_PRODUCT_CORE_CONFIG.API_KEY
}).base(SIRIUS_PRODUCT_CORE_CONFIG.BASE_ID);

// Configurar Airtable para Inventario
const baseInventario = new Airtable({
  apiKey: SIRIUS_INVENTARIO_CONFIG.API_KEY
}).base(SIRIUS_INVENTARIO_CONFIG.BASE_ID);

// Función helper para obtener nombres de productos
async function obtenerNombresProductos(productIds: string[]): Promise<Map<string, string>> {
  const nombresMap = new Map<string, string>();
  
  if (productIds.length === 0) return nombresMap;

  try {
    const productosRecords = await baseProductCore(SIRIUS_PRODUCT_CORE_CONFIG.TABLES.PRODUCTOS)
      .select({
        filterByFormula: `OR(${productIds.map(id => `{Codigo Producto} = "${id}"`).join(',')})`
      })
      .all();

    productosRecords.forEach(record => {
      const codigoProducto = record.get('Codigo Producto') as string;
      const nombreProducto = record.get('Nombre Comercial') as string;
      if (codigoProducto && nombreProducto) {
        nombresMap.set(codigoProducto, nombreProducto);
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo nombres de productos:', error);
  }

  return nombresMap;
}

/**
 * Registra movimientos de inventario (salida) para cada producto de la remisión
 */
async function registrarMovimientosInventario(
  productos: Array<{ productoId: string; cantidad: number; unidad?: string }>,
  remisionId: string,
  pedidoId: string,
  clienteId: string,
  responsable: string,
  nombresProductos: Map<string, string>
): Promise<{ success: boolean; movimientos: string[]; errores: string[] }> {
  const movimientosCreados: string[] = [];
  const errores: string[] = [];

  console.log('📊 Registrando movimientos de inventario para', productos.length, 'productos');

  for (const producto of productos) {
    try {
      const nombreProducto = nombresProductos.get(producto.productoId) || producto.productoId;
      
      // Crear el movimiento de salida en Movimientos_Inventario
      const movimiento = await baseInventario(SIRIUS_INVENTARIO_CONFIG.TABLES.MOVIMIENTOS_INVENTARIO)
        .create({
          'product_id': producto.productoId,
          'ubicacion_origen_id': remisionId, // Origen: Código de la remisión (SIRIUS-REM-XXXX)
          'ubicacion_destino_id': pedidoId, // Destino: El pedido
          'tipo_movimiento': 'Salida',
          'cantidad': producto.cantidad,
          'unidad_medida': producto.unidad || 'L',
          'motivo': 'Despacho Remisión',
          'documento_referencia': remisionId,
          'responsable': responsable,
          'fecha_movimiento': new Date().toISOString(),
          'observaciones': `Despacho de ${producto.cantidad} ${producto.unidad || 'L'} de ${nombreProducto} - Remisión: ${remisionId} - Pedido: ${pedidoId} - Cliente: ${clienteId}`
        });

      console.log('✅ Movimiento de inventario creado:', movimiento.id, 'para producto:', producto.productoId);
      movimientosCreados.push(movimiento.id);

      // Buscar o crear el registro de Stock_Actual para este producto
      await actualizarStockActual(producto.productoId, movimiento.id);

    } catch (error: any) {
      console.error('❌ Error registrando movimiento para producto:', producto.productoId, error);
      errores.push(`Error en ${producto.productoId}: ${error.message}`);
    }
  }

  return {
    success: errores.length === 0,
    movimientos: movimientosCreados,
    errores
  };
}

/**
 * Busca el registro de Stock_Actual para un producto y le vincula el movimiento
 * Si no existe, crea uno nuevo
 */
async function actualizarStockActual(productoId: string, movimientoId: string): Promise<void> {
  try {
    // Buscar si existe un registro de Stock_Actual para este producto
    const stockRecords = await baseInventario(SIRIUS_INVENTARIO_CONFIG.TABLES.STOCK_ACTUAL)
      .select({
        filterByFormula: `{producto_id} = "${productoId}"`,
        maxRecords: 1
      })
      .firstPage();

    if (stockRecords.length > 0) {
      // Existe: agregar el movimiento al array existente
      const stockRecord = stockRecords[0];
      const movimientosActuales = stockRecord.get('Movimientos_Inventario') as string[] || [];
      
      await baseInventario(SIRIUS_INVENTARIO_CONFIG.TABLES.STOCK_ACTUAL)
        .update(stockRecord.id, {
          'Movimientos_Inventario': [...movimientosActuales, movimientoId]
        });
      
      console.log('✅ Stock_Actual actualizado para producto:', productoId);
    } else {
      // No existe: crear nuevo registro
      await baseInventario(SIRIUS_INVENTARIO_CONFIG.TABLES.STOCK_ACTUAL)
        .create({
          'producto_id': productoId,
          'Movimientos_Inventario': [movimientoId]
        });
      
      console.log('✅ Stock_Actual creado para producto:', productoId);
    }
  } catch (error: any) {
    console.error('⚠️ Error actualizando Stock_Actual para producto:', productoId, error.message);
    // No lanzamos error para no interrumpir el flujo principal
  }
}

/**
 * GET /api/remisiones
 * Lista remisiones, opcionalmente filtradas por pedido
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pedidoId = searchParams.get('pedidoId');
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log('📋 Obteniendo remisiones...', pedidoId ? `para pedido: ${pedidoId}` : '');

    let filterFormula = '';
    if (pedidoId) {
      filterFormula = `{ID Pedido} = "${pedidoId}"`;
    }

    const remisionesRecords = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.REMISIONES)
      .select({
        filterByFormula: filterFormula || undefined,
        maxRecords: limit,
        sort: [{ field: 'Fecha de Remisión', direction: 'desc' }]
      })
      .all();

    const remisiones = remisionesRecords.map(record => ({
      id: record.id,
      idRemision: record.get('ID') as string || '',
      numeracion: record.get('numeracion') as number || 0,
      fechaRemision: record.get('Fecha de Remisión') as string || '',
      idCliente: record.get('ID Cliente') as string || '',
      idPedido: record.get('ID Pedido') as string || '',
      estado: record.get('Estado') as string || 'Borrador',
      areaOrigen: record.get('Area Origen') as string || '',
      responsableEntrega: record.get('Responsable Entrega') as string || '',
      transportista: record.get('Transportista') as string || '',
      receptor: record.get('Receptor') as string || '',
      fechaEntrega: record.get('Fecha Entrega') as string || '',
      fechaRecibido: record.get('Fecha Recibido') as string || '',
      notas: record.get('Notas de Remisión') as string || '',
      productosRemitidos: record.get('Productos Remitidos') as string[] || [],
      totalCantidad: record.get('Total Cantidad Remitida') as number || 0,
      estadoFirmaTransportista: record.get('Estado Firma Transportista') as string || 'Sin Firmar',
      estadoFirmaReceptor: record.get('Estado Firma Receptor') as string || 'Sin Firmar',
    }));

    return NextResponse.json({
      success: true,
      remisiones,
      total: remisiones.length
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo remisiones:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al obtener remisiones',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/remisiones
 * Crea una nueva remisión a partir de un pedido
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      pedidoId, 
      productos, 
      responsable,
      areaOrigen = 'Laboratorio',
      notas = '',
      esDespachoCompleto = true
    } = body;

    console.log('📦 Creando remisión para pedido:', pedidoId);
    console.log('📋 Productos a remitir:', productos?.length || 0);

    if (!pedidoId) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere el ID del pedido'
      }, { status: 400 });
    }

    if (!productos || productos.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere al menos un producto para la remisión'
      }, { status: 400 });
    }

    // 1. Obtener información del pedido
    let pedidoRecord;
    if (pedidoId.startsWith('rec')) {
      pedidoRecord = await basePedidos(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PEDIDOS).find(pedidoId);
    } else {
      const records = await basePedidos(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PEDIDOS)
        .select({
          filterByFormula: `{ID Pedido Core} = "${pedidoId}"`,
          maxRecords: 1
        })
        .firstPage();
      pedidoRecord = records[0];
    }

    if (!pedidoRecord) {
      return NextResponse.json({
        success: false,
        error: 'Pedido no encontrado'
      }, { status: 404 });
    }

    const idPedidoCore = pedidoRecord.get('ID Pedido Core') as string || pedidoId;
    const idCliente = pedidoRecord.get('ID Cliente Core') as string || '';

    console.log('✅ Pedido encontrado:', idPedidoCore, 'Cliente:', idCliente);

    // 2. Obtener nombres de productos
    const productIds = productos.map((p: any) => p.productoId);
    const nombresProductos = await obtenerNombresProductos(productIds);

    // 3. Crear los registros de Productos Remitidos primero
    const productosRemitidosRecords = await Promise.all(
      productos.map(async (producto: any) => {
        const productoRemitido = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.PRODUCTOS_REMITIDOS)
          .create({
            'Cantidad': producto.cantidad,
            'Unidad': producto.unidad || 'Litro',
            'ID Producto': producto.productoId,
            'Notas': producto.notas || `Producto: ${nombresProductos.get(producto.productoId) || producto.productoId}`
          });
        
        console.log('✅ Producto remitido creado:', productoRemitido.id);
        return productoRemitido.id;
      })
    );

    // 4. Crear la remisión con los productos vinculados
    const notasRemision = esDespachoCompleto 
      ? `Despacho completo del pedido ${idPedidoCore}. ${notas}`
      : `Despacho parcial del pedido ${idPedidoCore}. ${notas}`;

    const remisionRecord = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.REMISIONES)
      .create({
        'ID Cliente': idCliente,
        'ID Pedido': idPedidoCore,
        'Area Origen': areaOrigen,
        'Estado': 'Pendiente',
        'Responsable Entrega': responsable || '',
        'Notas de Remisión': notasRemision,
        'Productos Remitidos': productosRemitidosRecords,
        'Estado Firma Transportista': 'Sin Firmar',
        'Estado Firma Receptor': 'Sin Firmar'
      });

    console.log('✅ Remisión creada:', remisionRecord.id);

    // 5. Obtener el ID legible de la remisión creada
    const remisionCreada = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.REMISIONES)
      .find(remisionRecord.id);

    const idRemision = remisionCreada.get('ID') as string || remisionRecord.id;

    // 6. Registrar movimientos de inventario (salida de productos)
    console.log('📊 Registrando movimientos de inventario...');
    const resultadoInventario = await registrarMovimientosInventario(
      productos,
      idRemision,
      idPedidoCore,
      idCliente,
      responsable || 'Sistema',
      nombresProductos
    );

    if (!resultadoInventario.success) {
      console.warn('⚠️ Algunos movimientos de inventario fallaron:', resultadoInventario.errores);
    } else {
      console.log('✅ Todos los movimientos de inventario registrados:', resultadoInventario.movimientos.length);
    }

    return NextResponse.json({
      success: true,
      remision: {
        id: remisionRecord.id,
        idRemision,
        idPedido: idPedidoCore,
        idCliente,
        productosRemitidos: productosRemitidosRecords.length,
        estado: 'Pendiente',
        esDespachoCompleto
      },
      inventario: {
        movimientosCreados: resultadoInventario.movimientos.length,
        errores: resultadoInventario.errores
      },
      message: esDespachoCompleto 
        ? `Remisión ${idRemision} creada exitosamente para el pedido completo`
        : `Remisión ${idRemision} creada para despacho parcial del pedido`
    });

  } catch (error: any) {
    console.error('❌ Error creando remisión:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al crear la remisión',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * PATCH /api/remisiones
 * Actualiza una remisión existente
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      remisionId,
      estado,
      transportista,
      receptor,
      fechaEntrega,
      fechaRecibido,
      estadoFirmaTransportista,
      comentarioTransportista,
      estadoFirmaReceptor,
      comentarioReceptor,
      notas
    } = body;

    if (!remisionId) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere el ID de la remisión'
      }, { status: 400 });
    }

    console.log('📝 Actualizando remisión:', remisionId);

    // Construir objeto de actualización solo con campos proporcionados
    const updateFields: Record<string, any> = {};
    
    if (estado) updateFields['Estado'] = estado;
    if (transportista !== undefined) updateFields['Transportista'] = transportista;
    if (receptor !== undefined) updateFields['Receptor'] = receptor;
    if (fechaEntrega) updateFields['Fecha Entrega'] = fechaEntrega;
    if (fechaRecibido) updateFields['Fecha Recibido'] = fechaRecibido;
    if (estadoFirmaTransportista) updateFields['Estado Firma Transportista'] = estadoFirmaTransportista;
    if (comentarioTransportista !== undefined) updateFields['Comentario Transportista'] = comentarioTransportista;
    if (estadoFirmaReceptor) updateFields['Estado Firma Receptor'] = estadoFirmaReceptor;
    if (comentarioReceptor !== undefined) updateFields['Comentario Receptor'] = comentarioReceptor;
    if (notas !== undefined) updateFields['Notas de Remisión'] = notas;

    const remisionActualizada = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.REMISIONES)
      .update(remisionId, updateFields);

    return NextResponse.json({
      success: true,
      remision: {
        id: remisionActualizada.id,
        idRemision: remisionActualizada.get('ID') as string,
        estado: remisionActualizada.get('Estado') as string
      },
      message: 'Remisión actualizada exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error actualizando remisión:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al actualizar la remisión',
      details: error.message
    }, { status: 500 });
  }
}
