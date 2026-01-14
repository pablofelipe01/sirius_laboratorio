import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  console.log('🔐 VERIFY: Starting token verification');
  try {
    // Obtener token del header Authorization
    const authHeader = request.headers.get('authorization');
    console.log('📋 VERIFY: Auth header exists:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ VERIFY: No valid authorization header');
      return NextResponse.json(
        { error: 'Token no proporcionado' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remover "Bearer "
    console.log('🎫 VERIFY: Token extracted, length:', token.length);
    
    const payload = await verifyToken(token);
    console.log('🔍 VERIFY: Token verification result:', payload ? 'valid' : 'invalid');

    if (!payload) {
      console.log('❌ VERIFY: Token verification failed');
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 401 }
      );
    }

    console.log('✅ VERIFY: Token verified successfully for user:', payload.nombre);
    return NextResponse.json({
      success: true,
      user: {
        id: payload.userId,
        cedula: payload.cedula,
        nombre: payload.nombre
      }
    });

  } catch (error) {
    console.error('💥 VERIFY: Error verificando token:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
