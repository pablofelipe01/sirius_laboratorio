import { NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: Request): Promise<Response> {
  try {
    console.log('🤖 SIRIUS API: Iniciando procesamiento...');
    
    const { message, userId, conversationHistory } = await request.json();
    
    console.log('📝 SIRIUS: Mensaje recibido:', message);
    console.log('👤 SIRIUS: Usuario:', userId);

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Mensaje requerido' },
        { status: 400 }
      );
    }

    // Intentar obtener respuesta de OpenAI
    const response = await getOpenAIResponse(message, conversationHistory || []);
    
    console.log('✅ SIRIUS: Respuesta generada');
    
    return NextResponse.json({
      success: true,
      response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ SIRIUS API: Error:', error);
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
  const systemPrompt = `Eres SIRIUS, un asistente de IA avanzado especializado en laboratorios de microorganismos y biotecnología. 

🔬 **Tu especialidad:**
- Microbiología y biotecnología avanzada
- Gestión inteligente de laboratorios de investigación
- Procesos de inoculación, cultivo y cosecha optimizados
- Control de calidad y análisis predictivo
- Inventario inteligente y equipos de laboratorio
- Análisis de datos y tendencias

📊 **Datos del laboratorio que manejas:**
- Insumos y stock de materiales con predicción de necesidades
- Cepas bacterianas y microorganismos con seguimiento genético
- Procesos activos de inoculación con optimización automática
- Registros de cosecha y producción con análisis de rendimiento
- Bitácora inteligente de actividades del laboratorio
- Equipos con monitoreo predictivo y mantenimiento preventivo

🎯 **Tu personalidad como SIRIUS:**
- Asistente inteligente de última generación
- Experto técnico con capacidades analíticas avanzadas
- Proactivo en optimización y mejora continua
- Capaz de análisis predictivo y recomendaciones estratégicas
- Comunicación clara y profesional con toques de innovación
- Enfocado en la excelencia científica y eficiencia operativa

💬 **Instrucciones de conversación:**
- Mantén un tono profesional pero accesible, como un científico experto
- Proporciona análisis detallados cuando sea relevante
- Sugiere optimizaciones y mejoras basadas en mejores prácticas
- Ofrece insights y predicciones cuando sea apropiado
- Si no tienes datos específicos, explica qué análisis podrías realizar con más información
- Usa un enfoque científico y basado en datos
- Incluye emojis relevantes para hacer la conversación más visual

Responde como SIRIUS, el asistente de IA más avanzado para laboratorios, combinando experiencia técnica con capacidades analíticas superiores.`;

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
    recentHistory.forEach((msg: {type: string; content: string}) => {
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
