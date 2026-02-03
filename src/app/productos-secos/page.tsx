'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Package, Plus, Search, Calendar, Scale, Save, X, ChevronDown, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

// ============================================================================
// Interfaces
// ============================================================================

interface ProductoCatalogo {
  id: string;
  airtableId: string;
  codigo: string;
  nombre: string;
  categoria: string[];
  tipo: string;
  unidadBase: string;
  activo: boolean;
  observaciones?: string;
  idNumerico: number;
  area?: string;
  precioVentaUnitario: number;
}

interface MovimientoHistorial {
  id: string;
  idMovimiento: string;
  productoId: string;
  tipo: string;
  cantidad: number;
  unidadMedida: string;
  motivo: string;
  documentoReferencia: string;
  responsable: string;
  fechaMovimiento: string;
  observaciones: string;
  createdTime: string;
}

interface NuevoIngreso {
  productoId: string;
  cantidad: string;
  proveedor: string;
  lote: string;
  fechaVencimiento: string;
  numeroFactura: string;
  notas: string;
}

// ============================================================================
// Estilos para placeholders negros
// ============================================================================
const inputStyles = `
  w-full px-4 py-3 border border-gray-300 rounded-lg 
  focus:ring-2 focus:ring-blue-500 focus:border-transparent
  placeholder:text-gray-800 placeholder:opacity-70
  text-gray-900
`;

const selectStyles = `
  w-full px-4 py-3 border border-gray-300 rounded-lg 
  focus:ring-2 focus:ring-blue-500 focus:border-transparent
  text-gray-900 bg-white
  appearance-none cursor-pointer
`;

