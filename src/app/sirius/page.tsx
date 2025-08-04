'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useEffect, useState } from 'react';

// Importar el componente 3D dinámicamente para evitar problemas de SSR
const SIRIUS3DInterface = dynamic(() => import('@/components/SIRIUS3DInterface'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-lg text-white font-medium">Cargando SIRIUS...</p>
      </div>
    </div>
  )
});

export default function SIRIUSPage() {
  const { user, isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [stars, setStars] = useState<React.ReactElement[]>([]);

  useEffect(() => {
    // Generar estrellas solo en el cliente para evitar problemas de hidratación
    const generateStars = () => {
      const newStars = [];
      
      for (let i = 0; i < 300; i++) {
        // Usar el índice como semilla para generar posiciones consistentes
        const x = (i * 9851) % 10000 / 100; // Pseudo-random basado en índice
        const y = (i * 7853) % 10000 / 100;
        const size = 1 + (i % 4);
        const delay = (i * 1.5) % 4;
        const duration = 2 + (i % 3);
        
        newStars.push(
          <div
            key={i}
            className="absolute bg-white rounded-full animate-pulse"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: `${size}px`,
              height: `${size}px`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`
            }}
          />
        );
      }
      return newStars;
    };

    setStars(generateStars());
    setMounted(true);
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
      {/* Fondo del espacio con temática SIRIUS */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-cyan-900/20 to-black">
        {/* Estrellas generadas en el cliente */}
        <div className="absolute inset-0">
          {stars}
        </div>
        
        {/* Nebulosas con colores de SIRIUS */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/12 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-3/4 left-1/3 w-64 h-64 bg-teal-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }}></div>
      </div>
      
      <Navbar />
      <main className="pt-16">
        <SIRIUS3DInterface />
      </main>
      <Footer />
    </div>
  );
}
