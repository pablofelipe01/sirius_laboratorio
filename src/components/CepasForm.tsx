'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface CepasData {
  fechaCreacion: string;
  tipoRegistro: string;
  cantidadBolsas: number;
  microorganismo: string;
  microorganismoId: string;
  microorganismoAbreviatura: string;
  codigoProducto: string; // SIRIUS-PRODUCT-XXXX
  responsables: string[];
  responsablesIds: string[];
  responsablesIdsCore: string[];
  registradoPor: string;
  // Campos específicos para conversión desde lote
  loteSeleccionadoId?: string;
  loteSeleccionado?: string;
  cantidadDescontarLote?: number;
}

interface Microorganism {
  id: string;
  nombre: string;
  abreviatura?: string;
  codigo?: string; // Codigo Producto (SIRIUS-PRODUCT-XXXX)
}

interface Responsable {
  id: string;
  nombre: string;
  idCore?: string;
}

interface LoteDisponible {
  id: string;
  numeroLote: string;
  microorganismo: string;
  cantidadDisponible: number;
  fechaProduccion: string;
  estado: string;
}

interface CepasFormProps {
  tipoMicroorganismo?: string | null;
}

const CepasForm = ({ tipoMicroorganismo }: CepasFormProps) => {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<CepasData>({
    fechaCreacion: '',
    tipoRegistro: '',
    cantidadBolsas: 0,
    microorganismo: '',
    microorganismoId: '',
    microorganismoAbreviatura: '',
    codigoProducto: '',
    responsables: [],
    responsablesIds: [],
    responsablesIdsCore: [],
    registradoPor: user?.nombre || '',
    // Campos para conversión desde lote
    loteSeleccionadoId: '',
    loteSeleccionado: '',
    cantidadDescontarLote: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Estados para el modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [insumosCalculados, setInsumosCalculados] = useState<any[]>([]);

  const [microorganisms, setMicroorganisms] = useState<Microorganism[]>([]);
  const [loadingMicroorganisms, setLoadingMicroorganisms] = useState(true);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [loadingResponsables, setLoadingResponsables] = useState(true);

  // Estados para lotes disponibles (tercera opción)
  const [lotesDisponibles, setLotesDisponibles] = useState<LoteDisponible[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [loteSeleccionado, setLoteSeleccionado] = useState<LoteDisponible | null>(null);

  useEffect(() => {
    fetchMicroorganisms();
    fetchResponsables();
  }, [tipoMicroorganismo]);

  // Effect para cargar lotes cuando se selecciona microorganismo y la tercera opción
  useEffect(() => {
    if (formData.codigoProducto && formData.tipoRegistro === 'Cepa Convertida desde Lote de Producción') {
      fetchLotesDisponibles();
    }
  }, [formData.codigoProducto, formData.tipoRegistro]);

  // Debug effect para modal
  useEffect(() => {
    console.log('🎭 showConfirmModal cambió a:', showConfirmModal);
    console.log('📦 insumosCalculados:', insumosCalculados);
  }, [showConfirmModal, insumosCalculados]);

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

  // Función para cargar lotes disponibles en estado de incubación o refrigeración
  const fetchLotesDisponibles = async () => {
    // Usar el código del producto (SIRIUS-PRODUCT-XXXX) para buscar por ID Product Core
    const codigoProducto = formData.codigoProducto;
    if (!codigoProducto) return;
    
    setLoadingLotes(true);
    try {
      console.log('📦 Cargando lotes disponibles para producto:', codigoProducto);
      
      const response = await fetch(`/api/lotes-disponibles?codigoProducto=${encodeURIComponent(codigoProducto)}`);
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Lotes cargados:', data.lotes.length);
        setLotesDisponibles(data.lotes || []);
        
        if (data.message) {
          console.log('ℹ️ Mensaje del servidor:', data.message);
        }
      } else {
        console.error('Error loading lotes:', data.error);
        setLotesDisponibles([]);
      }
    } catch (error) {
      console.error('Error fetching lotes:', error);
      setLotesDisponibles([]);
    } finally {
      setLoadingLotes(false);
    }
  };

  const fetchMicroorganisms = async () => {
    try {
      const response = await fetch('/api/microorganismos');
      const data = await response.json();
      
      if (data.success) {
        let microorganismosFiltrados = data.microorganismos;
        
        // Filtrar por tipo si se especifica
        if (tipoMicroorganismo) {
          microorganismosFiltrados = data.microorganismos.filter((micro: any) => {
            const tipoMicro = micro['Tipo Microorganismo'] || micro.tipo || '';
            return tipoMicro.toLowerCase().includes(tipoMicroorganismo.toLowerCase());
          });
        }
        
        setMicroorganisms(microorganismosFiltrados);
      } else {
        console.error('Error loading microorganisms:', data.error);
        // Fallback a lista estática según el tipo
        const fallbackMicroorganisms = tipoMicroorganismo === 'Hongo' 
          ? [
              { id: 'fallback-1', nombre: 'Pleurotus ostreatus' },
              { id: 'fallback-2', nombre: 'Shiitake (Lentinula edodes)' },
              { id: 'fallback-3', nombre: 'Trichoderma harzianum' }
            ]
          : [
              { id: 'fallback-1', nombre: 'Bacillus thuringiensis' },
              { id: 'fallback-2', nombre: 'Bacillus subtilis' },
              { id: 'fallback-3', nombre: 'Azotobacter chroococcum' }
            ];
        setMicroorganisms(fallbackMicroorganisms);
      }
    } catch (error) {
      console.error('Error fetching microorganisms:', error);
      // Fallback a lista estática según el tipo
      const fallbackMicroorganisms = tipoMicroorganismo === 'Hongo' 
        ? [
            { id: 'fallback-1', nombre: 'Pleurotus ostreatus' },
            { id: 'fallback-2', nombre: 'Shiitake (Lentinula edodes)' },
            { id: 'fallback-3', nombre: 'Trichoderma harzianum' }
          ]
        : [
            { id: 'fallback-1', nombre: 'Bacillus thuringiensis' },
            { id: 'fallback-2', nombre: 'Bacillus subtilis' },
            { id: 'fallback-3', nombre: 'Azotobacter chroococcum' }
          ];
      setMicroorganisms(fallbackMicroorganisms);
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
      
      // Si es el selector de responsables, también capturar los IDs Core
      if (name === 'responsables') {
        const selectedIdsCore = selected.map(option => option.getAttribute('data-idcore') || '');
        setFormData(prev => ({ 
          ...prev, 
          responsables: selectedValues,
          responsablesIds: selectedIds,
          responsablesIdsCore: selectedIdsCore
        }));
      } else {
        setFormData(prev => ({ 
          ...prev, 
          [name]: selectedValues,
          [`${name}Ids`]: selectedIds
        }));
      }
    } else if (name === 'microorganismo' && e.target instanceof HTMLSelectElement) {
      const selectedOption = e.target.options[e.target.selectedIndex];
      const microorganismoId = selectedOption.getAttribute('data-id') || '';
      const microorganismoAbreviatura = selectedOption.getAttribute('data-abreviatura') || '';
      const codigoProducto = selectedOption.getAttribute('data-codigo') || '';
      setFormData(prev => ({
        ...prev,
        microorganismo: value,
        microorganismoId: microorganismoId,
        microorganismoAbreviatura: microorganismoAbreviatura,
        codigoProducto: codigoProducto,
        // Limpiar lote seleccionado cuando cambia el microorganismo
        loteSeleccionadoId: '',
        loteSeleccionado: '',
        cantidadDescontarLote: 0
      }));
      // Reset lote seleccionado
      setLoteSeleccionado(null);
    } else if (name === 'tipoRegistro') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        // Limpiar campos específicos de lote cuando cambia el tipo
        loteSeleccionadoId: '',
        loteSeleccionado: '',
        cantidadDescontarLote: 0,
        // Reset cantidadBolsas cuando cambia el tipo de registro
        cantidadBolsas: value === 'Cepa Convertida desde Lote de Producción' ? 0 : prev.cantidadBolsas
      }));
      
      // Los lotes se cargarán automáticamente por el useEffect cuando hay microorganismo seleccionado
    } else if (name === 'loteSeleccionadoId') {
      const lote = lotesDisponibles.find(l => l.id === value);
      setLoteSeleccionado(lote || null);
      setFormData(prev => ({ 
        ...prev, 
        loteSeleccionadoId: value,
        loteSeleccionado: lote?.numeroLote || '',
        cantidadDescontarLote: 0, // Reset cantidad cuando cambia el lote
        cantidadBolsas: 0 // Reset cantidad de cepas a generar también
      }));
    } else if (name === 'cantidadDescontarLote') {
      const cantidad = parseInt(value) || 0;
      setFormData(prev => ({ 
        ...prev, 
        [name]: cantidad,
        // Automáticamente actualizar la cantidad de cepas a generar
        cantidadBolsas: cantidad
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 handleSubmit llamado, formData:', formData);
    console.log('🔍 tipoRegistro:', formData.tipoRegistro);
    
    // Validación específica para conversión desde lote
    if (formData.tipoRegistro === 'Cepa Convertida desde Lote de Producción') {
      if (!formData.loteSeleccionadoId || !loteSeleccionado) {
        setErrorMessage('Debe seleccionar un lote para la conversión');
        setSubmitStatus('error');
        return;
      }
      
      if (!formData.cantidadDescontarLote || formData.cantidadDescontarLote <= 0) {
        setErrorMessage('La cantidad a descontar debe ser mayor a 0');
        setSubmitStatus('error');
        return;
      }
      
      if (formData.cantidadDescontarLote > loteSeleccionado.cantidadDisponible) {
        setErrorMessage(`La cantidad no puede ser mayor a ${loteSeleccionado.cantidadDisponible} bolsas disponibles`);
        setSubmitStatus('error');
        return;
      }
    }
    
    // Si es "Cepa Producida por Inoculación", mostrar modal de confirmación
    if (formData.tipoRegistro === 'Cepa Producida por Inoculación') {
      console.log('✅ Es producción por inoculación, calculando insumos...');
      // Calcular insumos necesarios basado en la cantidad de bolsas
      const insumosNecesarios = calcularInsumosCepa(formData.cantidadBolsas);
      console.log('📦 Insumos calculados:', insumosNecesarios);
      setInsumosCalculados(insumosNecesarios);
      
      // Mostrar modal de confirmación
      console.log('🎭 Mostrando modal de confirmación...');
      setShowConfirmModal(true);
      return;
    }

    console.log('➡️ Procesando registro normal...');
    // Para otros tipos de registro, proceder normalmente
    await procesarRegistroCepa();
  };

  const handleCancelSubmit = () => {
    setShowConfirmModal(false);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    await procesarRegistroCepa();
  };

  const procesarRegistroCepa = async () => {
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      // Enviar datos completos a la API (incluyendo tipoRegistro)
      const dataToSend = formData;
      
      // Enviar datos a la API de Cepas
      const response = await fetch('/api/cepas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Si es producción por inoculación y se creó exitosamente, crear salidas de insumos
        if (formData.tipoRegistro === 'Cepa Producida por Inoculación' && result.recordId && insumosCalculados.length > 0) {
          try {
            console.log('📦 Creando salidas de insumos para cepa con lógica FIFO...');
            
            const salidaInsumosData = insumosCalculados.map(insumo => ({
              insumoId: insumo.id,
              cantidadSalida: insumo.cantidad, // Cantidad ya calculada (bolsas × factor)
              unidad: insumo.unidad,
              fecha: formData.fechaCreacion,
              userName: user?.nombre || 'Usuario Desconocido',
              nombreEvento: `Producción de cepa - ${formData.cantidadBolsas} bolsas`
            }));

            console.log('📦 Datos de salida de insumos a enviar:', salidaInsumosData);
            console.log('🔍 Clorafenicol específicamente:', salidaInsumosData.find(i => i.insumoId === 'rec6U8tw8EEoFx52A'));

            const salidaResponse = await fetch('/api/salida-insumos-auto', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                registros: salidaInsumosData,
                cepaId: result.recordId,
                userName: user?.nombre || 'Usuario Desconocido'
              }),
            });

            const salidaResult = await salidaResponse.json();
            
            if (salidaResponse.ok && salidaResult.success) {
              console.log('✅ Salidas de insumos creadas con lógica FIFO:', salidaResult.message);
            } else {
              console.warn('⚠️ Error en salidas de insumos:', salidaResult.error);
              // No fallar el registro de cepa por esto, solo advertir
            }
          } catch (error) {
            console.warn('⚠️ Error procesando salidas de insumos:', error);
            // No fallar el registro de cepa por esto
          }
        }

        // Si es conversión desde lote de inoculación, registrar la salida de bolsas del lote
        if (formData.tipoRegistro === 'Cepa Convertida desde Lote de Producción' && result.recordId && formData.loteSeleccionadoId) {
          try {
            console.log('🔄 Registrando salida de bolsas del lote de inoculación...');
            
            const salidaInoculacionData = {
              fechaEvento: formData.fechaCreacion,
              cantidadBolsas: formData.cantidadDescontarLote,
              loteAlteradoId: formData.loteSeleccionadoId,
              cepaId: result.recordId,
              userName: user?.nombre || 'Usuario Desconocido',
              idResponsableCore: user?.idEmpleado || '' // ID Core del usuario (SIRIUS-PER-XXXX)
            };

            console.log('📦 Datos de salida de inoculación a enviar:', salidaInoculacionData);

            const salidaInoculacionResponse = await fetch('/api/salida-inoculacion', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(salidaInoculacionData),
            });

            const salidaInoculacionResult = await salidaInoculacionResponse.json();
            
            if (salidaInoculacionResponse.ok && salidaInoculacionResult.success) {
              console.log('✅ Salida de inoculación registrada exitosamente:', salidaInoculacionResult.recordId);
            } else {
              console.warn('⚠️ Error al registrar salida de inoculación:', salidaInoculacionResult.error);
              // No fallar el registro de cepa por esto, solo advertir
            }
          } catch (error) {
            console.warn('⚠️ Error procesando salida de inoculación:', error);
            // No fallar el registro de cepa por esto
          }
        }

        setSubmitStatus('success');
        
        setFormData({
          fechaCreacion: '',
          tipoRegistro: '',
          cantidadBolsas: 0,
          microorganismo: '',
          microorganismoId: '',
          microorganismoAbreviatura: '',
          codigoProducto: '',
          responsables: [],
          responsablesIds: [],
          responsablesIdsCore: [],
          registradoPor: user?.nombre || '',
          // Campos para conversión desde lote
          loteSeleccionadoId: '',
          loteSeleccionado: '',
          cantidadDescontarLote: 0,
        });
        
        // Limpiar estado de lotes
        setLoteSeleccionado(null);
        setLotesDisponibles([]);
      } else {
        setSubmitStatus('error');
        setErrorMessage(result.error || 'Error al registrar la cepa');
      }
    } catch {
      setSubmitStatus('error');
      setErrorMessage('Error de conexión. Por favor, intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para calcular insumos según la fórmula de producción de cepas
  const calcularInsumosCepa = (cantidadBolsas: number) => {
    console.log('🧮 calcularInsumosCepa llamada con:', cantidadBolsas, 'bolsas');
    
    // Fórmula de producción de cepas: cantidad = bolsas × factor
    const formulaCepas = [
      {
        id: 'recAhttbj6RjnpACX',
        nombre: 'Arroz',
        cantidad: cantidadBolsas * 100, // 100g arroz por bolsa
        unidad: 'GRAMOS',
        descripcion: 'Arroz para sustrato de cepa'
      },
      {
        id: 'rec6U8tw8EEoFx52A',
        nombre: 'Clorafenicol',
        cantidad: cantidadBolsas * 0.009, // 0.009g clorafenicol por bolsa
        unidad: 'GRAMOS',
        descripcion: 'Antibiótico-cloranfenicol'
      },
      {
        id: 'recXBHudUK2T0OcPI',
        nombre: 'Melaza',
        cantidad: cantidadBolsas * 0.36, // 0.36g melaza por bolsa
        unidad: 'GRAMOS',
        descripcion: 'Melaza'
      },
      {
        id: 'recHlpm0r9IILswJP',
        nombre: 'Bolsa polipropileno',
        cantidad: cantidadBolsas * 1, // 1 bolsa por bolsa
        unidad: 'UNIDADES',
        descripcion: 'Bolsas de Polipropileno x 100und'
      },
      {
        id: 'rec9AVRKuMfYoLozj',
        nombre: 'Tween 80',
        cantidad: cantidadBolsas * 0.018, // 0.018ml tween por bolsa
        unidad: 'MILILITROS',
        descripcion: 'Tween 80 x 500ml'
      },
      {
        id: 'recd9ipWHpeMzBX3O',
        nombre: 'Algodón',
        cantidad: cantidadBolsas * 0.42, // 0.42g algodón por bolsa
        unidad: 'GRAMOS',
        descripcion: 'Bolsa copos de algodón x 500 gr'
      }
    ];

    console.log('📦 Fórmula completa de cepas calculada:', formulaCepas);
    return formulaCepas;
  };

  return (
    <div 
      className={tipoMicroorganismo ? "relative" : "min-h-screen relative pt-24"}
      style={tipoMicroorganismo ? {} : {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay para mejor legibilidad - solo si no hay tipo especificado */}
      {!tipoMicroorganismo && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60"></div>
      )}
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Profesional - solo si no hay tipo especificado */}
        {!tipoMicroorganismo && (
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-3 sm:p-4 mb-8 border border-white/20">
            <div className="flex items-center justify-center">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1 text-center">
                  Registro de Cepas
                </h1>
                <p className="text-lg text-gray-600 flex items-center justify-center">
                  <span className="inline-block w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></span>
                  Sistema DataLab - Sirius Regenerative Solutions S.A.S ZOMAC
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {submitStatus === 'success' && (
          <div className="bg-green-50/95 backdrop-blur-sm border border-green-200 rounded-2xl p-6 mb-8 shadow-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  ✅ Cepa registrada exitosamente
                </h3>
                <p className="text-green-700">
                  Los datos han sido guardados correctamente en Airtable con trazabilidad completa.
                </p>
              </div>
            </div>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="bg-red-50/95 backdrop-blur-sm border border-red-200 rounded-2xl p-6 mb-8 shadow-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-red-800 mb-2">
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
            {/* Fecha de Creación */}
            <div>
              <label htmlFor="fechaCreacion" className="block text-sm font-semibold text-gray-900 mb-2">
                Fecha de Creación *
              </label>
              <input
                type="date"
                id="fechaCreacion"
                name="fechaCreacion"
                required
                value={formData.fechaCreacion}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white/90 text-lg text-gray-900"
              />
            </div>

            {/* Tipo de Registro */}
            <div>
              <label htmlFor="tipoRegistro" className="block text-sm font-semibold text-gray-900 mb-2">
                Tipo de Registro *
              </label>
              <select
                id="tipoRegistro"
                name="tipoRegistro"
                required
                value={formData.tipoRegistro}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white/90 text-lg text-gray-900"
              >
                <option value="">Seleccionar tipo de registro</option>
                <option value="Cepa Producida por Inoculación">🧬 Cepa Producida por Inoculación</option>
                <option value="Cepa Adquirida por Compra">🛒 Cepa Adquirida por Compra</option>
                <option value="Cepa Convertida desde Lote de Producción">📦 Cepa Convertida desde Lote de Producción</option>
              </select>
            </div>

            {/* Microorganismo */}
            <div>
              <label htmlFor="microorganismo" className="block text-sm font-semibold text-gray-900 mb-2">
                Microorganismo *
              </label>
              <select
                id="microorganismo"
                name="microorganismo"
                required
                value={formData.microorganismo}
                onChange={handleChange}
                disabled={loadingMicroorganisms}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white/90 disabled:opacity-50 text-gray-900"
              >
                <option value="">{loadingMicroorganisms ? 'Cargando...' : 'Seleccionar microorganismo'}</option>
                {!loadingMicroorganisms && microorganisms && microorganisms.map((organism) => (
                  <option key={organism.id} value={organism.nombre} data-id={organism.id} data-abreviatura={organism.abreviatura || ''} data-codigo={organism.codigo || ''}>{organism.nombre}</option>
                ))}
              </select>
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
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white/90 disabled:opacity-50 h-32 text-gray-900"
              >
                {loadingResponsables ? (
                  <option>Cargando responsables...</option>
                ) : !responsables || responsables.length === 0 ? (
                  <option>No hay responsables disponibles</option>
                ) : responsables.map((resp) => (
                  <option key={resp.id} value={resp.nombre} data-id={resp.id} data-idcore={resp.idCore || ''}>{resp.nombre}</option>
                ))}
              </select>
              <p className="text-xs text-gray-700 mt-1">Puedes seleccionar varios responsables (Ctrl/Cmd + click)</p>
            </div>

            {/* Campos específicos para "Cepa Convertida desde Lote de Producción" */}
            {formData.tipoRegistro === 'Cepa Convertida desde Lote de Producción' && (
              <>
                {/* Selección de Lote */}
                <div>
                  <label htmlFor="loteSeleccionadoId" className="block text-sm font-semibold text-gray-900 mb-2">
                    Lote a Convertir *
                  </label>
                  <select
                    id="loteSeleccionadoId"
                    name="loteSeleccionadoId"
                    required
                    value={formData.loteSeleccionadoId}
                    onChange={handleChange}
                    disabled={loadingLotes}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white/90 disabled:opacity-50 text-gray-900"
                  >
                    <option value="">
                      {loadingLotes ? 'Cargando lotes...' : 'Seleccionar lote disponible'}
                    </option>
                    {lotesDisponibles.map((lote) => (
                      <option key={lote.id} value={lote.id}>
                        {lote.numeroLote} - {lote.microorganismo} ({lote.cantidadDisponible} bolsas disponibles)
                      </option>
                    ))}
                  </select>
                  {lotesDisponibles.length === 0 && !loadingLotes && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        ⚠️ No hay lotes disponibles para este tipo de microorganismo.
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Para usar esta opción, necesitas tener lotes de producción normal previamente registrados en estado de incubación o refrigeración con cantidad disponible.
                      </p>
                    </div>
                  )}
                </div>

                {/* Información del Lote Seleccionado */}
                {loteSeleccionado && (
                  <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2 text-sm">📦 Información del Lote</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Número:</span>
                        <span className="text-gray-900">{loteSeleccionado.numeroLote}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Microorganismo:</span>
                        <span className="text-gray-900">{loteSeleccionado.microorganismo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Disponible:</span>
                        <span className="text-blue-700 font-semibold">{loteSeleccionado.cantidadDisponible} bolsas</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Fecha Producción:</span>
                        <span className="text-gray-900">
                          {new Date(loteSeleccionado.fechaProduccion + 'T00:00:00').toLocaleDateString('es-CO')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cantidad a Descontar del Lote */}
                {loteSeleccionado && (
                  <div>
                    <label htmlFor="cantidadDescontarLote" className="block text-sm font-semibold text-gray-900 mb-2">
                      Cantidad a Convertir a Cepas *
                    </label>
                    <input
                      type="number"
                      id="cantidadDescontarLote"
                      name="cantidadDescontarLote"
                      required
                      min="1"
                      max={loteSeleccionado.cantidadDisponible}
                      value={formData.cantidadDescontarLote || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-white/90 text-lg text-gray-900"
                      placeholder={`Máximo ${loteSeleccionado.cantidadDisponible} bolsas`}
                    />
                    <p className="text-xs text-gray-700 mt-1">
                      Máximo {loteSeleccionado.cantidadDisponible} bolsas disponibles del lote seleccionado
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Cantidad de Bolsas */}
            <div>
              <label htmlFor="cantidadBolsas" className="block text-sm font-semibold text-gray-900 mb-2">
                {formData.tipoRegistro === 'Cepa Convertida desde Lote de Producción' 
                  ? 'Cantidad de Cepas a Generar *'
                  : 'Cantidad de Bolsas *'
                }
              </label>
              <input
                type="number"
                id="cantidadBolsas"
                name="cantidadBolsas"
                required
                min="1"
                value={formData.cantidadBolsas || ''}
                onChange={handleChange}
                readOnly={formData.tipoRegistro === 'Cepa Convertida desde Lote de Producción'}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-lg text-gray-900 ${
                  formData.tipoRegistro === 'Cepa Convertida desde Lote de Producción' 
                    ? 'bg-gray-100 border-gray-300 cursor-not-allowed' 
                    : 'bg-white/90 border-gray-200'
                }`}
                placeholder={formData.tipoRegistro === 'Cepa Convertida desde Lote de Producción' 
                  ? 'Se actualiza automáticamente'
                  : 'Ejemplo: 15'
                }
              />
              {formData.tipoRegistro === 'Cepa Convertida desde Lote de Producción' && (
                <p className="mt-1 text-sm text-gray-600">
                  <span className="text-blue-600">💡</span> Este valor se actualiza automáticamente según la cantidad a convertir del lote
                </p>
              )}
            </div>

            {/* Botón */}
            <div className="flex justify-center pt-6">
              <button
                type="submit"
                disabled={
                  isSubmitting || 
                  loadingMicroorganisms || 
                  loadingResponsables ||
                  loadingLotes ||
                  (formData.tipoRegistro === 'Cepa Convertida desde Lote de Producción' && lotesDisponibles.length === 0)
                }
                onClick={() => console.log('🖱️ Botón submit clickeado')}
                className={`px-10 py-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 ${
                  isSubmitting || 
                  loadingMicroorganisms || 
                  loadingResponsables ||
                  loadingLotes ||
                  (formData.tipoRegistro === 'Cepa Convertida desde Lote de Producción' && lotesDisponibles.length === 0)
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 hover:from-purple-700 hover:via-violet-700 hover:to-purple-800 text-white'
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
                ) : loadingLotes ? (
                  'Cargando lotes...'
                ) : formData.tipoRegistro === 'Cepa Convertida desde Lote de Producción' && lotesDisponibles.length === 0 ? (
                  'No hay lotes disponibles'
                ) : (
                  'Registrar Cepa'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Modal de Confirmación */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-md w-full max-h-[70vh] overflow-y-auto border border-white/20">
              {/* Header del Modal */}
              <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 p-3 rounded-t-2xl">
                <div className="flex items-center text-white">
                  <div className="bg-white/20 rounded-full p-1.5 mr-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Confirmar Producción de Cepa</h3>
                    <p className="text-purple-100 text-xs">Revise los datos antes de proceder</p>
                  </div>
                </div>
              </div>

              {/* Contenido del Modal */}
              <div className="p-3 space-y-3">
                {/* Información General */}
                <div className="bg-purple-50 rounded-xl p-2.5 border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-1.5 text-sm flex items-center">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Información de la Cepa
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">📅 Fecha:</span>
                      <span className="text-gray-900">
                        {formData.fechaCreacion ? 
                          new Date(formData.fechaCreacion + 'T00:00:00').toLocaleDateString('es-CO')
                          : 'No especificada'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">🧬 Microorganismo:</span>
                      <span className="text-gray-900 text-right max-w-[60%]">{formData.microorganismo || 'No seleccionado'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">📦 Bolsas:</span>
                      <span className="text-gray-900 font-semibold">{formData.cantidadBolsas}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">🔬 Tipo:</span>
                      <span className="text-purple-700 font-semibold text-right max-w-[60%]">{formData.tipoRegistro}</span>
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

                {/* Insumos Calculados */}
                {insumosCalculados.length > 0 && (
                  <div className="bg-orange-50 rounded-xl p-2.5 border border-orange-200">
                    <h4 className="font-semibold text-orange-900 mb-1.5 text-sm">
                      📦 Insumos Requeridos (Fórmula Cepas)
                    </h4>
                    <div className="space-y-1">
                      {insumosCalculados.map((insumo, index) => (
                        <div key={index} className="bg-white rounded-lg p-2 border border-orange-200 flex justify-between items-center">
                          <div className="flex-1">
                            <span className="font-medium text-orange-900 text-sm">{insumo.nombre}</span>
                            <p className="text-xs text-orange-700">{insumo.descripcion}</p>
                          </div>
                          <div className="text-right">
                            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-semibold">
                              {insumo.cantidad < 1 ? 
                                insumo.cantidad.toFixed(3) :
                                insumo.cantidad % 1 === 0 ? 
                                  insumo.cantidad.toLocaleString() : 
                                  insumo.cantidad.toFixed(2)
                              } {insumo.unidad}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-orange-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-orange-900 text-sm">Para:</span>
                        <span className="bg-orange-600 text-white px-3 py-1 rounded-full font-bold text-sm">
                          {formData.cantidadBolsas} bolsas de cepa
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
                        Se registrará la cepa Y la salida automática de los insumos mostrados arriba según las fórmulas de producción.
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
                      : 'bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 hover:from-purple-700 hover:via-violet-700 hover:to-purple-800 text-white shadow-lg'
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
                    '✅ Confirmar Producción'
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

export default CepasForm;
