'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import LoginModal from './LoginModal';

interface DropdownMenuItem {
  href: string;
  label: string;
  emoji: string;
  color: string;
}

interface DropdownMenuProps {
  title: string;
  icon: string;
  items: DropdownMenuItem[];
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ title, icon, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:bg-white/10 text-white"
      >
        <span className="text-lg">{icon}</span>
        <span>{title}</span>
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50">
          {items.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 hover:${item.color} transition-colors text-gray-700 hover:text-gray-900`}
            >
              <span className="text-lg">{item.emoji}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const pathname = usePathname();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const handleAccessClick = () => {
    setShowLoginModal(true);
  };

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-lg'
            : 'bg-transparent'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            {pathname === '/' ? (
              <a href="https://www.siriusagentic.com/" className="flex items-center" onClick={closeMobileMenu}>
                <Image 
                  src="/logo.png" 
                  alt="Sirius Logo" 
                  width={448}
                  height={320}
                  className="w-32 sm:w-40 md:w-48 lg:w-56 h-auto object-contain transition-transform duration-300 hover:scale-105"
                  style={{ 
                    minWidth: '40px',
                    imageRendering: 'crisp-edges'
                  }}
                  priority
                  quality={100}
                />
              </a>
            ) : (
              <Link href="/" className="flex items-center" onClick={closeMobileMenu}>
                <Image 
                  src="/logo.png" 
                  alt="Sirius Logo" 
                  width={448}
                  height={320}
                  className="w-32 sm:w-40 md:w-48 lg:w-56 h-auto object-contain transition-transform duration-300 hover:scale-105"
                  style={{ 
                    minWidth: '40px',
                    imageRendering: 'crisp-edges'
                  }}
                  priority
                  quality={100}
                />
              </Link>
            )}
            
            {/* Desktop Navigation */}
            <div className="hidden xl:flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  {/* Dropdown Menus */}
                  <DropdownMenu
                    title="Procesos"
                    icon="⚗️"
                    items={[
                      { href: "/inoculacion", label: "Inoculación", emoji: "📊", color: "bg-blue-50" },
                      { href: "/cepas", label: "Cepas", emoji: "🧬", color: "bg-purple-50" },
                      { href: "/cosecha", label: "Cosecha", emoji: "🧪", color: "bg-green-50" },
                      { href: "/bacterias", label: "Bacterias", emoji: "🦠", color: "bg-yellow-50" },
                      { href: "/productos-secos", label: "Productos Secos", emoji: "🌾", color: "bg-amber-50" },
                      { href: "/calcular-formulacion", label: "Calcular Formulación", emoji: "🧮", color: "bg-cyan-50" },
                    ]}
                  />
                  
                  <DropdownMenu
                    title="Gestión"
                    icon="📋"
                    items={[
                      { href: "/almacenamiento", label: "Almacenamiento", emoji: "📦", color: "bg-orange-50" },
                      { href: "/descartes", label: "Descartes", emoji: "🗑️", color: "bg-red-50" },
                      { href: "/stock-insumos", label: "Stock Insumos", emoji: "📋", color: "bg-teal-50" },
                      { href: "/pedidos-clientes", label: "Pedidos Clientes", emoji: "🛒", color: "bg-emerald-50" },
                      { href: "/bitacora-laboratorio", label: "Bitácora", emoji: "📝", color: "bg-indigo-50" },
                      { href: "/calendario-produccion", label: "Calendario de Producción", emoji: "📅", color: "bg-pink-50" },
                    ]}
                  />

                  {/* Dropdown Soporte */}
                  <DropdownMenu
                    title="Soporte"
                    icon="🛠️"
                    items={[
                      { href: "/sirius", label: "SIRIUS - Asistente IA", emoji: "✨", color: "bg-blue-50" },
                      { href: "/manual-usuario", label: "Manual de Usuario", emoji: "📖", color: "bg-gray-50" },
                      { href: "/feedback", label: "Feedback", emoji: "💬", color: "bg-purple-50" },
                    ]}
                  />

                  {/* Dashboard Lab */}
                  <Link 
                    href="/dashboard-lab" 
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:bg-white/10 ${
                      isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white'
                    }`}
                  >
                    <span className="text-lg">🧪</span>
                    <span>Dashboard Lab</span>
                  </Link>

