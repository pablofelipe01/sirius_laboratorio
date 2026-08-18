import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Rutas públicas que NO requieren autenticación
  const publicRoutes = [
    '/', 
    '/api/auth/login', 
    '/api/auth/verify', 
    '/stock-insumos', 
    '/labi', 
    '/api/labi',
    '/sirius',
    '/api/sirius',
    '/api/sirius-audio'
  ];
  
  // Si es una ruta pública, permitir acceso
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Rutas públicas por prefijo (para rutas dinámicas)
  const publicPrefixes = [
    '/remisiones/firmar/',   // Firma de remisiones desde link de email
  ];
  if (publicPrefixes.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Todas las demás rutas requieren autenticación
  console.log(`🔍 Checking ${pathname} access`);
  
  const token = request.cookies.get('auth_token')?.value;
  console.log('Token exists:', !!token);

  if (!token) {
    console.log(`❌ No token for ${pathname}, redirecting`);
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Verificar si el token es válido (ahora es asíncrono)
  const payload = await verifyToken(token);
  console.log('Token verification result:', !!payload);
  
  if (!payload) {
    console.log(`❌ Invalid token for ${pathname}, clearing cookie and redirecting`);
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('auth_token');
    return response;
  }

  console.log(`✅ Valid token, allowing access to ${pathname} for user:`, payload.nombre);
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - Files with extensions (.png, .jpg, etc.)
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ]
};
