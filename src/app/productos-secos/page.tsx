'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Package, Plus, Search, Calendar, User, Scale, Trash2, Edit, Save, X } from 'lucide-react';

interface ProductoSeco {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  fechaIngreso: string;
  proveedor: string;
  lote: string;
  fechaVencimiento: string;
  responsable: string;
  notas: string;
}

interface NuevoProducto {
  nombre: string;
  cantidad: string;
  unidad: string;
  proveedor: string;
  lote: string;
  fechaVencimiento: string;
  notas: string;
}

export default function ProductosSecosPage() {
  const { user, isAuthenticated } = useAuth();
  const [productos, setProductos] = useState<ProductoSeco[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [nuevoProducto, setNuevoProducto] = useState<NuevoProducto>({
    nombre: '',
    cantidad: '',
    unidad: 'kg',
    proveedor: '',
    lote: '',
    fechaVencimiento: '',
    notas: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isAuthenticated) {
      fetchProductos();
    }
  }, [isAuthenticated]);

  const fetchProductos = async () => {
    try {
      setLoading(true);
      // TODO: Implementar API para productos secos
      // Por ahora, datos de ejemplo
      const datosEjemplo: ProductoSeco[] = [];
      setProductos(datosEjemplo);
    } catch (error) {
      console.error('Error fetching productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // TODO: Implementar guardado en API
      console.log('Guardando producto seco:', nuevoProducto);
      
      // Simular guardado exitoso
      const productoNuevo: ProductoSeco = {
        id: `PS-${Date.now()}`,
        nombre: nuevoProducto.nombre,
        cantidad: parseFloat(nuevoProducto.cantidad) || 0,
        unidad: nuevoProducto.unidad,
        fechaIngreso: new Date().toISOString(),
        proveedor: nuevoProducto.proveedor,
        lote: nuevoProducto.lote,
        fechaVencimiento: nuevoProducto.fechaVencimiento,
        responsable: user?.nombre || 'Usuario',
        notas: nuevoProducto.notas
      };

      setProductos(prev => [productoNuevo, ...prev]);
      setSubmitStatus('success');
      setShowForm(false);
      resetForm();
      
      setTimeout(() => setSubmitStatus('idle'), 3000);
    } catch (error) {
      console.error('Error guardando producto:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNuevoProducto({
      nombre: '',
      cantidad: '',
      unidad: 'kg',
      proveedor: '',
      lote: '',
      fechaVencimiento: '',
      notas: ''
    });
  };

  const formatearFecha = (fecha: string) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const productosFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    p.proveedor.toLowerCase().includes(filtro.toLowerCase()) ||
    p.lote.toLowerCase().includes(filtro.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Acceso Restringido</h2>
          <p className="text-gray-600">Debes iniciar sesión para acceder a esta sección.</p>
        </div>
      </div>
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
          <div className="max-w-6xl mx-auto">
            
            {/* Header */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8 text-center">
              <div className="text-5xl mb-4">📦</div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                INGRESO DE PRODUCTOS SECOS
              </h1>
              <p className="text-gray-600">
                Registro y control de productos secos del laboratorio
              </p>
            </div>

            {/* Controles */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                <div className="flex-1 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, proveedor o lote..."
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg"
                >
                  {showForm ? <X size={20} /> : <Plus size={20} />}
                  {showForm ? 'Cancelar' : 'Nuevo Ingreso'}
                </button>
              </div>

              {/* Mensaje de éxito/error */}
              {submitStatus === 'success' && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
                  ✅ Producto registrado exitosamente
                </div>
              )}
              {submitStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
                  ❌ Error al registrar el producto
                </div>
              )}

              {/* Formulario de nuevo ingreso */}
              {showForm && (
                <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Package size={20} />
                    Registrar Nuevo Producto Seco
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Nombre del producto */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre del Producto *
                      </label>
                      <input
                        type="text"
                        required
                        value={nuevoProducto.nombre}
                        onChange={(e) => setNuevoProducto({...nuevoProducto, nombre: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: Harina de soya"
                      />
                    </div>

                    {/* Cantidad */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cantidad *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          required
                          step="0.01"
                          min="0"
                          value={nuevoProducto.cantidad}
                          onChange={(e) => setNuevoProducto({...nuevoProducto, cantidad: e.target.value})}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                        />
                        <select
                          value={nuevoProducto.unidad}
                          onChange={(e) => setNuevoProducto({...nuevoProducto, unidad: e.target.value})}
                          className="w-24 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="lb">lb</option>
                          <option value="unidades">unidades</option>
                          <option value="bultos">bultos</option>
                          <option value="sacos">sacos</option>
                        </select>
                      </div>
                    </div>

                    {/* Proveedor */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Proveedor
                      </label>
                      <input
                        type="text"
                        value={nuevoProducto.proveedor}
                        onChange={(e) => setNuevoProducto({...nuevoProducto, proveedor: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nombre del proveedor"
                      />
                    </div>

                    {/* Lote */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número de Lote
                      </label>
                      <input
                        type="text"
                        value={nuevoProducto.lote}
                        onChange={(e) => setNuevoProducto({...nuevoProducto, lote: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: LOT-2026-001"
                      />
                    </div>

                    {/* Fecha de vencimiento */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Vencimiento
                      </label>
                      <input
                        type="date"
                        value={nuevoProducto.fechaVencimiento}
                        onChange={(e) => setNuevoProducto({...nuevoProducto, fechaVencimiento: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Notas */}
                    <div className="md:col-span-2 lg:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notas / Observaciones
                      </label>
                      <input
                        type="text"
                        value={nuevoProducto.notas}
                        onChange={(e) => setNuevoProducto({...nuevoProducto, notas: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Observaciones adicionales"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          Guardar Ingreso
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <div className="text-3xl mb-2">📦</div>
                <p className="text-sm font-medium text-gray-500">Total Productos</p>
                <p className="text-2xl font-bold text-gray-900">{productos.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <div className="text-3xl mb-2">📅</div>
                <p className="text-sm font-medium text-gray-500">Ingresos Hoy</p>
                <p className="text-2xl font-bold text-blue-600">
                  {productos.filter(p => 
                    new Date(p.fechaIngreso).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <div className="text-3xl mb-2">⚠️</div>
                <p className="text-sm font-medium text-gray-500">Por Vencer (30 días)</p>
                <p className="text-2xl font-bold text-orange-600">
                  {productos.filter(p => {
                    if (!p.fechaVencimiento) return false;
                    const vencimiento = new Date(p.fechaVencimiento);
                    const hoy = new Date();
                    const diff = (vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
                    return diff >= 0 && diff <= 30;
                  }).length}
                </p>
              </div>
            </div>

            {/* Lista de productos */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800">
                  Historial de Ingresos ({productosFiltrados.length})
                </h3>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Cargando productos...</p>
                </div>
              ) : productosFiltrados.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-6xl mb-4">📦</div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No hay productos registrados</h3>
                  <p className="text-gray-600 mb-4">
                    {productos.length === 0 
                      ? "Aún no se han registrado ingresos de productos secos."
                      : "No se encontraron productos con el filtro aplicado."
                    }
                  </p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Registrar Primer Ingreso
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Producto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cantidad
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Proveedor / Lote
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha Ingreso
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vencimiento
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Responsable
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {productosFiltrados.map((producto) => (
                        <tr key={producto.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{producto.nombre}</div>
                            <div className="text-xs text-gray-500">{producto.id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-blue-600">
                              {producto.cantidad} {producto.unidad}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{producto.proveedor || '-'}</div>
                            <div className="text-xs text-gray-500">{producto.lote || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatearFecha(producto.fechaIngreso)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm ${
                              producto.fechaVencimiento && new Date(producto.fechaVencimiento) < new Date()
                                ? 'text-red-600 font-semibold'
                                : 'text-gray-500'
                            }`}>
                              {formatearFecha(producto.fechaVencimiento)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {producto.responsable}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
