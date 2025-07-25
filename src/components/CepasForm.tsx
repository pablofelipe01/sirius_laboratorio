'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface CepasData {
  cantidadBolsas: number;
  microorganismo: string;
  microorganismoId: string;
  fechaCreacion: string;
  responsables: string[];
  responsablesIds: string[];
  registradoPor: string;
}

interface Microorganism {
  id: string;
  nombre: string;
}

interface Responsable {
  id: string;
  nombre: string;
}

const CepasForm = () => {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<CepasData>({
    cantidadBolsas: 0,
    microorganismo: '',
    microorganismoId: '',
    fechaCreacion: '',
    responsables: [],
    responsablesIds: [],
    registradoPor: user?.nombre || '',
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
          { id: 'fallback-3', nombre: 'Trichoderma harzianum' },
          { id: 'fallback-4', nombre: 'Otro (especificar en notas)' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching microorganisms:', error);
      // Fallback a lista estática
      setMicroorganisms([
        { id: 'fallback-1', nombre: 'Pleurotus ostreatus' },
        { id: 'fallback-2', nombre: 'Shiitake (Lentinula edodes)' },
        { id: 'fallback-3', nombre: 'Trichoderma harzianum' },
        { id: 'fallback-4', nombre: 'Otro (especificar en notas)' }
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
    } else if (name === 'microorganismo' && e.target instanceof HTMLSelectElement) {
      const selectedOption = e.target.options[e.target.selectedIndex];
      const microorganismoId = selectedOption.getAttribute('data-id') || '';
      setFormData(prev => ({
        ...prev,
        microorganismo: value,
        microorganismoId: microorganismoId,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      // Enviar datos a la API de Cepas
      const response = await fetch('/api/cepas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmitStatus('success');
        
        setFormData({
          cantidadBolsas: 0,
          microorganismo: '',
          microorganismoId: '',
          fechaCreacion: '',
          responsables: [],
          responsablesIds: [],
          registradoPor: user?.nombre || '',
        });
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.error || 'Error al registrar la cepa');
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
      
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Profesional */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 mb-8 border border-white/20">
          <div className="flex items-center justify-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 text-center">
                Registro de Cepas
              </h1>
              <p className="text-lg text-gray-600 flex items-center justify-center">
                <span className="inline-block w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></span>
                Sistema DataLab - Sirius Regenerative Solutions S.A.S ZOMAC
              </p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {submitStatus === 'success' && (
          <div className="bg-green-50/95 backdrop-blur-sm border border-green-200 rounded-2xl p-6 mb-8 shadow-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  ✅ Cepa registrada exitosamente
                </h3>
                <p className="text-green-700">
                  Los datos han sido guardados correctamente en Airtable con trazabilidad completa.
                </p>
              </div>
            </div>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="bg-red-50/95 backdrop-blur-sm border border-red-200 rounded-2xl p-6 mb-8 shadow-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  ❌ Error al registrar
                </h3>
                <p className="text-red-700">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Formulario */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Fecha de Creación */}
            <div>
              <label htmlFor="fechaCreacion" className="block text-sm font-semibold text-gray-900 mb-2">
                Fecha de Creación *
              </label>
              <input
                type="date"
                id="fechaCreacion"
                name="fechaCreacion"
                required
                value={formData.fechaCreacion}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white/90 text-lg text-gray-900"
              />
            </div>

            {/* Microorganismo */}
            <div>
              <label htmlFor="microorganismo" className="block text-sm font-semibold text-gray-900 mb-2">
                Microorganismo *
              </label>
              <select
                id="microorganismo"
                name="microorganismo"
                required
                value={formData.microorganismo}
                onChange={handleChange}
                disabled={loadingMicroorganisms}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white/90 disabled:opacity-50 text-gray-900"
              >
                <option value="">{loadingMicroorganisms ? 'Cargando...' : 'Seleccionar microorganismo'}</option>
                {!loadingMicroorganisms && microorganisms && microorganisms.map((organism) => (
                  <option key={organism.id} value={organism.nombre} data-id={organism.id}>{organism.nombre}</option>
                ))}
              </select>
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
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white/90 disabled:opacity-50 h-32 text-gray-900"
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
              <label htmlFor="cantidadBolsas" className="block text-sm font-semibold text-gray-900 mb-2">
                Cantidad de Bolsas *
              </label>
              <input
                type="number"
                id="cantidadBolsas"
                name="cantidadBolsas"
                required
                min="1"
                value={formData.cantidadBolsas || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white/90 text-lg text-gray-900"
                placeholder="Ejemplo: 15"
              />
            </div>

            {/* Botón */}
            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={isSubmitting || loadingMicroorganisms || loadingResponsables}
                className={`px-10 py-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 ${
                  isSubmitting || loadingMicroorganisms || loadingResponsables
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 hover:from-purple-700 hover:via-violet-700 hover:to-purple-800 text-white'
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
                ) : (
                  'Registrar Cepa'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CepasForm;
