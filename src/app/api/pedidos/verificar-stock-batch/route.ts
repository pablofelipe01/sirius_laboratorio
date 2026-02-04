import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { SIRIUS_PEDIDOS_CORE_CONFIG, SIRIUS_INVENTARIO_CONFIG } from '@/lib/constants/airtable';

const basePedidos = new Airtable({
  apiKey: SIRIUS_PEDIDOS_CORE_CONFIG.API_KEY
}).base(SIRIUS_PEDIDOS_CORE_CONFIG.BASE_ID);

const baseInventario = new Airtable({
  apiKey: SIRIUS_INVENTARIO_CONFIG.API_KEY
}).base(SIRIUS_INVENTARIO_CONFIG.BASE_ID);

/**
 * POST /api/pedidos/verificar-stock-batch
 * Verifica stock de múltiples pedidos a la vez (optimización)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pedidoIds } = body;

    if (!pedidoIds || !Array.isArray(pedidoIds) || pedidoIds.length === 0) {
      return NextResponse.json({
        error: 'Se requiere un array de IDs de pedidos'
      }, { status: 400 });
    }

    // Limitar a 10 pedidos por request para evitar timeout
    if (pedidoIds.length > 10) {
      return NextResponse.json({
        error: 'Máximo 10 pedidos por request'
      }, { status: 400 });
    }

    // Procesar todos los pedidos en paralelo
    const resultados = await Promise.all(
      pedidoIds.map(async (pedidoId) => {
        try {
          const pedidoRecord = await basePedidos(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PEDIDOS)
            .find(pedidoId);

          const detallesPedidoIds = pedidoRecord.get('Detalles del Pedido') as string[] || [];
          
          if (detallesPedidoIds.length === 0) {
            return {
              pedidoId,
              success: true,
              porcentaje: 0,
              totalPedido: 0,
              totalStock: 0,
              completo: false
            };
          }

          const detallesPromises = detallesPedidoIds.map(async (detalleId) => {
            try {
              const detalleRecord = await basePedidos(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.DETALLES_PEDIDO)
                .find(detalleId);
              
              const idProductoCore = detalleRecord.get('ID Producto Core') as string || '';
              const cantidadPedida = detalleRecord.get('Cantidad Pedido') as number || 0;
              
              return {
                idProductoCore,
                cantidadPedida
              };
            } catch (error) {
              return {
                idProductoCore: '',
                cantidadPedida: 0
              };
            }
          });

          const detallesPedido = await Promise.all(detallesPromises);
          const idPedidoCore = pedidoRecord.get('ID Pedido Core') as string || '';

          // Verificar stock para cada producto
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

              return {
                cantidadPedida: detalle.cantidadPedida,
                stockActual
              };
            })
          );

          const totalPedido = verificacionStock.reduce((sum, v) => sum + v.cantidadPedida, 0);
          const totalStock = verificacionStock.reduce((sum, v) => sum + v.stockActual, 0);
          const pedidoCompleto = verificacionStock.every(v => v.stockActual >= v.cantidadPedida);
          const porcentaje = totalPedido > 0 ? Math.round((totalStock / totalPedido) * 100) : 0;

          return {
            pedidoId,
            success: true,
            porcentaje: Math.min(porcentaje, 100),
            totalPedido,
            totalStock,
            completo: pedidoCompleto
          };

        } catch (error: any) {
          return {
            pedidoId,
            success: false,
            error: error.message,
            porcentaje: 0,
            totalPedido: 0,
            totalStock: 0,
            completo: false
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      resultados
    });

  } catch (error: any) {
    console.error('❌ Error verificando stock batch:', error);
    return NextResponse.json({
      error: 'Error al verificar stock de pedidos',
      details: error.message
    }, { status: 500 });
  }
}
