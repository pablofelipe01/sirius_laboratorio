/**
 * Stock de producto terminado en Sirius Inventario Production Core, visto desde
 * el pedido que lo va a despachar.
 *
 * Cada producto tiene dos bolsas: lo producido para un pedido
 * (`ubicacion_destino_id` = SIRIUS-PED-XXXX) y el granel (`STOCK-GENERAL` o
 * vacío). Una remisión registra su Salida siempre contra el pedido, nunca contra
 * el granel. Cuando un pedido despacha más de lo que se produjo para él, el
 * exceso salió del granel aunque ningún movimiento lo diga. Por eso lo libre del
 * granel es su saldo menos lo que cada pedido despachó de más; sumar el granel
 * completo a cada pedido contaría el mismo litro varias veces.
 */

import {
  SIRIUS_INVENTARIO_CONFIG,
  buildSiriusInventarioUrl,
  getSiriusInventarioHeaders,
} from '@/lib/constants/airtable';

export const DESTINO_GRANEL = 'STOCK-GENERAL';

// La cosecha usa este destino cuando no le llega el pedido (api/cosecha). Es
// producción sin dueño, o sea granel: tratarlo como un pedido más dejaría ese
// stock inalcanzable para cualquier remisión.
const DESTINOS_GRANEL = new Set(['', DESTINO_GRANEL, 'PED-NO-IDENTIFICADO']);

export type MovimientoStock = { tipo: string; cantidad: number; destino: string };

export type FaltanteStock = {
  productoId: string;
  solicitado: number;
  disponible: number;
};

const PROPIO = Symbol('pedido-propio');

/**
 * Lo que el pedido puede despachar: lo que queda de su propia producción más lo
 * libre del granel. `clavesPedido` lleva el ID legible y el recId, porque hay
 * movimientos viejos que guardaron uno u otro.
 */
export function calcularDisponibleParaPedido(
  movimientos: MovimientoStock[],
  clavesPedido: string[],
): number {
  const saldos = new Map<string | typeof PROPIO, number>();

  for (const m of movimientos) {
    // En Production Core solo se usan Entrada y Salida; cualquier otro tipo no
    // tiene signo definido y se ignora antes que adivinarlo.
    const signo = m.tipo === 'Entrada' ? 1 : m.tipo === 'Salida' ? -1 : 0;
    if (!signo) continue;

    const destino = (m.destino || '').trim();
    const clave =
      DESTINOS_GRANEL.has(destino)
        ? DESTINO_GRANEL
        : clavesPedido.includes(destino)
          ? PROPIO
          : destino;
    saldos.set(clave, (saldos.get(clave) ?? 0) + signo * (m.cantidad || 0));
  }

  const propio = saldos.get(PROPIO) ?? 0;
  let granelLibre = saldos.get(DESTINO_GRANEL) ?? 0;
  for (const [clave, saldo] of saldos) {
    if (clave !== PROPIO && clave !== DESTINO_GRANEL && saldo < 0) granelLibre += saldo;
  }
  if (propio < 0) granelLibre += propio;

  return redondear(Math.max(0, propio) + Math.max(0, granelLibre));
}

function redondear(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function escaparFormula(valor: string): string {
  return valor.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Todos los movimientos de un producto, siguiendo la paginación de Airtable. */
export async function obtenerMovimientosProducto(productoId: string): Promise<MovimientoStock[]> {
  const F = SIRIUS_INVENTARIO_CONFIG.FIELDS_MOVIMIENTOS;
  const movimientos: MovimientoStock[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(buildSiriusInventarioUrl(SIRIUS_INVENTARIO_CONFIG.TABLES.MOVIMIENTOS_INVENTARIO));
    // Sin returnFieldsByFieldId Airtable responde por nombre y la lectura por
    // fieldId sale vacía, sin error: todo el stock daría cero.
    url.searchParams.set('returnFieldsByFieldId', 'true');
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('filterByFormula', `{product_id}='${escaparFormula(productoId)}'`);
    if (offset) url.searchParams.set('offset', offset);

    const res = await fetch(url.toString(), { headers: getSiriusInventarioHeaders(), cache: 'no-store' });
    if (!res.ok) {
      const detalle = await res.text();
      throw new Error(`Inventario Production Core respondió ${res.status}: ${detalle.slice(0, 300)}`);
    }
    const pagina = (await res.json()) as {
      records: { fields: Record<string, unknown> }[];
      offset?: string;
    };

    for (const r of pagina.records) {
      const tipo = r.fields[F.TIPO_MOVIMIENTO];
      movimientos.push({
        tipo: typeof tipo === 'string' ? tipo : (tipo as { name?: string } | undefined)?.name ?? '',
        cantidad: Number(r.fields[F.CANTIDAD]) || 0,
        destino: String(r.fields[F.UBICACION_DESTINO_ID] ?? ''),
      });
    }
    offset = pagina.offset;
  } while (offset);

  return movimientos;
}

/**
 * Los productos de una remisión que no alcanzan con el stock registrado. Lista
 * vacía = se puede despachar todo.
 */
export async function buscarFaltantesRemision(
  productos: { productoId: string; cantidad: number }[],
  clavesPedido: string[],
): Promise<FaltanteStock[]> {
  // Un mismo producto puede venir en dos líneas: se valida la suma.
  const solicitado = new Map<string, number>();
  for (const p of productos) {
    solicitado.set(p.productoId, (solicitado.get(p.productoId) ?? 0) + (Number(p.cantidad) || 0));
  }

  const faltantes = await Promise.all(
    [...solicitado].map(async ([productoId, cantidad]) => {
      const disponible = calcularDisponibleParaPedido(
        await obtenerMovimientosProducto(productoId),
        clavesPedido,
      );
      return cantidad > disponible ? { productoId, solicitado: cantidad, disponible } : null;
    }),
  );

  return faltantes.filter((f): f is FaltanteStock => f !== null);
}
