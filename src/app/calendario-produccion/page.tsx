'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface ProduccionEvento {
  id: string;
  titulo: string;
  tipo: 'inoculacion' | 'cosecha' | 'formulacion' | 'entrega' | 'mantenimiento';
  fecha: string;
  descripcion: string;
  responsable?: string;
  estado: 'planificado' | 'en-proceso' | 'completado' | 'cancelado';
  prioridad: 'baja' | 'media' | 'alta';
  cliente?: string;
  microorganismo?: string;
  litros?: number;
}

interface Cliente {
  id: string;
  nombre: string;
  nit: string;
  ciudad: string;
  departamento: string;
}

interface Microorganismo {
  id: string;
  nombre: string;
  tipo?: string;
}

interface CalendarioStats {
  totalEventos: number;
  eventosPendientes: number;
  eventosEnProceso: number;
  eventosCompletados: number;
  eventosPrioridadAlta: number;
}

const tiposEvento = [
  { value: 'inoculacion', label: 'Inoculación', emoji: '🧫', color: 'bg-blue-500' },
  { value: 'cosecha', label: 'Cosecha', emoji: '🧪', color: 'bg-green-500' },
  { value: 'formulacion', label: 'Formulación', emoji: '🧮', color: 'bg-purple-500' },
  { value: 'entrega', label: 'Entrega', emoji: '📦', color: 'bg-orange-500' },
  { value: 'mantenimiento', label: 'Mantenimiento', emoji: '�', color: 'bg-gray-500' },
];

