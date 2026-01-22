import { NextRequest, NextResponse } from 'next/server';
import { debugLog } from '@/lib/debug';
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
    console.log('🎤 TRANSCRIBE: Recibiendo solicitud de transcripción...');
    
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      console.error('❌ TRANSCRIBE: No se recibió archivo de audio');
      return NextResponse.json(
        { success: false, error: 'No se recibió archivo de audio' },
        { status: 400 }
      );
    }

    console.log('📁 TRANSCRIBE: Archivo recibido:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    });

    // Límite de tamaño: 25MB (límite de OpenAI)
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > MAX_FILE_SIZE) {
      console.error('❌ TRANSCRIBE: Archivo demasiado grande:', audioFile.size);
      return NextResponse.json(
        { success: false, error: 'El archivo es demasiado grande. Máximo 25MB.' },
        { status: 400 }
      );
    }

    // Verificar que el archivo no esté vacío
    if (audioFile.size === 0) {
      console.error('❌ TRANSCRIBE: Archivo vacío');
      return NextResponse.json(
        { success: false, error: 'El archivo de audio está vacío' },
        { status: 400 }
      );
    }

    // Extraer tipo de archivo base (sin codecs como ;codecs=opus)
    const audioType = audioFile.type.split(';')[0];

    // Lista de tipos de archivo base permitidos (sin codecs)
    const allowedTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/ogg', 'audio/mp4'];
    
    if (!allowedTypes.includes(audioType)) {
      return NextResponse.json(
        { success: false, error: `Tipo de archivo no soportado: ${audioFile.type}` },
        { status: 400 }
      );
    }

    // Validación adicional: rechazar codecs de WebM problemáticos
    if (audioFile.type.includes('audio/webm') && audioFile.type.includes('codecs=pcm')) {
      return NextResponse.json(
        { success: false, error: 'El formato WebM con codec PCM no es compatible. Por favor, usa otro formato.' },
        { status: 400 }
      );
    }

    // Rate limiting básico por IP
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    debugLog('📝 Solicitud de transcripción desde IP:', clientIP);
    debugLog('🔊 Archivo recibido:', {
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
    let fileName = 'audio.webm'; // Por defecto
    
    // Ajustar el nombre del archivo según el tipo
    if (audioType === 'audio/mp4') fileName = 'audio.mp4';
    else if (audioType === 'audio/wav') fileName = 'audio.wav';
    else if (audioType === 'audio/mp3') fileName = 'audio.mp3';
    else if (audioType === 'audio/m4a') fileName = 'audio.m4a';
    else if (audioType === 'audio/ogg') fileName = 'audio.ogg';
    
    const file = new File([buffer], fileName, { type: audioType });

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

    debugLog('Transcripción completada:', transcription);

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
