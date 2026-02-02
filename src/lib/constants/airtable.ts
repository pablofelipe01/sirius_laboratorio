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

// Variables de entorno opcionales para nuevas bases (no bloquean el inicio)
const optionalEnvVars = [
  // Sirius Inventario Production Core
  'AIRTABLE_BASE_SIRIUS_INVENTARIO',
  'AIRTABLE_API_KEY_SIRIUS_INVENTARIO',
];

// Verificar que todas las variables estén definidas
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Variables de entorno faltantes:', missingVars.join(', '));
  throw new Error(`Variables de entorno requeridas no encontradas: ${missingVars.join(', ')}`);
}

// Advertir sobre variables opcionales faltantes
const missingOptional = optionalEnvVars.filter(varName => !process.env[varName]);
if (missingOptional.length > 0) {
  console.warn('⚠️ Variables de entorno opcionales no configuradas:', missingOptional.join(', '));
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
  },
  
  // Field IDs para tabla Cosecha Laboratorio
  FIELDS_COSECHA: {
    ID_RESPONSABLE_CORE: process.env.AIRTABLE_FIELD_COSECHA_ID_RESPONSABLE_CORE!, // Texto con SIRIUS-PER-XXXX
    ID_PEDIDO_CORE: process.env.AIRTABLE_FIELD_COSECHA_ID_PEDIDO_CORE!, // Texto con SIRIUS-PED-XXXX
    ID_PRODUCTO_CORE: process.env.AIRTABLE_FIELD_COSECHA_ID_PRODUCTO_CORE!, // Long text con SIRIUS-PRODUCT-XXXX
  }
} as const;

// Configuración específica para Sirius Product Core
export const SIRIUS_PRODUCT_CORE_CONFIG = {
  BASE_ID: process.env.AIRTABLE_BASE_ID_SIRIUS_PRODUCT_CORE!,
  API_KEY: process.env.AIRTABLE_API_KEY_SIRIUS_PRODUCT_CORE!,
  
  TABLES: {
    PRODUCTOS: process.env.AIRTABLE_TABLE_PRODUCTOS!,
    FORMULACIONES: process.env.AIRTABLE_TABLE_SIRIUS_FORMULACIONES!,
    CATEGORIAS_PRODUCTO: process.env.AIRTABLE_TABLE_SIRIUS_CATEGORIAS_PRODUCTO!,
    PRODUCTO_DOMINIO: process.env.AIRTABLE_TABLE_SIRIUS_PRODUCTO_DOMINIO!,
  }
} as const;

