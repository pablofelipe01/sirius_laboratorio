import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import {
  SIRIUS_PEDIDOS_CORE_CONFIG,
  SIRIUS_REMISIONES_CORE_CONFIG,
  SIRIUS_CLIENT_CORE_CONFIG,
  SIRIUS_PRODUCT_CORE_CONFIG
} from '@/lib/constants/airtable';

// Función para configurar bases de Airtable de forma segura
function getBaseDataLab() {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    throw new Error('Configuración de DataLab no disponible');
  }
  return new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
}

function getBasePedidos() {
  if (!SIRIUS_PEDIDOS_CORE_CONFIG.API_KEY || !SIRIUS_PEDIDOS_CORE_CONFIG.BASE_ID) {
    return null;
  }
  return new Airtable({ apiKey: SIRIUS_PEDIDOS_CORE_CONFIG.API_KEY }).base(SIRIUS_PEDIDOS_CORE_CONFIG.BASE_ID);
}

function getBaseRemisiones() {
  if (!SIRIUS_REMISIONES_CORE_CONFIG.API_KEY || !SIRIUS_REMISIONES_CORE_CONFIG.BASE_ID) {
    return null;
  }
  return new Airtable({ apiKey: SIRIUS_REMISIONES_CORE_CONFIG.API_KEY }).base(SIRIUS_REMISIONES_CORE_CONFIG.BASE_ID);
}

function getBaseClientCore() {
  if (!SIRIUS_CLIENT_CORE_CONFIG.API_KEY || !SIRIUS_CLIENT_CORE_CONFIG.BASE_ID) {
    return null;
  }
  return new Airtable({ apiKey: SIRIUS_CLIENT_CORE_CONFIG.API_KEY }).base(SIRIUS_CLIENT_CORE_CONFIG.BASE_ID);
}

// Configuración de tablas
const APLICACIONES_TABLE = process.env.AIRTABLE_TABLE_APLICACIONES || 'Aplicaciones Eventos';
const PAQUETES_APLICACIONES_TABLE = process.env.AIRTABLE_TABLE_PAQUETES_APLICACIONES || 'Paquete Aplicaciones';
const SEGUIMIENTO_DIARIO_TABLE = 'Seguimiento Diario Aplicacion';

interface AplicacionConSeguimiento {
  id: string;
  cliente: {
    id: string;
    nombre: string;
  };
  lotes: Array<{
    id: string;
    nombre: string;
    hectareas: number;
  }>;
  producto: {
    id: string;
    nombre: string;
  };
  fechaProgramada: string;
  estadoAplicacion: string;
  // Programado
  hectareasProgramadas: number;
  litrosProgramados: number;
  // Ejecutado (Seguimiento Diario)
  hectareasEjecutadas: number;
  litrosEjecutados: number;
  fechasEjecucion: string[];
  // Despachado (Remisiones)
  litrosDespachados: number;
  pedidos: Array<{
    idPedido: string;
    notas: string;
    fechaPedido: string;
    diasDiferencia: number;
  }>;
  remisiones: Array<{
    id: string;
    numeroRemision: string;
    fechaDespacho: string;
    litros: number;
    productos: Array<{
      nombre: string;
      cantidad: number;
      unidad: string;
    }>;
  }>;
  // Balance
  balanceLitros: number;
  balanceHectareas: number;
  porcentajeCumplimiento: number;
}

interface DashboardMetrics {
  totalAplicaciones: number;
  totalHectareasProgramadas: number;
  totalHectareasEjecutadas: number;
  totalLitrosProgramados: number;
  totalLitrosDespachados: number;
  porcentajeCumplimientoGeneral: number;
  aplicacionesPorEstado: Record<string, number>;
  aplicacionesPorCliente: Record<string, { hectareas: number; litros: number }>;
}

