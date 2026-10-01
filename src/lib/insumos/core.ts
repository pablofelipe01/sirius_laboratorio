/**
 * Acceso a Sirius Insumos Core para el inventario del laboratorio.
 *
 * Toda la pantalla `/stock-insumos` pasa por aquí. El objetivo de este módulo es
 * que la interfaz siga viendo la forma de datos que ya conocía mientras los datos
 * vienen de otra base con otro modelo, así que aquí ocurren tres traducciones:
 *
 * - **Stock**: en DataLab era un número escribible en el propio insumo. En Core
 *   es `Stock Insumos.stock_actual`, una fórmula sobre los movimientos. No se
 *   escribe: se crea un movimiento y el stock se recalcula solo.
 * - **Lotes**: DataLab tenía una tabla `Entrada Insumos` con identidad propia.
 *   En Core el lote es un movimiento de tipo Entrada, y lo que queda de él se
 *   calcula restándole las Salidas que lo apuntan por `Entrada Origen`.
 * - **Área**: Core es de toda la empresa. Cada consulta filtra por
 *   `Areas Consumidoras = LABORATORIO` o la pantalla mostraría los EPP de SG-SST
 *   y los rodamientos de pirólisis.
 */

import {
  SIRIUS_INSUMOS_CORE_CONFIG as CORE,
  buildSiriusInsumosCoreUrl,
  getSiriusInsumosCoreHeaders,
} from '@/lib/constants/airtable';

const F_INS = CORE.FIELDS_INSUMO;
const F_MOV = CORE.FIELDS_MOVIMIENTO;
const F_STK = CORE.FIELDS_STOCK;

type Registro = { id: string; fields: Record<string, any>; createdTime: string };

/** Un lote es un movimiento de Entrada con lo que aún queda de él. */
export type LoteDisponible = {
  id: string;
  codigo: string;
  cantidadIngresada: number;
  cantidadDisponible: number;
  fechaMovimiento: string | null;
  fechaVencimiento: string | null;
  lote: string | null;
  estadoVencimiento: 'vencido' | 'proximo' | 'vigente' | 'sin_fecha';
};

