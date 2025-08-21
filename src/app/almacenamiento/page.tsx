'use client';

import { useState, useEffect, useMemo } from 'react';
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
  
  // Función para verificar si el usuario puede ver datos de ganancias
  const puedeVerGanancias = () => {
    if (!user || !user.nombre) return false;
    
    const usuariosAutorizados = [
      'David Hernandez',
      'Luisa Ramirez', 
      'Don Martin'
    ];
    
    return usuariosAutorizados.includes(user.nombre);
  };

  const [tipoSeleccionado, setTipoSeleccionado] = useState<string | null>(null);
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
    userExists: !!user,
    tipoSeleccionado
  });

  const handleVolverAtras = () => {
    setTipoSeleccionado(null);
    setLotes([]);
    setError('');
    setFiltroMicroorganismo('todos');
  };

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
    // Cargar resumen de inventario al montar el componente
    fetchResumenInventario();
  }, []);

  useEffect(() => {
    console.log('🔄 USEEFFECT: Ejecutándose con tipoSeleccionado:', tipoSeleccionado);
    
    if (tipoSeleccionado) {
      console.log('🚀 ALMACENAMIENTO: Tipo seleccionado:', tipoSeleccionado, '- iniciando carga...');
      console.log('👤 ALMACENAMIENTO: Usuario actual:', user);
      
      if (tipoSeleccionado === 'Bacteria') {
        console.log('🦠 BACTERIA: Llamando fetchFermentacion...');
        fetchFermentacion();
      } else {
        console.log('🍄 HONGO: Llamando fetchLotes...');
        fetchLotes();
      }
    } else {
      console.log('⚠️ USEEFFECT: No hay tipo seleccionado');
    }
  }, [tipoSeleccionado]);

  const fetchLotes = async () => {
    if (!tipoSeleccionado) {
      console.log('⚠️ ALMACENAMIENTO: No hay tipo seleccionado, cancelando fetch');
      return;
    }
    
    console.log('🔄 ALMACENAMIENTO: Iniciando fetchLotes para tipo:', tipoSeleccionado);
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

          // Filtrar por tipo de microorganismo si está seleccionado
          let lotesFiltradosPorTipo = lotesAlmacenamiento;
          if (tipoSeleccionado) {
            console.log('🔍 FILTRO TIPO: Iniciando filtro por tipo:', tipoSeleccionado);
            console.log('🔍 FILTRO TIPO: Total lotes antes de filtrar:', lotesAlmacenamiento.length);
            
            // Primero, mostrar todos los microorganismos disponibles para debug
            const todosLosMicroorganismos = lotesAlmacenamiento.flatMap((lote: LoteAlmacenamiento) => 
              lote.fields['Microorganismo (from Microorganismos)'] || []
            );
            console.log('🔍 FILTRO TIPO: Todos los microorganismos en los datos:', Array.from(new Set(todosLosMicroorganismos)));
            
            lotesFiltradosPorTipo = lotesAlmacenamiento.filter((lote: LoteAlmacenamiento) => {
              // Obtener información del microorganismo
              const microorganismos = lote.fields['Microorganismo (from Microorganismos)'] || [];
              console.log(`🔍 FILTRO TIPO: Evaluando lote ${lote.fields['Codigo Lote']} - Microorganismos:`, microorganismos);
              
              const tipoCoincide = microorganismos.some((micro: string) => {
                const microLower = micro.toLowerCase();
                console.log(`🔍 FILTRO TIPO: Evaluando microorganismo "${micro}" (lower: "${microLower}")`);
                
                if (tipoSeleccionado === 'Hongo') {
                  // Palabras clave que indican hongos - más inclusivo
                  const esHongo = microLower.includes('pleurotus') || 
                                 microLower.includes('oyster') || 
                                 microLower.includes('shiitake') || 
                                 microLower.includes('hongo') ||
                                 microLower.includes('mushroom') ||
                                 microLower.includes('ostreatus') ||
                                 microLower.includes('seta') ||
                                 microLower.includes('fungi') ||
                                 microLower.includes('champiñón');
                  console.log(`🍄 FILTRO HONGO: "${micro}" es hongo: ${esHongo}`);
                  return esHongo;
                } else if (tipoSeleccionado === 'Bacteria') {
                  // Palabras clave que indican bacterias
                  const esBacteria = microLower.includes('bacillus') || 
                                    microLower.includes('thuringiensis') || 
                                    microLower.includes('bacteria') ||
                                    microLower.includes('bacterial') ||
                                    microLower.includes('coli') ||
                                    microLower.includes('streptococcus') ||
                                    microLower.includes('lactobacillus');
                  console.log(`🦠 FILTRO BACTERIA: "${micro}" es bacteria: ${esBacteria}`);
                  return esBacteria;
                }
                return false;
              });
              
              console.log(`🔍 TIPO FILTRO RESULTADO: Lote ${lote.fields['Codigo Lote']} - Tipo seleccionado: ${tipoSeleccionado} - Coincide: ${tipoCoincide}`);
              return tipoCoincide;
            });
            
            console.log('🔍 FILTRO TIPO: Total lotes después de filtrar:', lotesFiltradosPorTipo.length);
            console.log('🔍 FILTRO TIPO: Lotes filtrados:', lotesFiltradosPorTipo.map((l: LoteAlmacenamiento) => l.fields['Codigo Lote']));
            
            // Si no se encontraron lotes del tipo específico, mostrar mensaje informativo
            if (lotesFiltradosPorTipo.length === 0 && lotesAlmacenamiento.length > 0) {
              console.log('⚠️ FILTRO TIPO: No se encontraron lotes del tipo seleccionado. Mostrando todos los lotes disponibles para debugging.');
              // Por ahora mostraremos todos los lotes para que el usuario pueda ver qué hay disponible
              // En el futuro podrías decidir mostrar un mensaje vacío o todos los lotes
              lotesFiltradosPorTipo = lotesAlmacenamiento;
            }
          }
          
          console.log('✅ ALMACENAMIENTO: Lotes filtrados para almacenamiento:', lotesFiltradosPorTipo);
          console.log('📊 ALMACENAMIENTO: Total lotes almacenamiento después de filtro tipo:', lotesFiltradosPorTipo.length);
          setLotes(lotesFiltradosPorTipo);
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
        ? new Date().toISOString() // Fecha y hora completa en formato ISO
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

  const renderSeleccionTipo = () => (
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              📦 ALMACENAMIENTO
            </h1>
            <p className="text-gray-600 mb-6">
              Selecciona el tipo de microorganismo para ver los lotes en almacenamiento
            </p>
          </div>

          {/* Resumen de Inventario Disponible */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                📊 Inventario Disponible para Despacho
              </h2>
              <button
                onClick={fetchResumenInventario}
                disabled={resumenInventario.loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
              >
                {resumenInventario.loading ? '⏳ Actualizando...' : '🔄 Actualizar'}
              </button>
            </div>

            {resumenInventario.loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando inventario...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Hongos Disponibles */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">🍄</span>
                    <h3 className="text-xl font-bold text-orange-800">Hongos Disponibles</h3>
                  </div>
                  
                  {resumenInventario.hongos.length === 0 ? (
                    <p className="text-orange-600 text-center py-4">No hay hongos disponibles para despacho</p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {resumenInventario.hongos.map((item, index) => (
                        <div key={index} className="bg-white rounded-lg p-4 border border-orange-200">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-1">{item.microorganismo}</h4>
                              <div className="flex gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  📦 <strong>{item.bolsas}</strong> bolsas
                                </span>
                                {/* Solo mostrar litros si el microorganismo NO contiene "+" */}
                                {!item.microorganismo.includes('+') && (
                                  <span className="flex items-center gap-1">
                                    🧪 <strong>{item.litros}</strong> litros
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                                Disponible
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {resumenInventario.hongos.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-orange-200">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-orange-700">Total Hongos:</span>
                        <div className="flex gap-4">
                          <span className="font-semibold text-gray-800">{resumenInventario.hongos.reduce((sum, item) => sum + item.bolsas, 0)} bolsas</span>
                          <span className="font-semibold text-gray-800">{resumenInventario.hongos.reduce((sum, item) => sum + (item.microorganismo.includes('+') ? 0 : item.litros), 0)} litros</span>
                        </div>
                      </div>
                      {/* Cálculo de ganancia potencial - Solo para usuarios autorizados */}
                      {puedeVerGanancias() && (() => {
                        const totalLitros = resumenInventario.hongos.reduce((sum, item) => sum + (item.microorganismo.includes('+') ? 0 : item.litros), 0);
                        const precioPorLitro = 38000; // $38,000 COP por litro
                        const gananciaTotal = totalLitros * precioPorLitro;
                        
                        if (totalLitros > 0) {
                          return (
                            <div className="mt-2 pt-2 border-t border-orange-100">
                              <div className="flex justify-between text-xs">
                                <span className="text-green-600 font-medium">💰 Ganancia Potencial:</span>
                                <span className="font-bold text-green-700">
                                  ${gananciaTotal.toLocaleString('es-CO')} COP
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 text-right">
                                ({totalLitros} L × $38,000/L)
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>

                {/* Bacterias Disponibles */}
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">🦠</span>
                    <h3 className="text-xl font-bold text-purple-800">Bacterias Disponibles</h3>
                  </div>
                  
                  {resumenInventario.bacterias.length === 0 ? (
                    <p className="text-purple-600 text-center py-4">No hay bacterias disponibles para despacho</p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {resumenInventario.bacterias.map((item, index) => (
                        <div key={index} className="bg-white rounded-lg p-4 border border-purple-200">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-1">{item.microorganismo}</h4>
                              <div className="flex gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  🧪 <strong>{item.litros}</strong> litros
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                                En Stock
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {resumenInventario.bacterias.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-purple-200">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-purple-700">Total Bacterias:</span>
                        <span className="font-semibold text-gray-800">{resumenInventario.bacterias.reduce((sum, item) => sum + item.litros, 0)} litros</span>
                      </div>
                      {/* Cálculo de ganancia potencial para bacterias - Solo para usuarios autorizados */}
                      {puedeVerGanancias() && (() => {
                        const totalLitros = resumenInventario.bacterias.reduce((sum, item) => sum + item.litros, 0);
                        const precioPorLitro = 38000; // $38,000 COP por litro
                        const gananciaTotal = totalLitros * precioPorLitro;
                        
                        if (totalLitros > 0) {
                          return (
                            <div className="mt-2 pt-2 border-t border-purple-100">
                              <div className="flex justify-between text-xs">
                                <span className="text-green-600 font-medium">💰 Ganancia Potencial:</span>
                                <span className="font-bold text-green-700">
                                  ${gananciaTotal.toLocaleString('es-CO')} COP
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 text-right">
                                ({totalLitros} L × $38,000/L)
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Opciones de Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Opción Hongos */}
            <div 
              onClick={() => setTipoSeleccionado('Hongo')}
              className="bg-white rounded-lg shadow-lg p-8 cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group"
            >
              <div className="text-center">
                <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  🍄
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  HONGOS
                </h2>
                <p className="text-gray-600 mb-4">
                  Ver lotes de microorganismos tipo hongo en almacenamiento
                </p>
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-6 rounded-lg font-semibold group-hover:from-orange-600 group-hover:to-red-600 transition-all">
                  Ver Hongos
                </div>
              </div>
            </div>

            {/* Opción Bacterias */}
            <div 
              onClick={() => {
                console.log('🦠 CLICK: Usuario seleccionó Bacterias');
                setTipoSeleccionado('Bacteria');
              }}
              className="bg-white rounded-lg shadow-lg p-8 cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group"
            >
              <div className="text-center">
                <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  🦠
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  BACTERIAS
                </h2>
                <p className="text-gray-600 mb-4">
                  Ver lotes de microorganismos tipo bacteria en almacenamiento
                </p>
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-6 rounded-lg font-semibold group-hover:from-blue-600 group-hover:to-purple-600 transition-all">
                  Ver Bacterias
                </div>
              </div>
            </div>

          </div>

          {/* Información adicional */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
            <div className="flex items-center">
              <div className="text-2xl mr-3">ℹ️</div>
              <div>
                <h3 className="text-lg font-semibold text-blue-800 mb-2">
                  Información del Sistema
                </h3>
                <p className="text-blue-700">
                  El sistema mostrará únicamente los lotes en estado de Incubación y Refrigeración 
                  correspondientes al tipo de microorganismo seleccionado.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Interfaces para la tabla de Fermentación - Actualizada según nueva documentación
  interface FermentacionRecord {
    id: string;
    createdTime: string;
    fields: {
      ID?: string;
      Creada?: string;
      'Abreviaturas (from Microorganismos)'?: string[];
      'Codigo Lote'?: string;
      'Microorganismo'?: string[];
      'Fecha Inicia Fermentacion'?: string;
      'Fecha Termina Fermentacion'?: string;
      Estado?: string;
      'Cantidad Litros'?: number;
      'Total Litros'?: number;
      Observaciones?: string;
      Responsables?: string[];
      'Realiza Registro'?: string;
      'Cantidad Litros Salida Fermentacion'?: number[];
      Microorganismos?: string[];
      'Salida Fermentacion'?: string[];
      'Salida Insumos'?: string[];
    };
  }

  // Estados para el resumen de inventario
  const [resumenInventario, setResumenInventario] = useState<{
    hongos: Array<{microorganismo: string, bolsas: number, litros: number}>,
    bacterias: Array<{microorganismo: string, litros: number}>,
    loading: boolean
  }>({
    hongos: [],
    bacterias: [],
    loading: false
  });

  // Estados específicos para bacterias/fermentación
  const [lotesFermentacion, setLotesFermentacion] = useState<FermentacionRecord[]>([]);
  const [loadingFermentacion, setLoadingFermentacion] = useState(false);
  const [lotesFermentando, setLotesFermentando] = useState<FermentacionRecord[]>([]);
  const [lotesDisponibles, setLotesDisponibles] = useState<FermentacionRecord[]>([]);
  const [totalLitrosDisponibles, setTotalLitrosDisponibles] = useState(0);
  const [microorganismosBacterias, setMicroorganismosBacterias] = useState<string[]>([]);
  const [filtroMicroorganismoBacterias, setFiltroMicroorganismoBacterias] = useState('todos');

  // Función para obtener datos de fermentación
  const fetchFermentacion = async () => {
    console.log('🔬 FERMENTACION: Iniciando fetch de datos de fermentación...');
    setLoadingFermentacion(true);
    setError('');
    
    try {
      console.log('📡 FERMENTACION: Enviando request a API...');
      const response = await fetch('/api/fermentacion');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📋 FERMENTACION: Response recibida:', data);
      
      if (data.success && data.records) {
        const fermentaciones = data.records as FermentacionRecord[];
        console.log(`✅ FERMENTACION: ${fermentaciones.length} registros procesados`);
        
        setLotesFermentacion(fermentaciones);
        
        // Separar lotes por estado
        const fermentando = fermentaciones.filter(lote => 
          lote.fields.Estado === 'No Disponible - En Fermentacion'
        );
        const disponibles = fermentaciones.filter(lote => 
          lote.fields.Estado === 'Disponible'
        );
        
        setLotesFermentando(fermentando);
        setLotesDisponibles(disponibles);
        
        // Calcular total de litros disponibles
        const totalLitros = disponibles.reduce((total, lote) => 
          total + (lote.fields['Total Litros'] || 0), 0
        );
        setTotalLitrosDisponibles(totalLitros);
        
        // Obtener microorganismos únicos
        const microorganismosSet = new Set<string>();
        fermentaciones.forEach(lote => {
          if (lote.fields['Microorganismo']) {
            lote.fields['Microorganismo'].forEach(micro => microorganismosSet.add(micro));
          }
        });
        setMicroorganismosBacterias(Array.from(microorganismosSet));
        
        console.log('📊 FERMENTACION: Datos procesados:', {
          total: fermentaciones.length,
          fermentando: fermentando.length,
          disponibles: disponibles.length,
          totalLitros: totalLitros,
          microorganismos: microorganismosSet.size
        });
        
      } else {
        console.error('❌ FERMENTACION: Response sin datos válidos:', data);
        setError(data.error || 'No se pudieron cargar los datos de fermentación');
      }
    } catch (error) {
      console.error('❌ FERMENTACION: Error en catch:', error);
      setError('Error de conexión al cargar los datos de fermentación');
    } finally {
      setLoadingFermentacion(false);
      console.log('🏁 FERMENTACION: fetchFermentacion terminado');
    }
  };

  // Función para obtener resumen de inventario
  const fetchResumenInventario = async () => {
    console.log('📊 RESUMEN: Iniciando fetch de resumen de inventario...');
    setResumenInventario(prev => ({ ...prev, loading: true }));
    
    try {
      // Obtener datos de hongos (inoculación)
      console.log('📡 RESUMEN: Obteniendo datos de hongos...');
      const responseHongos = await fetch('/api/inoculacion');
      const dataHongos = await responseHongos.json();
      
      // Obtener datos de bacterias (fermentación)
      console.log('📡 RESUMEN: Obteniendo datos de bacterias...');
      const responseBacterias = await fetch('/api/fermentacion');
      const dataBacterias = await responseBacterias.json();
      
      // Procesar hongos disponibles
      let resumenHongos: Array<{microorganismo: string, bolsas: number, litros: number}> = [];
      if (dataHongos.success && dataHongos.inoculaciones) {
        console.log('📊 RESUMEN: Procesando hongos...', dataHongos.inoculaciones.length, 'registros');
        
        const hongosDisponibles = dataHongos.inoculaciones.filter((lote: LoteAlmacenamiento) => {
          console.log('🔍 RESUMEN: Evaluando lote hongo:', {
            id: lote.id,
            estado: lote.fields['Estado Lote'],
            totalBolsas: lote.fields['Total Cantidad Bolsas'],
            microorganismo: lote.fields['Microorganismo (from Microorganismos)']
          });
          return lote.fields['Estado Lote'] === 'Refrigeración' && (lote.fields['Total Cantidad Bolsas'] || 0) > 0;
        });
        
        console.log('✅ RESUMEN: Hongos disponibles filtrados:', hongosDisponibles.length);
        
        // Agrupar por microorganismo
        const agrupacionHongos: { [key: string]: { bolsas: number, litros: number } } = {};
        hongosDisponibles.forEach((lote: LoteAlmacenamiento) => {
          const microorganismo = lote.fields['Microorganismo (from Microorganismos)']?.[0] || 'Sin especificar';
          const bolsas = lote.fields['Total Cantidad Bolsas'] || 0;
          
          console.log('📦 RESUMEN: Procesando hongo:', {
            microorganismo,
            bolsas,
            loteId: lote.id
          });
          
          if (!agrupacionHongos[microorganismo]) {
            agrupacionHongos[microorganismo] = { bolsas: 0, litros: 0 };
          }
          agrupacionHongos[microorganismo].bolsas += bolsas;
          
          // Solo agregar a litros si NO contiene "+" (microorganismos con + son solo bolsas)
          if (!microorganismo.includes('+')) {
            agrupacionHongos[microorganismo].litros += bolsas; // 1 bolsa = 1 litro aproximadamente
          }
        });
        
        resumenHongos = Object.entries(agrupacionHongos).map(([microorganismo, datos]) => ({
          microorganismo,
          bolsas: datos.bolsas,
          litros: datos.litros
        }));
        
        console.log('📊 RESUMEN: Hongos agrupados:', resumenHongos);
      } else {
        console.log('❌ RESUMEN: No se pudieron obtener datos de hongos:', dataHongos);
      }
      
      // Procesar bacterias disponibles
      let resumenBacterias: Array<{microorganismo: string, litros: number}> = [];
      if (dataBacterias.success && dataBacterias.records) {
        console.log('📊 RESUMEN: Procesando bacterias...', dataBacterias.records.length, 'registros');
        
        // Incluir tanto bacterias disponibles como las en fermentación que tengan litros > 0
        const bacteriasConLitros = dataBacterias.records.filter((lote: FermentacionRecord) => {
          console.log('🔍 RESUMEN: Evaluando lote bacteria:', {
            id: lote.id,
            estado: lote.fields.Estado,
            totalLitros: lote.fields['Total Litros'],
            cantidadLitros: lote.fields['Cantidad Litros'],
            microorganismo: lote.fields['Microorganismo']
          });
          // Mostrar lotes que tengan litros disponibles, sin importar el estado específico
          return (lote.fields['Total Litros'] || 0) > 0 || (lote.fields['Cantidad Litros'] || 0) > 0;
        });
        
        console.log('✅ RESUMEN: Bacterias con litros filtradas:', bacteriasConLitros.length);
        
        // Agrupar por microorganismo
        const agrupacionBacterias: { [key: string]: { litros: number } } = {};
        bacteriasConLitros.forEach((lote: FermentacionRecord) => {
          // Verificar si el campo Microorganismo existe y es un array
          let microorganismo = 'Sin especificar';
          if (lote.fields['Microorganismo'] && Array.isArray(lote.fields['Microorganismo'])) {
            microorganismo = lote.fields['Microorganismo'][0] || 'Sin especificar';
          }
          
          // Usar Total Litros si existe, sino usar Cantidad Litros
          const litros = lote.fields['Total Litros'] || lote.fields['Cantidad Litros'] || 0;
          
          console.log('📦 RESUMEN: Procesando bacteria:', {
            microorganismo,
            litros,
            loteId: lote.id,
            estado: lote.fields.Estado
          });
          
          if (!agrupacionBacterias[microorganismo]) {
            agrupacionBacterias[microorganismo] = { litros: 0 };
          }
          agrupacionBacterias[microorganismo].litros += litros;
        });
        
        resumenBacterias = Object.entries(agrupacionBacterias).map(([microorganismo, datos]) => ({
          microorganismo,
          litros: datos.litros
        }));
        
        console.log('📊 RESUMEN: Bacterias agrupadas:', resumenBacterias);
      } else {
        console.log('❌ RESUMEN: No se pudieron obtener datos de bacterias:', dataBacterias);
      }
      
      console.log('✅ RESUMEN: Datos procesados:', {
        hongos: resumenHongos.length,
        bacterias: resumenBacterias.length
      });
      
      setResumenInventario({
        hongos: resumenHongos,
        bacterias: resumenBacterias,
        loading: false
      });
      
    } catch (error) {
      console.error('❌ RESUMEN: Error obteniendo resumen:', error);
      setResumenInventario(prev => ({ ...prev, loading: false }));
    }
  };

  // Filtrar lotes por microorganismo
  const lotesFermentacionFiltrados = useMemo(() => {
    if (filtroMicroorganismoBacterias === 'todos') {
      return lotesFermentacion;
    }
    return lotesFermentacion.filter(lote => 
      lote.fields['Microorganismo']?.includes(filtroMicroorganismoBacterias)
    );
  }, [lotesFermentacion, filtroMicroorganismoBacterias]);

  const renderDashboardBacterias = () => {
    return (
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
          <div className="max-w-5xl mx-auto">
            
            {/* Header */}
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-white relative overflow-hidden">
                {/* Botón volver atrás */}
                <div className="absolute left-4 top-4 z-30">
                  <button
                    onClick={handleVolverAtras}
                    className="bg-white text-gray-800 hover:bg-gray-100 px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg font-medium"
                  >
                    <span className="text-lg">←</span>
                    <span>Volver</span>
                  </button>
                </div>
                
                <div className="relative z-10 text-center pt-4">
                  <h1 className="text-3xl font-bold mb-2">
                    📦 ALMACENAMIENTO - 🦠 BACTERIAS
                  </h1>
                  <p className="text-xl opacity-90">Dashboard de Lotes en Fermentación</p>
                </div>
              </div>
              
              {/* Stats */}
              <div className="p-6 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Lotes en Fermentación</p>
                        <p className="text-2xl font-bold text-purple-600">{lotesFermentando.length}</p>
                      </div>
                      <div className="bg-purple-100 p-3 rounded-full">
                        <span className="text-2xl">🧪</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Lotes Disponibles</p>
                        <p className="text-2xl font-bold text-green-600">{lotesDisponibles.length}</p>
                        <p className="text-sm text-gray-500">{totalLitrosDisponibles} litros total</p>
                      </div>
                      <div className="bg-green-100 p-3 rounded-full">
                        <span className="text-2xl">✅</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total de Lotes</p>
                        <p className="text-2xl font-bold text-blue-600">{lotesFermentacionFiltrados.length}</p>
                        {filtroMicroorganismoBacterias !== 'todos' && (
                          <p className="text-xs text-gray-500">({lotesFermentacion.length} total sin filtro)</p>
                        )}
                      </div>
                      <div className="bg-blue-100 p-3 rounded-full">
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
                  <span className="text-2xl">🦠</span>
                  <h3 className="text-lg font-semibold text-gray-800">Filtrar por Bacteria:</h3>
                </div>
                
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() => setFiltroMicroorganismoBacterias('todos')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      filtroMicroorganismoBacterias === 'todos'
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Todas ({lotesFermentacion.length})
                  </button>
                  
                  {microorganismosBacterias.map((micro) => {
                    const count = lotesFermentacion.filter(lote => 
                      lote.fields['Microorganismo']?.includes(micro)
                    ).length;
                    
                    return (
                      <button
                        key={micro}
                        onClick={() => setFiltroMicroorganismoBacterias(micro)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          filtroMicroorganismoBacterias === micro
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {micro} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {filtroMicroorganismoBacterias !== 'todos' && (
                <div className="mt-4 p-3 bg-purple-50 border-l-4 border-purple-400 rounded">
                  <p className="text-purple-700 text-center">
                    <span className="font-medium">Filtro activo:</span> Mostrando solo lotes de <strong>{filtroMicroorganismoBacterias}</strong>
                    <button 
                      onClick={() => setFiltroMicroorganismoBacterias('todos')}
                      className="ml-2 text-purple-600 hover:text-purple-800 underline"
                    >
                      Limpiar filtro
                    </button>
                  </p>
                </div>
              )}
            </div>

            {/* Loading State */}
            {loadingFermentacion && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-white text-lg">Cargando datos de fermentación...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
                ❌ {error}
                <button 
                  onClick={fetchFermentacion}
                  className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Dashboard Content */}
            {!loadingFermentacion && !error && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                {/* Lotes en Fermentación */}
                <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
                    <div className="flex items-center gap-3">
                      <span className="bg-white/20 p-2 rounded-lg text-2xl">🧪</span>
                      <div>
                        <h2 className="text-2xl font-bold">Fermentación</h2>
                        <p className="opacity-90">
                          Lotes en proceso de fermentación
                          {filtroMicroorganismoBacterias !== 'todos' && ` - ${filtroMicroorganismoBacterias}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {lotesFermentando.filter(lote => 
                      filtroMicroorganismoBacterias === 'todos' || 
                      lote.fields['Microorganismo']?.includes(filtroMicroorganismoBacterias)
                    ).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-4">📭</div>
                        <p className="text-lg">No hay lotes en fermentación</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {lotesFermentando
                          .filter(lote => 
                            filtroMicroorganismoBacterias === 'todos' || 
                            lote.fields['Microorganismo']?.includes(filtroMicroorganismoBacterias)
                          )
                          .map((lote) => (
                          <div key={lote.id} className="bg-purple-50 border-purple-200 rounded-lg p-4 border-2 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="bg-purple-600 text-white p-1 rounded text-sm">🧪</span>
                                <h3 className="font-semibold text-gray-900">{lote.fields['Codigo Lote'] || lote.id}</h3>
                              </div>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {lote.fields.Estado || 'N/A'}
                              </span>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Microorganismo:</span>
                                <p className="text-gray-600">
                                  {lote.fields['Microorganismo']?.join(', ') || 'N/A'}
                                </p>
                              </div>
                              
                              <div>
                                <span className="font-medium text-gray-700">Cantidad:</span>
                                <p className="text-gray-600">{lote.fields['Cantidad Litros'] || 0} litros</p>
                              </div>
                              
                              <div>
                                <span className="font-medium text-gray-700">Fecha Inicio:</span>
                                <p className="text-gray-600">
                                  {lote.fields['Fecha Inicia Fermentacion'] 
                                    ? new Date(lote.fields['Fecha Inicia Fermentacion']).toLocaleDateString('es-CO')
                                    : 'N/A'
                                  }
                                </p>
                              </div>
                              
                              <div>
                                <span className="font-medium text-gray-700">Fecha Fin:</span>
                                <p className="text-gray-600">
                                  {lote.fields['Fecha Termina Fermentacion'] 
                                    ? new Date(lote.fields['Fecha Termina Fermentacion']).toLocaleDateString('es-CO')
                                    : 'N/A'
                                  }
                                </p>
                              </div>
                              
                              {/* Botón Empacar Producto Deshabilitado - Para Bacillus thuringiensis en fermentación */}
                              {lote.fields['Microorganismo']?.some(micro => micro.includes('Bacillus thuringiensis')) && (
                                <div className="mt-3 pt-3 border-t border-purple-200">
                                  <button
                                    disabled
                                    className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-lg font-medium cursor-not-allowed flex items-center justify-center gap-2"
                                  >
                                    <span>⏳</span>
                                    En Fermentación - No Disponible para Empaque
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Lotes Disponibles */}
                <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
                    <div className="flex items-center gap-3">
                      <span className="bg-white/20 p-2 rounded-lg text-2xl">✅</span>
                      <div>
                        <h2 className="text-2xl font-bold">Disponibles</h2>
                        <p className="opacity-90">
                          Lotes listos para uso
                          {filtroMicroorganismoBacterias !== 'todos' && ` - ${filtroMicroorganismoBacterias}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {lotesDisponibles.filter(lote => 
                      filtroMicroorganismoBacterias === 'todos' || 
                      lote.fields['Microorganismo']?.includes(filtroMicroorganismoBacterias)
                    ).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-4">📭</div>
                        <p className="text-lg">No hay lotes disponibles</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {lotesDisponibles
                          .filter(lote => 
                            filtroMicroorganismoBacterias === 'todos' || 
                            lote.fields['Microorganismo']?.includes(filtroMicroorganismoBacterias)
                          )
                          .map((lote) => (
                          <div key={lote.id} className="bg-green-50 border-green-200 rounded-lg p-4 border-2 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="bg-green-600 text-white p-1 rounded text-sm">✅</span>
                                <h3 className="font-semibold text-gray-900">{lote.fields['Codigo Lote'] || lote.id}</h3>
                              </div>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {lote.fields.Estado || 'N/A'}
                              </span>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Microorganismo:</span>
                                <p className="text-gray-600">
                                  {lote.fields['Microorganismo']?.join(', ') || 'N/A'}
                                </p>
                              </div>
                              
                              <div>
                                <span className="font-medium text-gray-700">Disponible:</span>
                                {(() => {
                                  // Verificar si algún microorganismo contiene "+" (indica bolsas)
                                  const esBolsas = lote.fields['Microorganismo']?.some(micro => micro.includes('+')) || false;
                                  const cantidad = lote.fields['Total Litros'] || 0;
                                  const unidad = esBolsas ? 'bolsas' : 'litros';
                                  
                                  return (
                                    <p className="text-gray-600">{cantidad} {unidad}</p>
                                  );
                                })()}
                              </div>
                              
                              <div>
                                <span className="font-medium text-gray-700">Responsable:</span>
                                <p className="text-gray-600">{lote.fields['Realiza Registro'] || 'N/A'}</p>
                              </div>
                              
                              {/* Botón Empacar Producto - Solo para Bacillus thuringiensis disponible */}
                              {lote.fields['Microorganismo']?.some(micro => micro.includes('Bacillus thuringiensis')) && 
                               lote.fields.Estado === 'Disponible' && (
                                <div className="mt-3 pt-3 border-t border-green-200">
                                  <button
                                    onClick={() => {
                                      console.log(`🎁 EMPACAR: Iniciando empaque para lote ${lote.fields['Codigo Lote'] || lote.id}`);
                                      // Aquí irá la lógica de empaque
                                      alert(`Iniciando proceso de empaque para lote: ${lote.fields['Codigo Lote'] || lote.id}`);
                                    }}
                                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
                                  >
                                    <span>📦</span>
                                    Empacar Producto
                                  </button>
                                </div>
                              )}
                              
                              {/* Indicador de estado para Bacillus thuringiensis en fermentación */}
                              {lote.fields['Microorganismo']?.some(micro => micro.includes('Bacillus thuringiensis')) && 
                               lote.fields.Estado !== 'Disponible' && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <button
                                    disabled
                                    className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-lg font-medium cursor-not-allowed flex items-center justify-center gap-2"
                                  >
                                    <span>⏳</span>
                                    En Fermentación - No Disponible
                                  </button>
                                </div>
                              )}
                              
                              {lote.fields['Observaciones'] && (
                                <div>
                                  <span className="font-medium text-gray-700">Observaciones:</span>
                                  <p className="text-gray-600 text-xs">{lote.fields['Observaciones']}</p>
                                </div>
                              )}
                            </div>
                          </div>
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
                onClick={fetchFermentacion}
                disabled={loadingFermentacion}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingFermentacion ? 'Actualizando...' : '🔄 Actualizar Dashboard'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Si no hay tipo seleccionado, mostrar la selección
  if (!tipoSeleccionado) {
    return (
      <>
        <Navbar />
        {renderSeleccionTipo()}
        <Footer />
      </>
    );
  }

  // Renderizar dashboard específico según el tipo
  if (tipoSeleccionado === 'Bacteria') {
    return (
      <>
        <Navbar />
        {renderDashboardBacterias()}
        <Footer />
      </>
    );
  }

  // Dashboard por defecto (Hongos)
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
          <div className="max-w-5xl mx-auto">
            
            {/* Header */}
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-green-600 to-blue-600 p-8 text-white relative overflow-hidden">
                {/* Botón volver atrás - mejorado */}
                <div className="absolute left-4 top-4 z-30">
                  <button
                    onClick={handleVolverAtras}
                    className="bg-white text-gray-800 hover:bg-gray-100 px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg font-medium"
                  >
                    <span className="text-lg">←</span>
                    <span>Volver</span>
                  </button>
                </div>
                
                <div className="relative z-10 text-center pt-4">
                  <h1 className="text-3xl font-bold mb-2">
                    📦 ALMACENAMIENTO - {tipoSeleccionado === 'Hongo' ? '🍄 HONGOS' : '🦠 BACTERIAS'}
                  </h1>
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
                        <label className="font-medium text-blue-700">Fecha y Hora Guardado en Refrigeración:</label>
                        <p className="text-blue-900 font-semibold">
                          {new Date((loteHistorial.fields['Fecha Guardado Refrigeración'] || loteHistorial.fields['Fecha Guardado Refrigerador']) as string).toLocaleDateString('es-CO', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
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
