'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

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
}

export default function ClientesPage() {
  const { user } = useAuth();
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('pendiente');
  const [ordenamientoPor, setOrdenamientoPor] = useState('fechaEntrega');

  useEffect(() => {
    if (user) {
      fetchOrdenesPendientes();
    }
  }, [user, filtroEstado, ordenamientoPor]);

  const fetchOrdenesPendientes = async () => {
    try {
      setLoading(true);
      // Usar datos de ejemplo por ahora - cambia a '/api/ordenes-compras' cuando tengas Airtable configurado
      const response = await fetch(`/api/ordenes-compras-ejemplo?estado=${filtroEstado}&orderBy=${ordenamientoPor}`);
      const data = await response.json();
      
      if (data.success) {
        setOrdenes(data.ordenes || []);
        if (data.message) {
          console.log(data.message); // Mensaje informativo sobre datos de ejemplo
        }
      } else {
        setError(data.error || 'Error al cargar las órdenes');
      }
    } catch (err) {
      console.error('Error fetching órdenes:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const actualizarEstadoOrden = async (ordenId: string, nuevoEstado: string) => {
    try {
      // Para datos de ejemplo, solo simulamos la actualización
      const response = await fetch(`/api/ordenes-compras-ejemplo/${ordenId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          estado: nuevoEstado,
          actualizadoPor: user?.nombre 
        }),
      });

      if (response.ok) {
        // Actualizar localmente para datos de ejemplo
        setOrdenes(prevOrdenes => 
          prevOrdenes.map(orden => 
            orden.id === ordenId 
              ? { ...orden, estado: nuevoEstado }
              : orden
          )
        );
      } else {
        setError('Error al actualizar el estado (simulación)');
      }
    } catch (err) {
      console.error('Error updating orden:', err);
      setError('Error de conexión al actualizar');
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'en_proceso': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'listo': return 'bg-green-100 text-green-800 border-green-200';
      case 'entregado': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelado': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return 'bg-red-100 text-red-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'baja': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDiasRestantes = (fechaEntrega: string) => {
    const hoy = new Date();
    const entrega = new Date(fechaEntrega);
    const diferencia = Math.ceil((entrega.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diferencia;
  };

  if (!user) {
    return (
      <div className="min-h-screen relative">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/LABI, el robot científico.png')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-purple-900/85 to-pink-900/90"></div>
        </div>
        
        <Navbar />
        
        <div className="relative z-10 flex items-center justify-center min-h-screen pt-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-400 mx-auto"></div>
            <p className="mt-4 text-white text-lg">Verificando autenticación...</p>
          </div>
        </div>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/LABI, el robot científico.png')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-purple-900/85 to-pink-900/90"></div>
      </div>
      
      <Navbar />
      
      <div className="relative z-10 py-8 pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              👥 Gestión de Clientes
            </h1>
            <p className="text-lg text-gray-200">
              Consulta y gestiona las órdenes de compra pendientes
            </p>
            <div className="mt-4">
              <button
                onClick={() => window.location.href = '/clientes/nueva'}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 transition-colors font-medium"
              >
                ➕ Nueva Orden de Compra
              </button>
            </div>
            {/* Nota informativa sobre datos de ejemplo */}
            <div className="mt-4 bg-blue-100/90 border border-blue-400 text-blue-700 px-4 py-2 rounded-lg inline-block backdrop-blur-sm">
              <span className="text-blue-500 mr-2">ℹ️</span>
              Mostrando datos de ejemplo. Configura tu tabla de Airtable para datos reales.
            </div>
          </div>

          {/* Filtros y controles */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="pendiente">Pendientes</option>
                  <option value="en_proceso">En Proceso</option>
                  <option value="listo">Listos</option>
                  <option value="entregado">Entregados</option>
                  <option value="todos">Todos</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ordenar por
                </label>
                <select
                  value={ordenamientoPor}
                  onChange={(e) => setOrdenamientoPor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="fechaEntrega">Fecha de Entrega</option>
                  <option value="fechaPedido">Fecha de Pedido</option>
                  <option value="prioridad">Prioridad</option>
                  <option value="cliente">Cliente</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={fetchOrdenesPendientes}
                  disabled={loading}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Cargando...
                    </span>
                  ) : (
                    '🔄 Actualizar'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-100/90 backdrop-blur-sm border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              <div className="flex items-center">
                <span className="text-red-500 mr-2">❌</span>
                {error}
              </div>
            </div>
          )}

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <span className="text-2xl">⏳</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Pendientes</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {ordenes.filter(o => o.estado === 'pendiente').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-2xl">🔄</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">En Proceso</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {ordenes.filter(o => o.estado === 'en_proceso').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Listos</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {ordenes.filter(o => o.estado === 'listo').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <span className="text-2xl">🚨</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Urgentes</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {ordenes.filter(o => getDiasRestantes(o.fechaEntrega) <= 2 && o.estado !== 'entregado').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de órdenes */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
                <p className="mt-4 text-gray-200">Cargando órdenes...</p>
              </div>
            ) : ordenes.length === 0 ? (
              <div className="text-center py-12 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg">
                <span className="text-6xl">📋</span>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No hay órdenes</h3>
                <p className="mt-2 text-gray-600">
                  No se encontraron órdenes con los filtros seleccionados.
                </p>
              </div>
            ) : (
              ordenes.map((orden) => {
                const diasRestantes = getDiasRestantes(orden.fechaEntrega);
                return (
                  <div key={orden.id} className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {orden.cliente}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getEstadoColor(orden.estado)}`}>
                            {orden.estado.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPrioridadColor(orden.prioridad)}`}>
                            {orden.prioridad?.toUpperCase() || 'NORMAL'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Fecha Pedido</p>
                            <p className="font-medium">{formatearFecha(orden.fechaPedido)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Fecha Entrega</p>
                            <p className={`font-medium ${diasRestantes <= 2 && orden.estado !== 'entregado' ? 'text-red-600' : ''}`}>
                              {formatearFecha(orden.fechaEntrega)}
                              {diasRestantes <= 2 && orden.estado !== 'entregado' && (
                                <span className="ml-2 text-red-500">🚨</span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Días Restantes</p>
                            <p className={`font-medium ${diasRestantes <= 2 ? 'text-red-600' : diasRestantes <= 7 ? 'text-yellow-600' : 'text-green-600'}`}>
                              {diasRestantes > 0 ? `${diasRestantes} días` : diasRestantes === 0 ? 'HOY' : `${Math.abs(diasRestantes)} días atrasado`}
                            </p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-1">Productos</p>
                          <div className="flex flex-wrap gap-2">
                            {orden.productos?.map((producto, index) => (
                              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-lg text-sm">
                                {producto} ({orden.cantidades?.[index] || 0})
                              </span>
                            )) || <span className="text-gray-500">Sin productos especificados</span>}
                          </div>
                        </div>

                        {orden.observaciones && (
                          <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-1">Observaciones</p>
                            <p className="text-sm bg-gray-50 p-2 rounded-lg">{orden.observaciones}</p>
                          </div>
                        )}
                      </div>

                      <div className="lg:ml-6 mt-4 lg:mt-0">
                        <div className="flex flex-col space-y-2">
                          {orden.estado === 'pendiente' && (
                            <button
                              onClick={() => actualizarEstadoOrden(orden.id, 'en_proceso')}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              ▶️ Iniciar Proceso
                            </button>
                          )}
                          {orden.estado === 'en_proceso' && (
                            <button
                              onClick={() => actualizarEstadoOrden(orden.id, 'listo')}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                            >
                              ✅ Marcar Listo
                            </button>
                          )}
                          {orden.estado === 'listo' && (
                            <button
                              onClick={() => actualizarEstadoOrden(orden.id, 'entregado')}
                              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                            >
                              📦 Marcar Entregado
                            </button>
                          )}
                          <button
                            onClick={() => {/* TODO: Ver detalles */}}
                            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                          >
                            👁️ Ver Detalles
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
