'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AudioRecorderSimple from '@/components/AudioRecorderSimple';

interface Insumo {
  id: string;
  fields: {
    ID?: string;
    nombre?: string;
    categoria_insumo?: string;
    categoriaId?: string | null;
    unidad_medida?: string;
    'Unidad Ingresa Insumo'?: string;
    'Cantidad Presentacion Insumo'?: number;
    descripcion?: string;
    'Rango Minimo Stock'?: number;
    estado?: string;
    'Estado Insumo'?: string;
    'Total Cantidad Producto'?: number;
    'Total Actual Insumos'?: number;
  };
}

/** Categoría de Sirius Insumos Core, tal como la sirve /api/insumos-catalogo. */
interface CategoriaCore {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
}

interface UnidadCore {
  id: string;
  nombre: string;
  simbolo: string;
  tipo: string;
  factorABase: number;
}

/**
 * Un lote es un movimiento de Entrada de Core con lo que aún queda de él.
 * Sustituye a los registros de la tabla `Entrada Insumos` de DataLab.
 */
interface LoteInsumo {
  id: string;
  codigo: string;
  cantidadIngresada: number;
  cantidadDisponible: number;
  fechaMovimiento: string | null;
  fechaVencimiento: string | null;
  lote: string | null;
  estadoVencimiento: 'vencido' | 'proximo' | 'vigente' | 'sin_fecha';
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return 'Sin fecha';
  // Las fechas de Core llegan como YYYY-MM-DD; sin la hora, el navegador las
  // interpreta en UTC y en Colombia se ven un día antes.
  const d = new Date(`${fecha}T00:00:00`);
  return Number.isNaN(d.getTime()) ? fecha : d.toLocaleDateString('es-CO');
}

function etiquetaVencimiento(lote: LoteInsumo): string {
  switch (lote.estadoVencimiento) {
    case 'vencido': return `⛔ Vencido ${formatearFecha(lote.fechaVencimiento)}`;
    case 'proximo': return `⚠️ Vence ${formatearFecha(lote.fechaVencimiento)}`;
    case 'vigente': return `✅ Vence ${formatearFecha(lote.fechaVencimiento)}`;
    default: return '➖ Sin vencimiento';
  }
}

function colorVencimiento(estado: LoteInsumo['estadoVencimiento']): string {
  switch (estado) {
    case 'vencido': return 'text-red-700';
    case 'proximo': return 'text-yellow-700';
    case 'vigente': return 'text-green-700';
    default: return 'text-gray-700';
  }
}

