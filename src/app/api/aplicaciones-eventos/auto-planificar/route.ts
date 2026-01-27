import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Validar configuración requerida para DataLab
if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
  throw new Error('Variables de entorno AIRTABLE_API_KEY y AIRTABLE_BASE_ID son requeridas para DataLab');
}

// Configurar Airtable DataLab
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

// Tablas
const APLICACIONES_EVENTOS_TABLE = 'Aplicaciones Eventos';
const PLANIFICACION_DIARIA_TABLE = 'Planificacion Diaria Aplicacion';
const CULTIVOS_LOTES_TABLE = 'Cultivos Lotes Aplicaciones';

interface AplicacionData {
  fechaProgramada: string;
  estadoAplicacion: string;
  paquetesAplicaciones?: string[];
  cultivosLotesAplicaciones?: string[];
  capacidadDiariaHa: number;
  fechaInicioAplicacion: string;
  cantidadTotalBiologicosLitros?: number;
  idProductosAplicados?: string[];
  // Nuevos campos para integración con paquete-aplicaciones
  skipCreacionEvento?: boolean;
  eventoExistenteId?: string;
}

interface LoteInfo {
  id: string;
  hectareas: number;
  nombre: string;
  ordenSecuencia: number;
}

// Función para calcular días hábiles (excluyendo fines de semana)
function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    // Si no es sábado (6) ni domingo (0), contar el día
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      addedDays++;
    }
  }
  
  return result;
}

// Función para obtener información de lotes
async function getLotesInfo(cultivosLotesIds: string[]): Promise<LoteInfo[]> {
  const lotesInfo: LoteInfo[] = [];
  
  for (const loteId of cultivosLotesIds) {
    try {
      const lote = await base(CULTIVOS_LOTES_TABLE).find(loteId);
      lotesInfo.push({
        id: loteId,
        hectareas: lote.fields['Hectareas Lotes'] as number || 0,
        nombre: lote.fields['Nombre Cultivo Lote'] as string || `Lote ${loteId.slice(-4)}`,
        ordenSecuencia: lote.fields['Orden Secuencia'] as number || 999 // Por defecto al final si no tiene orden
      });
    } catch (error) {
      console.warn(`⚠️ Error obteniendo info del lote ${loteId}:`, error);
      lotesInfo.push({
        id: loteId,
        hectareas: 0,
        nombre: `Lote ${loteId.slice(-4)}`,
        ordenSecuencia: 999
      });
    }
  }
  
  // 🎯 ORDENAR POR SECUENCIA ANTES DE RETORNAR
  const lotesOrdenados = lotesInfo.sort((a, b) => a.ordenSecuencia - b.ordenSecuencia);
  
  console.log('📋 Lotes ordenados por secuencia:');
  lotesOrdenados.forEach((lote, index) => {
    console.log(`   ${index + 1}. [${lote.ordenSecuencia}] ${lote.nombre} - ${lote.hectareas} Ha`);
  });
  
  return lotesOrdenados;
}

// Función para distribuir hectáreas en lotes por día (respetando orden de secuencia)
function distribuirLotesPorDia(lotes: LoteInfo[], capacidadDiariaHa: number) {
  const totalHectareas = lotes.reduce((sum, lote) => sum + lote.hectareas, 0);
  
  // 1️⃣ PRIMERO: Calcular días necesarios (redondear hacia arriba)
  const diasNecesarios = Math.ceil(totalHectareas / capacidadDiariaHa);
  
  console.log(`📊 Cálculo de días:`);
  console.log(`   Total hectáreas: ${totalHectareas} Ha`);
  console.log(`   Capacidad diaria: ${capacidadDiariaHa} Ha/día`);
  console.log(`   Cálculo: ${totalHectareas} ÷ ${capacidadDiariaHa} = ${(totalHectareas/capacidadDiariaHa).toFixed(2)}`);
  console.log(`   Días necesarios: ${diasNecesarios} días (redondeado hacia arriba)`);
  
  // 2️⃣ SEGUNDO: Distribuir lotes en orden secuencial
  const planificacionDiaria = [];
  let diaActual = 1;
  let hectareasDelDiaActual = 0;
  let lotesDelDiaActual: string[] = [];
  
  console.log(`\n📋 Distribución de lotes en orden secuencial:`);
  
  for (let i = 0; i < lotes.length; i++) {
    const loteActual = lotes[i];
    
    // Agregar lote al día actual
    lotesDelDiaActual.push(loteActual.id);
    hectareasDelDiaActual += loteActual.hectareas;
    
    console.log(`   Día ${diaActual}: +Lote [${loteActual.ordenSecuencia}] ${loteActual.nombre} (${loteActual.hectareas} Ha) → Total día: ${hectareasDelDiaActual.toFixed(2)} Ha`);
    
    // Verificar si debemos cerrar el día actual
    const esUltimoLote = (i === lotes.length - 1);
    const alcanzaCapacidad = hectareasDelDiaActual >= capacidadDiariaHa;
    const siguienteLoteSobrepasa = !esUltimoLote && (hectareasDelDiaActual + lotes[i + 1].hectareas) > (capacidadDiariaHa * 1.2); // 20% tolerancia
    
    if (esUltimoLote || alcanzaCapacidad || siguienteLoteSobrepasa) {
      // Cerrar día actual
      planificacionDiaria.push({
        diaNumero: diaActual,
        hectareasObjetivo: Math.round(hectareasDelDiaActual * 100) / 100,
        lotesProgramados: [...lotesDelDiaActual]
      });
      
      console.log(`   ✅ Día ${diaActual} completo: ${hectareasDelDiaActual.toFixed(2)} Ha con ${lotesDelDiaActual.length} lotes`);
      
      // Si no es el último lote, preparar siguiente día
      if (!esUltimoLote) {
        diaActual++;
        hectareasDelDiaActual = 0;
        lotesDelDiaActual = [];
        console.log(``);
      }
    }
  }
  
  // Verificación final
  const totalPlanificado = planificacionDiaria.reduce((sum, dia) => sum + dia.hectareasObjetivo, 0);
  console.log(`\n✅ Distribución completada: ${totalPlanificado.toFixed(2)} Ha en ${planificacionDiaria.length} días (orden secuencial respetado)`);
  
  return planificacionDiaria;
}

