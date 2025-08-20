import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { estado, actualizadoPor } = body;

    // Para datos de ejemplo, solo retornamos éxito
    // En una implementación real, esto actualizaría la base de datos
    
    return NextResponse.json({
      success: true,
      orden: {
        id: id,
        estado: estado,
        actualizadoPor: actualizadoPor,
        fechaActualizacion: new Date().toISOString()
      },
      message: "Estado actualizado (simulación) - configura Airtable para persistencia real"
    });

  } catch (error) {
    console.error('Error updating orden de ejemplo:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error al actualizar orden de ejemplo' 
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Datos de ejemplo para una orden específica
    const ordenEjemplo = {
      id: id,
      cliente: "Cliente Ejemplo",
      fechaPedido: "2025-01-15",
      fechaEntrega: "2025-01-25",
      estado: "pendiente",
      productos: ["Hongos Shiitake"],
      cantidades: [50],
      observaciones: "Orden de ejemplo",
      total: 50,
      prioridad: "media",
      creadoPor: "Admin Sistema",
      fechaCreacion: "2025-01-15T10:00:00Z"
    };

    return NextResponse.json({
      success: true,
      orden: ordenEjemplo,
      message: "Datos de ejemplo - configura Airtable para datos reales"
    });

  } catch (error) {
    console.error('Error fetching orden de ejemplo:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error al obtener orden de ejemplo' 
    }, { status: 500 });
  }
}
