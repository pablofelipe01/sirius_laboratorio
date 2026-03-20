'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Package,
  CheckCircle,
  Filter,
  Download,
  BarChart3
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
    pedidos?: Array<{ idPedido: string; notas: string; fechaPedido: string; diasDiferencia: number }>;
    remisiones: Array<{
      id: string;
      numeroRemision: string;
      fechaDespacho: string;
      litros: number;
      productos?: Array<{ nombre: string; cantidad: number; unidad: string }>;
    }>;
  }>;
}

export default function DashboardSeguimientoInline() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filtros
  const [estadoFilter, setEstadoFilter] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Cargar datos
  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
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
    setEstadoFilter('');
    setFechaInicio('');
    setFechaFin('');
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
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  if (!data) return null;

  const { metrics, aplicaciones } = data;

  // Filtrar aplicaciones localmente por estado
  const aplicacionesFiltradas = estadoFilter
    ? aplicaciones.filter(app => app.estadoAplicacion === estadoFilter)
    : aplicaciones;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            📊 Seguimiento de Aplicaciones
          </h2>
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

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <BarChart3 size={24} className="text-blue-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Total Aplicaciones</p>
          <p className="text-3xl font-bold text-gray-900">{metrics.totalAplicaciones}</p>
        </div>

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

      {/* Tabla de aplicaciones */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">
            Detalle de Aplicaciones ({aplicacionesFiltradas.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                </th>
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {aplicacionesFiltradas.map((app) => {
                const isExpanded = expandedRows.has(app.id);
                const hasDetalles = app.remisiones.length > 0 || (app.pedidos && app.pedidos.length > 0);

                return (
                  <React.Fragment key={app.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasDetalles && (
                          <button
                            onClick={() => toggleRow(app.id)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <svg
                              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{app.cliente.nombre}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate" title={app.lotes.map(l => l.nombre).join(', ')}>
                          {app.lotes.slice(0, 2).map(l => l.nombre).join(', ')}
                          {app.lotes.length > 2 && ` +${app.lotes.length - 2} más`}
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
                    </tr>

                    {/* Fila expandible con detalles */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-4">
                            {/* Pedidos */}
                            {app.pedidos && app.pedidos.length > 0 ? (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                  📋 Pedidos Relacionados ({app.pedidos.length}):
                                </h4>
                                <div className="space-y-2">
                                  {app.pedidos.map((pedido, idx) => (
                                    <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                                      <div className="flex justify-between items-start mb-1">
                                        <p className="text-sm font-medium text-gray-900">
                                          Pedido: <span className="font-mono text-blue-600">{pedido.idPedido}</span>
                                        </p>
                                        {pedido.fechaPedido && (
                                          <span className="text-xs text-gray-500">
                                            {new Date(pedido.fechaPedido).toLocaleDateString('es-CO')}
                                          </span>
                                        )}
                                      </div>
                                      {pedido.diasDiferencia !== undefined && pedido.diasDiferencia < 999 && (
                                        <p className={`text-xs mb-1 ${
                                          pedido.diasDiferencia <= 7
                                            ? 'text-green-600 font-medium'
                                            : pedido.diasDiferencia <= 30
                                            ? 'text-blue-600'
                                            : 'text-gray-500'
                                        }`}>
                                          📅 {pedido.diasDiferencia} días de diferencia
                                        </p>
                                      )}
                                      {pedido.notas && (
                                        <p className="text-xs text-gray-600 mt-1">
                                          Notas: {pedido.notas.substring(0, 200)}
                                          {pedido.notas.length > 200 && '...'}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm text-blue-800">
                                  ℹ️ No hay pedidos registrados en los últimos 90 días para este cliente
                                </p>
                              </div>
                            )}

                            {/* Remisiones */}
                            {app.remisiones.length > 0 ? (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                  📦 Remisiones Despachadas ({app.remisiones.length}):
                                </h4>
                                <div className="space-y-2">
                                  {app.remisiones.map((remision, idx) => (
                                    <div key={idx} className="bg-white rounded-lg p-3 border border-green-200">
                                      <div className="flex justify-between items-start mb-2">
                                        <p className="text-sm font-medium text-gray-900">
                                          {remision.numeroRemision}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {remision.fechaDespacho
                                            ? new Date(remision.fechaDespacho).toLocaleDateString('es-CO')
                                            : 'Sin fecha'}
                                        </p>
                                      </div>
                                      <p className="text-sm text-green-700 font-semibold">
                                        Total: {remision.litros.toFixed(2)} L
                                      </p>
                                      {remision.productos && remision.productos.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                          <p className="text-xs text-gray-600 mb-1">Productos:</p>
                                          <ul className="space-y-1">
                                            {remision.productos.map((prod, pidx) => (
                                              <li key={pidx} className="text-xs text-gray-700">
                                                • {prod.nombre}: {prod.cantidad} {prod.unidad}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <p className="text-sm text-yellow-800">
                                  ⚠️ Sin remisiones despachadas para esta aplicación
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