// Función para crear registros de planificación diaria
async function crearPlanificacionDiaria(aplicacionId: string, fechaInicio: string, planificacion: any[]) {
  const registrosCreados = [];
  
  for (const dia of planificacion) {
    const fechaDelDia = addBusinessDays(new Date(fechaInicio), dia.diaNumero - 1);
    
    try {
      const registro = await base(PLANIFICACION_DIARIA_TABLE).create({
        'Fecha Planificada': fechaDelDia.toISOString().split('T')[0],
        'Dia Numero': dia.diaNumero,
        'Hectareas Objetivo': dia.hectareasObjetivo,
        'Lotes Programados': dia.lotesProgramados, // Lotes específicos de este día
        'Aplicacion Evento': [aplicacionId]
      });
      
      registrosCreados.push({
        id: registro.id,
        fecha: fechaDelDia.toISOString().split('T')[0],
        dia: dia.diaNumero,
        hectareas: dia.hectareasObjetivo,
        lotes: dia.lotesProgramados.length
      });
      
      console.log(`✅ Día ${dia.diaNumero} planificado: ${dia.hectareasObjetivo} Ha en ${dia.lotesProgramados.length} lotes`);
    } catch (error) {
      console.error(`❌ Error creando planificación día ${dia.diaNumero}:`, error);
    }
  }
  
  return registrosCreados;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔵 [AUTO-PLANIFICAR] Inicio de solicitud de auto-planificación');
    
    const body = await request.json();
    console.log('📥 Datos recibidos:', body);
    
    const {
      fechaProgramada,
      estadoAplicacion = 'PRESUPUESTADA',
      paquetesAplicaciones,
      cultivosLotesAplicaciones,
      capacidadDiariaHa = 60,
      fechaInicioAplicacion,
      cantidadTotalBiologicosLitros,
      idProductosAplicados,
      skipCreacionEvento = false,
      eventoExistenteId
    } = body as AplicacionData;
    
    // Validaciones
    if (!fechaProgramada) {
      return NextResponse.json({
        success: false,
        error: 'Fecha programada es requerida'
      }, { status: 400 });
    }
    
    if (!fechaInicioAplicacion) {
      return NextResponse.json({
        success: false,
        error: 'Fecha de inicio de aplicación es requerida'
      }, { status: 400 });
    }
    
    if (!cultivosLotesAplicaciones || cultivosLotesAplicaciones.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere al menos un lote para la aplicación'
      }, { status: 400 });
    }
    
    console.log('🌱 Creando aplicación con planificación automática...');
    
    // 1. Crear el evento de aplicación (solo si no se proporciona uno existente)
    let aplicacionCreada;
    if (skipCreacionEvento && eventoExistenteId) {
      console.log('🔄 Usando evento existente:', eventoExistenteId);
      aplicacionCreada = { id: eventoExistenteId };
    } else {
      console.log('🆕 Creando nuevo evento de aplicación...');
      const aplicacionData: any = {
        'Fecha Programada': fechaProgramada,
        'Estado Aplicacion': estadoAplicacion,
        'Cultivos Lotes Aplicaciones': cultivosLotesAplicaciones,
        'Capacidad Diaria Ha': capacidadDiariaHa,
        'Fecha Inicio Aplicacion': fechaInicioAplicacion
      };
      
      if (paquetesAplicaciones) {
        aplicacionData['Paquetes Aplicaciones'] = paquetesAplicaciones;
      }
      
      if (cantidadTotalBiologicosLitros) {
        aplicacionData['Cantidad Total Biologicos Litros'] = cantidadTotalBiologicosLitros;
      }
      
      if (idProductosAplicados) {
        aplicacionData['ID Productos Aplicados'] = idProductosAplicados;
      }
      
      aplicacionCreada = await base(APLICACIONES_EVENTOS_TABLE).create(aplicacionData);
      console.log('✅ Aplicación creada:', (aplicacionCreada as any).id);
    }
    
    // 2. Obtener información de lotes
    console.log('📋 Obteniendo información de lotes...');
    const lotesInfo = await getLotesInfo(cultivosLotesAplicaciones);
    const totalHectareas = lotesInfo.reduce((sum, lote) => sum + lote.hectareas, 0);
    
    console.log(`📊 Total de hectáreas: ${totalHectareas} Ha en ${lotesInfo.length} lotes`);
    console.log(`⚡ Capacidad diaria: ${capacidadDiariaHa} Ha/día`);
    
    // 3. Distribuir lotes por días
    console.log('📅 Distribuyendo lotes por días...');
    const planificacionDiaria = distribuirLotesPorDia(lotesInfo, capacidadDiariaHa);
    
    console.log(`🗓️ Planificación: ${planificacionDiaria.length} días de trabajo`);
    
    // 4. Crear registros de planificación diaria
    console.log('💾 Creando registros de planificación diaria...');
    const registrosPlanificacion = await crearPlanificacionDiaria(
      (aplicacionCreada as any).id,
      fechaInicioAplicacion,
      planificacionDiaria
    );
    
    console.log('🎉 Auto-planificación completada exitosamente');
    
    // Extraer IDs de los registros de planificación creados para soporte de rollback
    const diasIds = registrosPlanificacion.map((reg: any) => reg.id);
    
    return NextResponse.json({
      success: true,
      message: skipCreacionEvento ? 'Planificación automática generada para evento existente' : 'Aplicación creada con planificación automática',
      aplicacion: {
        id: (aplicacionCreada as any).id,
        fechaProgramada,
        fechaInicio: fechaInicioAplicacion,
        totalHectareas,
        capacidadDiaria: capacidadDiariaHa,
        diasPlanificados: planificacionDiaria.length,
        lotes: lotesInfo.length,
        eventoExistente: skipCreacionEvento
      },
      planificacion: {
        diasCreados: registrosPlanificacion.length,
        diasIds: diasIds, // IDs para soporte de rollback
        registros: registrosPlanificacion
      },
      detalles: {
        lotes: lotesInfo,
        distribucionDiaria: planificacionDiaria
      }
    });
    
  } catch (error) {
    console.error('❌ Error en auto-planificación:', error);
    return NextResponse.json({
      success: false,
      error: 'Error creando aplicación con planificación automática',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

// Endpoint para obtener una planificación sin crear (solo preview)
export async function GET(request: NextRequest) {
  try {
    console.log('🔵 [AUTO-PLANIFICAR] Preview de planificación');
    
    const { searchParams } = new URL(request.url);
    const cultivosLotesIds = searchParams.get('lotes')?.split(',') || [];
    const capacidadDiariaHa = parseInt(searchParams.get('capacidad') || '60');
    const fechaInicio = searchParams.get('fechaInicio');
    
    if (cultivosLotesIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Se requieren IDs de lotes para preview'
      }, { status: 400 });
    }
    
    if (!fechaInicio) {
      return NextResponse.json({
        success: false,
        error: 'Fecha de inicio es requerida para preview'
      }, { status: 400 });
    }
    
    // Obtener información de lotes
    const lotesInfo = await getLotesInfo(cultivosLotesIds);
    const totalHectareas = lotesInfo.reduce((sum, lote) => sum + lote.hectareas, 0);
    
    // Distribuir lotes por días
    const planificacionDiaria = distribuirLotesPorDia(lotesInfo, capacidadDiariaHa);
    
    // Generar fechas para preview
    const planificacionConFechas = planificacionDiaria.map(dia => {
      const fechaDelDia = addBusinessDays(new Date(fechaInicio), dia.diaNumero - 1);
      return {
        ...dia,
        fecha: fechaDelDia.toISOString().split('T')[0],
        lotesDetalles: dia.lotesProgramados.map(loteId => {
          const lote = lotesInfo.find(l => l.id === loteId);
          return {
            id: loteId,
            nombre: lote?.nombre || 'Lote desconocido',
            hectareas: lote?.hectareas || 0
          };
        })
      };
    });
    
    return NextResponse.json({
      success: true,
      preview: {
        totalHectareas,
        capacidadDiaria: capacidadDiariaHa,
        diasPlanificados: planificacionDiaria.length,
        fechaInicio,
        fechaFinEstimada: planificacionConFechas[planificacionConFechas.length - 1]?.fecha,
        lotes: lotesInfo,
        planificacionDiaria: planificacionConFechas
      }
    });
    
  } catch (error) {
    console.error('❌ Error en preview de planificación:', error);
    return NextResponse.json({
      success: false,
      error: 'Error generando preview de planificación',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}