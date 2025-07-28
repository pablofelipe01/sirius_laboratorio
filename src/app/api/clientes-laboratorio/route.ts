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

export async function GET() {
  try {
    console.log('🏢 Obteniendo clientes de laboratorio:', {
      timestamp: new Date().toISOString()
    });
    
    // Usar la tabla de Clientes Laboratorio desde variables de entorno
    const tableId = process.env.AIRTABLE_TABLE_CLIENTES_LABORATORIO;
    
    if (!tableId) {
      console.error('❌ Missing AIRTABLE_TABLE_CLIENTES_LABORATORIO environment variable');
      throw new Error('Missing AIRTABLE_TABLE_CLIENTES_LABORATORIO environment variable');
    }

    // Obtener registros de clientes
    const records = await base(tableId)
      .select({
        maxRecords: 100,
        sort: [{ field: 'Nombre', direction: 'asc' }],
        fields: [
          'ID',
          'Nombre',
          'NIT',
          'Contacto Cliente'
        ]
      })
      .firstPage();

    const formattedRecords = records.map(record => ({
      id: record.get('ID'),
      nombre: record.get('Nombre'),
      nit: record.get('NIT'),
      contacto: record.get('Contacto Cliente')
    }));

    console.log('✅ Clientes obtenidos:', {
      cantidad: formattedRecords.length,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      clientes: formattedRecords,
      total: formattedRecords.length
    });

  } catch (error) {
    console.error('❌ Error al obtener clientes:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener datos de clientes',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🏢 Creando nuevo cliente:', {
      nombre: body.nombre,
      timestamp: new Date().toISOString()
    });
    
    const tableId = process.env.AIRTABLE_TABLE_CLIENTES_LABORATORIO;
    
    if (!tableId) {
      throw new Error('Missing AIRTABLE_TABLE_CLIENTES_LABORATORIO environment variable');
    }

    // Crear el registro del nuevo cliente
    const record = {
      'Nombre': body.nombre,
      'NIT': body.nit || '',
      'Contacto Cliente': body.contacto || ''
    };

    const createdRecord = await base(tableId).create([
      {
        fields: record
      }
    ]);

    console.log('✅ Cliente creado exitosamente:', {
      id: createdRecord[0].getId(),
      nombre: body.nombre,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Cliente creado exitosamente',
      cliente: {
        id: createdRecord[0].get('ID'),
        nombre: createdRecord[0].get('Nombre'),
        nit: createdRecord[0].get('NIT'),
        contacto: createdRecord[0].get('Contacto Cliente')
      }
    });

  } catch (error) {
    console.error('❌ Error al crear cliente:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al crear el cliente',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
