'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LoteSelector from '@/components/LoteSelector';

interface ProduccionEvento {
  id: string;
  tipo: 'inoculacion' | 'cosecha' | 'formulacion' | 'entrega' | 'mantenimiento';
  fecha: string;
  titulo?: string;
  descripcion?: string;
  estado: 'planificado' | 'en-proceso' | 'completado' | 'cancelado';
  cliente?: string;
  microorganismo?: string;
  microorganismos?: any[];
  litros?: number;
  paqueteId?: string;
  fechaCreacion?: string;
  fechaAplicacion?: string;
  estadoAplicacion?: string;
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
}

const tiposEvento = [
  { value: 'inoculacion', label: 'Inoculación', emoji: '🧫', color: 'bg-blue-500' },
  { value: 'cosecha', label: 'Cosecha', emoji: '🧪', color: 'bg-green-500' },
  { value: 'formulacion', label: 'Formulación', emoji: '🧮', color: 'bg-purple-500' },
  { value: 'entrega', label: 'Entrega', emoji: '📦', color: 'bg-orange-500' },
  { value: 'mantenimiento', label: 'Mantenimiento', emoji: '🔧', color: 'bg-gray-500' },
];

// Configuración de microorganismos predeterminados por tipo de aplicación (usando nombres exactos de Sirius Product Core)
const microorganismosPredeterminados = {
  'preventivo-pc': [
    { nombre: 'Trichoderma Harzianum', dosificacionPorHa: 1.0, unidad: 'L/Ha' },
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
    { nombre: 'Trichoderma Harzianum', dosificacionPorHa: 1.0, unidad: 'L/Ha' }
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
  { value: 'planificado', label: 'Presupuestada', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'en-proceso', label: 'Confirmada', color: 'bg-blue-100 text-blue-800' },
  { value: 'completado', label: 'Entregada', color: 'bg-green-100 text-green-800' },
  { value: 'cancelado', label: 'Pospuesta', color: 'bg-red-100 text-red-800' },
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
  const [loadingPaquete, setLoadingPaquete] = useState(false);
  const [loadingDetailedEvent, setLoadingDetailedEvent] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [vistaActual, setVistaActual] = useState<'mes' | 'semana' | 'lista' | 'paquetes'>('mes');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaquetesModal, setShowPaquetesModal] = useState(false);
  const [paquetesAplicaciones, setPaquetesAplicaciones] = useState<any[]>([]);
  const [loadingPaquetes, setLoadingPaquetes] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState<ProduccionEvento | null>(null);
  const [editandoEvento, setEditandoEvento] = useState<ProduccionEvento | null>(null);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editEventForm, setEditEventForm] = useState({
    fecha: '',
    estado: 'planificado' as ProduccionEvento['estado']
  });
  const [stats, setStats] = useState<CalendarioStats>({
    totalEventos: 0,
    eventosPendientes: 0,
    eventosEnProceso: 0,
    eventosCompletados: 0
  });

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
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
  });

  // Lotes selection states
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [lotesSeleccionados, setLotesSeleccionados] = useState<string[]>([]);
  const [todosLotesDisponibles, setTodosLotesDisponibles] = useState<any[]>([]); // Almacenar todos los lotes para cálculos

  // Calcular hectáreas totales de lotes seleccionados
  const hectareasTotales = useMemo(() => {
    const lotesSeleccionadosData = todosLotesDisponibles.filter(lote => lotesSeleccionados.includes(lote.id));
    const total = lotesSeleccionadosData.reduce((sum, lote) => sum + (lote.areaHa || 0), 0);
    console.log('🌾 Hectáreas totales calculadas:', total, 'de', lotesSeleccionadosData.length, 'lotes');
    return total;
  }, [lotesSeleccionados, todosLotesDisponibles]);

  // Calcular litros totales basados en microorganismos y hectáreas
  const litrosTotales = useMemo(() => {
    if (hectareasTotales === 0 || formData.microorganismos.length === 0) return 0;
    
    const total = formData.microorganismos.reduce((sum, micro) => {
      const litrosPorMicro = hectareasTotales * micro.dosificacionPorHa;
      return sum + litrosPorMicro;
    }, 0);
    
    console.log('🧪 Litros totales calculados:', total.toFixed(2), 'L');
    return total;
  }, [hectareasTotales, formData.microorganismos]);

  // Cantidad de bolsas = litros totales (1L = 1 bolsa)
  const bolsasTotales = useMemo(() => {
    const bolsas = Math.ceil(litrosTotales); // Redondear hacia arriba
    console.log('📦 Bolsas totales calculadas:', bolsas);
    return bolsas;
  }, [litrosTotales]);

  // Handler estable para cambiar lotes seleccionados
  const handleLotesChange = useCallback((nuevosLotes: string[]) => {
    console.log('📝 handleLotesChange ejecutado con:', nuevosLotes.length, 'lotes');
    setLotesSeleccionados(nuevosLotes);
  }, []);

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
    });
    setClienteSearch('');
    setSelectedClienteId('');
    setLotesSeleccionados([]);
    setShowClienteDropdown(false);
    setEditandoEvento(null);
  };

  // Función para cerrar modal
  const cerrarModal = () => {
    console.log('🚨 cerrarModal ejecutado - Stack trace:', new Error().stack);
    setShowAddModal(false);
    limpiarFormulario();
  };

  // Search states for dropdowns
  const [clienteSearch, setClienteSearch] = useState('');

  // Función para cargar paquetes de aplicaciones
  const fetchPaquetesAplicaciones = async (clienteId?: string) => {
    setLoadingPaquetes(true);
    try {
      const url = clienteId 
        ? `/api/paquete-aplicaciones?clienteId=${clienteId}`
        : '/api/paquete-aplicaciones';
      
      console.log('🔍 [FRONTEND] Consultando paquetes desde:', url);
      
      const response = await fetch(url);
      
      console.log('📡 [FRONTEND] Response status:', response.status, response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('📥 [FRONTEND] Response data:', data);
      
      if (data.success) {
        setPaquetesAplicaciones(data.paquetes || []);
        console.log('✅ [FRONTEND] Paquetes cargados exitosamente:', data.count);
      } else {
        console.error('❌ [FRONTEND] Error del servidor:', data);
        alert(`Error cargando paquetes: ${data.details || data.error}`);
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Error completo fetching paquetes:', {
        error,
        message: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined
      });
      alert(`Error cargando paquetes: ${error instanceof Error ? error.message : 'Error de conexión'}`);
    } finally {
      setLoadingPaquetes(false);
    }
  };
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
  }, [eventos, filtroTipo, filtroEstado, searchTerm]);

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
      
      // Mapear los microorganismos predeterminados con los productos de Sirius usando nombres exactos
      const microorganismosDefault = configDefault.map(config => {
        const microFromDB = microorganismos.find(m => 
          m.nombre === config.nombre
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
      const response = await fetch('/api/sirius-productos');
      const data = await response.json();
      
      if (data.success) {
        // Transformar productos de Sirius a formato de microorganismos para compatibilidad
        const productosFormateados = data.productos.map((producto: any) => ({
          id: producto.id,
          nombre: producto.nombre,
          tipo: producto.tipo,
          airtableId: producto.airtableId,
          codigo: producto.codigo,
          categoria: producto.categoria,
          unidadBase: producto.unidadBase
        }));
        setMicroorganismos(productosFormateados || []);
      } else {
        console.error('Error loading productos Sirius:', data.error);
      }
    } catch (error) {
      console.error('Error fetching productos Sirius:', error);
    } finally {
      setLoadingMicroorganismos(false);
    }
  };
  const fetchEventos = async () => {
    setLoading(true);
    try {
      // Obtener eventos existentes
      const responseEventos = await fetch('/api/calendario-produccion');
      const dataEventos = await responseEventos.json();
      
      // Obtener eventos de aplicaciones desde DataLab
      const responseAplicaciones = await fetch('/api/aplicaciones-eventos');
      const dataAplicaciones = await responseAplicaciones.json();
      
      let todosLosEventos: ProduccionEvento[] = [];
      
      // Agregar eventos existentes
      if (dataEventos.success && dataEventos.eventos) {
        todosLosEventos = [...dataEventos.eventos];
      }
      
      // Convertir eventos de aplicaciones al formato del calendario
      if (dataAplicaciones.success && dataAplicaciones.eventos && Array.isArray(dataAplicaciones.eventos)) {
        const eventosAplicaciones = dataAplicaciones.eventos
          .filter((evento: any) => evento != null) // Filtrar elementos null/undefined
          .map((evento: any) => {
            // Extraer información real del paquete y aplicación
            let tipoAplicacionReal = 'Aplicación Programada';
            let clienteReal = 'Cliente Programado';
            let microorganismosReales: any[] = [];
            let descripcionDetallada = `${evento.cantidadLitros || 0} litros - ${evento.estadoAplicacion}`;
            
            // Si hay información del paquete, extraer datos reales
            if (evento.paqueteAplicaciones && Array.isArray(evento.paqueteAplicaciones) && evento.paqueteAplicaciones.length > 0) {
              const paqueteInfo = evento.paqueteAplicaciones[0];
              
              // Extraer tipo de aplicación real del nombre del paquete
              if (paqueteInfo.nombre) {
                if (paqueteInfo.nombre.toLowerCase().includes('preventivo-pc')) {
                  tipoAplicacionReal = 'Preventivo Pie de Cría';
                } else if (paqueteInfo.nombre.toLowerCase().includes('preventivo-control-plagas')) {
                  tipoAplicacionReal = 'Preventivo Control de Plagas';
                } else if (paqueteInfo.nombre.toLowerCase().includes('control-ml')) {
                  tipoAplicacionReal = 'Control Mal de Lulo';
                } else if (paqueteInfo.nombre.toLowerCase().includes('prevencion-pestalotiopsis')) {
                  tipoAplicacionReal = 'Prevención Pestalotiopsis';
                } else {
                  // Extraer el cliente del nombre del paquete (formato: "Cliente - Tipo - Año")
                  const nombrePartes = paqueteInfo.nombre.split(' - ');
                  if (nombrePartes.length >= 2) {
                    clienteReal = nombrePartes[0];
                    tipoAplicacionReal = nombrePartes[1] || tipoAplicacionReal;
                  }
                }
              }
              
              // Extraer cliente real si está disponible
              if (paqueteInfo.clienteId) {
                // Buscar el cliente en la lista si está disponible
                // Por ahora usar el clienteId como referencia
                clienteReal = paqueteInfo.clienteId;
              }
              
              // Construir descripción más detallada
              const hectareas = paqueteInfo.hectareasTotales || 0;
              const lotes = paqueteInfo.lotesIds?.length || 0;
              const aplicaciones = paqueteInfo.cantidadAplicacionesAno || 1;
              
              descripcionDetallada = `${evento.cantidadLitros || 0}L • ${hectareas}ha • ${lotes} lotes • ${aplicaciones}/año`;
            }
            
            // Extraer microorganismos si están disponibles
            if (evento.microorganismos && Array.isArray(evento.microorganismos)) {
              microorganismosReales = evento.microorganismos;
            }
            
            return {
              id: evento.id || `evento-${Date.now()}-${Math.random()}`,
              fecha: evento.fechaProgramada || new Date().toISOString().split('T')[0],
              titulo: tipoAplicacionReal,
              descripcion: descripcionDetallada,
              tipo: 'inoculacion' as const,
              estado: evento.estadoAplicacion === 'PRESUPUESTADA' ? 'planificado' as const 
                     : evento.estadoAplicacion === 'ENTREGADA' ? 'completado' as const
                     : evento.estadoAplicacion === 'POSPUESTA' ? 'cancelado' as const
                     : evento.estadoAplicacion === 'CONFIRMADA' ? 'en-proceso' as const
                     : 'planificado' as const,
              cliente: clienteReal,
              microorganismos: microorganismosReales,
              litros: evento.cantidadLitros || 0,
              paqueteId: evento.idPaquete || '',
              fechaCreacion: evento.createdTime || new Date().toISOString(),
              // Datos adicionales específicos de aplicaciones
              fechaAplicacion: evento.fechaAplicacion || '',
              estadoAplicacion: evento.estadoAplicacion || ''
            };
          })
          .filter(Boolean); // Filtrar elementos null
        
        todosLosEventos = [...todosLosEventos, ...eventosAplicaciones];
      }
      
      console.log('📅 Total eventos cargados:', todosLosEventos.length, {
        eventosExistentes: dataEventos.eventos?.length || 0,
        eventosAplicaciones: dataAplicaciones.eventos?.length || 0
      });
      
      setEventos(todosLosEventos);
      calculateStats(todosLosEventos);
      
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
      eventosCompletados: eventos.filter(e => e.estado === 'completado').length
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

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e => 
        e.cliente?.toLowerCase().includes(term) ||
        e.microorganismo?.toLowerCase().includes(term)
      );
    }

    setFilteredEventos(filtered);
  };

  const handleAddEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loadingPaquete) return; // Prevenir múltiples envíos
    
    setLoadingPaquete(true);
    
    try {
      console.log('🚀 Enviando paquete aplicaciones:', {
        cliente: formData.cliente,
        lotesSeleccionados: lotesSeleccionados.length,
        microorganismos: formData.microorganismos.length,
        hectareasTotales,
        litrosTotales,
        bolsasTotales
      });

      // Debug: verificar datos disponibles
      console.log('🔍 Debug datos:', {
        formDataCliente: formData.cliente,
        filteredClientesCount: filteredClientes.length,
        filteredClientesNames: filteredClientes.map(c => c.nombre),
        todosLotesCount: todosLotesDisponibles.length
      });

      // Validaciones básicas
      if (!formData.cliente.trim()) {
        console.error('❌ Validación fallida: Cliente vacío');
        alert('Por favor selecciona un cliente');
        setLoadingPaquete(false);
        return;
      }

      if (lotesSeleccionados.length === 0) {
        console.error('❌ Validación fallida: No hay lotes seleccionados');
        alert('Por favor selecciona al menos un lote');
        setLoadingPaquete(false);
        return;
      }

      if (formData.microorganismos.length === 0) {
        console.error('❌ Validación fallida: No hay microorganismos seleccionados');
        alert('Por favor selecciona al menos un microorganismo');
        setLoadingPaquete(false);
        return;
      }

      if (!formData.fechaInicio) {
        console.error('❌ Validación fallida: Fecha de inicio vacía');
        alert('Por favor selecciona la fecha de inicio');
        setLoadingPaquete(false);
        return;
      }

      console.log('✅ Todas las validaciones básicas pasaron');

      // Obtener datos del cliente y cultivo para los IDs
      const clienteSeleccionado = filteredClientes.find(c => c.nombre === formData.cliente);
      const lotesData = todosLotesDisponibles.filter(lote => lotesSeleccionados.includes(lote.id));
      
      console.log('🔍 Búsqueda de cliente:', {
        buscando: formData.cliente,
        encontrado: !!clienteSeleccionado,
        clienteId: clienteSeleccionado?.id,
        clienteAirtableId: clienteSeleccionado?.airtableId
      });

      console.log('🔍 Datos de lotes:', {
        lotesSeleccionadosCount: lotesSeleccionados.length,
        lotesDataCount: lotesData.length,
        primerosLotes: lotesData.slice(0, 3).map(l => ({ id: l.id, cultivoId: l.cultivoId }))
      });
      
      if (!clienteSeleccionado) {
        console.error('❌ Cliente no encontrado en filteredClientes:', {
          clienteBuscado: formData.cliente,
          clientesDisponibles: filteredClientes.map(c => c.nombre)
        });
        alert('Cliente no encontrado');
        setLoadingPaquete(false);
        return;
      }

      // Obtener el cultivo ID del primer lote (asumiendo que todos son del mismo cultivo)
      const cultivoId = lotesData.length > 0 ? lotesData[0].cultivoId : '';

      console.log('🔍 IDs obtenidos:', {
        clienteId: clienteSeleccionado.id,
        cultivoId,
        microorganismosIds: formData.microorganismos.map(m => m.id),
        userObject: user,
        userKeys: user ? Object.keys(user) : 'No user object',
        userName: user?.nombre || user?.cedula || 'Usuario Desconocido'
      });

      // Preparar los datos para el nuevo endpoint
      const paqueteData = {
        nombre: `${formData.cliente} - ${formData.tipoAplicacion} - ${new Date().getFullYear()}`,
        clienteId: clienteSeleccionado.id,
        cultivoId: cultivoId,
        lotesIds: lotesSeleccionados,
        lotesData: lotesData.filter(lote => lotesSeleccionados.includes(lote.id)).map(lote => ({
          id: lote.id,
          areaHa: lote.areaHa
        })), // Datos completos de lotes con hectáreas
        microorganismos: formData.microorganismos, // Enviar datos completos con dosificación
        cantidadAplicacionesAno: formData.cantidadAplicacionesAno,
        periodicidadMeses: formData.periodicidadMeses,
        fechaInicio: formData.fechaInicio,
        hectareasTotales: hectareasTotales,
        litrosTotales: litrosTotales,
        bolsasTotales: bolsasTotales,
        fechasCalculadas: formData.fechasCalculadas,
        userName: user?.nombre || user?.cedula || 'Usuario Desconocido' // Usar la propiedad correcta 'nombre'
      };

      console.log('📦 Datos del paquete a enviar:', paqueteData);

      const response = await fetch('/api/paquete-aplicaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paqueteData),
      });

      console.log('🌐 Response status:', response.status);
      console.log('🌐 Response ok:', response.ok);

      let data;
      try {
        data = await response.json();
        console.log('📥 Response data:', data);
      } catch (parseError) {
        console.error('❌ Error parsing JSON response:', parseError);
        alert('❌ Error: Respuesta inválida del servidor');
        setLoadingPaquete(false);
        return;
      }
      
      if (data.success) {
        alert(`✅ ${data.message}`);
        setShowAddModal(false);
        resetForm();
        // Limpiar selecciones
        setLotesSeleccionados([]);
        setSelectedClienteId('');
        // Recargar eventos para mostrar las nuevas aplicaciones programadas
        fetchEventos();
      } else {
        console.error('❌ Error del servidor:', data);
        const errorMsg = data.details || data.error || 'Error desconocido';
        alert(`❌ Error al crear paquete: ${errorMsg}`);
      }
    } catch (error) {
      console.error('❌ Error completo creando paquete aplicaciones:', {
        error,
        message: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
        formData,
        lotesSeleccionados,
        filteredClientesCount: filteredClientes.length
      });
      alert(`Error al crear paquete de aplicaciones: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoadingPaquete(false);
    }
  };

  const handleUpdateIndividualEvent = async () => {
    if (!editandoEvento || loadingDetailedEvent) return;
    
    setLoadingDetailedEvent(true);
    
    try {
      console.log('🔄 Actualizando evento individual:', editandoEvento.id);
      
      // Mapear estados del frontend a Airtable
      const estadoAirtable = editEventForm.estado === 'planificado' ? 'PRESUPUESTADA' :
                             editEventForm.estado === 'completado' ? 'ENTREGADA' :
                             editEventForm.estado === 'cancelado' ? 'POSPUESTA' : 'PRESUPUESTADA';
      
      // Verificar si la fecha cambió para actualizar fechas futuras
      const fechaCambio = editEventForm.fecha !== editandoEvento.fecha;
      
      // Confirmar el efecto dominó si hay cambio de fecha
      let updateFutureDates = false;
      if (fechaCambio) {
        const diasDiferencia = Math.floor((new Date(editEventForm.fecha).getTime() - new Date(editandoEvento.fecha).getTime()) / (1000 * 60 * 60 * 24));
        const mensaje = diasDiferencia > 0 
          ? `Se adelantará ${diasDiferencia} día(s)` 
          : `Se atrasará ${Math.abs(diasDiferencia)} día(s)`;
        
        updateFutureDates = confirm(
          `¿Actualizar también las fechas de todas las aplicaciones futuras de este paquete?\n\n${mensaje} todas las aplicaciones siguientes del mismo paquete.`
        );
      }
      
      const updateData = {
        id: editandoEvento.id,
        fecha: editEventForm.fecha,
        estado: estadoAirtable,
        updateFutureDates: updateFutureDates, // Bandera para actualizar fechas futuras (solo si el usuario confirma)
        paqueteId: editandoEvento.paqueteId // Para identificar aplicaciones relacionadas
      };

      const response = await fetch('/api/aplicaciones-eventos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Aplicación actualizada correctamente:', data);
        let mensaje = 'Aplicación actualizada correctamente';
        if (updateFutureDates && data.updatedFutureEvents > 0) {
          mensaje += `\n\n🗓️ Efecto dominó aplicado: Se actualizaron ${data.updatedFutureEvents} aplicaciones futuras del mismo paquete`;
        }
        alert(mensaje);
        closeEditEventModal();
        fetchEventos();
      } else {
        console.error('❌ Error al actualizar aplicación:', data.error);
        alert(`Error al actualizar aplicación: ${data.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('❌ Error actualizando aplicación:', error);
      alert(`Error al actualizar aplicación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoadingDetailedEvent(false);
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
      tipoAplicacion: '',
      cantidadAplicacionesAno: 4,
      periodicidadMeses: 3,
      fechasCalculadas: [],
      fechaInicio: '',
      periodo: 90,
      cliente: '',
      microorganismos: [],
    });
    setClienteSearch('');
    setShowClienteDropdown(false);
    setEditandoEvento(null);
  };

  const openAddModal = (clienteDefault?: string, fechaDefault?: string) => {
    resetForm();
    setEditandoEvento(null);
    if (clienteDefault) {
      setFormData(prev => ({ ...prev, cliente: clienteDefault }));
      setClienteSearch(clienteDefault);
    }
    if (fechaDefault) {
      setFormData(prev => ({ ...prev, fechaInicio: fechaDefault }));
    }
    setShowAddModal(true);
  };

  const openEditEventModal = async (evento: ProduccionEvento) => {
    setLoadingDetailedEvent(true);
    try {
      console.log('🔍 Abriendo modal para evento:', evento.id);
      
      // Obtener datos completos del evento desde la API
      const response = await fetch(`/api/aplicaciones-eventos?id=${evento.id}`);
      const data = await response.json();
      
      console.log('📋 Respuesta de la API:', data);
      
      if (data.success && data.evento) {
        const eventoCompleto = data.evento;
        console.log('📊 Datos completos del evento:', eventoCompleto);
        console.log('🌾 Lotes disponibles:', eventoCompleto.lotesIds);
        console.log('🧪 Productos disponibles:', eventoCompleto.productosAplicados);
        console.log('📏 Hectáreas disponibles:', eventoCompleto.hectareas);
        console.log('🧬 Cantidad biológicos:', eventoCompleto.cantidadBiologicos);
        
        // Mapear estados correctamente
        let estadoMapeado = 'planificado';
        if (eventoCompleto.estado === 'ENTREGADA' || eventoCompleto.estado === 'entregada') {
          estadoMapeado = 'completado';
        } else if (eventoCompleto.estado === 'POSPUESTA' || eventoCompleto.estado === 'pospuesta') {
          estadoMapeado = 'cancelado';
        } else if (eventoCompleto.estado === 'CONFIRMADA' || eventoCompleto.estado === 'confirmada') {
          estadoMapeado = 'en-proceso';
        }
        
        setEditandoEvento({
          ...evento,
          ...eventoCompleto,
          estado: estadoMapeado,
          // Asegurar que los campos críticos estén disponibles
          totalHectareas: eventoCompleto.totalHectareas || 'N/A',
          cantidadBiologicos: eventoCompleto.cantidadBiologicos || 'N/A',
          lotesIds: eventoCompleto.lotesIds || [],
          hectareas: eventoCompleto.hectareas || [],
          productosAplicados: eventoCompleto.productosAplicados || []
        });
        
        setEditEventForm({
          fecha: eventoCompleto.fecha || evento.fecha,
          estado: estadoMapeado as "planificado" | "en-proceso" | "completado" | "cancelado"
        });
      } else {
        console.error('❌ Error en respuesta de la API:', data);
        // Fallback a datos básicos si no se puede obtener información completa
        setEditandoEvento(evento);
        setEditEventForm({
          fecha: evento.fecha,
          estado: evento.estado
        });
      }
      
      setShowEditEventModal(true);
    } catch (error) {
      console.error('❌ Error obteniendo datos del evento:', error);
      // Fallback a datos básicos en caso de error
      setEditandoEvento(evento);
      setEditEventForm({
        fecha: evento.fecha,
        estado: evento.estado
      });
      setShowEditEventModal(true);
    } finally {
      setLoadingDetailedEvent(false);
    }
  };

  const closeEditEventModal = () => {
    setShowEditEventModal(false);
    setEditandoEvento(null);
    setEditEventForm({
      fecha: '',
      estado: 'planificado'
    });
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
          <div className="mb-8 bg-white rounded-lg shadow-lg p-6">
            <div className="text-center mb-6">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                📅 Calendario de Producción
              </h1>
              <p className="text-gray-600">
                Planifica y gestiona todos los eventos de producción del laboratorio
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={() => openAddModal()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Nueva Aplicación
              </button>
              
              <button
                onClick={() => {
                  setShowPaquetesModal(true);
                  fetchPaquetesAplicaciones();
                }}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 focus:ring-4 focus:ring-green-500/20 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Ver Paquetes
              </button>
              
              <button
                onClick={() => setVistaActual(vistaActual === 'mes' ? 'lista' : 'mes')}
                className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 focus:ring-4 focus:ring-gray-500/20 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {vistaActual === 'mes' ? 'Vista Lista' : 'Vista Mes'}
              </button>
            </div>
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
                          const eventTitle = evento.titulo || `${tipo.label} - ${evento.cliente || 'Sin cliente'}`;
                          const eventDescription = evento.descripcion || `${evento.litros || 0}L`;
                          return (
                            <div
                              key={evento.id}
                              className={`text-xs px-2 py-1 rounded ${tipo.color} text-white truncate cursor-pointer hover:opacity-80`}
                              title={`${eventTitle}\n${eventDescription}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvento(evento);
                              }}
                            >
                              {tipo.emoji} {evento.titulo ? evento.titulo : tipo.label}
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
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <div className="flex justify-center items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                          </div>
                        </td>
                      </tr>
                    ) : filteredEventos.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          No hay eventos programados
                        </td>
                      </tr>
                    ) : (
                      filteredEventos
                        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                        .map(evento => {
                          const tipo = getTipoEvento(evento.tipo);
                          const estado = getEstadoEvento(evento.estado);
                          
                          return (
                            <tr key={evento.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(evento.fecha)}
                              </td>
                              <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{getTipoEvento(evento.tipo).label} - {evento.cliente || 'Sin cliente'}</div>
                                <div className="text-sm text-gray-500">{evento.microorganismo || 'Sin microorganismo'}</div>
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
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => { console.log('🎯 Click en BACKDROP'); cerrarModal(); }}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] flex flex-col" onClick={(e) => { console.log('✅ Click en CONTENIDO del modal - stopPropagation'); e.stopPropagation(); }}>
                {/* Modal Header - Fixed */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white relative overflow-hidden flex-shrink-0">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                  
                  <div className="relative z-10 flex justify-between items-start">
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold mb-2">{editandoEvento ? 'Editar Evento' : 'Agregar Evento'}</h2>
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

                {/* Modal Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                  <form onSubmit={editandoEvento ? (e) => {
                    e.preventDefault();
                    if (editandoEvento) {
                      handleUpdateEvento(editandoEvento.id, {
                        fecha: editEventForm.fecha,
                        estado: editEventForm.estado
                      });
                    }
                  } : handleAddEvento} className="space-y-6">
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
                          <option value="" disabled>Selecciona un tipo</option>
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
                                
                                return (
                                  <div key={fecha} className="flex items-center space-x-3 bg-white rounded-lg p-3 border">
                                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                      {index + 1}
                                    </span>
                                    <span className="font-medium text-gray-900 capitalize">
                                      {fechaFormateada}
                                    </span>
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

                    {/* Resumen de Cálculos */}
                    {selectedClienteId && lotesSeleccionados.length > 0 && (
                      <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-xl">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                          📊 Resumen de Producción
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Hectáreas Totales */}
                          <div className="bg-white rounded-lg p-4 border-2 border-blue-300">
                            <div className="text-sm text-gray-600 mb-1">🌾 Hectáreas Totales</div>
                            <div className="text-2xl font-bold text-blue-600">
                              {hectareasTotales.toFixed(2)} ha
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {lotesSeleccionados.length} lote{lotesSeleccionados.length !== 1 ? 's' : ''} seleccionado{lotesSeleccionados.length !== 1 ? 's' : ''}
                            </div>
                          </div>

                          {/* Litros Totales */}
                          <div className="bg-white rounded-lg p-4 border-2 border-green-300">
                            <div className="text-sm text-gray-600 mb-1">🧪 Litros Necesarios</div>
                            <div className="text-2xl font-bold text-green-600">
                              {litrosTotales.toFixed(2)} L
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formData.microorganismos.length} microorganismo{formData.microorganismos.length !== 1 ? 's' : ''}
                            </div>
                          </div>

                          {/* Bolsas Totales */}
                          <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
                            <div className="text-sm text-gray-600 mb-1">📦 Bolsas a Producir</div>
                            <div className="text-2xl font-bold text-purple-600">
                              {bolsasTotales}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              1 litro = 1 bolsa
                            </div>
                          </div>
                        </div>

                        {/* Desglose por microorganismo */}
                        {formData.microorganismos.length > 0 && (
                          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                            <div className="text-sm font-semibold text-gray-700 mb-2">🦠 Desglose por Microorganismo:</div>
                            <div className="space-y-2">
                              {formData.microorganismos.map((micro) => {
                                const litrosMicro = hectareasTotales * micro.dosificacionPorHa;
                                return (
                                  <div key={micro.id} className="flex justify-between items-center text-sm">
                                    <span className="text-gray-700">
                                      <span className="font-medium">{micro.nombre}</span>
                                      <span className="text-gray-500 ml-2">({micro.dosificacionPorHa} L/ha)</span>
                                    </span>
                                    <span className="font-semibold text-blue-600">
                                      {litrosMicro.toFixed(2)} L
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

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
                          onLotesChange={handleLotesChange}
                          onLotesDataChange={setTodosLotesDisponibles}
                          className="w-full"
                        />
                      </div>
                    )}
                  </form>
                </div>

                {/* Modal Footer - Fixed */}
                <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex gap-4 min-h-[80px] items-center flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 focus:ring-4 focus:ring-gray-500/20 transition-all duration-200 font-semibold text-base min-h-[48px]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loadingPaquete}
                    className={`flex-1 ${
                      loadingPaquete 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl transform hover:-translate-y-0.5'
                    } text-white px-6 py-3 rounded-xl focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 font-semibold text-base shadow-lg flex items-center justify-center min-h-[48px]`}
                  >
                    {loadingPaquete ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {editandoEvento ? 'Actualizando...' : 'Creando Paquete...'}
                      </>
                    ) : (
                      editandoEvento ? 'Actualizar Evento' : 'Crear Paquete de Aplicaciones'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Event Detail Modal */}
          {selectedEvento && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedEvento.titulo || `${getTipoEvento(selectedEvento.tipo).label} - ${selectedEvento.cliente || 'Sin cliente'}`}
                      </h2>
                      {selectedEvento.descripcion && (
                        <p className="text-gray-600 mb-2">{selectedEvento.descripcion}</p>
                      )}
                      <div className="flex gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getTipoEvento(selectedEvento.tipo).color} text-white`}>
                          {getTipoEvento(selectedEvento.tipo).emoji} {getTipoEvento(selectedEvento.tipo).label}
                        </span>
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getEstadoEvento(selectedEvento.estado).color}`}>
                          {getEstadoEvento(selectedEvento.estado).label}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditEventModal(selectedEvento);
                          setSelectedEvento(null);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                      >
                        ✏️ Editar Aplicación
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvento(null);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Fecha</label>
                      <p className="text-gray-900">{formatDate(selectedEvento.fecha)}</p>
                    </div>



                    {selectedEvento.cliente && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Cliente</label>
                        <p className="text-gray-900 font-semibold">{selectedEvento.cliente}</p>
                      </div>
                    )}

                    {selectedEvento.microorganismos && selectedEvento.microorganismos.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Microorganismos</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedEvento.microorganismos.map((micro: any, index: number) => (
                            <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              🦠 {typeof micro === 'string' ? micro : micro.nombre || micro}
                            </span>
                          ))}
                        </div>
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

                    {selectedEvento.paqueteId && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">ID del Paquete</label>
                        <p className="text-gray-900 font-mono text-sm bg-gray-100 px-2 py-1 rounded">{selectedEvento.paqueteId}</p>
                      </div>
                    )}

                    {selectedEvento.estadoAplicacion && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Estado de la Aplicación</label>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            selectedEvento.estadoAplicacion === 'PLANIFICADA' ? 'bg-yellow-100 text-yellow-800' :
                            selectedEvento.estadoAplicacion === 'EJECUTADA' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {selectedEvento.estadoAplicacion === 'PLANIFICADA' ? '⏱️' :
                             selectedEvento.estadoAplicacion === 'EJECUTADA' ? '✅' : '❌'}
                            {selectedEvento.estadoAplicacion}
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedEvento.fechaAplicacion && selectedEvento.fechaAplicacion !== selectedEvento.fecha && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Fecha de Ejecución Real</label>
                        <p className="text-gray-900">{formatDate(selectedEvento.fechaAplicacion)}</p>
                      </div>
                    )}

                    {selectedEvento.descripcion && selectedEvento.descripcion.includes('•') && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Detalles de la Aplicación</label>
                        <div className="text-gray-900 bg-blue-50 p-3 rounded-lg">
                          {selectedEvento.descripcion.split('•').map((detail, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              {index === 0 ? '💧' : index === 1 ? '🌾' : index === 2 ? '📍' : '📅'}
                              <span>{detail.trim()}</span>
                            </div>
                          ))}
                        </div>
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

          {/* Paquetes de Aplicaciones Modal */}
          {showPaquetesModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">📦 Paquetes de Aplicaciones</h2>
                    <button
                      onClick={() => setShowPaquetesModal(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-gray-600 mt-2">Historial de paquetes de aplicaciones programadas</p>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                  {loadingPaquetes ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center space-x-2">
                        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-gray-600 font-medium">Cargando paquetes...</span>
                      </div>
                    </div>
                  ) : paquetesAplicaciones.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-700 mb-2">No hay paquetes de aplicaciones</h3>
                      <p className="text-gray-500">Crea tu primer paquete usando el botón "Nueva Aplicación"</p>
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {paquetesAplicaciones.map(paquete => (
                        <div key={paquete.id} className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-gray-900 mb-2">{paquete.nombre}</h3>
                              <div className="flex flex-wrap gap-2 mb-3">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  🏢 Cliente ID: {paquete.clienteId}
                                </span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  🌱 {paquete.lotesIds?.length ?? 0} Lotes
                                </span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  🧪 {paquete.microorganismos?.length ?? 0} Microorganismos
                                </span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  📅 {paquete.cantidadAplicacionesAno} aplicaciones/año
                                </span>
                              </div>
                            </div>
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                              paquete.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {paquete.estado}
                            </span>
                          </div>

                          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div className="bg-white rounded-lg p-4 border border-gray-100">
                              <div className="text-sm font-medium text-gray-500">Hectáreas</div>
                              <div className="text-2xl font-bold text-green-600">{paquete.hectareasTotales?.toFixed(2) || '0'} ha</div>
                            </div>
                            
                            <div className="bg-white rounded-lg p-4 border border-gray-100">
                              <div className="text-sm font-medium text-gray-500">Litros</div>
                              <div className="text-2xl font-bold text-blue-600">{paquete.litrosTotales?.toFixed(2) || '0'} L</div>
                            </div>
                            
                            <div className="bg-white rounded-lg p-4 border border-gray-100">
                              <div className="text-sm font-medium text-gray-500">Bolsas</div>
                              <div className="text-2xl font-bold text-purple-600">{paquete.bolsasTotales || '0'}</div>
                            </div>
                            
                            <div className="bg-white rounded-lg p-4 border border-gray-100">
                              <div className="text-sm font-medium text-gray-500">Periodicidad</div>
                              <div className="text-2xl font-bold text-orange-600">Cada {paquete.periodicidadMeses}m</div>
                            </div>
                          </div>

                          <div className="bg-white rounded-lg p-4 border border-gray-100">
                            <div className="text-sm font-medium text-gray-500 mb-2">Información Adicional</div>
                            <div className="text-sm text-gray-700 space-y-1">
                              <p><strong>Fecha Inicio:</strong> {new Date(paquete.fechaInicio).toLocaleDateString('es-ES')}</p>
                              <p><strong>Creado:</strong> {new Date(paquete.createdTime).toLocaleDateString('es-ES')} a las {new Date(paquete.createdTime).toLocaleTimeString('es-ES')}</p>
                              <p><strong>Lotes IDs:</strong> {paquete.lotesIds?.join(', ') || '—'}</p>
                            </div>
                          </div>

                          <div className="flex gap-3 mt-4">
                            <button
                              onClick={() => {
                                // Futura funcionalidad: ver detalles o editar
                                console.log('Ver detalles del paquete:', paquete.id);
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              Ver Eventos
                            </button>
                            <button
                              onClick={() => {
                                // Futura funcionalidad: duplicar paquete
                                console.log('Duplicar paquete:', paquete.id);
                              }}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                            >
                              Duplicar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      {paquetesAplicaciones.length} paquete{paquetesAplicaciones.length !== 1 ? 's' : ''} encontrado{paquetesAplicaciones.length !== 1 ? 's' : ''}
                    </div>
                    <button
                      onClick={() => setShowPaquetesModal(false)}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Individual Event Modal */}
          {showEditEventModal && editandoEvento && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        ✏️ Editar Aplicación Individual
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        ID: {editandoEvento.id}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeEditEventModal();
                      }}
                      className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {loadingDetailedEvent ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Cargando datos completos de la aplicación...</span>
                    </div>
                  ) : (
                    <>
                      {/* Información Principal */}
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                          📋 Información Principal de la Aplicación
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              📅 Fecha Programada
                            </label>
                            <input
                              type="date"
                              value={editEventForm.fecha}
                              onChange={(e) => setEditEventForm(prev => ({...prev, fecha: e.target.value}))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              🎯 Estado de Aplicación
                            </label>
                            <select
                              value={editEventForm.estado}
                              onChange={(e) => setEditEventForm(prev => ({...prev, estado: e.target.value as any}))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="planificado">PLANIFICADA</option>
                              <option value="completado">EJECUTADA</option>
                              <option value="cancelado">CANCELADA</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              📏 Total Hectáreas
                            </label>
                            <input
                              type="text"
                              value={`${(editandoEvento as any).totalHectareas || 'N/A'} ha`}
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Información de Lotes */}
                      {(editandoEvento as any).lotesIds && (editandoEvento as any).lotesIds.length > 0 && (
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                            🌾 Lotes de Aplicación ({(editandoEvento as any).lotesIds.length} lotes)
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {(editandoEvento as any).lotesIds.map((loteId: string, index: number) => (
                              <div key={index} className="bg-white p-3 rounded-lg border shadow-sm">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                                      Lote #{index + 1}
                                    </span>
                                    <p className="font-semibold text-gray-900 mt-1">{loteId}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900">
                                      {(editandoEvento as any).hectareas?.[index] || 'N/A'} ha
                                    </p>
                                    <p className="text-xs text-gray-600">Hectáreas</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="bg-white p-3 rounded-lg mt-3 border-2 border-green-200">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-green-900">📊 Resumen Total:</span>
                              <div className="text-right">
                                <span className="font-bold text-green-900 text-lg">
                                  {(editandoEvento as any).lotesIds.length} lotes
                                </span>
                                <span className="mx-2">•</span>
                                <span className="font-bold text-green-900 text-lg">
                                  {(editandoEvento as any).totalHectareas || 'N/A'} ha
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Información de Productos y Biológicos */}
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                          🧪 Productos Biológicos y Cantidades
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="bg-white p-4 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">🧬</span>
                              <h4 className="font-medium text-gray-900">Cantidad Total de Biológicos</h4>
                            </div>
                            <p className="text-3xl font-bold text-purple-600">
                              {(editandoEvento as any).cantidadBiologicos || 'N/A'} <span className="text-lg">litros</span>
                            </p>
                          </div>
                          
                          <div className="bg-white p-4 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">📦</span>
                              <h4 className="font-medium text-gray-900">Productos Registrados</h4>
                            </div>
                            <p className="text-3xl font-bold text-purple-600">
                              {(editandoEvento as any).productosAplicados?.length || 0} <span className="text-lg">productos</span>
                            </p>
                          </div>
                        </div>

                        {(editandoEvento as any).productosAplicados && (editandoEvento as any).productosAplicados.length > 0 && (
                          <div>
                            <h4 className="font-medium text-purple-900 mb-2">🔗 IDs de Productos Aplicados:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {(editandoEvento as any).productosAplicados.map((productoId: string, index: number) => (
                                <div key={index} className="bg-white p-2 rounded border text-sm">
                                  <span className="text-purple-600 font-mono">{productoId}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Campos Editables */}
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                          ✏️ Campos Editables
                        </h3>

                      </div>

                      {/* Debug Information */}
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                          🐛 Información de Debug (Temporal)
                        </h3>
                        <div className="text-xs space-y-2 text-red-800">
                          <div><strong>ID:</strong> {editandoEvento.id}</div>
                          <div><strong>Total Hectáreas:</strong> {JSON.stringify((editandoEvento as any).totalHectareas)}</div>
                          <div><strong>Cantidad Biológicos:</strong> {JSON.stringify((editandoEvento as any).cantidadBiologicos)}</div>
                          <div><strong>Lotes IDs:</strong> {(editandoEvento as any).lotesIds?.length || 0} elementos</div>
                          <div><strong>Productos:</strong> {(editandoEvento as any).productosAplicados?.length || 0} elementos</div>
                          <div><strong>Estado:</strong> {editandoEvento.estado}</div>
                          {(editandoEvento as any).allFields && (
                            <div>
                              <strong>Campos disponibles en Airtable:</strong>
                              <pre className="mt-1 p-2 bg-white rounded text-xs overflow-auto max-h-32">
                                {JSON.stringify(Object.keys((editandoEvento as any).allFields), null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Información de Control de Fechas */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          🕒 Control de Fechas y Trazabilidad
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white p-3 rounded-lg border">
                            <p className="text-sm text-gray-600">📅 Fecha de Creación del Registro</p>
                            <p className="font-medium text-gray-900">
                              {editandoEvento.fechaCreacion ? 
                                new Date(editandoEvento.fechaCreacion).toLocaleString('es-ES', {
                                  dateStyle: 'full',
                                  timeStyle: 'short'
                                }) : 'No disponible'}
                            </p>
                          </div>
                          <div className="bg-white p-3 rounded-lg border">
                            <p className="text-sm text-gray-600">🔄 Última Modificación</p>
                            <p className="font-medium text-gray-900">
                              {(editandoEvento as any).fechaActualizacion ? 
                                new Date((editandoEvento as any).fechaActualizacion).toLocaleString('es-ES', {
                                  dateStyle: 'full',
                                  timeStyle: 'short'
                                }) : 'Sin modificaciones'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Información del Paquete */}
                      {editandoEvento.paqueteId && (
                        <div className="bg-indigo-50 p-4 rounded-lg">
                          <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                            📦 Información del Paquete
                          </h3>
                          <div className="bg-white p-3 rounded-lg border">
                            <p className="text-sm text-gray-600">ID del Paquete de Aplicaciones:</p>
                            <p className="font-mono text-indigo-600 font-medium">{editandoEvento.paqueteId}</p>
                          </div>
                        </div>
                      )}

                      {/* Aviso de Cambio de Fecha */}
                      {editEventForm.fecha !== editandoEvento.fecha && (
                        <div className="bg-yellow-100 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                          <div className="flex items-start">
                            <div className="ml-3">
                              <div className="flex items-center gap-2 text-yellow-800">
                                <span className="text-xl">⚠️</span>
                                <h3 className="text-sm font-medium">Cambio de Fecha Detectado</h3>
                              </div>
                              <div className="mt-2 text-sm text-yellow-700">
                                <p>
                                  <strong>Fecha Original:</strong> {editandoEvento.fecha}
                                </p>
                                <p>
                                  <strong>Nueva Fecha:</strong> {editEventForm.fecha}
                                </p>
                                <p className="mt-2">
                                  ⚡ <strong>Acción Automática:</strong> Todas las aplicaciones futuras del mismo paquete 
                                  se ajustarán automáticamente manteniendo los intervalos originales entre aplicaciones.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Botones de Acción */}
                <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-200 rounded-b-xl">
                  <div className="flex gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeEditEventModal();
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateIndividualEvent();
                      }}
                      disabled={loadingDetailedEvent}
                      className={`flex-1 px-4 py-3 rounded-lg text-white font-medium ${
                        loadingDetailedEvent 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {loadingDetailedEvent ? 
                        <>
                          <span className="animate-spin mr-2">🔄</span>
                          Actualizando...
                        </> : 
                        'Actualizar Aplicación'
                      }
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
