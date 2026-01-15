'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LoteSelector from '@/components/LoteSelector';

interface ProduccionEvento {
  id: string;
  tipo: 'inoculacion' | 'cosecha' | 'formulacion' | 'entrega' | 'mantenimiento';
  fecha: string;
  responsable?: string;
  estado: 'planificado' | 'en-proceso' | 'completado' | 'cancelado';
  prioridad: 'baja' | 'media' | 'alta';
  cliente?: string;
  microorganismo?: string;
  litros?: number;
}

interface Cliente {
  id: string;
  airtableId: string;
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
  { value: 'mantenimiento', label: 'Mantenimiento', emoji: '🔧', color: 'bg-gray-500' },
];

// Configuración de microorganismos predeterminados por tipo de aplicación (usando nombres para mapear con la base de datos)
const microorganismosPredeterminados = {
  'preventivo-pc': [
    { nombre: 'Trichoderma harzianum', dosificacionPorHa: 1.0, unidad: 'L/Ha' },
    { nombre: 'Siriusbacter', dosificacionPorHa: 1.0, unidad: 'L/Ha' }
  ],
  'preventivo-control-plagas': [
    { nombre: 'Beauveria bassiana', dosificacionPorHa: 1.0, unidad: 'L/Ha' },
    { nombre: 'Bacillus thuringiensis', dosificacionPorHa: 0.5, unidad: 'L/Ha' }
  ],
  'control-ml': [
    { nombre: 'Purpureocillium lilacinum', dosificacionPorHa: 0.5, unidad: 'L/Ha' },
    { nombre: 'Beauveria bassiana', dosificacionPorHa: 0.5, unidad: 'L/Ha' },
    { nombre: 'Metarhizium anisopliae', dosificacionPorHa: 0.5, unidad: 'L/Ha' }
  ],
  'prevencion-pestalotiopsis': [
    { nombre: 'Trichoderma harzianum', dosificacionPorHa: 1.0, unidad: 'L/Ha' }
  ]
};

