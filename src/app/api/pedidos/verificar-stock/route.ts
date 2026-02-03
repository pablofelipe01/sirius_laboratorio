import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { SIRIUS_PEDIDOS_CORE_CONFIG, SIRIUS_INVENTARIO_CONFIG } from '@/lib/constants/airtable';

// Configurar Airtable para Pedidos Core
const basePedidos = new Airtable({
  apiKey: SIRIUS_PEDIDOS_CORE_CONFIG.API_KEY
}).base(SIRIUS_PEDIDOS_CORE_CONFIG.BASE_ID);

// Configurar Airtable para Inventario
const baseInventario = new Airtable({
  apiKey: SIRIUS_INVENTARIO_CONFIG.API_KEY
}).base(SIRIUS_INVENTARIO_CONFIG.BASE_ID);

/**
 * POST /api/pedidos/verificar-stock
 * Verifica si hay stock suficiente para completar un pedido
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pedidoId } = body;

    console.log('🔍 Verificando stock para pedido:', pedidoId);

    if (!pedidoId) {
      return NextResponse.json({
        error: 'Se requiere el ID del pedido'
      }, { status: 400 });
    }

    // 1. Obtener los detalles del pedido
    const pedidoRecord = await basePedidos(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PEDIDOS)
      .find(pedidoId);

    if (!pedidoRecord) {
      return NextResponse.json({
        error: 'Pedido no encontrado'
      }, { status: 404 });
    }

    console.log('📋 Pedido encontrado - ID:', pedidoRecord.id);

    // Obtener detalles del pedido
    const detallesPedidoIds = pedidoRecord.get('Detalles del Pedido') as string[] || [];
    
    console.log('📦 Detalles del pedido a procesar:', detallesPedidoIds.length, 'productos');
    
    if (detallesPedidoIds.length === 0) {
      return NextResponse.json({
        error: 'El pedido no tiene productos',
        valoresCampos: pedidoRecord.fields
      }, { status: 400 });
    }

    console.log('📦 Obteniendo detalles de', detallesPedidoIds.length, 'productos...');

    // 2. Obtener los detalles de cada producto del pedido
    const detallesPromises = detallesPedidoIds.map(async (detalleId) => {
      try {
        const detalleRecord = await basePedidos(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.DETALLES_PEDIDO)
          .find(detalleId);
        
        const idProductoCore = detalleRecord.get('ID Producto Core') as string || '';
        const cantidadPedida = detalleRecord.get('Cantidad Pedido') as number || 0;
        const unidad = 'L';
        
        return {
          detalleId,
          nombreProducto: idProductoCore,
          idProductoCore,
          cantidadPedida,
          unidad
        };
      } catch (error) {
        console.error('❌ Error procesando detalle del pedido:', detalleId, error);
        return {
          detalleId,
          nombreProducto: '',
          idProductoCore: '',
          cantidadPedida: 0,
          unidad: 'L'
        };
      }
    });

    const detallesPedido = await Promise.all(detallesPromises);

    // Obtener el ID legible del pedido
    const idPedidoCore = pedidoRecord.get('ID Pedido Core') as string || '';

    // 3. Para cada producto, verificar stock disponible del pedido
    const verificacionStock = await Promise.all(
      detallesPedido.map(async (detalle) => {
        const movimientosRecords = await baseInventario(SIRIUS_INVENTARIO_CONFIG.TABLES.MOVIMIENTOS_INVENTARIO)
          .select({
            filterByFormula: `AND(
              {tipo_movimiento} = "Entrada",
              {product_id} = "${detalle.idProductoCore}",
              OR(
                {ubicacion_destino_id} = "${pedidoId}",
                {ubicacion_destino_id} = "${idPedidoCore}"
              )
            )`
          })
          .firstPage();

        const stockActual = movimientosRecords.reduce((total, movimiento) => {
          return total + (movimiento.get('cantidad') as number || 0);
        }, 0);

        const stockSuficiente = stockActual >= detalle.cantidadPedida;
        const faltante = stockSuficiente ? 0 : detalle.cantidadPedida - stockActual;

        return {
          nombreProducto: detalle.nombreProducto,
          idProductoCore: detalle.idProductoCore,
          cantidadPedida: detalle.cantidadPedida,
          stockActual,
          stockSuficiente,
          faltante,
          unidad: detalle.unidad
        };
      })
    );

    // 4. Determinar si el pedido está completo
    const pedidoCompleto = verificacionStock.every(v => v.stockSuficiente);
    const productosFaltantes = verificacionStock.filter(v => !v.stockSuficiente);

    return NextResponse.json({
      success: true,
      pedidoCompleto,
      productos: verificacionStock,
      productosFaltantes,
      resumen: {
        totalProductos: verificacionStock.length,
        productosCompletos: verificacionStock.filter(v => v.stockSuficiente).length,
        productosFaltantes: productosFaltantes.length
      }
    });

  } catch (error: any) {
    console.error('❌ Error verificando stock:', error);
    return NextResponse.json({
      error: 'Error al verificar stock del pedido',
      details: error.message
    }, { status: 500 });
  }
}
