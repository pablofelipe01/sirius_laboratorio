'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Sparkles, PenTool, Mic, MicOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface Producto {
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  subtotal: number;
}

interface Pedido {
  id?: string;
  clienteId: string;
  clienteNombre?: string;
  fechaPedido?: string;
  fechaEntrega?: string;
  estado?: 'pendiente' | 'en_proceso' | 'completado' | 'cancelado';
  productos: Producto[];
  total?: number;
  observaciones?: string;
}

interface Cliente {
  id: string;
  nombre: string;
  contacto?: string;
}

interface ProductoAPI {
  id: string;
  nombre: string;
  precio?: number;
}

// Interface para respuesta de IA
interface ProductoIA {
  nombreProducto: string;
  productoIdSugerido?: string;
  cantidad: number;
  unidad: string;
  precioUnitario?: number;
  notas?: string;
}

interface RespuestaIA {
  productos: ProductoIA[];
  observaciones: string;
  fechaEntregaSugerida?: string;
  prioridad: 'normal' | 'urgente' | 'baja';
  confianza: number;
  resumenParaUsuario: string;
}

interface ModalPedidoProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pedido: Pedido) => void;
  pedidoEditando: Pedido | null;
  clientes: Cliente[];
}

type ModoConfiguracion = 'seleccion' | 'manual' | 'ia' | 'confirmacion';

