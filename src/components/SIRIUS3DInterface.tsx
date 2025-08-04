'use client';

import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, PerspectiveCamera } from '@react-three/drei';
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
      // Cambio de color según el estado - colores brillantes como la estrella SIRIUS en el espacio
      if (isListening) {
        materialRef.current.color.setHSL(0.55, 1.0, 0.8); // Azul estelar brillante
        materialRef.current.emissive.setHSL(0.55, 0.9, 0.4);
      } else if (isSpeaking) {
        materialRef.current.color.setHSL(0.3, 1.0, 0.85); // Verde esmeralda cósmico
        materialRef.current.emissive.setHSL(0.3, 0.8, 0.35);
      } else if (isThinking) {
        materialRef.current.color.setHSL(0.75, 0.9, 0.8); // Púrpura nebuloso
        materialRef.current.emissive.setHSL(0.75, 0.7, 0.25);
      } else {
        // Estado normal - Blanco azulado como SIRIUS, la estrella más brillante del cielo
        materialRef.current.color.setHSL(0.58, 0.4, 0.95); // Blanco estelar puro
        materialRef.current.emissive.setHSL(0.58, 0.5, 0.2);
      }
    }
  });

  return (
    <group>
      {/* Núcleo energético central */}
      <Sphere args={[0.8, 32, 32]} position={[0, 0, 0]}>
        <meshBasicMaterial
          transparent
          opacity={0.9}
          color={
            isListening ? "#00FFFF" :
            isSpeaking ? "#00FF00" :
            isThinking ? "#FF00FF" :
            "#FFFFFF"
          }
        />
      </Sphere>
      
      {/* Esfera principal de SIRIUS con efectos cristalinos */}
      <Sphere ref={meshRef} args={[2.2, 128, 128]} position={[0, 0, 0]}>
        <meshPhysicalMaterial
          ref={materialRef}
          transparent
          opacity={0.8}
          roughness={0.0}
          metalness={0.2}
          clearcoat={1.0}
          clearcoatRoughness={0.0}
          transmission={0.4}
          thickness={0.8}
          ior={1.5}
          envMapIntensity={2.0}
        />
      </Sphere>
      
      {/* Esfera interna con efectos cristalinos mejorados */}
      <Sphere args={[1.8, 64, 64]} position={[0, 0, 0]}>
        <meshPhysicalMaterial
          transparent
          opacity={0.4}
          transmission={0.9}
          thickness={0.8}
          roughness={0.0}
          metalness={0.0}
          clearcoat={1.0}
          clearcoatRoughness={0.0}
          ior={1.4}
          color={
            isListening ? "#00BFFF" :  // Azul eléctrico brillante
            isSpeaking ? "#32CD32" :   // Verde lima vibrante
            isThinking ? "#9370DB" :   // Púrpura médium brillante
            "#E0FFFF"                  // Cyan claro cristalino
          }
          emissive={
            isListening ? "#0080FF" :
            isSpeaking ? "#00FF32" :
            isThinking ? "#8A2BE2" :
            "#4169E1"
          }
          emissiveIntensity={isListening || isSpeaking || isThinking ? 0.8 : 0.4}
        />
      </Sphere>
      
      {/* Anillo exterior con efectos holográficos */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.8, 0.08, 12, 100]} />
        <meshPhysicalMaterial
          transparent
          opacity={isListening || isSpeaking || isThinking ? 0.9 : 0.6}
          transmission={0.3}
          thickness={0.2}
          roughness={0.1}
          metalness={0.8}
          clearcoat={1.0}
          clearcoatRoughness={0.0}
          color={
            isListening ? "#00FFFF" :  // Cyan brillante
            isSpeaking ? "#00FF7F" :   // Spring green
            isThinking ? "#DA70D6" :   // Orchid
            "#4169E1"                  // Royal blue
          }
          emissive={
            isListening ? "#0080FF" :
            isSpeaking ? "#00FF00" :
            isThinking ? "#8B00FF" :
            "#1E90FF"
          }
          emissiveIntensity={isListening || isSpeaking || isThinking ? 1.0 : 0.5}
        />
      </mesh>
      
      {/* Segundo anillo rotando en dirección opuesta */}
      <mesh rotation={[0, Math.PI / 4, Math.PI / 2]}>
        <torusGeometry args={[3.2, 0.04, 8, 64]} />
        <meshBasicMaterial
          transparent
          opacity={isListening || isSpeaking || isThinking ? 0.7 : 0.3}
          color={
            isListening ? "#00CED1" :  // Dark turquoise
            isSpeaking ? "#ADFF2F" :   // Green yellow
            isThinking ? "#BA55D3" :   // Medium orchid
            "#6495ED"                  // Cornflower blue
          }
        />
      </mesh>
      
      {/* Partículas orbitales mejoradas */}
      {Array.from({ length: 50 }).map((_, i) => (
        <ParticleOrbit key={i} index={i} isActive={isListening || isSpeaking || isThinking} />
      ))}
      
      {/* Efecto de ondas energéticas */}
      {(isListening || isSpeaking || isThinking) && (
        <>
          <mesh>
            <sphereGeometry args={[4.5, 32, 32]} />
            <meshBasicMaterial
              transparent
              opacity={0.1}
              color={
                isListening ? "#00FFFF" :
                isSpeaking ? "#00FF7F" :
                "#DA70D6"
              }
              wireframe
            />
          </mesh>
          
          <mesh>
            <sphereGeometry args={[5.2, 24, 24]} />
            <meshBasicMaterial
              transparent
              opacity={0.05}
              color={
                isListening ? "#0080FF" :
                isSpeaking ? "#32CD32" :
                "#9370DB"
              }
              wireframe
            />
          </mesh>
        </>
      )}
    </group>
  );
}

