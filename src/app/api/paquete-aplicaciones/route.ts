import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Validar configuración requerida para DataLab
if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
  throw new Error('Variables de entorno AIRTABLE_API_KEY y AIRTABLE_BASE_ID son requeridas para DataLab');
}

// Configurar Airtable DataLab
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

interface PaqueteAplicacionData {
  nombre: string;
  clienteId: string;
  cultivoId: string;
  lotesIds: string[]; // Array de IDs de lotes
  lotesData?: Array<{id: string, areaHa: number}>; // Datos completos de lotes con hectáreas
  microorganismos: string[]; // Array de IDs de microorganismos
  cantidadAplicacionesAno: number;
  periodicidadMeses: number;
  fechaInicio: string;
  hectareasTotales: number;
  litrosTotales: number;
  bolsasTotales: number;
  fechasCalculadas?: string[]; // Array de fechas programadas
  userName?: string; // Usuario que realiza el registro
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔵 [PAQUETE-API] Inicio de POST request');
    
    const data: PaqueteAplicacionData = await request.json();
    
    console.log('🔍 [PAQUETE-API] Datos recibidos:', {
      nombre: data.nombre,
      clienteId: data.clienteId,
      cultivoId: data.cultivoId,
      lotesCount: data.lotesIds?.length || 0,
      microorganismosCount: data.microorganismos?.length || 0,
      hectareasTotales: data.hectareasTotales,
      fechaInicio: data.fechaInicio,
      cantidadAplicacionesAno: data.cantidadAplicacionesAno,
      periodicidadMeses: data.periodicidadMeses,
      userName: data.userName,
      timestamp: new Date().toISOString()
    });

    // Validar datos requeridos
    if (!data.nombre || !data.clienteId || !data.microorganismos || data.microorganismos.length === 0) {
      console.error('❌ [PAQUETE-API] Datos faltantes:', {
        nombre: !!data.nombre,
        clienteId: !!data.clienteId,
        microorganismos: data.microorganismos?.length || 0
      });
      return NextResponse.json({
        success: false,
        error: 'Datos requeridos faltantes: nombre, clienteId y microorganismos son obligatorios'
      }, { status: 400 });
    }

    console.log('✅ [PAQUETE-API] Validaciones básicas pasadas');

    // Crear el registro en la tabla Paquete Aplicaciones
    console.log('🔄 [PAQUETE-API] Creando registro en Airtable...');
    
    const paqueteRecord = await base('Paquete Aplicaciones').create({
      'Tipo Aplicacion': data.nombre, // Usar como identificador del paquete
      'ID Cliente': data.clienteId,
      'ID Microorganismos': data.microorganismos, // Link to records en DataLab
      'Ciclo Dias': Math.round(365 / data.cantidadAplicacionesAno), // Calcular días por ciclo
      'Status': 'Activo',
      'Realiza Registro': data.userName || 'Usuario Desconocido'
    });

    console.log('✅ [PAQUETE-API] Paquete Aplicaciones creado:', paqueteRecord.id);

    // Crear registros en Cultivos Lotes Aplicaciones para cada lote
    console.log('🔄 [PAQUETE-API] Creando registros de Cultivos Lotes Aplicaciones...');
    const cultivoLotesData = data.lotesIds.map(loteId => {
      // Buscar las hectáreas del lote en los datos enviados
      const loteInfo = data.lotesData?.find(lote => lote.id === loteId);
      const hectareasLote = loteInfo?.areaHa || 0;
      
      return {
        fields: {
          'Nombre Cultivo Lote': `${data.cultivoId}-${loteId}`,
          'ID Cultivo': data.cultivoId,
          'ID Lote': loteId,
          'Hectareas Lotes': hectareasLote
        }
      };
    });

    const cultivoLotesCreados = [];
    if (cultivoLotesData.length > 0) {
      // Crear registros en lotes de máximo 10 (límite de Airtable)
      const batchSize = 10;
      for (let i = 0; i < cultivoLotesData.length; i += batchSize) {
        const batch = cultivoLotesData.slice(i, i + batchSize);
        console.log(`📦 [PAQUETE-API] Creando batch de cultivos-lotes ${Math.floor(i/batchSize) + 1} con ${batch.length} registros`);
        const batchResults = await base('Cultivos Lotes Aplicaciones').create(batch);
        cultivoLotesCreados.push(...batchResults);
      }
      console.log('✅ [PAQUETE-API] Registros Cultivos-Lotes creados:', cultivoLotesCreados.length);
    }

