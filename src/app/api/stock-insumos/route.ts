/**
 * Inventario de insumos del laboratorio.
 *
 * Lee y escribe en Sirius Insumos Core, no en la tabla `Insumos Laboratorio` de
 * DataLab. La forma de la respuesta se mantiene igual a la que servía esa tabla
 * para no reescribir la pantalla entera — la traducción vive en
 * `src/lib/insumos/core.ts`.
 *
 * Diferencia que importa: el stock ya no se escribe. `PUT` con operación
 * `descontar`/`recibir` crea un movimiento y deja que Core recalcule; descontar
 * exige decir de qué lote sale.
 */

import { NextRequest, NextResponse } from 'next/server';
import { debugLog } from '@/lib/debug';
import {
  listarInsumosLaboratorio,
  listarCategorias,
  listarUnidades,
  crearInsumo,
  registrarEntrada,
  registrarSalida,
} from '@/lib/insumos/core';

function errorHttp(error: unknown, mensaje: string, status = 500) {
  console.error(`❌ API STOCK-INSUMOS: ${mensaje}`, error);
  return NextResponse.json(
    { success: false, error: mensaje, details: error instanceof Error ? error.message : 'Error desconocido' },
    { status },
  );
}

export async function GET() {
  try {
    const insumos = await listarInsumosLaboratorio();
    debugLog('📊 API STOCK-INSUMOS: insumos de laboratorio en Core:', insumos.length);

    return NextResponse.json({ success: true, insumos, total: insumos.length });
  } catch (error) {
    return errorHttp(error, 'Error al obtener insumos');
  }
}

export async function POST(request: NextRequest) {
  try {
    const datos = await request.json();

    if (!datos.nombre || String(datos.nombre).trim() === '') {
      return NextResponse.json({ success: false, error: 'El nombre del insumo es requerido' }, { status: 400 });
    }

    // La pantalla nueva manda los ids de Core; se aceptan los nombres por si
    // queda alguna vista vieja enviando texto.
    const [categorias, unidades] = await Promise.all([listarCategorias(), listarUnidades()]);

    const categoria =
      categorias.find((c) => c.id === datos.categoriaId) ??
      categorias.find((c) => c.nombre.toLowerCase() === String(datos.categoria_insumo ?? '').toLowerCase());

    if (!categoria) {
      return NextResponse.json(
        {
          success: false,
          error: 'Categoría no válida',
          details: `No se encontró "${datos.categoriaId ?? datos.categoria_insumo}" en Insumos Core`,
          categoriasDisponibles: categorias.map((c) => ({ id: c.id, nombre: c.nombre })),
        },
        { status: 400 },
      );
    }

    const unidad =
      unidades.find((u) => u.id === datos.unidadId) ??
      unidades.find(
        (u) =>
          u.nombre.toLowerCase() === String(datos.unidad_medida ?? '').toLowerCase() ||
          u.simbolo.toLowerCase() === String(datos.unidad_medida ?? '').toLowerCase(),
      );

    if (!unidad) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unidad de medida no válida',
          details: `No se encontró "${datos.unidadId ?? datos.unidad_medida}" en el catálogo de Core`,
          unidadesDisponibles: unidades.map((u) => ({ id: u.id, nombre: u.nombre, simbolo: u.simbolo })),
        },
        { status: 400 },
      );
    }

    const insumo = await crearInsumo({
      nombre: String(datos.nombre),
      categoriaId: categoria.id,
      unidadNombre: unidad.nombre,
      unidadId: unidad.id,
      descripcion: datos.descripcion,
      stockMinimo: Number(datos.rangoMinimoStock) || 0,
      responsable: datos.realizaRegistro,
    });

    // El stock inicial es un movimiento de Entrada, no un número en el insumo.
    let entrada = null;
    const cantidadInicial = Number(datos.cantidadInicial);
    if (cantidadInicial > 0) {
      entrada = await registrarEntrada({
        insumoId: insumo.id,
        cantidad: cantidadInicial,
        fechaVencimiento: datos.fechaVencimiento || null,
        lote: datos.lote || null,
        responsable: datos.realizaRegistro,
        nota: `Stock inicial ${insumo.codigo}`,
      });
    }

    return NextResponse.json({
      success: true,
      insumo: { id: insumo.id, codigo: insumo.codigo },
      entrada,
      message: `Insumo ${insumo.codigo} creado en Insumos Core`,
    });
  } catch (error) {
    return errorHttp(error, 'Error al crear insumo');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, operacion, ...datos } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID del insumo es requerido' }, { status: 400 });
    }

    const cantidad = Number(datos.cantidad);
    if (!cantidad || cantidad <= 0) {
      return NextResponse.json({ success: false, error: 'La cantidad debe ser mayor a 0' }, { status: 400 });
    }

    if (operacion === 'descontar') {
      if (!datos.loteId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Falta el lote',
            details: 'Descontar exige decir de qué lote sale el material. Consulta /api/insumos-lotes?insumoId=…',
          },
          { status: 400 },
        );
      }

      const salida = await registrarSalida({
        insumoId: id,
        loteId: datos.loteId,
        cantidad,
        responsable: datos.realizaRegistro,
        nota: datos.motivo,
      });

      return NextResponse.json({
        success: true,
        message: 'Salida registrada',
        movimiento: salida,
        disponibleRestante: salida.disponibleRestante,
      });
    }

    if (operacion === 'recibir') {
      const entrada = await registrarEntrada({
        insumoId: id,
        cantidad,
        fechaVencimiento: datos.fechaVencimiento || null,
        lote: datos.lote || null,
        responsable: datos.realizaRegistro,
        nota: datos.observaciones,
      });

      return NextResponse.json({ success: true, message: 'Entrada registrada', movimiento: entrada });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Operación no reconocida',
        details: 'Usa operacion: "descontar" o "recibir". El stock en Core se cambia con movimientos.',
      },
      { status: 400 },
    );
  } catch (error) {
    return errorHttp(error, 'Error en operación de stock', 400);
  }
}
