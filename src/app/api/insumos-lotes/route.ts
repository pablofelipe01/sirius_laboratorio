/**
 * Lotes disponibles de un insumo.
 *
 * Sustituye a `/api/entrada-insumos?disponibles=true`, que leía la tabla
 * `Entrada Insumos` de DataLab. En Core un lote es un movimiento de tipo Entrada
 * y lo que queda de él se calcula restando las Salidas que lo apuntan.
 *
 * Vienen ordenados por vencimiento: el primero de la lista es el que hay que
 * gastar antes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { listarLotesDisponibles } from '@/lib/insumos/core';

export async function GET(request: NextRequest) {
  try {
    const insumoId = request.nextUrl.searchParams.get('insumoId');
    const incluirAgotados = request.nextUrl.searchParams.get('incluirAgotados') === 'true';

    if (!insumoId) {
      return NextResponse.json({ success: false, error: 'Falta el parámetro insumoId' }, { status: 400 });
    }

    const lotes = await listarLotesDisponibles(insumoId, incluirAgotados);

    return NextResponse.json({
      success: true,
      lotes,
      total: lotes.length,
      totalDisponible: lotes.reduce((suma, l) => suma + l.cantidadDisponible, 0),
    });
  } catch (error) {
    console.error('❌ API INSUMOS-LOTES:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener los lotes del insumo',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 },
    );
  }
}
