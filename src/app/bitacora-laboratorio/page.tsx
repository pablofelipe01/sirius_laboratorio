'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface Responsable {
  id: string;
  nombre: string;
}

interface BitacoraData {
  realizaRegistro: string;
  transcripcionAudio: string;
  informeEjecutivo: string;
  equipoLaboratorio: string[];
  equipoLaboratorioId: string[];
}

interface RegistroBitacora {
  id: string;
  realizaRegistro: string;
  transcripcionAudio: string;
  informeEjecutivo: string;
  responsables: string[];
  equipoLaboratorio: string[];
  fechaCreacion: string;
}

export default function BitacoraLaboratorioPage() {
  const { user } = useAuth();
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [loadingResponsables, setLoadingResponsables] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [registros, setRegistros] = useState<RegistroBitacora[]>([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);

  // Form states
  const [transcripcionAudio, setTranscripcionAudio] = useState('');
  const [informeEjecutivo, setInformeEjecutivo] = useState('');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<string[]>([]);
  const [equipoSeleccionadoId, setEquipoSeleccionadoId] = useState<string[]>([]);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchResponsables();
    fetchRegistros();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const fetchResponsables = async () => {
    setLoadingResponsables(true);
    try {
      const response = await fetch('/api/equipo-laboratorio');
      const data = await response.json();
      
      if (data.success) {
        setResponsables(data.responsables);
      } else {
        console.error('Error loading responsables:', data.error);
      }
    } catch (error) {
      console.error('Error fetching responsables:', error);
    } finally {
      setLoadingResponsables(false);
    }
  };

  const fetchRegistros = async () => {
    setLoadingRegistros(true);
    try {
      const response = await fetch('/api/bitacora-laboratorio');
      const data = await response.json();
      
      if (data.success) {
        setRegistros(data.registros);
      } else {
        console.error('Error loading registros:', data.error);
      }
    } catch (error) {
      console.error('Error fetching registros:', error);
    } finally {
      setLoadingRegistros(false);
    }
  };

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
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      setErrorMessage('Error al acceder al micrófono. Verifique los permisos.');
      setSubmitStatus('error');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const transcribeAudio = async () => {
    if (!audioBlob) {
      setErrorMessage('No hay audio grabado para transcribir');
      setSubmitStatus('error');
      return;
    }

    setIsTranscribing(true);
    setSubmitStatus('idle');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/transcripcion', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setTranscripcionAudio(result.transcription);
        setSubmitStatus('success');
        setTimeout(() => setSubmitStatus('idle'), 3000);
      } else {
        setErrorMessage(result.error || 'Error al transcribir el audio');
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      setErrorMessage('Error de conexión al transcribir');
      setSubmitStatus('error');
    } finally {
      setIsTranscribing(false);
    }
  };

  const generateReport = async () => {
    if (!transcripcionAudio.trim()) {
      setErrorMessage('La transcripción está vacía. No se puede generar el informe.');
      setSubmitStatus('error');
      return;
    }

    setIsGeneratingReport(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/transcripcion', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcription: transcripcionAudio
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setInformeEjecutivo(result.informeEjecutivo);
        setSubmitStatus('success');
        setTimeout(() => setSubmitStatus('idle'), 3000);
      } else {
        setErrorMessage(result.error || 'Error al generar el informe ejecutivo');
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      setErrorMessage('Error de conexión al generar informe');
      setSubmitStatus('error');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const agregarResponsable = (responsableId: string, responsableNombre: string) => {
    if (!equipoSeleccionadoId.includes(responsableId)) {
      setEquipoSeleccionadoId([...equipoSeleccionadoId, responsableId]);
      setEquipoSeleccionado([...equipoSeleccionado, responsableNombre]);
    }
  };

  const removerResponsable = (responsableId: string) => {
    const index = equipoSeleccionadoId.indexOf(responsableId);
    if (index > -1) {
      const newIds = [...equipoSeleccionadoId];
      const newNames = [...equipoSeleccionado];
      newIds.splice(index, 1);
      newNames.splice(index, 1);
      setEquipoSeleccionadoId(newIds);
      setEquipoSeleccionado(newNames);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      if (!transcripcionAudio.trim() || !informeEjecutivo.trim() || equipoSeleccionadoId.length === 0) {
        setErrorMessage('Por favor complete todos los campos requeridos');
        setSubmitStatus('error');
        setIsSubmitting(false);
        return;
      }

      const bitacoraData: BitacoraData = {
        realizaRegistro: user?.nombre || '',
        transcripcionAudio: transcripcionAudio.trim(),
        informeEjecutivo: informeEjecutivo.trim(),
        equipoLaboratorio: equipoSeleccionado,
        equipoLaboratorioId: equipoSeleccionadoId
      };

      const response = await fetch('/api/bitacora-laboratorio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bitacoraData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmitStatus('success');
        
        // Reset form
        setTranscripcionAudio('');
        setInformeEjecutivo('');
        setEquipoSeleccionado([]);
        setEquipoSeleccionadoId([]);
        setAudioBlob(null);
        setRecordingTime(0);
        
        // Refresh registros
        await fetchRegistros();
        
        // Auto-hide success message
        setTimeout(() => {
          setSubmitStatus('idle');
        }, 3000);
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.error || 'Error al registrar la bitácora');
      }
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Error de conexión. Por favor, intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div 
        className="min-h-screen relative pt-20"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-700 p-8 text-white relative overflow-hidden">
              <div className="relative z-10 text-center">
                <h1 className="text-3xl font-bold mb-2">BITÁCORA DE LABORATORIO</h1>
                <p className="text-xl opacity-90">Sirius Regenerative Solutions S.A.S ZOMAC</p>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* Sección de Grabación de Audio */}
                <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-purple-500">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                    <span className="bg-purple-500 text-white p-2 rounded text-sm">🎤</span>
                    Grabación de Audio
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Controls de grabación */}
                    <div className="flex items-center gap-4">
                      {!isRecording ? (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2"
                        >
                          🎤 Iniciar Grabación
                        </button>
                      ) : (
                        <div className="flex items-center gap-3">
                          {!isPaused ? (
                            <button
                              type="button"
                              onClick={pauseRecording}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                            >
                              ⏸️ Pausar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={resumeRecording}
                              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                            >
                              ▶️ Reanudar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                          >
                            ⏹️ Detener
                          </button>
                        </div>
                      )}
                      
                      {isRecording && (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="font-mono text-lg font-semibold text-red-600">
                            {formatTime(recordingTime)}
                          </span>
                          <span className="text-sm text-gray-600">
                            {isPaused ? '(Pausado)' : '(Grabando)'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Botón de transcripción */}
                    {audioBlob && !isRecording && (
                      <div className="space-y-3">
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-green-800 font-semibold">✅ Audio grabado exitosamente</p>
                          <p className="text-sm text-green-600">Duración: {formatTime(recordingTime)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={transcribeAudio}
                          disabled={isTranscribing}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isTranscribing ? (
                            <span className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Transcribiendo...
                            </span>
                          ) : (
                            '📝 Transcribir Audio'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sección de Transcripción */}
                <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-purple-500">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                    <span className="bg-purple-500 text-white p-2 rounded text-sm">📝</span>
                    Transcripción de Audio
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Texto transcrito (editable)
                      </label>
                      <textarea
                        value={transcripcionAudio}
                        onChange={(e) => setTranscripcionAudio(e.target.value)}
                        placeholder="La transcripción del audio aparecerá aquí. También puede escribir directamente."
                        rows={8}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 resize-none"
                        required
                      />
                    </div>
                    
                    {transcripcionAudio.trim() && (
                      <button
                        type="button"
                        onClick={generateReport}
                        disabled={isGeneratingReport}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingReport ? (
                          <span className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Generando Informe...
                          </span>
                        ) : (
                          '🤖 Generar Informe Ejecutivo'
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Sección de Informe Ejecutivo */}
                <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-purple-500">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                    <span className="bg-purple-500 text-white p-2 rounded text-sm">📊</span>
                    Informe Ejecutivo
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Informe ejecutivo (editable)
                    </label>
                    <textarea
                      value={informeEjecutivo}
                      onChange={(e) => setInformeEjecutivo(e.target.value)}
                      placeholder="El informe ejecutivo aparecerá aquí automáticamente o puede escribir uno manualmente."
                      rows={10}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 resize-none"
                      required
                    />
                  </div>
                </div>

                {/* Sección de Equipo de Laboratorio */}
                <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-purple-500">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                    <span className="bg-purple-500 text-white p-2 rounded text-sm">👥</span>
                    Equipo de Laboratorio
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seleccionar miembros del equipo
                      </label>
                      <select
                        onChange={(e) => {
                          const selectedOption = e.target.options[e.target.selectedIndex];
                          const responsableId = e.target.value;
                          const responsableNombre = selectedOption.text;
                          
                          if (responsableId) {
                            agregarResponsable(responsableId, responsableNombre);
                            e.target.value = '';
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                        disabled={loadingResponsables}
                      >
                        <option value="">
                          {loadingResponsables ? 'Cargando responsables...' : 'Seleccione un miembro del equipo'}
                        </option>
                        {responsables
                          .filter(responsable => !equipoSeleccionadoId.includes(responsable.id))
                          .map((responsable) => (
                            <option key={responsable.id} value={responsable.id}>
                              {responsable.nombre}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Equipo seleccionado */}
                    {equipoSeleccionado.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-700">Equipo Seleccionado:</h4>
                        <div className="flex flex-wrap gap-2">
                          {equipoSeleccionado.map((nombre, index) => (
                            <div key={equipoSeleccionadoId[index]} className="bg-purple-100 border border-purple-300 rounded-lg px-3 py-2 flex items-center gap-2">
                              <span className="text-purple-800 font-medium">{nombre}</span>
                              <button
                                type="button"
                                onClick={() => removerResponsable(equipoSeleccionadoId[index])}
                                className="text-purple-600 hover:text-purple-800 font-bold"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Section */}
                <div className="border-t border-gray-200 pt-6 text-center">
                  {submitStatus === 'success' && (
                    <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                      ✅ Bitácora registrada exitosamente
                    </div>
                  )}
                  
                  {submitStatus === 'error' && (
                    <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                      ❌ {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-purple-500 to-purple-700 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:from-purple-600 hover:to-purple-800 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Registrando...' : '📋 Registrar Bitácora'}
                  </button>
                </div>
              </form>

              {/* Sección de Registros Anteriores */}
              <div className="mt-12 border-t border-gray-200 pt-8">
                <h3 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="bg-gray-500 text-white p-2 rounded text-sm">📚</span>
                  Registros Anteriores
                </h3>
                
                {loadingRegistros ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando registros...</p>
                  </div>
                ) : registros.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-4">📝</div>
                    <p className="text-lg">No hay registros de bitácora disponibles</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {registros.map((registro) => (
                      <div key={registro.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Información General</h4>
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Registrado por:</strong> {registro.realizaRegistro}
                            </p>
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Fecha:</strong> {new Date(registro.fechaCreacion).toLocaleDateString('es-CO')}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Equipo:</strong> {registro.responsables.join(', ') || 'No especificado'}
                            </p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Transcripción</h4>
                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
                              {registro.transcripcionAudio || 'Sin transcripción'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-4 border-t border-gray-100 pt-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Informe Ejecutivo</h4>
                          <div className="text-sm text-gray-700 bg-blue-50 p-4 rounded border max-h-40 overflow-y-auto whitespace-pre-wrap">
                            {registro.informeEjecutivo || 'Sin informe ejecutivo'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
