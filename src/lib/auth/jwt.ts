// Implementación compatible con Edge Runtime
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export interface JWTPayload {
  userId: string;
  cedula: string;
  nombre: string;
  idEmpleado?: string;
  roles?: string[];
  accesos?: string[];
  iat?: number;
  exp?: number;
}

// Función para convertir string a Uint8Array
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Función para convertir Uint8Array a base64url
function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Función para convertir base64url a Uint8Array
function base64UrlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  return new Uint8Array(binary.split('').map(char => char.charCodeAt(0)));
}

// Función para crear HMAC SHA256 usando Web Crypto API
async function createHMAC(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    stringToUint8Array(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    stringToUint8Array(message)
  );
  
  return uint8ArrayToBase64Url(new Uint8Array(signature));
}

// Función para verificar HMAC SHA256
async function verifyHMAC(message: string, signature: string, secret: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      stringToUint8Array(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToUint8Array(signature),
      stringToUint8Array(message)
    );
    
    return isValid;
  } catch {
    return false;
  }
}

export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (7 * 24 * 60 * 60); // 7 días
  
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const fullPayload = {
    ...payload,
    iat: now,
    exp: exp
  };
  
  const encodedHeader = uint8ArrayToBase64Url(stringToUint8Array(JSON.stringify(header)));
  const encodedPayload = uint8ArrayToBase64Url(stringToUint8Array(JSON.stringify(fullPayload)));
  
  const message = `${encodedHeader}.${encodedPayload}`;
  const signature = await createHMAC(message, JWT_SECRET);
  
  return `${message}.${signature}`;
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  console.log('🔐 JWT: Verifying token...');
  console.log('🔑 JWT: Using JWT_SECRET:', JWT_SECRET ? 'configured' : 'missing');
  
  try {
    const parts = token.split('.');
    console.log('🧩 JWT: Token parts count:', parts.length);
    
    if (parts.length !== 3) {
      console.log('❌ JWT: Invalid token format');
      return null;
    }
    
    const [encodedHeader, encodedPayload, signature] = parts;
    const message = `${encodedHeader}.${encodedPayload}`;
    
    // Verificar la firma
    console.log('🔍 JWT: Verifying signature...');
    const isValid = await verifyHMAC(message, signature, JWT_SECRET);
    console.log('✅ JWT: Signature valid:', isValid);
    
    if (!isValid) {
      console.log('❌ JWT: Signature verification failed');
      return null;
    }
    
    // Decodificar el payload
    console.log('📋 JWT: Decoding payload...');
    const payloadJson = new TextDecoder().decode(base64UrlToUint8Array(encodedPayload));
    const payload = JSON.parse(payloadJson) as JWTPayload;
    
    // Verificar expiración
    const now = Math.floor(Date.now() / 1000);
    console.log('⏰ JWT: Checking expiration. Now:', now, 'Exp:', payload.exp);
    
    if (payload.exp && payload.exp < now) {
      console.log('❌ JWT: Token expired');
      return null;
    }
    
    console.log('✅ JWT: Token verified successfully for user:', payload.nombre);
    return payload;
  } catch (error) {
    console.error('💥 JWT: Error verifying token:', error);
    return null;
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const [, encodedPayload] = parts;
    const payloadJson = new TextDecoder().decode(base64UrlToUint8Array(encodedPayload));
    const payload = JSON.parse(payloadJson) as JWTPayload;
    
    return payload;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}
