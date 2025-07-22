'use client';

import { useEffect, useState } from 'react';
import { isTelegramWebApp, getTelegramWebApp } from '@/lib/telegram';

interface TelegramGuardProps {
  children: React.ReactNode;
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

const TelegramGuard = ({ children }: TelegramGuardProps) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    // Verificar si estamos en Telegram Web App
    if (isTelegramWebApp()) {
      const webApp = getTelegramWebApp();
      
      if (webApp) {
        // Configurar el Web App
        webApp.ready();
        webApp.expand();
        
        // Obtener datos del usuario
        const user = webApp.initDataUnsafe?.user;
        
        if (user) {
          setTelegramUser(user);
          setIsAuthorized(true);
        }
      }
    } else {
      // Verificar parámetro en URL como fallback
      const urlParams = new URLSearchParams(window.location.search);
      const fromTelegram = urlParams.get('telegram');
      const initData = urlParams.get('tgWebAppData');
      
      if (fromTelegram === 'true' && initData) {
        // En producción aquí validarías el initData con el servidor
        setIsAuthorized(true);
      }
    }
    
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Verificando acceso...</h2>
          <p className="text-blue-100">Conectando con Telegram</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-pink-700 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center text-white">
          <div className="text-6xl mb-6">🚫</div>
          <h1 className="text-2xl font-bold mb-4">Acceso Restringido</h1>
          <p className="text-lg mb-6 text-white/90">
            Este formulario solo es accesible a través del Bot de Telegram oficial del 
            <strong className="block mt-2">Centro de Investigación Regenerativa (CIR)</strong>
          </p>
          
          <div className="bg-white/20 rounded-xl p-4 mb-6">
            <h3 className="font-semibold mb-2">📱 Para acceder:</h3>
            <ol className="text-sm text-left space-y-2 text-white/90">
              <li>1. Busca <code className="bg-white/20 px-2 py-1 rounded">@L4BI_bot</code> en Telegram</li>
              <li>2. Inicia conversación con <code>/start</code></li>
              <li>3. Usa el comando <code>/inoculacion</code></li>
            </ol>
          </div>
          
          <div className="text-sm text-white/70">
            <p>🔒 Protocolo de seguridad activado</p>
            <p>DataLab v2.1 - CIR</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header con info del usuario de Telegram */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <span>📱</span>
            <span>Telegram Web App</span>
            {telegramUser && (
              <span className="bg-white/20 px-2 py-1 rounded">
                {telegramUser.first_name} {telegramUser.last_name || ''}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span>🔒</span>
            <span>Acceso Autorizado</span>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};

export default TelegramGuard;