function ParticleOrbit({ index, isActive }: { index: number; isActive: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const radius = 4.0 + Math.random() * 2.5;
  const speed = 0.2 + Math.random() * 0.6;
  const yOffset = (Math.random() - 0.5) * 3;
  const particleType = Math.floor(Math.random() * 3); // 3 tipos de partículas
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime * speed + index;
      meshRef.current.position.x = Math.cos(time) * radius;
      meshRef.current.position.z = Math.sin(time) * radius;
      meshRef.current.position.y = Math.sin(time * 0.3) * 2 + yOffset;
      
      // Rotación más dinámica
      meshRef.current.rotation.x += 0.02;
      meshRef.current.rotation.y += 0.03;
      meshRef.current.rotation.z += 0.01;
      
      // Pulso en el tamaño
      const pulseFactor = 1 + Math.sin(state.clock.elapsedTime * 4 + index) * 0.3;
      meshRef.current.scale.setScalar(isActive ? pulseFactor * 1.5 : pulseFactor);
      
      // Cambio dinámico de colores según el tipo
      if (meshRef.current.material instanceof THREE.MeshPhysicalMaterial) {
        const intensity = isActive ? 1.2 : 0.6;
        
        switch(particleType) {
          case 0: // Azul cristalino
            meshRef.current.material.emissive.setHex(isActive ? 0x00FFFF : 0x4169E1);
            meshRef.current.material.color.setHex(0xE0FFFF);
            break;
          case 1: // Verde esmeralda
            meshRef.current.material.emissive.setHex(isActive ? 0x00FF7F : 0x20B2AA);
            meshRef.current.material.color.setHex(0xF0FFF0);
            break;
          case 2: // Púrpura místico
            meshRef.current.material.emissive.setHex(isActive ? 0xDA70D6 : 0x9370DB);
            meshRef.current.material.color.setHex(0xE6E6FA);
            break;
        }
        meshRef.current.material.emissiveIntensity = intensity;
      }
    }
  });
  
  const particleSize = 0.04 + Math.random() * 0.08;
  
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[particleSize, 12, 12]} />
      <meshPhysicalMaterial 
        transparent 
        opacity={isActive ? 0.9 : 0.7}
        transmission={0.6}
        thickness={0.3}
        roughness={0.0}
        metalness={0.1}
        clearcoat={1.0}
        clearcoatRoughness={0.0}
        ior={1.4}
        color="#FFFFFF"
      />
    </mesh>
  );
}

