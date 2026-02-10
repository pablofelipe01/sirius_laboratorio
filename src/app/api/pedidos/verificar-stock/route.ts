import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { SIRIUS_PEDIDOS_CORE_CONFIG, SIRIUS_INVENTARIO_CONFIG, SIRIUS_PRODUCT_CORE_CONFIG } from '@/lib/constants/airtable';

// Configurar Airtable para Pedidos Core
const basePedidos = new Airtable({
  apiKey: SIRIUS_PEDIDOS_CORE_CONFIG.API_KEY
}).base(SIRIUS_PEDIDOS_CORE_CONFIG.BASE_ID);

// Configurar Airtable para Inventario
const baseInventario = new Airtable({
  apiKey: SIRIUS_INVENTARIO_CONFIG.API_KEY
}).base(SIRIUS_INVENTARIO_CONFIG.BASE_ID);

// Configurar Airtable para Product Core
const baseProductCore = new Airtable({
  apiKey: SIRIUS_PRODUCT_CORE_CONFIG.API_KEY
}).base(SIRIUS_PRODUCT_CORE_CONFIG.BASE_ID);

// Función helper para obtener nombres de productos
// Extraer unidad de medida del nombre del producto, ej: "Trichoderma harzianum (Kg)" → "Kg"
function extraerUnidadDeNombre(nombreProducto: string): string {
  const match = nombreProducto.match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : 'L';
}

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

    console.log('📦 Nombres de productos obtenidos:', nombresMap.size);
  } catch (error) {
    console.error('❌ Error obteniendo nombres de productos:', error);
  }

  return nombresMap;
}

