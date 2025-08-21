'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AudioRecorderSimple from '@/components/AudioRecorderSimple';
import { useAuth } from '@/contexts/AuthContext';

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
  cantidadObjetivo: string; // Changed to string to avoid showing "0"
  fechaInicio: string;
  responsablesEquipo: string[]; // Array of user IDs for multi-select
  observaciones: string;
}

export default function BacteriasPage() {
  const { user } = useAuth();
  const [microorganismos, setMicroorganismos] = useState<Microorganismo[]>([]);
  const [usuarios, setUsuarios] = useState<{id: string, nombre: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMicroorganismo, setSelectedMicroorganismo] = useState<Microorganismo | null>(null);
  const [showProduccionForm, setShowProduccionForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [insumosCalculados, setInsumosCalculados] = useState<{
    id: string;
    nombre: string;
    cantidad: number;
    cantidadPorLitro: number;
    unidad: string;
    descripcion: string;
    categoria: string;
  }[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [resultadoFermentacion, setResultadoFermentacion] = useState<{
    recordId: string;
    lote: string;
    insumos?: {
      descuentoAutomatico?: {
        success: boolean;
        [key: string]: unknown;
      };
    };
  } | null>(null);
  const [produccionData, setProduccionData] = useState<ProduccionData>({
    microorganismoId: '',
    lote: '',
    cantidadObjetivo: '',
    fechaInicio: '',
    responsablesEquipo: [],
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

    const fetchUsuarios = async () => {
      try {
        console.log('🔍 Cargando usuarios...');
        const response = await fetch('/api/equipo-laboratorio');
        const data = await response.json();
        
        console.log('📊 Respuesta usuarios:', data);
        
        if (data.success && data.responsables) {
          console.log('✅ Usuarios cargados:', data.responsables);
          setUsuarios(data.responsables);
        } else {
          console.error('❌ Error al cargar usuarios:', data.error);
        }
      } catch (err) {
        console.error('❌ Error de conexión al cargar usuarios:', err);
      }
    };

    fetchMicroorganismos();
    fetchUsuarios();
  }, []);

  // Función para calcular insumos de Bacillus según la fórmula específica
  const calcularInsumosBacillus = (cantidadLitros: number) => {
    // Fórmula específica para Bacillus thuringiensis (por litro):
    // Dipel = 50g x litro
    // Melaza = 20g x litro  
    // Tomate = 10g x litro
    // Levadura = 0.01g x litro
    
    console.log(`📊 Calculando insumos para ${cantidadLitros} litros de Bacillus thuringiensis`);
    
    const formInsumos = [
      {
        id: 'dipel', // Se buscará dinámicamente en el backend
        nombre: 'Dipel',
        cantidad: cantidadLitros * 50,
        cantidadPorLitro: 50,
        unidad: 'gr',
        descripcion: 'Dipel DF - Bacillus thuringiensis var. kurstaki',
        categoria: 'Sustrato base'
      },
      {
        id: 'melaza', // Se buscará dinámicamente en el backend
        nombre: 'Melaza',
        cantidad: cantidadLitros * 20,
        cantidadPorLitro: 20,
        unidad: 'gr',
        descripcion: 'Melaza como fuente de carbono y energía',
        categoria: 'Nutriente'
      },
      {
        id: 'tomate', // Se buscará dinámicamente en el backend
        nombre: 'Tomate',
        cantidad: cantidadLitros * 10,
        cantidadPorLitro: 10,
        unidad: 'gr', 
        descripcion: 'Extracto de tomate - vitaminas y minerales',
        categoria: 'Suplemento'
      },
      {
        id: 'levadura', // Se buscará dinámicamente en el backend
        nombre: 'Levadura',
        cantidad: cantidadLitros * 0.01,
        cantidadPorLitro: 0.01,
        unidad: 'gr',
        descripcion: 'Levadura nutricional - fuente de nitrógeno',
        categoria: 'Nutriente'
      }
    ];

    console.log('📦 Insumos calculados:', formInsumos);
    return formInsumos;
  };

  // Manejar envío del formulario de producción (mostrar modal de confirmación)
  const handleSubmitProduccion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMicroorganismo) return;

    // Validar campos requeridos
    if (!produccionData.cantidadObjetivo || !produccionData.fechaInicio) {
      alert('Por favor completa todos los campos requeridos (Volumen y Fecha)');
      return;
    }

    if (produccionData.responsablesEquipo.length === 0) {
      alert('Por favor selecciona al menos un miembro del equipo responsable');
      return;
    }

    // Validar que el usuario esté autenticado
    if (!user) {
      alert('Debes estar autenticado para crear un registro de fermentación');
      return;
    }

    // Calcular insumos si es Bacillus thuringiensis específicamente
    const esBacillusThuringiensis = selectedMicroorganismo.nombre.toLowerCase().includes('bacillus') && 
                                   selectedMicroorganismo.nombre.toLowerCase().includes('thuringiensis');
    
    if (esBacillusThuringiensis) {
      const cantidadLitros = Number(produccionData.cantidadObjetivo);
      const insumosRequeridos = calcularInsumosBacillus(cantidadLitros);
      setInsumosCalculados(insumosRequeridos);
      console.log('🧬 Insumos calculados para Bacillus thuringiensis:', insumosRequeridos);
    } else {
      setInsumosCalculados([]);
      console.log('ℹ️ No es Bacillus thuringiensis, no se calculan insumos específicos');
    }

    // Mostrar modal de confirmación
    setShowConfirmModal(true);
  };

  // Función para confirmar y enviar la producción
  const handleConfirmProduccion = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    try {
      const dataToSend = {
        microorganismoId: selectedMicroorganismo!.id,
        cantidadLitros: Number(produccionData.cantidadObjetivo),
        fechaInicio: produccionData.fechaInicio,
        observaciones: produccionData.observaciones,
        realizaRegistro: user?.nombre || 'Usuario no identificado',
        responsablesEquipo: produccionData.responsablesEquipo
      };
      
      console.log('🧬 FRONTEND: Enviando datos de fermentación:', dataToSend);
      console.log('🧬 FRONTEND: Microorganismo seleccionado:', selectedMicroorganismo);

      const response = await fetch('/api/produccion-bacterias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
      });

      const result = await response.json();
      console.log('📊 Respuesta fermentación:', result);
      console.log('📊 Status response:', response.status);
      
      if (result.success) {
        const successMsg = `🧬 ¡Fermentación iniciada exitosamente!\n\n` +
              `📊 Volumen: ${produccionData.cantidadObjetivo}L\n` +
              `📅 Inicio: ${new Date(result.fechaInicio).toLocaleDateString('es-CO')}\n` +
              `📅 Finalización estimada: ${new Date(result.fechaFinalizacion).toLocaleDateString('es-CO')}\n` +
              `🆔 ID Fermentación: ${result.fermentacionId}`;
              
        // Agregar información de insumos si están disponibles
        const insumosInfo = result.insumos?.descuentoAutomatico ? 
          `\n\n📦 Descuento automático de insumos: ${result.insumos.descuentoAutomatico.success ? '✅ Completado' : '❌ Fallido'}` : '';
              
        setSuccessMessage(successMsg + insumosInfo);
        setResultadoFermentacion(result); // Guardar resultado completo
        setShowSuccessModal(true);
        
        // Limpiar formulario
        setShowProduccionForm(false);
        setSelectedMicroorganismo(null);
        setProduccionData({
          microorganismoId: '',
          lote: '',
          cantidadObjetivo: '',
          fechaInicio: '',
          responsablesEquipo: [],
          observaciones: ''
        });
        setInsumosCalculados([]);
      } else {
        console.error('❌ Error en la respuesta:', result);
        alert(`❌ Error al iniciar fermentación:\n\n${result.error}\n\nDetalles: ${result.details || 'Sin detalles adicionales'}`);
      }
    } catch (err) {
      console.error('❌ Error de conexión:', err);
      alert('❌ Error de conexión al iniciar fermentación');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para cancelar la confirmación
  const handleCancelProduccion = () => {
    setShowConfirmModal(false);
    setInsumosCalculados([]);
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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          {/* Overlay para mejor legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/70"></div>
          
          <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header Profesional */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 mb-6 border border-white/20">
              <div className="flex items-center justify-center">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
                    🧬 Producción de Bacillus thuringiensis
                  </h1>
                  <p className="text-lg text-gray-600 flex items-center justify-center">
                    <span className="inline-block w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></span>
                    Sistema DataLab - Control de Fermentación
                  </p>
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {isSubmitting && (
              <div className="bg-blue-50/95 backdrop-blur-sm border border-blue-200 rounded-2xl p-4 mb-6 shadow-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">
                      🚀 Iniciando Producción...
                    </h3>
                    <p className="text-base text-blue-700">
                      Configurando parámetros de fermentación para Bacillus thuringiensis
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Formulario */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-white/20">
              <form onSubmit={handleSubmitProduccion} className="space-y-6">
                
                {/* Cantidad objetivo */}
                <div>
                  <label htmlFor="cantidadObjetivo" className="block text-sm font-semibold text-gray-900 mb-2">
                    ⚗️ Volumen de Producción (Litros) *
                  </label>
                  <input
                    type="number"
                    id="cantidadObjetivo"
                    min="1"
                    max="10000"
                    value={produccionData.cantidadObjetivo}
                    onChange={(e) => setProduccionData({...produccionData, cantidadObjetivo: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white/90 text-gray-900"
                    placeholder="Ingrese el volumen objetivo"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Rango recomendado: 100 - 5000 litros por lote
                  </p>
                </div>

                {/* Fecha de inicio */}
                <div>
                  <label htmlFor="fechaInicio" className="block text-sm font-semibold text-gray-900 mb-2">
                    📅 Fecha de Inicio de Fermentación *
                  </label>
                  <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                    <input
                      type="date"
                      id="fechaInicio"
                      value={produccionData.fechaInicio}
                      onChange={(e) => setProduccionData({...produccionData, fechaInicio: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white/90 text-gray-900"
                      required
                    />
                    {produccionData.fechaInicio && (
                      <div className="mt-3 p-2 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-xs text-purple-600 font-medium text-center">Fecha programada:</p>
                        <p className="text-sm font-semibold text-purple-800 text-center">
                          {new Date(produccionData.fechaInicio + 'T00:00:00').toLocaleDateString('es-CO', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Equipo Responsable - Multi-select */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    👥 Equipo Responsable *
                  </label>
                  <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {usuarios.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-gray-500 text-sm">
                            {loading ? 'Cargando usuarios...' : 'No hay usuarios disponibles'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Debug: {usuarios.length} usuarios cargados
                          </p>
                        </div>
                      ) : (
                        usuarios.map((usuario) => (
                          <label key={usuario.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={produccionData.responsablesEquipo.includes(usuario.id)}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                const newResponsables = isChecked
                                  ? [...produccionData.responsablesEquipo, usuario.id]
                                  : produccionData.responsablesEquipo.filter(id => id !== usuario.id);
                                setProduccionData({...produccionData, responsablesEquipo: newResponsables});
                              }}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">{usuario.nombre}</span>
                          </label>
                        ))
                      )}
                    </div>
                    {produccionData.responsablesEquipo.length > 0 && (
                      <div className="mt-3 p-2 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-xs text-purple-600 font-medium mb-1">Equipo seleccionado ({produccionData.responsablesEquipo.length}):</p>
                        <div className="flex flex-wrap gap-1">
                          {produccionData.responsablesEquipo.map(userId => {
                            const usuario = usuarios.find(u => u.id === userId);
                            return usuario ? (
                              <span key={userId} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {usuario.nombre}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newResponsables = produccionData.responsablesEquipo.filter(id => id !== userId);
                                    setProduccionData({...produccionData, responsablesEquipo: newResponsables});
                                  }}
                                  className="ml-1 text-purple-600 hover:text-purple-800"
                                >
                                  ×
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Selecciona todos los miembros del equipo que participarán en la producción
                    </p>
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <label htmlFor="observaciones" className="block text-sm font-semibold text-gray-900 mb-2">
                    📝 Observaciones del Proceso
                  </label>
                  <div className="relative">
                    <textarea
                      id="observaciones"
                      value={produccionData.observaciones}
                      onChange={(e) => setProduccionData({...produccionData, observaciones: e.target.value})}
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white/90 text-gray-900"
                      rows={4}
                      placeholder="Condiciones especiales, modificaciones al protocolo, notas del responsable..."
                    />
                    <div className="absolute top-3 right-3">
                      <AudioRecorderSimple
                        onTranscriptionComplete={(text) => {
                          const currentObservaciones = produccionData.observaciones;
                          const newObservaciones = currentObservaciones ? `${currentObservaciones} ${text}` : text;
                          setProduccionData({...produccionData, observaciones: newObservaciones});
                        }}
                        currentText={produccionData.observaciones}
                        onTextChange={(text) => setProduccionData({...produccionData, observaciones: text})}
                      />
                    </div>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 px-8 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Configurando Fermentación...</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center space-x-2">
                        <span>🚀</span>
                        <span>Iniciar Producción de BT</span>
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProduccionForm(false);
                      setSelectedMicroorganismo(null);
                    }}
                    className="sm:w-auto px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 font-semibold bg-white/90"
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <span>↩️</span>
                      <span>Cancelar</span>
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Producción */}
      {showConfirmModal && selectedMicroorganismo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header del Modal */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🧬</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Confirmar Producción de {selectedMicroorganismo.nombre}
                </h3>
                <p className="text-gray-600">
                  Revisa los detalles antes de iniciar la fermentación
                </p>
              </div>

              {/* Detalles de la Producción */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">📋 Resumen de Producción</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Microorganismo:</span>
                    <p className="font-semibold text-gray-900">{selectedMicroorganismo.nombre}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Volumen objetivo:</span>
                    <p className="font-semibold text-purple-600">{produccionData.cantidadObjetivo} Litros</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Fecha de inicio:</span>
                    <p className="font-semibold text-gray-900">{new Date(produccionData.fechaInicio).toLocaleDateString('es-CO')}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Responsables:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {produccionData.responsablesEquipo.map(userId => {
                        const usuario = usuarios.find(u => u.id === userId);
                        return usuario ? (
                          <span key={userId} className="inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                            {usuario.nombre}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
                {produccionData.observaciones && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Observaciones:</span>
                    <p className="text-gray-900 mt-1">{produccionData.observaciones}</p>
                  </div>
                )}
              </div>

              {/* Insumos Calculados para Bacillus */}
              {insumosCalculados.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-4 mb-6 border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-3 flex items-center">
                    <span className="mr-2">📦</span>
                    Insumos Requeridos - Fórmula Bacillus thuringiensis
                  </h4>
                  <div className="space-y-3">
                    {insumosCalculados.map((insumo, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-orange-200">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center mb-1">
                              <span className="font-semibold text-orange-900 mr-2">{insumo.nombre}</span>
                              <span className="bg-orange-200 text-orange-800 px-2 py-0.5 rounded text-xs font-medium">
                                {insumo.categoria}
                              </span>
                            </div>
                            <p className="text-xs text-orange-700 mb-1">{insumo.descripcion}</p>
                            <p className="text-xs text-gray-600">
                              💧 Por litro: <span className="font-medium">{insumo.cantidadPorLitro} {insumo.unidad}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="bg-orange-100 text-orange-800 px-3 py-2 rounded-lg">
                              <div className="font-bold text-lg">
                                {insumo.cantidad < 1 ? 
                                  insumo.cantidad.toFixed(3) :
                                  insumo.cantidad % 1 === 0 ? 
                                    insumo.cantidad.toLocaleString() : 
                                    insumo.cantidad.toFixed(2)
                                }
                              </div>
                              <div className="text-xs font-medium">{insumo.unidad}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-orange-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-orange-900">Volumen de producción:</span>
                      <span className="bg-orange-600 text-white px-4 py-2 rounded-full font-bold text-lg">
                        {produccionData.cantidadObjetivo} Litros
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-orange-100 rounded-lg p-2">
                        <span className="font-medium text-orange-900">Total insumos:</span>
                        <div className="text-orange-800">
                          {insumosCalculados.reduce((total, insumo) => total + insumo.cantidad, 0).toFixed(2)} gr + ml
                        </div>
                      </div>
                      <div className="bg-orange-100 rounded-lg p-2">
                        <span className="font-medium text-orange-900">Costo estimado:</span>
                        <div className="text-orange-800">Por calcular</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-orange-100 rounded-lg">
                    <p className="text-orange-800 text-sm font-medium flex items-center">
                      <span className="mr-2">💡</span>
                      Fórmula estándar: Dipel (50g) + Melaza (20g) + Tomate (10g) + Levadura (0.01g) por litro
                    </p>
                  </div>
                  <div className="mt-2 p-3 bg-blue-100 rounded-lg">
                    <p className="text-blue-800 text-sm font-medium flex items-center">
                      <span className="mr-2">🔄</span>
                      Los insumos serán descontados automáticamente del inventario usando lógica FIFO (primero el stock más antiguo)
                    </p>
                  </div>
                </div>
              )}

              {/* Advertencia */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h4 className="font-semibold text-yellow-900 mb-1">Antes de continuar</h4>
                    <ul className="text-yellow-800 text-sm space-y-1">
                      <li>• Verifica que tengas todos los insumos necesarios</li>
                      <li>• Asegúrate de que el equipo esté esterilizado</li>
                      <li>• Confirma las condiciones ambientales del laboratorio</li>
                      <li>• Este registro será permanente en Airtable</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Botones del Modal */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={handleConfirmProduccion}
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 px-6 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Iniciando...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <span>✅</span>
                      <span>Confirmar e Iniciar Producción</span>
                    </span>
                  )}
                </button>
                <button
                  onClick={handleCancelProduccion}
                  disabled={isSubmitting}
                  className="sm:w-auto px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 font-semibold bg-white"
                >
                  <span className="flex items-center justify-center space-x-2">
                    <span>❌</span>
                    <span>Cancelar</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Éxito */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                ¡Producción Iniciada!
              </h3>
              
              {/* Información básica de la fermentación */}
              <div className="bg-green-50 rounded-lg p-4 mb-6 text-left">
                <pre className="text-green-800 text-sm font-medium whitespace-pre-wrap">
                  {successMessage}
                </pre>
              </div>

              {/* Recordatorio sobre insumos si se calcularon */}
              {insumosCalculados.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <p className="text-blue-800 text-sm font-medium">
                    💡 Los insumos de la fórmula Bacillus thuringiensis han sido calculados y 
                    {resultadoFermentacion?.insumos?.descuentoAutomatico?.success ? 
                      ' descontados automáticamente del inventario' : 
                      ' están listos para preparación manual'
                    }
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setResultadoFermentacion(null);
                }}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </>
  );
}
