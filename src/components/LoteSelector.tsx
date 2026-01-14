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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Cargar cultivos y lotes cuando cambia el cliente
  useEffect(() => {
    if (!clienteId) {
      setCultivos([]);
      setLotes([]);
      return;
    }

    const fetchCultivosLotes = async () => {
      setLoading(true);
      setError('');
      console.log('🔍 LoteSelector: Cargando datos para cliente:', clienteId);
      
      try {
        const url = `/api/cultivos-lotes?clienteId=${clienteId}`;
        console.log('📡 LoteSelector: Haciendo request a:', url);
        
        const response = await fetch(url);
        console.log('📥 LoteSelector: Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ LoteSelector: Error response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`Error ${response.status}: ${response.statusText}. ${errorText}`);
        }
        
        const data = await response.json();
        console.log('✅ LoteSelector: Data recibida:', data);
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        const cultivos = data.cultivos || [];
        const lotes = data.lotes || [];
        
        console.log('📊 LoteSelector: Procesando datos:', {
          cultivosCount: cultivos.length,
          lotesCount: lotes.length
        });
        
        setCultivos(cultivos);
        setLotes(lotes);
        
      } catch (err) {
        console.error('💥 LoteSelector: Error completo:', err);
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(`Error al cargar los lotes: ${errorMessage}`);
        setCultivos([]);
        setLotes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCultivosLotes();
  }, [clienteId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.lote-selector-container')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);

  // Filtrar lotes según el texto de búsqueda
  const lotesFiltrados = lotes.filter(lote => {
    if (!filtroTexto) return true;
    const texto = filtroTexto.toLowerCase();
    return (
      lote.codigo.toLowerCase().includes(texto) ||
      lote.nombreLote.toLowerCase().includes(texto) ||
      lote.nombreCultivo.toLowerCase().includes(texto) ||
      lote.variedad.toLowerCase().includes(texto)
    );
  });

  const toggleLote = (loteId: string) => {
    if (disabled) return;
    
    const nuevosLotes = lotesSeleccionados.includes(loteId)
      ? lotesSeleccionados.filter(id => id !== loteId)
      : [...lotesSeleccionados, loteId];
    
    onLotesChange(nuevosLotes);
  };

  const loteSeleccionado = (loteId: string) => lotesSeleccionados.includes(loteId);

  if (!clienteId) {
    return (
      <div className={`lote-selector-container ${className}`}>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Lotes del cliente
        </label>
        <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-base">
          Primero seleccione un cliente
        </div>
      </div>
    );
  }

  return (
    <div className={`lote-selector-container ${className}`}>
      <label className="block text-sm font-semibold text-gray-700 mb-3">
        🎯 Lotes disponibles para el cliente
        {lotesSeleccionados.length > 0 && (
          <span className="ml-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs">
            {lotesSeleccionados.length} seleccionados
          </span>
        )}
      </label>
      
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            placeholder={loading ? "Cargando lotes..." : "🔍 Buscar por código, nombre del lote, cultivo o variedad..."}
            disabled={disabled || loading}
            className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400 text-base disabled:bg-gray-50 disabled:text-gray-500"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            {loading ? (
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            ) : (
              <>
                {filtroTexto && (
                  <button
                    type="button"
                    onClick={() => {
                      setFiltroTexto('');
                      setShowDropdown(true);
                    }}
                    className="text-gray-400 hover:text-gray-600 w-5 h-5 rounded-full hover:bg-gray-100 flex items-center justify-center"
                    title="Limpiar búsqueda"
                  >
                    ×
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="text-gray-400 hover:text-gray-600"
                  title={showDropdown ? "Cerrar lista" : "Abrir lista"}
                >
                  {showDropdown ? '⬆️' : '⬇️'}
                </button>
              </>
            )}
          </div>
        </div>

        {!loading && lotes.length > 0 && (
          <div className="mt-2 text-xs text-gray-500 flex justify-between items-center">
            <span>
              📊 {lotes.length} lotes disponibles
              {filtroTexto && ` (mostrando ${lotesFiltrados.length})`}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const todosLotesFiltrados = lotesFiltrados.map(l => l.id);
                  onLotesChange([...new Set([...lotesSeleccionados, ...todosLotesFiltrados])]);
                }}
                className="text-blue-600 hover:text-blue-800 underline"
                disabled={disabled}
              >
                Seleccionar todos
              </button>
            </div>
          </div>
        )}

        {lotesSeleccionados.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-blue-800">
                  📋 Lotes seleccionados ({lotesSeleccionados.length})
                </span>
                <button
                  type="button"
                  onClick={() => onLotesChange([])}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                  disabled={disabled}
                >
                  Limpiar todos
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {lotesSeleccionados.map(loteId => {
                const lote = lotes.find(l => l.id === loteId);
                if (!lote) return null;
                return (
                  <div key={loteId} className="bg-white border border-blue-200 text-blue-900 px-3 py-2 rounded-lg text-sm flex items-center gap-2 shadow-sm">
                    <div className="font-medium">{lote.codigo}</div>
                    <div className="text-blue-600">•</div>
                    <div className="text-xs">{lote.nombreLote}</div>
                    <button
                      type="button"
                      onClick={() => toggleLote(loteId)}
                      className="text-blue-600 hover:text-blue-800 font-bold ml-1 w-5 h-5 rounded-full hover:bg-blue-100 flex items-center justify-center transition-all"
                      disabled={disabled}
                      title="Quitar lote"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showDropdown && !loading && (
          <div className="absolute z-[100] w-full mt-1 bg-white border-2 border-gray-300 rounded-xl shadow-2xl max-h-96 overflow-y-auto">
            {error ? (
              <div className="p-6 text-red-600 text-center">
                <div className="text-lg font-semibold mb-2">❌ Error</div>
                {error}
              </div>
            ) : lotesFiltrados.length === 0 ? (
              <div className="p-6 text-gray-500 text-center">
                <div className="text-lg font-semibold mb-2">📭 Sin resultados</div>
                {filtroTexto ? 'No se encontraron lotes que coincidan con la búsqueda' : 'No hay lotes disponibles para este cliente'}
              </div>
            ) : (
              <>
                <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-lg">{lotesFiltrados.length} lotes disponibles</div>
                      <div className="text-blue-100 text-sm">Haz clic para seleccionar/deseleccionar</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDropdown(false)}
                      className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all w-8 h-8 flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {lotesFiltrados.map((lote) => (
                    <div
                      key={lote.id}
                      className={`p-4 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-all duration-200 ${
                        loteSeleccionado(lote.id) 
                          ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                          : 'hover:border-l-4 hover:border-l-gray-300'
                      }`}
                      onClick={() => toggleLote(lote.id)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`mt-1 w-5 h-5 border-2 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                          loteSeleccionado(lote.id)
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'border-gray-300 hover:border-blue-400'
                        }`}>
                          {loteSeleccionado(lote.id) && (
                            <span className="text-xs font-bold">✓</span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-blue-600 text-lg">{lote.codigo}</span>
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                              {lote.estado}
                            </span>
                          </div>
                          
                          <div className="font-semibold text-gray-900 mb-1 text-base">
                            📍 {lote.nombreLote}
                          </div>
                          
                          <div className="text-sm text-gray-600 mb-2">
                            🌱 <span className="font-medium">Cultivo:</span> {lote.nombreCultivo}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">🌾 Variedad:</span> {lote.variedad}
                            </div>
                            <div>
                              <span className="font-medium">📏 Área:</span> {lote.areaHa} ha
                            </div>
                            <div>
                              <span className="font-medium">🏔️ Suelo:</span> {lote.tipoSuelo}
                            </div>
                            <div className="flex items-center gap-1">
                              {lote.riego ? (
                                <span className="text-blue-600 font-medium">💧 Con riego</span>
                              ) : (
                                <span className="text-gray-500">☁️ Sin riego</span>
                              )}
                            </div>
                          </div>
                          
                          {lote.anioSiembra && (
                            <div className="text-xs text-gray-500 mt-2">
                              📅 Siembra: {lote.anioSiembra}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}