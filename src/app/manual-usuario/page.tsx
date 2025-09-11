'use client';

import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function ManualUsuario() {
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
                  <p className="text-xs font-medium text-[#3C4858] uppercase tracking-wider mb-2 px-3">Procesos</p>
                  <a
                    href="#procesos"
                    className="block px-3 py-2 text-sm text-gray-600 hover:text-[#0154AC] hover:bg-blue-50 rounded-lg transition-colors duration-200"
                  >
                    ⚗️ Procesos
                  </a>
                </div>
                <div className="pt-2">
                  <p className="text-xs font-medium text-[#3C4858] uppercase tracking-wider mb-2 px-3">Gestión</p>
                  <a
                    href="#gestion"
                    className="block px-3 py-2 text-sm text-gray-600 hover:text-[#0154AC] hover:bg-blue-50 rounded-lg transition-colors duration-200"
                  >
                    📋 Gestión
                  </a>
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
                      <source src="/Tutorial Instalar DataLab - Movil.mp4" type="video/mp4" />
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
                      <source src="/Tutorial Instalar DataLab - PC.mp4" type="video/mp4" />
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
                    <source src="/Tutorial Acceder DataLab - PC.mp4" type="video/mp4" />
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
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-[#0154AC] rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-2xl">🧭</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#3C4858]">Navegación</h2>
                  <p className="text-gray-600">Cómo moverse por la aplicación</p>
                </div>
              </div>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 mb-4">Use el menú principal para moverse entre secciones:</p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-2 h-2 bg-[#0154AC] rounded-full mr-3 mt-2"></span>
                    <span className="text-gray-700">Haga clic en las pestañas para abrir módulos.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-2 h-2 bg-[#0154AC] rounded-full mr-3 mt-2"></span>
                    <span className="text-gray-700">Use los botones de retroceso para volver.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-2 h-2 bg-[#0154AC] rounded-full mr-3 mt-2"></span>
                    <span className="text-gray-700">Busque funciones con la barra de búsqueda.</span>
                  </li>
                </ul>
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