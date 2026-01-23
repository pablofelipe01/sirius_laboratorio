import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface TractorInfo {
  numero: number;
  operador: string;
  lotes: Array<{
    codigo: string;
    hectareas: number;
  }>;
  totalHectareas: number;
}

interface ProductoAplicado {
  nombre: string;
  cantidad: number;
  unidad: string;
}

interface MensajeAnalizado {
  fecha: string;
  bloque: string;
  horaInicio: string;
  horaSalida: string;
  productos: ProductoAplicado[];
  tractores: TractorInfo[];
  hectareasTotal: number;
  observaciones: string[];
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [ANALIZAR-MENSAJE] Inicio de análisis de mensaje de campo');
    
    const { mensaje, paqueteId, clienteId } = await request.json();
    
    console.log('📝 [ANALIZAR-MENSAJE] Datos recibidos:', {
      clienteId,
      paqueteId,
      mensajeLongitud: mensaje?.length || 0
    });

    if (!mensaje || !paqueteId || !clienteId) {
      return NextResponse.json({
        error: 'Datos incompletos: se requiere mensaje, paqueteId y clienteId'
      }, { status: 400 });
    }

    // Análisis del mensaje con IA real
    const mensajeAnalizado = await analizarMensajeConIA(mensaje);
    
    console.log('🤖 [ANALIZAR-MENSAJE] Resultado del análisis:', {
      fecha: mensajeAnalizado.fecha,
      hectareasTotal: mensajeAnalizado.hectareasTotal,
      cantidadTractores: mensajeAnalizado.tractores.length,
      cantidadProductos: mensajeAnalizado.productos.length
    });

    // Obtener planificación correspondiente para comparar
    const planificacionComparativa = await obtenerPlanificacionComparativa(
      paqueteId, 
      mensajeAnalizado.fecha
    );

    console.log('📊 [ANALIZAR-MENSAJE] Comparativa planificación:', {
      planificadoHa: planificacionComparativa.hectareasPlanificadas,
      ejecutadoHa: mensajeAnalizado.hectareasTotal,
      desviacion: mensajeAnalizado.hectareasTotal - planificacionComparativa.hectareasPlanificadas
    });

    // Calcular desviaciones y alertas
    const alertas = calcularAlertas(mensajeAnalizado, planificacionComparativa);

    const respuesta = {
      analisis: mensajeAnalizado,
      planificacion: planificacionComparativa,
      alertas,
      resumen: {
        hectareasEjecutadas: mensajeAnalizado.hectareasTotal,
        hectareasPlanificadas: planificacionComparativa.hectareasPlanificadas,
        desviacion: mensajeAnalizado.hectareasTotal - planificacionComparativa.hectareasPlanificadas,
        porcentajeCumplimiento: ((mensajeAnalizado.hectareasTotal / planificacionComparativa.hectareasPlanificadas) * 100).toFixed(1)
      }
    };

    console.log('✅ [ANALIZAR-MENSAJE] Análisis completado exitosamente');
    
