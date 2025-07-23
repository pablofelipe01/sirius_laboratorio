import { NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurar Airtable
if (process.env.AIRTABLE_API_KEY) {
  Airtable.configure({ apiKey: process.env.AIRTABLE_API_KEY });
} else if (process.env.AIRTABLE_PAT) {
  Airtable.configure({ apiKey: process.env.AIRTABLE_PAT });
}

// const base = Airtable.base(process.env.AIRTABLE_BASE_ID!);

export async function GET() {
  try {
    // Verificar configuración
    if (!process.env.AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { success: false, error: 'AIRTABLE_BASE_ID no está configurado' },
        { status: 500 }
      );
    }

    if (!process.env.AIRTABLE_API_KEY && !process.env.AIRTABLE_PAT) {
      return NextResponse.json(
        { success: false, error: 'AIRTABLE_API_KEY o AIRTABLE_PAT no está configurado' },
        { status: 500 }
      );
    }

    // Obtener información de la base usando la API REST de Airtable
    const baseUrl = `https://api.airtable.com/v0/meta/bases/${process.env.AIRTABLE_BASE_ID}/tables`;
    const headers = {
      'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_PAT}`
    };

    const response = await fetch(baseUrl, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Extraer información útil de cada tabla
    const tables = data.tables.map((table: {
      id: string;
      name: string;
      primaryFieldId: string;
      fields: Array<{ id: string; name: string; type: string }>;
      views: Array<{ id: string; name: string; type: string }>;
    }) => ({
      id: table.id,
      name: table.name,
      primaryFieldId: table.primaryFieldId,
      fields: table.fields.map((field: { id: string; name: string; type: string }) => ({
        id: field.id,
        name: field.name,
        type: field.type
      })),
      views: table.views.map((view: { id: string; name: string; type: string }) => ({
        id: view.id,
        name: view.name,
        type: view.type
      }))
    }));

    return NextResponse.json({
      success: true,
      baseId: process.env.AIRTABLE_BASE_ID,
      tables: tables
    });

  } catch (error) {
    console.error('Error fetching base schema:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al obtener esquema de la base', 
        details: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    );
  }
}
