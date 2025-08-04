import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { InoculationSchema, validateData } from '@/lib/validation/schemas';

// Validar configuración requerida
if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
  throw new Error('Variables de entorno AIRTABLE_API_KEY y AIRTABLE_BASE_ID son requeridas');
}

// Configurar Airtable de forma segura
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json();
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    
    // Extraer información básica del navegador para logging
    const getBrowserFromUA = (ua: string) => {
      if (ua.includes('TelegramBot')) return 'Telegram WebApp';
      if (ua.includes('Telegram')) return 'Telegram';
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Safari')) return 'Safari';
      if (ua.includes('Edge')) return 'Edge';
      return 'Unknown';
    };
    
    const browserName = getBrowserFromUA(userAgent);
    
    // Log del intento de registro
    console.log('📝 Inoculación Request:', {
      browser: browserName,
      userAgent: userAgent.substring(0, 100),
      timestamp: new Date().toISOString(),
      dataFields: Object.keys(rawData)
    });
    
    // Validar datos de entrada con Zod
    const validation = validateData(InoculationSchema, rawData);
    
    if (!validation.success) {
      console.error('❌ Validation failed:', {
        browser: browserName,
        errors: validation.errors,
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json({ 
        error: 'Datos de entrada inválidos',
        details: validation.errors 
      }, { status: 400 });
    }

    const data = validation.data!;

    // Usar la tabla de Inoculación con nombres de campos
    const tableId = process.env.AIRTABLE_TABLE_INOCULACION;
    
    if (!tableId) {
      throw new Error('Missing AIRTABLE_TABLE_INOCULACION environment variable');
    }
    
    // Crear registro en Airtable usando nombres de campos exactos de la documentación
    const record = await base(tableId).create([
      {
        fields: {
          'Responsables': data.responsablesIds, // Array de IDs, no string
          'Cantidad Bolsas': data.bagQuantity,
          'Microorganismos': [data.microorganismId], // Array de IDs
          'Fecha Inoculacion': data.inoculationDate, // Fecha en formato ISO
          'Realiza Registro': data.registradoPor // Nombre del usuario que registra
        }
      }
    ]);

    // Log del registro exitoso
    console.log('✅ Inoculación registrada:', {
      recordId: record[0].id,
      browser: browserName,
      microorganismo: data.microorganism,
      microorganismoId: data.microorganismId,
      bagQuantity: data.bagQuantity,
      responsables: data.responsables,
      responsablesIds: data.responsablesIds,
      realizaRegistro: data.registradoPor,
      cepasSeleccionadas: data.cepasSeleccionadas,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Inoculación registrada exitosamente',
      recordId: record[0].id
    });

  } catch (error) {
    console.error('Error en API de inoculación:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 API INOCULACION PUT: Iniciando actualización de lote...');
    
    const { loteId, nuevoEstado, fechaGuardadoRefrigeracion } = await request.json();
    
    console.log('📋 API INOCULACION PUT: Datos recibidos:', {
      loteId,
      nuevoEstado,
      fechaGuardadoRefrigeracion
    });

    if (!loteId || !nuevoEstado) {
      console.error('❌ API INOCULACION PUT: Faltan datos requeridos');
      return NextResponse.json(
        { success: false, error: 'loteId y nuevoEstado son requeridos' },
        { status: 400 }
      );
    }

    const tableId = process.env.AIRTABLE_TABLE_INOCULACION;
    
    if (!tableId) {
      console.error('❌ API INOCULACION PUT: Missing AIRTABLE_TABLE_INOCULACION environment variable');
      throw new Error('Missing AIRTABLE_TABLE_INOCULACION environment variable');
    }

    console.log('📡 API INOCULACION PUT: Actualizando registro en Airtable...');

    // Preparar los campos a actualizar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fieldsToUpdate: any = {
      'Estado Lote': nuevoEstado
    };

    // Si se está cambiando a Refrigeración, agregar la fecha
    if ((nuevoEstado === 'Refrigeración' || nuevoEstado === 'Refrigerado') && fechaGuardadoRefrigeracion) {
      console.log('📅 API INOCULACION PUT: Guardando fecha de refrigeración:', fechaGuardadoRefrigeracion);
      // Usar el nuevo nombre de campo para nuevos registros
      fieldsToUpdate['Fecha Guardado Refrigeración'] = fechaGuardadoRefrigeracion;
    }

    console.log('📋 API INOCULACION PUT: Campos a actualizar:', fieldsToUpdate);

    // Actualizar el registro en Airtable
    const updatedRecords = await base(tableId).update([{
      id: loteId,
      fields: fieldsToUpdate
    }]);

    const updatedRecord = updatedRecords[0];

    console.log('✅ API INOCULACION PUT: Registro actualizado:', {
      id: updatedRecord.id,
      fields: updatedRecord.fields
    });

    return NextResponse.json({
      success: true,
      lote: {
        id: updatedRecord.id,
        fields: updatedRecord.fields
      }
    });

  } catch (error) {
    console.error('❌ API INOCULACION PUT: Error al actualizar lote:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al actualizar lote',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    console.log('🔍 API INOCULACION GET: Iniciando obtención de registros...');
    
    // Usar la tabla de Inoculación desde variables de entorno
    const tableId = process.env.AIRTABLE_TABLE_INOCULACION;
    
    console.log('📋 API INOCULACION: Table ID:', tableId);
    
    if (!tableId) {
      console.error('❌ API INOCULACION: Missing AIRTABLE_TABLE_INOCULACION environment variable');
      throw new Error('Missing AIRTABLE_TABLE_INOCULACION environment variable');
    }

    console.log('📡 API INOCULACION: Haciendo query a Airtable...');
    
    // Obtener registros de Airtable usando nombres de campos exactos
    const records = await base(tableId)
      .select({
        maxRecords: 100,
        sort: [{ field: 'Fecha Creacion', direction: 'desc' }]
      })
      .firstPage();

    console.log('📊 API INOCULACION: Records obtenidos:', records.length);
    
    // Log de cada record para ver su estructura
    records.forEach((record, index) => {
      console.log(`📦 API INOCULACION: Record ${index + 1}:`, {
        id: record.id,
        fields: record.fields,
        estadoLote: record.get('Estado Lote'),
        codigoLote: record.get('Codigo Lote'),
        fechaGuardadoRefrigeracion: record.get('Fecha Guardado Refrigeración'),
        fechaGuardadoRefrigerador: record.get('Fecha Guardado Refrigerador') // Para compatibilidad
      });
    });

    const formattedRecords = records.map(record => ({
      id: record.id,
      fields: record.fields // Devolver todos los fields como están en Airtable
    }));

    console.log('✅ API INOCULACION: Records formateados:', formattedRecords.length);
    console.log('📋 API INOCULACION: Primer record ejemplo:', formattedRecords[0]);

    const response = {
      success: true,
      inoculaciones: formattedRecords, // Cambiar de 'records' a 'inoculaciones'
      total: formattedRecords.length
    };
    
    console.log('🚀 API INOCULACION: Enviando response:', {
      success: response.success,
      inoculaciones_count: response.inoculaciones.length,
      total: response.total
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ API INOCULACION: Error al obtener registros:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener datos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
