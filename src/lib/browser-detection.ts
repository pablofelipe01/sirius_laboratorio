/**
 * Utilidades para detectar información del navegador y dispositivo
 * Sirius Regenerative Solutions S.A.S ZOMAC
 */

export interface BrowserInfo {
  name: string;
  version: string;
  platform: string;
  userAgent: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTelegram: boolean;
  telegramVersion?: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  os: string;
}

export function getBrowserInfo(): BrowserInfo {
  // Verificar si estamos en el lado del cliente
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      name: 'Unknown',
      version: 'Unknown',
      platform: 'Server',
      userAgent: 'Server-side',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTelegram: false,
      deviceType: 'desktop',
      os: 'Unknown'
    };
  }

  const userAgent = navigator.userAgent;
  
  // Detectar navegador
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  
  if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1) {
    browserName = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (userAgent.indexOf('Firefox') > -1) {
    browserName = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
    browserName = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (userAgent.indexOf('Edg') > -1) {
    browserName = 'Edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) {
    browserName = 'Opera';
    const match = userAgent.match(/(Opera|OPR)\/(\d+)/);
    browserVersion = match ? match[2] : 'Unknown';
  }

  // Detectar si es Telegram
  const isTelegram = userAgent.includes('TelegramBot') || 
                    userAgent.includes('Telegram') ||
                    userAgent.includes('tdesktop') ||
                    userAgent.includes('Telegram Desktop');
  
  let telegramVersion: string | undefined;
  if (isTelegram) {
    // Intentar extraer versión de Telegram
    const telegramMatch = userAgent.match(/Telegram[\/\s]?(\d+\.?\d*)/i);
    telegramVersion = telegramMatch ? telegramMatch[1] : 'Unknown';
    
    if (userAgent.includes('TelegramBot')) {
      browserName = 'Telegram WebApp';
    } else if (userAgent.includes('tdesktop')) {
      browserName = 'Telegram Desktop';
    } else {
      browserName = 'Telegram';
    }
  }

  // Detectar dispositivo
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bTablet\b)|Android(?=.*\bTablet\b)/i.test(userAgent);
  const isDesktop = !isMobile && !isTablet;

  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (isTablet) deviceType = 'tablet';
  else if (isMobile) deviceType = 'mobile';

  // Detectar sistema operativo
  let os = 'Unknown';
  if (userAgent.indexOf('Windows') > -1) os = 'Windows';
  else if (userAgent.indexOf('Mac') > -1) os = 'macOS';
  else if (userAgent.indexOf('Linux') > -1) os = 'Linux';
  else if (userAgent.indexOf('Android') > -1) os = 'Android';
  else if (userAgent.indexOf('iPhone') > -1 || userAgent.indexOf('iPad') > -1) os = 'iOS';

  return {
    name: browserName,
    version: browserVersion,
    platform: navigator.platform || 'Unknown',
    userAgent: userAgent,
    isMobile,
    isTablet,
    isDesktop,
    isTelegram,
    telegramVersion,
    deviceType,
    os
  };
}

export function formatBrowserInfo(info: BrowserInfo): string {
  let result = `${info.name} ${info.version}`;
  
  if (info.isTelegram && info.telegramVersion) {
    result += ` (Telegram ${info.telegramVersion})`;
  }
  
  result += ` - ${info.os} (${info.deviceType})`;
  
  return result;
}

export function getBrowserIcon(browserName: string): string {
  switch (browserName.toLowerCase()) {
    case 'chrome':
      return '🌐';
    case 'firefox':
      return '🦊';
    case 'safari':
      return '🧭';
    case 'edge':
      return '🔷';
    case 'opera':
      return '🎭';
    case 'telegram':
    case 'telegram webapp':
    case 'telegram desktop':
      return '✈️';
    default:
      return '🖥️';
  }
}

export function getDeviceIcon(deviceType: string): string {
  switch (deviceType) {
    case 'mobile':
      return '📱';
    case 'tablet':
      return '📟';
    case 'desktop':
      return '💻';
    default:
      return '🖥️';
  }
}
