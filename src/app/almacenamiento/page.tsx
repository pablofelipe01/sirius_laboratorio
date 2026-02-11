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
    'Cantidad Actual Bolsas'?: number;
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

// Días de incubación por microorganismo
const DIAS_INCUBACION = {
  'Trichoderma harzianum': 5,
  'Metarhizium anisopliae': 14,
  'Purpureocillium lilacinum': 14,
  'Beauveria bassiana': 6
} as const;

export default function AlmacenamientoPage() {
  console.log('🏗️ ALMACENAMIENTO: Componente renderizando...');
  
  const { user } = useAuth();
  
  console.log('👤 ALMACENAMIENTO: Datos del usuario:', {
    userExists: !!user,
    userName: user?.nombre || 'no disponible',
    userData: user || 'no hay datos'
  });

  // Función para calcular la fecha de recogida
  const calcularFechaRecogida = (fechaInoculacion: string, microorganismo: string) => {
    const diasIncubacion = DIAS_INCUBACION[microorganismo as keyof typeof DIAS_INCUBACION] || 7;
    const fecha = new Date(fechaInoculacion);
    fecha.setDate(fecha.getDate() + diasIncubacion);
    return fecha;
  };

  // Función para calcular días restantes y estado
  const calcularEstadoIncubacion = (fechaInoculacion: string, microorganismo: string) => {
    const fechaRecogida = calcularFechaRecogida(fechaInoculacion, microorganismo);
    const hoy = new Date();
    const diasRestantes = Math.ceil((fechaRecogida.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    
    let estado = 'pendiente';
    let color = 'bg-green-100 text-green-800 border-green-200';
    let icono = '🟢';
    let prioridad = 'baja';
    
    if (diasRestantes <= 0) {
      // ¡URGENTE! Ya se pasó la fecha - ROJO CRÍTICO
      estado = 'vencido';
      color = 'bg-red-100 text-red-900 border-red-300 shadow-red-100';
      icono = '🔴';
      prioridad = 'critica';
    } else if (diasRestantes <= 1) {
      // ¡ATENCIÓN! Debe recogerse HOY o MAÑANA - ROJO URGENTE
      estado = 'urgente';
      color = 'bg-red-100 text-red-800 border-red-200';
      icono = '🔴';
      prioridad = 'alta';
    } else if (diasRestantes <= 2) {
      // Pronto debe recogerse - NARANJA
      estado = 'proximo';
      color = 'bg-orange-100 text-orange-800 border-orange-200';
      icono = '🟠';
      prioridad = 'media';
    } else if (diasRestantes <= 3) {
      // Prepararse para la recogida - AMARILLO
      estado = 'preparar';
      color = 'bg-yellow-100 text-yellow-800 border-yellow-200';
      icono = '🟡';
      prioridad = 'media-baja';
    }
    // Más de 3 días = VERDE (seguro)
    
    return { diasRestantes, estado, color, icono, fechaRecogida, prioridad };
  };
  
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
  const [loadingSiguienteEscalado, setLoadingSiguienteEscalado] = useState<string | null>(null);

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
    return total + (lote.fields['Cantidad Actual Bolsas'] || 0);
  }, 0);

  const buildResumenPorMicroorganismo = (lotesFuente: LoteAlmacenamiento[]) => {
    const acumulado = new Map<string, { bolsas: number; litros: number }>();

    lotesFuente.forEach(lote => {
      const microorganismo = lote.fields['Microorganismo (from Microorganismos)']?.[0] || 'Sin especificar';
      const bolsas = lote.fields['Cantidad Actual Bolsas'] || 0;
      const litros = microorganismo.includes('+') ? 0 : bolsas;

      const actual = acumulado.get(microorganismo) || { bolsas: 0, litros: 0 };
      acumulado.set(microorganismo, {
        bolsas: actual.bolsas + bolsas,
        litros: actual.litros + litros
      });
    });

    return Array.from(acumulado.entries()).map(([microorganismo, datos]) => ({
      microorganismo,
      bolsas: datos.bolsas,
      litros: datos.litros
    }));
  };

  const resumenIncubacion = useMemo(
    () => buildResumenPorMicroorganismo(lotesIncubacion),
    [lotesIncubacion]
  );

  const resumenRefrigeracion = useMemo(
    () => buildResumenPorMicroorganismo(lotesRefrigeracion),
    [lotesRefrigeracion]
  );

  console.log('📊 FILTROS RESULTADO:');
  console.log('  - Total lotes:', lotes.length);
  console.log('  - Lotes filtrados por microorganismo:', lotesFiltrados.length);
  console.log('  - Lotes incubación (filtrados):', lotesIncubacion.length);
  console.log('  - Lotes refrigeración (filtrados):', lotesRefrigeracion.length);
  console.log('  - Total bolsas en refrigeración:', totalBolsasRefrigeracion);

  useEffect(() => {
    // Cargar resumen de inventario al montar el componente
    fetchResumenInventario();
    fetchResumenHongosEstado();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No establecer tipo por defecto automáticamente - dejar que el usuario elija

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
      console.log('📋 ALMACENAMIENTO: data.records existe:', !!data.records);
      console.log('📋 ALMACENAMIENTO: data.records length:', data.records?.length);
      
      if (data.success) {
        console.log('✅ ALMACENAMIENTO: Data con success=true, verificando records...');
        console.log('📋 ALMACENAMIENTO: data.records existe:', !!data.records);
        console.log('📋 ALMACENAMIENTO: data.records type:', typeof data.records);
        console.log('📋 ALMACENAMIENTO: data.records length:', Array.isArray(data.records) ? data.records.length : 'No es array');
        
        if (data.records && Array.isArray(data.records) && data.records.length > 0) {
          console.log('✅ ALMACENAMIENTO: Data válida, procesando lotes...');
          console.log('📋 ALMACENAMIENTO: Todos los lotes:', data.records);
          
          // Log de cada lote para ver su estructura
          data.records.forEach((lote: LoteAlmacenamiento, index: number) => {
            console.log(`📦 ALMACENAMIENTO: Lote ${index + 1}:`, {
              id: lote.id,
              fields: lote.fields,
              estadoLote: lote.fields?.['Estado Lote'],
              codigoLote: lote.fields?.['Codigo Lote']
            });
          });
          
          // Filtrar solo los lotes que están en Incubación o Refrigeración
          const lotesAlmacenamiento = data.records.filter((lote: LoteAlmacenamiento) => {
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
          console.error('❌ ALMACENAMIENTO: records no es válido:', data.records);
          setError('No se encontraron lotes de inoculación');
        }
      } else {
        console.error('❌ ALMACENAMIENTO: Error en data - success:', data.success, 'records:', !!data.records);
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
      cantidadBolsas: lote.fields['Cantidad Actual Bolsas'],
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
            <p className="text-gray-600">{lote.fields['Cantidad Actual Bolsas'] || 0} bolsas</p>
          </div>
          
          {/* Fechas de Inoculación y Recogida */}
          {lote.fields['Fecha Inoculacion'] && (
            <>
              <div>
                <span className="font-medium text-gray-700">Fecha Inoculación:</span>
                <p className="text-gray-600">
                  {(() => {
                    const rawDate = lote.fields['Fecha Inoculacion'];
                    const fecha = new Date(rawDate);
                    fecha.setMinutes(fecha.getMinutes() + fecha.getTimezoneOffset());
                    return fecha.toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      timeZone: 'UTC'
                    });
                  })()}
                </p>
              </div>
              
              {/* Información de Estado de Incubación - Solo para lotes en Incubación */}
              {(() => {
                const microorganismo = Array.isArray(lote.fields['Microorganismo (from Microorganismos)']) 
                  ? lote.fields['Microorganismo (from Microorganismos)'][0] 
                  : lote.fields['Microorganismo (from Microorganismos)'];
                
                const estadoLote = lote.fields['Estado Lote'];
                
                // Solo mostrar estado de incubación si el lote está en estado "Incubacion"
                if (!microorganismo || estadoLote !== 'Incubacion') {
                  return (
                    <div>
                      <span className="font-medium text-gray-700">Fecha Recogida:</span>
                      <p className="text-gray-600">
                        {lote.fields['Fecha Inoculacion'] && microorganismo 
                          ? calcularFechaRecogida(lote.fields['Fecha Inoculacion'], microorganismo).toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })
                          : 'No disponible'
                        }
                      </p>
                    </div>
                  );
                }
                
                const estadoInfo = calcularEstadoIncubacion(lote.fields['Fecha Inoculacion'], microorganismo);
                
                return (
                  <>
                    <div>
                      <span className="font-medium text-gray-700">Fecha Recogida:</span>
                      <p className="text-gray-600">
                        {estadoInfo.fechaRecogida.toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    
                    <div className="mt-3 p-3 rounded-lg border-2" style={{
                      backgroundColor: estadoInfo.color.includes('red') ? '#fef2f2' : 
                                      estadoInfo.color.includes('orange') ? '#fff7ed' :
                                      estadoInfo.color.includes('yellow') ? '#fefce8' : '#f0fdf4'
                    }}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-gray-700">🌱 ¿Cómo voy?</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-2 rounded-lg text-sm font-bold shadow-sm border-2 ${estadoInfo.color}`}>
                            <span className="text-lg mr-2">{estadoInfo.icono}</span>
                            {(() => {
                              if (estadoInfo.diasRestantes <= 0) {
                                return '✨ ¡Ya estoy listo! 😊';
                              } else if (estadoInfo.diasRestantes === 1) {
                                return '🌟 Mañana estaré perfecto';
                              } else if (estadoInfo.diasRestantes === 2) {
                                return '⏰ Casi listo - me faltan 2 días';
                              } else if (estadoInfo.diasRestantes === 3) {
                                return '🕒 Creciendo bien - me faltan 3 días';
                              } else {
                                return `⏳ Creciendo feliz - me faltan ${estadoInfo.diasRestantes} días`;
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                      
                      {/* Barra de progreso visual */}
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              estadoInfo.diasRestantes <= 0 ? 'bg-red-600' :
                              estadoInfo.diasRestantes <= 1 ? 'bg-red-500' :
                              estadoInfo.diasRestantes <= 2 ? 'bg-orange-500' :
                              estadoInfo.diasRestantes <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.max(10, Math.min(100, ((DIAS_INCUBACION[microorganismo as keyof typeof DIAS_INCUBACION] || 7) - estadoInfo.diasRestantes) / (DIAS_INCUBACION[microorganismo as keyof typeof DIAS_INCUBACION] || 7) * 100))}%`
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-1 text-center">
                          {estadoInfo.diasRestantes <= 0 
                            ? '🎉 ¡Completé mi crecimiento!' 
                            : `💪 Llevo ${(DIAS_INCUBACION[microorganismo as keyof typeof DIAS_INCUBACION] || 7) - estadoInfo.diasRestantes + 1} de ${DIAS_INCUBACION[microorganismo as keyof typeof DIAS_INCUBACION] || 7} días - ¡Voy muy bien!`
                          }
                        </p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </>
          )}
          
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
                                <span className="text-green-600 font-medium">💰 Potencial Revenue:</span>
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

          {/* Resumen de Hongos por Estado */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                🍄 Bolsas en Incubación y Refrigeración
              </h2>
              <button
                onClick={fetchResumenHongosEstado}
                disabled={resumenHongosEstado.loading}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
              >
                {resumenHongosEstado.loading ? '⏳ Actualizando...' : '🔄 Actualizar'}
              </button>
            </div>

            {resumenHongosEstado.loading ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando resumen...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Incubación</p>
                      <p className="text-2xl font-bold text-green-800">{resumenHongosEstado.incubacionBolsas} bolsas</p>
                      <p className="text-sm text-green-600">{resumenHongosEstado.incubacionLotes} lotes</p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-full">
                      <span className="text-2xl">🌡️</span>
                    </div>
                  </div>
                  {resumenHongosEstado.incubacionPorMicro.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-green-200 space-y-2">
                      {resumenHongosEstado.incubacionPorMicro.map((item) => (
                        <div key={item.micro} className="flex items-center justify-between text-sm text-green-800">
                          <span className="font-medium">{item.micro}</span>
                          <span>
                            {item.bolsas} bolsas • {item.lotes} lotes
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Refrigeración</p>
                      <p className="text-2xl font-bold text-blue-800">{resumenHongosEstado.refrigeracionBolsas} bolsas</p>
                      <p className="text-sm text-blue-600">{resumenHongosEstado.refrigeracionLotes} lotes</p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-full">
                      <span className="text-2xl">❄️</span>
                    </div>
                  </div>
                  {resumenHongosEstado.refrigeracionPorMicro.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-blue-200 space-y-2">
                      {resumenHongosEstado.refrigeracionPorMicro.map((item) => (
                        <div key={item.micro} className="flex items-center justify-between text-sm text-blue-800">
                          <span className="font-medium">{item.micro}</span>
                          <span>
                            {item.bolsas} bolsas • {item.lotes} lotes
                          </span>
                        </div>
                      ))}
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
      'Fecha Inicia Escalado 50ml'?: string;
      'Fecha Inicia Escalado 250ml'?: string;
      'Fecha Inicia Escalado 800ml'?: string;
      'Fecha Inicia Fermentacion 12L'?: string;
      'Fecha Inicia Fermentacion 100L'?: string;
      'Fecha Empacado'?: string;
      'Etapa Produccion'?: string;
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

  const [resumenHongosEstado, setResumenHongosEstado] = useState({
    incubacionBolsas: 0,
    refrigeracionBolsas: 0,
    incubacionLotes: 0,
    refrigeracionLotes: 0,
    incubacionPorMicro: [] as Array<{ micro: string; bolsas: number; lotes: number }>,
    refrigeracionPorMicro: [] as Array<{ micro: string; bolsas: number; lotes: number }>,
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

  // Configuración de etapas de escalado para bacterias individuales
  const ETAPAS_ESCALADO = {
    'Escalado 50ml': { siguiente: 'Escalado 250ml', volumen: 0.25, duracion: 24 },
    'Escalado 250ml': { siguiente: 'Escalado 800ml', volumen: 0.8, duracion: 24 },
    'Escalado 800ml': { siguiente: 'Fermentacion 12L', volumen: 12, duracion: 24 },
    'Fermentacion 12L': { 
      siguiente: 'Fermentacion 100L', 
      volumen: 100, 
      getDuracion: (microorganismo: string) => {
        if (microorganismo === 'PseudoMonas') return 12;
        if (microorganismo === 'AzosPirillum') return 24;
        if (microorganismo === 'AzotoBacter') return 36;
        return 24;
      }
    },
    'Fermentacion 100L': { 
      siguiente: null, // No hay siguiente etapa, solo finalizar fermentación
      volumen: 100, // Mantiene los 100L
      getDuracion: (microorganismo: string) => {
        if (microorganismo === 'PseudoMonas') return 12;
        if (microorganismo === 'AzosPirillum') return 24;
        if (microorganismo === 'AzotoBacter') return 36;
        return 24;
      }
    },
    'Empacado': { siguiente: null, volumen: 300, duracion: 0 } // No hay duración para empacado
  };

  // Función para obtener la duración de una etapa específica
  const getDuracionEtapa = (etapa: string, microorganismo: string): number => {
    const config = ETAPAS_ESCALADO[etapa as keyof typeof ETAPAS_ESCALADO];
    if (!config) return 24; // Default 24 horas
    
    if ('getDuracion' in config && config.getDuracion) {
      return config.getDuracion(microorganismo);
    }
    
    if ('duracion' in config && config.duracion) {
      return config.duracion;
    }
    
    return 24; // Fallback
  };

  // Función para verificar si ya pasó el tiempo de la etapa actual
  const puedeAvanzarEtapa = (lote: FermentacionRecord): boolean => {
    const etapaActual = lote.fields['Etapa Produccion'];
    const microorganismo = lote.fields['Microorganismo']?.[0];
    
    if (!etapaActual || !microorganismo) {
      console.log('🚫 No se puede verificar:', { etapaActual, microorganismo });
      return false;
    }

    // Obtener el campo de fecha específico para la etapa actual
    const campoFechaEtapaActual = obtenerCampoFechaEscalado(etapaActual);
    const fechaInicioEtapa = campoFechaEtapaActual ? lote.fields[campoFechaEtapaActual as keyof typeof lote.fields] : null;
    
    // Si no hay campo específico para esta etapa, usar fecha de fermentación como fallback
    const fechaInicio = fechaInicioEtapa || lote.fields['Fecha Inicia Fermentacion'];
    
    if (!fechaInicio) {
      console.log('🚫 No hay fecha de inicio para la etapa:', { etapaActual, campoFechaEtapaActual, fechaInicioEtapa });
      return false;
    }

    // Obtener duración específica de la etapa actual
    const duracionEtapaHoras = getDuracionEtapa(etapaActual, microorganismo);
    
    // Calcular cuándo se completará la etapa actual
    const fechaInicioEtapaDate = new Date(fechaInicio as string);
    const fechaCompletaEtapa = new Date(fechaInicioEtapaDate);
    fechaCompletaEtapa.setHours(fechaCompletaEtapa.getHours() + duracionEtapaHoras);
    
    const ahora = new Date();
    const puedeAvanzar = ahora >= fechaCompletaEtapa;
    
    console.log(`⏰ Verificación etapa ${etapaActual} - ${microorganismo}:`, {
      campoFechaUsado: campoFechaEtapaActual || 'Fecha Inicia Fermentacion',
      duracionEtapaHoras,
      fechaInicioEtapa: fechaInicioEtapaDate.toISOString(),
      fechaCompletaEtapa: fechaCompletaEtapa.toISOString(),
      ahora: ahora.toISOString(),
      puedeAvanzar
    });
    
    return puedeAvanzar;
  };

  // Función para verificar si es bacteria individual
  const esBacteriaIndividual = (microorganismo?: string[]) => {
    if (!microorganismo) return false;
    return microorganismo.some(micro => 
      micro === 'PseudoMonas' || 
      micro === 'AzosPirillum' || 
      micro === 'AzotoBacter'
    );
  };

  // Función para verificar si ya pasó el tiempo de fermentación actual
  const puedeEscalar = (lote: FermentacionRecord) => {
    if (!lote.fields['Fecha Termina Fermentacion']) {
      return false; // Sin fecha de finalización, no se puede escalar
    }

    const fechaFin = new Date(lote.fields['Fecha Termina Fermentacion']);
    const fechaActual = new Date();
    
    // Retorna true si ya pasó el tiempo de fermentación
    return fechaActual >= fechaFin;
  };

  // Función para obtener tiempo restante para escalado
  const getTiempoRestante = (lote: FermentacionRecord) => {
    if (!lote.fields['Fecha Termina Fermentacion']) {
      return 'Sin fecha definida';
    }

    const fechaFin = new Date(lote.fields['Fecha Termina Fermentacion']);
    const fechaActual = new Date();
    
    if (fechaActual >= fechaFin) {
      return 'Listo para escalar';
    }

    const diferencia = fechaFin.getTime() - fechaActual.getTime();
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));

    if (horas > 24) {
      const dias = Math.floor(horas / 24);
      const horasRestantes = horas % 24;
      return `${dias}d ${horasRestantes}h restantes`;
    } else if (horas > 0) {
      return `${horas}h ${minutos}m restantes`;
    } else {
      return `${minutos}m restantes`;
    }
  };

  // Función para manejar el siguiente escalado
  const handleSiguienteEscalado = async (lote: FermentacionRecord) => {
    const etapaActual = lote.fields['Etapa Produccion'];
    const microorganismo = lote.fields['Microorganismo']?.[0];
    
    if (!etapaActual || !microorganismo) {
      alert('Error: No se puede determinar la etapa actual o el microorganismo');
      return;
    }

    const configuracionEtapa = ETAPAS_ESCALADO[etapaActual as keyof typeof ETAPAS_ESCALADO];
    if (!configuracionEtapa?.siguiente) {
      alert('Esta bacteria ya está en la etapa final');
      return;
    }

    setLoadingSiguienteEscalado(lote.id);

    try {
      const fechaEscalado = new Date();

      // Preparar las observaciones actualizadas
      const observacionesActuales = lote.fields['Observaciones'] || '';
      const nuevaObservacion = `Escalado de ${etapaActual} a ${configuracionEtapa.siguiente} - ${microorganismo} - Fecha: ${fechaEscalado.toLocaleString('es-CO')}`;
      const observacionesActualizadas = observacionesActuales 
        ? `${observacionesActuales}\n${nuevaObservacion}`
        : nuevaObservacion;

      // Determinar el campo de fecha correcto según la etapa siguiente
      const campoFechaEscalado = obtenerCampoFechaEscalado(configuracionEtapa.siguiente);

      const updateFields: any = {
        'Etapa Produccion': configuracionEtapa.siguiente,
        'Cantidad Litros': configuracionEtapa.volumen,
        'Realiza Registro': user?.nombre || 'Sistema',
        'Observaciones': observacionesActualizadas
        // NO tocamos las fechas de fermentación existentes
      };

      // Solo agregar el campo de fecha si existe para esta etapa
      if (campoFechaEscalado) {
        updateFields[campoFechaEscalado] = fechaEscalado.toISOString();
      }

      const response = await fetch('/api/fermentacion', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recordId: lote.id,
          updates: updateFields
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`¡${microorganismo} escalado exitosamente a ${configuracionEtapa.siguiente}!`);
        await fetchFermentacion(); // Recargar datos
      } else {
        alert(`Error al escalar: ${result.error}`);
      }
    } catch (error) {
      console.error('Error escalando bacteria:', error);
      alert('Error de conexión al escalar bacteria');
    } finally {
      setLoadingSiguienteEscalado(null);
    }
  };

  // Función para finalizar fermentación (solo actualizar fecha de finalización)
  const handleFinalizarFermentacion = async (lote: FermentacionRecord) => {
    const microorganismo = lote.fields['Microorganismo']?.[0];
    
    if (!microorganismo) {
      alert('Error: No se puede determinar el microorganismo');
      return;
    }

    const confirmacion = confirm(`¿Finalizar la fermentación de ${microorganismo}?\n\nEsto actualizará la fecha de finalización y el microorganismo quedará disponible.`);
    if (!confirmacion) return;

    setLoadingSiguienteEscalado(lote.id);

    try {
      const fechaFinalizacion = new Date();

      // Preparar las observaciones actualizadas
      const observacionesActuales = lote.fields['Observaciones'] || '';
      const nuevaObservacion = `Fermentación finalizada - ${microorganismo} - Fecha: ${fechaFinalizacion.toLocaleString('es-CO')} por ${user?.nombre || 'Sistema'}`;
      const observacionesActualizadas = observacionesActuales 
        ? `${observacionesActuales}\n${nuevaObservacion}`
        : nuevaObservacion;

      const updateFields: any = {
        'Fecha Termina Fermentacion': fechaFinalizacion.toISOString(),
        'Realiza Registro': user?.nombre || 'Sistema',
        'Observaciones': observacionesActualizadas
        // NO cambiar etapa, NO cambiar volumen, solo finalizar
      };

      const response = await fetch('/api/fermentacion', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recordId: lote.id,
          updates: updateFields
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`¡Fermentación de ${microorganismo} finalizada exitosamente!\n\nEl microorganismo ahora está disponible.`);
        await fetchFermentacion(); // Recargar datos
      } else {
        alert(`Error al finalizar fermentación: ${result.error}`);
      }
    } catch (error) {
      console.error('Error finalizando fermentación:', error);
      alert('Error de conexión al finalizar fermentación');
    } finally {
      setLoadingSiguienteEscalado(null);
    }
  };

  // Función auxiliar para obtener el campo de fecha correcto según la etapa
  const obtenerCampoFechaEscalado = (etapa: string): string | null => {
    const mapeoFechas: { [key: string]: string } = {
      'Escalado 50ml': 'Fecha Inicia Escalado 50ml',
      'Escalado 250ml': 'Fecha Inicia Escalado 250ml', 
      'Escalado 800ml': 'Fecha Inicia Escalado 800ml',
      'Fermentacion 12L': 'Fecha Inicia Fermentacion 12L',
      'Fermentacion 100L': 'Fecha Inicia Fermentacion 100L',
      'Empacado': 'Fecha Empacado'
    };
    
    return mapeoFechas[etapa] || null;
  };

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
      console.log('📡 RESUMEN: Obteniendo datos desde Sirius Inventario Core...');
      const response = await fetch('/api/almacenamiento/resumen');
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.log('❌ RESUMEN: Error obteniendo datos:', data);
        setResumenInventario(prev => ({ ...prev, loading: false }));
        return;
      }

      console.log('✅ RESUMEN: Datos procesados:', {
        hongos: data.hongos?.length || 0,
        bacterias: data.bacterias?.length || 0
      });

      setResumenInventario({
        hongos: data.hongos || [],
        bacterias: data.bacterias || [],
        loading: false
      });
      
    } catch (error) {
      console.error('❌ RESUMEN: Error obteniendo resumen:', error);
      setResumenInventario(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchResumenHongosEstado = async () => {
    setResumenHongosEstado(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch('/api/inoculacion');
      const data = await response.json();

      if (!response.ok || !data.success || !Array.isArray(data.records)) {
        setResumenHongosEstado(prev => ({ ...prev, loading: false }));
        return;
      }

      const lotesIncubacionLocal = data.records.filter((lote: LoteAlmacenamiento) => {
        const estado = lote.fields['Estado Lote'];
        return estado === 'Incubacion' || estado === 'Incubación';
      });

      const lotesRefrigeracionLocal = data.records.filter((lote: LoteAlmacenamiento) => {
        const estado = lote.fields['Estado Lote'];
        return estado === 'Refrigeración' || estado === 'Refrigerado';
      });

      const incMap = new Map<string, { bolsas: number; lotes: number }>();
      const refMap = new Map<string, { bolsas: number; lotes: number }>();

      const acumular = (
        target: Map<string, { bolsas: number; lotes: number }>,
        lote: LoteAlmacenamiento
      ) => {
        const micro = lote.fields['Microorganismo (from Microorganismos)']?.[0] || 'Sin especificar';
        const bolsas = lote.fields['Cantidad Actual Bolsas'] || 0;
        const actual = target.get(micro) || { bolsas: 0, lotes: 0 };
        target.set(micro, {
          bolsas: actual.bolsas + bolsas,
          lotes: actual.lotes + 1
        });
      };

      lotesIncubacionLocal.forEach((lote: LoteAlmacenamiento) => acumular(incMap, lote));
      lotesRefrigeracionLocal.forEach((lote: LoteAlmacenamiento) => acumular(refMap, lote));

      const incubacionBolsas = Array.from(incMap.values()).reduce((sum, item) => sum + item.bolsas, 0);
      const refrigeracionBolsas = Array.from(refMap.values()).reduce((sum, item) => sum + item.bolsas, 0);

      const incubacionPorMicro = Array.from(incMap.entries()).map(([micro, datos]) => ({
        micro,
        bolsas: datos.bolsas,
        lotes: datos.lotes
      }));

      const refrigeracionPorMicro = Array.from(refMap.entries()).map(([micro, datos]) => ({
        micro,
        bolsas: datos.bolsas,
        lotes: datos.lotes
      }));

      setResumenHongosEstado({
        incubacionBolsas,
        refrigeracionBolsas,
        incubacionLotes: lotesIncubacionLocal.length,
        refrigeracionLotes: lotesRefrigeracionLocal.length,
        incubacionPorMicro,
        refrigeracionPorMicro,
        loading: false
      });
    } catch (error) {
      console.error('❌ RESUMEN HONGOS ESTADO: Error obteniendo resumen:', error);
      setResumenHongosEstado(prev => ({ ...prev, loading: false }));
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
                              
                              {/* Mostrar etapa actual para bacterias individuales */}
                              {esBacteriaIndividual(lote.fields['Microorganismo']) && (
                                <>
                                  <div>
                                    <span className="font-medium text-gray-700">Etapa Actual:</span>
                                    <p className="text-gray-600 font-semibold">
                                      {lote.fields['Etapa Produccion'] || 'No especificada'}
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <span className="font-medium text-gray-700">Estado Escalado:</span>
                                    <p className={`text-sm font-medium ${puedeAvanzarEtapa(lote) ? 'text-green-600' : 'text-orange-600'}`}>
                                      {puedeAvanzarEtapa(lote) ? '✅ Listo para escalar' : '⏰ En proceso de fermentación'}
                                    </p>
                                  </div>
                                </>
                              )}
                              
                              {/* Botón Siguiente Escalado para bacterias individuales */}
                              {esBacteriaIndividual(lote.fields['Microorganismo']) && 
                               lote.fields['Etapa Produccion'] && 
                               lote.fields['Etapa Produccion'] !== 'Fermentacion 100L' &&
                               ETAPAS_ESCALADO[lote.fields['Etapa Produccion'] as keyof typeof ETAPAS_ESCALADO]?.siguiente && (
                                <div className="mt-3 pt-3 border-t border-purple-200">
                                  <button
                                    onClick={() => handleSiguienteEscalado(lote)}
                                    disabled={loadingSiguienteEscalado === lote.id || !puedeAvanzarEtapa(lote)}
                                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                                      loadingSiguienteEscalado === lote.id || !puedeAvanzarEtapa(lote)
                                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                                  >
                                    {loadingSiguienteEscalado === lote.id ? (
                                      <>
                                        <span className="animate-spin">⏳</span>
                                        Escalando...
                                      </>
                                    ) : !puedeAvanzarEtapa(lote) ? (
                                      <>
                                        <span>⏰</span>
                                        Esperando tiempo de fermentación
                                      </>
                                    ) : (
                                      <>
                                        <span>🚀</span>
                                        Siguiente Escalado → {ETAPAS_ESCALADO[lote.fields['Etapa Produccion'] as keyof typeof ETAPAS_ESCALADO]?.siguiente}
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}

                              {/* Botón Finalizar Fermentación para Fermentacion 100L */}
                              {esBacteriaIndividual(lote.fields['Microorganismo']) && 
                               lote.fields['Etapa Produccion'] === 'Fermentacion 100L' && (
                                <div className="mt-3 pt-3 border-t border-purple-200">
                                  <button
                                    onClick={() => handleFinalizarFermentacion(lote)}
                                    disabled={loadingSiguienteEscalado === lote.id || !puedeAvanzarEtapa(lote)}
                                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                                      loadingSiguienteEscalado === lote.id || !puedeAvanzarEtapa(lote)
                                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                    }`}
                                  >
                                    {loadingSiguienteEscalado === lote.id ? (
                                      <>
                                        <span className="animate-spin">⏳</span>
                                        Finalizando...
                                      </>
                                    ) : !puedeAvanzarEtapa(lote) ? (
                                      <>
                                        <span>⏰</span>
                                        Esperando tiempo de fermentación
                                      </>
                                    ) : (
                                      <>
                                        <span>🏁</span>
                                        Finalizar Fermentación
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                              
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
                    {resumenIncubacion.length > 0 && (
                      <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">🧬</span>
                          <h4 className="font-semibold text-green-800">Resumen por microorganismo</h4>
                        </div>
                        <div className="space-y-2">
                          {resumenIncubacion.map((item) => (
                            <div key={item.microorganismo} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white rounded-md px-3 py-2 border border-green-100">
                              <span className="font-medium text-gray-800">{item.microorganismo}</span>
                              <div className="flex gap-4 text-sm text-gray-600">
                                <span>📦 {item.bolsas} bolsas</span>
                                {item.litros > 0 && <span>🧪 {item.litros} litros</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
                    {resumenRefrigeracion.length > 0 && (
                      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">🧬</span>
                          <h4 className="font-semibold text-blue-800">Resumen por microorganismo</h4>
                        </div>
                        <div className="space-y-2">
                          {resumenRefrigeracion.map((item) => (
                            <div key={item.microorganismo} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white rounded-md px-3 py-2 border border-blue-100">
                              <span className="font-medium text-gray-800">{item.microorganismo}</span>
                              <div className="flex gap-4 text-sm text-gray-600">
                                <span>📦 {item.bolsas} bolsas</span>
                                {item.litros > 0 && <span>🧪 {item.litros} litros</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
                      <p className="text-gray-900 text-lg font-semibold">{loteHistorial.fields['Cantidad Actual Bolsas'] || 0}</p>
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