// Configuración de aplicaciones por año según el tipo
const aplicacionesPorAno = {
  'preventivo-pc': 4,
  'preventivo-control-plagas': 3,
  'control-ml': 6,
  'prevencion-pestalotiopsis': 2
};

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
    tipo: 'inoculacion' as ProduccionEvento['tipo'],
    tipoAplicacion: 'preventivo-pc',
    cantidadAplicacionesAno: 4,
    periodicidadMeses: 3,  // Cada cuántos meses
    fechasCalculadas: [] as string[], // Fechas calculadas automáticamente
    fechaInicio: '', // Primera fecha de aplicación
    periodo: 90, // Periodo en días (referencia)
    cliente: '',
    microorganismos: [] as {id: string, nombre: string, dosificacionPorHa: number, unidad: string}[],
    litros: 0,
  });

  // Lotes selection states
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [lotesSeleccionados, setLotesSeleccionados] = useState<string[]>([]);

  // Handler para cambiar fecha de inicio
  const handleFechaChange = useCallback((nuevaFecha: string) => {
    setFormData(prev => {
      const updated = { ...prev, fechaInicio: nuevaFecha };
      return updated;
    });
  }, []);

  // Handler para seleccionar fecha del calendario (con opción de modal)
  const handleCalendarDateSelect = useCallback((date: Date, openModal: boolean = false) => {
    const fechaFormateada = date.toISOString().split('T')[0];
    setSelectedDate(date);
    handleFechaChange(fechaFormateada);
    if (openModal) {
      // Pasar la fecha seleccionada al modal
      openAddModal(undefined, fechaFormateada);
    }
  }, [handleFechaChange]);

  // Función para calcular fechas de aplicación flexibles
  const calcularFechasAplicacion = (fechaInicio: string, numeroAplicaciones: number, periodoMeses: number): string[] => {
    // Validar que la fecha de inicio no esté vacía
    if (!fechaInicio || fechaInicio.trim() === '') {
      return [];
    }
    
    const fechas: string[] = [];
    
    // Parsear la fecha YYYY-MM-DD correctamente
    const [yearStr, monthStr, dayStr] = fechaInicio.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr); // Mes 1-12
    const day = parseInt(dayStr);
    
    // Validar componentes
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return [];
    }
    
    for (let i = 0; i < numeroAplicaciones; i++) {
      let nuevoAño = year;
      let nuevoMes = month;
      
      if (i === 0) {
        // Primera aplicación: usar exactamente la fecha de inicio
        nuevoAño = year;
        nuevoMes = month;
      } else {
        // Aplicaciones siguientes: calcular basándose en la periodicidad
        nuevoMes = month + (i * periodoMeses);
        
        // Ajustar año si el mes se pasa de 12
        while (nuevoMes > 12) {
          nuevoMes -= 12;
          nuevoAño += 1;
        }
        
        // Para aplicaciones trimestrales (4 al año), ajustar la 4ta aplicación a diciembre
        if (i === 3 && numeroAplicaciones === 4 && periodoMeses === 3) {
          nuevoMes = 12; // Diciembre
        }
      }
      
      // Formatear directamente sin crear objetos Date
      const yearFinal = String(nuevoAño);
      const monthFinal = String(nuevoMes).padStart(2, '0');
      const dayFinal = String(day).padStart(2, '0');
      
      fechas.push(`${yearFinal}-${monthFinal}-${dayFinal}`);
    }
    
    return fechas;
  };

  // Función para limpiar el formulario
  const limpiarFormulario = () => {
    setFormData({
      tipo: 'inoculacion' as ProduccionEvento['tipo'],
      tipoAplicacion: 'preventivo-pc',
      cantidadAplicacionesAno: 4,
      periodicidadMeses: 3,
      fechasCalculadas: [],
      fechaInicio: '',
      periodo: 90,
      cliente: '',
      microorganismos: [],
      litros: 0,
    });
    setClienteSearch('');
    setSelectedClienteId('');
    setLotesSeleccionados([]);
    setShowClienteDropdown(false);
  };

  // Función para cerrar modal
  const cerrarModal = () => {
    setShowAddModal(false);
    limpiarFormulario();
  };

  // Search states for dropdowns
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);

  useEffect(() => {
    fetchEventos();
    fetchClientes();
    fetchMicroorganismos();
  }, []);

  // Inicializar microorganismos predeterminados al cargar el componente
  useEffect(() => {
    // Esperar a que se carguen los microorganismos de la base de datos antes de configurar los predeterminados
    if (microorganismos.length > 0) {
      const configDefault = microorganismosPredeterminados[formData.tipoAplicacion as keyof typeof microorganismosPredeterminados] || [];
      const aplicacionesDefault = aplicacionesPorAno[formData.tipoAplicacion as keyof typeof aplicacionesPorAno] || 1;
      const fechas = calcularFechasAplicacion(formData.fechaInicio, formData.cantidadAplicacionesAno, formData.periodicidadMeses);
      
      // Mapear los microorganismos predeterminados con los de la base de datos
      const microorganismosDefault = configDefault.map(config => {
        const microFromDB = microorganismos.find(m => 
          m.nombre.toLowerCase().includes(config.nombre.split(' ')[0].toLowerCase())
        );
        
        return {
          id: microFromDB?.id || 'custom',
          nombre: config.nombre,
          dosificacionPorHa: config.dosificacionPorHa,
          unidad: config.unidad
        };
      });
      
      setFormData(prev => ({
        ...prev,
        microorganismos: microorganismosDefault,
        cantidadAplicacionesAno: aplicacionesDefault,
        fechasCalculadas: fechas
      }));
    }
  }, [microorganismos, formData.tipoAplicacion]); // Depende de microorganismos y tipoAplicacion

  // Recalcular fechas automáticamente cuando cambien los parámetros
  useEffect(() => {
    const fechas = calcularFechasAplicacion(formData.fechaInicio, formData.cantidadAplicacionesAno, formData.periodicidadMeses);
    setFormData(prev => ({
      ...prev,
      fechasCalculadas: fechas
    }));
  }, [formData.fechaInicio, formData.cantidadAplicacionesAno, formData.periodicidadMeses]);

  // Sincronizar selectedDate cuando se cambie la fecha de inicio del formulario
  useEffect(() => {
    if (formData.fechaInicio) {
      const fechaObj = new Date(formData.fechaInicio);
      if (!isNaN(fechaObj.getTime())) {
        setSelectedDate(fechaObj);
      }
    }
  }, [formData.fechaInicio]);

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

  // Actualizar microorganismos y aplicaciones cuando cambie el tipo de aplicación
  useEffect(() => {
    if (microorganismos.length > 0) {
      const configDefault = microorganismosPredeterminados[formData.tipoAplicacion as keyof typeof microorganismosPredeterminados] || [];
      const aplicacionesDefault = aplicacionesPorAno[formData.tipoAplicacion as keyof typeof aplicacionesPorAno] || 1;
      const fechasCalculadas = calcularFechasAplicacion(formData.fechaInicio, formData.cantidadAplicacionesAno, formData.periodicidadMeses);
      
      // Mapear los microorganismos predeterminados con los de la base de datos
      const microorganismosDefault = configDefault.map(config => {
        const microFromDB = microorganismos.find(m => 
          m.nombre.toLowerCase().includes(config.nombre.split(' ')[0].toLowerCase())
        );
        
        return {
          id: microFromDB?.id || 'custom',
          nombre: config.nombre,
          dosificacionPorHa: config.dosificacionPorHa,
          unidad: config.unidad
        };
      });
      
      setFormData(prev => ({
        ...prev,
        microorganismos: microorganismosDefault,
        cantidadAplicacionesAno: aplicacionesDefault,
        fechasCalculadas: fechasCalculadas
      }));
    }
  }, [formData.tipoAplicacion, microorganismos]);

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
        e.cliente?.toLowerCase().includes(term) ||
        e.microorganismo?.toLowerCase().includes(term) ||
        e.responsable?.toLowerCase().includes(term)
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
      tipo: 'inoculacion',
      tipoAplicacion: 'preventivo-pc',
      cantidadAplicacionesAno: 4,
      periodicidadMeses: 3,
      fechasCalculadas: [],
      fechaInicio: '',
      periodo: 90,
      cliente: '',
      microorganismos: [],
      litros: 0,
    });
    setClienteSearch('');
    setShowClienteDropdown(false);
  };

  const openAddModal = (clienteDefault?: string, fechaDefault?: string) => {
    resetForm();
    if (clienteDefault) {
      setFormData(prev => ({ ...prev, cliente: clienteDefault }));
      setClienteSearch(clienteDefault);
    }
    if (fechaDefault) {
      setFormData(prev => ({ ...prev, fechaInicio: fechaDefault }));
    }
    setShowAddModal(true);
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
                  const isSelectedInForm = formData.fechaInicio && day.date.toISOString().split('T')[0] === formData.fechaInicio;
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[120px] p-2 border rounded-lg transition-all cursor-pointer hover:shadow-md hover:ring-2 hover:ring-blue-300 ${
                        day.isCurrentMonth
                          ? 'bg-white border-gray-200'
                          : 'bg-gray-50 border-gray-100'
                      } ${isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''} ${isSelectedInForm ? 'ring-2 ring-green-500 bg-green-50' : ''}`}
                      onClick={() => handleCalendarDateSelect(day.date, true)}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      } ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                        {day.date.getDate()}
                      </div>
                      
                      <div className="space-y-1">
                        {dayEventos.slice(0, 3).map(evento => {
                          const tipo = getTipoEvento(evento.tipo);
                          const eventTitle = `${tipo.label} - ${evento.cliente || 'Sin cliente'}`;
                          return (
                            <div
                              key={evento.id}
                              className={`text-xs px-2 py-1 rounded ${tipo.color} text-white truncate`}
                              title={eventTitle}
                            >
                              {tipo.emoji} {tipo.label}
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
                              <div className="text-sm font-medium text-gray-900">{getTipoEvento(evento.tipo).label} - {evento.cliente || 'Sin cliente'}</div>
                                <div className="text-sm text-gray-500">{evento.microorganismo || 'Sin microorganismo'} - {evento.responsable || 'Sin responsable'}</div>
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
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                  
                  <div className="relative z-10 flex justify-between items-start">
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold mb-2">Agregar Evento</h2>
                      <p className="text-blue-100">Calendario de Producción</p>
                    </div>
                    <button
                      onClick={cerrarModal}
                      className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200"
                    >
                      <span className="text-2xl font-bold">✕</span>
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="px-8 py-6 overflow-y-auto max-h-[70vh]">
                  <form onSubmit={handleAddEvento} className="space-y-6">
                    {/* Fila 1: Tipo de Aplicación, Cantidad de Aplicaciones y Fecha */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Tipo de Aplicación */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Tipo de Aplicación *
                        </label>
                        <select
                          required
                          value={formData.tipoAplicacion}
                          onChange={(e) => setFormData({ ...formData, tipoAplicacion: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 text-base"
                        >
                          <option value="preventivo-pc">🧪 Preventivo PC</option>
                          <option value="preventivo-control-plagas">🐛 Preventivo y Control de Plagas</option>
                          <option value="control-ml">🔬 Control ML</option>
                          <option value="prevencion-pestalotiopsis">🍄 Prevención de Pestalotiopsis</option>
                        </select>
                      </div>

                      {/* Cantidad de Aplicaciones al Año */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Aplicaciones al año *
                        </label>
                        <select
                          required
                          value={formData.cantidadAplicacionesAno}
                          onChange={(e) => setFormData({ ...formData, cantidadAplicacionesAno: parseInt(e.target.value) })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 text-base"
                        >
                          {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                            <option key={num} value={num}>
                              {num} {num === 1 ? 'aplicación' : 'aplicaciones'} al año
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Fechas de Aplicaciones Programadas */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          📅 Fechas programadas ({formData.cantidadAplicacionesAno} aplicaciones)
                        </label>
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                          {formData.fechasCalculadas.length > 0 ? (
                            <div className="space-y-2">
                              {formData.fechasCalculadas.map((fecha, index) => {
                                // Parsear la fecha manualmente para evitar problemas de zona horaria
                                const [year, month, day] = fecha.split('-');
                                const fechaObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
                                const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
                                  weekday: 'long',
                                  year: 'numeric', 
                                  month: 'long',
                                  day: 'numeric'
                                });
                                
                                // Calcular días hasta la próxima aplicación
                                let diasPeriodo = null;
                                if (index < formData.fechasCalculadas.length - 1) {
                                  const [yearSig, monthSig, daySig] = formData.fechasCalculadas[index + 1].split('-');
                                  const fechaSiguiente = new Date(parseInt(yearSig), parseInt(monthSig) - 1, parseInt(daySig), 12, 0, 0);
                                  const diffTime = fechaSiguiente.getTime() - fechaObj.getTime();
                                  diasPeriodo = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                }
                                
                                return (
                                  <div key={fecha} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                                    <div className="flex items-center space-x-3">
                                      <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                        {index + 1}
                                      </span>
                                      <span className="font-medium text-gray-900 capitalize">
                                        {fechaFormateada}
                                      </span>
                                    </div>
                                    {diasPeriodo && (
                                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                        +{diasPeriodo} días
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-center py-4">
                              Selecciona una fecha de inicio para ver las fechas programadas
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Fecha de inicio */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Fecha de inicio *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.fechaInicio}
                          onChange={(e) => handleFechaChange(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 text-base"
                        />
                      </div>

                      {/* Campo Periodicidad */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Periodicidad (meses)
                        </label>
                        <div className="text-xs text-gray-500 mb-2">
                          Intervalo entre aplicaciones. Ej: 3 meses = Trimestral, 2 meses = Bimestral, 6 meses = Semestral
                        </div>
                        <select
                          value={formData.periodicidadMeses}
                          onChange={(e) => setFormData({ ...formData, periodicidadMeses: parseInt(e.target.value) })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 text-base"
                        >
                          <option value={1}>1 mes (Mensual)</option>
                          <option value={2}>2 meses (Bimestral)</option>
                          <option value={3}>3 meses (Trimestral)</option>
                          <option value={4}>4 meses (Cuatrimestral)</option>
                          <option value={6}>6 meses (Semestral)</option>
                          <option value={12}>12 meses (Anual)</option>
                        </select>
                      </div>
                    </div>

                    {/* Fila 4: Solo Cliente */}
                    <div className="grid grid-cols-1 gap-6">
                      {/* Cliente */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Cliente
                        </label>
                        {loadingClientes ? (
                          <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-base">
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-3"></div>
                              Cargando clientes...
                            </div>
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
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 placeholder-black text-base"
                            />
                            {showClienteDropdown && filteredClientes.length > 0 && (
                              <div className="absolute z-[60] w-full mt-1 bg-white border-2 border-gray-100 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                {filteredClientes.map((cliente) => (
                                  <div
                                    key={cliente.id}
                                    onClick={() => {
                                      setFormData({ ...formData, cliente: cliente.nombre });
                                      setClienteSearch(cliente.nombre);
                                      setSelectedClienteId(cliente.airtableId); // Use airtableId for API calls
                                      setLotesSeleccionados([]); // Limpiar lotes seleccionados
                                      setShowClienteDropdown(false);
                                    }}
                                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                                  >
                                    <div className="font-medium text-gray-900">{cliente.nombre}</div>
                                    <div className="text-sm text-gray-500">{cliente.ciudad} - NIT: {cliente.nit}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sección de Microorganismos Configurables */}
                    <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center">
                          🧬 Microorganismos y Dosificaciones
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            const newMicroorganismo = {
                              id: Date.now().toString(),
                              nombre: 'Nuevo microorganismo',
                              dosificacionPorHa: 1.0,
                              unidad: 'L/Ha'
                            };
                            setFormData(prev => ({
                              ...prev,
                              microorganismos: [...prev.microorganismos, newMicroorganismo]
                            }));
                          }}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          ➕ Agregar microorganismo
                        </button>
                      </div>

                      {formData.microorganismos.length === 0 ? (
                        <div className="text-gray-700 text-center py-8">
                          No hay microorganismos configurados para este tipo de aplicación
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {formData.microorganismos.map((micro, index) => (
                            <div key={micro.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Microorganismo
                                  </label>
                                  <select
                                    value={micro.nombre}
                                    onChange={(e) => {
                                      const newMicroorganismos = [...formData.microorganismos];
                                      newMicroorganismos[index].nombre = e.target.value;
                                      setFormData(prev => ({ ...prev, microorganismos: newMicroorganismos }));
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-700 bg-white"
                                  >
                                    <option value="">Seleccionar microorganismo...</option>
                                    {microorganismos.map((microorganismo) => (
                                      <option key={microorganismo.id} value={microorganismo.nombre}>
                                        {microorganismo.nombre} {microorganismo.tipo ? `(${microorganismo.tipo})` : ''}
                                      </option>
                                    ))}
                                    <option value="custom">🔧 Personalizado...</option>
                                  </select>
                                  {micro.nombre === 'custom' && (
                                    <input
                                      type="text"
                                      placeholder="Escribir microorganismo personalizado..."
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-700 mt-2 placeholder-gray-500"
                                      onChange={(e) => {
                                        const newMicroorganismos = [...formData.microorganismos];
                                        newMicroorganismos[index].nombre = e.target.value;
                                        setFormData(prev => ({ ...prev, microorganismos: newMicroorganismos }));
                                      }}
                                    />
                                  )}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Dosificación
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={micro.dosificacionPorHa}
                                    onChange={(e) => {
                                      const newMicroorganismos = [...formData.microorganismos];
                                      newMicroorganismos[index].dosificacionPorHa = parseFloat(e.target.value) || 0;
                                      setFormData(prev => ({ ...prev, microorganismos: newMicroorganismos }));
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-700"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Unidad
                                  </label>
                                  <select
                                    value={micro.unidad}
                                    onChange={(e) => {
                                      const newMicroorganismos = [...formData.microorganismos];
                                      newMicroorganismos[index].unidad = e.target.value;
                                      setFormData(prev => ({ ...prev, microorganismos: newMicroorganismos }));
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-700"
                                  >
                                    <option value="L/Ha">L/Ha</option>
                                    <option value="ml/Ha">ml/Ha</option>
                                    <option value="g/Ha">g/Ha</option>
                                    <option value="kg/Ha">kg/Ha</option>
                                  </select>
                                </div>
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newMicroorganismos = formData.microorganismos.filter((_, i) => i !== index);
                                      setFormData(prev => ({ ...prev, microorganismos: newMicroorganismos }));
                                    }}
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                                  >
                                    🗑️ Eliminar
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fila 4: Litros */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Litros */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Litros
                        </label>
                        <input
                          type="number"
                          value={formData.litros}
                          onChange={(e) => setFormData({ ...formData, litros: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 placeholder-black text-base"
                          placeholder="0"
                          min="0"
                          step="0.1"
                        />
                      </div>
                    </div>

                    {/* Selector de Lotes - Sección amplia dedicada */}
                    {selectedClienteId && (
                      <div className="border-t-2 border-gray-200 pt-8">
                        <div className="mb-6">
                          <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                            🎯 Selección de Lotes
                          </h3>
                          <p className="text-gray-600 text-sm">
                            Selecciona los lotes específicos donde se aplicará este evento de producción.
                          </p>
                        </div>
                        <LoteSelector
                          clienteId={selectedClienteId}
                          lotesSeleccionados={lotesSeleccionados}
                          onLotesChange={setLotesSeleccionados}
                          className="w-full"
                        />
                      </div>
                    )}
                  </form>
                </div>

                {/* Modal Footer */}
                <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 focus:ring-4 focus:ring-gray-500/20 transition-all duration-200 font-semibold text-base"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    onClick={handleAddEvento}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 font-semibold text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Crear Evento
                  </button>
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
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{getTipoEvento(selectedEvento.tipo).label} - {selectedEvento.cliente || 'Sin cliente'}</h2>
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

                    {selectedEvento.responsable && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Responsable</label>
                        <p className="text-gray-900">{selectedEvento.responsable}</p>
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