    // Crear los eventos de aplicación programados relacionados con todos los cultivos-lotes
    const eventosCreados = [];
    if (data.fechasCalculadas && data.fechasCalculadas.length > 0 && cultivoLotesCreados.length > 0) {
      console.log('🔄 [PAQUETE-API] Creando eventos programados...');
      
      // Obtener todos los IDs de los registros de cultivos-lotes creados
      const todosCultivoLotesIds = cultivoLotesCreados.map(record => record.id);
      
      // Para cada fecha programada, crear UN evento que incluya TODOS los cultivos-lotes
      const eventosData = data.fechasCalculadas.map(fecha => ({
        fields: {
          'Cultivos Lotes Aplicaciones': todosCultivoLotesIds, // Todos los cultivos-lotes en cada evento
          'Fecha Programada': fecha,
          'Estado Aplicacion': 'PLANIFICADA',
          'Cantidad Total Biologicos Litros': Math.round(data.litrosTotales)
        }
      }));

      // Crear eventos en lotes de máximo 10 (límite de Airtable)
      const batchSize = 10;
      for (let i = 0; i < eventosData.length; i += batchSize) {
        const batch = eventosData.slice(i, i + batchSize);
        console.log(`📦 [PAQUETE-API] Creando batch de eventos ${Math.floor(i/batchSize) + 1} con ${batch.length} eventos`);
        const batchResults = await base('Aplicaciones Eventos').create(batch);
        eventosCreados.push(...batchResults);
      }
      
      console.log('✅ [PAQUETE-API] Eventos creados:', eventosCreados.length);
      console.log(`📊 [PAQUETE-API] Cada evento incluye ${todosCultivoLotesIds.length} cultivos-lotes`);
      
      // Actualizar el paquete para incluir los IDs de los eventos creados
      if (eventosCreados.length > 0) {
        console.log('🔗 [PAQUETE-API] Actualizando paquete con eventos relacionados...');
        const eventosIds = eventosCreados.map(evento => evento.id);
        
        await base('Paquete Aplicaciones').update(paqueteRecord.id, {
          'Aplicaciones Eventos': eventosIds
        });
        
        console.log('✅ [PAQUETE-API] Paquete actualizado con eventos:', eventosIds.length);
      }
    }

    return NextResponse.json({
      success: true,
      paqueteId: paqueteRecord.id,
      cultivoLotesCount: cultivoLotesCreados.length,
      eventosCount: eventosCreados.length,
      message: `Paquete "${data.nombre}" creado exitosamente con ${cultivoLotesCreados.length} cultivos-lotes y ${eventosCreados.length} aplicaciones programadas`
    });

  } catch (error) {
    console.error('❌ [PAQUETE-API] Error completo creando paquete aplicaciones:', {
      error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      timestamp: new Date().toISOString()
    });
    
    // Error específico de Airtable
    if (error && typeof error === 'object' && 'error' in error) {
      const airtableError = error as any;
      console.error('❌ [PAQUETE-API] Error de Airtable:', {
        type: airtableError.error?.type,
        message: airtableError.error?.message,
        statusCode: airtableError.statusCode
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { 
      status: 500 
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('clienteId');
    
    console.log('🔍 [PAQUETE-API-GET] Consultando paquetes:', {
      clienteId,
      timestamp: new Date().toISOString()
    });

    let formula = '';
    if (clienteId) {
      formula = `{ID Cliente} = '${clienteId}'`;
      console.log('📋 [PAQUETE-API-GET] Fórmula aplicada:', formula);
    }

    console.log('🔄 [PAQUETE-API-GET] Consultando tabla Paquete Aplicaciones...');

    // Construir los parámetros de selección
    const selectParams: any = {
      sort: [{ field: 'Fecha de Creacion', direction: 'desc' }]
    };

    // Solo agregar filterByFormula si hay condiciones
    if (formula) {
      selectParams.filterByFormula = formula;
      console.log('📋 [PAQUETE-API-GET] Fórmula aplicada:', formula);
    }

    console.log('📋 [PAQUETE-API-GET] Parámetros de selección:', selectParams);

    const records = await base('Paquete Aplicaciones')
      .select(selectParams)
      .all();

    console.log('✅ [PAQUETE-API-GET] Registros encontrados:', records.length);

    const paquetes = records.map(record => {
      console.log('🔍 [PAQUETE-API-GET] Procesando registro:', record.id);
      
      return {
        id: record.id,
        nombre: record.get('Tipo Aplicacion'),
        clienteId: record.get('ID Cliente'),
        microorganismos: record.get('ID Microorganismos') || [],
        cicloDias: record.get('Ciclo Dias'),
        fechaFin: record.get('Fecha Fin'),
        status: record.get('Status'),
        realizaRegistro: record.get('Realiza Registro'),
        createdTime: record.get('Fecha de Creacion')
      };
    });

    console.log('✅ [PAQUETE-API-GET] Paquetes mapeados exitosamente:', paquetes.length);

    return NextResponse.json({
      success: true,
      paquetes,
      count: paquetes.length
    });

  } catch (error) {
    console.error('❌ [PAQUETE-API-GET] Error completo consultando paquetes:', {
      error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Error específico de Airtable
    if (error && typeof error === 'object' && 'error' in error) {
      const airtableError = error as any;
      console.error('❌ [PAQUETE-API-GET] Error de Airtable:', {
        type: airtableError.error?.type,
        message: airtableError.error?.message,
        statusCode: airtableError.statusCode
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { 
      status: 500 
    });
  }
}