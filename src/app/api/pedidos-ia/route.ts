import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Interface para el pedido estructurado por IA
// ============================================================================
interface ProductoIA {
  nombreProducto: string;
  cantidad: number;
  unidad: string;
  precioUnitario?: number;
  notas?: string;
}

interface PedidoEstructurado {
  productos: ProductoIA[];
  observaciones: string;
  fechaEntregaSugerida?: string;
  prioridad: 'normal' | 'urgente' | 'baja';
  confianza: number; // 0-100%
}

// ============================================================================
// POST - Procesar texto con IA para estructurar pedido
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { texto, productosDisponibles, clienteNombre } = body;

    console.log('🤖 [PEDIDOS-IA] Procesando texto con IA:', texto?.substring(0, 100));

    if (!texto || typeof texto !== 'string' || texto.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Se requiere texto para procesar' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'API key de OpenAI no configurada' },
        { status: 500 }
      );
    }

    // Crear lista de productos disponibles para el contexto
    const listaProductos = productosDisponibles?.length > 0
      ? productosDisponibles.map((p: { id: string; nombre: string; precioBase?: number }) => 
          `- ${p.nombre} (ID: ${p.id}${p.precioBase ? `, Precio: $${p.precioBase}` : ''})`
        ).join('\n')
      : 'No hay lista de productos disponible';

    console.log('📋 Productos disponibles para IA:', listaProductos.substring(0, 500));

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Eres un asistente especializado en procesar pedidos para un laboratorio de microorganismos y bioinsumos agrícolas.

Tu tarea es analizar el texto del usuario y extraer información estructurada para un pedido.

PRODUCTOS DISPONIBLES EN EL LABORATORIO:
${listaProductos}

REGLAS DE PROCESAMIENTO:
1. Identifica los productos mencionados y haz match con los productos disponibles
2. Extrae cantidades y unidades (por defecto: litros)
3. Detecta si es urgente o tiene prioridad especial
4. Extrae cualquier observación adicional (aplicación, cultivo destino, notas)
5. Si mencionan fecha de entrega, extráela
6. Si no encuentras un producto exacto, sugiere el más similar

REGLAS IMPORTANTES PARA LOTES Y UBICACIONES:
- Los clientes agrícolas mencionan lotes con formatos como: "B6 P1-2-3", "B21 P1 a la 17", "Lote 5", "Bloque 3 Pabellón 1-5"
- B = Bloque, P = Pabellón/Parcela, L = Lote
- SIEMPRE incluye TODOS los lotes/bloques/pabellones mencionados de forma EXACTA en las observaciones
- En el campo "observaciones" debes listar ESPECÍFICAMENTE cada lote/ubicación mencionada, NO uses frases genéricas como "diferentes ubicaciones"
- En el campo "notas" de cada producto, incluye EXACTAMENTE los lotes que corresponden a ese producto
- Ejemplo correcto: "Aplicar en B21 P1-17, B12 P7-8-9, B11 P14-15-16-17-20-21-22"
- Ejemplo incorrecto: "El cliente solicita productos para diferentes ubicaciones"

RESPONDE SIEMPRE en formato JSON válido con esta estructura:
{
  "productos": [
    {
      "nombreProducto": "nombre exacto del producto o el más similar",
      "productoIdSugerido": "ID del producto si lo encontraste, o null",
      "cantidad": número,
      "unidad": "litros" | "kg" | "unidades" | "galones",
      "notas": "lotes/ubicaciones específicas para este producto"
    }
  ],
  "observaciones": "lista ESPECÍFICA de todos los lotes y ubicaciones mencionados en el pedido, sin generalizar",
  "fechaEntregaSugerida": "YYYY-MM-DD si se menciona, o null",
  "prioridad": "normal" | "urgente" | "baja",
  "confianza": número del 0 al 100 indicando qué tan seguro estás de la interpretación,
  "resumenParaUsuario": "resumen en español incluyendo los lotes específicos mencionados"
}`
          },
          {
            role: 'user',
            content: `Cliente: ${clienteNombre || 'No especificado'}

Texto del pedido:
"${texto}"

Procesa este pedido y devuelve el JSON estructurado. Recuerda incluir TODOS los lotes y ubicaciones específicas mencionadas.`
          }
        ],
        max_tokens: 1500,
        temperature: 0.3, // Baja temperatura para respuestas más precisas
        response_format: { type: "json_object" }
      });

      const respuestaIA = completion.choices[0]?.message?.content;
      console.log('✅ Respuesta de IA recibida');

      if (!respuestaIA) {
        throw new Error('La IA no generó respuesta');
      }

      // Parsear la respuesta JSON
      let pedidoEstructurado;
      try {
        pedidoEstructurado = JSON.parse(respuestaIA);
      } catch (parseError) {
        console.error('❌ Error parseando respuesta de IA:', respuestaIA);
        throw new Error('La respuesta de la IA no es un JSON válido');
      }

      console.log('📦 Pedido estructurado:', JSON.stringify(pedidoEstructurado, null, 2));

      // Enriquecer productos con IDs si no los tiene
      if (pedidoEstructurado.productos && productosDisponibles?.length > 0) {
        pedidoEstructurado.productos = pedidoEstructurado.productos.map((prod: ProductoIA & { productoIdSugerido?: string }) => {
          if (!prod.productoIdSugerido) {
            // Buscar coincidencia por nombre
            const productoEncontrado = productosDisponibles.find((p: { nombre: string }) => 
              p.nombre.toLowerCase().includes(prod.nombreProducto.toLowerCase()) ||
              prod.nombreProducto.toLowerCase().includes(p.nombre.toLowerCase())
            );
            if (productoEncontrado) {
              return {
                ...prod,
                productoIdSugerido: productoEncontrado.id,
                precioUnitario: productoEncontrado.precioBase || 0
              };
            }
          }
          return prod;
        });
      }

      return NextResponse.json({
        success: true,
        pedido: pedidoEstructurado,
        tokens: {
          prompt: completion.usage?.prompt_tokens,
          completion: completion.usage?.completion_tokens,
          total: completion.usage?.total_tokens
        },
        mensaje: 'Pedido procesado exitosamente con IA'
      });

    } catch (openaiError: unknown) {
      console.error('❌ Error en OpenAI:', openaiError);
      const error = openaiError as { message?: string };
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Error procesando con IA: ${error.message || 'Error desconocido'}` 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Error general en pedidos-ia:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}
