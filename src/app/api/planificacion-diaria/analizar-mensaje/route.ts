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
  // Análisis básico por regex - luego reemplazaremos con OpenAI
  
  // Extraer fecha
  const fechaMatch = mensaje.match(/(\w+)\s+(\d{1,2}-\d{1,2}-\d{2})/);
  const fecha = fechaMatch ? `2026-01-${fechaMatch[2].split('-')[0].padStart(2, '0')}` : new Date().toISOString().split('T')[0];
  
  // Extraer bloque
  const bloqueMatch = mensaje.match(/Bloque\s+(\d+)/i);
  const bloque = bloqueMatch ? bloqueMatch[1] : '';
  
  // Extraer horarios
  const horaInicioMatch = mensaje.match(/se empieza alas (\d{1,2}:\d{2})/i) || mensaje.match(/(\d{1,2}:\d{2})\s*am.*llegada/i);
  const horaSalidaMatch = mensaje.match(/salida.*?(\d{1,2}:\d{2})\s*pm/i);
  
  const horaInicio = horaInicioMatch ? horaInicioMatch[1] : '';
  const horaSalida = horaSalidaMatch ? horaSalidaMatch[1] : '';
  
  // Extraer productos
  const productos: ProductoAplicado[] = [];
  const bacillusMatch = mensaje.match(/Bacillus\.?\s*(\d+)\.?(\w+)/i);
  const beauveriaMatch = mensaje.match(/Beauveria\.?\s*(\d+)\.?(\w+)/i);
  
  if (bacillusMatch) {
    productos.push({
      nombre: 'Bacillus',
      cantidad: parseInt(bacillusMatch[1]),
      unidad: bacillusMatch[2] === 'cm' ? 'ml' : bacillusMatch[2]
    });
  }
  
  if (beauveriaMatch) {
    productos.push({
      nombre: 'Beauveria bassiana',
      cantidad: parseInt(beauveriaMatch[1]),
      unidad: beauveriaMatch[2] === 'cm' ? 'ml' : beauveriaMatch[2]
    });
  }
  
  // Extraer información de tractores
  const tractores: TractorInfo[] = [];
  const tractorSections = mensaje.split(/Tractor\s+(\d+)/i).slice(1);
  
  for (let i = 0; i < tractorSections.length; i += 2) {
    const numero = parseInt(tractorSections[i]);
    const content = tractorSections[i + 1];
    
    // Extraer operador
    const operadorMatch = content.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    const operador = operadorMatch ? operadorMatch[1] : '';
    
    // Extraer lotes y hectáreas
    const lotes: Array<{codigo: string, hectareas: number}> = [];
    const loteMatches = content.matchAll(/[BP]\s*(\d+)\.?\s*(\d+)\s*hts?/gi);
    
    for (const match of loteMatches) {
      lotes.push({
        codigo: `P${match[1]}`,
        hectareas: parseInt(match[2])
      });
    }
    
    const totalHectareas = lotes.reduce((sum, lote) => sum + lote.hectareas, 0);
    
    tractores.push({
      numero,
      operador,
      lotes,
      totalHectareas
    });
  }
  
  // Extraer hectáreas total
  const hectareasTotalMatch = mensaje.match(/HECTÁREAS APLICADAS\s*(\d+)/i);
  const hectareasTotal = hectareasTotalMatch ? parseInt(hectareasTotalMatch[1]) : 
    tractores.reduce((sum, tractor) => sum + tractor.totalHectareas, 0);
  
  // Extraer observaciones
  const observaciones: string[] = [];
  if (mensaje.includes('lluvia')) {
    observaciones.push('Retraso por lluvia');
  }
  if (mensaje.includes('siembra')) {
    observaciones.push('Siembra de palma en paralelo');
  }
  
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