                  <div className="flex items-center gap-3 ml-6">
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
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    isScrolled ? 'bg-blue-100 text-blue-700' : 'bg-white/20 text-white'
                  }`}>
                    {user?.nombre?.charAt(0).toUpperCase()}
                  </div>
                  <span className={`text-sm font-medium hidden sm:block ${isScrolled ? 'text-gray-700' : 'text-white'}`}>
                    {user?.nombre?.split(' ')[0]}
                  </span>
                </div>
              )}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`p-2 rounded-md transition-all duration-200 ${
                  isScrolled 
                    ? 'text-gray-700 hover:bg-gray-100' 
                    : 'text-white hover:bg-white/10'
                }`}
                aria-label="Toggle mobile menu"
                aria-expanded={isMobileMenuOpen}
              >
                <div className="relative w-6 h-6">
                  <div className={`absolute h-0.5 w-full bg-current transform transition-all duration-300 ${
                    isMobileMenuOpen ? 'rotate-45 top-3' : 'top-1'
                  }`} />
                  <div className={`absolute h-0.5 w-full bg-current transform transition-all duration-300 top-3 ${
                    isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
                  }`} />
                  <div className={`absolute h-0.5 w-full bg-current transform transition-all duration-300 ${
                    isMobileMenuOpen ? '-rotate-45 top-3' : 'top-5'
                  }`} />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div 
            className="xl:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300" 
            onClick={closeMobileMenu} 
          />
        )}

        {/* Mobile menu */}
        <div
          ref={mobileMenuRef}
          className={`xl:hidden fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ height: '100dvh', minHeight: '-webkit-fill-available' }}
        >
          {/* Mobile menu header */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Image 
                src="/logo.png" 
                alt="Sirius Logo" 
                width={120}
                height={86}
                className="w-20 h-auto object-contain"
              />
            </div>
            <button
              onClick={closeMobileMenu}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close mobile menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mobile menu content - scrollable */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="px-4 py-4 space-y-4 pb-24">
              {isAuthenticated ? (
                <div>
                  {/* User Info */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white text-lg">
                        {user?.nombre?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {user?.nombre}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Usuario activo
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Sections */}
                  <div className="space-y-3 mt-3">
                    {/* Procesos Principales */}
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 px-2 text-gray-500 dark:text-gray-400">
                        🔬 Procesos Principales
                      </h3>
                      <div className="space-y-0.5">
                        <Link
                          href="/inoculacion"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg transition-all duration-200 text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-200 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                        >
                          <span className="text-lg">📊</span>
                          <span className="text-sm font-medium">Inoculación</span>
                          <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                        
                        <Link
                          href="/cepas"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-lg transition-all duration-200 text-gray-700 hover:bg-purple-50 hover:text-purple-700 dark:text-gray-200 dark:hover:bg-purple-900/30 dark:hover:text-purple-400"
                        >
                          <span className="text-xl">🧬</span>
                          <span className="font-medium">Cepas</span>
                          <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                        
                        <Link
                          href="/cosecha"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-lg transition-all duration-200 text-gray-700 hover:bg-green-50 hover:text-green-700 dark:text-gray-200 dark:hover:bg-green-900/30 dark:hover:text-green-400"
                        >
                          <span className="text-xl">🧪</span>
                          <span className="font-medium">Cosecha</span>
                          <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                        
                        <Link
                          href="/bacterias"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-lg transition-all duration-200 text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 dark:text-gray-200 dark:hover:bg-yellow-900/30 dark:hover:text-yellow-400"
                        >
                          <span className="text-xl">🦠</span>
                          <span className="font-medium">Bacterias</span>
                          <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                        
                        <Link
                          href="/calcular-formulacion"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-lg transition-all duration-200 text-gray-700 hover:bg-cyan-50 hover:text-cyan-700 dark:text-gray-200 dark:hover:bg-cyan-900/30 dark:hover:text-cyan-400"
                        >
                          <span className="text-xl">🧮</span>
                          <span className="font-medium">Calcular Formulación</span>
                          <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                        
                        <Link
                          href="/productos-secos"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-lg transition-all duration-200 text-gray-700 hover:bg-amber-50 hover:text-amber-700 dark:text-gray-200 dark:hover:bg-amber-900/30 dark:hover:text-amber-400"
                        >
                          <span className="text-xl">🌾</span>
                          <span className="font-medium">Productos Secos</span>
                          <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                    
                    {/* Gestión y Control */}
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 px-2 text-gray-500 dark:text-gray-400">
                        📋 Gestión y Control
                      </h3>
                      <div className="space-y-1">
                        <Link
                          href="/almacenamiento"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-lg transition-all duration-200 text-gray-700 hover:bg-orange-50 hover:text-orange-700 dark:text-gray-200 dark:hover:bg-orange-900/30 dark:hover:text-orange-400"
                        >
                          <span className="text-xl">📦</span>
                          <span className="font-medium">Almacenamiento</span>
                          <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                        
                        <Link
                          href="/descartes"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-lg transition-all duration-200 text-gray-700 hover:bg-red-50 hover:text-red-700 dark:text-gray-200 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        >
                          <span className="text-xl">🗑️</span>
                          <span className="font-medium">Descartes</span>
                          <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                        
                        <Link
                          href="/stock-insumos"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-lg transition-all duration-200 text-gray-700 hover:bg-teal-50 hover:text-teal-700 dark:text-gray-200 dark:hover:bg-teal-900/30 dark:hover:text-teal-400"
                        >
                          <span className="text-xl">📋</span>
                          <span className="font-medium">Stock Insumos</span>
                          <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                        
                        <Link
                          href="/pedidos-clientes"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-lg transition-all duration-200 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-gray-200 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400"
                        >
                          <span className="text-xl">🛒</span>
                          <span className="font-medium">Pedidos Clientes</span>
                          <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                        
                        <Link
                          href="/bitacora-laboratorio"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-lg transition-all duration-200 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-gray-200 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400"
                        >
                          <span className="text-xl">📝</span>
                          <span className="font-medium">Bitácora</span>
                          <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                        
                        <Link
                          href="/calendario-produccion"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-lg transition-all duration-200 text-gray-700 hover:bg-pink-50 hover:text-pink-700 dark:text-gray-200 dark:hover:bg-pink-900/30 dark:hover:text-pink-400"
                        >
                          <span className="text-xl">📅</span>
                          <span className="font-medium">Calendario de Producción</span>
                          <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>

                    {/* Soporte */}
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 px-2 text-gray-500 dark:text-gray-400">
                        🛠️ Soporte
                      </h3>
                      <div className="space-y-1">
                        <Link
                          href="/sirius"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-lg transition-all duration-200 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:from-blue-100 hover:to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 dark:text-blue-400"
                        >
                          <span className="text-xl">✨</span>
                          <span className="font-medium">SIRIUS - Asistente IA</span>
                          <span className="ml-auto px-2 py-1 text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full">
                            IA
                          </span>
                        </Link>
                        
                        <Link
                          href="/manual-usuario"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-lg transition-all duration-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white"
                        >
                          <span className="text-xl">📖</span>
                          <span className="font-medium">Manual de Usuario</span>
                          <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                        
                        <Link
                          href="/feedback"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-lg transition-all duration-200 text-gray-700 hover:bg-purple-50 hover:text-purple-700 dark:text-gray-200 dark:hover:bg-purple-900/30 dark:hover:text-purple-400"
                        >
                          <span className="text-xl">�</span>
                          <span className="font-medium">Feedback</span>
                          <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>

                    {/* Proyección */}
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 px-2 text-gray-500 dark:text-gray-400">
                        📈 Análisis
                      </h3>
                      <div className="space-y-1">
                        <Link
                          href="/dashboard-lab"
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-lg transition-all duration-200 text-gray-700 hover:bg-cyan-50 hover:text-cyan-700 dark:text-gray-200 dark:hover:bg-cyan-900/30 dark:hover:text-cyan-400"
                        >
                          <span className="text-xl">🧪</span>
                          <span className="font-medium">Dashboard Lab</span>
                          <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Bienvenido a DataLab
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                      Accede para gestionar el laboratorio
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      handleAccessClick();
                      closeMobileMenu();
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg"
                  >
                    Iniciar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu footer - fixed at bottom */}
          {isAuthenticated && (
            <div 
              className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
            >
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-lg transition-all duration-200 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                <span className="text-xl">🚪</span>
                <span className="font-medium">Cerrar Sesión</span>
              </button>
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
