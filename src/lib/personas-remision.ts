/**
 * Utilidades para gestionar personas relacionadas con remisiones
 */

import Airtable from 'airtable';
import { SIRIUS_REMISIONES_CORE_CONFIG, TipoUsuarioPersona } from './constants/airtable';

const baseRemisiones = new Airtable({
  apiKey: SIRIUS_REMISIONES_CORE_CONFIG.API_KEY
}).base(SIRIUS_REMISIONES_CORE_CONFIG.BASE_ID);

export interface PersonaRemisionData {
  nombreCompleto: string;
  cedula: string;
  tipo: TipoUsuarioPersona;
  correo?: string;
  telefono?: string;
  direccion?: string;
}

export interface PersonaRemision extends PersonaRemisionData {
  recordId: string;
  codigo: string;
  fechaCreacion: string;
}

/**
 * Busca una persona por cédula y tipo
 */
export async function buscarPersona(
  cedula: string, 
  tipo: TipoUsuarioPersona
): Promise<PersonaRemision | null> {
  try {
    const records = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.PERSONAS)
      .select({
        filterByFormula: `AND({Cedula} = "${cedula}", {Tipo de Usuario} = "${tipo}")`,
        maxRecords: 1
      })
      .firstPage();

    if (records.length === 0) {
      return null;
    }

    const record = records[0];
    return {
      recordId: record.id,
      codigo: record.get('Codigo Persona Remision') as string,
      nombreCompleto: record.get('Nombre Completo') as string,
      cedula: record.get('Cedula') as string,
      tipo: record.get('Tipo de Usuario') as TipoUsuarioPersona,
      correo: record.get('Correo Electr\u00f3nico') as string,
      telefono: record.get('Tel\u00e9fono') as string,
      direccion: record.get('Direcci\u00f3n') as string,
      fechaCreacion: record.get('created') as string || new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error buscando persona:', error);
    return null;
  }
}

/**
 * Crea una nueva persona en la tabla
 */
export async function crearPersona(data: PersonaRemisionData): Promise<PersonaRemision> {
  try {
    const record = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.PERSONAS)
      .create({
        'Nombre Completo': data.nombreCompleto,
        'Cedula': data.cedula,
        'Tipo de Usuario': data.tipo,
        'Correo Electr\u00f3nico': data.correo || undefined,
        'Tel\u00e9fono': data.telefono || undefined,
        'Direcci\u00f3n': data.direccion || undefined,
      });

    console.log('✅ Persona creada:', record.id);

    // Obtener el registro completo con el código generado
    const personaCompleta = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.PERSONAS)
      .find(record.id);

    return {
      recordId: record.id,
      codigo: personaCompleta.get('Codigo Persona Remision') as string,
      nombreCompleto: data.nombreCompleto,
      cedula: data.cedula,
      tipo: data.tipo,
      correo: data.correo,
      telefono: data.telefono,
      direccion: data.direccion,
      fechaCreacion: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error creando persona:', error);
    throw error;
  }
}

/**
 * Busca o crea una persona (upsert)
 */
export async function buscarOCrearPersona(data: PersonaRemisionData): Promise<PersonaRemision> {
  // Primero intentar buscar
  const personaExistente = await buscarPersona(data.cedula, data.tipo);
  
  if (personaExistente) {
    console.log('📋 Persona encontrada:', personaExistente.codigo);
    return personaExistente;
  }

  // Si no existe, crear nueva
  console.log('➕ Creando nueva persona...');
  return await crearPersona(data);
}

/**
 * Vincula una persona a una remisión
 */
export async function vincularPersonaARemision(
  remisionRecordId: string,
  personaRecordId: string,
  personasExistentes: string[] = []
): Promise<void> {
  try {
    // Agregar la persona al array de personas vinculadas
    const personasActualizadas = [...new Set([...personasExistentes, personaRecordId])];

    await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.REMISIONES)
      .update(remisionRecordId, {
        'Personas': personasActualizadas
      });

    console.log('✅ Persona vinculada a remisión');
  } catch (error) {
    console.error('❌ Error vinculando persona a remisión:', error);
    throw error;
  }
}

/**
 * Obtiene todas las personas vinculadas a una remisión
 */
export async function obtenerPersonasDeRemision(
  remisionRecordId: string
): Promise<PersonaRemision[]> {
  try {
    const remisionRecord = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.REMISIONES)
      .find(remisionRecordId);

    const personasIds = remisionRecord.get('Personas') as string[] || [];
    
    if (personasIds.length === 0) {
      return [];
    }

    // Obtener detalles de cada persona
    const personas = await Promise.all(
      personasIds.map(async (personaId) => {
        const record = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.PERSONAS)
          .find(personaId);

        return {
          recordId: record.id,
          codigo: record.get('Codigo Persona Remision') as string,
          nombreCompleto: record.get('Nombre Completo') as string,
          cedula: record.get('Cedula') as string,
          tipo: record.get('Tipo de Usuario') as TipoUsuarioPersona,
          correo: record.get('Correo Electr\u00f3nico') as string,
          telefono: record.get('Tel\u00e9fono') as string,
          direccion: record.get('Direcci\u00f3n') as string,
          fechaCreacion: record.get('created') as string || new Date().toISOString()
        };
      })
    );

    return personas;
  } catch (error) {
    console.error('❌ Error obteniendo personas de remisión:', error);
    return [];
  }
}
