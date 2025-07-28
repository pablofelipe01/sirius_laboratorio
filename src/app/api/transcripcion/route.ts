import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó archivo de audio' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'API key de OpenAI no configurada' },
        { status: 500 }
      );
    }

    console.log('🎤 Procesando transcripción de audio:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    });

    try {
      // Convertir el archivo a un formato que OpenAI pueda procesar
      const arrayBuffer = await audioFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Crear un archivo temporal para la transcripción
      const file = new File([buffer], audioFile.name || 'audio.webm', {
        type: audioFile.type || 'audio/webm'
      });

      // Realizar la transcripción con OpenAI Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: 'es', // Español
        response_format: 'text'
      });

      console.log('✅ Transcripción completada exitosamente');

      return NextResponse.json({
        success: true,
        transcription: transcription,
        message: 'Audio transcrito exitosamente'
      });

    } catch (openaiError: unknown) {
      console.error('❌ Error en OpenAI Whisper:', openaiError);
      
      const error = openaiError as { code?: string; message?: string };
      
      // Manejar errores específicos de OpenAI
      if (error.code === 'invalid_request_error') {
        return NextResponse.json(
          { success: false, error: 'Formato de audio no válido. Use formatos como MP3, WAV, M4A, etc.' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: `Error en transcripción: ${error.message || 'Error desconocido'}` },
        { status: 500 }
      );
    }

  } catch (error: unknown) {
    console.error('❌ Error general en transcripción:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// Endpoint para generar un informe ejecutivo basado en la transcripción
export async function PUT(request: NextRequest) {
  try {
    const { transcription } = await request.json();

    if (!transcription) {
      return NextResponse.json(
        { success: false, error: 'Transcripción requerida' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'API key de OpenAI no configurada' },
        { status: 500 }
      );
    }

    console.log('📄 Generando informe ejecutivo basado en transcripción');

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `Eres un asistente especializado en laboratorios de biotecnología y producción de hongos. 
            Tu tarea es crear un informe ejecutivo profesional basado en la transcripción de audio de una bitácora de laboratorio.
            
            El informe debe incluir:
            1. Resumen ejecutivo
            2. Actividades principales realizadas
            3. Observaciones importantes
            4. Resultados o hallazgos
            5. Próximos pasos o recomendaciones
            
            Mantén un tono profesional y técnico apropiado para un laboratorio de biotecnología.
            Estructura la información de manera clara y organizada.`
          },
          {
            role: 'user',
            content: `Por favor, genera un informe ejecutivo basado en la siguiente transcripción de bitácora de laboratorio:

${transcription}`
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      });

      const informeEjecutivo = completion.choices[0]?.message?.content || '';

      console.log('✅ Informe ejecutivo generado exitosamente');

      return NextResponse.json({
        success: true,
        informeEjecutivo,
        message: 'Informe ejecutivo generado exitosamente'
      });

    } catch (openaiError: unknown) {
      console.error('❌ Error en OpenAI para informe ejecutivo:', openaiError);
      const error = openaiError as { message?: string };
      return NextResponse.json(
        { success: false, error: `Error generando informe: ${error.message || 'Error desconocido'}` },
        { status: 500 }
      );
    }

  } catch (error: unknown) {
    console.error('❌ Error general en generación de informe:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
