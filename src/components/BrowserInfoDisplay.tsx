'use client';

import { useState, useEffect } from 'react';
import { getBrowserInfo, formatBrowserInfo, getBrowserIcon, getDeviceIcon, type BrowserInfo } from '@/lib/browser-detection';

interface BrowserInfoDisplayProps {
  showDetails?: boolean;
  className?: string;
}

export default function BrowserInfoDisplay({ showDetails = false, className = '' }: BrowserInfoDisplayProps) {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window !== 'undefined') {
      const info = getBrowserInfo();
      setBrowserInfo(info);
      
      // Log para monitoreo
      console.log('🔍 Browser Detection:', {
        browser: `${info.name} ${info.version}`,
        platform: info.platform,
        deviceType: info.deviceType,
        isTelegram: info.isTelegram,
        telegramVersion: info.telegramVersion,
        userAgent: info.userAgent.substring(0, 100) + '...'
      });
    }
  }, []);

  if (!browserInfo) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded-lg p-3 ${className}`}>
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      </div>
    );
  }

  const browserIcon = getBrowserIcon(browserInfo.name);
  const deviceIcon = getDeviceIcon(browserInfo.deviceType);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{browserIcon}</span>
            <span className="text-lg">{deviceIcon}</span>
            <div className="text-sm">
              <div className="font-medium text-gray-900">
                {formatBrowserInfo(browserInfo)}
              </div>
              {browserInfo.isTelegram && (
                <div className="text-xs text-green-600 font-medium">
                  ✅ Acceso autorizado via Telegram
                </div>
              )}
              {!browserInfo.isTelegram && (
                <div className="text-xs text-amber-600 font-medium">
                  ⚠️ Acceso desde navegador web
                </div>
              )}
            </div>
          </div>
          
          {showDetails && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
        </div>

        {showDetails && isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="grid grid-cols-1 gap-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span className="font-medium">Navegador:</span>
                <span>{browserInfo.name} {browserInfo.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Sistema:</span>
                <span>{browserInfo.os}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Plataforma:</span>
                <span>{browserInfo.platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Dispositivo:</span>
                <span className="capitalize">{browserInfo.deviceType}</span>
              </div>
              {browserInfo.isTelegram && browserInfo.telegramVersion && (
                <div className="flex justify-between">
                  <span className="font-medium">Telegram:</span>
                  <span>v{browserInfo.telegramVersion}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium">Móvil:</span>
                <span>{browserInfo.isMobile ? 'Sí' : 'No'}</span>
              </div>
            </div>
            
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                <div className="font-medium mb-1">User Agent:</div>
                <div className="bg-gray-50 p-2 rounded text-xs font-mono break-all">
                  {browserInfo.userAgent}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
