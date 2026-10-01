/**
 * GET /api/epp/catalogo
 *
 * Catálogo de EPP y dotación de la bodega de SST, para la pantalla de
 * autoentrega. Es un reenvío a SG-SST: DataLab no guarda este inventario.
 *
 * ⚠️ El middleware de DataLab **no cubre `/api/`** (su matcher lo excluye), así
 * que la sesión se verifica aquí. Sin esta comprobación el endpoint quedaría
 * abierto, y con él el token de servicio que lleva por dentro.
 */
import { NextResponse } from 'next/server';
import { resolvePayload } from '@/lib/solicitudes/auth';
import { traerCatalogoEpp, ErrorSGSST } from '@/lib/epp/sgsst';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sesion = await resolvePayload();
  if (!sesion) {
    return NextResponse.json(
      { success: false, error: 'No autorizado' },
      { status: 401 },
    );
  }

  try {
    const insumos = await traerCatalogoEpp();

    // Lo agotado se manda igual, marcado: que el usuario vea que el elemento
    // existe pero no hay, en vez de creer que nunca se maneja.
    return NextResponse.json({ success: true, data: insumos });
  } catch (error) {
    if (error instanceof ErrorSGSST) {
      console.error('[api/epp/catalogo] SG-SST respondió con error:', error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }

    console.error('[api/epp/catalogo] Error inesperado:', error);
    return NextResponse.json(
      { success: false, error: 'Error al consultar el catálogo de EPP' },
      { status: 500 },
    );
  }
}
