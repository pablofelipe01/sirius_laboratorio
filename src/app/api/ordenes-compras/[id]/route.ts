import { NextRequest, NextResponse } from 'next/server';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ORDENES_COMPRA;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { estado, actualizadoPor } = body;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
      return NextResponse.json({ 
        success: false, 
        error: 'Configuración de Airtable incompleta' 
      }, { status: 500 });
    }

    if (!estado || !actualizadoPor) {
      return NextResponse.json({ 
        success: false, 
        error: 'Estado y usuario actualizador son requeridos' 
      }, { status: 400 });
    }

    const airtableData = {
      fields: {
        'Estado': estado,
        'Actualizado Por': actualizadoPor,
        'Fecha Actualizacion': new Date().toISOString()
      }
    };

    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(airtableData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al actualizar orden: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      orden: {
        id: data.id,
        estado: data.fields['Estado'],
        actualizadoPor: data.fields['Actualizado Por'],
        fechaActualizacion: data.fields['Fecha Actualizacion']
      }
    });

  } catch (error) {
    console.error('Error updating orden de compra:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al actualizar la orden de compra' 
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
      return NextResponse.json({ 
        success: false, 
        error: 'Configuración de Airtable incompleta' 
      }, { status: 500 });
    }

    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${id}`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al obtener orden: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();

    const orden = {
      id: data.id,
      cliente: data.fields['Cliente'] || '',
      fechaPedido: data.fields['Fecha Pedido'] || '',
      fechaEntrega: data.fields['Fecha Entrega'] || '',
      estado: data.fields['Estado'] || 'pendiente',
      productos: data.fields['Productos'] ? data.fields['Productos'].split(',').map((p: string) => p.trim()) : [],
      cantidades: data.fields['Cantidades'] ? data.fields['Cantidades'].split(',').map((c: string) => parseInt(c.trim()) || 0) : [],
      observaciones: data.fields['Observaciones'] || '',
      total: parseFloat(data.fields['Total']) || 0,
      prioridad: data.fields['Prioridad'] || 'media',
      creadoPor: data.fields['Creado Por'] || '',
      fechaCreacion: data.fields['Fecha Creacion'] || '',
      actualizadoPor: data.fields['Actualizado Por'] || '',
      fechaActualizacion: data.fields['Fecha Actualizacion'] || '',
    };

    return NextResponse.json({
      success: true,
      orden
    });

  } catch (error) {
    console.error('Error fetching orden de compra:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al obtener la orden de compra' 
    }, { status: 500 });
  }
}