// ============================================================================
// Componente Principal
// ============================================================================
export default function ProductosSecosPage() {
  const { user, isAuthenticated } = useAuth();
  
  // Estados principales
  const [productosCatalogo, setProductosCatalogo] = useState<ProductoCatalogo[]>([]);
  const [historial, setHistorial] = useState<MovimientoHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filtro, setFiltro] = useState('');
  
  // Estado del formulario
  const [nuevoIngreso, setNuevoIngreso] = useState<NuevoIngreso>({
    productoId: '',
    cantidad: '',
    proveedor: '',
    lote: '',
    fechaVencimiento: '',
    numeroFactura: '',
    notas: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ============================================================================
  // Cargar datos iniciales
  // ============================================================================
  const fetchProductosCatalogo = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/productos-secos');
      const data = await response.json();
      
      if (data.success) {
        setProductosCatalogo(data.productos || []);
        console.log(`✅ ${data.productos?.length || 0} productos secos cargados del catálogo`);
      } else {
        console.error('❌ Error cargando productos:', data.error);
      }
    } catch (error) {
      console.error('❌ Error en fetch productos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistorial = useCallback(async () => {
    try {
      setLoadingHistorial(true);
      const response = await fetch('/api/productos-secos?incluirHistorial=true');
      const data = await response.json();
      
      if (data.success && data.historial) {
        setHistorial(data.historial || []);
        console.log(`✅ ${data.historial?.length || 0} movimientos cargados`);
      }
    } catch (error) {
      console.error('❌ Error cargando historial:', error);
    } finally {
      setLoadingHistorial(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProductosCatalogo();
      fetchHistorial();
    }
  }, [isAuthenticated, fetchProductosCatalogo, fetchHistorial]);

  // ============================================================================
  // Manejar envío del formulario
  // ============================================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Validaciones
      if (!nuevoIngreso.productoId) {
        throw new Error('Debes seleccionar un producto');
      }
      
      const cantidad = parseFloat(nuevoIngreso.cantidad);
      if (isNaN(cantidad) || cantidad <= 0) {
        throw new Error('La cantidad debe ser mayor a 0');
      }

      // Enviar al API
      const response = await fetch('/api/productos-secos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId: nuevoIngreso.productoId,
          cantidad: cantidad,
          proveedor: nuevoIngreso.proveedor,
          lote: nuevoIngreso.lote,
          fechaVencimiento: nuevoIngreso.fechaVencimiento,
          numeroFactura: nuevoIngreso.numeroFactura,
          notas: nuevoIngreso.notas,
          responsable: user?.nombre || 'Usuario',
          fechaMovimiento: new Date().toISOString()
        })
      });

      const data = await response.json();

      if (data.success) {
        setSubmitStatus('success');
        setSuccessMessage(data.mensaje || 'Ingreso registrado exitosamente');
        setShowForm(false);
        resetForm();
        
        // Recargar historial
        fetchHistorial();
        
        setTimeout(() => {
          setSubmitStatus('idle');
          setSuccessMessage('');
        }, 5000);
      } else {
        throw new Error(data.error || 'Error al registrar el ingreso');
      }
    } catch (error) {
      console.error('❌ Error guardando ingreso:', error);
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNuevoIngreso({
      productoId: '',
      cantidad: '',
      proveedor: '',
      lote: '',
      fechaVencimiento: '',
      numeroFactura: '',
      notas: ''
    });
  };

  // ============================================================================
  // Formatear fecha
  // ============================================================================
  const formatearFecha = (fecha: string) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ============================================================================
  // Obtener nombre del producto por código
  // ============================================================================
  const getNombreProducto = (productoId: string) => {
    const producto = productosCatalogo.find(p => p.codigo === productoId || p.id === productoId);
    return producto?.nombre || productoId;
  };

  // ============================================================================
  // Filtrar historial
  // ============================================================================
  const historialFiltrado = historial.filter(mov => {
    const nombreProducto = getNombreProducto(mov.productoId);
    const busqueda = filtro.toLowerCase();
    return (
      nombreProducto.toLowerCase().includes(busqueda) ||
      mov.productoId.toLowerCase().includes(busqueda) ||
      mov.responsable.toLowerCase().includes(busqueda) ||
      mov.observaciones.toLowerCase().includes(busqueda)
    );
  });

  // ============================================================================
  // Calcular estadísticas
  // ============================================================================
  const ingresosHoy = historial.filter(mov => {
    const hoy = new Date().toDateString();
    return new Date(mov.fechaMovimiento).toDateString() === hoy;
  });

  const totalKgHoy = ingresosHoy.reduce((sum, mov) => sum + mov.cantidad, 0);

  // ============================================================================
  // Render: No autenticado
  // ============================================================================
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

  // ============================================================================
  // Render Principal
  // ============================================================================
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
                Registro de compras e ingreso de productos secos del laboratorio
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
                      placeholder="Buscar por producto, responsable..."
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                      className={`${inputStyles} pl-10`}
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

              {/* Mensajes de éxito/error */}
              {submitStatus === 'success' && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                  <CheckCircle size={20} />
                  {successMessage}
                </div>
              )}
              {submitStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                  <AlertCircle size={20} />
                  {errorMessage}
                </div>
              )}

              {/* Formulario de nuevo ingreso */}
              {showForm && (
                <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Package size={20} />
                    Registrar Ingreso de Producto Seco (Compra)
                  </h3>
                  
                  {loading ? (
                    <div className="text-center py-8">
                      <Loader2 className="animate-spin mx-auto text-blue-600" size={32} />
                      <p className="mt-2 text-gray-600">Cargando productos del catálogo...</p>
                    </div>
                  ) : productosCatalogo.length === 0 ? (
                    <div className="text-center py-8 bg-yellow-50 rounded-lg">
                      <AlertCircle className="mx-auto text-yellow-600 mb-2" size={32} />
                      <p className="text-yellow-800 font-medium">No hay productos secos en el catálogo</p>
                      <p className="text-yellow-700 text-sm">
                        Contacta al administrador para agregar productos con unidad en kg al área de Laboratorio.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Selector de Producto */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Producto *
                        </label>
                        <div className="relative">
                          <select
                            required
                            value={nuevoIngreso.productoId}
                            onChange={(e) => setNuevoIngreso({...nuevoIngreso, productoId: e.target.value})}
                            className={selectStyles}
                          >
                            <option value="" className="text-gray-800">Seleccionar producto del catálogo</option>
                            {productosCatalogo.map((producto) => (
                              <option key={producto.id} value={producto.id} className="text-gray-900">
                                {producto.nombre} ({producto.codigo}) - {producto.unidadBase}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                        </div>
                      </div>

                      {/* Cantidad */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cantidad (kg) *
                        </label>
                        <div className="relative">
                          <Scale className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="number"
                            required
                            step="0.01"
                            min="0.01"
                            value={nuevoIngreso.cantidad}
                            onChange={(e) => setNuevoIngreso({...nuevoIngreso, cantidad: e.target.value})}
                            className={`${inputStyles} pl-10`}
                            placeholder="Cantidad en kilogramos"
                          />
                        </div>
                      </div>

                      {/* Proveedor */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Proveedor
                        </label>
                        <input
                          type="text"
                          value={nuevoIngreso.proveedor}
                          onChange={(e) => setNuevoIngreso({...nuevoIngreso, proveedor: e.target.value})}
                          className={inputStyles}
                          placeholder="Nombre del proveedor"
                        />
                      </div>

                      {/* Número de Lote */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Número de Lote
                        </label>
                        <input
                          type="text"
                          value={nuevoIngreso.lote}
                          onChange={(e) => setNuevoIngreso({...nuevoIngreso, lote: e.target.value})}
                          className={inputStyles}
                          placeholder="LOT-2026-001"
                        />
                      </div>

                      {/* Número de Factura */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          N° Factura / Documento
                        </label>
                        <input
                          type="text"
                          value={nuevoIngreso.numeroFactura}
                          onChange={(e) => setNuevoIngreso({...nuevoIngreso, numeroFactura: e.target.value})}
                          className={inputStyles}
                          placeholder="FAC-2026-0001"
                        />
                      </div>

                      {/* Fecha de vencimiento */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fecha de Vencimiento
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                          <input
                            type="date"
                            value={nuevoIngreso.fechaVencimiento}
                            onChange={(e) => setNuevoIngreso({...nuevoIngreso, fechaVencimiento: e.target.value})}
                            className={`${inputStyles} pl-10`}
                          />
                        </div>
                      </div>

                      {/* Notas */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Observaciones
                        </label>
                        <textarea
                          value={nuevoIngreso.notas}
                          onChange={(e) => setNuevoIngreso({...nuevoIngreso, notas: e.target.value})}
                          className={`${inputStyles} resize-none`}
                          rows={2}
                          placeholder="Notas adicionales sobre el ingreso"
                        />
                      </div>
                    </div>
                  )}

                  {productosCatalogo.length > 0 && (
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
                        disabled={isSubmitting || !nuevoIngreso.productoId}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="animate-spin" size={18} />
                            Registrando...
                          </>
                        ) : (
                          <>
                            <Save size={18} />
                            Registrar Ingreso
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <div className="text-3xl mb-2">📦</div>
                <p className="text-sm font-medium text-gray-500">Productos en Catálogo</p>
                <p className="text-2xl font-bold text-gray-900">{productosCatalogo.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <div className="text-3xl mb-2">📅</div>
                <p className="text-sm font-medium text-gray-500">Ingresos Hoy</p>
                <p className="text-2xl font-bold text-blue-600">{ingresosHoy.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <div className="text-3xl mb-2">⚖️</div>
                <p className="text-sm font-medium text-gray-500">kg Ingresados Hoy</p>
                <p className="text-2xl font-bold text-green-600">{totalKgHoy.toFixed(2)}</p>
              </div>
            </div>

            {/* Historial de Ingresos */}
            <div className="bg-white rounded-lg shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800">
                  Historial de Ingresos ({historialFiltrado.length})
                </h3>
              </div>

              {loadingHistorial ? (
                <div className="p-8 text-center">
                  <Loader2 className="animate-spin mx-auto text-blue-600" size={32} />
                  <p className="mt-2 text-gray-600">Cargando historial...</p>
                </div>
              ) : historialFiltrado.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-6xl mb-4">📦</div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No hay ingresos registrados</h3>
                  <p className="text-gray-600 mb-4">
                    {historial.length === 0 
                      ? "Aún no se han registrado ingresos de productos secos."
                      : "No se encontraron ingresos con el filtro aplicado."
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
                          Fecha Ingreso
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Responsable
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Observaciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {historialFiltrado.map((movimiento) => (
                        <tr key={movimiento.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {getNombreProducto(movimiento.productoId)}
                            </div>
                            <div className="text-xs text-gray-500">{movimiento.productoId}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-green-600">
                              +{movimiento.cantidad} {movimiento.unidadMedida}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatearFecha(movimiento.fechaMovimiento)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {movimiento.responsable || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500 max-w-xs truncate" title={movimiento.observaciones}>
                              {movimiento.observaciones || '-'}
                            </div>
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

      {/* Estilos globales para placeholders */}
      <style jsx global>{`
        input::placeholder,
        textarea::placeholder {
          color: #1f2937 !important;
          opacity: 0.7 !important;
        }
        
        select option:first-child {
          color: #1f2937;
        }
      `}</style>
    </>
  );
}
