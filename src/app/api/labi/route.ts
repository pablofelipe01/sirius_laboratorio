import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 LABI API: Iniciando procesamiento...');
    
    const { message, userId, conversationHistory } = await request.json();
    
    console.log('📝 LABI: Mensaje recibido:', message);
    console.log('👤 LABI: Usuario:', userId);

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Mensaje requerido' },
        { status: 400 }
      );
    }

    // Intentar obtener respuesta de OpenAI
    const response = await getOpenAIResponse(message, conversationHistory || []);
    
    console.log('✅ LABI: Respuesta generada');
    
    return NextResponse.json({
      success: true,
      response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ LABI API: Error:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: 'Lo siento, hubo un problema procesando tu consulta. Intenta de nuevo.'
      },
      { status: 500 }
    );
  }
}

async function getOpenAIResponse(message: string, conversationHistory: any[]): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no configurada');
  }

  // Contexto especializado del laboratorio
  const systemPrompt = `Eres LABI, un asistente de IA especializado en laboratorios de microorganismos y bacterias. 

🔬 **Tu especialidad:**
- Microbiología y biotecnología
- Gestión de laboratorios de investigación
- Procesos de inoculación, cultivo y cosecha
- Control de calidad y análisis
- Inventario y equipos de laboratorio

📊 **Datos del laboratorio que manejas:**
- Insumos y stock de materiales
- Cepas bacterianas y microorganismos
- Procesos activos de inoculación
- Registros de cosecha y producción
- Bitácora de actividades del laboratorio
- Equipos y su estado

🎯 **Tu personalidad:**
- Profesional pero amigable y conversacional
- Experto técnico accesible
- Proactivo en sugerir mejoras
- Siempre dispuesto a explicar conceptos complejos de manera simple
- Enfocado en la eficiencia y mejores prácticas

💬 **Instrucciones de conversación:**
- Mantén un tono natural y conversacional, como ChatGPT
- Haz preguntas de seguimiento cuando sea relevante
- Ofrece explicaciones detalladas cuando sea necesario
- Sugiere acciones o mejoras cuando identifiques oportunidades
- Si no tienes datos específicos, explica qué información necesitarías para ayudar mejor
- Usa emojis de manera natural para hacer la conversación más amigable

Responde de manera natural y conversacional, como si fueras un experto colega que conoce todo sobre el laboratorio.`;

  try {
    // Construir el historial de conversación para OpenAI
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    // Agregar historial previo (últimos 10 mensajes para no exceder tokens)
    const recentHistory = conversationHistory.slice(-10);
    recentHistory.forEach((msg: any) => {
      messages.push({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    });

    // Agregar mensaje actual
    messages.push({
      role: 'user',
      content: message
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Modelo más rápido y conversacional
        messages: messages,
        max_tokens: 800,
        temperature: 0.8, // Más creatividad para conversación natural
        presence_penalty: 0.6, // Evitar repetición
        frequency_penalty: 0.3,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No se recibió respuesta válida de OpenAI');
    }

    return aiResponse;
  } catch (error) {
    console.error('Error con OpenAI:', error);
    throw error;
  }
}
