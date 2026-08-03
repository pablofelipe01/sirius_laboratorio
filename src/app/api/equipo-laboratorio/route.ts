import { NextResponse } from 'next/server';
import Airtable from 'airtable';
import { SIRIUS_NOMINA_CORE_CONFIG, AIRTABLE_CONFIG } from '@/lib/constants/airtable';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 API EQUIPO-LABORATORIO - Migrado a Sirius Nomina Core
// ═══════════════════════════════════════════════════════════════════════════════

// ID del área de Laboratorio
const AREA_LABORATORIO_ID = 'SIRIUS-AREA-0008';

// Configurar Airtable usando la configuración centralizada (con API key global si existe)
const nominaBase = new Airtable({ apiKey: SIRIUS_NOMINA_CORE_CONFIG.API_KEY }).base(SIRIUS_NOMINA_CORE_CONFIG.BASE_ID);

// Configuración antigua (DataLab) para compatibilidad con PATCH
const legacyBase = new Airtable({ apiKey: AIRTABLE_CONFIG.API_KEY }).base(AIRTABLE_CONFIG.BASE_ID);

export async function GET() {
  try {
    console.log('👥 [EQUIPO-LAB] Obteniendo personal de Sirius Nomina Core (Área Laboratorio)...');

    // Paso 1: Buscar el record ID del área de Laboratorio
    let areaRecordId: string | null = null;

    try {
      const areasRecords = await nominaBase(SIRIUS_NOMINA_CORE_CONFIG.TABLES.AREAS)
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

    // Paso 2: Obtener todos los empleados activos con sus áreas
    const records = await nominaBase(SIRIUS_NOMINA_CORE_CONFIG.TABLES.PERSONAL)
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

// Función para actualizar contraseña y hash (legacy, para DataLab)
export async function PATCH(request: Request) {
  try {
    const { recordId, contraseña, hash, salt } = await request.json();

    const updateFields: Record<string, string> = {};
    if (contraseña) updateFields['Contraseña'] = contraseña;
    if (hash) updateFields['Hash'] = hash;
    if (salt) updateFields['Salt'] = salt;

    const updatedRecord = await legacyBase(AIRTABLE_CONFIG.TABLES.EQUIPO_LABORATORIO).update(recordId, updateFields);

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
