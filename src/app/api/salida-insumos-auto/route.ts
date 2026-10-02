/**
 * Descuento automático de insumos al registrar producción.
 *
 * Lo llaman la inoculación, la producción de cepas y la fermentación con lo que
 * consume su fórmula. Escribe en Sirius Insumos Core: una Salida por cada lote
 * tocado, apuntando a él por `Entrada Origen`. La conversión de unidades, el
 * orden por vencimiento y el todo-o-nada viven en `src/lib/insumos/core.ts`.
 *
 * Con `soloValidar: true` no escribe: devuelve qué hay disponible de cada
 * insumo. Los formularios lo usan para avisar antes de enviar, con la misma
 * regla que se aplicará al descontar.
 */

import { NextRequest, NextResponse } from 'next/server';
import { planificarConsumo, ejecutarConsumo, type SolicitudConsumo } from '@/lib/insumos/core';

type RegistroEntrante = {
  insumoId?: string;
  codigo?: string;
  cantidadSalida?: number;
  /** produccion-bacterias manda `cantidad` en vez de `cantidadSalida`. */
  cantidad?: number;
  unidad?: string;
  gramosPorUnidad?: number;
  opcional?: boolean;
  fecha?: string;
  nombreEvento?: string;
  userName?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { registros, inoculacionId, cepaId, fermentacionId, soloValidar } = body as {
      registros?: RegistroEntrante[];
      inoculacionId?: string;
      cepaId?: string;
      fermentacionId?: string;
      soloValidar?: boolean;
    };

    if (!Array.isArray(registros) || registros.length === 0) {
      return NextResponse.json({ success: false, error: 'No se recibieron registros para procesar' }, { status: 400 });
    }

    const referencia = inoculacionId
      ? `inoculación ${inoculacionId}`
      : cepaId
        ? `cepa ${cepaId}`
        : fermentacionId
          ? `fermentación ${fermentacionId}`
          : null;

    if (!referencia && !soloValidar) {
      return NextResponse.json(
        { success: false, error: 'Debe proporcionarse inoculacionId, cepaId o fermentacionId' },
        { status: 400 },
      );
    }

    const solicitudes: SolicitudConsumo[] = [];
    for (const r of registros) {
      const insumo = r.codigo || r.insumoId;
      const cantidad = Number(r.cantidadSalida ?? r.cantidad);
      if (!insumo || !Number.isFinite(cantidad) || cantidad < 0) {
        return NextResponse.json(
          { success: false, error: `Registro inválido: ${JSON.stringify({ insumo, cantidad })}` },
          { status: 400 },
        );
      }
      solicitudes.push({
        insumo,
        cantidad,
        unidad: r.unidad,
        gramosPorUnidad: r.gramosPorUnidad,
        opcional: r.opcional,
      });
    }

    const plan = await planificarConsumo(solicitudes);

    const detalle = plan.planes.map((p) => ({
      insumoId: p.insumoId,
      codigo: p.codigo,
      nombre: p.nombre,
      requerido: p.requerido,
      unidad: p.unidadCore,
      disponible: p.disponible,
      disponibleVencido: p.disponibleVencido,
      disponibleEnUnidadSolicitada: p.disponibleEnUnidadSolicitada,
      unidadSolicitada: p.unidadSolicitada,
      suficiente: p.suficiente,
      lotes: p.tomas.map((t) => ({ codigo: t.loteCodigo, cantidad: t.cantidad, vence: t.vence })),
    }));

    if (soloValidar) {
      return NextResponse.json({
        success: plan.errores.length === 0,
        detalle,
        omitidos: plan.omitidos,
        errores: plan.errores,
      });
    }

    if (plan.errores.length > 0) {
      return NextResponse.json(
        { success: false, error: plan.errores.join(' · '), errores: plan.errores, detalle, omitidos: plan.omitidos },
        { status: 409 },
      );
    }

    const primero = registros[0];
    const resultado = await ejecutarConsumo(plan.planes, {
      evento: primero.nombreEvento || 'Consumo de producción',
      referencia: referencia!,
      produccionDestino: (inoculacionId || cepaId || fermentacionId)!,
      fecha: primero.fecha,
      responsable: primero.userName || body.userName,
    });

    if (plan.omitidos.length > 0) {
      console.warn('⚠️ SALIDA-INSUMOS-AUTO: insumos omitidos', plan.omitidos);
    }

    return NextResponse.json({
      success: true,
      message: `Se registraron ${resultado.movimientos.length} salidas en Insumos Core`,
      procesados: plan.planes.length,
      total: resultado.movimientos.length,
      movimientos: resultado.movimientos,
      omitidos: plan.omitidos,
      detalle,
    });
  } catch (error) {
    console.error('❌ SALIDA-INSUMOS-AUTO:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error desconocido al descontar insumos' },
      { status: 500 },
    );
  }
}
