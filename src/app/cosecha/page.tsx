'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

import { ProductoMicroorganismoMappingService } from '@/lib/services/ProductoMicroorganismoMappingService';

interface Microorganismo {
  id: string;
  nombre: string;
}

interface Responsable {
  id: string;
  idCore?: string; // Código SIRIUS-PERSONAL-XXXX
  nombre: string;
}

interface Cliente {
  id: string;
  nombre: string;
  nit: string;
  codigo: string; // CL-0001, etc.
  contacto: string;
  direccion?: string;
  ciudad?: string;
  estado: string;
}

interface LoteData {
  lote: string;
  bolsas: string;
}

interface LoteDisponible {
  id: string;
  microorganismo: string[];
  codigoLote: string;
  totalCantidadBolsas: number;
  fechaCreacion: string;
  responsables: string[];
}

interface CepaDisponible {
  id: string;
  microorganismo: string[];
  codigoCepa: string;
  totalCantidadBolsas: number;
  fechaCreacion: string;
  responsables: string[];
}

interface PedidoPendiente {
  id: string;
  idPedidoCore: string;
  idNumerico: number;
  fechaPedido: string;
  estado: string;
  notas: string;
  detallesIds?: string[];
}

interface ProductoPedido {
  id: string;
  idProductoCore: string;
  nombreProducto: string;
  cantidad: number;
  notas: string;
}

interface CosechaData {
  horaInicio: string;
  horaFin: string;
  cliente: string;
  nuevoCliente: string;
  hongo: string;
  litros: string;
  bidones: string;
  lotes: LoteData[];
  responsableEntrega: string;
  responsableEntregaId: string;
  registradoPor: string;
  fechaCosecha: string;
  // IDs de Sirius Core
  idPedidoCore?: string;
  idProductoCore?: string;
  idDetallePedido?: string; // Record ID del detalle para marcar como completado
  // Datos adicionales para trazabilidad
  lotesSeleccionados?: string[];
  cantidadesLotes?: {[key: string]: string};
  cepasSeleccionadas?: string[];
  cantidadesCepas?: {[key: string]: string};
}

