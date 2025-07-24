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

    // Generar código de lote único
    const generateBatchCode = () => {
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `INO-${date}-${random}`;
    };

    const batchCode = generateBatchCode();

    // Crear registro en Airtable
    const record = await base(process.env.AIRTABLE_TABLE_NAME || 'Inoculaciones').create([
      {
        fields: {
          'Codigo_Lote': batchCode,
          'Cantidad_Bolsas': data.bagQuantity,
          'Microorganismo': data.microorganism,
          'Fecha_Inoculacion': data.inoculationDate,
          'Investigador': data.researcher,
          'Sustrato': data.substrate || '',
          'Temperatura': data.temperature || 0,
          'Humedad': data.humidity || 0,
          'Notas': data.notes || '',
          'Fecha_Registro': new Date().toISOString(),
          'Estado': 'Activo'
        }
      }
    ]);

    // Log del registro exitoso
    console.log('✅ Inoculación registrada:', {
      batchCode,
      recordId: record[0].id,
      browser: browserName,
      microorganism: data.microorganism,
      bagQuantity: data.bagQuantity,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Inoculación registrada exitosamente',
      batchCode: batchCode,
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
    // Obtener registros de Airtable (útil para consultas)
    const records = await base(process.env.AIRTABLE_TABLE_NAME || 'Inoculaciones')
      .select({
        maxRecords: 50,
        sort: [{ field: 'Fecha_Registro', direction: 'desc' }]
      })
      .firstPage();

    const formattedRecords = records.map(record => ({
      id: record.id,
      codigoLote: record.get('Codigo_Lote'),
      cantidadBolsas: record.get('Cantidad_Bolsas'),
      microorganismo: record.get('Microorganismo'),
      fechaInoculacion: record.get('Fecha_Inoculacion'),
      investigador: record.get('Investigador'),
      sustrato: record.get('Sustrato'),
      temperatura: record.get('Temperatura'),
      humedad: record.get('Humedad'),
      notas: record.get('Notas'),
      fechaRegistro: record.get('Fecha_Registro'),
      estado: record.get('Estado')
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
