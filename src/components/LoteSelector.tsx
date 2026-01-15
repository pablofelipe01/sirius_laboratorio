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
  const [cultivosExpandidos, setCultivosExpandidos] = useState<Set<string>>(new Set());

  // Fetch cultivos y lotes
  useEffect(() => {
    console.log('🔄 useEffect disparado - clienteId:', clienteId, '- timestamp:', Date.now());
    
    if (!clienteId) {
      setCultivos([]);
      setLotes([]);
      onLotesChange([]);
      setCultivosExpandidos(new Set());
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
        
        // Expandir automáticamente todos los cultivos al cargar
        if (data.cultivos && data.cultivos.length > 0) {
          setCultivosExpandidos(new Set(data.cultivos.map((c: Cultivo) => c.id)));
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

  // Filtrar por búsqueda
  const gruposFiltrados = lotesPorCultivo.filter(grupo => {
    if (!filtroTexto) return true;
    const texto = filtroTexto.toLowerCase();
    
    // Buscar en el cultivo
    const coincideCultivo = 
      grupo.cultivo.codigo.toLowerCase().includes(texto) ||
      grupo.cultivo.nombre.toLowerCase().includes(texto) ||
      grupo.cultivo.ubicacion.toLowerCase().includes(texto);
    
    // Buscar en los lotes
    const coincideLote = grupo.lotes.some(lote =>
      lote.codigo.toLowerCase().includes(texto) ||
      lote.nombreLote.toLowerCase().includes(texto) ||
      lote.variedad.toLowerCase().includes(texto)
    );
    
    return coincideCultivo || coincideLote;
  });

  const toggleCultivoExpandido = (cultivoId: string) => {
    const nuevosExpandidos = new Set(cultivosExpandidos);
    if (nuevosExpandidos.has(cultivoId)) {
      nuevosExpandidos.delete(cultivoId);
    } else {
      nuevosExpandidos.add(cultivoId);
    }
    setCultivosExpandidos(nuevosExpandidos);
  };

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
            placeholder={loading ? "Cargando..." : "🔍 Buscar cultivo o lote..."}
            disabled={disabled || loading}
            className="w-full px-4 py-3 pl-10 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400"
          />
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </span>
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>

        {/* Contador y controles */}
        {!loading && !error && (
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600">
              {lotesSeleccionados.length > 0 ? (
                <span className="font-medium text-green-600">
                  ✓ {lotesSeleccionados.length} lote{lotesSeleccionados.length !== 1 ? 's' : ''} seleccionado{lotesSeleccionados.length !== 1 ? 's' : ''}
                </span>
              ) : (
                <span>Selecciona los lotes para aplicar</span>
              )}
            </div>
            <div className="flex gap-2">
              {lotes.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); seleccionarTodos(); }}
                  disabled={disabled}
                  className="text-blue-600 hover:text-blue-800 font-medium disabled:text-gray-400"
                >
                  Seleccionar todos
                </button>
              )}
              {lotesSeleccionados.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); limpiarTodos(); }}
                  disabled={disabled}
                  className="text-red-600 hover:text-red-800 font-medium"
                >
                  Limpiar
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
        <div className="max-h-96 overflow-y-auto space-y-3 pr-2" onClick={(e) => e.stopPropagation()}>
          {gruposFiltrados.map(({ cultivo, lotes: lotesDelCultivo }) => {
            const lotesSeleccionadosCultivo = lotesDelCultivo.filter(l => lotesSeleccionados.includes(l.id)).length;
            const totalLotesCultivo = lotesDelCultivo.length;
            const todosSeleccionados = lotesSeleccionadosCultivo === totalLotesCultivo;
            const estaExpandido = cultivosExpandidos.has(cultivo.id);

            return (
              <div key={cultivo.id} className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white" onClick={(e) => { console.log('🌾 Click en CONTENEDOR cultivo:', cultivo.nombre, '- stopPropagation'); e.stopPropagation(); }}>
                {/* Header del cultivo */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4" onClick={(e) => { console.log('📋 Click en HEADER cultivo:', cultivo.nombre, '- stopPropagation'); e.stopPropagation(); }}>
                  <div className="flex items-center justify-between" onClick={(e) => { console.log('📐 Click en DIV flex principal - stopPropagation'); e.stopPropagation(); }}>
                    <div className="flex-1" onClick={(e) => { console.log('📦 Click en DIV flex-1 - stopPropagation'); e.stopPropagation(); }}>
                      <button
                        type="button"
                        onClick={(e) => { console.log('🔽 Click en BOTÓN expandir cultivo:', cultivo.nombre, '- stopPropagation'); e.stopPropagation(); toggleCultivoExpandido(cultivo.id); }}
                        className="flex items-center gap-2 text-left w-full group"
                      >
                        <span className="text-lg transition-transform duration-200" style={{ transform: estaExpandido ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                          ▶
                        </span>
                        <div>
                          <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                            🌾 {cultivo.nombre}
                          </div>
                          <div className="text-sm text-gray-600">
                            {cultivo.codigo} • {cultivo.ubicacion} • {totalLotesCultivo} lote{totalLotesCultivo !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </button>
                    </div>
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      {lotesSeleccionadosCultivo > 0 && (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                          {lotesSeleccionadosCultivo}/{totalLotesCultivo}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); seleccionarTodosCultivo(cultivo.id); }}
                        disabled={disabled}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          todosSeleccionados
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600'
                        }`}
                      >
                        {todosSeleccionados ? '✓ Todos' : 'Seleccionar'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lotes del cultivo */}
                {estaExpandido && (
                  <div className="p-4 space-y-2 bg-gray-50" onClick={(e) => e.stopPropagation()}>
                    {lotesDelCultivo.map(lote => {
                      const estaSeleccionado = lotesSeleccionados.includes(lote.id);
                      return (
                        <div
                          key={lote.id}
                          onClick={(e) => { e.stopPropagation(); toggleLote(lote.id); }}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                            estaSeleccionado
                              ? 'border-green-500 bg-green-50 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                📍 {lote.nombreLote}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                <span className="inline-flex items-center gap-4">
                                  <span>Código: {lote.codigo}</span>
                                  <span>•</span>
                                  <span>Variedad: {lote.variedad}</span>
                                  <span>•</span>
                                  <span>Área: {lote.areaHa} ha</span>
                                  {lote.riego && <span>💧 Riego</span>}
                                </span>
                              </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3 ${
                              estaSeleccionado
                                ? 'border-green-500 bg-green-500'
                                : 'border-gray-300 bg-white'
                            }`}>
                              {estaSeleccionado && (
                                <span className="text-white font-bold">✓</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}