export default function CosechaPage() {
  const { user } = useAuth();
  const [microorganismos, setMicroorganismos] = useState<Microorganismo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [lotesDisponibles, setLotesDisponibles] = useState<LoteDisponible[]>([]);
  const [cepasDisponibles, setCepasDisponibles] = useState<CepaDisponible[]>([]);
  const [pedidosPendientes, setPedidosPendientes] = useState<PedidoPendiente[]>([]);
  const [productosPedido, setProductosPedido] = useState<ProductoPedido[]>([]);
  const [loadingMicroorganismos, setLoadingMicroorganismos] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingResponsables, setLoadingResponsables] = useState(false);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [loadingCepas, setLoadingCepas] = useState(false);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [loadingProductosPedido, setLoadingProductosPedido] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [cliente, setCliente] = useState('');
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState('');
  const [nuevoClienteNit, setNuevoClienteNit] = useState('');
  const [hongo, setHongo] = useState('');
  const [litros, setLitros] = useState('');
  const [bidones, setBidones] = useState('');
  const [lotes, setLotes] = useState<LoteData[]>([{ lote: '', bolsas: '' }]);
  const [lotesSeleccionados, setLotesSeleccionados] = useState<string[]>([]);
  const [cantidadesLotes, setCantidadesLotes] = useState<{[key: string]: string}>({});
  const [cepasSeleccionadas, setCepasSeleccionadas] = useState<string[]>([]);
  const [cantidadesCepas, setCantidadesCepas] = useState<{[key: string]: string}>({});
  const [responsableEntrega, setResponsableEntrega] = useState('');
  const [responsableEntregaId, setResponsableEntregaId] = useState('');

  useEffect(() => {
    fetchMicroorganismos();
    fetchClientes();
    fetchResponsables();
  }, []);

  // Cargar lotes y cepas cuando cambie el microorganismo
  useEffect(() => {
    if (hongo) {
      fetchLotesDisponibles();
      fetchCepasDisponibles();
    } else {
      setLotesDisponibles([]);
      setLotesSeleccionados([]);
      setCantidadesLotes({});
      setCepasDisponibles([]);
      setCepasSeleccionadas([]);
      setCantidadesCepas({});
    }
  }, [hongo]);

  // Cargar pedidos pendientes cuando cambie el cliente
  useEffect(() => {
    if (cliente && cliente !== 'nuevo') {
      fetchPedidosPendientes(cliente);
    } else {
      setPedidosPendientes([]);
      setPedidoSeleccionado('');
      setProductosPedido([]);
      setProductoSeleccionado('');
    }
  }, [cliente, clientes]);

  // Cargar productos cuando se seleccione un pedido
  useEffect(() => {
    if (pedidoSeleccionado) {
      cargarProductosDePedido(pedidoSeleccionado);
    } else {
      setProductosPedido([]);
      setProductoSeleccionado('');
    }
  }, [pedidoSeleccionado]);

  const fetchMicroorganismos = async () => {
    setLoadingMicroorganismos(true);
    try {
      // Consultar productos de Sirius Product Core
      const response = await fetch('/api/sirius-productos');
      const data = await response.json();
      
      if (data.success) {
        // Mapear productos a la interfaz Microorganismo existente
        const productosComoMicroorganismos = data.productos.map((producto: any) => ({
          id: producto.id,
          nombre: producto.nombre // Campo 'Nombre Comercial' de Sirius Product Core
        }));
        setMicroorganismos(productosComoMicroorganismos);
        console.log('🍄 Productos cargados desde Sirius Product Core:', productosComoMicroorganismos.length);
      } else {
        console.error('Error loading productos:', data.error);
      }
    } catch (error) {
      console.error('Error fetching productos:', error);
    } finally {
      setLoadingMicroorganismos(false);
    }
  };

  const fetchClientes = async () => {
    setLoadingClientes(true);
    try {
      const response = await fetch('/api/clientes-core');
      const data = await response.json();
      
      if (data.success) {
        setClientes(data.clientes);
      } else {
        console.error('Error loading clientes:', data.error);
      }
    } catch (error) {
      console.error('Error fetching clientes:', error);
    } finally {
      setLoadingClientes(false);
    }
  };

  // Cache de detalles y productos de pedidos
  const [detallesCache, setDetallesCache] = useState<Record<string, any[]>>({});
  const [productosCache, setProductosCache] = useState<Record<string, { id: string; codigoProducto: string; nombre: string }>>({});

  // Cargar pedidos pendientes cuando cambie el cliente
  const fetchPedidosPendientes = async (clienteNombre: string) => {
    if (!clienteNombre || clienteNombre === 'nuevo') {
      setPedidosPendientes([]);
      setPedidoSeleccionado('');
      setProductosPedido([]);
      setProductoSeleccionado('');
      return;
    }

    // Buscar el cliente seleccionado para obtener su ID (que es el código CL-XXXX)
    const clienteSeleccionado = clientes.find(c => c.nombre === clienteNombre);
    if (!clienteSeleccionado) {
      console.log('⚠️ Cliente no encontrado:', clienteNombre);
      setPedidosPendientes([]);
      return;
    }

    setLoadingPedidos(true);
    try {
      // Buscar pedidos con estados "Recibido" o "Procesando" (pendientes)
      // El campo ID del cliente contiene el código (CL-0001, etc.)
      const response = await fetch(`/api/pedidos-clientes?clienteId=${encodeURIComponent(clienteSeleccionado.id)}&incluirDetalles=true`);
      const data = await response.json();
      
      if (data.success) {
        // Filtrar solo pedidos pendientes (Recibido o Procesando)
        const pedidosFiltrados = (data.pedidos || []).filter((pedido: PedidoPendiente) => 
          pedido.estado === 'Recibido' || pedido.estado === 'Procesando'
        );
        setPedidosPendientes(pedidosFiltrados);
        
        // Guardar detalles y productos en cache
        if (data.detalles) {
          setDetallesCache(data.detalles);
        }
        if (data.productos) {
          setProductosCache(data.productos);
        }
        
        console.log(`📦 Pedidos pendientes para ${clienteNombre}:`, pedidosFiltrados.length);
      } else {
        console.error('Error loading pedidos:', data.error);
        setPedidosPendientes([]);
      }
    } catch (error) {
      console.error('Error fetching pedidos:', error);
      setPedidosPendientes([]);
    } finally {
      setLoadingPedidos(false);
    }
  };

  // Cargar productos cuando se seleccione un pedido
  const cargarProductosDePedido = (pedidoId: string) => {
    if (!pedidoId) {
      setProductosPedido([]);
      setProductoSeleccionado('');
      return;
    }

    setLoadingProductosPedido(true);
    
    // Obtener los detalles del pedido seleccionado desde el cache
    const detallesPedido = detallesCache[pedidoId] || [];
    
    // Filtrar productos que NO están listos (no han sido cosechados)
    const detallesPendientes = detallesPedido.filter((detalle: any) => !detalle.productoListo);
    
    // Mapear los detalles a productos con nombres
    const todosProductos: ProductoPedido[] = detallesPendientes.map((detalle: any) => {
      const productoInfo = productosCache[detalle.idProductoCore] || {};
      return {
        id: detalle.id,
        idProductoCore: detalle.idProductoCore,
        nombreProducto: productoInfo.nombre || detalle.idProductoCore,
        cantidad: detalle.cantidad,
        notas: detalle.notas || ''
      };
    });

    // Filtrar solo hongos líquidos (productos que coinciden con la lista de microorganismos)
    const productosLiquidos = todosProductos.filter(producto => 
      microorganismos.some(m => {
        const nombreMicro = m.nombre.toLowerCase();
        const nombreProd = producto.nombreProducto.toLowerCase();
        return nombreMicro === nombreProd ||
               nombreProd.includes(nombreMicro) ||
               nombreMicro.includes(nombreProd);
      })
    );

    setProductosPedido(productosLiquidos);
    setLoadingProductosPedido(false);
    console.log(`🧪 Productos del pedido ${pedidoId}:`, todosProductos.length, '-> Hongos líquidos:', productosLiquidos.length);
  };

  // Cuando se selecciona un producto, auto-seleccionar el hongo correspondiente y cantidad
  const handleProductoSeleccionado = (productoId: string) => {
    setProductoSeleccionado(productoId);
    
    if (productoId) {
      const producto = productosPedido.find(p => p.id === productoId);
      if (producto) {
        // Buscar el microorganismo que coincida con el nombre del producto
        const microorganismoEncontrado = microorganismos.find(m => 
          m.nombre.toLowerCase() === producto.nombreProducto.toLowerCase() ||
          producto.nombreProducto.toLowerCase().includes(m.nombre.toLowerCase()) ||
          m.nombre.toLowerCase().includes(producto.nombreProducto.toLowerCase())
        );
        
        if (microorganismoEncontrado) {
          setHongo(microorganismoEncontrado.nombre);
          console.log(`🍄 Auto-seleccionado hongo: ${microorganismoEncontrado.nombre}`);
        }

        // Establecer la cantidad de litros pendientes del pedido
        if (producto.cantidad && producto.cantidad > 0) {
          setLitros(String(producto.cantidad));
          // Calcular bidones automáticamente
          setBidones(Math.ceil(producto.cantidad / 20).toString());
          console.log(`📊 Auto-establecido litros pendientes: ${producto.cantidad}, bidones: ${Math.ceil(producto.cantidad / 20)}`);
        }
      }
    } else {
      // Si se deselecciona el producto, limpiar litros y bidones
      setLitros('');
      setBidones('');
    }
  };

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

  const fetchLotesDisponibles = async () => {
    setLoadingLotes(true);
    try {
      const params = new URLSearchParams();
      if (hongo) {
        // Mapear producto Sirius a microorganismo DataLab
        const microorganismoDataLab = ProductoMicroorganismoMappingService.mapProductoToMicroorganismo(hongo);
        console.log(`🔄 Mapeando producto "${hongo}" → microorganismo "${microorganismoDataLab}"`);
        params.append('microorganismo', microorganismoDataLab);
      }

      const response = await fetch(`/api/inoculacion-disponible?${params}`);
      const data = await response.json();
      
      if (data.success) {
        // Filtrar solo los que tienen cantidad > 0
        const lotesDisponibles = data.inoculaciones.filter((lote: LoteDisponible) => lote.totalCantidadBolsas > 0);
        setLotesDisponibles(lotesDisponibles);
      } else {
        console.error('Error loading lotes:', data.error);
        setLotesDisponibles([]);
      }
    } catch (error) {
      console.error('Error fetching lotes:', error);
      setLotesDisponibles([]);
    } finally {
      setLoadingLotes(false);
    }
  };

  const fetchCepasDisponibles = async () => {
    setLoadingCepas(true);
    try {
      const params = new URLSearchParams();
      if (hongo) {
        // Mapear producto Sirius a microorganismo DataLab
        const microorganismoDataLab = ProductoMicroorganismoMappingService.mapProductoToMicroorganismo(hongo);
        console.log(`🧫 Mapeando producto "${hongo}" → microorganismo "${microorganismoDataLab}" para cepas`);
        params.append('microorganismo', microorganismoDataLab);
      }

      const response = await fetch(`/api/cepas-disponibles?${params}`);
      const data = await response.json();
      
      if (data.success) {
        // Filtrar solo los que tienen cantidad > 0
        const cepasDisponibles = data.cepas.filter((cepa: CepaDisponible) => cepa.totalCantidadBolsas > 0);
        setCepasDisponibles(cepasDisponibles);
      } else {
        console.error('Error loading cepas:', data.error);
        setCepasDisponibles([]);
      }
    } catch (error) {
      console.error('Error fetching cepas:', error);
      setCepasDisponibles([]);
    } finally {
      setLoadingCepas(false);
    }
  };

  const calcularBidones = (litrosValue: string) => {
    const litrosNum = parseFloat(litrosValue) || 0;
    setBidones(Math.ceil(litrosNum / 20).toString());
  };

  const addLote = () => {
    setLotes([...lotes, { lote: '', bolsas: '' }]);
  };

  const removeLote = (index: number) => {
    if (lotes.length > 1) {
      setLotes(lotes.filter((_, i) => i !== index));
    }
  };

  const updateLote = (index: number, field: keyof LoteData, value: string) => {
    const newLotes = [...lotes];
    newLotes[index][field] = value;
    setLotes(newLotes);
  };

  const agregarLoteSeleccionado = (loteId: string) => {
    if (!lotesSeleccionados.includes(loteId)) {
      setLotesSeleccionados([...lotesSeleccionados, loteId]);
      setCantidadesLotes({...cantidadesLotes, [loteId]: ''});
    }
  };

  const removerLoteSeleccionado = (loteId: string) => {
    setLotesSeleccionados(lotesSeleccionados.filter(id => id !== loteId));
    const newCantidades = {...cantidadesLotes};
    delete newCantidades[loteId];
    setCantidadesLotes(newCantidades);
  };

  const actualizarCantidadLote = (loteId: string, cantidad: string) => {
    setCantidadesLotes({...cantidadesLotes, [loteId]: cantidad});
  };

  // Funciones para manejar cepas
  const agregarCepaSeleccionada = (cepaId: string) => {
    if (!cepasSeleccionadas.includes(cepaId)) {
      setCepasSeleccionadas([...cepasSeleccionadas, cepaId]);
      setCantidadesCepas({...cantidadesCepas, [cepaId]: ''});
    }
  };

  const removerCepaSeleccionada = (cepaId: string) => {
    setCepasSeleccionadas(cepasSeleccionadas.filter(id => id !== cepaId));
    const newCantidades = {...cantidadesCepas};
    delete newCantidades[cepaId];
    setCantidadesCepas(newCantidades);
  };

  const actualizarCantidadCepa = (cepaId: string, cantidad: string) => {
    setCantidadesCepas({...cantidadesCepas, [cepaId]: cantidad});
  };

  const getLoteById = (id: string): LoteDisponible | undefined => {
    return lotesDisponibles.find(lote => lote.id === id);
  };

  const getCepaById = (id: string): CepaDisponible | undefined => {
    return cepasDisponibles.find(cepa => cepa.id === id);
  };

  // Calcular cantidad restante de un lote
  const getCantidadRestante = (loteId: string): number => {
    const lote = getLoteById(loteId);
    if (!lote) return 0;
    
    const cantidadUsada = parseInt(cantidadesLotes[loteId] || '0') || 0;
    return lote.totalCantidadBolsas - cantidadUsada;
  };

  // Verificar si un lote aún tiene cantidad disponible
  const loteDisponibleParaSeleccion = (loteId: string): boolean => {
    return getCantidadRestante(loteId) > 0;
  };

  // Calcular cantidad restante de una cepa
  const getCantidadRestanteCepa = (cepaId: string): number => {
    const cepa = getCepaById(cepaId);
    if (!cepa) return 0;
    
    const cantidadUsada = parseInt(cantidadesCepas[cepaId] || '0') || 0;
    return cepa.totalCantidadBolsas - cantidadUsada;
  };

  // Verificar si una cepa aún tiene cantidad disponible
  const cepaDisponibleParaSeleccion = (cepaId: string): boolean => {
    return getCantidadRestanteCepa(cepaId) > 0;
  };

  // Función para verificar si hay al menos un lote válido seleccionado
  const tieneValidacionLotes = (): boolean => {
    if (hongo) {
      // Si hay microorganismo seleccionado, verificar lotes dinámicos y cepas
      const lotesConCantidad = lotesSeleccionados.filter(loteId => {
        const cantidad = cantidadesLotes[loteId];
        return cantidad && parseInt(cantidad) > 0;
      });
      
      const cepasConCantidad = cepasSeleccionadas.filter(cepaId => {
        const cantidad = cantidadesCepas[cepaId];
        return cantidad && parseInt(cantidad) > 0;
      });
      
      return (lotesConCantidad.length > 0 || cepasConCantidad.length > 0);
    } else {
      // Si no hay microorganismo, verificar lotes manuales
      const lotesValidos = lotes.filter(lote => 
        lote.lote.trim() !== '' && 
        lote.bolsas.trim() !== '' && 
        parseInt(lote.bolsas) > 0
      );
      return lotesValidos.length > 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    // Validación obligatoria: verificar que se haya seleccionado al menos un lote con cantidad
    if (!tieneValidacionLotes()) {
      setSubmitStatus('error');
      setErrorMessage('⚠️ Debe seleccionar al menos un lote de inoculación con una cantidad válida para realizar el registro de cosecha.');
      setIsSubmitting(false);
      return;
    }

    try {
      let clienteNombre = cliente;

      // Si es un cliente nuevo, primero lo registramos
      if (cliente === 'nuevo') {
        console.log('🏢 Registrando nuevo cliente en Sirius Client Core:', nuevoCliente);
        
        const clienteResponse = await fetch('/api/clientes-core', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nombre: nuevoCliente,
            nit: nuevoClienteNit,
            contacto: '' // Se puede agregar después si es necesario
          }),
        });

        const clienteResult = await clienteResponse.json();

        if (clienteResponse.ok && clienteResult.success) {
          console.log('✅ Cliente registrado exitosamente en Sirius Core:', clienteResult.cliente);
          clienteNombre = nuevoCliente;
          
          // Refrescar la lista de clientes para incluir el nuevo
          await fetchClientes();
        } else {
          throw new Error(clienteResult.error || 'Error al registrar el cliente');
        }
      }

      const cosechaData: CosechaData = {
        horaInicio,
        horaFin,
        cliente: clienteNombre,
        nuevoCliente: cliente === 'nuevo' ? nuevoCliente : '',
        hongo,
        litros,
        bidones,
        lotes: hongo ? 
          // Si hay microorganismo seleccionado, combinar lotes dinámicos y cepas
          [
            ...lotesSeleccionados.map(loteId => {
              const lote = getLoteById(loteId);
              return {
                lote: lote?.codigoLote || loteId,
                bolsas: cantidadesLotes[loteId] || '0'
              };
            }).filter(lote => lote.bolsas !== '0' && lote.bolsas !== ''),
            ...cepasSeleccionadas.map(cepaId => {
              const cepa = getCepaById(cepaId);
              return {
                lote: cepa?.codigoCepa || cepaId,
                bolsas: cantidadesCepas[cepaId] || '0'
              };
            }).filter(cepa => cepa.bolsas !== '0' && cepa.bolsas !== '')
          ] :
          // Si no hay microorganismo, usar lotes manuales
          lotes.filter(lote => lote.lote.trim() !== '' && lote.bolsas.trim() !== ''),
        responsableEntrega,
        responsableEntregaId,
        registradoPor: user?.nombre || '',
        fechaCosecha: new Date().toISOString().split('T')[0],
        // IDs de Sirius Core para pedidos
        idPedidoCore: pedidoSeleccionado ? pedidosPendientes.find(p => p.id === pedidoSeleccionado)?.idPedidoCore : undefined,
        idProductoCore: productoSeleccionado ? productosPedido.find(p => p.id === productoSeleccionado)?.idProductoCore : undefined,
        idDetallePedido: productoSeleccionado || undefined, // Record ID del detalle para marcar como completado
        // Datos adicionales para trazabilidad
        lotesSeleccionados: hongo ? lotesSeleccionados : [],
        cantidadesLotes: hongo ? cantidadesLotes : {},
        cepasSeleccionadas: hongo ? cepasSeleccionadas : [],
        cantidadesCepas: hongo ? cantidadesCepas : {}
      };

      const response = await fetch('/api/cosecha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cosechaData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmitStatus('success');
        
        // Reset form
        setHoraInicio('');
        setHoraFin('');
        setCliente('');
        setPedidoSeleccionado('');
        setPedidosPendientes([]);
        setProductosPedido([]);
        setProductoSeleccionado('');
        setDetallesCache({});
        setProductosCache({});
        setNuevoCliente('');
        setNuevoClienteNit('');
        setHongo('');
        setLitros('');
        setBidones('');
        setLotes([{ lote: '', bolsas: '' }]);
        setLotesSeleccionados([]);
        setCantidadesLotes({});
        setCepasSeleccionadas([]);
        setCantidadesCepas({});
        setResponsableEntrega('');
        setResponsableEntregaId('');
        
        // Auto-hide success message
        setTimeout(() => {
          setSubmitStatus('idle');
        }, 3000);
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.error || 'Error al registrar la cosecha');
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
        className="min-h-screen relative pt-24"
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
            <div className="bg-gradient-to-r from-blue-400 to-blue-700 p-6 text-white relative overflow-hidden">
              <div className="relative z-10 text-center">
                <h1 className="text-3xl font-bold mb-1">FORMATO DE COSECHA</h1>
                <p className="text-xl opacity-90">Sirius Regenerative Solutions S.A.S ZOMAC</p>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* Grid de secciones principales */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Información General */}
                  <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-blue-500">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                      <span className="bg-blue-500 text-white p-2 rounded text-sm">🕒</span>
                      Información General
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hora de Inicio
                        </label>
                        <input
                          type="time"
                          value={horaInicio}
                          onChange={(e) => setHoraInicio(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hora de Fin
                        </label>
                        <input
                          type="time"
                          value={horaFin}
                          onChange={(e) => setHoraFin(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Información del Cliente */}
                  <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-blue-500">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                      <span className="bg-blue-500 text-white p-2 rounded text-sm">👤</span>
                      Información del Cliente
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cliente
                        </label>
                        <select
                          value={cliente}
                          onChange={(e) => setCliente(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          required
                          disabled={loadingClientes}
                        >
                          <option value="">Seleccione un cliente</option>
                          {loadingClientes ? (
                            <option disabled>Cargando clientes...</option>
                          ) : (
                            clientes.map((clienteOption) => (
                              <option key={clienteOption.id} value={clienteOption.nombre}>
                                {clienteOption.nombre}
                              </option>
                            ))
                          )}
                          <option value="nuevo">➕ Crear nuevo cliente</option>
                        </select>
                      </div>
                      {cliente === 'nuevo' && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Nombre del nuevo cliente
                            </label>
                            <input
                              type="text"
                              value={nuevoCliente}
                              onChange={(e) => setNuevoCliente(e.target.value)}
                              placeholder="Ingrese nombre del nuevo cliente"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              NIT del cliente
                            </label>
                            <input
                              type="text"
                              value={nuevoClienteNit}
                              onChange={(e) => setNuevoClienteNit(e.target.value)}
                              placeholder="Ingrese NIT del cliente (opcional)"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Dropdown de Pedidos Pendientes */}
                      {cliente && cliente !== 'nuevo' && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Pedido Asociado (opcional)
                          </label>
                          <select
                            value={pedidoSeleccionado}
                            onChange={(e) => setPedidoSeleccionado(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            disabled={loadingPedidos}
                          >
                            <option value="">Sin pedido asociado</option>
                            {loadingPedidos ? (
                              <option disabled>Cargando pedidos...</option>
                            ) : pedidosPendientes.length === 0 ? (
                              <option disabled>No hay pedidos pendientes</option>
                            ) : (
                              pedidosPendientes.map((pedido) => (
                                <option key={pedido.id} value={pedido.id}>
                                  {pedido.idPedidoCore} - {new Date(pedido.fechaPedido).toLocaleDateString('es-CO')} ({pedido.estado})
                                </option>
                              ))
                            )}
                          </select>
                          {pedidosPendientes.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              📦 {pedidosPendientes.length} pedido(s) pendiente(s) para este cliente
                            </p>
                          )}
                          {pedidosPendientes.length === 0 && !loadingPedidos && cliente && (
                            <p className="text-xs text-amber-600 mt-1">
                              ⚠️ Este cliente no tiene pedidos pendientes
                            </p>
                          )}

                          {/* Dropdown de Productos del Pedido */}
                          {pedidoSeleccionado && (
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Producto a Cosechar
                              </label>
                              <select
                                value={productoSeleccionado}
                                onChange={(e) => handleProductoSeleccionado(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                                disabled={loadingProductosPedido}
                              >
                                <option value="">Seleccionar producto...</option>
                                {loadingProductosPedido ? (
                                  <option disabled>Cargando productos...</option>
                                ) : productosPedido.length === 0 ? (
                                  <option disabled>No hay hongos líquidos en este pedido</option>
                                ) : (
                                  productosPedido.map((producto) => (
                                    <option key={producto.id} value={producto.id}>
                                      {producto.nombreProducto} - Cantidad: {producto.cantidad}
                                    </option>
                                  ))
                                )}
                              </select>
                              {productosPedido.length > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  🧪 {productosPedido.length} hongo(s) líquido(s) en este pedido
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Información del Hongo */}
                  <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-blue-500">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                      <span className="bg-blue-500 text-white p-2 rounded text-sm">🍄</span>
                      Información del Hongo
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hongo
                      </label>
                      <select
                        value={hongo}
                        onChange={(e) => setHongo(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        required
                        disabled={loadingMicroorganismos}
                      >
                        <option value="">Seleccionar hongo</option>
                        {loadingMicroorganismos ? (
                          <option disabled>Cargando...</option>
                        ) : (
                          microorganismos.map((micro) => (
                            <option key={micro.id} value={micro.nombre}>
                              {micro.nombre}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Datos de Cosecha */}
                  <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-blue-500">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                      <span className="bg-blue-500 text-white p-2 rounded text-sm">📊</span>
                      Datos de Cosecha
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cantidad de litros cosechados
                        </label>
                        <input
                          type="number"
                          value={litros}
                          onChange={(e) => {
                            setLitros(e.target.value);
                            calcularBidones(e.target.value);
                          }}
                          placeholder="Litros"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bidones (20L)
                        </label>
                        <input
                          type="number"
                          value={bidones}
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección de Lotes */}
                <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-blue-500">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                    <span className="bg-blue-500 text-white p-2 rounded text-sm">🧪</span>
                    Lotes de Inoculación
                  </h3>
                  
                  {!hongo ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-4">🍄</div>
                      <p className="text-lg">Seleccione un microorganismo para ver los lotes disponibles</p>
                    </div>
                  ) : loadingLotes ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-gray-600">Cargando lotes disponibles...</p>
                    </div>
                  ) : lotesDisponibles.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-4">📭</div>
                      <p className="text-lg">No hay lotes disponibles para el microorganismo seleccionado</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Selector de lotes disponibles */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Seleccionar Lote
                        </label>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              agregarLoteSeleccionado(e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        >
                          <option value="">Seleccione un lote para agregar</option>
                          {lotesDisponibles
                            .filter(lote => !lotesSeleccionados.includes(lote.id) || loteDisponibleParaSeleccion(lote.id))
                            .map((lote) => {
                              const cantidadRestante = lotesSeleccionados.includes(lote.id) ? 
                                getCantidadRestante(lote.id) : 
                                lote.totalCantidadBolsas;
                              
                              return (
                                <option key={lote.id} value={lote.id}>
                                  {lote.codigoLote} - Disponible: {cantidadRestante} bolsas
                                  {lotesSeleccionados.includes(lote.id) ? ' (parcialmente usado)' : ''}
                                </option>
                              );
                            })}
                        </select>
                      </div>

                      {/* Lotes seleccionados */}
                      {lotesSeleccionados.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-700">Lotes Seleccionados:</h4>
                          {lotesSeleccionados.map((loteId) => {
                            const lote = getLoteById(loteId);
                            if (!lote) return null;
                            
                            return (
                              <div key={loteId} className="bg-white p-4 rounded-lg border border-gray-200 relative">
                                <button
                                  type="button"
                                  onClick={() => removerLoteSeleccionado(loteId)}
                                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                                >
                                  ×
                                </button>
                                
                                <div className="grid grid-cols-2 gap-4 pr-8">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Código de Lote
                                    </label>
                                    <div className="px-3 py-2 bg-gray-100 rounded border text-gray-900">
                                      {lote.codigoLote}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Cantidad a Cosechar
                                    </label>
                                    <input
                                      type="number"
                                      value={cantidadesLotes[loteId] || ''}
                                      onChange={(e) => {
                                        const valor = e.target.value;
                                        const numero = parseInt(valor) || 0;
                                        const maximo = lote.totalCantidadBolsas;
                                        
                                        // Validar que no exceda el máximo
                                        if (numero <= maximo) {
                                          actualizarCantidadLote(loteId, valor);
                                        }
                                      }}
                                      placeholder={`Máx: ${lote.totalCantidadBolsas}`}
                                      max={lote.totalCantidadBolsas}
                                      min="1"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                    />
                                  </div>
                                </div>
                                
                                <div className="mt-2 text-sm text-gray-600">
                                  Total del Lote: {lote.totalCantidadBolsas} bolsas | 
                                  Restante: {lote.totalCantidadBolsas - (parseInt(cantidadesLotes[loteId]) || 0)} bolsas |
                                  Fecha: {lote.fechaCreacion}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Sección de Cepas Disponibles */}
                <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-green-500">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                    <span className="bg-green-500 text-white p-2 rounded text-sm">🧫</span>
                    Cepas Disponibles
                  </h3>
                  
                  {!hongo ? (
                    <div className="text-center py-8">
                      <p className="text-lg">Seleccione un microorganismo para ver las cepas disponibles</p>
                    </div>
                  ) : loadingCepas ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                      <p className="text-gray-600">Cargando cepas disponibles...</p>
                    </div>
                  ) : cepasDisponibles.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-lg">No hay cepas disponibles para el microorganismo seleccionado</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Selector de cepas disponibles */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Seleccionar Cepa
                        </label>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              agregarCepaSeleccionada(e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                        >
                          <option value="">Seleccione una cepa para agregar</option>
                          {cepasDisponibles
                            .filter(cepa => !cepasSeleccionadas.includes(cepa.id) || cepaDisponibleParaSeleccion(cepa.id))
                            .map((cepa) => {
                              const cantidadRestante = cepasSeleccionadas.includes(cepa.id) ? 
                                getCantidadRestanteCepa(cepa.id) : 
                                cepa.totalCantidadBolsas;
                              
                              return (
                                <option key={cepa.id} value={cepa.id}>
                                  {cepa.codigoCepa} - Disponible: {cantidadRestante} bolsas
                                  {cepasSeleccionadas.includes(cepa.id) ? ' (parcialmente usado)' : ''}
                                </option>
                              );
                            })}
                        </select>
                      </div>

                      {/* Cepas seleccionadas */}
                      {cepasSeleccionadas.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-700">Cepas Seleccionadas:</h4>
                          {cepasSeleccionadas.map((cepaId) => {
                            const cepa = getCepaById(cepaId);
                            if (!cepa) return null;
                            
                            return (
                              <div key={cepaId} className="bg-white p-4 rounded-lg border border-gray-200 relative">
                                <button
                                  type="button"
                                  onClick={() => removerCepaSeleccionada(cepaId)}
                                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                                >
                                  ×
                                </button>
                                
                                <div className="grid grid-cols-2 gap-4 pr-8">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Código de Cepa
                                    </label>
                                    <div className="px-3 py-2 bg-gray-100 rounded border text-gray-900">
                                      {cepa.codigoCepa}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Cantidad a Cosechar
                                    </label>
                                    <input
                                      type="number"
                                      value={cantidadesCepas[cepaId] || ''}
                                      onChange={(e) => {
                                        const valor = e.target.value;
                                        const numero = parseInt(valor) || 0;
                                        const maximo = cepa.totalCantidadBolsas;
                                        
                                        // Validar que no exceda el máximo
                                        if (numero <= maximo) {
                                          actualizarCantidadCepa(cepaId, valor);
                                        }
                                      }}
                                      placeholder={`Máx: ${cepa.totalCantidadBolsas}`}
                                      max={cepa.totalCantidadBolsas}
                                      min="1"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                                    />
                                  </div>
                                </div>
                                
                                <div className="mt-2 text-sm text-gray-600">
                                  Total de la Cepa: {cepa.totalCantidadBolsas} bolsas | 
                                  Restante: {cepa.totalCantidadBolsas - (parseInt(cantidadesCepas[cepaId]) || 0)} bolsas |
                                  Fecha: {cepa.fechaCreacion}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Responsable de Entrega */}
                <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-blue-500">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                    <span className="bg-blue-500 text-white p-2 rounded text-sm">✍️</span>
                    Responsable de Cosecha
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Responsable
                    </label>
                    <select
                      value={responsableEntrega}
                      onChange={(e) => {
                        const selectedResponsable = e.target.value;
                        const selectedOption = e.target.options[e.target.selectedIndex];
                        // Usar idCore (SIRIUS-PER-XXXX) para guardar en campo de texto
                        const selectedIdCore = selectedOption.getAttribute('data-idcore') || '';
                        
                        setResponsableEntrega(selectedResponsable);
                        setResponsableEntregaId(selectedIdCore);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      required
                      disabled={loadingResponsables}
                    >
                      <option value="">
                        {loadingResponsables ? 'Cargando responsables...' : 'Seleccione una persona'}
                      </option>
                      {responsables.map((responsable) => (
                        <option key={responsable.id} value={responsable.nombre} data-idcore={responsable.idCore || ''}>
                          {responsable.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Submit Section */}
                <div className="border-t border-gray-200 pt-6 text-center">
                  {submitStatus === 'success' && (
                    <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                      ✅ Cosecha registrada exitosamente
                    </div>
                  )}
                  
                  {submitStatus === 'error' && (
                    <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                      ❌ {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !tieneValidacionLotes()}
                    className={`px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                      !tieneValidacionLotes() 
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800'
                    }`}
                    title={!tieneValidacionLotes() ? 'Debe seleccionar al menos un lote de inoculación con cantidad válida' : ''}
                  >
                    {isSubmitting ? 'Registrando...' : 
                     !tieneValidacionLotes() ? '⚠️ Seleccione Lotes Primero' : 
                     '📋 Registrar Cosecha'}
                  </button>

                  {!tieneValidacionLotes() && (
                    <div className="mt-3 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <span className="font-medium">💡 Recordatorio:</span> Debe seleccionar al menos un lote de inoculación y especificar la cantidad de bolsas antes de registrar la cosecha.
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
