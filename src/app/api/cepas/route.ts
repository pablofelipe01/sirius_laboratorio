import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { CepasSchema, validateData } from '@/lib/validation/schemas';

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
    console.log('📝 Cepas Request:', {
      browser: browserName,
      userAgent: userAgent.substring(0, 100),
      timestamp: new Date().toISOString(),
      dataFields: Object.keys(rawData)
    });
    
    // Validar datos de entrada con Zod
    const validation = validateData(CepasSchema, rawData);
    
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

    // Usar la tabla de Cepas desde variables de entorno
    const tableId = process.env.AIRTABLE_TABLE_CEPAS;
    
    if (!tableId) {
      throw new Error('Missing AIRTABLE_TABLE_CEPAS environment variable');
    }
    
    // Crear registro en Airtable usando nombres de campos exactos de la documentación
    const record = await base(tableId).create([
      {
        fields: {
          'Fecha Creacion': data.fechaCreacion, // Fecha en formato ISO
          'Cantidad Bolsas': data.cantidadBolsas,
          'Microorganismos': [data.microorganismoId], // Array de IDs
          'Responsables': data.responsablesIds // Array de IDs
        }
      }
    ]);

    // Log del registro exitoso
    console.log('✅ Cepa registrada:', {
      recordId: record[0].id,
      browser: browserName,
      microorganismo: data.microorganismo,
      microorganismoId: data.microorganismoId,
      cantidadBolsas: data.cantidadBolsas,
      responsables: data.responsables,
      responsablesIds: data.responsablesIds,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Cepa registrada exitosamente',
      recordId: record[0].id
    });

  } catch (error) {
    console.error('Error en API de cepas:', error);
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
    // Usar la tabla de Cepas desde variables de entorno
    const tableId = process.env.AIRTABLE_TABLE_CEPAS;
    
    if (!tableId) {
      throw new Error('Missing AIRTABLE_TABLE_CEPAS environment variable');
    }

    // Obtener registros de Airtable usando nombres de campos exactos
    const records = await base(tableId)
      .select({
        maxRecords: 50,
        sort: [{ field: 'Creacion', direction: 'desc' }]
      })
      .firstPage();

    const formattedRecords = records.map(record => ({
      id: record.get('ID'),
      responsables: record.get('Nombre (from Responsables)'),
      cantidadBolsas: record.get('Cantidad Bolsas'),
      microorganismos: record.get('Microorganismo (from Microorganismos)'),
      fechaCreacion: record.get('Fecha Creacion'),
      creacion: record.get('Creacion')
    }));

    return NextResponse.json({
      success: true,
      records: formattedRecords,
      total: formattedRecords.length
    });

  } catch (error) {
    console.error('Error al obtener registros de Cepas:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener datos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
