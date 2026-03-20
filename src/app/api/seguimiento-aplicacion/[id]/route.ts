import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import {
  SIRIUS_PEDIDOS_CORE_CONFIG,
  SIRIUS_REMISIONES_CORE_CONFIG,
  SIRIUS_CLIENT_CORE_CONFIG,
  SIRIUS_PRODUCT_CORE_CONFIG
} from '@/lib/constants/airtable';

// Configurar bases de Airtable
const baseDataLab = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY!
}).base(process.env.AIRTABLE_BASE_ID!);

const basePedidos = new Airtable({
  apiKey: SIRIUS_PEDIDOS_CORE_CONFIG.API_KEY
}).base(SIRIUS_PEDIDOS_CORE_CONFIG.BASE_ID);

const baseRemisiones = new Airtable({
  apiKey: SIRIUS_REMISIONES_CORE_CONFIG.API_KEY
}).base(SIRIUS_REMISIONES_CORE_CONFIG.BASE_ID);

const baseClientCore = new Airtable({
  apiKey: SIRIUS_CLIENT_CORE_CONFIG.API_KEY
}).base(SIRIUS_CLIENT_CORE_CONFIG.BASE_ID);

const baseProductCore = new Airtable({
  apiKey: SIRIUS_PRODUCT_CORE_CONFIG.API_KEY
}).base(SIRIUS_PRODUCT_CORE_CONFIG.BASE_ID);

// Configuración de tablas
const APLICACIONES_TABLE = process.env.AIRTABLE_TABLE_APLICACIONES!;
const PAQUETES_APLICACIONES_TABLE = process.env.AIRTABLE_TABLE_PAQUETES_APLICACIONES || 'Paquete Aplicaciones';

interface SeguimientoResponse {
  success: boolean;
  programado: {
    cliente: { id: string; nombre: string };
    lote: { id: string; nombre: string };
    producto: { id: string; nombre: string };
    fecha: string;
    hectareas: number;
    litros: number;
  };
  despachado: {
    totalHectareas: number;
    totalLitros: number;
    despachos: Array<{
      remisionId: string;
      numeroRemision: string;
      fechaDespacho: string;
      litros: number;
      productos: Array<{
        nombre: string;
        cantidad: number;
        unidad: string;
      }>;
    }>;
  };
  balance: {
    hectareasDiferencia: number;
    litrosDiferencia: number;
    porcentajeCumplimiento: number;
  };
}

