/**
 * API temporal para cargar insumos de aseo del laboratorio a Sirius Insumos Core
 *
 * POST /api/admin/cargar-insumos-aseo
 *
 * Este endpoint crea los insumos de aseo y sus movimientos iniciales de entrada
 */

import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { SIRIUS_INSUMOS_CORE_CONFIG } from '@/lib/constants/airtable';

const base = new Airtable({ apiKey: SIRIUS_INSUMOS_CORE_CONFIG.API_KEY }).base(
  SIRIUS_INSUMOS_CORE_CONFIG.BASE_ID
);

// Insumos de aseo a cargar (de la imagen manuscrita)
const INSUMOS_ASEO = [
  { nombre: 'Mechos de trapero', cantidad: 3, unidad: 'Unidad' },
  { nombre: 'Papel v4', cantidad: 4, unidad: 'Unidad' },
  { nombre: 'Sabra', cantidad: 13, unidad: 'Unidad' },
  { nombre: 'Cloro 460ml', cantidad: 4, unidad: 'Unidad' },
  { nombre: 'Jabón Fa 500g', cantidad: 7, unidad: 'Unidad' },
  { nombre: 'Exampic 430ml', cantidad: 5, unidad: 'Unidad' },
  { nombre: 'Esponjilla', cantidad: 2, unidad: 'Unidad' },
  { nombre: 'Jabón Rey', cantidad: 2, unidad: 'Unidad' },
  { nombre: 'Jabón Axion', cantidad: 1, unidad: 'Unidad' },
  { nombre: 'Marcador ecológico', cantidad: 1, unidad: 'Unidad' },
  { nombre: 'Cepillo', cantidad: 3, unidad: 'Unidad' },
  { nombre: 'Escoba', cantidad: 3, unidad: 'Unidad' },
];

interface InsumoExistente {
  id: string;
  codigo: string;
  nombre: string;
}

interface ResultadoCarga {
  insumo: string;
  cantidad: number;
  status: 'creado' | 'existente' | 'error';
  codigo?: string;
  mensaje?: string;
  errorDetalle?: any;
}

/**
 * Busca un insumo por nombre en Sirius Insumos Core
 */