export const ModalPedido: React.FC<ModalPedidoProps> = ({
  isOpen,
  onClose,
  onSave,
  pedidoEditando,
  clientes
}) => {
  // Estado para modo de configuración
  const [modoConfiguracion, setModoConfiguracion] = useState<ModoConfiguracion>('seleccion');
  
  // Estado para IA y grabación
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessingIA, setIsProcessingIA] = useState(false);
  const [transcripcion, setTranscripcion] = useState('');
  const [promptIA, setPromptIA] = useState('');
  const [respuestaIA, setRespuestaIA] = useState<RespuestaIA | null>(null);
  const [procesadoPorIA, setProcesadoPorIA] = useState(false);
  
  // Refs para grabación de audio
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [formData, setFormData] = useState<Pedido>({
    clienteId: '',
    clienteNombre: '',
    fechaEntrega: '',
    productos: [
      {
        productoId: '',
        nombreProducto: '',
        cantidad: 1,
        unidad: 'litros',
        precioUnitario: 0,
        subtotal: 0
      }
    ],
    observaciones: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [productosDisponibles, setProductosDisponibles] = useState<{id: string; nombre: string; precioBase: number}[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);

  // Cargar todos los productos del laboratorio desde API
  useEffect(() => {
    const fetchProductos = async () => {
      setLoadingProductos(true);
      try {
        const response = await fetch('/api/sirius-productos?todos=true');
        const data = await response.json();
        if (data.success && data.productos) {
          const productos = data.productos.map((p: any) => ({
            id: p.id,
            nombre: p.nombre || p.codigo,
            precioBase: p.precioVentaUnitario || 0
          }));
          setProductosDisponibles(productos);
          console.log('📦 Productos cargados con precios:', productos.slice(0, 3));
        }
      } catch (error) {
        console.error('Error cargando productos:', error);
      } finally {
        setLoadingProductos(false);
      }
    };
    fetchProductos();
  }, []);

  useEffect(() => {
    if (pedidoEditando) {
      setFormData({
        ...pedidoEditando,
        fechaEntrega: pedidoEditando.fechaEntrega 
          ? new Date(pedidoEditando.fechaEntrega).toISOString().slice(0, 16)
          : ''
      });
      setModoConfiguracion('manual');
    } else {
      setFormData({
        clienteId: '',
        clienteNombre: '',
        fechaEntrega: '',
        productos: [
          {
            productoId: '',
            nombreProducto: '',
            cantidad: 1,
            unidad: 'litros',
            precioUnitario: 0,
            subtotal: 0
          }
        ],
        observaciones: ''
      });
      setModoConfiguracion('seleccion');
    }
    setErrors({});
    setTranscripcion('');
    setPromptIA('');
  }, [pedidoEditando, isOpen]);

  const actualizarProducto = (index: number, campo: keyof Producto, valor: any) => {
    const nuevosProductos = [...formData.productos];
    
    if (campo === 'productoId') {
      const producto = productosDisponibles.find(p => p.id === valor);
      if (producto) {
        nuevosProductos[index] = {
          ...nuevosProductos[index],
          productoId: valor,
          nombreProducto: producto.nombre,
          precioUnitario: producto.precioBase
        };
      }
    } else {
      nuevosProductos[index] = {
        ...nuevosProductos[index],
        [campo]: valor
      };
    }

    if (campo === 'cantidad' || campo === 'precioUnitario' || campo === 'productoId') {
      nuevosProductos[index].subtotal = nuevosProductos[index].cantidad * nuevosProductos[index].precioUnitario;
    }

    setFormData(prev => ({
      ...prev,
      productos: nuevosProductos
    }));
  };

  const agregarProducto = () => {
    setFormData(prev => ({
      ...prev,
      productos: [
        ...prev.productos,
        {
          productoId: '',
          nombreProducto: '',
          cantidad: 1,
          unidad: 'litros',
          precioUnitario: 0,
          subtotal: 0
        }
      ]
    }));
  };

  const eliminarProducto = (index: number) => {
    if (formData.productos.length > 1) {
      setFormData(prev => ({
        ...prev,
        productos: prev.productos.filter((_, i) => i !== index)
      }));
    }
  };

  const actualizarCliente = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    setFormData(prev => ({
      ...prev,
      clienteId,
      clienteNombre: cliente?.nombre || ''
    }));
  };

  const validarFormulario = (): boolean => {
    const nuevosErrors: Record<string, string> = {};

    if (!formData.clienteId) {
      nuevosErrors.cliente = 'Debe seleccionar un cliente';
    }

    if (!formData.fechaEntrega) {
      nuevosErrors.fechaEntrega = 'Debe seleccionar una fecha de entrega';
    }

    if (formData.productos.length === 0) {
      nuevosErrors.productos = 'Debe agregar al menos un producto';
    }

    formData.productos.forEach((producto, index) => {
      if (!producto.productoId) {
        nuevosErrors[`producto_${index}`] = 'Debe seleccionar un producto';
      }
      if (producto.cantidad <= 0) {
        nuevosErrors[`cantidad_${index}`] = 'La cantidad debe ser mayor a 0';
      }
    });

    setErrors(nuevosErrors);
    return Object.keys(nuevosErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }

    const total = formData.productos.reduce((sum, producto) => sum + producto.subtotal, 0);
    
    const pedidoFinal: Pedido = {
      ...formData,
      total,
      fechaEntrega: formData.fechaEntrega || undefined
    };

    onSave(pedidoFinal);
    onClose();
  };

  const calcularTotal = () => {
    return formData.productos.reduce((sum, producto) => sum + producto.subtotal, 0);
  };

  const procesarConIA = async () => {
    const textoParaProcesar = promptIA.trim() || transcripcion.trim();
    
    if (!textoParaProcesar) {
      setErrors({ ia: 'Escribe o dicta la información del pedido' });
      return;
    }

    if (!formData.clienteId) {
      setErrors({ cliente: 'Debe seleccionar un cliente primero' });
      return;
    }

    setIsProcessingIA(true);
    setErrors({});
    
    try {
      console.log('🤖 Enviando a IA:', textoParaProcesar);
      
      const response = await fetch('/api/pedidos-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto: textoParaProcesar,
          productosDisponibles: productosDisponibles,
          clienteNombre: formData.clienteNombre
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error procesando con IA');
      }

      console.log('✅ Respuesta IA:', data.pedido);
      setRespuestaIA(data.pedido);
      
      // Convertir productos de IA al formato del formulario
      const productosFormateados: Producto[] = data.pedido.productos.map((p: ProductoIA) => {
        // Buscar el producto en la lista de disponibles
        const productoEncontrado = productosDisponibles.find(
          pd => pd.id === p.productoIdSugerido || 
                pd.nombre.toLowerCase().includes(p.nombreProducto.toLowerCase()) ||
                p.nombreProducto.toLowerCase().includes(pd.nombre.toLowerCase())
        );
        
        const precioBase = productoEncontrado?.precioBase || p.precioUnitario || 0;
        const cantidad = p.cantidad || 1;
        
        return {
          productoId: productoEncontrado?.id || '',
          nombreProducto: productoEncontrado?.nombre || p.nombreProducto,
          cantidad: cantidad,
          unidad: p.unidad || 'litros',
          precioUnitario: precioBase,
          subtotal: cantidad * precioBase
        };
      });

      // Actualizar formData con los productos procesados
      setFormData(prev => ({
        ...prev,
        productos: productosFormateados.length > 0 ? productosFormateados : prev.productos,
        observaciones: data.pedido.observaciones || prev.observaciones,
        fechaEntrega: data.pedido.fechaEntregaSugerida 
          ? new Date(data.pedido.fechaEntregaSugerida).toISOString().slice(0, 16)
          : prev.fechaEntrega
      }));
      
      // Marcar como procesado por IA y cambiar a modo manual
      setProcesadoPorIA(true);
      setModoConfiguracion('manual');
      
    } catch (error) {
      console.error('Error procesando con IA:', error);
      setErrors({ ia: error instanceof Error ? error.message : 'Error al procesar con IA. Intente de nuevo.' });
    } finally {
      setIsProcessingIA(false);
    }
  };

  // ============== FUNCIONES DE GRABACIÓN DE AUDIO ==============
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
      audioChunksRef.current = [];
      
      // Configurar MediaRecorder
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await transcribeAudio(audioBlob);
        
        // Limpiar stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      console.log('🎙️ Grabación iniciada');
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setErrors({ ia: 'Error al acceder al micrófono. Verifica los permisos.' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('🎙️ Grabación detenida');
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    
    try {
      console.log('🎤 Transcribiendo audio...', { size: audioBlob.size, type: audioBlob.type });

      const formDataAudio = new FormData();
      formDataAudio.append('audio', audioBlob, 'recording.webm');
      formDataAudio.append('model', 'whisper-1');
      formDataAudio.append('language', 'es');
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formDataAudio,
      });
      
      if (!response.ok) {
        throw new Error(`Error en transcripción: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.text) {
        const textoTranscrito = result.text.trim();
        console.log('📝 Texto transcrito:', textoTranscrito);
        setTranscripcion(textoTranscrito);
        // Agregar al prompt existente
        setPromptIA(prev => prev ? `${prev} ${textoTranscrito}` : textoTranscrito);
      } else {
        throw new Error(result.error || 'Error en la transcripción');
      }
      
    } catch (error) {
      console.error('Error en transcripción:', error);
      setErrors({ ia: 'Error al transcribir el audio. Intente de nuevo.' });
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleClose = () => {
    setModoConfiguracion('seleccion');
    setRespuestaIA(null);
    setTranscripcion('');
    setPromptIA('');
    setProcesadoPorIA(false);
    onClose();
  };

  if (!isOpen) return null;

  // ========== PANTALLA DE SELECCIÓN DE MODO ==========
  if (modoConfiguracion === 'seleccion') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">🛒 Nuevo Pedido</h2>
              <p className="text-blue-100">Selecciona cómo deseas configurar el pedido</p>
            </div>
          </div>

          {/* Opciones */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Opción Manual */}
              <button
                onClick={() => setModoConfiguracion('manual')}
                className="group relative bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition-all duration-300 text-left"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-500 transition-colors">
                    <PenTool className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Configuración Manual</h3>
                  <p className="text-gray-600 text-sm">
                    Selecciona cliente, productos y cantidades paso a paso con el formulario tradicional
                  </p>
                </div>
              </button>

              {/* Opción IA */}
              <button
                onClick={() => setModoConfiguracion('ia')}
                className="group relative bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-purple-500 hover:shadow-lg transition-all duration-300 text-left"
              >
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  ✨ NUEVO
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-500 transition-colors">
                    <Sparkles className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Configuración con IA</h3>
                  <p className="text-gray-600 text-sm">
                    Describe el pedido con texto o voz y deja que la IA complete los detalles automáticamente
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== PANTALLA DE CONFIGURACIÓN CON IA ==========
  if (modoConfiguracion === 'ia') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white relative">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">✨ Configuración con IA</h2>
              <p className="text-purple-100">Describe el pedido y la IA lo procesará</p>
            </div>
          </div>

          <div className="p-6">
            {/* Campos obligatorios */}
            <div className="bg-purple-50 rounded-xl p-4 mb-6 border border-purple-100">
              <h3 className="text-sm font-semibold text-purple-900 mb-4">Campos Obligatorios</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cliente <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.clienteId}
                    onChange={(e) => actualizarCliente(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                    required
                  >
                    <option value="" className="text-black">Seleccionar cliente...</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.cliente && (
                    <p className="mt-1 text-sm text-red-600">{errors.cliente}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Entrega <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.fechaEntrega}
                    onChange={(e) => setFormData(prev => ({ ...prev, fechaEntrega: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                    required
                  />
                  {errors.fechaEntrega && (
                    <p className="mt-1 text-sm text-red-600">{errors.fechaEntrega}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Área de entrada para IA */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe el pedido (productos, cantidades, observaciones)
              </label>
              <div className="relative">
                <textarea
                  value={promptIA}
                  onChange={(e) => setPromptIA(e.target.value)}
                  placeholder="Ejemplo: 'Necesito 50 litros de Trichoderma harzianum y 25 litros de Metarhizium anisopliae para aplicación en cultivo de café. Entrega urgente.'"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none pr-14 text-black placeholder:text-gray-400"
                  disabled={isRecording || isTranscribing}
                />
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={isTranscribing}
                  className={`absolute bottom-3 right-3 p-2 rounded-full transition-all duration-200 ${
                    isRecording 
                      ? 'bg-red-500 text-white animate-pulse shadow-lg' 
                      : isTranscribing
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600'
                  }`}
                  title={isRecording ? 'Detener grabación' : isTranscribing ? 'Transcribiendo...' : 'Grabar con voz'}
                >
                  {isTranscribing ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : isRecording ? (
                    <MicOff size={20} />
                  ) : (
                    <Mic size={20} />
                  )}
                </button>
              </div>
              
              {/* Estado de grabación */}
              {isRecording && (
                <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200 flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <p className="text-sm text-red-700 font-medium">
                    Grabando... Habla claramente y presiona el botón para detener.
                  </p>
                </div>
              )}
              
              {/* Estado de transcripción */}
              {isTranscribing && (
                <div className="mt-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200 flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-yellow-600" />
                  <p className="text-sm text-yellow-700 font-medium">
                    Transcribiendo audio con Whisper AI...
                  </p>
                </div>
              )}
              
              {/* Transcripción completada */}
              {transcripcion && !isRecording && !isTranscribing && (
                <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-purple-600 font-medium mb-1">Transcripción de voz:</p>
                      <p className="text-sm text-purple-800">{transcripcion}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {errors.ia && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.ia}
                </p>
              )}
            </div>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setModoConfiguracion('seleccion')}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                ← Volver
              </button>
              <button
                type="button"
                onClick={() => setModoConfiguracion('manual')}
                className="flex-1 px-4 py-3 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors font-medium"
              >
                Configurar Manual
              </button>
              <button
                type="button"
                onClick={procesarConIA}
                disabled={isProcessingIA || !formData.clienteId}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessingIA ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Procesar con IA
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== FORMULARIO MANUAL ==========
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {pedidoEditando ? '✏️ Editar Pedido' : '📝 Configuración Manual'}
              </h2>
              <p className="text-blue-100 text-sm mt-1">Complete los campos del formulario</p>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Banner de IA si el pedido fue procesado por IA */}
          {procesadoPorIA && respuestaIA && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-black mb-1">✨ Pedido procesado con IA</h3>
                  <p className="text-black text-sm">{respuestaIA.resumenParaUsuario}</p>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className={`px-2 py-1 rounded-full ${
                      respuestaIA.prioridad === 'urgente' ? 'bg-red-100 text-red-700' :
                      respuestaIA.prioridad === 'baja' ? 'bg-gray-100 text-gray-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      Prioridad: {respuestaIA.prioridad}
                    </span>
                    <span className="text-green-600">
                      Confianza: {respuestaIA.confianza}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-black">Puedes editar los campos a continuación antes de guardar.</p>
                </div>
              </div>
            </div>
          )}

          {/* Campos obligatorios destacados */}
          <div className="bg-blue-50 rounded-xl p-6 mb-6 border border-blue-100">
            <h3 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">1</span>
              Información Principal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Cliente <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.clienteId}
                  onChange={(e) => actualizarCliente(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                  required
                >
                  <option value="" className="text-black">Seleccionar cliente...</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                    </option>
                  ))}
                </select>
                {errors.cliente && (
                  <p className="mt-1 text-sm text-red-600">{errors.cliente}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Fecha de Entrega <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.fechaEntrega}
                  onChange={(e) => setFormData(prev => ({ ...prev, fechaEntrega: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  required
                />
                {errors.fechaEntrega && (
                  <p className="mt-1 text-sm text-red-600">{errors.fechaEntrega}</p>
                )}
              </div>
            </div>
          </div>

          {/* Productos */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">2</span>
                Productos del Pedido
              </h3>
              <button
                type="button"
                onClick={agregarProducto}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                Agregar Producto
              </button>
            </div>

            <div className="space-y-4">
              {formData.productos.map((producto, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-medium text-black bg-gray-100 px-3 py-1 rounded-full">
                      Producto {index + 1}
                    </span>
                    {formData.productos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarProducto(index)}
                        className="text-red-500 hover:text-red-700 transition-colors p-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-black mb-1">
                        Producto <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={producto.productoId}
                        onChange={(e) => actualizarProducto(index, 'productoId', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        required
                      >
                        <option value="" className="text-black">Seleccionar...</option>
                        {loadingProductos ? (
                          <option disabled>Cargando productos...</option>
                        ) : (
                          productosDisponibles.map((prod) => (
                            <option key={prod.id} value={prod.id}>
                              {prod.nombre}
                            </option>
                          ))
                        )}
                      </select>
                      {errors[`producto_${index}`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`producto_${index}`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-black mb-1">
                        Cantidad (L) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={producto.cantidad}
                        onChange={(e) => actualizarProducto(index, 'cantidad', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        required
                      />
                      {errors[`cantidad_${index}`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`cantidad_${index}`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-black mb-1">
                        Precio Unitario ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={producto.precioUnitario}
                        onChange={(e) => actualizarProducto(index, 'precioUnitario', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-black mb-1">
                        Subtotal
                      </label>
                      <div className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 font-semibold text-black">
                        ${producto.subtotal.toLocaleString('es-CO')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Observaciones */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">3</span>
              Información Adicional
            </h3>
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Observaciones
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-black placeholder:text-black"
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>

          {/* Total y Botones */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-blue-100 text-sm">Total del Pedido</p>
                <p className="text-3xl font-bold">${calcularTotal().toLocaleString('es-CO')}</p>
              </div>
              
              <div className="flex gap-3">
                {!pedidoEditando && (
                  <button
                    type="button"
                    onClick={() => setModoConfiguracion('seleccion')}
                    className="px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors font-medium"
                  >
                    ← Volver
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-bold shadow-lg"
                >
                  {pedidoEditando ? 'Actualizar Pedido' : 'Crear Pedido'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalPedido;
