import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Validar configuración requerida
if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
  throw new Error('Variables de entorno AIRTABLE_API_KEY y AIRTABLE_BASE_ID son requeridas');
}

// Configurar Airtable de forma segura
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: recordId } = await params;
    
    console.log('🗑️ API INOCULACION DELETE [ID]: Iniciando eliminación de registro:', {
      recordId,
      timestamp: new Date().toISOString()
    });

    if (!recordId) {
      console.error('❌ API INOCULACION DELETE [ID]: recordId es requerido');
      return NextResponse.json(
        { success: false, error: 'recordId es requerido' },
        { status: 400 }
      );
    }

    const tableId = process.env.AIRTABLE_TABLE_INOCULACION;
    
    if (!tableId) {
      console.error('❌ API INOCULACION DELETE [ID]: Missing AIRTABLE_TABLE_INOCULACION environment variable');
      throw new Error('Missing AIRTABLE_TABLE_INOCULACION environment variable');
    }

    console.log('📡 API INOCULACION DELETE [ID]: Eliminando registro en Airtable...');

    // Verificar que el registro existe antes de eliminarlo
    try {
      await base(tableId).find(recordId);
      console.log('✅ API INOCULACION DELETE [ID]: Registro encontrado, procediendo con eliminación');
    } catch (findError) {
      console.error('❌ API INOCULACION DELETE [ID]: Registro no encontrado:', findError);
      return NextResponse.json(
        { success: false, error: 'Registro no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar el registro en Airtable
    const deletedRecords = await base(tableId).destroy([recordId]);
    const deletedRecord = deletedRecords[0];

    console.log('✅ API INOCULACION DELETE [ID]: Registro eliminado exitosamente:', {
      id: deletedRecord.id,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Registro de inoculación eliminado exitosamente (rollback)',
      recordId: deletedRecord.id
    });

  } catch (error) {
    console.error('❌ API INOCULACION DELETE [ID]: Error al eliminar registro:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al eliminar registro',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// También podemos agregar GET para obtener un registro específico (útil para debugging)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: recordId } = await params;
    
    console.log('🔍 API INOCULACION GET [ID]: Obteniendo registro específico:', recordId);

    if (!recordId) {
      return NextResponse.json(
        { success: false, error: 'recordId es requerido' },
        { status: 400 }
      );
    }

    const tableId = process.env.AIRTABLE_TABLE_INOCULACION;
    
    if (!tableId) {
      throw new Error('Missing AIRTABLE_TABLE_INOCULACION environment variable');
    }

    // Obtener el registro específico
    const record = await base(tableId).find(recordId);

    console.log('✅ API INOCULACION GET [ID]: Registro encontrado:', {
      id: record.id,
      fields: Object.keys(record.fields)
    });

    return NextResponse.json({
      success: true,
      inoculacion: {
        id: record.id,
        fields: record.fields
      }
    });

  } catch (error) {
    console.error('❌ API INOCULACION GET [ID]: Error al obtener registro:', error);
    
    if (error instanceof Error && error.message.includes('Record not found')) {
      return NextResponse.json(
        { success: false, error: 'Registro no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener registro',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
