import crypto from 'crypto';

export interface TelegramWebAppData {
  query_id?: string;
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  auth_date: number;
  hash: string;
}

export function validateTelegramWebAppData(initData: string, botToken: string): boolean {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    return calculatedHash === hash;
  } catch (error) {
    console.error('Error validating Telegram data:', error);
    return false;
  }
}

export function parseTelegramWebAppData(initData: string): TelegramWebAppData | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const userData = urlParams.get('user');
    const authDate = urlParams.get('auth_date');
    const hash = urlParams.get('hash');
    const queryId = urlParams.get('query_id');
    
    if (!authDate || !hash) {
      return null;
    }
    
    return {
      query_id: queryId || undefined,
      user: userData ? JSON.parse(userData) : undefined,
      auth_date: parseInt(authDate),
      hash,
    };
  } catch (error) {
    console.error('Error parsing Telegram data:', error);
    return null;
  }
}

export function isTelegramWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Telegram?.WebApp; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function getTelegramWebApp() {
  if (typeof window === 'undefined') return null;
  return (window as any).Telegram?.WebApp; // eslint-disable-line @typescript-eslint/no-explicit-any
}
