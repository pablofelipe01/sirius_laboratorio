'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AudioRecorder from '@/components/AudioRecorder';

interface Microorganismo {
  id: string;
  nombre: string;
}

interface Lote {
  id: string;
  microorganismo: string[];
  abreviatura: string[];
  codigoCepa?: string; // Solo para cepas
  codigoLote?: string; // Solo para inoculaciones
  totalCantidadBolsas: number;
  fechaCreacion: string;
  responsables: string[];
}

const DescartesPage = () => {
  const { user } = useAuth();
  
  // Estados principales
  const [tipoDescarte, setTipoDescarte] = useState<'cepas' | 'inoculacion' | ''>('');
  const [microorganismoSeleccionado, setMicroorganismoSeleccionado] = useState<string>('');
  const [microorganismoId, setMicroorganismoId] = useState<string>('');
  const [loteSeleccionado, setLoteSeleccionado] = useState<string>('');
  const [cantidadDescarte, setCantidadDescarte] = useState<number | string>('');
  const [motivoDescarte, setMotivoDescarte] = useState<string>('');
  
  // Estados para datos
  const [microorganismos, setMicroorganismos] = useState<Microorganismo[]>([]);
  const [lotesDisponibles, setLotesDisponibles] = useState<Lote[]>([]);
  
  // Estados de carga
  const [loadingMicroorganismos, setLoadingMicroorganismos] = useState(false);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados de UI
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Cargar microorganismos al montar el componente
  useEffect(() => {
    fetchMicroorganismos();
  }, []);

  // Cargar lotes cuando cambie el microorganismo o tipo de descarte
  useEffect(() => {
    if (microorganismoSeleccionado && tipoDescarte) {
      fetchLotesDisponibles();
    } else {
      setLotesDisponibles([]);
      setLoteSeleccionado('');
    }
  }, [microorganismoSeleccionado, tipoDescarte]);

  const fetchMicroorganismos = async () => {
    setLoadingMicroorganismos(true);
    try {
      const response = await fetch('/api/microorganismos');
      const data = await response.json();
      
      if (data.success) {
        setMicroorganismos(data.microorganismos);
      } else {
        console.error('Error loading microorganismos:', data.error);
      }
    } catch (error) {
      console.error('Error fetching microorganismos:', error);
    } finally {
      setLoadingMicroorganismos(false);
    }
  };

  const fetchLotesDisponibles = async () => {
    setLoadingLotes(true);
    try {
      const endpoint = tipoDescarte === 'cepas' ? '/api/cepas-disponibles' : '/api/inoculacion-disponible';
      const params = new URLSearchParams();
      if (microorganismoSeleccionado) {
        params.append('microorganismo', microorganismoSeleccionado);
      }

      const response = await fetch(`${endpoint}?${params}`);
      const data = await response.json();
      
      if (data.success) {
        const lotes = tipoDescarte === 'cepas' ? data.cepas : data.inoculaciones;
        // Filtrar solo los que tienen cantidad > 0
        const lotesDisponibles = lotes.filter((lote: Lote) => lote.totalCantidadBolsas > 0);
        setLotesDisponibles(lotesDisponibles);
      } else {
        console.error('Error loading lotes:', data.error);
        setLotesDisponibles([]);
      }
    } catch (error) {
      console.error('Error fetching lotes:', error);
      setLotesDisponibles([]);
    } finally {
      setLoadingLotes(false);
    }
  };

  const handleMicroorganismoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedMicroorganismo = microorganismos.find(m => m.id === selectedId);
    
    setMicroorganismoId(selectedId);
    setMicroorganismoSeleccionado(selectedMicroorganismo?.nombre || '');
    setLoteSeleccionado('');
    setCantidadDescarte('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const cantidad = typeof cantidadDescarte === 'string' ? parseInt(cantidadDescarte) : cantidadDescarte;
      const lote = getLoteById(loteSeleccionado);
      
      if (!lote || !cantidad || cantidad <= 0) {
        setErrorMessage('Por favor completa todos los campos correctamente');
        setSubmitStatus('error');
        return;
      }

      if (cantidad > lote.totalCantidadBolsas) {
        setErrorMessage(`La cantidad no puede ser mayor a ${lote.totalCantidadBolsas} bolsas disponibles`);
        setSubmitStatus('error');
        return;
      }

      const descarte = {
        tipoDescarte,
        microorganismo: microorganismoSeleccionado,
        microorganismoId,
        loteId: loteSeleccionado,
        cantidad,
        motivo: motivoDescarte,
        registradoPor: user?.nombre || '',
        fechaDescarte: new Date().toISOString().split('T')[0]
      };

      const response = await fetch('/api/descartes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(descarte),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmitStatus('success');
        
        // Refresh lotes disponibles para mostrar cantidades actualizadas
        if (microorganismoSeleccionado && tipoDescarte) {
          await fetchLotesDisponibles();
        }
        
        // Reset solo los campos específicos del descarte, mantener tipo y microorganismo
        setLoteSeleccionado('');
        setCantidadDescarte('');
        setMotivoDescarte('');
        
        // Mostrar mensaje de éxito por unos segundos
        setTimeout(() => {
          setSubmitStatus('idle');
        }, 3000);
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.error || 'Error al registrar el descarte');
      }
    } catch (error: unknown) {
      console.error('Error al registrar descarte:', error);
      setSubmitStatus('error');
      setErrorMessage('Error de conexión. Por favor, intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLoteById = (id: string): Lote | undefined => {
    return lotesDisponibles.find(lote => lote.id === id);
  };

  const loteSeleccionadoData = getLoteById(loteSeleccionado);
  const maxDisponible = loteSeleccionadoData ? loteSeleccionadoData.totalCantidadBolsas : 0;

  return (
    <>
      <Navbar />
      <div 
        className="min-h-screen relative pt-20"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
      {/* Overlay para mejor legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-3 sm:p-4 mb-8 border border-white/20">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-1">
                🗑️ Registro de Descartes
              </h1>
              <p className="text-gray-600 text-lg">
                Sistema de gestión de descartes de lotes
              </p>
            </div>
          </div>
        </div>

        {/* Formulario Principal */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 sm:p-6 border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Tipo de Descarte */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                🎯 Tipo de Descarte
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setTipoDescarte('cepas')}
                  className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                    tipoDescarte === 'cepas'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">🧪</div>
                    <div className="font-semibold text-gray-900">Lotes de Cepas</div>
                    <div className="text-sm text-gray-700 mt-1">Descartar cepas madre</div>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setTipoDescarte('inoculacion')}
                  className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                    tipoDescarte === 'inoculacion'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">🍄</div>
                    <div className="font-semibold text-gray-900">Lotes de Producción</div>
                    <div className="text-sm text-gray-700 mt-1">Descartar bolsas inoculadas</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Selector de Microorganismo */}
            {tipoDescarte && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  🔬 Microorganismo
                </label>
                <select
                  value={microorganismoId}
                  onChange={handleMicroorganismoChange}
                  required
                  disabled={loadingMicroorganismos}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="">
                    {loadingMicroorganismos ? 'Cargando microorganismos...' : 'Selecciona un microorganismo'}
                  </option>
                  {microorganismos.map((microorganismo) => (
                    <option key={microorganismo.id} value={microorganismo.id}>
                      {microorganismo.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Selector de Lote */}
            {microorganismoSeleccionado && tipoDescarte && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  📦 Lote Disponible
                </label>
                <select
                  value={loteSeleccionado}
                  onChange={(e) => {
                    setLoteSeleccionado(e.target.value);
                    setCantidadDescarte('');
                  }}
                  required
                  disabled={loadingLotes}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="">
                    {loadingLotes ? 'Cargando lotes...' : 'Selecciona un lote'}
                  </option>
                  {lotesDisponibles.map((lote) => (
                    <option key={lote.id} value={lote.id}>
                      {tipoDescarte === 'cepas' && lote.codigoCepa ? 
                        `${lote.codigoCepa} - ${lote.totalCantidadBolsas} bolsas` :
                        `${lote.codigoLote || lote.fechaCreacion} - ${lote.totalCantidadBolsas} bolsas`
                      }
                    </option>
                  ))}
                </select>
                
                {!loadingLotes && lotesDisponibles.length === 0 && microorganismoSeleccionado && (
                  <p className="text-orange-600 text-sm mt-2">
                    No hay lotes disponibles para {microorganismoSeleccionado}
                  </p>
                )}
              </div>
            )}

            {/* Cantidad a Descartar */}
            {loteSeleccionado && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  🔢 Cantidad a Descartar (máximo: {maxDisponible} bolsas)
                </label>
                <input
                  type="number"
                  min="1"
                  max={maxDisponible}
                  value={cantidadDescarte}
                  onChange={(e) => setCantidadDescarte(e.target.value)}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    setCantidadDescarte(Math.min(Math.max(value, 1), maxDisponible));
                  }}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="Escribe la cantidad a descartar..."
                />
                {typeof cantidadDescarte === 'number' && cantidadDescarte > maxDisponible && (
                  <p className="text-red-500 text-xs mt-1">
                    La cantidad no puede ser mayor a {maxDisponible} bolsas disponibles
                  </p>
                )}
              </div>
            )}

            {/* Motivo del Descarte con Grabación de Audio */}
            {loteSeleccionado && (
              <AudioRecorder
                onTranscriptionComplete={(text) => setMotivoDescarte(text)}
                currentText={motivoDescarte}
                onTextChange={setMotivoDescarte}
              />
            )}

            {/* Información del Descarte */}
            {loteSeleccionado && cantidadDescarte && motivoDescarte && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">
                  📋 Resumen del Descarte
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Tipo:</span>
                    <p className="text-gray-900">{tipoDescarte === 'cepas' ? 'Lotes de Cepas' : 'Lotes de Producción'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Microorganismo:</span>
                    <p className="text-gray-900">{microorganismoSeleccionado}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Lote:</span>
                    <p className="text-gray-900">
                      {loteSeleccionadoData && (
                        tipoDescarte === 'cepas' && loteSeleccionadoData.codigoCepa ? 
                          loteSeleccionadoData.codigoCepa :
                          loteSeleccionadoData.codigoLote || loteSeleccionadoData.fechaCreacion
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Cantidad:</span>
                    <p className="text-gray-900">{cantidadDescarte} bolsas</p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium text-gray-700">Motivo:</span>
                    <p className="text-gray-900 mt-1">{motivoDescarte}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Registrado por:</span>
                    <p className="text-gray-900">{user?.nombre || 'Usuario no identificado'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Fecha:</span>
                    <p className="text-gray-900">{new Date().toLocaleDateString('es-ES')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Botón de Envío - Siempre visible */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={
                  isSubmitting || 
                  !loteSeleccionado || 
                  !cantidadDescarte || 
                  !motivoDescarte ||
                  (typeof cantidadDescarte === 'number' && cantidadDescarte > maxDisponible)
                }
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 text-lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Registrando Descarte...
                  </span>
                ) : (
                  '🗑️ Registrar Descarte'
                )}
              </button>
              
              {/* Texto de ayuda cuando faltan campos */}
              {(!loteSeleccionado || !cantidadDescarte || !motivoDescarte) && (
                <p className="text-gray-500 text-sm mt-2 text-center">
                  {!loteSeleccionado && 'Selecciona un lote. '}
                  {!cantidadDescarte && 'Ingresa la cantidad. '}
                  {!motivoDescarte && 'Describe el motivo del descarte.'}
                </p>
              )}
            </div>

            {/* Mensajes de Estado */}
            {submitStatus === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">
                      ¡Descarte registrado exitosamente!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {submitStatus === 'error' && errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">
                      {errorMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
      </div>
      <Footer />
    </>
  );
};

export default DescartesPage;
