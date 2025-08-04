'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';

// Importar el componente 3D dinámicamente para evitar problemas de SSR
const LABI3DInterface = dynamic(() => import('@/components/LABI3DInterface'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="w-20 h-20 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-xl">Cargando LABI...</p>
      </div>
    </div>
  )
});

export default function LABIPage() {
  const { user, isAuthenticated } = useAuth();

  return <LABI3DInterface />;
}
