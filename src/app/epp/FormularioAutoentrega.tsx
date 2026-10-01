'use client';

/**
 * Formulario de autoentrega de EPP.
 *
 * Tres pasos en una sola pantalla: elegir del catálogo, ajustar cantidad y
 * talla, firmar. Está pensado para el gesto real —alguien de pie en la bodega,
 * con el celular, poniéndose los guantes en treinta segundos—, así que no hay
 * navegación entre pasos ni confirmaciones intermedias: lo único que bloquea
 * el envío es que falte la firma o el motivo.
 *
 * El stock que se ve es el que SG-SST tenía al abrir la pantalla. Puede quedar
 * viejo mientras se llena el formulario; SG-SST lo revalida antes de escribir
 * y devuelve 409 con el detalle de lo que faltó. Ese es el mensaje que se
 * muestra, en vez de un error genérico.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { FirmaCanvas } from '@sirius/solicitudes';
import type { InsumoEPP, FaltanteStock } from '@/lib/epp/sgsst';

/** Debe coincidir con la lista cerrada que valida SG-SST. */
const MOTIVOS = [
  'Reposición por Desgaste',
  'Reposición por Pérdida',
  'Reposición por Vencimiento',
  'Dotación Inicial',
  'Cambio de Cargo/Área',
];

const TALLAS = ['Única', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'N/A'];

const CANTIDAD_MAXIMA = 20;

/** Azul de "permiso": este trámite pertenece a la misma familia. */
const COLOR = '#1a51a8';

interface LineaSeleccionada {
  insumo: InsumoEPP;
  cantidad: number;
  talla: string;
}

interface Radicada {
  entregaId: string;
  idEntrega: string;
  fechaEntrega: string;
  nombreCompleto: string;
}

/** Convierte el blob del canvas al data URL que espera SG-SST. */
function blobADataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(new Error('No se pudo leer la firma'));
    lector.readAsDataURL(blob);
  });
}

