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

    console.log('🔍 BUSCAR INSUMOS: Buscando:', nombresInsumos);

    const insumosEncontrados = [];

    for (const nombreInsumo of nombresInsumos) {
      // Crear filtro para buscar el insumo por nombre (case insensitive)
      const filterFormula = `SEARCH(UPPER("${nombreInsumo}"), UPPER({nombre}))`;
      const encodedFilter = encodeURIComponent(filterFormula);

      const response = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_INSUMOS}?filterByFormula=${encodedFilter}`,
        {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.records && data.records.length > 0) {
          const insumo = data.records[0]; // Tomar el primer resultado
          insumosEncontrados.push({
            id: insumo.id,
            nombre: insumo.fields.nombre || nombreInsumo,
            nombreBuscado: nombreInsumo,
            encontrado: true,
            presentacion: insumo.fields['Cantidad Presentacion Insumo'] || 1 // Obtener la presentación
          });
          console.log(`✅ INSUMO ENCONTRADO: ${nombreInsumo} -> ID: ${insumo.id}, Presentación: ${insumo.fields['Cantidad Presentacion Insumo'] || 1}`);
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
  try {
    const body = await request.json();
    console.log('🧬 API PRODUCCION-BACTERIAS: Body recibido:', body);
    
    const { microorganismoId, cantidadLitros, fechaInicio, observaciones, realizaRegistro, responsablesEquipo } = body;

    // Validación de campos requeridos
    if (!microorganismoId) {
      console.error('❌ API PRODUCCION-BACTERIAS: microorganismoId faltante');
      return NextResponse.json({ success: false, error: 'microorganismoId es requerido' }, { status: 400 });
    }
    
    if (!cantidadLitros) {
      console.error('❌ API PRODUCCION-BACTERIAS: cantidadLitros faltante');
      return NextResponse.json({ success: false, error: 'cantidadLitros es requerido' }, { status: 400 });
    }

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      console.error('❌ API PRODUCCION-BACTERIAS: Configuración de Airtable incompleta');
      return NextResponse.json(
        { success: false, error: 'Configuración de Airtable incompleta' },
        { status: 500 }
      );
    }

    // Usar la tabla de fermentación
    const AIRTABLE_TABLE_FERMENTACION = process.env.AIRTABLE_TABLE_FERMENTACION;
    
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
    console.log('📅 API PRODUCCION-BACTERIAS: Fecha inicio procesada:', fechaInicioDate.toISOString());
    console.log('📅 API PRODUCCION-BACTERIAS: Fecha finalización:', fechaFinalizacion.toISOString());

    // Obtener información del microorganismo para determinar si es Bacillus thuringiensis
    let insumosCalculados: Array<{
      id: string;
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
      const microorganismoResponse = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_MICROORGANISMOS}/${microorganismoId}`,
        {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (microorganismoResponse.ok) {
        const microorganismoData = await microorganismoResponse.json();
        microorganismoInfo = microorganismoData.fields;
        console.log('🦠 MICROORGANISMO INFO:', microorganismoInfo?.Microorganismo);
        
        // Si es Bacillus thuringiensis, calcular insumos necesarios
        if (microorganismoInfo?.Microorganismo === 'Bacillus thuringiensis') {
          console.log('🧬 CALCULANDO INSUMOS PARA BACILLUS THURINGIENSIS...');
          
          // Buscar los insumos en la tabla
          const nombresInsumos = Object.keys(BACILLUS_FORMULA);
          const insumosEncontrados = await buscarInsumosPorNombre(nombresInsumos);
          
          // Calcular cantidades necesarias según el volumen
          insumosCalculados = insumosEncontrados.map(insumo => ({
            ...insumo,
            cantidadPorLitro: BACILLUS_FORMULA[insumo.nombreBuscado] || 0,
            cantidadTotal: (BACILLUS_FORMULA[insumo.nombreBuscado] || 0) * Number(cantidadLitros),
            unidad: 'gramos',
            presentacion: insumo.presentacion || 1 // Asegurar que tenemos la presentación
          }));
          
          console.log('📊 INSUMOS CALCULADOS:', insumosCalculados);
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
    if (insumosCalculados.length > 0 && insumosCalculados.some(i => i.encontrado)) {
      try {
        console.log('📦 INICIANDO DESCUENTO AUTOMÁTICO DE INSUMOS...');
        
        // Preparar datos para el descuento automático
        const salidaInsumosData = insumosCalculados
          .filter(insumo => insumo.encontrado && insumo.id) // Solo insumos encontrados
          .map(insumo => ({
            fecha: fechaInicioDate.toISOString().split('T')[0], // Solo fecha, no tiempo
            cantidad: insumo.cantidadTotal, // cantidad total en gramos
            unidad: 'gr',
            insumoId: insumo.id,
            equivalenciaGramos: insumo.presentacion || 1, // Usar la presentación real del insumo
            fermentacionId: createdRecord.id,
            userName: realizaRegistro || 'Sistema',
            nombreEvento: `Fermentación ${microorganismoInfo?.Microorganismo} - ${cantidadLitros}L`
          }));

        console.log('📋 DATOS PARA SALIDA DE INSUMOS:', salidaInsumosData);

        // Llamar al endpoint de salida-insumos-auto
        const salidaInsumosResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/salida-insumos-auto`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            registros: salidaInsumosData,
            fermentacionId: createdRecord.id,
            userName: realizaRegistro || 'Sistema'
          }),
        });

        const salidaInsumosResult = await salidaInsumosResponse.json();
        console.log('📊 RESPUESTA SALIDA INSUMOS:', salidaInsumosResult);
        
        if (salidaInsumosResponse.ok && salidaInsumosResult.success) {
          console.log('✅ DESCUENTO DE INSUMOS COMPLETADO EXITOSAMENTE');
          salidasInsumosCreadas = {
            success: true,
            procesados: salidaInsumosResult.procesados || salidaInsumosData.length,
            message: salidaInsumosResult.message
          };
        } else {
          console.error('❌ ERROR EN DESCUENTO DE INSUMOS:', salidaInsumosResult.error);
          
          // ROLLBACK: Eliminar la fermentación creada si falla el descuento
          try {
            console.log('🔄 INICIANDO ROLLBACK - Eliminando fermentación...');
            const rollbackResponse = await fetch(
              `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_FERMENTACION}?records[]=${createdRecord.id}`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                  'Content-Type': 'application/json',
                }
              }
            );
            
            if (rollbackResponse.ok) {
              console.log('✅ ROLLBACK COMPLETADO - Fermentación eliminada');
              return NextResponse.json({
                success: false,
                error: 'Error transaccional: No se pudieron descontar los insumos automáticamente. La fermentación fue cancelada.',
                details: `Detalle del error: ${salidaInsumosResult.error}`
              }, { status: 500 });
            } else {
              console.error('❌ ERROR EN ROLLBACK');
              return NextResponse.json({
                success: false,
                error: 'Error crítico: Fermentación creada pero falló el descuento de insumos Y no se pudo deshacer automáticamente.',
                details: `ID Fermentación: ${createdRecord.id}. Contacte al administrador.`,
                fermentacionId: createdRecord.id
              }, { status: 500 });
            }
          } catch (rollbackError) {
            console.error('❌ ERROR CRÍTICO EN ROLLBACK:', rollbackError);
            return NextResponse.json({
              success: false,
              error: 'Error crítico del sistema durante rollback',
              details: `Fermentación ${createdRecord.id} puede requerir limpieza manual`,
              fermentacionId: createdRecord.id
            }, { status: 500 });
          }
        }
      } catch (salidasError) {
        console.error('❌ ERROR AL PROCESAR SALIDAS DE INSUMOS:', salidasError);
        salidasInsumosCreadas = {
          success: false,
          error: salidasError instanceof Error ? salidasError.message : 'Error desconocido',
          message: 'No se pudieron procesar las salidas de insumos automáticamente'
        };
      }
    }

    return NextResponse.json({
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
    });

  } catch (error) {
    console.error('❌ API PRODUCCION-BACTERIAS: Error general:', error);
    return NextResponse.json(
      { success: false, error: 'Error al iniciar fermentación', details: error },
      { status: 500 }
    );
  }
}
