'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import VoiceFilterController from '@/components/VoiceFilterController';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface DashboardLabRecord {
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

interface InoculacionRecord {
  id: string;
  createdTime: string;
  fields: {
    ID?: string;
    'Fecha Creacion'?: string;
    'Nombre (from Responsables)'?: string[];
    'Fecha Guardado Refrigeración'?: string;
    'Fecha Lote Agotado'?: string;
    'Fecha Inoculacion'?: string;
    'Estado Lote'?: string;
    'Microorganismo (from Microorganismos)'?: string[];
    'Abreviatura'?: string[];
    'Codigo Lote'?: string;
    'Cantidad Bolsas'?: number;
    'Cantidad Bolsas Inoculadas'?: number;
    'Total Cantidad Bolsas'?: number;
    'Cantidad Bolsas Descartadas'?: number[];
    'Realiza Registro'?: string;
    'Total Bolsas Entregadas'?: number;
    'Cantidad Actual Bolsas'?: number;
  };
}

interface SalidaInoculacionRecord {
  id: string;
  createdTime: string;
  fields: {
    ID?: string;
    'Fecha Creacion'?: string;
    'Fecha Evento'?: string;
    'Cantidad Bolsas'?: number;
    'Realiza Registro'?: string;
    'Lote Alterado'?: string[];
    'Descartes'?: string[];
    'Cosecha Laboratorio'?: string[];
    'Cepas'?: string[];
  };
}

interface SalidaCepasRecord {
  id: string;
  createdTime: string;
  fields: {
    ID?: string;
    'Fecha Creacion'?: string;
    'Fecha Evento'?: string;
    'Cantidad Bolsas'?: number;
    'Realiza Registro'?: string;
    'Cepas'?: string[];
    'Inoculacion'?: string[];
    'Descartes'?: string[];
    'Cosecha Laboratorio'?: string[];
  };
}

interface SalidaInsumosRecord {
  id: string;
  createdTime: string;
  fields: {
    ID?: string;
    'fecha registro'?: string;
    'nombre (from Insumos Laboratorio)'?: string[];
    'Presentacion del Insumo'?: number[];
    'Fecha Evento'?: string;
    'Cantidad Salida Unidades'?: number;
    'Cantidad Salida Formato Granel'?: number;
    'Realiza Registro'?: string;
    'Nombre Evento'?: string;
    'Insumos Laboratorio'?: string[];
    'Entrada'?: string[];
    'Inoculacion'?: string[];
    'Cepas'?: string[];
    'Fermentacion'?: string[];
  };
}

interface MicroorganismoRecord {
  id: string;
  createdTime: string;
  fields: {
    ID?: string;
    'Microorganismo'?: string;
    'Bolsas/Lote'?: number;
    'Dias/Incubacion'?: number;
    'Tiempo producción'?: number;
    'Abreviaturas'?: string;
    'Tipo Microorganismo'?: string;
  };
}

interface EquipoLaboratorioRecord {
  id: string;
  createdTime: string;
  fields: {
    ID?: string;
    'Nombre'?: string;
    'Cedula'?: string;
    'Estado Usuario'?: string;
    'Estados Sistemas'?: string;
  };
}

interface DescartesRecord {
  id: string;
  createdTime: string;
  fields: {
    ID?: string;
    'Fecha Creacion'?: string;
    'Fecha Evento'?: string;
    'Cantidad Bolsas Descartadas'?: number;
    'Motivo'?: string;
    'Realiza Registro'?: string;
    'Salida Inoculacion'?: string[];
    'Salida Cepas'?: string[];
  };
}

interface CosechaLaboratorioRecord {
  id: string;
  createdTime: string;
  fields: {
    ID?: string;
    'Fecha de creacion'?: string;
    'Nombre (from Cliente)'?: string[];
    'Nombre (from Responsable)'?: string[];
    'Microorganismo (from Microorganismos)'?: string[];
    'Hora Inicio'?: string;
    'Hora fin'?: string;
    'Realiza Registro'?: string;
    'Litros'?: number;
    'Bidones'?: number;
    'Lotes'?: string;
    'Bolsas Lotes'?: string;
    'Total Bolsas'?: number;
    'Cliente'?: string[];
    'Microorganismos'?: string[];
    'Salida Inoculacion'?: string[];
    'Salida Cepas'?: string[];
    'Responsable'?: string[];
  };
}

interface CepasRecord {
  id: string;
  createdTime: string;
  fields: {
    ID?: string;
    'Creacion'?: string;
    'Nombre (from Responsables)'?: string[];
    'Microorganismo (from Microorganismos)'?: string[];
    'Abreviatura Hongo'?: string[];
    'Codigo Cepa'?: string;
    'Fecha Creacion'?: string;
    'Cantidad Bolsas'?: number;
    'Total Cantidad Bolsas'?: number;
    'Realiza Registro'?: string;
    'Microorganismos'?: string[];
    'Responsables'?: string[];
    'Tipo Cepa'?: string;
    'Salida Inoculacion'?: string[];
  };
}

interface LoteCompleteInfo {
  inoculacion: InoculacionRecord;
  salidas: SalidaInoculacionRecord[];
  cepasUtilizadas: SalidaCepasRecord[];
  insumosConsumidos: SalidaInsumosRecord[];
  microorganismo?: MicroorganismoRecord;
  responsables: EquipoLaboratorioRecord[];
  descartes: DescartesRecord[];
  cosechas: CosechaLaboratorioRecord[];
  cepasProducidas: CepasRecord[];
}