// ============================================================================
// Configuración para Sirius Pedidos Core
// Sistema de gestión de pedidos de clientes
// ============================================================================
export const SIRIUS_PEDIDOS_CORE_CONFIG = {
  BASE_ID: process.env.AIRTABLE_BASE_ID_SIRIUS_PEDIDOS_CORE!,
  API_KEY: process.env.AIRTABLE_API_KEY_SIRIUS_PEDIDOS_CORE!,
  
  TABLES: {
    PEDIDOS: process.env.AIRTABLE_TABLE_PEDIDOS_CORE!,
    PRODUCTOS: process.env.AIRTABLE_TABLE_PRODUCTOS_PEDIDOS!,
    DETALLES_PEDIDO: process.env.AIRTABLE_TABLE_DETALLES_PEDIDO!,
  },
  
  // Field IDs para tabla Pedidos
  FIELDS_PEDIDOS: {
    ID_PEDIDO_CORE: process.env.AIRTABLE_FIELD_PEDIDO_ID_CORE!,       // Fórmula: "SIRIUS-PED-0001"
    ID: process.env.AIRTABLE_FIELD_PEDIDO_ID_AUTO!,                    // Auto Number
    ID_CLIENTE_CORE: process.env.AIRTABLE_FIELD_PEDIDO_ID_CLIENTE_CORE!, // Text: ID del cliente
    FECHA_PEDIDO: process.env.AIRTABLE_FIELD_PEDIDO_FECHA!,           // Date and time
    ORIGEN_PEDIDO: process.env.AIRTABLE_FIELD_PEDIDO_ORIGEN!,         // Single select: DataLab, PiroliApp
    ESTADO: process.env.AIRTABLE_FIELD_PEDIDO_ESTADO!,                // Single select: Recibido, Procesando, etc.
    NOTAS: process.env.AIRTABLE_FIELD_PEDIDO_NOTAS!,                  // Long text
    ADJUNTOS: process.env.AIRTABLE_FIELD_PEDIDO_ADJUNTOS!,            // Attachment
    DETALLES_PEDIDO: process.env.AIRTABLE_FIELD_PEDIDO_DETALLES!,     // Link to Detalles
  },
  
  // Field IDs para tabla Productos
  FIELDS_PRODUCTOS: {
    ID_PRODUCTO_PEDIDO: process.env.AIRTABLE_FIELD_PRODUCTO_PED_ID!,  // Fórmula: "SIRIUS-PED-PRO-0001"
    ID: process.env.AIRTABLE_FIELD_PRODUCTO_PED_ID_AUTO!,              // Auto Number
    NOMBRE: process.env.AIRTABLE_FIELD_PRODUCTO_PED_NOMBRE!,          // Text
    ID_PRODUCTO_CORE: process.env.AIRTABLE_FIELD_PRODUCTO_PED_ID_CORE!, // Text: ID del producto en Product Core
    PRECIO_UNITARIO: process.env.AIRTABLE_FIELD_PRODUCTO_PED_PRECIO!,  // Currency
    EN_STOCK: process.env.AIRTABLE_FIELD_PRODUCTO_PED_STOCK!,          // Number
    DESCRIPCION: process.env.AIRTABLE_FIELD_PRODUCTO_PED_DESCRIPCION!, // Long text
    IMAGEN: process.env.AIRTABLE_FIELD_PRODUCTO_PED_IMAGEN!,           // Attachment
    DETALLES_PEDIDO: process.env.AIRTABLE_FIELD_PRODUCTO_PED_DETALLES!, // Link to Detalles
  },
  
  // Field IDs para tabla Detalles del Pedido
  FIELDS_DETALLES: {
    DETALLE_ID: process.env.AIRTABLE_FIELD_DETALLE_PED_ID!,           // Auto Number
    PEDIDO: process.env.AIRTABLE_FIELD_DETALLE_PED_PEDIDO!,           // Link to Pedidos
    PRODUCTO: process.env.AIRTABLE_FIELD_DETALLE_PED_PRODUCTO!,       // Link to Productos
    CANTIDAD: process.env.AIRTABLE_FIELD_DETALLE_PED_CANTIDAD!,       // Number
    PRECIO_UNITARIO: process.env.AIRTABLE_FIELD_DETALLE_PED_PRECIO_UNITARIO!, // Currency
    SUBTOTAL: process.env.AIRTABLE_FIELD_DETALLE_PED_SUBTOTAL!,       // Currency
    NOTAS: process.env.AIRTABLE_FIELD_DETALLE_PED_NOTAS!,             // Long text
    PRODUCTO_LISTO: process.env.AIRTABLE_FIELD_DETALLE_PED_PRODUCTO_LISTO!, // Checkbox
  },
  
  // Valores permitidos para Origen del Pedido
  ORIGENES_PEDIDO: [
    'DataLab (Laboratorio)',
    'PiroliApp (Pirolisis)'
  ] as const,
  
  // Valores permitidos para Estado
  ESTADOS_PEDIDO: [
    'Recibido',
    'Procesando',
    'Enviado',
    'Completado',
    'Cancelado'
  ] as const,
} as const;

// Tipos para Sirius Pedidos Core
export type OrigenPedido = typeof SIRIUS_PEDIDOS_CORE_CONFIG.ORIGENES_PEDIDO[number];
export type EstadoPedido = typeof SIRIUS_PEDIDOS_CORE_CONFIG.ESTADOS_PEDIDO[number];

