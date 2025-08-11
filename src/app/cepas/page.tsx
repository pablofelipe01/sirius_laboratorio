'use client';

import { useState } from 'react';
import CepasForm from '@/components/CepasForm';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function CepasPage() {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string | null>(null);

  const handleVolverAtras = () => {
    setTipoSeleccionado(null);
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
              🧬 REGISTRO DE CEPAS
            </h1>
            <p className="text-gray-600 mb-6">
              Selecciona el tipo de microorganismo para registrar las cepas
            </p>
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
                  Registrar cepas de microorganismos tipo hongo
                </p>
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-6 rounded-lg font-semibold group-hover:from-orange-600 group-hover:to-red-600 transition-all">
                  Seleccionar Hongos
                </div>
              </div>
            </div>

            {/* Opción Bacterias */}
            <div 
              onClick={() => setTipoSeleccionado('Bacteria')}
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
                  Registrar cepas de microorganismos tipo bacteria
                </p>
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-6 rounded-lg font-semibold group-hover:from-blue-600 group-hover:to-purple-600 transition-all">
                  Seleccionar Bacterias
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
                  El sistema filtrará automáticamente los microorganismos según el tipo seleccionado. 
                  Solo se mostrarán las cepas correspondientes al tipo elegido.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFormularioCepas = () => (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Botón para volver atrás */}
      <div className="pt-24 pb-4">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={handleVolverAtras}
              className="flex items-center text-white hover:text-gray-200 font-medium transition-colors mb-4 bg-black bg-opacity-30 px-4 py-2 rounded-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver a Selección de Tipo
            </button>
            
            {/* Header con tipo seleccionado */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex items-center justify-center">
                <div className="text-3xl mr-3">
                  {tipoSeleccionado === 'Hongo' ? '🍄' : '🦠'}
                </div>
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-800">
                    REGISTRO DE CEPAS - {tipoSeleccionado?.toUpperCase()}S
                  </h1>
                  <p className="text-gray-600">
                    Microorganismos de tipo: {tipoSeleccionado}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Formulario de cepas con filtro por tipo */}
      <CepasForm tipoMicroorganismo={tipoSeleccionado} />
    </div>
  );

  return (
    <>
      <Navbar />
      {!tipoSeleccionado ? renderSeleccionTipo() : renderFormularioCepas()}
      <Footer />
    </>
  );
}