export default function DashboardLabPage() {
  const [records, setRecords] = useState<InoculacionRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<InoculacionRecord[]>([]);
  const [selectedLote, setSelectedLote] = useState<LoteCompleteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filters, setFilters] = useState({
    codigoLote: '',
    estado: '',
    microorganismo: '',
    responsable: '',
    fechaDesde: '',
    fechaHasta: '',
    cantidadMinima: ''
  });
  
  // Estados únicos para filtros
  const [uniqueStates, setUniqueStates] = useState<string[]>([]);
  const [uniqueMicroorganisms, setUniqueMicroorganisms] = useState<string[]>([]);
  const [uniqueResponsables, setUniqueResponsables] = useState<string[]>([]);
  
  // Estados para el modal
  const [showModal, setShowModal] = useState(false);
  const [selectedLoteInfo, setSelectedLoteInfo] = useState<LoteCompleteInfo | null>(null);

  // Estados para analytics
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'weekly' | 'monthly' | 'annual'>('monthly');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    fetchInoculacionData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [records, filters]);

  useEffect(() => {
    extractUniqueValues();
  }, [records]);

  useEffect(() => {
    fetchAnalyticsData(analyticsPeriod);
  }, [analyticsPeriod]);

  const fetchInoculacionData = async () => {
    try {
      const response = await fetch('/api/inoculacion');
      if (!response.ok) {
        throw new Error('Failed to fetch inoculacion data');
      }
      const data = await response.json();
      setRecords(data.records || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const extractUniqueValues = () => {
    const states = [...new Set(records.map(r => r.fields['Estado Lote']).filter(Boolean))] as string[];
    const microorganisms = [...new Set(records.flatMap(r => r.fields['Microorganismo (from Microorganismos)'] || []))];
    const responsables = [...new Set(records.map(r => r.fields['Realiza Registro']).filter(Boolean))] as string[];
    
    setUniqueStates(states);
    setUniqueMicroorganisms(microorganisms);
    setUniqueResponsables(responsables);
  };

  const applyFilters = () => {
    let filtered = records;

    if (filters.codigoLote.trim()) {
      filtered = filtered.filter(record => 
        record.fields['Codigo Lote']?.toLowerCase().includes(filters.codigoLote.toLowerCase().trim())
      );
    }

    if (filters.estado) {
      filtered = filtered.filter(record => record.fields['Estado Lote'] === filters.estado);
    }

    if (filters.microorganismo) {
      filtered = filtered.filter(record => 
        record.fields['Microorganismo (from Microorganismos)']?.includes(filters.microorganismo)
      );
    }

    if (filters.responsable) {
      filtered = filtered.filter(record => record.fields['Realiza Registro'] === filters.responsable);
    }

    if (filters.fechaDesde) {
      filtered = filtered.filter(record => 
        record.fields['Fecha Inoculacion'] && record.fields['Fecha Inoculacion']! >= filters.fechaDesde
      );
    }

    if (filters.fechaHasta) {
      filtered = filtered.filter(record => 
        record.fields['Fecha Inoculacion'] && record.fields['Fecha Inoculacion']! <= filters.fechaHasta
      );
    }

    if (filters.cantidadMinima) {
      const minQuantity = parseInt(filters.cantidadMinima);
      filtered = filtered.filter(record => 
        (record.fields['Cantidad Actual Bolsas'] || 0) >= minQuantity
      );
    }

    setFilteredRecords(filtered);
  };

  const fetchLoteCompleteInfo = async (loteId: string) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(`/api/lote-complete/${loteId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch complete lote information');
      }
      const data = await response.json();
      console.log('🔍 Complete lote data received:', data);
      console.log('📊 Cepas Utilizadas:', data.cepasUtilizadas);
      console.log('📦 Insumos Consumidos:', data.insumosConsumidos);
      setSelectedLoteInfo(data);
      setShowModal(true);
    } catch (err) {
      console.error('Error fetching complete lote info:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      codigoLote: '',
      estado: '',
      microorganismo: '',
      responsable: '',
      fechaDesde: '',
      fechaHasta: '',
      cantidadMinima: ''
    });
  };

  const fetchAnalyticsData = async (period: 'weekly' | 'monthly' | 'annual' = 'monthly') => {
    try {
      setAnalyticsLoading(true);
      const response = await fetch(`/api/dashboard-analytics?period=${period}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      const data = await response.json();
      
      // Transform data to show by microorganism instead of by period
      const microorganismData: { [key: string]: { inoculated: number; discarded: number; harvested: number } } = {};
      
      data.data.forEach((periodData: any) => {
        if (periodData.byMicroorganism) {
          Object.entries(periodData.byMicroorganism).forEach(([microorganism, metrics]: [string, any]) => {
            if (!microorganismData[microorganism]) {
              microorganismData[microorganism] = { inoculated: 0, discarded: 0, harvested: 0 };
            }
            microorganismData[microorganism].inoculated += metrics.inoculated || 0;
            microorganismData[microorganism].discarded += metrics.discarded || 0;
            microorganismData[microorganism].harvested += metrics.harvested || 0;
          });
        }
      });
      
      // Convert to array format for the chart
      const chartData = Object.entries(microorganismData).map(([microorganism, metrics]) => ({
        microorganism,
        inoculated: metrics.inoculated,
        discarded: metrics.discarded,
        harvested: metrics.harvested
      }));
      
      setAnalyticsData(chartData);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
    } finally {
      setAnalyticsLoading(false);
    }
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



  if (loading) {
    return (
      <>
        <Navbar />
        <div
          className="min-h-screen relative pt-16 sm:pt-20 md:pt-24"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'scroll'
          }}
        >
          <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
                <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 text-base sm:text-lg">Cargando Dashboard Lab...</p>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div
          className="min-h-screen relative pt-16 sm:pt-20 md:pt-24"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'scroll'
          }}
        >
          <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-red-600 text-xl mb-4">⚠️ Error al cargar los datos</div>
                {error && <p className="text-gray-600">{error}</p>}
                <button
                  onClick={fetchInoculacionData}
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
        className="min-h-screen relative pt-16 sm:pt-20 md:pt-24"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'scroll'
        }}
      >
        <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          <div className="max-w-full lg:max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 lg:mb-8 text-center">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2 sm:mb-4">
                🧪 DASHBOARD LAB
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 px-2">
                Panel de control y análisis del laboratorio - Gestión integral de proyecciones
              </p>
            </div>

            {/* Filtros Estratégicos */}
            <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 lg:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Filtros Estratégicos</h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  {/* Control de Voz */}
                  <div className="w-full sm:w-auto">
                    <VoiceFilterController
                      onFiltersUpdate={setFilters}
                      currentFilters={filters}
                      availableOptions={{
                        states: uniqueStates,
                        microorganisms: uniqueMicroorganisms,
                        responsables: uniqueResponsables
                      }}
                    />
                  </div>
                  <button
                    onClick={clearFilters}
                    className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    <span className="sm:hidden">🧹 Limpiar</span>
                    <span className="hidden sm:inline">🧹 Limpiar Filtros</span>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {/* Código de Lote */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-1 sm:mb-2">
                    🔍 <span className="hidden sm:inline">Código de </span>Lote
                  </label>
                  <input
                    type="text"
                    value={filters.codigoLote}
                    onChange={(e) => setFilters({...filters, codigoLote: e.target.value})}
                    placeholder="Ej: 061125TR..."
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 text-gray-800 font-medium shadow-sm hover:border-gray-300 text-sm"
                  />
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-1 sm:mb-2">
                    📊 Estado<span className="hidden sm:inline"> del Lote</span>
                  </label>
                  <select
                    value={filters.estado}
                    onChange={(e) => setFilters({...filters, estado: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-800 font-medium shadow-sm hover:border-gray-300 bg-white text-sm"
                  >
                    <option value="" className="text-gray-500">🔄 Todos</option>
                    {uniqueStates.map(state => (
                      <option key={state} value={state} className="text-gray-800">{state}</option>
                    ))}
                  </select>
                </div>

                {/* Microorganismo */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-1 sm:mb-2">
                    🦠 Microorganismo
                  </label>
                  <select
                    value={filters.microorganismo}
                    onChange={(e) => setFilters({...filters, microorganismo: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-800 font-medium shadow-sm hover:border-gray-300 bg-white text-sm"
                  >
                    <option value="" className="text-gray-500">🧬 Todos</option>
                    {uniqueMicroorganisms.map(micro => (
                      <option key={micro} value={micro} className="text-gray-800">{micro}</option>
                    ))}
                  </select>
                </div>

                {/* Responsable */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-1 sm:mb-2">
                    👤 Responsable
                  </label>
                  <select
                    value={filters.responsable}
                    onChange={(e) => setFilters({...filters, responsable: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-800 font-medium shadow-sm hover:border-gray-300 bg-white text-sm"
                  >
                    <option value="" className="text-gray-500">👥 Todos</option>
                    {uniqueResponsables.map(resp => (
                      <option key={resp} value={resp} className="text-gray-800">{resp}</option>
                    ))}
                  </select>
                </div>

                {/* Fecha Desde */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-1 sm:mb-2">
                    📅 <span className="hidden sm:inline">Fecha </span>Desde
                  </label>
                  <input
                    type="date"
                    value={filters.fechaDesde}
                    onChange={(e) => setFilters({...filters, fechaDesde: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-800 font-medium shadow-sm hover:border-gray-300 text-sm"
                  />
                </div>

                {/* Fecha Hasta */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-1 sm:mb-2">
                    📅 <span className="hidden sm:inline">Fecha </span>Hasta
                  </label>
                  <input
                    type="date"
                    value={filters.fechaHasta}
                    onChange={(e) => setFilters({...filters, fechaHasta: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-800 font-medium shadow-sm hover:border-gray-300 text-sm"
                  />
                </div>

                {/* Cantidad Mínima */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 mb-1 sm:mb-2">
                    📦 Cantidad Min.
                  </label>
                  <input
                    type="number"
                    value={filters.cantidadMinima}
                    onChange={(e) => setFilters({...filters, cantidadMinima: e.target.value})}
                    placeholder="Ej: 100..."
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 text-gray-800 font-medium shadow-sm hover:border-gray-300 text-sm"
                  />
                </div>

                {/* Información de Filtros */}
                <div className="sm:col-span-2 lg:col-span-1 flex items-end">
                  <div className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl">
                    <p className="text-xs sm:text-sm text-blue-800 font-semibold">
                      📊 {filteredRecords.length} de {records.length}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {Math.round((filteredRecords.length / records.length) * 100)}% del total
                    </p>
                    {Object.values(filters).some(v => v !== '') && (
                      <p className="text-xs text-indigo-600 mt-1 font-medium">
                        🎯 {Object.values(filters).filter(v => v !== '').length} activos
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico de Analytics */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-4 sm:mb-6 lg:mb-8">
              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-teal-600">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-white">📊 Análisis de Producción</h2>
                    <p className="text-green-100 text-xs sm:text-sm">Bolsas inoculadas, descartadas y cosechadas por microorganismo (filtrado por período)</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAnalyticsPeriod('weekly')}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                        analyticsPeriod === 'weekly' ? 'bg-white text-green-600' : 'bg-green-500 text-white hover:bg-green-400'
                      }`}
                    >
                      Semanal
                    </button>
                    <button
                      onClick={() => setAnalyticsPeriod('monthly')}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                        analyticsPeriod === 'monthly' ? 'bg-white text-green-600' : 'bg-green-500 text-white hover:bg-green-400'
                      }`}
                    >
                      Mensual
                    </button>
                    <button
                      onClick={() => setAnalyticsPeriod('annual')}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                        analyticsPeriod === 'annual' ? 'bg-white text-green-600' : 'bg-green-500 text-white hover:bg-green-400'
                      }`}
                    >
                      Anual
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {analyticsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    <span className="ml-3 text-gray-600">Cargando datos analíticos...</span>
                  </div>
                ) : analyticsData.length > 0 ? (
                  <div className="h-80 sm:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="microorganism"
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value, name) => [
                            `${value} bolsas`,
                            name === 'Inoculadas' ? 'Bolsas Inoculadas' :
                            name === 'Descartadas' ? 'Bolsas Descartadas' : 
                            name === 'Cosechadas' ? 'Bolsas Cosechadas' : name
                          ]}
                          labelFormatter={(label) => `Microorganismo: ${label}`}
                        />
                        <Legend />
                        <Bar dataKey="inoculated" fill="#3B82F6" name="Inoculadas" />
                        <Bar dataKey="discarded" fill="#e61a1aff" name="Descartadas" />
                        <Bar dataKey="harvested" fill="#10B981" name="Cosechadas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No hay datos disponibles para el período seleccionado</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tabla de Inoculación */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-purple-600">
                <h2 className="text-lg sm:text-xl font-semibold text-white">Registros de Inoculación</h2>
                <p className="text-blue-100 text-xs sm:text-sm">Gestión completa de lotes de inoculación</p>
              </div>
              
              {loading ? (
                <div className="flex flex-col sm:flex-row items-center justify-center py-8 sm:py-12 px-4">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mb-2 sm:mb-0"></div>
                  <span className="sm:ml-3 text-gray-600 text-sm sm:text-base text-center">Cargando registros de inoculación...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-2 sm:px-4 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          🏷️ <span className="hidden sm:inline">Código </span>Lote
                        </th>
                        <th className="px-2 sm:px-4 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                          🦠 Microorganismo
                        </th>
                        <th className="px-2 sm:px-4 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          📊 Estado
                        </th>
                        <th className="px-2 sm:px-4 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                          📅 <span className="hidden xl:inline">Fecha </span>Inoculación
                        </th>
                        <th className="px-2 sm:px-4 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                          📦 <span className="hidden lg:inline">Cant. </span>Inicial
                        </th>
                        <th className="px-2 sm:px-4 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          💼 Actual
                        </th>
                        <th className="px-2 sm:px-4 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden xl:table-cell">
                          👤 Responsable
                        </th>
                        <th className="px-2 sm:px-4 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          ⚡ <span className="hidden sm:inline">Acciones</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-200">
                          <td className="px-2 sm:px-4 py-3 sm:py-4 text-sm font-bold text-blue-600">
                            <div className="flex items-center">
                              <span className="font-mono text-xs sm:text-sm break-all">{record.fields['Codigo Lote'] || '-'}</span>
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4 text-sm text-gray-700 hidden md:table-cell">
                            <div className="max-w-xs truncate" title={record.fields['Microorganismo (from Microorganismos)']?.[0]}>
                              {record.fields['Microorganismo (from Microorganismos)']?.[0] || '-'}
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 sm:px-3 py-1 text-xs font-bold rounded-full shadow-sm ${
                              record.fields['Estado Lote'] === 'Incubacion' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                              record.fields['Estado Lote'] === 'Refrigeración' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              record.fields['Estado Lote'] === 'Agotado' ? 'bg-red-100 text-red-800 border border-red-200' :
                              'bg-gray-100 text-gray-800 border border-gray-200'
                            }`}>
                              <span className="sm:hidden">
                                {record.fields['Estado Lote']?.substring(0, 3) || 'N/A'}
                              </span>
                              <span className="hidden sm:inline">
                                {record.fields['Estado Lote'] || 'N/A'}
                              </span>
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                            {record.fields['Fecha Inoculacion'] ? 
                              new Date(record.fields['Fecha Inoculacion']).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit'
                              }) : '-'}
                          </td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-700 hidden sm:table-cell">
                            <span className="bg-gray-50 px-1 sm:px-2 py-1 rounded-md border border-gray-200 text-xs sm:text-sm">
                              <span className="sm:hidden">{record.fields['Cantidad Bolsas Inoculadas'] || 0}</span>
                              <span className="hidden sm:inline">{record.fields['Cantidad Bolsas Inoculadas'] || 0} bolsas</span>
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm font-bold text-green-700">
                            <span className="bg-green-50 px-1 sm:px-2 py-1 rounded-md border border-green-200 text-xs sm:text-sm">
                              <span className="sm:hidden">{record.fields['Cantidad Actual Bolsas'] || 0}</span>
                              <span className="hidden sm:inline">{record.fields['Cantidad Actual Bolsas'] || 0} bolsas</span>
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-600 hidden xl:table-cell">
                            <div className="max-w-xs truncate" title={record.fields['Realiza Registro']}>
                              {record.fields['Realiza Registro'] || '-'}
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => fetchLoteCompleteInfo(record.id)}
                              className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                            >
                              <span className="sm:hidden">👁️</span>
                              <span className="hidden sm:inline">👁️ Ver</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filteredRecords.length === 0 && (
                    <div className="text-center py-8 sm:py-12 px-4">
                      <p className="text-gray-500 text-sm sm:text-lg">No hay registros que coincidan con los filtros aplicados</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal de Información Completa del Lote */}
            {showModal && selectedLoteInfo && (
              <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-full sm:max-w-7xl w-full max-h-[95vh] overflow-hidden border border-gray-200">
                  <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="bg-white bg-opacity-20 rounded-full p-1 sm:p-2 flex-shrink-0">
                          <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">
                            📊 <span className="hidden sm:inline">Información Completa del </span>Lote
                          </h2>
                          <p className="text-blue-100 text-xs sm:text-sm font-medium mt-1 truncate">
                            Código: {selectedLoteInfo.inoculacion.fields['Codigo Lote']}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowModal(false)}
                        className="self-end sm:self-center bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-all duration-200 hover:scale-110 flex-shrink-0"
                      >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8 max-h-[calc(95vh-120px)] overflow-y-auto">
                    {/* Información Básica */}
                    <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg sm:rounded-2xl p-4 sm:p-6 border border-blue-200 shadow-sm">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full p-1 sm:p-2 mr-2 sm:mr-3 flex-shrink-0">
                          <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="truncate">📋 <span className="hidden sm:inline">Información Básica del </span>Lote</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        <div className="bg-white p-3 sm:p-5 rounded-lg sm:rounded-xl shadow-sm border border-blue-200 hover:shadow-md transition-shadow">
                          <div className="flex items-center mb-2">
                            <span className="text-xl sm:text-2xl mr-2 flex-shrink-0">📊</span>
                            <p className="font-bold text-gray-700 text-xs sm:text-sm uppercase tracking-wide">Estado del Lote</p>
                          </div>
                          <p className="font-bold text-sm sm:text-lg text-gray-900 truncate">{selectedLoteInfo.inoculacion.fields['Estado Lote'] || 'N/A'}</p>
                        </div>
                        <div className="bg-white p-3 sm:p-5 rounded-lg sm:rounded-xl shadow-sm border border-green-200 hover:shadow-md transition-shadow">
                          <div className="flex items-center mb-2">
                            <span className="text-xl sm:text-2xl mr-2 flex-shrink-0">📅</span>
                            <p className="font-bold text-gray-700 text-xs sm:text-sm uppercase tracking-wide">Fecha Inoculación</p>
                          </div>
                          <p className="font-bold text-sm sm:text-lg text-gray-900 truncate">{selectedLoteInfo.inoculacion.fields['Fecha Inoculacion'] || 'N/A'}</p>
                        </div>
                        <div className="bg-white p-3 sm:p-5 rounded-lg sm:rounded-xl shadow-sm border border-purple-200 hover:shadow-md transition-shadow">
                          <div className="flex items-center mb-2">
                            <span className="text-xl sm:text-2xl mr-2 flex-shrink-0">👤</span>
                            <p className="font-bold text-gray-700 text-xs sm:text-sm uppercase tracking-wide">Responsable</p>
                          </div>
                          <p className="font-bold text-sm sm:text-lg text-gray-900 truncate">{selectedLoteInfo.inoculacion.fields['Realiza Registro'] || 'N/A'}</p>
                        </div>
                        <div className="bg-white p-3 sm:p-5 rounded-lg sm:rounded-xl shadow-sm border border-yellow-200 hover:shadow-md transition-shadow">
                          <div className="flex items-center mb-2">
                            <span className="text-xl sm:text-2xl mr-2 flex-shrink-0">🦠</span>
                            <p className="font-bold text-gray-700 text-xs sm:text-sm uppercase tracking-wide">Microorganismo</p>
                          </div>
                          <p className="font-bold text-sm sm:text-lg text-gray-900 truncate">{selectedLoteInfo.inoculacion.fields['Microorganismo (from Microorganismos)']?.[0] || 'N/A'}</p>
                        </div>
                        <div className="bg-white p-3 sm:p-5 rounded-lg sm:rounded-xl shadow-sm border border-red-200 hover:shadow-md transition-shadow">
                          <div className="flex items-center mb-2">
                            <span className="text-xl sm:text-2xl mr-2 flex-shrink-0">📦</span>
                            <p className="font-bold text-gray-700 text-xs sm:text-sm uppercase tracking-wide">Cantidad Inicial</p>
                          </div>
                          <p className="font-bold text-sm sm:text-lg text-gray-900 truncate">{selectedLoteInfo.inoculacion.fields['Cantidad Bolsas Inoculadas'] || 0} bolsas</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-indigo-200 hover:shadow-md transition-shadow">
                          <div className="flex items-center mb-2">
                            <span className="text-2xl mr-2">💼</span>
                            <p className="font-bold text-gray-700 text-sm uppercase tracking-wide">Cantidad Actual</p>
                          </div>
                          <p className="font-bold text-lg text-indigo-600">{selectedLoteInfo.inoculacion.fields['Cantidad Actual Bolsas'] || 0} bolsas</p>
                        </div>
                      </div>
                    </div>

                    {/* Resumen de Uso de Bolsas */}
                    <div className="bg-gradient-to-r from-gray-50 via-slate-50 to-gray-50 rounded-2xl p-6 border border-gray-200 shadow-sm">
                      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <div className="bg-gradient-to-r from-gray-500 to-slate-600 rounded-full p-2 mr-3">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        📈 Eventos de Consumo de Bolsas
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-red-200 hover:shadow-md transition-shadow">
                          <div className="flex items-center mb-3">
                            <span className="text-3xl mr-3">🗑️</span>
                            <div>
                              <p className="font-bold text-gray-700 text-sm uppercase tracking-wide">Descartes</p>
                              <p className="text-xs text-gray-500">Bolsas descartadas</p>
                            </div>
                          </div>
                          <p className="font-bold text-2xl text-red-600 mb-1">
                            {(() => {
                              const descarteSalidas = selectedLoteInfo.salidas?.filter(salida => 
                                salida.fields['Descartes'] && salida.fields['Descartes'].length > 0
                              ) || [];
                              return descarteSalidas.reduce((total, salida) => total + (salida.fields['Cantidad Bolsas'] || 0), 0);
                            })()} bolsas
                          </p>
                          <p className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded-full inline-block">
                            {selectedLoteInfo.salidas?.filter(salida => 
                              salida.fields['Descartes'] && salida.fields['Descartes'].length > 0
                            ).length || 0} eventos
                          </p>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-green-200 hover:shadow-md transition-shadow">
                          <div className="flex items-center mb-3">
                            <span className="text-3xl mr-3">🌾</span>
                            <div>
                              <p className="font-bold text-gray-700 text-sm uppercase tracking-wide">Cosechas</p>
                              <p className="text-xs text-gray-500">Bolsas cosechadas</p>
                            </div>
                          </div>
                          <p className="font-bold text-2xl text-green-600 mb-1">
                            {(() => {
                              const cosechaSalidas = selectedLoteInfo.salidas?.filter(salida => 
                                salida.fields['Cosecha Laboratorio'] && salida.fields['Cosecha Laboratorio'].length > 0
                              ) || [];
                              return cosechaSalidas.reduce((total, salida) => total + (salida.fields['Cantidad Bolsas'] || 0), 0);
                            })()} bolsas
                          </p>
                          <p className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded-full inline-block">
                            {selectedLoteInfo.salidas?.filter(salida => 
                              salida.fields['Cosecha Laboratorio'] && salida.fields['Cosecha Laboratorio'].length > 0
                            ).length || 0} eventos
                          </p>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-200 hover:shadow-md transition-shadow">
                          <div className="flex items-center mb-3">
                            <span className="text-3xl mr-3">🧪</span>
                            <div>
                              <p className="font-bold text-gray-700 text-sm uppercase tracking-wide">Producción de Cepas</p>
                              <p className="text-xs text-gray-500">Bolsas para cepas</p>
                            </div>
                          </div>
                          <p className="font-bold text-2xl text-amber-600 mb-1">
                            {(() => {
                              const cepaSalidas = selectedLoteInfo.salidas?.filter(salida => 
                                salida.fields['Cepas'] && salida.fields['Cepas'].length > 0
                              ) || [];
                              return cepaSalidas.reduce((total, salida) => total + (salida.fields['Cantidad Bolsas'] || 0), 0);
                            })()} bolsas
                          </p>
                          <p className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded-full inline-block">
                            {selectedLoteInfo.salidas?.filter(salida => 
                              salida.fields['Cepas'] && salida.fields['Cepas'].length > 0
                            ).length || 0} eventos
                          </p>
                        </div>
                      </div>
                      <div className="mt-6 p-6 bg-gradient-to-r from-slate-100 via-gray-100 to-slate-100 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center">
                            <span className="text-2xl mr-2">📊</span>
                            <span className="font-bold text-gray-800 text-lg">Total Bolsas Consumidas:</span>
                          </div>
                          <span className="font-bold text-2xl text-slate-800 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-300">
                            {(() => {
                              // Sumar TODAS las salidas de inoculación directamente
                              return selectedLoteInfo.salidas?.reduce((total, salida) => total + (salida.fields['Cantidad Bolsas'] || 0), 0) || 0;
                            })()} bolsas
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <span className="text-2xl mr-2">✅</span>
                            <span className="font-bold text-gray-800 text-lg">Bolsas Disponibles:</span>
                          </div>
                          <span className="font-bold text-2xl text-green-700 bg-green-50 px-4 py-2 rounded-lg shadow-sm border border-green-200">
                            {selectedLoteInfo.inoculacion.fields['Cantidad Actual Bolsas'] || 0} bolsas
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Detalle de Todas las Salidas */}
                    {selectedLoteInfo.salidas && selectedLoteInfo.salidas.length > 0 && (
                      <div className="bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 rounded-lg sm:rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 sm:mb-6 flex items-center">
                          <div className="bg-gradient-to-r from-slate-600 to-gray-700 rounded-full p-1 sm:p-2 mr-2 sm:mr-3 flex-shrink-0">
                            <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <span className="truncate">📋 <span className="hidden sm:inline">Detalle de Todas las </span>Salidas ({selectedLoteInfo.salidas.length})</span>
                        </h3>
                        <div className="overflow-x-auto shadow-sm rounded-lg border border-slate-200">
                          <table className="min-w-full bg-white rounded-lg">
                            <thead className="bg-gradient-to-r from-slate-100 to-gray-100">
                              <tr>
                                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">📅 Fecha</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider">📦 <span className="hidden sm:inline">Cantidad</span></th>
                                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider hidden sm:table-cell">🎯 Propósito</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-slate-800 uppercase tracking-wider hidden lg:table-cell">👤 Responsable</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {selectedLoteInfo.salidas.map((salida, index) => {
                                // Determinar el propósito basado en los campos de relación de la salida
                                let proposito = 'Sin categorizar';
                                let propositoColor = 'text-gray-800 bg-gray-100 border-gray-300';
                                
                                if (salida.fields['Descartes'] && salida.fields['Descartes'].length > 0) {
                                  proposito = 'Descarte';
                                  propositoColor = 'text-red-800 bg-red-100 border-red-300';
                                } else if (salida.fields['Cosecha Laboratorio'] && salida.fields['Cosecha Laboratorio'].length > 0) {
                                  proposito = 'Cosecha';
                                  propositoColor = 'text-green-800 bg-green-100 border-green-300';
                                } else if (salida.fields['Cepas'] && salida.fields['Cepas'].length > 0) {
                                  proposito = 'Producción de Cepas';
                                  propositoColor = 'text-amber-800 bg-amber-100 border-amber-300';
                                }
                                
                                return (
                                  <tr key={index} className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-gray-50 transition-all duration-200">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                      {salida.fields['Fecha Evento'] ? new Date(salida.fields['Fecha Evento']).toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                      }) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                      <span className="font-bold text-slate-700 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                                        {salida.fields['Cantidad Bolsas'] || 0} bolsas
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full border ${propositoColor}`}>
                                        {proposito}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{salida.fields['Realiza Registro'] || '-'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Información del Microorganismo */}
                    {selectedLoteInfo.microorganismo && (
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                          </svg>
                          Detalles del Microorganismo
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="bg-white p-3 rounded border">
                            <p className="font-medium text-gray-600">Microorganismo</p>
                            <p className="font-semibold text-gray-900">{selectedLoteInfo.microorganismo.fields['Microorganismo'] || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <p className="font-medium text-gray-600">Tipo Microorganismo</p>
                            <p className="font-semibold text-gray-900">{selectedLoteInfo.microorganismo.fields['Tipo Microorganismo'] || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <p className="font-medium text-gray-600">Bolsas por Lote</p>
                            <p className="font-semibold text-gray-900">{selectedLoteInfo.microorganismo.fields['Bolsas/Lote'] || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <p className="font-medium text-gray-600">Días de Incubación</p>
                            <p className="font-semibold text-gray-900">{selectedLoteInfo.microorganismo.fields['Dias/Incubacion'] || 'N/A'}</p>
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <p className="font-medium text-gray-600">Tiempo de Producción</p>
                            <p className="font-semibold text-gray-900">{selectedLoteInfo.microorganismo.fields['Tiempo producción'] || 'N/A'} días</p>
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <p className="font-medium text-gray-600">Abreviatura</p>
                            <p className="font-semibold text-gray-900">{selectedLoteInfo.microorganismo.fields['Abreviaturas'] || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Equipo Utilizado */}
                    {selectedLoteInfo.responsables && selectedLoteInfo.responsables.length > 0 && (
                      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                          </svg>
                          Equipo de Laboratorio Utilizado ({selectedLoteInfo.responsables.length} items)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {selectedLoteInfo.responsables.map((equipo, index) => (
                            <div key={index} className="bg-white p-3 rounded border hover:shadow-sm transition-shadow">
                              <p className="font-medium text-gray-800">{equipo.fields['Nombre'] || 'Sin nombre'}</p>
                              <p className="text-sm text-gray-600">{equipo.fields['Estado Usuario'] || 'Estado no especificado'}</p>
                              {equipo.fields['Cedula'] && <p className="text-xs text-gray-500">Cédula: {equipo.fields['Cedula']}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cepas Utilizadas */}
                    {selectedLoteInfo.cepasUtilizadas && selectedLoteInfo.cepasUtilizadas.length > 0 && (
                      <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 rounded-2xl p-6 border border-indigo-200 shadow-sm">
                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                          <div className="bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full p-2 mr-3">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m3 0V2a1 1 0 00-1-1H6a1 1 0 00-1 1v2m0 0h14l-2 13.236A2 2 0 0115.131 19H8.869a2 2 0 01-1.869-1.764L5 5z" />
                            </svg>
                          </div>
                          🧪 Cepas Utilizadas ({selectedLoteInfo.cepasUtilizadas.length} registros)
                        </h3>
                        <div className="overflow-x-auto shadow-sm rounded-lg border border-indigo-200">
                          <table className="min-w-full bg-white rounded-lg">
                            <thead className="bg-gradient-to-r from-indigo-100 to-blue-100">
                              <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-indigo-800 uppercase tracking-wider">📅 Fecha</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-indigo-800 uppercase tracking-wider">📦 Cantidad</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-indigo-800 uppercase tracking-wider">👤 Responsable</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-indigo-800 uppercase tracking-wider">📝 Observaciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-indigo-100">
                              {selectedLoteInfo.cepasUtilizadas.map((cepa, index) => (
                                <tr key={index} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 transition-all duration-200">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {cepa.fields['Fecha Evento'] ? new Date(cepa.fields['Fecha Evento']).toLocaleDateString('es-ES', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric'
                                    }) : '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                                      {cepa.fields['Cantidad Bolsas'] || 0} bolsas
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{cepa.fields['Realiza Registro'] || '-'}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">-</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Insumos Consumidos */}
                    {selectedLoteInfo.insumosConsumidos && selectedLoteInfo.insumosConsumidos.length > 0 && (
                      <div className="bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 rounded-2xl p-6 border border-teal-200 shadow-sm">
                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                          <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full p-2 mr-3">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          📦 Insumos Consumidos ({selectedLoteInfo.insumosConsumidos.length} registros)
                        </h3>
                        <div className="overflow-x-auto shadow-sm rounded-lg border border-teal-200">
                          <table className="min-w-full bg-white rounded-lg">
                            <thead className="bg-gradient-to-r from-teal-100 to-cyan-100">
                              <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-teal-800 uppercase tracking-wider">📅 Fecha</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-teal-800 uppercase tracking-wider">🧪 Insumo</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-teal-800 uppercase tracking-wider">📊 Cantidad</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-teal-800 uppercase tracking-wider">👤 Responsable</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-teal-800 uppercase tracking-wider">📝 Motivo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-teal-100">
                              {selectedLoteInfo.insumosConsumidos.map((insumo, index) => (
                                <tr key={index} className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 transition-all duration-200">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {insumo.fields['Fecha Evento'] ? new Date(insumo.fields['Fecha Evento']).toLocaleDateString('es-ES', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric'
                                    }) : '-'}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-medium text-teal-700 max-w-xs">
                                    <div className="truncate" title={insumo.fields['nombre (from Insumos Laboratorio)']?.[0]}>
                                      {insumo.fields['nombre (from Insumos Laboratorio)']?.[0] || '-'}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className="font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                                      {insumo.fields['Cantidad Salida Unidades'] || 0} unidades
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{insumo.fields['Realiza Registro'] || '-'}</td>
                                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                                    <div className="truncate" title={insumo.fields['Nombre Evento']}>
                                      {insumo.fields['Nombre Evento'] || '-'}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Descartes de Bolsas */}
                    {selectedLoteInfo.descartes && selectedLoteInfo.descartes.length > 0 && (
                      <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Bolsas Descartadas ({selectedLoteInfo.descartes.length} eventos)
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full bg-white rounded border">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Fecha</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Cantidad</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Motivo</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Responsable</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedLoteInfo.descartes.map((descarte, index) => (
                                <tr key={index} className="border-t hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm">{descarte.fields['Fecha Evento'] || '-'}</td>
                                  <td className="px-4 py-2 text-sm font-medium text-red-600">{descarte.fields['Cantidad Bolsas Descartadas'] || 0} bolsas</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{descarte.fields['Motivo'] || '-'}</td>
                                  <td className="px-4 py-2 text-sm">{descarte.fields['Realiza Registro'] || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Cosechas del Lote */}
                    {selectedLoteInfo.cosechas && selectedLoteInfo.cosechas.length > 0 && (
                      <div className="bg-gradient-to-r from-green-50 to-lime-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Cosechas Realizadas ({selectedLoteInfo.cosechas.length} eventos)
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full bg-white rounded border">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Cliente</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Microorganismo</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Bolsas</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Litros</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Bidones</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Responsable</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedLoteInfo.cosechas.map((cosecha, index) => (
                                <tr key={index} className="border-t hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm font-medium">{cosecha.fields['Nombre (from Cliente)']?.[0] || '-'}</td>
                                  <td className="px-4 py-2 text-sm">{cosecha.fields['Microorganismo (from Microorganismos)']?.[0] || '-'}</td>
                                  <td className="px-4 py-2 text-sm font-medium text-green-600">{cosecha.fields['Total Bolsas'] || 0} bolsas</td>
                                  <td className="px-4 py-2 text-sm">{cosecha.fields['Litros'] || 0}L</td>
                                  <td className="px-4 py-2 text-sm">{cosecha.fields['Bidones'] || 0}</td>
                                  <td className="px-4 py-2 text-sm">{cosecha.fields['Realiza Registro'] || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Cepas Producidas */}
                    {selectedLoteInfo.cepasProducidas && selectedLoteInfo.cepasProducidas.length > 0 && (
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                          </svg>
                          Cepas Producidas ({selectedLoteInfo.cepasProducidas.length} cepas)
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full bg-white rounded border">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Código Cepa</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Fecha</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Microorganismo</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Bolsas Usadas</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Tipo</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Responsable</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedLoteInfo.cepasProducidas.map((cepa, index) => (
                                <tr key={index} className="border-t hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm font-mono text-blue-600">{cepa.fields['Codigo Cepa'] || '-'}</td>
                                  <td className="px-4 py-2 text-sm">{cepa.fields['Fecha Creacion'] || '-'}</td>
                                  <td className="px-4 py-2 text-sm">{cepa.fields['Microorganismo (from Microorganismos)']?.[0] || '-'}</td>
                                  <td className="px-4 py-2 text-sm font-medium text-amber-600">{cepa.fields['Cantidad Bolsas'] || 0} bolsas</td>
                                  <td className="px-4 py-2 text-sm">
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                      cepa.fields['Tipo Cepa'] === 'Produccion - Inoculacion' ? 'bg-green-100 text-green-800' :
                                      cepa.fields['Tipo Cepa'] === 'Adquirida - Comprada' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {cepa.fields['Tipo Cepa'] || 'N/A'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-sm">{cepa.fields['Realiza Registro'] || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Mensaje si no hay información adicional */}
                    {(!selectedLoteInfo.salidas || selectedLoteInfo.salidas.length === 0) &&
                     (!selectedLoteInfo.microorganismo) &&
                     (!selectedLoteInfo.responsables || selectedLoteInfo.responsables.length === 0) &&
                     (!selectedLoteInfo.cepasUtilizadas || selectedLoteInfo.cepasUtilizadas.length === 0) &&
                     (!selectedLoteInfo.insumosConsumidos || selectedLoteInfo.insumosConsumidos.length === 0) &&
                     (!selectedLoteInfo.descartes || selectedLoteInfo.descartes.length === 0) &&
                     (!selectedLoteInfo.cosechas || selectedLoteInfo.cosechas.length === 0) &&
                     (!selectedLoteInfo.cepasProducidas || selectedLoteInfo.cepasProducidas.length === 0) && (
                      <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <p className="text-gray-600">No se encontró información adicional para este lote.</p>
                        <p className="text-sm text-gray-500 mt-1">Solo se muestra la información básica disponible.</p>
                      </div>
                    )}
                  </div>

                  <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 rounded-b-lg flex justify-end">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 sm:px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}