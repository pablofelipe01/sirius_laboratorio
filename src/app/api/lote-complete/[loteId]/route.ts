import { NextRequest, NextResponse } from 'next/server';
import { AIRTABLE_CONFIG, buildAirtableUrl, getAirtableHeaders } from '@/lib/constants/airtable';

const { TABLES } = AIRTABLE_CONFIG;

// Helper function para hacer requests con filtros
async function fetchAirtableWithFilter(tableId: string, filter: string) {
  const url = `${buildAirtableUrl(tableId)}?filterByFormula=${encodeURIComponent(filter)}`;
  return fetch(url, {
    method: 'GET',
    headers: getAirtableHeaders(),
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ loteId: string }> }) {
  try {
    const { loteId } = await params;
    
    console.log('🔍 Fetching complete info for lote:', loteId);

    // Obtener información básica del lote
    const inoculacionResponse = await fetch(
      buildAirtableUrl(TABLES.INOCULACION, loteId),
      {
        method: 'GET',
        headers: getAirtableHeaders(),
      }
    );

    if (!inoculacionResponse.ok) {
      throw new Error('Lote not found');
    }

    const inoculacion = await inoculacionResponse.json();

    // Obtener salidas de inoculación relacionadas con este lote
    const salidasInoculacionResponse = await fetchAirtableWithFilter(
      TABLES.SALIDA_INOCULACION,
      `SEARCH("${loteId}",{Lote Alterado})`
    );

    // Obtener cepas utilizadas para este lote
    const cepasUtilizadasResponse = await fetchAirtableWithFilter(
      TABLES.SALIDA_CEPAS,
      `SEARCH("${loteId}",{Inoculacion})`
    );

    // Obtener insumos consumidos para este lote
    const insumosConsumidosResponse = await fetchAirtableWithFilter(
      TABLES.SALIDA_INSUMOS,
      `SEARCH("${loteId}",{Inoculacion})`
    );

    // Obtener descartes relacionados con este lote
    const descartesResponse = await fetchAirtableWithFilter(
      TABLES.DESCARTES,
      `SEARCH("${loteId}",{Salida Inoculacion})`
    );

    // Obtener cosechas relacionadas con este lote
    const cosechasResponse = await fetchAirtableWithFilter(
      TABLES.COSECHA_LABORATORIO,
      `SEARCH("${loteId}",{Salida Inoculacion})`
    );

    // Obtener cepas producidas relacionadas con este lote
    const cepasProducidasResponse = await fetchAirtableWithFilter(
      TABLES.CEPAS,
      `SEARCH("${loteId}",{Salida Inoculacion})`
    );

    // Procesar respuestas
    const salidas = salidasInoculacionResponse.ok ? (await salidasInoculacionResponse.json()).records || [] : [];
    const cepas = cepasUtilizadasResponse.ok ? (await cepasUtilizadasResponse.json()).records || [] : [];
    const insumos = insumosConsumidosResponse.ok ? (await insumosConsumidosResponse.json()).records || [] : [];
    const descartes = descartesResponse.ok ? (await descartesResponse.json()).records || [] : [];
    const cosechas = cosechasResponse.ok ? (await cosechasResponse.json()).records || [] : [];
    const cepasProducidas = cepasProducidasResponse.ok ? (await cepasProducidasResponse.json()).records || [] : [];

    // Obtener información del microorganismo si está disponible
    let microorganismo = null;
    if (inoculacion.fields.Microorganismos && inoculacion.fields.Microorganismos.length > 0) {
      const microorganismoId = inoculacion.fields.Microorganismos[0];
      const microorganismoResponse = await fetch(
        buildAirtableUrl(TABLES.MICROORGANISMOS, microorganismoId),
        {
          method: 'GET',
          headers: getAirtableHeaders(),
        }
      );
      
      if (microorganismoResponse.ok) {
        microorganismo = await microorganismoResponse.json();
      }
    }

    // Obtener información de responsables si está disponible
    const responsables = [];
    if (inoculacion.fields.Responsables && inoculacion.fields.Responsables.length > 0) {
      for (const responsableId of inoculacion.fields.Responsables) {
        try {
          const responsableResponse = await fetch(
            buildAirtableUrl(TABLES.EQUIPO_LABORATORIO, responsableId),
            {
              method: 'GET',
              headers: getAirtableHeaders(),
            }
          );
          
          if (responsableResponse.ok) {
            const responsable = await responsableResponse.json();
            responsables.push(responsable);
          }
        } catch (error) {
          console.warn('Error fetching responsable:', responsableId, error);
        }
      }
    }

    const completeInfo = {
      inoculacion,
      salidas,
      cepasUtilizadas: cepas,
      insumosConsumidos: insumos,
      microorganismo,
      responsables,
      descartes,
      cosechas,
      cepasProducidas
    };

    console.log('✅ Complete lote info fetched successfully');
    
    return NextResponse.json(completeInfo);
    
  } catch (error) {
    console.error('Error fetching complete lote info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch complete lote information' },
      { status: 500 }
    );
  }
}