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
          'Tipo Bolsas': data.tipoInoculacion, // Mapear tipoInoculacion a Tipo Bolsas
          'Microorganismos': [data.microorganismId], // Array de IDs
          'Fecha Inoculacion': data.inoculationDate // Fecha en formato ISO
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
      tipoInoculacion: data.tipoInoculacion,
      responsables: data.responsables,
      responsablesIds: data.responsablesIds,
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

export async function GET() {
  try {
    // Usar la tabla de Inoculación desde variables de entorno
    const tableId = process.env.AIRTABLE_TABLE_INOCULACION;
    
    if (!tableId) {
      throw new Error('Missing AIRTABLE_TABLE_INOCULACION environment variable');
    }

    // Obtener registros de Airtable usando nombres de campos
    const records = await base(tableId)
      .select({
        maxRecords: 50,
        sort: [{ field: 'Status', direction: 'desc' }]
      })
      .firstPage();

    const formattedRecords = records.map(record => ({
      id: record.id,
      responsable: record.get('Responsable'),
      cantidadBolsas: record.get('Cantidad_Bolsas'),
      status: record.get('Status'),
      microorganismos: record.get('Microorganismos')
    }));

    return NextResponse.json({
      success: true,
      records: formattedRecords,
      total: formattedRecords.length
    });

  } catch (error) {
    console.error('Error al obtener registros de Airtable:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener datos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
