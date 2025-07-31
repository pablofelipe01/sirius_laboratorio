'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface LoteAlmacenamiento {
  id: string;
  fields: {
    'Codigo Lote'?: string;
    'Microorganismo (from Microorganismos)'?: string[];
    'Total Cantidad Bolsas'?: number;
    'Fecha Creacion'?: string;
    'Fecha Inoculacion'?: string;
    'Fecha Guardado Refrigeración'?: string;
    'Fecha Guardado Refrigerador'?: string; // Compatibilidad con datos existentes
    'Nombre (from Responsables)'?: string[];
    'Estado Lote'?: string;
    'Abreviatura'?: string[];
    [key: string]: unknown; // Para campos adicionales que puedan existir
  };
}

export default function AlmacenamientoPage() {
  console.log('🏗️ ALMACENAMIENTO: Componente renderizando...');
  
  const { user } = useAuth();
  const [lotes, setLotes] = useState<LoteAlmacenamiento[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [error, setError] = useState('');
  const [filtroMicroorganismo, setFiltroMicroorganismo] = useState<string>('todos');
  const [loadingUpdate, setLoadingUpdate] = useState<string | null>(null);
  const [loteHistorial, setLoteHistorial] = useState<LoteAlmacenamiento | null>(null);
  const [showHistorial, setShowHistorial] = useState(false);

  console.log('📊 ALMACENAMIENTO: Estado actual:', {
    lotesCount: lotes.length,
    loadingLotes,
    error,
    userExists: !!user
  });

  // Obtener microorganismos únicos para el filtro
  const microorganismosUnicos = Array.from(
    new Set(
      lotes.flatMap(lote => 
        lote.fields['Microorganismo (from Microorganismos)'] || []
      )
    )
  ).sort();

  console.log('🧬 MICROORGANISMOS: Lista única:', microorganismosUnicos);

  // Filtrar lotes por microorganismo seleccionado
  const lotesFiltrados = filtroMicroorganismo === 'todos' 
    ? lotes 
    : lotes.filter(lote => {
        const microorganismos = lote.fields['Microorganismo (from Microorganismos)'] || [];
        const contieneFiltro = microorganismos.includes(filtroMicroorganismo);
        console.log(`🔍 FILTRO MICRO: Lote ${lote.fields['Codigo Lote']} - Microorganismos: ${microorganismos.join(', ')} - Contiene "${filtroMicroorganismo}": ${contieneFiltro}`);
        return contieneFiltro;
      });

  console.log('🧬 FILTRO APLICADO:', {
    filtroActual: filtroMicroorganismo,
    totalLotes: lotes.length,
    lotesFiltrados: lotesFiltrados.length
  });

  // Filtrar lotes por estado (usando los lotes ya filtrados por microorganismo)
  const lotesIncubacion = lotesFiltrados.filter(lote => {
    const estado = lote.fields['Estado Lote'];
    const esIncubacion = estado === 'Incubacion' || estado === 'Incubación';
    console.log(`🌡️ FILTRO INCUBACION: Lote ${lote.fields['Codigo Lote']} - Estado: "${estado}" - Es incubación: ${esIncubacion}`);
    return esIncubacion;
  });
  
  const lotesRefrigeracion = lotesFiltrados.filter(lote => {
    const estado = lote.fields['Estado Lote'];
    const esRefrigeracion = estado === 'Refrigeración' || estado === 'Refrigerado'; // Compatibilidad con datos existentes
    console.log(`❄️ FILTRO REFRIGERACIÓN: Lote ${lote.fields['Codigo Lote']} - Estado: "${estado}" - Es refrigeración: ${esRefrigeracion}`);
    return esRefrigeracion;
  });

  // Calcular totales de bolsas
  const totalBolsasRefrigeracion = lotesRefrigeracion.reduce((total, lote) => {
    return total + (lote.fields['Total Cantidad Bolsas'] || 0);
  }, 0);

  console.log('📊 FILTROS RESULTADO:');
  console.log('  - Total lotes:', lotes.length);
  console.log('  - Lotes filtrados por microorganismo:', lotesFiltrados.length);
  console.log('  - Lotes incubación (filtrados):', lotesIncubacion.length);
  console.log('  - Lotes refrigeración (filtrados):', lotesRefrigeracion.length);
  console.log('  - Total bolsas en refrigeración:', totalBolsasRefrigeracion);

  useEffect(() => {
    console.log('🚀 ALMACENAMIENTO: Componente montado, iniciando carga inicial...');
    console.log('👤 ALMACENAMIENTO: Usuario actual:', user);
    fetchLotes();
  }, []);

  const fetchLotes = async () => {
    console.log('🔄 ALMACENAMIENTO: Iniciando fetchLotes...');
    setLoadingLotes(true);
    setError('');
    try {
      console.log('📡 ALMACENAMIENTO: Haciendo fetch a /api/inoculacion...');
      const response = await fetch('/api/inoculacion');
      console.log('📡 ALMACENAMIENTO: Response status:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('📋 ALMACENAMIENTO: Data recibida:', data);
      console.log('📋 ALMACENAMIENTO: data.success:', data.success);
      console.log('📋 ALMACENAMIENTO: data.inoculaciones existe:', !!data.inoculaciones);
      console.log('📋 ALMACENAMIENTO: data.inoculaciones length:', data.inoculaciones?.length);
      
      if (data.success) {
        console.log('✅ ALMACENAMIENTO: Data con success=true, verificando inoculaciones...');
        console.log('📋 ALMACENAMIENTO: data.inoculaciones existe:', !!data.inoculaciones);
        console.log('📋 ALMACENAMIENTO: data.inoculaciones type:', typeof data.inoculaciones);
        console.log('📋 ALMACENAMIENTO: data.inoculaciones length:', Array.isArray(data.inoculaciones) ? data.inoculaciones.length : 'No es array');
        
        if (data.inoculaciones && Array.isArray(data.inoculaciones) && data.inoculaciones.length > 0) {
          console.log('✅ ALMACENAMIENTO: Data válida, procesando lotes...');
          console.log('📋 ALMACENAMIENTO: Todos los lotes:', data.inoculaciones);
          
          // Log de cada lote para ver su estructura
          data.inoculaciones.forEach((lote: LoteAlmacenamiento, index: number) => {
            console.log(`📦 ALMACENAMIENTO: Lote ${index + 1}:`, {
              id: lote.id,
              fields: lote.fields,
              estadoLote: lote.fields?.['Estado Lote'],
              codigoLote: lote.fields?.['Codigo Lote']
            });
          });
          
          // Filtrar solo los lotes que están en Incubación o Refrigeración
          const lotesAlmacenamiento = data.inoculaciones.filter((lote: LoteAlmacenamiento) => {
            const estado = lote.fields['Estado Lote'];
            const esAlmacenamiento = estado === 'Incubacion' || estado === 'Incubación' || estado === 'Refrigeración' || estado === 'Refrigerado'; // Compatibilidad
            console.log(`🔍 ALMACENAMIENTO: Lote ${lote.fields['Codigo Lote']} - Estado: "${estado}" - Es almacenamiento: ${esAlmacenamiento}`);
            return esAlmacenamiento;
          });
          
          console.log('✅ ALMACENAMIENTO: Lotes filtrados para almacenamiento:', lotesAlmacenamiento);
          console.log('📊 ALMACENAMIENTO: Total lotes almacenamiento:', lotesAlmacenamiento.length);
          setLotes(lotesAlmacenamiento);
        } else {
          console.error('❌ ALMACENAMIENTO: inoculaciones no es válido:', data.inoculaciones);
          setError('No se encontraron lotes de inoculación');
        }
      } else {
        console.error('❌ ALMACENAMIENTO: Error en data - success:', data.success, 'inoculaciones:', !!data.inoculaciones);
        setError('Error al cargar los lotes');
      }
    } catch (error) {
      console.error('❌ ALMACENAMIENTO: Error en catch:', error);
      setError('Error de conexión al cargar los lotes');
    } finally {
      setLoadingLotes(false);
      console.log('🏁 ALMACENAMIENTO: fetchLotes terminado');
    }
  };

  const cambiarEstadoLote = async (loteId: string, nuevoEstado: string) => {
    console.log(`🔄 CAMBIO ESTADO: Iniciando cambio de lote ${loteId} a ${nuevoEstado}...`);
    setLoadingUpdate(loteId);
    
    try {
      const fechaGuardadoRefrigeracion = nuevoEstado === 'Refrigeración' 
        ? new Date().toISOString().split('T')[0] // Formato YYYY-MM-DD
        : null;

      console.log('📡 CAMBIO ESTADO: Enviando request con datos:', {
        loteId,
        nuevoEstado,
        fechaGuardadoRefrigeracion
      });

      const response = await fetch('/api/inoculacion', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loteId,
          nuevoEstado,
          fechaGuardadoRefrigeracion
        }),
      });

      const data = await response.json();
      console.log('📋 CAMBIO ESTADO: Response recibida:', data);

      if (data.success) {
        console.log('✅ CAMBIO ESTADO: Actualización exitosa, recargando lotes...');
        // Recargar los lotes para reflejar el cambio
        await fetchLotes();
      } else {
        console.error('❌ CAMBIO ESTADO: Error en response:', data.error);
        setError(`Error al cambiar estado: ${data.error}`);
      }
    } catch (error) {
      console.error('❌ CAMBIO ESTADO: Error en catch:', error);
      setError('Error de conexión al cambiar estado del lote');
    } finally {
      setLoadingUpdate(null);
    }
  };

  const mostrarHistorialLote = (lote: LoteAlmacenamiento) => {
    console.log('📖 HISTORIAL: Mostrando historial del lote:', lote);
    setLoteHistorial(lote);
    setShowHistorial(true);
  };

  const LoteCard = ({ lote, tipo }: { lote: LoteAlmacenamiento; tipo: 'incubacion' | 'refrigeracion' }) => {
    console.log(`🎴 LOTE CARD (${tipo}):`, {
      id: lote.id,
      codigoLote: lote.fields['Codigo Lote'],
      estadoLote: lote.fields['Estado Lote'],
      microorganismo: lote.fields['Microorganismo (from Microorganismos)'],
      cantidadBolsas: lote.fields['Total Cantidad Bolsas'],
      fechaCreacion: lote.fields['Fecha Creacion'],
      responsables: lote.fields['Nombre (from Responsables)']
    });
    
    const bgColor = tipo === 'incubacion' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200';
    const iconColor = tipo === 'incubacion' ? 'bg-green-600' : 'bg-blue-600';
    const icon = tipo === 'incubacion' ? '🌡️' : '❄️';
    
    return (
      <div className={`${bgColor} rounded-lg p-4 border-2 hover:shadow-md transition-shadow`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`${iconColor} text-white p-1 rounded text-sm`}>
              {icon}
            </span>
            <h3 className="font-semibold text-gray-900">{lote.fields['Codigo Lote'] || 'N/A'}</h3>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            tipo === 'incubacion' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {lote.fields['Estado Lote'] || 'N/A'}
          </span>
        </div>
        
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium text-gray-700">Microorganismo:</span>
            <p className="text-gray-600">
              {lote.fields['Microorganismo (from Microorganismos)'] 
                ? Array.isArray(lote.fields['Microorganismo (from Microorganismos)']) 
                  ? lote.fields['Microorganismo (from Microorganismos)'].join(', ')
                  : lote.fields['Microorganismo (from Microorganismos)']
                : 'N/A'
              }
            </p>
          </div>
          
          <div>
            <span className="font-medium text-gray-700">Cantidad:</span>
            <p className="text-gray-600">{lote.fields['Total Cantidad Bolsas'] || 0} bolsas</p>
          </div>
          
          <div>
            <span className="font-medium text-gray-700">Fecha:</span>
            <p className="text-gray-600">
              {lote.fields['Fecha Creacion'] 
                ? new Date(lote.fields['Fecha Creacion']).toLocaleDateString('es-CO')
                : 'N/A'
              }
            </p>
          </div>
          
          {lote.fields['Nombre (from Responsables)'] && lote.fields['Nombre (from Responsables)'].length > 0 && (
            <div>
              <span className="font-medium text-gray-700">Responsable:</span>
              <p className="text-gray-600">
                {Array.isArray(lote.fields['Nombre (from Responsables)']) 
                  ? lote.fields['Nombre (from Responsables)'].join(', ')
                  : lote.fields['Nombre (from Responsables)']
                }
              </p>
            </div>
          )}
        </div>
        
        {/* Botones de acción */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          {tipo === 'incubacion' ? (
            <button
              onClick={() => cambiarEstadoLote(lote.id, 'Refrigeración')}
              disabled={loadingUpdate === lote.id}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
                loadingUpdate === lote.id
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {loadingUpdate === lote.id ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Cambiando...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  ❄️ Mover a Refrigeración
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={() => mostrarHistorialLote(lote)}
              className="w-full px-4 py-2 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              <span className="flex items-center justify-center gap-2">
                📖 Ver Historial del Lote
              </span>
            </button>
          )}
        </div>
      </div>
    );
  };

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
          <div className="max-w-5xl mx-auto">{/* Cambio de max-w-7xl a max-w-5xl */}
            
            {/* Header */}
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-green-600 to-blue-600 p-8 text-white relative overflow-hidden">
                <div className="relative z-10 text-center">
                  <h1 className="text-3xl font-bold mb-2">📦 ALMACENAMIENTO</h1>
                  <p className="text-xl opacity-90">Dashboard de Lotes en Incubación y Refrigeración</p>
                </div>
              </div>
              
              {/* Stats */}
              <div className="p-6 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Lotes en Incubación</p>
                        <p className="text-2xl font-bold text-green-600">{lotesIncubacion.length}</p>
                      </div>
                      <div className="bg-green-100 p-3 rounded-full">
                        <span className="text-2xl">🌡️</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Lotes Refrigeración</p>
                        <p className="text-2xl font-bold text-blue-600">{lotesRefrigeracion.length}</p>
                        <p className="text-sm text-gray-500">{totalBolsasRefrigeracion} bolsas total</p>
                      </div>
                      <div className="bg-blue-100 p-3 rounded-full">
                        <span className="text-2xl">❄️</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total de Lotes</p>
                        <p className="text-2xl font-bold text-green-600">{lotesFiltrados.length}</p>
                        {filtroMicroorganismo !== 'todos' && (
                          <p className="text-xs text-gray-500">({lotes.length} total sin filtro)</p>
                        )}
                      </div>
                      <div className="bg-green-100 p-3 rounded-full">
                        <span className="text-2xl">📋</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filtro por Microorganismo */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🧬</span>
                  <h3 className="text-lg font-semibold text-gray-800">Filtrar por Microorganismo:</h3>
                </div>
                
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() => setFiltroMicroorganismo('todos')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      filtroMicroorganismo === 'todos'
                        ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Todos ({lotes.length})
                  </button>
                  
                  {microorganismosUnicos.map((micro) => {
                    const count = lotes.filter(lote => 
                      lote.fields['Microorganismo (from Microorganismos)']?.includes(micro)
                    ).length;
                    
                    return (
                      <button
                        key={micro}
                        onClick={() => setFiltroMicroorganismo(micro)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          filtroMicroorganismo === micro
                            ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {micro} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {filtroMicroorganismo !== 'todos' && (
                <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                  <p className="text-blue-700 text-center">
                    <span className="font-medium">Filtro activo:</span> Mostrando solo lotes de <strong>{filtroMicroorganismo}</strong>
                    <button 
                      onClick={() => setFiltroMicroorganismo('todos')}
                      className="ml-2 text-blue-600 hover:text-blue-800 underline"
                    >
                      Limpiar filtro
                    </button>
                  </p>
                </div>
              )}
            </div>

            {/* Loading State */}
            {loadingLotes && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-white text-lg">Cargando lotes...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
                ❌ {error}
                <button 
                  onClick={fetchLotes}
                  className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Dashboard Content */}
            {!loadingLotes && !error && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                {/* Lotes en Incubación */}
                <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
                    <div className="flex items-center gap-3">
                      <span className="bg-white/20 p-2 rounded-lg text-2xl">🌡️</span>
                      <div>
                        <h2 className="text-2xl font-bold">Incubación</h2>
                        <p className="opacity-90">
                          Lotes en proceso de incubación
                          {filtroMicroorganismo !== 'todos' && ` - ${filtroMicroorganismo}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {lotesIncubacion.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-4">📭</div>
                        <p className="text-lg">No hay lotes en incubación</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {lotesIncubacion.map((lote) => (
                          <LoteCard key={lote.id} lote={lote} tipo="incubacion" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Lotes Refrigeración */}
                <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
                    <div className="flex items-center gap-3">
                      <span className="bg-white/20 p-2 rounded-lg text-2xl">❄️</span>
                      <div>
                        <h2 className="text-2xl font-bold">Refrigeración</h2>
                        <p className="opacity-90">
                          Lotes en refrigeración - {totalBolsasRefrigeracion} bolsas total
                          {filtroMicroorganismo !== 'todos' && ` - ${filtroMicroorganismo}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {lotesRefrigeracion.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-4">📭</div>
                        <p className="text-lg">No hay lotes en refrigeración</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {lotesRefrigeracion.map((lote) => (
                          <LoteCard key={lote.id} lote={lote} tipo="refrigeracion" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Refresh Button */}
            <div className="text-center mt-8">
              <button
                onClick={fetchLotes}
                disabled={loadingLotes}
                className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingLotes ? 'Actualizando...' : '🔄 Actualizar Dashboard'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de Historial del Lote */}
      {showHistorial && loteHistorial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">📖 Historial del Lote</h2>
                  <p className="opacity-90">Código: {loteHistorial.fields['Codigo Lote']}</p>
                </div>
                <button
                  onClick={() => setShowHistorial(false)}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-all"
                >
                  <span className="text-2xl">✕</span>
                </button>
              </div>
            </div>
            
            {/* Contenido del Modal */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Información Básica */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">ℹ️ Información Básica</h3>
                  
                  <div className="space-y-3">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="font-medium text-gray-700">Código del Lote:</label>
                      <p className="text-gray-900 text-lg font-mono">{loteHistorial.fields['Codigo Lote'] || 'N/A'}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="font-medium text-gray-700">Estado Actual:</label>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ml-2 ${
                        loteHistorial.fields['Estado Lote'] === 'Refrigeración' || loteHistorial.fields['Estado Lote'] === 'Refrigerado'
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {loteHistorial.fields['Estado Lote'] || 'N/A'}
                      </span>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="font-medium text-gray-700">Microorganismo:</label>
                      <p className="text-gray-900">
                        {loteHistorial.fields['Microorganismo (from Microorganismos)'] 
                          ? Array.isArray(loteHistorial.fields['Microorganismo (from Microorganismos)']) 
                            ? loteHistorial.fields['Microorganismo (from Microorganismos)'].join(', ')
                            : loteHistorial.fields['Microorganismo (from Microorganismos)']
                          : 'N/A'
                        }
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="font-medium text-gray-700">Cantidad de Bolsas:</label>
                      <p className="text-gray-900 text-lg font-semibold">{loteHistorial.fields['Total Cantidad Bolsas'] || 0}</p>
                    </div>
                  </div>
                </div>
                
                {/* Fechas y Responsables */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">📅 Fechas y Responsables</h3>
                  
                  <div className="space-y-3">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="font-medium text-gray-700">Fecha de Inoculación:</label>
                      <p className="text-gray-900">
                        {loteHistorial.fields['Fecha Inoculacion'] 
                          ? new Date(loteHistorial.fields['Fecha Inoculacion']).toLocaleDateString('es-CO', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : 'N/A'
                        }
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="font-medium text-gray-700">Fecha de Creación:</label>
                      <p className="text-gray-900">
                        {loteHistorial.fields['Fecha Creacion'] 
                          ? new Date(loteHistorial.fields['Fecha Creacion']).toLocaleDateString('es-CO', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'N/A'
                        }
                      </p>
                    </div>
                    
                    {(loteHistorial.fields['Fecha Guardado Refrigeración'] || loteHistorial.fields['Fecha Guardado Refrigerador']) && (
                      <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                        <label className="font-medium text-blue-700">Fecha Guardado en Refrigeración:</label>
                        <p className="text-blue-900 font-semibold">
                          {new Date((loteHistorial.fields['Fecha Guardado Refrigeración'] || loteHistorial.fields['Fecha Guardado Refrigerador']) as string).toLocaleDateString('es-CO', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="font-medium text-gray-700">Responsables:</label>
                      <p className="text-gray-900">
                        {loteHistorial.fields['Nombre (from Responsables)'] && loteHistorial.fields['Nombre (from Responsables)'].length > 0
                          ? Array.isArray(loteHistorial.fields['Nombre (from Responsables)']) 
                            ? loteHistorial.fields['Nombre (from Responsables)'].join(', ')
                            : loteHistorial.fields['Nombre (from Responsables)']
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Información Adicional */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">🔬 Información Técnica</h3>
              </div>
            </div>
            
            {/* Footer del Modal */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end">
              <button
                onClick={() => setShowHistorial(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </>
  );
}
