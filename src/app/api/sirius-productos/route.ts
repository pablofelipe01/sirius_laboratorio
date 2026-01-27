import { NextResponse } from 'next/server';
import { SIRIUS_PRODUCT_CORE_CONFIG, getSiriusProductCoreHeaders } from '@/lib/constants/airtable';

interface SiriusProducto {
  id: string;
  fields: {
    'Codigo Producto'?: string;
    'Nombre Comercial'?: string;
    'Categoria Producto'?: string[];
    'Tipo Producto'?: string;
    'Unidad Base'?: string;
    'Activo'?: string;
    'Observaciones'?: string;
    'ID'?: number;
  };
  createdTime: string;
}

interface FormattedProducto {
  id: string;
  airtableId: string;
  codigo: string;
  nombre: string;
  categoria: string[];
  tipo: string;
  unidadBase: string;
  activo: boolean;
  observaciones?: string;
  idNumerico: number;
  fechaCreacion: string;
}

export async function GET() {
  try {
    console.log('🔍 Obteniendo productos de Sirius Product Core...');
    
    // Construir la URL para la tabla de productos
    const url = `https://api.airtable.com/v0/${SIRIUS_PRODUCT_CORE_CONFIG.BASE_ID}/${SIRIUS_PRODUCT_CORE_CONFIG.TABLES.PRODUCTOS}`;
    
    const response = await fetch(url, {
      headers: getSiriusProductCoreHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Error de Airtable:', response.status, errorData);
      throw new Error(`Error ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    console.log('✅ Datos recibidos de Airtable:', {
      recordCount: data.records?.length || 0,
      offset: data.offset || 'none'
    });

    // Formatear los datos para que coincidan con la interfaz esperada
    const productos: FormattedProducto[] = data.records.map((record: SiriusProducto) => ({
      id: record.id,
      airtableId: record.id,
      codigo: record.fields['Codigo Producto'] || '',
      nombre: record.fields['Nombre Comercial'] || '',
      categoria: record.fields['Categoria Producto'] || [],
      tipo: record.fields['Tipo Producto'] || '',
      unidadBase: record.fields['Unidad Base'] || 'L',
      activo: record.fields['Activo'] === 'Sí',
      observaciones: record.fields['Observaciones'],
      idNumerico: record.fields['ID'] || 0,
      fechaCreacion: record.createdTime
    }));

    // Filtrar solo productos activos, que sean hongos Y líquidos
    const productosActivos = productos.filter(producto => {
      // Verificar si es activo y tipo hongo
      const esActivoYHongo = producto.activo && producto.tipo === 'Hongo';
      if (!esActivoYHongo) return false;
      
      // Verificar si es líquido por diferentes criterios
      const esLiquido = 
        producto.unidadBase === 'L' || // Unidad en litros
        (Array.isArray(producto.categoria) && 
         producto.categoria.some(cat => cat && cat.toLowerCase().includes('liquid'))) || // Categoría líquida
        producto.nombre.toLowerCase().includes('liquid') || // Nombre contiene líquido
        (producto.observaciones && producto.observaciones.toLowerCase().includes('liquid')); // Observaciones contiene líquido
      
      return esLiquido;
    });

    console.log('🍄 Productos procesados (Hongos Líquidos):', {
      total: productos.length,
      hongosLiquidos: productosActivos.length,
      productos: productosActivos.slice(0, 3).map(p => ({ 
        nombre: p.nombre, 
        tipo: p.tipo,
        codigo: p.codigo,
        unidad: p.unidadBase
      }))
    });

    return NextResponse.json({
      success: true,
      productos: productosActivos,
      total: productosActivos.length,
      message: `${productosActivos.length} hongos líquidos activos obtenidos exitosamente`
    });

  } catch (error) {
    console.error('❌ Error obteniendo productos de Sirius:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido',
      productos: []
    }, { status: 500 });
  }
}