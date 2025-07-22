'use client';

import { useState, useEffect } from 'react';

interface InoculationData {
  bagQuantity: number;
  microorganism: string;
  inoculationDate: string;
  researcher: string;
  notes: string;
  substrate: string;
  temperature: number;
  humidity: number;
}

interface Microorganism {
  id: string;
  nombre: string;
}

const MushroomInoculationForm = () => {
  const [formData, setFormData] = useState<InoculationData>({
    bagQuantity: 0,
    microorganism: '',
    inoculationDate: '',
    researcher: '',
    notes: '',
    substrate: '',
    temperature: 0,
    humidity: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [batchCode, setBatchCode] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [currentBatchCode, setCurrentBatchCode] = useState<string>('');
  const [currentTimestamp, setCurrentTimestamp] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [microorganisms, setMicroorganisms] = useState<Microorganism[]>([]);
  const [loadingMicroorganisms, setLoadingMicroorganisms] = useState(true);

  // Efecto para hidratación segura
  useEffect(() => {
    setIsClient(true);
    setCurrentBatchCode(generateBatchCode());
    setCurrentTimestamp(new Date().toISOString());
    
    // Cargar microorganismos desde Airtable
    fetchMicroorganisms();
  }, []);

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

  const substrates = [
    'Paja de trigo',
    'Aserrín de roble',
    'Aserrín de haya',
    'Bagazo de caña',
    'Pulpa de café',
    'Mezcla personalizada',
    'Otro (especificar en notas)',
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

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
        setSubmitStatus('success');
        setBatchCode(result.batchCode);
        
        // Reset form después de éxito
        setFormData({
          bagQuantity: 0,
          microorganism: '',
          inoculationDate: '',
          researcher: '',
          notes: '',
          substrate: '',
          temperature: 0,
          humidity: 0,
        });
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.error || 'Error al registrar la inoculación');
      }
      
    } catch (error) {
      console.error('Error al enviar datos:', error);
      setSubmitStatus('error');
      setErrorMessage('Error de conexión. Por favor, intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateBatchCode = () => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `INO-${date}-${random}`;
  };

  return (
    <div 
      className="min-h-screen relative"
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white p-4 rounded-xl shadow-lg">
                <div className="text-3xl font-bold">🧬</div>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  Formulario de Inoculación de Microorganismos
                </h1>
                <p className="text-lg text-gray-600 flex items-center">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                  Sistema DataLab - Centro de Investigación Regenerativa (CIR)
                </p>
              </div>
            </div>
            <div className="text-right bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-200">
              <div className="text-sm text-gray-500 mb-1">Código de Lote</div>
              <div className="text-xl font-mono font-bold text-blue-700 bg-white px-3 py-1 rounded-lg shadow-sm">
                {isClient ? currentBatchCode : 'Generando...'}
              </div>
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
                  ✅ Inoculación registrada exitosamente
                </h3>
                <p className="text-green-700">
                  Los datos han sido guardados correctamente en Airtable con trazabilidad completa.
                </p>
                {batchCode && (
                  <div className="mt-3 bg-white/80 rounded-lg px-4 py-2 inline-block">
                    <span className="text-sm text-green-600">Código de lote generado: </span>
                    <strong className="font-mono text-green-800">{batchCode}</strong>
                  </div>
                )}
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
                  ❌ Error al registrar la inoculación
                </h3>
                <p className="text-red-700">
                  {errorMessage || 'Ha ocurrido un error inesperado. Por favor, intente nuevamente.'}
                </p>
                <p className="text-sm text-red-600 mt-2">
                  Si el problema persiste, contacte al administrador del sistema.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Profesional */}
        <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Cantidad de Bolsas */}
            <div className="space-y-2">
              <label htmlFor="bagQuantity" className="block text-sm font-semibold text-gray-800">
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
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm text-lg"
                placeholder="Ejemplo: 25"
              />
            </div>

            {/* Microorganismo Dinámico */}
            <div className="space-y-2">
              <label htmlFor="microorganism" className="block text-sm font-semibold text-gray-800">
                Microorganismo * 
                {loadingMicroorganisms && (
                  <span className="ml-2 text-blue-600">
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </span>
                )}
              </label>
              <select
                id="microorganism"
                name="microorganism"
                required
                value={formData.microorganism}
                onChange={handleChange}
                disabled={loadingMicroorganisms}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm text-lg disabled:opacity-50"
              >
                <option value="">
                  {loadingMicroorganisms ? 'Cargando microorganismos...' : 'Seleccionar microorganismo'}
                </option>
                {microorganisms.map((organism) => (
                  <option key={organism.id} value={organism.nombre}>
                    {organism.nombre}
                  </option>
                ))}
              </select>
              {microorganisms.length > 0 && !loadingMicroorganisms && (
                <p className="text-sm text-green-600 mt-1">
                  ✅ {microorganisms.length} microorganismos cargados desde Airtable
                </p>
              )}
            </div>

            {/* Fecha de Inoculación */}
            <div className="space-y-2">
              <label htmlFor="inoculationDate" className="block text-sm font-semibold text-gray-800">
                Fecha de Inoculación *
              </label>
              <input
                type="date"
                id="inoculationDate"
                name="inoculationDate"
                required
                value={formData.inoculationDate}
                onChange={handleChange}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm text-lg"
              />
            </div>

            {/* Investigador */}
            <div className="space-y-2">
              <label htmlFor="researcher" className="block text-sm font-semibold text-gray-800">
                Investigador Responsable *
              </label>
              <input
                type="text"
                id="researcher"
                name="researcher"
                required
                value={formData.researcher}
                onChange={handleChange}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm text-lg"
                placeholder="Nombre completo del investigador"
              />
            </div>

            {/* Sustrato */}
            <div className="space-y-2">
              <label htmlFor="substrate" className="block text-sm font-semibold text-gray-800">
                Tipo de Sustrato *
              </label>
              <select
                id="substrate"
                name="substrate"
                required
                value={formData.substrate}
                onChange={handleChange}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm text-lg"
              >
                <option value="">Seleccionar sustrato</option>
                {substrates.map((substrate) => (
                  <option key={substrate} value={substrate}>
                    {substrate}
                  </option>
                ))}
              </select>
            </div>

            {/* Temperatura */}
            <div className="space-y-2">
              <label htmlFor="temperature" className="block text-sm font-semibold text-gray-800">
                Temperatura (°C) *
              </label>
              <input
                type="number"
                id="temperature"
                name="temperature"
                required
                min="15"
                max="35"
                step="0.1"
                value={formData.temperature || ''}
                onChange={handleChange}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm text-lg"
                placeholder="Ejemplo: 24.5"
              />
            </div>

            {/* Humedad */}
            <div className="space-y-2">
              <label htmlFor="humidity" className="block text-sm font-semibold text-gray-800">
                Humedad Relativa (%) *
              </label>
              <input
                type="number"
                id="humidity"
                name="humidity"
                required
                min="60"
                max="95"
                step="0.1"
                value={formData.humidity || ''}
                onChange={handleChange}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm text-lg"
                placeholder="Ejemplo: 85.0"
              />
            </div>
          </div>

          {/* Notas - Full Width */}
          <div className="mt-8 space-y-2">
            <label htmlFor="notes" className="block text-sm font-semibold text-gray-800">
              Observaciones y Notas Adicionales
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm text-lg resize-none"
              placeholder="Observaciones adicionales, condiciones especiales, protocolos utilizados, etc..."
            />
          </div>

          {/* Botones de Acción */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-end">
            <button
              type="button"
              className="px-8 py-4 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 bg-white/80 backdrop-blur-sm"
              onClick={() => {
                setFormData({
                  bagQuantity: 0,
                  microorganism: '',
                  inoculationDate: '',
                  researcher: '',
                  notes: '',
                  substrate: '',
                  temperature: 0,
                  humidity: 0,
                });
              }}
            >
              🗑️ Limpiar Formulario
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting || loadingMicroorganisms}
              className={`px-10 py-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 ${
                isSubmitting || loadingMicroorganisms
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
                  Registrando en Airtable...
                </div>
              ) : (
                '🧬 Registrar Inoculación'
              )}
            </button>
          </div>
        </form>

        {/* Footer Info Profesional */}
        <div className="mt-8 bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-8 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">Airtable Conectado</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">Sistema Operativo</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">Telegram Seguro</span>
              </div>
            </div>
            
            <p className="text-gray-600 mb-2">
              📊 Los datos se almacenan automáticamente con trazabilidad completa y códigos de lote únicos
            </p>
            <p className="text-sm text-gray-500">
              🔗 Integración DataLab ↔ Airtable | 
              Sistema CIR | 
              Timestamp: {isClient ? currentTimestamp : 'Sincronizando...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MushroomInoculationForm;
