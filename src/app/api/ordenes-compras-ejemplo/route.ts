import { NextRequest, NextResponse } from 'next/server';

// Datos de ejemplo para testing - puedes usar estos datos si no tienes Airtable configurado
const ordenesEjemplo = [
  {
    id: "rec1",
    cliente: "Restaurante La Plaza",
    fechaPedido: "2025-01-15",
    fechaEntrega: "2025-01-25",
    estado: "pendiente",
    productos: ["Hongos Shiitake", "Hongos Ostra"],
    cantidades: [50, 30],
    observaciones: "Entrega preferiblemente en la mañana",
    total: 80,
    prioridad: "alta",
    creadoPor: "Admin Sistema",
    fechaCreacion: "2025-01-15T10:00:00Z"
  },
  {
    id: "rec2",
    cliente: "Mercado Orgánico Verde",
    fechaPedido: "2025-01-16",
    fechaEntrega: "2025-01-28",
    estado: "en_proceso",
    productos: ["Hongos Portobello", "Hongos Shiitake", "Hongos Reishi"],
    cantidades: [20, 40, 15],
    observaciones: "Cliente prefiere productos extra frescos",
    total: 75,
    prioridad: "media",
    creadoPor: "Admin Sistema",
    fechaCreacion: "2025-01-16T14:30:00Z",
    actualizadoPor: "Operador Lab",
    fechaActualizacion: "2025-01-17T09:15:00Z"
  },
  {
    id: "rec3",
    cliente: "Supermercado Central",
    fechaPedido: "2025-01-14",
    fechaEntrega: "2025-01-22",
    estado: "listo",
    productos: ["Hongos Ostra", "Hongos Champignon"],
    cantidades: [100, 80],
    observaciones: "Orden recurrente semanal",
    total: 180,
    prioridad: "baja",
    creadoPor: "Admin Sistema",
    fechaCreacion: "2025-01-14T08:00:00Z",
    actualizadoPor: "Operador Lab",
    fechaActualizacion: "2025-01-20T16:45:00Z"
  },
  {
    id: "rec4",
    cliente: "Café Gourmet",
    fechaPedido: "2025-01-18",
    fechaEntrega: "2025-01-20",
    estado: "pendiente",
    productos: ["Hongos Shiitake Gourmet"],
    cantidades: [10],
    observaciones: "Para evento especial del fin de semana",
    total: 25,
    prioridad: "alta",
    creadoPor: "Admin Sistema",
    fechaCreacion: "2025-01-18T11:20:00Z"
  },
  {
    id: "rec5",
    cliente: "Distribuidora Los Andes",
    fechaPedido: "2025-01-12",
    fechaEntrega: "2025-01-19",
    estado: "entregado",
    productos: ["Hongos Ostra", "Hongos Shiitake", "Hongos Portobello"],
    cantidades: [60, 40, 20],
    observaciones: "Entrega completada exitosamente",
    total: 120,
    prioridad: "media",
    creadoPor: "Admin Sistema",
    fechaCreacion: "2025-01-12T13:00:00Z",
    actualizadoPor: "Operador Lab",
    fechaActualizacion: "2025-01-19T10:30:00Z"
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') || 'pendiente';
    const orderBy = searchParams.get('orderBy') || 'fechaEntrega';

    // Filtrar por estado
    let ordenesFiltradas = ordenesEjemplo;
    if (estado !== 'todos') {
      ordenesFiltradas = ordenesEjemplo.filter(orden => orden.estado === estado);
    }

    // Ordenar
    switch (orderBy) {
      case 'fechaEntrega':
        ordenesFiltradas.sort((a, b) => new Date(a.fechaEntrega).getTime() - new Date(b.fechaEntrega).getTime());
        break;
      case 'fechaPedido':
        ordenesFiltradas.sort((a, b) => new Date(b.fechaPedido).getTime() - new Date(a.fechaPedido).getTime());
        break;
      case 'prioridad':
        const prioridadOrder = { 'alta': 3, 'media': 2, 'baja': 1 };
        ordenesFiltradas.sort((a, b) => (prioridadOrder[a.prioridad as keyof typeof prioridadOrder] || 0) - (prioridadOrder[b.prioridad as keyof typeof prioridadOrder] || 0));
        break;
      case 'cliente':
        ordenesFiltradas.sort((a, b) => a.cliente.localeCompare(b.cliente));
        break;
    }

    return NextResponse.json({
      success: true,
      ordenes: ordenesFiltradas,
      total: ordenesFiltradas.length,
      message: "Datos de ejemplo - configura Airtable para datos reales"
    });

  } catch (error) {
    console.error('Error en datos de ejemplo:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error al obtener datos de ejemplo' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Simular creación de orden
    const nuevaOrden = {
      id: `rec${Date.now()}`,
      cliente: body.cliente,
      fechaPedido: new Date().toISOString().split('T')[0],
      fechaEntrega: body.fechaEntrega,
      estado: 'pendiente',
      productos: body.productos,
      cantidades: body.cantidades,
      observaciones: body.observaciones || '',
      total: body.cantidades.reduce((acc: number, cant: number) => acc + cant, 0),
      prioridad: body.prioridad || 'media',
      creadoPor: body.creadoPor,
      fechaCreacion: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      orden: nuevaOrden,
      message: "Orden creada (datos de ejemplo) - configura Airtable para persistencia real"
    });

  } catch (error) {
    console.error('Error creando orden de ejemplo:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error al crear orden de ejemplo' 
    }, { status: 500 });
  }
}
