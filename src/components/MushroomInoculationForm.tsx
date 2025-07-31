'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CepaSelector from './CepaSelector';

// Componente de Calendario
interface CalendarioSelectorProps {
  fechaSeleccionada: string;
  onFechaSeleccionada: (fecha: string) => void;
}

const CalendarioSelector = ({ fechaSeleccionada, onFechaSeleccionada }: CalendarioSelectorProps) => {
  const [mesActual, setMesActual] = useState(new Date());
  
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  const obtenerDiasDelMes = () => {
    const año = mesActual.getFullYear();
    const mes = mesActual.getMonth();
    
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const diaSemanaInicio = primerDia.getDay();
    
    const dias = [];
    
    // Días del mes anterior (para rellenar)
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      const diaAnterior = new Date(año, mes, -i);
      dias.push({
        dia: diaAnterior.getDate(),
        esOtroMes: true,
        fecha: diaAnterior
      });
    }
    
    // Días del mes actual
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fecha = new Date(año, mes, dia);
      dias.push({
        dia,
        esOtroMes: false,
        fecha
      });
    }
    
    // Días del mes siguiente (para completar la grilla)
    const diasRestantes = 42 - dias.length; // 6 filas x 7 días
    for (let dia = 1; dia <= diasRestantes; dia++) {
      const fechaSiguiente = new Date(año, mes + 1, dia);
      dias.push({
        dia,
        esOtroMes: true,
        fecha: fechaSiguiente
      });
    }
    
    return dias;
  };
  
  const formatearFecha = (fecha: Date) => {
    return fecha.toISOString().split('T')[0];
  };
  
  const esFechaSeleccionada = (fecha: Date) => {
    return formatearFecha(fecha) === fechaSeleccionada;
  };
  
  const esHoy = (fecha: Date) => {
    const hoy = new Date();
    return fecha.toDateString() === hoy.toDateString();
  };
  
  const cambiarMes = (direccion: number) => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + direccion, 1));
  };
  
  const seleccionarFecha = (fecha: Date) => {
    onFechaSeleccionada(formatearFecha(fecha));
  };
  
  const dias = obtenerDiasDelMes();
  
  return (
    <div className="w-full max-w-xs mx-auto">
      {/* Header del calendario */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => cambiarMes(-1)}
          className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors bg-gray-700 hover:bg-gray-800"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h3 className="text-base font-semibold text-gray-900">
          {meses[mesActual.getMonth()]} {mesActual.getFullYear()}
        </h3>
        
        <button
          type="button"
          onClick={() => cambiarMes(1)}
          className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors bg-gray-700 hover:bg-gray-800"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {diasSemana.map(dia => (
          <div key={dia} className="text-center text-xs font-medium text-gray-500 py-1">
            {dia}
          </div>
        ))}
      </div>
      
      {/* Grilla de días */}
      <div className="grid grid-cols-7 gap-1">
        {dias.map((diaObj, index) => {
          const esSeleccionada = esFechaSeleccionada(diaObj.fecha);
          const esHoyDia = esHoy(diaObj.fecha);
          
          return (
            <button
              key={index}
              type="button"
              onClick={() => seleccionarFecha(diaObj.fecha)}
              className={`
                p-1.5 text-xs rounded-lg transition-all duration-200 hover:bg-blue-100
                ${diaObj.esOtroMes ? 'text-gray-300' : 'text-gray-900'}
                ${esSeleccionada ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                ${esHoyDia && !esSeleccionada ? 'bg-blue-100 text-blue-600 font-semibold' : ''}
                ${!diaObj.esOtroMes && !esSeleccionada && !esHoyDia ? 'hover:bg-gray-100' : ''}
              `}
            >
              {diaObj.dia}
            </button>
          );
        })}
      </div>
      
      {/* Fecha seleccionada */}
      {fechaSeleccionada && (
        <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-center">
            <p className="text-xs text-blue-600 font-medium">Fecha seleccionada:</p>
            <p className="text-sm font-semibold text-blue-800">
              {new Date(fechaSeleccionada + 'T00:00:00').toLocaleDateString('es-CO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

interface CepaSeleccionada {
  cepaId: string;
  cantidad: number;
  microorganismo: string;
  abreviatura: string;
  codigoCepa: string;
  totalDisponible: number;
}

interface InoculationData {
  bagQuantity: number;
  microorganism: string;
  microorganismId: string;
  inoculationDate: string;
  responsables: string[];
  responsablesIds: string[];
  registradoPor: string;
  cepasSeleccionadas: CepaSeleccionada[];
}

interface Microorganism {
  id: string;
  nombre: string;
}

interface Responsable {
  id: string;
  nombre: string;
}

const MushroomInoculationForm = () => {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<InoculationData>({
    bagQuantity: 0,
    microorganism: '',
    microorganismId: '',
    inoculationDate: '',
    responsables: [],
    responsablesIds: [],
    registradoPor: user?.nombre || '',
    cepasSeleccionadas: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [microorganisms, setMicroorganisms] = useState<Microorganism[]>([]);
  const [loadingMicroorganisms, setLoadingMicroorganisms] = useState(true);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [loadingResponsables, setLoadingResponsables] = useState(true);

  useEffect(() => {
    fetchMicroorganisms();
    fetchResponsables();
  }, []);

  // Actualizar el campo registradoPor cuando cambie el usuario
  useEffect(() => {
    if (user?.nombre) {
      setFormData(prev => ({
        ...prev,
        registradoPor: user.nombre
      }));
    }
  }, [user]);

  const fetchResponsables = async () => {
    try {
      const response = await fetch('/api/equipo');
      const data = await response.json();
      if (data.success) {
        setResponsables(data.responsables);
      } else {
        setResponsables([]);
      }
    } catch {
      setResponsables([]);
    } finally {
      setLoadingResponsables(false);
    }
  };

  const fetchMicroorganisms = async () => {
    try {
      const response = await fetch('/api/microorganismos');
      const data = await response.json();
      
      if (data.success) {
        setMicroorganisms(data.microorganismos);
      } else {
        console.error('Error loading microorganisms:', data.error);
        // Fallback a lista estática
        setMicroorganisms([
          { id: 'fallback-1', nombre: 'Pleurotus ostreatus' },
          { id: 'fallback-2', nombre: 'Shiitake (Lentinula edodes)' },
          { id: 'fallback-3', nombre: 'Otro (especificar en notas)' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching microorganisms:', error);
      // Fallback a lista estática
      setMicroorganisms([
        { id: 'fallback-1', nombre: 'Pleurotus ostreatus' },
        { id: 'fallback-2', nombre: 'Shiitake (Lentinula edodes)' },
        { id: 'fallback-3', nombre: 'Otro (especificar en notas)' }
      ]);
    } finally {
      setLoadingMicroorganisms(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (e.target instanceof HTMLSelectElement && e.target.multiple) {
      const selected = Array.from(e.target.selectedOptions);
      const selectedValues = selected.map(option => option.value);
      const selectedIds = selected.map(option => option.getAttribute('data-id') || '');
      setFormData(prev => ({ 
        ...prev, 
        [name]: selectedValues,
        [`${name}Ids`]: selectedIds
      }));
    } else if (name === 'microorganism' && e.target instanceof HTMLSelectElement) {
      const selectedOption = e.target.options[e.target.selectedIndex];
      const microorganismId = selectedOption.getAttribute('data-id') || '';
      setFormData(prev => ({
        ...prev,
        microorganism: value,
        microorganismId: microorganismId,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : value,
      }));
    }
  };

  const handleCepaAgregada = (cepa: CepaSeleccionada) => {
    setFormData(prev => ({
      ...prev,
      cepasSeleccionadas: [...prev.cepasSeleccionadas, cepa]
    }));
  };

  const handleRemoverCepa = (index: number) => {
    setFormData(prev => ({
      ...prev,
      cepasSeleccionadas: prev.cepasSeleccionadas.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    // Validación: verificar que se hayan seleccionado cepas
    if (formData.cepasSeleccionadas.length === 0) {
      setErrorMessage('❌ Error: Debe seleccionar al menos una cepa para continuar con la inoculación.');
      setSubmitStatus('error');
      setIsSubmitting(false);
      return;
    }

    try {
      // Enviar datos a la API de Airtable
      const response = await fetch('/api/inoculacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Si la inoculación se creó exitosamente, crear registros de Salida Cepas
        if (formData.cepasSeleccionadas.length > 0 && result.recordId) {
          try {
            const salidaCepasData = formData.cepasSeleccionadas.map(cepa => ({
              fechaEvento: formData.inoculationDate,
              cantidadBolsasUsadas: cepa.cantidad,
              cepaId: cepa.cepaId,
              inoculacionId: result.recordId
            }));

            const salidaResponse = await fetch('/api/salida-cepas', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ registros: salidaCepasData }),
            });

            const salidaResult = await salidaResponse.json();
            
            if (salidaResponse.ok && salidaResult.success) {
              console.log('✅ Registros de Salida Cepas creados:', salidaResult.total);
            } else {
              console.error('❌ Error al crear registros de Salida Cepas:', salidaResult.error);
              // No fallar el proceso principal, solo mostrar advertencia
              setErrorMessage(`Inoculación creada exitosamente, pero hubo un problema al registrar la salida de cepas: ${salidaResult.error}`);
            }
          } catch (error) {
            console.error('❌ Error de conexión al crear Salida Cepas:', error);
            setErrorMessage('Inoculación creada exitosamente, pero hubo un problema de conexión al registrar la salida de cepas.');
          }
        }

        setSubmitStatus('success');
        
        setFormData({
          bagQuantity: 0,
          microorganism: '',
          microorganismId: '',
          inoculationDate: '',
          responsables: [],
          responsablesIds: [],
          registradoPor: user?.nombre || '',
          cepasSeleccionadas: [],
        });
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.error || 'Error al registrar la inoculación');
      }
    } catch {
      setSubmitStatus('error');
      setErrorMessage('Error de conexión. Por favor, intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="min-h-screen relative pt-16"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay para mejor legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-15">
        {/* Header Profesional */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-3 sm:p-4 mb-4 sm:mb-8 border border-white/20">
          <div className="flex items-center justify-center">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 text-center">
                Inoculación de Microorganismos
              </h1>
              <p className="text-sm sm:text-lg text-gray-600 flex items-center justify-center">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                <span className="hidden sm:inline">Sistema DataLab - Sirius Regenerative Solutions S.A.S ZOMAC</span>
                <span className="sm:hidden">Sistema DataLab - Sirius</span>
              </p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {submitStatus === 'success' && (
          <div className="bg-green-50/95 backdrop-blur-sm border border-green-200 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-8 shadow-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4">
                <h3 className="text-base sm:text-lg font-semibold text-green-800 mb-1 sm:mb-2">
                  ✅ Inoculación registrada exitosamente
                </h3>
                <p className="text-sm sm:text-base text-green-700">
                  Los datos han sido guardados correctamente en Airtable con trazabilidad completa.
                </p>
              </div>
            </div>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="bg-red-50/95 backdrop-blur-sm border border-red-200 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-8 shadow-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4">
                <h3 className="text-base sm:text-lg font-semibold text-red-800 mb-1 sm:mb-2">
                  ❌ Error al registrar
                </h3>
                <p className="text-red-700">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Formulario */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 sm:p-6 border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Fecha de Inoculación */}
            <div>
              <label htmlFor="inoculationDate" className="block text-sm font-semibold text-gray-900 mb-2">
                📅 Fecha de Inoculación *
              </label>
              <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                <CalendarioSelector 
                  fechaSeleccionada={formData.inoculationDate}
                  onFechaSeleccionada={(fecha) => {
                    setFormData(prev => ({
                      ...prev,
                      inoculationDate: fecha
                    }));
                  }}
                />
              </div>
            </div>

            {/* Microorganismo */}
            <div>
              <label htmlFor="microorganism" className="block text-sm font-semibold text-gray-900 mb-2">
                Microorganismo *
              </label>
              <select
                id="microorganism"
                name="microorganism"
                required
                value={formData.microorganism}
                onChange={handleChange}
                disabled={loadingMicroorganisms}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/90 disabled:opacity-50 text-gray-900"
              >
                <option value="">{loadingMicroorganisms ? 'Cargando...' : 'Seleccionar microorganismo'}</option>
                {!loadingMicroorganisms && microorganisms && microorganisms.map((organism) => (
                  <option key={organism.id} value={organism.nombre} data-id={organism.id}>{organism.nombre}</option>
                ))}
              </select>
            </div>

            {/* Selector de Cepas */}
            <div>
              <label className="block text-lg font-semibold text-white mb-3">
                🧬 Selección de Cepas <span className="text-red-400">*</span>
              </label>
              {formData.cepasSeleccionadas.length === 0 && (
                <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-red-700 text-sm font-medium">
                    ⚠️ Debe seleccionar al menos una cepa para proceder con la inoculación
                  </p>
                </div>
              )}
              <CepaSelector
                microorganismoSeleccionado={formData.microorganism}
                onCepaAgregada={handleCepaAgregada}
                onCepaRemovida={handleRemoverCepa}
                cepasAgregadas={formData.cepasSeleccionadas}
              />
              {formData.cepasSeleccionadas.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h5 className="font-medium text-blue-800 mb-2">Cepas para Inoculación:</h5>
                  <div className="space-y-2">
                    {formData.cepasSeleccionadas.map((cepa, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                        <div>
                          <span className="font-medium">{cepa.abreviatura}</span>
                          <span className="text-gray-600 ml-2">- {cepa.cantidad} bolsas</span>
                          <div className="text-xs text-gray-500">{cepa.microorganismo}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoverCepa(index)}
                          className="text-red-500 hover:text-red-700 px-2 py-1 rounded text-sm"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Responsables */}
            <div>
              <label htmlFor="responsables" className="block text-sm font-semibold text-gray-900 mb-2">
                Responsables *
              </label>
              <select
                id="responsables"
                name="responsables"
                multiple
                required
                value={formData.responsables}
                onChange={handleChange}
                disabled={loadingResponsables}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/90 disabled:opacity-50 h-32 text-gray-900"
              >
                {loadingResponsables ? (
                  <option>Cargando responsables...</option>
                ) : !responsables || responsables.length === 0 ? (
                  <option>No hay responsables disponibles</option>
                ) : responsables.map((resp) => (
                  <option key={resp.id} value={resp.nombre} data-id={resp.id}>{resp.nombre}</option>
                ))}
              </select>
              <p className="text-xs text-gray-700 mt-1">Puedes seleccionar varios responsables (Ctrl/Cmd + click)</p>
            </div>

            {/* Cantidad de Bolsas */}
            <div>
              <label htmlFor="bagQuantity" className="block text-sm font-semibold text-gray-900 mb-2">
                Cantidad de Bolsas Inoculadas *
              </label>
              <input
                type="number"
                id="bagQuantity"
                name="bagQuantity"
                required
                min="1"
                value={formData.bagQuantity || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/90 text-lg text-gray-900"
                placeholder="Ejemplo: 25"
              />
            </div>

            {/* Botón */}
            <div className="flex justify-center pt-6">
              <button
                type="submit"
                disabled={isSubmitting || loadingMicroorganisms || loadingResponsables || formData.cepasSeleccionadas.length === 0}
                className={`px-10 py-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 ${
                  isSubmitting || loadingMicroorganisms || loadingResponsables || formData.cepasSeleccionadas.length === 0
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-800 text-white'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Registrando...
                  </div>
                ) : formData.cepasSeleccionadas.length === 0 ? (
                  'Debe seleccionar al menos una cepa'
                ) : (
                  'Registrar Inoculación'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MushroomInoculationForm;