/**
 * GET /api/dashboard-seguimiento-aplicaciones
 * Obtiene datos agregados de seguimiento de aplicaciones
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipoAplicacion = searchParams.get('tipo');
    const clienteId = searchParams.get('clienteId');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    console.log('📊 [DASHBOARD] Obteniendo datos de seguimiento:', {
      tipoAplicacion,
      clienteId,
      fechaInicio,
      fechaFin
    });

    // Obtener bases
    const baseDataLab = getBaseDataLab();
    const basePedidos = getBasePedidos();
    const baseRemisiones = getBaseRemisiones();
    const baseClientCore = getBaseClientCore();

    // PASO 1: Obtener todas las aplicaciones programadas
    const conditions: string[] = [];

    if (fechaInicio) {
      conditions.push(`{Fecha Programada} >= '${fechaInicio}'`);
    }
    if (fechaFin) {
      conditions.push(`{Fecha Programada} <= '${fechaFin}'`);
    }

    const selectOptions: any = {
      sort: [{ field: 'Fecha Programada', direction: 'desc' }]
    };

    if (conditions.length > 0) {
      selectOptions.filterByFormula = `AND(${conditions.join(', ')})`;
    }

    const aplicacionesRecords = await baseDataLab(APLICACIONES_TABLE)
      .select(selectOptions)
      .all();

    console.log(`📋 [DASHBOARD] Aplicaciones encontradas: ${aplicacionesRecords.length}`);

    // PASO 2: Obtener datos de clientes para mapear IDs a nombres
    const clientesMap = new Map<string, string>();
    if (baseClientCore) {
      try {
        const clientesRecords = await baseClientCore(SIRIUS_CLIENT_CORE_CONFIG.TABLES.CLIENTES)
          .select({
            fields: ['ID', 'Cliente']
          })
          .all();

      clientesRecords.forEach(record => {
        const id = record.get('ID') as string;
        const nombre = record.get('Cliente') as string;
        if (id && nombre) {
          clientesMap.set(id, nombre);
        }
      });

        console.log(`👥 [DASHBOARD] Clientes cargados: ${clientesMap.size}`);
      } catch (error) {
        console.warn('⚠️ Error cargando clientes:', error);
      }
    }

    // PASO 3: Obtener datos de lotes para mapear IDs a nombres
    const lotesMap = new Map<string, string>();
    if (baseClientCore) {
      try {
        const lotesRecords = await baseClientCore('Lotes / Áreas Core')
          .select({
            fields: ['ID', 'nombre_lote']
          })
          .all();

      lotesRecords.forEach(record => {
        const id = record.get('ID') as string;
        const nombre = record.get('nombre_lote') as string;
        if (id && nombre) {
          lotesMap.set(id, nombre);
        }
      });

        console.log(`🌾 [DASHBOARD] Lotes cargados: ${lotesMap.size}`);
      } catch (error) {
        console.warn('⚠️ Error cargando lotes:', error);
      }
    }

    // PASO 4: Procesar cada aplicación y obtener su seguimiento
    const aplicaciones: AplicacionConSeguimiento[] = [];
    const metrics: DashboardMetrics = {
      totalAplicaciones: 0,
      totalHectareasProgramadas: 0,
      totalHectareasEjecutadas: 0,
      totalLitrosProgramados: 0,
      totalLitrosDespachados: 0,
      porcentajeCumplimientoGeneral: 0,
      aplicacionesPorEstado: {},
      aplicacionesPorCliente: {}
    };

    for (const aplicacionRecord of aplicacionesRecords) {
      try {
        // Obtener información básica
        const fechaProgramada = aplicacionRecord.get('Fecha Programada') as string || '';
        const estadoAplicacion = aplicacionRecord.get('Estado Aplicacion') as string || 'PRESUPUESTADA';

        // Obtener cliente
        const paqueteIds = aplicacionRecord.get('Paquetes Aplicaciones') as string[] | undefined;
        const paqueteId = Array.isArray(paqueteIds) && paqueteIds.length > 0 ? paqueteIds[0] : null;

        let clienteId = '';
        let clienteNombre = '';

        if (paqueteId) {
          try {
            const paquete = await baseDataLab(PAQUETES_APLICACIONES_TABLE).find(paqueteId);
            const clienteIdField = paquete.get('ID Cliente') || paquete.get('Cliente ID') || paquete.get('id_cliente');
            clienteId = Array.isArray(clienteIdField) ? clienteIdField[0] : clienteIdField as string || '';
            clienteNombre = clientesMap.get(clienteId) || clienteId;
          } catch (error) {
            console.warn('⚠️ Error obteniendo paquete:', error);
          }
        }

        // Filtrar por cliente si se especificó
        if (clienteId && searchParams.get('clienteId') && clienteId !== searchParams.get('clienteId')) {
          continue;
        }

        // Obtener lotes
        const idLotesRaw = aplicacionRecord.get('ID Lote (from Cultivos Lotes Aplicaciones)');
        const idLotes = (Array.isArray(idLotesRaw) ? idLotesRaw : []) as string[];
        const hectareasLotesRaw = aplicacionRecord.get('Hectareas Lotes (from Cultivos Lotes Aplicaciones)');
        const hectareasLotes = (Array.isArray(hectareasLotesRaw) ? hectareasLotesRaw : []) as number[];

        const lotes = idLotes.map((id, index) => ({
          id,
          nombre: lotesMap.get(id) || id,
          hectareas: hectareasLotes[index] || 0
        }));

        // Obtener producto (primer producto aplicado)
        const productosAplicadosIds = aplicacionRecord.get('ID Productos Aplicados') as string[] | undefined;
        let productoNombre = 'Sin producto';
        let productoId = '';

        if (productosAplicadosIds && productosAplicadosIds.length > 0) {
          try {
            const productoAplicacion = await baseDataLab('Productos Aplicacion').find(productosAplicadosIds[0]);
            productoId = productoAplicacion.get('ID Producto') as string || '';
          } catch (error) {
            console.warn('⚠️ Error obteniendo producto:', error);
          }
        }

        // Datos programados
        const hectareasProgramadas = (aplicacionRecord.get('Total Hectareas Aplicacion') || 0) as number;
        const litrosProgramados = (aplicacionRecord.get('Cantidad Total Biologicos Litros') || 0) as number;

        // Obtener seguimiento diario para esta aplicación
        let hectareasEjecutadas = 0;
        let litrosEjecutados = 0;
        const fechasEjecucion: string[] = [];

        try {
          const seguimientoRecords = await baseDataLab(SEGUIMIENTO_DIARIO_TABLE)
            .select({
              filterByFormula: `FIND('${aplicacionRecord.id}', ARRAYJOIN({Aplicacion Evento}))`,
              fields: ['Fecha Reporte', 'Hectareas Reales', 'Litros Aplicados']
            })
            .all();

          seguimientoRecords.forEach(seg => {
            const hectareas = (seg.get('Hectareas Reales') || 0) as number;
            const litros = (seg.get('Litros Aplicados') || 0) as number;
            const fecha = seg.get('Fecha Reporte') as string;

            hectareasEjecutadas += hectareas;
            litrosEjecutados += litros;
            if (fecha) fechasEjecucion.push(fecha);
          });
        } catch (error) {
          console.warn('⚠️ Error obteniendo seguimiento diario:', error);
        }

        // Obtener remisiones despachadas para este cliente
        const pedidosInfo: Array<{ idPedido: string; notas: string; fechaPedido: string; diasDiferencia: number }> = [];
        const remisiones: Array<{ id: string; numeroRemision: string; fechaDespacho: string; litros: number; productos: Array<{ nombre: string; cantidad: number; unidad: string }> }> = [];
        let litrosDespachados = 0;

        if (clienteId && basePedidos && baseRemisiones) {
          try {
            // Buscar TODOS los pedidos del cliente
            const pedidos = await basePedidos(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PEDIDOS)
              .select({
                filterByFormula: `{ID Cliente Core} = "${clienteId}"`,
                fields: ['ID Pedido Core', 'Notas', 'Fecha de Pedido']
              })
              .all();

            console.log(`📦 [DASHBOARD] Pedidos encontrados para ${clienteId}: ${pedidos.length}`);

            // Calcular diferencia de fechas para cada pedido
            const fechaAplicacion = new Date(fechaProgramada);
            const pedidosConFecha = pedidos.map(pedido => {
              const fechaPedido = pedido.get('Fecha de Pedido') as string;
              const fechaPed = fechaPedido ? new Date(fechaPedido) : null;

              let diasDiferencia = 999999; // Valor alto para pedidos sin fecha
              if (fechaPed && !isNaN(fechaPed.getTime())) {
                diasDiferencia = Math.abs((fechaPed.getTime() - fechaAplicacion.getTime()) / (1000 * 60 * 60 * 24));
              }

              return {
                pedido,
                fechaPedido: fechaPedido || '',
                diasDiferencia
              };
            });

            // Ordenar por proximidad de fecha (más cercanos primero)
            pedidosConFecha.sort((a, b) => a.diasDiferencia - b.diasDiferencia);

            // Tomar los pedidos más cercanos (dentro de 90 días o todos si hay pocos)
            const VENTANA_DIAS = 90;
            const pedidosRelevantes = pedidosConFecha.filter(p =>
              p.diasDiferencia <= VENTANA_DIAS || pedidosConFecha.length <= 5
            );

            console.log(`📋 [DASHBOARD] Pedidos relevantes (dentro de ${VENTANA_DIAS} días): ${pedidosRelevantes.length}`);

            // Guardar información de pedidos relevantes
            for (const { pedido, fechaPedido, diasDiferencia } of pedidosRelevantes) {
              const idPedidoCore = pedido.get('ID Pedido Core') as string;
              const notas = (pedido.get('Notas') || '') as string;
              pedidosInfo.push({
                idPedido: idPedidoCore,
                notas,
                fechaPedido,
                diasDiferencia: Math.round(diasDiferencia)
              });
            }

            // Obtener remisiones de esos pedidos
            for (const { pedido } of pedidosRelevantes) {
              const idPedidoCore = pedido.get('ID Pedido Core') as string;

              try {
                const remisionesRecords = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.REMISIONES)
                  .select({
                    filterByFormula: `{ID Pedido} = "${idPedidoCore}"`,
                    fields: ['ID', 'Fecha Pedido Despachado', 'Productos Remitidos']
                  })
                  .all();

                for (const remisionRecord of remisionesRecords) {
                  const idRemision = remisionRecord.get('ID') as string || remisionRecord.id;
                  const fechaDespacho = remisionRecord.get('Fecha Pedido Despachado') as string || '';
                  const productosRemitidosIds = remisionRecord.get('Productos Remitidos') as string[] | undefined;

                  let litrosRemision = 0;
                  const productosRemision: Array<{ nombre: string; cantidad: number; unidad: string }> = [];

                  if (productosRemitidosIds) {
                    for (const prodRemitidoId of productosRemitidosIds) {
                      try {
                        const prodRemitido = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.PRODUCTOS_REMITIDOS)
                          .find(prodRemitidoId);

                        const cantidad = (prodRemitido.get('Cantidad') || 0) as number;
                        const unidad = (prodRemitido.get('Unidad') || 'Ud') as string;
                        const nombreProducto = (prodRemitido.get('Producto') || 'Producto') as string;

                        productosRemision.push({
                          nombre: nombreProducto,
                          cantidad,
                          unidad
                        });

                        if (unidad.toLowerCase() === 'l' || unidad.toLowerCase() === 'litros') {
                          litrosRemision += cantidad;
                        }
                      } catch (error) {
                        console.warn('⚠️ Error obteniendo producto remitido:', error);
                      }
                    }
                  }

                  litrosDespachados += litrosRemision;

                  remisiones.push({
                    id: idRemision,
                    numeroRemision: idRemision,
                    fechaDespacho,
                    litros: litrosRemision,
                    productos: productosRemision
                  });
                }
              } catch (error) {
                console.warn('⚠️ Error obteniendo remisiones:', error);
              }
            }
          } catch (error) {
            console.warn('⚠️ Error obteniendo pedidos/remisiones:', error);
          }
        }

        // Calcular balance
        const balanceLitros = litrosProgramados - litrosDespachados;
        const balanceHectareas = hectareasProgramadas - hectareasEjecutadas;
        const porcentajeCumplimiento = litrosProgramados > 0
          ? (litrosDespachados / litrosProgramados) * 100
          : 0;

        const aplicacion: AplicacionConSeguimiento = {
          id: aplicacionRecord.id,
          cliente: {
            id: clienteId,
            nombre: clienteNombre
          },
          lotes,
          producto: {
            id: productoId,
            nombre: productoNombre
          },
          fechaProgramada,
          estadoAplicacion,
          hectareasProgramadas,
          litrosProgramados,
          hectareasEjecutadas,
          litrosEjecutados,
          fechasEjecucion,
          litrosDespachados,
          pedidos: pedidosInfo,
          remisiones: remisiones.sort((a, b) =>
            new Date(a.fechaDespacho).getTime() - new Date(b.fechaDespacho).getTime()
          ),
          balanceLitros,
          balanceHectareas,
          porcentajeCumplimiento: Math.round(porcentajeCumplimiento)
        };

        aplicaciones.push(aplicacion);

        // Actualizar métricas
        metrics.totalAplicaciones++;
        metrics.totalHectareasProgramadas += hectareasProgramadas;
        metrics.totalHectareasEjecutadas += hectareasEjecutadas;
        metrics.totalLitrosProgramados += litrosProgramados;
        metrics.totalLitrosDespachados += litrosDespachados;

        // Por estado
        metrics.aplicacionesPorEstado[estadoAplicacion] =
          (metrics.aplicacionesPorEstado[estadoAplicacion] || 0) + 1;

        // Por cliente
        if (clienteId) {
          if (!metrics.aplicacionesPorCliente[clienteNombre]) {
            metrics.aplicacionesPorCliente[clienteNombre] = { hectareas: 0, litros: 0 };
          }
          metrics.aplicacionesPorCliente[clienteNombre].hectareas += hectareasProgramadas;
          metrics.aplicacionesPorCliente[clienteNombre].litros += litrosProgramados;
        }
      } catch (error) {
        console.error('❌ Error procesando aplicación:', error);
      }
    }

    // Calcular porcentaje de cumplimiento general
    metrics.porcentajeCumplimientoGeneral = metrics.totalLitrosProgramados > 0
      ? Math.round((metrics.totalLitrosDespachados / metrics.totalLitrosProgramados) * 100)
      : 0;

    console.log('✅ [DASHBOARD] Datos procesados:', {
      totalAplicaciones: metrics.totalAplicaciones,
      porcentajeCumplimiento: metrics.porcentajeCumplimientoGeneral
    });

    return NextResponse.json({
      success: true,
      metrics,
      aplicaciones
    });

  } catch (error) {
    console.error('❌ [DASHBOARD] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo datos del dashboard'
    }, { status: 500 });
  }
}