export function FormularioAutoentrega({ nombre }: { nombre: string }) {
  const [catalogo, setCatalogo] = useState<InsumoEPP[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState<LineaSeleccionada[]>([]);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [observaciones, setObservaciones] = useState('');
  const [firma, setFirma] = useState<string | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [faltantes, setFaltantes] = useState<FaltanteStock[]>([]);
  const [radicada, setRadicada] = useState<Radicada | null>(null);

  // ── Catálogo ──────────────────────────────────────────
  const cargarCatalogo = useCallback(async () => {
    setCargando(true);
    setErrorCatalogo('');
    try {
      const respuesta = await fetch('/api/epp/catalogo');
      const datos = await respuesta.json();
      if (!datos.success) throw new Error(datos.error || 'Error al cargar el catálogo');
      setCatalogo(datos.data as InsumoEPP[]);
    } catch (e) {
      setErrorCatalogo(e instanceof Error ? e.message : 'Error al cargar el catálogo');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarCatalogo();
  }, [cargarCatalogo]);

  const disponibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const yaElegidos = new Set(seleccion.map((l) => l.insumo.id));
    return catalogo
      .filter((insumo) => !yaElegidos.has(insumo.id))
      .filter(
        (insumo) =>
          !texto ||
          insumo.nombre.toLowerCase().includes(texto) ||
          insumo.codigo.toLowerCase().includes(texto),
      );
  }, [catalogo, busqueda, seleccion]);

  // ── Selección ─────────────────────────────────────────
  function agregar(insumo: InsumoEPP) {
    setSeleccion((actual) => [...actual, { insumo, cantidad: 1, talla: 'Única' }]);
    setBusqueda('');
    setFaltantes([]);
    setError('');
  }

  function quitar(insumoId: string) {
    setSeleccion((actual) => actual.filter((l) => l.insumo.id !== insumoId));
  }

  function cambiarCantidad(insumoId: string, cantidad: number) {
    setSeleccion((actual) =>
      actual.map((l) => (l.insumo.id === insumoId ? { ...l, cantidad } : l)),
    );
  }

  function cambiarTalla(insumoId: string, talla: string) {
    setSeleccion((actual) =>
      actual.map((l) => (l.insumo.id === insumoId ? { ...l, talla } : l)),
    );
  }

  // ── Envío ─────────────────────────────────────────────
  const puedeEnviar = seleccion.length > 0 && !!firma && !!motivo && !enviando;

  async function enviar() {
    if (!puedeEnviar) return;

    setEnviando(true);
    setError('');
    setFaltantes([]);

    try {
      const respuesta = await fetch('/api/epp/autoentrega', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motivo,
          observaciones: observaciones.trim() || undefined,
          // La identidad no se manda: la pone el servidor desde la sesión.
          lineas: seleccion.map((l) => ({
            insumoId: l.insumo.id,
            codigoInsumo: l.insumo.codigo,
            nombre: l.insumo.nombre,
            cantidad: l.cantidad,
            talla: l.talla,
          })),
          firmaData: firma,
        }),
      });

      const datos = await respuesta.json();

      if (!datos.success) {
        setFaltantes((datos.faltantes as FaltanteStock[]) ?? []);
        throw new Error(datos.error || 'No se pudo registrar la entrega');
      }

      setRadicada(datos.entrega as Radicada);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la entrega');
      // El stock cambió bajo los pies: se recarga para que la próxima
      // decisión se tome sobre cifras frescas.
      void cargarCatalogo();
    } finally {
      setEnviando(false);
    }
  }

  function nuevaEntrega() {
    setSeleccion([]);
    setObservaciones('');
    setFirma(null);
    setRadicada(null);
    setError('');
    setFaltantes([]);
    void cargarCatalogo();
  }

  // ── Comprobante ───────────────────────────────────────
  if (radicada) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-16">
        <div className="glass rounded-2xl p-8 text-center">
          <div
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: `${COLOR}33` }}
          >
            <svg
              className="h-7 w-7"
              style={{ color: '#6bb543' }}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>

          <h1 className="mb-2 text-2xl font-semibold">Entrega registrada</h1>
          <p className="mb-6 text-white/70">
            Quedó firmada a nombre de {radicada.nombreCompleto} y el inventario de
            SST ya está descontado.
          </p>

          <dl className="mb-8 space-y-2 text-sm">
            {radicada.idEntrega && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <dt className="text-white/60">Acta</dt>
                <dd className="font-medium">{radicada.idEntrega}</dd>
              </div>
            )}
            <div className="flex justify-between border-b border-white/10 pb-2">
              <dt className="text-white/60">Fecha</dt>
              <dd className="font-medium">{radicada.fechaEntrega}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={nuevaEntrega}
            className="rounded-xl px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: COLOR }}
          >
            Registrar otro retiro
          </button>
        </div>
      </main>
    );
  }

  // ── Formulario ────────────────────────────────────────
  return (
    <main className="mx-auto max-w-2xl px-4 pb-16">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Retiro de EPP</h1>
        <p className="mt-1 text-sm text-white/70">
          {nombre}, registra lo que estás tomando de la bodega de SST y fírmalo.
          Queda como constancia de entrega a tu nombre.
        </p>
      </header>

      {/* ── Catálogo ── */}
      <section className="glass mb-4 rounded-2xl p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
          ¿Qué vas a llevar?
        </h2>

        {cargando ? (
          <p className="py-6 text-center text-sm text-white/60">Cargando catálogo…</p>
        ) : errorCatalogo ? (
          <div className="rounded-xl bg-red-500/15 p-4 text-sm text-red-200">
            <p>{errorCatalogo}</p>
            <button
              type="button"
              onClick={() => void cargarCatalogo()}
              className="mt-2 underline underline-offset-2 hover:no-underline"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o código…"
              className="mb-3 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm placeholder:text-white/40 focus:border-white/30 focus:outline-none"
            />

            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {disponibles.map((insumo) => {
                const agotado = insumo.stockActual <= 0;
                return (
                  <li key={insumo.id}>
                    <button
                      type="button"
                      disabled={agotado}
                      onClick={() => agregar(insumo)}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-colors enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {insumo.imagen ? (
                        <Image
                          src={insumo.imagen.url}
                          alt=""
                          width={40}
                          height={40}
                          className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-white/10" />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{insumo.nombre}</p>
                        <p className="text-xs text-white/50">{insumo.codigo}</p>
                      </div>

                      <span
                        className={`flex-shrink-0 text-xs ${agotado ? 'text-red-300' : 'text-white/60'}`}
                      >
                        {agotado
                          ? 'Agotado'
                          : `${insumo.stockActual} ${insumo.unidadMedida || 'und'}`}
                      </span>
                    </button>
                  </li>
                );
              })}

              {disponibles.length === 0 && (
                <li className="py-6 text-center text-sm text-white/50">
                  {busqueda
                    ? 'Ningún elemento coincide con la búsqueda.'
                    : 'No hay más elementos disponibles.'}
                </li>
              )}
            </ul>
          </>
        )}
      </section>

      {/* ── Selección ── */}
      {seleccion.length > 0 && (
        <section className="glass mb-4 rounded-2xl p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
            Lo que te llevas
          </h2>

          <ul className="space-y-3">
            {seleccion.map((linea) => (
              <li
                key={linea.insumo.id}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{linea.insumo.nombre}</p>
                    <p className="text-xs text-white/50">
                      {linea.insumo.codigo} · quedan {linea.insumo.stockActual}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => quitar(linea.insumo.id)}
                    className="flex-shrink-0 text-xs text-white/50 underline underline-offset-2 hover:text-white"
                  >
                    Quitar
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-white/60">
                    Cantidad
                    <input
                      type="number"
                      min={1}
                      max={Math.min(CANTIDAD_MAXIMA, linea.insumo.stockActual)}
                      value={linea.cantidad}
                      onChange={(e) =>
                        cambiarCantidad(linea.insumo.id, Number(e.target.value))
                      }
                      className="w-20 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white focus:border-white/30 focus:outline-none"
                    />
                  </label>

                  <label className="flex items-center gap-2 text-xs text-white/60">
                    Talla
                    <select
                      value={linea.talla}
                      onChange={(e) => cambiarTalla(linea.insumo.id, e.target.value)}
                      className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white focus:border-white/30 focus:outline-none"
                    >
                      {TALLAS.map((talla) => (
                        <option key={talla} value={talla} className="bg-slate-800">
                          {talla}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Motivo ── */}
      <section className="glass mb-4 rounded-2xl p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
          ¿Por qué lo necesitas?
        </h2>

        <select
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="mb-3 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none"
        >
          {MOTIVOS.map((m) => (
            <option key={m} value={m} className="bg-slate-800">
              {m}
            </option>
          ))}
        </select>

        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={2}
          placeholder="Observaciones (opcional)"
          className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm placeholder:text-white/40 focus:border-white/30 focus:outline-none"
        />
      </section>

      {/* ── Firma ── */}
      <section className="glass mb-4 rounded-2xl p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-white/60">
          Tu firma
        </h2>
        <p className="mb-3 text-xs text-white/50">
          Con ella se emite la constancia de entrega. Es el respaldo de que
          recibiste estos elementos.
        </p>

        <FirmaCanvas
          color={COLOR}
          onFirmaCapturada={(blob) => {
            void blobADataUrl(blob)
              .then(setFirma)
              .catch(() => setError('No se pudo procesar la firma. Inténtalo de nuevo.'));
          }}
          onLimpiar={() => setFirma(null)}
        />
      </section>

      {/* ── Errores ── */}
      {error && (
        <div className="mb-4 rounded-xl bg-red-500/15 p-4 text-sm text-red-200">
          <p>{error}</p>
          {faltantes.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {faltantes.map((f) => (
                <li key={f.insumoId}>
                  {f.nombre}: pediste {f.solicitado}, quedan {f.disponible}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={!puedeEnviar}
        onClick={() => void enviar()}
        className="w-full rounded-xl px-6 py-3.5 font-medium text-white transition-opacity enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        style={{ backgroundColor: COLOR }}
      >
        {enviando ? 'Registrando…' : 'Registrar y firmar'}
      </button>

      {!firma && seleccion.length > 0 && (
        <p className="mt-2 text-center text-xs text-white/50">Falta tu firma.</p>
      )}
    </main>
  );
}
