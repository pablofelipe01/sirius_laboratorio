'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface Microorganismo {
  id: string;
  nombre: string;
  tipo: string;
  abreviatura?: string;
  bolsasPorLote?: number;
  diasIncubacion?: number;
  descripcion?: string;
  aplicaciones?: string;
  condicionesOptimas?: string;
  tiempoProduccion?: string;
  estado?: string;
  // Campos de referencia de Airtable
  productosRemisiones?: string[];
  cosechaLaboratorio?: string[];
  inoculacion?: string[];
  cepas?: string[];
}

interface ProduccionData {
  microorganismoId: string;
  lote: string;
  cantidadObjetivo: number;
  fechaInicio: string;
  responsable: string;
  observaciones: string;
}

export default function BacteriasPage() {
  const [microorganismos, setMicroorganismos] = useState<Microorganismo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMicroorganismo, setSelectedMicroorganismo] = useState<Microorganismo | null>(null);
  const [showProduccionForm, setShowProduccionForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [produccionData, setProduccionData] = useState<ProduccionData>({
    microorganismoId: '',
    lote: '',
    cantidadObjetivo: 0,
    fechaInicio: '',
    responsable: '',
    observaciones: ''
  });

  // Cargar microorganismos desde Airtable
  useEffect(() => {
    const fetchMicroorganismos = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/produccion-bacterias');
        const data = await response.json();
        
        if (data.success) {
          // Mostrar todas las bacterias disponibles
          setMicroorganismos(data.microorganismos);
        } else {
          setError(data.error || 'Error al cargar microorganismos');
        }
      } catch (err) {
        setError('Error de conexión al cargar bacterias desde Airtable');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMicroorganismos();
  }, []);

  // Manejar envío del formulario de producción
  const handleSubmitProduccion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMicroorganismo) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/produccion-bacterias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          microorganismoId: selectedMicroorganismo.id,
          loteData: produccionData
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('¡Producción iniciada exitosamente!');
        setShowProduccionForm(false);
        setSelectedMicroorganismo(null);
        setProduccionData({
          microorganismoId: '',
          lote: '',
          cantidadObjetivo: 0,
          fechaInicio: '',
          responsable: '',
          observaciones: ''
        });
      } else {
        alert('Error al iniciar producción: ' + result.error);
      }
    } catch (err) {
      alert('Error de conexión al iniciar producción');
      console.error('Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para obtener el icono según el tipo de microorganismo (enfocado en bacterias)
  const getIconoMicroorganismo = (nombre: string, tipo?: string) => {
    const nombreLower = nombre.toLowerCase();
    // Iconos específicos para bacterias comunes
    if (nombreLower.includes('bacillus')) return '🦠';
    if (nombreLower.includes('siriusbacter')) return '🌱';
    if (nombreLower.includes('azoto') || nombreLower.includes('rhizo')) return '🌱';
    if (nombreLower.includes('pseudo')) return '🛡️';
    if (nombreLower.includes('lactobacillus')) return '🥛';
    if (nombreLower.includes('streptococcus')) return '⚡';
    if (nombreLower.includes('escherichia') || nombreLower.includes('coli')) return '🔬';
    if (nombreLower.includes('salmonella')) return '🚨';
    if (nombreLower.includes('staphylococcus')) return '🔵';
    // Icono por tipo
    if (tipo?.toLowerCase() === 'bacteria') return '🦠';
    return '🧬';
  };

  // Función para obtener el color según el tipo
  const getColorMicroorganismo = (nombre: string, index: number) => {
    const colores = [
      'from-green-500 to-green-600',
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-orange-500 to-orange-600',
      'from-teal-500 to-teal-600',
      'from-indigo-500 to-indigo-600',
      'from-red-500 to-red-600',
      'from-yellow-500 to-orange-500'
    ];
    return colores[index % colores.length];
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div 
          className="min-h-screen relative pt-24 flex items-center justify-center"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          <div className="text-center bg-white rounded-lg p-8 shadow-lg">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando bacterias desde Airtable...</p>
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
        <div 
          className="min-h-screen relative pt-24 flex items-center justify-center"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-md shadow-lg">
            <h3 className="font-bold">Error de Conexión</h3>
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

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
          <div className="max-w-4xl mx-auto">
            
            {/* Header */}
            <div className="bg-white rounded-lg shadow-lg p-4 mb-8">
              <h1 className="text-3xl font-bold text-center text-gray-800">
                🦠 PANEL DE PRODUCCIÓN DE BACTERIAS
              </h1>
            </div>

            {/* Contenido Principal */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              
              
              {microorganismos.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No se encontraron bacterias disponibles</p>
                  <p className="text-gray-400 text-sm mt-2">Verifique la conexión con Airtable</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {microorganismos.map((microorganismo, index) => {
                    const isSubtilis = microorganismo.nombre.toLowerCase().includes('subtilis');
                    
                    return (
                      <div 
                        key={microorganismo.id}
                        className={`bg-white border-2 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden flex flex-col h-full ${
                          isSubtilis ? 'border-gray-300 opacity-75' : 'border-gray-200'
                        }`}
                      >
                        {/* Header de la tarjeta */}
                        <div className={`p-5 text-white relative ${
                          isSubtilis 
                            ? 'bg-gradient-to-r from-gray-400 to-gray-500' 
                            : `bg-gradient-to-r ${getColorMicroorganismo(microorganismo.nombre, index)}`
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <span className="text-4xl flex-shrink-0">{getIconoMicroorganismo(microorganismo.nombre, microorganismo.tipo)}</span>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-xl font-bold leading-tight mb-1">{microorganismo.nombre}</h3>
                                <div className="flex items-center justify-between">
                                  <p className="text-sm opacity-90">{microorganismo.tipo}</p>
                                  {microorganismo.abreviatura && (
                                    <span className="bg-white text-gray-800 px-2 py-1 rounded-full text-sm font-bold">
                                      {microorganismo.abreviatura}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Estado del microorganismo */}
                          {isSubtilis && (
                            <div className="absolute top-2 right-2">
                              <span className="bg-yellow-400 text-gray-800 text-xs font-bold px-2 py-1 rounded-full">
                                🚧 EN DESARROLLO
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Contenido de la tarjeta */}
                        <div className="p-6 flex flex-col flex-1">
                          {/* Información específica de bacterias en grid mejorado */}
                          <div className="grid grid-cols-1 gap-3 mb-4 flex-1">
                            {microorganismo.bolsasPorLote !== undefined && microorganismo.bolsasPorLote !== null && microorganismo.bolsasPorLote > 0 && (
                              <div className={`p-4 rounded-lg border-l-4 ${
                                isSubtilis 
                                  ? 'bg-gray-50 border-gray-300' 
                                  : 'bg-blue-50 border-blue-400'
                              }`}>
                                <h4 className={`text-sm font-semibold mb-1 ${
                                  isSubtilis ? 'text-gray-600' : 'text-blue-700'
                                }`}>
                                  📦 Producción por Lote
                                </h4>
                                <p className={`text-2xl font-bold ${
                                  isSubtilis ? 'text-gray-600' : 'text-blue-600'
                                }`}>
                                  {microorganismo.bolsasPorLote} bolsas
                                </p>
                              </div>
                            )}
                            
                            {microorganismo.diasIncubacion !== undefined && microorganismo.diasIncubacion !== null && microorganismo.diasIncubacion > 0 && (
                              <div className={`p-4 rounded-lg border-l-4 ${
                                isSubtilis 
                                  ? 'bg-gray-50 border-gray-300' 
                                  : 'bg-green-50 border-green-400'
                              }`}>
                                <h4 className={`text-sm font-semibold mb-1 ${
                                  isSubtilis ? 'text-gray-600' : 'text-green-700'
                                }`}>
                                  ⏱️ Tiempo de Incubación
                                </h4>
                                <p className={`text-lg font-bold ${
                                  isSubtilis ? 'text-gray-600' : 'text-green-600'
                                }`}>
                                  {microorganismo.diasIncubacion} días
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {/* Botones de acción mejorados - siempre en la parte inferior */}
                          <div className="mt-auto">
                            <button
                              onClick={() => {
                                if (!isSubtilis) {
                                  setSelectedMicroorganismo(microorganismo);
                                  setShowProduccionForm(true);
                                  setProduccionData(prev => ({
                                    ...prev,
                                    microorganismoId: microorganismo.id
                                  }));
                                }
                              }}
                              className={`w-full py-3 px-4 rounded-lg font-semibold transition-all text-sm ${
                                isSubtilis
                                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed opacity-60'
                                  : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-lg'
                              }`}
                              disabled={isSubtilis}
                            >
                              {isSubtilis 
                                ? '⏳ Próximamente Disponible' 
                                : '🚀 Iniciar Producción'
                              }
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Modal de detalles del microorganismo */}
      {selectedMicroorganismo && !showProduccionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {(() => {
              const isSubtilis = selectedMicroorganismo.nombre.toLowerCase().includes('subtilis');
              
              return (
                <>
                  <div className={`bg-gradient-to-r text-white p-6 rounded-t-xl ${
                    isSubtilis 
                      ? 'from-gray-500 to-gray-600' 
                      : getColorMicroorganismo(selectedMicroorganismo.nombre, 0)
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-4xl">{getIconoMicroorganismo(selectedMicroorganismo.nombre, selectedMicroorganismo.tipo)}</span>
                        <div>
                          <h2 className="text-2xl font-bold">{selectedMicroorganismo.nombre}</h2>
                          {selectedMicroorganismo.tipo && (
                            <p className="text-lg opacity-90">{selectedMicroorganismo.tipo}</p>
                          )}
                          {isSubtilis && (
                            <span className="bg-yellow-400 text-gray-800 text-xs font-bold px-2 py-1 rounded-full mt-2 inline-block">
                              🚧 EN DESARROLLO
                            </span>
                          )}
          
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedMicroorganismo(null)}
                        className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-all"
                      >
                        <span className="text-2xl">✕</span>
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
            
            <div className="p-6 space-y-6">
              {selectedMicroorganismo.descripcion && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Descripción</h3>
                  <p className="text-gray-600">{selectedMicroorganismo.descripcion}</p>
                </div>
              )}

              {/* Información técnica de la bacteria */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedMicroorganismo.abreviatura && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-purple-800 mb-2">Código de Identificación</h3>
                    <p className="text-2xl font-bold text-purple-600">{selectedMicroorganismo.abreviatura}</p>
                  </div>
                )}
                
                {selectedMicroorganismo.bolsasPorLote && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">Bolsas por Lote</h3>
                    <p className="text-2xl font-bold text-blue-600">{selectedMicroorganismo.bolsasPorLote} bolsas</p>
                  </div>
                )}
              </div>

              {selectedMicroorganismo.diasIncubacion && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Período de Incubación</h3>
                  <p className="text-gray-600">{selectedMicroorganismo.diasIncubacion} días de incubación óptima</p>
                </div>
              )}

              {selectedMicroorganismo.aplicaciones && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Aplicaciones</h3>
                  <p className="text-gray-600">{selectedMicroorganismo.aplicaciones}</p>
                </div>
              )}

              {selectedMicroorganismo.condicionesOptimas && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Condiciones Óptimas</h3>
                  <p className="text-gray-600">{selectedMicroorganismo.condicionesOptimas}</p>
                </div>
              )}

              {/* Referencias en Airtable */}
              {(selectedMicroorganismo.cepas?.length || selectedMicroorganismo.inoculacion?.length) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Referencias del Sistema</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedMicroorganismo.cepas?.length && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm font-semibold text-gray-700">Cepas relacionadas:</p>
                        <p className="text-xs text-gray-600">{selectedMicroorganismo.cepas.length} registros</p>
                      </div>
                    )}
                    {selectedMicroorganismo.inoculacion?.length && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm font-semibold text-gray-700">Inoculaciones:</p>
                        <p className="text-xs text-gray-600">{selectedMicroorganismo.inoculacion.length} procesos</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-between">
              <button
                onClick={() => setSelectedMicroorganismo(null)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-all"
              >
                Cerrar
              </button>
              {(() => {
              const isSubtilis = selectedMicroorganismo.nombre.toLowerCase().includes('subtilis');
                
                if (isSubtilis) {
                  return (
                    <button
                      disabled
                      className="bg-gray-400 text-gray-600 px-6 py-2 rounded-lg font-medium cursor-not-allowed opacity-60"
                    >
                      ⏳ Próximamente Disponible
                    </button>
                  );
                }
                
                return (
                  <button
                    onClick={() => {
                      setShowProduccionForm(true);
                      setProduccionData(prev => ({
                        ...prev,
                        microorganismoId: selectedMicroorganismo.id
                      }));
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-all"
                  >
                    Iniciar Producción
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal para iniciar producción */}
      {showProduccionForm && selectedMicroorganismo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            {(() => {
              
              return (
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">
                      🚀 Nueva Producción
                    </h2>
                    <button
                      onClick={() => {
                        setShowProduccionForm(false);
                        setSelectedMicroorganismo(null);
                      }}
                      className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-all"
                    >
                      <span className="text-xl">✕</span>
                    </button>
                  </div>
                </div>
              );
            })()}
            
            <form onSubmit={handleSubmitProduccion} className="p-6 space-y-4">
              {/* Información del microorganismo */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800">{selectedMicroorganismo.nombre}</h3>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">{selectedMicroorganismo.tipo}</span>
                  {selectedMicroorganismo.abreviatura && (
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-bold">
                      {selectedMicroorganismo.abreviatura}
                    </span>
                  )}
                </div>
                {selectedMicroorganismo.bolsasPorLote && (
                  <p className="text-xs text-blue-600 mt-1">
                    Capacidad: {selectedMicroorganismo.bolsasPorLote} bolsas/lote
                  </p>
                )}
                {selectedMicroorganismo.diasIncubacion && (
                  <p className="text-xs text-green-600">
                    Incubación: {selectedMicroorganismo.diasIncubacion} días
                  </p>
                )}
              </div>

              {/* Código del lote */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código del Lote *
                </label>
                <input
                  type="text"
                  value={produccionData.lote}
                  onChange={(e) => setProduccionData({...produccionData, lote: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Ej: MO-2025-001"
                  required
                />
              </div>

              {/* Cantidad objetivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad Objetivo (Litros) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={produccionData.cantidadObjetivo}
                  onChange={(e) => setProduccionData({...produccionData, cantidadObjetivo: Number(e.target.value)})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="1000"
                  required
                />
              </div>

              {/* Fecha de inicio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Inicio *
                </label>
                <input
                  type="date"
                  value={produccionData.fechaInicio}
                  onChange={(e) => setProduccionData({...produccionData, fechaInicio: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>

              {/* Responsable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Responsable *
                </label>
                <input
                  type="text"
                  value={produccionData.responsable}
                  onChange={(e) => setProduccionData({...produccionData, responsable: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Nombre del responsable"
                  required
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={produccionData.observaciones}
                  onChange={(e) => setProduccionData({...produccionData, observaciones: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={3}
                  placeholder="Notas adicionales sobre la producción..."
                />
              </div>

              {/* Botones */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Iniciando...' : 'Iniciar Producción'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProduccionForm(false);
                    setSelectedMicroorganismo(null);
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <Footer />
    </>
  );
}
