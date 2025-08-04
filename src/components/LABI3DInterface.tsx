'use client';

import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sphere, Text, PerspectiveCamera } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';

interface SIRIUSSphereProps {
  isListening: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
  audioLevel: number;
}

function SIRIUSSphere({ isListening, isSpeaking, isThinking, audioLevel }: SIRIUSSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Rotación suave
      meshRef.current.rotation.x += delta * 0.2;
      meshRef.current.rotation.y += delta * 0.3;
      
      // Animación basada en el estado
      if (isListening) {
        // Pulso cuando está escuchando
        const scale = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.1 * audioLevel;
        meshRef.current.scale.setScalar(scale);
      } else if (isSpeaking) {
        // Vibración cuando habla
        const scale = 1 + Math.sin(state.clock.elapsedTime * 15) * 0.05;
        meshRef.current.scale.setScalar(scale);
      } else if (isThinking) {
        // Pulso lento cuando piensa
        const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.08;
        meshRef.current.scale.setScalar(scale);
      } else {
        // Estado normal
        meshRef.current.scale.setScalar(1);
      }
    }
    
    if (materialRef.current) {
      // Cambio de color según el estado - colores más profesionales
      if (isListening) {
        materialRef.current.color.setHSL(0.6, 0.7, 0.6); // Azul profesional
        materialRef.current.emissive.setHSL(0.6, 0.5, 0.15);
      } else if (isSpeaking) {
        materialRef.current.color.setHSL(0.33, 0.7, 0.55); // Verde profesional
        materialRef.current.emissive.setHSL(0.33, 0.5, 0.12);
      } else if (isThinking) {
        materialRef.current.color.setHSL(0.75, 0.6, 0.6); // Púrpura profesional
        materialRef.current.emissive.setHSL(0.75, 0.4, 0.1);
      } else {
        materialRef.current.color.setHSL(0.58, 0.5, 0.5); // Azul neutro profesional
        materialRef.current.emissive.setHSL(0.58, 0.3, 0.08);
      }
    }
  });

  return (
    <group>
      <Sphere ref={meshRef} args={[2, 64, 64]} position={[0, 0, 0]}>
        <meshStandardMaterial
          ref={materialRef}
          transparent
          opacity={0.9}
          roughness={0.1}
          metalness={0.8}
        />
      </Sphere>
      
      {/* Partículas alrededor de la esfera */}
      {Array.from({ length: 20 }).map((_, i) => (
        <ParticleOrbit key={i} index={i} isActive={isListening || isSpeaking} />
      ))}
      
      {/* Texto flotante profesional */}
      {isListening && (
        <Text
          position={[0, -3.5, 0]}
          fontSize={0.4}
          color="#60a5fa"
          anchorX="center"
          anchorY="middle"
        >
          Analizando audio...
        </Text>
      )}
      
      {isSpeaking && (
        <Text
          position={[0, -3.5, 0]}
          fontSize={0.4}
          color="#34d399"
          anchorX="center"
          anchorY="middle"
        >
          Respuesta de IA
        </Text>
      )}
      
      {isThinking && (
        <Text
          position={[0, -3.5, 0]}
          fontSize={0.4}
          color="#a78bfa"
          anchorX="center"
          anchorY="middle"
        >
          Procesando consulta...
        </Text>
      )}
    </group>
  );
}

function ParticleOrbit({ index, isActive }: { index: number; isActive: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const radius = 3 + Math.random() * 2;
  const speed = 0.5 + Math.random() * 0.5;
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime * speed + index;
      meshRef.current.position.x = Math.cos(time) * radius;
      meshRef.current.position.z = Math.sin(time) * radius;
      meshRef.current.position.y = Math.sin(time * 0.5) * 1;
      
      // Hacer las partículas más brillantes cuando está activo
      if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
        meshRef.current.material.emissive.setScalar(isActive ? 0.3 : 0.1);
      }
    }
  });
  
  return (
    <Sphere ref={meshRef} args={[0.05, 8, 8]}>
      <meshStandardMaterial 
        color="#ffffff" 
        transparent 
        opacity={isActive ? 0.9 : 0.6}
        emissive={isActive ? "#ffffff" : "#888888"}
        emissiveIntensity={isActive ? 0.2 : 0.1}
      />
    </Sphere>
  );
}

