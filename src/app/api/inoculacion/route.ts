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

// Nombres de campos de Airtable configurables
const FIELD_RESPONSABLES = process.env.AIRTABLE_FIELD_INOCULACION_RESPONSABLES || 'Responsables';
const FIELD_CANTIDAD_BOLSAS = process.env.AIRTABLE_FIELD_INOCULACION_CANTIDAD_BOLSAS || 'Cantidad Bolsas Inoculadas';
const FIELD_MICROORGANISMOS = process.env.AIRTABLE_FIELD_INOCULACION_MICROORGANISMOS || 'Microorganismos';
const FIELD_FECHA_INOCULACION = process.env.AIRTABLE_FIELD_INOCULACION_FECHA || 'Fecha Inoculacion';
const FIELD_REALIZA_REGISTRO = process.env.AIRTABLE_FIELD_INOCULACION_REALIZA_REGISTRO || 'Realiza Registro';

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
    
    // Log de los datos crudos recibidos
    console.log('📦 RAW DATA RECIBIDO:', JSON.stringify(rawData, null, 2));
    
    // Validar datos de entrada con Zod
    const validation = validateData(InoculationSchema, rawData);
    
    if (!validation.success) {
      console.error('❌ Validation failed:', {
        browser: browserName,
        errors: validation.errors,
        rawData: rawData,
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
    
    // Crear registro en Airtable usando variables de entorno para nombres de campos
    const record = await base(tableId).create([
      {
        fields: {
          [FIELD_RESPONSABLES]: data.responsablesIds, // Array de IDs
          [FIELD_CANTIDAD_BOLSAS]: data.bagQuantity, // Number
          [FIELD_MICROORGANISMOS]: [data.microorganismId], // Array de IDs
          [FIELD_FECHA_INOCULACION]: data.inoculationDate, // Date (ISO format)
          [FIELD_REALIZA_REGISTRO]: data.registradoPor // Text
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

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API INOCULACION GET: Iniciando obtención de registros...');
    
    const { searchParams } = new URL(request.url);
    const codigo = searchParams.get('codigo');
    
    // Usar la tabla de Inoculación desde variables de entorno
    const tableId = process.env.AIRTABLE_TABLE_INOCULACION;
    
    console.log('📋 API INOCULACION: Table ID:', tableId);
    console.log('🔍 API INOCULACION: Codigo filtro:', codigo);
    
    if (!tableId) {
      console.error('❌ API INOCULACION: Missing AIRTABLE_TABLE_INOCULACION environment variable');
      throw new Error('Missing AIRTABLE_TABLE_INOCULACION environment variable');
    }

    console.log('📡 API INOCULACION: Haciendo query a Airtable...');
    
    // Preparar configuración de query
    const queryConfig: any = {
      maxRecords: 100,
      sort: [{ field: 'Fecha Creacion', direction: 'desc' }]
    };

    // Si se proporciona código, filtrar por ese código
    if (codigo) {
      queryConfig.filterByFormula = `{Codigo Lote} = '${codigo}'`;
      console.log('📋 API INOCULACION: Filtrando por código:', codigo);
    }
    
    // Obtener registros de Airtable usando nombres de campos exactos
    const records = await base(tableId)
      .select(queryConfig)
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
      records: formattedRecords, // Devolver como 'records' para compatibilidad con frontend
      total: formattedRecords.length
    };
    
    console.log('🚀 API INOCULACION: Enviando response:', {
      success: response.success,
      records_count: response.records.length,
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


