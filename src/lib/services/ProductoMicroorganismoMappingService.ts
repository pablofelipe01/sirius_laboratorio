// Servicio para mapear productos de Sirius Product Core con microorganismos de DataLab
export class ProductoMicroorganismoMappingService {
  
  /**
   * Mapea nombres de productos de Sirius Product Core a nombres de microorganismos de DataLab
   */
  static mapProductoToMicroorganismo(nombreProductoSirius: string): string {
    // Mapeo manual basado en los nombres comunes
    const mapeo: { [key: string]: string } = {
      // Hongos líquidos comunes
      'Trichoderma harzianum': 'Trichoderma harzianum',
      'Beauveria bassiana': 'Beauveria bassiana', 
      'Metarhizium anisopliae': 'Metarhizium anisopliae',
      'Paecilomyces lilacinus': 'Paecilomyces lilacinus',
      'Lecanicillium lecanii': 'Lecanicillium lecanii',
      
      // Variaciones con "líquido" en el nombre
      'Trichoderma harzianum líquido': 'Trichoderma harzianum',
      'Beauveria bassiana líquido': 'Beauveria bassiana',
      'Metarhizium anisopliae líquido': 'Metarhizium anisopliae',
      
      // Nombres comerciales que mapean a nombres científicos
      'TH-Sirius': 'Trichoderma harzianum',
      'BB-Sirius': 'Beauveria bassiana',
      'MA-Sirius': 'Metarhizium anisopliae',
    };
    
    // Buscar mapeo exacto primero
    if (mapeo[nombreProductoSirius]) {
      return mapeo[nombreProductoSirius];
    }
    
    // Buscar mapeo por coincidencias parciales
    for (const [productoKey, microorganismoValue] of Object.entries(mapeo)) {
      if (nombreProductoSirius.toLowerCase().includes(productoKey.toLowerCase()) ||
          productoKey.toLowerCase().includes(nombreProductoSirius.toLowerCase())) {
        return microorganismoValue;
      }
    }
    
    // Si no encuentra mapeo, intentar extraer nombre científico del producto
    const nombreLimpio = nombreProductoSirius
      .replace(/líquido/gi, '')
      .replace(/sirius/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return nombreLimpio || nombreProductoSirius;
  }

  /**
   * Obtiene lista de todos los microorganismos únicos de DataLab para verificar mapeos
   */
  static async getMicroorganismosDataLab(): Promise<string[]> {
    try {
      const response = await fetch('/api/microorganismos');
      const data = await response.json();
      
      if (data.success) {
        return data.microorganismos.map((m: any) => m.nombre);
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error obteniendo microorganismos DataLab:', error);
      return [];
    }
  }

  /**
   * Valida que un mapeo de producto existe como microorganismo en DataLab
   */
  static async validateMapping(nombreProductoSirius: string): Promise<{
    valid: boolean;
    microorganismoMapeado: string;
    encontradoEnDataLab: boolean;
  }> {
    const microorganismoMapeado = this.mapProductoToMicroorganismo(nombreProductoSirius);
    const microorganismosDataLab = await this.getMicroorganismosDataLab();
    
    const encontradoEnDataLab = microorganismosDataLab.some(m => 
      m.toLowerCase() === microorganismoMapeado.toLowerCase()
    );
    
    return {
      valid: encontradoEnDataLab,
      microorganismoMapeado,
      encontradoEnDataLab
    };
  }

  /**
   * Generar reporte de mapeos para debugging
   */
  static async generateMappingReport(productosActuales: string[]): Promise<{
    mapeos: Array<{
      producto: string;
      microorganismo: string;
      valido: boolean;
    }>;
    sinMapeo: string[];
    estadisticas: {
      total: number;
      validos: number;
      invalidos: number;
    };
  }> {
    const mapeos = [];
    const sinMapeo = [];
    
    for (const producto of productosActuales) {
      const validation = await this.validateMapping(producto);
      
      if (validation.microorganismoMapeado === producto && !validation.encontradoEnDataLab) {
        sinMapeo.push(producto);
      } else {
        mapeos.push({
          producto,
          microorganismo: validation.microorganismoMapeado,
          valido: validation.encontradoEnDataLab
        });
      }
    }
    
    const validos = mapeos.filter(m => m.valido).length;
    
    return {
      mapeos,
      sinMapeo,
      estadisticas: {
        total: productosActuales.length,
        validos,
        invalidos: mapeos.length - validos + sinMapeo.length
      }
    };
  }
}