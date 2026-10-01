/**
 * Categorías y unidades de medida de Sirius Insumos Core.
 *
 * Alimenta los selectores del formulario de nuevo insumo. Antes estaban escritos
 * a mano en la pantalla y ya no coincidían con Core, que es quien valida al
 * escribir: una categoría inventada hacía fallar el POST.
 */

import { NextResponse } from 'next/server';
import { listarCategorias, listarUnidades } from '@/lib/insumos/core';

export async function GET() {
  try {
    const [categorias, unidades] = await Promise.all([listarCategorias(), listarUnidades()]);
    return NextResponse.json({ success: true, categorias, unidades });
  } catch (error) {
    console.error('❌ API INSUMOS-CATALOGO:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener el catálogo de Insumos Core',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 },
    );
  }
}
