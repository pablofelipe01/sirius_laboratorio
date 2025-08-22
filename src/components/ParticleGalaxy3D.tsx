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
  const [microphonePermission, setMicrophonePermission] = useState<string>('prompt');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isClientMounted, setIsClientMounted] = useState(false);

  // Variable de tiempo global
  const timeRef = useRef(0);

  // Función para solicitar permisos de micrófono
  const requestMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicrophonePermission('granted');
      setShowPermissionModal(false);
      
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Audio data available:', event.data);
        }
      };
      
      recorder.onstop = () => {
        setIsRecording(false);
        setIsThinking(true);
        setTimeout(() => {
          setIsThinking(false);
          setIsSpeaking(true);
          setTimeout(() => setIsSpeaking(false), 3000);
        }, 2000);
      };
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setMicrophonePermission('denied');
      setShowPermissionModal(false);
    }
  }, []);

  // Función para alternar grabación
  const toggleRecording = useCallback(() => {
    if (!mediaRecorder) return;
    
    if (isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    } else {
      mediaRecorder.start();
      setIsRecording(true);
      setIsSpeaking(false);
      setIsThinking(false);
    }
  }, [mediaRecorder, isRecording]);

  // Función para detener toda actividad
  const stopAllActivity = useCallback(() => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    setIsSpeaking(false);
    setIsThinking(false);
  }, [mediaRecorder, isRecording]);

  // Efecto para verificar permisos al cargar
  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') return;
    
    setIsClientMounted(true);
    
    navigator.permissions?.query({ name: 'microphone' as PermissionName }).then((permission) => {
      setMicrophonePermission(permission.state);
      if (permission.state === 'prompt') {
        setShowPermissionModal(true);
      }
    });
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
      // Accedemos directamente a los estados sin usar refs problemáticas
      const currentIntensity = 0.2; // Intensidad base para que siempre se mueva
      const currentReactivity = 0.5; // Reactividad base
      
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
        {microphonePermission === 'granted' && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-auto">
            <motion.div 
              className="flex flex-row gap-6 items-center justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Botón de grabación */}
              <motion.button
                onClick={toggleRecording}
                className={`w-16 h-16 rounded-full border-2 backdrop-blur-sm transition-all duration-300 ${
                  isRecording 
                    ? 'bg-red-500/30 border-red-400 shadow-red-400/50' 
                    : 'bg-cyan-500/20 border-cyan-400 hover:bg-cyan-500/30 shadow-cyan-400/30'
                } shadow-lg flex items-center justify-center text-2xl`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title={isRecording ? 'Detener grabación' : 'Grabar audio'}
              >
                🎤
              </motion.button>
              
              {/* Botón de parar */}
              <motion.button
                onClick={stopAllActivity}
                disabled={!isSpeaking && !isThinking && !isRecording}
                className="w-16 h-16 rounded-full border-2 border-orange-400 bg-orange-500/20 backdrop-blur-sm 
                           hover:bg-orange-500/30 shadow-lg shadow-orange-400/30 flex items-center justify-center text-2xl
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="Detener SIRIUS"
              >
                ⏹️
              </motion.button>
              
              {/* Botón de efectos especiales */}
              <motion.button
                onClick={() => {
                  setIsSpeaking(true);
                  setTimeout(() => setIsSpeaking(false), 3000);
                }}
                className="w-16 h-16 rounded-full border-2 border-purple-400 bg-purple-500/20 backdrop-blur-sm 
                           hover:bg-purple-500/30 shadow-lg shadow-purple-400/30 flex items-center justify-center text-2xl
                           transition-all duration-300"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="Activar efectos especiales"
              >
                ✨
              </motion.button>
            </motion.div>
          </div>
        )}
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

      {/* Modal de permisos */}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <motion.div
            className="bg-gray-900/90 backdrop-blur-sm border border-cyan-400/30 rounded-xl p-8 max-w-md mx-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center">
              <div className="text-6xl mb-4">✨</div>
              <h3 className="text-xl font-bold text-white mb-4">
                Permisos de Micrófono Requeridos
              </h3>
              <p className="text-gray-300 mb-6">
                SIRIUS necesita acceso a tu micrófono para poder escuchar tus comandos de voz y funcionar correctamente.
              </p>
              <div className="flex gap-4 justify-center">
                <motion.button
                  onClick={requestMicrophonePermission}
                  className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Permitir Acceso al Micrófono
                </motion.button>
                <motion.button
                  onClick={() => setShowPermissionModal(false)}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancelar
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
