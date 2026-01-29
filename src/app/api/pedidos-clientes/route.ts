import { NextRequest, NextResponse } from 'next/server';
import { 
  SIRIUS_PEDIDOS_CORE_CONFIG, 
  SIRIUS_PRODUCT_CORE_CONFIG,
  buildSiriusPedidosCoreUrl,
  buildSiriusProductCoreUrl,
  getSiriusPedidosCoreHeaders,
  getSiriusProductCoreHeaders,
  EstadoPedido,
  OrigenPedido
} from '@/lib/constants/airtable';

// ============================================================================
// Interfaces para el sistema de pedidos
// ============================================================================

interface DetallePedidoAirtable {
  id: string;
  fields: {
    'ID'?: string; // Fórmula: "DET-PED-1"
    'Detalle del Pedido'?: number;
    'Pedido'?: string[];
    'ID Producto Core'?: string; // Código del producto: "SIRIUS-PRODUCT-0004"
    'Cantidad'?: number;
    'Precio unitario en el momento del pedido'?: number;
    'Notas del detalle'?: string;
  };
}

interface PedidoAirtable {
  id: string;
  createdTime: string;
  fields: {
    'ID Pedido Core'?: string;
    'ID'?: number;
    'ID Cliente Core'?: string;
    'Fecha de Pedido'?: string;
    'Origen del Pedido'?: OrigenPedido;
    'Estado'?: EstadoPedido;
    'Notas'?: string;
    'Adjuntos del Pedido'?: any[];
    'Detalles del Pedido'?: string[];
  };
}

interface ProductoPedidoAirtable {
  id: string;
  fields: {
    'ID Producto Pedido'?: string;
    'ID'?: number;
    'Nombre del Producto'?: string;
    'ID Producto Core'?: string;
    'Precio Unitario'?: number;
    'En Stock'?: number;
    'Descripción'?: string;
    'Imagen del Producto'?: any[];
  };
}

// Interface para respuesta formateada
interface PedidoFormateado {
  id: string;
  idPedidoCore: string;
  idNumerico: number;
  clienteId: string;
  fechaPedido: string;
  origen: OrigenPedido;
  estado: EstadoPedido;
  notas: string;
  adjuntos: any[];
  detallesIds: string[];
  createdTime: string;
}

interface DetallePedidoFormateado {
  id: string;
  detalleNumero: number;
  pedidoId: string;
  idProductoCore: string; // Código del producto: "SIRIUS-PRODUCT-0004"
  cantidad: number;
  precioUnitario: number;
  notas: string;
}