async function corePedir<T>(
  tabla: string,
  opciones: { metodo?: string; recordId?: string; query?: Record<string, string>; body?: unknown } = {},
): Promise<T> {
  const { metodo = 'GET', recordId, query } = opciones;
  const url = new URL(buildSiriusInsumosCoreUrl(tabla, recordId));
  if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));

  // Sin esto Airtable responde los campos por nombre y toda lectura por fieldId
  // sale vacía — incluidas las fórmulas del registro recién creado.
  const body =
    opciones.body && typeof opciones.body === 'object'
      ? { returnFieldsByFieldId: true, ...(opciones.body as Record<string, unknown>) }
      : opciones.body;

  const res = await fetch(url.toString(), {
    method: metodo,
    headers: getSiriusInsumosCoreHeaders(),
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`Insumos Core respondió ${res.status} en ${tabla}: ${detalle.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

/** Trae todos los registros de una tabla, siguiendo la paginación de Airtable. */
async function coreListar(tabla: string, filtro?: string): Promise<Registro[]> {
  const salida: Registro[] = [];
  let offset: string | undefined;

  do {
    const query: Record<string, string> = { returnFieldsByFieldId: 'true', pageSize: '100' };
    if (filtro) query.filterByFormula = filtro;
    if (offset) query.offset = offset;

    const pagina = await corePedir<{ records: Registro[]; offset?: string }>(tabla, { query });
    salida.push(...pagina.records);
    offset = pagina.offset;
  } while (offset);

  return salida;
}

/**
 * Trae registros concretos por su id.
 *
 * Hace falta porque `ARRAYJOIN({CampoLink})` devuelve el campo primario de los
 * registros vinculados, no sus record ids: filtrar un link por `recXXXX` nunca
 * encuentra nada. La ruta fiable es leer los ids desde el registro que los
 * enlaza y pedirlos explícitamente.
 */
async function coreObtenerPorIds(tabla: string, ids: string[]): Promise<Registro[]> {
  if (ids.length === 0) return [];

  const salida: Registro[] = [];
  // La fórmula viaja en la URL; en tandas para no pasarse de largo.
  const TAMANO_TANDA = 80;

  for (let i = 0; i < ids.length; i += TAMANO_TANDA) {
    const tanda = ids.slice(i, i + TAMANO_TANDA);
    const filtro = `OR(${tanda.map((id) => `RECORD_ID()='${id}'`).join(',')})`;
    salida.push(...(await coreListar(tabla, filtro)));
  }

  return salida;
}

/** Lee un insumo y devuelve los ids que cuelgan de uno de sus campos link. */
async function idsVinculados(insumoId: string, campoLink: string): Promise<string[]> {
  const insumo = await corePedir<Registro>(CORE.TABLES.INSUMO, {
    recordId: insumoId,
    query: { returnFieldsByFieldId: 'true' },
  });
  return (insumo.fields[campoLink] as string[]) ?? [];
}

const FILTRO_LABORATORIO = `FIND('${CORE.AREA_LABORATORIO}', ARRAYJOIN({Areas Consumidoras}))`;

function aNumero(valor: unknown): number {
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function textoDeSelect(valor: unknown): string {
  if (typeof valor === 'string') return valor;
  if (valor && typeof valor === 'object' && 'name' in (valor as any)) return String((valor as any).name);
  return '';
}

function clasificarVencimiento(fecha: string | null): LoteDisponible['estadoVencimiento'] {
  if (!fecha) return 'sin_fecha';
  const hoy = new Date();
  const vence = new Date(fecha + 'T00:00:00');
  if (Number.isNaN(vence.getTime())) return 'sin_fecha';
  if (vence < hoy) return 'vencido';
  const enDosMeses = new Date(hoy);
  enDosMeses.setMonth(enDosMeses.getMonth() + 2);
  return vence <= enDosMeses ? 'proximo' : 'vigente';
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export type CategoriaInsumo = { id: string; codigo: string; nombre: string; descripcion: string };
export type UnidadMedida = { id: string; nombre: string; simbolo: string; tipo: string; factorABase: number };

export async function listarCategorias(): Promise<CategoriaInsumo[]> {
  const registros = await coreListar(CORE.TABLES.CATEGORIA_INSUMO);
  return registros
    .map((r) => ({
      id: r.id,
      codigo: String(r.fields[CORE.FIELDS_CATEGORIA.CODIGO] ?? ''),
      nombre: String(r.fields[CORE.FIELDS_CATEGORIA.TIPO_INSUMO] ?? ''),
      descripcion: String(r.fields[CORE.FIELDS_CATEGORIA.DESCRIPCION] ?? ''),
    }))
    .filter((c) => c.nombre)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export async function listarUnidades(): Promise<UnidadMedida[]> {
  const registros = await coreListar(CORE.TABLES.UNIDADES_MEDIDA);
  return registros
    .map((r) => ({
      id: r.id,
      nombre: String(r.fields[CORE.FIELDS_UNIDAD.NOMBRE] ?? ''),
      simbolo: String(r.fields[CORE.FIELDS_UNIDAD.SIMBOLO] ?? ''),
      tipo: textoDeSelect(r.fields[CORE.FIELDS_UNIDAD.TIPO]),
      factorABase: aNumero(r.fields[CORE.FIELDS_UNIDAD.FACTOR_A_BASE]),
    }))
    .filter((u) => u.nombre)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

// ---------------------------------------------------------------------------
// Inventario
// ---------------------------------------------------------------------------

export type InsumoInventario = {
  id: string;
  fields: {
    ID: string;
    nombre: string;
    categoria_insumo: string;
    categoriaId: string | null;
    unidad_medida: string;
    'Unidad Ingresa Insumo': string;
    descripcion: string;
    estado: 'Disponible' | 'Agotado';
    'Estado Insumo': string;
    'Total Cantidad Producto': number;
    'Total Actual Insumos': number;
    'Rango Minimo Stock': number;
    'Cantidad Presentacion Insumo': number;
  };
};

/**
 * Catálogo del laboratorio con su stock.
 *
 * Los nombres de campo de la salida son los que ya usaba la pantalla con la
 * tabla vieja de DataLab, para no tener que reescribir la interfaz entera:
 * `Total Actual Insumos` y `Total Cantidad Producto` llevan ambos el
 * `stock_actual` de Core, y `estado` se deriva del stock en lugar de leerse.
 */
export async function listarInsumosLaboratorio(): Promise<InsumoInventario[]> {
  const [insumos, stocks, categorias] = await Promise.all([
    coreListar(CORE.TABLES.INSUMO, FILTRO_LABORATORIO),
    coreListar(CORE.TABLES.STOCK_INSUMOS),
    listarCategorias(),
  ]);

  const nombrePorCategoria = new Map(categorias.map((c) => [c.id, c.nombre]));

  // Un insumo puede tener más de un registro de stock por errores históricos;
  // sumarlos refleja mejor la realidad que quedarse con el primero.
  const stockPorInsumo = new Map<string, number>();
  for (const s of stocks) {
    const vinculados: string[] = s.fields[F_STK.INSUMO] ?? [];
    const valor = aNumero(s.fields[F_STK.STOCK_ACTUAL]);
    for (const insumoId of vinculados) {
      stockPorInsumo.set(insumoId, (stockPorInsumo.get(insumoId) ?? 0) + valor);
    }
  }

  return insumos
    .map((r) => {
      const stock = stockPorInsumo.get(r.id) ?? 0;
      const categoriaIds: string[] = r.fields[F_INS.CATEGORIA] ?? [];
      const categoriaId = categoriaIds[0] ?? null;
      const unidad = String(r.fields[F_INS.UNIDAD_MEDIDA] ?? '');

      return {
        id: r.id,
        fields: {
          ID: String(r.fields[F_INS.CODIGO] ?? ''),
          nombre: String(r.fields[F_INS.NOMBRE] ?? ''),
          categoria_insumo: categoriaId ? (nombrePorCategoria.get(categoriaId) ?? '') : '',
          categoriaId,
          unidad_medida: unidad,
          'Unidad Ingresa Insumo': unidad,
          descripcion: String(r.fields[F_INS.FICHA_TECNICA] ?? ''),
          estado: (stock > 0 ? 'Disponible' : 'Agotado') as 'Disponible' | 'Agotado',
          'Estado Insumo': textoDeSelect(r.fields[F_INS.ESTADO]),
          'Total Cantidad Producto': stock,
          'Total Actual Insumos': stock,
          'Rango Minimo Stock': aNumero(r.fields[F_INS.STOCK_MINIMO]),
          // Core no modela presentaciones; 1 deja los cálculos de granel neutros.
          'Cantidad Presentacion Insumo': 1,
        },
      };
    })
    .sort((a, b) => a.fields.nombre.localeCompare(b.fields.nombre, 'es'));
}

// ---------------------------------------------------------------------------
// Lotes
// ---------------------------------------------------------------------------

/**
 * Lotes de un insumo con lo que queda de cada uno.
 *
 * Reemplaza al GET de `/api/entrada-insumos?disponibles=true`. Un lote es un
 * movimiento de Entrada; lo consumido son las Salidas que lo apuntan por
 * `Entrada Origen`. Se ordena por vencimiento para que el primero de la lista
 * sea el que hay que gastar antes.
 */
export async function listarLotesDisponibles(
  insumoId: string,
  incluirAgotados = false,
): Promise<LoteDisponible[]> {
  const movimientos = await coreObtenerPorIds(
    CORE.TABLES.MOVIMIENTOS_INSUMOS,
    await idsVinculados(insumoId, F_INS.MOVIMIENTOS),
  );

  const consumidoPorLote = new Map<string, number>();
  for (const m of movimientos) {
    if (textoDeSelect(m.fields[F_MOV.TIPO]) !== 'Salida') continue;
    const origenes: string[] = m.fields[F_MOV.ENTRADA_ORIGEN] ?? [];
    const cantidad = aNumero(m.fields[F_MOV.CANTIDAD]);
    for (const origen of origenes) {
      consumidoPorLote.set(origen, (consumidoPorLote.get(origen) ?? 0) + cantidad);
    }
  }

  const lotes = movimientos
    .filter((m) => textoDeSelect(m.fields[F_MOV.TIPO]) === 'Entrada')
    .map((m) => {
      const ingresada = aNumero(m.fields[F_MOV.CANTIDAD]);
      const fechaVencimiento = (m.fields[F_MOV.FECHA_VENCIMIENTO] as string) ?? null;
      return {
        id: m.id,
        codigo: String(m.fields[F_MOV.CODIGO] ?? ''),
        cantidadIngresada: ingresada,
        cantidadDisponible: ingresada - (consumidoPorLote.get(m.id) ?? 0),
        fechaMovimiento: (m.fields[F_MOV.FECHA_MOVIMIENTO] as string) ?? null,
        fechaVencimiento,
        lote: (m.fields[F_MOV.LOTE] as string) ?? null,
        estadoVencimiento: clasificarVencimiento(fechaVencimiento),
      };
    })
    .filter((l) => incluirAgotados || l.cantidadDisponible > 0);

  // Lo que vence primero se gasta primero; lo que no tiene fecha va al final.
  return lotes.sort((a, b) => {
    if (a.fechaVencimiento && b.fechaVencimiento) {
      return a.fechaVencimiento.localeCompare(b.fechaVencimiento);
    }
    if (a.fechaVencimiento) return -1;
    if (b.fechaVencimiento) return 1;
    return (a.fechaMovimiento ?? '').localeCompare(b.fechaMovimiento ?? '');
  });
}

// ---------------------------------------------------------------------------
// Escrituras
// ---------------------------------------------------------------------------

/** Deja el movimiento colgando del registro de stock del insumo, creándolo si no existe. */
async function vincularMovimientosAlStock(insumoId: string, movimientoIds: string[]): Promise<void> {
  const stocks = await coreObtenerPorIds(
    CORE.TABLES.STOCK_INSUMOS,
    await idsVinculados(insumoId, F_INS.STOCK_INSUMOS),
  );

  if (stocks.length === 0) {
    await corePedir(CORE.TABLES.STOCK_INSUMOS, {
      metodo: 'POST',
      body: { records: [{ fields: { [F_STK.INSUMO]: [insumoId], [F_STK.MOVIMIENTOS]: movimientoIds } }] },
    });
    return;
  }

  // Leer y reescribir la lista completa: un PATCH reemplaza el vínculo, no lo añade.
  const destino = stocks[0];
  const yaVinculados: string[] = destino.fields[F_STK.MOVIMIENTOS] ?? [];
  const union = [...yaVinculados, ...movimientoIds.filter((id) => !yaVinculados.includes(id))];

  await corePedir(CORE.TABLES.STOCK_INSUMOS, {
    metodo: 'PATCH',
    recordId: destino.id,
    body: { fields: { [F_STK.MOVIMIENTOS]: union } },
  });
}

export async function crearInsumo(datos: {
  nombre: string;
  categoriaId: string;
  unidadNombre: string;
  unidadId?: string | null;
  descripcion?: string;
  stockMinimo?: number;
  responsable?: string;
}): Promise<{ id: string; codigo: string }> {
  const fields: Record<string, unknown> = {
    [F_INS.NOMBRE]: datos.nombre.trim(),
    [F_INS.CATEGORIA]: [datos.categoriaId],
    [F_INS.UNIDAD_MEDIDA]: datos.unidadNombre,
    [F_INS.AREAS_CONSUMIDORAS]: [CORE.AREA_LABORATORIO],
    [F_INS.ESTADO]: 'Stock',
    [F_INS.ID_AREA_ORIGEN]: CORE.AREA_LABORATORIO,
  };

  if (datos.unidadId) fields[F_INS.UNIDAD_BASE] = [datos.unidadId];
  if (datos.stockMinimo && datos.stockMinimo > 0) fields[F_INS.STOCK_MINIMO] = datos.stockMinimo;

  const ficha = [datos.descripcion?.trim(), datos.responsable ? `Registrado por: ${datos.responsable}` : '']
    .filter(Boolean)
    .join('\n\n');
  if (ficha) fields[F_INS.FICHA_TECNICA] = ficha;

  const res = await corePedir<{ records: Registro[] }>(CORE.TABLES.INSUMO, {
    metodo: 'POST',
    body: { records: [{ fields }], typecast: false },
  });

  const creado = res.records[0];
  return { id: creado.id, codigo: String(creado.fields[F_INS.CODIGO] ?? '') };
}

export async function registrarEntrada(datos: {
  insumoId: string;
  cantidad: number;
  fechaVencimiento?: string | null;
  lote?: string | null;
  responsable?: string;
  nota?: string;
}): Promise<{ id: string; codigo: string }> {
  const hoy = new Date().toISOString().split('T')[0];
  const fields: Record<string, unknown> = {
    [F_MOV.NAME]: datos.nota || `Entrada laboratorio ${hoy}`,
    [F_MOV.CANTIDAD]: datos.cantidad,
    [F_MOV.TIPO]: 'Entrada',
    [F_MOV.FECHA_MOVIMIENTO]: hoy,
    [F_MOV.INSUMO]: [datos.insumoId],
    [F_MOV.ID_AREA_DESTINO]: CORE.AREA_LABORATORIO,
  };
  if (datos.fechaVencimiento) fields[F_MOV.FECHA_VENCIMIENTO] = datos.fechaVencimiento;
  if (datos.lote) fields[F_MOV.LOTE] = datos.lote;
  if (datos.responsable) fields[F_MOV.ID_RESPONSABLE] = datos.responsable;

  const res = await corePedir<{ records: Registro[] }>(CORE.TABLES.MOVIMIENTOS_INSUMOS, {
    metodo: 'POST',
    body: { records: [{ fields }], typecast: false },
  });

  const creado = res.records[0];
  await vincularMovimientosAlStock(datos.insumoId, [creado.id]);
  return { id: creado.id, codigo: String(creado.fields[F_MOV.CODIGO] ?? '') };
}

/**
 * Registra una salida contra un lote concreto.
 *
 * Se valida contra lo que queda de ESE lote y no contra el stock total: el punto
 * de elegir lote es no sacar de un frasco que ya se acabó mientras otro del
 * mismo reactivo todavía tiene material.
 */
export async function registrarSalida(datos: {
  insumoId: string;
  loteId: string;
  cantidad: number;
  responsable?: string;
  nota?: string;
}): Promise<{ id: string; codigo: string; disponibleRestante: number }> {
  const lotes = await listarLotesDisponibles(datos.insumoId, true);
  const lote = lotes.find((l) => l.id === datos.loteId);

  if (!lote) {
    throw new Error('El lote indicado no pertenece a este insumo');
  }
  if (datos.cantidad > lote.cantidadDisponible) {
    throw new Error(
      `El lote ${lote.codigo} solo tiene ${lote.cantidadDisponible} disponible y se pidieron ${datos.cantidad}`,
    );
  }

  const hoy = new Date().toISOString().split('T')[0];
  const fields: Record<string, unknown> = {
    [F_MOV.NAME]: datos.nota || `Salida laboratorio ${hoy}`,
    [F_MOV.CANTIDAD]: datos.cantidad,
    [F_MOV.TIPO]: 'Salida',
    [F_MOV.FECHA_MOVIMIENTO]: hoy,
    [F_MOV.INSUMO]: [datos.insumoId],
    [F_MOV.ENTRADA_ORIGEN]: [datos.loteId],
    [F_MOV.ID_AREA_ORIGEN]: CORE.AREA_LABORATORIO,
  };
  if (datos.responsable) fields[F_MOV.ID_RESPONSABLE] = datos.responsable;

  const res = await corePedir<{ records: Registro[] }>(CORE.TABLES.MOVIMIENTOS_INSUMOS, {
    metodo: 'POST',
    body: { records: [{ fields }], typecast: false },
  });

  const creado = res.records[0];
  await vincularMovimientosAlStock(datos.insumoId, [creado.id]);

  return {
    id: creado.id,
    codigo: String(creado.fields[F_MOV.CODIGO] ?? ''),
    disponibleRestante: lote.cantidadDisponible - datos.cantidad,
  };
}

/** Movimientos de un insumo, para la vista de detalle. */
export async function listarMovimientos(insumoId: string) {
  const movimientos = await coreObtenerPorIds(
    CORE.TABLES.MOVIMIENTOS_INSUMOS,
    await idsVinculados(insumoId, F_INS.MOVIMIENTOS),
  );

  return movimientos
    .map((m) => ({
      id: m.id,
      codigo: String(m.fields[F_MOV.CODIGO] ?? ''),
      nombre: String(m.fields[F_MOV.NAME] ?? ''),
      tipo: textoDeSelect(m.fields[F_MOV.TIPO]),
      cantidad: aNumero(m.fields[F_MOV.CANTIDAD]),
      fecha: (m.fields[F_MOV.FECHA_MOVIMIENTO] as string) ?? null,
      fechaVencimiento: (m.fields[F_MOV.FECHA_VENCIMIENTO] as string) ?? null,
      lote: (m.fields[F_MOV.LOTE] as string) ?? null,
      responsable: String(m.fields[F_MOV.ID_RESPONSABLE] ?? ''),
      createdTime: m.createdTime,
    }))
    .sort((a, b) => (b.fecha ?? b.createdTime).localeCompare(a.fecha ?? a.createdTime));
}