export default function SIRIUS3DInterface() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isActive, setIsActive] = useState(true); // Siempre activo escuchando
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentResponse, setCurrentResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [isWaitingForCommand, setIsWaitingForCommand] = useState(true);
  const [lastTranscriptTime, setLastTranscriptTime] = useState(0);
  const [recognitionState, setRecognitionState] = useState<'idle' | 'starting' | 'running' | 'stopping'>('idle');
  const [microphonePermission, setMicrophonePermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const recognitionRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isProcessingRef = useRef(false);
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const lastStartTimeRef = useRef(0);
  const startAttemptRef = useRef(false); // Bandera para evitar múltiples intentos

  // Función para solicitar permisos de micrófono
  const requestMicrophonePermission = async () => {
    console.log('🔐 Solicitando permisos de micrófono...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Si llegamos aquí, tenemos permisos
      stream.getTracks().forEach(track => track.stop()); // Detener el stream de prueba
      console.log('✅ Permisos de micrófono concedidos');
      setMicrophonePermission('granted');
      setShowPermissionModal(false);
      
      // Iniciar el reconocimiento de voz después de obtener permisos
      if (isActive && !startAttemptRef.current) {
        console.log('🎯 Iniciando reconocimiento después de obtener permisos...');
        setTimeout(() => {
          startContinuousListening();
        }, 1000);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error al solicitar permisos de micrófono:', error);
      setMicrophonePermission('denied');
      setShowPermissionModal(true);
      return false;
    }
  };

  // Función de diagnóstico para probar el reconocimiento
  const runDiagnostic = () => {
    console.log('🔧 Ejecutando diagnóstico completo...');
    console.log('📊 Estado actual del sistema:', {
      microphonePermission,
      recognitionState,
      isListening,
      isSpeaking,
      isThinking,
      isActive,
      isProcessingRef: isProcessingRef.current,
      startAttemptRef: startAttemptRef.current,
      hasRecognitionRef: !!recognitionRef.current,
      hasSynthRef: !!synthRef.current
    });
    
    if (microphonePermission !== 'granted') {
      console.log('❌ Problema: Sin permisos de micrófono');
      return;
    }
    
    if (!recognitionRef.current) {
      console.log('❌ Problema: No hay referencia de reconocimiento');
      return;
    }
    
    console.log('🎯 Forzando inicio de reconocimiento para diagnóstico...');
    startAttemptRef.current = false; // Reset la bandera
    setRecognitionState('idle'); // Reset el estado
    
    setTimeout(() => {
      startContinuousListening();
    }, 500);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitializedRef.current) {
      isInitializedRef.current = true;
      synthRef.current = window.speechSynthesis;
      
      // Primero verificar si el navegador soporta reconocimiento de voz
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'es-ES';
        
        recognitionRef.current.onstart = () => {
          console.log('🎤 Reconocimiento de voz iniciado');
          setIsListening(true);
          setRecognitionState('running');
          lastStartTimeRef.current = Date.now();
          startAttemptRef.current = false; // Liberar la bandera de intento
        };
        
        recognitionRef.current.onend = () => {
          console.log('🎤 Reconocimiento de voz terminado');
          setIsListening(false);
          setRecognitionState('idle');
          startAttemptRef.current = false; // Asegurar que la bandera esté libre
          
          // Limpiar timeout existente antes de crear uno nuevo
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = null;
          }
          
          // Solo reiniciar si ha pasado suficiente tiempo desde el último inicio
          const timeSinceStart = Date.now() - lastStartTimeRef.current;
          if (isActive && !isProcessingRef.current && !isSpeaking && timeSinceStart > 2000 && microphonePermission === 'granted') {
            restartTimeoutRef.current = setTimeout(() => {
              if (recognitionState === 'idle' && isActive && !isProcessingRef.current && !isSpeaking && !startAttemptRef.current) {
                startContinuousListening();
              }
            }, 1500);
          }
        };
        
        recognitionRef.current.onresult = (event: any) => {
          console.log('📢 Evento de resultado de reconocimiento recibido');
          let finalTranscript = '';
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            console.log(`📝 Resultado ${i}: "${transcript}" (final: ${event.results[i].isFinal})`);
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          if (interimTranscript.trim()) {
            console.log('🔄 Texto provisional:', interimTranscript);
          }
          
          if (finalTranscript.trim()) {
            console.log('✅ Texto final detectado:', finalTranscript);
            setLastTranscriptTime(Date.now());
            handleVoiceCommand(finalTranscript.trim());
          } else {
            console.log('⏳ Esperando texto final...');
          }
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error('❌ Error de reconocimiento de voz:', event.error);
          setIsListening(false);
          setRecognitionState('idle');
          startAttemptRef.current = false; // Liberar la bandera en caso de error
          
          // Limpiar timeouts existentes
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = null;
          }
          
          // Manejar diferentes tipos de errores con delays más largos
          if (event.error === 'network' || event.error === 'audio-capture') {
            console.log('🔄 Error de red/audio, reintentando en 5 segundos...');
            if (microphonePermission === 'granted') {
              restartTimeoutRef.current = setTimeout(() => {
                if (isActive && !isProcessingRef.current && !isSpeaking && recognitionState === 'idle' && !startAttemptRef.current) {
                  startContinuousListening();
                }
              }, 5000);
            }
          } else if (event.error === 'no-speech') {
            console.log('🔄 Sin habla detectada, reiniciando en 3 segundos...');
            if (microphonePermission === 'granted') {
              restartTimeoutRef.current = setTimeout(() => {
                if (isActive && !isProcessingRef.current && !isSpeaking && recognitionState === 'idle' && !startAttemptRef.current) {
                  startContinuousListening();
                }
              }, 3000);
            }
          } else if (event.error === 'aborted') {
            console.log('🔄 Reconocimiento abortado, esperando antes de reiniciar...');
            if (microphonePermission === 'granted') {
              restartTimeoutRef.current = setTimeout(() => {
                if (isActive && !isProcessingRef.current && !isSpeaking && recognitionState === 'idle' && !startAttemptRef.current) {
                  startContinuousListening();
                }
              }, 3000);
            }
          } else if (event.error === 'not-allowed') {
            console.error('❌ Permisos de micrófono denegados');
            setMicrophonePermission('denied');
            setIsActive(false);
            setShowPermissionModal(true);
          }
        };
        
        // Solicitar permisos de micrófono antes de iniciar reconocimiento
        setTimeout(async () => {
          if (microphonePermission === 'pending') {
            const hasPermission = await requestMicrophonePermission();
            if (!hasPermission) {
              setShowPermissionModal(true);
            }
          }
        }, 1000);
      } else {
        console.error('❌ El navegador no soporta reconocimiento de voz');
        setCurrentResponse('Tu navegador no soporta reconocimiento de voz. Prueba con Chrome o Edge.');
      }
    }
    
    return () => {
      // Limpieza al desmontar el componente
      startAttemptRef.current = false; // Liberar bandera
      
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
        transcriptTimeoutRef.current = null;
      }
      if (recognitionRef.current && recognitionState === 'running') {
        try {
          recognitionRef.current.abort();
        } catch (error) {
          console.log('Error al abortar reconocimiento en limpieza:', error);
        }
      }
      isInitializedRef.current = false;
    };
  }, []);

  const startContinuousListening = () => {
    console.log('🔍 Intentando iniciar reconocimiento continuo...');
    console.log('📊 Estado actual:', {
      startAttempt: startAttemptRef.current,
      micPermission: microphonePermission,
      recognitionRef: !!recognitionRef.current,
      isActive,
      isProcessing: isProcessingRef.current,
      isSpeaking,
      recognitionState
    });
    
    // Verificación atómica para evitar múltiples intentos simultáneos
    if (startAttemptRef.current) {
      console.log('❌ Ya hay un intento de inicio en progreso');
      return;
    }
    
    // Verificar permisos de micrófono
    if (microphonePermission !== 'granted') {
      console.log('❌ Sin permisos de micrófono, estado:', microphonePermission);
      console.log('🔍 Verificando permisos reales del navegador...');
      
      // Verificar permisos reales del navegador
      navigator.permissions.query({ name: 'microphone' as PermissionName })
        .then(permission => {
          console.log('🎤 Estado real de permisos:', permission.state);
          if (permission.state === 'granted') {
            console.log('🔄 Corrigiendo estado de permisos...');
            setMicrophonePermission('granted');
            // Reintentar después de corregir
            setTimeout(() => {
              if (!startAttemptRef.current) {
                startContinuousListening();
              }
            }, 500);
          }
        })
        .catch(err => console.log('Error verificando permisos:', err));
      
      if (microphonePermission === 'denied') {
        setShowPermissionModal(true);
      }
      return;
    }
    
    // Verificar que todas las condiciones sean correctas
    if (!recognitionRef.current || !isActive || isProcessingRef.current || isSpeaking) {
      console.log('❌ No se puede iniciar reconocimiento: condiciones no cumplidas');
      console.log('📊 Detalles:', {
        hasRecognition: !!recognitionRef.current,
        isActive,
        isProcessing: isProcessingRef.current,
        isSpeaking
      });
      return;
    }
    
    // Verificar que no esté ya en proceso de inicio o ejecutándose
    if (recognitionState === 'starting' || recognitionState === 'running') {
      console.log('❌ Reconocimiento ya está iniciándose o ejecutándose, estado:', recognitionState);
      return;
    }
    
    // Verificar si ha pasado suficiente tiempo desde el último intento
    const timeSinceLastStart = Date.now() - lastStartTimeRef.current;
    if (timeSinceLastStart < 2000) {
      console.log('❌ Muy poco tiempo desde último inicio, programando reinicio...');
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      restartTimeoutRef.current = setTimeout(() => {
        if (recognitionState === 'idle') {
          startContinuousListening();
        }
      }, 2000 - timeSinceLastStart);
      return;
    }
    
    // Marcar que estamos intentando iniciar
    startAttemptRef.current = true;
    
    try {
      console.log('🎯 Iniciando reconocimiento de voz...');
      setRecognitionState('starting');
      lastStartTimeRef.current = Date.now();
      recognitionRef.current.start();
    } catch (error: any) {
      console.error('❌ Error al iniciar reconocimiento:', error);
      setRecognitionState('idle');
      startAttemptRef.current = false; // Liberar la bandera
      
      if (error.message && error.message.includes('already started')) {
        console.log('🔄 Reconocimiento ya iniciado, esperando 5 segundos...');
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
        }
        restartTimeoutRef.current = setTimeout(() => {
          if (recognitionState === 'idle') {
            startContinuousListening();
          }
        }, 5000);
      }
    }
  };

  const handleVoiceCommand = async (transcript: string) => {
    const text = transcript.toLowerCase().trim();
    console.log('🎯 Procesando comando de voz:', {
      original: transcript,
      processed: text,
      isSpeaking,
      isWaitingForCommand
    });
    
    // Detectar comando de interrupción mientras habla
    if (isSpeaking && (text.includes('para') || text.includes('detente') || text.includes('basta') || text.includes('silencio') || text.includes('stop'))) {
      console.log('🛑 Comando de interrupción detectado');
      stopAllActivity();
      return;
    }
    
    // Detectar palabras de activación para hacer una pregunta
    const hasWakeWord = text.includes('sirius') || text.includes('hola') || text.includes('oye');
    console.log('🔍 Verificando palabra de activación:', {
      hasWakeWord,
      containsSirius: text.includes('sirius'),
      containsHola: text.includes('hola'),
      containsOye: text.includes('oye'),
      isWaitingForCommand
    });
    
    // Si tenemos palabra de activación O si estamos esperando un comando
    if (hasWakeWord || isWaitingForCommand) {
      console.log('🤖 SIRIUS procesando comando:', transcript);
      setIsWaitingForCommand(false);
      isProcessingRef.current = true;
      
      // Detener el reconocimiento temporalmente para procesar
      if (recognitionRef.current && recognitionState === 'running') {
        try {
          setRecognitionState('stopping');
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Error al detener reconocimiento:', error);
        }
      }
      
      let question = transcript;
      
      // Si tenemos palabra de activación, extraer la pregunta después
      if (hasWakeWord) {
        // Buscar y extraer la pregunta después de las palabras de activación
        const activationWords = ['sirius', 'hola sirius', 'oye sirius', 'hola', 'oye'];
        for (const word of activationWords) {
          const index = text.indexOf(word);
          if (index !== -1) {
            question = transcript.substring(index + word.length).trim();
            break;
          }
        }
      }
      
      if (question.length > 3) {
        console.log('🎙️ Enviando pregunta a IA:', question);
        await handleVoiceInput(question);
      } else if (hasWakeWord) {
        // Si solo fue activación sin pregunta, dar mensaje de bienvenida y esperar comando
        setCurrentResponse('Hola, soy SIRIUS, tu asistente inteligente de laboratorio. ¿En qué puedo ayudarte?');
        speakResponse('Hola, soy SIRIUS, tu asistente inteligente de laboratorio. ¿En qué puedo ayudarte?');
        setIsWaitingForCommand(true); // Activar modo de espera de comando
      }
    }
  };

  const stopAllActivity = () => {
    console.log('🛑 Interrumpiendo todas las actividades de SIRIUS...');
    
    // Liberar bandera de intento
    startAttemptRef.current = false;
    
    // Detener síntesis de voz
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    
    // Abortar solicitud HTTP si está en proceso
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Detener reconocimiento de voz si está activo
    if (recognitionRef.current && recognitionState === 'running') {
      try {
        setRecognitionState('stopping');
        recognitionRef.current.abort();
      } catch (error) {
        console.log('Error al abortar reconocimiento:', error);
      }
    }
    
    // Limpiar timeouts
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    // Resetear estados
    setIsSpeaking(false);
    setIsThinking(false);
    setIsWaitingForCommand(true);
    isProcessingRef.current = false;
    
    console.log('✅ SIRIUS interrumpido, reiniciando reconocimiento...');
    
    // Reiniciar reconocimiento después de un delay más largo
    setTimeout(() => {
      if (isActive && !isProcessingRef.current && recognitionState === 'idle' && !startAttemptRef.current) {
        startContinuousListening();
      }
    }, 4000);
  };

  const handleVoiceInput = async (transcript: string) => {
    if (isProcessingRef.current) return;
    
    console.log('📝 Procesando consulta:', transcript);
    setIsThinking(true);
    isProcessingRef.current = true;
    
    // Crear nuevo AbortController para esta solicitud
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch('/api/sirius', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: transcript,
          userId: 'voice-user',
          conversationHistory: conversationHistory
        }),
        signal: abortControllerRef.current.signal
      });

      const data = await response.json();
      const aiResponse = data.response;
      
      // Actualizar historial
      setConversationHistory(prev => [
        ...prev,
        { type: 'user', content: transcript },
        { type: 'ai', content: aiResponse }
      ]);
      
      setCurrentResponse(aiResponse);
      setIsThinking(false);
      
      // Reproducir respuesta por voz si no se ha interrumpido
      if (!abortControllerRef.current.signal.aborted) {
        speakResponse(aiResponse);
      }
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🛑 Solicitud a la IA fue cancelada');
      } else {
        console.error('Error:', error);
        speakResponse('Lo siento, hubo un error. Intenta de nuevo.');
      }
      setIsThinking(false);
    } finally {
      abortControllerRef.current = null;
      isProcessingRef.current = false;
      setIsWaitingForCommand(true);
    }
  };

  const speakResponse = (text: string) => {
    if (synthRef.current) {
      // Cancelar cualquier síntesis anterior
      synthRef.current.cancel();
      
      // Detener reconocimiento mientras habla usando abort para ser más drástico
      if (recognitionRef.current && (recognitionState === 'running' || recognitionState === 'starting')) {
        try {
          setRecognitionState('stopping');
          recognitionRef.current.abort();
        } catch (error) {
          console.log('Error al abortar reconocimiento para hablar:', error);
        }
      }
      
      // Limpiar timeouts para evitar reinicios no deseados
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      
      // Limpiar el texto de markdown y caracteres especiales
      const cleanText = text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remover markdown bold
        .replace(/\*(.*?)\*/g, '$1') // Remover markdown italic
        .replace(/#{1,6}\s/g, '') // Remover headers
        .replace(/🔬|🧬|📊|⚗️|🎯|💬|🔍|🤖|📝|📦|🦠|🟡|🔴|✅|🔢/g, '') // Remover emojis
        .replace(/\n/g, '. ') // Convertir saltos de línea en pausas
        .trim();
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'es-ES';
      utterance.rate = 0.85; // Velocidad más natural
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      
      // Buscar una voz en español si está disponible
      const voices = synthRef.current.getVoices();
      const spanishVoice = voices.find(voice => 
        voice.lang.includes('es') || voice.lang.includes('ES')
      );
      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }
      
      utterance.onstart = () => {
        console.log('🗣️ SIRIUS iniciando respuesta');
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        console.log('✅ SIRIUS terminó de hablar');
        setIsSpeaking(false);
        setIsWaitingForCommand(true);
        isProcessingRef.current = false;
        
        // Reiniciar reconocimiento después de un delay más largo para estabilidad
        setTimeout(() => {
          if (isActive && recognitionState === 'idle' && !startAttemptRef.current) {
            startContinuousListening();
          }
        }, 2000);
      };
      
      utterance.onerror = (event) => {
        console.error('❌ Error en síntesis de voz:', event.error);
        setIsSpeaking(false);
        setIsWaitingForCommand(true);
        isProcessingRef.current = false;
        
        // Reiniciar reconocimiento en caso de error con delay
        setTimeout(() => {
          if (isActive && recognitionState === 'idle' && !startAttemptRef.current) {
            startContinuousListening();
          }
        }, 2000);
      };
      
      // Pequeño delay para asegurar que la interfaz se actualice
      setTimeout(() => {
        synthRef.current?.speak(utterance);
      }, 100);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] relative">
      {/* Canvas 3D */}
      <div className="absolute inset-0">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 8]} />
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={1.5} />
          <pointLight position={[-10, -10, -10]} intensity={0.8} />
          <spotLight position={[0, 10, 0]} intensity={1} angle={0.3} penumbra={1} />
          
          <Suspense fallback={null}>
            <SIRIUSSphere
              isListening={isListening}
              isSpeaking={isSpeaking}
              isThinking={isThinking}
              audioLevel={audioLevel}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* UI superpuesta */}
      <div className="relative z-10 min-h-[calc(100vh-8rem)] flex flex-col justify-center">
        {/* Estado actual centrado */}
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div 
            className="text-center max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {/* Estado actual */}
            <div className="mb-8">
              <motion.div
                className="bg-black/60 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/10"
                animate={{
                  scale: isListening || isSpeaking || isThinking ? 1.02 : 1,
                  boxShadow: isListening || isSpeaking || isThinking 
                    ? '0 25px 50px -12px rgba(255, 255, 255, 0.1)' 
                    : '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
                }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-center mb-6">
                  <div className={`w-4 h-4 rounded-full mr-3 ${
                    isListening ? 'bg-blue-400 animate-pulse' :
                    isSpeaking ? 'bg-green-400 animate-pulse' :
                    isThinking ? 'bg-purple-400 animate-pulse' :
                    'bg-blue-300'
                  }`}></div>
                  <p className="text-xl font-semibold text-white">
                    {microphonePermission === 'denied' && '🚫 Micrófono Bloqueado'}
                    {microphonePermission === 'pending' && '⏳ Solicitando Permisos...'}
                    {microphonePermission === 'granted' && isListening && '🎤 Escuchando...'}
                    {microphonePermission === 'granted' && isSpeaking && '🗣️ Respondiendo...'}
                    {microphonePermission === 'granted' && isThinking && '🧠 Analizando...'}
                    {microphonePermission === 'granted' && !isListening && !isSpeaking && !isThinking && isWaitingForCommand && '👂 Esperando comandos...'}
                    {microphonePermission === 'granted' && !isListening && !isSpeaking && !isThinking && !isWaitingForCommand && '🤖 SIRIUS Activo'}
                  </p>
                </div>
                
                {/* Instrucciones */}
                <div className="space-y-3 text-gray-300">
                  {microphonePermission === 'denied' && (
                    <div className="space-y-2">
                      <p className="text-lg text-red-400">LABI necesita permisos de micrófono para funcionar</p>
                      <div className="text-sm space-y-1">
                        <p>• Haz clic en el ícono 🎤 en la barra de direcciones</p>
                        <p>• Selecciona "Permitir" para el micrófono</p>
                        <p>• O haz clic en el botón "Permitir Acceso" arriba</p>
                      </div>
                      <button
                        onClick={requestMicrophonePermission}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                      >
                        Permitir Acceso al Micrófono
                      </button>
                    </div>
                  )}
                  
                  {microphonePermission === 'pending' && (
                    <div className="space-y-2">
                      <p className="text-lg text-yellow-400">Configurando acceso al micrófono...</p>
                      <p className="text-sm">Por favor, permite el acceso cuando el navegador lo solicite</p>
                    </div>
                  )}
                  
                  {microphonePermission === 'granted' && isWaitingForCommand && !isSpeaking && !isThinking && (
                    <div className="space-y-2">
                      <p className="text-lg">Dí <span className="text-blue-400 font-semibold">"Hola SIRIUS"</span> para activarme</p>
                      <div className="text-sm space-y-1">
                        <p>• "SIRIUS, ¿cuántas inoculaciones hay hoy?"</p>
                        <p>• "Oye SIRIUS, muéstrame el estado del laboratorio"</p>
                        <p>• "SIRIUS, ¿qué microorganismos tenemos?"</p>
                      </div>
                      
                      {/* Botón de diagnóstico */}
                      <div className="mt-4 pt-4 border-t border-gray-600">
                        <p className="text-sm text-gray-400 mb-2">¿No funciona? Prueba el diagnóstico:</p>
                        <button
                          onClick={runDiagnostic}
                          className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                        >
                          🔧 Ejecutar Diagnóstico
                        </button>
                        <p className="text-xs text-gray-500 mt-1">Abre la consola del navegador (F12) para ver los logs</p>
                      </div>
                    </div>
                  )}
                  
                  {microphonePermission === 'granted' && isSpeaking && (
                    <p className="text-lg">
                      Puedes interrumpirme diciendo <span className="text-red-400 font-semibold">"Para"</span> o <span className="text-red-400 font-semibold">"Basta"</span>
                    </p>
                  )}
                  
                  {microphonePermission === 'granted' && isThinking && (
                    <p className="text-lg">Procesando tu consulta con IA especializada en laboratorio...</p>
                  )}
                  
                  {microphonePermission === 'granted' && isListening && !isWaitingForCommand && (
                    <p className="text-lg">Te estoy escuchando, haz tu consulta...</p>
                  )}
                </div>
                
                {/* Indicador visual de actividad */}
                <div className="mt-6 flex justify-center">
                  {isListening && (
                    <div className="flex space-x-1">
                      <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  )}
                  
                  {isSpeaking && (
                    <div className="flex space-x-1">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    </div>
                  )}
                  
                  {isThinking && (
                    <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
              </motion.div>
            </div>
            
            {/* Respuesta actual */}
            {currentResponse && (
              <motion.div 
                className="bg-black/70 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/10"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex items-start mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-3 mt-1">
                    <span className="text-white text-sm">🤖</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-2">Respuesta de SIRIUS:</h3>
                    <p className="text-gray-200 leading-relaxed text-left">{currentResponse}</p>
                  </div>
                </div>
                
                {isSpeaking && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-600">
                    <div className="flex items-center">
                      <div className="flex space-x-1 mr-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-green-400 text-sm font-medium">Reproduciendo respuesta por voz</span>
                    </div>
                    <div className="text-red-400 text-sm">
                      Dí "Para" para interrumpir
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Modal de permisos de micrófono */}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <motion.div
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 max-w-md mx-4 shadow-2xl border border-white/10"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🎤</span>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-4">
                Permisos de Micrófono Requeridos
              </h3>
              
              <p className="text-gray-300 mb-6 leading-relaxed">
                SIRIUS necesita acceso a tu micrófono para poder escuchar tus comandos de voz y funcionar correctamente.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={requestMicrophonePermission}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Permitir Acceso al Micrófono
                </button>
                
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-gray-200 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Cancelar
                </button>
              </div>
              
              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-300">
                  💡 <strong>Nota:</strong> Si el navegador no muestra la solicitud de permisos, busca el ícono del micrófono en la barra de direcciones y haz clic en "Permitir".
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