async function buscarInsumoPorNombre(nombre: string): Promise<InsumoExistente | null> {
  try {
    const records = await base(SIRIUS_INSUMOS_CORE_CONFIG.TABLES.INSUMO)
      .select({
        fields: [
          SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_INSUMO.CODIGO,
          SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_INSUMO.NOMBRE,
        ],
        filterByFormula: `AND(
          LOWER({${SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_INSUMO.NOMBRE}}) = LOWER('${nombre.replace(/'/g, "\\'")}'),
          FIND('LABORATORIO', {${SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_INSUMO.AREAS_CONSUMIDORAS}}) > 0
        )`,
        maxRecords: 1,
      })
      .all();

    if (records.length > 0) {
      return {
        id: records[0].id,
        codigo: records[0].get(SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_INSUMO.CODIGO) as string,
        nombre: records[0].get(SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_INSUMO.NOMBRE) as string,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error buscando insumo "${nombre}":`, error);
    return null;
  }
}

/**
 * Busca el record ID de la categoría "Aseo y Limpieza"
 */
async function buscarCategoriaAseo(): Promise<string | null> {
  try {
    const records = await base(SIRIUS_INSUMOS_CORE_CONFIG.TABLES.CATEGORIA_INSUMO)
      .select({
        fields: [SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_CATEGORIA.CODIGO, SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_CATEGORIA.TIPO_INSUMO],
        filterByFormula: `{${SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_CATEGORIA.TIPO_INSUMO}} = 'Aseo y Limpieza'`,
        maxRecords: 1,
      })
      .all();

    if (records.length > 0) {
      console.log(`  ✅ Categoría encontrada: ${records[0].get(SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_CATEGORIA.CODIGO)}`);
      return records[0].id;
    }

    console.error('  ❌ No se encontró la categoría "Aseo y Limpieza"');
    return null;
  } catch (error) {
    console.error('  ❌ Error buscando categoría:', error);
    if (error && typeof error === 'object' && 'error' in error) {
      console.error('  Detalle del error Airtable:', JSON.stringify(error, null, 2));
    }
    return null;
  }
}

/**
 * Crea un nuevo insumo en Sirius Insumos Core
 */
async function crearInsumo(
  nombre: string,
  unidad: string,
  categoriaId: string
): Promise<{ id: string; codigo: string; error?: any } | { error: any }> {
  try {
    const record = await base(SIRIUS_INSUMOS_CORE_CONFIG.TABLES.INSUMO).create({
      [SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_INSUMO.NOMBRE]: nombre,
      [SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_INSUMO.UNIDAD_MEDIDA]: unidad,
      [SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_INSUMO.AREAS_CONSUMIDORAS]: [SIRIUS_INSUMOS_CORE_CONFIG.AREA_LABORATORIO], // Array para multiple select
      [SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_INSUMO.CATEGORIA]: [categoriaId],
      [SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_INSUMO.ESTADO]: 'Activo',
      [SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_INSUMO.STOCK_MINIMO]: 1,
      [SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_INSUMO.FICHA_TECNICA]: `Insumo de aseo cargado el ${new Date().toISOString().split('T')[0]}`,
    });

    const codigo = record.get(SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_INSUMO.CODIGO) as string;
    return { id: record.id, codigo };
  } catch (error) {
    console.error(`❌ Error creando insumo "${nombre}":`, error);
    // Log detallado del error de Airtable
    if (error && typeof error === 'object' && 'error' in error) {
      console.error('  Detalle del error Airtable:', JSON.stringify(error, null, 2));
    }
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Crea un movimiento de entrada para el insumo
 */
async function crearMovimientoEntrada(
  insumoId: string,
  insumoNombre: string,
  cantidad: number
): Promise<boolean> {
  try {
    await base(SIRIUS_INSUMOS_CORE_CONFIG.TABLES.MOVIMIENTOS_INSUMOS).create({
      [SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_MOVIMIENTO.NAME]: `Carga inicial - ${insumoNombre}`,
      [SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_MOVIMIENTO.INSUMO]: [insumoId],
      [SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_MOVIMIENTO.CANTIDAD]: cantidad,
      [SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_MOVIMIENTO.TIPO]: 'Entrada',
      [SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_MOVIMIENTO.FECHA_MOVIMIENTO]: new Date().toISOString().split('T')[0],
      [SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_MOVIMIENTO.ID_RESPONSABLE]: 'SIRIUS-PER-0001', // David
      [SIRIUS_INSUMOS_CORE_CONFIG.FIELDS_MOVIMIENTO.ID_AREA_ORIGEN]: 'SIRIUS-AREA-0001', // Laboratorio
    });

    return true;
  } catch (error) {
    console.error(`Error creando movimiento para "${insumoNombre}":`, error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Iniciando carga de insumos de aseo a Sirius Insumos Core');

    // Buscar categoría "Aseo y Limpieza"
    const categoriaId = await buscarCategoriaAseo();
    if (!categoriaId) {
      return NextResponse.json(
        { error: 'No se encontró la categoría "Aseo y Limpieza" en Sirius Insumos Core' },
        { status: 500 }
      );
    }

    const resultados: ResultadoCarga[] = [];
    let nuevos = 0;
    let existentes = 0;
    let errores = 0;

    // Procesar cada insumo
    for (const insumo of INSUMOS_ASEO) {
      console.log(`\n📦 Procesando: ${insumo.nombre} (${insumo.cantidad} ${insumo.unidad})`);

      // Verificar si ya existe
      const existente = await buscarInsumoPorNombre(insumo.nombre);

      let insumoId: string | null = null;
      let codigo: string | undefined;
      let status: 'creado' | 'existente' | 'error';

      if (existente) {
        console.log(`  ℹ️ Ya existe: ${existente.codigo} - ${existente.nombre}`);
        insumoId = existente.id;
        codigo = existente.codigo;
        status = 'existente';
        existentes++;
      } else {
        // Crear nuevo insumo
        const nuevoInsumo = await crearInsumo(insumo.nombre, insumo.unidad, categoriaId);
        if ('error' in nuevoInsumo && !('id' in nuevoInsumo)) {
          status = 'error';
          errores++;
          resultados.push({
            insumo: insumo.nombre,
            cantidad: insumo.cantidad,
            status,
            mensaje: 'Error al crear el insumo',
            errorDetalle: nuevoInsumo.error,
          });
          continue;
        } else if ('id' in nuevoInsumo) {
          console.log(`✅ Insumo creado: ${nuevoInsumo.codigo} - ${insumo.nombre}`);
          insumoId = nuevoInsumo.id;
          codigo = nuevoInsumo.codigo;
          status = 'creado';
          nuevos++;
        } else {
          // Caso inesperado
          status = 'error';
          errores++;
          resultados.push({
            insumo: insumo.nombre,
            cantidad: insumo.cantidad,
            status,
            mensaje: 'Error inesperado al crear el insumo',
          });
          continue;
        }
      }

      // Crear movimiento de entrada con la cantidad inicial
      if (insumoId && insumo.cantidad > 0) {
        const movimientoCreado = await crearMovimientoEntrada(
          insumoId,
          insumo.nombre,
          insumo.cantidad
        );
        if (movimientoCreado) {
          console.log(`  ✅ Movimiento creado: ${insumo.cantidad} unidades`);
        } else {
          console.log(`  ⚠️ Insumo creado pero movimiento falló`);
        }
      }

      resultados.push({
        insumo: insumo.nombre,
        cantidad: insumo.cantidad,
        status,
        codigo,
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE CARGA');
    console.log('='.repeat(60));
    console.log(`Total de insumos procesados: ${INSUMOS_ASEO.length}`);
    console.log(`✅ Nuevos creados: ${nuevos}`);
    console.log(`ℹ️ Ya existentes: ${existentes}`);
    console.log(`❌ Errores: ${errores}`);
    console.log('='.repeat(60));

    return NextResponse.json({
      success: true,
      resumen: {
        total: INSUMOS_ASEO.length,
        nuevos,
        existentes,
        errores,
      },
      resultados,
    });
  } catch (error) {
    console.error('❌ Error en carga de insumos:', error);
    return NextResponse.json(
      { error: 'Error al cargar insumos', detalle: String(error) },
      { status: 500 }
    );
  }
}
