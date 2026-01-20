import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const airtableApiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    if (!airtableApiKey || !baseId) {
      throw new Error('Configuración de Airtable faltante');
    }

    // Obtener parámetros de fecha (mes/año actual si no se especifica)
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const month = searchParams.get('month') || (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    console.log('📅 [DIAS-PLANIFICADOS] Consultando planificación para:', { year, month });

    // Crear rango de fechas para el mes
    const startDate = `${year}-${month}-01`;
    const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
    const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
    const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;

    // Consultar planificación diaria del mes
    const filterFormula = encodeURIComponent(
      `AND(IS_AFTER({Fecha Planificada}, "${startDate}"), IS_BEFORE({Fecha Planificada}, "${endDate}"))`
    );
    
    const planificacionUrl = `https://api.airtable.com/v0/${baseId}/Planificacion%20Diaria%20Aplicacion?filterByFormula=${filterFormula}&sort[0][field]=Fecha%20Planificada&sort[0][direction]=asc`;
    
    console.log('🔗 [DIAS-PLANIFICADOS] URL:', planificacionUrl);

    const response = await fetch(planificacionUrl, {
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // Si no existe la tabla, devolver días vacíos pero sin error
      console.log('⚠️ [DIAS-PLANIFICADOS] Tabla no encontrada o sin permisos, devolviendo días vacíos');
      return NextResponse.json({
        diasPlanificados: [],
        total: 0
      });
    }

    const data = await response.json();
    const records = data.records || [];

    // Procesar días planificados
    const diasPlanificados = records.map((record: Record<string, unknown>) => {
      const fields = record.fields as Record<string, unknown>;
      const fecha = fields['Fecha Planificada'] as string;
      const estado = fields['Estado'] as string || 'PLANIFICADA';
      const hectareasPlaneadas = fields['Hectareas Planificadas'] as number || 0;
      const paqueteId = fields['Paquete Aplicacion ID'] as string || '';
      
      return {
        fecha,
        estado,
        hectareasPlaneadas,
        paqueteId,
        esPlanificado: true
      };
    });

    // Agrupar por fecha única
    interface DiaAgrupado {
      fecha: string;
      totalHectareas: number;
      paquetes: string[];
      estado: string;
    }
    
    interface DiaPlanificado {
      fecha: string;
      estado: string;
      hectareasPlaneadas: number;
      paqueteId: string;
      esPlanificado: boolean;
    }
    
    const diasAgrupados = diasPlanificados.reduce((acc: Record<string, DiaAgrupado>, dia: DiaPlanificado) => {
      const fecha = dia.fecha;
      if (!acc[fecha]) {
        acc[fecha] = {
          fecha,
          totalHectareas: 0,
          paquetes: [],
          estado: 'PLANIFICADA'
        };
      }
      acc[fecha].totalHectareas += dia.hectareasPlaneadas;
      acc[fecha].paquetes.push(dia.paqueteId);
      
      // Si hay alguna completada, marcar como completada
      if (dia.estado === 'COMPLETADA') {
        acc[fecha].estado = 'COMPLETADA';
      }
      
      return acc;
    }, {});

    const diasUnicos = Object.values(diasAgrupados);

    console.log('✅ [DIAS-PLANIFICADOS] Días planificados encontrados:', {
      total: diasUnicos.length,
      ejemplos: diasUnicos.slice(0, 3)
    });

    return NextResponse.json({
      diasPlanificados: diasUnicos,
      total: diasUnicos.length,
      periodo: { year: parseInt(year), month: parseInt(month) }
    });

  } catch (error) {
    console.error('❌ [DIAS-PLANIFICADOS] Error:', error);
    return NextResponse.json({
      error: 'Error al consultar días planificados',
      details: error instanceof Error ? error.message : 'Error desconocido',
      diasPlanificados: []
    }, { status: 500 });
  }
}