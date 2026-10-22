/**
 * Traduce una remisión de Sirius Remisiones Core a los registros que finanzas
 * lleva en Flujo de caja (`Remisiones Laboratorio` + `Productos Remisiones`).
 *
 * Solo funciones puras: la lectura de Core y la escritura en Flujo de caja viven
 * en `flujo-caja.ts`. El formato replica el de los registros que se venían
 * copiando a mano desde Core (sept–oct 2026), para que los informes de finanzas
 * no noten la diferencia entre unos y otros.
 */

/** Field IDs de la base Flujo de caja (appBNCVj4Njbyu1En). */
export const FLUJO_CAJA = {
  TABLES: {
    REMISIONES: 'tblXOG60XlxZEJFgZ',          // Remisiones Laboratorio
    PRODUCTOS: 'tblRUHGbJqVu3W8WI',           // Productos Remisiones
  },
  FIELDS_REMISION: {
    FECHA_CREACION: 'fldeTFVOn7VsCy9Zy',
    REMISION_GENERADA: 'fldr2kPqbESbMLgOV',   // URL del PDF en S3
    NUMERO_REMISION: 'fldV3eHRl6ee6xIc7',     // Mismo consecutivo de Core
    RESPONSABLE_ENTREGA: 'fld2qpJ72YKePJ2wj',
    NOMBRE_CLIENTE: 'fldNvOivTSmMEST17',
    CODIGO_CLIENTE: 'fldCkWTzlRc4sLQXK',      // CL-XXXX
    NOMBRE_RECIBE: 'fldZULtS16XKIjl3s',
    CEDULA_RECIBE: 'fldOS95zVYA1NEzpF',       // Number
    FECHA_RECIBIO: 'fldwJBtDA2UeBdzrh',
    NOMBRE_LLEVA: 'fldqqpkC58WL0uRJI',
    CEDULA_LLEVA: 'fldkhAKKxx9jGBmQt',        // Number
    FECHA_LLEVO: 'fld1fEQkfXefAdCn2',
    PRODUCTOS: 'fldOIhnBMIjHxodEa',           // Link a Productos Remisiones
    FACTURA: 'fldSci3VGO66iTnUy',             // Link a Facturacion Ingresos (lo pone finanzas)
    OBSERVACIONES: 'fld7tlX3JpVB078kR',
  },
  FIELDS_PRODUCTO: {
    FECHA_CREACION: 'fldnbVqLKIoYrDePS',      // Mueve Mes, Semana y la tarifa de referencia
    CANTIDAD: 'fldNbj9fK8XkEQHKb',            // "Cantidad Litros", aunque sea Kg
    BLOQUES: 'fld5K5L5JU2enuKF7',
    PRODUCTO_LIQUIDO: 'fldxt0ljA2glYht2K',
    PARCELAS: 'fldyorJtNb8F28oTf',
    MICROORGANISMO: 'fldvX80k0oDqrO0vy',
  },
} as const;

/**
 * La fórmula `Valor Total` de Productos Remisiones pone en 0 las líneas cuyo
 * cliente contiene "CONSUMO INTERNO". En Core el cliente interno se llama
 * "SIRIUS REGENERATIVE SOLUTIONS S.A.S ZOMAC"; con ese nombre la línea saldría
 * cobrada a tarifa de referencia.
 */
export const NOMBRE_CONSUMO_INTERNO = 'SIRIUS - CONSUMO INTERNO';

export type PersonaRemisionCore = { nombre: string; cedula: string; codigo?: string };

export type ProductoRemisionCore = { nombre: string; cantidad: number; unidad: string };

