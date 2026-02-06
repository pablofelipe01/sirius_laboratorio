import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { SIRIUS_REMISIONES_CORE_CONFIG } from '@/lib/constants/airtable';

const baseRemisiones = new Airtable({
  apiKey: SIRIUS_REMISIONES_CORE_CONFIG.API_KEY
}).base(SIRIUS_REMISIONES_CORE_CONFIG.BASE_ID);

/**
 * GET /api/personas-remision
 * Obtener todas las personas (transportistas/receptores) o buscar por cédula
 * Query params:
 * - cedula: Buscar por número de cédula/documento
 * - tipo: Filtrar por tipo (Transportista, Receptor)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cedula = searchParams.get('cedula');
    const tipo = searchParams.get('tipo');

    let filterFormula = '';
    
    if (cedula) {
      // Buscar por cédula (campo Cedula)
      filterFormula = `SEARCH("${cedula}", {Cedula})`;
    } else if (tipo) {
      filterFormula = `{Tipo de Usuario} = "${tipo}"`;
    }

    const records = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.PERSONAS)
      .select({
        ...(filterFormula && { filterByFormula: filterFormula }),
        sort: [{ field: 'Nombre Completo', direction: 'asc' }],
        maxRecords: 100
      })
      .firstPage();

    const personas = records.map(record => ({
      id: record.id,
      codigo: record.get('Codigo Persona Remision') as string || '',
      cedula: record.get('Cedula') as string || '',
      nombreCompleto: record.get('Nombre Completo') as string || '',
      tipoUsuario: record.get('Tipo de Usuario') as string || '',
      correo: record.get('Correo Electrónico') as string || '',
      telefono: record.get('Teléfono') as string || '',
      direccion: record.get('Dirección') as string || '',
      idOrigen: record.get('ID Origen') as string || '',
      baseOrigen: record.get('Base Origen') as string || ''
    }));

    return NextResponse.json({
      success: true,
      personas,
      total: personas.length
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo personas:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al obtener personas',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/personas-remision
 * Crear una nueva persona (transportista o receptor)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cedula,
      nombreCompleto,
      tipoUsuario,
      correo,
      telefono,
      direccion
    } = body;

    // Validaciones
    if (!cedula) {
      return NextResponse.json({
        success: false,
        error: 'El número de cédula es requerido'
      }, { status: 400 });
    }

    if (!nombreCompleto) {
      return NextResponse.json({
        success: false,
        error: 'El nombre completo es requerido'
      }, { status: 400 });
    }

    if (!tipoUsuario || !['Transportista', 'Receptor'].includes(tipoUsuario)) {
      return NextResponse.json({
        success: false,
        error: 'El tipo de usuario debe ser "Transportista" o "Receptor"'
      }, { status: 400 });
    }

    // Verificar si ya existe una persona con esa cédula
    const existingRecords = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.PERSONAS)
      .select({
        filterByFormula: `{Cedula} = "${cedula}"`,
        maxRecords: 1
      })
      .firstPage();

    if (existingRecords.length > 0) {
      // Retornar el registro existente
      const existing = existingRecords[0];
      return NextResponse.json({
        success: true,
        persona: {
          id: existing.id,
          codigo: existing.get('Codigo Persona Remision') as string || '',
          cedula: existing.get('Cedula') as string || '',
          nombreCompleto: existing.get('Nombre Completo') as string || '',
          tipoUsuario: existing.get('Tipo de Usuario') as string || '',
          correo: existing.get('Correo Electrónico') as string || '',
          telefono: existing.get('Teléfono') as string || '',
          direccion: existing.get('Dirección') as string || ''
        },
        message: 'Ya existe una persona con esta cédula',
        yaExistia: true
      });
    }

    // Crear nueva persona
    const newRecord = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.PERSONAS)
      .create({
        'Cedula': cedula,
        'Nombre Completo': nombreCompleto,
        'Tipo de Usuario': tipoUsuario,
        'Correo Electrónico': correo || '',
        'Teléfono': telefono || '',
        'Dirección': direccion || '',
        'Base Origen': 'Sirius DataLab'
      });

    // Obtener el registro creado para tener el código generado
    const createdRecord = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.PERSONAS)
      .find(newRecord.id);

    return NextResponse.json({
      success: true,
      persona: {
        id: createdRecord.id,
        codigo: createdRecord.get('Codigo Persona Remision') as string || '',
        cedula: createdRecord.get('Cedula') as string || '',
        nombreCompleto: createdRecord.get('Nombre Completo') as string || '',
        tipoUsuario: createdRecord.get('Tipo de Usuario') as string || '',
        correo: createdRecord.get('Correo Electrónico') as string || '',
        telefono: createdRecord.get('Teléfono') as string || '',
        direccion: createdRecord.get('Dirección') as string || ''
      },
      message: 'Persona creada exitosamente',
      yaExistia: false
    });

  } catch (error: any) {
    console.error('❌ Error creando persona:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al crear persona',
      details: error.message
    }, { status: 500 });
  }
}