    return NextResponse.json(respuesta);

  } catch (error) {
    console.error('❌ [ANALIZAR-MENSAJE] Error:', error);
    return NextResponse.json({
      error: 'Error al analizar mensaje de campo',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

async function analizarMensajeConIA(mensaje: string): Promise<MensajeAnalizado> {
  console.log('🤖 [ANALISIS] Iniciando análisis con IA real del mensaje:', mensaje.substring(0, 200) + '...');
  
  try {
    // Configurar OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const prompt = `Analiza el siguiente mensaje de aplicación agrícola y extrae la información estructurada en formato JSON.

EL MENSAJE ES:
"${mensaje}"

Debes extraer EXACTAMENTE la siguiente información en formato JSON:

{
  "fecha": "YYYY-MM-DD", // Fecha del reporte (si no está clara, usa fecha actual 2026-01-23)
  "bloque": "string", // Número de bloque (ej: "11", "B11")
  "horaInicio": "HH:MM", // Hora de inicio/llegada (formato 24h)
  "horaSalida": "HH:MM", // Hora de salida/fin (formato 24h)
  "productos": [
    {
      "nombre": "string", // Nombre del producto (ej: "Bacillus", "Beauveria bassiana")
      "cantidad": number, // Cantidad numérica
      "unidad": "string" // Unidad (ml, cc, cm, lts, etc.)
    }
  ],
  "tractores": [
    {
      "numero": number, // Número del tractor
      "operador": "string", // Nombre del operador
      "lotes": [
        {
          "codigo": "string", // Código del lote (ej: "B11-P14-15", "B11-P16")
          "hectareas": number // Hectáreas trabajadas en este lote
        }
      ],
      "totalHectareas": number // Total de hectáreas del tractor
    }
  ],
  "hectareasTotal": number, // Total general de hectáreas aplicadas
  "observaciones": ["string"] // Array de observaciones relevantes
}

INSTRUCCIONES IMPORTANTES:
1. Para fechas, busca formatos como "22-01-26", "Miércoles 22-01-26", etc. Si no encuentras, usa 2026-01-23
2. Para lotes, normaliza el formato a "B[bloque]-P[parcelas]" (ej: "B11-P14-15")
3. Para productos, busca Bacillus, Beauveria, Metarhizium, etc. con sus cantidades
4. Para tractores, identifica número, operador y sus lotes específicos
5. Las hectáreas totales deben coincidir con la suma de todos los tractores
6. Si hay inconsistencias, prioriza los datos más específicos y detallados
7. Convierte unidades: cc = cm = ml
8. Si encuentras rangos de parcelas como "P14-15", manténlos así
9. Busca el total final en secciones como "HECTÁREAS APLICADAS" o similar

Responde ÚNICAMENTE con el JSON válido, sin texto adicional.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un experto en análisis de reportes agrícolas. Extraes información estructurada de mensajes de campo con precisión absoluta. Respondes únicamente en formato JSON válido."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    const respuestaIA = completion.choices[0]?.message?.content;
    
    if (!respuestaIA) {
      throw new Error('No se recibió respuesta de OpenAI');
    }

    console.log('🤖 [ANALISIS] Respuesta cruda de OpenAI:', respuestaIA);

    // Limpiar y parsear JSON
    let jsonLimpio = respuestaIA.trim();
    
    // Remover cualquier markdown o texto extra
    if (jsonLimpio.includes('```json')) {
      jsonLimpio = jsonLimpio.split('```json')[1].split('```')[0].trim();
    } else if (jsonLimpio.includes('```')) {
      jsonLimpio = jsonLimpio.split('```')[1].trim();
    }
    
    const resultado = JSON.parse(jsonLimpio) as MensajeAnalizado;
    
    console.log('✅ [ANALISIS] Análisis completado con IA:', {
      fecha: resultado.fecha,
      hectareasTotal: resultado.hectareasTotal,
      tractores: resultado.tractores.length,
      productos: resultado.productos.length
    });
    
    return resultado;
    
  } catch (error) {
    console.error('❌ [ANALISIS] Error con IA, usando fallback:', error);
    
    // Fallback a análisis manual si falla la IA
    return analizarMensajeManual(mensaje);
  }
}

// Función de respaldo con análisis manual (versión simplificada de la original)
function analizarMensajeManual(mensaje: string): MensajeAnalizado {
  console.log('⚠️ [ANALISIS] Usando análisis manual de respaldo');
  
  // Extraer fecha básica
  let fecha = new Date().toISOString().split('T')[0];
  const fechaMatch = mensaje.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/);
  if (fechaMatch) {
    const [, dia, mes, ano] = fechaMatch;
    const anoCompleto = ano.length === 2 ? `20${ano}` : ano;
    fecha = `${anoCompleto}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }
  
  // Extraer hectáreas total simple
  let hectareasTotal = 0;
  const totalMatch = mensaje.match(/(?:HECTÁREAS APLICADAS|Total)\s*[:\n]*\s*(\d+)/i);
  if (totalMatch) {
    hectareasTotal = parseInt(totalMatch[1]);
  }
  
  // Extraer bloque
  const bloqueMatch = mensaje.match(/Bloque\s+(\d+)/i);
  const bloque = bloqueMatch ? bloqueMatch[1] : '';
  
  return {
    fecha,
    bloque,
    horaInicio: '',
    horaSalida: '',
    productos: [],
    tractores: [],
    hectareasTotal,
    observaciones: ['Análisis manual de respaldo - datos limitados']
  };
}

async function obtenerPlanificacionComparativa(paqueteId: string, fecha: string) {
  // Mock de planificación - luego consultaremos Airtable
  return {
    hectareasPlanificadas: 43.58,
    lotesEsperados: ['P591', 'P592', 'P593', 'P604', 'P605', 'P606'],
    productosEsperados: [
      { nombre: 'Purpureocillium lilacinum', dosificacion: 0.5, unidad: 'L/Ha' },
      { nombre: 'Beauveria bassiana', dosificacion: 0.5, unidad: 'L/Ha' },
      { nombre: 'Metarhizium anisopliae', dosificacion: 0.5, unidad: 'L/Ha' }
    ],
    fechaPlanificada: fecha,
    estado: 'PROGRAMADA'
  };
}

function calcularAlertas(ejecutado: MensajeAnalizado, planificado: any) {
  const alertas: string[] = [];
  
  const desviacionHectareas = ejecutado.hectareasTotal - planificado.hectareasPlanificadas;
  const porcentajeDesviacion = Math.abs(desviacionHectareas / planificado.hectareasPlanificadas) * 100;
  
  if (porcentajeDesviacion > 10) {
    alertas.push(`Desviación significativa: ${desviacionHectareas > 0 ? '+' : ''}${desviacionHectareas.toFixed(1)} Ha (${porcentajeDesviacion.toFixed(1)}%)`);
  }
  
  // Verificar productos aplicados vs esperados
  for (const esperado of planificado.productosEsperados) {
    const aplicado = ejecutado.productos.find(p => 
      p.nombre.toLowerCase().includes(esperado.nombre.toLowerCase().split(' ')[0])
    );
    
    if (!aplicado) {
      alertas.push(`Producto faltante: ${esperado.nombre}`);
    }
  }
  
  if (ejecutado.observaciones.includes('Retraso por lluvia')) {
    alertas.push('Aplicación retrasada por condiciones climáticas');
  }
  
  return alertas;
}