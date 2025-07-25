import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Proteger rutas que requieren autenticación
  const protectedRoutes = ['/inoculacion', '/cepas'];
  
  if (protectedRoutes.includes(pathname)) {
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

  // Para todas las demás rutas, permitir acceso temporalmente
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ]
};
