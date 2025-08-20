'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface ProductoItem {
  nombre: string;
  cantidad: number;
}

export default function NuevaOrdenPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    cliente: '',
    fechaEntrega: '',
    observaciones: '',
    prioridad: 'media',
  });

  const [productos, setProductos] = useState<ProductoItem[]>([
    { nombre: '', cantidad: 0 }
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProductoChange = (index: number, field: string, value: string | number) => {
    const nuevosProductos = [...productos];
    nuevosProductos[index] = {
      ...nuevosProductos[index],
      [field]: field === 'cantidad' ? Number(value) : value
    };
    setProductos(nuevosProductos);
  };

  const agregarProducto = () => {
    setProductos([...productos, { nombre: '', cantidad: 0 }]);
  };

  const eliminarProducto = (index: number) => {
    if (productos.length > 1) {
      setProductos(productos.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Usuario no autenticado');
      return;
    }

    // Validaciones
    if (!formData.cliente.trim()) {
      setError('El nombre del cliente es requerido');
      return;
    }

    if (!formData.fechaEntrega) {
      setError('La fecha de entrega es requerida');
      return;
    }

    const productosValidos = productos.filter(p => p.nombre.trim() && p.cantidad > 0);
    if (productosValidos.length === 0) {
      setError('Debe agregar al menos un producto con cantidad válida');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const orderData = {
        cliente: formData.cliente.trim(),
        fechaEntrega: formData.fechaEntrega,
        productos: productosValidos.map(p => p.nombre.trim()),
        cantidades: productosValidos.map(p => p.cantidad),
        observaciones: formData.observaciones.trim(),
        prioridad: formData.prioridad,
        creadoPor: user.nombre
      };

      const response = await fetch('/api/ordenes-compras', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Orden de compra creada exitosamente');
        setTimeout(() => {
          router.push('/clientes');
        }, 2000);
      } else {
        setError(data.error || 'Error al crear la orden');
      }
    } catch (err) {
      console.error('Error creating orden:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen relative">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/LABI, el robot científico.png')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-purple-900/85 to-pink-900/90"></div>
        </div>
        
        <Navbar />
        
        <div className="relative z-10 flex items-center justify-center min-h-screen pt-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-400 mx-auto"></div>
            <p className="mt-4 text-white text-lg">Verificando autenticación...</p>
          </div>
        </div>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/LABI, el robot científico.png')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-purple-900/85 to-pink-900/90"></div>
      </div>
      
      <Navbar />
      
      <div className="relative z-10 py-8 pt-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            📝 Nueva Orden de Compra
          </h1>
          <p className="text-lg text-gray-200">
            Registra una nueva orden de compra para un cliente
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="cliente" className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente *
                </label>
                <input
                  type="text"
                  id="cliente"
                  name="cliente"
                  value={formData.cliente}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Nombre del cliente"
                  required
                />
              </div>

              <div>
                <label htmlFor="fechaEntrega" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Entrega *
                </label>
                <input
                  type="date"
                  id="fechaEntrega"
                  name="fechaEntrega"
                  value={formData.fechaEntrega}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="prioridad" className="block text-sm font-medium text-gray-700 mb-2">
                Prioridad
              </label>
              <select
                id="prioridad"
                name="prioridad"
                value={formData.prioridad}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>

            {/* Productos */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Productos *
                </label>
                <button
                  type="button"
                  onClick={agregarProducto}
                  className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  ➕ Agregar Producto
                </button>
              </div>

              <div className="space-y-3">
                {productos.map((producto, index) => (
                  <div key={index} className="flex gap-3 items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Nombre del producto"
                        value={producto.nombre}
                        onChange={(e) => handleProductoChange(index, 'nombre', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        placeholder="Cantidad"
                        min="0"
                        value={producto.cantidad || ''}
                        onChange={(e) => handleProductoChange(index, 'cantidad', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    {productos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarProducto(index)}
                        className="text-red-600 hover:text-red-800 transition-colors p-2"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                id="observaciones"
                name="observaciones"
                value={formData.observaciones}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Observaciones adicionales..."
              />
            </div>

            {/* Mensajes */}
            {error && (
              <div className="bg-red-100/90 backdrop-blur-sm border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                <div className="flex items-center">
                  <span className="text-red-500 mr-2">❌</span>
                  {error}
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-100/90 backdrop-blur-sm border border-green-400 text-green-700 px-4 py-3 rounded-lg">
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  {success}
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => router.push('/clientes')}
                className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                ⬅️ Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creando...
                  </span>
                ) : (
                  '💾 Crear Orden'
                )}
              </button>
            </div>
          </form>
        </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
