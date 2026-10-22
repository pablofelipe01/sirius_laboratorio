/**
 * Copia las remisiones del laboratorio a Flujo de caja, donde finanzas las
 * concilia contra la factura. Antes esa copia se hacía a mano, días después.
 *
 * Corre en dos momentos, siempre después de responder al usuario (`after()`):
 * - al crear la remisión con transportista (En Tránsito): crea el registro con
 *   sus productos y los datos de quien lleva;
 * - al firmarla (Entregada): completa quién recibió y cuándo. Si el registro no
 *   existía —remisión creada sin transportista, o sincronización apagada en ese
 *   momento— lo crea completo.
 *
 * ⚠️ Nunca lanza. Un error aquí se registra en el log y nada más: la remisión,
 * el PDF, el inventario y el correo ya quedaron hechos, y Flujo de caja se
 * puede completar a mano como antes.
 *
 * La llave entre las dos bases es el consecutivo (`Numero Remision` = el número
 * de SIRIUS-REM-XXXX). Si ya existe un registro con ese número no se crea otro:
 * solo se llenan sus campos vacíos. Si hay dos, no se toca ninguno.
 *
 * Lo que sigue siendo de finanzas: `Factura Relacionada` y el
 * `Precio Unitario Facturado` de cada línea. Mientras no estén, la fórmula
 * `Valor Total` usa la tarifa de referencia.
 */

import Airtable from 'airtable';
import {
  FLUJO_CAJA_CONFIG,
  SIRIUS_CLIENT_CORE_CONFIG,
  SIRIUS_REMISIONES_CORE_CONFIG,
  buildAirtableUrl,
} from '@/lib/constants/airtable';
import { obtenerPersonasDeRemision } from '@/lib/personas-remision';
import {
  FLUJO_CAJA,
  camposPorCompletar,
  construirCamposProductos,
  construirCamposRemision,
  numeroDeRemision,
  type PersonaRemisionCore,
  type RemisionCore,
} from './flujo-caja-registro';

/** Las Pendiente aún no salieron del laboratorio; las Canceladas no se cobran. */
const ESTADOS_SINCRONIZABLES = ['En Tránsito', 'Entregada'];

/** Airtable acepta hasta 10 registros por escritura. */
const LOTE_AIRTABLE = 10;

export type ResultadoSincronizacion = {
  estado: 'desactivada' | 'omitida' | 'creada' | 'actualizada' | 'sin-cambios' | 'error';
  numero?: number;
  detalle?: string;
};

type RegistroFlujo = { id: string; fields: Record<string, unknown> };

export function flujoCajaConfigurado(): boolean {
  return Boolean(FLUJO_CAJA_CONFIG.BASE_ID && FLUJO_CAJA_CONFIG.API_KEY);
}

export async function sincronizarRemisionFlujoCaja(remisionRecordId: string): Promise<ResultadoSincronizacion> {
  if (!flujoCajaConfigurado()) return { estado: 'desactivada' };

  try {
    const remision = await leerRemisionCore(remisionRecordId);

    if (remision.areaOrigen !== 'Laboratorio') {
      return { estado: 'omitida', detalle: `área ${remision.areaOrigen}` };
    }
    if (!ESTADOS_SINCRONIZABLES.includes(remision.estado)) {
      return { estado: 'omitida', detalle: `estado ${remision.estado || 'vacío'}` };
    }

    const numero = numeroDeRemision(remision.idRemision);
    if (!numero) {
      throw new Error(`No se pudo leer el consecutivo de "${remision.idRemision}"`);
    }

    const existentes = await buscarPorNumero(numero);

    if (existentes.length > 1) {
      console.warn(`⚠️ [Flujo de caja] ${existentes.length} registros con Numero Remision ${numero}; no se toca ninguno`);
      return { estado: 'omitida', numero, detalle: 'registro duplicado en Flujo de caja' };
    }

    if (existentes.length === 0) {
      await crearRegistro(remision);
      console.log(`✅ [Flujo de caja] Remisión ${remision.idRemision} registrada`);
      return { estado: 'creada', numero };
    }

    const resultado = await completarRegistro(existentes[0], remision);
    console.log(`✅ [Flujo de caja] Remisión ${remision.idRemision}: ${resultado}`);
    return { estado: resultado, numero };
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    console.error(`❌ [Flujo de caja] No se sincronizó la remisión ${remisionRecordId} (no bloquea):`, detalle);
    return { estado: 'error', detalle };
  }
}

