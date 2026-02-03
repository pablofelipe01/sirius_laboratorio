'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AudioRecorderSimple from '@/components/AudioRecorderSimple';
import { useAuth } from '@/contexts/AuthContext';

interface Microorganismo {
  id: string;
  nombre: string;
  tipo: string;
  abreviatura?: string;
  bolsasPorLote?: number;
  diasIncubacion?: number;
  descripcion?: string;
  aplicaciones?: string;
  condicionesOptimas?: string;
  tiempoProduccion?: string;
  estado?: string;
  // Campos de referencia de Airtable
  productosRemisiones?: string[];
  cosechaLaboratorio?: string[];
  inoculacion?: string[];
  cepas?: string[];
}

interface ProduccionData {
  microorganismoId: string;
  lote: string;
  cantidadObjetivo: string; // Changed to string to avoid showing "0"
  fechaInicio: string;
  responsablesEquipo: string[]; // Array of user IDs for multi-select
  observaciones: string;
}

// Interfaces para el modal de Sirius Bacter (similar a cosecha)
interface ClienteSiriusBacter {
  id: string;
  nombre: string;
  codigo: string;
}

interface PedidoSiriusBacter {
  id: string;
  idPedidoCore: string;
  idNumerico: number;
  fechaPedido: string;
  estado: string;
  notas: string;
}

interface ProductoPedidoSiriusBacter {
  id: string;
  idProductoCore: string;
  nombreProducto: string;
  cantidad: number;
  notas: string;
}

// Función para formatear nombres científicos según nomenclatura microbiológica
const formatearNombreCientifico = (nombre: string): string => {
  const correcionesNomenclatura: { [key: string]: string } = {
    'PseudoMonas': 'Pseudomonas',
    'AzosPirillum': 'Azospirillum', 
    'AzotoBacter': 'Azotobacter',
    'Siriusbacter': 'Sirius bacter',
    'Bacillus thuringiensis': 'Bacillus thuringiensis', // Ya correcto
    'Bacillus subtilis': 'Bacillus subtilis' // Ya correcto
  };
  
  return correcionesNomenclatura[nombre] || nombre;
};

// Función para determinar si un nombre debe mostrarse en itálica (nomenclatura binomial)
const esNombreBinomial = (nombre: string): boolean => {
  const nombreCorregido = formatearNombreCientifico(nombre);
  return nombreCorregido.includes('Bacillus') || 
         nombreCorregido === 'Pseudomonas' || 
         nombreCorregido === 'Azospirillum' || 
         nombreCorregido === 'Azotobacter';
};

