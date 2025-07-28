'use client';

import { useState, useRef } from 'react';

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  currentText: string;
  onTextChange: (text: string) => void;
}

const AudioRecorder = ({ onTranscriptionComplete, currentText, onTextChange }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      streamRef.current = stream;
      
      // Priorizar formatos compatibles con OpenAI Whisper
      let mimeType = 'audio/webm'; // Fallback más compatible
      
      // Probar formatos en orden de preferencia para OpenAI (evitar codecs problemáticos)
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        setAudioBlob(blob);
        transcribeAudio(blob, mimeType);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Timer para mostrar tiempo de grabación
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Error al acceder al micrófono. Por favor, permite el acceso al micrófono.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setIsRecording(false);
    setRecordingTime(0);
  };

  const transcribeAudio = async (audioBlob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    
    try {
      const formData = new FormData();
      
      // Usar siempre webm como extensión ya que es lo más compatible con OpenAI
      formData.append('audio', audioBlob, 'recording.webm');

      // Obtener token de autorización del localStorage
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const transcribedText = data.text;
        onTranscriptionComplete(transcribedText);
      } else {
        console.error('Error transcribing audio:', data.error);
        alert(`Error al transcribir el audio: ${data.error}`);
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      alert('Error de conexión al transcribir. Por favor, intenta nuevamente.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-gray-900 mb-3">
        🎙️ Motivo del Descarte (Nota de Voz)
      </label>
      
      {/* Controles de grabación */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={isTranscribing}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            🎤 Grabar Nota de Voz
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200"
            >
              <div className="w-3 h-3 bg-white rounded-sm"></div>
              Detener
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-700 font-mono">
                🕐 {formatTime(recordingTime)}
              </span>
            </div>
          </div>
        )}

        {isTranscribing && (
          <div className="flex items-center gap-2 text-blue-600">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm">Transcribiendo audio...</span>
          </div>
        )}
      </div>

      {/* Campo de texto editable */}
      <div>
        <textarea
          value={currentText}
          onChange={(e) => onTextChange(e.target.value)}
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white resize-none"
          placeholder="El texto transcrito aparecerá aquí y podrás editarlo..."
        />
        <p className="text-xs text-gray-500 mt-1">
          💡 Puedes grabar una nota de voz o escribir directamente el motivo del descarte.
        </p>
      </div>

      {/* Reproductor de audio si hay grabación */}
      {audioBlob && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700 mb-2">🎵 Última grabación:</p>
          <audio 
            controls 
            src={URL.createObjectURL(audioBlob)}
            className="w-full h-8"
          />
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
