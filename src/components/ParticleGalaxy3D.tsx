'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';

interface ParticleGalaxy3DProps {
  className?: string;
}

export default function ParticleGalaxy3D({ className = '' }: ParticleGalaxy3DProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    coreSphere: THREE.Points;
    orbitRings: THREE.Group;
    mainGroup: THREE.Group;
  } | null>(null);

  // Estados para la interactividad
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [speechSynthesis, setSpeechSynthesis] = useState<SpeechSynthesis | null>(null);

  // Variable de tiempo global
  const timeRef = useRef(0);

  // Función para hacer que SIRIUS hable usando text-to-speech
  const speakText = useCallback((text: string) => {
    console.log('🔊 Intentando hacer hablar a SIRIUS:', text);
    
    if (!speechSynthesis) {
      console.error('❌ SpeechSynthesis no está disponible');
      return;
    }

    try {
      // Detener cualquier síntesis en curso
      speechSynthesis.cancel();
      console.log('🛑 Síntesis anterior cancelada');

      // Crear nueva instancia de speech
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Buscar voces disponibles
      const voices = speechSynthesis.getVoices();
      console.log('🎭 Total de voces disponibles:', voices.length);
      
      if (voices.length === 0) {
        console.log('⏳ No hay voces cargadas, reintentando en 1 segundo...');
        setTimeout(() => speakText(text), 1000);
        return;
      }

      // Buscar voces en español
      const spanishVoices = voices.filter(voice => voice.lang.startsWith('es'));
      console.log('🎤 Voces en español encontradas:', spanishVoices.length);
      
      let selectedVoice = null;
      
      // Prioridades de voz (latinoamericanas primero)
      const priorities = ['es-MX', 'es-US', 'es-CO', 'es-AR', 'es-CL'];
      
      for (const priority of priorities) {
        selectedVoice = spanishVoices.find(voice => voice.lang.includes(priority));
        if (selectedVoice) break;
      }
      
      // Si no hay voces específicas, usar cualquier voz en español
      if (!selectedVoice && spanishVoices.length > 0) {
        selectedVoice = spanishVoices[0];
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('✅ Voz seleccionada:', selectedVoice.name, '-', selectedVoice.lang);
      } else {
        console.log('⚠️ Usando voz por defecto del sistema');
      }

      // Configuración optimizada para mejor audibilidad
      utterance.rate = 0.9;   // Velocidad normal
      utterance.pitch = 1.0;  // Tono normal
      utterance.volume = 1.0; // Volumen MÁXIMO
      utterance.lang = selectedVoice?.lang || 'es-MX'; // Asegurar idioma español

      // Eventos de la síntesis
      utterance.onstart = () => {
        console.log('🔊 ¡SIRIUS está hablando!');
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        console.log('✅ SIRIUS terminó de hablar');
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error('❌ Error en síntesis de voz:', {
          error: event.error || 'Error desconocido',
          type: event.type,
          charIndex: event.charIndex,
          elapsedTime: event.elapsedTime
        });
        setIsSpeaking(false);
        
        // Solo mostrar alert para errores críticos, no para cancelaciones
        if (event.error && event.error !== 'canceled' && event.error !== 'interrupted') {
          console.warn('⚠️ Error crítico en síntesis:', event.error);
        } else {
          console.log('ℹ️ Síntesis cancelada o interrumpida (normal)');
        }
      };

      // Log de configuración
      console.log('⚙️ Configuración final:', {
        voice: utterance.voice?.name || 'default',
        rate: utterance.rate,
        volume: utterance.volume,
        lang: utterance.lang
      });

      // Iniciar síntesis
      console.log('🚀 Iniciando síntesis de voz...');
      speechSynthesis.speak(utterance);

      // Verificación post-inicio
      setTimeout(() => {
        const isWorking = speechSynthesis.speaking || speechSynthesis.pending;
        console.log('� Estado después de 500ms:', {
          working: isWorking,
          speaking: speechSynthesis.speaking,
          pending: speechSynthesis.pending
        });
        
        if (!isWorking) {
          console.warn('⚠️ La síntesis no funcionó. Verifica el volumen del sistema.');
        }
      }, 500);

    } catch (error) {
      console.error('❌ Error crítico en síntesis de voz:', error);
      setIsSpeaking(false);
      alert(`Error crítico: ${error}`);
    }
  }, [speechSynthesis]);

  // Función para procesar el audio y obtener respuesta de IA
  const processAudioWithAI = useCallback(async (audioBlob: Blob) => {
    setIsThinking(true);
    console.log('🎤 Procesando audio REAL con OpenAI Whisper...', audioBlob.size, 'bytes');
    
    try {
      // Crear FormData para enviar el audio REAL a OpenAI
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      
      console.log('📤 Enviando audio REAL a OpenAI Whisper...');
      
      // Enviar a la API de audio que SÍ funciona con OpenAI
      const response = await fetch('/api/sirius-audio', {
        method: 'POST',
        body: formData
      });
      
      console.log('📊 Response status:', response.status);
      console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Error en la respuesta de la API:', errorData);
        throw new Error(`Error en la API: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Respuesta REAL de OpenAI:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Error desconocido en la API');
      }
      
      setIsThinking(false);
      
      // Mostrar la transcripción REAL y respuesta REAL
      console.log('📝 Transcripción REAL de Whisper:', data.transcript);
      console.log('🤖 Respuesta REAL de GPT:', data.response);
      
      // Mostrar en la consola con colores
      console.log(`%c👤 Dijiste REALMENTE: "${data.transcript}"`, 'color: #60a5fa; font-weight: bold;');
      console.log(`%c🤖 SIRIUS responde REALMENTE: "${data.response}"`, 'color: #34d399; font-weight: bold;');
      
      // ¡IMPORTANTE! - Hacer que SIRIUS hable la respuesta REAL
      console.log('🔊 Intentando que SIRIUS hable:', data.response);
      speakText(data.response);
      
    } catch (error) {
      console.error('❌ Error procesando audio:', error);
      setIsThinking(false);
      setIsSpeaking(false);
      
      // Mostrar error detallado
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.log(`%c❌ Error: ${errorMessage}`, 'color: #ef4444; font-weight: bold;');
      
      // Hacer que SIRIUS hable el error también
      console.log('🔊 Intentando que SIRIUS hable el error');
      speakText('Lo siento, hubo un problema procesando tu solicitud. Por favor intenta de nuevo.');
    }
  }, [speakText]);

  // Función para alternar grabación
  const toggleRecording = useCallback(async () => {
    console.log('🎤 Toggle recording clicked, isRecording:', isRecording);
    
    // Activar speechSynthesis con la primera interacción del usuario (necesario para algunos navegadores)
    if (speechSynthesis && speechSynthesis.getVoices().length === 0) {
      console.log('🔄 Recargando voces después de interacción del usuario...');
      speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        const voices = speechSynthesis.getVoices();
        console.log('🆕 Voces recargadas después de interacción:', voices.length);
      };
    }
    
    if (isRecording) {
      // Detener grabación
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        console.log('⏹️ Deteniendo grabación...');
        mediaRecorder.stop();
      }
      setIsRecording(false);
    } else {
      // Iniciar grabación
      try {
        console.log('🎙️ Solicitando permisos de micrófono...');
        
        // Configuración optimizada para Whisper
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000 // Optimal for Whisper
          } 
        });
        
        console.log('✅ Permisos concedidos, configurando grabador...');
        
        // Usar formato WAV si está disponible, sino WebM
        const options = {
          mimeType: 'audio/webm;codecs=opus'
        };
        
        // Verificar si el navegador soporta WAV
        if (MediaRecorder.isTypeSupported('audio/wav')) {
          options.mimeType = 'audio/wav';
        } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options.mimeType = 'audio/webm;codecs=opus';
        } else {
          console.warn('⚠️ Usando formato de audio por defecto');
        }
        
        const recorder = new MediaRecorder(stream, options);
        const chunks: Blob[] = [];
        
        recorder.onstart = () => {
          console.log('🎙️ Grabación iniciada correctamente');
          setIsRecording(true);
        };
        
        recorder.ondataavailable = (event) => {
          console.log('📊 Audio data available:', event.data.size, 'bytes');
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        
        recorder.onstop = () => {
          console.log('⏹️ Grabación finalizada');
          setIsRecording(false);
          
          // Crear blob del audio completo
          const audioBlob = new Blob(chunks, { type: recorder.mimeType });
          console.log('🎵 Audio blob creado:', audioBlob.size, 'bytes, tipo:', audioBlob.type);
          
          // Verificar que tenemos audio
          if (audioBlob.size < 1000) {
            console.warn('⚠️ Audio muy corto, puede que no se haya grabado nada');
            alert('La grabación es muy corta. Intenta hablar más tiempo.');
            return;
          }
          
          // Procesar con IA real
          processAudioWithAI(audioBlob);
          
          // Detener el stream
          stream.getTracks().forEach(track => {
            track.stop();
            console.log('🔇 Track detenido:', track.kind);
          });
        };
        
        recorder.onerror = (event) => {
          console.error('❌ Error en grabación:', event);
          setIsRecording(false);
        };
        
        setMediaRecorder(recorder);
        setAudioChunks([]);
        
        console.log('🔴 Iniciando grabación...');
        recorder.start(1000); // Grabar en chunks de 1 segundo
        setIsRecording(true);
        
      } catch (error) {
        console.error('❌ Error accessing microphone:', error);
        alert('No se pudo acceder al micrófono. Verifica los permisos.');
      }
    }
  }, [isRecording, mediaRecorder, processAudioWithAI]);

  // Función para detener toda actividad
  const stopAllActivity = useCallback(() => {
    console.log('⏹️ Stop all activity clicked');
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      console.log('🛑 Deteniendo grabación...');
      mediaRecorder.stop();
    }
    
    // Detener síntesis de voz si está activa
    if (speechSynthesis) {
      try {
        if (speechSynthesis.speaking || speechSynthesis.pending) {
          console.log('🔇 Cancelando síntesis de voz...');
          speechSynthesis.cancel();
          console.log('✅ Síntesis de voz cancelada');
        }
      } catch (error) {
        console.warn('⚠️ Error al cancelar síntesis de voz:', error);
      }
    }
    
    setIsRecording(false);
    setIsSpeaking(false);
    setIsThinking(false);
    
    console.log('✅ Todas las actividades detenidas');
  }, [mediaRecorder, speechSynthesis]);

  // Efecto para verificar que estamos en el cliente
  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') return;
    
    setIsClientMounted(true);
    
    // Inicializar síntesis de voz
    if ('speechSynthesis' in window) {
      console.log('🔊 Inicializando síntesis de voz...');
      setSpeechSynthesis(window.speechSynthesis);
      console.log('✅ Síntesis de voz disponible');
      
      // Cargar voces disponibles con mejor manejo de errores
      const loadVoices = () => {
        try {
          const voices = window.speechSynthesis.getVoices();
          console.log('🎙️ Intentando cargar voces... Total encontradas:', voices.length);
          
          let spanishVoicesFound = 0;
          voices.forEach(voice => {
            if (voice.lang.startsWith('es')) {
              spanishVoicesFound++;
              console.log(`✅ Voz en español encontrada: ${voice.name} (${voice.lang})`);
            }
          });
          
          if (spanishVoicesFound === 0) {
            console.warn('⚠️ No se encontraron voces en español');
          } else {
            console.log(`🎯 Total de voces en español: ${spanishVoicesFound}`);
          }
          
        } catch (error) {
          console.error('❌ Error al cargar voces:', error);
        }
      };
      
      // Las voces pueden no estar cargadas inmediatamente
      setTimeout(() => {
        console.log('⏰ Verificando voces después de delay...');
        if (window.speechSynthesis.getVoices().length === 0) {
          console.log('📢 Voces no cargadas, esperando evento onvoiceschanged...');
          window.speechSynthesis.onvoiceschanged = loadVoices;
        } else {
          console.log('📢 Voces ya disponibles, cargando directamente...');
          loadVoices();
        }
      }, 100); // Pequeño delay para asegurar que speechSynthesis esté listo
      
    } else {
      console.error('❌ Síntesis de voz NO disponible en este navegador');
    }
  }, []);

  // Efecto principal para inicializar la escena 3D
  useEffect(() => {
    // Verificaciones de seguridad para SSR
    if (typeof window === 'undefined') return;
    if (!isClientMounted) return;
    if (!containerRef.current) return;

    console.log('Inicializando escena 3D...');

    // Configuración de la escena
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.01);

    const camera = new THREE.PerspectiveCamera(
      75, 
      containerRef.current.clientWidth / containerRef.current.clientHeight, 
      0.1, 
      1000
    );

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance",
      alpha: true
    });
    
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Configuración de la cámara para centrar mejor
    camera.position.z = 20;
    camera.position.y = 0;
    camera.position.x = 0;
    camera.lookAt(0, 0, 0);

    // Shader para las partículas con efectos reactivos
    const pointMaterialShader = {
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vDistance;
        uniform float time;
        uniform float intensity;
        uniform float reactivity;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vDistance = -mvPosition.z;
          float pulse = sin(time * (2.0 + reactivity) + length(position)) * (0.15 + intensity * 0.3) + 1.0;
          vec3 pos = position;
          pos.x += sin(time + position.z * 0.5) * (0.05 + intensity * 0.1);
          pos.y += cos(time + position.x * 0.5) * (0.05 + intensity * 0.1);
          pos.z += sin(time + position.y * 0.5) * (0.05 + intensity * 0.1);
          mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z) * pulse;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vDistance;
        uniform float time;
        uniform float intensity;
        uniform float reactivity;
        
        void main() {
          vec2 cxy = 2.0 * gl_PointCoord - 1.0;
          float r = dot(cxy, cxy);
          if (r > 1.0) discard;
          float glow = exp(-r * 2.5);
          float outerGlow = exp(-r * 1.5) * (0.3 + intensity * 0.4);
          vec3 finalColor = vColor * (1.2 + sin(time * (0.5 + reactivity)) * (0.1 + intensity * 0.2));
          finalColor += vec3(0.2, 0.4, 0.6) * outerGlow;
          float distanceFade = 1.0 - smoothstep(0.0, 50.0, vDistance);
          float finalIntensity = mix(0.7, 1.0, distanceFade) * (1.0 + intensity * 0.5);
          gl_FragColor = vec4(finalColor * finalIntensity, (glow + outerGlow) * distanceFade);
        }
      `
    };

    // Función para crear la esfera de partículas en espiral
    function createSpiralSphere(radius: number, particleCount: number, colors: THREE.Color[]) {
      const geometry = new THREE.BufferGeometry();
      const positions = [];
      const particleColors = [];
      const sizes = [];
      
      for (let i = 0; i < particleCount; i++) {
        const phi = Math.acos(-1 + (2 * i) / particleCount);
        const theta = Math.sqrt(particleCount * Math.PI) * phi;
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        positions.push(x, y, z);
        
        const colorPos = i / particleCount;
        const color1 = colors[Math.floor(colorPos * (colors.length - 1))];
        const color2 = colors[Math.ceil(colorPos * (colors.length - 1))];
        const mixRatio = (colorPos * (colors.length - 1)) % 1;
        const finalColor = new THREE.Color().lerpColors(color1, color2, mixRatio);
        particleColors.push(finalColor.r, finalColor.g, finalColor.b);
        sizes.push(Math.random() * 0.15 + 0.08);
      }
      
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(particleColors, 3));
      geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
      
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          intensity: { value: 0 },
          reactivity: { value: 0 }
        },
        vertexShader: pointMaterialShader.vertexShader,
        fragmentShader: pointMaterialShader.fragmentShader,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      
      return new THREE.Points(geometry, material);
    }

    // Función para crear los anillos orbitales
    function createOrbitRings(radius: number, count: number, thickness: number) {
      const group = new THREE.Group();
      
      for (let i = 0; i < count; i++) {
        const ringGeometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const sizes = [];
        const particleCount = 3000;
        
        for (let j = 0; j < particleCount; j++) {
          const angle = (j / particleCount) * Math.PI * 2;
          const radiusVariation = radius + (Math.random() - 0.5) * thickness;
          const x = Math.cos(angle) * radiusVariation;
          const y = (Math.random() - 0.5) * thickness;
          const z = Math.sin(angle) * radiusVariation;
          positions.push(x, y, z);
          
          const hue = (i / count) * 0.7 + (j / particleCount) * 0.3;
          const color = new THREE.Color().setHSL(hue, 1, 0.6);
          color.multiplyScalar(1.2);
          colors.push(color.r, color.g, color.b);
          sizes.push(Math.random() * 0.12 + 0.06);
        }
        
        ringGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        ringGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        ringGeometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        const material = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            intensity: { value: 0 },
            reactivity: { value: 0 }
          },
          vertexShader: pointMaterialShader.vertexShader,
          fragmentShader: pointMaterialShader.fragmentShader,
          vertexColors: true,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });
        
        const ring = new THREE.Points(ringGeometry, material);
        ring.rotation.x = Math.random() * Math.PI;
        ring.rotation.y = Math.random() * Math.PI;
        group.add(ring);
      }
      
      return group;
    }

    // Crear los colores de la esfera
    const sphereColors = [
      new THREE.Color(0x00ffff).multiplyScalar(1.2),
      new THREE.Color(0xff1493).multiplyScalar(1.1),
      new THREE.Color(0x4169e1).multiplyScalar(1.2),
      new THREE.Color(0xff69b4).multiplyScalar(1.1),
      new THREE.Color(0x00bfff).multiplyScalar(1.2)
    ];

    // Crear los objetos 3D
    const coreSphere = createSpiralSphere(4, 25000, sphereColors);
    const orbitRings = createOrbitRings(5.8, 6, 0.4);

    const mainGroup = new THREE.Group();
    mainGroup.scale.set(1.2, 1.2, 1.2);
    mainGroup.add(coreSphere);
    mainGroup.add(orbitRings);
    scene.add(mainGroup);

    // Guardar referencias
    sceneRef.current = {
      scene,
      camera,
      renderer,
      coreSphere,
      orbitRings,
      mainGroup
    };

    // Función de animación simplificada
    function animate() {
      // Verificar que tenemos acceso a requestAnimationFrame
      if (typeof requestAnimationFrame === 'undefined') {
        console.error('requestAnimationFrame no disponible');
        return;
      }
      
      animationRef.current = requestAnimationFrame(animate);
      
      timeRef.current += 0.002;
      
      if (!sceneRef.current) return;
      
      // Calcular intensidad y reactividad basada en los estados actuales
      let currentIntensity = 0.2; // Intensidad base
      let currentReactivity = 0.5; // Reactividad base
      let colorShift = 0; // Cambio de color
      
      // Ajustar efectos según el estado de SIRIUS
      if (isRecording) {
        currentIntensity = 0.8;
        currentReactivity = 1.2;
        colorShift = 0.1; // Tono rojizo para grabación
      } else if (isThinking) {
        currentIntensity = 0.6;
        currentReactivity = 0.8;
        colorShift = 0.15; // Tono amarillento para pensamiento
      } else if (isSpeaking) {
        currentIntensity = 1.0;
        currentReactivity = 1.5;
        colorShift = 0.3; // Tono verdoso para hablar
      }
      
      // Actualizar uniforms
      const coreMaterial = sceneRef.current.coreSphere.material as THREE.ShaderMaterial;
      coreMaterial.uniforms.time.value = timeRef.current;
      coreMaterial.uniforms.intensity.value = currentIntensity;
      coreMaterial.uniforms.reactivity.value = currentReactivity;
      
      sceneRef.current.orbitRings.children.forEach(ring => {
        const material = (ring as THREE.Points).material as THREE.ShaderMaterial;
        material.uniforms.time.value = timeRef.current;
        material.uniforms.intensity.value = currentIntensity;
        material.uniforms.reactivity.value = currentReactivity;
      });
      
      // Rotación de la esfera central
      const rotationSpeed = 0.001;
      sceneRef.current.coreSphere.rotation.y += rotationSpeed;
      sceneRef.current.coreSphere.rotation.x = Math.sin(timeRef.current * 0.5) * 0.15;
      
      // Rotación de los anillos orbitales
      sceneRef.current.orbitRings.children.forEach((ring, index) => {
        const dynamicSpeed = 0.001 * (Math.sin(timeRef.current * 0.2) + 2.0) * (index + 1);
        ring.rotation.z += dynamicSpeed;
        ring.rotation.x += dynamicSpeed * 0.6;
        ring.rotation.y += dynamicSpeed * 0.4;
      });
      
      // Efecto de respiración
      const breathe = 1 + Math.sin(timeRef.current * 1.5) * 0.1;
      sceneRef.current.coreSphere.scale.set(breathe, breathe, breathe);
      
      // Renderizar
      sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera);
    }

    // Manejar redimensionamiento
    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      sceneRef.current.camera.aspect = width / height;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Iniciar animación con delay para asegurar que todo esté listo
    console.log('Iniciando animación...');
    setTimeout(() => {
      if (sceneRef.current) {
        animate();
      }
    }, 100);

    // Cleanup
    return () => {
      console.log('Limpiando animación...');
      window.removeEventListener('resize', handleResize);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (sceneRef.current && containerRef.current) {
        try {
          containerRef.current.removeChild(sceneRef.current.renderer.domElement);
        } catch (e) {
          console.log('Error removing renderer element:', e);
        }
        sceneRef.current.renderer.dispose();
      }
    };
  }, [isClientMounted]); // Dependencia de isClientMounted

  // Mostrar loading hasta que esté montado en el cliente
  if (!isClientMounted) {
    return (
      <div className={`relative ${className} flex items-center justify-center`}>
        <div 
          className="w-full h-full flex items-center justify-center"
          style={{ 
            minHeight: '100vh',
            background: 'transparent'
          }}
        >
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-white font-medium">Cargando Galaxia SIRIUS...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Contenedor de la animación 3D */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ 
          minHeight: '100vh',
          background: 'transparent'
        }}
      />
      
      {/* Overlay con controles */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Indicador de estado de SIRIUS */}
        <div className="absolute top-8 left-8 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-4 text-white border border-cyan-500/30">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${
                isRecording ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50' :
                isThinking ? 'bg-yellow-500 animate-pulse shadow-lg shadow-yellow-500/50' :
                isSpeaking ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' :
                'bg-gray-400'
              }`}></div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-cyan-400">SIRIUS</span>
                <span className="text-xs">
                  {isRecording ? '🎤 Escuchando tu voz...' :
                   isThinking ? '🧠 Procesando con IA...' :
                   isSpeaking ? '� Hablando...' :
                   '⏸️ En espera - Presiona el micrófono'}
                </span>
              </div>
            </div>
            {(isThinking || isSpeaking) && (
              <div className="mt-2 w-full bg-gray-700 rounded-full h-1">
                <div className={`h-1 rounded-full ${
                  isThinking ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 animate-pulse'
                } transition-all duration-300`} style={{ width: '100%' }}></div>
              </div>
            )}
          </div>
        </div>

        {/* Botón de cierre en la esquina superior derecha */}
        <div className="absolute top-8 right-8 pointer-events-auto">
          <motion.button
            onClick={() => router.push('/')}
            className="w-16 h-16 rounded-full border-2 border-red-400 bg-red-500/20 backdrop-blur-sm 
                       hover:bg-red-500/30 shadow-lg shadow-red-400/30 flex items-center justify-center text-2xl
                       transition-all duration-300"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Cerrar SIRIUS"
          >
            ✕
          </motion.button>
        </div>

        {/* Controles principales centrados en la parte inferior */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <div className="flex flex-row gap-6 items-center justify-center">
            {/* Botón de grabación */}
            <button
              onClick={toggleRecording}
              className={`w-16 h-16 rounded-full border-2 transition-all duration-300 ${
                isRecording 
                  ? 'bg-red-500 border-red-400 text-white' 
                  : 'bg-blue-500 border-blue-400 text-white hover:bg-blue-600'
              } flex items-center justify-center text-2xl`}
              title={isRecording ? 'Detener grabación' : 'Grabar audio'}
            >
              🎤
            </button>
            
            {/* Botón de parar */}
            <button
              onClick={stopAllActivity}
              className="w-16 h-16 rounded-full border-2 border-orange-400 bg-orange-500 text-white
                         hover:bg-orange-600 flex items-center justify-center text-2xl transition-all duration-300"
              title="Detener SIRIUS"
            >
              ⏹️
            </button>
          </div>
        </div>
      </div>

      {/* Estados de actividad */}
      {(isRecording || isSpeaking || isThinking) && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
          <motion.div 
            className="bg-black/50 backdrop-blur-sm px-6 py-3 rounded-full border border-cyan-400/30"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-white text-center">
              {isRecording && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span>Escuchando...</span>
                </div>
              )}
              {isThinking && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span>Procesando...</span>
                </div>
              )}
              {isSpeaking && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span>SIRIUS está hablando...</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
