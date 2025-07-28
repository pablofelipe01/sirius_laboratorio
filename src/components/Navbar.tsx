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
      // Si está autenticado, ir a inoculación usando Next.js router
      router.push('/inoculacion');
    } else {
      // Si no está autenticado, mostrar modal de login
      setShowLoginModal(true);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
    setIsMobileMenuOpen(false); // Cerrar menú móvil al hacer logout
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  if (isLoading) {
    // Mostrar navbar sin botones mientras carga
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
                className="w-24 h-16 sm:w-32 sm:h-20 md:w-38 md:h-26 object-contain"
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
                className="w-24 h-16 sm:w-32 sm:h-20 md:w-38 md:h-26 object-contain"
              />
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/inoculacion"
                    className={`px-6 py-2 rounded-full transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 font-medium ${
                      isScrolled 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 hover:border-white/30'
                    }`}
                  >
                    📊 Inoculación
                  </Link>
                  
                  <Link
                    href="/cepas"
                    className={`px-6 py-2 rounded-full transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 font-medium ${
                      isScrolled 
                        ? 'bg-purple-600 text-white hover:bg-purple-700' 
                        : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 hover:border-white/30'
                    }`}
                  >
                    🧬 Cepas
                  </Link>
                  
                  <Link
                    href="/descartes"
                    className={`px-6 py-2 rounded-full transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 font-medium ${
                      isScrolled 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 hover:border-white/30'
                    }`}
                  >
                    🗑️ Descartes
                  </Link>
                  
                  <Link
                    href="/cosecha"
                    className={`px-6 py-2 rounded-full transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 font-medium ${
                      isScrolled 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 hover:border-white/30'
                    }`}
                  >
                    🧪 Cosecha
                  </Link>
                  
                  <Link
                    href="/bitacora-laboratorio"
                    className={`px-6 py-2 rounded-full transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 font-medium ${
                      isScrolled 
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                        : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 hover:border-white/30'
                    }`}
                  >
                    📝 Bitácora
                  </Link>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`${isScrolled ? 'text-gray-700' : 'text-white'}`}>
                      Hola, {user?.nombre}
                    </span>
                    <button
                      onClick={handleLogout}
                      className={`${isScrolled ? 'text-gray-500 hover:text-gray-700' : 'text-gray-300 hover:text-white'} text-sm underline`}
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={handleAccessClick}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Acceder
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center gap-2">
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
            <div className={`lg:hidden border-t ${
              isScrolled ? 'border-gray-200 bg-white/95' : 'border-white/20 bg-black/20'
            } backdrop-blur-md`}>
              <div className="px-4 py-4 space-y-2">
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/inoculacion"
                      onClick={closeMobileMenu}
                      className={`block w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        isScrolled 
                          ? 'text-blue-600 hover:bg-blue-50' 
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      📊 Inoculación
                    </Link>
                    
                    <Link
                      href="/cepas"
                      onClick={closeMobileMenu}
                      className={`block w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        isScrolled 
                          ? 'text-purple-600 hover:bg-purple-50' 
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      🧬 Cepas
                    </Link>
                    
                    <Link
                      href="/descartes"
                      onClick={closeMobileMenu}
                      className={`block w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        isScrolled 
                          ? 'text-red-600 hover:bg-red-50' 
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      🗑️ Descartes
                    </Link>
                    
                    <Link
                      href="/cosecha"
                      onClick={closeMobileMenu}
                      className={`block w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        isScrolled 
                          ? 'text-green-600 hover:bg-green-50' 
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      🧪 Cosecha
                    </Link>
                    
                    <Link
                      href="/bitacora-laboratorio"
                      onClick={closeMobileMenu}
                      className={`block w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        isScrolled 
                          ? 'text-indigo-600 hover:bg-indigo-50' 
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      📝 Bitácora
                    </Link>
                    
                    <hr className={`my-2 ${isScrolled ? 'border-gray-200' : 'border-white/20'}`} />
                    
                    <button
                      onClick={handleLogout}
                      className={`block w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        isScrolled 
                          ? 'text-red-600 hover:bg-red-50' 
                          : 'text-red-300 hover:bg-white/10'
                      }`}
                    >
                      🚪 Cerrar sesión
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
