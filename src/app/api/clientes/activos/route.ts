import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 [CLIENTES-ACTIVOS] Consultando clientes con paquetes activos');
    
    // Usar la misma configuración que funciona en clientes-core
    const airtableApiKey = process.env.AIRTABLE_API_KEY_SIRIUS_CLIENTES_CORE;
    const baseId = process.env.AIRTABLE_BASE_ID_SIRIUS_CLIENTES_CORE;
    const tableId = process.env.AIRTABLE_TABLE_CLIENTES_CORE;
    
    if (!airtableApiKey || !baseId || !tableId) {
      console.error('❌ [CLIENTES-ACTIVOS] Configuración faltante:', { 
        hasApiKey: !!airtableApiKey, 
        hasBaseId: !!baseId,
        hasTableId: !!tableId
      });
      return NextResponse.json({
        error: 'Configuración de Airtable faltante',
        clientes: []
      }, { status: 500 });
    }

    // Primero, consultar TODOS los clientes activos usando la tabla que funciona
    const clientesUrl = `https://api.airtable.com/v0/${baseId}/${tableId}`;
    console.log('👥 [CLIENTES-ACTIVOS] Consultando clientes en:', clientesUrl);
    
    const clientesResponse = await fetch(clientesUrl, {
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!clientesResponse.ok) {
      const errorText = await clientesResponse.text();
      console.error('❌ [CLIENTES-ACTIVOS] Error en clientes:', clientesResponse.status, errorText);
      return NextResponse.json({
        error: `Error consultando clientes: ${clientesResponse.status}`,
        details: errorText,
        clientes: []
      }, { status: clientesResponse.status });
    }

    const clientesData = await clientesResponse.json();
    console.log('👥 [CLIENTES-ACTIVOS] Clientes encontrados:', clientesData.records?.length || 0);

    if (!clientesData.records || clientesData.records.length === 0) {
      console.log('⚠️ [CLIENTES-ACTIVOS] No se encontraron registros en tabla Clientes');
      return NextResponse.json({
        clientes: [],
        message: 'No se encontraron clientes en la base de datos'
      });
    }

    // Deduplicar y mapear clientes con los campos correctos
    const clientesMap = new Map();
    
    clientesData.records.forEach((record: any) => {
      const tieneNombre = record.fields['Cliente'] && record.fields['Cliente'].trim() !== '';
      if (tieneNombre && !clientesMap.has(record.id)) {
        clientesMap.set(record.id, {
          id: record.id, // Airtable record ID
          idCliente: record.fields['ID'] || '', // ID Cliente formato CL-XXXX
          nombre: record.fields['Cliente'] || 'Cliente sin nombre',
          nit: record.fields['Nit'] || '',
          direccion: record.fields['Direccion'] || '',
          ciudad: record.fields['Ciudad'] || '',
          departamento: record.fields['Departamento'] || '',
          codigoSerial: record.fields['Codigo Serial'] || 0,
          cantidadPaquetes: 0
        });
        console.log('🔍 [CLIENTES-ACTIVOS] Cliente único agregado:', record.fields['Cliente']);
      }
    });

    const clientesActivos = Array.from(clientesMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));

    console.log('✅ [CLIENTES-ACTIVOS] Clientes activos procesados:', {
      total: clientesActivos.length,
      ejemplos: clientesActivos.slice(0, 3).map(c => c.nombre)
    });

    // Ahora intentar consultar paquetes para contar
    try {
      // Usar las mismas variables de entorno que funcionan para otros endpoints
      const paquetesApiKey = process.env.AIRTABLE_API_KEY;
      const paquetesBaseId = process.env.AIRTABLE_BASE_ID;
      
      if (paquetesApiKey && paquetesBaseId) {
        const paquetesUrl = `https://api.airtable.com/v0/${paquetesBaseId}/Paquete%20Aplicaciones`;
        const paquetesResponse = await fetch(paquetesUrl, {
          headers: {
            'Authorization': `Bearer ${paquetesApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (paquetesResponse.ok) {
          const paquetesData = await paquetesResponse.json();
          console.log('📦 [CLIENTES-ACTIVOS] Paquetes encontrados:', paquetesData.records?.length || 0);
          
          // Actualizar conteo de paquetes por cliente
          clientesActivos.forEach(cliente => {
            // Buscar paquetes que tengan referencia a este cliente
            // Puede ser que la referencia sea por ID o por nombre del cliente
            cliente.cantidadPaquetes = paquetesData.records?.filter((p: any) => 
              p.fields['Cliente ID']?.[0] === cliente.id ||
              p.fields['Cliente']?.includes?.(cliente.nombre)
            ).length || 0;
          });
          
          console.log('📊 [CLIENTES-ACTIVOS] Conteo de paquetes actualizado');
        } else {
          console.log('⚠️ [CLIENTES-ACTIVOS] No se pudieron cargar paquetes, pero mostrando clientes activos');
        }
      }
    } catch (paquetesError) {
      console.log('⚠️ [CLIENTES-ACTIVOS] Error al cargar paquetes:', paquetesError);
    }

    return NextResponse.json({
      clientes: clientesActivos,
      total: clientesActivos.length,
      message: `Se encontraron ${clientesActivos.length} clientes activos`
    });

  } catch (error) {
    console.error('❌ [CLIENTES-ACTIVOS] Error:', error);
    return NextResponse.json({
      error: 'Error al consultar clientes activos',
      details: error instanceof Error ? error.message : 'Error desconocido',
      clientes: []
    }, { status: 500 });
  }
}