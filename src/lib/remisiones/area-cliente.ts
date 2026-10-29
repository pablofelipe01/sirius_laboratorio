// Un pedido no va "a GUAICARAMO": va a un área de GUAICARAMO (Sanidad, Ambiental…).
// El CRM y PiroliApp la guardan como `AC-XXXX` en `ID Area Cliente` del pedido y de
// la remisión; las áreas viven en `Areas Cliente` de Clients Core y cada contacto
// se enlaza a las suyas desde `Personal Cliente`.
//
// ⚠️ No confundir con `ID Area Core` del pedido: ese es un área INTERNA de Sirius
// (`SIRIUS-AREA-XXXX`, de Nómina Core).

import Airtable from 'airtable';
import { SIRIUS_CLIENT_CORE_CONFIG, SIRIUS_PEDIDOS_CORE_CONFIG } from '@/lib/constants/airtable';

export const CAMPO_ID_AREA_CLIENTE = 'ID Area Cliente';
export const CAMPO_AREAS_CONTACTO = 'Areas Cliente';

const escapar = (valor: string) => valor.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

/**
 * Un contacto sin áreas recibe todo. Uno con áreas solo recibe lo de esas áreas,
 * así que un pedido sin área no le llega.
 *
 * `areaRemision`: recId del área, `null` si el pedido no tiene área, `undefined`
 * si no se pudo averiguar — en ese caso se notifica a todos, como antes de existir
 * el filtro, para no dejar sin aviso a quien sí debía recibirlo.
 */
export function contactoRecibeRemision(
  areasContacto: unknown,
  areaRemision: string | null | undefined
): boolean {
  const areas = Array.isArray(areasContacto) ? areasContacto : [];
  if (areas.length === 0 || areaRemision === undefined) return true;
  return areaRemision !== null && areas.includes(areaRemision);
}

/** `AC-XXXX` del pedido; `''` si no tiene área; `undefined` si no se pudo leer. */
export async function codigoAreaClientePedido(idPedido: string): Promise<string | undefined> {
  if (!idPedido) return undefined;
  try {
    const records = await new Airtable({ apiKey: SIRIUS_PEDIDOS_CORE_CONFIG.API_KEY })
      .base(SIRIUS_PEDIDOS_CORE_CONFIG.BASE_ID)(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PEDIDOS)
      .select({
        filterByFormula: `{ID Pedido Core} = '${escapar(idPedido)}'`,
        fields: [CAMPO_ID_AREA_CLIENTE],
        maxRecords: 1,
      })
      .firstPage();
    if (records.length === 0) return undefined;
    return String(records[0].get(CAMPO_ID_AREA_CLIENTE) ?? '').trim();
  } catch (error) {
    console.error('⚠️ No se pudo leer el área cliente del pedido', idPedido, error);
    return undefined;
  }
}

export interface AreaCliente {
  codigo: string;
  nombre: string;
}

export const esCodigoAreaCliente = (valor: unknown): valor is string =>
  typeof valor === 'string' && /^AC-\d+$/.test(valor);

/**
 * Áreas activas de un cliente `CL-XXXX`, para escoger a cuál va el pedido.
 * Se siguen por el link del registro del cliente, como en PiroliApp.
 */
export async function listarAreasCliente(idCliente: string): Promise<AreaCliente[]> {
  const base = new Airtable({ apiKey: SIRIUS_CLIENT_CORE_CONFIG.API_KEY }).base(SIRIUS_CLIENT_CORE_CONFIG.BASE_ID);
  const clientes = await base(SIRIUS_CLIENT_CORE_CONFIG.TABLES.CLIENTES)
    .select({ filterByFormula: `{ID} = '${escapar(idCliente)}'`, fields: [CAMPO_AREAS_CONTACTO], maxRecords: 1 })
    .firstPage();
  const ids = (clientes[0]?.get(CAMPO_AREAS_CONTACTO) as string[] | undefined) ?? [];
  if (ids.length === 0) return [];

  const areas = await base(SIRIUS_CLIENT_CORE_CONFIG.TABLES.AREAS_CLIENTE)
    .select({
      filterByFormula: `OR(${ids.map((id) => `RECORD_ID() = '${escapar(id)}'`).join(', ')})`,
      fields: ['ID', 'Nombre Area', 'Estado Area'],
    })
    .all();

  return areas
    .filter((r) => r.get('Estado Area') !== 'Inactivo')
    .map((r) => ({ codigo: String(r.get('ID') ?? ''), nombre: String(r.get('Nombre Area') ?? '').trim() }))
    .filter((a) => a.codigo && a.nombre)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Traduce `AC-XXXX` al recId con el que lo enlazan los contactos. Mismo contrato que `contactoRecibeRemision`. */
export async function resolverAreaCliente(codigo: string | undefined): Promise<string | null | undefined> {
  if (codigo === undefined) return undefined;
  const limpio = codigo.trim();
  if (!limpio) return null;
  try {
    const records = await new Airtable({ apiKey: SIRIUS_CLIENT_CORE_CONFIG.API_KEY })
      .base(SIRIUS_CLIENT_CORE_CONFIG.BASE_ID)(SIRIUS_CLIENT_CORE_CONFIG.TABLES.AREAS_CLIENTE)
      .select({ filterByFormula: `{ID} = '${escapar(limpio)}'`, fields: ['ID'], maxRecords: 1 })
      .firstPage();
    if (records.length === 0) {
      console.warn('⚠️ Área cliente inexistente, se notifica a todo el personal:', limpio);
      return undefined;
    }
    return records[0].id;
  } catch (error) {
    console.error('⚠️ No se pudo resolver el área cliente', limpio, error);
    return undefined;
  }
}
