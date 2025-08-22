import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function GET() {
  console.log('🔍 SIRIUS AUDIO API: Verificando estado...');
  
  return NextResponse.json({
    status: 'API de audio funcionando',
    hasApiKey: !!OPENAI_API_KEY,
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    console.log('🎤 SIRIUS AUDIO API: Iniciando procesamiento de audio...');
    
    if (!OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY no configurada');
      return NextResponse.json(
        { error: 'Clave de OpenAI no configurada' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      console.error('❌ No se recibió archivo de audio');
      return NextResponse.json(
        { error: 'Archivo de audio requerido' },
        { status: 400 }
      );
    }

    console.log('📄 Archivo recibido:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    });

    // Convertir el archivo a buffer para enviarlo a OpenAI
    const audioBuffer = await audioFile.arrayBuffer();
    
    console.log('🔊 Enviando audio a OpenAI Whisper...');
    
    // Crear FormData para OpenAI
    const openAIFormData = new FormData();
    const blob = new Blob([audioBuffer], { type: audioFile.type });
    openAIFormData.append('file', blob, audioFile.name);
    openAIFormData.append('model', 'whisper-1');
    openAIFormData.append('language', 'es'); // Español

    // Llamar a OpenAI Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: openAIFormData
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('❌ Error de OpenAI Whisper:', whisperResponse.status, errorText);
      throw new Error(`Error de OpenAI: ${whisperResponse.status} - ${errorText}`);
    }

    const transcription = await whisperResponse.json();
    console.log('📝 Transcripción recibida:', transcription.text);

    // Ahora obtener respuesta de ChatGPT con el texto transcrito
    const chatResponse = await getChatGPTResponse(transcription.text);
    
    console.log('✅ SIRIUS AUDIO: Procesamiento completo');
    
    return NextResponse.json({
      success: true,
      transcription: transcription.text,
      response: chatResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ SIRIUS AUDIO API: Error:', error);
    return NextResponse.json(
      { 
        error: 'Error procesando audio',
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

async function getChatGPTResponse(message: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no configurada');
  }

  // Contexto especializado del laboratorio
  const systemPrompt = `Eres SIRIUS, un asistente de IA avanzado especializado en laboratorios de microorganismos y biotecnología. 

CONTEXTO DEL LABORATORIO:
- Trabajas en Sirius Regenerative Solutions, un laboratorio especializado en producción de microorganismos
- Te especializas en hongos entomopatógenos como Beauveria bassiana, Metarhizium anisopliae
- También trabajas con bacterias como PseudoMonas, AzosPirillum, AzotoBacter
- Conoces procesos de fermentación, escalado, inoculación, y control de calidad

TU PERSONALIDAD:
- Eres profesional pero amigable
- Usas emojis ocasionalmente para hacer las conversaciones más dinámicas
- Respondes en español colombiano
- Eres preciso en términos técnicos pero puedes explicar de forma simple cuando es necesario

INSTRUCCIONES:
- Mantén respuestas concisas pero informativas (máximo 3-4 oraciones)
- Si no sabes algo específico, sé honesto pero ofrece ayuda relacionada
- Enfócate en temas del laboratorio y biotecnología
- Si preguntan sobre otros temas, redirige gentilmente hacia tu especialidad`;

  console.log('🧠 Enviando mensaje a ChatGPT:', message);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 300,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Error de ChatGPT:', response.status, errorText);
    throw new Error(`Error de ChatGPT: ${response.status} - ${errorText}`);
  }

  const completion = await response.json();
  const aiResponse = completion.choices[0]?.message?.content || 'Lo siento, no pude generar una respuesta.';
  
  console.log('🤖 Respuesta de ChatGPT:', aiResponse);
  
  return aiResponse;
}
