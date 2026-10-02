/**
 * Fórmulas de consumo de insumos por bolsa, para inoculación y producción de cepas.
 *
 * Antes cada formulario tenía su propia copia con recIds de la tabla vieja de
 * DataLab. Aquí cada insumo se identifica por su código de Sirius Insumos Core,
 * que no cambia aunque se recree el registro, y las cantidades se expresan en la
 * unidad de la receta: el servidor las convierte a la unidad en que Core lleva
 * cada insumo (la melaza en kg, el cloranfenicol en pastillas).
 *
 * Este archivo lo importan componentes de cliente: no debe importar nada de
 * servidor.
 */

type InsumoProduccion = {
  codigo: string;
  nombre: string;
  descripcion: string;
  /** Unidad en que la receta expresa la cantidad. */
  unidad: 'GRAMOS' | 'MILILITROS' | 'UNIDADES';
  /** Solo si Core cuenta el insumo en unidades y la receta lo pide en gramos. */
  gramosPorUnidad?: number;
};

export const INSUMOS_PRODUCCION = {
  arroz: {
    codigo: 'SIRIUS-INS-0191',
    nombre: 'Arroz',
    descripcion: 'Arroba de arroz',
    unidad: 'GRAMOS',
  },
  cloranfenicol: {
    codigo: 'SIRIUS-INS-0107',
    nombre: 'Cloranfenicol',
    descripcion: 'Antibiótico — pastillas de 250 mg',
    unidad: 'GRAMOS',
    // Core lo cuenta en pastillas; confirmado: 250 mg cada una.
    gramosPorUnidad: 0.25,
  },
  melaza: {
    codigo: 'SIRIUS-INS-0215',
    nombre: 'Melaza',
    descripcion: 'Melaza',
    unidad: 'GRAMOS',
  },
  bolsaPolipropileno: {
    codigo: 'SIRIUS-INS-0196',
    nombre: 'Bolsa polipropileno',
    descripcion: 'Bolsas de polipropileno',
    unidad: 'UNIDADES',
  },
  tween80: {
    codigo: 'SIRIUS-INS-0160',
    nombre: 'Tween 80',
    descripcion: 'Tween 80',
    unidad: 'MILILITROS',
  },
  algodon: {
    codigo: 'SIRIUS-INS-0193',
    nombre: 'Algodón',
    descripcion: 'Algodón',
    unidad: 'GRAMOS',
  },
} as const satisfies Record<string, InsumoProduccion>;

type ClaveInsumo = keyof typeof INSUMOS_PRODUCCION;

/** Cantidad de cada insumo por bolsa, en la unidad de la receta. */
export const FORMULA_INOCULACION: Record<ClaveInsumo, number> = {
  arroz: 150,
  cloranfenicol: 0.014,
  melaza: 0.56,
  bolsaPolipropileno: 1,
  tween80: 0.028,
  algodon: 0.42,
};

export const FORMULA_CEPAS: Record<ClaveInsumo, number> = {
  arroz: 100,
  cloranfenicol: 0.009,
  melaza: 0.36,
  bolsaPolipropileno: 1,
  tween80: 0.018,
  algodon: 0.42,
};

export type ConsumoCalculado = {
  /** Código SIRIUS-INS; es lo que se manda como `insumoId` a /api/salida-insumos-auto. */
  id: string;
  nombre: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  gramosPorUnidad?: number;
};

export function calcularConsumo(formula: Record<ClaveInsumo, number>, bolsas: number): ConsumoCalculado[] {
  return (Object.keys(formula) as ClaveInsumo[]).map((clave) => {
    const insumo: InsumoProduccion = INSUMOS_PRODUCCION[clave];
    return {
      id: insumo.codigo,
      nombre: insumo.nombre,
      descripcion: insumo.descripcion,
      cantidad: formula[clave] * bolsas,
      unidad: insumo.unidad,
      gramosPorUnidad: insumo.gramosPorUnidad,
    };
  });
}
