import { NextRequest, NextResponse } from 'next/server';
import { bacteriaDeProducto, fermentacionesDisponibles } from '@/lib/inventario/respaldo-bacterias';

/**
 * GET /api/fermentacion/disponibles?productoId=SIRIUS-PRODUCT-XXXX
 *
 * Las fermentaciones que pueden respaldar una entrada de ese producto.
 * `requiereRespaldo: false` cuando el producto no es una bacteria.
 */
export async function GET(request: NextRequest) {
  const productoId = request.nextUrl.searchParams.get('productoId')?.trim();
  if (!productoId) {
    return NextResponse.json({ success: false, error: 'Se requiere productoId' }, { status: 400 });
  }

  try {
    const bacteria = await bacteriaDeProducto(productoId);
    if (!bacteria) {
      return NextResponse.json({ success: true, requiereRespaldo: false, fermentaciones: [] });
    }
    return NextResponse.json({
      success: true,
      requiereRespaldo: true,
      microorganismo: bacteria.nombre,
      fermentaciones: await fermentacionesDisponibles(bacteria.id),
    });
  } catch (error) {
    console.error('❌ Error consultando fermentaciones disponibles:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudieron consultar las fermentaciones disponibles' },
      { status: 500 },
    );
  }
}
