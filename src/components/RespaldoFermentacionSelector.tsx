'use client';

import { useEffect, useState } from 'react';

/**
 * De dónde sale una entrada de bacterias: la fermentación de DataLab, o el
 * lote y el motivo cuando no está registrada. El servidor lo vuelve a validar
 * (ver src/lib/inventario/respaldo-bacterias.ts); esto solo guía al usuario.
 */
export type RespaldoFermentacion = {
  requiere: boolean;
  fermentacionId: string;
  codigoLote: string;
  motivo: string;
};

export const RESPALDO_VACIO: RespaldoFermentacion = {
  requiere: false,
  fermentacionId: '',
  codigoLote: '',
  motivo: '',
};

const SIN_FERMENTACION = '__sin_fermentacion__';
const LARGO_MINIMO_MOTIVO = 10;

export function respaldoListo(r: RespaldoFermentacion): boolean {
  if (!r.requiere) return true;
  if (r.fermentacionId) return true;
  return r.codigoLote.trim() !== '' && r.motivo.trim().length >= LARGO_MINIMO_MOTIVO;
}

/** El cuerpo que espera POST /api/productos-secos. */
export function respaldoParaEnviar(r: RespaldoFermentacion) {
  if (!r.requiere) return {};
  return r.fermentacionId
    ? { fermentacionId: r.fermentacionId }
    : { codigoLote: r.codigoLote.trim(), motivoSinFermentacion: r.motivo.trim() };
}

type Fermentacion = { id: string; codigoLote: string; litrosDisponibles: number; fechaTermina: string | null };

const claseCampo =
  'w-full border-2 border-gray-300 rounded-lg p-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-gray-900 placeholder-gray-400';

export default function RespaldoFermentacionSelector({
  productoId,
  litros,
  value,
  onChange,
}: {
  productoId: string;
  litros: number;
  value: RespaldoFermentacion;
  onChange: (r: RespaldoFermentacion) => void;
}) {
  const [fermentaciones, setFermentaciones] = useState<Fermentacion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [sinFermentacion, setSinFermentacion] = useState(false);

  useEffect(() => {
    if (!productoId) return;
    let vigente = true;
    setCargando(true);
    setError('');
    setSinFermentacion(false);

    fetch(`/api/fermentacion/disponibles?productoId=${encodeURIComponent(productoId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!vigente) return;
        if (!data.success) throw new Error(data.error);
        setFermentaciones(data.fermentaciones || []);
        // Sin fermentaciones no hay nada que escoger: se va directo al lote y motivo.
        setSinFermentacion(data.requiereRespaldo && (data.fermentaciones || []).length === 0);
        onChange({ ...RESPALDO_VACIO, requiere: Boolean(data.requiereRespaldo) });
      })
      .catch((e) => {
        if (!vigente) return;
        console.error('❌ Error cargando fermentaciones disponibles:', e);
        setError('No se pudieron cargar las fermentaciones. Puedes registrar con lote y motivo.');
        setFermentaciones([]);
        setSinFermentacion(true);
        onChange({ ...RESPALDO_VACIO, requiere: true });
      })
      .finally(() => vigente && setCargando(false));

    return () => {
      vigente = false;
    };
    // onChange cambia en cada render del padre; solo se recarga al cambiar de producto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId]);

  if (!productoId || (!cargando && !value.requiere)) return null;

  const escogida = fermentaciones.find((f) => f.id === value.fermentacionId);

  return (
    <div className="space-y-3 border-2 border-purple-200 rounded-lg p-4">
      <label className="block text-sm font-semibold text-gray-700">🧪 Fermentación de origen</label>

      {cargando ? (
        <p className="text-sm text-gray-500">Cargando fermentaciones disponibles...</p>
      ) : (
        <>
          {fermentaciones.length > 0 && (
            <select
              value={sinFermentacion ? SIN_FERMENTACION : value.fermentacionId}
              onChange={(e) => {
                const sin = e.target.value === SIN_FERMENTACION;
                setSinFermentacion(sin);
                onChange({ ...value, fermentacionId: sin ? '' : e.target.value });
              }}
              className={claseCampo}
            >
              <option value="">Seleccione la fermentación</option>
              {fermentaciones.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.codigoLote} — {f.litrosDisponibles} L disponibles
                </option>
              ))}
              <option value={SIN_FERMENTACION}>No está registrada en DataLab</option>
            </select>
          )}

          {escogida && litros > escogida.litrosDisponibles && (
            <p className="text-sm text-red-600">
              ⚠️ La fermentación {escogida.codigoLote} solo tiene {escogida.litrosDisponibles} L.
            </p>
          )}

          {error && <p className="text-sm text-amber-600">⚠️ {error}</p>}

          {sinFermentacion && (
            <>
              {fermentaciones.length === 0 && !error && (
                <p className="text-sm text-amber-600">
                  ⚠️ No hay fermentaciones disponibles en DataLab para este producto. La entrada queda
                  marcada como «sin fermentación registrada».
                </p>
              )}
              <input
                type="text"
                value={value.codigoLote}
                onChange={(e) => onChange({ ...value, codigoLote: e.target.value })}
                placeholder="Código del lote (ej: 051026BT)"
                className={claseCampo}
              />
              <textarea
                value={value.motivo}
                onChange={(e) => onChange({ ...value, motivo: e.target.value })}
                placeholder="¿Por qué no está registrada la fermentación?"
                rows={2}
                className={claseCampo}
              />
              {value.motivo.trim().length > 0 && value.motivo.trim().length < LARGO_MINIMO_MOTIVO && (
                <p className="text-xs text-gray-500">El motivo necesita al menos {LARGO_MINIMO_MOTIVO} caracteres.</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
