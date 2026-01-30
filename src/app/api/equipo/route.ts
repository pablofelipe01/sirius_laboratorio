import { NextResponse } from 'next/server';
import Airtable from 'airtable';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 API EQUIPO - Migrado a Sirius Nomina Core
// ═══════════════════════════════════════════════════════════════════════════════

// Configuración de Sirius Nomina Core
const NOMINA_API_KEY = process.env.AIRTABLE_API_KEY_SIRIUS_NOMINA_CORE;
const NOMINA_BASE_ID = process.env.AIRTABLE_BASE_ID_SIRIUS_NOMINA_CORE;
const PERSONAL_TABLE_ID = process.env.AIRTABLE_TABLE_NOMINA_PERSONAL;
const AREAS_TABLE_ID = process.env.AIRTABLE_TABLE_NOMINA_AREAS;

// ID del área de Laboratorio/Pirolisis
const AREA_LABORATORIO_ID = 'SIRIUS-AREA-0008';

// Validar configuración
if (!NOMINA_API_KEY || !NOMINA_BASE_ID || !PERSONAL_TABLE_ID) {
  console.error('⚠️ Variables de entorno de Sirius Nomina Core no configuradas para API equipo');
}

// Configurar Airtable para Sirius Nomina Core
const nominaBase = NOMINA_API_KEY && NOMINA_BASE_ID 
  ? new Airtable({ apiKey: NOMINA_API_KEY }).base(NOMINA_BASE_ID)
  : null;

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

    console.log('👥 Obteniendo personal de Sirius Nomina Core (Área Laboratorio)...');

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
          console.log(`📍 Área Laboratorio encontrada: ${areaRecordId} (${areasRecords[0].fields['Nombre del Area']})`);
        } else {
          console.log(`⚠️ No se encontró área con Codigo Area: ${AREA_LABORATORIO_ID}`);
        }
      } catch (areaError) {
        console.log('⚠️ Error buscando área:', areaError);
      }
    } else {
      console.log('⚠️ AREAS_TABLE_ID no configurado');
    }

    // Paso 2: Obtener todos los empleados activos con sus áreas
    const records = await nominaBase(PERSONAL_TABLE_ID)
      .select({
        fields: ['Nombre completo', 'ID Empleado', 'Estado de actividad', 'Areas'],
        filterByFormula: `{Estado de actividad} = 'Activo'`,
        sort: [{ field: 'Nombre completo', direction: 'asc' }]
      })
      .all();

    // Log para debug
    if (records.length > 0) {
      console.log('📊 Ejemplo Areas:', records[0].fields['Areas']);
    }

    // Paso 3: Filtrar por área si tenemos el record ID
    let filteredRecords = records;
    if (areaRecordId) {
      filteredRecords = records.filter(record => {
        const areas = record.fields['Areas'] as string[] | undefined;
        return areas && Array.isArray(areas) && areas.includes(areaRecordId!);
      });
      console.log(`🔍 Filtrados: ${filteredRecords.length} de ${records.length} empleados`);
    }

    const responsables = filteredRecords.map(record => ({
      id: record.id, // Record ID de Airtable (para linked records)
      idCore: record.fields['ID Empleado'] as string || '', // Código tipo "SIRIUS-PERSONAL-0001"
      nombre: record.fields['Nombre completo'] as string || '',
    })).filter(item => item.nombre); // Filtrar los que no tienen nombre

    console.log(`✅ ${responsables.length} responsables del área Pirolisis encontrados (de ${records.length} activos total)`);

    return NextResponse.json({
      success: true,
      responsables
    });

  } catch (error) {
    console.error('❌ Error fetching responsables:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener responsables' },
      { status: 500 }
    );
  }
}
