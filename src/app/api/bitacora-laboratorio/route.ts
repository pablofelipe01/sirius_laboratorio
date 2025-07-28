import { NextRequest, NextResponse } from 'next/server';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_BITACORA_LABORATORIO;

interface BitacoraLaboratorioData {
  realizaRegistro: string;
  transcripcionAudio: string;
  informeEjecutivo: string;
  equipoLaboratorio: string[];
  equipoLaboratorioId: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: BitacoraLaboratorioData = await request.json();

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
      return NextResponse.json(
        { success: false, error: 'Configuración de Airtable incompleta' },
        { status: 500 }
      );
    }

    // Validar campos requeridos
    if (!body.realizaRegistro || !body.transcripcionAudio || !body.informeEjecutivo) {
      return NextResponse.json(
        { success: false, error: 'Campos requeridos faltantes' },
        { status: 400 }
      );
    }

    // Construir el registro para Airtable
    const record = {
      fields: {
        [process.env.AIRTABLE_FIELD_BITACORA_REALIZA_REGISTRO!]: body.realizaRegistro,
        [process.env.AIRTABLE_FIELD_BITACORA_TRANSCRIPCION_AUDIO!]: body.transcripcionAudio,
        [process.env.AIRTABLE_FIELD_BITACORA_INFORME_EJECUTIVO!]: body.informeEjecutivo,
        [process.env.AIRTABLE_FIELD_BITACORA_EQUIPO_LABORATORIO!]: body.equipoLaboratorioId
      }
    };

    console.log('📝 Enviando registro a Airtable Bitácora Laboratorio:', record);

    // Enviar a Airtable
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
      }
    );

    const airtableData = await airtableResponse.json();

    if (!airtableResponse.ok) {
      console.error('❌ Error de Airtable:', airtableData);
      return NextResponse.json(
        { success: false, error: `Error de Airtable: ${airtableData.error?.message || 'Error desconocido'}` },
        { status: 500 }
      );
    }

    console.log('✅ Registro de bitácora creado exitosamente:', airtableData.id);

    return NextResponse.json({
      success: true,
      record: airtableData,
      message: 'Registro de bitácora creado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error en API de bitácora laboratorio:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
      return NextResponse.json(
        { success: false, error: 'Configuración de Airtable incompleta' },
        { status: 500 }
      );
    }

    // Obtener registros de bitácora con paginación
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?maxRecords=100&sort[0][field]=${process.env.AIRTABLE_FIELD_BITACORA_ID}&sort[0][direction]=desc`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        },
      }
    );

    const airtableData = await airtableResponse.json();

    if (!airtableResponse.ok) {
      console.error('❌ Error al obtener registros de bitácora:', airtableData);
      return NextResponse.json(
        { success: false, error: 'Error al obtener registros de bitácora' },
        { status: 500 }
      );
    }

    interface AirtableRecord {
      id: string;
      fields: Record<string, unknown>;
      createdTime: string;
    }

    // Procesar los registros
    const registros = airtableData.records.map((record: AirtableRecord) => ({
      id: record.id,
      realizaRegistro: record.fields[process.env.AIRTABLE_FIELD_BITACORA_REALIZA_REGISTRO!] || '',
      transcripcionAudio: record.fields[process.env.AIRTABLE_FIELD_BITACORA_TRANSCRIPCION_AUDIO!] || '',
      informeEjecutivo: record.fields[process.env.AIRTABLE_FIELD_BITACORA_INFORME_EJECUTIVO!] || '',
      responsables: record.fields[process.env.AIRTABLE_FIELD_BITACORA_RESPONSABLES!] || [],
      equipoLaboratorio: record.fields[process.env.AIRTABLE_FIELD_BITACORA_EQUIPO_LABORATORIO!] || [],
      fechaCreacion: record.createdTime
    }));

    return NextResponse.json({
      success: true,
      registros,
      total: registros.length
    });

  } catch (error) {
    console.error('❌ Error al obtener registros de bitácora:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
