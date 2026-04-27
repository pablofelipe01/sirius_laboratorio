'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ManejoResiduosVoiceRecorder from '@/components/ManejoResiduosVoiceRecorder';
import {
  CATEGORIAS_RESIDUOS,
  type CategoriaResiduoKey,
  type SubtipoResiduo,
} from '@/lib/residuos/tipos';

type SubtiposState = Record<CategoriaResiduoKey, SubtipoResiduo[]>;

const emptyState = (): SubtiposState => ({
  aprovechables: [],
  organicos: [],
  peligrosos: [],
  noAprovechables: [],
});

const newRow = (nombre = '', cantidadKg: number | string = ''): SubtipoResiduo => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  nombre,
  cantidadKg,
});

export default function ManejoResiduosPage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const [subtipos, setSubtipos] = useState<SubtiposState>(emptyState);
  const [entregadoA, setEntregadoA] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [transcript, setTranscript] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const totalRegistros = useMemo(
    () =>
      Object.values(subtipos).reduce(
        (acc, arr) =>
          acc +
          arr.filter((s) => s.nombre.trim() && Number(s.cantidadKg) > 0).length,
        0,
      ),
    [subtipos],
  );

  const totalKg = useMemo(
    () =>
      Object.values(subtipos).reduce(
        (acc, arr) =>
          acc +
          arr.reduce((sum, s) => sum + (Number.isFinite(Number(s.cantidadKg)) ? Number(s.cantidadKg) : 0), 0),
        0,
      ),
    [subtipos],
  );

  const addSubtipo = (cat: CategoriaResiduoKey, nombre = '', cantidadKg: number | string = '') => {
    setSubtipos((prev) => ({ ...prev, [cat]: [...prev[cat], newRow(nombre, cantidadKg)] }));
  };

  const updateSubtipo = (cat: CategoriaResiduoKey, id: string, patch: Partial<SubtipoResiduo>) => {
    setSubtipos((prev) => ({
      ...prev,
      [cat]: prev[cat].map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const removeSubtipo = (cat: CategoriaResiduoKey, id: string) => {
    setSubtipos((prev) => ({ ...prev, [cat]: prev[cat].filter((s) => s.id !== id) }));
  };

  const reset = () => {
    setSubtipos(emptyState());
    setEntregadoA('');
    setObservaciones('');
    setTranscript('');
  };

  const applyVoiceResult: React.ComponentProps<typeof ManejoResiduosVoiceRecorder>['onResult'] = (data) => {
    setSubtipos({
      aprovechables: data.aprovechables.map((r) => newRow(r.nombre, r.cantidadKg)),
      organicos: data.organicos.map((r) => newRow(r.nombre, r.cantidadKg)),
      peligrosos: data.peligrosos.map((r) => newRow(r.nombre, r.cantidadKg)),
      noAprovechables: data.noAprovechables.map((r) => newRow(r.nombre, r.cantidadKg)),
    });
    if (data.entregadoA) setEntregadoA(data.entregadoA);
    if (data.observaciones) setObservaciones(data.observaciones);
    setStatus('idle');
    setMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('idle');
    setMessage('');

    const records = CATEGORIAS_RESIDUOS.flatMap((cat) =>
      subtipos[cat.key]
        .filter((s) => s.nombre.trim() && Number(s.cantidadKg) > 0)
        .map((s) => ({
          residuo: s.nombre.trim(),
          cantidadKg: Number(s.cantidadKg),
          tipoResiduo: cat.airtableValue,
          entregadoA: entregadoA.trim() || undefined,
          observaciones: observaciones.trim() || undefined,
          realizaRegistro: user?.nombre || undefined,
        })),
    );

    if (records.length === 0) {
      setStatus('error');
      setMessage('Agrega al menos un subtipo con nombre y cantidad mayor a 0.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/manejo-residuos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setStatus('success');
        setMessage(json.message || `${records.length} registro(s) creados.`);
        reset();
        setTimeout(() => setStatus('idle'), 4000);
      } else {
        setStatus('error');
        setMessage(json.error || 'No se pudo registrar.');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage('Error de conexión. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Auth gate ---
  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center pt-24 text-gray-600">
          Cargando…
        </div>
      </>
    );
  }
  if (!isAuthenticated) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center pt-24 px-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-white/20 max-w-md text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">🔒 Inicia sesión</h2>
            <p className="text-gray-600">Necesitas estar autenticado para registrar el manejo de residuos.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div
        className="min-h-screen relative pt-24 pb-12"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('https://res.cloudinary.com/dvnuttrox/image/upload/v1752168289/Lab_banner_xhhlfe.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 mb-6 border border-white/20">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">
                  ♻️ Manejo de Residuos
                </h1>
                <p className="text-gray-600">
                  Registra los residuos generados por categoría. Cada subtipo crea un registro independiente en Airtable.
                </p>
              </div>
              <div className="text-sm text-gray-700 bg-gray-100 rounded-lg px-3 py-2">
                Operador: <span className="font-semibold">{user?.nombre || '—'}</span>
              </div>
            </div>
          </div>

          {/* Voz */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 sm:p-6 mb-6 border border-white/20">
            <ManejoResiduosVoiceRecorder
              onResult={applyVoiceResult}
              onTranscript={setTranscript}
              disabled={submitting}
            />
            {transcript && (
              <details className="mt-3 text-sm text-gray-700">
                <summary className="cursor-pointer text-purple-700 font-medium">
                  Ver transcripción
                </summary>
                <p className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200 whitespace-pre-wrap">
                  {transcript}
                </p>
              </details>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Categorías */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {CATEGORIAS_RESIDUOS.map((cat) => {
                const rows = subtipos[cat.key];
                return (
                  <div
                    key={cat.key}
                    className={`bg-gradient-to-br ${cat.cardClass} rounded-2xl shadow-lg p-5 border`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-2xl">{cat.emoji}</span>
                        {cat.label}
                      </h3>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cat.badgeClass}`}>
                        {rows.filter((r) => r.nombre.trim() && Number(r.cantidadKg) > 0).length} válidos
                      </span>
                    </div>

                    <div className="space-y-2">
                      {rows.length === 0 && (
                        <p className="text-sm text-gray-500 italic">Sin subtipos. Agrega uno o usa la voz.</p>
                      )}
                      {rows.map((row) => (
                        <div key={row.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            list={`sug-${cat.key}`}
                            value={row.nombre}
                            onChange={(e) => updateSubtipo(cat.key, row.id, { nombre: e.target.value })}
                            placeholder="Subtipo (ej. cartón)"
                            className={`flex-1 min-w-0 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-900 placeholder:opacity-100 border border-gray-300 rounded-lg bg-white/90 focus:ring-2 ${cat.ringClass} focus:border-transparent`}
                          />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.cantidadKg}
                            onChange={(e) => updateSubtipo(cat.key, row.id, { cantidadKg: e.target.value })}
                            placeholder="kg"
                            className={`w-20 px-2 py-2 text-sm text-gray-900 placeholder:text-gray-900 placeholder:opacity-100 border border-gray-300 rounded-lg bg-white/90 focus:ring-2 ${cat.ringClass} focus:border-transparent`}
                          />
                          <button
                            type="button"
                            onClick={() => removeSubtipo(cat.key, row.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            aria-label="Eliminar subtipo"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                      <datalist id={`sug-${cat.key}`}>
                        {cat.sugerencias.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    </div>

                    <button
                      type="button"
                      onClick={() => addSubtipo(cat.key)}
                      className="mt-3 w-full text-sm font-medium text-gray-700 bg-white/80 hover:bg-white border border-dashed border-gray-400 rounded-lg py-2 transition-colors"
                    >
                      + Agregar subtipo
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Comunes */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-5 sm:p-6 border border-white/20 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Entregado a
                </label>
                <input
                  type="text"
                  value={entregadoA}
                  onChange={(e) => setEntregadoA(e.target.value)}
                  placeholder="Empresa o persona destinataria (ej. Ecoeficiencia S.A.S.)"
                  className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-900 placeholder:opacity-100 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Observaciones <span className="font-normal text-gray-500">(opcional)</span>
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={3}
                  placeholder="Notas, condiciones de entrega, número de manifiesto, etc."
                  className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-900 placeholder:opacity-100 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Resumen */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="bg-gray-100 text-gray-800 rounded-full px-3 py-1 font-medium">
                  Registros a crear: <span className="font-bold">{totalRegistros}</span>
                </span>
                <span className="bg-gray-100 text-gray-800 rounded-full px-3 py-1 font-medium">
                  Total: <span className="font-bold">{totalKg.toFixed(2)} kg</span>
                </span>
              </div>

              {/* Mensajes */}
              {status === 'success' && (
                <div className="rounded-xl bg-green-50 border border-green-200 text-green-800 px-4 py-3 text-sm">
                  ✅ {message}
                </div>
              )}
              {status === 'error' && (
                <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
                  ⚠️ {message}
                </div>
              )}

              {/* Acciones */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting || totalRegistros === 0}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Guardando…' : `Registrar ${totalRegistros || ''} residuo(s)`}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
}
