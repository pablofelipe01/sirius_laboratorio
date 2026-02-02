import { NextResponse } from 'next/server';
import Airtable from 'airtable';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 API EQUIPO-LABORATORIO - Migrado a Sirius Nomina Core
// ═══════════════════════════════════════════════════════════════════════════════

// Configuración de Sirius Nomina Core
const NOMINA_API_KEY = process.env.AIRTABLE_API_KEY_SIRIUS_NOMINA_CORE;
const NOMINA_BASE_ID = process.env.AIRTABLE_BASE_ID_SIRIUS_NOMINA_CORE;
const PERSONAL_TABLE_ID = process.env.AIRTABLE_TABLE_NOMINA_PERSONAL;
const AREAS_TABLE_ID = process.env.AIRTABLE_TABLE_NOMINA_AREAS;

// ID del área de Laboratorio
const AREA_LABORATORIO_ID = 'SIRIUS-AREA-0008';

// Validar configuración
if (!NOMINA_API_KEY || !NOMINA_BASE_ID || !PERSONAL_TABLE_ID) {
  console.error('⚠️ Variables de entorno de Sirius Nomina Core no configuradas para API equipo-laboratorio');
}

// Configurar Airtable para Sirius Nomina Core
const nominaBase = NOMINA_API_KEY && NOMINA_BASE_ID 
  ? new Airtable({ apiKey: NOMINA_API_KEY }).base(NOMINA_BASE_ID)
  : null;

// Configuración antigua (DataLab) para compatibilidad con PATCH
if (process.env.AIRTABLE_API_KEY) {
  Airtable.configure({ apiKey: process.env.AIRTABLE_API_KEY });
} else if (process.env.AIRTABLE_PAT) {
  Airtable.configure({ apiKey: process.env.AIRTABLE_PAT });
}
const legacyBase = Airtable.base(process.env.AIRTABLE_BASE_ID!);

export async function GET() {
  try {
    // Verificar que la base esté configurada
    if (!nominaBase || !PERSONAL_TABLE_ID) {
      console.error('❌ Sirius Nomina Core no configurado');
      return NextResponse.json(
        { success: false, error: 'Sistema de nómina no configurado' },
        { status: 500 }
      );
    }

    console.log('👥 [EQUIPO-LAB] Obteniendo personal de Sirius Nomina Core (Área Laboratorio)...');

    // Paso 1: Buscar el record ID del área de Laboratorio
    let areaRecordId: string | null = null;
    
    if (AREAS_TABLE_ID) {
      try {
        const areasRecords = await nominaBase(AREAS_TABLE_ID)
          .select({
            filterByFormula: `{Codigo Area} = '${AREA_LABORATORIO_ID}'`,
            maxRecords: 1
          })
          .all();
        
        if (areasRecords.length > 0) {
          areaRecordId = areasRecords[0].id;
          console.log(`📍 [EQUIPO-LAB] Área Laboratorio encontrada: ${areaRecordId} (${areasRecords[0].fields['Nombre del Area']})`);
        } else {
          console.log(`⚠️ [EQUIPO-LAB] No se encontró área con Codigo Area: ${AREA_LABORATORIO_ID}`);
        }
      } catch (areaError) {
        console.log('⚠️ [EQUIPO-LAB] Error buscando área:', areaError);
      }
    }

    // Paso 2: Obtener todos los empleados activos con sus áreas
    const records = await nominaBase(PERSONAL_TABLE_ID)
      .select({
        fields: ['Nombre completo', 'ID Empleado', 'Estado de actividad', 'Areas'],
        filterByFormula: `{Estado de actividad} = 'Activo'`,
        sort: [{ field: 'Nombre completo', direction: 'asc' }]
      })
      .all();

    // Paso 3: Filtrar por área de Laboratorio
    let filteredRecords = records;
    if (areaRecordId) {
      filteredRecords = records.filter(record => {
        const areas = record.fields['Areas'] as string[] | undefined;
        return areas && Array.isArray(areas) && areas.includes(areaRecordId!);
      });
      console.log(`🔍 [EQUIPO-LAB] Filtrados: ${filteredRecords.length} de ${records.length} empleados activos`);
    }

    // Formatear respuesta
    const responsables = filteredRecords.map(record => ({
      id: record.id, // Record ID de Airtable
      idCore: record.fields['ID Empleado'] as string || '', // Código SIRIUS-PERSONAL-XXXX
      nombre: record.fields['Nombre completo'] as string || '',
    })).filter(item => item.nombre);

    // Compatibilidad: también devolver como "usuarios" para otros usos
    const usuarios = responsables.map(r => ({
      id: r.id,
      nombre: r.nombre,
      idCore: r.idCore
    }));

    console.log(`✅ [EQUIPO-LAB] ${responsables.length} responsables del área Laboratorio encontrados`);

    return NextResponse.json({
      success: true,
      usuarios,
      responsables
    });
  } catch (error) {
    console.error('❌ [EQUIPO-LAB] Error fetching responsables:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener responsables' },
      { status: 500 }
    );
  }
}

// Función para actualizar contraseña y hash
export async function PATCH(request: Request) {
  try {
    const { recordId, contraseña, hash, salt } = await request.json();
    
    const tableId = process.env.AIRTABLE_TABLE_EQUIPO_LABORATORIO;
    
    if (!tableId) {
      throw new Error('Missing AIRTABLE_TABLE_EQUIPO_LABORATORIO environment variable');
    }
    
    const updateFields: Record<string, string> = {};
    if (contraseña) updateFields['Contraseña'] = contraseña;
    if (hash) updateFields['Hash'] = hash;
    if (salt) updateFields['Salt'] = salt;
    
    const updatedRecord = await base(tableId).update(recordId, updateFields);

    return NextResponse.json({
      success: true,
      record: updatedRecord
    });
  } catch (error) {
    console.error('Error updating user credentials:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar credenciales' },
      { status: 500 }
    );
  }
}
