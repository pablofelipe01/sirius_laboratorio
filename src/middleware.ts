import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { 
  SECURITY_HEADERS, 
  PRODUCTION_HEADERS, 
  isValidTelegramUserAgent,
  logSecurityEvent,
  PROTECTED_ROUTES
} from './lib/security/config';

// Función para extraer información del navegador del User-Agent
function extractBrowserInfo(userAgent: string) {
  let browser = 'Unknown';
  let version = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';
  
  // Detectar navegador
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (userAgent.includes('TelegramBot')) {
    browser = 'Telegram WebApp';
  } else if (userAgent.includes('Telegram')) {
    browser = 'Telegram';
  }
  
  // Detectar OS
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
  
  // Detectar dispositivo
  if (userAgent.includes('Mobile')) device = 'Mobile';
  else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) device = 'Tablet';
  
  return { browser, version, os, device };
}

// Función para crear respuesta de bloqueo con headers de seguridad
function createBlockedResponse() {
  const blockedHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Acceso Restringido | DataLab</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
    <div class="max-w-lg w-full text-center">
        <div class="mb-8">
            <h1 class="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 mb-4 select-none">403</h1>
            <div class="w-24 h-1 bg-gradient-to-r from-red-600 to-red-800 mx-auto rounded-full"></div>
        </div>
        <div class="bg-white rounded-2xl shadow-lg p-8 border border-red-200">
            <div class="text-4xl mb-4">🔒</div>
            <h2 class="text-2xl font-bold text-gray-900 mb-4">Acceso Restringido</h2>
            <p class="text-gray-600 mb-8 leading-relaxed">
                Esta aplicación está disponible únicamente a través del bot de Telegram autorizado LABI para la gestión de procesos de producción de microorganismos en el laboratorio de Sirius Regenerative Solutions S.A.S ZOMAC.
            </p>
            <div class="text-xs text-gray-500 border-t pt-4 mt-6">
                <p class="font-semibold">DataLab - Sirius Regenerative Solutions S.A.S ZOMAC</p>
                <p class="mt-1">© 2025 Todos los derechos reservados</p>
                <p class="mt-1 text-red-600">⚠️ Acceso no autorizado prohibido</p>
            </div>
        </div>
    </div>
</body>
</html>`;
  
  return new NextResponse(blockedHtml, {
    status: 403,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Headers de seguridad
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff', 
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': "default-src 'self'; script-src 'unsafe-inline' cdn.tailwindcss.com; style-src 'unsafe-inline' cdn.tailwindcss.com; img-src 'self' data:",
    },
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';
  const browserInfo = extractBrowserInfo(userAgent);
  
  // Verificar si la ruta está protegida
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  );
  
  if (isProtectedRoute) {
    // Verificar User Agent de Telegram
    if (!isValidTelegramUserAgent(userAgent)) {
      // Log del intento de acceso no autorizado con información detallada
      logSecurityEvent('unauthorized_access_attempt', {
        path: pathname,
        userAgent: userAgent.substring(0, 200), // Limitar longitud
        browser: `${browserInfo.browser} ${browserInfo.version}`,
        os: browserInfo.os,
        device: browserInfo.device,
        xff: request.headers.get('x-forwarded-for') || 'unknown',
        referer: request.headers.get('referer') || 'direct',
        timestamp: new Date().toISOString()
      }, 'high');
      
      return createBlockedResponse();
    }
    
    // Log de acceso autorizado con información del navegador
    logSecurityEvent('authorized_telegram_access', {
      path: pathname,
      browser: `${browserInfo.browser} ${browserInfo.version}`,
      os: browserInfo.os,
      device: browserInfo.device,
      timestamp: new Date().toISOString()
    }, 'low');
  }
  
  // Para todas las rutas, agregar headers de seguridad
  const response = NextResponse.next();
  
  // Aplicar headers de seguridad básicos
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Headers adicionales en producción
  if (process.env.NODE_ENV === 'production') {
    Object.entries(PRODUCTION_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  
  return response;
}

export const config = {
  matcher: [
    '/inoculacion/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
};
