// Servicio para mapear clientes entre DataLab (legacy) y Sirius Client Core
export interface ClienteLegacy {
  id: string;
  nombre: string;
  nit?: string;
  contacto?: string;
}

export interface ClienteCore {
  id: string;
  clienteNombre: string;
  nit: string;
  codigo: string; // CL-0001, etc.
  direccion?: string;
  ciudad?: string;
  estado: 'Activo' | 'Inactivo';
}

export class ClienteMigrationService {
  
  /**
   * Buscar cliente en Sirius Client Core por nombre
   */
  static async findClienteInCore(nombreCliente: string): Promise<ClienteCore | null> {
    try {
      console.log(`🔍 Buscando cliente en Sirius Core: ${nombreCliente}`);
      
      const response = await fetch(
        `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID_SIRIUS_CLIENTES_CORE}/${process.env.AIRTABLE_TABLE_CLIENTES_CORE}?filterByFormula={Cliente}="${nombreCliente}"`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY_SIRIUS_CLIENTES_CORE}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`❌ Error consultando Sirius Core: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (data.records && data.records.length > 0) {
        const record = data.records[0];
        return {
          id: record.id,
          clienteNombre: record.fields.Cliente || '',
          nit: record.fields.Nit || '',
          codigo: record.fields.ID || '',
          direccion: record.fields.Direccion || '',
          ciudad: record.fields.Ciudad || '',
          estado: record.fields['Estado Cliente'] || 'Activo'
        };
      }

      console.log(`⚠️ Cliente '${nombreCliente}' no encontrado en Sirius Core`);
      return null;

    } catch (error) {
      console.error(`❌ Error buscando cliente en Sirius Core:`, error);
      return null;
    }
  }

  /**
   * Obtener cliente de DataLab (legacy)
   */
  static async getClienteFromDataLab(clienteId: string): Promise<ClienteLegacy | null> {
    try {
      const response = await fetch(
        `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_CLIENTES_LABORATORIO}/${clienteId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        id: data.id,
        nombre: data.fields.Nombre || '',
        nit: data.fields.NIT || '',
        contacto: data.fields.Contacto || ''
      };

    } catch (error) {
      console.error('❌ Error obteniendo cliente de DataLab:', error);
      return null;
    }
  }

  /**
   * Mapear cliente legacy a core ID
   */
  static async mapClienteLegacyToCore(nombreClienteLegacy: string): Promise<string | null> {
    const clienteCore = await this.findClienteInCore(nombreClienteLegacy);
    return clienteCore?.id || null;
  }

  /**
   * Crear reporte de clientes que necesitan migración
   */
  static async generateMigrationReport(): Promise<{
    clientesLegacy: ClienteLegacy[];
    clientesCore: ClienteCore[];
    matched: Array<{ legacy: ClienteLegacy; core: ClienteCore }>;
    unmatched: ClienteLegacy[];
  }> {
    try {
      // Obtener todos los clientes legacy
      const legacyResponse = await fetch(
        `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_CLIENTES_LABORATORIO}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const legacyData = await legacyResponse.json();
      const clientesLegacy: ClienteLegacy[] = legacyData.records.map((record: any) => ({
        id: record.id,
        nombre: record.fields.Nombre || '',
        nit: record.fields.NIT || '',
        contacto: record.fields.Contacto || ''
      }));

      // Obtener todos los clientes core
      const coreResponse = await fetch(
        `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID_SIRIUS_CLIENTES_CORE}/${process.env.AIRTABLE_TABLE_CLIENTES_CORE}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY_SIRIUS_CLIENTES_CORE}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const coreData = await coreResponse.json();
      const clientesCore: ClienteCore[] = coreData.records.map((record: any) => ({
        id: record.id,
        clienteNombre: record.fields.Cliente || '',
        nit: record.fields.Nit || '',
        codigo: record.fields.ID || '',
        direccion: record.fields.Direccion || '',
        ciudad: record.fields.Ciudad || '',
        estado: record.fields['Estado Cliente'] || 'Activo'
      }));

      // Mapear clientes coincidentes
      const matched = [];
      const unmatched = [];

      for (const clienteLegacy of clientesLegacy) {
        const clienteCore = clientesCore.find(core => 
          core.clienteNombre.toLowerCase().includes(clienteLegacy.nombre.toLowerCase()) ||
          clienteLegacy.nombre.toLowerCase().includes(core.clienteNombre.toLowerCase())
        );

        if (clienteCore) {
          matched.push({ legacy: clienteLegacy, core: clienteCore });
        } else {
          unmatched.push(clienteLegacy);
        }
      }

      return {
        clientesLegacy,
        clientesCore,
        matched,
        unmatched
      };

    } catch (error) {
      console.error('❌ Error generando reporte de migración:', error);
      return {
        clientesLegacy: [],
        clientesCore: [],
        matched: [],
        unmatched: []
      };
    }
  }
}