// ============================================================================
// Configuración para Sirius Inventario Production Core
// ============================================================================
export const SIRIUS_INVENTARIO_CONFIG = {
  BASE_ID: process.env.AIRTABLE_BASE_SIRIUS_INVENTARIO!,
  API_KEY: process.env.AIRTABLE_API_KEY_SIRIUS_INVENTARIO!,
  
  TABLES: {
    MOVIMIENTOS_INVENTARIO: process.env.AIRTABLE_TABLE_MOVIMIENTOS_INVENTARIO!,
    STOCK_ACTUAL: process.env.AIRTABLE_TABLE_STOCK_ACTUAL!,
  },
  
  // Field IDs para Movimientos_Inventario
  FIELDS_MOVIMIENTOS: {
    ID_MOVIMIENTO: process.env.AIRTABLE_FIELD_MOVIMIENTO_ID!,
    ID: process.env.AIRTABLE_FIELD_MOVIMIENTO_ID_AUTO!,
    PRODUCT_ID: process.env.AIRTABLE_FIELD_MOVIMIENTO_PRODUCT_ID!,
    UBICACION_ORIGEN_ID: process.env.AIRTABLE_FIELD_MOVIMIENTO_UBICACION_ORIGEN!,
    UBICACION_DESTINO_ID: process.env.AIRTABLE_FIELD_MOVIMIENTO_UBICACION_DESTINO!,
    TIPO_MOVIMIENTO: process.env.AIRTABLE_FIELD_MOVIMIENTO_TIPO!,
    CANTIDAD: process.env.AIRTABLE_FIELD_MOVIMIENTO_CANTIDAD!,
    UNIDAD_MEDIDA: process.env.AIRTABLE_FIELD_MOVIMIENTO_UNIDAD_MEDIDA!,
    MOTIVO: process.env.AIRTABLE_FIELD_MOVIMIENTO_MOTIVO!,
    DOCUMENTO_REFERENCIA: process.env.AIRTABLE_FIELD_MOVIMIENTO_DOCUMENTO_REF!,
    RESPONSABLE: process.env.AIRTABLE_FIELD_MOVIMIENTO_RESPONSABLE!,
    FECHA_MOVIMIENTO: process.env.AIRTABLE_FIELD_MOVIMIENTO_FECHA!,
    FECHA_REGISTRO: process.env.AIRTABLE_FIELD_MOVIMIENTO_FECHA_REGISTRO!,
    OBSERVACIONES: process.env.AIRTABLE_FIELD_MOVIMIENTO_OBSERVACIONES!,
  },
  
  // Field IDs para Stock_Actual
  FIELDS_STOCK: {
    ID_STOCK: process.env.AIRTABLE_FIELD_STOCK_ID!,
    ID: process.env.AIRTABLE_FIELD_STOCK_ID_AUTO!,
    STOCK_ACTUAL: process.env.AIRTABLE_FIELD_STOCK_ACTUAL!,
    ULTIMA_ACTUALIZACION: process.env.AIRTABLE_FIELD_STOCK_ULTIMA_ACTUALIZACION!,
    PRODUCTO_ID: process.env.AIRTABLE_FIELD_STOCK_PRODUCTO_ID!,
    UBICACION_ID: process.env.AIRTABLE_FIELD_STOCK_UBICACION_ID!,
  },
  
  // Valores permitidos para tipo_movimiento
  TIPOS_MOVIMIENTO: [
    'Entrada',
    'Salida', 
    'Transferencia',
    'Ajuste',
    'Merma',
    'Devolución'
  ] as const,
} as const;

// Tipo para los tipos de movimiento
export type TipoMovimiento = typeof SIRIUS_INVENTARIO_CONFIG.TIPOS_MOVIMIENTO[number];

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

// Helper específico para Sirius Inventario Production Core
export const buildSiriusInventarioUrl = (tableId: string, recordId?: string) => {
  return buildAirtableUrl(tableId, recordId, SIRIUS_INVENTARIO_CONFIG.BASE_ID);
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

// Headers específicos para Sirius Inventario Production Core
export const getSiriusInventarioHeaders = () => ({
  'Authorization': `Bearer ${SIRIUS_INVENTARIO_CONFIG.API_KEY}`,
  'Content-Type': 'application/json',
});

// Helper específico para Sirius Pedidos Core
export const buildSiriusPedidosCoreUrl = (tableId: string, recordId?: string) => {
  return buildAirtableUrl(tableId, recordId, SIRIUS_PEDIDOS_CORE_CONFIG.BASE_ID);
};

// Headers específicos para Sirius Pedidos Core
export const getSiriusPedidosCoreHeaders = () => ({
  'Authorization': `Bearer ${SIRIUS_PEDIDOS_CORE_CONFIG.API_KEY}`,
  'Content-Type': 'application/json',
});

console.log('✅ Configuración de Airtable cargada correctamente');