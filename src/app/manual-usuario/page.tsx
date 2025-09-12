'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function ManualUsuario() {
  // Estados para controlar la expansión de las secciones
  const [procesosExpanded, setProcesosExpanded] = useState(true);
  const [gestionExpanded, setGestionExpanded] = useState(true);
  
  useEffect(() => {
    const handleAnchorClick = (e: Event) => {
      const target = e.target as HTMLAnchorElement;
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        const targetId = target.getAttribute('href')?.substring(1);
        const targetElement = document.getElementById(targetId || '');
        if (targetElement) {
          const offsetTop = targetElement.offsetTop - 80; // 80px offset for navbar
          window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
          });
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);
  return (
    <div 
      className="min-h-screen relative pt-16"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('/DSC_3677_ddihxw.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Navbar */}
      <Navbar /><br /><br /><br />

      {/* Overlay para mejor legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8" style={{ scrollPaddingTop: '120px' }}>
        {/* Header Profesional */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 sm:p-6 mb-4 sm:mb-8 border border-white/20">
          <div className="flex items-center justify-center">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-[#0154AC] rounded-xl flex items-center justify-center mr-4">
                <span className="text-white font-bold text-2xl">📖</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                  Manual de Usuario
                </h1>
                <p className="text-sm sm:text-lg text-gray-600 flex items-center">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                  <span className="hidden sm:inline">Sistema DataLab - Sirius Regenerative Solutions S.A.S ZOMAC</span>
                  <span className="sm:hidden">Sistema DataLab - Sirius</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Índice */}
          <aside className="lg:w-80 flex-shrink-0">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sticky top-24 border border-white/20">
              <h2 className="text-lg font-semibold text-[#3C4858] mb-4 flex items-center">
                <span className="w-2 h-2 bg-[#0154AC] rounded-full mr-3"></span>
                Índice
              </h2>
              <nav className="space-y-2">
                <a
                  href="#instalacion"
                  className="block px-3 py-2 text-sm text-gray-600 hover:text-[#0154AC] hover:bg-blue-50 rounded-lg transition-colors duration-200"
                >
                  📥 Instalación
                </a>
                <a
                  href="#acceso"
                  className="block px-3 py-2 text-sm text-gray-600 hover:text-[#0154AC] hover:bg-blue-50 rounded-lg transition-colors duration-200"
                >
                  🔐 Acceso
                </a>
                <a
                  href="#navegacion"
                  className="block px-3 py-2 text-sm text-gray-600 hover:text-[#0154AC] hover:bg-blue-50 rounded-lg transition-colors duration-200"
                >
                  🧭 Navegación
                </a>
                <a
                  href="#reporte-problemas"
                  className="block px-3 py-2 text-sm text-gray-600 hover:text-[#0154AC] hover:bg-blue-50 rounded-lg transition-colors duration-200"
                >
                  🆘 Reporte de Problemas
                </a>
                <div className="pt-2">
                  <button
                    onClick={() => setProcesosExpanded(!procesosExpanded)}
                    className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-[#3C4858] uppercase tracking-wider hover:text-[#0154AC] transition-colors duration-200"
                  >
                    <span>Procesos</span>
                    <span className={`transform transition-transform duration-200 ${procesosExpanded ? 'rotate-90' : ''}`}>
                      ▶
                    </span>
                  </button>
                  <div className={`transition-all duration-300 overflow-hidden ${procesosExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <a
                      href="#procesos"
                      className="block px-3 py-2 text-sm text-gray-600 hover:text-[#0154AC] hover:bg-blue-50 rounded-lg transition-colors duration-200"
                    >
                      ⚗️ Procesos
                    </a>
                    <a
                      href="#inoculacion"
                      className="block px-3 py-2 text-sm text-gray-600 hover:text-[#0154AC] hover:bg-blue-50 rounded-lg transition-colors duration-200 ml-4"
                    >
                      📊 Inoculación
                    </a>
                    <a
                      href="#cepas"
                      className="block px-3 py-2 text-sm text-gray-600 hover:text-[#0154AC] hover:bg-blue-50 rounded-lg transition-colors duration-200 ml-4"
                    >
                      🦠 Cepas
                    </a>
                    <a
                      href="#cosecha"
                      className="block px-3 py-2 text-sm text-gray-600 hover:text-[#0154AC] hover:bg-blue-50 rounded-lg transition-colors duration-200 ml-4"
                    >
                      🧪 Cosecha
                    </a>
                    <a
                      href="#bacterias"
                      className="block px-3 py-2 text-sm text-gray-600 hover:text-[#0154AC] hover:bg-blue-50 rounded-lg transition-colors duration-200 ml-4"
                    >
                      🦠 Bacterias
                    </a>
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setGestionExpanded(!gestionExpanded)}
                    className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-[#3C4858] uppercase tracking-wider hover:text-[#0154AC] transition-colors duration-200"
                  >
                    <span>Gestión</span>
                    <span className={`transform transition-transform duration-200 ${gestionExpanded ? 'rotate-90' : ''}`}>
                      ▶
                    </span>
                  </button>
                  <div className={`transition-all duration-300 overflow-hidden ${gestionExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <a
                      href="#gestion"
                      className="block px-3 py-2 text-sm text-gray-600 hover:text-[#0154AC] hover:bg-blue-50 rounded-lg transition-colors duration-200"
                    >
                      📋 Gestión
                    </a>
                    <a
                      href="#almacenamiento"
                      className="block px-3 py-2 text-sm text-gray-600 hover:text-[#0154AC] hover:bg-blue-50 rounded-lg transition-colors duration-200 ml-4"
                    >
                      📦 Almacenamiento
                    </a>
                    <a
                      href="#descartes"
                      className="block px-3 py-2 text-sm text-gray-600 hover:text-[#0154AC] hover:bg-blue-50 rounded-lg transition-colors duration-200 ml-4"
                    >
                      🗑️ Descartes
                    </a>
                    <a
                      href="#stock-insumos"
                      className="block px-3 py-2 text-sm text-gray-600 hover:text-[#0154AC] hover:bg-blue-50 rounded-lg transition-colors duration-200 ml-4"
                    >
                      📋 Stock Insumos
                    </a>
                    <a
                      href="#clientes"
                      className="block px-3 py-2 text-sm text-gray-600 hover:text-[#0154AC] hover:bg-blue-50 rounded-lg transition-colors duration-200 ml-4"
                    >
                      🛒 Clientes
                    </a>
                    <a
                      href="#bitacora"
                      className="block px-3 py-2 text-sm text-gray-600 hover:text-[#0154AC] hover:bg-blue-50 rounded-lg transition-colors duration-200 ml-4"
                    >
                      📝 Bitácora
                    </a>
                  </div>
                </div>
                <a
                  href="#sirius"
                  className="block px-3 py-2 text-sm text-gray-600 hover:text-[#0154AC] hover:bg-blue-50 rounded-lg transition-colors duration-200"
                >
                  🤖 SIRIUS
                </a>
              </nav>
            </div>
          </aside>

          {/* Contenido Principal */}
          <main className="flex-1 space-y-6">
            {/* Instalación */}
            <section id="instalacion" className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-[#0154AC] rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-2xl">📥</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#3C4858]">Instalación</h2>
                  <p className="text-gray-600">Tutoriales paso a paso para instalar DataLab</p>
                </div>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                {/* Instalación en Móvil */}
                <div className="bg-gradient-to-br from-blue-50/90 to-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-100 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-[#0154AC] rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white text-lg">📱</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#3C4858]">Instalación en Móvil</h3>
                      <p className="text-sm text-gray-600">Para teléfonos y tablets</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <video
                      className="w-full h-64 rounded-lg shadow-md border border-gray-200 object-contain bg-gray-100"
                      controls
                      preload="metadata"
                    >
                      <source src="https://res.cloudinary.com/dvnuttrox/video/upload/v1757685047/Tutorial_Instalar_DataLab_-_Movil_tyygff.mp4" type="video/mp4" />
                      Tu navegador no soporta el elemento de video.
                    </video>
                  </div>

                </div>

                {/* Instalación en PC */}
                <div className="bg-gradient-to-br from-blue-50/90 to-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-100 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-[#0154AC] rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white text-lg">💻</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#3C4858]">Instalación en PC</h3>
                      <p className="text-sm text-gray-600">Para computadoras Windows</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <video
                      className="w-full h-64 rounded-lg shadow-md border border-gray-200 object-contain bg-gray-100"
                      controls
                      preload="metadata"
                    >
                      <source src="https://res.cloudinary.com/dvnuttrox/video/upload/v1757685139/Tutorial_Instalar_DataLab_-_PC_vt1sf7.mp4" type="video/mp4" />
                      Tu navegador no soporta el elemento de video.
                    </video>
                  </div>

                </div>
              </div>

              {/* Información adicional */}
              <div className="mt-8 bg-gray-50/90 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-sm">ℹ️</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#3C4858] mb-2">Información Importante</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Asegúrate de tener conexión a internet durante la instalación</li>
                      <li>• La aplicación requiere permisos de micrófono que debes conceder para que funcione adecuadamente</li>
                      <li>• Si tienes problemas, contacta al equipo de soporte</li>
                      <li>• Para tener acceso debes haber realizado previamente la solicitud de creación de perfil al equipo de tecnología</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Acceso */}
            <section id="acceso" className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-[#0154AC] rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-2xl">🔐</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#3C4858]">Acceso al Sistema</h2>
                  <p className="text-gray-600">Proceso de ingreso a la plataforma DataLab</p>
                </div>
              </div>

              {/* Explicación del proceso */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-6 h-6 bg-[#0154AC] text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">1</span>
                  Creación de Usuario
                </h3>
                <p className="text-gray-700 mb-4">
                  El ingeniero de desarrollo debe crear el usuario en el sistema usando su número de cédula.
                </p>

                <h3 className="text-lg font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-6 h-6 bg-[#0154AC] text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">2</span>
                  Acceso a la Aplicación
                </h3>
                <p className="text-gray-700 mb-4">
                  Una vez confirmado el usuario, diríjase a la aplicación.
                </p>
              </div>

              {/* Pasos para acceder */}
              <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-6 border border-gray-200 mb-8">
                <h3 className="text-lg font-semibold text-[#3C4858] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-white">📋</span>
                  Pasos para acceder
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-8 h-8 bg-[#0154AC] text-white rounded-full flex items-center justify-center text-sm font-medium mr-4 mt-0.5">1</span>
                    <div>
                      <p className="text-gray-700 font-medium">Botón de acceso</p>
                      <p className="text-gray-600 text-sm">En el landing page encontrará un botón que dice "Acceder a la plataforma". Haga clic ahí.</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-8 h-8 bg-[#0154AC] text-white rounded-full flex items-center justify-center text-sm font-medium mr-4 mt-0.5">2</span>
                    <div>
                      <p className="text-gray-700 font-medium">Ingrese su número de cédula</p>
                      <ul className="text-gray-600 text-sm mt-2 space-y-1 ml-4">
                        <li>• <strong>Primera vez:</strong> Aparecerá la opción de crear una nueva contraseña</li>
                        <li>• <strong>Usuario recurrente:</strong> Solo debe ingresar su contraseña</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-8 h-8 bg-[#0154AC] text-white rounded-full flex items-center justify-center text-sm font-medium mr-4 mt-0.5">3</span>
                    <div>
                      <p className="text-gray-700 font-medium">Cambio de contraseña</p>
                      <p className="text-gray-600 text-sm">Si necesita cambiar la contraseña, deberá acercarse al equipo de soporte.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Tutorial */}
              <div className="bg-gradient-to-br from-blue-50/90 to-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-100 p-6">
                <h3 className="text-lg font-semibold text-[#3C4858] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-white">🎥</span>
                  Video Tutorial
                </h3>

                <div className="mb-4">
                  <video
                    className="w-full h-64 rounded-lg shadow-md border border-gray-200 object-contain bg-gray-100"
                    controls
                    preload="metadata"
                  >
                    <source src="https://res.cloudinary.com/dvnuttrox/video/upload/v1757685119/Tutorial_Acceder_DataLab_-_PC_i96pwp.mp4" type="video/mp4" />
                    Tu navegador no soporta el elemento de video.
                  </video>
                </div>

                <p className="text-sm text-gray-600">
                  Siga los pasos mostrados en el video para completar el proceso de acceso.
                </p>
              </div>

              {/* Información adicional */}
              <div className="mt-8 bg-amber-50/90 backdrop-blur-sm rounded-lg p-6 border border-amber-200">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-sm">⚠️</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#3C4858] mb-2">¿Tiene problemas?</h4>
                    <p className="text-sm text-gray-700">
                      Si aparece algún error durante el proceso de acceso, comuníquese inmediatamente con el equipo de soporte técnico.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Navegación */}
            <section id="navegacion" className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-[#0154AC] rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-2xl">🧭</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#3C4858]">Navegación</h2>
                  <p className="text-gray-600">Menú principal y funciones de la aplicación</p>
                </div>
              </div>

              <div className="mb-8">
                <p className="text-gray-700 text-lg mb-6">
                  Cuando ingresa a la aplicación, el menú de opciones está en la parte superior. Estas son las categorías y funciones disponibles:
                </p>
              </div>

              {/* Procesos */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-white">⚗️</span>
                  Procesos
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-gradient-to-br from-blue-50/90 to-white/95 backdrop-blur-sm rounded-lg shadow-md border border-blue-100 p-4">
                    <div className="flex items-center mb-2">
                      <span className="text-lg mr-3">🧬</span>
                      <h4 className="font-semibold text-[#3C4858]">Inoculación</h4>
                    </div>
                    <p className="text-gray-700 text-sm">Registro de actividades de inoculación por el equipo de producción de biológicos.</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50/90 to-white/95 backdrop-blur-sm rounded-lg shadow-md border border-blue-100 p-4">
                    <div className="flex items-center mb-2">
                      <span className="text-lg mr-3">🧪</span>
                      <h4 className="font-semibold text-[#3C4858]">Cepas</h4>
                    </div>
                    <p className="text-gray-700 text-sm">Registro de actividades de inoculación de cepas.</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50/90 to-white/95 backdrop-blur-sm rounded-lg shadow-md border border-blue-100 p-4">
                    <div className="flex items-center mb-2">
                      <span className="text-lg mr-3">🌾</span>
                      <h4 className="font-semibold text-[#3C4858]">Cosecha</h4>
                    </div>
                    <p className="text-gray-700 text-sm">Formulario para registrar cosechas de manera eficiente.</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50/90 to-white/95 backdrop-blur-sm rounded-lg shadow-md border border-blue-100 p-4">
                    <div className="flex items-center mb-2">
                      <span className="text-lg mr-3">🦠</span>
                      <h4 className="font-semibold text-[#3C4858]">Bacterias</h4>
                    </div>
                    <p className="text-gray-700 text-sm">Panel de producción de bacterias.</p>
                  </div>
                </div>
              </div>

              {/* Gestión */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-white">📋</span>
                  Gestión
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-gradient-to-br from-green-50/90 to-white/95 backdrop-blur-sm rounded-lg shadow-md border border-green-100 p-4">
                    <div className="flex items-center mb-2">
                      <span className="text-lg mr-3">📦</span>
                      <h4 className="font-semibold text-[#3C4858]">Almacenamiento</h4>
                    </div>
                    <p className="text-gray-700 text-sm">Inventario en tiempo real de biológicos, hongos y bacterias, incluyendo refrigeradores y cuartos de incubación.</p>
                  </div>

                  <div className="bg-gradient-to-br from-red-50/90 to-white/95 backdrop-blur-sm rounded-lg shadow-md border border-red-100 p-4">
                    <div className="flex items-center mb-2">
                      <span className="text-lg mr-3">🗑️</span>
                      <h4 className="font-semibold text-[#3C4858]">Descartes</h4>
                    </div>
                    <p className="text-gray-700 text-sm">Registro de bolsas en mal estado (cepas y producción).</p>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-50/90 to-white/95 backdrop-blur-sm rounded-lg shadow-md border border-yellow-100 p-4">
                    <div className="flex items-center mb-2">
                      <span className="text-lg mr-3">📋</span>
                      <h4 className="font-semibold text-[#3C4858]">Stock Insumos</h4>
                    </div>
                    <p className="text-gray-700 text-sm">Inventario de insumos del laboratorio (ingresar, sacar y registrar insumos).</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50/90 to-white/95 backdrop-blur-sm rounded-lg shadow-md border border-purple-100 p-4">
                    <div className="flex items-center mb-2">
                      <span className="text-lg mr-3">🛒</span>
                      <h4 className="font-semibold text-[#3C4858]">Clientes</h4>
                    </div>
                    <p className="text-gray-700 text-sm">(En desarrollo)</p>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-50/90 to-white/95 backdrop-blur-sm rounded-lg shadow-md border border-indigo-100 p-4 md:col-span-2">
                    <div className="flex items-center mb-2">
                      <span className="text-lg mr-3">📝</span>
                      <h4 className="font-semibold text-[#3C4858]">Bitácora</h4>
                    </div>
                    <p className="text-gray-700 text-sm">Registro de anomalías durante la jornada laboral.</p>
                  </div>
                </div>
              </div>

              {/* Inteligencia Artificial */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-white">🤖</span>
                  Inteligencia Artificial
                </h3>

                <div className="bg-gradient-to-br from-purple-50/90 to-white/95 backdrop-blur-sm rounded-lg shadow-md border border-purple-100 p-4">
                  <div className="flex items-center mb-2">
                    <span className="text-lg mr-3">🤖</span>
                    <h4 className="font-semibold text-[#3C4858]">SIRIUS</h4>
                  </div>
                  <p className="text-gray-700 text-sm">Asistente conversacional enfocado en laboratorios.</p>
                </div>
              </div>

              {/* Centro de Ayuda */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-white">❓</span>
                  Centro de Ayuda
                </h3>

                <div className="bg-gradient-to-br from-orange-50/90 to-white/95 backdrop-blur-sm rounded-lg shadow-md border border-orange-100 p-4">
                  <div className="flex items-center mb-2">
                    <span className="text-lg mr-3">📖</span>
                    <h4 className="font-semibold text-[#3C4858]">Manual de Usuario</h4>
                  </div>
                  <p className="text-gray-700 text-sm">Capacitación para nuevos usuarios de la plataforma DataLab.</p>
                </div>
              </div>

              {/* Video Tutorial de Navegación */}
              <div className="bg-gradient-to-br from-gray-50/90 to-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-[#3C4858] mb-6 flex items-center">
                  <span className="w-8 h-8 bg-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-white">🎥</span>
                  Video Tutorial de Navegación
                </h3>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Video Móvil */}
                  <div>
                    <h4 className="font-semibold text-[#3C4858] mb-3 flex items-center">
                      <span className="w-6 h-6 bg-[#0154AC] rounded-lg flex items-center justify-center mr-2 text-white text-sm">📱</span>
                      Navegación Móvil
                    </h4>
                    <video
                      className="w-full h-48 rounded-lg shadow-md border border-gray-200 object-contain bg-gray-100"
                      controls
                      preload="metadata"
                    >
                      <source src="https://res.cloudinary.com/dvnuttrox/video/upload/v1757685054/Navegacion_DataLab_-_Movil_vcgcnb.mp4" type="video/mp4" />
                      Tu navegador no soporta el elemento de video.
                    </video>
                  </div>

                  {/* Video PC */}
                  <div>
                    <h4 className="font-semibold text-[#3C4858] mb-3 flex items-center">
                      <span className="w-6 h-6 bg-[#0154AC] rounded-lg flex items-center justify-center mr-2 text-white text-sm">💻</span>
                      Navegación PC
                    </h4>
                    <video
                      className="w-full h-48 rounded-lg shadow-md border border-gray-200 object-contain bg-gray-100"
                      controls
                      preload="metadata"
                    >
                      <source src="https://res.cloudinary.com/dvnuttrox/video/upload/v1757685091/Navegacion_DataLab_-_PC_xbjr0l.mp4" type="video/mp4" />
                      Tu navegador no soporta el elemento de video.
                    </video>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mt-4">
                  Vea estos tutoriales para aprender a navegar eficientemente por todas las secciones de la aplicación.
                </p>
              </div>
            </section>

            {/* Reporte de Problemas */}
            <section id="reporte-problemas" className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-[#0154AC] rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-2xl">🆘</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#3C4858]">Reporte de Problemas</h2>
                  <p className="text-gray-600">Cómo reportar incidencias</p>
                </div>
              </div>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 mb-4">Si encuentra un problema:</p>
                <ol className="space-y-3">
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#0154AC] text-white rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">1</span>
                    <span className="text-gray-700">Describa el error en el formulario de soporte.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#0154AC] text-white rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">2</span>
                    <span className="text-gray-700">Incluya capturas de pantalla si es posible.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#0154AC] text-white rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">3</span>
                    <span className="text-gray-700">Envíe el reporte al equipo técnico.</span>
                  </li>
                </ol>
              </div>
            </section>

            {/* Procesos */}
            <section id="procesos" className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-[#0154AC] rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-2xl">⚗️</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#3C4858]">Procesos</h2>
                  <p className="text-gray-600">Funciones principales del laboratorio</p>
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-[#3C4858] mb-3 flex items-center">
                    <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">📊</span>
                    Inoculación
                  </h3>
                  <p className="text-gray-700">Registre y gestione inoculaciones. Seleccione cepa, ingrese datos y confirme.</p>
                </div>
                <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-[#3C4858] mb-3 flex items-center">
                    <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🧬</span>
                    Cepas
                  </h3>
                  <p className="text-gray-700">Administre cepas disponibles. Agregue nuevas o edite existentes.</p>
                </div>
                <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-[#3C4858] mb-3 flex items-center">
                    <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🧪</span>
                    Cosecha
                  </h3>
                  <p className="text-gray-700">Registre cosechas. Ingrese cantidades y fechas.</p>
                </div>
                <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-[#3C4858] mb-3 flex items-center">
                    <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🦠</span>
                    Bacterias
                  </h3>
                  <p className="text-gray-700">Monitoree y actualice datos de bacterias.</p>
                </div>
              </div>
            </section>

            {/* Inoculación */}
            <section id="inoculacion" className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-[#0154AC] rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-2xl">🧬</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#3C4858]">Inoculación</h2>
                  <p className="text-gray-600">Registro digital para preparar bolsas de sustrato con hongos</p>
                </div>
              </div>

              {/* ¿Qué es este formulario? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">📊</span>
                  ¿Qué es este formulario?
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Es un registro digital que reemplaza el papel para preparar bolsas de sustrato con hongos. Te ayuda a organizar todo el proceso de manera clara y sin errores.
                </p>
              </div>

              {/* ¿Cómo lo usas paso a paso? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🧪</span>
                  ¿Cómo lo usas paso a paso?
                </h3>
                <ol className="list-decimal list-inside space-y-3 text-gray-700">
                  <li><strong>Eliges la fecha en el calendario:</strong> Selecciona la fecha deseada (aparece en azul para que sea fácil de ver).</li>
                  <li><strong>Seleccionas el tipo de hongo:</strong> Elige de una lista desplegable el hongo que vas a usar.</li>
                  <li><strong>Agregas cepas:</strong> Debes agregar al menos una cepa (el sistema te avisa si olvidas esto).</li>
                  <li><strong>Seleccionas responsables:</strong> Elige quiénes del equipo van a hacer el trabajo.</li>
                  <li><strong>Ingresas la cantidad de bolsas:</strong> Escribe cuántas bolsas necesitas preparar.</li>
                  <li><strong>Revisas y confirmas:</strong> El sistema crea automáticamente una "receta" con todos los materiales que necesitas.</li>
                </ol>
              </div>

              {/* ¿Qué pasa cuando lo envías? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">✅</span>
                  ¿Qué pasa cuando lo envías?
                </h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Guarda toda la información en la base de datos para tener un registro claro.</li>
                  <li>Descuenta automáticamente los materiales y cepas que usaste.</li>
                  <li>Si algo sale mal, el sistema deshace todo y te muestra un mensaje de error en rojo.</li>
                  <li>Si todo está bien, ves un mensaje verde confirmando que se guardó correctamente.</li>
                </ul>
              </div>

              {/* ¿Por qué es útil? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">💡</span>
                  ¿Por qué es útil?
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Evita errores al calcular automáticamente los materiales necesarios, mantiene registros claros y fáciles de entender, y hace que todo el proceso sea más rápido y confiable.
                </p>
              </div>

              {/* Ejemplos de uso */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-6 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🎥</span>
                  Ejemplos en video
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Video correcto */}
                  <div className="bg-gradient-to-br from-green-50/90 to-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-green-100 p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-white text-lg">✅</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-[#3C4858]">Uso Correcto</h4>
                        <p className="text-sm text-gray-600">Cómo llenar el formulario correctamente</p>
                      </div>
                    </div>
                    <video
                      className="w-full h-64 rounded-lg shadow-md border border-gray-200 object-contain bg-gray-100"
                      controls
                      preload="metadata"
                    >
                      <source src="https://res.cloudinary.com/dvnuttrox/video/upload/v1757685183/Correcto_Inoculacion_DataLab_-_PC_a34m9g.mp4" type="video/mp4" />
                      Tu navegador no soporta el elemento de video.
                    </video>
                  </div>

                  {/* Video incorrecto */}
                  <div className="bg-gradient-to-br from-red-50/90 to-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-red-100 p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-white text-lg">❌</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-[#3C4858]">Errores Comunes</h4>
                        <p className="text-sm text-gray-600">Qué no hacer al llenar el formulario</p>
                      </div>
                    </div>
                    <video
                      className="w-full h-64 rounded-lg shadow-md border border-gray-200 object-contain bg-gray-100"
                      controls
                      preload="metadata"
                    >
                      <source src="https://res.cloudinary.com/dvnuttrox/video/upload/v1757685136/Incorrecto_Inoculacion_DataLab_-_PC_crjohr.mp4" type="video/mp4" />
                      Tu navegador no soporta el elemento de video.
                    </video>
                  </div>
                </div>
              </div>
            </section>

            {/* Cepas */}
            <section id="cepas" className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-[#0154AC] rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-2xl">🦠</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#3C4858]">Cepas</h2>
                  <p className="text-gray-600">Registro digital de cepas de hongos y bacterias</p>
                </div>
              </div>

              {/* ¿Qué hace esta página? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">📊</span>
                  ¿Qué hace esta página?
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Es un formulario digital que permite registrar nuevas cepas en el laboratorio, tanto hongos como bacterias. Es la versión moderna de los registros en papel, con validaciones automáticas y campos obligatorios.
                </p>
              </div>

              {/* ¿Cómo usarla correctamente (paso a paso)? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🧬</span>
                  ¿Cómo usarla correctamente (paso a paso)?
                </h3>
                <ol className="list-decimal list-inside space-y-3 text-gray-700">
                  <li><strong>📅 Selecciona la fecha de creación:</strong> Usa el calendario para elegir el día en que se produjo o llegó la cepa al laboratorio. Ejemplo: Si llegó ayer, selecciona esa fecha exacta.</li>
                  <li><strong>🔬 Elige el tipo de registro:</strong> Opciones disponibles: 🧬 Cepa producida por inoculación, 🛒 Cepa adquirida por compra, 📦 Cepa convertida desde lote de producción. Selecciona según el origen de la cepa.</li>
                  <li><strong>🦠 Selecciona el microorganismo:</strong> El sistema te muestra automáticamente solo hongos o bacterias según lo que elegiste antes.</li>
                  <li><strong>👥 Selecciona responsables:</strong> Marca las personas del equipo que participaron. Puedes elegir varios manteniendo presionado Ctrl (o Cmd en Mac).</li>
                  <li><strong>📊 Ingresa la cantidad de bolsas:</strong> Escribe cuántas unidades de la cepa estás registrando. Nota: Si es conversión de lote, se calcula automáticamente.</li>
                </ol>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-[#0154AC] mb-2">Campos adicionales para conversión de lotes:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li>Seleccionar el lote a convertir (solo los que estén en incubación).</li>
                    <li>Confirmar la cantidad de bolsas a convertir.</li>
                  </ul>
                </div>
              </div>

              {/* ¿Qué pasa al registrar? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">✅</span>
                  ¿Qué pasa al registrar?
                </h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>El sistema guarda los datos en la base de datos.</li>
                  <li>Descuenta automáticamente insumos o lotes según el caso.</li>
                  <li>Muestra una ventana de confirmación con: fecha, microorganismo, responsables, cantidad y advertencias.</li>
                </ul>
              </div>

              {/* Mensajes del sistema */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">💬</span>
                  Mensajes del sistema
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-2">✅</span>
                      <span className="font-semibold text-green-800">Verde</span>
                    </div>
                    <p className="text-green-700">Si todo salió bien.</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-2">❌</span>
                      <span className="font-semibold text-red-800">Rojo</span>
                    </div>
                    <p className="text-red-700">Si hubo un error, explicando qué falta o qué pasó.</p>
                  </div>
                </div>
              </div>

              {/* ¿Por qué es útil? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">💡</span>
                  ¿Por qué es útil?
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Permite un control organizado de todas las cepas, evita errores manuales, mantiene un historial confiable y asegura que los recursos del laboratorio se descuenten de manera automática y transparente.
                </p>
              </div>

              {/* Ejemplos en video */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-6 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🎥</span>
                  Ejemplos en video
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Video correcto */}
                  <div className="bg-gradient-to-br from-green-50/90 to-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-green-100 p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-white text-lg">✅</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-[#3C4858]">Uso Correcto</h4>
                        <p className="text-sm text-gray-600">Cómo registrar cepas correctamente</p>
                      </div>
                    </div>
                    <video
                      className="w-full h-64 rounded-lg shadow-md border border-gray-200 object-contain bg-gray-100"
                      controls
                      preload="metadata"
                    >
                      <source src="https://res.cloudinary.com/dvnuttrox/video/upload/v1757686756/V%C3%ADdeo_sin_t%C3%ADtulo_Hecho_con_Clipchamp_hcnzmv.mp4" type="video/mp4" />
                      Tu navegador no soporta el elemento de video.
                    </video>
                  </div>

                  {/* Video incorrecto */}
                  <div className="bg-gradient-to-br from-red-50/90 to-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-red-100 p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-white text-lg">❌</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-[#3C4858]">Errores Comunes</h4>
                        <p className="text-sm text-gray-600">Qué no hacer al registrar cepas</p>
                      </div>
                    </div>
                    <video
                      className="w-full h-64 rounded-lg shadow-md border border-gray-200 object-contain bg-gray-100"
                      controls
                      preload="metadata"
                    >
                      <source src="https://res.cloudinary.com/dvnuttrox/video/upload/v1757685163/Incorrecto_Cepas_DataLab_-_PC_jza9pt.mp4" type="video/mp4" />
                      Tu navegador no soporta el elemento de video.
                    </video>
                  </div>
                </div>
              </div>
            </section>

            {/* Cosecha */}
            <section id="cosecha" className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-[#0154AC] rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-2xl">🧪</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#3C4858]">Cosecha</h2>
                  <p className="text-gray-600">Registro digital para cosechas de hongos en el laboratorio</p>
                </div>
              </div>

              {/* ¿Qué es este formulario? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">📋</span>
                  ¿Qué es este formulario?
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Es la pantalla donde registras toda la información necesaria de un proceso de cosecha: tiempos, cliente, microorganismo, cantidades, lotes, cepas y responsables. Digitaliza el proceso y asegura validaciones automáticas.
                </p>
              </div>

              {/* ¿Cómo usarla correctamente (paso a paso)? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🧪</span>
                  ¿Cómo usarla correctamente (paso a paso)?
                </h3>
                <ol className="list-decimal list-inside space-y-3 text-gray-700">
                  <li><strong>⏱️ Información General:</strong> Hora de inicio (campo obligatorio). Hora de fin (campo obligatorio). Propósito: medir duración y productividad.</li>
                  <li><strong>🧑‍🤝‍🧑 Información del Cliente:</strong> Selecciona un cliente de la lista. Si no existe, elige ➕ Crear nuevo cliente e ingresa nombre y NIT. El sistema lo registrará automáticamente para futuros usos.</li>
                  <li><strong>🍄 Información del Hongo:</strong> Selecciona el hongo a cosechar. Automáticamente se cargan lotes y cepas disponibles. Si no hay disponibilidad, se muestra un mensaje informativo.</li>
                  <li><strong>💧 Datos de Cosecha:</strong> Ingresa cantidad de litros cosechados (obligatorio). El sistema calcula automáticamente el equivalente en bidones de 20L (solo lectura).</li>
                  <li><strong>🧪 Lotes de Inoculación:</strong> Aparecen dinámicamente tras elegir hongo. Selecciona un lote con código, cantidades y fecha. Ingresa la cantidad a cosechar sin exceder lo disponible. Puedes elegir múltiples lotes, con opción de eliminar.</li>
                  <li><strong>🧬 Cepas Disponibles:</strong> Similar a los lotes, pero registrando variedades específicas de hongos. Selecciona una o varias cepas y asigna cantidades válidas.</li>
                  <li><strong>👤 Responsable de Cosecha:</strong> Selecciona el responsable del equipo que realizó o supervisó el proceso.</li>
                  <li><strong>📋 Registro de la Cosecha:</strong> Haz clic en "Registrar Cosecha". Validaciones automáticas aseguran que todos los campos obligatorios estén completos. El sistema muestra estados claros: ✅ Verde: éxito y reinicio automático del formulario. ❌ Rojo: error con detalles. ⏳ Cargando: "Registrando..." mientras procesa.</li>
                </ol>
              </div>

              {/* ¿Por qué es útil? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">💡</span>
                  ¿Por qué es útil?
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Asegura trazabilidad completa de cada cosecha, evita errores de registro, facilita cálculos automáticos (bidones y materiales), mantiene un historial confiable y organiza la información para análisis de productividad y logística.
                </p>
              </div>

              {/* Ejemplo en video */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-6 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🎥</span>
                  Ejemplo en video
                </h3>
                <div className="bg-gradient-to-br from-blue-50/90 to-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-100 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-[#0154AC] rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white text-lg">📹</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-[#3C4858]">Video Tutorial de Cosecha</h4>
                      <p className="text-sm text-gray-600">Cómo registrar una cosecha correctamente</p>
                    </div>
                  </div>
                  <video
                    className="w-full h-64 rounded-lg shadow-md border border-gray-200 object-contain bg-gray-100"
                    controls
                    preload="metadata"
                  >
                    <source src="https://res.cloudinary.com/dvnuttrox/video/upload/v1757689765/Correcto_Cosecha_DataLab_PC_otmdhg.mp4" type="video/mp4" />
                    Tu navegador no soporta el elemento de video.
                  </video>
                </div>
              </div>
            </section>

            {/* Bacterias */}
            <section id="bacterias" className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-[#0154AC] rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-2xl">🦠</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#3C4858]">Bacterias</h2>
                  <p className="text-gray-600">Actualizado al September 12, 2025</p>
                </div>
              </div>

              {/* Advertencia de desarrollo */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">⚠️</span>
                  <div>
                    <h3 className="font-semibold text-yellow-800">Esta sección está en desarrollo</h3>
                    <p className="text-yellow-700 text-sm">El proceso aún falta por definirse completamente.</p>
                  </div>
                </div>
              </div>

              {/* Introducción */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">📊</span>
                  Introducción
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Esta página funciona como menú principal de bacterias disponibles en el laboratorio y se conecta en tiempo real con la base de datos (Airtable). Permite gestionar la producción de diferentes tipos de bacterias de manera eficiente y organizada.
                </p>
              </div>

              {/* Estructura de la página */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🏗️</span>
                  Estructura de la página
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-[#3C4858] mb-2 flex items-center">
                      <span className="w-6 h-6 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-2 text-sm">📋</span>
                      Vista general
                    </h4>
                    <p className="text-gray-700 text-sm">Cuadrícula de tarjetas con bacterias disponibles, mostrando información clave de cada una.</p>
                  </div>

                  <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-[#3C4858] mb-2 flex items-center">
                      <span className="w-6 h-6 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-2 text-sm">📝</span>
                      Formularios emergentes
                    </h4>
                    <p className="text-gray-700 text-sm">Configuración y confirmación de producción con validaciones automáticas.</p>
                  </div>
                </div>
              </div>

              {/* Tipos de bacterias documentados */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🧫</span>
                  Tipos de bacterias documentados
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-[#3C4858] mb-2 flex items-center">
                      <span className="text-lg mr-2">🦠</span>
                      Bacillus thuringiensis
                    </h4>
                    <p className="text-gray-700 text-sm">Fórmula con insumos específicos para producción controlada.</p>
                  </div>

                  <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-[#3C4858] mb-2 flex items-center">
                      <span className="text-lg mr-2">🌱</span>
                      SiriusBacter
                    </h4>
                    <p className="text-gray-700 text-sm">Mezcla de PseudoMonas, AzosPirillum y AzotoBacter. Proceso de 6 etapas inteligente.</p>
                  </div>

                  <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-[#3C4858] mb-2 flex items-center">
                      <span className="text-lg mr-2">🧬</span>
                      Bacterias individuales
                    </h4>
                    <p className="text-gray-700 text-sm">PseudoMonas, AzosPirillum, AzotoBacter disponibles por separado.</p>
                  </div>

                  <div className="bg-yellow-50/90 backdrop-blur-sm rounded-lg p-4 border border-yellow-200">
                    <h4 className="font-semibold text-yellow-800 mb-2 flex items-center">
                      <span className="text-lg mr-2">🚧</span>
                      Bacillus subtilis
                    </h4>
                    <p className="text-yellow-700 text-sm">En desarrollo, aún no habilitada para producción.</p>
                  </div>
                </div>
              </div>

              {/* Cómo usar la página */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">📋</span>
                  Cómo usar la página (paso a paso)
                </h3>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2">
                    <li><strong>👀 Visualizar bacterias disponibles:</strong> Revisa la cuadrícula de tarjetas para ver qué bacterias están listas para producción.</li>
                    <li><strong>🎯 Seleccionar acción:</strong> Elige entre producción rápida (automática) o personalizada (configuración manual).</li>
                    <li><strong>⚙️ Revisar y confirmar detalles:</strong> Verifica insumos necesarios, cantidades y parámetros antes de proceder.</li>
                    <li><strong>▶️ Inicio del proceso:</strong> Confirma para crear registros y actualizar automáticamente el inventario.</li>
                  </ol>
                </div>
              </div>

              {/* Características destacadas */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">⭐</span>
                  Características destacadas
                </h3>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">🧮</span>
                    <div>
                      <span className="font-medium text-[#0154AC]">Cálculos automáticos de insumos</span>
                      <p className="text-sm text-gray-600">Ej. fórmula precisa de Bacillus thuringiensis.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-lg">🤖</span>
                    <div>
                      <span className="font-medium text-[#0154AC]">Proceso inteligente de SiriusBacter</span>
                      <p className="text-sm text-gray-600">6 etapas automatizadas para mezcla perfecta.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-lg">📊</span>
                    <div>
                      <span className="font-medium text-[#0154AC]">Mensajes claros con estados visuales</span>
                      <p className="text-sm text-gray-600">✅ Verde para éxito, ❌ Rojo para errores, ⏳ Amarillo para procesos en curso.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-lg">🔗</span>
                    <div>
                      <span className="font-medium text-[#0154AC]">Integración completa</span>
                      <p className="text-sm text-gray-600">Conectado con inventario, equipo y registros de laboratorio.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Consejos prácticos */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">💡</span>
                  Consejos prácticos
                </h3>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
                    <li><strong>Revisar insumos antes de producir:</strong> Asegúrate de tener todos los materiales necesarios disponibles.</li>
                    <li><strong>Confirmar disponibilidad de bacterias base:</strong> Para SiriusBacter, verifica que PseudoMonas, AzosPirillum y AzotoBacter estén en stock.</li>
                    <li><strong>Aprovechar entrada por voz:</strong> Usa el micrófono para agregar observaciones de manera rápida.</li>
                    <li><strong>Verificar mensajes de error:</strong> Si algo falla, revisa los detalles en rojo para corregir el problema.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Gestión */}
            <section id="gestion" className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-[#0154AC] rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-2xl">📋</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#3C4858]">Gestión</h2>
                  <p className="text-gray-600">Herramientas de administración</p>
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-[#3C4858] mb-3 flex items-center">
                    <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">📦</span>
                    Almacenamiento
                  </h3>
                  <p className="text-gray-700">Gestiona el almacenamiento de muestras. Registra entradas y salidas.</p>
                </div>
                <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-[#3C4858] mb-3 flex items-center">
                    <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🗑️</span>
                    Descartes
                  </h3>
                  <p className="text-gray-700">Registra descartes de materiales. Documenta razones.</p>
                </div>
                <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-[#3C4858] mb-3 flex items-center">
                    <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">📋</span>
                    Stock Insumos
                  </h3>
                  <p className="text-gray-700">Controla inventario de insumos. Actualiza niveles.</p>
                </div>
                <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-[#3C4858] mb-3 flex items-center">
                    <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🛒</span>
                    Clientes
                  </h3>
                  <p className="text-gray-700">Administra información de clientes. Agrega o edita datos.</p>
                </div>
                <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-6 border border-gray-200 md:col-span-2">
                  <h3 className="text-lg font-semibold text-[#3C4858] mb-3 flex items-center">
                    <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">📝</span>
                    Bitácora
                  </h3>
                  <p className="text-gray-700">Registra actividades diarias. Consulta historial.</p>
                </div>
              </div>
            </section>

            {/* Almacenamiento */}
            <section id="almacenamiento" className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-[#0154AC] rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-2xl">📦</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#3C4858]">Almacenamiento</h2>
                  <p className="text-gray-600">Gestión del inventario de muestras biológicas</p>
                </div>
              </div>

              {/* ¿Qué es la página de Almacenamiento? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🤔</span>
                  ¿Qué es la página de Almacenamiento?
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Imagina que tienes un gran refrigerador industrial donde guardas todos tus microorganismos (hongos y bacterias) después de cultivarlos. Esta página es como el "inventario inteligente" de ese refrigerador. Te muestra exactamente qué tienes, dónde está cada cosa, y en qué estado se encuentra.
                </p>
              </div>

              {/* ¿Para qué sirve? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🎯</span>
                  ¿Para qué sirve?
                </h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Esta página sirve principalmente para <strong>tres cosas importantes</strong>:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li><strong>Saber qué tienes disponible para vender</strong> - Antes de que un cliente pida algo, puedes ver exactamente cuánto hay de cada microorganismo.</li>
                  <li><strong>Controlar el proceso de maduración</strong> - Los microorganismos pasan por etapas (incubación, refrigeración, fermentación) y aquí ves cuándo están listos.</li>
                  <li><strong>Organizar el trabajo diario</strong> - Muestra qué lotes necesitan atención, cuáles están listos y cuáles deben moverse de lugar.</li>
                </ul>
              </div>

              {/* Cómo funciona paso a paso */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">📱</span>
                  Cómo funciona paso a paso
                </h3>

                {/* Paso 1 */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-[#3C4858] mb-3 flex items-center">
                    <span className="w-6 h-6 bg-[#0154AC] text-white rounded-full flex items-center justify-center mr-3 text-sm font-bold">1</span>
                    Elegir qué tipo de microorganismo quieres ver
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2 ml-9">
                    <div className="bg-orange-50/90 backdrop-blur-sm rounded-lg p-4 border border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🍄</span>
                        <h5 className="font-semibold text-orange-800">HONGOS</h5>
                      </div>
                      <p className="text-orange-700 text-sm">Setas, champiñones, etc.</p>
                    </div>
                    <div className="bg-purple-50/90 backdrop-blur-sm rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">�</span>
                        <h5 className="font-semibold text-purple-800">BACTERIAS</h5>
                      </div>
                      <p className="text-purple-700 text-sm">Para biocontrol</p>
                    </div>
                  </div>
                </div>

                {/* Paso 2 */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-[#3C4858] mb-3 flex items-center">
                    <span className="w-6 h-6 bg-[#0154AC] text-white rounded-full flex items-center justify-center mr-3 text-sm font-bold">2</span>
                    Ver el resumen de inventario
                  </h4>
                  <div className="ml-9">
                    <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <h5 className="font-semibold text-[#3C4858] mb-2">🍄 Hongos:</h5>
                          <ul className="text-sm text-gray-700 space-y-1">
                            <li>• Número de bolsas disponibles</li>
                            <li>• Litros equivalentes</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-semibold text-[#3C4858] mb-2">🦠 Bacterias:</h5>
                          <ul className="text-sm text-gray-700 space-y-1">
                            <li>• Litros en stock</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Paso 3 */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-[#3C4858] mb-3 flex items-center">
                    <span className="w-6 h-6 bg-[#0154AC] text-white rounded-full flex items-center justify-center mr-3 text-sm font-bold">3</span>
                    El dashboard principal
                  </h4>
                  <div className="ml-9 space-y-4">

                    {/* Si elegiste Hongos */}
                    <div className="bg-orange-50/90 backdrop-blur-sm rounded-lg p-4 border border-orange-200">
                      <h5 className="font-semibold text-orange-800 mb-3 flex items-center">
                        <span className="text-lg mr-2">🍄</span>
                        Si elegiste Hongos:
                      </h5>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="bg-white/90 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🌡️</span>
                            <h6 className="font-semibold text-green-800">Incubación</h6>
                          </div>
                          <ul className="text-sm text-gray-700 space-y-1">
                            <li>• Código del lote</li>
                            <li>• Tipo de hongo</li>
                            <li>• Número de bolsas</li>
                            <li>• Responsable</li>
                            <li>• Fecha de creación</li>
                          </ul>
                        </div>
                        <div className="bg-white/90 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">❄️</span>
                            <h6 className="font-semibold text-blue-800">Refrigeración</h6>
                          </div>
                          <p className="text-sm text-gray-700">Lotes maduros con botón "Ver Historial del Lote"</p>
                        </div>
                      </div>
                    </div>

                    {/* Si elegiste Bacterias */}
                    <div className="bg-purple-50/90 backdrop-blur-sm rounded-lg p-4 border border-purple-200">
                      <h5 className="font-semibold text-purple-800 mb-3 flex items-center">
                        <span className="text-lg mr-2">🦠</span>
                        Si elegiste Bacterias:
                      </h5>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="bg-white/90 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🧪</span>
                            <h6 className="font-semibold text-purple-800">Fermentación</h6>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">Muestra etapas de escalado:</p>
                          <div className="text-xs bg-purple-100 rounded p-2">
                            50ml → 250ml → 800ml → 12L → 100L
                          </div>
                        </div>
                        <div className="bg-white/90 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">✅</span>
                            <h6 className="font-semibold text-green-800">Disponibles</h6>
                          </div>
                          <p className="text-sm text-gray-700">Bacterias listas para usar o vender</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Funciones especiales */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🔍</span>
                  Funciones especiales
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-[#3C4858] mb-2 flex items-center">
                      <span className="text-lg mr-2">🎯</span>
                      Filtro por tipo específico
                    </h4>
                    <p className="text-gray-700 text-sm">Ver solo un hongo o bacteria concreta</p>
                  </div>
                 
                </div>
              </div>

              {/* Acciones que puedes hacer */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🎮</span>
                  Acciones que puedes hacer
                </h3>

                {/* Hongos */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-orange-800 mb-3 flex items-center">
                    <span className="text-lg mr-2">🍄</span>
                    Hongos:
                  </h4>
                  <div className="ml-9 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">❄️</span>
                      <span className="text-gray-700">Mover de incubación a refrigeración</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">📋</span>
                      <span className="text-gray-700">Ver detalles completos de un lote</span>
                    </div>
                  </div>
                </div>

                {/* Bacterias */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-purple-800 mb-3 flex items-center">
                    <span className="text-lg mr-2">🦠</span>
                    Bacterias:
                  </h4>
                  <div className="ml-9 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">🚀</span>
                      <span className="text-gray-700">Siguiente escalado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">�</span>
                      <span className="text-gray-700">Finalizar fermentación</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-600">📦</span>
                      <span className="text-gray-700">Empaquetar producto (ej. Bacillus thuringiensis)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Consejos útiles */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">💡</span>
                  Consejos útiles
                </h3>
                <div className="bg-yellow-50/90 backdrop-blur-sm rounded-lg p-4 border border-yellow-200">
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li><strong>🔄 Actualiza siempre el dashboard</strong> antes de decidir</li>
                    <li><strong>📊 Revisa estadísticas rápidas</strong> al inicio</li>
                    <li><strong>🎯 Usa filtros</strong> para ahorrar tiempo</li>
                    <li><strong>📖 Consulta historial</strong> antes de vender o usar un lote</li>
                  </ul>
                </div>
              </div>

              {/* Colores de estado */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🎨</span>
                  Colores de estado
                </h3>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="bg-green-50/90 backdrop-blur-sm rounded-lg p-3 border border-green-200 text-center">
                    <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-2"></div>
                    <p className="text-sm font-semibold text-green-800">Verde</p>
                    <p className="text-xs text-green-700">Incubación/Fermentación (creciendo)</p>
                  </div>
                  <div className="bg-blue-50/90 backdrop-blur-sm rounded-lg p-3 border border-blue-200 text-center">
                    <div className="w-4 h-4 bg-blue-500 rounded-full mx-auto mb-2"></div>
                    <p className="text-sm font-semibold text-blue-800">Azul</p>
                    <p className="text-xs text-blue-700">Refrigeración/Disponible (listo)</p>
                  </div>
                  <div className="bg-red-50/90 backdrop-blur-sm rounded-lg p-3 border border-red-200 text-center">
                    <div className="w-4 h-4 bg-red-500 rounded-full mx-auto mb-2"></div>
                    <p className="text-sm font-semibold text-red-800">Rojo</p>
                    <p className="text-xs text-red-700">Problema o alerta</p>
                  </div>
                </div>
              </div>

              {/* Video de navegación */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🎥</span>
                  Video de navegación de la página
                </h3>
                <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                  <video
                    className="w-full h-64 rounded-lg shadow-md border border-gray-200 object-contain bg-gray-100"
                    controls
                    preload="metadata"
                  >
                    <source src="https://res.cloudinary.com/dvnuttrox/video/upload/v1757692090/Grabaci%C3%B3n_de_pantalla_2025-09-12_104604_jbrunk.mp4" type="video/mp4" />
                    Tu navegador no soporta el elemento de video.
                  </video>
                  <p className="text-sm text-gray-600 mt-2 text-center">
                    Video tutorial completo de cómo navegar en la página de Almacenamiento
                  </p>
                </div>
              </div>
            </section>

            {/* Descartes */}
            <section id="descartes" className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-[#0154AC] rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-2xl">🗑️</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#3C4858]">Descartes</h2>
                  <p className="text-gray-600">Sistema de gestión de descartes de lotes</p>
                </div>
              </div>

              {/* Video demostrativo */}
              <div className="mb-8">
                <div className="bg-gradient-to-br from-blue-50/90 to-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-100 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-[#0154AC] rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white text-lg">🎥</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#3C4858]">Video demostrativo</h3>
                      <p className="text-sm text-gray-600">Tutorial completo de la sección Descartes</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <video
                      className="w-full h-64 rounded-lg shadow-md border border-gray-200 object-contain bg-gray-100"
                      controls
                      preload="metadata"
                    >
                      <source src="https://res.cloudinary.com/dvnuttrox/video/upload/v1757693601/Grabaci%C3%B3n_de_pantalla_2025-09-12_111130_pzqy4s.mp4" type="video/mp4" />
                      Tu navegador no soporta el elemento de video.
                    </video>
                  </div>
                </div>
              </div>

              {/* ¿Qué es? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">❓</span>
                  ¿Qué es?
                </h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Es una página completa de una aplicación web que permite registrar descartes de lotes de microorganismos en un sistema de laboratorio.
                  Se trata de un formulario interactivo con interfaz moderna, que gestiona el proceso completo de registro de descartes.
                </p>
              </div>

              {/* ¿Para qué funciona? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🔬</span>
                  ¿Para qué funciona?
                </h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Esta página está diseñada para gestionar el descarte controlado de lotes en un laboratorio de microbiología.
                  Permite a los usuarios registrar cuándo y por qué se desechan lotes de:
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-3">🧪</span>
                      <span className="font-semibold text-blue-900">Cepas madre</span>
                    </div>
                    <p className="text-sm text-blue-800">Cultivos originales de microorganismos</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-3">🍄</span>
                      <span className="font-semibold text-green-900">Lotes de producción</span>
                    </div>
                    <p className="text-sm text-green-800">Bolsas inoculadas listas para uso</p>
                  </div>
                </div>
              </div>

              {/* Funciones principales */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-6 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">⚙️</span>
                  Funciones principales
                </h3>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Selección de Tipo de Descarte */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-2 text-xs">🎯</span>
                      Selección de Tipo de Descarte
                    </h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Botones grandes con emojis intuitivos</li>
                      <li>• Opciones: Cepas madre o Lotes de Producción</li>
                      <li>• Interfaz visual clara y moderna</li>
                    </ul>
                  </div>

                  {/* Gestión de Microorganismos */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="w-6 h-6 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mr-2 text-xs">🔬</span>
                      Gestión de Microorganismos
                    </h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Carga automática desde el sistema</li>
                      <li>• Selector desplegable con estados de carga</li>
                      <li>• Mejor experiencia de usuario</li>
                    </ul>
                  </div>

                  {/* Selección de Lotes Disponibles */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mr-2 text-xs">📦</span>
                      Selección de Lotes Disponibles
                    </h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Carga dinámica según tipo y microorganismo</li>
                      <li>• Solo muestra lotes con cantidad disponible</li>
                      <li>• Información clara: código + cantidad</li>
                    </ul>
                  </div>

                  {/* Control de Cantidad */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center mr-2 text-xs">🔢</span>
                      Control de Cantidad
                    </h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Campo numérico con validaciones automáticas</li>
                      <li>• Límite máximo según disponibilidad real</li>
                      <li>• Prevención de valores inválidos</li>
                    </ul>
                  </div>

                  {/* Motivo del Descarte */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="w-6 h-6 bg-red-100 text-red-600 rounded-lg flex items-center justify-center mr-2 text-xs">🎤</span>
                      Motivo del Descarte
                    </h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Grabación de audio integrada</li>
                      <li>• Transcripción automática de voz</li>
                      <li>• Opción de escribir manualmente</li>
                      <li>• Campo obligatorio para trazabilidad</li>
                    </ul>
                  </div>

                  {/* Resumen y Validación */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="w-6 h-6 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center mr-2 text-xs">📋</span>
                      Resumen y Validación
                    </h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Muestra todos los datos antes de enviar</li>
                      <li>• Validaciones en tiempo real</li>
                      <li>• Mensajes de error claros y útiles</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Envío y Registro */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">📤</span>
                  Envío y Registro
                </h3>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-2">📊 Datos que se registran:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Tipo de descarte seleccionado</li>
                        <li>• Microorganismo específico</li>
                        <li>• Lote y cantidad exacta</li>
                        <li>• Motivo detallado del descarte</li>
                        <li>• Usuario que registra</li>
                        <li>• Fecha del registro</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-2">⚡ Acciones automáticas:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• ✅ Actualización automática de inventarios</li>
                        <li>• 📝 Generación de registro de trazabilidad</li>
                        <li>• 🔄 Refresco de cantidades disponibles</li>
                        <li>• 💬 Mensajes de éxito/error en pantalla</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Características Técnicas */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🔧</span>
                  Características Técnicas
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">⚛️ Tecnología</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Estados React avanzados</li>
                      <li>• useState y useEffect</li>
                      <li>• Interfaz moderna con Tailwind</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">🛡️ Seguridad</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Manejo robusto de errores</li>
                      <li>• Validaciones en tiempo real</li>
                      <li>• Control de permisos</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">🔗 Integración</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Contexto de autenticación</li>
                      <li>• Componentes compartidos</li>
                      <li>• APIs del sistema</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Flujo de Uso Típico */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-6 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">�</span>
                  Flujo de Uso Típico
                </h3>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">1️⃣</div>
                      <h4 className="font-semibold text-green-900 mb-2">Seleccionar Tipo</h4>
                      <p className="text-sm text-green-800">Elige entre cepas madre o lotes de producción</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">2️⃣</div>
                      <h4 className="font-semibold text-green-900 mb-2">Elegir Microorganismo</h4>
                      <p className="text-sm text-green-800">Selecciona de la lista cargada automáticamente</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">3️⃣</div>
                      <h4 className="font-semibold text-green-900 mb-2">Seleccionar Lote</h4>
                      <p className="text-sm text-green-800">Elige el lote disponible con cantidad suficiente</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">4️⃣</div>
                      <h4 className="font-semibold text-blue-900 mb-2">Ingresar Cantidad</h4>
                      <p className="text-sm text-blue-800">Especifica la cantidad con validación automática</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">5️⃣</div>
                      <h4 className="font-semibold text-blue-900 mb-2">Grabar Motivo</h4>
                      <p className="text-sm text-blue-800">Usa audio o escribe el motivo del descarte</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">6️⃣</div>
                      <h4 className="font-semibold text-purple-900 mb-2">Confirmar y Enviar</h4>
                      <p className="text-sm text-purple-800">Revisa el resumen y registra el descarte</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Stock Insumos */}
            <section id="stock-insumos" className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-[#0154AC] rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-2xl">📋</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#3C4858]">Stock Insumos</h2>
                  <p className="text-gray-600">Sistema de control de inventario de laboratorio</p>
                </div>
              </div>

              {/* Video demostrativo */}
              <div className="mb-8">
                <div className="bg-gradient-to-br from-blue-50/90 to-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-100 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-[#0154AC] rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white text-lg">🎥</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#3C4858]">Video demostrativo</h3>
                      <p className="text-sm text-gray-600">Tutorial completo de navegación en Stock de Insumos</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <video
                      className="w-full h-64 rounded-lg shadow-md border border-gray-200 object-contain bg-gray-100"
                      controls
                      preload="metadata"
                    >
                      <source src="https://res.cloudinary.com/dvnuttrox/video/upload/v1757697496/Navegacion_en_stock_de_insumos_ejj0uq.mp4" type="video/mp4" />
                      Tu navegador no soporta el elemento de video.
                    </video>
                  </div>
                </div>
              </div>

              {/* 🤔 ¿Qué es esta página? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🤔</span>
                  ¿Qué es esta página?
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Es como un <strong>almacén digital inteligente</strong> para tu laboratorio. Imagínate que tienes una bodega donde guardas todos los materiales, químicos, equipos y suministros que usas en el lab. Esta página es como tener un asistente que te ayuda a organizar todo eso de manera perfecta.
                </p>
              </div>

              {/* 🎯 ¿Para qué funciona? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🎯</span>
                  ¿Para qué funciona?
                </h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Esta página está hecha para <strong>controlar todo el inventario</strong> de tu laboratorio. Es como tener un registro digital de:
                </p>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <ul className="space-y-2 text-blue-800">
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Todos los insumos que tienes (químicos, materiales, equipos de protección, etc.)</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Cuánto tienes de cada cosa</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Cuándo entra nuevo material</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Cuándo sale material para usarse</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Fechas de vencimiento</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Quién registra cada movimiento</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* ⚙️ ¿Qué cosas hace esta página? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-6 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">⚙️</span>
                  ¿Qué cosas hace esta página?
                </h3>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* 1. Mostrar tu inventario completo */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5">
                    <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                      <span className="text-lg mr-2">1️⃣</span>
                      Mostrar tu inventario completo
                    </h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Te muestra una tabla con todos tus insumos</li>
                      <li>• Cada fila te dice: nombre, categoría, unidades, cuánto tienes, estado</li>
                      <li>• Los colores te ayudan: <span className="text-green-600 font-bold">verde = disponible</span>, <span className="text-red-600 font-bold">rojo = agotado</span></li>
                    </ul>
                  </div>

                  {/* 2. Buscar y filtrar */}
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-5">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                      <span className="text-lg mr-2">2️⃣</span>
                      Buscar y filtrar
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Puedes buscar por nombre, categoría o descripción</li>
                      <li>• Tiene un micrófono para buscar hablando (¡muy práctico!)</li>
                      <li>• Puedes filtrar por categorías específicas</li>
                    </ul>
                  </div>

                  {/* 3. Tres operaciones principales */}
                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-5 md:col-span-2">
                    <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
                      <span className="text-lg mr-2">3️⃣</span>
                      Tres operaciones principales
                    </h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="bg-white/80 rounded-lg p-3">
                        <h5 className="font-medium text-purple-900 mb-2 flex items-center">
                          <span className="text-base mr-2">📦</span>
                          Registrar nuevos insumos
                        </h5>
                        <ul className="text-xs text-purple-800 space-y-1">
                          <li>• Agregar materiales nuevos al inventario</li>
                          <li>• Pones nombre, categoría, unidades, descripción</li>
                          <li>• Puedes agregar varios insumos a la vez</li>
                        </ul>
                      </div>
                      <div className="bg-white/80 rounded-lg p-3">
                        <h5 className="font-medium text-purple-900 mb-2 flex items-center">
                          <span className="text-base mr-2">📤</span>
                          Sacar del inventario
                        </h5>
                        <ul className="text-xs text-purple-800 space-y-1">
                          <li>• Cuando usas materiales en tus experimentos</li>
                          <li>• Seleccionas qué insumo y cuánto vas a usar</li>
                          <li>• El sistema automáticamente descuenta del stock</li>
                        </ul>
                      </div>
                      <div className="bg-white/80 rounded-lg p-3">
                        <h5 className="font-medium text-purple-900 mb-2 flex items-center">
                          <span className="text-base mr-2">📥</span>
                          Recibir pedidos
                        </h5>
                        <ul className="text-xs text-purple-800 space-y-1">
                          <li>• Cuando llega nuevo material al laboratorio</li>
                          <li>• Registras qué llegó y cuánto</li>
                          <li>• Puedes poner fecha de vencimiento</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 📋 ¿Cómo usarla correctamente? Paso a paso: */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-6 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">📋</span>
                  ¿Cómo usarla correctamente? Paso a paso:
                </h3>

                <div className="space-y-6">
                  {/* Para ver tu inventario */}
                  <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-lg p-5">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="text-lg mr-2">👁️</span>
                      Para ver tu inventario:
                    </h4>
                    <ul className="text-sm text-gray-700 space-y-1 ml-6">
                      <li>• Entra a la página y verás todos tus insumos en una tabla</li>
                      <li>• Si quieres buscar algo específico, escribe en la barra de búsqueda o habla al micrófono</li>
                      <li>• Usa los botones de filtro para ver solo ciertas categorías</li>
                    </ul>
                  </div>

                  {/* Para agregar un insumo nuevo */}
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-5">
                    <h4 className="font-semibold text-emerald-900 mb-3 flex items-center">
                      <span className="text-lg mr-2">➕</span>
                      Para agregar un insumo nuevo:
                    </h4>
                    <ol className="text-sm text-emerald-800 space-y-2 ml-6">
                      <li><strong>Haz clic en "Registrar Insumo Nuevo"</strong></li>
                      <li><strong>Llena estos datos básicos:</strong></li>
                      <ul className="ml-6 space-y-1">
                        <li>• <strong>Nombre:</strong> Cómo se llama (ej: "Guantes de nitrilo")</li>
                        <li>• <strong>Categoría:</strong> Qué tipo es (ej: "Equipo de Protección Personal")</li>
                        <li>• <strong>Unidad:</strong> Cómo se mide (ej: "CAJA 100UND")</li>
                        <li>• <strong>Descripción:</strong> Detalles adicionales</li>
                        <li>• <strong>Cantidad inicial:</strong> Cuántos tienes ahora</li>
                      </ul>
                      <li><strong>Si quieres agregar más insumos, haz clic en "Agregar Otro Insumo"</strong></li>
                      <li><strong>Presiona "Crear Insumo" y listo</strong></li>
                    </ol>
                  </div>

                  {/* Para sacar material del inventario */}
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-5">
                    <h4 className="font-semibold text-orange-900 mb-3 flex items-center">
                      <span className="text-lg mr-2">📤</span>
                      Para sacar material del inventario:
                    </h4>
                    <ul className="text-sm text-orange-800 space-y-1 ml-6">
                      <li>• Haz clic en "Sacar de Inventario"</li>
                      <li>• Selecciona el insumo que vas a usar</li>
                      <li>• Elige de qué lote específico (si tienes varios)</li>
                      <li>• Escribe cuánto vas a usar</li>
                      <li>• Confirma y el sistema descontará automáticamente</li>
                    </ul>
                  </div>

                  {/* Para recibir un pedido nuevo */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                      <span className="text-lg mr-2">📥</span>
                      Para recibir un pedido nuevo:
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1 ml-6">
                      <li>• Haz clic en "Recibir Pedidos"</li>
                      <li>• Busca el insumo que llegó (puedes escribir o usar el micrófono)</li>
                      <li>• Escribe cuánto llegó</li>
                      <li>• Si tiene fecha de vencimiento, la agregas</li>
                      <li>• Confirma y se sumará a tu inventario</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 💡 Consejos importantes */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">💡</span>
                  Consejos importantes
                </h3>
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-5">
                  <ul className="space-y-3 text-yellow-800">
                    <li className="flex items-start space-x-2">
                      <span className="text-yellow-600 font-bold">✅</span>
                      <span><strong>Siempre verifica las cantidades</strong> antes de confirmar</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-yellow-600 font-bold">🎤</span>
                      <span><strong>Usa el micrófono</strong> para buscar más rápido</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-yellow-600 font-bold">📅</span>
                      <span><strong>Revisa las fechas de vencimiento</strong> cuando saques material</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-yellow-600 font-bold">❌</span>
                      <span><strong>Si algo sale mal, puedes cancelar</strong> cualquier operación</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-yellow-600 font-bold">🚨</span>
                      <span><strong>El sistema te avisa</strong> si intentas sacar más de lo que tienes</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 🎨 Características especiales */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🎨</span>
                  Características especiales
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">🟢</div>
                    <h4 className="font-semibold text-green-900 mb-1">Colores intuitivos</h4>
                    <p className="text-xs text-green-800">Verde para disponible, rojo para agotado</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">🎤</div>
                    <h4 className="font-semibold text-blue-900 mb-1">Búsqueda por voz</h4>
                    <p className="text-xs text-blue-800">Habla para encontrar lo que buscas</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">🎯</div>
                    <h4 className="font-semibold text-purple-900 mb-1">Filtros inteligentes</h4>
                    <p className="text-xs text-purple-800">Ve solo lo que necesitas</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">❓</div>
                    <h4 className="font-semibold text-orange-900 mb-1">Confirmaciones</h4>
                    <p className="text-xs text-orange-800">Siempre pregunta antes de hacer cambios</p>
                  </div>
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">💬</div>
                    <h4 className="font-semibold text-teal-900 mb-1">Mensajes claros</h4>
                    <p className="text-xs text-teal-800">Te dice exactamente qué está pasando</p>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">⚡</div>
                    <h4 className="font-semibold text-pink-900 mb-1">Actualización automática</h4>
                    <p className="text-xs text-pink-800">Los cambios se reflejan inmediatamente</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Clientes */}
            <section id="clientes" className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-[#0154AC] rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-2xl">🛒</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#3C4858]">Clientes</h2>
                  <p className="text-gray-600">Administración de información de clientes y pedidos</p>
                </div>
              </div>

              {/* Banner de desarrollo */}
              <div className="mb-8">
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-6 shadow-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">🚧</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-yellow-800 mb-2">
                        🔄 Sección en Desarrollo
                      </h3>
                      <p className="text-yellow-700 leading-relaxed">
                        Esta sección del módulo de Clientes está actualmente en desarrollo. 
                        Las funcionalidades descritas a continuación estarán disponibles próximamente. 
                        Te mantendremos informado sobre las actualizaciones.
                      </p>
                      <div className="mt-3 flex items-center space-x-2">
                        <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                        <span className="text-sm text-yellow-600 font-medium">Próximamente disponible</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ¿Qué es esta herramienta? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">📊</span>
                  ¿Qué es esta herramienta?
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Es un sistema completo para gestionar toda la información relacionada con los clientes del laboratorio. Permite mantener perfiles detallados, registrar pedidos, hacer seguimiento de entregas y mantener un historial completo de todas las transacciones comerciales.
                </p>
              </div>

              {/* Funcionalidades principales */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">👥</span>
                  Funcionalidades principales
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-[#3C4858] mb-2 flex items-center">
                      <span className="text-lg mr-2">📝</span>
                      Registro de clientes
                    </h4>
                    <p className="text-gray-700 text-sm">Crear y mantener perfiles completos de clientes con información de contacto, dirección y preferencias.</p>
                  </div>
                  <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-[#3C4858] mb-2 flex items-center">
                      <span className="text-lg mr-2">🛒</span>
                      Gestión de pedidos
                    </h4>
                    <p className="text-gray-700 text-sm">Registrar pedidos, especificar productos, cantidades y fechas de entrega.</p>
                  </div>
                  <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-[#3C4858] mb-2 flex items-center">
                      <span className="text-lg mr-2">🚚</span>
                      Seguimiento de entregas
                    </h4>
                    <p className="text-gray-700 text-sm">Monitorear el estado de los pedidos desde producción hasta entrega final.</p>
                  </div>
                  <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-[#3C4858] mb-2 flex items-center">
                      <span className="text-lg mr-2">📊</span>
                      Historial de transacciones
                    </h4>
                    <p className="text-gray-700 text-sm">Mantener registro completo de todas las compras, entregas y comunicaciones.</p>
                  </div>
                </div>
              </div>

              {/* ¿Cómo gestionar clientes efectivamente? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🎯</span>
                  ¿Cómo gestionar clientes efectivamente?
                </h3>
                <ol className="list-decimal list-inside space-y-3 text-gray-700">
                  <li><strong>📝 Completa perfiles de clientes:</strong> Registra toda la información relevante al crear un nuevo cliente.</li>
                  <li><strong>📞 Mantén comunicación activa:</strong> Actualiza datos de contacto y registra todas las interacciones.</li>
                  <li><strong>📋 Registra pedidos claramente:</strong> Especifica productos, cantidades, precios y fechas de entrega.</li>
                  <li><strong>🔍 Haz seguimiento continuo:</strong> Actualiza el estado de pedidos y notifica cambios importantes.</li>
                  <li><strong>📊 Revisa historial regularmente:</strong> Analiza patrones de compra para mejorar el servicio.</li>
                </ol>
              </div>

              {/* Importancia de la gestión de clientes */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">💡</span>
                  Importancia de la gestión de clientes
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Una buena gestión de clientes es fundamental para el éxito comercial del laboratorio. Permite mantener relaciones sólidas, anticipar necesidades, mejorar la satisfacción del cliente y optimizar los procesos de venta y entrega de productos biológicos.
                </p>
              </div>
            </section>

            {/* Bitácora */}
            <section id="bitacora" className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-[#0154AC] rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-2xl">📝</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#3C4858]">Bitácora</h2>
                  <p className="text-gray-600">Registro diario de actividades del laboratorio</p>
                </div>
              </div>

              {/* Videos demostrativos de uso correcto e incorrecto */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-6 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">🎥</span>
                  Videos demostrativos: Uso correcto vs incorrecto
                </h3>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Video de uso correcto */}
                  <div className="bg-gradient-to-br from-green-50/90 to-emerald-50/90 backdrop-blur-sm rounded-xl shadow-lg border border-green-200 p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-white text-lg">✅</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-green-900">Uso Correcto de la Bitácora</h4>
                        <p className="text-sm text-green-700">Cómo registrar actividades correctamente</p>
                      </div>
                    </div>
                    <div className="mb-4">
                      <video
                        className="w-full h-48 rounded-lg shadow-md border border-gray-200 object-contain bg-gray-100"
                        controls
                        preload="metadata"
                      >
                        <source src="https://res.cloudinary.com/dvnuttrox/video/upload/v1757697869/Correcto_Bitacora_DataLab_aw0pxg.mp4" type="video/mp4" />
                        Tu navegador no soporta el elemento de video.
                      </video>
                    </div>
                    <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                      <h5 className="text-sm font-semibold text-green-800 mb-1">💡 Lo que hace bien:</h5>
                      <ul className="text-xs text-green-700 space-y-1">
                        <li>• Registra inmediatamente después de actividades</li>
                        <li>• Describe con detalle qué se hizo</li>
                        <li>• Incluye datos específicos y mediciones</li>
                        <li>• Identifica responsables claramente</li>
                      </ul>
                    </div>
                  </div>

                  {/* Video de uso incorrecto */}
                  <div className="bg-gradient-to-br from-red-50/90 to-pink-50/90 backdrop-blur-sm rounded-xl shadow-lg border border-red-200 p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-white text-lg">❌</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-red-900">Uso Incorrecto de la Bitácora</h4>
                        <p className="text-sm text-red-700">Errores comunes que evitar</p>
                      </div>
                    </div>
                    <div className="mb-4">
                      <video
                        className="w-full h-48 rounded-lg shadow-md border border-gray-200 object-contain bg-gray-100"
                        controls
                        preload="metadata"
                      >
                        <source src="https://res.cloudinary.com/dvnuttrox/video/upload/v1757698009/Incorrecto_Bitacora_DataLab_ujtmmr.mp4" type="video/mp4" />
                        Tu navegador no soporta el elemento de video.
                      </video>
                    </div>
                    <div className="bg-red-100 border border-red-200 rounded-lg p-3">
                      <h5 className="text-sm font-semibold text-red-800 mb-1">⚠️ Errores comunes:</h5>
                      <ul className="text-xs text-red-700 space-y-1">
                        <li>• Registros tardíos o incompletos</li>
                        <li>• Descripciones vagas sin detalles</li>
                        <li>• Falta de datos específicos</li>
                        <li>• No identificar responsables</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Nota importante */}
                <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">📋</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 mb-1">Importante:</h4>
                      <p className="text-sm text-blue-800">
                        Compara ambos videos para entender la diferencia entre un registro de calidad y uno deficiente.
                        La bitácora es un documento oficial que puede ser requerido para auditorías y cumplimiento normativo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ¿Qué es la bitácora? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">📊</span>
                  ¿Qué es la bitácora?
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Es un registro digital diario de todas las actividades realizadas en el laboratorio. Funciona como un diario oficial que documenta procesos, observaciones, incidentes, mantenimiento y cualquier evento relevante para mantener un registro completo y trazable de las operaciones.
                </p>
              </div>

              {/* Tipos de registros en la bitácora */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">📝</span>
                  Tipos de registros en la bitácora
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-[#3C4858] mb-2 flex items-center">
                      <span className="text-lg mr-2">🔬</span>
                      Registros de procesos
                    </h4>
                    <p className="text-gray-700 text-sm">Inicio y fin de procesos de producción, parámetros utilizados, resultados obtenidos.</p>
                  </div>
                  <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-[#3C4858] mb-2 flex items-center">
                      <span className="text-lg mr-2">⚠️</span>
                      Incidentes y observaciones
                    </h4>
                    <p className="text-gray-700 text-sm">Problemas encontrados, desviaciones del proceso, observaciones importantes.</p>
                  </div>
                  <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-[#3C4858] mb-2 flex items-center">
                      <span className="text-lg mr-2">🔧</span>
                      Mantenimiento y calibración
                    </h4>
                    <p className="text-gray-700 text-sm">Mantenimiento de equipos, calibraciones, limpieza y sanitización.</p>
                  </div>
                  <div className="bg-gray-50/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-[#3C4858] mb-2 flex items-center">
                      <span className="text-lg mr-2">👥</span>
                      Cambios de turno
                    </h4>
                    <p className="text-gray-700 text-sm">Entrega de información entre turnos, pendientes y observaciones importantes.</p>
                  </div>
                </div>
              </div>

              {/* ¿Cómo usar la bitácora correctamente? */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">📝</span>
                  ¿Cómo usar la bitácora correctamente?
                </h3>
                <ol className="list-decimal list-inside space-y-3 text-gray-700">
                  <li><strong>⏰ Registra en tiempo real:</strong> Anota las actividades inmediatamente después de realizarlas.</li>
                  <li><strong>📝 Sé específico y claro:</strong> Describe con detalle qué se hizo, cómo se hizo y qué resultados se obtuvieron.</li>
                  <li><strong>⚠️ Reporta incidentes:</strong> Documenta cualquier problema, desviación o evento inusual.</li>
                  <li><strong>📊 Incluye datos relevantes:</strong> Registra temperaturas, tiempos, cantidades y otros parámetros importantes.</li>
                  <li><strong>👥 Identifica responsables:</strong> Especifica quién realizó cada actividad.</li>
                </ol>
              </div>

              {/* Importancia de mantener la bitácora */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-[#0154AC] mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-[#0154AC] rounded-lg flex items-center justify-center mr-3 text-sm">💡</span>
                  Importancia de mantener la bitácora
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  La bitácora es un documento oficial que sirve para trazabilidad, cumplimiento normativo, resolución de problemas, mejora continua de procesos y como evidencia legal de las actividades realizadas en el laboratorio. Un registro completo y preciso es esencial para la calidad y confiabilidad del trabajo.
                </p>
              </div>
            </section>

            {/* SIRIUS */}
            <section id="sirius" className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-[#0154AC] rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-2xl">🤖</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#3C4858]">SIRIUS</h2>
                  <p className="text-gray-600">Asistente de inteligencia artificial</p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-blue-50/90 to-purple-50/90 backdrop-blur-sm rounded-lg p-6 border border-blue-200">
                <p className="text-gray-700 text-lg">
                  Agente de inteligencia artificial para asistencia. Pregunte consultas y reciba respuestas rápidas.
                </p>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}