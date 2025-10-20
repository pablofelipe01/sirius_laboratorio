'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface ProyeccionRecord {
  id: string;
  createdTime: string;
  fields: {
    ID: string;
    'Creada'?: string;
    Cliente?: string;
    Microorganismo?: string;
    'Numero de Litros'?: number;
    'Fecha Solicitud'?: string;
    'Mes Formulado'?: number;
    'Semana Solicitud'?: number;
    'Inicio Produccion'?: string;
    'Microorganismo (from Mircoorganismos)'?: string[];
    'Tiempo Produccion'?: number[];
    'Semana Produccion'?: number;
    'Tipo de aplicación'?: string;
    Estatus?: string;
    Microorganismos?: string[];
    'Insumos Requeridos'?: { nombre: string; cantidadNecesaria: number; cantidadDisponible: number }[];
  };
}

export default function ProyeccionPage() {
  const [records, setRecords] = useState<ProyeccionRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ProyeccionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insumosError, setInsumosError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clienteFilter, setClienteFilter] = useState('');
  const [semanaFilter, setSemanaFilter] = useState('');
  const [microorganismoFilter, setMicroorganismoFilter] = useState('');

  useEffect(() => {
    fetchProyeccionData();
  }, []);

  useEffect(() => {
    filterRecords();
    verificarInsumosParaInoculacion(records);
  }, [records, searchTerm, statusFilter, clienteFilter, semanaFilter, microorganismoFilter]);

  const fetchProyeccionData = async () => {
    try {
      const response = await fetch('/api/proyeccion');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const data = await response.json();
      setRecords(data.records || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = records;

    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.fields.Cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.fields.Microorganismo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.fields['Tipo de aplicación']?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(record => record.fields.Estatus === statusFilter);
    }

    if (clienteFilter) {
      filtered = filtered.filter(record => record.fields.Cliente === clienteFilter);
    }

    if (semanaFilter) {
      filtered = filtered.filter(record => record.fields['Semana Solicitud']?.toString() === semanaFilter);
    }

    if (microorganismoFilter) {
      filtered = filtered.filter(record => record.fields.Microorganismo === microorganismoFilter);
    }

    setFilteredRecords(filtered);
  };

  const verificarInsumosParaInoculacion = (records: ProyeccionRecord[]) => {
    const errores: string[] = [];
    records.forEach(record => {
      const insumos = record.fields['Insumos Requeridos'] || [];
      insumos.forEach(insumo => {
        const falta = insumo.cantidadNecesaria - insumo.cantidadDisponible;
        if (falta > 0) {
          errores.push(`Falta ${falta} unidades de ${insumo.nombre} para la inoculación en el registro ${record.fields.ID}.`);
        }
      });
    });
    setInsumosError(errores.length > 0 ? errores.join(' ') : null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Entregado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Confirmado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Estimado':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Cancelado':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const uniqueClientes = [...new Set(records.map(r => r.fields.Cliente).filter(Boolean))];
  const uniqueStatuses = [...new Set(records.map(r => r.fields.Estatus).filter(Boolean))];
  const uniqueSemanas = [...new Set(records.map(r => r.fields['Semana Solicitud']).filter((s): s is number => s !== undefined && s !== null))].sort((a, b) => a - b);
  const uniqueMicroorganismos = [...new Set(records.map(r => r.fields.Microorganismo).filter(Boolean))].sort();

  if (loading) {
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
            <div className="max-w-4xl mx-auto text-center">
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 text-lg">Cargando proyecciones...</p>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || insumosError) {
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
            <div className="max-w-4xl mx-auto text-center">
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-red-600 text-xl mb-4">⚠️ Error al cargar los datos o falta de insumos</div>
                {error && <p className="text-gray-600">{error}</p>}
                {insumosError && <p className="text-gray-600 mt-2">{insumosError}</p>}
                <button
                  onClick={fetchProyeccionData}
                  className="mt-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all"
                >
                  Reintentar
                </button>
              </div>
            </div>
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
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-lg p-8 mb-8 text-center">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">
                📈 PROYECCIONES DE LINA (COMERCIAL)
              </h1>
              <p className="text-gray-600 text-lg">
                Gestión y seguimiento de proyecciones comerciales de Lina
              </p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    🔍 Buscar
                  </label>
                  <input
                    type="text"
                    placeholder="Cliente, Microorganismo, Tipo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    👥 Cliente
                  </label>
                  <select
                    value={clienteFilter}
                    onChange={(e) => setClienteFilter(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Todos los clientes</option>
                    {uniqueClientes.map(cliente => (
                      <option key={cliente} value={cliente}>{cliente}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    📊 Estatus
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Todos los estatus</option>
                    {uniqueStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    📅 Semana Solicitud
                  </label>
                  <select
                    value={semanaFilter}
                    onChange={(e) => setSemanaFilter(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Todas las semanas</option>
                    {uniqueSemanas.map(semana => (
                      <option key={semana} value={semana.toString()}>Semana {semana}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    🧬 Microorganismo
                  </label>
                  <select
                    value={microorganismoFilter}
                    onChange={(e) => setMicroorganismoFilter(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Todos los microorganismos</option>
                    {uniqueMicroorganismos.map(microorganismo => (
                      <option key={microorganismo} value={microorganismo}>{microorganismo}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        👥 Cliente
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        🧬 Microorganismo
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        📏 Litros
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        📅 Fecha Solicitud
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        📅 Semana Solicitud
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        📅 Inicio Producción
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        📅 Semana Producción
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        📊 Estatus
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {record.fields.Cliente || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.fields.Microorganismo || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                          {record.fields['Numero de Litros'] ? `${record.fields['Numero de Litros']} L` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.fields['Fecha Solicitud'] ? formatDate(record.fields['Fecha Solicitud']) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                          {record.fields['Semana Solicitud'] ? `Semana ${record.fields['Semana Solicitud']}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.fields['Inicio Produccion'] ? formatDate(record.fields['Inicio Produccion']) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                          {record.fields['Semana Produccion'] ? `Semana ${record.fields['Semana Produccion']}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(record.fields.Estatus || '')}`}>
                            {record.fields.Estatus || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredRecords.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-gray-500 text-lg">No se encontraron registros que coincidan con los filtros.</p>
                </div>
              )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">📋 Total Proyecciones</h3>
                    <p className="text-3xl font-bold text-blue-600">{filteredRecords.length}</p>
                  </div>
                  <div className="text-4xl">📊</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">� Litros Totales</h3>
                    <p className="text-3xl font-bold text-purple-600">
                      {filteredRecords.reduce((sum, record) => sum + (record.fields['Numero de Litros'] || 0), 0)} L
                    </p>
                  </div>
                  <div className="text-4xl">🧪</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">� Semanas Activas</h3>
                    <p className="text-3xl font-bold text-green-600">
                      {new Set(filteredRecords.map(r => r.fields['Semana Solicitud']).filter(Boolean)).size}
                    </p>
                  </div>
                  <div className="text-4xl">📆</div>
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mt-8">
              <div className="flex items-center">
                <div className="text-2xl mr-4">ℹ️</div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">
                    Información del Sistema de Proyecciones de Lina (Comercial)
                  </h3>
                  <p className="text-blue-700">
                    Esta tabla muestra las proyecciones comerciales activas de Lina. Los datos se actualizan automáticamente desde la base de datos de Airtable.
                    Utiliza los filtros para encontrar información específica sobre clientes, microorganismos o estados de las proyecciones.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}