/**
 * GET /api/seguimiento-aplicacion/[id]
 * Obtiene el seguimiento completo de una aplicación
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventoId } = await params;

    if (!eventoId) {
      return NextResponse.json({
        success: false,
        error: 'ID del evento es requerido'
      }, { status: 400 });
    }

    console.log('🔍 [SEGUIMIENTO] Obteniendo datos para evento:', eventoId);

    // PASO 1: Obtener datos del evento de aplicación
    const evento = await baseDataLab(APLICACIONES_TABLE).find(eventoId);

    const paqueteId = (evento.get('Paquetes Aplicaciones') as string[])?.[0] ||
                     evento.get('ID Paquete') as string || null;

    if (!paqueteId) {
      return NextResponse.json({
        success: false,
        error: 'El evento no tiene paquete asociado'
      }, { status: 400 });
    }

    console.log('📦 [SEGUIMIENTO] Paquete ID:', paqueteId);

    // PASO 2: Obtener información del paquete para extraer cliente
    const paquete = await baseDataLab(PAQUETES_APLICACIONES_TABLE).find(paqueteId);
    const clienteIdField = paquete.get('ID Cliente') || paquete.get('Cliente ID') || paquete.get('id_cliente');
    const clienteId = Array.isArray(clienteIdField) ? clienteIdField[0] : clienteIdField as string;

    if (!clienteId) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo obtener ID del cliente del paquete'
      }, { status: 400 });
    }

    console.log('👤 [SEGUIMIENTO] Cliente ID:', clienteId);

    // PASO 3: Obtener nombre del cliente desde Sirius Client Core
    let nombreCliente = clienteId;
    try {
      const clienteRecords = await baseClientCore(SIRIUS_CLIENT_CORE_CONFIG.TABLES.CLIENTES)
        .select({
          filterByFormula: `{ID} = "${clienteId}"`,
          maxRecords: 1
        })
        .firstPage();

      if (clienteRecords.length > 0) {
        nombreCliente = clienteRecords[0].get('Cliente') as string || clienteId;
      }
    } catch (error) {
      console.warn('⚠️ Error obteniendo nombre cliente:', error);
    }

    // PASO 4: Obtener información de lotes
    const idLotesRaw = evento.get('ID Lote (from Cultivos Lotes Aplicaciones)');
    const idLotes = (Array.isArray(idLotesRaw) ? idLotesRaw : []) as string[];
    const hectareasLotesRaw = evento.get('Hectareas Lotes (from Cultivos Lotes Aplicaciones)');
    const hectareasLotes = (Array.isArray(hectareasLotesRaw) ? hectareasLotesRaw : []) as number[];

    let loteInfo = {
      id: idLotes[0] || 'N/A',
      nombre: idLotes[0] || 'Sin lote'
    };

    // Intentar obtener nombre del lote desde Sirius Client Core
    if (idLotes.length > 0) {
      try {
        const loteRecords = await baseClientCore('Lotes / Áreas Core')
          .select({
            filterByFormula: `{ID} = "${idLotes[0]}"`,
            maxRecords: 1,
            fields: ['ID', 'nombre_lote']
          })
          .firstPage();

        if (loteRecords.length > 0) {
          loteInfo.nombre = loteRecords[0].get('nombre_lote') as string || loteInfo.id;
        }
      } catch (error) {
        console.warn('⚠️ Error obteniendo nombre lote:', error);
      }
    }

    // PASO 5: Obtener información de productos
    const productosAplicadosIds = (evento.get('ID Productos Aplicados') || []) as string[];
    let productoInfo = {
      id: 'N/A',
      nombre: 'Sin producto'
    };

    if (productosAplicadosIds.length > 0) {
      try {
        // Obtener producto de DataLab
        const productoAplicacion = await baseDataLab('Productos Aplicacion').find(productosAplicadosIds[0]);
        const codigoProductoSirius = productoAplicacion.get('ID Producto') as string;

        if (codigoProductoSirius) {
          // Buscar en Sirius Product Core
          const productosRecords = await baseProductCore(SIRIUS_PRODUCT_CORE_CONFIG.TABLES.PRODUCTOS)
            .select({
              filterByFormula: `{Codigo Producto} = '${codigoProductoSirius}'`,
              maxRecords: 1
            })
            .firstPage();

          if (productosRecords.length > 0) {
            productoInfo = {
              id: codigoProductoSirius,
              nombre: productosRecords[0].get('Nombre Comercial') as string || codigoProductoSirius
            };
          }
        }
      } catch (error) {
        console.warn('⚠️ Error obteniendo producto:', error);
      }
    }

    // PASO 6: Datos programados
    const programado = {
      cliente: { id: clienteId, nombre: nombreCliente },
      lote: loteInfo,
      producto: productoInfo,
      fecha: evento.get('Fecha Programada') as string || '',
      hectareas: (evento.get('Total Hectareas Aplicacion') || 0) as number,
      litros: (evento.get('Cantidad Total Biologicos Litros') || 0) as number
    };

    console.log('✅ [SEGUIMIENTO] Datos programados:', programado);

    // PASO 7: Buscar pedidos del cliente
    let pedidos: any[] = [];
    try {
      const pedidosRecords = await basePedidos(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PEDIDOS)
        .select({
          filterByFormula: `{ID Cliente Core} = "${clienteId}"`,
          sort: [{ field: 'Fecha de Pedido', direction: 'desc' }]
        })
        .all();

      pedidos = Array.from(pedidosRecords);

      console.log(`📋 [SEGUIMIENTO] Pedidos encontrados: ${pedidos.length}`);
    } catch (error) {
      console.warn('⚠️ Error obteniendo pedidos:', error);
    }

    // PASO 8: Filtrar pedidos que mencionen los lotes en las Notas
    const pedidosRelevantes = pedidos.filter(pedido => {
      const notas = (pedido.get('Notas') || '') as string;
      // Buscar si las notas mencionan alguno de los lotes
      return idLotes.some(loteId => {
        // Buscar el ID del lote o variaciones del nombre
        const loteNormalizado = loteId.toLowerCase();
        const notasNormalizadas = notas.toLowerCase();
        return notasNormalizadas.includes(loteNormalizado) ||
               notasNormalizadas.includes(loteInfo.nombre.toLowerCase());
      });
    });

    console.log(`🎯 [SEGUIMIENTO] Pedidos relevantes (que mencionan los lotes): ${pedidosRelevantes.length}`);

    // PASO 9: Obtener remisiones vinculadas a esos pedidos
    const despachos: Array<{
      remisionId: string;
      numeroRemision: string;
      fechaDespacho: string;
      litros: number;
      productos: Array<{ nombre: string; cantidad: number; unidad: string }>;
    }> = [];

    let totalLitrosDespachados = 0;

    for (const pedido of pedidosRelevantes) {
      const idPedidoCore = pedido.get('ID Pedido Core') as string;

      try {
        // Buscar remisiones para este pedido
        const remisiones = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.REMISIONES)
          .select({
            filterByFormula: `{ID Pedido} = "${idPedidoCore}"`,
            sort: [{ field: 'Fecha Pedido Despachado', direction: 'asc' }]
          })
          .all();

        console.log(`📦 [SEGUIMIENTO] Remisiones para pedido ${idPedidoCore}: ${remisiones.length}`);

        // Procesar cada remisión
        for (const remision of remisiones) {
          const idRemision = remision.get('ID') as string || remision.id;
          const fechaDespacho = remision.get('Fecha Pedido Despachado') as string || '';
          const productosRemitidosIds = (remision.get('Productos Remitidos') || []) as string[];

          // Obtener productos remitidos
          const productos: Array<{ nombre: string; cantidad: number; unidad: string }> = [];
          let litrosRemision = 0;

          for (const prodRemitidoId of productosRemitidosIds) {
            try {
              const prodRemitido = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.PRODUCTOS_REMITIDOS)
                .find(prodRemitidoId);

              const cantidad = (prodRemitido.get('Cantidad') || 0) as number;
              const unidad = (prodRemitido.get('Unidad') || 'Ud') as string;
              const idProducto = prodRemitido.get('ID Producto') as string;

              // Sumar litros si la unidad es L
              if (unidad.toLowerCase() === 'l' || unidad.toLowerCase() === 'litros') {
                litrosRemision += cantidad;
              }

              // Obtener nombre del producto
              let nombreProducto = idProducto || 'Producto desconocido';
              try {
                const productosRecords = await baseProductCore(SIRIUS_PRODUCT_CORE_CONFIG.TABLES.PRODUCTOS)
                  .select({
                    filterByFormula: `{Codigo Producto} = '${idProducto}'`,
                    maxRecords: 1
                  })
                  .firstPage();

                if (productosRecords.length > 0) {
                  nombreProducto = productosRecords[0].get('Nombre Comercial') as string || nombreProducto;
                }
              } catch (error) {
                console.warn('⚠️ Error obteniendo nombre producto:', error);
              }

              productos.push({
                nombre: nombreProducto,
                cantidad,
                unidad
              });
            } catch (error) {
              console.warn('⚠️ Error obteniendo producto remitido:', error);
            }
          }

          totalLitrosDespachados += litrosRemision;

          despachos.push({
            remisionId: idRemision,
            numeroRemision: idRemision,
            fechaDespacho,
            litros: litrosRemision,
            productos
          });
        }
      } catch (error) {
        console.warn('⚠️ Error obteniendo remisiones del pedido:', error);
      }
    }

    // PASO 10: Calcular balance
    const litrosDiferencia = programado.litros - totalLitrosDespachados;
    const porcentajeCumplimiento = programado.litros > 0
      ? (totalLitrosDespachados / programado.litros) * 100
      : 0;

    const despachado = {
      totalHectareas: 0, // No podemos calcular hectáreas desde remisiones sin campo explícito
      totalLitros: totalLitrosDespachados,
      despachos: despachos.sort((a, b) =>
        new Date(a.fechaDespacho).getTime() - new Date(b.fechaDespacho).getTime()
      )
    };

    const balance = {
      hectareasDiferencia: 0, // No calculable sin datos de hectáreas en remisiones
      litrosDiferencia,
      porcentajeCumplimiento: Math.round(porcentajeCumplimiento)
    };

    console.log('✅ [SEGUIMIENTO] Seguimiento completo:', { programado, despachado, balance });

    const response: SeguimientoResponse = {
      success: true,
      programado,
      despachado,
      balance
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [SEGUIMIENTO] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo seguimiento'
    }, { status: 500 });
  }
}
