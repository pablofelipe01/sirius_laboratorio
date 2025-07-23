import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Solo aplicar a la ruta de inoculación
  if (request.nextUrl.pathname === '/inoculacion') {
    const userAgent = request.headers.get('user-agent') || '';
    
    // Verificar si viene de Telegram
    const isTelegramUA = userAgent.includes('TelegramBot') || 
                        userAgent.includes('Telegram') ||
                        userAgent.includes('tdesktop') ||
                        userAgent.includes('Telegram Desktop');
    
    console.log('🔍 Middleware Check:', {
      path: request.nextUrl.pathname,
      userAgent: userAgent.substring(0, 100),
      isTelegramUA
    });
    
    // Si NO viene de Telegram, redirigir a página de bloqueo
    if (!isTelegramUA) {
      console.log('🚫 BLOCKED by middleware: Not Telegram user agent');
      
      // Crear respuesta HTML de bloqueo directamente
      const blockedHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Página no encontrada | DataLab CIR</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
    <div class="max-w-lg w-full text-center">
        <div class="mb-8">
            <h1 class="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4 select-none">404</h1>
            <div class="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full"></div>
        </div>
        <div class="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            <div class="text-4xl mb-4">🔍</div>
            <h2 class="text-2xl font-bold text-gray-900 mb-4">Página no encontrada</h2>
            <p class="text-gray-600 mb-8 leading-relaxed">
                Lo sentimos, la página que buscas no está disponible o no existe.
            </p>
            <div class="space-y-3">
                <button
                    onclick="window.location.href='/'"
                    class="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                >
                    🏠 Volver al inicio
                </button>
            </div>
        </div>
    </div>
</body>
</html>`;
      
      return new NextResponse(blockedHtml, {
        status: 403,
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/inoculacion/:path*'
};
