'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  onResult: (data: {
    aprovechables: { nombre: string; cantidadKg: number }[];
    organicos: { nombre: string; cantidadKg: number }[];
    peligrosos: { nombre: string; cantidadKg: number }[];
    noAprovechables: { nombre: string; cantidadKg: number }[];
    entregadoA: string;
    observaciones: string;
  }) => void;
  onTranscript?: (text: string) => void;
  disabled?: boolean;
}

export default function ManejoResiduosVoiceRecorder({ onResult, onTranscript, disabled }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const pickMime = (): string => {
    const opts = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    for (const m of opts) if (MediaRecorder.isTypeSupported(m)) return m;
    return 'audio/webm';
  };

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      const mime = pickMime();
      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => upload(new Blob(chunksRef.current, { type: mime }));
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      console.error(e);
      setError('No se pudo acceder al micrófono. Revisa los permisos.');
    }
  };

  const stop = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const upload = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'residuos.webm');
      const res = await fetch('/api/voice-to-residuos', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo procesar el audio');
      }
      if (onTranscript && json.transcript) onTranscript(json.transcript);
      onResult(json.data);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Error al procesar audio');
    } finally {
      setIsProcessing(false);
    }
  };

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          type="button"
          onClick={isRecording ? stop : start}
          disabled={disabled || isProcessing}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white shadow-lg transition-all ${
            isRecording
              ? 'bg-red-600 hover:bg-red-700 animate-pulse'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className="text-xl">{isRecording ? '⏹️' : '🎙️'}</span>
          <span>{isRecording ? `Detener (${mmss})` : 'Grabar voz'}</span>
        </button>

        <div className="flex-1 text-sm text-gray-700">
          {isProcessing ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-purple-500 animate-ping" />
              Transcribiendo y estructurando con IA…
            </span>
          ) : isRecording ? (
            <span>Habla con naturalidad: di los residuos por categoría, cantidades en kg, a quién se entregó y observaciones.</span>
          ) : (
            <span>Pulsa para dictar el manejo de residuos. La IA llenará el formulario por ti.</span>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}
