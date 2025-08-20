import { NextRequest, NextResponse } from 'next/server';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ORDENES_COMPRA;

interface OrdenCompra {
  id: string;
  cliente: string;
  fechaPedido: string;
  fechaEntrega: string;
  estado: string;
  productos: string[];
  cantidades: number[];
  observaciones: string;
  total: number;
  prioridad: string;
  creadoPor: string;
  fechaCreacion: string;
  actualizadoPor?: string;
  fechaActualizacion?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') || 'pendiente';
    const orderBy = searchParams.get('orderBy') || 'fechaEntrega';

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
      return NextResponse.json({ 
        success: false, 
        error: 'Configuración de Airtable incompleta' 
      }, { status: 500 });
    }

    // Construir filtro según el estado
    let filterFormula = '';
    if (estado !== 'todos') {
      filterFormula = `AND({Estado} = '${estado}')`;
    }

    // Construir orden
    let sort = '';
    switch (orderBy) {
      case 'fechaEntrega':
        sort = '&sort[0][field]=Fecha%20Entrega&sort[0][direction]=asc';
        break;
      case 'fechaPedido':
        sort = '&sort[0][field]=Fecha%20Pedido&sort[0][direction]=desc';
        break;
      case 'prioridad':
        sort = '&sort[0][field]=Prioridad&sort[0][direction]=desc';
        break;
      case 'cliente':
        sort = '&sort[0][field]=Cliente&sort[0][direction]=asc';
        break;
    }

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula=${encodeURIComponent(filterFormula)}${sort}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    const ordenes: OrdenCompra[] = data.records.map((record: any) => ({
      id: record.id,
      cliente: record.fields['Cliente'] || '',
      fechaPedido: record.fields['Fecha Pedido'] || '',
      fechaEntrega: record.fields['Fecha Entrega'] || '',
      estado: record.fields['Estado'] || 'pendiente',
      productos: record.fields['Productos'] ? record.fields['Productos'].split(',').map((p: string) => p.trim()) : [],
      cantidades: record.fields['Cantidades'] ? record.fields['Cantidades'].split(',').map((c: string) => parseInt(c.trim()) || 0) : [],
      observaciones: record.fields['Observaciones'] || '',
      total: parseFloat(record.fields['Total']) || 0,
      prioridad: record.fields['Prioridad'] || 'media',
      creadoPor: record.fields['Creado Por'] || '',
      fechaCreacion: record.fields['Fecha Creacion'] || '',
      actualizadoPor: record.fields['Actualizado Por'] || '',
      fechaActualizacion: record.fields['Fecha Actualizacion'] || '',
    }));

    return NextResponse.json({
      success: true,
      ordenes,
      total: ordenes.length
    });

  } catch (error) {
    console.error('Error fetching órdenes de compra:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error al obtener las órdenes de compra' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cliente,
      fechaEntrega,
      productos,
      cantidades,
      observaciones,
      prioridad = 'media',
      creadoPor
    } = body;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
      return NextResponse.json({ 
        success: false, 
        error: 'Configuración de Airtable incompleta' 
      }, { status: 500 });
    }

    if (!cliente || !fechaEntrega || !productos || !cantidades || !creadoPor) {
      return NextResponse.json({ 
        success: false, 
        error: 'Datos incompletos' 
      }, { status: 400 });
    }

    // Calcular total (simplificado - podrías tener precios por producto)
    const total = cantidades.reduce((acc: number, cant: number) => acc + cant, 0);

    const airtableData = {
      fields: {
        'Cliente': cliente,
        'Fecha Pedido': new Date().toISOString().split('T')[0],
        'Fecha Entrega': fechaEntrega,
        'Estado': 'pendiente',
        'Productos': productos.join(', '),
        'Cantidades': cantidades.join(', '),
        'Observaciones': observaciones || '',
        'Total': total,
        'Prioridad': prioridad,
        'Creado Por': creadoPor,
        'Fecha Creacion': new Date().toISOString()
      }
    };

    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(airtableData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al crear orden: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      orden: {
        id: data.id,
        cliente: data.fields['Cliente'],
        fechaPedido: data.fields['Fecha Pedido'],
        fechaEntrega: data.fields['Fecha Entrega'],
        estado: data.fields['Estado'],
        productos: data.fields['Productos'].split(', '),
        cantidades: data.fields['Cantidades'].split(', ').map((c: string) => parseInt(c)),
        observaciones: data.fields['Observaciones'],
        total: data.fields['Total'],
        prioridad: data.fields['Prioridad']
      }
    });

  } catch (error) {
    console.error('Error creating orden de compra:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al crear la orden de compra' 
    }, { status: 500 });
  }
}
