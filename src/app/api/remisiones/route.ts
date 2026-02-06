import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { 
  SIRIUS_REMISIONES_CORE_CONFIG, 
  SIRIUS_PEDIDOS_CORE_CONFIG,
  SIRIUS_PRODUCT_CORE_CONFIG,
  SIRIUS_INVENTARIO_CONFIG,
  SIRIUS_CLIENT_CORE_CONFIG
} from '@/lib/constants/airtable';
import { uploadToS3 } from '@/lib/s3';
import { generarRemisionPDF, DatosRemisionPDF } from '@/lib/remision-pdf-generator';
import { buscarOCrearPersona, vincularPersonaARemision } from '@/lib/personas-remision';

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

// Configurar Airtable para Client Core (para obtener nombres de clientes)
const baseClientCore = new Airtable({
  apiKey: SIRIUS_CLIENT_CORE_CONFIG.API_KEY
}).base(SIRIUS_CLIENT_CORE_CONFIG.BASE_ID);

/**
 * Obtiene el nombre del cliente desde Sirius Client Core
 */
async function obtenerNombreCliente(idCliente: string): Promise<string> {
  try {
    const records = await baseClientCore(SIRIUS_CLIENT_CORE_CONFIG.TABLES.CLIENTES)
      .select({
        filterByFormula: `{ID} = "${idCliente}"`,
        maxRecords: 1
      })
      .firstPage();
    
    if (records.length > 0) {
      return records[0].get('Cliente') as string || idCliente;
    }
    return idCliente;
  } catch (error) {
    console.error('⚠️ Error obteniendo nombre de cliente:', error);
    return idCliente;
  }
}

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
      fechaPedidoDespachado: record.get('Fecha Pedido Despachado') as string || '',
      fechaRecibido: record.get('Fecha Recibido') as string || '',
      notas: record.get('Notas de Remisión') as string || '',
      productosRemitidos: record.get('Productos Remitidos') as string[] || [],
      totalCantidad: record.get('Total Cantidad Remitida') as number || 0,
      personas: record.get('Personas') as string[] || [],
      urlDocumento: record.get('URL Remision Generada') as string || '',
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
      esDespachoCompleto = true,
      transportista = null
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
      : `Despacho parcial del pedido ${idPedidoCore}. Despacho parcial - ${productos.length} producto(s) despachado(s)`;

    // Si hay transportista, marcar como "En Tránsito" y registrar fecha de despacho
    const fechaActual = new Date().toISOString().split('T')[0];
    
    const remisionRecord = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.REMISIONES)
      .create({
        'ID Cliente': idCliente,
        'ID Pedido': idPedidoCore,
        'Area Origen': areaOrigen,
        'Estado': transportista ? 'En Tránsito' : 'Pendiente',
        'Responsable Entrega': responsable || '',
        'Notas de Remisión': notasRemision,
        'Productos Remitidos': productosRemitidosRecords,
        'Fecha Pedido Despachado': transportista ? fechaActual : undefined,
      });

    console.log('✅ Remisión creada:', remisionRecord.id);

    // 5. Si hay transportista, crear/buscar persona y vincular
    if (transportista) {
      try {
        const personaTransportista = await buscarOCrearPersona({
          nombreCompleto: transportista.nombre,
          cedula: transportista.cedula,
          tipo: 'Transportista',
          telefono: transportista.telefono,
        });

        await vincularPersonaARemision(remisionRecord.id, personaTransportista.recordId);
        console.log('✅ Transportista vinculado:', personaTransportista.codigo);
      } catch (error) {
        console.error('❌ Error vinculando transportista:', error);
      }
    }

    // 6. Obtener el ID legible de la remisión creada
    const remisionCreada = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.REMISIONES)
      .find(remisionRecord.id);

    const idRemision = remisionCreada.get('ID') as string || remisionRecord.id;
    const numeracion = remisionCreada.get('numeracion') as number || 0;

    // 7. Obtener nombre del cliente para el documento
    const nombreCliente = await obtenerNombreCliente(idCliente);
    console.log('📋 Cliente para documento:', nombreCliente);

    // 8. Generar documento HTML y subir a S3
    console.log('📄 Generando documento de remisión...');
    
    const productosParaDocumento: Array<{nombre: string; cantidad: number; unidad: string}> = productos.map((p: any) => ({
      nombre: nombresProductos.get(p.productoId) || p.productoId,
      cantidad: p.cantidad,
      unidad: p.unidad || 'L'
    }));

    const datosRemision: DatosRemisionPDF = {
      idRemision,
      numeracion,
      fechaRemision: new Date().toISOString().split('T')[0],
      cliente: nombreCliente,
      idCliente,
      idPedido: idPedidoCore,
      productos: productosParaDocumento,
      responsableEntrega: responsable || '',
      transportista: transportista ? {
        nombre: transportista.nombre,
        cedula: transportista.cedula,
        fechaFirma: fechaActual
      } : undefined,
      areaOrigen,
      notas: notas || undefined,
    };

    // Generar PDF profesional
    console.log('📄 Generando PDF de remisión...');
    const pdfBytes = await generarRemisionPDF(datosRemision);
    console.log('✅ PDF generado:', pdfBytes.length, 'bytes');
    
    // Nombre del archivo = ID de la remisión (ej: SIRIUS-REM-0004.pdf)
    const nombreArchivo = `${idRemision}.pdf`;

    console.log('📤 Subiendo PDF a S3:', nombreArchivo);
    const resultadoS3 = await uploadToS3(
      Buffer.from(pdfBytes),
      nombreArchivo,
      'application/pdf'
    );

    let urlDocumento = '';
    if (resultadoS3.success && resultadoS3.url) {
      urlDocumento = resultadoS3.url;
      console.log('✅ Documento subido a S3:', urlDocumento);

      // Actualizar la remisión con la URL del documento
      try {
        await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.REMISIONES)
          .update(remisionRecord.id, {
            'URL Remision Generada': urlDocumento
          });
        console.log('✅ Remisión actualizada con URL del documento');
      } catch (updateError) {
        console.warn('⚠️ No se pudo actualizar la remisión con la URL:', updateError);
      }
    } else {
      console.warn('⚠️ Error subiendo documento a S3:', resultadoS3.error);
    }

    // 9. Registrar movimientos de inventario (salida de productos)
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

    // 10. Actualizar estado del pedido si hay transportista
    if (transportista) {
      try {
        console.log('📦 Actualizando estado del pedido a "Enviado"...');
        await basePedidos(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PEDIDOS)
          .update(pedidoRecord.id, {
            'Estado': 'Enviado'
          });
        console.log('✅ Estado del pedido actualizado a "Enviado"');
      } catch (pedidoError) {
        console.warn('⚠️ No se pudo actualizar el estado del pedido:', pedidoError);
        // No lanzar error para no bloquear el flujo principal
      }
    }

    return NextResponse.json({
      success: true,
      remision: {
        id: remisionRecord.id,
        idRemision,
        numeracion,
        idPedido: idPedidoCore,
        idCliente,
        nombreCliente,
        productosRemitidos: productosRemitidosRecords.length,
        estado: transportista ? 'En Tránsito' : 'Pendiente',
        esDespachoCompleto,
        urlDocumento,
        nombreArchivo
      },
      inventario: {
        movimientosCreados: resultadoInventario.movimientos.length,
        errores: resultadoInventario.errores
      },
      documento: {
        subido: resultadoS3.success,
        url: urlDocumento,
        nombreArchivo,
        error: resultadoS3.error
      },
      pedidoActualizado: transportista ? true : false,
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
      fechaPedidoDespachado,
      fechaRecibido,
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
    if (fechaPedidoDespachado) updateFields['Fecha Pedido Despachado'] = fechaPedidoDespachado;
    if (fechaRecibido) updateFields['Fecha Recibido'] = fechaRecibido;
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
