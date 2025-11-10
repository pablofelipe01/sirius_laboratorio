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
  }
} as const;

// Helper para construir URLs de la API
export const buildAirtableUrl = (tableId: string, recordId?: string) => {
  const baseUrl = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.BASE_ID}/${tableId}`;
  return recordId ? `${baseUrl}/${recordId}` : baseUrl;
};

// Headers comunes para requests
export const getAirtableHeaders = () => ({
  'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
  'Content-Type': 'application/json',
});

console.log('✅ Configuración de Airtable cargada correctamente');