// ── Lectura de Remisiones Core ──────────────────────────────────────────────

async function leerRemisionCore(remisionRecordId: string): Promise<RemisionCore> {
  const baseRemisiones = new Airtable({ apiKey: SIRIUS_REMISIONES_CORE_CONFIG.API_KEY })
    .base(SIRIUS_REMISIONES_CORE_CONFIG.BASE_ID);

  const record = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.REMISIONES).find(remisionRecordId);
  const productosIds = (record.get('Productos Remitidos') as string[]) || [];
  const idCliente = (record.get('ID Cliente') as string) || '';

  const [productos, personas, nombreCliente] = await Promise.all([
    Promise.all(
      productosIds.map(async id => {
        const producto = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.PRODUCTOS_REMITIDOS).find(id);
        return {
          // Al crear la remisión, Notas guarda el nombre comercial del producto.
          nombre: (producto.get('Notas') as string) || (producto.get('ID Producto') as string) || '',
          cantidad: (producto.get('Cantidad') as number) || 0,
          unidad: (producto.get('Unidad') as string) || '',
        };
      }),
    ),
    obtenerPersonasDeRemision(remisionRecordId),
    leerNombreCliente(idCliente),
  ]);

  const persona = (tipo: string): PersonaRemisionCore | undefined => {
    const encontrada = personas.find(p => p.tipo === tipo);
    return encontrada
      ? { nombre: encontrada.nombreCompleto || '', cedula: encontrada.cedula || '', codigo: encontrada.codigo }
      : undefined;
  };

  return {
    idRemision: (record.get('ID') as string) || '',
    idPedido: (record.get('ID Pedido') as string) || '',
    idCliente,
    nombreCliente,
    // Mismo default que la firma: las remisiones viejas no tienen área.
    areaOrigen: (record.get('Area Origen') as string) || 'Laboratorio',
    estado: (record.get('Estado') as string) || '',
    responsableEntrega: (record.get('Responsable Entrega') as string) || '',
    fechaRemision: (record.get('Fecha de Remisión') as string) || new Date().toISOString(),
    fechaDespacho: (record.get('Fecha Pedido Despachado') as string) || undefined,
    fechaRecibido: (record.get('Fecha Recibido') as string) || undefined,
    notas: (record.get('Notas de Remisión') as string) || '',
    urlDocumento: (record.get('URL Remision Generada') as string) || '',
    productos,
    transportista: persona('Transportista'),
    receptor: persona('Receptor'),
  };
}

async function leerNombreCliente(idCliente: string): Promise<string> {
  if (!idCliente) return '';
  const baseClientCore = new Airtable({ apiKey: SIRIUS_CLIENT_CORE_CONFIG.API_KEY })
    .base(SIRIUS_CLIENT_CORE_CONFIG.BASE_ID);
  const records = await baseClientCore(SIRIUS_CLIENT_CORE_CONFIG.TABLES.CLIENTES)
    .select({ filterByFormula: `{ID} = "${idCliente.replace(/"/g, '\\"')}"`, maxRecords: 1 })
    .firstPage();
  return records.length > 0 ? ((records[0].get('Cliente') as string) || idCliente) : idCliente;
}

// ── Escritura en Flujo de caja ──────────────────────────────────────────────

