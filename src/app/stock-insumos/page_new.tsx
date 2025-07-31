'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface Insumo {
  id: string;
  createdTime: string;
  fields: {
    ID?: string;
    Item?: string;
    Unidades?: {
      state: string;
      value: string;
      isStale: boolean;
    };
    'Cantidad Total Insumo'?: number;
    'Entrada Insumos'?: string[];
    'Salida Insumos'?: string[];
  };
}

interface EntradaInsumo {
  id: string;
  createdTime: string;
  fields: {
    Name?: string;
    Notes?: string;
    Status?: string;
    'Insumos Laboratorio'?: string[];
  };
}

const StockInsumosPage = () => {
  const { user } = useAuth();
  
  // Estados principales
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [entradas, setEntradas] = useState<EntradaInsumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  
  // Estados para formularios
  const [showNewInsumoForm, setShowNewInsumoForm] = useState(false);
  const [showEntradaForm, setShowEntradaForm] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState<Insumo | null>(null);
  
  // Formulario nuevo insumo
  const [newInsumoData, setNewInsumoData] = useState({
    item: '',
    unidades: 'Unidades'
  });
  
  // Formulario entrada
  const [entradaData, setEntradaData] = useState({
    name: '',
    notes: '',
    cantidad: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Cargar datos al iniciar
  useEffect(() => {
    fetchInsumos();
    fetchEntradas();
  }, []);

  const fetchInsumos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stock-insumos');
      if (!response.ok) throw new Error('Error al cargar insumos');
      
      const data = await response.json();
      setInsumos(data.records || []);
    } catch (error) {
      console.error('Error:', error);
      setError('Error al cargar los insumos');
    } finally {
      setLoading(false);
    }
  };

  const fetchEntradas = async () => {
    try {
      const response = await fetch('/api/entrada-insumos');
      if (!response.ok) throw new Error('Error al cargar entradas');
      
      const data = await response.json();
      setEntradas(data.records || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleNewInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/stock-insumos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newInsumoData),
      });

      if (!response.ok) throw new Error('Error al crear insumo');

      setSubmitStatus('success');
      setShowNewInsumoForm(false);
      setNewInsumoData({ item: '', unidades: 'Unidades' });
      fetchInsumos(); // Recargar la lista

      setTimeout(() => setSubmitStatus('idle'), 3000);
    } catch (error) {
      console.error('Error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInsumo) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/entrada-insumos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Entrada: ${entradaData.name} - ${entradaData.cantidad} ${selectedInsumo.fields.Unidades?.value || 'unidades'}`,
          notes: entradaData.notes,
          insumoIds: [selectedInsumo.id]
        }),
      });

      if (!response.ok) throw new Error('Error al registrar entrada');

      setSubmitStatus('success');
      setShowEntradaForm(false);
      setEntradaData({ name: '', notes: '', cantidad: '' });
      setSelectedInsumo(null);
      fetchEntradas(); // Recargar entradas

      setTimeout(() => setSubmitStatus('idle'), 3000);
    } catch (error) {
      console.error('Error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Obtener categorías únicas
  const categorias = ['todos', ...Array.from(new Set(insumos.map(insumo => 
    insumo.fields.Unidades?.value || 'Sin categoría'
  )))];

  // Filtrar insumos
  const insumosFiltrados = filtroCategoria === 'todos' 
    ? insumos 
    : insumos.filter(insumo => insumo.fields.Unidades?.value === filtroCategoria);

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
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 mb-8 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  📋 Stock de Insumos
                </h1>
                <p className="text-gray-600 text-lg">
                  Gestión y control de inventario de laboratorio conectado a Airtable
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewInsumoForm(true)}
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  + Nuevo Insumo
                </button>
                <button
                  onClick={() => setShowEntradaForm(true)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  + Agregar Stock
                </button>
              </div>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Insumos</p>
                  <p className="text-3xl font-bold text-teal-600">{insumos.length}</p>
                </div>
                <div className="bg-teal-100 p-3 rounded-full">
                  <span className="text-2xl">📋</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Entradas Registradas</p>
                  <p className="text-3xl font-bold text-green-600">{entradas.length}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <span className="text-2xl">📦</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Categorías</p>
                  <p className="text-3xl font-bold text-purple-600">{categorias.length - 1}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <span className="text-2xl">🏷️</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Stock Total</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {insumos.reduce((sum, insumo) => sum + (insumo.fields['Cantidad Total Insumo'] || 0), 0)}
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 mb-8 border border-white/20">
            <div className="flex flex-wrap gap-3">
              {categorias.map((categoria) => (
                <button
                  key={categoria}
                  onClick={() => setFiltroCategoria(categoria)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filtroCategoria === categoria
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {categoria.charAt(0).toUpperCase() + categoria.slice(1)} 
                  ({categoria === 'todos' ? insumos.length : insumos.filter(i => i.fields.Unidades?.value === categoria).length})
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Insumos */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                📦 Inventario de Insumos ({insumosFiltrados.length})
              </h2>
              
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando inventario desde Airtable...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <span className="text-6xl mb-4 block">❌</span>
                  <p className="text-red-600 text-lg mb-4">{error}</p>
                  <button
                    onClick={fetchInsumos}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              ) : insumosFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-6xl mb-4 block">📋</span>
                  <p className="text-gray-600 text-lg">No hay insumos registrados</p>
                  <button
                    onClick={() => setShowNewInsumoForm(true)}
                    className="mt-4 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Agregar Primer Insumo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {insumosFiltrados.map((insumo) => (
                    <div key={insumo.id} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900 mb-1">
                            {insumo.fields.Item || 'Sin nombre'}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            ID: {insumo.fields.ID || insumo.id}
                          </p>
                        </div>
                        <div className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-xs font-medium">
                          {insumo.fields.Unidades?.value || 'Sin unidad'}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cantidad Total:</span>
                          <span className="font-medium text-lg text-orange-600">
                            {insumo.fields['Cantidad Total Insumo'] || 0}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Entradas:</span>
                          <span className="font-medium">
                            {insumo.fields['Entrada Insumos']?.length || 0} registros
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Salidas:</span>
                          <span className="font-medium">
                            {insumo.fields['Salida Insumos']?.length || 0} registros
                          </span>
                        </div>
                        
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Creado:</span>
                          <span className="text-gray-500">
                            {new Date(insumo.createdTime).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                        
                        <div className="pt-3 border-t border-gray-100">
                          <button
                            onClick={() => {
                              setSelectedInsumo(insumo);
                              setShowEntradaForm(true);
                            }}
                            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                          >
                            + Agregar Stock
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mensajes de estado */}
          {submitStatus === 'success' && (
            <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
              ✅ Operación exitosa
            </div>
          )}
          
          {submitStatus === 'error' && (
            <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
              ❌ Error en la operación
            </div>
          )}
        </div>

        {/* Modal Nuevo Insumo */}
        {showNewInsumoForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">📋 Registrar Nuevo Insumo</h2>
                  <button
                    onClick={() => setShowNewInsumoForm(false)}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-all"
                  >
                    <span className="text-2xl">✕</span>
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleNewInsumo} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Insumo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newInsumoData.item}
                    onChange={(e) => setNewInsumoData(prev => ({ ...prev, item: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Ej: Agua bolsa de 6 litros"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unidad de Medida *
                  </label>
                  <select
                    value={newInsumoData.unidades}
                    onChange={(e) => setNewInsumoData(prev => ({ ...prev, unidades: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="Unidades">Unidades</option>
                    <option value="Litros">Litros</option>
                    <option value="Mililitros">Mililitros</option>
                    <option value="Kilogramos">Kilogramos</option>
                    <option value="Gramos">Gramos</option>
                    <option value="Volumen">Volumen</option>
                    <option value="arrobas">Arrobas</option>
                  </select>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewInsumoForm(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-3 rounded-xl hover:from-teal-700 hover:to-cyan-700 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Registrando...' : 'Registrar Insumo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Agregar Stock */}
        {showEntradaForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">📦 Agregar Stock</h2>
                  <button
                    onClick={() => {
                      setShowEntradaForm(false);
                      setSelectedInsumo(null);
                    }}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-all"
                  >
                    <span className="text-2xl">✕</span>
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleEntrada} className="p-6 space-y-6">
                {selectedInsumo && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900">Insumo seleccionado:</h3>
                    <p className="text-gray-700">{selectedInsumo.fields.Item}</p>
                    <p className="text-sm text-gray-500">
                      Unidad: {selectedInsumo.fields.Unidades?.value}
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Entrada *
                  </label>
                  <input
                    type="text"
                    required
                    value={entradaData.name}
                    onChange={(e) => setEntradaData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ej: Compra proveedor ABC"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad Agregada *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={entradaData.cantidad}
                    onChange={(e) => setEntradaData(prev => ({ ...prev, cantidad: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Cantidad que se agrega al stock"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas
                  </label>
                  <textarea
                    value={entradaData.notes}
                    onChange={(e) => setEntradaData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Observaciones adicionales..."
                  />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEntradaForm(false);
                      setSelectedInsumo(null);
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Registrando...' : 'Agregar Stock'}
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
