'use client';

import { useState, useEffect } from 'react';

interface Cliente {
  id: string;
  nombre: string;
  empresa: string;
  cantidadPaquetes: number;
}

interface Paquete {
  id: string;
  nombre: string;
  fechaCreacion: string;
  estado: string;
  eventos: Array<{
    id: string;
    fechaProgramada: string;
    estado: string;
    hectareas: number;
    formula: string;
    cultivo: string;
  }>;
  progreso: {
    diasTotal: number;
    diasCompletados: number;
    hectareasTotal: number;
    hectareasCompletadas: number;
    porcentajeCompletado: number;
  };
}

interface AnalisisIA {
  fecha: string;
  bloque: string;
  horaInicio: string;
  horaSalida: string;
  productos: Array<{
    nombre: string;
    cantidad: number;
    unidad: string;
  }>;
  tractores: Array<{
    numero: number;
    operador: string;
    lotes: Array<{
      codigo: string;
      hectareas: number;
    }>;
    totalHectareas: number;
  }>;
  hectareasTotal: number;
  observaciones: string[];
}

export default function SeguimientoDiario() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [analisisIA, setAnalisisIA] = useState<AnalisisIA | null>(null);
  const [loading, setLoading] = useState(false);
  const [procesando, setProcesando] = useState(false);

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

  // Cargar clientes al montar
  useEffect(() => {
    cargarClientes();
  }, []);

  // Cargar paquetes cuando se selecciona cliente
  useEffect(() => {
    if (clienteSeleccionado) {
      cargarPaquetesCliente(clienteSeleccionado);
    } else {
      setPaquetes([]);
      setPaqueteSeleccionado('');
    }
  }, [clienteSeleccionado]);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clientes/activos');
      const data = await response.json();
      
      if (data.clientes) {
        setClientes(data.clientes);
      }
    } catch (error) {
      console.error('Error cargando clientes:', error);
      alert('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const cargarPaquetesCliente = async (clienteId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/paquete-aplicaciones/cliente/${clienteId}`);
      const data = await response.json();
      
      if (data.paquetes) {
        setPaquetes(data.paquetes);
      }
    } catch (error) {
      console.error('Error cargando paquetes:', error);
      alert('Error al cargar paquetes del cliente');
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
        headers: {
          'Content-Type': 'application/json',
        },
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
      console.log('Análisis completo:', data);
      
    } catch (error) {
      console.error('Error analizando mensaje:', error);
      alert('Error al analizar el mensaje');
    } finally {
      setProcesando(false);
    }
  };

  const confirmarActualizacion = async () => {
    if (!analisisIA) {
      alert('No hay análisis para confirmar');
      return;
    }

    try {
      setProcesando(true);
      const response = await fetch('/api/planificacion-diaria/actualizar-progreso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paqueteId: paqueteSeleccionado,
          clienteId: clienteSeleccionado,
          fecha: analisisIA.fecha,
          hectareasEjecutadas: analisisIA.hectareasTotal,
          tractores: analisisIA.tractores,
          productos: analisisIA.productos,
          observaciones: analisisIA.observaciones,
          horaInicio: analisisIA.horaInicio,
          horaSalida: analisisIA.horaSalida
        })
      });

      const data = await response.json();
      
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }

      alert(`✅ Progreso actualizado exitosamente!\n\n${data.message}\n\nEstado: ${data.resumen.estadoNuevo}`);
      
      // Limpiar formulario
      setMensaje('');
      setAnalisisIA(null);
      
      // Recargar paquetes para ver progreso actualizado
      if (clienteSeleccionado) {
        cargarPaquetesCliente(clienteSeleccionado);
      }

    } catch (error) {
      console.error('Error confirmando actualización:', error);
      alert('Error al confirmar la actualización');
    } finally {
      setProcesando(false);
    }
  };

  const usarEjemplo = () => {
    setMensaje(mensajeEjemplo);
  };

  const limpiarFormulario = () => {
    setMensaje('');
    setAnalisisIA(null);
  };

  const paqueteActual = paquetes.find(p => p.id === paqueteSeleccionado);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            📊 Seguimiento Diario de Aplicaciones
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Sistema inteligente para registrar y analizar el progreso real de aplicaciones de campo
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Panel de Selección */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2 text-lg" role="img" aria-label="usuarios">👥</span>
                Selección de Cliente y Paquete
              </h2>

              {/* Cliente Dropdown */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente
                </label>
                <select
                  value={clienteSeleccionado}
                  onChange={(e) => setClienteSeleccionado(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccione un cliente</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre} ({cliente.cantidadPaquetes} paquetes)
                    </option>
                  ))}
                </select>
              </div>

              {/* Paquete Dropdown */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paquete de Aplicación
                </label>
                <select
                  value={paqueteSeleccionado}
                  onChange={(e) => setPaqueteSeleccionado(e.target.value)}
                  disabled={!clienteSeleccionado || loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Seleccione un paquete</option>
                  {paquetes.map(paquete => (
                    <option key={paquete.id} value={paquete.id}>
                      {paquete.nombre} - {paquete.progreso.porcentajeCompletado}% completado
                    </option>
                  ))}
                </select>
              </div>

              {/* Info del Paquete Seleccionado */}
              {paqueteActual && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-gray-900 mb-2">Información del Paquete</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Eventos:</strong> {paqueteActual.eventos.length}</p>
                    <p><strong>Hectáreas totales:</strong> {paqueteActual.progreso.hectareasTotal} Ha</p>
                    <p><strong>Progreso:</strong> {paqueteActual.progreso.hectareasCompletadas}/{paqueteActual.progreso.hectareasTotal} Ha</p>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${paqueteActual.progreso.porcentajeCompletado}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {paqueteActual.progreso.porcentajeCompletado}% completado
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panel Principal */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <span className="mr-2 text-lg" role="img" aria-label="ubicación">📍</span>
                  Mensaje de Campo
                </h2>
                <div className="space-x-2">
                  <button
                    onClick={usarEjemplo}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Usar Ejemplo
                  </button>
                  <button
                    onClick={limpiarFormulario}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Pegue aquí el mensaje de campo con los datos de aplicación..."
                disabled={!paqueteSeleccionado}
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  {mensaje.length} caracteres • {!paqueteSeleccionado ? 'Seleccione un paquete primero' : 'Listo para analizar'}
                </p>
                <button
                  onClick={analizarMensaje}
                  disabled={!mensaje.trim() || !paqueteSeleccionado || procesando}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {procesando ? (
                    <>
                      <span className="mr-2 text-sm animate-pulse" role="img" aria-label="procesando">⏳</span>
                      Analizando...
                    </>
                  ) : (
                    <>
                      <span className="mr-2 text-sm" role="img" aria-label="analizar">📊</span>
                      Analizar con IA
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Resultado del Análisis */}
            {analisisIA && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <span className="mr-2 text-lg text-green-500" role="img" aria-label="éxito">✅</span>
                    Análisis Completado
                  </h2>
                  <button
                    onClick={confirmarActualizacion}
                    disabled={procesando}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {procesando ? (
                      <>
                        <span className="mr-2 text-sm animate-pulse" role="img" aria-label="procesando">⏳</span>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <span className="mr-2 text-sm" role="img" aria-label="confirmar">✅</span>
                        Confirmar Actualización
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  {/* Resumen General */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">📋 Resumen General</h3>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><strong>Fecha:</strong> {analisisIA.fecha}</p>
                      <p><strong>Bloque:</strong> {analisisIA.bloque}</p>
                      <p><strong>Total Hectáreas:</strong> {analisisIA.hectareasTotal} Ha</p>
                      <p><strong>Horario:</strong> {analisisIA.horaInicio} - {analisisIA.horaSalida}</p>
                    </div>
                  </div>

                  {/* Productos */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-medium text-green-900 mb-2">🧪 Productos Aplicados</h3>
                    <div className="text-sm text-green-800 space-y-1">
                      {analisisIA.productos.map((producto, index) => (
                        <p key={index}>
                          <strong>{producto.nombre}:</strong> {producto.cantidad} {producto.unidad}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Tractores */}
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h3 className="font-medium text-yellow-900 mb-2">🚜 Tractores y Operadores</h3>
                    <div className="text-sm text-yellow-800 space-y-2">
                      {analisisIA.tractores.map((tractor, index) => (
                        <div key={index}>
                          <p><strong>T{tractor.numero} - {tractor.operador}:</strong></p>
                          <p className="ml-2">{tractor.totalHectareas} Ha en {tractor.lotes.length} lotes</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Observaciones */}
                {analisisIA.observaciones.length > 0 && (
                  <div className="mt-4 bg-orange-50 rounded-lg p-4">
                    <h3 className="font-medium text-orange-900 mb-2 flex items-center">
                      <span className="mr-2 text-sm" role="img" aria-label="observaciones">⚠️</span>
                      Observaciones Especiales
                    </h3>
                    <div className="text-sm text-orange-800 space-y-1">
                      {analisisIA.observaciones.map((obs, index) => (
                        <p key={index}>• {obs}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}