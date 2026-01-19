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
  onLotesDataChange?: (lotesData: Lote[]) => void; // Callback opcional para pasar datos completos
  disabled?: boolean;
  className?: string;
}

export default function LoteSelector({
  clienteId,
  lotesSeleccionados,
  onLotesChange,
  onLotesDataChange,
  disabled = false,
  className = ''
}: LoteSelectorProps) {
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtroTexto, setFiltroTexto] = useState('');

  // Fetch cultivos y lotes
  useEffect(() => {
    console.log('🔄 useEffect disparado - clienteId:', clienteId, '- timestamp:', Date.now());
    
    if (!clienteId) {
      setCultivos([]);
      setLotes([]);
      onLotesChange([]);
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
        
        console.log('✅ LoteSelector: Datos recibidos:', {
          cultivos: data.cultivos?.length || 0,
          lotes: data.lotes?.length || 0
        });
        
        setCultivos(data.cultivos || []);
        setLotes(data.lotes || []);
        
        // Pasar datos completos de lotes al padre si el callback existe
        if (onLotesDataChange) {
          onLotesDataChange(data.lotes || []);
        }
        
        if ((data.cultivos?.length || 0) === 0) {
          setError('No se encontraron cultivos para este cliente. Por favor, asegúrate de que el cliente tenga cultivos configurados en Airtable.');
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

  // Agrupar lotes por cultivo
  const lotesPorCultivo = cultivos.map(cultivo => ({
    cultivo,
    lotes: lotes.filter(lote => lote.cultivoId === cultivo.id)
  })).filter(grupo => grupo.lotes.length > 0);

  // Filtrar por búsqueda - MEJORADA
  const gruposFiltrados = lotesPorCultivo.filter(grupo => {
    if (!filtroTexto) return true;
    const texto = filtroTexto.toLowerCase().trim();
    
    // Buscar en el cultivo
    const coincideCultivo = 
      grupo.cultivo.codigo.toLowerCase().includes(texto) ||
      grupo.cultivo.nombre.toLowerCase().includes(texto) ||
      grupo.cultivo.ubicacion.toLowerCase().includes(texto) ||
      grupo.cultivo.tecnicoResponsable.toLowerCase().includes(texto);
    
    // Buscar en los lotes
    const coincideLote = grupo.lotes.some(lote =>
      lote.codigo.toLowerCase().includes(texto) ||
      lote.nombreLote.toLowerCase().includes(texto) ||
      lote.variedad.toLowerCase().includes(texto) ||
      lote.tipoSuelo.toLowerCase().includes(texto) ||
      lote.areaHa.toString().includes(texto) ||
      lote.anioSiembra.toString().includes(texto)
    );
    
    return coincideCultivo || coincideLote;
  }).map(grupo => ({
    ...grupo,
    // Filtrar también lotes dentro del grupo que coincidan específicamente
    lotes: grupo.lotes.filter(lote => {
      if (!filtroTexto) return true;
      const texto = filtroTexto.toLowerCase().trim();
      
      return (
        lote.codigo.toLowerCase().includes(texto) ||
        lote.nombreLote.toLowerCase().includes(texto) ||
        lote.variedad.toLowerCase().includes(texto) ||
        lote.tipoSuelo.toLowerCase().includes(texto) ||
        lote.areaHa.toString().includes(texto) ||
        lote.anioSiembra.toString().includes(texto) ||
        grupo.cultivo.codigo.toLowerCase().includes(texto) ||
        grupo.cultivo.nombre.toLowerCase().includes(texto) ||
        grupo.cultivo.ubicacion.toLowerCase().includes(texto)
      );
    })
  })).filter(grupo => grupo.lotes.length > 0);

  const toggleLote = (loteId: string) => {
    if (disabled) return;
    
    const nuevosLotes = lotesSeleccionados.includes(loteId)
      ? lotesSeleccionados.filter(id => id !== loteId)
      : [...lotesSeleccionados, loteId];
    
    onLotesChange(nuevosLotes);
  };

  const seleccionarTodosCultivo = (cultivoId: string) => {
    if (disabled) return;
    const lotesDelCultivo = lotes.filter(l => l.cultivoId === cultivoId).map(l => l.id);
    const todosSeleccionados = lotesDelCultivo.every(id => lotesSeleccionados.includes(id));
    
    if (todosSeleccionados) {
      // Deseleccionar todos los lotes de este cultivo
      onLotesChange(lotesSeleccionados.filter(id => !lotesDelCultivo.includes(id)));
    } else {
      // Seleccionar todos los lotes de este cultivo
      const nuevosLotes = [...new Set([...lotesSeleccionados, ...lotesDelCultivo])];
      onLotesChange(nuevosLotes);
    }
  };

  const seleccionarTodos = () => {
    if (disabled) return;
    onLotesChange(lotes.map(l => l.id));
  };

  const limpiarTodos = () => {
    if (disabled) return;
    onLotesChange([]);
  };

  if (!clienteId) {
    return (
      <div className={`lote-selector-container ${className}`}>
        <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-base text-center">
          Primero seleccione un cliente para ver sus cultivos y lotes
        </div>
      </div>
    );
  }

  return (
    <div className={`lote-selector-container ${className}`}>
      {/* Barra de búsqueda y controles */}
      <div className="mb-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <input
            type="text"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder={loading ? "Cargando..." : "🔍 Buscar por lote, cultivo, variedad, área, código..."}
            disabled={disabled || loading}
            className="w-full px-4 py-3 pl-10 pr-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400 text-sm"
          />
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
            🔍
          </span>
          {filtroTexto && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFiltroTexto(''); }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
            >
              ✕
            </button>
          )}
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>

        {/* Contador y controles - MEJORADO */}
        {!loading && !error && (
          <div className="flex items-center justify-between text-sm bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-gray-600">
              {lotesSeleccionados.length > 0 ? (
                <div>
                  <span className="font-bold text-green-600 text-base">
                    ✓ {lotesSeleccionados.length} lote{lotesSeleccionados.length !== 1 ? 's' : ''} seleccionado{lotesSeleccionados.length !== 1 ? 's' : ''}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">
                    Total: {lotes.filter(l => lotesSeleccionados.includes(l.id)).reduce((sum, l) => sum + l.areaHa, 0).toFixed(2)} hectáreas
                  </div>
                </div>
              ) : (
                <span>Selecciona los lotes específicos para la aplicación</span>
              )}
            </div>
            <div className="flex gap-2">
              {lotes.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); seleccionarTodos(); }}
                  disabled={disabled}
                  className="px-3 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-medium disabled:text-gray-400 rounded-lg transition-all"
                >
                  ✓ Todos ({lotes.length})
                </button>
              )}
              {lotesSeleccionados.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); limpiarTodos(); }}
                  disabled={disabled}
                  className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 font-medium rounded-lg transition-all"
                >
                  ✕ Limpiar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Contenido */}
      {error ? (
        <div className="p-4 text-red-600 bg-red-50 rounded-xl border border-red-200">
          ⚠️ {error}
        </div>
      ) : loading ? (
        <div className="p-8 text-center text-gray-500">
          <div className="animate-spin h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          Cargando cultivos y lotes...
        </div>
      ) : gruposFiltrados.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl">
          {filtroTexto ? (
            <>
              🔍 No se encontraron cultivos o lotes que coincidan con "<strong>{filtroTexto}</strong>"
            </>
          ) : (
            <>
              📭 No hay cultivos o lotes disponibles para este cliente
            </>
          )}
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto pr-2" onClick={(e) => e.stopPropagation()}>
          {/* Vista de Tarjetas Compactas - NUEVA INTERFAZ */}
          <div className="grid grid-cols-1 gap-3">
            {gruposFiltrados.map(({ cultivo, lotes: lotesDelCultivo }) => {
              // Colores distintivos por cultivo
              const coloresCultivo = [
                'border-l-green-500 bg-green-50',
                'border-l-blue-500 bg-blue-50',
                'border-l-purple-500 bg-purple-50',
                'border-l-orange-500 bg-orange-50',
                'border-l-red-500 bg-red-50',
                'border-l-yellow-500 bg-yellow-50'
              ];
              const colorCultivo = coloresCultivo[parseInt(cultivo.id.slice(-1), 16) % coloresCultivo.length];
              
              return lotesDelCultivo.map(lote => {
                const estaSeleccionado = lotesSeleccionados.includes(lote.id);
                
                return (
                  <div
                    key={lote.id}
                    onClick={(e) => { e.stopPropagation(); toggleLote(lote.id); }}
                    className={`
                      relative p-4 rounded-xl cursor-pointer transition-all duration-200 
                      border-l-4 ${colorCultivo}
                      ${estaSeleccionado 
                        ? 'ring-2 ring-green-500 bg-green-50 border-green-300' 
                        : 'border-gray-200 bg-white hover:shadow-md hover:ring-2 hover:ring-blue-300'
                      }
                    `}
                  >
                    <div className="flex items-center gap-4">
                      {/* Checkbox Grande y Visible */}
                      <div className={`
                        w-8 h-8 rounded-lg border-3 flex items-center justify-center transition-all duration-200 flex-shrink-0
                        ${estaSeleccionado 
                          ? 'border-green-500 bg-green-500 shadow-lg' 
                          : 'border-gray-300 bg-white hover:border-blue-400'
                        }
                      `}>
                        {estaSeleccionado && (
                          <span className="text-white font-bold text-lg">✓</span>
                        )}
                      </div>
                      
                      {/* Información Principal del Lote */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-gray-900 text-lg truncate">
                            📍 {lote.nombreLote}
                          </h4>
                          <span className="bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-600 border">
                            {lote.codigo}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-700 mb-2 font-medium">
                          🌾 {cultivo.nombre} • {cultivo.ubicacion}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            🌱 <strong>{lote.variedad}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            📐 <strong>{lote.areaHa} ha</strong>
                          </span>
                          {lote.riego && (
                            <span className="flex items-center gap-1 text-blue-600">
                              💧 <strong>Riego</strong>
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            📅 {lote.anioSiembra}
                          </span>
                        </div>
                      </div>

                      {/* Área Destacada */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-bold text-gray-800">
                          {lote.areaHa}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                          hectáreas
                        </div>
                      </div>
                    </div>

                    {/* Indicador de Estado Visual */}
                    {estaSeleccionado && (
                      <div className="absolute top-2 right-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                );
              });
            })}
          </div>

          {/* Acciones Rápidas por Cultivo */}
          {gruposFiltrados.length > 1 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <div className="text-sm font-semibold text-gray-700 mb-3">⚡ Selección Rápida por Cultivo:</div>
              <div className="flex flex-wrap gap-2">
                {gruposFiltrados.map(({ cultivo, lotes: lotesDelCultivo }) => {
                  const lotesSeleccionadosCultivo = lotesDelCultivo.filter(l => lotesSeleccionados.includes(l.id)).length;
                  const totalLotesCultivo = lotesDelCultivo.length;
                  const todosSeleccionados = lotesSeleccionadosCultivo === totalLotesCultivo;
                  
                  return (
                    <button
                      key={cultivo.id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); seleccionarTodosCultivo(cultivo.id); }}
                      disabled={disabled}
                      className={`
                        px-3 py-2 rounded-lg font-medium transition-all text-sm
                        ${todosSeleccionados
                          ? 'bg-green-500 text-white shadow-md' 
                          : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600'
                        }
                      `}
                    >
                      {todosSeleccionados ? '✓' : '○'} {cultivo.nombre}
                      <span className="ml-1 text-xs opacity-75">
                        ({lotesSeleccionadosCultivo}/{totalLotesCultivo})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}