const estadosEvento = [
  { value: 'planificado', label: 'Planificado', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'en-proceso', label: 'En Proceso', color: 'bg-blue-100 text-blue-800' },
  { value: 'completado', label: 'Completado', color: 'bg-green-100 text-green-800' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-800' },
];

const prioridades = [
  { value: 'baja', label: 'Baja', color: 'bg-gray-100 text-gray-800' },
  { value: 'media', label: 'Media', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'alta', label: 'Alta', color: 'bg-red-100 text-red-800' },
];

export default function CalendarioProduccionPage() {
  const { user } = useAuth();
  const [eventos, setEventos] = useState<ProduccionEvento[]>([]);
  const [filteredEventos, setFilteredEventos] = useState<ProduccionEvento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [microorganismos, setMicroorganismos] = useState<Microorganismo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingMicroorganismos, setLoadingMicroorganismos] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [vistaActual, setVistaActual] = useState<'mes' | 'semana' | 'lista'>('mes');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState<ProduccionEvento | null>(null);
  const [stats, setStats] = useState<CalendarioStats>({
    totalEventos: 0,
    eventosPendientes: 0,
    eventosEnProceso: 0,
    eventosCompletados: 0,
    eventosPrioridadAlta: 0,
  });

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'inoculacion' as ProduccionEvento['tipo'],
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
    cliente: '',
    microorganismo: '',
    litros: 0,
  });

  // Search states for dropdowns
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);

  useEffect(() => {
    fetchEventos();
    fetchClientes();
    fetchMicroorganismos();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [eventos, filtroTipo, filtroEstado, filtroPrioridad, searchTerm]);

  // Filter clientes based on search input
  useEffect(() => {
    if (clienteSearch.trim() === '') {
      setFilteredClientes(clientes);
    } else {
      const search = clienteSearch.toLowerCase();
      const filtered = clientes.filter(cliente => 
        cliente.nombre.toLowerCase().includes(search) ||
        cliente.ciudad?.toLowerCase().includes(search) ||
        cliente.nit?.toLowerCase().includes(search)
      );
      setFilteredClientes(filtered);
    }
  }, [clienteSearch, clientes]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.cliente-dropdown-container')) {
        setShowClienteDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchClientes = async () => {
    setLoadingClientes(true);
    try {
      const response = await fetch('/api/clientes-core');
      const data = await response.json();
      
      if (data.success) {
        setClientes(data.clientes || []);
      } else {
        console.error('Error loading clientes:', data.error);
      }
    } catch (error) {
      console.error('Error fetching clientes:', error);
    } finally {
      setLoadingClientes(false);
    }
  };
  const fetchMicroorganismos = async () => {
    setLoadingMicroorganismos(true);
    try {
      const response = await fetch('/api/microorganismos');
      const data = await response.json();
      
      if (data.success) {
        setMicroorganismos(data.microorganismos || []);
      } else {
        console.error('Error loading microorganismos:', data.error);
      }
    } catch (error) {
      console.error('Error fetching microorganismos:', error);
    } finally {
      setLoadingMicroorganismos(false);
    }
  };
  const fetchEventos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/calendario-produccion');
      const data = await response.json();
      
      if (data.success) {
        setEventos(data.eventos || []);
        calculateStats(data.eventos || []);
      }
    } catch (error) {
      console.error('Error fetching eventos:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (eventos: ProduccionEvento[]) => {
    setStats({
      totalEventos: eventos.length,
      eventosPendientes: eventos.filter(e => e.estado === 'planificado').length,
      eventosEnProceso: eventos.filter(e => e.estado === 'en-proceso').length,
      eventosCompletados: eventos.filter(e => e.estado === 'completado').length,
      eventosPrioridadAlta: eventos.filter(e => e.prioridad === 'alta').length,
    });
  };

  const applyFilters = () => {
    let filtered = [...eventos];

    if (filtroTipo !== 'todos') {
      filtered = filtered.filter(e => e.tipo === filtroTipo);
    }

    if (filtroEstado !== 'todos') {
      filtered = filtered.filter(e => e.estado === filtroEstado);
    }

    if (filtroPrioridad !== 'todos') {
      filtered = filtered.filter(e => e.prioridad === filtroPrioridad);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e => 
        e.titulo.toLowerCase().includes(term) ||
        e.descripcion.toLowerCase().includes(term) ||
        e.cliente?.toLowerCase().includes(term) ||
        e.microorganismo?.toLowerCase().includes(term)
      );
    }

    setFilteredEventos(filtered);
  };

  const handleAddEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/calendario-produccion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        fetchEventos();
        setShowAddModal(false);
        resetForm();
      } else {
        alert('Error al crear evento: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating evento:', error);
      alert('Error al crear evento');
    }
  };

  const handleUpdateEvento = async (eventoId: string, updates: Partial<ProduccionEvento>) => {
    try {
      const response = await fetch('/api/calendario-produccion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventoId, ...updates }),
      });

      const data = await response.json();
      
      if (data.success) {
        fetchEventos();
      }
    } catch (error) {
      console.error('Error updating evento:', error);
    }
  };

  const handleDeleteEvento = async (eventoId: string) => {
    if (!confirm('¿Estás seguro de eliminar este evento?')) return;

    try {
      const response = await fetch(`/api/calendario-produccion?id=${eventoId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        fetchEventos();
      }
    } catch (error) {
      console.error('Error deleting evento:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      tipo: 'inoculacion',
      fecha: new Date().toISOString().split('T')[0],
      descripcion: '',
      cliente: '',
      microorganismo: '',
      litros: 0,
    });
    setClienteSearch('');
    setShowClienteDropdown(false);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Días del mes anterior
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonthDay = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push({ date: prevMonthDay, isCurrentMonth: false });
    }

    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Días del próximo mes
    const remainingDays = 42 - days.length; // 6 semanas completas
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  };

  const getEventosForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredEventos.filter(e => e.fecha === dateStr);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const getTipoEvento = (tipo: string) => {
    return tiposEvento.find(t => t.value === tipo) || tiposEvento[0];
  };

  const getEstadoEvento = (estado: string) => {
    return estadosEvento.find(e => e.value === estado) || estadosEvento[0];
  };

  const getPrioridad = (prioridad: string) => {
    return prioridades.find(p => p.value === prioridad) || prioridades[1];
  };

  return (
    <>
      <Navbar />
      <div 
        className="min-h-screen relative pt-40 pb-12"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 bg-white rounded-lg shadow-lg p-6 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              📅 Calendario de Producción
            </h1>
            <p className="text-gray-600">
              Planifica y gestiona todos los eventos de producción del laboratorio
            </p>
          </div>

          {/* Calendar View */}
          {vistaActual === 'mes' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={previousMonth}
                  className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-all shadow-md font-medium"
                >
                  ← Anterior
                </button>
                
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                  </h2>
                  <button
                    onClick={goToToday}
                    className="text-sm text-blue-600 hover:text-blue-700 mt-1 font-medium"
                  >
                    Ir a hoy
                  </button>
                </div>
                
                <button
                  onClick={nextMonth}
                  className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-all shadow-md font-medium"
                >
                  Siguiente →
                </button>
              </div>

              {/* Days of Week */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                  <div key={day} className="text-center font-semibold text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {getDaysInMonth(currentMonth).map((day, index) => {
                  const dayEventos = getEventosForDate(day.date);
                  const isToday = day.date.toDateString() === new Date().toDateString();
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[120px] p-2 border rounded-lg transition-all cursor-pointer hover:shadow-md hover:ring-2 hover:ring-blue-300 ${
                        day.isCurrentMonth
                          ? 'bg-white border-gray-200'
                          : 'bg-gray-50 border-gray-100'
                      } ${isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                      onClick={() => {
                        setSelectedDate(day.date);
                        setFormData({
                          ...formData,
                          fecha: day.date.toISOString().split('T')[0]
                        });
                        setShowAddModal(true);
                      }}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      } ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                        {day.date.getDate()}
                      </div>
                      
                      <div className="space-y-1">
                        {dayEventos.slice(0, 3).map(evento => {
                          const tipo = getTipoEvento(evento.tipo);
                          return (
                            <div
                              key={evento.id}
                              className={`text-xs px-2 py-1 rounded ${tipo.color} text-white truncate`}
                              title={evento.titulo}
                            >
                              {tipo.emoji} {evento.titulo}
                            </div>
                          );
                        })}
                        {dayEventos.length > 3 && (
                          <div className="text-xs text-gray-500 px-2">
                            +{dayEventos.length - 3} más
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* List View */}
          {vistaActual === 'lista' && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Evento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prioridad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Responsable
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="flex justify-center items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                          </div>
                        </td>
                      </tr>
                    ) : filteredEventos.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          No hay eventos programados
                        </td>
                      </tr>
                    ) : (
                      filteredEventos
                        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                        .map(evento => {
                          const tipo = getTipoEvento(evento.tipo);
                          const estado = getEstadoEvento(evento.estado);
                          const prioridad = getPrioridad(evento.prioridad);
                          
                          return (
                            <tr key={evento.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(evento.fecha)}
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">{evento.titulo}</div>
                                <div className="text-sm text-gray-500">{evento.descripcion}</div>
                                {evento.cliente && (
                                  <div className="text-xs text-gray-400 mt-1">Cliente: {evento.cliente}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${tipo.color} text-white`}>
                                  {tipo.emoji} {tipo.label}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${estado.color}`}>
                                  {estado.label}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${prioridad.color}`}>
                                  {prioridad.label}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {evento.responsable}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => setSelectedEvento(evento)}
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                >
                                  Ver
                                </button>
                                <button
                                  onClick={() => handleDeleteEvento(evento.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Add Event Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Agregar Evento</h2>
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleAddEvento} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Título del Evento *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.titulo}
                        onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                        placeholder="Ej: Inoculación lote 001"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo de Evento *
                        </label>
                        <select
                          required
                          value={formData.tipo}
                          onChange={(e) => setFormData({ ...formData, tipo: e.target.value as ProduccionEvento['tipo'] })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                        >
                          {tiposEvento.map(tipo => (
                            <option key={tipo.value} value={tipo.value}>
                              {tipo.emoji} {tipo.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fecha *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.fecha}
                          onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción
                      </label>
                      <textarea
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                        placeholder="Detalles adicionales del evento..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cliente
                        </label>
                        {loadingClientes ? (
                          <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                            Cargando clientes...
                          </div>
                        ) : (
                          <div className="relative cliente-dropdown-container">
                            <input
                              type="text"
                              value={clienteSearch}
                              onChange={(e) => {
                                setClienteSearch(e.target.value);
                                setShowClienteDropdown(true);
                              }}
                              onFocus={() => setShowClienteDropdown(true)}
                              placeholder="Buscar cliente..."
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black placeholder:text-black"
                            />
                            {showClienteDropdown && filteredClientes.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filteredClientes.map((cliente) => (
                                  <div
                                    key={cliente.id}
                                    onClick={() => {
                                      setFormData({ ...formData, cliente: cliente.nombre });
                                      setClienteSearch(cliente.nombre);
                                      setShowClienteDropdown(false);
                                    }}
                                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                  >
                                    <div className="font-medium text-gray-900">{cliente.nombre}</div>
                                    <div className="text-xs text-gray-500">{cliente.ciudad} - NIT: {cliente.nit}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Microorganismo
                        </label>
                        {loadingMicroorganismos ? (
                          <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                            Cargando microorganismos...
                          </div>
                        ) : (
                          <select
                            value={formData.microorganismo}
                            onChange={(e) => setFormData({ ...formData, microorganismo: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                          >
                            <option value="" className="text-gray-400">Seleccionar microorganismo...</option>
                            {microorganismos.map((micro) => (
                              <option key={micro.id} value={micro.nombre}>
                                {micro.nombre} {micro.tipo ? `(${micro.tipo})` : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Litros
                        </label>
                        <input
                          type="number"
                          value={formData.litros}
                          onChange={(e) => setFormData({ ...formData, litros: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                          placeholder="Cantidad en litros"
                          min="0"
                          step="0.1"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                      >
                        Crear Evento
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Event Detail Modal */}
          {selectedEvento && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedEvento.titulo}</h2>
                      <div className="flex gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getTipoEvento(selectedEvento.tipo).color} text-white`}>
                          {getTipoEvento(selectedEvento.tipo).emoji} {getTipoEvento(selectedEvento.tipo).label}
                        </span>
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getEstadoEvento(selectedEvento.estado).color}`}>
                          {getEstadoEvento(selectedEvento.estado).label}
                        </span>
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getPrioridad(selectedEvento.prioridad).color}`}>
                          {getPrioridad(selectedEvento.prioridad).label}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedEvento(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Fecha</label>
                      <p className="text-gray-900">{formatDate(selectedEvento.fecha)}</p>
                    </div>

                    {selectedEvento.descripcion && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Descripción</label>
                        <p className="text-gray-900">{selectedEvento.descripcion}</p>
                      </div>
                    )}

                    {selectedEvento.responsable && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Responsable</label>
                        <p className="text-gray-900">{selectedEvento.responsable}</p>
                      </div>
                    )}

                    {selectedEvento.cliente && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Cliente</label>
                        <p className="text-gray-900">{selectedEvento.cliente}</p>
                      </div>
                    )}

                    {selectedEvento.microorganismo && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Microorganismo</label>
                        <p className="text-gray-900">{selectedEvento.microorganismo}</p>
                      </div>
                    )}

                    {selectedEvento.litros && selectedEvento.litros > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Litros</label>
                        <p className="text-gray-900">{selectedEvento.litros} L</p>
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Cambiar Estado</label>
                      <div className="flex gap-2 flex-wrap">
                        {estadosEvento.map(estado => (
                          <button
                            key={estado.value}
                            onClick={() => {
                              handleUpdateEvento(selectedEvento.id, { estado: estado.value as ProduccionEvento['estado'] });
                              setSelectedEvento({ ...selectedEvento, estado: estado.value as ProduccionEvento['estado'] });
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              selectedEvento.estado === estado.value
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {estado.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 pt-4 border-t">
                    <button
                      onClick={() => setSelectedEvento(null)}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                    >
                      Cerrar
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteEvento(selectedEvento.id);
                        setSelectedEvento(null);
                      }}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
