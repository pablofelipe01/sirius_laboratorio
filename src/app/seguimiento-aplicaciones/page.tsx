'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  TrendingUp,
  TrendingDown,
  Package,
  CheckCircle,
  Clock,
  BarChart3,
  Filter,
  Download,
  Calendar
} from 'lucide-react';

interface DashboardData {
  metrics: {
    totalAplicaciones: number;
    totalHectareasProgramadas: number;
    totalHectareasEjecutadas: number;
    totalLitrosProgramados: number;
    totalLitrosDespachados: number;
    porcentajeCumplimientoGeneral: number;
    aplicacionesPorEstado: Record<string, number>;
    aplicacionesPorCliente: Record<string, { hectareas: number; litros: number }>;
  };
  aplicaciones: Array<{
    id: string;
    cliente: { id: string; nombre: string };
    lotes: Array<{ id: string; nombre: string; hectareas: number }>;
    producto: { id: string; nombre: string };
    fechaProgramada: string;
    estadoAplicacion: string;
    hectareasProgramadas: number;
    litrosProgramados: number;
    hectareasEjecutadas: number;
    litrosEjecutados: number;
    litrosDespachados: number;
    balanceLitros: number;
    porcentajeCumplimiento: number;
    remisiones: Array<{
      id: string;
      numeroRemision: string;
      fechaDespacho: string;
      litros: number;
    }>;
  }>;
}

export default function SeguimientoAplicacionesPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [clienteFilter, setClienteFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Cargar datos
  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (clienteFilter) params.append('clienteId', clienteFilter);
      if (fechaInicio) params.append('fechaInicio', fechaInicio);
      if (fechaFin) params.append('fechaFin', fechaFin);

      const response = await fetch(`/api/dashboard-seguimiento-aplicaciones?${params}`);

      if (!response.ok) {
        throw new Error('Error al cargar datos del dashboard');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error desconocido');
      }

      setData(result);
    } catch (err) {
      console.error('Error cargando dashboard:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const aplicarFiltros = () => {
    cargarDatos();
  };

  const limpiarFiltros = () => {
    setClienteFilter('');
    setEstadoFilter('');
    setFechaInicio('');
    setFechaFin('');
    // Recargar sin filtros
    setTimeout(() => cargarDatos(), 100);
  };

  // Exportar a CSV
  const exportarCSV = () => {
    if (!data) return;

    const csv = [
      ['Cliente', 'Lotes', 'Fecha Programada', 'Estado', 'Ha Programadas', 'L Programados', 'L Despachados', '% Cumplimiento'].join(','),
      ...data.aplicaciones.map(app =>
        [
          app.cliente.nombre,
          app.lotes.map(l => l.nombre).join(';'),
          app.fechaProgramada,
          app.estadoAplicacion,
          app.hectareasProgramadas,
          app.litrosProgramados,
          app.litrosDespachados,
          app.porcentajeCumplimiento
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seguimiento-aplicaciones-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Cargando dashboard...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
              <p className="text-red-700">{error}</p>
              <button
                onClick={cargarDatos}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!data) return null;

  const { metrics, aplicaciones } = data;

  // Filtrar aplicaciones localmente por estado
  const aplicacionesFiltradas = estadoFilter
    ? aplicaciones.filter(app => app.estadoAplicacion === estadoFilter)
    : aplicaciones;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  📊 Seguimiento de Aplicaciones
                </h1>
                <p className="text-gray-600">
                  Dashboard general de aplicaciones programadas vs despachadas
                </p>
              </div>
              <button
                onClick={exportarCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download size={20} />
                Exportar CSV
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Filter size={20} className="text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  value={estadoFilter}
                  onChange={(e) => setEstadoFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="PRESUPUESTADA">Presupuestada</option>
                  <option value="CONFIRMADA">Confirmada</option>
                  <option value="ENTREGADA">Entregada</option>
                  <option value="POSPUESTA">Pospuesta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={aplicarFiltros}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Aplicar
                </button>
                <button
                  onClick={limpiarFiltros}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>

          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Aplicaciones */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <BarChart3 size={24} className="text-blue-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">Total Aplicaciones</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.totalAplicaciones}</p>
            </div>

            {/* Litros Programados */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Package size={24} className="text-purple-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">Litros Programados</p>
              <p className="text-3xl font-bold text-gray-900">
                {metrics.totalLitrosProgramados.toFixed(0)} L
              </p>
            </div>

            {/* Litros Despachados */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle size={24} className="text-green-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">Litros Despachados</p>
              <p className="text-3xl font-bold text-gray-900">
                {metrics.totalLitrosDespachados.toFixed(0)} L
              </p>
            </div>

            {/* % Cumplimiento */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${
                  metrics.porcentajeCumplimientoGeneral >= 95
                    ? 'bg-green-100'
                    : metrics.porcentajeCumplimientoGeneral >= 70
                    ? 'bg-yellow-100'
                    : 'bg-red-100'
                }`}>
                  {metrics.porcentajeCumplimientoGeneral >= 95 ? (
                    <TrendingUp size={24} className="text-green-600" />
                  ) : (
                    <TrendingDown size={24} className="text-red-600" />
                  )}
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">% Cumplimiento</p>
              <p className={`text-3xl font-bold ${
                metrics.porcentajeCumplimientoGeneral >= 95
                  ? 'text-green-600'
                  : metrics.porcentajeCumplimientoGeneral >= 70
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}>
                {metrics.porcentajeCumplimientoGeneral}%
              </p>
            </div>
          </div>

          {/* Métricas secundarias */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Hectáreas */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Hectáreas</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Programadas:</span>
                  <span className="font-semibold text-gray-900">
                    {metrics.totalHectareasProgramadas.toFixed(2)} Ha
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ejecutadas:</span>
                  <span className="font-semibold text-gray-900">
                    {metrics.totalHectareasEjecutadas.toFixed(2)} Ha
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Balance:</span>
                    <span className={`font-bold ${
                      metrics.totalHectareasProgramadas - metrics.totalHectareasEjecutadas > 0
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}>
                      {(metrics.totalHectareasProgramadas - metrics.totalHectareasEjecutadas).toFixed(2)} Ha
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Por Estado */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Aplicaciones por Estado</h3>
              <div className="space-y-3">
                {Object.entries(metrics.aplicacionesPorEstado).map(([estado, count]) => (
                  <div key={estado} className="flex justify-between items-center">
                    <span className="text-gray-600">{estado}:</span>
                    <span className="font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabla de aplicaciones */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Detalle de Aplicaciones ({aplicacionesFiltradas.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lotes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      L Programados
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      L Despachados
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % Cumplimiento
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remisiones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {aplicacionesFiltradas.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{app.cliente.nombre}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {app.lotes.map(l => l.nombre).join(', ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {new Date(app.fechaProgramada).toLocaleDateString('es-CO')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          app.estadoAplicacion === 'ENTREGADA'
                            ? 'bg-green-100 text-green-800'
                            : app.estadoAplicacion === 'CONFIRMADA'
                            ? 'bg-blue-100 text-blue-800'
                            : app.estadoAplicacion === 'PRESUPUESTADA'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {app.estadoAplicacion}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {app.litrosProgramados.toFixed(0)} L
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {app.litrosDespachados.toFixed(0)} L
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${
                          app.porcentajeCumplimiento >= 95
                            ? 'bg-green-100 text-green-800'
                            : app.porcentajeCumplimiento >= 70
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {app.porcentajeCumplimiento}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-600">{app.remisiones.length}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
