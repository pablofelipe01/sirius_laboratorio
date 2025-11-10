'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// Declaraciones para la API de reconocimiento de voz
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface VoiceFilterControllerProps {
  onFiltersUpdate: (filters: any) => void;
  currentFilters: any;
  availableOptions: {
    states: string[];
    microorganisms: string[];
    responsables: string[];
  };
}

export default function VoiceFilterController({ 
  onFiltersUpdate, 
  currentFilters, 
  availableOptions 
}: VoiceFilterControllerProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Función para procesar comandos de voz y convertirlos en filtros
  const processVoiceCommand = useCallback((text: string) => {
    const lowerText = text.toLowerCase();
    const newFilters = { ...currentFilters };
    const commandsProcessed = [];

    console.log('🎤 Procesando comando de voz:', text);

    // Comandos de ayuda
    if (lowerText.includes('ayuda') || lowerText.includes('help') || lowerText.includes('comandos')) {
      setLastCommand('Comandos disponibles: "limpiar filtros", "estado incubación", "microorganismo trichoderma", "responsable Alexandra", "fecha hoy", "esta semana", "mínimo 100 bolsas"');
      return [];
    }

    // Limpiar filtros
    if (lowerText.includes('limpiar') || lowerText.includes('borrar') || lowerText.includes('reset')) {
      Object.keys(newFilters).forEach(key => newFilters[key] = '');
      commandsProcessed.push('Filtros limpiados');
    }

    // Código de lote
    const loteMatch = lowerText.match(/(?:lote|código)\s*(?:número)?\s*([a-z0-9]+)/i);
    if (loteMatch) {
      newFilters.codigoLote = loteMatch[1].toUpperCase();
      commandsProcessed.push(`Código de lote: ${newFilters.codigoLote}`);
    }

    // Estado del lote
    const estadoPatterns = [
      { patterns: ['incubación', 'incubando'], value: 'Incubacion' },
      { patterns: ['refrigeración', 'refrigerando', 'frío'], value: 'Refrigeración' },
      { patterns: ['agotado', 'agotados'], value: 'Agotado' }
    ];

    estadoPatterns.forEach(({ patterns, value }) => {
      if (patterns.some(pattern => lowerText.includes(pattern))) {
        newFilters.estado = value;
        commandsProcessed.push(`Estado: ${value}`);
      }
    });

    // Microorganismos (buscar coincidencias parciales con sinónimos)
    availableOptions.microorganisms.forEach(micro => {
      const microWords = micro.toLowerCase().split(' ');
      const microSynonyms = [
        { patterns: ['trichoderma', 'trico'], name: 'Trichoderma' },
        { patterns: ['bacillus', 'bacilo'], name: 'Bacillus' },
        { patterns: ['beauveria', 'beauve'], name: 'Beauveria' },
        { patterns: ['metarhizium', 'metarh'], name: 'Metarhizium' }
      ];
      
      // Buscar por palabras exactas del nombre
      if (microWords.some(word => lowerText.includes(word) && word.length > 3)) {
        newFilters.microorganismo = micro;
        commandsProcessed.push(`Microorganismo: ${micro}`);
        return;
      }
      
      // Buscar por sinónimos
      microSynonyms.forEach(synonym => {
        if (synonym.patterns.some(pattern => lowerText.includes(pattern)) && 
            micro.toLowerCase().includes(synonym.name.toLowerCase())) {
          newFilters.microorganismo = micro;
          commandsProcessed.push(`Microorganismo: ${micro}`);
        }
      });
    });

    // Responsable
    availableOptions.responsables.forEach(resp => {
      const respWords = resp.toLowerCase().split(' ');
      if (respWords.some(word => lowerText.includes(word) && word.length > 3)) {
        newFilters.responsable = resp;
        commandsProcessed.push(`Responsable: ${resp}`);
      }
    });

    // Fechas mejoradas
    const fechaHoyMatch = lowerText.match(/(?:hoy|today|fecha de hoy|fecha actual)/);
    if (fechaHoyMatch) {
      const today = new Date().toISOString().split('T')[0];
      newFilters.fechaDesde = today;
      newFilters.fechaHasta = today;
      commandsProcessed.push(`Fecha: hoy (${today})`);
    }

    const fechaSemanMatch = lowerText.match(/(?:esta semana|semana actual|semana|últimos 7 días)/);
    if (fechaSemanMatch) {
      const today = new Date();
      const firstDay = new Date(today);
      firstDay.setDate(today.getDate() - 7);
      newFilters.fechaDesde = firstDay.toISOString().split('T')[0];
      newFilters.fechaHasta = today.toISOString().split('T')[0];
      commandsProcessed.push('Fecha: últimos 7 días');
    }

    const fechaMesMatch = lowerText.match(/(?:este mes|mes actual|último mes|últimos 30 días)/);
    if (fechaMesMatch) {
      const today = new Date();
      const firstDay = new Date(today);
      firstDay.setDate(today.getDate() - 30);
      newFilters.fechaDesde = firstDay.toISOString().split('T')[0];
      newFilters.fechaHasta = today.toISOString().split('T')[0];
      commandsProcessed.push('Fecha: últimos 30 días');
    }

    // Fechas específicas (ej: "noviembre 6", "6 de noviembre")
    const fechaEspecificaMatch = lowerText.match(/(?:(\d{1,2})\s*de\s*(\w+)|(\w+)\s*(\d{1,2}))/);
    if (fechaEspecificaMatch) {
      const meses = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
        'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
        'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
      };
      
      const dia = fechaEspecificaMatch[1] || fechaEspecificaMatch[4];
      const mesNombre = fechaEspecificaMatch[2] || fechaEspecificaMatch[3];
      const mesNumero = meses[mesNombre.toLowerCase() as keyof typeof meses];
      
      if (dia && mesNumero) {
        const year = new Date().getFullYear();
        const fecha = `${year}-${mesNumero}-${dia.padStart(2, '0')}`;
        newFilters.fechaDesde = fecha;
        newFilters.fechaHasta = fecha;
        commandsProcessed.push(`Fecha específica: ${fecha}`);
      }
    }

    // Cantidad mínima
    const cantidadMatch = lowerText.match(/(?:mínimo|minimo|mayor a|más de)\s*(\d+)/);
    if (cantidadMatch) {
      newFilters.cantidadMinima = cantidadMatch[1];
      commandsProcessed.push(`Cantidad mínima: ${cantidadMatch[1]}`);
    }

    if (commandsProcessed.length > 0) {
      onFiltersUpdate(newFilters);
      setLastCommand(commandsProcessed.join(', '));
    } else {
      setLastCommand('No se reconocieron comandos válidos');
    }

    return commandsProcessed;
  }, [currentFilters, onFiltersUpdate, availableOptions]);

  // Función para alternar grabación
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      // Si está grabando, detener
      setIsRecording(false);
      return;
    }

    if (!navigator.mediaDevices || !window.webkitSpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz');
      return;
    }

    try {
      setIsRecording(true);
      setTranscript('');
      setLastCommand('Escuchando...');

      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onstart = () => {
        console.log('🎤 Iniciando grabación de voz...');
        setLastCommand('Escuchando...');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);

        if (finalTranscript) {
          console.log('🎯 Transcripción final:', finalTranscript);
          processVoiceCommand(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Error en reconocimiento de voz:', event.error);
        setIsRecording(false);
        setLastCommand('Error en el reconocimiento de voz');
      };

      recognition.onend = () => {
        setIsRecording(false);
        console.log('🏁 Reconocimiento de voz finalizado');
      };

      recognition.start();
    } catch (error) {
      console.error('Error al iniciar grabación:', error);
      setIsRecording(false);
      setLastCommand('Error al iniciar grabación');
    }
  }, [isRecording, processVoiceCommand]);

  // Mostrar tooltip con ayuda
  const showHelpTooltip = useCallback(() => {
    setShowTooltip(true);
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 3000);
  }, []);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-3">
      {/* Botón de micrófono */}
      <div className="relative">
        <button
          onClick={toggleRecording}
          onMouseEnter={showHelpTooltip}
          className={`
            inline-flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 border-2 relative
            ${isRecording 
              ? 'bg-red-50 border-red-200 text-red-700 shadow-sm animate-pulse' 
              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 shadow-sm'
            }
          `}
        >
          {isRecording && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
          )}
          <svg className={`w-4 h-4 mr-2 ${isRecording ? 'text-red-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          {isRecording ? 'Escuchando...' : 'Configurar por Voz'}
        </button>

        {/* Tooltip de ayuda */}
        {showTooltip && !isRecording && (
          <div className="absolute top-full mt-2 left-0 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10 shadow-lg">
            Di comandos como "estado incubación" o "limpiar filtros"
            <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-800 transform rotate-45"></div>
          </div>
        )}
      </div>

      {/* Mensaje del último comando */}
      {lastCommand && lastCommand !== 'Escuchando...' && (
        <div className="bg-green-50 border border-green-200 rounded-md px-3 py-2 text-sm text-green-700 max-w-md">
          {lastCommand}
        </div>
      )}

      {/* Indicador de transcripción en tiempo real */}
      {isRecording && transcript && (
        <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-sm text-blue-700 max-w-md">
          "{transcript}"
        </div>
      )}

      {/* Indicador de filtros activos */}
      {Object.values(currentFilters).some(v => v !== '') && (
        <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700">
          {Object.values(currentFilters).filter(v => v !== '').length} filtros activos
        </div>
      )}
    </div>
  );
}