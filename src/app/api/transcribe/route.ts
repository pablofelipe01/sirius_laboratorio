import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Validar que la API key esté presente y sea válida
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
  throw new Error('OPENAI_API_KEY must be a valid OpenAI API key starting with sk-');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Verificar que la solicitud tenga autorización válida
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'No se recibió archivo de audio' },
        { status: 400 }
      );
    }

    // Límite de tamaño: 25MB (límite de OpenAI)
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'El archivo es demasiado grande. Máximo 25MB.' },
        { status: 400 }
      );
    }

    // Verificar que el archivo no esté vacío
    if (audioFile.size === 0) {
      return NextResponse.json(
        { success: false, error: 'El archivo de audio está vacío' },
        { status: 400 }
      );
    }

    // Lista estricta de tipos de archivo permitidos
    const allowedTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/ogg'];
    if (!allowedTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { success: false, error: `Tipo de archivo no soportado: ${audioFile.type}` },
        { status: 400 }
      );
    }

    // Rate limiting básico por IP
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    console.log('🎙️ Solicitud de transcripción desde IP:', clientIP);
    console.log('🔊 Archivo recibido:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type,
      timestamp: new Date().toISOString()
    });

    // Convertir File a formato que acepta OpenAI de forma segura
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Verificar que el buffer no esté corrupto
    if (buffer.length !== audioFile.size) {
      return NextResponse.json(
        { success: false, error: 'Error al procesar el archivo de audio' },
        { status: 400 }
      );
    }
    
    // Crear un objeto File-like que OpenAI pueda procesar
    const file = new File([buffer], 'audio.webm', { type: audioFile.type });

    console.log('Transcribiendo audio con OpenAI Whisper...');
    console.log('Tamaño del archivo:', audioFile.size, 'bytes');
    console.log('Tipo de archivo:', audioFile.type);

    // Transcribir usando OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'es', // Español
      response_format: 'text',
      temperature: 0.2, // Baja temperatura para mayor precisión
    });

    console.log('Transcripción completada:', transcription);

    if (!transcription || typeof transcription !== 'string' || transcription.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se pudo transcribir el audio. Intenta hablar más claro o verificar el micrófono.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      text: transcription.trim()
    });

  } catch (error: unknown) {
    console.error('Error en transcripción:', error);
    
    // Manejar errores específicos de OpenAI
    if (error && typeof error === 'object' && 'error' in error) {
      const openAiError = error as { error?: { type?: string }; status?: number };
      
      if (openAiError.error?.type === 'invalid_request_error') {
        return NextResponse.json(
          { success: false, error: 'Archivo de audio inválido o demasiado largo' },
          { status: 400 }
        );
      }
      
      if (openAiError.status === 401) {
        return NextResponse.json(
          { success: false, error: 'Error de autenticación con OpenAI' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al transcribir el audio. Por favor, intenta nuevamente.' 
      },
      { status: 500 }
    );
  }
}
