'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Producto {
  nombre: string;
  cantidad: number;
  unidad: string;
}

interface PersonaInfo {
  nombreCompleto: string;
  cedula: string;
}

interface RemisionData {
  id: string;
  idRemision: string;
  numeracion: number;
  estado: string;
  idCliente: string;
  nombreCliente: string;
  idPedido: string;
  fechaRemision: string;
  areaOrigen: string;
  responsableEntrega: string;
  notas: string;
  totalCantidad: number;
  fechaDespacho: string;
  urlDocumento?: string;
  productos: Producto[];
  yaFirmada: boolean;
  transportista: PersonaInfo | null;
  receptor: PersonaInfo | null;
}

export default function FirmarRemisionPage() {
  const params = useParams();
  const remisionId = params.remisionId as string;
  
  const [loading, setLoading] = useState(true);
  const [remision, setRemision] = useState<RemisionData | null>(null);
  const [error, setError] = useState('');
  
  const [receptorCedula, setReceptorCedula] = useState('');
  const [receptorNombre, setReceptorNombre] = useState('');
  const [personaValidada, setPersonaValidada] = useState<{ nombre: string; cedula: string; codigo: string } | null>(null);
  const [buscandoCedula, setBuscandoCedula] = useState(false);
  const [errorCedula, setErrorCedula] = useState('');
  const [firmando, setFirmando] = useState(false);
  const [exitoso, setExitoso] = useState(false);
  const [urlDocumento, setUrlDocumento] = useState<string | null>(null);

  useEffect(() => {
    if (remisionId) {
      cargarRemision();
    }
  }, [remisionId]);

  const cargarRemision = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/remisiones/firmar?remisionId=${remisionId}`);
      const data = await response.json();
      
      if (data.success) {
        setRemision(data.remision);
      } else {
        setError(data.error || 'Error al cargar la remisión');
      }
    } catch (err) {
      setError('Error de conexión al cargar la remisión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Validar cédula contra Personas (tipo Receptor)
  const validarCedula = async () => {
    const cedula = receptorCedula.trim();
    if (!cedula) {
      setErrorCedula('Ingrese su número de cédula');
      return;
    }

    try {
      setBuscandoCedula(true);
      setErrorCedula('');
      setPersonaValidada(null);

      const res = await fetch(`/api/personas-remision?cedula=${cedula}&tipo=Receptor`);
      const data = await res.json();

      if (data.success && data.personas.length > 0) {
        const exacta = data.personas.find((p: { cedula: string }) => p.cedula === cedula);
        if (exacta) {
          setPersonaValidada({
            nombre: exacta.nombreCompleto,
            cedula: exacta.cedula,
            codigo: exacta.codigo,
          });
          return;
        }
      }
      // No encontrado como Receptor
      setErrorCedula('Esta cédula no está registrada como Receptor autorizado. Contacte al remitente.');
    } catch (err) {
      console.error('Error validando cédula:', err);
      setErrorCedula('Error de conexión al validar. Intente de nuevo.');
    } finally {
      setBuscandoCedula(false);
    }
  };

  const handleFirmar = async () => {
    if (!personaValidada) return;

    try {
      setFirmando(true);
      setError('');

      const response = await fetch('/api/remisiones/firmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remisionId,
          receptorCedula: personaValidada.cedula,
          receptorNombre: personaValidada.nombre,
        })
      });

      const data = await response.json();

      if (data.success) {
        setExitoso(true);
        // Guardar URL del documento para descarga
        if (data.remision?.urlDocumento) {
          setUrlDocumento(data.remision.urlDocumento);
          // Abrir automáticamente en nueva pestaña después de 2s
          setTimeout(() => {
            window.open(data.remision.urlDocumento, '_blank');
          }, 2000);
        }
      } else {
        setError(data.error || 'Error al firmar la remisión');
      }
    } catch (err) {
      setError('Error de conexión al firmar');
      console.error(err);
    } finally {
      setFirmando(false);
    }
  };

  const formatFecha = (fecha: string) => {
    if (!fecha) return '—';
    try {
      // Airtable puede devolver "2026-02-06" o "2026-02-06T00:00:00.000Z"
      const soloFecha = fecha.split('T')[0]; // extraer solo YYYY-MM-DD
      const [y, m, d] = soloFecha.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      if (isNaN(date.getTime())) return fecha;
      return date.toLocaleDateString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch {
      return fecha;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando remisión...</p>
        </div>
      </div>
    );
  }

  if (error && !remision) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 max-w-md w-full">
          <h2 className="text-red-400 text-xl font-bold mb-2">❌ Error</h2>
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (exitoso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-green-500/10 border border-green-500 rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-green-400 text-2xl font-bold mb-4">¡Remisión Firmada!</h2>
          <p className="text-green-300 mb-4">
            La remisión <strong>{remision?.idRemision}</strong> ha sido firmada exitosamente.
          </p>
          <p className="text-green-200 text-sm mb-6">
            El documento PDF se está descargando automáticamente...
          </p>
          {urlDocumento && (
            <a
              href={urlDocumento}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              📄 Descargar PDF de Remisión
            </a>
          )}
        </div>
      </div>
    );
  }

  if (remision?.yaFirmada) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-green-500/10 border border-green-500 rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-green-400 text-2xl font-bold mb-4">Remisión Completada</h2>
          <p className="text-green-300 mb-2">
            La remisión <strong>{remision.idRemision}</strong> fue firmada y entregada.
          </p>
          {remision.receptor && (
            <p className="text-green-200/70 text-sm mb-1">
              Receptor: <strong>{remision.receptor.nombreCompleto}</strong> — C.C. {remision.receptor.cedula}
            </p>
          )}
          <p className="text-green-200/50 text-sm mb-6">
            Estado: <strong>{remision.estado}</strong>
          </p>
          {remision.urlDocumento ? (
            <a
              href={remision.urlDocumento}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg"
            >
              📄 Descargar PDF de Remisión
            </a>
          ) : (
            <p className="text-green-200/40 text-sm italic">Documento no disponible aún</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">📦</div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Firma de Recepción
          </h1>
          <p className="text-blue-300 text-lg font-semibold">
            {remision?.idRemision} <span className="text-blue-400/60 font-normal">#{remision?.numeracion}</span>
          </p>
          {/* QR Code */}
          <div className="mt-4 inline-block bg-white p-3 rounded-xl">
            <QRCodeSVG
              value={typeof window !== 'undefined' ? window.location.href : `${remisionId}`}
              size={140}
              level="H"
              includeMargin={false}
            />
          </div>
          <p className="text-blue-300/50 text-xs mt-2">Escanea para compartir</p>
        </div>

        {/* Información General de la Remisión */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-5 mb-4 border border-white/20">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            📋 Información de la Remisión
          </h2>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-blue-300/70 text-xs">Cliente</p>
              <p className="text-white font-medium">{remision?.nombreCliente || remision?.idCliente}</p>
            </div>
            <div>
              <p className="text-blue-300/70 text-xs">N° Pedido</p>
              <p className="text-white font-medium">{remision?.idPedido}</p>
            </div>
            <div>
              <p className="text-blue-300/70 text-xs">Fecha de Remisión</p>
              <p className="text-white font-medium">{formatFecha(remision?.fechaRemision || '')}</p>
            </div>
            <div>
              <p className="text-blue-300/70 text-xs">Área de Origen</p>
              <p className="text-white font-medium">{remision?.areaOrigen || '—'}</p>
            </div>
            <div>
              <p className="text-blue-300/70 text-xs">Responsable de Entrega</p>
              <p className="text-white font-medium">{remision?.responsableEntrega || '—'}</p>
            </div>
            <div>
              <p className="text-blue-300/70 text-xs">Estado</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                remision?.estado === 'Entregada' 
                  ? 'bg-green-500/20 text-green-300' 
                  : remision?.estado === 'Despachada'
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-blue-500/20 text-blue-300'
              }`}>
                {remision?.estado}
              </span>
            </div>
          </div>

          {remision?.notas && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-blue-300/70 text-xs">Notas</p>
              <p className="text-white/80 text-sm mt-0.5">{remision.notas}</p>
            </div>
          )}
        </div>

        {/* Transportista */}
        {remision?.transportista && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 mb-4 border border-white/20">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              🚛 Transportista
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-blue-300/70 text-xs">Nombre</p>
                <p className="text-white font-medium">{remision.transportista.nombreCompleto}</p>
              </div>
              <div>
                <p className="text-blue-300/70 text-xs">Cédula</p>
                <p className="text-white font-medium">{remision.transportista.cedula}</p>
              </div>
            </div>
            {remision.fechaDespacho && (
              <div className="mt-2">
                <p className="text-blue-300/70 text-xs">Fecha de Despacho</p>
                <p className="text-white/80 text-sm">{formatFecha(remision.fechaDespacho)}</p>
              </div>
            )}
          </div>
        )}

        {/* Productos */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-5 mb-4 border border-white/20">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            📦 Productos a Recibir
          </h2>
          <div className="bg-black/20 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-blue-300/70 text-xs font-medium py-2 px-3">Producto</th>
                  <th className="text-right text-blue-300/70 text-xs font-medium py-2 px-3">Cantidad</th>
                  <th className="text-right text-blue-300/70 text-xs font-medium py-2 px-3">Unidad</th>
                </tr>
              </thead>
              <tbody>
                {remision?.productos.map((producto, index) => (
                  <tr key={index} className="border-b border-white/5 last:border-0">
                    <td className="text-white py-2.5 px-3">{producto.nombre}</td>
                    <td className="text-blue-300 font-semibold py-2.5 px-3 text-right">{producto.cantidad}</td>
                    <td className="text-blue-300/70 py-2.5 px-3 text-right">{producto.unidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {remision?.totalCantidad ? (
              <div className="border-t border-white/10 px-3 py-2 flex justify-between">
                <span className="text-blue-300/70 text-xs font-medium">Total</span>
                <span className="text-white font-semibold text-sm">{remision.totalCantidad}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Formulario de Firma - 2 pasos: Validar → Confirmar */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-5 border border-white/20">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            ✍️ Confirmar Recepción
          </h2>
          
          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Paso 1: Validar cédula */}
          {!personaValidada ? (
            <div>
              <p className="text-blue-200/70 text-sm mb-4">
                Ingrese su cédula para validar su identidad como receptor autorizado.
              </p>
              <div className="mb-4">
                <label className="block text-blue-200 text-sm font-medium mb-2">
                  Número de Cédula *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={receptorCedula}
                    onChange={(e) => { setReceptorCedula(e.target.value); setErrorCedula(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); validarCedula(); } }}
                    className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ingrese su número de cédula"
                    disabled={buscandoCedula}
                    inputMode="numeric"
                  />
                  {buscandoCedula && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-400"></div>
                    </div>
                  )}
                </div>
                {errorCedula && (
                  <div className="mt-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                    <p className="text-red-300 text-sm">⚠️ {errorCedula}</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={validarCedula}
                disabled={buscandoCedula || !receptorCedula.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {buscandoCedula ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Validando...
                  </>
                ) : (
                  <>🔍 Validar Identidad</>
                )}
              </button>
            </div>
          ) : (
            /* Paso 2: Identidad validada → Confirmar recepción */
            <div>
              {/* Persona validada */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-400 text-lg">✅</span>
                  <span className="text-green-300 font-semibold">Identidad Verificada</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-green-300/60 text-xs">Nombre</p>
                    <p className="text-white font-medium">{personaValidada.nombre}</p>
                  </div>
                  <div>
                    <p className="text-green-300/60 text-xs">Cédula</p>
                    <p className="text-white font-medium">{personaValidada.cedula}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setPersonaValidada(null); setReceptorCedula(''); setErrorCedula(''); }}
                  className="text-blue-300 text-xs mt-2 hover:underline"
                >
                  ← Cambiar cédula
                </button>
              </div>

              <button
                type="button"
                onClick={handleFirmar}
                disabled={firmando}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {firmando ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Procesando...
                  </>
                ) : (
                  <>✓ Confirmar Recepción</>
                )}
              </button>

              <p className="text-blue-200/60 text-xs mt-3 text-center">
                Al firmar, confirma que ha recibido los productos listados en buen estado
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-blue-300/50 text-xs">
            SIRIUS REGENERATIVE SOLUTIONS S.A.S ZOMAC
          </p>
        </div>
      </div>
    </div>
  );
}
