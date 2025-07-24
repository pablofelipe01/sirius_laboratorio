/**
 * Configuración de Seguridad - DataLab
 * Sirius Regenerative Solutions S.A.S ZOMAC
 * © 2025 - Todos los derechos reservados
 */

// Headers de seguridad para todas las respuestas
export const SECURITY_HEADERS = {
  // Prevenir ataques de clickjacking
  'X-Frame-Options': 'DENY',
  
  // Prevenir MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Activar protección XSS en navegadores
  'X-XSS-Protection': '1; mode=block',
  
  // Controlar información del referrer
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Política de permisos restrictiva
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  
  // Content Security Policy básica
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' cdn.tailwindcss.com",
    "style-src 'self' 'unsafe-inline' cdn.tailwindcss.com fonts.googleapis.com",
    "font-src 'self' fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "frame-ancestors 'none'"
  ].join('; ')
} as const;

// Headers específicos para producción
export const PRODUCTION_HEADERS = {
  // HSTS - Solo en HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Indicar que el sitio requiere HTTPS
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' cdn.tailwindcss.com",
    "style-src 'self' 'unsafe-inline' cdn.tailwindcss.com fonts.googleapis.com",
    "font-src 'self' fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ')
} as const;

// Configuración de rate limiting (para implementación futura)
export const RATE_LIMIT_CONFIG = {
  // Límites por endpoint
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por ventana
    message: 'Demasiadas solicitudes desde esta IP'
  },
  
  // Límites más estrictos para endpoints sensibles
  sensitive: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // máximo 10 requests por ventana
    message: 'Límite de solicitudes excedido para endpoint sensible'
  }
} as const;

// User Agents permitidos para la aplicación
export const ALLOWED_USER_AGENTS = [
  'TelegramBot',
  'Telegram',
  'tdesktop',
  'Telegram Desktop'
] as const;

// Endpoints que requieren autenticación especial
export const PROTECTED_ROUTES = [
  '/inoculacion',
  '/api/inoculacion',
  '/dashboard',
  '/admin'
] as const;

// Configuración de logging de seguridad
export const SECURITY_LOG_CONFIG = {
  // Eventos que deben ser loggeados
  logEvents: [
    'unauthorized_access_attempt',
    'invalid_telegram_data',
    'rate_limit_exceeded',
    'suspicious_user_agent',
    'api_validation_failed'
  ],
  
  // Niveles de severidad
  severity: {
    low: 'info',
    medium: 'warn', 
    high: 'error',
    critical: 'error'
  }
} as const;

// Función helper para verificar User Agent
export function isValidTelegramUserAgent(userAgent: string): boolean {
  return ALLOWED_USER_AGENTS.some(allowed => 
    userAgent.toLowerCase().includes(allowed.toLowerCase())
  );
}

// Función helper para generar nonce CSP
export function generateCSPNonce(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
}

// Función para log de eventos de seguridad
export function logSecurityEvent(
  event: string, 
  details: Record<string, unknown>,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    details: {
      ...details,
      // No incluir información sensible
      userAgent: typeof details.userAgent === 'string' 
        ? details.userAgent.substring(0, 100) 
        : 'unknown'
    }
  };
  
  console.log(`🛡️ SECURITY ${severity.toUpperCase()}:`, JSON.stringify(logEntry));
}
