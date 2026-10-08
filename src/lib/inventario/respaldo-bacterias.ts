/**
 * Respaldo de las entradas de bacterias a Sirius Inventario Production Core.
 *
 * Los hongos entran al inventario desde la cosecha, que ya está atada a sus
 * lotes. Las bacterias (Bacillus thuringiensis, Siriusbacter) se registran a
 * mano en `/bacterias`, y hasta ahora eso era un número de litros sin origen:
 * en ene–feb 2026 hubo que cargar 2.213 L de entradas de ajuste para respaldar
 * remisiones que no tenían ninguna producción detrás.
 *
 * Desde aquí toda entrada de una bacteria trae una de dos cosas:
 * - la fermentación de DataLab de donde sale, que se descuenta con una
 *   `Salida Fermentacion` para que el mismo litro no respalde dos entradas, o
 * - si no hay fermentación registrada, la marca `SIN-FERMENTACION`, con el
 *   código del lote y el motivo cuando se conocen (son opcionales): el
 *   faltante queda documentado en vez de esconderse.
 *
 * Qué es bacteria lo dice DataLab, no una lista en el código: el producto cuyo
 * `ID Producto` está en un Microorganismo de tipo Bacteria.
 */

import { AIRTABLE_CONFIG, buildAirtableUrl, getAirtableHeaders } from '@/lib/constants/airtable';

export const DOCUMENTO_SIN_FERMENTACION = 'SIN-FERMENTACION';

export type FermentacionDisponible = {
  id: string;
  codigoLote: string;
  litrosDisponibles: number;
  fechaTermina: string | null;
};

export type RespaldoEntrada =
  | { tipo: 'fermentacion'; fermentacionId: string; codigoLote: string }
  | { tipo: 'sin-fermentacion'; codigoLote: string; motivo: string };

/** Error de validación del respaldo: el mensaje es para mostrárselo al usuario. */
export class RespaldoInvalido extends Error {
  constructor(message: string, readonly status: 400 | 409) {
    super(message);
  }
}

type Registro = { id: string; fields: Record<string, unknown> };

function tablaFermentacion(): string {
  const tabla = process.env.AIRTABLE_TABLE_FERMENTACION;
  if (!tabla) throw new Error('AIRTABLE_TABLE_FERMENTACION no está configurada');
  return tabla;
}

