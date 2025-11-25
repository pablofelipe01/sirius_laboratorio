import { NextRequest, NextResponse } from 'next/server';
import { AIRTABLE_CONFIG } from '@/lib/constants/airtable';
import { getAirtableHeaders } from '@/lib/constants/airtable';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 API DASHBOARD ANALYTICS: Iniciando obtención de datos analíticos...');

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly'; // 'weekly', 'monthly', 'annual'

    // Calcular fechas según el período
    const now = new Date();
    let startDate: Date;
    let groupByFormat: string;

    switch (period) {
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupByFormat = 'week';
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1); // Últimos 12 meses
        groupByFormat = 'month';
        break;
      case 'annual':
        startDate = new Date(now.getFullYear() - 4, 0, 1); // Últimos 5 años
        groupByFormat = 'year';
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        groupByFormat = 'month';
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    console.log('📅 Período:', period, 'Fecha inicio:', startDateStr);

    // Función helper para hacer requests con filtros
    async function fetchAirtableWithFilter(tableId: string, filter: string) {
      const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.BASE_ID}/${tableId}?filterByFormula=${encodeURIComponent(filter)}&maxRecords=9999`;
      return fetch(url, {
        method: 'GET',
        headers: getAirtableHeaders(),
      });
    }

    // 1. Obtener datos de Inoculación
    console.log('🧫 Obteniendo datos de inoculación...');
    const inoculacionResponse = await fetchAirtableWithFilter(
      AIRTABLE_CONFIG.TABLES.INOCULACION,
      `IS_AFTER({Fecha Inoculacion}, '${startDateStr}')`
    );
    const inoculacionData = inoculacionResponse.ok ? await inoculacionResponse.json() : { records: [] };
    const inoculacionRecords = inoculacionData.records || [];

    // 2. Obtener datos de Descartes
    console.log('🗑️ Obteniendo datos de descartes...');
    const descartesResponse = await fetchAirtableWithFilter(
      AIRTABLE_CONFIG.TABLES.DESCARTES,
      `IS_AFTER({Fecha Evento}, '${startDateStr}')`
    );
    const descartesData = descartesResponse.ok ? await descartesResponse.json() : { records: [] };
    const descartesRecords = descartesData.records || [];

    // 3. Obtener datos de Cosecha Laboratorio
    console.log('🌾 Obteniendo datos de cosecha...');
    const cosechaResponse = await fetchAirtableWithFilter(
      AIRTABLE_CONFIG.TABLES.COSECHA_LABORATORIO,
      `IS_AFTER({Fecha de creacion}, '${startDateStr}')`
    );
    const cosechaData = cosechaResponse.ok ? await cosechaResponse.json() : { records: [] };
    const cosechaRecords = cosechaData.records || [];

    console.log('📊 Registros obtenidos:', {
      inoculacion: inoculacionRecords.length,
      descartes: descartesRecords.length,
      cosecha: cosechaRecords.length
    });

    // Procesar y agrupar datos
    const analyticsData: { [key: string]: { [microorg: string]: { inoculated: number; discarded: number; harvested: number } } } = {};

    // Función helper para obtener la clave de agrupación
    const getGroupKey = (dateStr: string) => {
      const date = new Date(dateStr);
      switch (groupByFormat) {
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          return weekStart.toISOString().split('T')[0];
        case 'month':
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        case 'year':
          return String(date.getFullYear());
        default:
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
    };

    // Procesar Inoculación
    inoculacionRecords.forEach((record: any) => {
      const microorg = record.fields['Microorganismo (from Microorganismos)']?.[0] || 'Sin Microorganismo';
      const date = record.fields['Fecha Inoculacion'];
      const quantity = record.fields['Cantidad Bolsas Inoculadas'] || 0;

      if (date) {
        const groupKey = getGroupKey(date);
        if (!analyticsData[groupKey]) analyticsData[groupKey] = {};
        if (!analyticsData[groupKey][microorg]) analyticsData[groupKey][microorg] = { inoculated: 0, discarded: 0, harvested: 0 };
        analyticsData[groupKey][microorg].inoculated += quantity;
      }
    });

    // Procesar Descartes
    descartesRecords.forEach((record: any) => {
      const date = record.fields['Fecha Evento'];
      const quantity = record.fields['Cantidad Bolsas Descartadas'] || 0;

      // Intentar obtener el microorganismo desde las salidas de inoculación vinculadas
      // Si no hay vínculo directo, buscar en los registros de inoculación relacionados
      let microorg = 'Sin Microorganismo';

      // Los descartes están vinculados a salidas de inoculación
      if (record.fields['Salida Inoculacion'] && record.fields['Salida Inoculacion'].length > 0) {
        // Buscar el registro de inoculación correspondiente
        const salidaId = record.fields['Salida Inoculacion'][0];
        const relatedInoculacion = inoculacionRecords.find((inoc: any) =>
          inoc.fields['Salida Inoculacion']?.includes(salidaId)
        );
        if (relatedInoculacion) {
          microorg = relatedInoculacion.fields['Microorganismo (from Microorganismos)']?.[0] || 'Sin Microorganismo';
        }
      }

      if (date) {
        const groupKey = getGroupKey(date);
        if (!analyticsData[groupKey]) analyticsData[groupKey] = {};
        if (!analyticsData[groupKey][microorg]) analyticsData[groupKey][microorg] = { inoculated: 0, discarded: 0, harvested: 0 };
        analyticsData[groupKey][microorg].discarded += quantity;
      }
    });

    // Procesar Cosecha
    cosechaRecords.forEach((record: any) => {
      const microorg = record.fields['Microorganismo (from Microorganismos)']?.[0] || 'Sin Microorganismo';
      // Usar la fecha de creación de la cosecha, no la fecha de inoculación
      const date = record.fields['Fecha de creacion'];
      const quantity = record.fields['Total Bolsas'] || 0;

      if (date) {
        const groupKey = getGroupKey(date);
        if (!analyticsData[groupKey]) analyticsData[groupKey] = {};
        if (!analyticsData[groupKey][microorg]) analyticsData[groupKey][microorg] = { inoculated: 0, discarded: 0, harvested: 0 };
        analyticsData[groupKey][microorg].harvested += quantity;
      }
    });

    // Convertir a formato para el frontend
    const chartData = Object.keys(analyticsData)
      .sort()
      .map(periodKey => {
        const periodData = analyticsData[periodKey];
        const totalInoculated = Object.values(periodData).reduce((sum, data) => sum + data.inoculated, 0);
        const totalDiscarded = Object.values(periodData).reduce((sum, data) => sum + data.discarded, 0);
        const totalHarvested = Object.values(periodData).reduce((sum, data) => sum + data.harvested, 0);

        return {
          period: periodKey,
          inoculated: totalInoculated,
          discarded: totalDiscarded,
          harvested: totalHarvested,
          byMicroorganism: periodData
        };
      });

    console.log('✅ Datos analíticos procesados:', chartData.length, 'períodos');

    return NextResponse.json({
      success: true,
      data: chartData,
      period,
      groupByFormat
    });

  } catch (error) {
    console.error('❌ Error en API dashboard analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener datos analíticos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}