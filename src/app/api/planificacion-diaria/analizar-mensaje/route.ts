import { NextRequest, NextResponse } from 'next/server';

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

    // Análisis del mensaje con IA (simulado por ahora, luego integraremos OpenAI)
    const mensajeAnalizado = analizarMensajeConIA(mensaje);
    
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

function analizarMensajeConIA(mensaje: string): MensajeAnalizado {
  console.log('🤖 [ANALISIS] Analizando mensaje completo:', mensaje);
  
  // Extraer fecha - mejorado para detectar varios formatos
  let fecha = new Date().toISOString().split('T')[0];
  
  // Formato DD/MM/YYYY o DD/MM/YY
  const fechaMatch1 = mensaje.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  // Formato DD-MM-YY o DD-MM-YYYY
  const fechaMatch2 = mensaje.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/);
  
  const fechaMatch = fechaMatch1 || fechaMatch2;
  
  if (fechaMatch) {
    const [, dia, mes, ano] = fechaMatch;
    let anoCompleto = ano.length === 2 ? `20${ano}` : ano;
    
    // Si el año resulta en una fecha pasada, usar 2026
    const fechaTemporal = new Date(`${anoCompleto}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`);
    const ahora = new Date();
    if (fechaTemporal < ahora && parseInt(anoCompleto) < 2026) {
      anoCompleto = '2026';
      console.log('⚠️ [ANALISIS] Fecha en el pasado, ajustando a 2026');
    }
    
    fecha = `${anoCompleto}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    console.log('📅 [ANALISIS] Fecha detectada:', fecha, 'desde', fechaMatch[0]);
  }
  
  // Extraer bloque
  const bloqueMatch = mensaje.match(/Bloque[s]?\s*(?:en proceso)?[:.]?\s*([B\d\s–\-,]+)/i);
  const bloque = bloqueMatch ? bloqueMatch[1].trim() : '';
  console.log('📦 [ANALISIS] Bloque detectado:', bloque);
  
  // Extraer horarios - mejorado para varios formatos
  let horaInicio = '';
  let horaSalida = '';
  
  const horaLlegadaMatch = mensaje.match(/llegada.*?(\d{1,2}):(\d{2})\s*(?:a\.?\s*m\.?|am)/i);
  const horaInicioMatch = mensaje.match(/(?:inicio|empieza).*?(\d{1,2}):(\d{2})/i);
  const horaSalidaMatch = mensaje.match(/salida.*?(\d{1,2}):(\d{2})\s*(?:p\.?\s*m\.?|pm)/i);
  
  if (horaInicioMatch) {
    horaInicio = `${horaInicioMatch[1].padStart(2, '0')}:${horaInicioMatch[2]}`;
  } else if (horaLlegadaMatch) {
    horaInicio = `${horaLlegadaMatch[1].padStart(2, '0')}:${horaLlegadaMatch[2]}`;
  }
  
  if (horaSalidaMatch) {
    horaSalida = `${horaSalidaMatch[1].padStart(2, '0')}:${horaSalidaMatch[2]}`;
  }
  
  console.log('⏰ [ANALISIS] Horarios:', { inicio: horaInicio, salida: horaSalida });
  
  // Extraer productos - mejorado para detectar cc, ml, cm
  const productos: ProductoAplicado[] = [];
  
  // Buscar Bacillus o Baci
  const bacillusMatch = mensaje.match(/Bacillus\.?:?\s*(\d+)\s*(cc|cm|ml|lts?)/i);
  if (bacillusMatch) {
    const cantidad = parseInt(bacillusMatch[1]);
    let unidad = bacillusMatch[2].toLowerCase();
    if (unidad === 'cc' || unidad === 'cm') unidad = 'ml';
    productos.push({ nombre: 'Bacillus', cantidad, unidad });
    console.log('🧪 [ANALISIS] Bacillus detectado:', cantidad, unidad);
  }
  
  // Buscar Beauveria
  const beauveriaMatch = mensaje.match(/Beauveria\.?:?\s*(\d+)\s*(cc|cm|ml|lts?)/i);
  if (beauveriaMatch) {
    const cantidad = parseInt(beauveriaMatch[1]);
    let unidad = beauveriaMatch[2].toLowerCase();
    if (unidad === 'cc' || unidad === 'cm') unidad = 'ml';
    productos.push({ nombre: 'Beauveria bassiana', cantidad, unidad });
    console.log('🧪 [ANALISIS] Beauveria detectado:', cantidad, unidad);
  }
  
  // Extraer información de tractores - mejorado para múltiples formatos
  const tractores: TractorInfo[] = [];
  
  // Buscar secciones de tractores
  const tractorSections = mensaje.split(/Tractor\s+(\d+)|Equipo\s+(\d+)/i);
  
  console.log('🚜 [ANALISIS] Secciones encontradas:', tractorSections.length);
  
  for (let i = 1; i < tractorSections.length; i += 3) {
    const numeroStr = tractorSections[i] || tractorSections[i + 1];
    if (!numeroStr) continue;
    
    const numero = parseInt(numeroStr);
    if (isNaN(numero)) continue;
    
    const content = tractorSections[i + 2] || '';
    if (!content.trim()) continue;
    
    console.log(`🔍 [ANALISIS] Procesando tractor ${numero}, contenido:`, content.substring(0, 100));
    
    // Extraer operador - mejorado para capturar el nombre después de "Operador:"
    let operador = '';
    const operadorMatch = content.match(/Operador[a]?[:.\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)/i);
    if (operadorMatch) {
      operador = operadorMatch[1].trim();
    }
    
    // Extraer lotes y hectáreas - múltiples formatos
    const lotes: Array<{codigo: string, hectareas: number}> = [];
    
    // Formato principal: "B11 – P16\n18 hectáreas" o "B12 – P7\n14 hectáreas"
    // Buscar patrón: B## [– nombre –] P## [–##] ... ## hectáreas
    const lotePattern = /B\s*(\d+)\s*(?:–\s*[^–\n]*?)?\s*–?\s*P\s*(\d+)(?:–\d+)?\s*[\r\n]+.*?(\d+(?:\.\d+)?)\s*hectárea/gi;
    const loteMatches = content.matchAll(lotePattern);
    
    for (const match of loteMatches) {
      const bloque = match[1];
      const parcela = match[2];
      const hectareas = parseFloat(match[3]);
      lotes.push({
        codigo: `B${bloque}-P${parcela}`,
        hectareas
      });
      console.log(`  📍 Lote detectado: B${bloque}-P${parcela} = ${hectareas} ha`);
    }
    
    // Formato alternativo simple: "300 litros = 6 hectáreas" (primera línea)
    if (lotes.length === 0) {
      const hectareasSimple = content.match(/(\d+)\s*litros\s*=\s*(\d+(?:\.\d+)?)\s*hectárea/i);
      if (hectareasSimple) {
        lotes.push({
          codigo: 'Sin especificar',
          hectareas: parseFloat(hectareasSimple[2])
        });
      }
    }
    
    const totalHectareas = lotes.reduce((sum, lote) => sum + lote.hectareas, 0);
    
    if (lotes.length > 0 || operador) {
      console.log(`✅ [ANALISIS] Tractor ${numero}:`, { operador, lotes: lotes.length, totalHectareas });
      
      tractores.push({
        numero,
        operador,
        lotes,
        totalHectareas
      });
    }
  }
  
  // Extraer hectáreas total - buscar en varias ubicaciones
  let hectareasTotal = 0;
  
  // Prioridad 1: "Total avance día: 88 hectáreas"
  const totalAvanceMatch = mensaje.match(/Total.*?(?:avance|día)[:.\s]+(\d+(?:\.\d+)?)\s*(?:ha|hectárea)/i);
  if (totalAvanceMatch) {
    hectareasTotal = parseFloat(totalAvanceMatch[1]);
    console.log('📊 [ANALISIS] Total extraído de "Total avance día":', hectareasTotal);
  }
  
  // Prioridad 2: "Hectáreas aplicadas: 82 ha" (en resumen)
  if (hectareasTotal === 0) {
    const resumenMatch = mensaje.match(/Resumen.*?Hectáreas aplicadas[:.\s]+(\d+(?:\.\d+)?)\s*ha/i);
    if (resumenMatch) {
      hectareasTotal = parseFloat(resumenMatch[1]);
      console.log('📊 [ANALISIS] Total extraído de resumen:', hectareasTotal);
    }
  }
  
  // Prioridad 3: Sumar todos los tractores
  if (hectareasTotal === 0) {
    hectareasTotal = tractores.reduce((sum, tractor) => sum + tractor.totalHectareas, 0);
    console.log('📊 [ANALISIS] Total calculado de tractores:', hectareasTotal);
  }
  
  console.log('📊 [ANALISIS] Total hectáreas FINAL:', hectareasTotal);
  console.log('📊 [ANALISIS] Tractores procesados:', tractores.length);
  console.log('📊 [ANALISIS] Productos detectados:', productos.length);
  
  // Extraer observaciones
  const observaciones: string[] = [];
  if (mensaje.match(/lluvia/i)) {
    observaciones.push('Condiciones climáticas: lluvia');
  }
  if (mensaje.match(/siembra/i)) {
    observaciones.push('Actividad paralela: siembra');
  }
  if (mensaje.match(/retraso|demora/i)) {
    observaciones.push('Retraso reportado');
  }
  
  console.log('📝 [ANALISIS] Observaciones:', observaciones);
  
  return {
    fecha,
    bloque,
    horaInicio,
    horaSalida,
    productos,
    tractores,
    hectareasTotal,
    observaciones
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