'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

// Importar el componente 3D dinámicamente para evitar problemas de SSR
const ParticleGalaxy3D = dynamic(() => import('@/components/ParticleGalaxy3DWrapper'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-lg text-white font-medium">Cargando Galaxia SIRIUS...</p>
        <p className="text-sm text-gray-400 mt-2">Preparando entorno 3D...</p>
      </div>
    </div>
  )
});

export default function SIRIUSPage() {
  const { user, isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Asegurar que estamos en el cliente
    if (typeof window !== 'undefined') {
      setMounted(true);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-white font-medium">Inicializando SIRIUS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Imagen de fondo */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/photo-1465101162946-4377e57745c3.jpeg)',
          filter: 'brightness(0.6) contrast(1.1)'
        }}
      />
      
      {/* Overlay gradient muy sutil para mejorar el contraste */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/20" />
      
      <main className="relative">
        {/* Contenedor principal para la galaxia de partículas centrada */}
        <div className="fixed inset-0 z-0">
          <ParticleGalaxy3D className="w-full h-full" />
        </div>
      </main>
    </div>
  );
}
