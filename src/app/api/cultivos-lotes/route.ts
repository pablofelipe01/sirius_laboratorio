import { NextRequest, NextResponse } from 'next/server';

// Configuración base de Airtable
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY_SIRIUS_CLIENTES_CORE;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SIRIUS_CLIENTES_CORE;

interface CultivoRecord {
  id: string;
  fields: {
    ID?: string;
    'Codigo Serial'?: number;
    nombre_cultivo?: string;
    cliente_id?: string[];
    tipo_cultivo?: string;
    estado?: string;
    ubicacion_general?: string;
    lotes_asociados?: string[];
    tecnico_responsable?: string;
  };
}

interface LoteRecord {
  id: string;
  fields: {
    ID?: string;
    'Codigo Serial'?: number;
    cultivo_id?: string[];
    nombre_cultivo?: string;
    nombre_lote?: string;
    variedad?: string;
    area_ha?: number;
    riego?: boolean;
    anio_siembra?: number;
    tipo_suelo?: string;
    estado_lote?: string;
    fecha_ultima_siembra?: string;
  };
}

export async function GET(request: NextRequest) {
  console.log('🔍 API cultivos-lotes: Iniciando request');
  
  try {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('clienteId');

    console.log('📋 API cultivos-lotes: Configuración:', {
      hasApiKey: !!AIRTABLE_API_KEY,
      baseId: AIRTABLE_BASE_ID,
      clienteId: clienteId
    });

    if (!AIRTABLE_API_KEY) {
      console.error('❌ AIRTABLE_API_KEY_SIRIUS_CLIENTES_CORE no configurada');
      return NextResponse.json({ error: 'API key no configurada' }, { status: 500 });
    }

    if (!clienteId) {
      console.error('❌ clienteId faltante en query params');
      return NextResponse.json({ error: 'Cliente ID es requerido' }, { status: 400 });
    }

    console.log('🔍 Buscando cultivos para cliente:', clienteId);

    // Primero obtener los cultivos del cliente
    const cultivosUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_CULTIVOS_CORE}`;
    const filterFormula = `FIND("${clienteId}", ARRAYJOIN({cliente_id})) > 0`;
    const fullUrl = `${cultivosUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`;
    
    console.log('📡 Request URL para cultivos:', fullUrl);
    console.log('🔍 Filter formula:', filterFormula);
    
    const cultivosResponse = await fetch(fullUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Response status cultivos:', cultivosResponse.status);

    if (!cultivosResponse.ok) {
      console.error('❌ Error al obtener cultivos:', cultivosResponse.status, await cultivosResponse.text());
      return NextResponse.json({ error: 'Error al obtener cultivos' }, { status: cultivosResponse.status });
    }

    const cultivosData = await cultivosResponse.json();
    const cultivos: CultivoRecord[] = cultivosData.records || [];

    console.log(`✅ Cultivos encontrados: ${cultivos.length}`);

    if (cultivos.length === 0) {
      return NextResponse.json({ cultivos: [], lotes: [] });
    }

    // Obtener todos los IDs de lotes asociados a estos cultivos
    const loteIds = new Set<string>();
    cultivos.forEach(cultivo => {
      if (cultivo.fields.lotes_asociados) {
        cultivo.fields.lotes_asociados.forEach(loteId => {
          loteIds.add(loteId);
        });
      }
    });

    console.log('🔍 Buscando lotes:', Array.from(loteIds));

    let lotes: LoteRecord[] = [];

    if (loteIds.size > 0) {
      const loteIdsArray = Array.from(loteIds);
      console.log(`🔍 Total de lotes a buscar: ${loteIdsArray.length}`);
      
      // Si hay demasiados IDs, procesarlos en chunks para evitar URL muy largas
      const chunkSize = 50; // Procesar en grupos de 50 para evitar URLs muy largas
      const chunks = [];
      for (let i = 0; i < loteIdsArray.length; i += chunkSize) {
        chunks.push(loteIdsArray.slice(i, i + chunkSize));
      }
      
      console.log(`📦 Dividiendo en ${chunks.length} chunks de máximo ${chunkSize} elementos`);
      
      // Procesar cada chunk y combinar los resultados
      lotes = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`📡 Procesando chunk ${i + 1}/${chunks.length} con ${chunk.length} elementos`);
        
        try {
          const lotesUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_LOTES_CORE}`;
          const lotesFilterFormula = `OR(${chunk.map(id => `RECORD_ID() = "${id}"`).join(', ')})`;
          
          const lotesResponse = await fetch(`${lotesUrl}?filterByFormula=${encodeURIComponent(lotesFilterFormula)}`, {
            headers: {
              'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (lotesResponse.ok) {
            const lotesData = await lotesResponse.json();
            const chunkLotes = lotesData.records || [];
            lotes.push(...chunkLotes);
            console.log(`✅ Chunk ${i + 1}: ${chunkLotes.length} lotes obtenidos`);
          } else {
            const errorText = await lotesResponse.text();
            console.error(`❌ Error en chunk ${i + 1}:`, lotesResponse.status, errorText);
          }
        } catch (error) {
          console.error(`💥 Error procesando chunk ${i + 1}:`, error);
        }
        
        // Pequeña pausa para evitar rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`✅ Total de lotes obtenidos: ${lotes.length}`);
    } else {
      console.log('⚠️ No se encontraron IDs de lotes en los cultivos');
    }

    // Formatear los datos para el frontend
    const cultivosFormateados = cultivos.map(cultivo => ({
      id: cultivo.id,
      codigo: cultivo.fields.ID || `CU-${String(cultivo.fields['Codigo Serial'] || 0).padStart(4, '0')}`,
      nombre: cultivo.fields.nombre_cultivo || 'Sin nombre',
      tipo: cultivo.fields.tipo_cultivo || 'N/A',
      estado: cultivo.fields.estado || 'N/A',
      ubicacion: cultivo.fields.ubicacion_general || 'N/A',
      tecnicoResponsable: cultivo.fields.tecnico_responsable || 'N/A',
      lotesAsociados: cultivo.fields.lotes_asociados || []
    }));

    const lotesFormateados = lotes.map(lote => ({
      id: lote.id,
      codigo: lote.fields.ID || `LT-${String(lote.fields['Codigo Serial'] || 0).padStart(4, '0')}`,
      cultivoId: lote.fields.cultivo_id?.[0] || '',
      nombreCultivo: lote.fields.nombre_cultivo || 'Sin nombre',
      nombreLote: lote.fields.nombre_lote || 'Sin nombre',
      variedad: lote.fields.variedad || 'N/A',
      areaHa: lote.fields.area_ha || 0,
      riego: lote.fields.riego || false,
      anioSiembra: lote.fields.anio_siembra || 0,
      tipoSuelo: lote.fields.tipo_suelo || 'N/A',
      estado: lote.fields.estado_lote || 'N/A',
      fechaUltimaSiembra: lote.fields.fecha_ultima_siembra || null
    }));

    return NextResponse.json({
      cultivos: cultivosFormateados,
      lotes: lotesFormateados
    });

  } catch (error) {
    console.error('💥 Error en API cultivos-lotes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}