import { NextResponse } from 'next/server';

// Fórmula de ingredientes para Bacillus thuringiensis (cargada desde variables de entorno)
const BACILLUS_FORMULA: { [key: string]: number } = {
  'Dipel': Number(process.env.BACILLUS_DIPEL_PER_LITER) || 50,
  'Melaza': Number(process.env.BACILLUS_MELAZA_PER_LITER) || 20,
  'Tomate': Number(process.env.BACILLUS_TOMATE_PER_LITER) || 10,
  'Levadura': Number(process.env.BACILLUS_LEVADURA_PER_LITER) || 0.01
};

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
// Usando el ID de tabla proporcionado
const AIRTABLE_TABLE_MICROORGANISMOS = process.env.AIRTABLE_TABLE_MICROORGANISMOS;

// Función para buscar insumos por nombre en la tabla de Insumos Laboratorio
async function buscarInsumosPorNombre(nombresInsumos: string[]) {
  try {
    const AIRTABLE_TABLE_INSUMOS = process.env.AIRTABLE_TABLE_INSUMOS_LABORATORIO;
    
    if (!AIRTABLE_TABLE_INSUMOS) {
      console.error('❌ BUSCAR INSUMOS: AIRTABLE_TABLE_INSUMOS_LABORATORIO no configurado');
      return [];
    }

    console.log('🔍 [PROD-DEBUG] ===== FUNCIÓN BUSCAR INSUMOS POR NOMBRE =====');
    console.log('🔍 [PROD-DEBUG] Insumos a buscar:', nombresInsumos);
    console.log('🔍 [PROD-DEBUG] Cantidad de insumos:', nombresInsumos.length);
    console.log('🗄️ [PROD-DEBUG] AIRTABLE_TABLE_INSUMOS:', AIRTABLE_TABLE_INSUMOS);

    const insumosEncontrados = [];

    for (const nombreInsumo of nombresInsumos) {
      console.log(`🔎 [PROD-DEBUG] Buscando insumo: "${nombreInsumo}"`);
      
      // Crear filtro para buscar el insumo por nombre (case insensitive)
      const filterFormula = `SEARCH(UPPER("${nombreInsumo}"), UPPER({nombre}))`;
      const encodedFilter = encodeURIComponent(filterFormula);
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_INSUMOS}?filterByFormula=${encodedFilter}`;
      
      console.log(`🌐 [PROD-DEBUG] URL de búsqueda: ${url}`);
      console.log(`📋 [PROD-DEBUG] Filter formula: ${filterFormula}`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`📡 [PROD-DEBUG] Response status para ${nombreInsumo}:`, response.status);
      console.log(`✅ [PROD-DEBUG] Response ok para ${nombreInsumo}:`, response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log(`📋 [PROD-DEBUG] Datos recibidos para ${nombreInsumo}:`, JSON.stringify(data, null, 2));
        console.log(`📊 [PROD-DEBUG] Cantidad de registros encontrados: ${data.records?.length || 0}`);
        
        if (data.records && data.records.length > 0) {
          const insumo = data.records[0]; // Tomar el primer resultado
          console.log(`📦 [PROD-DEBUG] Primer insumo encontrado:`, JSON.stringify(insumo, null, 2));
          
          const insumoData = {
            id: insumo.id,
            nombre: insumo.fields.nombre || nombreInsumo,
            nombreBuscado: nombreInsumo,
            encontrado: true,
            presentacion: insumo.fields['Cantidad Presentacion Insumo'] || 1 // Obtener la presentación
          };
          
          insumosEncontrados.push(insumoData);
          console.log(`✅ [PROD-DEBUG] INSUMO ENCONTRADO: ${nombreInsumo} -> ID: ${insumo.id}, Presentación: ${insumo.fields['Cantidad Presentacion Insumo'] || 1}`);
          console.log(`📦 [PROD-DEBUG] Objeto insumo agregado:`, JSON.stringify(insumoData, null, 2));
        } else {
          insumosEncontrados.push({
            id: null,
            nombre: nombreInsumo,
            nombreBuscado: nombreInsumo,
            encontrado: false,
            presentacion: 1
          });
          console.log(`❌ INSUMO NO ENCONTRADO: ${nombreInsumo}`);
        }
      }
    }

    return insumosEncontrados;
  } catch (error) {
    console.error('❌ ERROR AL BUSCAR INSUMOS:', error);
    return [];
  }
}

export async function GET() {
  try {
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_MICROORGANISMOS) {
      return NextResponse.json(
        { error: 'Configuración de Airtable incompleta. Verifica AIRTABLE_API_KEY, AIRTABLE_BASE_ID y AIRTABLE_TABLE_MICROORGANISMOS' },
        { status: 500 }
      );
    }

    // Filtramos solo microorganismos de tipo "Bacteria"
    const filterFormula = encodeURIComponent("AND({Tipo Microorganismo} = 'Bacteria')");
    
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_MICROORGANISMOS}?filterByFormula=${filterFormula}`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Airtable:', response.status, errorText);
      throw new Error(`Error de Airtable: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Helper function to extract string value from Airtable complex objects
    const extractValue = (field: unknown): string => {
      if (typeof field === 'string') return field;
      if (field && typeof field === 'object' && 'value' in field) {
        return String((field as { value: unknown }).value);
      }
      if (field && typeof field === 'object' && 'state' in field && (field as { state: string }).state === 'generated') {
        return String((field as { value?: unknown }).value || '');
      }
      return field?.toString() || '';
    };

    const microorganismos = data.records.map((record: { id: string; fields: Record<string, unknown> }) => ({
      id: record.id,
      nombre: extractValue(record.fields.Microorganismo) || 'Sin nombre',
      tipo: extractValue(record.fields['Tipo Microorganismo']) || 'Bacteria',
      abreviatura: extractValue(record.fields.Abreviaturas) || '',
      bolsasPorLote: record.fields['Bolsas/Lote'] || 0,
      diasIncubacion: record.fields['Dias/Incubacion'] || 0,
      descripcion: extractValue(record.fields.descripcion) || `Microorganismo de tipo ${extractValue(record.fields['Tipo Microorganismo']) || 'Bacteria'} con código ${extractValue(record.fields.Abreviaturas) || 'N/A'}`,
      aplicaciones: extractValue(record.fields.aplicaciones) || `Producción en lotes de ${record.fields['Bolsas/Lote'] || 0} bolsas`,
      condicionesOptimas: extractValue(record.fields.condicionesOptimas) || `Incubación por ${record.fields['Dias/Incubacion'] || 0} días`,
      tiempoProduccion: `${record.fields['Dias/Incubacion'] || 0} días de incubación`,
      estado: 'Disponible para producción',
      // Campos adicionales para referencia
      productosRemisiones: record.fields['Productos Remisiones'] || [],
      cosechaLaboratorio: record.fields['Cosecha Laboratorio'] || [],
      inoculacion: record.fields.Inoculacion || [],
      cepas: record.fields.Cepas || []
    }));

    return NextResponse.json({
      success: true,
      microorganismos,
      total: microorganismos.length
    });

  } catch (error) {
    console.error('Error al obtener microorganismos para producción:', error);
    return NextResponse.json(
      { error: 'Error al conectar con Airtable', details: error },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  console.log('🚀 [PROD-DEBUG] ===== INICIANDO API PRODUCCION-BACTERIAS =====');
  console.log('🌍 [PROD-DEBUG] Environment:', process.env.NODE_ENV);
  console.log('📅 [PROD-DEBUG] Timestamp:', new Date().toISOString());
  
  try {
    const body = await request.json();
    console.log('📦 [PROD-DEBUG] Request body recibido:', JSON.stringify(body, null, 2));
    
    const { microorganismoId, cantidadLitros, fechaInicio, observaciones, realizaRegistro, responsablesEquipo } = body;

    console.log('🔍 [PROD-DEBUG] Datos extraídos del body:');
    console.log('  - microorganismoId:', microorganismoId);
    console.log('  - cantidadLitros:', cantidadLitros, '(tipo:', typeof cantidadLitros, ')');
    console.log('  - fechaInicio:', fechaInicio);
    console.log('  - realizaRegistro:', realizaRegistro);
    console.log('  - responsablesEquipo:', responsablesEquipo);

    // Validación de campos requeridos
    if (!microorganismoId) {
      console.error('❌ [PROD-DEBUG] API PRODUCCION-BACTERIAS: microorganismoId faltante');
      return NextResponse.json({ success: false, error: 'microorganismoId es requerido' }, { status: 400 });
    }
    
    if (!cantidadLitros) {
      console.error('❌ [PROD-DEBUG] API PRODUCCION-BACTERIAS: cantidadLitros faltante');
      return NextResponse.json({ success: false, error: 'cantidadLitros es requerido' }, { status: 400 });
    }

    console.log('🔑 [PROD-DEBUG] Verificando configuración de Airtable...');
    console.log('  - AIRTABLE_API_KEY exists:', !!AIRTABLE_API_KEY);
    console.log('  - AIRTABLE_BASE_ID exists:', !!AIRTABLE_BASE_ID);
    
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      console.error('❌ [PROD-DEBUG] API PRODUCCION-BACTERIAS: Configuración de Airtable incompleta');
      return NextResponse.json(
        { success: false, error: 'Configuración de Airtable incompleta' },
        { status: 500 }
      );
    }

    // Usar la tabla de fermentación
    const AIRTABLE_TABLE_FERMENTACION = process.env.AIRTABLE_TABLE_FERMENTACION;
    console.log('🗄️ [PROD-DEBUG] AIRTABLE_TABLE_FERMENTACION:', AIRTABLE_TABLE_FERMENTACION);
    
    if (!AIRTABLE_TABLE_FERMENTACION) {
      console.error('❌ API PRODUCCION-BACTERIAS: AIRTABLE_TABLE_FERMENTACION no configurado');
      return NextResponse.json(
        { success: false, error: 'Tabla de fermentación no configurada' },
        { status: 500 }
      );
    }

    // Calcular fechas - Mantener la fecha exacta sin conversión de zona horaria
    let fechaInicioDate: Date;
    if (fechaInicio) {
      // Crear fecha local sin conversión de zona horaria
      const [year, month, day] = fechaInicio.split('-').map(Number);
      fechaInicioDate = new Date(year, month - 1, day); // month - 1 porque Date usa 0-11 para meses
    } else {
      fechaInicioDate = new Date();
    }
    
    const fechaFinalizacion = new Date(fechaInicioDate);
    fechaFinalizacion.setDate(fechaFinalizacion.getDate() + 3); // 3 días de fermentación

    console.log('📅 API PRODUCCION-BACTERIAS: Fecha inicio original:', fechaInicio);
    console.log('📅 [PROD-DEBUG] API PRODUCCION-BACTERIAS: Fecha inicio procesada:', fechaInicioDate.toISOString());
    console.log('📅 [PROD-DEBUG] API PRODUCCION-BACTERIAS: Fecha finalización:', fechaFinalizacion.toISOString());

    // Obtener información del microorganismo para determinar si es Bacillus thuringiensis
    console.log('🦠 [PROD-DEBUG] ===== INICIANDO BÚSQUEDA DE MICROORGANISMO =====');
    console.log('🔍 [PROD-DEBUG] microorganismoId a buscar:', microorganismoId);
    console.log('🗄️ [PROD-DEBUG] AIRTABLE_TABLE_MICROORGANISMOS:', AIRTABLE_TABLE_MICROORGANISMOS);
    
    let insumosCalculados: Array<{
      id: string | null;
      nombre: string;
      nombreBuscado: string;
      encontrado: boolean;
      cantidadPorLitro: number;
      cantidadTotal: number;
      unidad: string;
      presentacion: number;
    }> = [];
    let microorganismoInfo = null;
    
    try {
      const microorganismoUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_MICROORGANISMOS}/${microorganismoId}`;
      console.log('🌐 [PROD-DEBUG] URL de microorganismo:', microorganismoUrl);
      
      const microorganismoResponse = await fetch(microorganismoUrl, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 [PROD-DEBUG] Response status microorganismo:', microorganismoResponse.status);
      console.log('✅ [PROD-DEBUG] Response ok microorganismo:', microorganismoResponse.ok);
      
      if (microorganismoResponse.ok) {
        const microorganismoData = await microorganismoResponse.json();
        microorganismoInfo = microorganismoData.fields;
        console.log('🦠 [PROD-DEBUG] MICROORGANISMO INFO completo:', JSON.stringify(microorganismoInfo, null, 2));
        console.log('🦠 [PROD-DEBUG] Nombre del microorganismo:', microorganismoInfo?.Microorganismo);
        
        // Si es Bacillus thuringiensis, calcular insumos necesarios
        const nombreMicroorganismo = microorganismoInfo?.Microorganismo;
        console.log('🔍 [PROD-DEBUG] Verificando si es Bacillus thuringiensis...');
        console.log('🔍 [PROD-DEBUG] Nombre recibido:', `"${nombreMicroorganismo}"`);
        console.log('🔍 [PROD-DEBUG] Comparación exacta:', nombreMicroorganismo === 'Bacillus thuringiensis');
        console.log('🔍 [PROD-DEBUG] Tipo de dato:', typeof nombreMicroorganismo);
        
        if (nombreMicroorganismo === 'Bacillus thuringiensis') {
          console.log('🧬 [PROD-DEBUG] ===== ES BACILLUS THURINGIENSIS - INICIANDO CÁLCULO DE INSUMOS =====');
          
          // Verificar fórmula desde variables de entorno
          console.log('🧪 [PROD-DEBUG] Verificando fórmula BACILLUS_FORMULA:');
          console.log('  - BACILLUS_DIPEL_PER_LITER:', process.env.BACILLUS_DIPEL_PER_LITER);
          console.log('  - BACILLUS_MELAZA_PER_LITER:', process.env.BACILLUS_MELAZA_PER_LITER);
          console.log('  - BACILLUS_TOMATE_PER_LITER:', process.env.BACILLUS_TOMATE_PER_LITER);
          console.log('  - BACILLUS_LEVADURA_PER_LITER:', process.env.BACILLUS_LEVADURA_PER_LITER);
          console.log('🧪 [PROD-DEBUG] BACILLUS_FORMULA calculada:', BACILLUS_FORMULA);
          
          // Buscar los insumos en la tabla
          const nombresInsumos = Object.keys(BACILLUS_FORMULA);
          console.log('🔍 [PROD-DEBUG] Nombres de insumos a buscar:', nombresInsumos);
          console.log('📏 [PROD-DEBUG] Cantidad de litros para calcular:', cantidadLitros);
          
          console.log('🔎 [PROD-DEBUG] ===== INICIANDO BÚSQUEDA DE INSUMOS =====');
          const insumosEncontrados = await buscarInsumosPorNombre(nombresInsumos);
          console.log('📋 [PROD-DEBUG] Insumos encontrados (resultado buscarInsumosPorNombre):', JSON.stringify(insumosEncontrados, null, 2));
          
          // Calcular cantidades necesarias según el volumen
          console.log('🧮 [PROD-DEBUG] ===== CALCULANDO CANTIDADES =====');
          insumosCalculados = insumosEncontrados.map(insumo => {
            const cantidadPorLitro = BACILLUS_FORMULA[insumo.nombreBuscado] || 0;
            const cantidadTotal = cantidadPorLitro * Number(cantidadLitros);
            
            console.log(`🧮 [PROD-DEBUG] Calculando ${insumo.nombreBuscado}:`);
            console.log(`  - Cantidad por litro: ${cantidadPorLitro}`);
            console.log(`  - Litros: ${cantidadLitros}`);
            console.log(`  - Cantidad total: ${cantidadTotal}`);
            console.log(`  - Presentación: ${insumo.presentacion}`);
            
            return {
              ...insumo,
              cantidadPorLitro,
              cantidadTotal,
              unidad: 'gramos',
              presentacion: insumo.presentacion || 1 // Asegurar que tenemos la presentación
            };
          });
          
          console.log('📊 [PROD-DEBUG] INSUMOS CALCULADOS FINAL:', JSON.stringify(insumosCalculados, null, 2));
        } else {
          console.log('❌ [PROD-DEBUG] NO ES BACILLUS THURINGIENSIS - No se calcularán insumos automáticos');
          console.log('🔍 [PROD-DEBUG] Nombre esperado: "Bacillus thuringiensis"');
          console.log('🔍 [PROD-DEBUG] Nombre recibido: "' + nombreMicroorganismo + '"');
        }
      }
    } catch (error) {
      console.warn('⚠️ No se pudo obtener información del microorganismo:', error);
    }

    // Preparar datos para Airtable con el formato correcto
    const recordData = {
      fields: {
        'Fecha Inicia Fermentacion': fechaInicioDate.toISOString().split('T')[0] + 'T00:00:00.000Z',
        'Fecha Termina Fermentacion': fechaFinalizacion.toISOString().split('T')[0] + 'T00:00:00.000Z',
        'Cantidad Litros': Number(cantidadLitros),
        'Observaciones': observaciones || '',
        'Realiza Registro': realizaRegistro || 'Sistema',
        'Microorganismos': [microorganismoId],
        'Responsables': responsablesEquipo || []
      }
    };

    console.log('📦 API PRODUCCION-BACTERIAS: Datos para Airtable:', JSON.stringify(recordData, null, 2));

    // Crear registro en Airtable
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_FERMENTACION}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [recordData],
          typecast: true
        })
      }
    );

    const airtableResult = await airtableResponse.json();
    console.log('📊 API PRODUCCION-BACTERIAS: Respuesta de Airtable:', JSON.stringify(airtableResult, null, 2));

    if (!airtableResponse.ok) {
      console.error('❌ API PRODUCCION-BACTERIAS: Error de Airtable:', airtableResult);
      return NextResponse.json({
        success: false,
        error: 'Error al crear registro en Airtable',
        details: airtableResult
      }, { status: 500 });
    }

    const createdRecord = airtableResult.records[0];
    console.log('✅ API PRODUCCION-BACTERIAS: Registro creado exitosamente:', createdRecord.id);

    // Si hay insumos calculados para Bacillus thuringiensis, crear registros de salida
    let salidasInsumosCreadas = null;
    console.log('🔍 [PROD-DEBUG] ===== VERIFICANDO SI HAY INSUMOS CALCULADOS =====');
    console.log('🔍 [PROD-DEBUG] insumosCalculados.length:', insumosCalculados.length);
    console.log('🔍 [PROD-DEBUG] insumosCalculados:', JSON.stringify(insumosCalculados, null, 2));
    
    const insumosEncontrados = insumosCalculados.filter(i => i.encontrado);
    console.log('🔍 [PROD-DEBUG] Insumos encontrados (filtrados):', insumosEncontrados.length);
    console.log('🔍 [PROD-DEBUG] Lista de encontrados:', JSON.stringify(insumosEncontrados, null, 2));
    
    const condicion1 = insumosCalculados.length > 0;
    const condicion2 = insumosCalculados.some(i => i.encontrado);
    console.log('🔍 [PROD-DEBUG] Condición 1 (length > 0):', condicion1);
    console.log('🔍 [PROD-DEBUG] Condición 2 (some encontrado):', condicion2);
    console.log('🔍 [PROD-DEBUG] Condición combinada:', condicion1 && condicion2);
    
    if (insumosCalculados.length > 0 && insumosCalculados.some(i => i.encontrado)) {
      console.log('� [PROD-DEBUG] ===== INICIANDO DESCUENTO AUTOMÁTICO DE INSUMOS =====');
      
      try {
        // Preparar datos para el descuento automático
        const insumosParaSalida = insumosCalculados.filter(insumo => insumo.encontrado && insumo.id);
        console.log('📦 [PROD-DEBUG] Insumos para salida (con ID):', JSON.stringify(insumosParaSalida, null, 2));
        
        const salidaInsumosData = insumosParaSalida.map(insumo => {
          const registroSalida = {
            fecha: fechaInicioDate.toISOString().split('T')[0], // Solo fecha, no tiempo
            cantidad: insumo.cantidadTotal, // cantidad total en gramos
            unidad: 'gr',
            insumoId: insumo.id,
            equivalenciaGramos: insumo.presentacion || 1, // Usar la presentación real del insumo
            fermentacionId: createdRecord.id,
            userName: realizaRegistro || 'Sistema',
            nombreEvento: `Fermentación ${microorganismoInfo?.Microorganismo} - ${cantidadLitros}L`
          };
          
          console.log(`📋 [PROD-DEBUG] Registro de salida para ${insumo.nombre}:`, JSON.stringify(registroSalida, null, 2));
          return registroSalida;
        });

        console.log('📋 [PROD-DEBUG] DATOS COMPLETOS PARA SALIDA DE INSUMOS:', JSON.stringify(salidaInsumosData, null, 2));

        // Preparar el payload completo
        const payloadSalidaInsumos = { 
          registros: salidaInsumosData,
          fermentacionId: createdRecord.id,
          userName: realizaRegistro || 'Sistema'
        };
        
        console.log('📤 [PROD-DEBUG] PAYLOAD COMPLETO PARA SALIDA-INSUMOS-AUTO:', JSON.stringify(payloadSalidaInsumos, null, 2));

        // Llamar directamente a la función de salida-insumos-auto sin fetch HTTP
        console.log('📞 [PROD-DEBUG] ===== LLAMANDO DIRECTAMENTE A SALIDA-INSUMOS-AUTO =====');
        
        let salidaInsumosResult: any;
        
        try {
          // Crear un request mock para la función del endpoint
          const mockRequest = new Request('http://localhost:3000/api/salida-insumos-auto', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payloadSalidaInsumos),
          });
          
          console.log('🔄 [PROD-DEBUG] Importando y ejecutando función directamente...');
          
          // Importar y llamar directamente la función
          const salidaInsumosModule = await import('../salida-insumos-auto/route');
          const directResponse = await salidaInsumosModule.POST(mockRequest as any);
          salidaInsumosResult = await directResponse.json();
          
          console.log('✅ [PROD-DEBUG] Llamada directa exitosa:', JSON.stringify(salidaInsumosResult, null, 2));
          
        } catch (directError: unknown) {
          console.error('❌ [PROD-DEBUG] ERROR EN LLAMADA DIRECTA:', directError);
          salidaInsumosResult = {
            success: false,
            error: 'Error al procesar salidas de insumos',
            details: directError instanceof Error ? directError.message : 'Error desconocido',
            directCallFailed: true
          };
        }
        
        if (salidaInsumosResult.success) {
          console.log('✅ [PROD-DEBUG] DESCUENTO DE INSUMOS COMPLETADO EXITOSAMENTE');
          salidasInsumosCreadas = {
            success: true,
            procesados: salidaInsumosResult.procesados || salidaInsumosData.length,
            message: salidaInsumosResult.message
          };
        } else {
          console.error('❌ [PROD-DEBUG] ===== ERROR EN DESCUENTO DE INSUMOS =====');
          console.error('❌ [PROD-DEBUG] Result success:', salidaInsumosResult.success);
          console.error('❌ [PROD-DEBUG] Error details:', salidaInsumosResult.error);
          console.error('❌ [PROD-DEBUG] Status from result:', salidaInsumosResult.status);
          console.error('❌ [PROD-DEBUG] Is HTML response:', salidaInsumosResult.isHtmlResponse);
          
          // ROLLBACK: Eliminar la fermentación creada si falla el descuento
          console.log('🔄 [PROD-DEBUG] ===== INICIANDO ROLLBACK TRANSACCIONAL =====');
          console.log('🔄 [PROD-DEBUG] ID a eliminar:', createdRecord.id);
          
          try {
            // Corregir la URL del DELETE - usar el formato correcto de Airtable
            const rollbackUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_FERMENTACION}/${createdRecord.id}`;
            console.log('🔄 [PROD-DEBUG] URL de rollback:', rollbackUrl);
            
            const rollbackResponse = await fetch(rollbackUrl, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json',
              }
            });
            
            console.log('📡 [PROD-DEBUG] Rollback response status:', rollbackResponse.status);
            console.log('📡 [PROD-DEBUG] Rollback response ok:', rollbackResponse.ok);
            
            if (rollbackResponse.ok) {
              const rollbackResult = await rollbackResponse.json();
              console.log('✅ [PROD-DEBUG] ROLLBACK COMPLETADO - Fermentación eliminada:', rollbackResult);
              
              return NextResponse.json({
                success: false,
                error: 'Error transaccional: No se pudieron descontar los insumos automáticamente. La fermentación fue cancelada para mantener consistencia.',
                details: `Detalle del error en insumos: ${salidaInsumosResult.error || 'Error desconocido'}`,
                rollback: true,
                originalError: salidaInsumosResult
              }, { status: 400 });
            } else {
              const rollbackErrorText = await rollbackResponse.text();
              console.error('❌ [PROD-DEBUG] ERROR EN ROLLBACK:', rollbackErrorText);
              
              return NextResponse.json({
                success: false,
                error: 'Error crítico: Fermentación creada pero falló el descuento de insumos Y no se pudo deshacer automáticamente.',
                details: `ID Fermentación: ${createdRecord.id}. Error de rollback: ${rollbackErrorText}. Contacte al administrador.`,
                fermentacionId: createdRecord.id,
                rollbackFailed: true
              }, { status: 500 });
            }
          } catch (rollbackError: unknown) {
            console.error('❌ [PROD-DEBUG] ERROR CRÍTICO EN ROLLBACK:', rollbackError);
            return NextResponse.json({
              success: false,
              error: 'Error crítico del sistema durante rollback',
              details: `Fermentación ${createdRecord.id} puede requerir limpieza manual. Error: ${rollbackError instanceof Error ? rollbackError.message : 'Error desconocido'}`,
              fermentacionId: createdRecord.id,
              rollbackException: true
            }, { status: 500 });
          }
        }
      } catch (salidasError: unknown) {
        console.error('❌ [PROD-DEBUG] ===== ERROR AL PROCESAR SALIDAS DE INSUMOS (CATCH GENERAL) =====');
        console.error('❌ [PROD-DEBUG] Tipo de error:', typeof salidasError);
        console.error('❌ [PROD-DEBUG] Error completo:', salidasError);
        console.error('❌ [PROD-DEBUG] Error message:', salidasError instanceof Error ? salidasError.message : 'Error desconocido');
        console.error('❌ [PROD-DEBUG] Error stack:', salidasError instanceof Error ? salidasError.stack : 'No stack available');
        
        // ROLLBACK TAMBIÉN EN CASO DE EXCEPCIÓN
        console.log('🔄 [PROD-DEBUG] ===== INICIANDO ROLLBACK POR EXCEPCIÓN =====');
        try {
          const rollbackUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_FERMENTACION}/${createdRecord.id}`;
          console.log('🔄 [PROD-DEBUG] URL de rollback por excepción:', rollbackUrl);
          
          const rollbackResponse = await fetch(rollbackUrl, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
              'Content-Type': 'application/json',
            }
          });
          
          if (rollbackResponse.ok) {
            console.log('✅ [PROD-DEBUG] ROLLBACK POR EXCEPCIÓN COMPLETADO');
            return NextResponse.json({
              success: false,
              error: 'Error transaccional: No se pudieron procesar los insumos. La fermentación fue cancelada para mantener consistencia.',
              details: salidasError instanceof Error ? salidasError.message : 'Error desconocido en procesamiento de insumos',
              rollback: true,
              originalError: salidasError instanceof Error ? salidasError.stack : salidasError
            }, { status: 400 });
          } else {
            console.error('❌ [PROD-DEBUG] ERROR EN ROLLBACK POR EXCEPCIÓN');
            return NextResponse.json({
              success: false,
              error: 'Error crítico: Excepción en procesamiento de insumos Y fallo en rollback.',
              details: `Fermentación ${createdRecord.id} requiere limpieza manual.`,
              fermentacionId: createdRecord.id,
              rollbackFailed: true,
              originalError: salidasError instanceof Error ? salidasError.message : 'Error desconocido'
            }, { status: 500 });
          }
        } catch (rollbackError: unknown) {
          console.error('❌ [PROD-DEBUG] ERROR CRÍTICO EN ROLLBACK POR EXCEPCIÓN:', rollbackError);
          return NextResponse.json({
            success: false,
            error: 'Error crítico del sistema',
            details: `Fermentación ${createdRecord.id} y rollback fallaron. Limpieza manual requerida.`,
            fermentacionId: createdRecord.id,
            rollbackException: true
          }, { status: 500 });
        }
      }
    } else {
      console.log('⚠️ [PROD-DEBUG] ===== NO HAY INSUMOS CALCULADOS O NO SE ENCONTRARON =====');
      console.log('⚠️ [PROD-DEBUG] insumosCalculados.length:', insumosCalculados.length);
      console.log('⚠️ [PROD-DEBUG] Condición some(encontrado):', insumosCalculados.some(i => i.encontrado));
    }

    console.log('📤 [PROD-DEBUG] ===== CONSTRUYENDO RESPUESTA FINAL =====');
    console.log('📤 [PROD-DEBUG] salidasInsumosCreadas:', JSON.stringify(salidasInsumosCreadas, null, 2));
    console.log('📤 [PROD-DEBUG] insumosCalculados.length:', insumosCalculados.length);

    const respuestaFinal = {
      success: true,
      message: 'Fermentación iniciada exitosamente',
      fermentacionId: createdRecord.id,
      fechaInicio: fechaInicioDate.toISOString(),
      fechaFinalizacion: fechaFinalizacion.toISOString(),
      cantidadLitros: Number(cantidadLitros),
      observaciones: observaciones || '',
      realizaRegistro: realizaRegistro || 'Sistema',
      insumos: insumosCalculados.length > 0 ? {
        microorganismo: microorganismoInfo?.Microorganismo || 'Desconocido',
        volumenProduccion: Number(cantidadLitros),
        insumosNecesarios: insumosCalculados,
        descuentoAutomatico: salidasInsumosCreadas
      } : null
    };
    
    console.log('📤 [PROD-DEBUG] RESPUESTA FINAL COMPLETA:', JSON.stringify(respuestaFinal, null, 2));

    return NextResponse.json(respuestaFinal);

  } catch (error) {
    console.error('❌ API PRODUCCION-BACTERIAS: Error general:', error);
    return NextResponse.json(
      { success: false, error: 'Error al iniciar fermentación', details: error },
      { status: 500 }
    );
  }
}