function escaparFormula(valor: string): string {
  return valor.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function dataLab<T>(
  tabla: string,
  opciones: { metodo?: string; recordId?: string; query?: Record<string, string>; body?: unknown } = {},
): Promise<T> {
  const url = new URL(buildAirtableUrl(tabla, opciones.recordId));
  Object.entries(opciones.query ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method: opciones.metodo ?? 'GET',
    headers: getAirtableHeaders(),
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`DataLab respondió ${res.status} en ${tabla}: ${detalle.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

/** El Microorganismo bacteria detrás de un producto de Core, o null si no es bacteria. */
export async function bacteriaDeProducto(
  codigoProducto: string,
): Promise<{ id: string; nombre: string } | null> {
  const { records } = await dataLab<{ records: Registro[] }>(AIRTABLE_CONFIG.TABLES.MICROORGANISMOS, {
    query: {
      // `ID Producto` es texto largo: TRIM evita que un salto de línea final
      // haga pasar una bacteria por producto sin respaldo.
      filterByFormula: `AND(TRIM({ID Producto})='${escaparFormula(codigoProducto)}', {Tipo Microorganismo}='Bacteria')`,
      maxRecords: '1',
    },
  });
  if (records.length === 0) return null;
  return { id: records[0].id, nombre: String(records[0].fields['Microorganismo'] ?? codigoProducto) };
}

function aFermentacion(r: Registro): FermentacionDisponible {
  return {
    id: r.id,
    codigoLote: String(r.fields['Codigo Lote'] ?? r.id),
    litrosDisponibles: Number(r.fields['Total Litros']) || 0,
    fechaTermina: (r.fields['Fecha Termina Fermentacion'] as string | undefined) ?? null,
  };
}

function esDeMicroorganismo(r: Registro, microorganismoId: string): boolean {
  const vinculados = r.fields['Microorganismos'];
  return Array.isArray(vinculados) && vinculados.includes(microorganismoId);
}

/** Fermentaciones terminadas de esa bacteria que aún tienen litros, la más vieja primero. */
export async function fermentacionesDisponibles(microorganismoId: string): Promise<FermentacionDisponible[]> {
  const salida: Registro[] = [];
  let offset: string | undefined;
  do {
    const query: Record<string, string> = {
      filterByFormula: `AND({Estado}='Disponible', {Total Litros}>0)`,
      pageSize: '100',
      'sort[0][field]': 'Fecha Termina Fermentacion',
      'sort[0][direction]': 'asc',
    };
    if (offset) query.offset = offset;
    const pagina = await dataLab<{ records: Registro[]; offset?: string }>(tablaFermentacion(), { query });
    salida.push(...pagina.records);
    offset = pagina.offset;
  } while (offset);

  // El vínculo se compara contra los recId del propio registro: en una fórmula,
  // ARRAYJOIN de un link devuelve el campo primario, no el recId.
  return salida.filter((r) => esDeMicroorganismo(r, microorganismoId)).map(aFermentacion);
}

/**
 * Valida el respaldo de una entrada. Devuelve null cuando el producto no es una
 * bacteria y la entrada no necesita respaldo.
 */
export async function resolverRespaldo(
  codigoProducto: string,
  litros: number,
  entrada: { fermentacionId?: string; codigoLote?: string; motivoSinFermentacion?: string },
): Promise<RespaldoEntrada | null> {
  const bacteria = await bacteriaDeProducto(codigoProducto);
  if (!bacteria) return null;

  const fermentacionId = entrada.fermentacionId?.trim();
  if (fermentacionId) {
    let registro: Registro;
    try {
      registro = await dataLab<Registro>(tablaFermentacion(), { recordId: fermentacionId });
    } catch {
      throw new RespaldoInvalido('La fermentación escogida no existe en DataLab.', 400);
    }
    if (!esDeMicroorganismo(registro, bacteria.id)) {
      throw new RespaldoInvalido(`La fermentación escogida no es de ${bacteria.nombre}.`, 400);
    }
    const fermentacion = aFermentacion(registro);
    if (registro.fields['Estado'] !== 'Disponible') {
      throw new RespaldoInvalido(
        `La fermentación ${fermentacion.codigoLote} no está disponible (${String(registro.fields['Estado'] ?? 'sin estado')}).`,
        409,
      );
    }
    if (litros > fermentacion.litrosDisponibles) {
      throw new RespaldoInvalido(
        `La fermentación ${fermentacion.codigoLote} tiene ${fermentacion.litrosDisponibles} L disponibles y se intentan registrar ${litros} L.`,
        409,
      );
    }
    return { tipo: 'fermentacion', fermentacionId: registro.id, codigoLote: fermentacion.codigoLote };
  }

  // Lote y motivo son opcionales: el laboratorio no siempre los tiene a mano y
  // bloquear la entrada dejaba los litros por fuera del inventario. La marca
  // SIN-FERMENTACION basta para que el faltante se vea en la conciliación.
  return {
    tipo: 'sin-fermentacion',
    codigoLote: entrada.codigoLote?.trim() ?? '',
    motivo: entrada.motivoSinFermentacion?.trim() ?? '',
  };
}

/** Descuenta los litros de la fermentación. Devuelve el recId de la salida, para deshacerla. */
export async function descontarFermentacion(
  fermentacionId: string,
  litros: number,
  responsable: string,
): Promise<string> {
  const tabla = AIRTABLE_CONFIG.TABLES.SALIDA_FERMENTACION;
  if (!tabla) throw new Error('AIRTABLE_TABLE_SALIDA_FERMENTACION no está configurada');

  const hoyBogota = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const { records } = await dataLab<{ records: Registro[] }>(tabla, {
    metodo: 'POST',
    body: {
      records: [
        {
          fields: {
            'Fecha Evento': hoyBogota,
            'Cantidad Litros': litros,
            'Realiza Registro': responsable,
            'Lote Bacteria Alterada': [fermentacionId],
          },
        },
      ],
    },
  });
  return records[0].id;
}

export async function deshacerDescuentoFermentacion(salidaId: string): Promise<void> {
  const tabla = AIRTABLE_CONFIG.TABLES.SALIDA_FERMENTACION;
  if (!tabla) return;
  await dataLab(tabla, { metodo: 'DELETE', recordId: salidaId });
}
