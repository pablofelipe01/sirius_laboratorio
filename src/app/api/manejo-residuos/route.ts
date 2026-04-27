import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { CATEGORIAS_RESIDUOS, type ResiduoRecordInput } from '@/lib/residuos/tipos';

// --- Configuración Airtable -------------------------------------------------
if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
  console.error('[manejo-residuos] Faltan AIRTABLE_API_KEY / AIRTABLE_BASE_ID');
}

const TABLE_NAME = process.env.AIRTABLE_TABLE_MANEJO_RESIDUOS || 'Manejo Residuos';

const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY!,
}).base(process.env.AIRTABLE_BASE_ID!);

const TIPOS_VALIDOS = new Set(CATEGORIAS_RESIDUOS.map((c) => c.airtableValue));

// --- Helpers ----------------------------------------------------------------
function normalizarRecord(raw: unknown): ResiduoRecordInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const residuo = String(r.residuo ?? r.Residuo ?? '').trim();
  const cantidad = Number(r.cantidadKg ?? r['Cantidad Residuo KG'] ?? r.cantidad);
  const tipoResiduo = String(r.tipoResiduo ?? r['Tipo Residuo'] ?? '').trim();

  if (!residuo) return null;
  if (!Number.isFinite(cantidad) || cantidad <= 0) return null;
  if (!TIPOS_VALIDOS.has(tipoResiduo)) return null;

  return {
    residuo,
    cantidadKg: cantidad,
    tipoResiduo,
    entregadoA: r.entregadoA ? String(r.entregadoA).trim() : undefined,
    observaciones: r.observaciones ? String(r.observaciones).trim() : undefined,
    realizaRegistro: r.realizaRegistro ? String(r.realizaRegistro).trim() : undefined,
  };
}

// --- POST: append-only ------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Acepta {records:[...]} o legacy {records:undefined, ...singleRecord}
    const incoming: unknown[] = Array.isArray(body?.records)
      ? body.records
      : [body];

    const records = incoming
      .map(normalizarRecord)
      .filter((r): r is ResiduoRecordInput => r !== null);

    if (records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se recibieron subtipos válidos. Verifica nombre, cantidad (>0) y tipo.',
        },
        { status: 400 },
      );
    }

    // Airtable acepta hasta 10 records por request → batchear
    const created: { id: string }[] = [];
    for (let i = 0; i < records.length; i += 10) {
      const batch = records.slice(i, i + 10).map((r) => ({
        fields: {
          Residuo: r.residuo,
          'Cantidad Residuo KG': r.cantidadKg,
          'Tipo Residuo': r.tipoResiduo,
          ...(r.entregadoA ? { 'Entregado a': r.entregadoA } : {}),
          ...(r.observaciones ? { Observaciones: r.observaciones } : {}),
          ...(r.realizaRegistro ? { 'Realiza Registro': r.realizaRegistro } : {}),
        },
      }));

      const res = await base(TABLE_NAME).create(batch, { typecast: true });
      res.forEach((rec) => created.push({ id: rec.id }));
    }

    return NextResponse.json({
      success: true,
      message: `${created.length} registro(s) de residuos creados.`,
      data: { created, count: created.length },
    });
  } catch (error) {
    console.error('[manejo-residuos][POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno al registrar residuos',
      },
      { status: 500 },
    );
  }
}

// Append-only: explícitamente no se exponen GET/PUT/DELETE.
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Método no permitido. Este endpoint es append-only.' },
    { status: 405 },
  );
}
