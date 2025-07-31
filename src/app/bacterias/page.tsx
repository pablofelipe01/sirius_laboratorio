'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface Bacteria {
  id: string;
  nombre: string;
  especie: string;
  cantidad: number;
  fechaCreacion: string;
  ubicacion: string;
  estado: 'Activa' | 'Inactiva' | 'En cultivo';
  responsable: string;
  observaciones?: string;
}

const BacteriasPage = () => {
  const { user } = useAuth();
  
  // Estados principales
  const [bacterias, setBacterias] = useState<Bacteria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  
  // Estados para formulario
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    especie: '',
    cantidad: '',
    ubicacion: '',
    estado: 'Activa' as 'Activa' | 'Inactiva' | 'En cultivo',
    observaciones: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Mock data para demostración
  const mockBacterias: Bacteria[] = [
    {
      id: '1',
      nombre: 'Lactobacillus acidophilus',
      especie: 'L. acidophilus',
      cantidad: 500,
      fechaCreacion: '2025-01-20',
      ubicacion: 'Incubadora A1',
      estado: 'Activa',
      responsable: 'Dr. María García',
      observaciones: 'Cultivo para productos probióticos'
    },
    {
      id: '2',
      nombre: 'Escherichia coli',
      especie: 'E. coli',
      cantidad: 250,
      fechaCreacion: '2025-01-18',
      ubicacion: 'Refrigerador B2',
      estado: 'En cultivo',
      responsable: 'Dr. Carlos López',
      observaciones: 'Para análisis de resistencia'
    },
    {
      id: '3',
      nombre: 'Bacillus subtilis',
      especie: 'B. subtilis',
      cantidad: 300,
      fechaCreacion: '2025-01-15',
      ubicacion: 'Incubadora A2',
      estado: 'Activa',
      responsable: 'Dra. Ana Rodríguez',
      observaciones: 'Producción de enzimas'
    }
  ];

  useEffect(() => {
    // Simular carga de datos
    setLoading(true);
    setTimeout(() => {
      setBacterias(mockBacterias);
      setLoading(false);
    }, 1000);
  }, []);

  // Filtrar bacterias por estado
  const bacteriasFiltradas = filtroEstado === 'todos' 
    ? bacterias 
    : bacterias.filter(bacteria => bacteria.estado === filtroEstado);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Simular envío de datos
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const nuevaBacteria: Bacteria = {
        id: Date.now().toString(),
        nombre: formData.nombre,
        especie: formData.especie,
        cantidad: parseInt(formData.cantidad),
        fechaCreacion: new Date().toISOString().split('T')[0],
        ubicacion: formData.ubicacion,
        estado: formData.estado,
        responsable: user?.nombre || 'Usuario desconocido',
        observaciones: formData.observaciones
      };

      setBacterias(prev => [nuevaBacteria, ...prev]);
      setSubmitStatus('success');
      setShowForm(false);
      
      // Reset form
      setFormData({
        nombre: '',
        especie: '',
        cantidad: '',
        ubicacion: '',
        estado: 'Activa',
        observaciones: ''
      });

      setTimeout(() => setSubmitStatus('idle'), 3000);
    } catch (error) {
      console.error('Error al registrar bacteria:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Activa': return 'bg-green-100 text-green-800';
      case 'Inactiva': return 'bg-red-100 text-red-800';
      case 'En cultivo': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
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
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 mb-8 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  🦠 Gestión de Bacterias
                </h1>
                <p className="text-gray-600 text-lg">
                  Control y seguimiento de cultivos bacterianos
                </p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-yellow-700 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                + Nueva Bacteria
              </button>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Bacterias</p>
                  <p className="text-3xl font-bold text-blue-600">{bacterias.length}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <span className="text-2xl">🦠</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Activas</p>
                  <p className="text-3xl font-bold text-green-600">
                    {bacterias.filter(b => b.estado === 'Activa').length}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <span className="text-2xl">✅</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">En Cultivo</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {bacterias.filter(b => b.estado === 'En cultivo').length}
                  </p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <span className="text-2xl">🧪</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Cantidad Total</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {bacterias.reduce((sum, b) => sum + b.cantidad, 0)}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 mb-8 border border-white/20">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setFiltroEstado('todos')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filtroEstado === 'todos'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todas ({bacterias.length})
              </button>
              
              <button
                onClick={() => setFiltroEstado('Activa')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filtroEstado === 'Activa'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Activas ({bacterias.filter(b => b.estado === 'Activa').length})
              </button>
              
              <button
                onClick={() => setFiltroEstado('En cultivo')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filtroEstado === 'En cultivo'
                    ? 'bg-yellow-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                En Cultivo ({bacterias.filter(b => b.estado === 'En cultivo').length})
              </button>
              
              <button
                onClick={() => setFiltroEstado('Inactiva')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filtroEstado === 'Inactiva'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Inactivas ({bacterias.filter(b => b.estado === 'Inactiva').length})
              </button>
            </div>
          </div>

          {/* Lista de Bacterias */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Registro de Bacterias ({bacteriasFiltradas.length})
              </h2>
              
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando bacterias...</p>
                </div>
              ) : bacteriasFiltradas.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-6xl mb-4 block">🦠</span>
                  <p className="text-gray-600 text-lg">No hay bacterias registradas</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {bacteriasFiltradas.map((bacteria) => (
                    <div key={bacteria.id} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{bacteria.nombre}</h3>
                          <p className="text-gray-600 text-sm">{bacteria.especie}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(bacteria.estado)}`}>
                          {bacteria.estado}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cantidad:</span>
                          <span className="font-medium">{bacteria.cantidad} unidades</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ubicación:</span>
                          <span className="font-medium">{bacteria.ubicacion}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fecha:</span>
                          <span className="font-medium">
                            {new Date(bacteria.fechaCreacion).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Responsable:</span>
                          <span className="font-medium text-sm">{bacteria.responsable}</span>
                        </div>
                        
                        {bacteria.observaciones && (
                          <div className="pt-3 border-t border-gray-100">
                            <p className="text-gray-600 text-sm">{bacteria.observaciones}</p>
                          </div>
                        )}
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
              ✅ Bacteria registrada exitosamente
            </div>
          )}
        </div>

        {/* Modal del formulario */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">🦠 Registrar Nueva Bacteria</h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-all"
                  >
                    <span className="text-2xl">✕</span>
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Bacteria
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="Ej: Lactobacillus acidophilus"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Especie
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.especie}
                      onChange={(e) => setFormData(prev => ({ ...prev, especie: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="Ej: L. acidophilus"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cantidad (unidades)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.cantidad}
                      onChange={(e) => setFormData(prev => ({ ...prev, cantidad: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="Ej: 500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ubicación
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ubicacion}
                      onChange={(e) => setFormData(prev => ({ ...prev, ubicacion: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="Ej: Incubadora A1"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value as 'Activa' | 'Inactiva' | 'En cultivo' }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    <option value="Activa">Activa</option>
                    <option value="En cultivo">En cultivo</option>
                    <option value="Inactiva">Inactiva</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="Observaciones adicionales..."
                  />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-yellow-700 hover:to-orange-700 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Registrando...' : 'Registrar Bacteria'}
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

export default BacteriasPage;
