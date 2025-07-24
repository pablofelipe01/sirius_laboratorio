import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

export function middleware(request: NextRequest) {
  // Solo aplicar middleware a rutas protegidas
  if (request.nextUrl.pathname.startsWith('/inoculacion')) {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      // No hay token, redirigir al home
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Verificar si el token es válido
    const payload = verifyToken(token)
    if (!payload) {
      // Token inválido, redirigir al home
      const response = NextResponse.redirect(new URL('/', request.url))
      response.cookies.delete('auth_token')
      return response
    }

    // Token válido, permitir acceso
    return NextResponse.next()
  }

  // Para otras rutas, simplemente permitir el paso
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/inoculacion/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
};
