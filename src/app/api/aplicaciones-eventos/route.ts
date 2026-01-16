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

export async function GET(request: NextRequest) {
  try {
    console.log('🔵 [APLICACIONES-API] Inicio de GET request');
    
    const { searchParams } = new URL(request.url);
    const paqueteId = searchParams.get('paqueteId');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const estado = searchParams.get('estado');
    
    let formula = '';
    const conditions = [];
    
    if (paqueteId) {
      conditions.push(`FIND('${paqueteId}', ARRAYJOIN({Paquetes Aplicaciones}))`);
    }
    
    if (fechaInicio) {
      conditions.push(`{Fecha Programada} >= '${fechaInicio}'`);
    }
    
    if (fechaFin) {
      conditions.push(`{Fecha Programada} <= '${fechaFin}'`);
    }
    
    if (estado) {
      conditions.push(`{Estado Aplicacion} = '${estado}'`);
    }
    
    if (conditions.length > 0) {
      formula = `AND(${conditions.join(', ')})`;
    }

    console.log('🔍 Consultando Aplicaciones Eventos:', {
      paqueteId,
      fechaInicio,
      fechaFin,
      estado,
      formula,
      timestamp: new Date().toISOString()
    });

    // Construir los parámetros de selección
    const selectParams: any = {
      sort: [{ field: 'Fecha Programada', direction: 'asc' }]
    };

    // Solo agregar filterByFormula si hay condiciones
    if (formula) {
      selectParams.filterByFormula = formula;
    }

    console.log('📋 [APLICACIONES-API] Parámetros de selección:', selectParams);

    const records = await base('Aplicaciones Eventos')
      .select(selectParams)
      .all();

    console.log('✅ [APLICACIONES-API] Registros encontrados:', records.length);

    const eventos = records.map((record, index) => {
      console.log(`🔍 [APLICACIONES-API] Procesando evento ${index + 1}/${records.length}:`, record.id);
      
      return {
        id: record.id,
        paqueteAplicaciones: record.get('Paquetes Aplicaciones'),
        idPaquete: record.get('ID Paquete'),
        fechaProgramada: record.get('Fecha Programada'),
        fechaAplicacion: record.get('Fecha Aplicacion'),
        estadoAplicacion: record.get('Estado Aplicacion'),
        cantidadLitros: record.get('Cantidad Total Biologicos Litros'),
        observaciones: record.get('Observaciones'),
        createdTime: record.get('Fecha de Creacion'),
        fechaActualizacion: record.get('Fecha Actualizacion')
      };
    });

    console.log('✅ [APLICACIONES-API] Eventos mapeados exitosamente:', eventos.length);

    return NextResponse.json({
      success: true,
      eventos,
      count: eventos.length
    });

  } catch (error) {
    console.error('❌ [APLICACIONES-API] Error completo consultando eventos aplicaciones:', {
      error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Error específico de Airtable
    if (error && typeof error === 'object' && 'error' in error) {
      const airtableError = error as any;
      console.error('❌ [APLICACIONES-API] Error de Airtable:', {
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

export async function PATCH(request: NextRequest) {
  try {
    const { eventoId, ...updateData } = await request.json();
    
    if (!eventoId) {
      return NextResponse.json({
        success: false,
        error: 'eventoId es requerido'
      }, { status: 400 });
    }

    console.log('🔄 Actualizando Evento Aplicación:', {
      eventoId,
      updateData,
      timestamp: new Date().toISOString()
    });

    const updatedRecord = await base('Aplicaciones Eventos').update(eventoId, updateData);

    return NextResponse.json({
      success: true,
      eventoId: updatedRecord.id,
      message: 'Evento actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error actualizando evento:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { 
      status: 500 
    });
  }
}