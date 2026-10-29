import { NextRequest, NextResponse } from 'next/server';
import { listarAreasCliente } from '@/lib/remisiones/area-cliente';

/** GET /api/areas-cliente?clienteId=CL-0001 — áreas activas del cliente (Sanidad, Ambiental…). */
export async function GET(request: NextRequest) {
  const clienteId = request.nextUrl.searchParams.get('clienteId')?.trim() ?? '';
  if (!/^CL-\d+$/.test(clienteId)) {
    return NextResponse.json({ success: false, error: 'clienteId inválido' }, { status: 400 });
  }

  try {
    const areas = await listarAreasCliente(clienteId);
    return NextResponse.json({ success: true, areas });
  } catch (error) {
    console.error('❌ Error listando áreas del cliente', clienteId, error);
    return NextResponse.json({ success: false, error: 'No se pudieron cargar las áreas del cliente' }, { status: 500 });
  }
}
