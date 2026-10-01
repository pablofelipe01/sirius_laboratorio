/**
 * POST /api/epp/autoentrega
 *
 * Radica en SG-SST el EPP que el colaborador acaba de retirar de la bodega,
 * con su firma. El acta, el historial y el descuento del inventario los hace
 * SG-SST; aquí se resuelve quién está pidiendo y se reenvía.
 *
 * ⚠️ **La identidad la pone el servidor, nunca el cliente.** El `idEmpleado` y
 * la cédula salen de la cookie de sesión y el cuerpo del request ni siquiera
 * los mira: si viajaran desde el navegador, cualquiera podría radicar un EPP a
 * nombre de otro. SG-SST vuelve a contrastar la cédula contra Nómina Core, de
 * modo que un error de esta app tampoco alcanzaría para firmar por un tercero.
 *
 * El middleware de DataLab no cubre `/api/`, así que la sesión se verifica acá.
 */
import { NextRequest, NextResponse } from 'next/server';
import { resolvePayload } from '@/lib/solicitudes/auth';
import {
  radicarAutoentrega,
  ErrorSGSST,
  type LineaAutoentrega,
} from '@/lib/epp/sgsst';

export const dynamic = 'force-dynamic';

interface CuerpoAutoentrega {
  motivo?: string;
  observaciones?: string;
  lineas?: LineaAutoentrega[];
  firmaData?: string;
}

/** Tope por línea; el mismo que aplica SG-SST. */
const CANTIDAD_MAXIMA_POR_LINEA = 20;

export async function POST(request: NextRequest) {
  const sesion = await resolvePayload();
  if (!sesion) {
    return NextResponse.json(
      { success: false, error: 'No autorizado' },
      { status: 401 },
    );
  }

  // Un token viejo puede no traer el ID Empleado. Sin él no hay a quién
  // atribuir la entrega, y el acta quedaría huérfana.
  if (!sesion.idCore) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Tu sesión no tiene el ID de empleado. Cierra sesión y vuelve a entrar.',
      },
      { status: 409 },
    );
  }

  try {
    const cuerpo = (await request.json()) as CuerpoAutoentrega;

    if (!cuerpo.lineas?.length) {
      return NextResponse.json(
        { success: false, error: 'Selecciona al menos un elemento' },
        { status: 400 },
      );
    }

    for (const linea of cuerpo.lineas) {
      if (
        !Number.isInteger(linea.cantidad) ||
        linea.cantidad < 1 ||
        linea.cantidad > CANTIDAD_MAXIMA_POR_LINEA
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Cantidad inválida para ${linea.nombre || linea.codigoInsumo}: debe estar entre 1 y ${CANTIDAD_MAXIMA_POR_LINEA}`,
          },
          { status: 400 },
        );
      }
    }

    if (!cuerpo.firmaData?.startsWith('data:image/')) {
      return NextResponse.json(
        { success: false, error: 'Falta la firma' },
        { status: 400 },
      );
    }

    const entrega = await radicarAutoentrega({
      idEmpleado: sesion.idCore,
      cedula: sesion.cedula,
      motivo: cuerpo.motivo ?? '',
      observaciones: cuerpo.observaciones,
      lineas: cuerpo.lineas,
      firmaData: cuerpo.firmaData,
    });

    console.log(
      `[api/epp/autoentrega] ${sesion.nombre} (${sesion.idCore}) retiró ${cuerpo.lineas.length} elemento(s) — acta ${entrega.idEntrega || entrega.entregaId}`,
    );

    return NextResponse.json({ success: true, entrega });
  } catch (error) {
    if (error instanceof ErrorSGSST) {
      console.error('[api/epp/autoentrega] SG-SST rechazó la radicación:', error.message);
      return NextResponse.json(
        { success: false, error: error.message, faltantes: error.faltantes },
        { status: error.status },
      );
    }

    console.error('[api/epp/autoentrega] Error inesperado:', error);
    return NextResponse.json(
      { success: false, error: 'Error al registrar la entrega' },
      { status: 500 },
    );
  }
}