export default function BacteriasPage() {
  const { user } = useAuth();
  const [microorganismos, setMicroorganismos] = useState<Microorganismo[]>([]);
  const [usuarios, setUsuarios] = useState<{id: string, nombre: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMicroorganismo, setSelectedMicroorganismo] = useState<Microorganismo | null>(null);
  const [showProduccionForm, setShowProduccionForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [insumosCalculados, setInsumosCalculados] = useState<{
    id: string;
    nombre: string;
    cantidad: number;
    cantidadPorLitro: number;
    unidad: string;
    descripcion: string;
    categoria: string;
  }[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [resultadoFermentacion, setResultadoFermentacion] = useState<{
    recordId: string;
    lote: string;
    insumos?: {
      descuentoAutomatico?: {
        success: boolean;
        [key: string]: unknown;
      };
    };
  } | null>(null);
  const [procesoSiriusBacter, setProcesoSiriusBacter] = useState<{
    etapas: Array<{
      numero: number;
      nombre: string;
      volumen: number;
      duracion: string | number;
    }>;
    microorganismosRequeridos: string[];
    tiempoTotal: string;
  } | null>(null);
  const [produccionData, setProduccionData] = useState<ProduccionData>({
    microorganismoId: '',
    lote: '',
    cantidadObjetivo: '',
    fechaInicio: '',
    responsablesEquipo: [],
    observaciones: ''
  });

  // ========================================================================
  // Estados para el modal de Sirius Bacter (Agregar Producto)
  // ========================================================================
  const [showSiriusBacterModal, setShowSiriusBacterModal] = useState(false);
  const [clientesSB, setClientesSB] = useState<ClienteSiriusBacter[]>([]);
  const [pedidosSB, setPedidosSB] = useState<PedidoSiriusBacter[]>([]);
  const [productosSB, setProductosSB] = useState<ProductoPedidoSiriusBacter[]>([]);
  const [clienteSeleccionadoSB, setClienteSeleccionadoSB] = useState('');
  const [pedidoSeleccionadoSB, setPedidoSeleccionadoSB] = useState('');
  const [productoSeleccionadoSB, setProductoSeleccionadoSB] = useState('');
  const [loadingClientesSB, setLoadingClientesSB] = useState(false);
  const [loadingPedidosSB, setLoadingPedidosSB] = useState(false);
  const [loadingProductosSB, setLoadingProductosSB] = useState(false);
  const [isSubmittingSB, setIsSubmittingSB] = useState(false);
  const [cantidadSB, setCantidadSB] = useState('');
  const [responsableSB, setResponsableSB] = useState('');
  const [detallesCacheSB, setDetallesCacheSB] = useState<Record<string, any[]>>({});

  // ========================================================================
  // Estados para el modal de Bacillus thuringiensis (Agregar Producto)
  // ========================================================================
  const [showBacillusModal, setShowBacillusModal] = useState(false);
  const [clientesBT, setClientesBT] = useState<ClienteSiriusBacter[]>([]);
  const [pedidosBT, setPedidosBT] = useState<PedidoSiriusBacter[]>([]);
  const [productosBT, setProductosBT] = useState<ProductoPedidoSiriusBacter[]>([]);
  const [clienteSeleccionadoBT, setClienteSeleccionadoBT] = useState('');
  const [pedidoSeleccionadoBT, setPedidoSeleccionadoBT] = useState('');
  const [productoSeleccionadoBT, setProductoSeleccionadoBT] = useState('');
  const [loadingClientesBT, setLoadingClientesBT] = useState(false);
  const [loadingPedidosBT, setLoadingPedidosBT] = useState(false);
  const [loadingProductosBT, setLoadingProductosBT] = useState(false);
  const [isSubmittingBT, setIsSubmittingBT] = useState(false);
  const [cantidadBT, setCantidadBT] = useState('');
  const [responsableBT, setResponsableBT] = useState('');
  const [detallesCacheBT, setDetallesCacheBT] = useState<Record<string, any[]>>({});
  const [productosCacheSB, setProductosCacheSB] = useState<Record<string, { id: string; codigoProducto: string; nombre: string }>>({});

  // Cargar microorganismos desde Airtable
  useEffect(() => {
    const fetchMicroorganismos = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/produccion-bacterias');
        const data = await response.json();
        
        if (data.success) {
          // Mostrar todas las bacterias disponibles
          setMicroorganismos(data.microorganismos);
        } else {
          setError(data.error || 'Error al cargar microorganismos');
        }
      } catch (err) {
        setError('Error de conexión al cargar bacterias desde Airtable');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchUsuarios = async () => {
      try {
        console.log('🔍 Cargando usuarios...');
        const response = await fetch('/api/equipo-laboratorio');
        const data = await response.json();
        
        console.log('📊 Respuesta usuarios:', data);
        
        if (data.success && data.responsables) {
          console.log('✅ Usuarios cargados:', data.responsables);
          setUsuarios(data.responsables);
        } else {
          console.error('❌ Error al cargar usuarios:', data.error);
        }
      } catch (err) {
        console.error('❌ Error de conexión al cargar usuarios:', err);
      }
    };

    fetchMicroorganismos();
    fetchUsuarios();
  }, []);

  // ========================================================================
  // Funciones para el modal de Sirius Bacter (Agregar Producto)
  // ========================================================================
  
  // Cargar clientes desde Sirius Clientes Core
  const fetchClientesSB = async () => {
    setLoadingClientesSB(true);
    try {
      const response = await fetch('/api/clientes-core');
      const data = await response.json();
      
      if (data.success && data.clientes) {
        setClientesSB(data.clientes.map((c: any) => ({
          id: c.id,
          nombre: c.nombre,
          codigo: c.codigo || c.id
        })));
      }
    } catch (err) {
      console.error('❌ Error cargando clientes:', err);
    } finally {
      setLoadingClientesSB(false);
    }
  };

  // Cargar pedidos pendientes de un cliente
  const fetchPedidosSB = async (clienteId: string) => {
    if (!clienteId) {
      setPedidosSB([]);
      setPedidoSeleccionadoSB('');
      setProductosSB([]);
      return;
    }

    setLoadingPedidosSB(true);
    try {
      const response = await fetch(`/api/pedidos-clientes?clienteId=${encodeURIComponent(clienteId)}&incluirDetalles=true`);
      const data = await response.json();
      
      if (data.success) {
        // Filtrar solo pedidos pendientes (Recibido o Procesando)
        const pedidosFiltrados = (data.pedidos || []).filter((pedido: PedidoSiriusBacter) => 
          pedido.estado === 'Recibido' || pedido.estado === 'Procesando'
        );
        setPedidosSB(pedidosFiltrados);
        
        // Guardar detalles y productos en cache
        if (data.detalles) {
          setDetallesCacheSB(data.detalles);
        }
        if (data.productos) {
          setProductosCacheSB(data.productos);
        }
        
        console.log(`📦 Pedidos Sirius Bacter para cliente ${clienteId}:`, pedidosFiltrados.length);
      } else {
        setPedidosSB([]);
      }
    } catch (err) {
      console.error('❌ Error cargando pedidos:', err);
      setPedidosSB([]);
    } finally {
      setLoadingPedidosSB(false);
    }
  };

  // Cargar productos de un pedido (filtrar solo Sirius Bacter)
  const cargarProductosSB = (pedidoId: string) => {
    if (!pedidoId) {
      setProductosSB([]);
      setProductoSeleccionadoSB('');
      return;
    }

    setLoadingProductosSB(true);
    
    const detallesPedido = detallesCacheSB[pedidoId] || [];
    
    // Filtrar solo productos de Sirius Bacter
    const productosSiriusBacter: ProductoPedidoSiriusBacter[] = detallesPedido
      .filter((detalle: any) => {
        const productoInfo = productosCacheSB[detalle.idProductoCore] || {};
        const nombreProd = (productoInfo.nombre || '').toLowerCase();
        // Filtrar productos que contengan "sirius bacter" o "siriusbacter"
        return nombreProd.includes('sirius bacter') || 
               nombreProd.includes('siriusbacter') ||
               nombreProd.includes('sirius-bacter');
      })
      .map((detalle: any) => {
        const productoInfo = productosCacheSB[detalle.idProductoCore] || {};
        return {
          id: detalle.id,
          idProductoCore: detalle.idProductoCore,
          nombreProducto: productoInfo.nombre || detalle.idProductoCore,
          cantidad: detalle.cantidad,
          notas: detalle.notas || ''
        };
      });

    setProductosSB(productosSiriusBacter);
    setLoadingProductosSB(false);
    console.log(`🧬 Productos Sirius Bacter del pedido ${pedidoId}:`, productosSiriusBacter.length);
  };

  // Abrir modal de Sirius Bacter
  const handleAbrirModalSiriusBacter = () => {
    setShowSiriusBacterModal(true);
    setClienteSeleccionadoSB('');
    setPedidoSeleccionadoSB('');
    setProductoSeleccionadoSB('');
    setCantidadSB('');
    setResponsableSB('');
    setPedidosSB([]);
    setProductosSB([]);
    fetchClientesSB();
  };

  // Manejar cambio de cliente
  const handleClienteChangeSB = (clienteId: string) => {
    setClienteSeleccionadoSB(clienteId);
    setPedidoSeleccionadoSB('');
    setProductoSeleccionadoSB('');
    setProductosSB([]);
    fetchPedidosSB(clienteId);
  };

  // Manejar cambio de pedido
  const handlePedidoChangeSB = (pedidoId: string) => {
    setPedidoSeleccionadoSB(pedidoId);
    setProductoSeleccionadoSB('');
    cargarProductosSB(pedidoId);
  };

  // Enviar registro de Sirius Bacter
  const handleSubmitSiriusBacter = async () => {
    if (!productoSeleccionadoSB || !cantidadSB) {
      alert('Por favor seleccione un producto y especifique la cantidad');
      return;
    }

    setIsSubmittingSB(true);
    try {
      const productoSelec = productosSB.find(p => p.id === productoSeleccionadoSB);
      const clienteSelec = clientesSB.find(c => c.id === clienteSeleccionadoSB);
      const pedidoSelec = pedidosSB.find(p => p.id === pedidoSeleccionadoSB);

      console.log('🔍 [SIRIUS BACTER] Debug datos:');
      console.log('  - pedidoSeleccionadoSB:', pedidoSeleccionadoSB);
      console.log('  - pedidoSelec:', pedidoSelec);
      console.log('  - idPedidoCore:', pedidoSelec?.idPedidoCore);
      console.log('  - productoSeleccionadoSB:', productoSeleccionadoSB);
      console.log('  - productosSB array:', productosSB);
      console.log('  - productoSelec:', productoSelec);
      console.log('  - idProductoCore:', productoSelec?.idProductoCore);

      // Crear movimiento de inventario (Entrada de Sirius Bacter - Producción)
      const response = await fetch('/api/productos-secos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId: productoSelec?.idProductoCore || '',
          cantidad: parseFloat(cantidadSB),
          unidadMedida: 'L',  // Sirius Bacter es en litros
          motivo: 'Producción',  // No es compra, es producción
          ubicacionDestinoId: pedidoSelec?.idPedidoCore || '',  // Código del pedido (ej: SIRIUS-PED-0003)
          responsable: responsableSB || user?.nombre || 'Sistema',
          observaciones: `Producción Sirius Bacter - Cliente: ${clienteSelec?.nombre || 'N/A'} - Pedido: ${pedidoSelec?.idPedidoCore || 'N/A'}`,
          fechaMovimiento: new Date().toISOString()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccessMessage(`✅ Sirius Bacter registrado exitosamente para ${clienteSelec?.nombre}`);
        setShowSuccessModal(true);
        setShowSiriusBacterModal(false);
        
        // Limpiar formulario
        setClienteSeleccionadoSB('');
        setPedidoSeleccionadoSB('');
        setProductoSeleccionadoSB('');
        setCantidadSB('');
        setResponsableSB('');
      } else {
        alert(`Error: ${result.error || 'No se pudo registrar el producto'}`);
      }
    } catch (err) {
      console.error('❌ Error al registrar Sirius Bacter:', err);
      alert('Error al registrar el producto');
    } finally {
      setIsSubmittingSB(false);
    }
  };

  // ========================================================================
  // Funciones para el modal de Bacillus thuringiensis (Agregar Producto)
  // ========================================================================
  
  // Cargar clientes desde Sirius Clientes Core
  const fetchClientesBT = async () => {
    setLoadingClientesBT(true);
    try {
      const response = await fetch('/api/clientes-core');
      const data = await response.json();
      
      if (data.success && data.clientes) {
        setClientesBT(data.clientes.map((c: any) => ({
          id: c.id,
          nombre: c.nombre,
          codigo: c.codigo || c.id
        })));
      }
    } catch (err) {
      console.error('❌ Error cargando clientes:', err);
    } finally {
      setLoadingClientesBT(false);
    }
  };

  // Cargar pedidos pendientes de un cliente
  const fetchPedidosBT = async (clienteId: string) => {
    if (!clienteId) {
      setPedidosBT([]);
      setPedidoSeleccionadoBT('');
      setProductosBT([]);
      return;
    }

    setLoadingPedidosBT(true);
    try {
      const response = await fetch(`/api/pedidos-clientes?clienteId=${encodeURIComponent(clienteId)}&incluirDetalles=true`);
      const data = await response.json();
      
      if (data.success) {
        // Filtrar solo pedidos pendientes (Recibido o Procesando)
        const pedidosFiltrados = (data.pedidos || []).filter((pedido: PedidoSiriusBacter) => 
          pedido.estado === 'Recibido' || pedido.estado === 'Procesando'
        );
        setPedidosBT(pedidosFiltrados);
        
        // Guardar detalles y productos en cache
        if (data.detalles) {
          setDetallesCacheBT(data.detalles);
        }
        if (data.productos) {
          setProductosCacheSB(data.productos);
        }
        
        console.log(`🦠 Pedidos Bacillus thuringiensis para cliente ${clienteId}:`, pedidosFiltrados.length);
      } else {
        setPedidosBT([]);
      }
    } catch (err) {
      console.error('❌ Error cargando pedidos:', err);
      setPedidosBT([]);
    } finally {
      setLoadingPedidosBT(false);
    }
  };

  // Cargar productos de un pedido (filtrar solo Bacillus thuringiensis)
  const cargarProductosBT = (pedidoId: string) => {
    if (!pedidoId) {
      setProductosBT([]);
      setProductoSeleccionadoBT('');
      return;
    }

    setLoadingProductosBT(true);
    
    const detallesPedido = detallesCacheBT[pedidoId] || [];
    
    // Filtrar solo productos de Bacillus thuringiensis
    const productosBacillus: ProductoPedidoSiriusBacter[] = detallesPedido
      .filter((detalle: any) => {
        const productoInfo = productosCacheSB[detalle.idProductoCore] || {};
        const nombreProd = (productoInfo.nombre || '').toLowerCase();
        // Filtrar productos que contengan "bacillus" o "bt"
        return nombreProd.includes('bacillus') || 
               nombreProd.includes('bt') ||
               nombreProd.includes('thuringiensis');
      })
      .map((detalle: any) => {
        const productoInfo = productosCacheSB[detalle.idProductoCore] || {};
        return {
          id: detalle.id,
          idProductoCore: detalle.idProductoCore,
          nombreProducto: productoInfo.nombre || detalle.idProductoCore,
          cantidad: detalle.cantidad,
          notas: detalle.notas || ''
        };
      });

    setProductosBT(productosBacillus);
    setLoadingProductosBT(false);
    console.log(`🦠 Productos Bacillus thuringiensis del pedido ${pedidoId}:`, productosBacillus.length);
  };

  // Abrir modal de Bacillus thuringiensis
  const handleAbrirModalBacillus = () => {
    setShowBacillusModal(true);
    setClienteSeleccionadoBT('');
    setPedidoSeleccionadoBT('');
    setProductoSeleccionadoBT('');
    setCantidadBT('');
    setResponsableBT('');
    setPedidosBT([]);
    setProductosBT([]);
    fetchClientesBT();
  };

  // Manejar cambio de cliente
  const handleClienteChangeBT = (clienteId: string) => {
    setClienteSeleccionadoBT(clienteId);
    fetchPedidosBT(clienteId);
    setProductosBT([]);
    setCantidadBT('');
  };

  // Manejar cambio de pedido
  const handlePedidoChangeBT = (pedidoId: string) => {
    setPedidoSeleccionadoBT(pedidoId);
    cargarProductosBT(pedidoId);
    setCantidadBT('');
  };

  // Enviar producción de Bacillus thuringiensis
  const handleSubmitBacillus = async () => {
    if (!productoSeleccionadoBT || !cantidadBT) {
      alert('Por favor seleccione un producto y especifique la cantidad');
      return;
    }

    setIsSubmittingBT(true);
    try {
      const productoSelec = productosBT.find(p => p.id === productoSeleccionadoBT);
      const clienteSelec = clientesBT.find(c => c.id === clienteSeleccionadoBT);
      const pedidoSelec = pedidosBT.find(p => p.id === pedidoSeleccionadoBT);

      console.log('🔍 [BACILLUS] Debug datos:');
      console.log('  - pedidoSeleccionadoBT:', pedidoSeleccionadoBT);
      console.log('  - pedidoSelec:', pedidoSelec);
      console.log('  - idPedidoCore:', pedidoSelec?.idPedidoCore);
      console.log('  - productoSeleccionadoBT:', productoSeleccionadoBT);
      console.log('  - productosBT array:', productosBT);
      console.log('  - productoSelec:', productoSelec);
      console.log('  - idProductoCore:', productoSelec?.idProductoCore);

      // Crear movimiento de inventario (Entrada de Bacillus thuringiensis - Producción)
      const response = await fetch('/api/productos-secos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId: productoSelec?.idProductoCore || '',
          cantidad: parseFloat(cantidadBT),
          unidadMedida: 'L',  // Bacillus thuringiensis es en litros
          motivo: 'Producción',  // No es compra, es producción
          ubicacionDestinoId: pedidoSelec?.idPedidoCore || '',  // Código del pedido (ej: SIRIUS-PED-0003)
          responsable: responsableBT || user?.nombre || 'Sistema',
          observaciones: `Producción Bacillus thuringiensis - Cliente: ${clienteSelec?.nombre || 'N/A'} - Pedido: ${pedidoSelec?.idPedidoCore || 'N/A'}`,
          fechaMovimiento: new Date().toISOString()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccessMessage(`✅ Bacillus thuringiensis registrado exitosamente para ${clienteSelec?.nombre}`);
        setShowSuccessModal(true);
        setShowBacillusModal(false);
        
        // Limpiar formulario
        setClienteSeleccionadoBT('');
        setPedidoSeleccionadoBT('');
        setProductoSeleccionadoBT('');
        setCantidadBT('');
        setResponsableBT('');
      } else {
        alert(`Error: ${result.error || 'No se pudo registrar el producto'}`);
      }
    } catch (err) {
      console.error('❌ Error al registrar Bacillus thuringiensis:', err);
      alert('Error al registrar el producto');
    } finally {
      setIsSubmittingBT(false);
    }
  };

  // Función para calcular insumos de Bacillus según la fórmula específica
  const calcularInsumosBacillus = (cantidadLitros: number) => {
    // Fórmula específica para Bacillus thuringiensis (por litro):
    // Dipel = 50g x litro
    // Melaza = 20g x litro  
    // Tomate = 1g x litro
    // Extracto de Levadura = 1g x litro
    const formInsumos = [
      {
        id: 'dipel', // Se buscará dinámicamente en el backend
        nombre: 'Dipel',
        cantidad: cantidadLitros * 50,
        cantidadPorLitro: 50,
        unidad: 'gr',
        descripcion: 'Dipel DF - Bacillus thuringiensis var. kurstaki',
        categoria: 'Sustrato base'
      },
      {
        id: 'melaza', // Se buscará dinámicamente en el backend
        nombre: 'Melaza',
        cantidad: cantidadLitros * 20,
        cantidadPorLitro: 20,
        unidad: 'gr',
        descripcion: 'Melaza como fuente de carbono y energía',
        categoria: 'Nutriente'
      },
      {
        id: 'tomate', // Se buscará dinámicamente en el backend
        nombre: 'Tomate',
        cantidad: cantidadLitros * 1,
        cantidadPorLitro: 1,
        unidad: 'gr', 
        descripcion: 'Extracto de tomate - vitaminas y minerales',
        categoria: 'Suplemento'
      },
      {
        id: 'extracto-levadura', // Se buscará dinámicamente en el backend
        nombre: 'Extracto de Levadura',
        cantidad: cantidadLitros * 0.01,
        cantidadPorLitro: 0.01,
        unidad: 'gr',
        descripcion: 'Extracto de Levadura nutricional - fuente de nitrógeno',
        categoria: 'Nutriente'
      }
    ];

    console.log('📦 Insumos calculados:', formInsumos);
    return formInsumos;
  };

  // Nueva función para manejar SiriusBacter directamente
  const handleSiriusBacterDirecto = async (microorganismoParam?: Microorganismo) => {
    console.log('🧬 Iniciando proceso SiriusBacter FIFO...');
    
    // Usar el parámetro si se proporciona, sino el selectedMicroorganismo
    const microorganismoAUsar = microorganismoParam || selectedMicroorganismo;
    
    if (!user?.nombre) {
      alert('Debes estar autenticado para iniciar producción');
      return;
    }

    if (!microorganismoAUsar) {
      console.error('❌ No hay microorganismo seleccionado');
      alert('Error: No hay microorganismo seleccionado');
      return;
    }

    console.log('🔍 Microorganismo seleccionado:', microorganismoAUsar);

    // Guardar el ID antes de cerrar el modal
    const microorganismoId = microorganismoAUsar.id;
    
    // Cerrar cualquier modal inmediatamente
    setShowProduccionForm(false);
    setSelectedMicroorganismo(null);
    setIsSubmitting(true);

    try {
      console.log('📤 Enviando solicitud a API...');
      
      const requestBody = {
        microorganismoId: microorganismoId,
        cantidadLitros: '300', // Cambiar de cantidadObjetivo a cantidadLitros para coincidir con API
        fechaInicio: new Date().toISOString(),
        observaciones: 'Proceso SiriusBacter automático con lógica FIFO - Búsqueda de microorganismos terminados en 100L',
        realizaRegistro: user.nombre
      };
      
      console.log('📝 Request body:', requestBody);

      const response = await fetch('/api/produccion-bacterias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📨 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📊 Response data:', result);

      if (result.success) {
        alert(`✅ ¡Proceso SiriusBacter iniciado exitosamente!\n\n${result.message}`);
        // Opcional: refrescar datos
        // await cargarMicroorganismos();
      } else {
        if (result.error?.includes('no están disponibles en 100L')) {
          const faltantes = result.faltantes || [];
          const mensaje = `❌ No se puede iniciar el proceso SiriusBacter.\n\nMicroorganismos faltantes en 100L:\n${faltantes.join(', ')}\n\n¿Deseas ir a Almacenamiento para revisar el stock?`;
          
          if (confirm(mensaje)) {
            window.location.href = '/almacenamiento';
          }
        } else {
          console.error('❌ Error API:', result.error);
          alert(`❌ Error al iniciar proceso SiriusBacter:\n\n${result.error}`);
        }
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      alert(`❌ Error de conexión al iniciar proceso SiriusBacter\n\nDetalle: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar envío del formulario de producción (mostrar modal de confirmación)
  const handleSubmitProduccion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMicroorganismo) return;

    // Detectar si es SiriusBacter para ajustar validaciones
    const esSiriusBacter = selectedMicroorganismo.nombre.toLowerCase().includes('siriusbacter');
    
    // Para SiriusBacter, establecer automáticamente el volumen en 300L
    if (esSiriusBacter) {
      setProduccionData(prev => ({...prev, cantidadObjetivo: '300'}));
    }

    // Validar campos requeridos
    const volumenRequerido = esSiriusBacter ? '300' : produccionData.cantidadObjetivo;
    if (!volumenRequerido || !produccionData.fechaInicio) {
      alert('Por favor completa todos los campos requeridos (Volumen y Fecha)');
      return;
    }

    if (produccionData.responsablesEquipo.length === 0) {
      alert('Por favor selecciona al menos un miembro del equipo responsable');
      return;
    }

    // Validar que el usuario esté autenticado
    if (!user) {
      alert('Debes estar autenticado para crear un registro de fermentación');
      return;
    }

    // Calcular insumos si es Bacillus thuringiensis específicamente
    const esBacillusThuringiensis = selectedMicroorganismo.nombre.toLowerCase().includes('bacillus') && 
                                   selectedMicroorganismo.nombre.toLowerCase().includes('thuringiensis');
    
    if (esBacillusThuringiensis) {
      const cantidadLitros = Number(produccionData.cantidadObjetivo);
      const insumosRequeridos = calcularInsumosBacillus(cantidadLitros);
      setInsumosCalculados(insumosRequeridos);
      console.log('🧬 Insumos calculados para Bacillus thuringiensis:', insumosRequeridos);
    } else if (esSiriusBacter) {
      // Para SiriusBacter, configurar información del proceso FIFO
      setInsumosCalculados([]);
      setProcesoSiriusBacter({
        etapas: [
          { numero: 1, nombre: 'Verificación FIFO', volumen: 0, duracion: 'Buscar microorganismos más antiguos' },
          { numero: 2, nombre: 'PseudoMonas 100L', volumen: 100, duracion: 'Más antiguo disponible' },
          { numero: 3, nombre: 'AzosPirillum 100L', volumen: 100, duracion: 'Más antiguo disponible' },
          { numero: 4, nombre: 'AzotoBacter 100L', volumen: 100, duracion: 'Más antiguo disponible' },
          { numero: 5, nombre: 'Registro Salida', volumen: 300, duracion: 'Registrar uso de microorganismos' },
          { numero: 6, nombre: 'SiriusBacter Final', volumen: 300, duracion: '24h mezcla final - Listo para venta' }
        ],
        microorganismosRequeridos: ['PseudoMonas en 100L', 'AzosPirillum en 100L', 'AzotoBacter en 100L'],
        tiempoTotal: '24 horas (proceso finalizado)'
      });
      console.log('🧬 SiriusBacter detectado - Proceso FIFO configurado');
    } else {
      setInsumosCalculados([]);
      setProcesoSiriusBacter(null);
      console.log('ℹ️ Microorganismo estándar, no se calculan insumos específicos');
    }

    // Mostrar modal de confirmación
    setShowConfirmModal(true);
  };

  // Función para confirmar y enviar la producción
  const handleConfirmProduccion = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    try {
      // Para SiriusBacter, asegurar que el volumen sea 300L
      const esSiriusBacterConfirm = selectedMicroorganismo!.nombre.toLowerCase().includes('siriusbacter');
      const volumenFinal = esSiriusBacterConfirm ? 300 : Number(produccionData.cantidadObjetivo);
      
      const dataToSend = {
        microorganismoId: selectedMicroorganismo!.id,
        cantidadLitros: volumenFinal,
        fechaInicio: produccionData.fechaInicio,
        observaciones: produccionData.observaciones,
        realizaRegistro: user?.nombre || 'Usuario no identificado',
        responsablesEquipo: produccionData.responsablesEquipo
      };
      
      console.log('🧬 FRONTEND: Enviando datos de fermentación:', dataToSend);
      console.log('🧬 FRONTEND: Microorganismo seleccionado:', selectedMicroorganismo);
      console.log('🧬 FRONTEND: Es SiriusBacter:', esSiriusBacterConfirm, 'Volumen final:', volumenFinal);

      const response = await fetch('/api/produccion-bacterias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
      });

      const result = await response.json();
      console.log('📊 [FRONTEND-DEBUG] ===== RESPUESTA COMPLETA DEL SERVIDOR =====');
      console.log('📊 [FRONTEND-DEBUG] Response status:', response.status);
      console.log('📊 [FRONTEND-DEBUG] Response ok:', response.ok);
      console.log('📊 [FRONTEND-DEBUG] Resultado completo:', JSON.stringify(result, null, 2));
      console.log('📊 [FRONTEND-DEBUG] result.success:', result.success);
      console.log('📊 [FRONTEND-DEBUG] result.insumos:', result.insumos);
      console.log('📊 [FRONTEND-DEBUG] result.insumos?.descuentoAutomatico:', result.insumos?.descuentoAutomatico);
      
      if (result.success) {
        console.log('✅ [FRONTEND-DEBUG] ===== FERMENTACIÓN EXITOSA =====');
        console.log('✅ [FRONTEND-DEBUG] Fermentación ID:', result.fermentacionId);
        console.log('✅ [FRONTEND-DEBUG] Fecha inicio:', result.fechaInicio);
        console.log('✅ [FRONTEND-DEBUG] Fecha finalización:', result.fechaFinalizacion);
        
        let successMsg = '';
        
        // Verificar si es un proceso SiriusBacter multietapa
        if (result.tipoProduccion === 'SiriusBacter Multietapa') {
          console.log('🧬 [FRONTEND-DEBUG] ===== PROCESO SIRIUSBACTER MULTIETAPA =====');
          successMsg = `🧬 ¡Proceso multietapa SiriusBacter iniciado exitosamente!\n\n` +
                `🦠 Microorganismos: ${result.microorganismosUsados?.join(', ') || 'PseudoMonas, AzosPirillum, AzotoBacter'}\n` +
                `📊 Etapas creadas: ${result.etapasCreadas || 6}\n` +
                `📋 Registros generados: ${result.registrosCreados || 'Múltiples'}\n` +
                `📅 Inicio: ${new Date(result.fechaInicioOriginal || result.fechaInicio).toLocaleDateString('es-CO')}\n` +
                `📅 Finalización estimada: ${new Date(result.fechaFinEstimada || result.fechaFinalizacion).toLocaleDateString('es-CO')}\n` +
                `🆔 ID Proceso: ${result.recordIdFinal || result.fermentacionId}\n` +
                `🎯 Volumen final: 300L SiriusBacter`;
        } else if (result.tipoProduccion === 'SiriusBacter Final (FIFO)') {
          console.log('🧬 [FRONTEND-DEBUG] ===== PROCESO SIRIUSBACTER FIFO =====');
          successMsg = `🧬 ¡SiriusBacter creado exitosamente desde microorganismos terminados!\n\n` +
                `🦠 Microorganismos usados:\n${result.microorganismosUsados?.map((m: any) => `  • ${m.tipo} (${m.lote}) - ${m.litrosUsados}L`).join('\n') || ''}\n\n` +
                `🆔 ID SiriusBacter: ${result.siriusBacterFinal?.id}\n` +
                `🏷️ Código de lote: ${result.siriusBacterFinal?.codigoLote}\n` +
                `📊 Volumen final: ${result.siriusBacterFinal?.volumenFinal}\n` +
                `📦 Estado: ${result.estadoFinal}\n` +
                `📅 Fecha creación: ${new Date(result.fechaCreacion).toLocaleDateString('es-CO')}\n` +
                `⏱️ Tiempo proceso: ${result.resumenProceso?.tiempoTotal}\n` +
                `✅ Listo para venta`;
        } else if (result.tipoProduccion === 'Microorganismo Individual - Escalado 50ml') {
          console.log('🧪 [FRONTEND-DEBUG] ===== MICROORGANISMO INDIVIDUAL - ESCALADO 50ML =====');
          successMsg = `🧪 ¡Escalado de ${result.microorganismo} iniciado exitosamente!\n\n` +
                `🦠 Microorganismo: ${result.microorganismo}\n` +
                `🔬 Etapa: ${result.etapa}\n` +
                `📊 Volumen: ${result.volumen}\n` +
                `⏱️ Duración: ${result.duracion}\n` +
                `📅 Inicio: ${new Date(result.fechaInicio).toLocaleDateString('es-CO')}\n` +
                `📅 Finalización estimada: ${new Date(result.fechaFinalizacion).toLocaleDateString('es-CO')}\n` +
                `🆔 ID Fermentación: ${result.fermentacionId}`;
        } else {
          // Proceso estándar (Bacillus thuringiensis u otros)
          successMsg = `🧬 ¡Fermentación iniciada exitosamente!\n\n` +
                `📊 Volumen: ${produccionData.cantidadObjetivo}L\n` +
                `📅 Inicio: ${new Date(result.fechaInicio).toLocaleDateString('es-CO')}\n` +
                `📅 Finalización estimada: ${new Date(result.fechaFinalizacion).toLocaleDateString('es-CO')}\n` +
                `🆔 ID Fermentación: ${result.fermentacionId}`;
        }

        // Agregar información detallada de insumos (solo para procesos estándar)
        let insumosInfo = '';
        console.log('🔍 [FRONTEND-DEBUG] ===== PROCESANDO INFO DE INSUMOS =====');
        
        if (result.insumos?.descuentoAutomatico) {
          console.log('📦 [FRONTEND-DEBUG] Información de descuento automático encontrada');
          console.log('📦 [FRONTEND-DEBUG] success:', result.insumos.descuentoAutomatico.success);
          console.log('📦 [FRONTEND-DEBUG] error:', result.insumos.descuentoAutomatico.error);
          console.log('📦 [FRONTEND-DEBUG] details:', result.insumos.descuentoAutomatico.details);
          
          if (result.insumos.descuentoAutomatico.success) {
            insumosInfo = `\n\n📦 Descuento automático de insumos: ✅ Completado`;
            console.log('✅ [FRONTEND-DEBUG] Descuento automático completado exitosamente');
          } else {
            const errorDetails = result.insumos.descuentoAutomatico.error || 'Error desconocido';
            insumosInfo = `\n\n📦 Descuento automático de insumos: ❌ Fallido\n🔍 Error: ${errorDetails}`;
            console.error('❌ [FRONTEND-DEBUG] Descuento automático falló:', errorDetails);
            console.error('❌ [FRONTEND-DEBUG] Detalles completos:', result.insumos.descuentoAutomatico);
          }
        } else {
          console.log('⚠️ [FRONTEND-DEBUG] No se encontró información de descuento automático en la respuesta');
          console.log('⚠️ [FRONTEND-DEBUG] result.insumos:', result.insumos);
          insumosInfo = `\n\n📦 Descuento automático de insumos: ⚠️ Sin información`;
        }
        
        console.log('📝 [FRONTEND-DEBUG] Mensaje final a mostrar:', successMsg + insumosInfo);
              
        setSuccessMessage(successMsg + insumosInfo);
        setResultadoFermentacion(result); // Guardar resultado completo
        setShowSuccessModal(true);
        
        console.log('✅ [FRONTEND-DEBUG] Modal de éxito mostrado, limpiando formulario...');
        
        // Limpiar formulario
        setShowProduccionForm(false);
        setSelectedMicroorganismo(null);
        setProduccionData({
          microorganismoId: '',
          lote: '',
          cantidadObjetivo: '',
          fechaInicio: '',
          responsablesEquipo: [],
          observaciones: ''
        });
        setInsumosCalculados([]);
        setProcesoSiriusBacter(null);
      } else {
        console.error('❌ [FRONTEND-DEBUG] ===== ERROR EN LA RESPUESTA =====');
        console.error('❌ [FRONTEND-DEBUG] result.success:', result.success);
        console.error('❌ [FRONTEND-DEBUG] result.error:', result.error);
        console.error('❌ [FRONTEND-DEBUG] result.details:', result.details);
        console.error('❌ [FRONTEND-DEBUG] Respuesta completa:', JSON.stringify(result, null, 2));
        
        // Manejo especial para SiriusBacter con microorganismos faltantes
        if (result.redirectToAlmacenamiento && result.faltantes) {
          const faltantesText = result.faltantes.join(', ');
          const disponiblesText = result.microorganismosDisponibles?.join(', ') || 'Ninguno';
          
          const confirmGoToStorage = confirm(
            `❌ No se puede crear SiriusBacter\n\n` +
            `🦠 Microorganismos faltantes en 100L: ${faltantesText}\n` +
            `✅ Microorganismos disponibles: ${disponiblesText}\n\n` +
            `¿Deseas ir a la página de Almacenamiento para verificar el inventario?`
          );
          
          if (confirmGoToStorage) {
            window.location.href = '/almacenamiento';
            return;
          }
        } else {
          alert(`❌ Error al iniciar fermentación:\n\n${result.error}\n\nDetalles: ${result.details || 'Sin detalles adicionales'}`);
        }
      }
    } catch (err) {
      console.error('❌ [FRONTEND-DEBUG] ===== ERROR DE CONEXIÓN =====');
      console.error('❌ [FRONTEND-DEBUG] Error completo:', err);
      console.error('❌ [FRONTEND-DEBUG] Error message:', err instanceof Error ? err.message : 'Error desconocido');
      console.error('❌ [FRONTEND-DEBUG] Error stack:', err instanceof Error ? err.stack : 'No stack available');
      
      alert('❌ Error de conexión al iniciar fermentación');
    } finally {
      console.log('🔄 [FRONTEND-DEBUG] Finalizando proceso, setIsSubmitting(false)');
      setIsSubmitting(false);
    }
  };

  // Función para cancelar la confirmación
  const handleCancelProduccion = () => {
    setShowConfirmModal(false);
    setInsumosCalculados([]);
    setProcesoSiriusBacter(null);
  };

  // Función para manejar producción directa de microorganismos individuales (PseudoMonas, AzosPirillum, AzotoBacter) y SiriusBacter
  const handleProduccionDirecta = async (microorganismo: Microorganismo) => {
    console.log('🔥 [PROD-DIRECTA] Función llamada con:', microorganismo.nombre);
    
    // Validar que el usuario esté autenticado
    if (!user) {
      alert('Debes estar autenticado para iniciar producción');
      return;
    }

    // Verificar si es SiriusBacter para usar proceso FIFO
    if (microorganismo.nombre.toLowerCase().includes('siriusbacter')) {
      console.log('🧬 [PROD-DIRECTA] ES SIRIUSBACTER - Llamando función específica');
      // Llamar la función específica pasando el microorganismo directamente
      await handleSiriusBacterDirecto(microorganismo);
      return;
    }

    // Verificar que es uno de los microorganismos individuales
    const esIndividual = microorganismo.nombre.toLowerCase().includes('pseudomonas') ||
                        microorganismo.nombre.toLowerCase().includes('azospirillum') ||
                        microorganismo.nombre.toLowerCase().includes('azotobacter');

    if (!esIndividual) {
      console.log('🔄 [PROD-DIRECTA] No es individual ni SiriusBacter - Abriendo formulario');
      // Si no es individual ni SiriusBacter, usar el flujo normal (abrir formulario)
      setSelectedMicroorganismo(microorganismo);
      setShowProduccionForm(true);
      setProduccionData(prev => ({
        ...prev,
        microorganismoId: microorganismo.id
      }));
      return;
    }

    console.log('🧪 [PROD-DIRECTA] Es microorganismo individual - Procesando directamente');

    // Para microorganismos individuales, ejecutar directamente
    setIsSubmitting(true);
    try {
      console.log('🧪 [FRONTEND-DEBUG] ===== PRODUCCIÓN DIRECTA MICROORGANISMO INDIVIDUAL =====');
      console.log('🧪 [FRONTEND-DEBUG] Microorganismo:', microorganismo.nombre);
      console.log('🧪 [FRONTEND-DEBUG] Usuario:', user?.nombre);

      const dataToSend = {
        microorganismoId: microorganismo.id,
        cantidadLitros: 0.05, // 50ml = 0.05L fijo para primera etapa
        fechaInicio: new Date().toISOString(),
        observaciones: `Escalado inicial automático - ${microorganismo.nombre}`,
        realizaRegistro: user?.nombre || 'Usuario no identificado',
        responsablesEquipo: [user?.nombre || 'Usuario no identificado']
      };

      console.log('🧪 [FRONTEND-DEBUG] Datos a enviar:', dataToSend);

      const response = await fetch('/api/produccion-bacterias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
      });

      const result = await response.json();
      console.log('🧪 [FRONTEND-DEBUG] Respuesta del servidor:', result);

      if (result.success) {
        let successMsg = '';
        
        if (result.tipoProduccion === 'Microorganismo Individual - Escalado 50ml') {
          successMsg = `🧪 ¡Escalado de ${result.microorganismo} iniciado exitosamente!\n\n` +
                `🦠 Microorganismo: ${result.microorganismo}\n` +
                `🔬 Etapa: ${result.etapa}\n` +
                `📊 Volumen: ${result.volumen}\n` +
                `⏱️ Duración: ${result.duracion}\n` +
                `📅 Inicio: ${new Date(result.fechaInicio).toLocaleDateString('es-CO')}\n` +
                `📅 Finalización estimada: ${new Date(result.fechaFinalizacion).toLocaleDateString('es-CO')}\n` +
                `🆔 ID Fermentación: ${result.fermentacionId}`;
        } else {
          successMsg = `🧪 ¡Producción de ${microorganismo.nombre} iniciada exitosamente!\n\n` +
                `📅 Inicio: ${new Date(result.fechaInicio).toLocaleDateString('es-CO')}\n` +
                `📅 Finalización estimada: ${new Date(result.fechaFinalizacion).toLocaleDateString('es-CO')}\n` +
                `🆔 ID Fermentación: ${result.fermentacionId}`;
        }

        setSuccessMessage(successMsg);
        setResultadoFermentacion(result);
        setShowSuccessModal(true);

        console.log('✅ [FRONTEND-DEBUG] Producción directa exitosa');
      } else {
        console.error('❌ [FRONTEND-DEBUG] Error en producción directa:', result.error);
        alert(`❌ Error al iniciar producción de ${microorganismo.nombre}:\n\n${result.error}`);
      }
    } catch (err) {
      console.error('❌ [FRONTEND-DEBUG] Error de conexión en producción directa:', err);
      alert(`❌ Error de conexión al iniciar producción de ${microorganismo.nombre}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para obtener el icono según el tipo de microorganismo (enfocado en bacterias)
  const getIconoMicroorganismo = (nombre: string, tipo?: string) => {
    const nombreLower = nombre.toLowerCase();
    // Iconos específicos para bacterias comunes
    if (nombreLower.includes('bacillus')) return '🦠';
    if (nombreLower.includes('siriusbacter')) return '🌱';
    if (nombreLower.includes('azoto') || nombreLower.includes('rhizo')) return '🌱';
    if (nombreLower.includes('pseudo')) return '🛡️';
    if (nombreLower.includes('lactobacillus')) return '🥛';
    if (nombreLower.includes('streptococcus')) return '⚡';
    if (nombreLower.includes('escherichia') || nombreLower.includes('coli')) return '🔬';
    if (nombreLower.includes('salmonella')) return '🚨';
    if (nombreLower.includes('staphylococcus')) return '🔵';
    // Icono por tipo
    if (tipo?.toLowerCase() === 'bacteria') return '🦠';
    return '🧬';
  };

  // Función para obtener el color según el tipo
  const getColorMicroorganismo = (nombre: string, index: number) => {
    const colores = [
      'from-green-500 to-green-600',
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-orange-500 to-orange-600',
      'from-teal-500 to-teal-600',
      'from-indigo-500 to-indigo-600',
      'from-red-500 to-red-600',
      'from-yellow-500 to-orange-500'
    ];
    return colores[index % colores.length];
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div 
          className="min-h-screen relative pt-24 flex items-center justify-center"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          <div className="text-center bg-white rounded-lg p-8 shadow-lg">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando bacterias desde Airtable...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div 
          className="min-h-screen relative pt-24 flex items-center justify-center"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-md shadow-lg">
            <h3 className="font-bold">Error de Conexión</h3>
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div 
        className="min-h-screen relative pt-24"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            
            {/* Header */}
            <div className="bg-white rounded-lg shadow-lg p-4 mb-8">
              <h1 className="text-3xl font-bold text-center text-gray-800">
                🦠 PANEL DE PRODUCCIÓN DE BACTERIAS
              </h1>
            </div>

            {/* Contenido Principal */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              
              
              {microorganismos.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No se encontraron bacterias disponibles</p>
                  <p className="text-gray-400 text-sm mt-2">Verifique la conexión con Airtable</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {microorganismos
                    // Filtrar microorganismos ocultos (Pseudomonas, Azospirillum, Azotobacter)
                    .filter((microorganismo) => {
                      const nombreFormateado = formatearNombreCientifico(microorganismo.nombre).toLowerCase();
                      const ocultos = ['pseudomonas', 'azospirillum', 'azotobacter'];
                      return !ocultos.includes(nombreFormateado);
                    })
                    .map((microorganismo, index) => {
                    const isSubtilis = microorganismo.nombre.toLowerCase().includes('subtilis');
                    
                    return (
                      <div 
                        key={microorganismo.id}
                        className={`bg-white border-2 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden flex flex-col h-full ${
                          isSubtilis ? 'border-gray-300 opacity-75' : 'border-gray-200'
                        }`}
                      >
                        {/* Header de la tarjeta */}
                        <div className={`p-5 text-white relative ${
                          isSubtilis 
                            ? 'bg-gradient-to-r from-gray-400 to-gray-500' 
                            : `bg-gradient-to-r ${getColorMicroorganismo(microorganismo.nombre, index)}`
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <span className="text-4xl flex-shrink-0">{getIconoMicroorganismo(microorganismo.nombre, microorganismo.tipo)}</span>
                              <div className="flex-1 min-w-0">
                                <h3 className={`text-xl font-bold leading-tight mb-1 ${esNombreBinomial(microorganismo.nombre) ? 'italic' : ''}`}>
                                  {formatearNombreCientifico(microorganismo.nombre)}
                                </h3>
                                <div className="flex items-center justify-between">
                                  <p className="text-sm opacity-90">{microorganismo.tipo}</p>
                                  {microorganismo.abreviatura && (
                                    <span className="bg-white text-gray-800 px-2 py-1 rounded-full text-sm font-bold">
                                      {microorganismo.abreviatura}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Estado del microorganismo */}
                          {isSubtilis && (
                            <div className="absolute top-2 right-2">
                              <span className="bg-yellow-400 text-gray-800 text-xs font-bold px-2 py-1 rounded-full">
                                🚧 EN DESARROLLO
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Contenido de la tarjeta */}
                        <div className="p-6 flex flex-col flex-1">
                          {/* Información específica de bacterias en grid mejorado */}
                          <div className="grid grid-cols-1 gap-3 mb-4 flex-1">
                            {microorganismo.bolsasPorLote !== undefined && microorganismo.bolsasPorLote !== null && microorganismo.bolsasPorLote > 0 && (
                              <div className={`p-4 rounded-lg border-l-4 ${
                                isSubtilis 
                                  ? 'bg-gray-50 border-gray-300' 
                                  : 'bg-blue-50 border-blue-400'
                              }`}>
                                <h4 className={`text-sm font-semibold mb-1 ${
                                  isSubtilis ? 'text-gray-600' : 'text-blue-700'
                                }`}>
                                  📦 Producción por Lote
                                </h4>
                                <p className={`text-2xl font-bold ${
                                  isSubtilis ? 'text-gray-600' : 'text-blue-600'
                                }`}>
                                  {microorganismo.bolsasPorLote} bolsas
                                </p>
                              </div>
                            )}
                            
                            {microorganismo.diasIncubacion !== undefined && microorganismo.diasIncubacion !== null && microorganismo.diasIncubacion > 0 && (
                              <div className={`p-4 rounded-lg border-l-4 ${
                                isSubtilis 
                                  ? 'bg-gray-50 border-gray-300' 
                                  : 'bg-green-50 border-green-400'
                              }`}>
                                <h4 className={`text-sm font-semibold mb-1 ${
                                  isSubtilis ? 'text-gray-600' : 'text-green-700'
                                }`}>
                                  ⏱️ Tiempo de Incubación
                                </h4>
                                <p className={`text-lg font-bold ${
                                  isSubtilis ? 'text-gray-600' : 'text-green-600'
                                }`}>
                                  {microorganismo.diasIncubacion} días
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {/* Botones de acción mejorados - siempre en la parte inferior */}
                          <div className="mt-auto">
                            {microorganismo.nombre.toLowerCase().includes('siriusbacter') ? (
                              // Botón especial para Sirius Bacter - Agregar Producto
                              <button
                                onClick={handleAbrirModalSiriusBacter}
                                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all text-sm ${
                                  isSubmittingSB 
                                    ? 'bg-gray-400 text-white cursor-not-allowed'
                                    : 'bg-purple-600 hover:bg-purple-700 text-white hover:shadow-lg'
                                }`}
                                disabled={isSubmittingSB}
                              >
                                {isSubmittingSB ? '⏳ Procesando...' : '📦 Agregar Producto'}
                              </button>
                            ) : microorganismo.nombre.toLowerCase().includes('bacillus thuringiensis') ? (
                              // Botón especial para Bacillus thuringiensis - Agregar Producto
                              <button
                                onClick={handleAbrirModalBacillus}
                                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all text-sm ${
                                  isSubmittingBT 
                                    ? 'bg-gray-400 text-white cursor-not-allowed'
                                    : 'bg-orange-600 hover:bg-orange-700 text-white hover:shadow-lg'
                                }`}
                                disabled={isSubmittingBT}
                              >
                                {isSubmittingBT ? '⏳ Procesando...' : '📦 Agregar Producto'}
                              </button>
                            ) : (
                              // Botón normal para otros microorganismos
                              <button
                                onClick={() => {
                                  if (!isSubtilis) {
                                    handleProduccionDirecta(microorganismo);
                                  }
                                }}
                                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all text-sm ${
                                  isSubtilis
                                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed opacity-60'
                                    : isSubmitting 
                                      ? 'bg-gray-400 text-white cursor-not-allowed'
                                      : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-lg'
                                }`}
                                disabled={isSubtilis || isSubmitting}
                              >
                                {isSubtilis 
                                  ? '⏳ Próximamente Disponible' 
                                  : isSubmitting
                                    ? '⏳ Procesando...'
                                    : '🚀 Iniciar Producción'
                                }
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Modal de detalles del microorganismo */}
      {selectedMicroorganismo && !showProduccionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {(() => {
              const isSubtilis = selectedMicroorganismo.nombre.toLowerCase().includes('subtilis');
              
              return (
                <>
                  <div className={`bg-gradient-to-r text-white p-6 rounded-t-xl ${
                    isSubtilis 
                      ? 'from-gray-500 to-gray-600' 
                      : getColorMicroorganismo(selectedMicroorganismo.nombre, 0)
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-4xl">{getIconoMicroorganismo(selectedMicroorganismo.nombre, selectedMicroorganismo.tipo)}</span>
                        <div>
                          <h2 className={`text-2xl font-bold ${esNombreBinomial(selectedMicroorganismo.nombre) ? 'italic' : ''}`}>
                            {formatearNombreCientifico(selectedMicroorganismo.nombre)}
                          </h2>
                          {selectedMicroorganismo.tipo && (
                            <p className="text-lg opacity-90">{selectedMicroorganismo.tipo}</p>
                          )}
                          {isSubtilis && (
                            <span className="bg-yellow-400 text-gray-800 text-xs font-bold px-2 py-1 rounded-full mt-2 inline-block">
                              🚧 EN DESARROLLO
                            </span>
                          )}
          
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedMicroorganismo(null)}
                        className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-all"
                      >
                        <span className="text-2xl">✕</span>
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
            
            <div className="p-6 space-y-6">
              {selectedMicroorganismo.descripcion && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Descripción</h3>
                  <p className="text-gray-600">{selectedMicroorganismo.descripcion}</p>
                </div>
              )}

              {/* Información técnica de la bacteria */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedMicroorganismo.abreviatura && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-purple-800 mb-2">Código de Identificación</h3>
                    <p className="text-2xl font-bold text-purple-600">{selectedMicroorganismo.abreviatura}</p>
                  </div>
                )}
                
                {selectedMicroorganismo.bolsasPorLote && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">Bolsas por Lote</h3>
                    <p className="text-2xl font-bold text-blue-600">{selectedMicroorganismo.bolsasPorLote} bolsas</p>
                  </div>
                )}
              </div>

              {selectedMicroorganismo.diasIncubacion && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Período de Incubación</h3>
                  <p className="text-gray-600">{selectedMicroorganismo.diasIncubacion} días de incubación óptima</p>
                </div>
              )}

              {selectedMicroorganismo.aplicaciones && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Aplicaciones</h3>
                  <p className="text-gray-600">{selectedMicroorganismo.aplicaciones}</p>
                </div>
              )}

              {selectedMicroorganismo.condicionesOptimas && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Condiciones Óptimas</h3>
                  <p className="text-gray-600">{selectedMicroorganismo.condicionesOptimas}</p>
                </div>
              )}

              {/* Referencias en Airtable */}
              {(selectedMicroorganismo.cepas?.length || selectedMicroorganismo.inoculacion?.length) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Referencias del Sistema</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedMicroorganismo.cepas?.length && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm font-semibold text-gray-700">Cepas relacionadas:</p>
                        <p className="text-xs text-gray-600">{selectedMicroorganismo.cepas.length} registros</p>
                      </div>
                    )}
                    {selectedMicroorganismo.inoculacion?.length && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm font-semibold text-gray-700">Inoculaciones:</p>
                        <p className="text-xs text-gray-600">{selectedMicroorganismo.inoculacion.length} procesos</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-between">
              <button
                onClick={() => setSelectedMicroorganismo(null)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-all"
              >
                Cerrar
              </button>
              {(() => {
              const isSubtilis = selectedMicroorganismo.nombre.toLowerCase().includes('subtilis');
                
                if (isSubtilis) {
                  return (
                    <button
                      disabled
                      className="bg-gray-400 text-gray-600 px-6 py-2 rounded-lg font-medium cursor-not-allowed opacity-60"
                    >
                      ⏳ Próximamente Disponible
                    </button>
                  );
                }
                
                return (
                  <button
                    onClick={() => {
                      console.log('🔥 BOTÓN PRESIONADO!');
                      console.log('🔍 Microorganismo actual:', selectedMicroorganismo);
                      console.log('🔍 Nombre:', selectedMicroorganismo.nombre);
                      console.log('🔍 Es SiriusBacter?', selectedMicroorganismo.nombre.toLowerCase().includes('siriusbacter'));
                      
                      // Si es SiriusBacter, abrir el nuevo modal de Agregar Producto
                      if (selectedMicroorganismo.nombre.toLowerCase().includes('siriusbacter')) {
                        console.log('📦 ABRIENDO MODAL AGREGAR PRODUCTO SIRIUS BACTER!');
                        setSelectedMicroorganismo(null); // Cerrar modal de detalles
                        handleAbrirModalSiriusBacter();
                      } else if (selectedMicroorganismo.nombre.toLowerCase().includes('bacillus thuringiensis')) {
                        console.log('📦 ABRIENDO MODAL AGREGAR PRODUCTO BACILLUS THURINGIENSIS!');
                        setSelectedMicroorganismo(null); // Cerrar modal de detalles
                        handleAbrirModalBacillus();
                      } else {
                        console.log('📋 MOSTRANDO FORMULARIO NORMAL');
                        // Para otros microorganismos, mostrar formulario
                        setShowProduccionForm(true);
                        setProduccionData(prev => ({
                          ...prev,
                          microorganismoId: selectedMicroorganismo.id
                        }));
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-all"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                        Procesando...
                      </>
                    ) : (
                      selectedMicroorganismo.nombre.toLowerCase().includes('siriusbacter') 
                        ? '📦 Agregar Producto' 
                        : selectedMicroorganismo.nombre.toLowerCase().includes('bacillus thuringiensis')
                        ? '📦 Agregar Producto'
                        : 'Iniciar Producción'
                    )}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal para iniciar producción - NO mostrar para SiriusBacter */}
      {showProduccionForm && selectedMicroorganismo && !selectedMicroorganismo.nombre.toLowerCase().includes('siriusbacter') && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          {/* Overlay para mejor legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/70"></div>
          
          <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header Profesional */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 mb-6 border border-white/20">
              <div className="flex items-center justify-center">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
                    {selectedMicroorganismo?.nombre.toLowerCase().includes('siriusbacter') ? 
                      '🧬 Proceso Multietapa SiriusBacter' :
                      `🧬 Producción de ${selectedMicroorganismo?.nombre}`
                    }
                  </h1>
                  <p className="text-lg text-gray-600 flex items-center justify-center">
                    <span className="inline-block w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></span>
                    {selectedMicroorganismo?.nombre.toLowerCase().includes('siriusbacter') ? 
                      'Sistema DataLab - Control Multietapa' :
                      'Sistema DataLab - Control de Fermentación'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {isSubmitting && (
              <div className="bg-blue-50/95 backdrop-blur-sm border border-blue-200 rounded-2xl p-4 mb-6 shadow-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">
                      {selectedMicroorganismo?.nombre.toLowerCase().includes('siriusbacter') ? 
                        '🧬 Iniciando Proceso Multietapa...' :
                        '🚀 Iniciando Producción...'
                      }
                    </h3>
                    <p className="text-base text-blue-700">
                      {selectedMicroorganismo?.nombre.toLowerCase().includes('siriusbacter') ? 
                        'Configurando proceso multietapa para SiriusBacter (6 etapas secuenciales)' :
                        `Configurando parámetros de fermentación para ${selectedMicroorganismo?.nombre}`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Formulario */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-white/20">
              <form onSubmit={handleSubmitProduccion} className="space-y-6">
                
                {/* Cantidad objetivo */}
                <div>
                  <label htmlFor="cantidadObjetivo" className="block text-sm font-semibold text-gray-900 mb-2">
                    {selectedMicroorganismo?.nombre.toLowerCase().includes('siriusbacter') ? 
                      '🧬 Volumen Final SiriusBacter (Fijo: 300L) *' :
                      '⚗️ Volumen de Producción (Litros) *'
                    }
                  </label>
                  {selectedMicroorganismo?.nombre.toLowerCase().includes('siriusbacter') ? (
                    <div>
                      <input
                        type="number"
                        id="cantidadObjetivo"
                        value="300"
                        readOnly
                        className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl bg-purple-50 text-gray-900 font-semibold"
                      />
                      <p className="text-xs text-purple-600 mt-1 font-medium">
                        🧬 El proceso multietapa producirá exactamente 300L de SiriusBacter al final de las 6 etapas
                      </p>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="number"
                        id="cantidadObjetivo"
                        min="1"
                        max="10000"
                        value={produccionData.cantidadObjetivo}
                        onChange={(e) => setProduccionData({...produccionData, cantidadObjetivo: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white/90 text-gray-900 placeholder-gray-900"
                        placeholder="Ingrese el volumen objetivo"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        💡 Rango recomendado: 100 - 5000 litros por lote
                      </p>
                    </div>
                  )}
                </div>

                {/* Fecha de inicio */}
                <div>
                  <label htmlFor="fechaInicio" className="block text-sm font-semibold text-gray-900 mb-2">
                    📅 Fecha de Inicio de Fermentación *
                  </label>
                  <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                    <input
                      type="date"
                      id="fechaInicio"
                      value={produccionData.fechaInicio}
                      onChange={(e) => setProduccionData({...produccionData, fechaInicio: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white/90 text-gray-900"
                      required
                    />
                    {produccionData.fechaInicio && (
                      <div className="mt-3 p-2 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-xs text-purple-600 font-medium text-center">Fecha programada:</p>
                        <p className="text-sm font-semibold text-purple-800 text-center">
                          {new Date(produccionData.fechaInicio + 'T00:00:00').toLocaleDateString('es-CO', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Equipo Responsable - Multi-select */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    👥 Equipo Responsable *
                  </label>
                  <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {usuarios.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-gray-500 text-sm">
                            {loading ? 'Cargando usuarios...' : 'No hay usuarios disponibles'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Debug: {usuarios.length} usuarios cargados
                          </p>
                        </div>
                      ) : (
                        usuarios.map((usuario) => (
                          <label key={usuario.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={produccionData.responsablesEquipo.includes(usuario.id)}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                const newResponsables = isChecked
                                  ? [...produccionData.responsablesEquipo, usuario.id]
                                  : produccionData.responsablesEquipo.filter(id => id !== usuario.id);
                                setProduccionData({...produccionData, responsablesEquipo: newResponsables});
                              }}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">{usuario.nombre}</span>
                          </label>
                        ))
                      )}
                    </div>
                    {produccionData.responsablesEquipo.length > 0 && (
                      <div className="mt-3 p-2 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-xs text-purple-600 font-medium mb-1">Equipo seleccionado ({produccionData.responsablesEquipo.length}):</p>
                        <div className="flex flex-wrap gap-1">
                          {produccionData.responsablesEquipo.map(userId => {
                            const usuario = usuarios.find(u => u.id === userId);
                            return usuario ? (
                              <span key={userId} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {usuario.nombre}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newResponsables = produccionData.responsablesEquipo.filter(id => id !== userId);
                                    setProduccionData({...produccionData, responsablesEquipo: newResponsables});
                                  }}
                                  className="ml-1 text-purple-600 hover:text-purple-800"
                                >
                                  ×
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Selecciona todos los miembros del equipo que participarán en la producción
                    </p>
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <label htmlFor="observaciones" className="block text-sm font-semibold text-gray-900 mb-2">
                    📝 Observaciones del Proceso
                  </label>
                  <div className="relative">
                    <textarea
                      id="observaciones"
                      value={produccionData.observaciones}
                      onChange={(e) => setProduccionData({...produccionData, observaciones: e.target.value})}
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white/90 text-gray-900 placeholder-gray-900"
                      rows={4}
                      placeholder="Condiciones especiales, modificaciones al protocolo, notas del responsable..."
                    />
                    <div className="absolute top-3 right-3">
                      <AudioRecorderSimple
                        onTranscriptionComplete={(text) => {
                          const currentObservaciones = produccionData.observaciones;
                          const newObservaciones = currentObservaciones ? `${currentObservaciones} ${text}` : text;
                          setProduccionData({...produccionData, observaciones: newObservaciones});
                        }}
                        currentText={produccionData.observaciones}
                        onTextChange={(text) => setProduccionData({...produccionData, observaciones: text})}
                      />
                    </div>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 px-8 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Configurando Fermentación...</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center space-x-2">
                        <span>🚀</span>
                        <span>Iniciar Producción de BT</span>
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProduccionForm(false);
                      setSelectedMicroorganismo(null);
                      setProcesoSiriusBacter(null);
                      setInsumosCalculados([]);
                    }}
                    className="sm:w-auto px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 font-semibold bg-white/90"
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <span>↩️</span>
                      <span>Cancelar</span>
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Producción */}
      {showConfirmModal && selectedMicroorganismo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header del Modal */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🧬</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Confirmar Producción de <span className={esNombreBinomial(selectedMicroorganismo.nombre) ? 'italic' : ''}>{formatearNombreCientifico(selectedMicroorganismo.nombre)}</span>
                </h3>
                <p className="text-gray-600">
                  Revisa los detalles antes de iniciar la fermentación
                </p>
              </div>

              {/* Detalles de la Producción */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">📋 Resumen de Producción</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Microorganismo:</span>
                    <p className={`font-semibold text-gray-900 ${esNombreBinomial(selectedMicroorganismo.nombre) ? 'italic' : ''}`}>
                      {formatearNombreCientifico(selectedMicroorganismo.nombre)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Volumen objetivo:</span>
                    <p className="font-semibold text-purple-600">{produccionData.cantidadObjetivo} Litros</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Fecha de inicio:</span>
                    <p className="font-semibold text-gray-900">{new Date(produccionData.fechaInicio).toLocaleDateString('es-CO')}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Responsables:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {produccionData.responsablesEquipo.map(userId => {
                        const usuario = usuarios.find(u => u.id === userId);
                        return usuario ? (
                          <span key={userId} className="inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                            {usuario.nombre}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
                {produccionData.observaciones && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Observaciones:</span>
                    <p className="text-gray-900 mt-1">{produccionData.observaciones}</p>
                  </div>
                )}
              </div>

              {/* Insumos Calculados para Bacillus */}
              {insumosCalculados.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-4 mb-6 border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-3 flex items-center">
                    <span className="mr-2">📦</span>
                    Insumos Requeridos - Fórmula Bacillus thuringiensis
                  </h4>
                  <div className="space-y-3">
                    {insumosCalculados.map((insumo, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-orange-200">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center mb-1">
                              <span className="font-semibold text-orange-900 mr-2">{insumo.nombre}</span>
                              <span className="bg-orange-200 text-orange-800 px-2 py-0.5 rounded text-xs font-medium">
                                {insumo.categoria}
                              </span>
                            </div>
                            <p className="text-xs text-orange-700 mb-1">{insumo.descripcion}</p>
                            <p className="text-xs text-gray-600">
                              💧 Por litro: <span className="font-medium">{insumo.cantidadPorLitro} {insumo.unidad}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="bg-orange-100 text-orange-800 px-3 py-2 rounded-lg">
                              <div className="font-bold text-lg">
                                {insumo.cantidad < 1 ? 
                                  insumo.cantidad.toFixed(3) :
                                  insumo.cantidad % 1 === 0 ? 
                                    insumo.cantidad.toLocaleString() : 
                                    insumo.cantidad.toFixed(2)
                                }
                              </div>
                              <div className="text-xs font-medium">{insumo.unidad}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-orange-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-orange-900">Volumen de producción:</span>
                      <span className="bg-orange-600 text-white px-4 py-2 rounded-full font-bold text-lg">
                        {produccionData.cantidadObjetivo} Litros
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-orange-100 rounded-lg p-2">
                        <span className="font-medium text-orange-900">Total insumos:</span>
                        <div className="text-orange-800">
                          {insumosCalculados.reduce((total, insumo) => total + insumo.cantidad, 0).toFixed(2)} gr + ml
                        </div>
                      </div>
                      <div className="bg-orange-100 rounded-lg p-2">
                        <span className="font-medium text-orange-900">Costo estimado:</span>
                        <div className="text-orange-800">Por calcular</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-orange-100 rounded-lg">
                    <p className="text-orange-800 text-sm font-medium flex items-center">
                      <span className="mr-2">💡</span>
                      Fórmula estándar: Dipel (50g) + Melaza (20g) + Tomate (1g) + Extracto de Levadura (0.01g) por litro
                    </p>
                  </div>
                  <div className="mt-2 p-3 bg-blue-100 rounded-lg">
                    <p className="text-blue-800 text-sm font-medium flex items-center">
                      <span className="mr-2">🔄</span>
                      Los insumos serán descontados automáticamente del inventario usando lógica FIFO (primero el stock más antiguo)
                    </p>
                  </div>
                </div>
              )}

              {/* Información del Proceso Multietapa para SiriusBacter */}
              {procesoSiriusBacter && (
                <div className="bg-purple-50 rounded-xl p-4 mb-6 border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
                    <span className="mr-2">🧬</span>
                    Proceso Multietapa - SiriusBacter (300L Final)
                  </h4>
                  
                  {/* Microorganismos Requeridos */}
                  <div className="mb-4 p-3 bg-white rounded-lg border border-purple-200">
                    <h5 className="font-medium text-purple-800 mb-2 flex items-center">
                      <span className="mr-2">🦠</span>
                      Microorganismos Requeridos:
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {procesoSiriusBacter.microorganismosRequeridos.map((micro, index) => (
                        <span key={index} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                          {micro}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Etapas del Proceso */}
                  <div className="space-y-3 mb-4">
                    <h5 className="font-medium text-purple-800 flex items-center">
                      <span className="mr-2">📋</span>
                      Etapas del Proceso:
                    </h5>
                    {procesoSiriusBacter.etapas.map((etapa) => (
                      <div key={etapa.numero} className="bg-white rounded-lg p-3 border border-purple-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {etapa.numero}
                            </div>
                            <div>
                              <h6 className="font-semibold text-purple-900">{etapa.nombre}</h6>
                              <p className="text-sm text-purple-700">
                                {etapa.volumen < 1 ? 
                                  `${etapa.volumen * 1000}ml` : 
                                  `${etapa.volumen}L`
                                }
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-lg">
                              <div className="text-sm font-medium">{etapa.duracion}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Información del Tiempo Total */}
                  <div className="mt-4 pt-3 border-t border-purple-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-purple-900">Tiempo total estimado:</span>
                      <span className="bg-purple-600 text-white px-4 py-2 rounded-full font-bold text-lg">
                        {procesoSiriusBacter.tiempoTotal}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-purple-100 rounded-lg p-2">
                        <span className="font-medium text-purple-900">Etapas totales:</span>
                        <div className="text-purple-800">{procesoSiriusBacter.etapas.length} etapas secuenciales</div>
                      </div>
                      <div className="bg-purple-100 rounded-lg p-2">
                        <span className="font-medium text-purple-900">Volumen final:</span>
                        <div className="text-purple-800">300L de SiriusBacter</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-purple-100 rounded-lg">
                    <p className="text-purple-800 text-sm font-medium flex items-center">
                      <span className="mr-2">💡</span>
                      Proceso automático: Se crearán automáticamente todos los registros de fermentación para cada etapa con sus fechas correspondientes
                    </p>
                  </div>
                  
                  <div className="mt-2 p-3 bg-blue-100 rounded-lg">
                    <p className="text-blue-800 text-sm font-medium flex items-center">
                      <span className="mr-2">⚙️</span>
                      Los 3 microorganismos pasarán por escalados de 50ml → 250ml → 800ml → 12L → 100L, para finalmente combinarse en 300L
                    </p>
                  </div>
                </div>
              )}

              {/* Advertencia */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h4 className="font-semibold text-yellow-900 mb-1">Antes de continuar</h4>
                    <ul className="text-yellow-800 text-sm space-y-1">
                      <li>• Verifica que tengas todos los insumos necesarios</li>
                      <li>• Asegúrate de que el equipo esté esterilizado</li>
                      <li>• Confirma las condiciones ambientales del laboratorio</li>
                      <li>• Este registro será permanente en Airtable</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Botones del Modal */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={handleConfirmProduccion}
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 px-6 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Iniciando...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <span>✅</span>
                      <span>Confirmar e Iniciar Producción</span>
                    </span>
                  )}
                </button>
                <button
                  onClick={handleCancelProduccion}
                  disabled={isSubmitting}
                  className="sm:w-auto px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 font-semibold bg-white"
                >
                  <span className="flex items-center justify-center space-x-2">
                    <span>❌</span>
                    <span>Cancelar</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Éxito */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                ¡Producción Iniciada!
              </h3>
              
              {/* Información básica de la fermentación */}
              <div className="bg-green-50 rounded-lg p-4 mb-6 text-left">
                <pre className="text-green-800 text-sm font-medium whitespace-pre-wrap">
                  {successMessage}
                </pre>
              </div>

              {/* Recordatorio sobre insumos si se calcularon */}
              {insumosCalculados.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <p className="text-blue-800 text-sm font-medium">
                    💡 Los insumos de la fórmula Bacillus thuringiensis han sido calculados y 
                    {resultadoFermentacion?.insumos?.descuentoAutomatico?.success ? 
                      ' descontados automáticamente del inventario' : 
                      ' están listos para preparación manual'
                    }
                  </p>
                </div>
              )}

              {/* Información específica para SiriusBacter */}
              {procesoSiriusBacter && (
                <div className="bg-purple-50 rounded-lg p-4 mb-4 text-left">
                  <h4 className="text-purple-900 font-semibold mb-2 flex items-center">
                    <span className="mr-2">🧬</span>
                    Proceso Multietapa SiriusBacter Iniciado
                  </h4>
                  <p className="text-purple-800 text-sm mb-2">
                    ✅ Se han creado automáticamente todos los registros de fermentación para las 6 etapas del proceso
                  </p>
                  <p className="text-purple-800 text-sm mb-2">
                    🦠 Los 3 microorganismos (PseudoMonas, AzosPirillum, AzotoBacter) comenzarán su escalado simultáneo
                  </p>
                  <p className="text-purple-800 text-sm">
                    📅 El proceso completo tomará aproximadamente 10-15 días hasta obtener 300L de SiriusBacter
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setResultadoFermentacion(null);
                  setProcesoSiriusBacter(null);
                  setInsumosCalculados([]);
                }}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Modal de Sirius Bacter - Agregar Producto (similar a Cosecha) */}
      {/* ================================================================== */}
      {showSiriusBacterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-4xl">🧬</span>
                  <div>
                    <h2 className="text-2xl font-bold">Agregar Sirius Bacter</h2>
                    <p className="text-purple-200">Seleccione cliente y pedido para registrar el producto</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSiriusBacterModal(false)}
                  className="text-white hover:text-purple-200 transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 space-y-6">
              {/* Selector de Cliente */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  👤 Cliente
                </label>
                <select
                  value={clienteSeleccionadoSB}
                  onChange={(e) => handleClienteChangeSB(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-gray-900"
                  disabled={loadingClientesSB}
                >
                  <option value="">
                    {loadingClientesSB ? 'Cargando clientes...' : 'Seleccione un cliente'}
                  </option>
                  {clientesSB.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre} ({cliente.codigo})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Pedido */}
              {clienteSeleccionadoSB && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📦 Pedido Pendiente
                  </label>
                  <select
                    value={pedidoSeleccionadoSB}
                    onChange={(e) => handlePedidoChangeSB(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-gray-900"
                    disabled={loadingPedidosSB}
                  >
                    <option value="">
                      {loadingPedidosSB ? 'Cargando pedidos...' : 
                       pedidosSB.length === 0 ? 'No hay pedidos pendientes' : 'Seleccione un pedido'}
                    </option>
                    {pedidosSB.map((pedido) => (
                      <option key={pedido.id} value={pedido.id}>
                        {pedido.idPedidoCore} - {new Date(pedido.fechaPedido).toLocaleDateString('es-CO')} ({pedido.estado})
                      </option>
                    ))}
                  </select>
                  {pedidosSB.length === 0 && !loadingPedidosSB && clienteSeleccionadoSB && (
                    <p className="text-amber-600 text-sm mt-2">
                      ⚠️ Este cliente no tiene pedidos pendientes con productos de Sirius Bacter
                    </p>
                  )}
                </div>
              )}

              {/* Selector de Producto */}
              {pedidoSeleccionadoSB && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    🧬 Producto Sirius Bacter
                  </label>
                  <select
                    value={productoSeleccionadoSB}
                    onChange={(e) => {
                      const productoId = e.target.value;
                      setProductoSeleccionadoSB(productoId);
                      // Precargar cantidad del pedido
                      const producto = productosSB.find(p => p.id === productoId);
                      if (producto) {
                        setCantidadSB(producto.cantidad.toString());
                      }
                    }}
                    className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-gray-900"
                    disabled={loadingProductosSB}
                  >
                    <option value="">
                      {loadingProductosSB ? 'Cargando productos...' : 
                       productosSB.length === 0 ? 'No hay productos de Sirius Bacter' : 'Seleccione un producto'}
                    </option>
                    {productosSB.map((producto) => (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombreProducto} - Cantidad pedida: {producto.cantidad} L
                      </option>
                    ))}
                  </select>
                  {productosSB.length === 0 && !loadingProductosSB && pedidoSeleccionadoSB && (
                    <p className="text-amber-600 text-sm mt-2">
                      ⚠️ Este pedido no contiene productos de Sirius Bacter
                    </p>
                  )}
                </div>
              )}

              {/* Cantidad y Responsable */}
              {productoSeleccionadoSB && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        📊 Cantidad (Litros)
                      </label>
                      <input
                        type="number"
                        value={cantidadSB}
                        onChange={(e) => setCantidadSB(e.target.value)}
                        placeholder="Ej: 100"
                        min="1"
                        className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-gray-900 placeholder-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        👷 Responsable
                      </label>
                      <select
                        value={responsableSB}
                        onChange={(e) => setResponsableSB(e.target.value)}
                        className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-gray-900"
                      >
                        <option value="">Seleccione responsable</option>
                        {usuarios.map((u) => (
                          <option key={u.id} value={u.nombre}>
                            {u.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Resumen del producto seleccionado */}
                  {productosSB.find(p => p.id === productoSeleccionadoSB) && (
                    <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-800 mb-2">📋 Resumen del Registro</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p><span className="font-medium">Cliente:</span> {clientesSB.find(c => c.id === clienteSeleccionadoSB)?.nombre}</p>
                        <p><span className="font-medium">Pedido:</span> {pedidosSB.find(p => p.id === pedidoSeleccionadoSB)?.idPedidoCore}</p>
                        <p><span className="font-medium">Producto:</span> {productosSB.find(p => p.id === productoSeleccionadoSB)?.nombreProducto}</p>
                        <p><span className="font-medium">Cantidad:</span> {cantidadSB || '---'} L</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Botones de acción */}
              <div className="flex gap-4 pt-4 border-t">
                <button
                  onClick={() => setShowSiriusBacterModal(false)}
                  className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitSiriusBacter}
                  disabled={!productoSeleccionadoSB || !cantidadSB || isSubmittingSB}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                    !productoSeleccionadoSB || !cantidadSB || isSubmittingSB
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {isSubmittingSB ? '⏳ Registrando...' : '✅ Registrar Producto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* ================================================================== */}
      {/* Modal de Bacillus thuringiensis - Agregar Producto */}
      {/* ================================================================== */}
      {showBacillusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-4xl">🦠</span>
                  <div>
                    <h2 className="text-2xl font-bold">Agregar Bacillus thuringiensis</h2>
                    <p className="text-orange-200">Seleccione cliente y pedido para registrar el producto</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBacillusModal(false)}
                  className="text-white hover:text-orange-200 transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 space-y-6">
              {/* 1. Selector de Cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏢 Cliente
                </label>
                <select 
                  value={clienteSeleccionadoBT}
                  onChange={(e) => handleClienteChangeBT(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                  disabled={loadingClientesBT}
                >
                  <option value="">
                    {loadingClientesBT ? 'Cargando clientes...' : '-- Seleccione un cliente --'}
                  </option>
                  {clientesBT.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre} ({cliente.codigo})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Selector de Pedido */}
              {clienteSeleccionadoBT && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📋 Pedido Pendiente
                  </label>
                  <select
                    value={pedidoSeleccionadoBT}
                    onChange={(e) => handlePedidoChangeBT(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                    disabled={loadingPedidosBT}
                  >
                    <option value="">
                      {loadingPedidosBT ? 'Cargando pedidos...' : '-- Seleccione un pedido --'}
                    </option>
                    {pedidosBT.map(pedido => (
                      <option key={pedido.id} value={pedido.id}>
                        {pedido.idPedidoCore} - {new Date(pedido.fechaPedido).toLocaleDateString()} 
                        ({pedido.estado})
                      </option>
                    ))}
                  </select>
                  {pedidosBT.length === 0 && clienteSeleccionadoBT && !loadingPedidosBT && (
                    <p className="text-sm text-gray-500 mt-1">
                      ℹ️ No hay pedidos pendientes para este cliente
                    </p>
                  )}
                </div>
              )}

              {/* 3. Selector de Producto */}
              {pedidoSeleccionadoBT && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🦠 Producto Bacillus thuringiensis
                  </label>
                  <select
                    value={productoSeleccionadoBT}
                    onChange={(e) => {
                      const productoId = e.target.value;
                      setProductoSeleccionadoBT(productoId);
                      // Precargar cantidad del pedido
                      const producto = productosBT.find(p => p.id === productoId);
                      if (producto) {
                        setCantidadBT(producto.cantidad.toString());
                      }
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                    disabled={loadingProductosBT}
                  >
                    <option value="">
                      {loadingProductosBT ? 'Cargando productos...' : '-- Seleccione un producto --'}
                    </option>
                    {productosBT.map(producto => (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombreProducto} - Cantidad pedida: {producto.cantidad} L
                      </option>
                    ))}
                  </select>
                  {productosBT.length === 0 && pedidoSeleccionadoBT && !loadingProductosBT && (
                    <p className="text-sm text-gray-500 mt-1">
                      ℹ️ No hay productos de Bacillus thuringiensis en este pedido
                    </p>
                  )}
                </div>
              )}

              {/* 4. Cantidad y Responsable */}
              {productoSeleccionadoBT && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📊 Cantidad (L)
                    </label>
                    <input
                      type="number"
                      value={cantidadBT}
                      onChange={(e) => setCantidadBT(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 placeholder-gray-900"
                      placeholder="Cantidad en litros"
                      min="0.1"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      👤 Responsable
                    </label>
                    <select
                      value={responsableBT}
                      onChange={(e) => setResponsableBT(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                    >
                      <option value="">-- Seleccione responsable --</option>
                      {usuarios.map(usuario => (
                        <option key={usuario.id} value={usuario.nombre}>
                          {usuario.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Footer con botones */}
            <div className="border-t border-gray-200 p-6">
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowBacillusModal(false)}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  ❌ Cancelar
                </button>
                <button
                  onClick={handleSubmitBacillus}
                  disabled={!productoSeleccionadoBT || !cantidadBT || isSubmittingBT}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                    !productoSeleccionadoBT || !cantidadBT || isSubmittingBT
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                  }`}
                >
                  {isSubmittingBT ? '⏳ Registrando...' : '✅ Registrar Producto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </>
  );
}