const StockInsumosPage = () => {
  const { user } = useAuth();
  
  // Estados principales
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('ver-todas');
  const [searchText, setSearchText] = useState('');
  
  // Estados para formularios
  const [showNewInsumoForm, setShowNewInsumoForm] = useState(false);
  const [showDescontarStockForm, setShowDescontarStockForm] = useState(false);
  const [showRecibirPedidoForm, setShowRecibirPedidoForm] = useState(false);
  
  // Formulario nuevo insumo - ahora permite múltiples insumos
  const [newInsumoData, setNewInsumoData] = useState({
    insumos: [{
      nombre: '',
      categoria_insumo: '',
      unidad_medida: '',
      descripcion: '',
      cantidadPresentacion: '',
      cantidadInicial: '',
      fechaVencimiento: ''
    }]
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Formularios para operaciones de stock (independientes)
  const [descontarData, setDescontarData] = useState({
    insumos: [{
      insumoId: '',  // Link to Insumos Laboratorio
      cantidadSalidaUnidades: '',  // Cantidad Salida Unidades (como string para mejor UX)
      entradaId: '', // Nueva propiedad para la entrada específica
    }]
  });

  const [recibirData, setRecibirData] = useState({
    insumos: [{
      insumoId: '',
      cantidadIngresaUnidades: '',
      fechaVencimiento: ''
    }]
  });

  // Estados para búsqueda en dropdowns
  const [searchInsumo, setSearchInsumo] = useState<{[key: number]: string}>({});
  const [dropdownOpen, setDropdownOpen] = useState<{[key: number]: boolean}>({});

  // Estados para búsqueda en dropdowns del formulario de descontar
  const [searchInsumoDescontar, setSearchInsumoDescontar] = useState<{[key: number]: string}>({});
  const [dropdownOpenDescontar, setDropdownOpenDescontar] = useState<{[key: number]: boolean}>({});

  // Lotes disponibles por fila del formulario de descontar
  const [entradasDisponibles, setEntradasDisponibles] = useState<{[key: number]: LoteInsumo[]}>({});
  const [loadingEntradas, setLoadingEntradas] = useState<{[key: number]: boolean}>({});

  // Cantidades específicas por insumo (ya no se usa, eliminar)
  // const [cantidadesPorInsumo, setCantidadesPorInsumo] = useState<{[key: string]: number}>({});

  // Categorías y unidades vienen de Sirius Insumos Core, que es quien valida al
  // escribir: una categoría inventada aquí hacía fallar el POST.
  const [categoriasCore, setCategoriasCore] = useState<CategoriaCore[]>([]);
  const [unidadesCore, setUnidadesCore] = useState<UnidadCore[]>([]);
  const [catalogoError, setCatalogoError] = useState('');

  const categorias = useMemo(() => categoriasCore.map(c => c.nombre), [categoriasCore]);

  // Cargar datos al iniciar
  useEffect(() => {
    fetchInsumos();
    fetchCatalogo();
  }, []);

  /** Lo que queda del lote elegido en esa fila del formulario, o null si no hay lote. */
  const disponibleDelLote = (index: number, loteId: string): number | null => {
    if (!loteId) return null;
    const lote = (entradasDisponibles[index] || []).find(l => l.id === loteId);
    return lote ? lote.cantidadDisponible : null;
  };

  const fetchCatalogo = async () => {
    try {
      const response = await fetch('/api/insumos-catalogo');
      const data = await response.json();

      if (data.success) {
        setCategoriasCore(data.categorias || []);
        setUnidadesCore(data.unidades || []);
        setCatalogoError('');
      } else {
        setCatalogoError(data.error || 'No se pudo cargar el catálogo de Insumos Core');
      }
    } catch (error) {
      console.error('Error al cargar el catálogo:', error);
      setCatalogoError('No se pudo cargar el catálogo de Insumos Core');
    }
  };

  /**
   * Lotes disponibles de un insumo.
   *
   * En Core el lote es un movimiento de Entrada, no un registro de una tabla
   * aparte. Vienen ordenados por vencimiento: el primero es el que toca gastar.
   */
  const fetchEntradasDisponibles = async (insumoId: string, index: number) => {
    if (!insumoId) {
      setEntradasDisponibles(prev => ({ ...prev, [index]: [] }));
      return;
    }

    setLoadingEntradas(prev => ({ ...prev, [index]: true }));

    try {
      const response = await fetch(`/api/insumos-lotes?insumoId=${insumoId}`);
      const data = await response.json();

      if (data.success) {
        setEntradasDisponibles(prev => ({ ...prev, [index]: data.lotes || [] }));
      } else {
        console.error('Error al cargar lotes:', data.error);
        setEntradasDisponibles(prev => ({ ...prev, [index]: [] }));
      }
    } catch (error) {
      console.error('Error al cargar lotes disponibles:', error);
      setEntradasDisponibles(prev => ({ ...prev, [index]: [] }));
    } finally {
      setLoadingEntradas(prev => ({ ...prev, [index]: false }));
    }
  };

  const fetchInsumos = async () => {
    setLoading(true);
    try {
      console.log('🔍 STOCK-INSUMOS: Iniciando fetch de insumos...');
      const response = await fetch('/api/stock-insumos');
      
      console.log('📡 STOCK-INSUMOS: Response status:', response.status);
      
      if (!response.ok) throw new Error('Error al cargar insumos');
      
      const data = await response.json();
      console.log('📋 STOCK-INSUMOS: Data recibida:', data);
      
      if (data.success && data.insumos) {
        console.log('✅ STOCK-INSUMOS: Insumos cargados:', data.insumos.length);
        setInsumos(data.insumos);
      } else {
        console.error('❌ STOCK-INSUMOS: Error en data:', data);
        setInsumos([]);
      }
    } catch (error) {
      console.error('❌ STOCK-INSUMOS: Error:', error);
      setError('Error al cargar los insumos');
      setInsumos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Core no modela presentaciones, así que ya no se exige ese campo: basta
      // nombre, categoría y unidad. La cantidad inicial es opcional — un insumo
      // puede entrar al catálogo con stock cero y recibir material después.
      const insumosValidos = newInsumoData.insumos.filter(
        insumo => insumo.nombre.trim() !== '' && insumo.categoria_insumo && insumo.unidad_medida
      );

      if (insumosValidos.length === 0) {
        alert('Cada insumo necesita al menos nombre, categoría y unidad de medida.');
        setIsSubmitting(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const fallos: string[] = [];

      for (const insumo of insumosValidos) {
        try {
          // Una sola llamada: el endpoint crea el insumo en Core y, si viene
          // cantidad inicial, su movimiento de Entrada. Antes eran dos fetch y
          // un fallo en el segundo dejaba el insumo sin stock y sin aviso claro.
          const response = await fetch('/api/stock-insumos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nombre: insumo.nombre,
              categoria_insumo: insumo.categoria_insumo,
              unidad_medida: insumo.unidad_medida,
              descripcion: insumo.descripcion || '',
              cantidadInicial: Number(insumo.cantidadInicial) || 0,
              fechaVencimiento: insumo.fechaVencimiento || null,
              realizaRegistro: user?.nombre || 'Usuario no identificado',
            }),
          });

          const data = await response.json();

          if (data.success) {
            successCount++;
          } else {
            errorCount++;
            fallos.push(`${insumo.nombre}: ${data.details || data.error}`);
            console.error(`❌ Error al crear ${insumo.nombre}:`, data);
          }
        } catch (error) {
          errorCount++;
          fallos.push(`${insumo.nombre}: no se pudo contactar el servidor`);
          console.error(`❌ Error de red para ${insumo.nombre}:`, error);
        }
      }

      if (fallos.length > 0) {
        alert(`No se pudieron crear ${fallos.length} insumo(s):\n\n${fallos.join('\n')}`);
      }

      if (successCount > 0) {
        setSubmitStatus('success');
        setNewInsumoData({
          insumos: [{
            nombre: '',
            categoria_insumo: '',
            unidad_medida: '',
            descripcion: '',
            cantidadPresentacion: '',
            cantidadInicial: '',
            fechaVencimiento: ''
          }]
        });
        setShowNewInsumoForm(false);
        fetchInsumos(); // Recargar la lista
        
        if (errorCount > 0) {
          alert(`Se crearon ${successCount} insumos exitosamente, pero ${errorCount} tuvieron problemas.`);
        } else {
          alert(`✅ Se crearon ${successCount} insumo${successCount > 1 ? 's' : ''} exitosamente con sus entradas iniciales.`);
        }
      } else {
        setSubmitStatus('error');
        alert(`Error: No se pudo crear ningún insumo. ${errorCount} intentos fallaron.`);
      }
    } catch (error) {
      setSubmitStatus('error');
      console.error('Error de procesamiento general:', error);
      alert(`Error de procesamiento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDescontarStock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que hay al menos un insumo válido
    const insumosValidos = descontarData.insumos.filter(
      insumo => insumo.insumoId && insumo.entradaId && insumo.cantidadSalidaUnidades && Number(insumo.cantidadSalidaUnidades) > 0
    );
    
    if (insumosValidos.length === 0) {
      alert('Debe seleccionar al menos un insumo con entrada específica y cantidad válida.');
      return;
    }

    // Validar que todos los insumos seleccionados existen
    const insumosNoEncontrados = insumosValidos.filter(insumo => 
      !insumos.find(ins => ins.id === insumo.insumoId)
    );
    
    if (insumosNoEncontrados.length > 0) {
      alert('Algunos insumos seleccionados no se encontraron. Por favor, actualice la página.');
      return;
    }

    // Validar contra lo que queda de cada lote. El servidor lo vuelve a
    // comprobar antes de escribir, porque el stock pudo moverse mientras el
    // formulario estaba abierto.
    for (let i = 0; i < insumosValidos.length; i++) {
      const insumo = insumosValidos[i];
      const index = descontarData.insumos.findIndex(item => item.insumoId === insumo.insumoId && item.entradaId === insumo.entradaId);
      const lotes = entradasDisponibles[index] || [];
      const loteSeleccionado = lotes.find(lote => lote.id === insumo.entradaId);

      if (!loteSeleccionado) {
        alert('El lote seleccionado ya no está disponible. Elija otro lote.');
        return;
      }

      const cantidadSolicitada = Number(insumo.cantidadSalidaUnidades);

      if (cantidadSolicitada > loteSeleccionado.cantidadDisponible) {
        alert(`La cantidad solicitada (${cantidadSolicitada}) excede lo que queda del lote ${loteSeleccionado.codigo} (${loteSeleccionado.cantidadDisponible}).`);
        return;
      }
    }

    // Solicitar confirmación antes de proceder
    const totalInsumos = insumosValidos.length;
    const confirmacion = window.confirm(
      `¿Está seguro de sacar ${totalInsumos} insumo(s) del inventario?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmacion) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Cada salida es un movimiento en Core que apunta al lote del que sale.
      // El stock del insumo se recalcula solo a partir de los movimientos.
      for (const insumoItem of insumosValidos) {
        const response = await fetch('/api/stock-insumos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: insumoItem.insumoId,
            operacion: 'descontar',
            loteId: insumoItem.entradaId,
            cantidad: Number(insumoItem.cantidadSalidaUnidades),
            realizaRegistro: user?.nombre || 'Usuario no identificado',
            motivo: `Salida laboratorio — ${user?.nombre || 'sin identificar'}`,
          }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.details || data.error || 'Error al registrar la salida');
        }
      }

      setSubmitStatus('success');
      setDescontarData({
        insumos: [{
          insumoId: '',
          cantidadSalidaUnidades: '',
          entradaId: '',
        }]
      });
      setEntradasDisponibles({});
      setLoadingEntradas({});
      setSearchInsumoDescontar({});
      setDropdownOpenDescontar({});
      setShowDescontarStockForm(false);
      fetchInsumos(); // Recargar la lista
    } catch (error) {
      setSubmitStatus('error');
      setError(error instanceof Error ? error.message : 'Error al sacar insumos del inventario');
      console.error('Error al sacar insumos del inventario:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecibirPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que hay al menos un insumo válido
    const insumosValidos = recibirData.insumos.filter(
      insumo => insumo.insumoId && insumo.cantidadIngresaUnidades && Number(insumo.cantidadIngresaUnidades) > 0
    );
    
    if (insumosValidos.length === 0) {
      alert('Debe agregar al menos un insumo con cantidad válida');
      return;
    }

    // Validar que todos los insumos seleccionados existen
    const insumosNoEncontrados = insumosValidos.filter(insumo => 
      !insumos.find(ins => ins.id === insumo.insumoId)
    );
    
    if (insumosNoEncontrados.length > 0) {
      alert('Hay insumos seleccionados que no son válidos. Por favor, seleccione insumos de la lista.');
      return;
    }

    // Solicitar confirmación antes de proceder
    const confirmacion = window.confirm(
      `¿Está seguro de recibir este pedido con ${insumosValidos.length} insumo(s)?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmacion) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Cada insumo recibido es un movimiento de Entrada, y cada uno es su
      // propio lote: por eso la fecha de vencimiento va en el movimiento y no
      // en el insumo — dos frascos del mismo reactivo caducan distinto.
      const fallos: string[] = [];

      for (const insumo of insumosValidos) {
        const nombre = insumos.find(i => i.id === insumo.insumoId)?.fields.nombre || insumo.insumoId;

        const response = await fetch('/api/stock-insumos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: insumo.insumoId,
            operacion: 'recibir',
            cantidad: Number(insumo.cantidadIngresaUnidades),
            fechaVencimiento: insumo.fechaVencimiento || null,
            realizaRegistro: user?.nombre || 'Usuario no identificado',
            observaciones: `Recepción de pedido — ${user?.nombre || 'sin identificar'}`,
          }),
        });

        const data = await response.json();
        if (!data.success) {
          fallos.push(`${nombre}: ${data.details || data.error}`);
        }
      }

      if (fallos.length > 0) {
        throw new Error(fallos.join('\n'));
      }

      setSubmitStatus('success');
      setRecibirData({
        insumos: [{
          insumoId: '',
          cantidadIngresaUnidades: '',
          fechaVencimiento: ''
        }]
      });
      setSearchInsumo({});
      setDropdownOpen({});
      setShowRecibirPedidoForm(false);
      fetchInsumos(); // Recargar la lista
    } catch (error) {
      setSubmitStatus('error');
      setError(error instanceof Error ? error.message : 'Error al recibir el pedido');
      console.error('Error al recibir pedido:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelarRecibirPedido = () => {
    const confirmacion = window.confirm(
      '¿Está seguro de cancelar el formulario de recibir pedido?\n\nSe perderán todos los datos ingresados.'
    );

    if (confirmacion) {
      setRecibirData({ 
        insumos: [{
          insumoId: '',
          cantidadIngresaUnidades: '',
          fechaVencimiento: ''
        }]
      });
      setSearchInsumo({});
      setDropdownOpen({});
      setShowRecibirPedidoForm(false);
    }
  };

  const handleCancelarDescontarStock = () => {
    const confirmacion = window.confirm(
      '¿Está seguro de cancelar el formulario de sacar inventario?\n\nSe perderán todos los datos ingresados.'
    );

    if (confirmacion) {
      setDescontarData({
        insumos: [{
          insumoId: '',
          cantidadSalidaUnidades: '',
          entradaId: '',
        }]
      });
      setEntradasDisponibles({});
      setLoadingEntradas({});
      setSearchInsumoDescontar({});
      setDropdownOpenDescontar({});
      setShowDescontarStockForm(false);
    }
  };

  // Función para filtrar insumos en el dropdown
  const filtrarInsumos = (searchTerm: string) => {
    if (!searchTerm) return insumos;
    
    return insumos.filter(insumo => {
      const hasName = insumo.fields.nombre && insumo.fields.nombre.trim();
      const nombre = hasName ? insumo.fields.nombre : `Sin nombre - ${insumo.id.slice(-6)}`;
      const unidad = insumo.fields['Unidad Ingresa Insumo'] || insumo.fields.unidad_medida || 'unidad';
      
      return (nombre && nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
             unidad.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (insumo.fields.categoria_insumo && insumo.fields.categoria_insumo.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  };

  const categoriasUnicas = Array.from(
    new Set(insumos.map(insumo => insumo.fields.categoria_insumo || 'Sin categoría'))
  ).sort();

  // Filtrar insumos por categoría y búsqueda
  const insumosFiltrados = insumos.filter(insumo => {
    // Core ya sirve solo lo del laboratorio (Areas Consumidoras), así que "ver
    // todas" muestra el inventario completo del área y no hace falta una lista
    // de categorías básicas que esconda el resto.
    const pasaFiltroCategoria =
      filtroCategoria === 'ver-todas' || insumo.fields.categoria_insumo === filtroCategoria;
    
    // Filtro por búsqueda de texto
    const pasaFiltroBusqueda = !searchText || 
      (insumo.fields.nombre && insumo.fields.nombre.toLowerCase().includes(searchText.toLowerCase())) ||
      (insumo.fields.categoria_insumo && insumo.fields.categoria_insumo.toLowerCase().includes(searchText.toLowerCase())) ||
      (insumo.fields.unidad_medida && insumo.fields.unidad_medida.toLowerCase().includes(searchText.toLowerCase())) ||
      (insumo.fields.descripcion && typeof insumo.fields.descripcion === 'string' && insumo.fields.descripcion.toLowerCase().includes(searchText.toLowerCase()));
    
    return pasaFiltroCategoria && pasaFiltroBusqueda;
  });

  // Manejar transcripción de voz
  const handleVoiceTranscription = (text: string) => {
    setSearchText(text);
  };

  // Calcular estadísticas
  const stats = {
    total: insumos.length,
    conNombre: insumos.filter(insumo => insumo.fields.nombre && insumo.fields.nombre.trim()).length,
    sinConfigurar: insumos.filter(insumo => !insumo.fields.nombre || !insumo.fields.nombre.trim()).length,
    disponibles: insumos.filter(insumo => insumo.fields.estado === 'Disponible').length,
    agotados: insumos.filter(insumo => insumo.fields.estado === 'Agotado').length
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
          <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 text-white relative overflow-hidden">
                <div className="relative z-10 text-center">
                  <h1 className="text-3xl font-bold mb-2">📦 STOCK DE INSUMOS</h1>
                  <p className="text-xl opacity-90">Gestión y Control de Inventario de Laboratorio</p>
                </div>
              </div>
            </div>

            {/* Filtros y controles */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="flex flex-col gap-6">
                
                {/* Barra de búsqueda con micrófono */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Buscar insumos por nombre, categoría, unidad o descripción... 🎤"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="w-full px-4 py-3 pr-14 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-700 placeholder-gray-500"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <AudioRecorderSimple
                        onTranscriptionComplete={handleVoiceTranscription}
                        currentText={searchText}
                        onTextChange={setSearchText}
                      />
                    </div>
                  </div>
                  
                  {searchText && (
                    <button
                      onClick={() => setSearchText('')}
                      className="px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {/* Filtros por categoría */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFiltroCategoria('ver-todas')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      filtroCategoria === 'ver-todas'
                        ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Ver Todas ({insumos.length})
                  </button>
                  
                  {categoriasUnicas.map((categoria) => {
                    const count = insumos.filter(i => i.fields.categoria_insumo === categoria).length;
                    return (
                      <button
                        key={categoria}
                        onClick={() => setFiltroCategoria(categoria)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                          filtroCategoria === categoria
                            ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {categoria} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Barra de acciones profesionales */}
                <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Operaciones de Inventario</h2>
                  
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      <strong>💡 Instrucción:</strong> Usa estos botones para gestionar tu inventario. Los formularios incluyen selectores para elegir insumos específicos.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setShowNewInsumoForm(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                    >
                      <span>➕</span>
                      <span>Registrar Insumo Nuevo</span>
                    </button>
                    
                    <button
                      onClick={() => setShowDescontarStockForm(true)}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                    >
                      <span>📤</span>
                      <span>Sacar de Inventario</span>
                    </button>
                    
                    <button
                      onClick={() => setShowRecibirPedidoForm(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                    >
                      <span>📥</span>
                      <span>Recibir Pedidos</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-white text-lg">Cargando insumos...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 whitespace-pre-line">
                ❌ {error}
                <button
                  onClick={() => { setError(''); fetchInsumos(); }}
                  className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Sin catálogo no se puede crear un insumo: Core valida categoría y unidad. */}
            {catalogoError && (
              <div className="bg-amber-100 border border-amber-400 text-amber-800 px-4 py-3 rounded-lg mb-6">
                ⚠️ {catalogoError}. No se podrán crear insumos nuevos hasta que se restablezca.
                <button
                  onClick={fetchCatalogo}
                  className="ml-4 bg-amber-600 text-white px-3 py-1 rounded text-sm hover:bg-amber-700"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Lista de Insumos */}
            <div className="max-w-7xl mx-auto">
              <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
                  <div className="flex items-center gap-3">
                    <span className="bg-white/20 p-2 rounded-lg text-2xl">📦</span>
                    <div>
                      <h2 className="text-2xl font-bold">Inventario de Insumos ({insumosFiltrados.length})</h2>
                      <p className="opacity-90">
                        {filtroCategoria === 'ver-todas'
                          ? 'Todo el inventario del laboratorio'
                          : `Categoría: ${filtroCategoria}`}
                      </p>
                    </div>
                  </div>
                </div>
              
              <div className="p-6">
                {/* Información de resultados */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Mostrando {insumosFiltrados.length} de {insumos.length} insumos
                    {searchText && (
                      <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                        Filtrado por: &quot;{searchText}&quot;
                      </span>
                    )}
                  </div>
                </div>

                {insumosFiltrados.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-4">
                      {searchText ? '�' : '�📭'}
                    </div>
                    <p className="text-lg mb-2">
                      {searchText ? 'No se encontraron insumos' : 'No hay insumos registrados'}
                    </p>
                    {searchText ? (
                      <p className="text-sm text-gray-400 mb-4">
                        Intenta con otros términos de búsqueda
                      </p>
                    ) : null}
                    <button
                      onClick={() => {
                        if (searchText) {
                          setSearchText('');
                        } else {
                          setShowNewInsumoForm(true);
                        }
                      }}
                      className="mt-4 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all"
                    >
                      {searchText ? 'Limpiar Búsqueda' : 'Agregar Primer Insumo'}
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Insumo</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Categoría</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Unidad Presentación</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Total</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insumosFiltrados.map((insumo, index) => {
                          const hasName = insumo.fields.nombre && insumo.fields.nombre.trim();
                          const totalCantidad = insumo.fields['Total Cantidad Producto'] || 0;
                          const totalActual = insumo.fields['Total Actual Insumos'] || 0;
                          const cantidadPresentacion = insumo.fields['Cantidad Presentacion Insumo'] || 0;
                          const estado = insumo.fields.estado || 'Disponible';
                          
                          // Lógica simplificada de estados basada en Total Actual Insumos:
                          // - Agotado: totalActual = 0
                          // - Disponible: totalActual > 0
                          const esAgotado = totalActual === 0;
                          const esDisponible = totalActual > 0;
                          
                          return (
                            <tr 
                              key={insumo.id}
                              className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                              } ${
                                !hasName ? 'bg-yellow-25 hover:bg-yellow-50' : 
                                esAgotado ? 'bg-red-25 hover:bg-red-50' : ''
                              }`}
                            >
                              {/* Nombre del insumo */}
                              <td className="py-3 px-4">
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-900">
                                    {hasName ? insumo.fields.nombre : `Sin nombre - ID: ${insumo.id.slice(-6)}`}
                                  </span>
                                  {insumo.fields.descripcion && typeof insumo.fields.descripcion === 'string' && (
                                    <span className="text-xs text-gray-500 mt-1 line-clamp-1">
                                      {insumo.fields.descripcion}
                                    </span>
                                  )}
                                </div>
                              </td>
                              
                              {/* Categoría */}
                              <td className="py-3 px-4">
                                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                  {insumo.fields.categoria_insumo || 'Sin categoría'}
                                </span>
                              </td>
                              
                              {/* Unidad Presentación */}
                              <td className="py-3 px-4 text-gray-700">
                                <span className="text-sm">
                                  {insumo.fields['Unidad Ingresa Insumo'] || insumo.fields.unidad_medida || 'Sin unidad'}
                                </span>
                              </td>
                              
                              {/* Total Actual */}
                              <td className="py-3 px-4 text-center">
                                <span className="font-medium text-gray-700">
                                  {Number(totalActual).toFixed(2)}
                                </span>
                              </td>
                              
                              {/* Estado */}
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                  esAgotado ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                }`}>
                                  {esAgotado ? '� Agotado' : '🟢 Disponible'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Botón de recarga */}
            <div className="max-w-7xl mx-auto text-center mt-8">
              <button
                onClick={fetchInsumos}
                disabled={loading}
                className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-700 hover:to-red-700 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Actualizando...' : '🔄 Actualizar Stock'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para crear nuevo insumo */}
      {showNewInsumoForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="bg-emerald-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center space-x-2">
                  <span>📦</span>
                  <span>Registrar Nuevo Insumo</span>
                </h2>
                
                {/* Botón de cerrar */}
                <button
                  onClick={() => setShowNewInsumoForm(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleCreateInsumo} className="p-6 space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                    <span>📦</span>
                    <span>Insumos a Registrar ({newInsumoData.insumos.length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setNewInsumoData({
                        ...newInsumoData,
                        insumos: [...newInsumoData.insumos, {
                          nombre: '',
                          categoria_insumo: '',
                          unidad_medida: '',
                          descripcion: '',
                          cantidadPresentacion: '',
                          cantidadInicial: '',
                          fechaVencimiento: ''
                        }]
                      });
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    <span className="text-lg">➕</span>
                    <span>Agregar Otro Insumo</span>
                  </button>
                </div>

                {/* Lista de insumos */}
                {newInsumoData.insumos.map((insumo, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 mb-3 last:mb-0 shadow-sm">
                    {/* Header del insumo */}
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                        <span className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full text-sm font-bold">
                          #{index + 1}
                        </span>
                        <span>Insumo {index + 1}</span>
                      </h4>
                      {newInsumoData.insumos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const nuevosInsumos = newInsumoData.insumos.filter((_, i) => i !== index);
                            setNewInsumoData({...newInsumoData, insumos: nuevosInsumos});
                          }}
                          className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center space-x-1"
                        >
                          <span>🗑️</span>
                          <span>Eliminar</span>
                        </button>
                      )}
                    </div>

                    {/* Grid de campos para cada insumo */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      
                      {/* Columna izquierda */}
                      <div className="space-y-3">
                        {/* Nombre del insumo */}
                        <div className="group">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">🏷️</span>
                              <span>Nombre del Insumo</span>
                              <span className="text-red-500">*</span>
                            </div>
                          </label>
                          <input
                            type="text"
                            required
                            value={insumo.nombre}
                            onChange={(e) => {
                              const nuevosInsumos = [...newInsumoData.insumos];
                              nuevosInsumos[index] = {...nuevosInsumos[index], nombre: e.target.value};
                              setNewInsumoData({...newInsumoData, insumos: nuevosInsumos});
                            }}
                            className="w-full px-3 py-2 text-base border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white placeholder-gray-500 text-gray-700"
                            placeholder="Ej: Agua destilada 1L, Guantes de nitrilo, Medio de cultivo..."
                          />
                        </div>

                        {/* Categoría */}
                        <div className="group">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">📂</span>
                              <span>Categoría</span>
                              <span className="text-red-500">*</span>
                            </div>
                          </label>
                          <select
                            required
                            value={insumo.categoria_insumo}
                            onChange={(e) => {
                              const nuevosInsumos = [...newInsumoData.insumos];
                              nuevosInsumos[index] = {...nuevosInsumos[index], categoria_insumo: e.target.value};
                              setNewInsumoData({...newInsumoData, insumos: nuevosInsumos});
                            }}
                            className="w-full px-3 py-2 text-base border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white appearance-none cursor-pointer placeholder-gray-500 text-gray-700"
                          >
                            <option value="" className="text-gray-500">Seleccionar categoría...</option>
                            {categorias.map(categoria => (
                              <option key={categoria} value={categoria} className="text-gray-700">{categoria}</option>
                            ))}
                          </select>
                        </div>

                        {/* Unidad de medida - Campo de texto con sugerencias de Airtable */}
                        <div className="group">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">⚖️</span>
                              <span>Unidad de Presentación</span>
                              <span className="text-red-500">*</span>
                            </div>
                          </label>
                          <select
                            required
                            value={insumo.unidad_medida}
                            onChange={(e) => {
                              const nuevosInsumos = [...newInsumoData.insumos];
                              nuevosInsumos[index] = {...nuevosInsumos[index], unidad_medida: e.target.value};
                              setNewInsumoData({...newInsumoData, insumos: nuevosInsumos});
                            }}
                            className="w-full px-3 py-2 text-base border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white appearance-none cursor-pointer text-gray-700"
                          >
                            <option value="" className="text-gray-500">Seleccionar unidad...</option>
                            {unidadesCore.map(unidad => (
                              <option key={unidad.id} value={unidad.nombre} className="text-gray-700">
                                {unidad.nombre} ({unidad.simbolo})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Columna derecha */}
                      <div className="space-y-3">
                        {/* Descripción */}
                        <div className="group">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">📝</span>
                              <span>Descripción</span>
                              <span className="text-gray-400 text-sm font-normal">(Opcional)</span>
                            </div>
                          </label>
                          <div className="relative">
                            <textarea
                              rows={3}
                              value={insumo.descripcion}
                              onChange={(e) => {
                                const nuevosInsumos = [...newInsumoData.insumos];
                                nuevosInsumos[index] = {...nuevosInsumos[index], descripcion: e.target.value};
                                setNewInsumoData({...newInsumoData, insumos: nuevosInsumos});
                              }}
                              className="w-full px-3 py-2 pr-12 text-base border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white resize-none placeholder-gray-500 text-gray-700"
                              placeholder="Especificaciones técnicas, marca, modelo, uso recomendado..."
                            />
                            <div className="absolute top-3 right-3">
                              <AudioRecorderSimple
                                currentText={insumo.descripcion || ''}
                                onTextChange={(text) => {
                                  const nuevosInsumos = [...newInsumoData.insumos];
                                  nuevosInsumos[index] = {...nuevosInsumos[index], descripcion: text};
                                  setNewInsumoData({...newInsumoData, insumos: nuevosInsumos});
                                }}
                                onTranscriptionComplete={(text) => {
                                  const currentText = insumo.descripcion || '';
                                  const newText = currentText ? `${currentText} ${text}` : text;
                                  const nuevosInsumos = [...newInsumoData.insumos];
                                  nuevosInsumos[index] = {...nuevosInsumos[index], descripcion: newText};
                                  setNewInsumoData({...newInsumoData, insumos: nuevosInsumos});
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Cantidad de Presentación */}
                        <div className="group">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">📦</span>
                              <span>Cantidad de Presentación</span>
                              <span className="text-red-500">*</span>
                            </div>
                          </label>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            required
                            value={insumo.cantidadPresentacion}
                            onChange={(e) => {
                              const nuevosInsumos = [...newInsumoData.insumos];
                              nuevosInsumos[index] = {...nuevosInsumos[index], cantidadPresentacion: e.target.value};
                              setNewInsumoData({...newInsumoData, insumos: nuevosInsumos});
                            }}
                            className="w-full px-3 py-2 text-base border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white placeholder-gray-500 text-gray-700"
                            placeholder="Ej: 500 (para TARRO DE 500GR)"
                          />
                        </div>

                        {/* Cantidad Inicial */}
                        <div className="group">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">📊</span>
                              <span>Cantidad Inicial</span>
                              <span className="text-red-500">*</span>
                            </div>
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={insumo.cantidadInicial}
                            onChange={(e) => {
                              const nuevosInsumos = [...newInsumoData.insumos];
                              nuevosInsumos[index] = {...nuevosInsumos[index], cantidadInicial: e.target.value};
                              setNewInsumoData({...newInsumoData, insumos: nuevosInsumos});
                            }}
                            className="w-full px-3 py-2 text-base border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white placeholder-gray-500 text-gray-700"
                            placeholder="Mínimo 1 unidad para ingresar al inventario"
                          />
                        </div>

                        {/* Fecha de Vencimiento */}
                        <div className="group">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">📅</span>
                              <span>Fecha de Vencimiento</span>
                              <span className="text-gray-400 text-sm font-normal">(Opcional)</span>
                            </div>
                          </label>
                          <input
                            type="date"
                            value={insumo.fechaVencimiento}
                            onChange={(e) => {
                              const nuevosInsumos = [...newInsumoData.insumos];
                              nuevosInsumos[index] = {...nuevosInsumos[index], fechaVencimiento: e.target.value};
                              setNewInsumoData({...newInsumoData, insumos: nuevosInsumos});
                            }}
                            className="w-full px-3 py-2 text-base border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white placeholder-gray-500 text-gray-700"
                          />
                        </div>

                        {/* Card de información para el insumo */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <h5 className="text-xs font-semibold text-blue-800 mb-1 flex items-center space-x-1">
                            <span className="text-sm">💡</span>
                            <span>Información</span>
                          </h5>
                          <ul className="space-y-1 text-blue-700 text-xs">
                            <li className="flex items-start space-x-1">
                              <span className="text-blue-500 font-bold">•</span>
                              <span>Si especifica cantidad inicial, se creará automáticamente la entrada de inventario</span>
                            </li>
                            <li className="flex items-start space-x-1">
                              <span className="text-blue-500 font-bold">•</span>
                              <span>La cantidad de presentación se usa para cálculos en granel</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botones mejorados */}
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNewInsumoForm(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-4 rounded-xl text-lg font-semibold transition-all duration-200 border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Cancelar</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-6 py-4 rounded-xl text-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Creando...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">📦</span>
                      <span>Crear {newInsumoData.insumos.length} Insumo{newInsumoData.insumos.length > 1 ? 's' : ''}</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Mensajes de estado mejorados */}
              {submitStatus === 'success' && (
                <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 text-green-800 px-6 py-4 rounded-xl flex items-center space-x-3 animate-in slide-in-from-top-2 duration-300">
                  <div className="bg-green-200 p-2 rounded-full">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-lg">¡Insumo creado exitosamente!</p>
                    <p className="text-sm text-green-700">El insumo ha sido agregado al inventario y está listo para usar.</p>
                  </div>
                </div>
              )}
              
              {submitStatus === 'error' && (
                <div className="mt-6 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-xl flex items-center space-x-3 animate-in slide-in-from-top-2 duration-300">
                  <div className="bg-red-200 p-2 rounded-full">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Error al crear el insumo</p>
                    <p className="text-sm text-red-700">Por favor, revise los datos e intente nuevamente.</p>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Modal para sacar de inventario */}
      {showDescontarStockForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 rounded-t-xl">
              <div className="flex items-center">
                <h2 className="text-xl font-bold">📤 Sacar de Inventario</h2>
              </div>
            </div>
            
            <form onSubmit={handleDescontarStock} className="p-6 space-y-6">
              {/* Lista de Insumos */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                    <span>📤</span>
                    <span>Insumos a Sacar ({descontarData.insumos.length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const newIndex = descontarData.insumos.length;
                      setDescontarData({
                        ...descontarData,
                        insumos: [
                          ...descontarData.insumos,
                          {
                            insumoId: '',
                            cantidadSalidaUnidades: '',
                            entradaId: '',
                          }
                        ]
                      });
                      // Inicializar estados de búsqueda para el nuevo insumo
                      setSearchInsumoDescontar({...searchInsumoDescontar, [newIndex]: ''});
                      setDropdownOpenDescontar({...dropdownOpenDescontar, [newIndex]: false});
                    }}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <span>➕</span>
                    <span>Agregar Insumo</span>
                  </button>
                </div>

                {descontarData.insumos.map((insumo, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-800">Insumo #{index + 1}</h4>
                      {descontarData.insumos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const nuevosInsumos = descontarData.insumos.filter((_, i) => i !== index);
                            setDescontarData({ ...descontarData, insumos: nuevosInsumos });
                            
                            // Limpiar estados de entradas para este índice
                            const newEntradasDisponibles = {...entradasDisponibles};
                            const newLoadingEntradas = {...loadingEntradas};
                            delete newEntradasDisponibles[index];
                            delete newLoadingEntradas[index];
                            
                            // Reindexar los estados restantes
                            const reindexedEntradas: {[key: number]: any[]} = {};
                            const reindexedLoading: {[key: number]: boolean} = {};
                            Object.keys(newEntradasDisponibles).forEach((key) => {
                              const numKey = Number(key);
                              if (numKey > index) {
                                reindexedEntradas[numKey - 1] = newEntradasDisponibles[numKey];
                                reindexedLoading[numKey - 1] = newLoadingEntradas[numKey];
                              } else if (numKey < index) {
                                reindexedEntradas[numKey] = newEntradasDisponibles[numKey];
                                reindexedLoading[numKey] = newLoadingEntradas[numKey];
                              }
                            });
                            
                            setEntradasDisponibles(reindexedEntradas);
                            setLoadingEntradas(reindexedLoading);
                            
                            // Limpiar y reindexar estados de búsqueda
                            const newSearchInsumoDescontar = {...searchInsumoDescontar};
                            const newDropdownOpenDescontar = {...dropdownOpenDescontar};
                            delete newSearchInsumoDescontar[index];
                            delete newDropdownOpenDescontar[index];
                            
                            // Reindexar los estados restantes
                            const reindexedSearch: {[key: number]: string} = {};
                            const reindexedDropdown: {[key: number]: boolean} = {};
                            Object.keys(newSearchInsumoDescontar).forEach((key) => {
                              const numKey = Number(key);
                              if (numKey > index) {
                                reindexedSearch[numKey - 1] = newSearchInsumoDescontar[numKey];
                                reindexedDropdown[numKey - 1] = newDropdownOpenDescontar[numKey];
                              } else if (numKey < index) {
                                reindexedSearch[numKey] = newSearchInsumoDescontar[numKey];
                                reindexedDropdown[numKey] = newDropdownOpenDescontar[numKey];
                              }
                            });
                            
                            setSearchInsumoDescontar(reindexedSearch);
                            setDropdownOpenDescontar(reindexedDropdown);
                          }}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <span className="text-lg">🗑️</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Selector de insumo */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Insumo *
                        </label>
                        <div className="relative">
                          {/* Campo de búsqueda */}
                          <input
                            type="text"
                            value={searchInsumoDescontar[index] || ''}
                            onChange={(e) => {
                              setSearchInsumoDescontar({...searchInsumoDescontar, [index]: e.target.value});
                              setDropdownOpenDescontar({...dropdownOpenDescontar, [index]: true});
                            }}
                            onFocus={() => setDropdownOpenDescontar({...dropdownOpenDescontar, [index]: true})}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-gray-700 placeholder:text-gray-700 placeholder:font-semibold"
                            placeholder="Buscar insumo..."
                          />

                          {/* Dropdown con resultados */}
                          {dropdownOpenDescontar[index] && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {filtrarInsumos(searchInsumoDescontar[index] || '').length > 0 ? (
                                filtrarInsumos(searchInsumoDescontar[index] || '').map(insumoOption => {
                                  const hasName = insumoOption.fields.nombre && insumoOption.fields.nombre.trim();
                                  const totalActual = insumoOption.fields['Total Actual Insumos'] || 0;
                                  const unidad = insumoOption.fields['Unidad Ingresa Insumo'] || insumoOption.fields.unidad_medida || 'unidad';
                                  const displayName = hasName ? insumoOption.fields.nombre : `Sin nombre - ${insumoOption.id.slice(-6)}`;

                                  return (
                                    <div
                                      key={insumoOption.id}
                                      onClick={() => {
                                        const nuevosInsumos = [...descontarData.insumos];
                                        nuevosInsumos[index].insumoId = insumoOption.id;
                                        nuevosInsumos[index].entradaId = ''; // Reset entrada selection
                                        setDescontarData({ ...descontarData, insumos: nuevosInsumos });
                                        setSearchInsumoDescontar({...searchInsumoDescontar, [index]: displayName || ''});
                                        setDropdownOpenDescontar({...dropdownOpenDescontar, [index]: false});

                                        // Cargar entradas disponibles para este insumo
                                        fetchEntradasDisponibles(insumoOption.id, index);
                                      }}
                                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                    >
                                      <div className="font-medium text-gray-900">{displayName}</div>
                                      <div className="text-sm text-gray-500 flex items-center space-x-2">
                                        <span>📦 Stock: {Number(totalActual).toFixed(2)} {unidad}</span>
                                      </div>
                                      {insumoOption.fields.categoria_insumo && (
                                        <div className="text-xs text-gray-400">{insumoOption.fields.categoria_insumo}</div>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="px-3 py-2 text-gray-500 text-center">
                                  No se encontraron insumos
                                </div>
                              )}
                            </div>
                          )}

                          {/* Botón para cerrar dropdown */}
                          {dropdownOpenDescontar[index] && (
                            <div
                              className="fixed inset-0 z-5"
                              onClick={() => setDropdownOpenDescontar({...dropdownOpenDescontar, [index]: false})}
                            />
                          )}
                        </div>

                        {/* Mostrar información del insumo seleccionado */}
                        {insumo.insumoId && (
                          <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                            <p className="text-sm text-orange-800 flex items-center space-x-2">
                              <span>📏</span>
                              <span>
                                <strong>Unidad:</strong> {
                                  insumos.find(ins => ins.id === insumo.insumoId)?.fields['Unidad Ingresa Insumo'] ||
                                  insumos.find(ins => ins.id === insumo.insumoId)?.fields.unidad_medida ||
                                  'Sin unidad'
                                }
                              </span>
                            </p>
                            <p className="text-sm text-orange-800 flex items-center space-x-2 mt-1">
                              <span>📊</span>
                              <span>
                                <strong>Stock Actual:</strong> {
                                  insumos.find(ins => ins.id === insumo.insumoId)?.fields['Total Actual Insumos'] || 0
                                } unidades
                              </span>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Selector de entrada específica */}
                      {insumo.insumoId && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Seleccionar Lote/Entrada *
                          </label>
                          
                          {loadingEntradas[index] ? (
                            <div className="flex items-center justify-center py-3">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                              <span className="ml-2 text-sm text-gray-600">Cargando entradas...</span>
                            </div>
                          ) : (
                            <select
                              value={insumo.entradaId}
                              onChange={(e) => {
                                const nuevosInsumos = [...descontarData.insumos];
                                nuevosInsumos[index].entradaId = e.target.value;
                                setDescontarData({ ...descontarData, insumos: nuevosInsumos });
                              }}
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-gray-700"
                              required
                            >
                              <option value="">Seleccionar lote</option>
                              {(entradasDisponibles[index] || []).map(lote => (
                                <option key={lote.id} value={lote.id}>
                                  {`${etiquetaVencimiento(lote)} · ${lote.cantidadDisponible} disponible · ingresó ${formatearFecha(lote.fechaMovimiento)}`}
                                </option>
                              ))}
                            </select>
                          )}
                          
                          {/* Detalle del lote seleccionado */}
                          {insumo.entradaId && entradasDisponibles[index] && (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              {(() => {
                                const loteSeleccionado = entradasDisponibles[index].find(l => l.id === insumo.entradaId);
                                if (!loteSeleccionado) return null;

                                return (
                                  <div className="space-y-2">
                                    <p className="text-sm text-blue-800 flex items-center space-x-2">
                                      <span>🧾</span>
                                      <span><strong>Lote:</strong> {loteSeleccionado.lote || loteSeleccionado.codigo}</span>
                                    </p>
                                    <p className="text-sm text-blue-800 flex items-center space-x-2">
                                      <span>📅</span>
                                      <span><strong>Ingresó:</strong> {formatearFecha(loteSeleccionado.fechaMovimiento)}</span>
                                    </p>
                                    <p className="text-sm text-blue-800 flex items-center space-x-2">
                                      <span>📊</span>
                                      <span>
                                        <strong>Queda de este lote:</strong> {loteSeleccionado.cantidadDisponible} de {loteSeleccionado.cantidadIngresada}
                                      </span>
                                    </p>
                                    <p className="text-sm text-blue-800 flex items-center space-x-2">
                                      <span>📆</span>
                                      <span><strong>Vence:</strong> {formatearFecha(loteSeleccionado.fechaVencimiento)}</span>
                                    </p>
                                    <p className={`text-sm flex items-center space-x-2 ${colorVencimiento(loteSeleccionado.estadoVencimiento)}`}>
                                      <span>⚠️</span>
                                      <span><strong>Estado:</strong> {etiquetaVencimiento(loteSeleccionado)}</span>
                                    </p>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          
                          {!loadingEntradas[index] && (!entradasDisponibles[index] || entradasDisponibles[index].length === 0) && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm text-red-800 flex items-center space-x-2">
                                <span>⚠️</span>
                                <span>No hay entradas disponibles para este insumo</span>
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Cantidad a sacar */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Cantidad a sacar *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={disponibleDelLote(index, insumo.entradaId) ?? undefined}
                          value={insumo.cantidadSalidaUnidades}
                          onChange={(e) => {
                            const valorIngresado = Number(e.target.value);
                            let valorFinal = e.target.value;

                            const disponible = disponibleDelLote(index, insumo.entradaId);
                            if (disponible !== null && valorIngresado > disponible) {
                              valorFinal = disponible.toString();
                              alert(`Este lote solo tiene ${disponible} disponible.`);
                            }

                            const nuevosInsumos = [...descontarData.insumos];
                            nuevosInsumos[index].cantidadSalidaUnidades = valorFinal;
                            setDescontarData({ ...descontarData, insumos: nuevosInsumos });
                          }}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-gray-700 placeholder:text-gray-700 placeholder:font-semibold"
                          placeholder={
                            disponibleDelLote(index, insumo.entradaId) !== null
                              ? `Cantidad a sacar (máximo ${disponibleDelLote(index, insumo.entradaId)})`
                              : 'Primero elija un lote'
                          }
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botones */}
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Sacando...' : 'Sacar de Inventario'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelarDescontarStock}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para recibir pedidos */}
      {showRecibirPedidoForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-xl">
              <div className="flex items-center">
                <h2 className="text-xl font-bold">📥 Recibir Pedido</h2>
              </div>
            </div>
            
            <form onSubmit={handleRecibirPedido} className="p-6 space-y-6">
              {/* Lista de Insumos */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                    <span>📦</span>
                    <span>Insumos a Recibir ({recibirData.insumos.length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const newIndex = recibirData.insumos.length;
                      setRecibirData({
                        ...recibirData,
                        insumos: [
                          ...recibirData.insumos,
                          {
                            insumoId: '',
                            cantidadIngresaUnidades: '',
                            fechaVencimiento: ''
                          }
                        ]
                      });
                      // Inicializar estados de búsqueda para el nuevo insumo
                      setSearchInsumo({...searchInsumo, [newIndex]: ''});
                      setDropdownOpen({...dropdownOpen, [newIndex]: false});
                    }}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <span>➕</span>
                    <span>Agregar Insumo</span>
                  </button>
                </div>

                {recibirData.insumos.map((insumo, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-800">Insumo #{index + 1}</h4>
                      {recibirData.insumos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const nuevosInsumos = recibirData.insumos.filter((_, i) => i !== index);
                            setRecibirData({ ...recibirData, insumos: nuevosInsumos });
                            
                            // Limpiar estados de búsqueda para este índice
                            const newSearchInsumo = {...searchInsumo};
                            const newDropdownOpen = {...dropdownOpen};
                            delete newSearchInsumo[index];
                            delete newDropdownOpen[index];
                            
                            // Reindexar los estados restantes
                            const reindexedSearchInsumo: {[key: number]: string} = {};
                            const reindexedDropdownOpen: {[key: number]: boolean} = {};
                            Object.keys(newSearchInsumo).forEach((key) => {
                              const numKey = Number(key);
                              if (numKey > index) {
                                reindexedSearchInsumo[numKey - 1] = newSearchInsumo[numKey];
                                reindexedDropdownOpen[numKey - 1] = newDropdownOpen[numKey];
                              } else if (numKey < index) {
                                reindexedSearchInsumo[numKey] = newSearchInsumo[numKey];
                                reindexedDropdownOpen[numKey] = newDropdownOpen[numKey];
                              }
                            });
                            
                            setSearchInsumo(reindexedSearchInsumo);
                            setDropdownOpen(reindexedDropdownOpen);
                          }}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <span className="text-lg">🗑️</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Selector de insumo */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Insumo *
                        </label>
                        <div className="relative">
                          {/* Campo de búsqueda */}
                          <input
                            type="text"
                            value={searchInsumo[index] || ''}
                            onChange={(e) => {
                              setSearchInsumo({...searchInsumo, [index]: e.target.value});
                              setDropdownOpen({...dropdownOpen, [index]: true});
                            }}
                            onFocus={() => setDropdownOpen({...dropdownOpen, [index]: true})}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-700 placeholder:text-gray-700 placeholder:font-semibold"
                            placeholder="Buscar insumo..."
                          />
                          
                          {/* Dropdown con resultados */}
                          {dropdownOpen[index] && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {filtrarInsumos(searchInsumo[index] || '').length > 0 ? (
                                filtrarInsumos(searchInsumo[index] || '').map(insumoOption => {
                                  const hasName = insumoOption.fields.nombre && insumoOption.fields.nombre.trim();
                                  const unidad = insumoOption.fields['Unidad Ingresa Insumo'] || insumoOption.fields.unidad_medida || 'unidad';
                                  const displayName = hasName ? insumoOption.fields.nombre : `Sin nombre - ${insumoOption.id.slice(-6)}`;
                                  
                                  return (
                                    <div
                                      key={insumoOption.id}
                                      onClick={() => {
                                        const nuevosInsumos = [...recibirData.insumos];
                                        nuevosInsumos[index].insumoId = insumoOption.id;
                                        setRecibirData({ ...recibirData, insumos: nuevosInsumos });
                                        setSearchInsumo({...searchInsumo, [index]: displayName || ''});
                                        setDropdownOpen({...dropdownOpen, [index]: false});
                                      }}
                                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                    >
                                      <div className="font-medium text-gray-900">{displayName}</div>
                                      <div className="text-sm text-gray-500">{unidad}</div>
                                      {insumoOption.fields.categoria_insumo && (
                                        <div className="text-xs text-gray-400">{insumoOption.fields.categoria_insumo}</div>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="px-3 py-2 text-gray-500 text-center">
                                  No se encontraron insumos
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Botón para cerrar dropdown */}
                          {dropdownOpen[index] && (
                            <div 
                              className="fixed inset-0 z-5"
                              onClick={() => setDropdownOpen({...dropdownOpen, [index]: false})}
                            />
                          )}
                        </div>
                        
                        {/* Mostrar información de la unidad cuando se selecciona un insumo */}
                        {insumo.insumoId && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800 flex items-center space-x-2">
                              <span>📏</span>
                              <span>
                                <strong>Unidad:</strong> {
                                  insumos.find(ins => ins.id === insumo.insumoId)?.fields['Unidad Ingresa Insumo'] || 
                                  insumos.find(ins => ins.id === insumo.insumoId)?.fields.unidad_medida || 
                                  'Sin unidad'
                                }
                              </span>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Cantidad */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Cantidad *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={insumo.cantidadIngresaUnidades}
                          onChange={(e) => {
                            const nuevosInsumos = [...recibirData.insumos];
                            nuevosInsumos[index].cantidadIngresaUnidades = e.target.value;
                            setRecibirData({ ...recibirData, insumos: nuevosInsumos });
                          }}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-700 placeholder:text-gray-500 placeholder:font-medium"
                          placeholder={
                            insumo.insumoId 
                              ? `Cantidad en ${
                                  insumos.find(ins => ins.id === insumo.insumoId)?.fields['Unidad Ingresa Insumo'] || 
                                  insumos.find(ins => ins.id === insumo.insumoId)?.fields.unidad_medida || 
                                  'unidades'
                                }`
                              : "Cantidad"
                          }
                          required
                        />
                      </div>

                      {/* Fecha de vencimiento */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Fecha de vencimiento
                        </label>
                        <input
                          type="date"
                          value={insumo.fechaVencimiento}
                          onChange={(e) => {
                            const nuevosInsumos = [...recibirData.insumos];
                            nuevosInsumos[index].fechaVencimiento = e.target.value;
                            setRecibirData({ ...recibirData, insumos: nuevosInsumos });
                          }}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-gray-700 placeholder-gray-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botones */}
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Recibiendo...' : 'Recibir Pedido'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelarRecibirPedido}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      </div>

      <Footer />
    </>
  );
};

export default StockInsumosPage;
