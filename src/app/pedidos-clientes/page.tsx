'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ModalPedido from '@/components/ModalPedido';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

import { 
  Package, 
  Users, 
  DollarSign, 
  Clock, 
  Search, 
  Filter, 
  Plus,
  Edit,
  Eye,
  CheckCircle
} from 'lucide-react';

interface Cliente {
  id: string;
  nombre: string;
  codigo: string;
  contacto?: string;
  telefono?: string;
  email?: string;
}

interface Pedido {
  id: string;
  idPedidoCore: string;
  idNumerico: number;
  clienteId: string;
  clienteNombre: string;
  fechaPedido: string;
  fechaEntrega?: string;
  estado: string;
  origen: string;
  notas: string;
  productos: PedidoProducto[];
  detallesIds: string[];
  total: number;
  createdTime: string;
}

interface PedidoProducto {
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  subtotal: number;
}

export default function PedidosClientesPage() {
  const { user, isAuthenticated } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  
  // Modal para nuevo pedido
  const [showModal, setShowModal] = useState(false);
  const [pedidoEditando, setPedidoEditando] = useState<Pedido | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      // Cargar clientes primero, luego pedidos
      fetchClientes().then(() => fetchPedidos());
    }
  }, [isAuthenticated]);

  const fetchClientes = async () => {
    try {
      const response = await fetch('/api/clientes-core');
      const data = await response.json();
      if (response.ok) {
        setClientes(data.clientes || []);
      } else {
        console.error('Error loading clientes:', data.error);
      }
    } catch (error) {
      console.error('Error fetching clientes:', error);
    }
  };

  const fetchPedidos = async () => {
    try {
      setLoading(true);
      // Obtener pedidos con detalles incluidos
      const response = await fetch('/api/pedidos-clientes?incluirDetalles=true');
      const data = await response.json();
      if (response.ok && data.success) {
        // Mapear pedidos con información adicional
        const pedidosMapeados = (data.pedidos || []).map((pedido: any) => {
          // Buscar nombre del cliente
          const cliente = clientes.find(c => c.id === pedido.clienteId || c.codigo === pedido.clienteId);
          
          // Obtener detalles del pedido
          const detallesPedido = data.detalles?.[pedido.id] || [];
          
          // Calcular total sumando cantidades * precios
          const total = detallesPedido.reduce((sum: number, det: any) => {
            return sum + ((det.cantidad || 0) * (det.precioUnitario || 0));
          }, 0);
          
          // Mapear productos con nombres
          const productos = detallesPedido.map((det: any) => {
            const productoInfo = data.productos?.[det.idProductoCore] || {};
            return {
              productoId: det.id,
              nombreProducto: productoInfo.nombre || det.idProductoCore,
              cantidad: det.cantidad || 0,
              unidad: 'litros',
              precioUnitario: det.precioUnitario || 0,
              subtotal: (det.cantidad || 0) * (det.precioUnitario || 0)
            };
          });
          
          return {
            ...pedido,
            clienteNombre: cliente?.nombre || pedido.clienteId || 'Cliente desconocido',
            productos,
            total
          };
        });
        
        setPedidos(pedidosMapeados);
        console.log('📦 Pedidos cargados:', pedidosMapeados.length);
      } else {
        console.error('Error loading pedidos:', data.error);
        setPedidos([]);
      }
    } catch (error) {
      console.error('Error fetching pedidos:', error);
      setPedidos([]); // Datos de ejemplo por ahora
    } finally {
      setLoading(false);
    }
  };

  const crearNuevoPedido = () => {
    setPedidoEditando(null);
    setShowModal(true);
  };

  const editarPedido = (pedido: Pedido) => {
    setPedidoEditando(pedido);
    setShowModal(true);
  };

  const guardarPedido = async (pedidoData: any) => {
    try {
      const url = pedidoEditando ? '/api/pedidos-clientes' : '/api/pedidos-clientes';
      const method = pedidoEditando ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pedidoEditando ? { ...pedidoData, id: pedidoEditando.id } : pedidoData),
      });

      const data = await response.json();
      
      if (data.success) {
        // Recargar la lista de pedidos
        fetchPedidos();
        console.log('✅ Pedido guardado exitosamente');
      } else {
        console.error('❌ Error guardando pedido:', data.error);
      }
    } catch (error) {
      console.error('❌ Error guardando pedido:', error);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'recibido': return 'bg-yellow-100 text-yellow-800';
      case 'procesando': return 'bg-blue-100 text-blue-800';
      case 'en_proceso': return 'bg-blue-100 text-blue-800';
      case 'completado': return 'bg-green-100 text-green-800';
      case 'entregado': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      case 'pendiente': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatearPrecio = (precio: number) => {
    if (isNaN(precio) || precio === undefined || precio === null) {
      return '$ 0';
    }
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio);
  };

  // Filtrar pedidos
  const pedidosFiltrados = pedidos.filter(pedido => {
    const matchCliente = !filtroCliente || 
      pedido.clienteNombre.toLowerCase().includes(filtroCliente.toLowerCase()) ||
      pedido.idPedidoCore?.toLowerCase().includes(filtroCliente.toLowerCase()) ||
      pedido.notas?.toLowerCase().includes(filtroCliente.toLowerCase());
    const matchEstado = !filtroEstado || pedido.estado.toLowerCase() === filtroEstado.toLowerCase();
    const matchFecha = !filtroFecha || pedido.fechaPedido.includes(filtroFecha);
    return matchCliente && matchEstado && matchFecha;
  });

  // Estadísticas con estados de Airtable
  const estadisticas = {
    total: pedidos.length,
    recibidos: pedidos.filter(p => p.estado.toLowerCase() === 'recibido').length,
    procesando: pedidos.filter(p => p.estado.toLowerCase() === 'procesando').length,
    entregados: pedidos.filter(p => p.estado.toLowerCase() === 'entregado' || p.estado.toLowerCase() === 'completado').length,
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Acceso Restringido</h2>
          <p className="text-gray-600">Debes iniciar sesión para acceder a los pedidos de clientes.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div 
        className="min-h-screen relative pt-24"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8 text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-4">
                🛒 PEDIDOS CLIENTES
              </h1>
              <p className="text-gray-600 mb-6">
                Gestión integral de pedidos y órdenes de clientes del laboratorio
              </p>
            </div>

            {/* Controles y Filtros */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Gestión de Pedidos</h2>
                <button
                  onClick={crearNuevoPedido}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg"
                >
                  <Plus size={20} />
                  Nuevo Pedido
                </button>
              </div>
              {/* Filtros y Búsqueda */}
              <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Buscar pedidos por cliente, ID, observaciones..."
                      value={filtroCliente}
                      onChange={(e) => setFiltroCliente(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos los estados</option>
                    <option value="Recibido">Recibido</option>
                    <option value="Procesando">Procesando</option>
                    <option value="Entregado">Entregado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                  <input
                    type="date"
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <div className="text-3xl mb-2">📋</div>
                <p className="text-sm font-medium text-gray-500">Total Pedidos</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.total}</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <div className="text-3xl mb-2">📩</div>
                <p className="text-sm font-medium text-gray-500">Recibidos</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {estadisticas.recibidos}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <div className="text-3xl mb-2">🔄</div>
                <p className="text-sm font-medium text-gray-500">Procesando</p>
                <p className="text-2xl font-bold text-blue-600">
                  {estadisticas.procesando}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-sm font-medium text-gray-500">Entregados</p>
                <p className="text-2xl font-bold text-green-600">
                  {estadisticas.entregados}
                </p>
              </div>
            </div>

            {/* Lista de Pedidos */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800">
                  Lista de Pedidos ({pedidosFiltrados.length})
                </h3>
              </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Cargando pedidos...</p>
            </div>
          ) : pedidosFiltrados.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No hay pedidos</h3>
              <p className="text-gray-600 mb-4">
                {pedidos.length === 0 
                  ? "Aún no se han registrado pedidos de clientes."
                  : "No se encontraron pedidos con los filtros aplicados."
                }
              </p>
              <button
                onClick={crearNuevoPedido}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Crear Primer Pedido
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pedido
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Pedido
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pedidosFiltrados.map((pedido) => (
                    <tr key={pedido.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600">
                          {pedido.idPedidoCore || `PED-${pedido.idNumerico || '?'}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {pedido.productos?.length || 0} producto(s)
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {pedido.clienteNombre}
                        </div>
                        <div className="text-xs text-gray-400">
                          {pedido.clienteId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatearFecha(pedido.fechaPedido)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(pedido.estado)}`}>
                          {pedido.estado.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatearPrecio(pedido.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => editarPedido(pedido)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          Editar
                        </button>
                        <button className="text-green-600 hover:text-green-800 mr-3">
                          Ver
                        </button>
                        <button className="text-red-600 hover:text-red-800">
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
            </div>

          </div>
        </div>
      </div>
      
      <Footer />

      {/* Modal de Pedido */}
      <ModalPedido
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={guardarPedido}
        pedidoEditando={pedidoEditando}
        clientes={clientes}
        idUsuarioResponsable={user?.idEmpleado}
      />
    </>
  );
}