'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Importar dinámicamente el componente 3D para evitar problemas de SSR
const ParticleGalaxy3DLazy = dynamic(() => import('./ParticleGalaxy3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-lg text-white font-medium">Cargando Galaxia SIRIUS...</p>
        <p className="text-sm text-gray-400 mt-2">Preparando animación 3D...</p>
      </div>
    </div>
  )
});

interface ParticleGalaxy3DWrapperProps {
  className?: string;
}

export default function ParticleGalaxy3DWrapper({ className = '' }: ParticleGalaxy3DWrapperProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Forzar que solo se ejecute en el cliente
    setIsClient(true);
  }, []);

  // No renderizar nada hasta que estemos seguros de estar en el cliente
  if (!isClient) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-white font-medium">Inicializando SIRIUS...</p>
        </div>
      </div>
    );
  }

  return <ParticleGalaxy3DLazy className={className} />;
}
