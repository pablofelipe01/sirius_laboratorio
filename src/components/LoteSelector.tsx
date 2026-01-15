import React, { useState, useEffect } from 'react';

interface Lote {
  id: string;
  codigo: string;
  cultivoId: string;
  nombreCultivo: string;
  nombreLote: string;
  variedad: string;
  areaHa: number;
  riego: boolean;
  anioSiembra: number;
  tipoSuelo: string;
  estado: string;
  fechaUltimaSiembra: string | null;
}

interface Cultivo {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  estado: string;
  ubicacion: string;
  tecnicoResponsable: string;
  lotesAsociados: string[];
}

interface LoteSelectorProps {
  clienteId: string;
  lotesSeleccionados: string[];
  onLotesChange: (lotes: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export default function LoteSelector({
  clienteId,
  lotesSeleccionados,
  onLotesChange,
  disabled = false,
  className = ''
}: LoteSelectorProps) {
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [cultivosSeleccionados, setCultivosSeleccionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [paso, setPaso] = useState<'cultivos' | 'lotes'>('cultivos');

  // Fetch cultivos y lotes
  useEffect(() => {
    if (!clienteId) {
      setCultivos([]);
      setLotes([]);
      setCultivosSeleccionados([]);
      onLotesChange([]);
      setPaso('cultivos');
      return;
    }

    const fetchCultivosLotes = async () => {
      setLoading(true);
      setError('');
      
      try {
        console.log('🌾 LoteSelector: Cargando cultivos y lotes para cliente:', clienteId);
        
        const response = await fetch(`/api/cultivos-lotes?clienteId=${encodeURIComponent(clienteId)}`);
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success && data.error) {
          throw new Error(data.error || 'Error al cargar los datos');
        }
        
        console.log('✅ LoteSelector: Datos recibidos:', {
          cultivos: data.cultivos?.length || 0,
          lotes: data.lotes?.length || 0
        });
        
        setCultivos(data.cultivos || []);
        setLotes(data.lotes || []);
        
        if ((data.cultivos?.length || 0) === 0) {
          setError('No se encontraron cultivos para este cliente');
        }
      } catch (err) {
        console.error('💥 LoteSelector: Error completo:', err);
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(`Error al cargar los datos: ${errorMessage}`);
        setCultivos([]);
        setLotes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCultivosLotes();
  }, [clienteId]);

  // Filtrar cultivos según el texto de búsqueda
  const cultivosFiltrados = cultivos.filter(cultivo => {
    if (!filtroTexto) return true;
    const texto = filtroTexto.toLowerCase();
    return (
      cultivo.codigo.toLowerCase().includes(texto) ||
      cultivo.nombre.toLowerCase().includes(texto) ||
      cultivo.tipo.toLowerCase().includes(texto) ||
      cultivo.ubicacion.toLowerCase().includes(texto)
    );
  });

  // Filtrar lotes según cultivos seleccionados y texto de búsqueda
  const lotesFiltrados = lotes.filter(lote => {
    // Primero filtrar por cultivos seleccionados
    if (cultivosSeleccionados.length > 0 && !cultivosSeleccionados.includes(lote.cultivoId)) {
      return false;
    }
    
    // Luego por texto de búsqueda
    if (!filtroTexto) return true;
    const texto = filtroTexto.toLowerCase();
    return (
      lote.codigo.toLowerCase().includes(texto) ||
      lote.nombreLote.toLowerCase().includes(texto) ||
      lote.nombreCultivo.toLowerCase().includes(texto)
    );
  });

  const toggleCultivo = (cultivoId: string) => {
    if (disabled) return;
    
    const nuevosCultivos = cultivosSeleccionados.includes(cultivoId)
      ? cultivosSeleccionados.filter(id => id !== cultivoId)
      : [...cultivosSeleccionados, cultivoId];
    
    setCultivosSeleccionados(nuevosCultivos);
  };

  const toggleLote = (loteId: string) => {
    if (disabled) return;
    
    const nuevosLotes = lotesSeleccionados.includes(loteId)
      ? lotesSeleccionados.filter(id => id !== loteId)
      : [...lotesSeleccionados, loteId];
    
    onLotesChange(nuevosLotes);
  };

  const continuarALotes = () => {
    if (cultivosSeleccionados.length === 0) return;
    setPaso('lotes');
    setFiltroTexto('');
  };

  const volverACultivos = () => {
    setPaso('cultivos');
    setFiltroTexto('');
  };

  const seleccionarTodosLotes = () => {
    if (disabled) return;
    const todosLosIds = lotesFiltrados.map(lote => lote.id);
    onLotesChange(todosLosIds);
  };

  const limpiarTodos = () => {
    if (disabled) return;
    onLotesChange([]);
  };

  if (!clienteId) {
    return (
      <div className={`lote-selector-container ${className}`}>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          🎯 Selección de Cultivos y Lotes
        </label>
        <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-base">
          Primero seleccione un cliente
        </div>
      </div>
    );
  }

  return (
    <div className={`lote-selector-container ${className}`}>
      {/* Header con pasos */}
      <div className="flex items-center justify-between mb-4">
        <label className="block text-sm font-semibold text-gray-700">
          {paso === 'cultivos' ? '🌾 Paso 1: Selecciona Cultivos' : '🎯 Paso 2: Selecciona Lotes'}
        </label>
        
        {paso === 'lotes' && (
          <button
            onClick={volverACultivos}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            ← Volver a cultivos
          </button>
        )}
      </div>

      {/* Indicador de progreso */}
      <div className="flex items-center mb-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
          paso === 'cultivos' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
        }`}>
          1
        </div>
        <div className={`flex-1 h-1 mx-2 ${paso === 'lotes' ? 'bg-green-500' : 'bg-gray-200'}`}></div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
          paso === 'lotes' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
        }`}>
          2
        </div>
      </div>

      {/* Paso 1: Selección de Cultivos */}
      {paso === 'cultivos' && (
        <div>
          {/* Búsqueda de cultivos */}
          <div className="relative mb-4">
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder={loading ? "Cargando cultivos..." : "🔍 Buscar cultivo..."}
              disabled={disabled || loading}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400 text-base"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>

          {/* Lista de cultivos */}
          {error ? (
            <div className="p-4 text-red-600 bg-red-50 rounded-xl border border-red-200">
              {error}
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-600 mb-2">
                📊 {cultivosFiltrados.length} cultivos disponibles
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {cultivosFiltrados.map((cultivo) => (
                  <div
                    key={cultivo.id}
                    onClick={() => toggleCultivo(cultivo.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      cultivosSeleccionados.includes(cultivo.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {cultivo.codigo} - {cultivo.nombre}
                        </div>
                        <div className="text-sm text-gray-500">
                          📍 {cultivo.ubicacion}
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        cultivosSeleccionados.includes(cultivo.id)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {cultivosSeleccionados.includes(cultivo.id) && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón continuar */}
              {cultivosSeleccionados.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-gray-600 mb-2">
                    ✅ {cultivosSeleccionados.length} cultivos seleccionados
                  </div>
                  <button
                    onClick={continuarALotes}
                    className="w-full bg-blue-500 text-white py-3 px-4 rounded-xl hover:bg-blue-600 transition-colors font-medium"
                  >
                    Continuar a Lotes →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Paso 2: Selección de Lotes */}
      {paso === 'lotes' && (
        <div>
          {/* Búsqueda de lotes */}
          <div className="relative mb-4">
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="🔍 Buscar lote..."
              disabled={disabled}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400 text-base"
            />
          </div>

          {/* Controles de lotes */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              📊 {lotesFiltrados.length} lotes disponibles
            </div>
            <div className="flex gap-2">
              <button
                onClick={seleccionarTodosLotes}
                disabled={disabled || lotesFiltrados.length === 0}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
              >
                Seleccionar todos
              </button>
              {lotesSeleccionados.length > 0 && (
                <button
                  onClick={limpiarTodos}
                  disabled={disabled}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Limpiar todos
                </button>
              )}
            </div>
          </div>

          {/* Lotes seleccionados */}
          {lotesSeleccionados.length > 0 && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm font-medium text-green-800 mb-2">
                📋 Lotes seleccionados ({lotesSeleccionados.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {lotesSeleccionados.map((loteId) => {
                  const lote = lotes.find(l => l.id === loteId);
                  if (!lote) return null;
                  return (
                    <span
                      key={loteId}
                      className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-green-300 text-sm"
                    >
                      {lote.codigo} • {lote.nombreLote}
                      <button
                        onClick={() => toggleLote(loteId)}
                        className="text-red-500 hover:text-red-700 ml-1"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lista de lotes */}
          <div className="max-h-80 overflow-y-auto space-y-2">
            {lotesFiltrados.map((lote) => (
              <div
                key={lote.id}
                onClick={() => toggleLote(lote.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                  lotesSeleccionados.includes(lote.id)
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {lote.codigo} • {lote.nombreLote}
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    lotesSeleccionados.includes(lote.id)
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300'
                  }`}>
                    {lotesSeleccionados.includes(lote.id) && (
                      <span className="text-white text-xs">✓</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}