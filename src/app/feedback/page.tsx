'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function FeedbackPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  // La página de feedback debe ser accesible para todos los usuarios autenticados
  const puedeAcceder = () => {
    return user && user.nombre; // Solo requiere estar autenticado
  };

  if (!puedeAcceder()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen pt-20">
          <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl max-w-md mx-4">
            <div className="text-center">
              <div className="text-6xl mb-4">🔒</div>
              <h1 className="text-2xl font-bold text-white mb-4">Acceso Restringido</h1>
              <p className="text-white/80 mb-6">
                No tienes permisos para acceder a esta sección.
              </p>
              <button
                onClick={() => router.push('/')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
              >
                Volver al Inicio
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <Navbar />
      
      <main className="pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              💬 Feedback y Sugerencias
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Tu opinión es importante para nosotros. Comparte tus comentarios, sugerencias o reporta cualquier problema para ayudarnos a mejorar DataLab.
            </p>
          </div>

          {/* User Info */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white text-lg">
                {user?.nombre?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {user?.nombre}
                </h3>
                <p className="text-blue-200 text-sm">
                  Enviando feedback como usuario autenticado
                </p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Instrucciones
            </h3>
            <div className="space-y-3 text-blue-100">
              <div className="flex items-start gap-3">
                <span className="text-green-400 mt-1">•</span>
                <span>Utiliza el formulario de abajo para enviar tu feedback</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 mt-1">•</span>
                <span>Puedes reportar errores, sugerir mejoras o compartir ideas</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 mt-1">•</span>
                <span>Sé específico en tu descripción para que podamos ayudarte mejor</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 mt-1">•</span>
                <span>Tu nombre de usuario se incluirá automáticamente con el feedback</span>
              </div>
            </div>
          </div>

          {/* Feedback Form */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <span className="text-2xl">📝</span>
              Formulario de Feedback
            </h3>
            
            <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
              <iframe 
                className="airtable-embed" 
                src="https://airtable.com/embed/appONleVyGQqlym44/pagbs6ZAyTS2mPYLH/form" 
                frameBorder="0" 
                width="100%" 
                height="533" 
                style={{ background: 'transparent', border: '1px solid #ccc' }}
                title="Formulario de Feedback DataLab"
              />
            </div>
          </div>

          {/* Additional Support */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mt-8 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🤝</span>
              Otras formas de contacto
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-blue-100">
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">💬 Chat Directo</h4>
                <p className="text-sm">
                  Habla con nuestro asistente SIRIUS para soporte inmediato
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">📖 Manual de Usuario</h4>
                <p className="text-sm">
                  Consulta la documentación completa del sistema
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}