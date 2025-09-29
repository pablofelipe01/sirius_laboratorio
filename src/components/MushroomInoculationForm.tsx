'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CepaSelector from './CepaSelector';

// Componente de Calendario
interface CalendarioSelectorProps {
  fechaSeleccionada: string;
  onFechaSeleccionada: (fecha: string) => void;
}

const CalendarioSelector = ({ fechaSeleccionada, onFechaSeleccionada }: CalendarioSelectorProps) => {
  const [mesActual, setMesActual] = useState(new Date());
  
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  const obtenerDiasDelMes = () => {
    const año = mesActual.getFullYear();
    const mes = mesActual.getMonth();
    
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const diaSemanaInicio = primerDia.getDay();
    
    const dias = [];
    
    // Días del mes anterior (para rellenar)
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      const diaAnterior = new Date(año, mes, -i);
      dias.push({
        dia: diaAnterior.getDate(),
        esOtroMes: true,
        fecha: diaAnterior
      });
    }
    
    // Días del mes actual
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fecha = new Date(año, mes, dia);
      dias.push({
        dia,
        esOtroMes: false,
        fecha
      });
    }
    
    // Días del mes siguiente (para completar la grilla)
    const diasRestantes = 42 - dias.length; // 6 filas x 7 días
    for (let dia = 1; dia <= diasRestantes; dia++) {
      const fechaSiguiente = new Date(año, mes + 1, dia);
      dias.push({
        dia,
        esOtroMes: true,
        fecha: fechaSiguiente
      });
    }
    
    return dias;
  };
  
  const formatearFecha = (fecha: Date) => {
    return fecha.toISOString().split('T')[0];
  };
  
  const esFechaSeleccionada = (fecha: Date) => {
    return formatearFecha(fecha) === fechaSeleccionada;
  };
  
  const esHoy = (fecha: Date) => {
    const hoy = new Date();
    return fecha.toDateString() === hoy.toDateString();
  };
  
  const cambiarMes = (direccion: number) => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + direccion, 1));
  };
  
  const seleccionarFecha = (fecha: Date) => {
    onFechaSeleccionada(formatearFecha(fecha));
  };
  
  const dias = obtenerDiasDelMes();
  
  return (
    <div className="w-full max-w-xs mx-auto">
      {/* Header del calendario */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => cambiarMes(-1)}
          className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors bg-gray-700 hover:bg-gray-800"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h3 className="text-base font-semibold text-gray-900">
          {meses[mesActual.getMonth()]} {mesActual.getFullYear()}
        </h3>
        
        <button
          type="button"
          onClick={() => cambiarMes(1)}
          className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors bg-gray-700 hover:bg-gray-800"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {diasSemana.map(dia => (
          <div key={dia} className="text-center text-xs font-medium text-gray-500 py-1">
            {dia}
          </div>
        ))}
      </div>
      
      {/* Grilla de días */}
      <div className="grid grid-cols-7 gap-1">
        {dias.map((diaObj, index) => {
          const esSeleccionada = esFechaSeleccionada(diaObj.fecha);
          const esHoyDia = esHoy(diaObj.fecha);
          
          return (
            <button
              key={index}
              type="button"
              onClick={() => seleccionarFecha(diaObj.fecha)}
              className={`
                p-1.5 text-xs rounded-lg transition-all duration-200 hover:bg-blue-100
                ${diaObj.esOtroMes ? 'text-gray-300' : 'text-gray-900'}
                ${esSeleccionada ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                ${esHoyDia && !esSeleccionada ? 'bg-blue-100 text-blue-600 font-semibold' : ''}
                ${!diaObj.esOtroMes && !esSeleccionada && !esHoyDia ? 'hover:bg-gray-100' : ''}
              `}
            >
              {diaObj.dia}
            </button>
          );
        })}
      </div>
      
      {/* Fecha seleccionada */}
      {fechaSeleccionada && (
        <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-center">
            <p className="text-xs text-blue-600 font-medium">Fecha seleccionada:</p>
            <p className="text-sm font-semibold text-blue-800">
              {new Date(fechaSeleccionada + 'T00:00:00').toLocaleDateString('es-CO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

interface CepaSeleccionada {
  cepaId: string;
  cantidad: number;
  microorganismo: string;
  abreviatura: string;
  codigoCepa: string;
  totalDisponible: number;
}

interface InoculationData {
  bagQuantity: number;
  microorganism: string;
  microorganismId: string;
  inoculationDate: string;
  responsables: string[];
  responsablesIds: string[];
  registradoPor: string;
  cepasSeleccionadas: CepaSeleccionada[];
}

interface Microorganism {
  id: string;
  nombre: string;
}

interface Responsable {
  id: string;
  nombre: string;
}

const MushroomInoculationForm = () => {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<InoculationData>({
    bagQuantity: 0,
    microorganism: '',
    microorganismId: '',
    inoculationDate: '',
    responsables: [],
    responsablesIds: [],
    registradoPor: user?.nombre || '',
    cepasSeleccionadas: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [insumosCalculados, setInsumosCalculados] = useState<any[]>([]);

  const [microorganisms, setMicroorganisms] = useState<Microorganism[]>([]);
  const [loadingMicroorganisms, setLoadingMicroorganisms] = useState(true);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [loadingResponsables, setLoadingResponsables] = useState(true);

  // Función para verificar stock disponible de un insumo
  const verificarStockDisponible = async (insumoId: string) => {
    try {
      console.log(`🔍 Verificando stock para insumo ID: ${insumoId}`);
      
      // Usar la misma lógica que la tabla de stock de insumos
      const response = await fetch('/api/stock-insumos');
      console.log(`📡 Respuesta de API stock-insumos:`, response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`📊 Datos de stock-insumos:`, data);
        
        if (data.success && data.insumos) {
          // Buscar el insumo específico por ID
          const insumoEncontrado = data.insumos.find((insumo: any) => insumo.id === insumoId);
          
          if (insumoEncontrado) {
            // Usar el campo 'Total Insumo Unidades' que aparece en los logs
            const stockDisponible = insumoEncontrado.fields['Total Insumo Unidades'] || 0;
            console.log(`✅ Stock encontrado para ${insumoId}: ${stockDisponible} unidades`);
            return stockDisponible;
          } else {
            console.log(`⚠️ Insumo ${insumoId} no encontrado en la tabla de stock`);
            return 0;
          }
        } else {
          console.log(`❌ Respuesta no exitosa de stock-insumos:`, data);
          return 0;
        }
      } else {
        console.log(`❌ Error HTTP en stock-insumos:`, response.status, response.statusText);
        return 0;
      }
    } catch (error) {
      console.error('❌ Error verificando stock:', error);
      return 0;
    }
  };

  useEffect(() => {
    fetchMicroorganisms();
    fetchResponsables();
  }, []);

  // Actualizar el campo registradoPor cuando cambie el usuario
  useEffect(() => {
    if (user?.nombre) {
      setFormData(prev => ({
        ...prev,
        registradoPor: user.nombre
      }));
    }
  }, [user]);

  const fetchResponsables = async () => {
    try {
      const response = await fetch('/api/equipo');
      const data = await response.json();
      if (data.success) {
        setResponsables(data.responsables);
      } else {
        setResponsables([]);
      }
    } catch {
      setResponsables([]);
    } finally {
      setLoadingResponsables(false);
    }
  };

  const fetchMicroorganisms = async () => {
    try {
      const response = await fetch('/api/microorganismos');
      const data = await response.json();
      
      if (data.success) {
        setMicroorganisms(data.microorganismos);
      } else {
        console.error('Error loading microorganisms:', data.error);
        // Fallback a lista estática
        setMicroorganisms([
          { id: 'fallback-1', nombre: 'Pleurotus ostreatus' },
          { id: 'fallback-2', nombre: 'Shiitake (Lentinula edodes)' },
          { id: 'fallback-3', nombre: 'Otro (especificar en notas)' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching microorganisms:', error);
      // Fallback a lista estática
      setMicroorganisms([
        { id: 'fallback-1', nombre: 'Pleurotus ostreatus' },
        { id: 'fallback-2', nombre: 'Shiitake (Lentinula edodes)' },
        { id: 'fallback-3', nombre: 'Otro (especificar en notas)' }
      ]);
    } finally {
      setLoadingMicroorganisms(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (e.target instanceof HTMLSelectElement && e.target.multiple) {
      const selected = Array.from(e.target.selectedOptions);
      const selectedValues = selected.map(option => option.value);
      const selectedIds = selected.map(option => option.getAttribute('data-id') || '');
      setFormData(prev => ({ 
        ...prev, 
        [name]: selectedValues,
        [`${name}Ids`]: selectedIds
      }));
    } else if (name === 'microorganism' && e.target instanceof HTMLSelectElement) {
      const selectedOption = e.target.options[e.target.selectedIndex];
      const microorganismId = selectedOption.getAttribute('data-id') || '';
      setFormData(prev => ({
        ...prev,
        microorganism: value,
        microorganismId: microorganismId,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : value,
      }));
    }
  };

  const handleCepaAgregada = (cepa: CepaSeleccionada) => {
    setFormData(prev => ({
      ...prev,
      cepasSeleccionadas: [...prev.cepasSeleccionadas, cepa]
    }));
  };

  const handleRemoverCepa = (index: number) => {
    setFormData(prev => ({
      ...prev,
      cepasSeleccionadas: prev.cepasSeleccionadas.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validación: verificar que se hayan seleccionado cepas
    if (formData.cepasSeleccionadas.length === 0) {
      setErrorMessage('❌ Error: Debe seleccionar al menos una cepa para continuar con la inoculación.');
      setSubmitStatus('error');
      return;
    }

    // Calcular insumos necesarios basado en la cantidad total de bolsas
    const totalBolsas = formData.bagQuantity;
    const insumosNecesarios = await calcularInsumos(totalBolsas);
    setInsumosCalculados(insumosNecesarios);

    // Mostrar modal de confirmación
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      // Enviar datos a la API de Airtable
      const response = await fetch('/api/inoculacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Si la inoculación se creó exitosamente, crear registros de Salida Cepas
        // LÓGICA TRANSACCIONAL: Si falla la salida de cepas, eliminar la inoculación creada
        if (formData.cepasSeleccionadas.length > 0 && result.recordId) {
          try {
            const salidaCepasData = formData.cepasSeleccionadas.map(cepa => ({
              fechaEvento: formData.inoculationDate,
              cantidadBolsasUsadas: cepa.cantidad,
              cepaId: cepa.cepaId,
              inoculacionId: result.recordId
            }));

            const salidaResponse = await fetch('/api/salida-cepas', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                registros: salidaCepasData,
                userName: user?.nombre || formData.registradoPor
              }),
            });

            const salidaResult = await salidaResponse.json();
            
            if (salidaResponse.ok && salidaResult.success) {
              console.log('✅ Registros de Salida Cepas creados:', salidaResult.total);
              
              // Ahora crear las salidas de insumos
              try {
                console.log('📦 Creando salidas de insumos...');
                
                const salidaInsumosData = insumosCalculados.map(insumo => ({
                  fecha: formData.inoculationDate,
                  cantidad: insumo.cantidad,
                  unidad: insumo.unidad,
                  insumoId: insumo.id,
                  equivalenciaGramos: insumo.equivalenciaGramos,
                  inoculacionId: result.recordId,
                  userName: user?.nombre || formData.registradoPor,
                  nombreEvento: `Inoculación ${formData.microorganism} - ${formData.bagQuantity} bolsas`
                }));

                const salidaInsumosResponse = await fetch('/api/salida-insumos-auto', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ 
                    registros: salidaInsumosData,
                    inoculacionId: result.recordId,
                    userName: user?.nombre || formData.registradoPor
                  }),
                });

                const salidaInsumosResult = await salidaInsumosResponse.json();
                
                if (salidaInsumosResponse.ok && salidaInsumosResult.success) {
                  console.log('✅ Registros de Salida Insumos creados:', salidaInsumosResult.total);
                  console.log('✅ Transacción completa: Inoculación + Salida Cepas + Salida Insumos');
                } else {
                  console.error('❌ Error al crear registros de Salida Insumos:', salidaInsumosResult.error);
                  console.log('🔄 Iniciando rollback completo...');
                  
                  // ROLLBACK COMPLETO: Eliminar inoculación y salidas de cepas
                  try {
                    // Primero eliminar las salidas de cepas
                    const deleteCepasResponse = await fetch('/api/salida-cepas', {
                      method: 'DELETE',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ inoculacionId: result.recordId }),
                    });
                    
                    if (deleteCepasResponse.ok) {
                      console.log('✅ Rollback: Salidas de cepas eliminadas');
                    } else {
                      console.warn('⚠️ No se pudieron eliminar salidas de cepas en rollback');
                    }
                    
                    // Luego eliminar la inoculación
                    const rollbackResponse = await fetch(`/api/inoculacion/${result.recordId}`, {
                      method: 'DELETE',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                    });
                    
                    if (rollbackResponse.ok) {
                      console.log('✅ Rollback: Inoculación eliminada');
                      setSubmitStatus('error');
                      setErrorMessage(`Error transaccional: No se pudo registrar la salida de insumos. Todas las operaciones fueron canceladas automáticamente. Detalle: ${salidaInsumosResult.error}`);
                    } else {
                      setSubmitStatus('error');
                      setErrorMessage(`Error crítico: Fallo al registrar salida de insumos Y no se pudo deshacer completamente. ID de inoculación: ${result.recordId}. Contacte al administrador.`);
                    }
                  } catch (rollbackError) {
                    console.error('❌ Error en rollback completo:', rollbackError);
                    setSubmitStatus('error');
                    setErrorMessage(`Error crítico durante rollback completo. ID de inoculación: ${result.recordId}. Contacte al administrador.`);
                  }
                  return; // Salir sin marcar como éxito
                }
              } catch (error) {
                console.error('❌ Error de conexión al crear Salida Insumos:', error);
                console.log('🔄 Iniciando rollback por error de conexión en insumos...');
                
                // ROLLBACK por error de conexión en insumos
                try {
                  const rollbackResponse = await fetch(`/api/inoculacion/${result.recordId}`, {
                    method: 'DELETE',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  });
                  
                  if (rollbackResponse.ok) {
                    console.log('✅ Rollback exitoso: Inoculación eliminada');
                    setSubmitStatus('error');
                    setErrorMessage('Error de conexión al registrar la salida de insumos. Todas las operaciones fueron canceladas automáticamente. Intente nuevamente.');
                  } else {
                    setSubmitStatus('error');
                    setErrorMessage(`Error crítico: Fallo de conexión en insumos Y no se pudo deshacer. ID: ${result.recordId}. Contacte al administrador.`);
                  }
                } catch (rollbackError) {
                  console.error('❌ Error doble de conexión en rollback:', rollbackError);
                  setSubmitStatus('error');
                  setErrorMessage(`Error crítico de conexión doble en insumos. ID de inoculación: ${result.recordId}. Contacte al administrador.`);
                }
                return; // Salir sin marcar como éxito
              }
            } else {
              console.error('❌ Error al crear registros de Salida Cepas:', salidaResult.error);
              console.log('🔄 Iniciando rollback de la inoculación...');
              
              // ROLLBACK: Eliminar la inoculación creada porque falló la salida de cepas
              try {
                const rollbackResponse = await fetch(`/api/inoculacion/${result.recordId}`, {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                });
                
                const rollbackResult = await rollbackResponse.json();
                
                if (rollbackResponse.ok && rollbackResult.success) {
                  console.log('✅ Rollback exitoso: Inoculación eliminada');
                  setSubmitStatus('error');
                  setErrorMessage(`Error transaccional: No se pudo registrar la salida de cepas. La inoculación fue cancelada automáticamente. Detalle: ${salidaResult.error}`);
                } else {
                  console.error('❌ Error en rollback:', rollbackResult.error);
                  setSubmitStatus('error');
                  setErrorMessage(`Error crítico: Fallo al registrar salida de cepas Y no se pudo deshacer la inoculación. Contacte al administrador. ID de inoculación: ${result.recordId}`);
                }
              } catch (rollbackError) {
                console.error('❌ Error de conexión en rollback:', rollbackError);
                setSubmitStatus('error');
                setErrorMessage(`Error crítico de conexión durante rollback. ID de inoculación: ${result.recordId}. Contacte al administrador.`);
              }
              return; // Salir sin marcar como éxito
            }
          } catch (error) {
            console.error('❌ Error de conexión al crear Salida Cepas:', error);
            console.log('🔄 Iniciando rollback por error de conexión...');
            
            // ROLLBACK: Eliminar la inoculación creada porque falló la conexión
            try {
              const rollbackResponse = await fetch(`/api/inoculacion/${result.recordId}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
              });
              
              if (rollbackResponse.ok) {
                console.log('✅ Rollback exitoso: Inoculación eliminada');
                setSubmitStatus('error');
                setErrorMessage('Error de conexión al registrar la salida de cepas. La inoculación fue cancelada automáticamente. Intente nuevamente.');
              } else {
                console.error('❌ Error en rollback por conexión');
                setSubmitStatus('error');
                setErrorMessage(`Error crítico: Fallo de conexión Y no se pudo deshacer la inoculación. ID: ${result.recordId}. Contacte al administrador.`);
              }
            } catch (rollbackError) {
              console.error('❌ Error doble de conexión en rollback:', rollbackError);
              setSubmitStatus('error');
              setErrorMessage(`Error crítico de conexión doble. ID de inoculación: ${result.recordId}. Contacte al administrador.`);
            }
            return; // Salir sin marcar como éxito
          }
        }

        // Solo llegar aquí si todo fue exitoso
        setSubmitStatus('success');
        
        setFormData({
          bagQuantity: 0,
          microorganism: '',
          microorganismId: '',
          inoculationDate: '',
          responsables: [],
          responsablesIds: [],
          registradoPor: user?.nombre || '',
          cepasSeleccionadas: [],
        });
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.error || 'Error al registrar la inoculación');
      }
    } catch {
      setSubmitStatus('error');
      setErrorMessage('Error de conexión. Por favor, intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubmit = () => {
    setShowConfirmModal(false);
  };

  // Función para calcular insumos según la fórmula maestra
  const calcularInsumos = async (cantidadBolsas: number) => {
    const formInsumos = [
      {
        id: 'recAhttbj6RjnpACX',
        nombre: 'Arroz',
        cantidad: cantidadBolsas * 150,
        unidad: 'gr',
        descripcion: 'Arroz por @',
        equivalenciaGramos: 11339.8 // 1 paquete = 11,339.8gr
      },
      {
        id: 'rec6U8tw8EEoFx52A',
        nombre: 'Clorafenicol',
        cantidad: cantidadBolsas * 0.014,
        unidad: 'gr',
        descripcion: 'Antibiótico-cloranfenicol',
        equivalenciaGramos: 20 // 1 unidad = 20gr
      },
      {
        id: 'recXBHudUK2T0OcPI',
        nombre: 'Melaza',
        cantidad: cantidadBolsas * 0.56,
        unidad: 'gr',
        descripcion: 'Melaza',
        equivalenciaGramos: 30000 // 1 unidad = 30,000gr
      },
      {
        id: 'recHlpm0r9IILswJP',
        nombre: 'Bolsa polipropileno',
        cantidad: cantidadBolsas * 1,
        unidad: 'unidad',
        descripcion: 'Bolsas de Polipropileno x 100und',
        equivalenciaGramos: 100 // 1 paquete = 100 unidades
      },
      {
        id: 'rec9AVRKuMfYoLozj',
        nombre: 'Tween 80',
        cantidad: cantidadBolsas * 0.028,
        unidad: 'ml',
        descripcion: 'Tween 80 x 500ml',
        equivalenciaGramos: 500 // 1 tarro = 500ml
      },
      {
        id: 'recd9ipWHpeMzBX3O',
        nombre: 'Algodón',
        cantidad: cantidadBolsas * 0.42,
        unidad: 'gr',
        descripcion: 'Bolsa copos de algodón x 500 gr',
        equivalenciaGramos: 500 // 1 bolsa = 500gr
      }
    ];

    // Verificar stock disponible para cada insumo
    const insumosConStock = await Promise.all(
      formInsumos.map(async (insumo) => {
        const stockDisponible = await verificarStockDisponible(insumo.id);
        return {
          ...insumo,
          stockDisponible,
          disponible: stockDisponible >= insumo.cantidad
        };
      })
    );

    return insumosConStock;
  };

  return (
    <div 
      className="min-h-screen relative pt-16"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay para mejor legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-15">
        {/* Header Profesional */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 sm:p-4 mb-4 sm:mb-8 border border-white/20">
          <div className="flex items-center justify-center">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 text-center">
                Inoculación de Microorganismos
              </h1>
              <p className="text-sm sm:text-lg text-gray-600 flex items-center justify-center">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                <span className="hidden sm:inline">Sistema DataLab - Sirius Regenerative Solutions S.A.S ZOMAC</span>
                <span className="sm:hidden">Sistema DataLab - Sirius</span>
              </p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {submitStatus === 'success' && (
          <div className="bg-green-50/95 backdrop-blur-sm border border-green-200 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-8 shadow-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4">
                <h3 className="text-base sm:text-lg font-semibold text-green-800 mb-1 sm:mb-2">
                  ✅ Inoculación registrada exitosamente
                </h3>
                <p className="text-sm sm:text-base text-green-700">
                  Los datos han sido guardados correctamente en Airtable con trazabilidad completa.
                </p>
              </div>
            </div>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="bg-red-50/95 backdrop-blur-sm border border-red-200 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-8 shadow-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4">
                <h3 className="text-base sm:text-lg font-semibold text-red-800 mb-1 sm:mb-2">
                  ❌ Error al registrar
                </h3>
                <p className="text-red-700">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Formulario */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 sm:p-6 border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Fecha de Inoculación */}
            <div>
              <label htmlFor="inoculationDate" className="block text-sm font-semibold text-gray-900 mb-2">
                📅 Fecha de Inoculación *
              </label>
              <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                <CalendarioSelector 
                  fechaSeleccionada={formData.inoculationDate}
                  onFechaSeleccionada={(fecha) => {
                    setFormData(prev => ({
                      ...prev,
                      inoculationDate: fecha
                    }));
                  }}
                />
              </div>
            </div>

            {/* Microorganismo */}
            <div>
              <label htmlFor="microorganism" className="block text-sm font-semibold text-gray-900 mb-2">
                Microorganismo *
              </label>
              <select
                id="microorganism"
                name="microorganism"
                required
                value={formData.microorganism}
                onChange={handleChange}
                disabled={loadingMicroorganisms}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/90 disabled:opacity-50 text-gray-900"
              >
                <option value="">{loadingMicroorganisms ? 'Cargando...' : 'Seleccionar microorganismo'}</option>
                {!loadingMicroorganisms && microorganisms && microorganisms.map((organism) => (
                  <option key={organism.id} value={organism.nombre} data-id={organism.id}>{organism.nombre}</option>
                ))}
              </select>
            </div>

            {/* Selector de Cepas */}
            <div>
              <label className="block text-lg font-semibold text-white mb-3">
                🧬 Selección de Cepas <span className="text-red-400">*</span>
              </label>
              {formData.cepasSeleccionadas.length === 0 && (
                <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-red-700 text-sm font-medium">
                    ⚠️ Debe seleccionar al menos una cepa para proceder con la inoculación
                  </p>
                </div>
              )}
              <CepaSelector
                microorganismoSeleccionado={formData.microorganism}
                onCepaAgregada={handleCepaAgregada}
                onCepaRemovida={handleRemoverCepa}
                cepasAgregadas={formData.cepasSeleccionadas}
              />
              {formData.cepasSeleccionadas.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h5 className="font-medium text-blue-800 mb-2">Cepas para Inoculación:</h5>
                  <div className="space-y-2">
                    {formData.cepasSeleccionadas.map((cepa, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                        <div>
                          <span className="font-medium">{cepa.abreviatura}</span>
                          <span className="text-gray-600 ml-2">- {cepa.cantidad} bolsas</span>
                          <div className="text-xs text-gray-500">{cepa.microorganismo}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoverCepa(index)}
                          className="text-red-500 hover:text-red-700 px-2 py-1 rounded text-sm"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Responsables */}
            <div>
              <label htmlFor="responsables" className="block text-sm font-semibold text-gray-900 mb-2">
                Responsables *
              </label>
              <select
                id="responsables"
                name="responsables"
                multiple
                required
                value={formData.responsables}
                onChange={handleChange}
                disabled={loadingResponsables}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/90 disabled:opacity-50 h-32 text-gray-900"
              >
                {loadingResponsables ? (
                  <option>Cargando responsables...</option>
                ) : !responsables || responsables.length === 0 ? (
                  <option>No hay responsables disponibles</option>
                ) : responsables.map((resp) => (
                  <option key={resp.id} value={resp.nombre} data-id={resp.id}>{resp.nombre}</option>
                ))}
              </select>
              <p className="text-xs text-gray-700 mt-1">Puedes seleccionar varios responsables (Ctrl/Cmd + click)</p>
            </div>

            {/* Cantidad de Bolsas */}
            <div>
              <label htmlFor="bagQuantity" className="block text-sm font-semibold text-gray-900 mb-2">
                Cantidad de Bolsas Inoculadas *
              </label>
              <input
                type="number"
                id="bagQuantity"
                name="bagQuantity"
                required
                min="1"
                value={formData.bagQuantity || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/90 text-lg text-gray-900"
                placeholder="Ejemplo: 25"
              />
            </div>

            {/* Botón */}
            <div className="flex justify-center pt-6">
              <button
                type="submit"
                disabled={isSubmitting || loadingMicroorganisms || loadingResponsables || formData.cepasSeleccionadas.length === 0}
                className={`px-10 py-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 ${
                  isSubmitting || loadingMicroorganisms || loadingResponsables || formData.cepasSeleccionadas.length === 0
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-800 text-white'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Registrando...
                  </div>
                ) : formData.cepasSeleccionadas.length === 0 ? (
                  'Debe seleccionar al menos una cepa'
                ) : (
                  'Registrar Inoculación'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Modal de Confirmación */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-md w-full max-h-[75vh] overflow-y-auto border border-white/20">
              {/* Header del Modal */}
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 p-3 rounded-t-2xl">
                <div className="flex items-center text-white">
                  <div className="bg-white/20 rounded-full p-1.5 mr-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Confirmar Inoculación</h3>
                    <p className="text-blue-100 text-xs">Revise los datos antes de proceder</p>
                  </div>
                </div>
              </div>

              {/* Contenido del Modal */}
              <div className="p-3 space-y-3">
                {/* Información General */}
                <div className="bg-blue-50 rounded-xl p-2.5 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-1.5 text-sm flex items-center">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Información General
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">📅 Fecha:</span>
                      <span className="text-gray-900">
                        {formData.inoculationDate ? 
                          new Date(formData.inoculationDate + 'T00:00:00').toLocaleDateString('es-CO')
                          : 'No especificada'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">🧬 Microorganismo:</span>
                      <span className="text-gray-900 text-right max-w-[60%]">{formData.microorganism || 'No seleccionado'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">📦 Bolsas:</span>
                      <span className="text-gray-900 font-semibold">{formData.bagQuantity}</span>
                    </div>
                  </div>
                </div>

                {/* Responsables */}
                {formData.responsables.length > 0 && (
                  <div className="bg-green-50 rounded-xl p-2.5 border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-1.5 text-sm">
                      👥 Responsables ({formData.responsables.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {formData.responsables.map((responsable, index) => (
                        <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          {responsable}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cepas Seleccionadas */}
                {formData.cepasSeleccionadas.length > 0 && (
                  <div className="bg-purple-50 rounded-xl p-2.5 border border-purple-200">
                    <h4 className="font-semibold text-purple-900 mb-1.5 text-sm">
                      🧬 Cepas ({formData.cepasSeleccionadas.length})
                    </h4>
                    <div className="space-y-1">
                      {formData.cepasSeleccionadas.map((cepa, index) => (
                        <div key={index} className="bg-white rounded-lg p-2 border border-purple-200 flex justify-between items-center">
                          <span className="font-medium text-purple-900 text-sm">{cepa.abreviatura}</span>
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-semibold">
                            {cepa.cantidad}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-purple-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-purple-900 text-sm">Total:</span>
                        <span className="bg-purple-600 text-white px-3 py-1 rounded-full font-bold text-sm">
                          {formData.cepasSeleccionadas.reduce((total, cepa) => total + cepa.cantidad, 0)} bolsas
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Insumos Calculados */}
                {insumosCalculados.length > 0 && (
                  <div className="bg-orange-50 rounded-xl p-2.5 border border-orange-200">
                    <h4 className="font-semibold text-orange-900 mb-1.5 text-sm">
                      📦 Insumos Requeridos (Fórmula Maestra)
                    </h4>
                    <div className="space-y-1">
                      {insumosCalculados.map((insumo, index) => (
                        <div key={index} className={`bg-white rounded-lg p-2 border ${!insumo.disponible ? 'border-red-300 bg-red-50' : 'border-orange-200'}`}>
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <span className={`font-medium text-sm ${!insumo.disponible ? 'text-red-900' : 'text-orange-900'}`}>{insumo.nombre}</span>
                              <p className={`text-xs ${!insumo.disponible ? 'text-red-700' : 'text-orange-700'}`}>{insumo.descripcion}</p>
                              {!insumo.disponible && (
                                <p className="text-xs text-red-600 font-medium mt-1">
                                  ⚠️ Stock insuficiente: {insumo.stockDisponible?.toFixed(2) || 0} {insumo.unidad} disponible
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${!insumo.disponible ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
                                {insumo.cantidad < 1 ? 
                                  insumo.cantidad.toFixed(3) :
                                  insumo.cantidad % 1 === 0 ? 
                                    insumo.cantidad.toLocaleString() : 
                                    insumo.cantidad.toFixed(2)
                                } {insumo.unidad}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-orange-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-orange-900 text-sm">Para:</span>
                        <span className="bg-orange-600 text-white px-3 py-1 rounded-full font-bold text-sm">
                          {formData.bagQuantity} bolsas de inoculación
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-orange-100 rounded-lg">
                      <p className="text-orange-800 text-xs font-medium">
                        💡 Estos insumos serán automáticamente descontados del inventario usando lógica FIFO (primero el stock más antiguo)
                      </p>
                    </div>
                  </div>
                )}

                {/* Advertencia */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-2.5">
                  <div className="flex items-start">
                    <svg className="w-4 h-4 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h4 className="text-yellow-800 font-semibold text-sm">⚠️ Confirmación</h4>
                      <p className="text-yellow-700 text-xs mt-0.5">
                        Se registrará la inoculación, la salida de cepas Y la salida automática de los insumos mostrados arriba.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones del Modal */}
              <div className="bg-gray-50 px-3 py-2.5 rounded-b-2xl flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleCancelSubmit}
                  className="px-3 py-1.5 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 transition-all duration-300 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className={`px-4 py-1.5 rounded-lg font-semibold transition-all duration-300 text-sm ${
                    isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-800 text-white shadow-lg'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Procesando...
                    </div>
                  ) : (
                    '✅ Confirmar'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MushroomInoculationForm;