export default function SIRIUS3DInterface() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isActive] = useState(true);
  const [audioLevel] = useState(0);
  const [currentResponse, setCurrentResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{type: string; content: string}>>([]);
  const [isWaitingForCommand, setIsWaitingForCommand] = useState(true);
  const [recognitionState, setRecognitionState] = useState<'idle' | 'starting' | 'running' | 'stopping'>('idle');
  const [microphonePermission, setMicrophonePermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
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
  const startAttemptRef = useRef(false);

  // Función para iniciar/detener grabación de audio
  const toggleRecording = async () => {
    if (!isRecording) {
      // Iniciar grabación
      console.log('🎤 Iniciando grabación de audio...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
            channelCount: 1
          } 
        });
        
        // Configurar opciones más compatibles para MediaRecorder
        const options: MediaRecorderOptions = {};
        
        // Probar diferentes formatos en orden de preferencia
        if (MediaRecorder.isTypeSupported('audio/wav')) {
          (options as any).mimeType = 'audio/wav';
        } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          (options as any).mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          (options as any).mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          (options as any).mimeType = 'audio/mp4';
        }
        
        console.log('🎙️ Formato de grabación:', options.mimeType || 'por defecto');
        
        mediaRecorderRef.current = new MediaRecorder(stream, options);
        audioChunksRef.current = [];
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
            console.log('📊 Chunk de audio recibido:', event.data.size, 'bytes');
          }
        };
        
        mediaRecorderRef.current.onstop = async () => {
          console.log('🔴 Grabación finalizada, procesando audio...');
          
          // Detener todas las pistas del stream
          stream.getTracks().forEach(track => track.stop());
          
          if (audioChunksRef.current.length > 0) {
            const mimeType = options.mimeType || 'audio/wav';
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            console.log('🎵 Audio blob creado:', audioBlob.size, 'bytes, tipo:', audioBlob.type);
            
            if (audioBlob.size > 0) {
              // Procesar el audio grabado
              await processRecordedAudio(audioBlob);
            } else {
              console.error('❌ Audio blob vacío');
              setCurrentResponse('❌ **Grabación Vacía**\n\nNo se detectó audio en la grabación. Asegúrate de:\n\n• Permitir acceso al micrófono\n• Hablar durante la grabación\n• Verificar que el micrófono funcione');
              speakResponse('No se detectó audio en la grabación. Verifica tu micrófono e intenta de nuevo.');
            }
          } else {
            console.error('❌ No hay chunks de audio');
            setCurrentResponse('❌ **Sin Datos de Audio**\n\nNo se capturó ningún dato de audio. Posibles causas:\n\n• Micrófono desconectado\n• Permisos insuficientes\n• Problemas del navegador');
            speakResponse('No se capturó audio. Verifica los permisos del micrófono.');
          }
        };
        
        mediaRecorderRef.current.onerror = (event) => {
          console.error('❌ Error en MediaRecorder:', event);
          setCurrentResponse('❌ **Error de Grabación**\n\nHubo un problema con la grabación de audio.');
          speakResponse('Hubo un error con la grabación. Intenta de nuevo.');
          setIsRecording(false);
        };
        
        mediaRecorderRef.current.start(250); // Chunks cada 250ms para mejor calidad
        setIsRecording(true);
        setIsListening(true);
        console.log('✅ Grabación iniciada');
        
      } catch (error) {
        console.error('❌ Error al iniciar grabación:', error);
        setMicrophonePermission('denied');
        setShowPermissionModal(true);
      }
    } else {
      // Detener grabación
      console.log('⏹️ Deteniendo grabación...');
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setIsListening(false);
    }
  };

  // Función para procesar el audio grabado
  const processRecordedAudio = async (audioBlob: Blob) => {
    console.log('🧠 Procesando audio con IA...');
    setIsThinking(true);
    
    try {
      // Crear FormData para enviar el audio
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      
      // Enviar audio a la API de transcripción
      const transcriptionResponse = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      const data = await transcriptionResponse.json();
      console.log('📝 Respuesta de transcripción:', data);
      
      if (data.success && data.text && data.text.trim()) {
        console.log('✅ Transcripción exitosa:', data.text);
        // Enviar la transcripción a SIRIUS para obtener respuesta
        await handleVoiceInput(data.text.trim());
      } else {
        console.error('❌ Error en transcripción:', data.error || 'Sin texto transcrito');
        
        // Manejo específico de errores
        if (data.error && data.error.includes('Connection error')) {
          setCurrentResponse('⚠️ **Error de Conexión**\n\nNo puedo conectarme a los servidores de transcripción. Esto puede deberse a:\n\n• Problemas de conectividad a internet\n• Servidores temporalmente no disponibles\n• Configuración de red\n\nPor favor, verifica tu conexión e intenta nuevamente.');
          speakResponse('No puedo conectarme a los servidores. Verifica tu conexión a internet e intenta de nuevo.');
        } else if (data.error && data.error.includes('No se pudo transcribir')) {
          setCurrentResponse('🎤 **Audio No Reconocido**\n\nNo pude entender lo que dijiste. Consejos:\n\n• Habla más claro y despacio\n• Acércate más al micrófono\n• Reduce el ruido de fondo\n• Intenta grabar por más tiempo');
          speakResponse('No pude entender lo que dijiste. Habla más claro y cerca del micrófono.');
        } else {
          setCurrentResponse('❌ **Error de Transcripción**\n\nHubo un problema procesando tu audio. Error: ' + (data.error || 'Audio vacío o sin reconocer') + '\n\nIntenta nuevamente.');
          speakResponse('No pude procesar tu audio. Intenta de nuevo por favor.');
        }
      }
      
    } catch (error) {
      console.error('❌ Error procesando audio:', error);
      setCurrentResponse('💥 **Error del Sistema**\n\nHubo un error interno procesando tu solicitud. Intenta nuevamente en unos momentos.');
      speakResponse('Hubo un error del sistema. Intenta de nuevo por favor.');
    } finally {
      setIsThinking(false);
    }
  };

  // Función para solicitar permisos de micrófono
  const requestMicrophonePermission = async () => {
    console.log('� Solicitando permisos de micrófono...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Si llegamos aquí, tenemos permisos
      stream.getTracks().forEach(track => track.stop()); // Detener el stream de prueba
      console.log('✅ Permisos de micrófono concedidos');
      setMicrophonePermission('granted');
      setShowPermissionModal(false);
      return true;
    } catch (error) {
      console.error('❌ Error al solicitar permisos de micrófono:', error);
      setMicrophonePermission('denied');
      setShowPermissionModal(true);
      return false;
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitializedRef.current) {
      isInitializedRef.current = true;
      synthRef.current = window.speechSynthesis;
      
      // Solicitar permisos de micrófono al cargar
      setTimeout(async () => {
        await requestMicrophonePermission();
      }, 1000);
    }
    
    return () => {
      // Limpieza al desmontar el componente
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
        transcriptTimeoutRef.current = null;
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
    
    // Detener grabación si está activa
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        console.log('⏹️ Grabación detenida');
      } catch (error) {
        console.warn('⚠️ Error deteniendo grabación:', error);
      }
    }
    
    // Detener síntesis de voz de forma segura
    if (synthRef.current) {
      try {
        if (synthRef.current.speaking) {
          synthRef.current.cancel();
          console.log('🔇 Síntesis de voz cancelada');
        }
      } catch (error) {
        console.warn('⚠️ Error cancelando síntesis:', error);
      }
    }
    
    // Abortar solicitud HTTP si está en proceso
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
        console.log('🚫 Solicitud HTTP abortada');
      } catch (error) {
        console.warn('⚠️ Error abortando solicitud:', error);
      }
    }
    
    // Limpiar timeouts
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (transcriptTimeoutRef.current) {
      clearTimeout(transcriptTimeoutRef.current);
      transcriptTimeoutRef.current = null;
    }
    
    // Resetear estados
    setIsSpeaking(false);
    setIsThinking(false);
    isProcessingRef.current = false;
    
    console.log('✅ SIRIUS interrumpido exitosamente');
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
      
      // Actualizar historial
      setConversationHistory(prev => [
        ...prev,
        { type: 'user', content: transcript },
        { type: 'ai', content: data.response }
      ]);
      
      setCurrentResponse(data.response);
      setIsThinking(false);
      
      // Reproducir respuesta por voz si no se ha interrumpido y no está hablando
      if (!abortControllerRef.current?.signal.aborted && !isSpeaking) {
        speakResponse(data.response);
      } else if (isSpeaking) {
        console.log('⚠️ Ya hay una síntesis en curso, esperando...');
        // Esperar a que termine la síntesis actual antes de la nueva
        const checkAndSpeak = () => {
          if (!isSpeaking && !abortControllerRef.current?.signal.aborted) {
            speakResponse(data.response);
          } else if (isSpeaking) {
            setTimeout(checkAndSpeak, 500);
          }
        };
        setTimeout(checkAndSpeak, 500);
      }
      
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
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
    if (!synthRef.current) {
      console.warn('⚠️ SpeechSynthesis no disponible');
      return;
    }

    try {
      // Cancelar cualquier síntesis anterior de forma segura
      if (synthRef.current.speaking) {
        synthRef.current.cancel();
        // Pequeña pausa para que termine de cancelar
        setTimeout(() => proceedWithSpeech(), 100);
      } else {
        proceedWithSpeech();
      }

      function proceedWithSpeech() {
        if (!synthRef.current) return;

        // Limpiar el texto de markdown y caracteres especiales
        const cleanText = text
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remover markdown bold
          .replace(/\*(.*?)\*/g, '$1') // Remover markdown italic
          .replace(/#{1,6}\s/g, '') // Remover headers
          .replace(/🔬|🧬|📊|⚗️|🎯|💬|🔍|🤖|📝|📦|🦠|🟡|🔴|✅|🔢/g, '') // Remover emojis
          .replace(/\n/g, '. ') // Convertir saltos de línea en pausas
          .trim();
        
        // Verificar que hay texto para hablar
        if (!cleanText || cleanText.length === 0) {
          console.warn('⚠️ No hay texto para sintetizar');
          return;
        }
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'es-ES';
        utterance.rate = 0.85; // Velocidad más natural
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
        
        // Buscar una voz en español si está disponible
        const voices = synthRef.current?.getVoices() || [];
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
          isProcessingRef.current = false;
        };
        
        utterance.onerror = (event) => {
          // Manejar diferentes tipos de errores de síntesis
          if (event.error === 'interrupted') {
            console.log('ℹ️ Síntesis de voz interrumpida por el usuario');
          } else if (event.error === 'canceled') {
            console.log('ℹ️ Síntesis de voz cancelada');
          } else {
            console.error('❌ Error en síntesis de voz:', event.error);
          }
          
          // Resetear estados independientemente del tipo de error
          setIsSpeaking(false);
          isProcessingRef.current = false;
        };
        
        // Verificar que synthRef sigue disponible antes de hablar
        if (synthRef.current && !synthRef.current.speaking) {
          synthRef.current.speak(utterance);
        } else {
          console.warn('⚠️ SpeechSynthesis ocupado o no disponible');
          setIsSpeaking(false);
          isProcessingRef.current = false;
        }
      }
      
    } catch (error) {
      console.error('❌ Error configurando síntesis de voz:', error);
      setIsSpeaking(false);
      isProcessingRef.current = false;
    }
  };

  return (
    <>
      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #000;
          color: white;
          overflow: hidden;
          height: 100vh;
        }

        /* Fondo espacial premium */
        .space-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: 
            radial-gradient(ellipse at 20% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(139, 0, 255, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 40% 80%, rgba(0, 255, 127, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at center, #1a1a2e 0%, #16213e 25%, #0f0f23 50%, #000 100%);
          z-index: 1;
          animation: background-shift 20s ease-in-out infinite;
        }

        @keyframes background-shift {
          0%, 100% { filter: hue-rotate(0deg) brightness(1); }
          25% { filter: hue-rotate(30deg) brightness(1.1); }
          50% { filter: hue-rotate(60deg) brightness(0.9); }
          75% { filter: hue-rotate(90deg) brightness(1.05); }
        }

        /* Estrellas mejoradas con efectos avanzados */
        .stars {
          position: absolute;
          width: 100%;
          height: 100%;
        }

        .star {
          position: absolute;
          background: white;
          border-radius: 50%;
          animation: stellar-twinkle 4s infinite ease-in-out;
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.8);
        }

        .star:nth-child(odd) {
          animation-delay: 1s;
          background: linear-gradient(45deg, #87CEEB, #00BFFF);
        }

        .star:nth-child(3n) {
          animation-delay: 2s;
          background: linear-gradient(45deg, #DA70D6, #FF69B4);
        }

        .star:nth-child(5n) {
          animation-delay: 3s;
          background: linear-gradient(45deg, #00FF7F, #32CD32);
          animation-duration: 5s;
        }

        @keyframes stellar-twinkle {
          0%, 100% { 
            opacity: 0.3; 
            transform: scale(1) rotate(0deg); 
            box-shadow: 0 0 6px rgba(255, 255, 255, 0.3);
          }
          25% { 
            opacity: 0.8; 
            transform: scale(1.5) rotate(90deg); 
            box-shadow: 0 0 15px rgba(255, 255, 255, 0.8);
          }
          50% { 
            opacity: 1; 
            transform: scale(1.8) rotate(180deg); 
            box-shadow: 0 0 20px rgba(255, 255, 255, 1);
          }
          75% { 
            opacity: 0.6; 
            transform: scale(1.2) rotate(270deg); 
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.6);
          }
        }

        /* Nebulosas galácticas premium */
        .nebula {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          animation: cosmic-drift 25s infinite ease-in-out;
          opacity: 0.6;
        }

        .nebula-1 {
          top: 5%;
          left: 10%;
          width: 500px;
          height: 500px;
          background: 
            radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.2) 30%, transparent 70%),
            radial-gradient(circle at 70% 70%, rgba(0, 191, 255, 0.3) 0%, rgba(0, 191, 255, 0.1) 40%, transparent 80%),
            radial-gradient(circle at 50% 50%, rgba(135, 206, 235, 0.2) 0%, transparent 60%);
        }

        .nebula-2 {
          bottom: 10%;
          right: 5%;
          width: 450px;
          height: 450px;
          background: 
            radial-gradient(circle at 40% 60%, rgba(147, 51, 234, 0.35) 0%, rgba(147, 51, 234, 0.15) 35%, transparent 75%),
            radial-gradient(circle at 60% 40%, rgba(218, 112, 214, 0.25) 0%, rgba(218, 112, 214, 0.1) 45%, transparent 85%),
            radial-gradient(circle at 50% 50%, rgba(186, 85, 211, 0.15) 0%, transparent 65%);
          animation-delay: -8s;
        }

        .nebula-3 {
          top: 35%;
          right: 25%;
          width: 400px;
          height: 400px;
          background: 
            radial-gradient(circle at 20% 80%, rgba(0, 255, 127, 0.3) 0%, rgba(0, 255, 127, 0.12) 40%, transparent 80%),
            radial-gradient(circle at 80% 20%, rgba(50, 205, 50, 0.25) 0%, rgba(50, 205, 50, 0.08) 50%, transparent 90%),
            radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.18) 0%, transparent 70%);
          animation-delay: -15s;
        }

        .nebula-4 {
          top: 60%;
          left: 20%;
          width: 350px;
          height: 350px;
          background: 
            radial-gradient(circle at 60% 30%, rgba(255, 20, 147, 0.25) 0%, rgba(255, 20, 147, 0.1) 40%, transparent 80%),
            radial-gradient(circle at 30% 70%, rgba(255, 0, 255, 0.2) 0%, rgba(255, 0, 255, 0.08) 50%, transparent 90%);
          animation-delay: -20s;
        }

        @keyframes cosmic-drift {
          0%, 100% { 
            transform: translate(0, 0) scale(1) rotate(0deg); 
            opacity: 0.6;
          }
          25% { 
            transform: translate(40px, -30px) scale(1.15) rotate(90deg); 
            opacity: 0.8;
          }
          50% { 
            transform: translate(-30px, 40px) scale(0.85) rotate(180deg); 
            opacity: 0.4;
          }
          75% { 
            transform: translate(50px, 20px) scale(1.05) rotate(270deg); 
            opacity: 0.7;
          }
        }

        /* Controles mejorados */
        .controls {
          position: absolute;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 30px;
          z-index: 20;
        }

        .control-button {
          width: 80px;
          height: 80px;
          border: none;
          border-radius: 50%;
          font-size: 28px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .control-button:before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }

        .control-button:hover:before {
          background: rgba(255, 255, 255, 0.2);
        }

        .control-button:active {
          transform: scale(0.95);
        }

        .record-btn {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
        }

        .record-btn.recording {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          box-shadow: 0 10px 30px rgba(239, 68, 68, 0.4);
          animation: recording-pulse 1s ease-in-out infinite;
        }

        .stop-btn {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3);
        }

        .stop-btn:disabled {
          background: linear-gradient(135deg, #6b7280, #4b5563);
          color: #9ca3af;
          cursor: not-allowed;
          box-shadow: none;
        }

        @keyframes recording-pulse {
          0%, 100% { box-shadow: 0 10px 30px rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 10px 50px rgba(239, 68, 68, 0.7), 0 0 30px rgba(239, 68, 68, 0.5); }
        }

        /* Modal de permisos mejorado */
        .permission-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95));
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 40px;
          max-width: 500px;
          margin: 20px;
          text-align: center;
          backdrop-filter: blur(20px);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        }

        .modal-icon {
          width: 80px;
          height: 80px;
          background: rgba(6, 182, 212, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          font-size: 36px;
        }

        .modal-title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 15px;
          color: white;
        }

        .modal-text {
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
          margin-bottom: 30px;
        }

        .modal-buttons {
          display: flex;
          gap: 15px;
          flex-direction: column;
        }

        .modal-button {
          padding: 15px 30px;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .modal-button.primary {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
        }

        .modal-button.primary:hover {
          background: linear-gradient(135deg, #2563eb, #1e40af);
          transform: translateY(-2px);
        }

        .modal-button.secondary {
          background: rgba(107, 114, 128, 0.3);
          color: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .modal-button.secondary:hover {
          background: rgba(107, 114, 128, 0.5);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .control-button {
            width: 70px;
            height: 70px;
            font-size: 24px;
          }

          .controls {
            bottom: 80px;
            gap: 20px;
          }

          .modal-content {
            padding: 30px;
            margin: 15px;
          }
        }
      `}</style>
      
      <div className="min-h-[calc(100vh-8rem)] relative overflow-hidden">
        {/* Fondo espacial mejorado */}
        <div className="space-background"></div>
        
        {/* Campo estelar premium */}
        <div className="stars">
          {Array.from({ length: 200 }).map((_, i) => (
            <div
              key={i}
              className="star"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 4 + 1}px`,
                height: `${Math.random() * 4 + 1}px`,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${Math.random() * 4 + 3}s`,
              }}
            />
          ))}
        </div>
        
        {/* Nebulosas galácticas */}
        <div className="nebula nebula-1"></div>
        <div className="nebula nebula-2"></div>
        <div className="nebula nebula-3"></div>
        <div className="nebula nebula-4"></div>

        {/* Canvas 3D */}
        <div className="absolute inset-0">
          <Canvas camera={{ position: [0, 0, 8], fov: 75 }}>
            <PerspectiveCamera makeDefault position={[0, 0, 8]} />
            
            {/* Iluminación mejorada para espacio */}
            <ambientLight intensity={0.2} color="#4A90E2" />
            <pointLight position={[10, 10, 10]} intensity={2} color="#ffffff" />
            <pointLight position={[-10, -10, -10]} intensity={1.5} color="#87CEEB" />
            <pointLight position={[5, -5, 5]} intensity={1} color="#FFD700" />
            <spotLight 
              position={[0, 15, 0]} 
              intensity={2} 
              angle={0.4} 
              penumbra={0.5} 
              color="#ffffff"
              castShadow
            />
            
            {/* Luz de relleno azul del espacio */}
            <hemisphereLight args={['#87CEEB', '#000080', 0.4]} />
            
            <Suspense fallback={null}>
              <SIRIUSSphere
                isListening={isRecording}
                isSpeaking={isSpeaking}
                isThinking={isThinking}
                audioLevel={audioLevel}
              />
            </Suspense>
          </Canvas>
        </div>

        {/* UI superpuesta */}
        <div className="relative z-10 min-h-[calc(100vh-8rem)] flex flex-col">
          {/* Estado actual centrado más arriba */}
          <div className="flex-1 flex flex-col items-center justify-start pt-20 px-6">
            <motion.div 
              className="text-center max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              {/* Solo mostrar estado cuando hay permisos denegados o pendientes */}
              {(microphonePermission === 'denied' || microphonePermission === 'pending') && (
                <div className="mb-8">
                  <motion.div
                    className="bg-black/60 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/10"
                    animate={{
                      scale: 1.02,
                      boxShadow: '0 25px 50px -12px rgba(255, 255, 255, 0.1)'
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center justify-center mb-6">
                      <p className="text-xl font-semibold text-white">
                        {microphonePermission === 'denied' && '🚫 Micrófono Bloqueado'}
                        {microphonePermission === 'pending' && '⏳ Solicitando Permisos...'}
                      </p>
                    </div>
                    
                    <div className="space-y-3 text-gray-300">
                      {microphonePermission === 'denied' && (
                        <div className="space-y-2">
                          <p className="text-lg text-red-400">SIRIUS necesita permisos de micrófono para funcionar</p>
                          <div className="text-sm space-y-1">
                            <p>• Haz clic en el ícono 🎤 en la barra de direcciones</p>
                            <p>• Selecciona &quot;Permitir&quot; para el micrófono</p>
                            <p>• O haz clic en el botón &quot;Permitir Acceso&quot; arriba</p>
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
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
            
            {/* Botones de control con estilo mejorado */}
            <div className="controls">
              {microphonePermission === 'granted' && (
                <>
                  <button
                    onClick={toggleRecording}
                    disabled={false}
                    className={`control-button record-btn ${isRecording ? 'recording' : ''}`}
                    title={isRecording ? 'Detener grabación' : 'Grabar audio'}
                  >
                    <span>🎤</span>
                  </button>
                  
                  <button
                    onClick={stopAllActivity}
                    disabled={!isSpeaking && !isThinking && !isRecording}
                    className="control-button stop-btn"
                    title="Detener SIRIUS"
                  >
                    <span>⏹️</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Modal de permisos con estilo mejorado */}
        {showPermissionModal && (
          <div className="permission-modal">
            <motion.div
              className="modal-content"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="modal-icon">
                <span>✨</span>
              </div>
              
              <h3 className="modal-title">
                Permisos de Micrófono Requeridos
              </h3>
              
              <p className="modal-text">
                SIRIUS necesita acceso a tu micrófono para poder escuchar tus comandos de voz y funcionar correctamente.
              </p>
              
              <div className="modal-buttons">
                <button
                  onClick={requestMicrophonePermission}
                  className="modal-button primary"
                >
                  Permitir Acceso al Micrófono
                </button>
                
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="modal-button secondary"
                >
                  Cancelar
                </button>
              </div>
              
              <div style={{
                marginTop: '24px',
                padding: '16px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '12px'
              }}>
                <p style={{
                  fontSize: '14px',
                  color: 'rgb(252, 211, 77)'
                }}>
                  💡 <strong>Nota:</strong> Si el navegador no muestra la solicitud de permisos, busca el ícono del micrófono en la barra de direcciones y haz clic en &quot;Permitir&quot;.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
};
