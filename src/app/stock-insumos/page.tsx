'use client';

import { useState, useEffect } from 'react';
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
    unidad_medida?: string;
    descripcion?: string;
    'Rango Minimo Stock'?: number;
    estado?: string;
    'Total Cantidad Producto'?: number;
    'cantidad Entrada Insumos'?: number[];
    'cantidad Salida Insumos'?: number[];
    'ID_Entrada Insumos'?: string[];
    'Salida Insumos'?: string[];
  };
}

const StockInsumosPage = () => {
  const { user } = useAuth();
  
  // Estados principales
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [searchText, setSearchText] = useState('');
  
  // Estados para formularios
  const [showNewInsumoForm, setShowNewInsumoForm] = useState(false);
  const [showDescontarStockForm, setShowDescontarStockForm] = useState(false);
  const [showRecibirPedidoForm, setShowRecibirPedidoForm] = useState(false);
  
  // Formulario nuevo insumo
  const [newInsumoData, setNewInsumoData] = useState({
    nombre: '',
    categoria_insumo: 'Materiales y Suministros Generales',
    unidad_medida: 'Unidad (Und)',
    descripcion: '',
    rangoMinimoStock: 10,
    estado: 'Disponible'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Formularios para operaciones de stock (independientes)
  const [descontarData, setDescontarData] = useState({
    insumoId: '',
    cantidad: 0,
    motivo: '',
    observaciones: ''
  });

  const [recibirData, setRecibirData] = useState({
    insumoId: '',
    cantidad: 0,
    proveedor: '',
    numeroFactura: '',
    fechaVencimiento: '',
    observaciones: ''
  });

  // Cantidades específicas por insumo (ya no se usa, eliminar)
  // const [cantidadesPorInsumo, setCantidadesPorInsumo] = useState<{[key: string]: number}>({});

  // Categorías disponibles basadas en los datos reales de Airtable
  // Categorías exactas de Airtable
  const categorias = [
    "Materiales y Suministros Generales",
    "Reactivos y Químicos", 
    "Equipo de Protección Personal",
    "Productos de Limpieza y Desinfección",
    "Equipos y Herramientas",
    "Material de Laboratorio",
    "Contenedores y Almacenamiento",
    "Equipos de Laboratorio"
  ];

  // Categorías que se muestran por defecto (elementos básicos de laboratorio y EPPs)
  const categoriasBasicas = [
    "Materiales y Suministros Generales", 
    "Equipo de Protección Personal"
  ];

  // Unidades de medida exactas de Airtable
  const unidadesMedida = [
    "Unidad (Und)", 
    "Gramos (Gr)", 
    "Mililitros (Ml)"
  ];

  // Cargar datos al iniciar
  useEffect(() => {
    fetchInsumos();
  }, []);

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
      console.log('📝 STOCK-INSUMOS: Creando insumo con datos:', newInsumoData);
      
      const response = await fetch('/api/stock-insumos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newInsumoData),
      });

      const data = await response.json();
      console.log('📋 STOCK-INSUMOS: Response de creación:', data);

      if (data.success) {
        setSubmitStatus('success');
        setNewInsumoData({
          nombre: '',
          categoria_insumo: 'Materiales y Suministros Generales',
          unidad_medida: 'Unidad (Und)',
          descripcion: '',
          rangoMinimoStock: 10,
          estado: 'Disponible'
        });
        setShowNewInsumoForm(false);
        fetchInsumos(); // Recargar la lista
      } else {
        setSubmitStatus('error');
        console.error('Error al crear insumo:', data.error);
        console.error('Detalles del error:', data.details);
        alert(`Error al crear insumo: ${data.error}${data.details ? '\nDetalles: ' + data.details : ''}`);
      }
    } catch (error) {
      setSubmitStatus('error');
      console.error('Error de red o procesamiento:', error);
      alert(`Error de red: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDescontarStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descontarData.insumoId || descontarData.cantidad <= 0) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      console.log('📤 STOCK-INSUMOS: Descontando stock:', descontarData);
      
      const response = await fetch('/api/stock-insumos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: descontarData.insumoId,
          operacion: 'descontar',
          cantidad: descontarData.cantidad,
          motivo: descontarData.motivo,
          observaciones: descontarData.observaciones
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSubmitStatus('success');
        setDescontarData({ 
          insumoId: '',
          cantidad: 0,
          motivo: '', 
          observaciones: '' 
        });
        setShowDescontarStockForm(false);
        fetchInsumos(); // Recargar la lista
      } else {
        console.error('Error al descontar stock:', data.error);
        setSubmitStatus('error');
      }
    } catch (error) {
      setSubmitStatus('error');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecibirPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recibirData.insumoId || recibirData.cantidad <= 0) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      console.log('📥 STOCK-INSUMOS: Recibiendo pedido:', recibirData);
      
      const response = await fetch('/api/stock-insumos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: recibirData.insumoId,
          operacion: 'recibir',
          cantidad: recibirData.cantidad,
          proveedor: recibirData.proveedor,
          numeroFactura: recibirData.numeroFactura,
          fechaVencimiento: recibirData.fechaVencimiento,
          observaciones: recibirData.observaciones
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSubmitStatus('success');
        setRecibirData({ 
          insumoId: '',
          cantidad: 0,
          proveedor: '', 
          numeroFactura: '', 
          fechaVencimiento: '', 
          observaciones: '' 
        });
        setShowRecibirPedidoForm(false);
        fetchInsumos(); // Recargar la lista
      } else {
        console.error('Error al recibir pedido:', data.error);
        setSubmitStatus('error');
      }
    } catch (error) {
      setSubmitStatus('error');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoriasUnicas = Array.from(
    new Set(insumos.map(insumo => insumo.fields.categoria_insumo || 'Sin categoría'))
  ).sort();

  // Filtrar insumos por categoría y búsqueda
  const insumosFiltrados = insumos.filter(insumo => {
    // Filtro por categoría
    let pasaFiltroCategoria = true;
    
    if (filtroCategoria === 'todos') {
      // Si es "todos", mostrar solo categorías básicas por defecto
      pasaFiltroCategoria = categoriasBasicas.includes(insumo.fields.categoria_insumo || '');
    } else if (filtroCategoria === 'ver-todas') {
      // Si es "ver-todas", mostrar todos los insumos
      pasaFiltroCategoria = true;
    } else {
      // Si hay una categoría específica seleccionada, mostrar solo esa
      pasaFiltroCategoria = insumo.fields.categoria_insumo === filtroCategoria;
    }
    
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
              <div className="bg-gradient-to-r from-orange-600 to-red-600 p-8 text-white relative overflow-hidden">
                <div className="relative z-10 text-center">
                  <h1 className="text-3xl font-bold mb-2">📦 STOCK DE INSUMOS</h1>
                  <p className="text-xl opacity-90">Gestión y Control de Inventario de Laboratorio</p>
                </div>
              </div>
              
              {/* Stats */}
              <div className="p-6 bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Insumos</p>
                        <p className="text-2xl font-bold text-orange-600">{stats.total}</p>
                      </div>
                      <div className="bg-orange-100 p-3 rounded-full">
                        <span className="text-2xl">📋</span>
                      </div>
                    </div>
                  </div>
                  
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
                    onClick={() => setFiltroCategoria('todos')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      filtroCategoria === 'todos'
                        ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Básicos ({insumos.filter(i => categoriasBasicas.includes(i.fields.categoria_insumo || '')).length})
                  </button>
                  
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
                      <span>Descontar de Inventario</span>
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
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
                ❌ {error}
                <button 
                  onClick={fetchInsumos}
                  className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Lista de Insumos */}
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
                <div className="flex items-center gap-3">
                  <span className="bg-white/20 p-2 rounded-lg text-2xl">📦</span>
                  <div>
                    <h2 className="text-2xl font-bold">Inventario de Insumos ({insumosFiltrados.length})</h2>
                    <p className="opacity-90">
                      {filtroCategoria === 'todos' ? 'Insumos básicos de laboratorio' : 
                       filtroCategoria === 'ver-todas' ? 'Todos los insumos' : 
                       `Categoría: ${filtroCategoria}`}
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
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Unidad</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Stock Actual</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Stock Mínimo</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insumosFiltrados.map((insumo, index) => {
                          const hasName = insumo.fields.nombre && insumo.fields.nombre.trim();
                          const totalCantidad = insumo.fields['Total Cantidad Producto'] || 0;
                          const rangoMinimo = insumo.fields['Rango Minimo Stock'] || 0;
                          const estado = insumo.fields.estado || 'Disponible';
                          
                          // Lógica corregida de estados:
                          // - Agotado: stock = 0
                          // - Poco Stock: 0 < stock < mínimo
                          // - Disponible: stock >= mínimo
                          const esAgotado = totalCantidad === 0;
                          const esPocoStock = totalCantidad > 0 && totalCantidad < rangoMinimo;
                          const esDisponible = totalCantidad >= rangoMinimo;
                          
                          return (
                            <tr 
                              key={insumo.id}
                              className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                              } ${
                                !hasName ? 'bg-yellow-25 hover:bg-yellow-50' : 
                                esAgotado ? 'bg-red-25 hover:bg-red-50' :
                                esPocoStock ? 'bg-orange-25 hover:bg-orange-50' : ''
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
                              
                              {/* Unidad */}
                              <td className="py-3 px-4 text-gray-700">
                                {insumo.fields.unidad_medida || 'Sin unidad'}
                              </td>
                              
                              {/* Stock Actual */}
                              <td className="py-3 px-4 text-center">
                                <span className={`font-bold text-lg ${
                                  esAgotado ? 'text-red-600' :
                                  esPocoStock ? 'text-orange-600' : 'text-green-600'
                                }`}>
                                  {totalCantidad}
                                </span>
                              </td>
                              
                              {/* Stock Mínimo */}
                              <td className="py-3 px-4 text-center text-gray-600">
                                {rangoMinimo}
                              </td>
                              
                              {/* Estado */}
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                  esAgotado ? 'bg-red-100 text-red-800' :
                                  esPocoStock ? 'bg-orange-100 text-orange-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {esAgotado ? '🔴 Agotado' :
                                   esPocoStock ? '🟡 Poco Stock' : '🟢 Disponible'}
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
            <div className="text-center mt-8">
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

      {/* Modal para crear nuevo insumo */}
      {showNewInsumoForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-8 rounded-t-xl">
              <div className="flex items-center space-x-3">
                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                  <span className="text-3xl">📦</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Agregar Nuevo Insumo</h2>
                  <p className="text-green-100 mt-1">Complete la información del insumo a registrar</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleCreateInsumo} className="p-8 space-y-6">
              {/* Nombre del insumo */}
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-3">
                  <span className="flex items-center space-x-2">
                    <span>🏷️</span>
                    <span>Nombre del Insumo</span>
                    <span className="text-red-500">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={newInsumoData.nombre}
                  onChange={(e) => setNewInsumoData({...newInsumoData, nombre: e.target.value})}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="Ej: Agua destilada 1L, Guantes de nitrilo, etc."
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-3">
                  <span className="flex items-center space-x-2">
                    <span>📂</span>
                    <span>Categoría</span>
                    <span className="text-red-500">*</span>
                  </span>
                </label>
                <select
                  required
                  value={newInsumoData.categoria_insumo}
                  onChange={(e) => setNewInsumoData({...newInsumoData, categoria_insumo: e.target.value})}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                >
                  {categorias.map(categoria => (
                    <option key={categoria} value={categoria}>{categoria}</option>
                  ))}
                </select>
              </div>

              {/* Unidad de medida */}
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-3">
                  <span className="flex items-center space-x-2">
                    <span>⚖️</span>
                    <span>Unidad de Medida</span>
                    <span className="text-red-500">*</span>
                  </span>
                </label>
                <select
                  required
                  value={newInsumoData.unidad_medida}
                  onChange={(e) => setNewInsumoData({...newInsumoData, unidad_medida: e.target.value})}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                >
                  {unidadesMedida.map(unidad => (
                    <option key={unidad} value={unidad}>{unidad}</option>
                  ))}
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-3">
                  <span className="flex items-center space-x-2">
                    <span>📝</span>
                    <span>Descripción</span>
                    <span className="text-gray-400">(Opcional)</span>
                  </span>
                </label>
                <div className="relative">
                  <textarea
                    rows={4}
                    value={newInsumoData.descripcion}
                    onChange={(e) => setNewInsumoData({...newInsumoData, descripcion: e.target.value})}
                    className="w-full px-4 py-3 pr-12 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    placeholder="Descripción detallada del insumo, especificaciones, uso, etc."
                  />
                  <div className="absolute top-3 right-3">
                    <AudioRecorderSimple
                      currentText={newInsumoData.descripcion || ''}
                      onTextChange={(text) => setNewInsumoData({...newInsumoData, descripcion: text})}
                      onTranscriptionComplete={(text) => {
                        // Si ya hay texto, agregar al final
                        const currentText = newInsumoData.descripcion || '';
                        const newText = currentText ? `${currentText} ${text}` : text;
                        setNewInsumoData({...newInsumoData, descripcion: newText});
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Stock mínimo */}
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-3">
                  <span className="flex items-center space-x-2">
                    <span>📊</span>
                    <span>Stock Mínimo</span>
                    <span className="text-red-500">*</span>
                  </span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newInsumoData.rangoMinimoStock}
                  onChange={(e) => setNewInsumoData({...newInsumoData, rangoMinimoStock: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="Ej: 10"
                />
                <p className="text-gray-600 text-sm mt-2">
                  Cantidad mínima antes de mostrar alerta de poco stock
                </p>
              </div>

              {/* Botones */}
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNewInsumoForm(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-4 rounded-lg text-lg font-semibold transition-all duration-200 border-2 border-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-4 rounded-lg text-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center space-x-2">
                      <span className="animate-spin">⏳</span>
                      <span>Creando...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <span>📦</span>
                      <span>Crear Insumo</span>
                    </span>
                  )}
                </button>
              </div>
              
              {/* Mensajes de estado */}
              {submitStatus === 'success' && (
                <div className="bg-green-50 border-2 border-green-200 text-green-800 px-6 py-4 rounded-lg flex items-center space-x-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-semibold">¡Insumo creado exitosamente!</p>
                    <p className="text-sm">El insumo ha sido agregado al inventario.</p>
                  </div>
                </div>
              )}
              
              {submitStatus === 'error' && (
                <div className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-lg flex items-center space-x-3">
                  <span className="text-2xl">❌</span>
                  <div>
                    <p className="font-semibold">Error al crear el insumo</p>
                    <p className="text-sm">Por favor, revise los datos e intente nuevamente.</p>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Modal para descontar de inventario */}
      {showDescontarStockForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">📤 Descontar de Inventario</h2>
                <button
                  onClick={() => setShowDescontarStockForm(false)}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-all"
                >
                  <span className="text-xl">✕</span>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleDescontarStock} className="p-6 space-y-4">
              {/* Selector de insumo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insumo *
                </label>
                <select
                  value={descontarData.insumoId}
                  onChange={(e) => setDescontarData({...descontarData, insumoId: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                >
                  <option value="">Seleccionar insumo</option>
                  {insumos.map(insumo => {
                    const hasName = insumo.fields.nombre && insumo.fields.nombre.trim();
                    const stock = insumo.fields['Total Cantidad Producto'] || 0;
                    return (
                      <option key={insumo.id} value={insumo.id}>
                        {hasName ? insumo.fields.nombre : `Sin nombre - ${insumo.id.slice(-6)}`} 
                        (Stock: {stock} {insumo.fields.unidad_medida || 'unidad'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Cantidad a descontar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad a descontar *
                </label>
                <input
                  type="number"
                  min="1"
                  value={descontarData.cantidad}
                  onChange={(e) => setDescontarData({...descontarData, cantidad: Number(e.target.value)})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Cantidad a descontar"
                  required
                />
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo *
                </label>
                <select
                  value={descontarData.motivo}
                  onChange={(e) => setDescontarData({...descontarData, motivo: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                >
                  <option value="">Seleccionar motivo</option>
                  <option value="Uso en laboratorio">Uso en laboratorio</option>
                  <option value="Vencimiento">Vencimiento</option>
                  <option value="Daño/Pérdida">Daño/Pérdida</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={descontarData.observaciones}
                  onChange={(e) => setDescontarData({...descontarData, observaciones: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  rows={3}
                  placeholder="Detalles adicionales..."
                />
              </div>

              {/* Botones */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Descontando...' : 'Descontar Stock'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDescontarStockForm(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
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
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">📥 Recibir Pedido</h2>
                <button
                  onClick={() => setShowRecibirPedidoForm(false)}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-all"
                >
                  <span className="text-xl">✕</span>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleRecibirPedido} className="p-6 space-y-4">
              {/* Selector de insumo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insumo *
                </label>
                <select
                  value={recibirData.insumoId}
                  onChange={(e) => setRecibirData({...recibirData, insumoId: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Seleccionar insumo</option>
                  {insumos.map(insumo => {
                    const hasName = insumo.fields.nombre && insumo.fields.nombre.trim();
                    const stock = insumo.fields['Total Cantidad Producto'] || 0;
                    return (
                      <option key={insumo.id} value={insumo.id}>
                        {hasName ? insumo.fields.nombre : `Sin nombre - ${insumo.id.slice(-6)}`} 
                        (Stock: {stock} {insumo.fields.unidad_medida || 'unidad'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Cantidad recibida */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad recibida *
                </label>
                <input
                  type="number"
                  min="1"
                  value={recibirData.cantidad}
                  onChange={(e) => setRecibirData({...recibirData, cantidad: Number(e.target.value)})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Cantidad recibida"
                  required
                />
              </div>

              {/* Proveedor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proveedor *
                </label>
                <input
                  type="text"
                  value={recibirData.proveedor}
                  onChange={(e) => setRecibirData({...recibirData, proveedor: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Nombre del proveedor"
                  required
                />
              </div>

              {/* Número de factura */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de factura
                </label>
                <input
                  type="text"
                  value={recibirData.numeroFactura}
                  onChange={(e) => setRecibirData({...recibirData, numeroFactura: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Número de factura o referencia"
                />
              </div>

              {/* Fecha de vencimiento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de vencimiento
                </label>
                <input
                  type="date"
                  value={recibirData.fechaVencimiento}
                  onChange={(e) => setRecibirData({...recibirData, fechaVencimiento: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={recibirData.observaciones}
                  onChange={(e) => setRecibirData({...recibirData, observaciones: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={3}
                  placeholder="Detalles adicionales del pedido..."
                />
              </div>

              {/* Botones */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Recibiendo...' : 'Recibir Pedido'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRecibirPedidoForm(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <Footer />
    </>
  );
};

export default StockInsumosPage;