async function flujoPedir<T>(
  tabla: string,
  opciones: { metodo?: string; recordId?: string; query?: URLSearchParams; body?: unknown } = {},
): Promise<T> {
  const { metodo = 'GET', recordId, query, body } = opciones;
  const url = new URL(buildAirtableUrl(tabla, recordId, FLUJO_CAJA_CONFIG.BASE_ID));
  query?.forEach((valor, clave) => url.searchParams.append(clave, valor));

  const res = await fetch(url.toString(), {
    method: metodo,
    headers: {
      Authorization: `Bearer ${FLUJO_CAJA_CONFIG.API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`Flujo de caja respondió ${res.status} en ${tabla}: ${detalle.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

async function buscarPorNumero(numero: number): Promise<RegistroFlujo[]> {
  const query = new URLSearchParams({
    // filterByFormula no acepta field IDs: si renombran el campo, esto falla con 422.
    filterByFormula: `{Numero Remision} = ${numero}`,
    returnFieldsByFieldId: 'true',
    maxRecords: '2',
  });
  const respuesta = await flujoPedir<{ records: RegistroFlujo[] }>(FLUJO_CAJA.TABLES.REMISIONES, { query });
  return respuesta.records;
}

async function crearProductos(remision: RemisionCore): Promise<string[]> {
  const lineas = construirCamposProductos(remision);
  const creados: string[] = [];

  try {
    for (let i = 0; i < lineas.length; i += LOTE_AIRTABLE) {
      const respuesta = await flujoPedir<{ records: RegistroFlujo[] }>(FLUJO_CAJA.TABLES.PRODUCTOS, {
        metodo: 'POST',
        body: { records: lineas.slice(i, i + LOTE_AIRTABLE).map(fields => ({ fields })) },
      });
      creados.push(...respuesta.records.map(r => r.id));
    }
    return creados;
  } catch (error) {
    await borrarProductos(creados);
    throw error;
  }
}

/** Deshace líneas que quedaron sueltas; si también falla, quedan en el log para borrarlas a mano. */
async function borrarProductos(ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += LOTE_AIRTABLE) {
    const lote = ids.slice(i, i + LOTE_AIRTABLE);
    try {
      const query = new URLSearchParams();
      lote.forEach(id => query.append('records[]', id));
      await flujoPedir(FLUJO_CAJA.TABLES.PRODUCTOS, { metodo: 'DELETE', query });
    } catch (error) {
      console.error('❌ [Flujo de caja] Quedaron Productos Remisiones sin remisión:', lote, error);
    }
  }
}

async function crearRegistro(remision: RemisionCore): Promise<void> {
  const productos = await crearProductos(remision);

  try {
    await flujoPedir(FLUJO_CAJA.TABLES.REMISIONES, {
      metodo: 'POST',
      body: {
        records: [{
          fields: { ...construirCamposRemision(remision), [FLUJO_CAJA.FIELDS_REMISION.PRODUCTOS]: productos },
        }],
      },
    });
  } catch (error) {
    // Sin la remisión, las líneas sumarían ventas sin dueño en los informes.
    await borrarProductos(productos);
    throw error;
  }
}

async function completarRegistro(
  existente: RegistroFlujo,
  remision: RemisionCore,
): Promise<'actualizada' | 'sin-cambios'> {
  const cambios = camposPorCompletar(existente.fields, remision);

  // Un registro hecho a mano sin productos se completa; si ya tiene, no se tocan.
  const productosActuales = existente.fields[FLUJO_CAJA.FIELDS_REMISION.PRODUCTOS];
  const sinProductos = !Array.isArray(productosActuales) || productosActuales.length === 0;
  let productosCreados: string[] = [];
  if (sinProductos && remision.productos.length > 0) {
    productosCreados = await crearProductos(remision);
    cambios[FLUJO_CAJA.FIELDS_REMISION.PRODUCTOS] = productosCreados;
  }

  if (Object.keys(cambios).length === 0) return 'sin-cambios';

  try {
    await flujoPedir(FLUJO_CAJA.TABLES.REMISIONES, {
      metodo: 'PATCH',
      recordId: existente.id,
      body: { fields: cambios },
    });
  } catch (error) {
    await borrarProductos(productosCreados);
    throw error;
  }
  return 'actualizada';
}
