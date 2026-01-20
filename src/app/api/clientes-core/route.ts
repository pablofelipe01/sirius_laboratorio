import { NextResponse } from 'next/server';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY_SIRIUS_CLIENTES_CORE;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SIRIUS_CLIENTES_CORE;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_CLIENTES_CORE;

interface AirtableCliente {
  id: string;
  createdTime: string;
  fields: {
    ID?: string;
    'Codigo Serial'?: number;
    'Fecha de creacion'?: string;
    Cliente?: string;
    Nit?: string;
    Direccion?: string;
    Ciudad?: string;
    Departamento?: string;
    RUT?: Array<{
      id: string;
      url: string;
      filename: string;
      size: number;
      type: string;
    }>;
    'Cámara de Comercio'?: Array<{
      id: string;
      url: string;
      filename: string;
      size: number;
      type: string;
    }>;
    'Cultivos Clientes'?: string[];
  };
}

export async function GET() {
  try {
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
      console.error('❌ Missing Airtable configuration for Clientes Core');
      return NextResponse.json(
        { success: false, error: 'Configuración de Airtable incompleta' },
        { status: 500 }
      );
    }

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;
    
    console.log('🔍 Fetching clientes from Airtable Core...');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Airtable API error:', response.status, errorData);
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transformar los datos de Airtable a un formato más simple
    const clientes = data.records.map((record: AirtableCliente) => ({
      id: record.fields.ID || record.id,
      airtableId: record.id,
      nombre: record.fields.Cliente || '',
      nit: record.fields.Nit || '',
      direccion: record.fields.Direccion || '',
      ciudad: record.fields.Ciudad || '',
      departamento: record.fields.Departamento || '',
      codigoSerial: record.fields['Codigo Serial'] || 0,
      fechaCreacion: record.fields['Fecha de creacion'] || record.createdTime,
      tieneRUT: record.fields.RUT && record.fields.RUT.length > 0,
      tieneCamaraComercio: record.fields['Cámara de Comercio'] && record.fields['Cámara de Comercio'].length > 0,
      cultivos: record.fields['Cultivos Clientes'] || [],
    }));

    console.log(`✅ Successfully fetched ${clientes.length} clientes from Airtable Core`);

    return NextResponse.json({
      success: true,
      clientes: clientes,
      total: clientes.length,
    });

  } catch (error) {
    console.error('❌ Error fetching clientes from Airtable Core:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error al obtener clientes',
        clientes: []
      },
      { status: 500 }
    );
  }
}
