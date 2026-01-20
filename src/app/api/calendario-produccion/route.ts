import { NextResponse } from 'next/server';

// Simulación de base de datos en memoria
const eventos: Array<Record<string, unknown>> = [];

// GET - Obtener todos los eventos
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      eventos: eventos,
    });
  } catch (error) {
    console.error('Error fetching eventos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener eventos' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo evento
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const newEvento = {
      id: Date.now().toString(),
      titulo: body.titulo,
      tipo: body.tipo,
      fecha: body.fecha,
      descripcion: body.descripcion || '',
      responsable: body.responsable || '',
      estado: body.estado || 'planificado',
      prioridad: body.prioridad || 'media',
      cliente: body.cliente || '',
      microorganismo: body.microorganismo || '',
      litros: body.litros || 0,
    };

    eventos.push(newEvento);

    return NextResponse.json({
      success: true,
      evento: newEvento,
      message: 'Evento creado exitosamente',
    });
  } catch (error) {
    console.error('Error creating evento:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear evento' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar evento existente
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    const eventoIndex = eventos.findIndex(e => e.id === id);
    
    if (eventoIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    eventos[eventoIndex] = {
      ...eventos[eventoIndex],
      ...updates,
    };

    return NextResponse.json({
      success: true,
      evento: eventos[eventoIndex],
      message: 'Evento actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error updating evento:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar evento' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar evento
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de evento requerido' },
        { status: 400 }
      );
    }

    const eventoIndex = eventos.findIndex(e => e.id === id);
    
    if (eventoIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    eventos.splice(eventoIndex, 1);

    return NextResponse.json({
      success: true,
      message: 'Evento eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error deleting evento:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar evento' },
      { status: 500 }
    );
  }
}