export type RemisionCore = {
  idRemision: string;            // SIRIUS-REM-0227
  idPedido: string;
  idCliente: string;
  nombreCliente: string;
  areaOrigen: string;
  estado: string;
  responsableEntrega: string;
  fechaRemision: string;         // ISO, created time de Core
  fechaDespacho?: string;        // YYYY-MM-DD
  fechaRecibido?: string;        // YYYY-MM-DD
  notas: string;
  urlDocumento: string;
  productos: ProductoRemisionCore[];
  transportista?: PersonaRemisionCore;
  receptor?: PersonaRemisionCore;
};

type Campos = Record<string, unknown>;

/** Consecutivo numérico de un ID de Core: "SIRIUS-REM-0227" → 227. */
export function numeroDeRemision(idRemision: string): number | null {
  const match = /(\d+)\s*$/.exec(idRemision || '');
  if (!match) return null;
  const numero = Number(match[1]);
  return numero > 0 ? numero : null;
}

/** "Trichoderma harzianum (L)" → "Trichoderma harzianum". Core nombra la presentación; finanzas no. */
export function nombreMicroorganismo(nombreProducto: string): string {
  return (nombreProducto || '')
    .replace(/^Producto:\s*/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
}

export function esProductoLiquido(unidad: string): boolean {
  return /^(l|lt|lts|litros?)$/i.test((unidad || '').trim());
}

/**
 * Bloques y parcelas salen de las notas de la remisión cuando las escriben con
 * la forma de siempre ("Bloque 21 parcela 1 a la 17"). Si no siguen esa forma
 * se dejan vacíos: el texto completo queda igual en Observaciones.
 */
export function extraerBloqueParcela(notas: string): { bloques?: string; parcelas?: string } {
  const primeraLinea = (notas || '').split('\n')[0].trim();
  const match = /^bloques?\s+(.+?)\s+parcelas?\s+(.+)$/i.exec(primeraLinea);
  if (!match) return {};
  return {
    bloques: match[1].trim(),
    parcelas: match[2].replace(/[.\s]+$/, '').trim(),
  };
}

/** Las cédulas en Flujo de caja son campos numéricos. */
function cedulaNumerica(cedula?: string): number | undefined {
  const digitos = (cedula || '').replace(/\D/g, '');
  return digitos ? Number(digitos) : undefined;
}

function cantidadConUnidad(cantidad: number, unidad: string): string {
  return `${cantidad}${unidad || ''}`;
}

/** "300L", o "150L + 20Kg" si la remisión mezcla unidades. */
function totalPorUnidad(productos: ProductoRemisionCore[]): string {
  const totales = new Map<string, number>();
  for (const p of productos) {
    totales.set(p.unidad || '', (totales.get(p.unidad || '') || 0) + (p.cantidad || 0));
  }
  return [...totales].map(([unidad, total]) => cantidadConUnidad(total, unidad)).join(' + ');
}

export function construirObservaciones(remision: RemisionCore): string {
  const partes = [
    remision.idRemision,
    remision.idPedido ? `Pedido: ${remision.idPedido}` : '',
    `Área origen: ${remision.areaOrigen}`,
    remision.productos.length > 0
      ? `Productos: ${remision.productos
          .map(p => `${nombreMicroorganismo(p.nombre)} ${cantidadConUnidad(p.cantidad, p.unidad)}`)
          .join(', ')}`
      : '',
    remision.productos.length > 0 ? `Total: ${totalPorUnidad(remision.productos)}` : '',
    `Estado: ${remision.estado}`,
    ...(remision.notas || '').split('\n').map(linea => linea.trim()),
    [remision.transportista?.codigo, remision.receptor?.codigo].some(Boolean)
      ? `Personal: ${[remision.transportista?.codigo, remision.receptor?.codigo].filter(Boolean).join(', ')}`
      : '',
  ];
  return partes.filter(Boolean).join(' | ');
}

function nombreClienteFlujo(remision: RemisionCore): string {
  return /sirius/i.test(remision.nombreCliente) ? NOMBRE_CONSUMO_INTERNO : remision.nombreCliente;
}

/** Campos de `Remisiones Laboratorio`, sin el vínculo a productos. */
export function construirCamposRemision(remision: RemisionCore): Campos {
  const F = FLUJO_CAJA.FIELDS_REMISION;
  const campos: Campos = {
    [F.NUMERO_REMISION]: numeroDeRemision(remision.idRemision),
    [F.FECHA_CREACION]: remision.fechaRemision,
    [F.REMISION_GENERADA]: remision.urlDocumento || undefined,
    [F.RESPONSABLE_ENTREGA]: remision.responsableEntrega.trim() || undefined,
    [F.NOMBRE_CLIENTE]: nombreClienteFlujo(remision),
    [F.CODIGO_CLIENTE]: remision.idCliente || undefined,
    [F.NOMBRE_LLEVA]: remision.transportista?.nombre.trim() || undefined,
    [F.CEDULA_LLEVA]: cedulaNumerica(remision.transportista?.cedula),
    [F.FECHA_LLEVO]: remision.fechaDespacho || undefined,
    [F.OBSERVACIONES]: construirObservaciones(remision),
  };

  // El receptor y la fecha de recibido solo cuentan cuando la remisión ya se firmó.
  if (remision.estado === 'Entregada') {
    campos[F.NOMBRE_RECIBE] = remision.receptor?.nombre.trim() || undefined;
    campos[F.CEDULA_RECIBE] = cedulaNumerica(remision.receptor?.cedula);
    campos[F.FECHA_RECIBIO] = remision.fechaRecibido || undefined;
  }

  return sinVacios(campos);
}

/** Una línea de `Productos Remisiones` por producto remitido. */
export function construirCamposProductos(remision: RemisionCore): Campos[] {
  const F = FLUJO_CAJA.FIELDS_PRODUCTO;
  const { bloques, parcelas } = extraerBloqueParcela(remision.notas);

  return remision.productos.map(p =>
    sinVacios({
      [F.FECHA_CREACION]: remision.fechaRemision,
      [F.CANTIDAD]: p.cantidad,
      [F.MICROORGANISMO]: nombreMicroorganismo(p.nombre) || undefined,
      [F.PRODUCTO_LIQUIDO]: esProductoLiquido(p.unidad),
      [F.BLOQUES]: bloques,
      [F.PARCELAS]: parcelas,
    }),
  );
}

/**
 * Qué escribir sobre un registro que ya existe en Flujo de caja (lo creó la
 * sincronización al despachar, o alguien a mano). Solo se llenan los campos
 * vacíos: lo que finanzas haya corregido no se pisa. La única excepción es el
 * estado dentro de Observaciones, que pasa de En Tránsito a Entregada.
 */
export function camposPorCompletar(existentes: Campos, remision: RemisionCore): Campos {
  const nuevos = construirCamposRemision(remision);
  const F = FLUJO_CAJA.FIELDS_REMISION;
  const cambios: Campos = {};

  for (const [campo, valor] of Object.entries(nuevos)) {
    if (campo === F.OBSERVACIONES || campo === F.FECHA_CREACION) continue;
    if (estaVacio(existentes[campo])) cambios[campo] = valor;
  }

  const observaciones = existentes[F.OBSERVACIONES];
  if (estaVacio(observaciones)) {
    cambios[F.OBSERVACIONES] = nuevos[F.OBSERVACIONES];
  } else if (
    remision.estado === 'Entregada' &&
    typeof observaciones === 'string' &&
    observaciones.includes('Estado: En Tránsito')
  ) {
    cambios[F.OBSERVACIONES] = observaciones.replace('Estado: En Tránsito', 'Estado: Entregada');
  }

  return cambios;
}

function estaVacio(valor: unknown): boolean {
  return valor === undefined || valor === null || valor === '' || (Array.isArray(valor) && valor.length === 0);
}

function sinVacios(campos: Campos): Campos {
  return Object.fromEntries(Object.entries(campos).filter(([, valor]) => !estaVacio(valor)));
}
