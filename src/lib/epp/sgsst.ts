/**
 * Cliente de la API de SG-SST para la autoentrega de EPP.
 *
 * El EPP que un usuario de DataLab retira sale de la bodega de SST, no del
 * inventario del laboratorio: el catálogo, el descuento y el acta viven en
 * SG-SST y aquí solo se los consume. Por eso DataLab **no** habla con la base
 * de Airtable de SG-SST ni conoce sus field IDs — si duplicáramos esa lógica,
 * las dos copias se separarían en la primera corrección que se haga de un solo
 * lado.
 *
 * El token de servicio identifica a la app, nunca a la persona: SG-SST vuelve
 * a verificar la cédula contra Nómina Core antes de escribir. Por eso este
 * módulo es server-only —el token no puede viajar al navegador— y por eso
 * `radicarAutoentrega` recibe la identidad ya resuelta desde la cookie de
 * sesión, no desde el cuerpo que mandó el cliente.
 */
// Ninguna de las dos variables lleva el prefijo NEXT_PUBLIC_, así que este
// módulo solo resuelve en el servidor: importarlo desde un componente de
// cliente deja el token indefinido y la llamada falla con un 503 explícito.
const URL_SGSST = process.env.SGSST_API_URL;
const TOKEN_SERVICIO = process.env.SERVICE_TOKEN_DATALAB;

/** Error de la API remota, con el status para poder reenviarlo tal cual. */
export class ErrorSGSST extends Error {
  constructor(
    readonly status: number,
    mensaje: string,
    readonly faltantes?: FaltanteStock[],
  ) {
    super(mensaje);
    this.name = 'ErrorSGSST';
  }
}

export interface FaltanteStock {
  insumoId: string;
  nombre: string;
  solicitado: number;
  disponible: number;
}

/** Forma que expone `GET /api/insumos/epp` en SG-SST. */
export interface InsumoEPP {
  id: string;
  codigo: string;
  nombre: string;
  unidadMedida: string;
  stockMinimo: number;
  stockActual: number;
  estado: string;
  imagen: { url: string; filename: string; width?: number; height?: number } | null;
  referenciaComercial: string;
  responsable: string;
  categoriaIds: string[];
}

export interface LineaAutoentrega {
  insumoId: string;
  codigoInsumo: string;
  nombre: string;
  cantidad: number;
  talla?: string;
}

export interface DatosAutoentrega {
  /** ID Empleado de Nómina Core, tomado de la sesión. */
  idEmpleado: string;
  /** Cédula tomada de la sesión; SG-SST la verifica contra Personal. */
  cedula: string;
  motivo: string;
  observaciones?: string;
  lineas: LineaAutoentrega[];
  /** Data URL de la firma. */
  firmaData: string;
}

export interface AutoentregaRadicada {
  entregaId: string;
  idEntrega: string;
  fechaEntrega: string;
  nombreCompleto: string;
}

/**
 * Sin configuración no hay integración. Se falla con un mensaje que dice qué
 * falta, en vez de mandar un request sin token que SG-SST rechazaría con un
 * 401 que aquí no diría nada.
 */
function configuracion(): { url: string; token: string } {
  if (!URL_SGSST || !TOKEN_SERVICIO) {
    throw new ErrorSGSST(
      503,
      'La integración con SG-SST no está configurada: faltan SGSST_API_URL o SERVICE_TOKEN_DATALAB.',
    );
  }
  return { url: URL_SGSST.replace(/\/$/, ''), token: TOKEN_SERVICIO };
}

async function llamar<T>(
  ruta: string,
  init: RequestInit & { metodo?: string } = {},
): Promise<T> {
  const { url, token } = configuracion();

  let respuesta: Response;
  try {
    respuesta = await fetch(`${url}${ruta}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-service-token': token,
        ...init.headers,
      },
      cache: 'no-store',
    });
  } catch (error) {
    // SG-SST caído o inalcanzable: no es culpa de quien pide el EPP.
    console.error(`[epp/sgsst] No se pudo alcanzar ${ruta}:`, error);
    throw new ErrorSGSST(503, 'No se pudo contactar el sistema de SG-SST. Intenta de nuevo.');
  }

  let cuerpo: Record<string, unknown> = {};
  try {
    cuerpo = await respuesta.json();
  } catch {
    // Una respuesta sin JSON solo importa si además vino con error.
  }

  if (!respuesta.ok || cuerpo.success === false) {
    const mensaje =
      typeof cuerpo.message === 'string'
        ? cuerpo.message
        : `SG-SST respondió ${respuesta.status}`;
    throw new ErrorSGSST(
      respuesta.status,
      mensaje,
      cuerpo.faltantes as FaltanteStock[] | undefined,
    );
  }

  return cuerpo as T;
}

/**
 * Catálogo de EPP y dotación con el stock disponible en la bodega de SST.
 *
 * El stock viene calculado al momento de la consulta y puede quedar viejo
 * mientras el usuario llena el formulario: SG-SST lo revalida antes de
 * escribir, así que esta cifra orienta pero no autoriza.
 */
export async function traerCatalogoEpp(): Promise<InsumoEPP[]> {
  const respuesta = await llamar<{ data: InsumoEPP[] }>('/api/insumos/epp');
  return respuesta.data ?? [];
}

/** Radica la autoentrega en SG-SST: acta firmada + descuento de inventario. */
export async function radicarAutoentrega(
  datos: DatosAutoentrega,
): Promise<AutoentregaRadicada> {
  const respuesta = await llamar<{ entrega: AutoentregaRadicada }>(
    '/api/entregas-epp/autoentrega',
    { method: 'POST', body: JSON.stringify(datos) },
  );
  return respuesta.entrega;
}
