'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from './LoginModal';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAccessClick = () => {
    if (isAuthenticated) {
      router.push('/inoculacion');
    } else {
      setShowLoginModal(true);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
    setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  if (isLoading) {
    return (
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-lg'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center space-x-2">
              <Image 
                src="/logo.png" 
                alt="Sirius Logo" 
                width={152}
                height={104}
                className="w-32 h-20 sm:w-40 sm:h-24 md:w-48 md:h-32 object-contain"
              />
            </Link>
            <div className="w-20 h-10 bg-gray-200 animate-pulse rounded-full"></div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-lg'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
              <Image 
                src="/logo.png" 
                alt="Sirius Logo" 
                width={152}
                height={104}
                className="w-32 h-20 sm:w-40 sm:h-24 md:w-48 md:h-32 object-contain"
              />
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden xl:flex items-center gap-6">
              {isAuthenticated ? (
                <>
                  {/* Navigation Links - Clean horizontal layout with subtle separators */}
                  <div className="flex items-center gap-1">
                    {/* Core Processes */}
                    <Link
                      href="/inoculacion"
                      className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm ${
                        isScrolled 
                          ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-700' 
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      📊 Inoculación
                    </Link>
                    
                    <Link
                      href="/cepas"
                      className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm ${
                        isScrolled 
                          ? 'text-gray-700 hover:bg-purple-50 hover:text-purple-700' 
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      🧬 Cepas
                    </Link>
                    
                    <Link
                      href="/cosecha"
                      className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm ${
                        isScrolled 
                          ? 'text-gray-700 hover:bg-green-50 hover:text-green-700' 
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      🧪 Cosecha
                    </Link>
                    
                    {/* Subtle separator */}
                    <div className={`w-px h-6 mx-2 ${isScrolled ? 'bg-gray-300' : 'bg-white/20'}`}></div>
                    
                    {/* Management */}
                    <Link
                      href="/almacenamiento"
                      className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm ${
                        isScrolled 
                          ? 'text-gray-700 hover:bg-orange-50 hover:text-orange-700' 
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      📦 Almacenamiento
                    </Link>
                    
                    <Link
                      href="/descartes"
                      className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm ${
                        isScrolled 
                          ? 'text-gray-700 hover:bg-red-50 hover:text-red-700' 
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      🗑️ Descartes
                    </Link>
                    
                    <Link
                      href="/stock-insumos"
                      className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm ${
                        isScrolled 
                          ? 'text-gray-700 hover:bg-teal-50 hover:text-teal-700' 
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      📋 Stock
                    </Link>
                    
                    {/* Subtle separator */}
                    <div className={`w-px h-6 mx-2 ${isScrolled ? 'bg-gray-300' : 'bg-white/20'}`}></div>
                    
                    {/* Analysis */}
                    <Link
                      href="/bacterias"
                      className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm ${
                        isScrolled 
                          ? 'text-gray-700 hover:bg-yellow-50 hover:text-yellow-700' 
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      🦠 Bacterias
                    </Link>
                    
                    <Link
                      href="/bitacora-laboratorio"
                      className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm ${
                        isScrolled 
                          ? 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700' 
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      📝 Bitácora
                    </Link>
                  </div>
                  
                  {/* User Info & Logout */}
                  <div className="flex items-center gap-3 ml-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isScrolled ? 'bg-blue-100 text-blue-700' : 'bg-white/20 text-white'
                      }`}>
                        {user?.nombre?.charAt(0).toUpperCase()}
                      </div>
                      <span className={`text-sm font-medium ${isScrolled ? 'text-gray-700' : 'text-white'}`}>
                        {user?.nombre?.split(' ')[0]}
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className={`text-xs px-3 py-1 rounded-lg transition-all duration-200 ${
                        isScrolled 
                          ? 'text-gray-500 hover:bg-red-50 hover:text-red-600' 
                          : 'text-gray-300 hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      Salir
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={handleAccessClick}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Acceder
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="xl:hidden flex items-center gap-2">
              {isAuthenticated && (
                <span className={`text-xs ${isScrolled ? 'text-gray-700' : 'text-white'}`}>
                  {user?.nombre?.split(' ')[0]}
                </span>
              )}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`p-2 rounded-md ${
                  isScrolled 
                    ? 'text-gray-700 hover:bg-gray-100' 
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className={`xl:hidden border-t ${
              isScrolled ? 'border-gray-200 bg-white/95' : 'border-white/20 bg-black/20'
            } backdrop-blur-md`}>
              <div className="px-4 py-4 space-y-1">
                {isAuthenticated ? (
                  <>
                    {/* User Info */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-3 ${
                      isScrolled ? 'bg-gray-50' : 'bg-white/10'
                    }`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                        isScrolled ? 'bg-blue-100 text-blue-700' : 'bg-white/20 text-white'
                      }`}>
                        {user?.nombre?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className={`font-medium ${isScrolled ? 'text-gray-900' : 'text-white'}`}>
                          {user?.nombre}
                        </p>
                        <p className={`text-xs ${isScrolled ? 'text-gray-500' : 'text-gray-300'}`}>
                          Usuario activo
                        </p>
                      </div>
                    </div>

                    {/* Navigation Links - Organized by categories */}
                    <div className="space-y-4">
                      {/* Procesos Principales */}
                      <div>
                        <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 px-4 ${
                          isScrolled ? 'text-gray-500' : 'text-gray-300'
                        }`}>
                          Procesos Principales
                        </h3>
                        <div className="space-y-1">
                          <Link
                            href="/inoculacion"
                            onClick={closeMobileMenu}
                            className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-colors ${
                              isScrolled 
                                ? 'text-blue-600 hover:bg-blue-50' 
                                : 'text-white hover:bg-white/10'
                            }`}
                          >
                            <span className="text-lg">📊</span>
                            <span className="font-medium">Inoculación</span>
                          </Link>
                          
                          <Link
                            href="/cepas"
                            onClick={closeMobileMenu}
                            className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-colors ${
                              isScrolled 
                                ? 'text-purple-600 hover:bg-purple-50' 
                                : 'text-white hover:bg-white/10'
                            }`}
                          >
                            <span className="text-lg">🧬</span>
                            <span className="font-medium">Cepas</span>
                          </Link>
                          
                          <Link
                            href="/cosecha"
                            onClick={closeMobileMenu}
                            className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-colors ${
                              isScrolled 
                                ? 'text-green-600 hover:bg-green-50' 
                                : 'text-white hover:bg-white/10'
                            }`}
                          >
                            <span className="text-lg">🧪</span>
                            <span className="font-medium">Cosecha</span>
                          </Link>
                        </div>
                      </div>
                      
                      {/* Gestión y Control */}
                      <div>
                        <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 px-4 ${
                          isScrolled ? 'text-gray-500' : 'text-gray-300'
                        }`}>
                          Gestión y Control
                        </h3>
                        <div className="space-y-1">
                          <Link
                            href="/almacenamiento"
                            onClick={closeMobileMenu}
                            className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-colors ${
                              isScrolled 
                                ? 'text-orange-600 hover:bg-orange-50' 
                                : 'text-white hover:bg-white/10'
                            }`}
                          >
                            <span className="text-lg">📦</span>
                            <span className="font-medium">Almacenamiento</span>
                          </Link>
                          
                          <Link
                            href="/descartes"
                            onClick={closeMobileMenu}
                            className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-colors ${
                              isScrolled 
                                ? 'text-red-600 hover:bg-red-50' 
                                : 'text-white hover:bg-white/10'
                            }`}
                          >
                            <span className="text-lg">🗑️</span>
                            <span className="font-medium">Descartes</span>
                          </Link>
                          
                          <Link
                            href="/stock-insumos"
                            onClick={closeMobileMenu}
                            className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-colors ${
                              isScrolled 
                                ? 'text-teal-600 hover:bg-teal-50' 
                                : 'text-white hover:bg-white/10'
                            }`}
                          >
                            <span className="text-lg">📋</span>
                            <span className="font-medium">Stock Insumos</span>
                          </Link>
                        </div>
                      </div>
                      
                      {/* Análisis y Registro */}
                      <div>
                        <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 px-4 ${
                          isScrolled ? 'text-gray-500' : 'text-gray-300'
                        }`}>
                          Análisis y Registro
                        </h3>
                        <div className="space-y-1">
                          <Link
                            href="/bacterias"
                            onClick={closeMobileMenu}
                            className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-colors ${
                              isScrolled 
                                ? 'text-yellow-600 hover:bg-yellow-50' 
                                : 'text-white hover:bg-white/10'
                            }`}
                          >
                            <span className="text-lg">🦠</span>
                            <span className="font-medium">Bacterias</span>
                          </Link>
                          
                          <Link
                            href="/bitacora-laboratorio"
                            onClick={closeMobileMenu}
                            className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-colors ${
                              isScrolled 
                                ? 'text-indigo-600 hover:bg-indigo-50' 
                                : 'text-white hover:bg-white/10'
                            }`}
                          >
                            <span className="text-lg">📝</span>
                            <span className="font-medium">Bitácora</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                    
                    <hr className={`my-3 ${isScrolled ? 'border-gray-200' : 'border-white/20'}`} />
                    
                    <button
                      onClick={handleLogout}
                      className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        isScrolled 
                          ? 'text-red-600 hover:bg-red-50' 
                          : 'text-red-300 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-lg">🚪</span>
                      <span className="font-medium">Cerrar sesión</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      handleAccessClick();
                      closeMobileMenu();
                    }}
                    className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                  >
                    Acceder
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </>
  );
};

export default Navbar;
