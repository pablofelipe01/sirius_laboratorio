/**
 * Configuración centralizada de tablas de Airtable
 * Mantiene todos los IDs de tablas en un lugar para fácil mantenimiento
 */

// Validación de variables de entorno requeridas
const requiredEnvVars = [
  'AIRTABLE_BASE_ID',
  'AIRTABLE_API_KEY',
  'AIRTABLE_TABLE_INOCULACION',
  'AIRTABLE_TABLE_SALIDA_INOCULACION',
  'AIRTABLE_TABLE_SALIDA_CEPAS',
  'AIRTABLE_TABLE_SALIDA_INSUMOS',
  'AIRTABLE_TABLE_MICROORGANISMOS',
  'AIRTABLE_TABLE_EQUIPO_LABORATORIO',
  'AIRTABLE_TABLE_DESCARTES',
  'AIRTABLE_TABLE_COSECHA_LABORATORIO',
  'AIRTABLE_TABLE_CEPAS',
];

// Verificar que todas las variables estén definidas
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Variables de entorno faltantes:', missingVars.join(', '));
  throw new Error(`Variables de entorno requeridas no encontradas: ${missingVars.join(', ')}`);
}

export const AIRTABLE_CONFIG = {
  BASE_ID: process.env.AIRTABLE_BASE_ID!,
  API_KEY: process.env.AIRTABLE_API_KEY!,
  
  TABLES: {
    INOCULACION: process.env.AIRTABLE_TABLE_INOCULACION!,
    SALIDA_INOCULACION: process.env.AIRTABLE_TABLE_SALIDA_INOCULACION!,
    SALIDA_CEPAS: process.env.AIRTABLE_TABLE_SALIDA_CEPAS!,
    SALIDA_INSUMOS: process.env.AIRTABLE_TABLE_SALIDA_INSUMOS!,
    MICROORGANISMOS: process.env.AIRTABLE_TABLE_MICROORGANISMOS!,
    EQUIPO_LABORATORIO: process.env.AIRTABLE_TABLE_EQUIPO_LABORATORIO!,
    DESCARTES: process.env.AIRTABLE_TABLE_DESCARTES!,
    COSECHA_LABORATORIO: process.env.AIRTABLE_TABLE_COSECHA_LABORATORIO!,
    CEPAS: process.env.AIRTABLE_TABLE_CEPAS!,
    SALIDA_FERMENTACION: process.env.AIRTABLE_TABLE_SALIDA_FERMENTACION,
    PRODUCTOS_APLICACION: process.env.AIRTABLE_TABLE_PRODUCTOS_APLICACION,
  }
} as const;

// Configuración específica para Sirius Product Core
export const SIRIUS_PRODUCT_CORE_CONFIG = {
  BASE_ID: process.env.AIRTABLE_BASE_SIRIUS_PRODUCT_CORE!,
  API_KEY: process.env.AIRTABLE_API_KEY_SIRIUS_PRODUCT_CORE!,
  
  TABLES: {
    PRODUCTOS: process.env.AIRTABLE_TABLE_SIRIUS_PRODUCTOS!,
    FORMULACIONES: process.env.AIRTABLE_TABLE_SIRIUS_FORMULACIONES!,
    CATEGORIAS_PRODUCTO: process.env.AIRTABLE_TABLE_SIRIUS_CATEGORIAS_PRODUCTO!,
    PRODUCTO_DOMINIO: process.env.AIRTABLE_TABLE_SIRIUS_PRODUCTO_DOMINIO!,
  }
} as const;

// Helper para construir URLs de la API
export const buildAirtableUrl = (tableId: string, recordId?: string, baseId?: string) => {
  const base = baseId || AIRTABLE_CONFIG.BASE_ID;
  const baseUrl = `https://api.airtable.com/v0/${base}/${tableId}`;
  return recordId ? `${baseUrl}/${recordId}` : baseUrl;
};

// Helper específico para Sirius Product Core
export const buildSiriusProductCoreUrl = (tableId: string, recordId?: string) => {
  return buildAirtableUrl(tableId, recordId, SIRIUS_PRODUCT_CORE_CONFIG.BASE_ID);
};

// Headers comunes para requests
export const getAirtableHeaders = () => ({
  'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
  'Content-Type': 'application/json',
});

// Headers específicos para Sirius Product Core
export const getSiriusProductCoreHeaders = () => ({
  'Authorization': `Bearer ${SIRIUS_PRODUCT_CORE_CONFIG.API_KEY}`,
  'Content-Type': 'application/json',
});

console.log('✅ Configuración de Airtable cargada correctamente');