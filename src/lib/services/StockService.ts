import { 
  SIRIUS_INVENTARIO_CONFIG, 
  buildSiriusInventarioUrl, 
  getSiriusInventarioHeaders 
} from '@/lib/constants/airtable';

export interface ProductStock {
  productId: string;
  stockActual: number;
  ubicacion?: string;
  ultimaActualizacion?: string;
}

export interface StockValidation {
  productoId: string;
  solicitado: number;
  disponible: number;
  suficiente: boolean;
}

export interface ProductoPedido {
  productoId: string;
  cantidad: number;
  unidad: string;
}

export class StockService {
  
  /**
   * Obtener stock actual de un producto específico
   */
  static async getProductStock(productId: string): Promise<number> {
    try {
      console.log(`📦 Consultando stock para producto: ${productId}`);
      
      // Consultar tabla Stock_Actual en Sirius Inventario
      const filterFormula = `{${SIRIUS_INVENTARIO_CONFIG.FIELDS_STOCK.PRODUCTO_ID}}="${productId}"`;
      const url = buildSiriusInventarioUrl(
        `${SIRIUS_INVENTARIO_CONFIG.TABLES.STOCK_ACTUAL}?filterByFormula=${encodeURIComponent(filterFormula)}`
      );
      
      const response = await fetch(url, {
        headers: getSiriusInventarioHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Error consultando stock: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.records && data.records.length > 0) {
        const stockActual = data.records[0].fields[SIRIUS_INVENTARIO_CONFIG.FIELDS_STOCK.STOCK_ACTUAL] || 0;
        console.log(`📊 Stock encontrado para ${productId}: ${stockActual}`);
        return stockActual;
      }
      
      console.log(`⚠️ No se encontró stock para producto: ${productId}`);
      return 0;
      
    } catch (error) {
      console.error(`❌ Error consultando stock para ${productId}:`, error);
      return 0; // Asumir sin stock en caso de error
    }
  }
  
  /**
   * Validar stock disponible para múltiples productos
   */
  static async validateStockForProducts(productos: ProductoPedido[]): Promise<{
    productos: StockValidation[];
    allAvailable: boolean;
    totalProductos: number;
    productosDisponibles: number;
  }> {
    console.log(`🔍 Validando stock para ${productos.length} productos`);
    
    const validaciones = await Promise.all(
      productos.map(async (producto): Promise<StockValidation> => {
        const stockDisponible = await this.getProductStock(producto.productoId);
        
        return {
          productoId: producto.productoId,
          solicitado: producto.cantidad,
          disponible: stockDisponible,
          suficiente: stockDisponible >= producto.cantidad
        };
      })
    );
    
    const productosDisponibles = validaciones.filter(v => v.suficiente).length;
    const allAvailable = validaciones.every(v => v.suficiente);
    
    console.log(`📋 Validación stock: ${productosDisponibles}/${productos.length} productos disponibles`);
    
    return {
      productos: validaciones,
      allAvailable,
      totalProductos: productos.length,
      productosDisponibles
    };
  }
  
  /**
   * Verificar si hay stock suficiente para un producto específico
   */
  static async hasStockAvailable(productId: string, quantity: number): Promise<boolean> {
    const stockActual = await this.getProductStock(productId);
    return stockActual >= quantity;
  }
  
  /**
   * Obtener lista completa de productos con stock
   */
  static async getAllProductsStock(): Promise<ProductStock[]> {
    try {
      console.log('📦 Obteniendo stock de todos los productos');
      
      const response = await fetch(
        buildSiriusInventarioUrl(SIRIUS_INVENTARIO_CONFIG.TABLES.STOCK_ACTUAL),
        { headers: getSiriusInventarioHeaders() }
      );
      
      if (!response.ok) {
        throw new Error(`Error obteniendo stock: ${response.status}`);
      }
      
      const data = await response.json();
      
      return data.records.map((record: any) => ({
        productId: record.fields[SIRIUS_INVENTARIO_CONFIG.FIELDS_STOCK.PRODUCTO_ID] || '',
        stockActual: record.fields[SIRIUS_INVENTARIO_CONFIG.FIELDS_STOCK.STOCK_ACTUAL] || 0,
        ubicacion: record.fields[SIRIUS_INVENTARIO_CONFIG.FIELDS_STOCK.UBICACION_ID] || '',
        ultimaActualizacion: record.fields[SIRIUS_INVENTARIO_CONFIG.FIELDS_STOCK.ULTIMA_ACTUALIZACION] || ''
      }));
      
    } catch (error) {
      console.error('❌ Error obteniendo stock de productos:', error);
      return [];
    }
  }
}