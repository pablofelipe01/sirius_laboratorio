// Catálogo central de categorías de "Manejo Residuos".
// Las claves DEBEN coincidir EXACTAMENTE con las opciones del singleSelect
// `Tipo Residuo` en la tabla Airtable `Manejo Residuos` (base DataLab).

export type CategoriaResiduoKey =
  | 'aprovechables'
  | 'organicos'
  | 'peligrosos'
  | 'noAprovechables';

export interface CategoriaResiduo {
  key: CategoriaResiduoKey;
  /** Valor literal del singleSelect en Airtable. NO modificar sin actualizar la base. */
  airtableValue: string;
  label: string;
  emoji: string;
  /** Clases Tailwind para tarjetas / badges */
  cardClass: string;
  badgeClass: string;
  ringClass: string;
  /** Sugerencias de subtipos típicos de un laboratorio microbiológico */
  sugerencias: string[];
}

export const CATEGORIAS_RESIDUOS: CategoriaResiduo[] = [
  {
    key: 'aprovechables',
    airtableValue: '♻️ Residuos Aprovechables',
    label: 'Aprovechables',
    emoji: '♻️',
    cardClass: 'from-blue-50 to-blue-100 border-blue-200',
    badgeClass: 'bg-blue-100 text-blue-800',
    ringClass: 'focus:ring-blue-500',
    sugerencias: ['Cartón', 'Plástico PET', 'Vidrio', 'Papel', 'Aluminio'],
  },
  {
    key: 'organicos',
    airtableValue: '🥬 Residuos Orgánicos',
    label: 'Orgánicos',
    emoji: '🥬',
    cardClass: 'from-green-50 to-green-100 border-green-200',
    badgeClass: 'bg-green-100 text-green-800',
    ringClass: 'focus:ring-green-500',
    sugerencias: ['Sustrato usado', 'Restos de medio de cultivo', 'Biomasa descartada'],
  },
  {
    key: 'peligrosos',
    airtableValue: '☢️ Residuos Peligrosos',
    label: 'Peligrosos',
    emoji: '☢️',
    cardClass: 'from-cyan-50 to-cyan-100 border-cyan-200',
    badgeClass: 'bg-cyan-100 text-cyan-800',
    ringClass: 'focus:ring-cyan-500',
    sugerencias: ['Bolsas con cultivo contaminado', 'Reactivos vencidos', 'Material cortopunzante'],
  },
  {
    key: 'noAprovechables',
    airtableValue: '🗑️ Residuos No Aprovechables',
    label: 'No Aprovechables',
    emoji: '🗑️',
    cardClass: 'from-teal-50 to-teal-100 border-teal-200',
    badgeClass: 'bg-teal-100 text-teal-800',
    ringClass: 'focus:ring-teal-500',
    sugerencias: ['Empaques contaminados', 'Guantes', 'Tapabocas'],
  },
];

export const CATEGORIAS_BY_KEY: Record<CategoriaResiduoKey, CategoriaResiduo> =
  CATEGORIAS_RESIDUOS.reduce((acc, c) => {
    acc[c.key] = c;
    return acc;
  }, {} as Record<CategoriaResiduoKey, CategoriaResiduo>);

/** Subtipo declarado por el usuario dentro de una categoría. */
export interface SubtipoResiduo {
  id: string;
  nombre: string;
  cantidadKg: number | string;
}

/** Payload para POST /api/manejo-residuos */
export interface ResiduoRecordInput {
  residuo: string;
  cantidadKg: number;
  tipoResiduo: string; // airtableValue
  entregadoA?: string;
  observaciones?: string;
  realizaRegistro?: string;
}
