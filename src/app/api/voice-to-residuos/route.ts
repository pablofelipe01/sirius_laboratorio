import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { CATEGORIAS_RESIDUOS, type CategoriaResiduoKey } from '@/lib/residuos/tipos';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface SubtipoExtraido {
  nombre: string;
  cantidadKg: number;
}

interface ResiduosExtraidos {
  aprovechables: SubtipoExtraido[];
  organicos: SubtipoExtraido[];
  peligrosos: SubtipoExtraido[];
  noAprovechables: SubtipoExtraido[];
  entregadoA: string;
  observaciones: string;
}

const EMPTY: ResiduosExtraidos = {
  aprovechables: [],
  organicos: [],
  peligrosos: [],
  noAprovechables: [],
  entregadoA: '',
  observaciones: '',
};

function buildSystemPrompt(): string {
  const cats = CATEGORIAS_RESIDUOS.map((c) => `- ${c.key}: ${c.label} (${c.airtableValue})`).join('\n');
  return `Eres un asistente que estructura reportes de manejo de residuos en un laboratorio microbiológico (cultivos, fermentación, cosecha).

Categorías válidas (claves a usar en el JSON):
${cats}

Tu tarea: leer la transcripción del operador y devolver SIEMPRE un JSON válido con EXACTAMENTE esta forma:
{
  "aprovechables":     [{ "nombre": "string", "cantidadKg": number }, ...],
  "organicos":         [{ "nombre": "string", "cantidadKg": number }, ...],
  "peligrosos":        [{ "nombre": "string", "cantidadKg": number }, ...],
  "noAprovechables":   [{ "nombre": "string", "cantidadKg": number }, ...],
  "entregadoA": "string (empresa o persona destinataria, vacío si no se menciona)",
  "observaciones": "string (notas adicionales, vacío si no hay)"
}

REGLAS:
1. Convierte SIEMPRE la cantidad a kilogramos (kg). Si dicen "500 gramos" → 0.5. Si dicen "2 toneladas" → 2000.
2. Clasifica cada subtipo en la categoría correcta del laboratorio:
   - aprovechables: cartón, papel, plástico limpio, vidrio, aluminio.
   - organicos: sustrato usado, restos de medio de cultivo, biomasa descartada.
   - peligrosos: cultivos contaminados, reactivos, ácidos, material cortopunzante, residuos biopeligrosos.
   - noAprovechables: empaques sucios, guantes, tapabocas, residuos comunes no reciclables.
3. Si una categoría no se menciona, devuélvela como [].
4. Si no se menciona "entregado a" u "observaciones", devuelve "" (cadena vacía).
5. NO inventes datos. Si no estás seguro de la cantidad, omite ese subtipo.
6. Responde SOLO con el JSON, sin texto adicional.`;
}

function sanitize(parsed: unknown): ResiduosExtraidos {
  if (!parsed || typeof parsed !== 'object') return EMPTY;
  const p = parsed as Record<string, unknown>;
  const cleanArr = (raw: unknown): SubtipoExtraido[] => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((it) => {
        if (!it || typeof it !== 'object') return null;
        const o = it as Record<string, unknown>;
        const nombre = String(o.nombre ?? '').trim();
        const cantidadKg = Number(o.cantidadKg);
        if (!nombre || !Number.isFinite(cantidadKg) || cantidadKg <= 0) return null;
        return { nombre, cantidadKg: Math.round(cantidadKg * 100) / 100 };
      })
      .filter((x): x is SubtipoExtraido => x !== null);
  };

  const keys: CategoriaResiduoKey[] = ['aprovechables', 'organicos', 'peligrosos', 'noAprovechables'];
  const result: ResiduosExtraidos = { ...EMPTY };
  keys.forEach((k) => {
    result[k] = cleanArr(p[k]);
  });
  result.entregadoA = String(p.entregadoA ?? '').trim();
  result.observaciones = String(p.observaciones ?? '').trim();
  return result;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OPENAI_API_KEY no configurado' },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'Falta el archivo de audio' },
        { status: 400 },
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const file = new File([buffer], 'audio.webm', { type: audioFile.type || 'audio/webm' });

    // 1) Whisper → transcripción
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'es',
      response_format: 'text',
      temperature: 0.1,
    });
    const transcript = String(transcription).trim();

    if (!transcript) {
      return NextResponse.json({
        success: true,
        transcript: '',
        data: EMPTY,
      });
    }

    // 2) GPT → extracción estructurada
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: `Transcripción:\n"${transcript}"\n\nDevuelve solo el JSON.` },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    return NextResponse.json({
      success: true,
      transcript,
      data: sanitize(parsed),
    });
  } catch (error) {
    console.error('[voice-to-residuos] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error procesando el audio',
      },
      { status: 500 },
    );
  }
}
