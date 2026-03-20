'use client';

import { useEffect, useState } from 'react';
import { X, Package, TrendingUp, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

interface SeguimientoData {
  programado: {
    cliente: { id: string; nombre: string };
    lote: { id: string; nombre: string };
    producto: { id: string; nombre: string };
    fecha: string;
    hectareas: number;
    litros: number;
  };
  despachado: {
    totalHectareas: number;
    totalLitros: number;
    despachos: Array<{
      remisionId: string;
      numeroRemision: string;
      fechaDespacho: string;
      litros: number;
      productos: Array<{
        nombre: string;
        cantidad: number;
        unidad: string;
      }>;
    }>;
  };
  balance: {
    hectareasDiferencia: number;
    litrosDiferencia: number;
    porcentajeCumplimiento: number;
  };
}

interface Props {
  eventoId: string;
  onClose: () => void;
}

export default function PanelSeguimientoAplicacion({ eventoId, onClose }: Props) {
  const [data, setData] = useState<SeguimientoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/seguimiento-aplicacion/${eventoId}`);

        if (!response.ok) {
          throw new Error('Error al cargar datos de seguimiento');
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Error desconocido');
        }

        setData(result);
      } catch (err) {
        console.error('Error cargando seguimiento:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    if (eventoId) {
      cargarDatos();
    }
  }, [eventoId]);

  if (loading) {
    return (
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 border-l border-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando seguimiento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 border-l border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Error</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { programado, despachado, balance } = data;

  // Determinar color del porcentaje
  const getPorcentajeColor = (porcentaje: number) => {
    if (porcentaje >= 95) return 'text-green-600';
    if (porcentaje >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPorcentajeBgColor = (porcentaje: number) => {
    if (porcentaje >= 95) return 'bg-green-100';
    if (porcentaje >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />

      {/* Panel lateral */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 border-l border-gray-200 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 shadow-md">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold">Seguimiento de Aplicación</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Info del evento */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Package size={16} />
              <span className="font-semibold">{programado.cliente.nombre}</span>
            </div>
            <div className="text-blue-100">
              <p>Lote: {programado.lote.nombre}</p>
              <p>Producto: {programado.producto.nombre}</p>
              <p>Fecha programada: {new Date(programado.fecha).toLocaleDateString('es-CO')}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Sección: Programado */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Calendar size={18} />
              Programado
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Hectáreas:</span>
                <span className="font-semibold text-gray-900">{programado.hectareas.toFixed(2)} Ha</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Litros:</span>
                <span className="font-semibold text-gray-900">{programado.litros.toFixed(2)} L</span>
              </div>
            </div>
          </div>

          {/* Sección: Despachado */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <CheckCircle size={18} />
              Despachado
            </h3>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Total litros:</span>
                <span className="font-semibold text-gray-900">{despachado.totalLitros.toFixed(2)} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Despachos:</span>
                <span className="font-semibold text-gray-900">{despachado.despachos.length}</span>
              </div>
            </div>

            {/* Lista de despachos */}
            {despachado.despachos.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                Sin despachos registrados
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 font-semibold mb-2">Historial de despachos:</p>
                {despachado.despachos.map((despacho, index) => (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded p-3 text-xs"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-gray-900">{despacho.numeroRemision}</span>
                      <span className="text-gray-500">
                        {despacho.fechaDespacho
                          ? new Date(despacho.fechaDespacho).toLocaleDateString('es-CO')
                          : 'Sin fecha'}
                      </span>
                    </div>
                    <div className="mb-2">
                      <span className="text-gray-600">Total: </span>
                      <span className="font-semibold">{despacho.litros.toFixed(2)} L</span>
                    </div>
                    {despacho.productos.length > 0 && (
                      <div className="border-t border-gray-100 pt-2">
                        <p className="text-gray-500 mb-1">Productos:</p>
                        <ul className="space-y-1">
                          {despacho.productos.map((prod, idx) => (
                            <li key={idx} className="text-gray-700">
                              • {prod.nombre}: {prod.cantidad} {prod.unidad}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sección: Balance */}
          <div className={`border rounded-lg p-4 ${getPorcentajeBgColor(balance.porcentajeCumplimiento)} border-gray-200`}>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp size={18} />
              Balance
            </h3>
            <div className="space-y-3 text-sm">
              {/* Porcentaje de cumplimiento */}
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Cumplimiento:</span>
                  <span className={`font-bold text-xl ${getPorcentajeColor(balance.porcentajeCumplimiento)}`}>
                    {balance.porcentajeCumplimiento}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      balance.porcentajeCumplimiento >= 95
                        ? 'bg-green-600'
                        : balance.porcentajeCumplimiento >= 70
                        ? 'bg-yellow-600'
                        : 'bg-red-600'
                    }`}
                    style={{ width: `${Math.min(balance.porcentajeCumplimiento, 100)}%` }}
                  />
                </div>
              </div>

              {/* Diferencia en litros */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Diferencia:</span>
                <span className={`font-semibold ${balance.litrosDiferencia > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {balance.litrosDiferencia > 0 ? '+' : ''}
                  {balance.litrosDiferencia.toFixed(2)} L
                </span>
              </div>

              {/* Estado */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                {balance.porcentajeCumplimiento >= 95 ? (
                  <>
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-green-700 font-medium">Completado</span>
                  </>
                ) : balance.porcentajeCumplimiento >= 70 ? (
                  <>
                    <AlertCircle size={16} className="text-yellow-600" />
                    <span className="text-yellow-700 font-medium">En progreso</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} className="text-red-600" />
                    <span className="text-red-700 font-medium">Pendiente</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
