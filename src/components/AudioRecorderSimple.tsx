'use client';

import { useState, useRef } from 'react';

interface AudioRecorderSimpleProps {
  onTranscriptionComplete: (text: string) => void;
  currentText: string;
  onTextChange: (text: string) => void;
}

const AudioRecorderSimple = ({ onTranscriptionComplete, currentText, onTextChange }: AudioRecorderSimpleProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      
      // Configurar MediaRecorder
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        await processAudio(audioBlob);
        
        // Limpiar stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Error al acceder al micrófono. Verifica los permisos.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    
    try {
      console.log('🎤 AUDIO: Iniciando transcripción...', {
        size: audioBlob.size,
        type: audioBlob.type
      });

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'es');
      formData.append('response_format', 'text');
      
      console.log('📡 AUDIO: Enviando a /api/transcribe...');
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      console.log('📋 AUDIO: Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ AUDIO: Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ AUDIO: Transcription result:', result);
      
      if (result.success && result.text) {
        const transcribedText = result.text.trim();
        console.log('📝 AUDIO: Texto transcrito:', transcribedText);
        // Actualizar el texto en la barra de búsqueda
        onTextChange(transcribedText);
        onTranscriptionComplete(transcribedText);
      } else {
        console.error('❌ AUDIO: Transcription failed:', result.error);
        alert('Error en la transcripción: ' + (result.error || 'Error desconocido'));
      }
      
    } catch (error) {
      console.error('❌ AUDIO: Error during transcription:', error);
      alert('Error al procesar el audio: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={isRecording ? stopRecording : startRecording}
      disabled={isTranscribing}
      className={`p-2 rounded-full transition-all duration-200 ${
        isRecording
          ? 'bg-red-500 text-white animate-pulse shadow-lg'
          : isTranscribing
          ? 'bg-yellow-500 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      title={
        isRecording 
          ? 'Detener grabación' 
          : isTranscribing 
          ? 'Transcribiendo...' 
          : 'Buscar por voz'
      }
    >
      {isRecording ? (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <rect x="6" y="6" width="8" height="8" rx="1" />
        </svg>
      ) : isTranscribing ? (
        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
};

export default AudioRecorderSimple;