// ============================================================================
// GET - Obtener todos los pedidos
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    console.log('📋 [PEDIDOS-CLIENTES-API] Obteniendo pedidos de Sirius Pedidos Core...');

    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('clienteId');
    const estado = searchParams.get('estado');
    const incluirDetalles = searchParams.get('incluirDetalles') === 'true';

    // Construir URL con filtros opcionales
    let url = buildSiriusPedidosCoreUrl(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PEDIDOS);
    const params = new URLSearchParams();

    // Filtro por cliente
    if (clienteId) {
      params.append('filterByFormula', `{ID Cliente Core} = '${clienteId}'`);
    }

    // Filtro por estado
    if (estado) {
      const estadoFormula = `{Estado} = '${estado}'`;
      if (clienteId) {
        params.append('filterByFormula', `AND({ID Cliente Core} = '${clienteId}', ${estadoFormula})`);
      } else {
        params.append('filterByFormula', estadoFormula);
      }
    }

    // Ordenar por fecha descendente (más recientes primero)
    params.append('sort[0][field]', 'Fecha de Pedido');
    params.append('sort[0][direction]', 'desc');

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    console.log('🔗 URL Pedidos:', url);

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
    const pedidos: PedidoAirtable[] = data.records || [];

    // Formatear pedidos
    const pedidosFormateados: PedidoFormateado[] = pedidos.map(pedido => ({
      id: pedido.id,
      idPedidoCore: pedido.fields['ID Pedido Core'] || '',
      idNumerico: pedido.fields['ID'] || 0,
      clienteId: pedido.fields['ID Cliente Core'] || '',
      fechaPedido: pedido.fields['Fecha de Pedido'] || '',
      origen: pedido.fields['Origen del Pedido'] || 'DataLab (Laboratorio)',
      estado: pedido.fields['Estado'] || 'Recibido',
      notas: pedido.fields['Notas'] || '',
      adjuntos: pedido.fields['Adjuntos del Pedido'] || [],
      detallesIds: pedido.fields['Detalles del Pedido'] || [],
      createdTime: pedido.createdTime,
    }));

    // Si se solicitan detalles, obtenerlos
    const detallesMap: Record<string, DetallePedidoFormateado[]> = {};
    const productosMap: Record<string, { id: string; codigoProducto: string; nombre: string }> = {};

    if (incluirDetalles && pedidosFormateados.length > 0) {
      // Obtener todos los IDs de detalles únicos
      const todosDetallesIds = [...new Set(
        pedidosFormateados.flatMap(p => p.detallesIds)
      )];

      if (todosDetallesIds.length > 0) {
        // Obtener detalles
        const detallesUrl = buildSiriusPedidosCoreUrl(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.DETALLES_PEDIDO);
        const detallesResponse = await fetch(detallesUrl, {
          method: 'GET',
          headers: getSiriusPedidosCoreHeaders(),
        });

        if (detallesResponse.ok) {
          const detallesData = await detallesResponse.json();
          const detalles: DetallePedidoAirtable[] = detallesData.records || [];

          // Agrupar detalles por pedido y obtener IDs de productos
          const todosIdsProductosCore: string[] = [];
          
          detalles.forEach(detalle => {
            const idProductoCore = detalle.fields['ID Producto Core'] || '';
            if (idProductoCore && !todosIdsProductosCore.includes(idProductoCore)) {
              todosIdsProductosCore.push(idProductoCore);
            }
            
            const pedidoIds = detalle.fields['Pedido'] || [];
            pedidoIds.forEach(pedidoId => {
              if (!detallesMap[pedidoId]) {
                detallesMap[pedidoId] = [];
              }
              detallesMap[pedidoId].push({
                id: detalle.id,
                detalleNumero: detalle.fields['Detalle del Pedido'] || 0,
                pedidoId: pedidoId,
                idProductoCore: idProductoCore, // Usar el código del producto directamente
                cantidad: detalle.fields['Cantidad'] || 0,
                precioUnitario: detalle.fields['Precio unitario en el momento del pedido'] || 0,
                notas: detalle.fields['Notas del detalle'] || '',
              });
            });
          });
          
          // Buscar nombres de productos en Sirius Product Core
          if (todosIdsProductosCore.length > 0) {
            const filterFormula = `OR(${todosIdsProductosCore.map(id => `{Codigo Producto}='${id}'`).join(',')})`;
            const productCoreUrl = `${buildSiriusProductCoreUrl(SIRIUS_PRODUCT_CORE_CONFIG.TABLES.PRODUCTOS)}?filterByFormula=${encodeURIComponent(filterFormula)}`;
            
            console.log('🔍 Buscando nombres de productos en Sirius Product Core para IDs:', todosIdsProductosCore);
            
            const productCoreResponse = await fetch(productCoreUrl, {
              method: 'GET',
              headers: getSiriusProductCoreHeaders(),
            });
            
            if (productCoreResponse.ok) {
              const productCoreData = await productCoreResponse.json();
              const productosCore = productCoreData.records || [];
              
              productosCore.forEach((pc: any) => {
                const codigoProducto = pc.fields['Codigo Producto'];
                const nombreComercial = pc.fields['Nombre Comercial'] || pc.fields['Nombre'];
                if (codigoProducto && nombreComercial) {
                  productosMap[codigoProducto] = {
                    id: pc.id,
                    codigoProducto: codigoProducto,
                    nombre: nombreComercial
                  };
                }
              });
              
              console.log('✅ Nombres de productos obtenidos:', Object.keys(productosMap));
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      pedidos: pedidosFormateados,
      detalles: incluirDetalles ? detallesMap : undefined,
      productos: incluirDetalles ? productosMap : undefined,
      total: pedidosFormateados.length,
      mensaje: 'Pedidos obtenidos exitosamente desde Airtable'
    });

  } catch (error) {
    console.error('❌ Error obteniendo pedidos de clientes:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor',
        pedidos: [],
        total: 0
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Función auxiliar para obtener el ID legible del producto desde Sirius Product Core
// ============================================================================
async function obtenerIdLegibleProducto(recordId: string): Promise<{ idLegible: string; nombre: string } | null> {
  try {
    // Consultar el producto específico en Sirius Product Core usando su record ID
    const productUrl = buildSiriusProductCoreUrl(SIRIUS_PRODUCT_CORE_CONFIG.TABLES.PRODUCTOS, recordId);
    
    console.log('🔍 Obteniendo producto de Sirius Product Core:', recordId);
    
    const response = await fetch(productUrl, {
      method: 'GET',
      headers: getSiriusProductCoreHeaders(),
    });

    if (response.ok) {
      const producto = await response.json();
      console.log('📦 Campos del producto:', Object.keys(producto.fields || {}));
      
      // El código del producto tiene formato "SIRIUS-PRODUCT-0001"
      const idLegible = producto.fields['Codigo Producto'] || producto.fields['ID'] || recordId;
      // El nombre está en 'Nombre Comercial'
      const nombre = producto.fields['Nombre Comercial'] || producto.fields['Nombre'] || 'Producto sin nombre';
      
      console.log('✅ Codigo Producto obtenido:', idLegible, '-', nombre);
      return { idLegible: String(idLegible), nombre };
    } else {
      console.error('❌ Error obteniendo producto:', await response.text());
      return null;
    }
  } catch (error) {
    console.error('❌ Error en obtenerIdLegibleProducto:', error);
    return null;
  }
}

// ============================================================================
// POST - Crear un nuevo pedido con sus detalles
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 [PEDIDOS-CLIENTES-API] Creando nuevo pedido:', JSON.stringify(body, null, 2));

    // Validaciones básicas
    if (!body.clienteId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere clienteId' },
        { status: 400 }
      );
    }

    if (!body.productos || !Array.isArray(body.productos) || body.productos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Se requiere al menos un producto' },
        { status: 400 }
      );
    }

    // ========================================================================
    // PASO 1: Crear el registro del Pedido
    // ========================================================================
    const pedidoUrl = buildSiriusPedidosCoreUrl(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PEDIDOS);
    
    // El campo "Fecha de Pedido" en Airtable representa la fecha de ENTREGA deseada
    // La fecha de creación del pedido se guarda automáticamente en createdTime
    let fechaPedido = body.fechaEntrega || body.fechaPedido;
    if (!fechaPedido) {
      // Si no viene fecha de entrega, usar la fecha actual como fallback
      fechaPedido = new Date().toISOString();
    } else if (!fechaPedido.includes('T')) {
      // Si viene solo la fecha (YYYY-MM-DD), convertir a formato ISO 8601 completo
      fechaPedido = new Date(fechaPedido + 'T00:00:00.000Z').toISOString();
    } else if (!fechaPedido.includes('Z') && !fechaPedido.includes('+')) {
      // Si viene en formato datetime-local (2026-02-25T10:57), agregar zona horaria
      fechaPedido = new Date(fechaPedido).toISOString();
    }
    
    console.log('📅 Fecha de Entrega/Pedido formateada:', fechaPedido);
    
    // Construir campos del pedido
    const pedidoFields: Record<string, any> = {
      'ID Cliente Core': body.clienteId,
      'Fecha de Pedido': fechaPedido,
      'Origen del Pedido': body.origen || 'DataLab (Laboratorio)',
      'Estado': body.estado || 'Recibido',
      'Notas': body.observaciones || body.notas || '',
    };

    // Agregar ID Usuario Responsable si está disponible
    if (body.idUsuarioResponsable) {
      pedidoFields['ID Usuario Responsable'] = body.idUsuarioResponsable;
      console.log('👤 Usuario responsable del pedido:', body.idUsuarioResponsable);
    }

    const pedidoData = {
      fields: pedidoFields
    };

    console.log('📤 Creando pedido en Airtable:', pedidoData);

    const pedidoResponse = await fetch(pedidoUrl, {
      method: 'POST',
      headers: getSiriusPedidosCoreHeaders(),
      body: JSON.stringify(pedidoData),
    });

    if (!pedidoResponse.ok) {
      const errorText = await pedidoResponse.text();
      console.error('❌ Error creando pedido:', errorText);
      throw new Error(`Error creando pedido: ${pedidoResponse.status} - ${errorText}`);
    }

    const pedidoCreado: PedidoAirtable = await pedidoResponse.json();
    console.log('✅ Pedido creado:', pedidoCreado.id, '- ID Core:', pedidoCreado.fields['ID Pedido Core']);

    // ========================================================================
    // PASO 2: Crear los detalles del pedido directamente
    // ========================================================================
    const detallesUrl = buildSiriusPedidosCoreUrl(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.DETALLES_PEDIDO);
    const detallesCreados: DetallePedidoAirtable[] = [];
    const erroresDetalles: string[] = [];

    for (const producto of body.productos) {
      try {
        // El productoId viene del catálogo principal (Sirius Product Core)
        // Obtener el Codigo Producto (SIRIUS-PRODUCT-XXXX) directamente
        let codigoProducto: string | null = null;
        
        if (producto.productoId) {
          const infoProducto = await obtenerIdLegibleProducto(producto.productoId);
          codigoProducto = infoProducto?.idLegible || null;
          console.log('✅ Codigo Producto obtenido:', codigoProducto, '-', infoProducto?.nombre);
        }

        if (!codigoProducto) {
          console.warn('⚠️ No se pudo obtener Codigo Producto para:', producto.nombreProducto);
          erroresDetalles.push(`Producto ${producto.nombreProducto}: No se pudo obtener código`);
          continue;
        }

        // ====================================================================
        // PASO 3: Crear el Detalle del Pedido
        // ====================================================================
        const cantidad = producto.cantidad || 1;
        const precioUnitario = producto.precioUnitario || 0;
        const subtotal = cantidad * precioUnitario;

        // Campos de la tabla Detalles del Pedido:
        // - 'Pedido': Link to Pedidos
        // - 'ID Producto Core': Código del producto (SIRIUS-PRODUCT-XXXX)
        // - 'Cantidad': Número
        // - 'Precio unitario en el momento del pedido': Currency
        const detalleData = {
          fields: {
            'Pedido': [pedidoCreado.id],
            'ID Producto Core': codigoProducto,
            'Cantidad': cantidad,
            'Precio unitario en el momento del pedido': precioUnitario
          }
        };

        console.log('📤 Creando detalle para producto:', producto.nombreProducto, '- Codigo:', codigoProducto);

        const detalleResponse = await fetch(detallesUrl, {
          method: 'POST',
          headers: getSiriusPedidosCoreHeaders(),
          body: JSON.stringify(detalleData),
        });

        if (detalleResponse.ok) {
          const detalleCreado = await detalleResponse.json();
          detallesCreados.push(detalleCreado);
          console.log('✅ Detalle creado:', detalleCreado.id, '- Subtotal:', subtotal);
        } else {
          const errorText = await detalleResponse.text();
          console.warn('⚠️ Error creando detalle:', errorText);
          erroresDetalles.push(`Producto ${producto.nombreProducto}: ${errorText}`);
        }
      } catch (productoError) {
        console.error('❌ Error procesando producto:', producto.nombreProducto, productoError);
        erroresDetalles.push(`Producto ${producto.nombreProducto}: Error interno`);
      }
    }

    // ========================================================================
    // PASO 4: Calcular total
    // ========================================================================
    const total = body.productos.reduce((sum: number, producto: any) => {
      return sum + ((producto.cantidad || 1) * (producto.precioUnitario || 0));
    }, 0);

    // Determinar si fue exitoso
    const todosDetallesCreados = detallesCreados.length === body.productos.length;
    
    return NextResponse.json({
      success: true,
      pedido: {
        id: pedidoCreado.id,
        idPedidoCore: pedidoCreado.fields['ID Pedido Core'],
        idNumerico: pedidoCreado.fields['ID'],
        clienteId: body.clienteId,
        fechaPedido: fechaPedido,
        estado: 'Recibido',
        detallesCreados: detallesCreados.length,
        totalProductosSolicitados: body.productos.length,
        total: total,
      },
      detalles: detallesCreados.map(d => ({
        id: d.id,
        detalleNumero: d.fields['Detalle del Pedido'],
        idProductoCore: d.fields['ID Producto Core'],
        cantidad: d.fields['Cantidad'],
      })),
      errores: erroresDetalles.length > 0 ? erroresDetalles : undefined,
      mensaje: todosDetallesCreados 
        ? 'Pedido creado exitosamente con todos los productos'
        : `Pedido creado con ${detallesCreados.length}/${body.productos.length} productos`
    });

  } catch (error) {
    console.error('❌ Error creando pedido:', error);
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
// PUT - Actualizar un pedido existente
// ============================================================================
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔄 [PEDIDOS-CLIENTES-API] Actualizando pedido:', body);

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'ID del pedido es requerido' },
        { status: 400 }
      );
    }

    // Construir datos de actualización
    const updateFields: any = {};
    
    if (body.estado) updateFields['Estado'] = body.estado;
    if (body.notas !== undefined) updateFields['Notas'] = body.notas;
    if (body.fechaPedido) updateFields['Fecha de Pedido'] = body.fechaPedido;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay campos para actualizar' },
        { status: 400 }
      );
    }

    const url = buildSiriusPedidosCoreUrl(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PEDIDOS, body.id);
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: getSiriusPedidosCoreHeaders(),
      body: JSON.stringify({ fields: updateFields }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error actualizando pedido:', errorText);
      throw new Error(`Error actualizando pedido: ${response.status} - ${errorText}`);
    }

    const pedidoActualizado = await response.json();
    console.log('✅ Pedido actualizado:', pedidoActualizado.id);

    return NextResponse.json({
      success: true,
      pedido: {
        id: pedidoActualizado.id,
        idPedidoCore: pedidoActualizado.fields['ID Pedido Core'],
        estado: pedidoActualizado.fields['Estado'],
      },
      mensaje: 'Pedido actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error actualizando pedido:', error);
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
// DELETE - Eliminar un pedido (y opcionalmente sus detalles)
// ============================================================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pedidoId = searchParams.get('id');
    const eliminarDetalles = searchParams.get('eliminarDetalles') === 'true';

    if (!pedidoId) {
      return NextResponse.json(
        { success: false, error: 'ID del pedido es requerido' },
        { status: 400 }
      );
    }

    console.log('🗑️ [PEDIDOS-CLIENTES-API] Eliminando pedido:', pedidoId);

    // Si se deben eliminar detalles, primero obtenerlos
    if (eliminarDetalles) {
      // Obtener el pedido para ver sus detalles
      const pedidoUrl = buildSiriusPedidosCoreUrl(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PEDIDOS, pedidoId);
      const pedidoResponse = await fetch(pedidoUrl, {
        method: 'GET',
        headers: getSiriusPedidosCoreHeaders(),
      });

      if (pedidoResponse.ok) {
        const pedido: PedidoAirtable = await pedidoResponse.json();
        const detallesIds = pedido.fields['Detalles del Pedido'] || [];

        // Eliminar cada detalle
        for (const detalleId of detallesIds) {
          const detalleUrl = buildSiriusPedidosCoreUrl(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.DETALLES_PEDIDO, detalleId);
          await fetch(detalleUrl, {
            method: 'DELETE',
            headers: getSiriusPedidosCoreHeaders(),
          });
          console.log('🗑️ Detalle eliminado:', detalleId);
        }
      }
    }

    // Eliminar el pedido
    const url = buildSiriusPedidosCoreUrl(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PEDIDOS, pedidoId);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getSiriusPedidosCoreHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error eliminando pedido:', errorText);
      throw new Error(`Error eliminando pedido: ${response.status} - ${errorText}`);
    }

    console.log('✅ Pedido eliminado:', pedidoId);

    return NextResponse.json({
      success: true,
      mensaje: 'Pedido eliminado exitosamente',
      pedidoId: pedidoId
    });

  } catch (error) {
    console.error('❌ Error eliminando pedido:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}
