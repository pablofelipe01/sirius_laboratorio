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
  estado?: 'pendiente' | 'en_proceso' | 'completado' | 'cancelado';
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
  
  // Estados para verificación de stock y despacho
  const [showVerificarStockModal, setShowVerificarStockModal] = useState(false);
  const [verificacionStock, setVerificacionStock] = useState<any>(null);
  const [loadingVerificacion, setLoadingVerificacion] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      // Cargar clientes y pedidos
      cargarDatos();
    }
  }, [isAuthenticated]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Primero cargar clientes
      const clientesResponse = await fetch('/api/clientes-core');
      const clientesData = await clientesResponse.json();
      const clientesCargados = clientesData.clientes || [];
      setClientes(clientesCargados);
      
      console.log('👥 Clientes cargados:', clientesCargados.length);
      if (clientesCargados.length > 0) {
        console.log('👤 Primer cliente:', {
          id: clientesCargados[0].id,
          codigo: clientesCargados[0].codigo,
          nombre: clientesCargados[0].nombre
        });
      }

      // Luego cargar pedidos con los clientes ya disponibles
      const pedidosResponse = await fetch('/api/pedidos-clientes?incluirDetalles=true');
      const pedidosData = await pedidosResponse.json();
      
      if (pedidosResponse.ok && pedidosData.success) {
        // Mapear pedidos con información adicional
        const pedidosMapeados = (pedidosData.pedidos || []).map((pedido: any) => {
          // Buscar nombre del cliente usando los clientes recién cargados
          const cliente = clientesCargados.find((c: Cliente) => 
            c.id === pedido.clienteId || c.codigo === pedido.clienteId
          );
          
          console.log('🔍 Mapeando pedido:', pedido.id, {
            clienteId: pedido.clienteId,
            clienteEncontrado: cliente?.nombre || 'NO ENCONTRADO',
            totalClientes: clientesCargados.length
          });
          
          // Obtener detalles del pedido
          const detallesPedido = pedidosData.detalles?.[pedido.id] || [];
          
          // Calcular total sumando cantidades * precios
          const total = detallesPedido.reduce((sum: number, det: any) => {
            return sum + ((det.cantidad || 0) * (det.precioUnitario || 0));
          }, 0);
          
          // Mapear productos con nombres
          const productos = detallesPedido.map((det: any) => {
            const productoInfo = pedidosData.productos?.[det.idProductoCore] || {};
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
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

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
      
      // Si no hay clientes cargados, cargarlos primero
      let clientesDisponibles = clientes;
      if (clientesDisponibles.length === 0) {
        const clientesResponse = await fetch('/api/clientes-core');
        const clientesData = await clientesResponse.json();
        clientesDisponibles = clientesData.clientes || [];
        setClientes(clientesDisponibles);
      }
      
      // Obtener pedidos con detalles incluidos
      const response = await fetch('/api/pedidos-clientes?incluirDetalles=true');
      const data = await response.json();
      if (response.ok && data.success) {
        // Mapear pedidos con información adicional
        const pedidosMapeados = (data.pedidos || []).map((pedido: any) => {
          // Buscar nombre del cliente
          const cliente = clientesDisponibles.find((c: Cliente) => 
            c.id === pedido.clienteId || c.codigo === pedido.clienteId
          );
          
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

  // Función para verificar stock y abrir modal de despacho
  const verificarStockParaDespacho = async (pedido: Pedido) => {
    if (!pedido.idPedidoCore) {
      alert('Este pedido no tiene ID de Pedido Core');
      return;
    }

    setPedidoSeleccionado(pedido);
    setLoadingVerificacion(true);
    setShowVerificarStockModal(true);

    try {
      console.log('🔍 Verificando stock para pedido:', pedido.idPedidoCore);
      const response = await fetch(`/api/pedidos/verificar-stock?pedidoId=${pedido.idPedidoCore}`);
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers.get('content-type'));
      
      // Verificar si la respuesta tiene contenido
      const text = await response.text();
      console.log('📄 Response text:', text);
      
      if (!text) {
        throw new Error('Respuesta vacía del servidor');
      }
      
      const data = JSON.parse(text);
      
      if (data.success) {
        setVerificacionStock(data);
      } else {
        console.error('Error verificando stock:', data.error);
        setVerificacionStock({ success: false, error: data.error });
      }
    } catch (error) {
      console.error('Error verificando stock:', error);
      setVerificacionStock({ success: false, error: error instanceof Error ? error.message : 'Error de conexión' });
    } finally {
      setLoadingVerificacion(false);
    }
  };

  // Función para generar remisión (placeholder)
  const generarRemision = async () => {
    if (!pedidoSeleccionado || !verificacionStock?.pedidoCompleto) return;

    try {
      alert('🚧 Función de generación de remisión en desarrollo.\n\n' +
            'Próximamente se creará la remisión en Sirius Remisiones Core.');
      
      // TODO: Implementar creación de remisión
      // const response = await fetch('/api/remisiones/crear', {
      //   method: 'POST',
      //   body: JSON.stringify({ pedidoId: pedidoSeleccionado.idPedidoCore })
      // });
      
      setShowVerificarStockModal(false);
    } catch (error) {
      console.error('Error generando remisión:', error);
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
    const matchEstado = !filtroEstado || pedido.estado?.toLowerCase() === filtroEstado.toLowerCase();
    const matchFecha = !filtroFecha || pedido.fechaPedido.includes(filtroFecha);
    return matchCliente && matchEstado && matchFecha;
  });

  // Estadísticas con estados de Airtable
  const estadisticas = {
    total: pedidos.length,
    recibidos: pedidos.filter(p => p.estado?.toLowerCase() === 'recibido').length,
    procesando: pedidos.filter(p => p.estado?.toLowerCase() === 'procesando').length,
    entregados: pedidos.filter(p => p.estado?.toLowerCase() === 'entregado' || p.estado?.toLowerCase() === 'completado').length,
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
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(pedido.estado || 'pendiente')}`}>
                          {(pedido.estado || 'pendiente').replace('_', ' ').toUpperCase()}
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
                        {(pedido.estado?.toLowerCase() === 'recibido' || pedido.estado?.toLowerCase() === 'procesando') && (
                          <button 
                            onClick={() => verificarStockParaDespacho(pedido)}
                            className="text-purple-600 hover:text-purple-800 mr-3 font-semibold"
                          >
                            📦 Despachar
                          </button>
                        )}
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

      {/* Modal de Verificación de Stock y Despacho */}
      {showVerificarStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    📦 Verificación de Stock para Despacho
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Pedido: <span className="font-semibold">{pedidoSeleccionado?.idPedidoCore || 'N/A'}</span> | 
                    Cliente: <span className="font-semibold">{pedidoSeleccionado?.clienteNombre || 'N/A'}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowVerificarStockModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {loadingVerificacion ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                  <p className="text-gray-600">Verificando disponibilidad de stock...</p>
                </div>
              ) : verificacionStock ? (
                <>
                  {/* Estado General */}
                  <div className={`p-6 rounded-lg mb-6 ${
                    verificacionStock.pedidoCompleto 
                      ? 'bg-green-50 border-2 border-green-200' 
                      : 'bg-yellow-50 border-2 border-yellow-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">
                        {verificacionStock.pedidoCompleto ? '✅' : '⚠️'}
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-800">
                          {verificacionStock.pedidoCompleto 
                            ? 'Pedido Completo - Listo para Despachar' 
                            : 'Pedido Incompleto - Stock Insuficiente'
                          }
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {verificacionStock.pedidoCompleto 
                            ? 'Todos los productos tienen stock disponible. Puede proceder con el despacho.'
                            : 'Algunos productos no tienen stock suficiente. Revise los detalles abajo.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Resumen */}
                  {verificacionStock.resumen && (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-sm text-gray-600">Total Pedido</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {verificacionStock.resumen.totalPedido?.toLocaleString('es-CO')} L
                        </p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <p className="text-sm text-gray-600">Stock Disponible</p>
                        <p className="text-2xl font-bold text-green-600">
                          {verificacionStock.resumen.totalDisponible?.toLocaleString('es-CO')} L
                        </p>
                      </div>
                      <div className={`p-4 rounded-lg border ${
                        verificacionStock.resumen.totalFaltante > 0 
                          ? 'bg-red-50 border-red-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}>
                        <p className="text-sm text-gray-600">Faltante</p>
                        <p className={`text-2xl font-bold ${
                          verificacionStock.resumen.totalFaltante > 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {verificacionStock.resumen.totalFaltante?.toLocaleString('es-CO')} L
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Detalles por Producto */}
                  <div className="space-y-3">
                    <h5 className="font-semibold text-gray-700 mb-3">Detalle por Producto:</h5>
                    {verificacionStock.productos?.map((prod: any, idx: number) => (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-lg border ${
                          prod.completo 
                            ? 'bg-white border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">
                                {prod.completo ? '✅' : '❌'}
                              </span>
                              <h6 className="font-semibold text-gray-800">
                                {prod.productoNombre}
                              </h6>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              ID Producto: {prod.productoId}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex gap-4">
                              <div>
                                <p className="text-xs text-gray-500">Pedido</p>
                                <p className="font-bold text-blue-600">
                                  {prod.cantidadPedida?.toLocaleString('es-CO')} L
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Disponible</p>
                                <p className={`font-bold ${
                                  prod.stockDisponible >= prod.cantidadPedida 
                                    ? 'text-green-600' 
                                    : 'text-red-600'
                                }`}>
                                  {prod.stockDisponible?.toLocaleString('es-CO')} L
                                </p>
                              </div>
                              {prod.faltante > 0 && (
                                <div>
                                  <p className="text-xs text-gray-500">Faltante</p>
                                  <p className="font-bold text-red-600">
                                    {prod.faltante?.toLocaleString('es-CO')} L
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Barra de progreso */}
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                prod.completo ? 'bg-green-500' : 'bg-red-500'
                              }`}
                              style={{ 
                                width: `${Math.min((prod.stockDisponible / prod.cantidadPedida) * 100, 100)}%` 
                              }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {((prod.stockDisponible / prod.cantidadPedida) * 100).toFixed(1)}% disponible
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => setShowVerificarStockModal(false)}
                      className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                    {verificacionStock.productos?.some((p: any) => p.stockDisponible > 0) && (
                      <div className="flex-1">
                        {!verificacionStock.pedidoCompleto && (
                          <p className="text-sm text-amber-600 mb-2 font-medium">
                            ⚠️ Despacho parcial: solo productos con stock disponible
                          </p>
                        )}
                        <button
                          onClick={generarRemision}
                          className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg ${
                            verificacionStock.pedidoCompleto
                              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
                          }`}
                        >
                          {verificacionStock.pedidoCompleto 
                            ? '🚀 Generar Remisión Completa' 
                            : '📦 Despachar Productos Disponibles'
                          }
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">❌</div>
                  <p className="text-gray-600">Error al verificar el stock</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}