/**
 * GET /api/pedidos/verificar-stock?pedidoId=xxx
 * Verifica si hay stock suficiente para completar un pedido
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pedidoId = searchParams.get('pedidoId');

    console.log('🔍 Verificando stock para pedido:', pedidoId);

    if (!pedidoId) {
      return NextResponse.json({
        error: 'Se requiere el ID del pedido'
      }, { status: 400 });
    }

    // 1. Buscar el pedido por ID Pedido Core o por Record ID
    let pedidoRecord;
    
    if (pedidoId.startsWith('rec')) {
      // Si es un Record ID, buscar directamente
      pedidoRecord = await basePedidos(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PEDIDOS)
        .find(pedidoId);
    } else {
      // Si es un ID legible (SIRIUS-PED-XXXX), buscar por el campo "ID Pedido Core"
      const records = await basePedidos(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PEDIDOS)
        .select({
          filterByFormula: `{ID Pedido Core} = "${pedidoId}"`,
          maxRecords: 1
        })
        .firstPage();
      
      if (records.length === 0) {
        return NextResponse.json({
          success: false,
          error: `Pedido no encontrado con ID: ${pedidoId}`
        }, { status: 404 });
      }
      
      pedidoRecord = records[0];
    }

    if (!pedidoRecord) {
      return NextResponse.json({
        success: false,
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
        
        return {
          detalleId,
          nombreProducto: idProductoCore,
          idProductoCore,
          cantidadPedida,
          unidad: '' // Se asignará después de obtener nombres de productos
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

    // Obtener nombres de productos
    const productIds = detallesPedido.map(d => d.idProductoCore).filter(id => id);
    const nombresProductos = await obtenerNombresProductos(productIds);

    // Asignar unidad de medida basada en el nombre del producto
    detallesPedido.forEach(detalle => {
      if (!detalle.unidad) {
        const nombre = nombresProductos.get(detalle.idProductoCore) || '';
        detalle.unidad = extraerUnidadDeNombre(nombre);
      }
    });

    // Obtener el ID legible del pedido y Record ID
    const idPedidoCore = pedidoRecord.get('ID Pedido Core') as string || '';
    const recordIdPedido = pedidoRecord.id;

    console.log('🔍 Buscando stock con IDs:', { recordIdPedido, idPedidoCore });

    // 3. Para cada producto, verificar stock disponible del pedido Y cantidades ya despachadas
    //    Además consultar stock general (STOCK-GENERAL) disponible para despacho
    const verificacionStock = await Promise.all(
      detallesPedido.map(async (detalle) => {
        // Obtener movimientos de ENTRADA (producción asignada al pedido)
        const movimientosEntrada = await baseInventario(SIRIUS_INVENTARIO_CONFIG.TABLES.MOVIMIENTOS_INVENTARIO)
          .select({
            filterByFormula: `AND(
              {tipo_movimiento} = "Entrada",
              {product_id} = "${detalle.idProductoCore}",
              OR(
                {ubicacion_destino_id} = "${recordIdPedido}",
                {ubicacion_destino_id} = "${idPedidoCore}"
              )
            )`
          })
          .firstPage();

        // Obtener movimientos de SALIDA (despachos/remisiones del pedido)
        const movimientosSalida = await baseInventario(SIRIUS_INVENTARIO_CONFIG.TABLES.MOVIMIENTOS_INVENTARIO)
          .select({
            filterByFormula: `AND(
              {tipo_movimiento} = "Salida",
              {product_id} = "${detalle.idProductoCore}",
              OR(
                {ubicacion_destino_id} = "${recordIdPedido}",
                {ubicacion_destino_id} = "${idPedidoCore}"
              )
            )`
          })
          .firstPage();

        // --- Stock General: entradas y salidas en STOCK-GENERAL o sin ubicación asignada ---
        const movimientosEntradaGeneral = await baseInventario(SIRIUS_INVENTARIO_CONFIG.TABLES.MOVIMIENTOS_INVENTARIO)
          .select({
            filterByFormula: `AND(
              {tipo_movimiento} = "Entrada",
              {product_id} = "${detalle.idProductoCore}",
              OR(
                {ubicacion_destino_id} = "STOCK-GENERAL",
                {ubicacion_destino_id} = BLANK(),
                {ubicacion_destino_id} = ""
              )
            )`
          })
          .firstPage();

        const movimientosSalidaGeneral = await baseInventario(SIRIUS_INVENTARIO_CONFIG.TABLES.MOVIMIENTOS_INVENTARIO)
          .select({
            filterByFormula: `AND(
              {tipo_movimiento} = "Salida",
              {product_id} = "${detalle.idProductoCore}",
              OR(
                {ubicacion_destino_id} = "STOCK-GENERAL",
                {ubicacion_destino_id} = BLANK(),
                {ubicacion_destino_id} = ""
              )
            )`
          })
          .firstPage();

        console.log(`📊 Producto ${detalle.idProductoCore}: ${movimientosEntrada.length} entradas pedido, ${movimientosSalida.length} salidas pedido, ${movimientosEntradaGeneral.length} entradas general, ${movimientosSalidaGeneral.length} salidas general`);

        // Calcular totales del pedido
        const totalEntradas = movimientosEntrada.reduce((total, mov) => {
          return total + (mov.get('cantidad') as number || 0);
        }, 0);

        const totalSalidas = movimientosSalida.reduce((total, mov) => {
          return total + (mov.get('cantidad') as number || 0);
        }, 0);

        // Calcular totales de stock general
        const totalEntradasGeneral = movimientosEntradaGeneral.reduce((total, mov) => {
          return total + (mov.get('cantidad') as number || 0);
        }, 0);

        const totalSalidasGeneral = movimientosSalidaGeneral.reduce((total, mov) => {
          return total + (mov.get('cantidad') as number || 0);
        }, 0);

        // Stock disponible del pedido = entradas pedido - salidas pedido
        const stockDisponible = totalEntradas - totalSalidas;
        // Stock disponible general = entradas general - salidas general
        const stockGeneral = Math.max(0, totalEntradasGeneral - totalSalidasGeneral);
        // Stock total = pedido + general
        const stockTotal = Math.max(0, stockDisponible) + stockGeneral;

        const stockSuficiente = stockTotal >= detalle.cantidadPedida;
        const faltante = stockSuficiente ? 0 : detalle.cantidadPedida - stockTotal;
        
        // Calcular pendiente por despachar
        const cantidadDespachada = totalSalidas;
        const pendientePorDespachar = detalle.cantidadPedida - cantidadDespachada;

        return {
          productoNombre: nombresProductos.get(detalle.idProductoCore) || detalle.idProductoCore,
          productoId: detalle.idProductoCore,
          cantidadPedida: detalle.cantidadPedida,
          cantidadDespachada,
          pendientePorDespachar: Math.max(0, pendientePorDespachar),
          stockDisponible: Math.max(0, stockDisponible), // Stock asignado al pedido
          stockGeneral, // Stock en STOCK-GENERAL
          stockTotal, // Suma de ambos
          totalProducido: totalEntradas,
          completo: stockSuficiente,
          despachado: cantidadDespachada >= detalle.cantidadPedida,
          faltante,
          unidad: detalle.unidad
        };
      })
    );

    // 4. Calcular totales para el resumen
    const totalPedido = verificacionStock.reduce((sum, v) => sum + v.cantidadPedida, 0);
    const totalDisponible = verificacionStock.reduce((sum, v) => sum + v.stockTotal, 0);
    const totalFaltante = verificacionStock.reduce((sum, v) => sum + v.faltante, 0);
    const totalDespachado = verificacionStock.reduce((sum, v) => sum + v.cantidadDespachada, 0);
    const totalPendiente = verificacionStock.reduce((sum, v) => sum + v.pendientePorDespachar, 0);
    const totalStockGeneral = verificacionStock.reduce((sum, v) => sum + v.stockGeneral, 0);

    // 5. Determinar si el pedido está completo
    const pedidoCompleto = verificacionStock.every(v => v.completo);
    const pedidoDespachado = verificacionStock.every(v => v.despachado);
    const productosFaltantes = verificacionStock.filter(v => !v.completo);

    return NextResponse.json({
      success: true,
      pedidoCompleto,
      pedidoDespachado,
      productos: verificacionStock,
      resumen: {
        totalPedido,
        totalDisponible,
        totalFaltante,
        totalDespachado,
        totalPendiente,
        totalStockGeneral,
        totalProductos: verificacionStock.length,
        productosCompletos: verificacionStock.filter(v => v.completo).length,
        productosDespachados: verificacionStock.filter(v => v.despachado).length,
        productosFaltantes: productosFaltantes.length
      }
    });

  } catch (error: any) {
    console.error('❌ Error verificando stock:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al verificar stock del pedido',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/pedidos/verificar-stock
 * Verifica si hay stock suficiente para completar un pedido (alternativa POST)
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

    // 1. Buscar el pedido por ID Pedido Core o por Record ID
    let pedidoRecord;
    
    if (pedidoId.startsWith('rec')) {
      // Si es un Record ID, buscar directamente
      pedidoRecord = await basePedidos(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PEDIDOS)
        .find(pedidoId);
    } else {
      // Si es un ID legible (SIRIUS-PED-XXXX), buscar por el campo "ID Pedido Core"
      const records = await basePedidos(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PEDIDOS)
        .select({
          filterByFormula: `{ID Pedido Core} = "${pedidoId}"`,
          maxRecords: 1
        })
        .firstPage();
      
      if (records.length === 0) {
        return NextResponse.json({
          success: false,
          error: `Pedido no encontrado con ID: ${pedidoId}`
        }, { status: 404 });
      }
      
      pedidoRecord = records[0];
    }

    if (!pedidoRecord) {
      return NextResponse.json({
        success: false,
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
        
        return {
          detalleId,
          nombreProducto: idProductoCore,
          idProductoCore,
          cantidadPedida,
          unidad: '' // Se asignará después de obtener nombres de productos
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

    // Obtener nombres de productos
    const productIds = detallesPedido.map(d => d.idProductoCore).filter(id => id);
    const nombresProductos = await obtenerNombresProductos(productIds);

    // Asignar unidad de medida basada en el nombre del producto
    detallesPedido.forEach(detalle => {
      if (!detalle.unidad) {
        const nombre = nombresProductos.get(detalle.idProductoCore) || '';
        detalle.unidad = extraerUnidadDeNombre(nombre);
      }
    });

    // Obtener el ID legible del pedido y Record ID
    const idPedidoCore = pedidoRecord.get('ID Pedido Core') as string || '';
    const recordIdPedido = pedidoRecord.id;

    console.log('🔍 Buscando stock con IDs (POST):', { recordIdPedido, idPedidoCore });

    // 3. Para cada producto, verificar stock disponible del pedido Y cantidades ya despachadas
    //    Además consultar stock general (STOCK-GENERAL) disponible para despacho
    const verificacionStock = await Promise.all(
      detallesPedido.map(async (detalle) => {
        // Obtener movimientos de ENTRADA (producción asignada al pedido)
        const movimientosEntrada = await baseInventario(SIRIUS_INVENTARIO_CONFIG.TABLES.MOVIMIENTOS_INVENTARIO)
          .select({
            filterByFormula: `AND(
              {tipo_movimiento} = "Entrada",
              {product_id} = "${detalle.idProductoCore}",
              OR(
                {ubicacion_destino_id} = "${recordIdPedido}",
                {ubicacion_destino_id} = "${idPedidoCore}"
              )
            )`
          })
          .firstPage();

        // Obtener movimientos de SALIDA (despachos/remisiones del pedido)
        const movimientosSalida = await baseInventario(SIRIUS_INVENTARIO_CONFIG.TABLES.MOVIMIENTOS_INVENTARIO)
          .select({
            filterByFormula: `AND(
              {tipo_movimiento} = "Salida",
              {product_id} = "${detalle.idProductoCore}",
              OR(
                {ubicacion_destino_id} = "${recordIdPedido}",
                {ubicacion_destino_id} = "${idPedidoCore}"
              )
            )`
          })
          .firstPage();

        // --- Stock General: entradas y salidas en STOCK-GENERAL o sin ubicación asignada ---
        const movimientosEntradaGeneral = await baseInventario(SIRIUS_INVENTARIO_CONFIG.TABLES.MOVIMIENTOS_INVENTARIO)
          .select({
            filterByFormula: `AND(
              {tipo_movimiento} = "Entrada",
              {product_id} = "${detalle.idProductoCore}",
              OR(
                {ubicacion_destino_id} = "STOCK-GENERAL",
                {ubicacion_destino_id} = BLANK(),
                {ubicacion_destino_id} = ""
              )
            )`
          })
          .firstPage();

        const movimientosSalidaGeneral = await baseInventario(SIRIUS_INVENTARIO_CONFIG.TABLES.MOVIMIENTOS_INVENTARIO)
          .select({
            filterByFormula: `AND(
              {tipo_movimiento} = "Salida",
              {product_id} = "${detalle.idProductoCore}",
              OR(
                {ubicacion_destino_id} = "STOCK-GENERAL",
                {ubicacion_destino_id} = BLANK(),
                {ubicacion_destino_id} = ""
              )
            )`
          })
          .firstPage();

        console.log(`📊 Producto ${detalle.idProductoCore}: ${movimientosEntrada.length} entradas pedido, ${movimientosSalida.length} salidas pedido, ${movimientosEntradaGeneral.length} entradas general, ${movimientosSalidaGeneral.length} salidas general (POST)`);

        // Calcular totales del pedido
        const totalEntradas = movimientosEntrada.reduce((total, mov) => {
          return total + (mov.get('cantidad') as number || 0);
        }, 0);

        const totalSalidas = movimientosSalida.reduce((total, mov) => {
          return total + (mov.get('cantidad') as number || 0);
        }, 0);

        // Calcular totales de stock general
        const totalEntradasGeneral = movimientosEntradaGeneral.reduce((total, mov) => {
          return total + (mov.get('cantidad') as number || 0);
        }, 0);

        const totalSalidasGeneral = movimientosSalidaGeneral.reduce((total, mov) => {
          return total + (mov.get('cantidad') as number || 0);
        }, 0);

        // Stock disponible del pedido = entradas pedido - salidas pedido
        const stockDisponible = totalEntradas - totalSalidas;
        // Stock disponible general = entradas general - salidas general
        const stockGeneral = Math.max(0, totalEntradasGeneral - totalSalidasGeneral);
        // Stock total = pedido + general
        const stockTotal = Math.max(0, stockDisponible) + stockGeneral;

        const stockSuficiente = stockTotal >= detalle.cantidadPedida;
        const faltante = stockSuficiente ? 0 : detalle.cantidadPedida - stockTotal;
        
        // Calcular pendiente por despachar
        const cantidadDespachada = totalSalidas;
        const pendientePorDespachar = detalle.cantidadPedida - cantidadDespachada;

        return {
          productoNombre: nombresProductos.get(detalle.idProductoCore) || detalle.idProductoCore,
          productoId: detalle.idProductoCore,
          cantidadPedida: detalle.cantidadPedida,
          cantidadDespachada,
          pendientePorDespachar: Math.max(0, pendientePorDespachar),
          stockDisponible: Math.max(0, stockDisponible), // Stock asignado al pedido
          stockGeneral, // Stock en STOCK-GENERAL
          stockTotal, // Suma de ambos
          totalProducido: totalEntradas,
          completo: stockSuficiente,
          despachado: cantidadDespachada >= detalle.cantidadPedida,
          faltante,
          unidad: detalle.unidad
        };
      })
    );

    // 4. Calcular totales para el resumen
    const totalPedido = verificacionStock.reduce((sum, v) => sum + v.cantidadPedida, 0);
    const totalDisponible = verificacionStock.reduce((sum, v) => sum + v.stockTotal, 0);
    const totalFaltante = verificacionStock.reduce((sum, v) => sum + v.faltante, 0);
    const totalDespachado = verificacionStock.reduce((sum, v) => sum + v.cantidadDespachada, 0);
    const totalPendiente = verificacionStock.reduce((sum, v) => sum + v.pendientePorDespachar, 0);
    const totalStockGeneral = verificacionStock.reduce((sum, v) => sum + v.stockGeneral, 0);

    // 5. Determinar si el pedido está completo
    const pedidoCompleto = verificacionStock.every(v => v.completo);
    const pedidoDespachado = verificacionStock.every(v => v.despachado);
    const productosFaltantes = verificacionStock.filter(v => !v.completo);

    return NextResponse.json({
      success: true,
      pedidoCompleto,
      pedidoDespachado,
      productos: verificacionStock,
      resumen: {
        totalPedido,
        totalDisponible,
        totalFaltante,
        totalDespachado,
        totalPendiente,
        totalStockGeneral,
        totalProductos: verificacionStock.length,
        productosCompletos: verificacionStock.filter(v => v.completo).length,
        productosDespachados: verificacionStock.filter(v => v.despachado).length,
        productosFaltantes: productosFaltantes.length
      }
    });

  } catch (error: any) {
    console.error('❌ Error verificando stock:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al verificar stock del pedido',
      details: error.message
    }, { status: 500 });
  }
}
