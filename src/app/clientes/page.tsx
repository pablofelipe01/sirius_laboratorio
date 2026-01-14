'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LoteSelector from '@/components/LoteSelector';

interface Cliente {
  id: string;
  nombre: string;
  nit: string;
  contacto: string;
  remisionesLaboratorio: string[];
  cosechaLaboratorio: string[];
  idClienteFlujoCaja: string;
  idClienteOrdenesCompras: string;
}

interface ProductoRemision {
  producto: string;
  cantidad: string;
}

interface RemisionModalProps {
  onClose: () => void;
  clientes: Cliente[];
}

function RemisionModal({ onClose, clientes }: RemisionModalProps) {
  const { user } = useAuth();
  const [responsable, setResponsable] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [nitCliente, setNitCliente] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [lotesSeleccionados, setLotesSeleccionados] = useState<string[]>([]);
  const [productos, setProductos] = useState<ProductoRemision[]>([{ producto: '', cantidad: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Efecto para establecer el responsable cuando el usuario esté disponible
  useEffect(() => {
    if (user?.nombre) {
      setResponsable(user.nombre);
    }
  }, [user?.nombre]);

  const agregarProducto = () => {
    setProductos([...productos, { producto: '', cantidad: '' }]);
  };

  const removerProducto = (index: number) => {
    setProductos(productos.filter((_, i) => i !== index));
  };

  const actualizarProducto = (index: number, campo: 'producto' | 'cantidad', valor: string) => {
    const nuevosProductos = [...productos];
    nuevosProductos[index] = {
      ...nuevosProductos[index],
      [campo]: valor || ''
    };
    setProductos(nuevosProductos);
  };

  const handleClienteChange = (clienteId: string) => {
    setClienteSeleccionado(clienteId);
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      setNitCliente(cliente.nit || '');
    } else {
      setNitCliente('');
    }
    
    // Limpiar lotes seleccionados cuando cambia el cliente
    setLotesSeleccionados([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Aquí iría la lógica para enviar la remisión
    console.log('Enviando remisión:', {
      responsable,
      clienteSeleccionado,
      nitCliente,
      ubicacion,
      lotesSeleccionados,
      productos
    });
    
    // Simular envío
    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
      alert('Remisión enviada exitosamente');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
          
          <div className="relative z-10 flex justify-between items-start">
            <div className="flex-1 text-center">
              <h2 className="text-3xl font-bold">Registro de Remisión</h2>
              <p className="text-blue-100 mt-1">Sistema de entregas Sirius</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-8 overflow-y-auto max-h-[60vh]">
          {/* Información del Responsable */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center mb-4">
              <div className="bg-blue-500 p-2 rounded-lg mr-3">
                <span className="text-white text-xl">👤</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Información del Responsable</h3>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Responsable de entrega
              </label>
              <input
                type="text"
                value={responsable}
                readOnly
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-900 text-base cursor-not-allowed"
              />
            </div>
          </div>

          {/* Información del Cliente */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
            <div className="flex items-center mb-4">
              <div className="bg-green-500 p-2 rounded-lg mr-3">
                <span className="text-white text-xl">🏢</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Información del Cliente</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Cliente
                </label>
                <select
                  value={clienteSeleccionado}
                  onChange={(e) => handleClienteChange(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400 text-base"
                  required
                >
                  <option value="" className="text-gray-400">Seleccione un cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  NIT o Cédula del cliente
                </label>
                <input
                  type="text"
                  value={nitCliente}
                  onChange={(e) => setNitCliente(e.target.value)}
                  placeholder="Ejemplo: 901145626-1"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400 text-base"
                  required
                />
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-100">
            <div className="flex items-center mb-4">
              <div className="bg-yellow-500 p-2 rounded-lg mr-3">
                <span className="text-white text-xl">📍</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Ubicación</h3>
            </div>
            <div>
              <input
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="Ejemplo: Calle 123 #45-67, Bogotá"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400 text-base"
                required
              />
            </div>
          </div>

          {/* Selector de Lotes */}
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-6 border border-teal-100">
            <div className="flex items-center mb-4">
              <div className="bg-teal-500 p-2 rounded-lg mr-3">
                <span className="text-white text-xl">🌾</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Lotes del Cliente</h3>
            </div>
            <LoteSelector
              clienteId={clienteSeleccionado}
              lotesSeleccionados={lotesSeleccionados}
              onLotesChange={setLotesSeleccionados}
              disabled={isSubmitting}
            />
          </div>

          {/* Productos a Entregar */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
            <div className="flex items-center mb-4">
              <div className="bg-purple-500 p-2 rounded-lg mr-3">
                <span className="text-white text-xl">📦</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Productos a Entregar</h3>
            </div>
            <div className="space-y-6">
              {productos.map((producto, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border-2 border-gray-100 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-700">Producto {index + 1}</h4>
                    {productos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removerProducto(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-1 transition-colors duration-200"
                      >
                        <span className="text-xl font-bold">✖</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Producto
                      </label>
                      <select
                        value={producto.producto}
                        onChange={(e) => actualizarProducto(index, 'producto', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400 text-base"
                        required
                      >
                        <option value="" className="text-gray-400">Seleccione un producto</option>
                        <option value="Hongos Shiitake">Hongos Shiitake</option>
                        <option value="Hongos Ostra">Hongos Ostra</option>
                        <option value="Trichoderma">Trichoderma</option>
                        <option value="Metarhizium">Metarhizium</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Cantidad a entregar (litros)
                      </label>
                      <input
                        type="number"
                        value={producto.cantidad}
                        onChange={(e) => actualizarProducto(index, 'cantidad', e.target.value)}
                        placeholder="Ejemplo: 100"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 bg-white text-gray-900 placeholder-gray-400 text-base"
                        min="1"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={agregarProducto}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-xl hover:from-purple-600 hover:to-pink-600 focus:ring-4 focus:ring-purple-500/20 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <span className="mr-2">➕</span>
                Agregar Producto
              </button>
            </div>
          </div>

          {/* Botón de envío */}
          <div className="flex justify-end space-x-4 pt-6 border-t-2 border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 focus:ring-4 focus:ring-gray-500/20 transition-all duration-200 font-semibold text-base"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 transition-all duration-200 font-semibold text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <span className="mr-2 text-xl">🚀</span>
                  Enviar Remisión
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRemisionForm, setShowRemisionForm] = useState(false);

  useEffect(() => {
    if (user) {
      fetchClientes();
    }
  }, [user]);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clientes-laboratorio');
      const data = await response.json();
      
      if (data.success) {
        setClientes(data.clientes || []);
      } else {
        setError(data.error || 'Error al cargar los clientes');
      }
    } catch (err) {
      console.error('Error fetching clientes:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
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
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                👥 Dashboard Clientes Laboratorio
              </h1>
              <p className="text-lg text-gray-200">
                Gestión y visualización de clientes del laboratorio
              </p>
            </div>

            {/* Estadísticas rápidas */}
            {/* Tabla de clientes */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Lista de Clientes</h2>
                <button
                  onClick={() => setShowRemisionForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-colors font-medium"
                >
                  📋 Generar Remisión
                </button>
              </div>
              
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando clientes...</p>
                  </div>
                ) : clientes.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl">👥</span>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No hay clientes</h3>
                    <p className="mt-2 text-gray-600">
                      No se encontraron clientes registrados.
                    </p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          NIT
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Remisiones
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cosechas
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {clientes.map((cliente) => (
                        <tr key={cliente.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {cliente.nombre}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {cliente.nit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {cliente.remisionesLaboratorio.length}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {cliente.cosechaLaboratorio.length}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />

      {/* Modal de Remisión */}
      {showRemisionForm && (
        <RemisionModal 
          onClose={() => setShowRemisionForm(false)}
          clientes={clientes}
        />
      )}
    </>
  );
}
