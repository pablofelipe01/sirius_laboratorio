'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LoteSelector from '@/components/LoteSelector';

// Interfaces
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
  // Campos adicionales de Airtable
  totalHectareasAplicacion?: number;
  hectareasLotes?: number[];
  idLotes?: string[];
  productosAplicados?: any[];
  diasPlanificados?: number;
  progresoAplicacion?: number;
  estadoCronograma?: string;
  fechaInicioAplicacion?: string;
  fechaFinEstimada?: string;
  totalHectareasRealizadas?: number[];
  paqueteAplicaciones?: any[];
  lotesDetallados?: Array<{id: string, nombre: string, hectareas: number}>;
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

// Componente interno para Seguimiento Diario
interface SeguimientoDiarioModalProps {
  onClose: () => void;
}

const SeguimientoDiarioModal: React.FC<SeguimientoDiarioModalProps> = ({ onClose }) => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [paquetes, setPaquetes] = useState<any[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false);
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [analisisIA, setAnalisisIA] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // Filtrar clientes basado en la búsqueda
  const clientesFiltrados = clientes.filter(cliente => 
    cliente.nombre.toLowerCase().includes(busquedaCliente.toLowerCase())
  );

  const mensajeEjemplo = `Buenas tardes 
Don Grimaldo 
Jueves 15-01-26
Bloque 90 

Hora de llegada a la planta 05:50 am 

Control Preventivo Plagas
Bacillus.          750.cm
Beauveria.      750.cm
Total 1.5 lts× hectárea 

Tractor 1 Nebulizadora 
Jorge Guatibonza 
B 90.     P 592.       2 hts
B 90.     P 606.     11 hts
Hectáreas 13

Tractor 2 Jacto 
Edwin Javier Gálviz 
B 90.   P 593.      3 hts
B 90.   P 604.      8 hts 
Hectáreas. 11

Tractor 3 Jacto 
Rocío Escobar 
B 90.     P 591.      5 hts
B 90.     P 605.      8 hts 
Hectáreas 13

HECTÁREAS APLICADAS 
37

Nota por motivo de lluvia la aplicación se empieza alas 11:30 am
Nota de 07:00 am a 10:50 am siembra de palma

Hora de salida lobor 04:00pm`;

  useEffect(() => {
    cargarClientes();
  }, []);

  useEffect(() => {
    if (clienteSeleccionado) {
      cargarPaquetesCliente(clienteSeleccionado);
    } else {
      setPaquetes([]);
      setPaqueteSeleccionado('');
      setBusquedaCliente(''); // Limpiar búsqueda cuando no hay cliente seleccionado
      setMostrarListaClientes(false); // Ocultar lista
    }
  }, [clienteSeleccionado]);

  const cargarClientes = async () => {
    try {
      console.log('[MODAL] Iniciando carga de clientes...');
      setLoading(true);
      const response = await fetch('/api/clientes/activos');
      console.log('[MODAL] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[MODAL] Datos recibidos:', data);
      
      if (data.clientes) {
        setClientes(data.clientes);
        console.log('[MODAL] Clientes cargados:', data.clientes.length);
      } else {
        console.log('[MODAL] No se encontraron clientes en la respuesta');
        setClientes([]);
      }
    } catch (error) {
      console.error('❌ [MODAL] Error cargando clientes:', error);
      alert(`Error cargando clientes: ${error}`);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarPaquetesCliente = async (clienteId: string) => {
    try {
      setLoading(true);
      // Buscar el ID Cliente (CL-XXXX) del record seleccionado
      const clienteSeleccionadoObj = clientes.find(c => c.id === clienteId);
      const idClienteParaConsulta = clienteSeleccionadoObj?.idCliente || clienteId;
      
      console.log('[MODAL] Consultando paquetes para:', {
        recordId: clienteId,
        idCliente: idClienteParaConsulta,
        nombre: clienteSeleccionadoObj?.nombre
      });
      
      const response = await fetch(`/api/paquete-aplicaciones/cliente/${idClienteParaConsulta}`);
      const data = await response.json();
      if (data.paquetes) {
        setPaquetes(data.paquetes);
      }
    } catch (error) {
      console.error('Error cargando paquetes:', error);
    } finally {
      setLoading(false);
    }
  };

  const analizarMensaje = async () => {
    if (!mensaje.trim() || !paqueteSeleccionado) {
      alert('Por favor seleccione un paquete y escriba el mensaje');
      return;
    }

    try {
      setProcesando(true);
      const response = await fetch('/api/planificacion-diaria/analizar-mensaje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje,
          paqueteId: paqueteSeleccionado,
          clienteId: clienteSeleccionado
        })
      });

      const data = await response.json();
      
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }

      setAnalisisIA(data.analisis);
      
    } catch (error) {
      console.error('Error analizando mensaje:', error);
      alert('Error al analizar el mensaje');
    } finally {
      setProcesando(false);
    }
  };

  const confirmarActualizacion = async () => {
    if (!analisisIA) return;

    try {
      setProcesando(true);
      const response = await fetch('/api/planificacion-diaria/actualizar-progreso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paqueteId: paqueteSeleccionado,
          clienteId: clienteSeleccionado,
          fecha: analisisIA.fecha,
          hectareasEjecutadas: analisisIA.hectareasTotal,
          tractores: analisisIA.tractores,
          productos: analisisIA.productos,
          observaciones: analisisIA.observaciones,
          horaInicio: analisisIA.horaInicio,
          horaSalida: analisisIA.horaSalida,
          mensajeOriginal: mensaje // Enviar el mensaje original
        })
      });

      const data = await response.json();
      
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }

      alert(`Progreso actualizado exitosamente.\n\n${data.message}`);
      
      // Limpiar y cerrar
      setMensaje('');
      setAnalisisIA(null);
      onClose();

    } catch (error) {
      console.error('Error confirmando actualización:', error);
      alert('Error al confirmar la actualización');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-600 to-red-600 text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center">
              Seguimiento Diario de Aplicaciones
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mt-2 opacity-90">Registra el progreso real vs planificado</p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Selección de Cliente y Paquete */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700">Cliente</label>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={busquedaCliente}
                  onChange={(e) => {
                    setBusquedaCliente(e.target.value);
                    setMostrarListaClientes(e.target.value.length > 0);
                    // Si limpia el campo, resetear la selección
                    if (e.target.value === '') {
                      setClienteSeleccionado('');
                    }
                  }}
                  onFocus={() => {
                    if (busquedaCliente.length > 0) {
                      setMostrarListaClientes(true);
                    }
                  }}
                  placeholder={loading ? 'Cargando clientes...' : clientes.length === 0 ? 'No hay clientes disponibles' : 'Escribir nombre del cliente...'}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 placeholder-black text-black"
                />
                {mostrarListaClientes && busquedaCliente && clientesFiltrados.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {clientesFiltrados.slice(0, 10).map(cliente => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('[MODAL] Seleccionando cliente:', cliente.nombre, 'ID:', cliente.id);
                          setClienteSeleccionado(cliente.id);
                          setBusquedaCliente(cliente.nombre);
                          setMostrarListaClientes(false); // Ocultar lista inmediatamente
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none first:rounded-t-md last:rounded-b-md border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-black">{cliente.nombre}</div>
                        <div className="text-sm text-gray-500">{cliente.ciudad} - {cliente.departamento}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {clientes.length === 0 && !loading && (
                <p className="text-sm text-red-500 mt-1">
                  No se encontraron clientes. Verifique que existan paquetes activos.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Paquete de Aplicación</label>
              <select
                value={paqueteSeleccionado}
                onChange={(e) => setPaqueteSeleccionado(e.target.value)}
                disabled={!clienteSeleccionado || loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 placeholder-black text-black"
              >
                <option value="">Seleccione un paquete</option>
                {paquetes.map(paquete => (
                  <option key={paquete.id} value={paquete.id}>
                    {paquete.nombre} - {paquete.progreso.porcentajeCompletado}% completado
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mensaje de Campo */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Mensaje de Campo</label>
              <button
                onClick={() => setMensaje(mensajeEjemplo)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Usar Ejemplo
              </button>
            </div>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Pegue aquí el mensaje de campo..."
              disabled={!paqueteSeleccionado}
              className="w-full h-48 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 placeholder-black text-black font-medium"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-gray-500">{mensaje.length} caracteres</p>
              <button
                onClick={analizarMensaje}
                disabled={!mensaje.trim() || !paqueteSeleccionado || procesando}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-300 transition-colors flex items-center"
              >
                {procesando ? 'Analizando...' : 'Analizar Mensaje'}
              </button>
            </div>
          </div>

          {/* Resultado del Análisis */}
          {analisisIA && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultado del Análisis</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Información General</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><strong>Fecha:</strong> {analisisIA.fecha}</p>
                    <p><strong>Bloque:</strong> {analisisIA.bloque}</p>
                    <p><strong>Total Ha:</strong> {analisisIA.hectareasTotal}</p>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">Productos Aplicados</h4>
                  <div className="text-sm text-green-800 space-y-1">
                    {analisisIA.productos.map((producto: any, index: number) => (
                      <p key={index}>{producto.nombre}: {producto.cantidad} {producto.unidad}</p>
                    ))}
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">Equipo de Trabajo</h4>
                  <div className="text-sm text-yellow-800 space-y-1">
                    {analisisIA.tractores.map((tractor: any, index: number) => (
                      <p key={index}>Tractor {tractor.numero}: {tractor.totalHectareas} Ha</p>
                    ))}
                  </div>
                </div>
              </div>

              {analisisIA.observaciones.length > 0 && (
                <div className="bg-orange-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-orange-900 mb-2">Observaciones</h4>
                  <div className="text-sm text-orange-800 space-y-1">
                    {analisisIA.observaciones.map((obs: string, index: number) => (
                      <p key={index}>• {obs}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-200">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Cancelar
            </button>
            {analisisIA && (
              <button
                onClick={confirmarActualizacion}
                disabled={procesando}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
              >
                {procesando ? 'Procesando...' : 'Confirmar Actualización'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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
  // Campos adicionales de Airtable
  totalHectareasAplicacion?: number;
  hectareasLotes?: number[];
  idLotes?: string[];
  productosAplicados?: any[];
  diasPlanificados?: number;
  progresoAplicacion?: number;
  estadoCronograma?: string;
  fechaInicioAplicacion?: string;
  fechaFinEstimada?: string;
  totalHectareasRealizadas?: number[];
  paqueteAplicaciones?: any[];
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
  { value: 'inoculacion', label: 'Inoculación', emoji: '', color: 'bg-blue-500' },
  { value: 'cosecha', label: 'Cosecha', emoji: '', color: 'bg-green-500' },
  { value: 'formulacion', label: 'Formulación', emoji: '', color: 'bg-purple-500' },
  { value: 'entrega', label: 'Entrega', emoji: '', color: 'bg-orange-500' },
  { value: 'mantenimiento', label: 'Mantenimiento', emoji: '', color: 'bg-gray-500' },
];

// Configuración de microorganismos predeterminados por tipo de aplicación (usando nombres exactos de Sirius Product Core)
const microorganismosPredeterminados = {
  'preventivo-pc': [
    { nombre: 'Trichoderma harzianum', dosificacionPorHa: 1.0, unidad: 'L/Ha' },
    { nombre: 'Siriusbacter', dosificacionPorHa: 1.0, unidad: 'L/Ha' }
  ],
  'preventivo-control-plagas': [
    { nombre: 'Beauveria bassiana', dosificacionPorHa: 1.5, unidad: 'L/Ha' },
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
  const [showSeguimientoModal, setShowSeguimientoModal] = useState(false);
  const [paquetesAplicaciones, setPaquetesAplicaciones] = useState<any[]>([]);
  const [loadingPaquetes, setLoadingPaquetes] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState<ProduccionEvento | null>(null);
  const [editandoEvento, setEditandoEvento] = useState<ProduccionEvento | null>(null);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editEventForm, setEditEventForm] = useState({
    fecha: '',
    estado: 'planificado' as ProduccionEvento['estado']
  });
  
  // Estados para edición de lotes
  const [editingLotes, setEditingLotes] = useState(false);
  const [editLotesData, setEditLotesData] = useState<Array<{id: string, nombre: string, hectareas: number}>>([]);
  const [availableLotes, setAvailableLotes] = useState<Array<{id: string, nombre: string}>>([]);
  const [loadingLotes, setLoadingLotes] = useState(false);
  
  const [stats, setStats] = useState<CalendarioStats>({
    totalEventos: 0,
    eventosPendientes: 0,
    eventosEnProceso: 0,
    eventosCompletados: 0
  });

  // Estado para días planificados
  const [diasPlanificados, setDiasPlanificados] = useState<any[]>([]);
  
  // Estado para sistema de burbujas contextuales
  const [showDayBubbles, setShowDayBubbles] = useState(false);
  const [selectedDayForBubbles, setSelectedDayForBubbles] = useState<Date | null>(null);
  const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 });

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
    console.log('[Calculos] Hectáreas totales calculadas:', total, 'de', lotesSeleccionadosData.length, 'lotes');
    return total;
  }, [lotesSeleccionados, todosLotesDisponibles]);

  // Calcular litros totales basados en microorganismos y hectáreas
  const litrosTotales = useMemo(() => {
    if (hectareasTotales === 0 || formData.microorganismos.length === 0) return 0;
    
    const total = formData.microorganismos.reduce((sum, micro) => {
      const litrosPorMicro = hectareasTotales * micro.dosificacionPorHa;
      return sum + litrosPorMicro;
    }, 0);
    
    console.log('[Calculos] Litros totales calculados:', total.toFixed(2), 'L');
    return total;
  }, [hectareasTotales, formData.microorganismos]);

  // Cantidad de bolsas = litros totales (1L = 1 bolsa)
  const bolsasTotales = useMemo(() => {
    const bolsas = Math.ceil(litrosTotales); // Redondear hacia arriba
    console.log('[Calculos] Bolsas totales calculadas:', bolsas);
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

  // Verificar si un día está planificado
  const isDayPlanificado = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return diasPlanificados.some(dia => dia.fecha === dateString);
  };

  // Obtener información de planificación de un día específico
  const getDayPlanificacionInfo = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return diasPlanificados.find(dia => dia.fecha === dateString);
  };

  // Handler para seleccionar fecha del calendario (con sistema de burbujas)
  const handleCalendarDateSelect = useCallback((date: Date, event: React.MouseEvent) => {
    const fechaFormateada = date.toISOString().split('T')[0];
    setSelectedDate(date);
    handleFechaChange(fechaFormateada);
    
    // Obtener posición del clic para mostrar las burbujas
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setBubblePosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    });
    
    setSelectedDayForBubbles(date);
    setShowDayBubbles(true);
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
    console.log('[APP] cerrarModal ejecutado - Stack trace:', new Error().stack);
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
      
      console.log('[FRONTEND] Consultando paquetes desde:', url);
      
      const response = await fetch(url);
      
      console.log('[FRONTEND] Response status:', response.status, response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('[FRONTEND] Response data:', data);
      
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

  // Cargar días planificados cuando cambie el mes
  useEffect(() => {
    fetchDiasPlanificados(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
  }, [currentMonth]);

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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowDayBubbles(false);
        setShowClienteDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
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
        console.error('❌ Error loading productos Sirius:', data.error);
      }
    } catch (error) {
      console.error('❌ Error fetching productos Sirius:', error);
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
      const responseAplicaciones = await fetch('/api/aplicaciones-eventos', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
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
              
              // Usar el nombre real del paquete directamente
              if (paqueteInfo.nombre) {
                // Extraer el tipo de aplicación real del nombre del paquete (formato: "Cliente - Tipo - Año")
                const nombrePartes = paqueteInfo.nombre.split(' - ');
                if (nombrePartes.length >= 2) {
                  clienteReal = nombrePartes[0];
                  tipoAplicacionReal = nombrePartes[1]; // Usar el nombre real sin mapeo inventado
                } else {
                  // Si no tiene el formato esperado, usar el nombre completo del paquete
                  tipoAplicacionReal = paqueteInfo.nombre;
                }
              }
              
              // Extraer cliente real si está disponible
              if (paqueteInfo.clearlienteId) {
                // Buscar el cliente en la lista si está disponible
                // Por ahora usar el clienteId como referencia
                clienteReal = paqueteInfo.clienteId;
              }
            }
            
            // Construir descripción con datos reales del evento
            const hectareas = evento.totalHectareasAplicacion || 0;
            const lotes = evento.idLotes?.length || 0;
            const litros = evento.cantidadLitros || 0;
            const aplicaciones = 1; // Por defecto 1, podría venir del paquete si está disponible
            
            descripcionDetallada = `${litros}L • ${hectareas.toFixed(2)}ha • ${lotes} lotes • ${aplicaciones}/año`;
            
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
              estadoAplicacion: evento.estadoAplicacion || '',
              // Datos completos de Airtable
              totalHectareasAplicacion: evento.totalHectareasAplicacion || 0,
              hectareasLotes: evento.hectareasLotes || [],
              idLotes: evento.idLotes || [],
              lotesDetallados: evento.lotesDetallados || [], // ¡FALTABA ESTA LÍNEA!
              productosAplicados: evento.productosAplicados || [],
              diasPlanificados: evento.diasPlanificados || 0,
              progresoAplicacion: evento.progresoAplicacion || 0,
              estadoCronograma: evento.estadoCronograma || '',
              fechaInicioAplicacion: evento.fechaInicioAplicacion || '',
              fechaFinEstimada: evento.fechaFinEstimada || '',
              totalHectareasRealizadas: evento.totalHectareasRealizadas || [],
              paqueteAplicaciones: evento.paqueteAplicaciones || []
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

  const fetchDiasPlanificados = async (year?: number, month?: number) => {
    try {
      const currentDate = new Date();
      const targetYear = year || currentDate.getFullYear();
      const targetMonth = month || (currentDate.getMonth() + 1);
      
      console.log('📅 [CALENDARIO] Cargando días planificados para:', { targetYear, targetMonth });
      
      const response = await fetch(`/api/planificacion-diaria/dias-planificados?year=${targetYear}&month=${targetMonth}`);
      const data = await response.json();
      
      if (data.diasPlanificados) {
        setDiasPlanificados(data.diasPlanificados);
        console.log('✅ [CALENDARIO] Días planificados cargados:', data.diasPlanificados.length);
      } else {
        console.log('⚠️ [CALENDARIO] No se encontraron días planificados');
        setDiasPlanificados([]);
      }
    } catch (error) {
      console.error('❌ [CALENDARIO] Error cargando días planificados:', error);
      setDiasPlanificados([]);
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
          areaHa: lote.areaHa,
          nombre: lote.nombreLote || lote.nombre || `Lote ${lote.id}` // Incluir el nombre del lote
        })), // Datos completos de lotes con hectáreas y nombre
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

  const handleUpdateAplicacion = async (eventoId: string, nuevoEstado: string) => {
    try {
      console.log(`🔄 Actualizando estado de aplicación ${eventoId} a ${nuevoEstado}`);
      
      // Mapear estados del frontend a estados de Airtable
      const estadosAirtable: { [key: string]: string } = {
        'planificado': 'PRESUPUESTADA',
        'en-proceso': 'CONFIRMADA', 
        'completado': 'ENTREGADA',
        'cancelado': 'POSPUESTA'
      };
      
      const estadoAirtable = estadosAirtable[nuevoEstado];
      if (!estadoAirtable) {
        console.error('Estado no válido:', nuevoEstado);
        return;
      }

      const response = await fetch('/api/aplicaciones-eventos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: eventoId, 
          estadoAplicacion: estadoAirtable 
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Estado actualizado correctamente');
        
        // Actualizar el estado local
        setSelectedEvento(prev => prev ? {
          ...prev, 
          estado: nuevoEstado as ProduccionEvento['estado'],
          estadoAplicacion: estadoAirtable
        } : prev);
        
        // Recargar eventos para sincronizar
        fetchEventos();
      } else {
        console.error('❌ Error actualizando estado:', data.error);
        alert('Error al actualizar el estado: ' + (data.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('❌ Error actualizando aplicación:', error);
      alert('Error al actualizar el estado de la aplicación');
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
    // Limpiar datos de edición de lotes
    setEditingLotes(false);
    setEditLotesData([]);
    setAvailableLotes([]);
  };

  // Funciones para manejo de lotes
  const initializeLotesEditing = async (evento: any) => {
    console.log('🔄 Inicializando edición de lotes para evento:', evento);
    
    // Crear mapeo inicial con IDs, luego obtener nombres reales
    const lotesData = evento.lotesIds?.map((id: string, index: number) => ({
      id,
      nombre: `Cargando...`, // Placeholder mientras carga el nombre real
      hectareas: evento.hectareas?.[index] || 0
    })) || [];
    
    setEditLotesData(lotesData);
    
    // Obtener clienteId del evento o usar el del paquete
    const clienteIdToUse = evento.clienteId || evento.cliente || (evento as any).paqueteInfo?.clienteId;
    console.log('🔍 Usando clienteId:', clienteIdToUse);
    
    if (clienteIdToUse) {
      await loadAvailableLotes(clienteIdToUse);
    } else {
      console.warn('⚠️ No se pudo obtener clienteId para cargar lotes');
      // Intentar obtener desde el nombre del cliente si está disponible
      if (evento.cliente) {
        console.log('🔍 Intentando buscar cliente por nombre:', evento.cliente);
      }
    }
    
    setEditingLotes(true);
  };

  const updateLoteNamesFromAvailableLotes = (lotesDisponibles: any[]) => {
    console.log('🔄 Actualizando nombres de lotes existentes con:', lotesDisponibles);
    
    setEditLotesData(prevData => {
      const updatedData = prevData.map(loteData => {
        // Buscar el nombre real en los lotes disponibles
        const loteEncontrado = lotesDisponibles.find(lote => lote.id === loteData.id);
        if (loteEncontrado) {
          console.log(`✅ Nombre encontrado para ${loteData.id}: ${loteEncontrado.nombre}`);
          return {
            ...loteData,
            nombre: loteEncontrado.nombre
          };
        } else {
          console.warn(`⚠️ No se encontró nombre para lote ${loteData.id}, manteniendo nombre actual: ${loteData.nombre}`);
          return loteData;
        }
      });
      
      console.log('📋 Lotes después de actualización de nombres:', updatedData);
      return updatedData;
    });
  };

  const loadAvailableLotes = async (clienteId: string) => {
    if (!clienteId) {
      console.warn('⚠️ No se proporcionó clienteId para cargar lotes');
      setAvailableLotes([]);
      return;
    }
    
    console.log('🔄 Iniciando carga de lotes para cliente:', clienteId);
    setLoadingLotes(true);
    try {
      // Llamar a la API para obtener lotes del cliente
      const response = await fetch(`/api/cultivos-lotes?clienteId=${clienteId}`);
      console.log('📡 Respuesta de API:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error en respuesta de API:', errorText);
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 Datos recibidos:', data);
      
      if (data.success && data.lotes) {
        const lotesOptions = data.lotes.map((lote: any) => ({
          id: lote.id,
          nombre: lote.nombreLote || lote.nombre || `Lote ${lote.id}`,
          hectareas: lote.areaHa || lote.hectareas || 0
        }));
        console.log('✅ Lotes procesados:', lotesOptions);
        setAvailableLotes(lotesOptions);
        
        // Después de cargar los lotes disponibles, actualizar los nombres de los lotes ya seleccionados
        setTimeout(() => {
          updateLoteNamesFromAvailableLotes(lotesOptions);
        }, 100);
      } else {
        console.warn('⚠️ No se encontraron lotes o respuesta no exitosa:', data);
        setAvailableLotes([]);
      }
    } catch (error) {
      console.error('❌ Error cargando lotes disponibles:', error);
      setAvailableLotes([]);
      // Mostrar mensaje de error al usuario
      alert(`Error al cargar los lotes: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoadingLotes(false);
    }
  };

  const addLoteFromSelection = (selectedLoteId: string) => {
    const selectedLote = availableLotes.find(l => l.id === selectedLoteId);
    if (selectedLote && !editLotesData.find(l => l.id === selectedLoteId)) {
      setEditLotesData(prev => [...prev, {
        id: selectedLote.id,
        nombre: selectedLote.nombre,
        hectareas: (selectedLote as any).hectareas || 0
      }]);
    }
  };

  const removeLote = (index: number) => {
    setEditLotesData(prev => prev.filter((_, i) => i !== index));
  };

  const updateLoteHectareas = (index: number, hectareas: number) => {
    setEditLotesData(prev => {
      const newData = [...prev];
      newData[index].hectareas = hectareas;
      return newData;
    });
  };

  const calculateTotalHectareas = () => {
    return editLotesData.reduce((total, lote) => total + lote.hectareas, 0);
  };

  const saveLotesChanges = () => {
    // Aquí se implementaría la lógica para guardar los cambios en la base de datos
    console.log('💾 Guardando cambios de lotes:', editLotesData);
    setEditingLotes(false);
  };

  const cancelLotesEditing = () => {
    setEditingLotes(false);
    // Restaurar datos originales si es necesario
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

  // Función para calcular si un evento necesita confirmación (15 días antes)
  const needsConfirmation = (evento: ProduccionEvento) => {
    if (evento.estado !== 'planificado') return false;
    
    const today = new Date();
    const eventDate = new Date(evento.fecha);
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= 15 && diffDays > 0;
  };

  // Función para verificar si un día es hábil (lunes a viernes)
  const isWorkingDay = (date: Date) => {
    const day = date.getDay();
    return day >= 1 && day <= 5; // 1 = lunes, 5 = viernes
  };

  // Función para calcular 15 días hábiles antes de una fecha
  const getConfirmationPeriodStart = (eventDate: Date) => {
    const startDate = new Date(eventDate);
    let workingDaysCount = 0;
    
    while (workingDaysCount < 15) {
      startDate.setDate(startDate.getDate() - 1);
      if (isWorkingDay(startDate)) {
        workingDaysCount++;
      }
    }
    
    return startDate;
  };

  // Función para verificar si una fecha está dentro del período de confirmación (15 días hábiles antes)
  const isInConfirmationPeriod = (currentDate: Date, eventDate: Date) => {
    if (!isWorkingDay(currentDate)) return false;
    
    const confirmationStart = getConfirmationPeriodStart(eventDate);
    const eventDay = new Date(eventDate);
    
    return currentDate >= confirmationStart && currentDate < eventDay;
  };

  // Función para obtener todos los eventos que tienen días de confirmación activos
  const getEventsNeedingConfirmation = () => {
    return eventos.filter(evento => evento.estado === 'planificado');
  };

  // Función para obtener los días restantes
  const getDaysLeft = (fecha: string) => {
    const today = new Date();
    const eventDate = new Date(fecha);
    const diffTime = eventDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Función para obtener el color del evento considerando si necesita confirmación
  const getEventColor = (evento: ProduccionEvento) => {
    if (needsConfirmation(evento)) {
      return 'bg-orange-500 border-2 border-orange-300 shadow-lg animate-pulse';
    }
    return getTipoEvento(evento.tipo).color;
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
                Calendario de Producción
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
                onClick={() => setShowSeguimientoModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 focus:ring-4 focus:ring-orange-500/20 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Seguimiento Diario
              </button>
              
              <button
                onClick={() => alert('Funcionalidad de Agendar Pedido - Próximamente')}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Agendar Pedido
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

          {/* Calendar View - Professional Design */}
          {vistaActual === 'mes' && (
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl shadow-2xl overflow-hidden">
              {/* Notification Banner for Confirmation Needed */}
              {eventos.some(evento => needsConfirmation(evento)) && (
                <div className="mx-6 mt-6 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">⚠️</span>
                    </div>
                    <div>
                      <p className="font-semibold text-amber-800">Eventos que requieren confirmación</p>
                      <p className="text-sm text-amber-700">
                        Hay aplicaciones a <strong>15 días o menos</strong> que necesitan ser confirmadas.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Professional Calendar Header */}
              <div className="px-6 py-5 bg-gradient-to-r from-slate-800 to-slate-900">
                <div className="flex items-center justify-between">
                  <button
                    onClick={previousMonth}
                    className="group flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/10"
                  >
                    <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="font-medium">Anterior</span>
                  </button>
                  
                  <div className="text-center">
                    <h2 className="text-3xl font-bold text-white capitalize tracking-wide">
                      {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button
                      onClick={goToToday}
                      className="mt-2 text-sm text-blue-300 hover:text-blue-200 font-medium flex items-center gap-1.5 mx-auto transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Ir a hoy
                    </button>
                  </div>
                  
                  <button
                    onClick={nextMonth}
                    className="group flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/10"
                  >
                    <span className="font-medium">Siguiente</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Leyenda de Colores - Redesigned */}
              <div className="mx-6 my-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h4 className="text-sm font-semibold text-gray-700">Leyenda del Calendario</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                    <div className="w-3 h-3 bg-blue-500 rounded-full shadow-sm"></div>
                    <span className="text-gray-700 font-medium">Hoy</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg">
                    <div className="w-3 h-3 bg-amber-500 rounded-full shadow-sm animate-pulse"></div>
                    <span className="text-gray-700 font-medium">Requiere confirmar</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
                    <div className="w-3 h-3 bg-orange-400 rounded-full shadow-sm"></div>
                    <span className="text-gray-700 font-medium">Día planificado</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-sm"></div>
                    <span className="text-gray-700 font-medium">Aplicación programada</span>
                  </div>
                </div>
              </div>

              {/* Days of Week Header - Professional */}
              <div className="px-6">
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((day, idx) => (
                    <div 
                      key={day} 
                      className={`text-center py-3 font-semibold text-sm rounded-lg ${
                        idx === 0 || idx === 6 
                          ? 'bg-slate-100 text-slate-500' 
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      <span className="hidden md:inline">{day}</span>
                      <span className="md:hidden">{day.slice(0, 3)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calendar Grid - Modern Design */}
              <div className="px-6 pb-6">
                <div className="grid grid-cols-7 gap-2">
                  {getDaysInMonth(currentMonth).map((day, index) => {
                    const dayEventos = getEventosForDate(day.date);
                    const isToday = day.date.toDateString() === new Date().toDateString();
                    const isSelectedInForm = formData.fechaInicio && day.date.toISOString().split('T')[0] === formData.fechaInicio;
                    const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
                    
                    // Verificar si este día está en el período de confirmación de algún evento
                    const eventsNeedingConfirmation = getEventsNeedingConfirmation();
                    const isConfirmationDay = eventsNeedingConfirmation.some(evento => 
                      isInConfirmationPeriod(day.date, new Date(evento.fecha))
                    );
                    
                    // Verificar si este día está planificado
                    const isPlanificado = isDayPlanificado(day.date);
                    const planificacionInfo = getDayPlanificacionInfo(day.date);
                    
                    // Determinar estilos del día
                    let dayBgClass = 'bg-white hover:bg-gray-50';
                    let dayBorderClass = 'border-gray-100';
                    let numberBgClass = '';
                    
                    if (!day.isCurrentMonth) {
                      dayBgClass = 'bg-gray-50/50';
                    } else if (isToday) {
                      dayBgClass = 'bg-gradient-to-br from-blue-50 to-indigo-100';
                      dayBorderClass = 'border-blue-400 ring-2 ring-blue-400/50';
                      numberBgClass = 'bg-blue-600 text-white';
                    } else if (isPlanificado) {
                      dayBgClass = 'bg-gradient-to-br from-orange-50 to-amber-100';
                      dayBorderClass = 'border-orange-300';
                      numberBgClass = 'bg-orange-500 text-white';
                    } else if (isConfirmationDay) {
                      dayBgClass = 'bg-gradient-to-br from-sky-50 to-blue-100';
                      dayBorderClass = 'border-sky-300';
                    } else if (isWeekend) {
                      dayBgClass = 'bg-slate-50/80';
                    }
                    
                    if (isSelectedInForm) {
                      dayBorderClass = 'border-emerald-400 ring-2 ring-emerald-400/50';
                      dayBgClass = 'bg-gradient-to-br from-emerald-50 to-green-100';
                    }
                    
                    return (
                      <div
                        key={index}
                        className={`min-h-[130px] p-2 border-2 rounded-xl transition-all duration-200 cursor-pointer 
                          hover:shadow-lg hover:scale-[1.02] hover:z-10 relative group
                          ${dayBgClass} ${dayBorderClass}`}
                        onClick={(e) => handleCalendarDateSelect(day.date, e)}
                      >
                        {/* Day Number */}
                        <div className="flex items-start justify-between mb-2">
                          <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm transition-all
                            ${numberBgClass || (day.isCurrentMonth ? 'text-gray-800' : 'text-gray-300')}
                            ${!numberBgClass && 'group-hover:bg-gray-100'}`}
                          >
                            {day.date.getDate()}
                          </div>
                          
                          {/* Status Indicators */}
                          <div className="flex gap-1">
                            {isPlanificado && (
                              <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-md" 
                                   title={`Día ${planificacionInfo?.diaNumero || ''} - ${planificacionInfo?.hectareasObjetivo || 0} Ha`}>
                                <span className="text-white text-xs">📅</span>
                              </div>
                            )}
                            {isConfirmationDay && !isPlanificado && (
                              <div className="w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center shadow-md"
                                   title="Período de confirmación">
                                <span className="text-white text-xs">📋</span>
                              </div>
                            )}
                            {dayEventos.length > 0 && (
                              <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-md text-white text-xs font-bold">
                                {dayEventos.length}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Planificación Info Badge */}
                        {isPlanificado && planificacionInfo && (
                          <div className="mb-2 px-2 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs rounded-lg shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">Día {planificacionInfo.diaNumero}</span>
                              <span className="font-bold">{planificacionInfo.hectareasObjetivo} Ha</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Events */}
                        <div className="space-y-1.5">
                          {dayEventos.slice(0, 2).map(evento => {
                            const tipo = getTipoEvento(evento.tipo);
                            const needsConf = needsConfirmation(evento);
                            const daysLeft = getDaysLeft(evento.fecha);
                            
                            return (
                              <div
                                key={evento.id}
                                className={`group/event relative text-xs px-2.5 py-1.5 rounded-lg text-white truncate cursor-pointer 
                                  transition-all duration-200 hover:scale-[1.02] shadow-sm hover:shadow-md
                                  ${needsConf 
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse' 
                                    : `bg-gradient-to-r ${tipo.value === 'inoculacion' ? 'from-emerald-500 to-green-600' : 
                                       tipo.value === 'cosecha' ? 'from-yellow-500 to-amber-600' : 
                                       tipo.value === 'formulacion' ? 'from-purple-500 to-violet-600' : 
                                       tipo.value === 'entrega' ? 'from-blue-500 to-indigo-600' : 
                                       'from-gray-500 to-slate-600'}`
                                  }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvento(evento);
                                }}
                              >
                                <div className="flex items-center gap-1">
                                  <span>{needsConf ? '⚠️' : tipo.emoji}</span>
                                  <span className="truncate font-medium">
                                    {evento.cliente || tipo.label}
                                  </span>
                                </div>
                                
                                {/* Countdown Badge */}
                                {needsConf && (
                                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white text-[10px] 
                                    rounded-full flex items-center justify-center font-bold shadow-lg border-2 border-white">
                                    {daysLeft}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                          {dayEventos.length > 2 && (
                            <div className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded-lg text-center font-medium">
                              +{dayEventos.length - 2} más
                            </div>
                          )}
                        </div>
                        
                        {/* Hover Tooltip Preview */}
                        {(dayEventos.length > 0 || isPlanificado) && (
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 
                            transition-opacity duration-200 pointer-events-none z-50 w-64">
                            <div className="bg-slate-800 text-white text-xs rounded-lg shadow-xl p-3">
                              <div className="font-semibold mb-2 pb-2 border-b border-slate-600">
                                {day.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </div>
                              {isPlanificado && planificacionInfo && (
                                <div className="mb-2 p-2 bg-orange-500/20 rounded">
                                  <span className="font-medium text-orange-300">📅 Día planificado #{planificacionInfo.diaNumero}</span>
                                  <br />
                                  <span className="text-orange-200">{planificacionInfo.hectareasObjetivo} hectáreas objetivo</span>
                                </div>
                              )}
                              {dayEventos.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-gray-300">Eventos:</span>
                                  {dayEventos.slice(0, 3).map(ev => (
                                    <div key={ev.id} className="text-gray-100">
                                      • {ev.cliente || ev.titulo || getTipoEvento(ev.tipo).label}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Arrow */}
                              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 
                                border-l-8 border-r-8 border-t-8 
                                border-l-transparent border-r-transparent border-t-slate-800"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Calendar Footer - Quick Stats */}
              <div className="px-6 py-4 bg-slate-800 border-t border-slate-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-white">{eventos.length}</div>
                    <div className="text-sm text-slate-300">Total Eventos</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-emerald-400">{eventos.filter(e => e.estado === 'completado').length}</div>
                    <div className="text-sm text-slate-300">Completados</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-amber-400">{eventos.filter(e => needsConfirmation(e)).length}</div>
                    <div className="text-sm text-slate-300">Por Confirmar</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-orange-400">{diasPlanificados.length}</div>
                    <div className="text-sm text-slate-300">Días Planificados</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* List View */}
          {vistaActual === 'lista' && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Notification Banner for List View */}
              {eventos.some(evento => needsConfirmation(evento)) && (
                <div className="m-6 mb-0 bg-orange-50 border-l-4 border-orange-400 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-orange-700">
                        <strong>Eventos que requieren confirmación:</strong> Las filas resaltadas en naranja indican aplicaciones a <strong>15 días o menos</strong> que necesitan confirmarse.
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
                          const needsConf = needsConfirmation(evento);
                          const daysLeft = getDaysLeft(evento.fecha);
                          
                          return (
                            <tr key={evento.id} className={`transition-colors ${
                              needsConf ? 'bg-orange-50 hover:bg-orange-100 border-l-4 border-orange-400' : 'hover:bg-gray-50'
                            }`}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div className="flex items-center gap-2">
                                  {formatDate(evento.fecha)}
                                  {needsConf && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-medium">
                                      {daysLeft}d restantes
                                    </span>
                                  )}
                                </div>
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
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => { console.log('Click en BACKDROP'); cerrarModal(); }}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] flex flex-col" onClick={(e) => { console.log('Click en CONTENIDO del modal - stopPropagation'); e.stopPropagation(); }}>
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
                  <form id="paquete-aplicaciones-form" onSubmit={editandoEvento ? (e) => {
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
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white text-black placeholder-black text-base"
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
                          Microorganismos y Dosificaciones
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
                          Agregar microorganismo
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
                                    disabled={loadingMicroorganismos}
                                    style={{ 
                                      position: 'relative', 
                                      zIndex: 1000,
                                      appearance: 'menulist',
                                      WebkitAppearance: 'menulist'
                                    }}
                                  >
                                    <option value="">
                                      {loadingMicroorganismos ? "Cargando microorganismos..." : "Seleccionar microorganismo..."}
                                    </option>
                                    {microorganismos.map((microorganismo) => (
                                      <option 
                                        key={microorganismo.id} 
                                        value={microorganismo.nombre}
                                        style={{ padding: '8px', color: '#374151' }}
                                      >
                                        {microorganismo.nombre} {microorganismo.tipo ? `(${microorganismo.tipo})` : ''}
                                      </option>
                                    ))}
                                    <option value="custom" style={{ padding: '8px', color: '#374151' }}>
                                      Personalizado...
                                    </option>
                                  </select>
                                  {micro.nombre === 'custom' && (
                                    <input
                                      type="text"
                                      placeholder="Escribir microorganismo personalizado..."
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-700 mt-2 placeholder-black"
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black placeholder-black"
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
                                    Eliminar
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
                          Resumen de Producción
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Hectáreas Totales */}
                          <div className="bg-white rounded-lg p-4 border-2 border-blue-300">
                            <div className="text-sm text-gray-600 mb-1">Hectáreas Totales</div>
                            <div className="text-2xl font-bold text-blue-600">
                              {hectareasTotales.toFixed(2)} ha
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {lotesSeleccionados.length} lote{lotesSeleccionados.length !== 1 ? 's' : ''} seleccionado{lotesSeleccionados.length !== 1 ? 's' : ''}
                            </div>
                          </div>

                          {/* Litros Totales */}
                          <div className="bg-white rounded-lg p-4 border-2 border-green-300">
                            <div className="text-sm text-gray-600 mb-1">Litros Necesarios</div>
                            <div className="text-2xl font-bold text-green-600">
                              {litrosTotales.toFixed(2)} L
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formData.microorganismos.length} microorganismo{formData.microorganismos.length !== 1 ? 's' : ''}
                            </div>
                          </div>

                          {/* Bolsas Totales */}
                          <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
                            <div className="text-sm text-gray-600 mb-1">Bolsas a Producir</div>
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
                    form="paquete-aplicaciones-form"
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
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header Fijo */}
                <div className="p-6 border-b border-gray-200 flex-shrink-0">
                  <div className="flex justify-between items-start">
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
                </div>

                {/* Contenido Scrolleable */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Fecha Programada</label>
                      <p className="text-gray-900 font-semibold text-lg">{formatDate(selectedEvento.fecha)}</p>
                    </div>

                    {selectedEvento.cliente && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Cliente</label>
                        <p className="text-gray-900 font-semibold">{selectedEvento.cliente}</p>
                      </div>
                    )}

                    {selectedEvento.titulo && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Tipo de Aplicación</label>
                        <p className="text-gray-900 font-semibold">{selectedEvento.titulo}</p>
                      </div>
                    )}

                    {selectedEvento.microorganismos && selectedEvento.microorganismos.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Microorganismos</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedEvento.microorganismos.map((micro: any, index: number) => (
                            <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {typeof micro === 'string' ? micro : micro.nombre || micro}
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
                        <label className="text-sm font-medium text-gray-500">Volumen Total</label>
                        <p className="text-gray-900 text-lg font-bold text-blue-600">{selectedEvento.litros} Litros</p>
                      </div>
                    )}

                    {/* Métricas Clave */}
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                      <label className="text-sm font-medium text-gray-700 mb-3 block">Métricas de la Aplicación</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {selectedEvento.totalHectareasAplicacion && (
                          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                            <div className="text-xs text-gray-500 mb-1">Total Hectáreas</div>
                            <div className="text-xl font-bold text-green-600">{selectedEvento.totalHectareasAplicacion.toFixed(2)} ha</div>
                          </div>
                        )}
                        {selectedEvento.idLotes && selectedEvento.idLotes.length > 0 && (
                          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                            <div className="text-xs text-gray-500 mb-1">Cantidad de Lotes</div>
                            <div className="text-xl font-bold text-blue-600">{selectedEvento.idLotes.length} lotes</div>
                          </div>
                        )}
                        {selectedEvento.litros && selectedEvento.litros > 0 && (
                          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                            <div className="text-xs text-gray-500 mb-1">Biológicos</div>
                            <div className="text-xl font-bold text-purple-600">{selectedEvento.litros} L</div>
                          </div>
                        )}
                        {selectedEvento.diasPlanificados && (
                          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                            <div className="text-xs text-gray-500 mb-1">Días Planificados</div>
                            <div className="text-xl font-bold text-orange-600">{selectedEvento.diasPlanificados} días</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedEvento.paqueteId && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">ID del Paquete</label>
                        <p className="text-gray-900 font-mono text-sm bg-gray-100 px-3 py-2 rounded border border-gray-300">{selectedEvento.paqueteId}</p>
                      </div>
                    )}

                    {selectedEvento.estadoAplicacion && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">Estado de la Aplicación</label>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold ${
                            selectedEvento.estadoAplicacion === 'CONFIRMADA' ? 'bg-green-100 text-green-800 border border-green-300' :
                            selectedEvento.estadoAplicacion === 'ENTREGADA' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                            selectedEvento.estadoAplicacion === 'POSPUESTA' ? 'bg-gray-100 text-gray-800 border border-gray-300' :
                            'bg-yellow-100 text-yellow-800 border border-yellow-300'
                          }`}>
                            {selectedEvento.estadoAplicacion}
                          </span>
                          {needsConfirmation(selectedEvento) && (
                            <button
                              onClick={() => {
                                handleUpdateEvento(selectedEvento.id, { estado: 'en-proceso' });
                                setSelectedEvento({ ...selectedEvento, estado: 'en-proceso' });
                              }}
                              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium transition-all animate-pulse shadow-lg"
                            >
                              Confirmar Ahora ({getDaysLeft(selectedEvento.fecha)}d restantes)
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedEvento.fechaAplicacion && selectedEvento.fechaAplicacion !== selectedEvento.fecha && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Fecha de Ejecución Real</label>
                        <p className="text-gray-900 font-semibold">{formatDate(selectedEvento.fechaAplicacion)}</p>
                      </div>
                    )}

                    {selectedEvento.fechaCreacion && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Fecha de Creación</label>
                        <p className="text-gray-700 text-sm">{new Date(selectedEvento.fechaCreacion).toLocaleString('es-CO', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</p>
                      </div>
                    )}

                    {/* Productos Aplicados */}
                    {selectedEvento.productosAplicados && selectedEvento.productosAplicados.length > 0 && (
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <label className="text-sm font-medium text-gray-700 mb-3 block">Microorganismos y Dosificaciones</label>
                        <div className="space-y-2">
                          {selectedEvento.productosAplicados.map((producto: any, index: number) => (
                            <div key={index} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-bold text-gray-900 text-base">{producto.nombre}</div>
                                  {producto.tipoProducto && (
                                    <div className="text-xs text-gray-500 mt-1">{producto.tipoProducto}</div>
                                  )}
                                </div>
                                <div className="text-right ml-4">
                                  <div className="text-lg font-bold text-purple-600">{producto.litrosTotales || 0} L</div>
                                  {producto.dosificacionPorHa > 0 && (
                                    <div className="text-xs text-gray-600 mt-1 font-medium">{producto.dosificacionPorHa} L/ha</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-purple-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Total Biológicos</span>
                            <span className="text-xl font-bold text-purple-600">{selectedEvento.litros || 0} L</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Progreso y Estado Cronograma */}
                    {(selectedEvento.progresoAplicacion !== undefined || selectedEvento.estadoCronograma) && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <label className="text-sm font-medium text-gray-700 mb-3 block">Estado del Progreso</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedEvento.progresoAplicacion !== undefined && (
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-600">Progreso de Aplicación</span>
                                <span className="text-lg font-bold text-blue-600">{selectedEvento.progresoAplicacion}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div 
                                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(selectedEvento.progresoAplicacion, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          {selectedEvento.estadoCronograma && (
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                              <div className="text-sm text-gray-600 mb-2">Estado del Cronograma</div>
                              <div className="text-lg font-bold">
                                <span className={`px-3 py-1 rounded-full ${
                                  selectedEvento.estadoCronograma.includes('En Tiempo') ? 'bg-green-100 text-green-800' :
                                  selectedEvento.estadoCronograma.includes('Moderado') ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {selectedEvento.estadoCronograma}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Lotes Detallados */}
                    {selectedEvento.lotesDetallados && selectedEvento.lotesDetallados.length > 0 ? (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="text-sm font-medium text-gray-700 mb-3 block">Distribución por Lotes ({selectedEvento.lotesDetallados.length} lotes)</label>
                        <div className="max-h-60 overflow-y-auto">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {selectedEvento.lotesDetallados.map((lote: any, index: number) => (
                              <div key={index} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-center">
                                  <div className="flex-1">
                                    <div className="font-bold text-gray-900 text-sm">{lote.nombre}</div>
                                    <div className="text-xs text-gray-500 mt-1">{lote.id}</div>
                                  </div>
                                  <div className="text-right ml-2">
                                    <div className="font-semibold text-green-600">{lote.hectareas} ha</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : selectedEvento.idLotes && selectedEvento.idLotes.length > 0 ? (
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <label className="text-sm font-medium text-yellow-700 mb-3 block">
                          Lotes sin nombres ({selectedEvento.idLotes.length} lotes)
                        </label>
                        <div className="max-h-60 overflow-y-auto">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {selectedEvento.idLotes.map((loteId: string, index: number) => (
                              <div key={index} className="bg-white p-3 rounded-lg border border-yellow-200 shadow-sm">
                                <div className="flex justify-between items-center">
                                  <div className="flex-1">
                                    <div className="font-bold text-gray-900 text-sm">{loteId}</div>
                                    <div className="text-xs text-gray-500 mt-1">ID: {loteId}</div>
                                  </div>
                                  <div className="text-right ml-2">
                                    <div className="font-semibold text-green-600">{selectedEvento.hectareasLotes?.[index] || 0} ha</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <label className="text-sm font-medium text-red-700">No hay información de lotes disponible</label>
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <label className="text-sm font-medium text-gray-500 mb-2 block">Cambiar Estado</label>
                      <div className="flex gap-2 flex-wrap">
                        {estadosEvento.map(estado => (
                          <button
                            key={estado.value}
                            onClick={() => {
                              // Si es un evento de aplicación (tiene estadoAplicacion), usar la función específica
                              if (selectedEvento.estadoAplicacion) {
                                handleUpdateAplicacion(selectedEvento.id, estado.value);
                              } else {
                                // Para eventos regulares, usar la función original
                                handleUpdateEvento(selectedEvento.id, { estado: estado.value as ProduccionEvento['estado'] });
                                setSelectedEvento({ ...selectedEvento, estado: estado.value as ProduccionEvento['estado'] });
                              }
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
                </div>

                {/* Footer Fijo */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedEvento(null)}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
                    >
                      Cerrar
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteEvento(selectedEvento.id);
                        setSelectedEvento(null);
                      }}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium"
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
                    <h2 className="text-2xl font-bold text-gray-900">Paquetes de Aplicaciones</h2>
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
                                  Cliente ID: {paquete.clienteId}
                                </span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {paquete.lotesIds?.length ?? 0} Lotes
                                </span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {paquete.microorganismos?.length ?? 0} Microorganismos
                                </span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  {paquete.cantidadAplicacionesAno} aplicaciones/año
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
                          Información Principal de la Aplicación
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Fecha Programada
                            </label>
                            <input
                              type="date"
                              value={editEventForm.fecha}
                              onChange={(e) => setEditEventForm(prev => ({...prev, fecha: e.target.value}))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-black text-black"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Estado de Aplicación
                            </label>
                            <select
                              value={editEventForm.estado}
                              onChange={(e) => setEditEventForm(prev => ({...prev, estado: e.target.value as any}))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                            >
                              <option value="planificado">PRESUPUESTADA</option>
                              <option value="en-proceso">CONFIRMADA</option>
                              <option value="completado">ENTREGADA</option>
                              <option value="cancelado">POSPUESTA</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Total Hectáreas
                            </label>
                            <input
                              type="text"
                              value={`${(editandoEvento as any).totalHectareas || 'N/A'} ha`}
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-black placeholder-black"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Información de Lotes - Editable */}
                      {(editandoEvento as any).lotesIds && (editandoEvento as any).lotesIds.length > 0 && (
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="font-semibold text-green-900 flex items-center gap-2">
                              Lotes de Aplicación ({editingLotes ? editLotesData.length : (editandoEvento as any).lotesIds.length} lotes)
                            </h3>
                            <div className="flex gap-2">
                              {!editingLotes ? (
                                <button
                                  onClick={() => initializeLotesEditing(editandoEvento)}
                                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                >
                                  Gestionar Lotes
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={saveLotesChanges}
                                    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    onClick={cancelLotesEditing}
                                    className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Vista de solo lectura */}
                          {!editingLotes && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {(editandoEvento as any).lotesIds.map((loteId: string, index: number) => (
                                <div key={index} className="bg-white p-3 rounded-lg border shadow-sm">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                                        Lote #{index + 1}
                                      </span>
                                      <p className="font-semibold text-gray-900 mt-1">{loteId}</p>
                                      <p className="text-xs text-gray-600">ID del Lote</p>
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
                          )}

                          {/* Vista de edición */}
                          {editingLotes && (
                            <div className="space-y-4">
                              {/* Selector para agregar lotes */}
                              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <label className="block text-sm font-medium text-blue-900 mb-2">
                                  ➕ Agregar Lote del Cliente
                                </label>
                                <div className="flex gap-2">
                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        addLoteFromSelection(e.target.value);
                                        e.target.value = ''; // Reset selection
                                      }
                                    }}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                                    disabled={loadingLotes}
                                  >
                                    <option value="">
                                      {loadingLotes ? 'Cargando lotes...' : 'Seleccionar lote disponible'}
                                    </option>
                                    {availableLotes
                                      .filter(lote => !editLotesData.find(selected => selected.id === lote.id))
                                      .map(lote => (
                                        <option key={lote.id} value={lote.id}>
                                          {lote.nombre} - {(lote as any).hectareas || 0} ha (ID: {lote.id})
                                        </option>
                                      ))
                                    }
                                  </select>
                                </div>
                                <p className="text-xs text-blue-700 mt-1">
                                  Solo se muestran lotes disponibles para este cliente que no están ya seleccionados
                                </p>
                              </div>

                              {/* Lotes seleccionados */}
                              <div className="space-y-3">
                                {editLotesData.map((lote, index) => (
                                  <div key={index} className="bg-white p-4 rounded-lg border shadow-sm">
                                    <div className="flex items-center gap-3">
                                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium flex-shrink-0">
                                        Lote #{index + 1}
                                      </span>
                                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del Lote</label>
                                          <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-700">
                                            <div className="font-medium">{lote.nombre}</div>
                                            <div className="text-xs text-gray-500 mt-1">ID: {lote.id}</div>
                                          </div>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">Hectáreas</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={lote.hectareas}
                                            onChange={(e) => updateLoteHectareas(index, parseFloat(e.target.value) || 0)}
                                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 text-sm text-black placeholder-black"
                                          />
                                          <p className="text-xs text-gray-500 mt-1">Ajustar hectáreas si es necesario</p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => removeLote(index)}
                                        className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded flex-shrink-0"
                                        title="Quitar lote de la aplicación"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                
                                {editLotesData.length === 0 && (
                                  <div className="text-center py-6 text-gray-500">
                                    <p>No hay lotes seleccionados</p>
                                    <p className="text-sm">Usa el selector de arriba para agregar lotes del cliente</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Resumen Total */}
                          <div className="bg-white p-3 rounded-lg mt-3 border-2 border-green-200">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-green-900">Resumen Total:</span>
                              <div className="text-right">
                                <span className="font-bold text-green-900 text-lg">
                                  {editingLotes ? editLotesData.length : (editandoEvento as any).lotesIds.length} lotes
                                </span>
                                <span className="mx-2">•</span>
                                <span className="font-bold text-green-900 text-lg">
                                  {editingLotes ? calculateTotalHectareas().toFixed(2) : ((editandoEvento as any).totalHectareas || 'N/A')} ha
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Información de Productos y Biológicos */}
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                          Productos Biológicos y Cantidades
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="bg-white p-4 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-gray-900">Cantidad Total de Biológicos</h4>
                            </div>
                            <p className="text-3xl font-bold text-purple-600">
                              {(editandoEvento as any).cantidadBiologicos || 'N/A'} <span className="text-lg">litros</span>
                            </p>
                          </div>
                          
                          <div className="bg-white p-4 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">📦</span>
                              <span className="text-gray-600 text-sm">Productos</span>
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
                          Información de Debug (Temporal)
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
                          Control de Fechas y Trazabilidad
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

          {/* Modal de Seguimiento Diario */}
          {showSeguimientoModal && (
            <SeguimientoDiarioModal 
              onClose={() => setShowSeguimientoModal(false)} 
            />
          )}

          {/* Burbujas Contextuales del Calendario */}
          {showDayBubbles && selectedDayForBubbles && (
            <>
              {/* Overlay para cerrar las burbujas */}
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowDayBubbles(false)}
              />
              
              {/* Contenedor de burbujas */}
              <div 
                className="fixed z-50 transform -translate-x-1/2 -translate-y-1/2"
                style={{ 
                  left: `${Math.min(Math.max(bubblePosition.x, 200), window.innerWidth - 200)}px`,
                  top: `${Math.min(Math.max(bubblePosition.y, 100), window.innerHeight - 200)}px`
                }}
              >
                {(() => {
                  const fechaSeleccionada = selectedDayForBubbles.toISOString().split('T')[0];
                  const eventosDelDia = getEventosForDate(selectedDayForBubbles);
                  const diaInfo = getDayPlanificacionInfo(selectedDayForBubbles);
                  const esDiaPlanificado = isDayPlanificado(selectedDayForBubbles);
                  const today = new Date();
                  const isToday = selectedDayForBubbles.toDateString() === today.toDateString();
                  const isPast = selectedDayForBubbles < today && !isToday;
                  
                  // Determinar qué tipo de día es para mostrar las opciones adecuadas
                  const tieneEventos = eventosDelDia.length > 0;
                  const eventosPendientesConfirmacion = eventosDelDia.filter(e => needsConfirmation(e));
                  const eventosEnProceso = eventosDelDia.filter(e => e.estadoAplicacion === 'en-proceso' || e.estadoAplicacion === 'iniciado');
                  const eventosCompletados = eventosDelDia.filter(e => e.estadoAplicacion === 'completado');
                  
                  return (
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 min-w-[280px] max-w-[320px] transform transition-all duration-200 scale-100 opacity-100">
                      {/* Cabecera con fecha */}
                      <div className="text-center mb-4 pb-3 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-800">
                          {selectedDayForBubbles.toLocaleDateString('es-ES', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long'
                          })}
                        </h3>
                        {isToday && (
                          <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                            Hoy
                          </span>
                        )}
                        {isPast && (
                          <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            Pasado
                          </span>
                        )}
                      </div>
                      
                      {/* Opciones contextuales */}
                      <div className="space-y-2">
                        {/* Si no hay eventos - Solo mostrar crear evento */}
                        {!tieneEventos && (
                          <button
                            onClick={() => {
                              setShowDayBubbles(false);
                              openAddModal(undefined, fechaSeleccionada);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-md"
                          >
                            <span className="text-xl">➕</span>
                            <span>Crear Evento</span>
                          </button>
                        )}
                        
                        {/* Si hay eventos pendientes de confirmación */}
                        {eventosPendientesConfirmacion.length > 0 && (
                          <>
                            <button
                              onClick={() => {
                                setShowDayBubbles(false);
                                setSelectedEvento(eventosPendientesConfirmacion[0]);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-md animate-pulse"
                            >
                              <span className="text-xl">⚠️</span>
                              <div className="text-left flex-1">
                                <div>Confirmar Aplicación</div>
                                <div className="text-xs opacity-90">
                                  {getDaysLeft(eventosPendientesConfirmacion[0].fecha)} días restantes
                                </div>
                              </div>
                            </button>
                            <button
                              onClick={() => {
                                setShowDayBubbles(false);
                                openAddModal(undefined, fechaSeleccionada);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-md"
                            >
                              <span className="text-xl">➕</span>
                              <span>Agregar Otro Evento</span>
                            </button>
                          </>
                        )}
                        
                        {/* Si hay eventos programados/en proceso */}
                        {tieneEventos && eventosPendientesConfirmacion.length === 0 && (
                          <>
                            <button
                              onClick={() => {
                                setShowDayBubbles(false);
                                setSelectedEvento(eventosDelDia[0]);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-md"
                            >
                              <span className="text-xl">👁️</span>
                              <div className="text-left flex-1">
                                <div>Ver Aplicación</div>
                                <div className="text-xs opacity-90">
                                  {eventosDelDia[0]?.titulo || getTipoEvento(eventosDelDia[0]?.tipo).label}
                                </div>
                              </div>
                            </button>
                            
                            {(eventosEnProceso.length > 0 || esDiaPlanificado || isToday) && (
                              <button
                                onClick={() => {
                                  setShowDayBubbles(false);
                                  setShowSeguimientoModal(true);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-md"
                              >
                                <span className="text-xl">📊</span>
                                <span>Ver Progreso del Día</span>
                              </button>
                            )}
                            
                            <button
                              onClick={() => {
                                setShowDayBubbles(false);
                                openAddModal(undefined, fechaSeleccionada);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-md"
                            >
                              <span className="text-xl">➕</span>
                              <span>Agregar Evento</span>
                            </button>
                          </>
                        )}
                      </div>
                      
                      {/* Información adicional */}
                      {tieneEventos && (
                        <div className="mt-4 pt-3 border-t border-gray-100">
                          <div className="text-xs text-gray-600 space-y-1">
                            {eventosDelDia.length > 1 && (
                              <div>📊 {eventosDelDia.length} eventos programados</div>
                            )}
                            {eventosCompletados.length > 0 && (
                              <div className="text-green-600">✅ {eventosCompletados.length} completados</div>
                            )}
                            {eventosEnProceso.length > 0 && (
                              <div className="text-blue-600">🔄 {eventosEnProceso.length} en proceso</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
