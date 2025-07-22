'use client';

import { useState } from 'react';

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

  const microorganisms = [
    'Pleurotus ostreatus',
    'Pleurotus pulmonarius',
    'Shiitake (Lentinula edodes)',
    'Reishi (Ganoderma lucidum)',
    'Lion\'s Mane (Hericium erinaceus)',
    'Oyster King (Pleurotus eryngii)',
    'Enoki (Flammulina velutipes)',
    'Maitake (Grifola frondosa)',
    'Otro (especificar en notas)',
  ];

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

    try {
      // Aquí iría la lógica para enviar los datos al sistema DataLab
      console.log('Datos de inoculación:', formData);
      
      // Simular una llamada API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmitStatus('success');
      
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
      
    } catch (error) {
      console.error('Error al registrar la inoculación:', error);
      setSubmitStatus('error');
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Formulario de Inoculación de Hongos
              </h1>
              <p className="text-gray-600 mt-1">
                Sistema DataLab - Centro de Investigación Regenerativa (CIR)
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Código de Lote</div>
              <div className="text-lg font-mono font-bold text-blue-600">
                {generateBatchCode()}
              </div>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {submitStatus === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800 font-medium">
                Inoculación registrada exitosamente en el sistema DataLab
              </span>
            </div>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800 font-medium">
                Error al registrar la inoculación. Intente nuevamente.
              </span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cantidad de Bolsas */}
            <div>
              <label htmlFor="bagQuantity" className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                placeholder="Ej: 25"
              />
            </div>

            {/* Microorganismo */}
            <div>
              <label htmlFor="microorganism" className="block text-sm font-medium text-gray-700 mb-2">
                Microorganismo *
              </label>
              <select
                id="microorganism"
                name="microorganism"
                required
                value={formData.microorganism}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
              >
                <option value="">Seleccionar microorganismo</option>
                {microorganisms.map((organism) => (
                  <option key={organism} value={organism}>
                    {organism}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha de Inoculación */}
            <div>
              <label htmlFor="inoculationDate" className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Inoculación *
              </label>
              <input
                type="date"
                id="inoculationDate"
                name="inoculationDate"
                required
                value={formData.inoculationDate}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
              />
            </div>

            {/* Investigador */}
            <div>
              <label htmlFor="researcher" className="block text-sm font-medium text-gray-700 mb-2">
                Investigador Responsable *
              </label>
              <input
                type="text"
                id="researcher"
                name="researcher"
                required
                value={formData.researcher}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                placeholder="Nombre del investigador"
              />
            </div>

            {/* Sustrato */}
            <div>
              <label htmlFor="substrate" className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Sustrato *
              </label>
              <select
                id="substrate"
                name="substrate"
                required
                value={formData.substrate}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
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
            <div>
              <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                placeholder="Ej: 24.5"
              />
            </div>

            {/* Humedad */}
            <div>
              <label htmlFor="humidity" className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                placeholder="Ej: 85.0"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="mt-6">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones y Notas
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 resize-none"
              placeholder="Observaciones adicionales, condiciones especiales, etc..."
            />
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200"
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
              Limpiar Formulario
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              } text-white`}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registrando...
                </div>
              ) : (
                'Registrar Inoculación'
              )}
            </button>
          </div>
        </form>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Este registro será integrado automáticamente al sistema de trazabilidad DataLab
          </p>
          <p>
            ID de Sesión: {new Date().getTime().toString(36)} | 
            Usuario: Sistema CIR | 
            Timestamp: {new Date().toISOString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MushroomInoculationForm;
