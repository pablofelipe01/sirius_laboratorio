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

// Función para buscar microorganismos por nombre para SiriusBacter
async function buscarMicroorganismosPorNombre(nombres: string[]) {
  try {
    console.log('🔍 [SIRIUSBACTER] ===== BUSCANDO MICROORGANISMOS =====');
    console.log('🔍 [SIRIUSBACTER] Microorganismos a buscar:', nombres);
    
    const microorganismosEncontrados = [];
    
    for (const nombre of nombres) {
      console.log(`🔎 [SIRIUSBACTER] Buscando microorganismo: "${nombre}"`);
      
      const filterFormula = `SEARCH(UPPER("${nombre}"), UPPER({Microorganismo}))`;
      const encodedFilter = encodeURIComponent(filterFormula);
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_MICROORGANISMOS}?filterByFormula=${encodedFilter}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.records && data.records.length > 0) {
          const microorganismo = data.records[0];
          microorganismosEncontrados.push({
            id: microorganismo.id,
            nombre: microorganismo.fields.Microorganismo,
            abreviatura: microorganismo.fields.Abreviaturas,
            encontrado: true
          });
          console.log(`✅ [SIRIUSBACTER] Microorganismo encontrado: ${nombre} -> ${microorganismo.id}`);
        } else {
          console.log(`❌ [SIRIUSBACTER] Microorganismo NO encontrado: ${nombre}`);
          microorganismosEncontrados.push({
            id: null,
            nombre: nombre,
            abreviatura: null,
            encontrado: false
          });
        }
      }
    }
    
    return microorganismosEncontrados;
  } catch (error) {
    console.error('❌ [SIRIUSBACTER] ERROR AL BUSCAR MICROORGANISMOS:', error);
    return [];
  }
}

// Nueva función para buscar microorganismos terminados en 100L usando lógica FIFO
async function buscarMicroorganismosTerminados100L() {
  try {
    console.log('🔍 [SIRIUSBACTER-FIFO] ===== BUSCANDO MICROORGANISMOS TERMINADOS 100L =====');
    
    const AIRTABLE_TABLE_FERMENTACION = process.env.AIRTABLE_TABLE_FERMENTACION;
    
    if (!AIRTABLE_TABLE_FERMENTACION) {
      console.error('❌ [SIRIUSBACTER-FIFO] AIRTABLE_TABLE_FERMENTACION no configurado');
      return { success: false, microorganismos: [], faltantes: ['PseudoMonas', 'AzosPirillum', 'AzotoBacter'] };
    }
    
    // Buscar microorganismos en estado "Disponible" en etapa "Fermentacion 100L"
    const filterFormula = encodeURIComponent(
      `AND({Estado} = 'Disponible', {Etapa Produccion} = 'Fermentacion 100L', {Total Litros} > 0)`
    );
    
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_FERMENTACION}?filterByFormula=${filterFormula}&sort[0][field]=Fecha Termina Fermentacion&sort[0][direction]=asc`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        }
      }
    );
    
    if (!response.ok) {
      console.error('❌ [SIRIUSBACTER-FIFO] Error consultando fermentación:', response.status);
      return { success: false, microorganismos: [], faltantes: ['PseudoMonas', 'AzosPirillum', 'AzotoBacter'] };
    }
    
    const data = await response.json();
    console.log('📊 [SIRIUSBACTER-FIFO] Registros encontrados:', data.records.length);
    
    // Agrupar por tipo de microorganismo y ordenar por fecha (FIFO)
    const microorganismosPorTipo: { [key: string]: any[] } = {
      'PseudoMonas': [],
      'AzosPirillum': [],
      'AzotoBacter': []
    };
    
    data.records.forEach((record: any) => {
      const microorganismo = record.fields['Microorganismo']?.[0]; // Es un array
      if (microorganismo && microorganismosPorTipo[microorganismo]) {
        microorganismosPorTipo[microorganismo].push({
          recordId: record.id,
          microorganismo: microorganismo,
          codigoLote: record.fields['Codigo Lote'],
          totalLitros: record.fields['Total Litros'],
          fechaTermina: record.fields['Fecha Termina Fermentacion'],
          fechaCreada: record.fields['Creada']
        });
      }
    });
    
    // Verificar disponibilidad y seleccionar el más antiguo de cada tipo
    const microorganismosSeleccionados = [];
    const faltantes = [];
    
    for (const tipoMicroorganismo of ['PseudoMonas', 'AzosPirillum', 'AzotoBacter']) {
      if (microorganismosPorTipo[tipoMicroorganismo].length > 0) {
        // Tomar el más antiguo (FIFO - ya ordenado por fecha)
        const seleccionado = microorganismosPorTipo[tipoMicroorganismo][0];
        microorganismosSeleccionados.push(seleccionado);
        console.log(`✅ [SIRIUSBACTER-FIFO] ${tipoMicroorganismo} disponible: ${seleccionado.codigoLote} (${seleccionado.totalLitros}L)`);
      } else {
        faltantes.push(tipoMicroorganismo);
        console.log(`❌ [SIRIUSBACTER-FIFO] ${tipoMicroorganismo} NO disponible en 100L`);
      }
    }
    
    return {
      success: faltantes.length === 0,
      microorganismos: microorganismosSeleccionados,
      faltantes: faltantes
    };
    
  } catch (error) {
    console.error('❌ [SIRIUSBACTER-FIFO] ERROR AL BUSCAR MICROORGANISMOS TERMINADOS:', error);
    return { success: false, microorganismos: [], faltantes: ['PseudoMonas', 'AzosPirillum', 'AzotoBacter'] };
  }
}

// Nueva función para registrar salida de fermentación
async function registrarSalidaFermentacion(microorganismosUsados: any[], cantidadPorMicroorganismo: number = 100) {
  try {
    console.log('📦 [SALIDA-FERMENTACION] ===== REGISTRANDO SALIDAS =====');
    
    const AIRTABLE_TABLE_SALIDA_FERMENTACION = process.env.AIRTABLE_TABLE_SALIDA_FERMENTACION || 'tbljasiyO9KCPCSRQ'; // ID de la tabla desde variable de entorno
    
    const registrosSalida = [];
    
    for (const microorganismo of microorganismosUsados) {
      const registroSalida = {
        fields: {
          'Fecha Evento': new Date().toISOString().split('T')[0], // Solo fecha YYYY-MM-DD
          'Cantidad Litros': cantidadPorMicroorganismo,
          'Lote Bacteria Alterada': [microorganismo.recordId] // Link al registro de fermentación
        }
      };
      
      console.log(`📦 [SALIDA-FERMENTACION] Registrando salida ${microorganismo.microorganismo}:`, registroSalida);
      
      const response = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_SALIDA_FERMENTACION}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            records: [registroSalida],
            typecast: true
          })
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        registrosSalida.push(result.records[0]);
        console.log(`✅ [SALIDA-FERMENTACION] Salida registrada: ${result.records[0].id}`);
      } else {
        const error = await response.json();
        console.error(`❌ [SALIDA-FERMENTACION] Error registrando salida:`, error);
        throw new Error(`Error registrando salida para ${microorganismo.microorganismo}`);
      }
    }
    
    return registrosSalida;
    
  } catch (error) {
    console.error('❌ [SALIDA-FERMENTACION] ERROR REGISTRANDO SALIDAS:', error);
    throw error;
  }
}

// Nueva función para actualizar fecha de empacado de microorganismos
async function actualizarFechaEmpacado(microorganismos: any[], realizaRegistro: string) {
  try {
    console.log('📦 [EMPACADO] ===== ACTUALIZANDO FECHA DE EMPACADO =====');
    
    const AIRTABLE_TABLE_FERMENTACION = process.env.AIRTABLE_TABLE_FERMENTACION;
    
    if (!AIRTABLE_TABLE_FERMENTACION) {
      throw new Error('AIRTABLE_TABLE_FERMENTACION no configurado');
    }

    const ahora = new Date();
    const microorganismosEmpacados = [];
    
    // Actualizar cada microorganismo para marcarlo como empacado
    for (const micro of microorganismos) {
      console.log(`📦 [EMPACADO] Empacando ${micro.microorganismo} (${micro.codigoLote})`);
      
      const updateData = {
        fields: {
          'Fecha Empacado': ahora.toISOString(),
          'Etapa Produccion': 'Empacado',
          'Observaciones': `${micro.observaciones || ''}\n\nEmpacado para SiriusBacter - ${ahora.toLocaleDateString()} por ${realizaRegistro}`.trim()
        }
      };
      
      console.log(`📦 [EMPACADO] Actualizando registro ${micro.recordId}:`, updateData);
      
      const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_FERMENTACION}/${micro.recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        console.error(`❌ [EMPACADO] Error al empacar ${micro.microorganismo}:`, response.status);
        continue;
      }
      
      const updatedRecord = await response.json();
      console.log(`✅ [EMPACADO] ${micro.microorganismo} empacado exitosamente`);
      
      microorganismosEmpacados.push({
        id: updatedRecord.id,
        microorganismo: micro.microorganismo,
        codigoLote: micro.codigoLote,
        fechaEmpacado: ahora.toISOString()
      });
    }
    
    return microorganismosEmpacados;
    
  } catch (error) {
    console.error('❌ [EMPACADO] Error:', error);
    throw error;
  }
}

// Nueva función para finalizar fermentación de microorganismos (actualizar fecha finalización)
async function finalizarFermentacionMicroorganismos(microorganismos: any[], realizaRegistro: string) {
  try {
    console.log('🏁 [FINALIZAR-FERMENTACION] ===== FINALIZANDO FERMENTACIÓN DE MICROORGANISMOS =====');
    
    const AIRTABLE_TABLE_FERMENTACION = process.env.AIRTABLE_TABLE_FERMENTACION;
    
    if (!AIRTABLE_TABLE_FERMENTACION) {
      throw new Error('AIRTABLE_TABLE_FERMENTACION no configurado');
    }

    const ahora = new Date();
    const microorganismosFinalizados = [];
    
    // Actualizar cada microorganismo para finalizar su fermentación
    for (const micro of microorganismos) {
      console.log(`🏁 [FINALIZAR-FERMENTACION] Finalizando ${micro.microorganismo} (${micro.codigoLote})`);
      
      const updateData = {
        fields: {
          'Fecha Termina Fermentacion': ahora.toISOString(),
          'Observaciones': `${micro.observaciones || ''}\n\nFermentación finalizada para SiriusBacter - ${ahora.toLocaleDateString()} por ${realizaRegistro}`.trim()
        }
      };
      
      console.log(`📦 [FINALIZAR-FERMENTACION] Actualizando registro ${micro.recordId}:`, updateData);
      
      const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_FERMENTACION}/${micro.recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        console.error(`❌ [FINALIZAR-FERMENTACION] Error al actualizar ${micro.microorganismo}:`, response.status);
        continue;
      }
      
      const updatedRecord = await response.json();
      console.log(`✅ [FINALIZAR-FERMENTACION] ${micro.microorganismo} finalizado exitosamente`);
      
      microorganismosFinalizados.push({
        id: updatedRecord.id,
        microorganismo: micro.microorganismo,
        codigoLote: micro.codigoLote,
        fechaFinalizada: ahora.toISOString()
      });
    }
    
    return microorganismosFinalizados;
    
  } catch (error) {
    console.error('❌ [FINALIZAR-FERMENTACION] Error:', error);
    throw error;
  }
}

// Nueva función para buscar microorganismo por nombre
async function buscarMicroorganismoPorNombre(nombreMicroorganismo: string) {
  try {
    console.log(`🔍 [BUSCAR-MICROORGANISMO] Buscando: "${nombreMicroorganismo}"`);
    
    if (!AIRTABLE_TABLE_MICROORGANISMOS) {
      throw new Error('AIRTABLE_TABLE_MICROORGANISMOS no configurado');
    }
    
    const filterFormula = encodeURIComponent(`SEARCH(UPPER("${nombreMicroorganismo}"), UPPER({Microorganismo}))`);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_MICROORGANISMOS}?filterByFormula=${filterFormula}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.records && data.records.length > 0) {
        const microorganismo = data.records[0];
        console.log(`✅ [BUSCAR-MICROORGANISMO] Encontrado: ${nombreMicroorganismo} -> ${microorganismo.id}`);
        return microorganismo.id;
      } else {
        console.log(`❌ [BUSCAR-MICROORGANISMO] NO encontrado: ${nombreMicroorganismo}`);
        return null;
      }
    } else {
      console.error(`❌ [BUSCAR-MICROORGANISMO] Error en API:`, response.status);
      return null;
    }
  } catch (error) {
    console.error(`❌ [BUSCAR-MICROORGANISMO] Error buscando ${nombreMicroorganismo}:`, error);
    return null;
  }
}

// Nueva función para crear Sirius Bacter finalizado
async function crearSiriusBacterFinalizado(microorganismosUsados: any[], observaciones: string, realizaRegistro: string, responsablesEquipo: string[], registrosSalida: any[] = []) {
  try {
    console.log('🧬 [SIRIUSBACTER-FINAL] ===== CREANDO SIRIUS BACTER FINALIZADO =====');
    
    const AIRTABLE_TABLE_FERMENTACION = process.env.AIRTABLE_TABLE_FERMENTACION;
    
    if (!AIRTABLE_TABLE_FERMENTACION) {
      throw new Error('AIRTABLE_TABLE_FERMENTACION no configurado');
    }
    
    // Buscar el ID de SiriusBacter dinámicamente
    const siriusBacterID = await buscarMicroorganismoPorNombre('Siriusbacter');
    if (!siriusBacterID) {
      throw new Error('No se pudo encontrar el microorganismo SiriusBacter en la base de datos');
    }
    
    // Solo el SiriusBacter ID en Microorganismos (para generar código "SB")
    const microorganismosIds = [siriusBacterID]; // SiriusBacter encontrado dinámicamente
    
    // Los IDs de los registros de fermentación originales para el campo Fermentacion
    const fermentacionIds = microorganismosUsados.map(micro => micro.recordId);
    console.log('🔗 [SIRIUSBACTER-FINAL] IDs de fermentación originales:', fermentacionIds);
    
    // Para SiriusBacter: todas las fechas son iguales (momento de habilitación del producto)
    const fechaHabilitacion = new Date();
    
    // Crear referencias a las salidas de fermentación para logging (NO se enlazarán al registro)
    const salidaFermentacionIds = registrosSalida.map(salida => salida.id);
    
    const recordDataFinal = {
      fields: {
        'Fecha Inicia Fermentacion': fechaHabilitacion.toISOString(),
        'Fecha Termina Fermentacion': fechaHabilitacion.toISOString(), // Misma fecha
        'Fecha Empacado': fechaHabilitacion.toISOString(), // Misma fecha
        'Cantidad Litros': 300, // 300L finales de SiriusBacter
        'Etapa Produccion': 'Empacado', // Producto listo para venta
        'Observaciones': `${observaciones} - SIRIUS BACTER FINALIZADO - Mezcla de: ${microorganismosUsados.map(m => `${m.microorganismo}(${m.codigoLote})`).join(', ')} - Salidas procesadas: ${salidaFermentacionIds.join(', ')}`,
        'Realiza Registro': realizaRegistro,
        'Microorganismos': microorganismosIds, // Solo SiriusBacter para código "SB"
        'Responsables': responsablesEquipo,
        'Fermentacion': fermentacionIds // Enlazar los registros de fermentación originales
        // NOTA: NO incluir 'Salida Fermentacion' para mantener Total Litros = 300
      }
    };
    
    console.log('📦 [SIRIUSBACTER-FINAL] Creando registro final:', JSON.stringify(recordDataFinal, null, 2));
    console.log('🔗 [SIRIUSBACTER-FINAL] Registros de fermentación vinculados:', fermentacionIds);
    console.log('� [SIRIUSBACTER-FINAL] Salidas procesadas (NO enlazadas):', salidaFermentacionIds);
    console.log('🏷️ [SIRIUSBACTER-FINAL] Etapa: Empacado (producto habilitado)');
    console.log('📅 [SIRIUSBACTER-FINAL] Fecha habilitación:', fechaHabilitacion.toISOString());
    
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_FERMENTACION}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [recordDataFinal],
          typecast: true
        })
      }
    );
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ [SIRIUSBACTER-FINAL] Sirius Bacter creado: ${result.records[0].id}`);
      console.log(`🔗 [SIRIUSBACTER-FINAL] Vinculado con fermentaciones: ${fermentacionIds.join(', ')}`);
      console.log(`🏷️ [SIRIUSBACTER-FINAL] Código de lote: Solo "SB"`);
      console.log(`📊 [SIRIUSBACTER-FINAL] Total Litros esperado: 300L (sin descuentos)`);
      console.log(`🎯 [SIRIUSBACTER-FINAL] Estado: Empacado y disponible para venta`);
      return result.records[0];
    } else {
      const error = await response.json();
      console.error(`❌ [SIRIUSBACTER-FINAL] Error creando Sirius Bacter final:`, error);
      throw new Error('Error creando Sirius Bacter final');
    }
    
  } catch (error) {
    console.error('❌ [SIRIUSBACTER-FINAL] ERROR CREANDO SIRIUS BACTER:', error);
    throw error;
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
      // Si la fecha viene en formato ISO (como desde el frontend directo), usarla directamente
      if (fechaInicio.includes('T')) {
        fechaInicioDate = new Date(fechaInicio);
      } else {
        // Si viene en formato YYYY-MM-DD (como del formulario), procesarla localmente
        const [year, month, day] = fechaInicio.split('-').map(Number);
        fechaInicioDate = new Date(year, month - 1, day); // month - 1 porque Date usa 0-11 para meses
      }
    } else {
      fechaInicioDate = new Date();
    }
    
    // Validar que la fecha es válida
    if (isNaN(fechaInicioDate.getTime())) {
      console.error('❌ [PROD-DEBUG] Fecha de inicio inválida:', fechaInicio);
      return NextResponse.json({
        success: false,
        error: 'Fecha de inicio inválida',
        details: `Fecha recibida: ${fechaInicio}`
      }, { status: 400 });
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
        } else if (nombreMicroorganismo === 'SiriusBacter' || nombreMicroorganismo === 'Siriusbacter') {
          console.log('🧬 [SIRIUSBACTER-FIFO] ===== ES SIRIUSBACTER - INICIANDO PROCESO FIFO =====');
          
          // Para SiriusBacter, buscar microorganismos terminados en 100L usando lógica FIFO
          try {
            // Buscar microorganismos terminados en 100L disponibles
            const resultadoBusqueda = await buscarMicroorganismosTerminados100L();
            console.log('🧬 [SIRIUSBACTER-FIFO] Resultado búsqueda:', resultadoBusqueda);
            
            if (!resultadoBusqueda.success) {
              console.error('❌ [SIRIUSBACTER-FIFO] Microorganismos faltantes:', resultadoBusqueda.faltantes);
              
              return NextResponse.json({
                success: false,
                error: 'Microorganismos requeridos no están disponibles en 100L para producir SiriusBacter',
                details: `Microorganismos faltantes en 100L: ${resultadoBusqueda.faltantes.join(', ')}`,
                microorganismosRequeridos: ['PseudoMonas', 'AzosPirillum', 'AzotoBacter'],
                microorganismosDisponibles: resultadoBusqueda.microorganismos.map(m => m.microorganismo),
                faltantes: resultadoBusqueda.faltantes,
                accion: 'Ir a almacenamiento para verificar disponibilidad',
                redirectToAlmacenamiento: true
              }, { status: 200 });
            }
            
            console.log('✅ [SIRIUSBACTER-FIFO] Todos los microorganismos disponibles. Iniciando proceso...');
            
            // 1. Actualizar fecha de empacado de los microorganismos usados
            const microorganismosEmpacados = await actualizarFechaEmpacado(
              resultadoBusqueda.microorganismos,
              realizaRegistro || 'Sistema'
            );
            console.log('📦 [SIRIUSBACTER-FIFO] Microorganismos empacados:', microorganismosEmpacados.length);
            
            // 2. Registrar salida de fermentación de los microorganismos usados
            const registrosSalida = await registrarSalidaFermentacion(resultadoBusqueda.microorganismos, 100);
            console.log('📦 [SIRIUSBACTER-FIFO] Salidas registradas:', registrosSalida.length);
            
            // 3. Crear el registro final de SiriusBacter
            const siriusBacterFinal = await crearSiriusBacterFinalizado(
              resultadoBusqueda.microorganismos,
              observaciones || 'Producción SiriusBacter desde microorganismos terminados 100L',
              realizaRegistro || 'Sistema',
              responsablesEquipo || [],
              registrosSalida // Pasar los registros de salida para enlazar
            );
            
            console.log('🎉 [SIRIUSBACTER-FIFO] PROCESO COMPLETADO:', siriusBacterFinal.id);
            
            // Retornar respuesta específica para SiriusBacter FIFO
            return NextResponse.json({
              success: true,
              message: `SiriusBacter creado exitosamente desde ${microorganismosEmpacados.length} microorganismos`,
              tipoProduccion: 'SiriusBacter Final (FIFO)',
              siriusBacterFinal: {
                id: siriusBacterFinal.id,
                codigoLote: siriusBacterFinal.fields['Codigo Lote'],
                volumenFinal: '300L',
                etapa: 'Fermentacion'
              },
              microorganismosUsados: resultadoBusqueda.microorganismos.map(m => ({
                tipo: m.microorganismo,
                lote: m.codigoLote,
                litrosUsados: 100,
                fechaEmpacado: new Date().toISOString()
              })),
              registrosSalida: registrosSalida.map(r => r.id),
              fechaCreacion: new Date().toISOString(),
              estadoFinal: 'SiriusBacter disponible para venta',
              resumenProceso: {
                descripcion: 'SiriusBacter creado mezclando los 3 microorganismos más antiguos disponibles en 100L',
                tiempoTotal: '24 horas (mezcla final)',
                volumenFinal: '300L',
                microorganismosOriginales: resultadoBusqueda.microorganismos.map((m: any) => `${m.microorganismo} (${m.codigoLote})`)
              }
            });
            
          } catch (siriusBacterError) {
            console.error('❌ [SIRIUSBACTER-FIFO] ERROR EN PROCESO:', siriusBacterError);
            return NextResponse.json({
              success: false,
              error: 'Error al crear SiriusBacter desde microorganismos terminados',
              details: siriusBacterError instanceof Error ? siriusBacterError.message : 'Error desconocido',
              tipoProduccion: 'SiriusBacter Final (FIFO)'
            }, { status: 500 });
          }
        } else if (nombreMicroorganismo === 'PseudoMonas' || 
                   nombreMicroorganismo === 'AzosPirillum' || 
                   nombreMicroorganismo === 'AzotoBacter') {
          console.log(`🧪 [MICROORGANISMO-INDIVIDUAL] ===== ES ${nombreMicroorganismo} - ESCALADO 50ML =====`);
          
          // Para microorganismos individuales, crear registro directo en Escalado 50ml
          const AIRTABLE_TABLE_FERMENTACION = process.env.AIRTABLE_TABLE_FERMENTACION;
          const AIRTABLE_TABLE_USUARIOS = process.env.AIRTABLE_TABLE_EQUIPO_LABORATORIO;
          
          if (!AIRTABLE_TABLE_FERMENTACION) {
            console.error('❌ AIRTABLE_TABLE_FERMENTACION no configurado');
            return NextResponse.json({
              success: false,
              error: 'Tabla de fermentación no configurada'
            }, { status: 500 });
          }

          // Buscar record IDs de los responsables por nombre
          const responsablesIds: string[] = [];
          if (responsablesEquipo && responsablesEquipo.length > 0 && AIRTABLE_TABLE_USUARIOS) {
            console.log(`🔍 [${nombreMicroorganismo}] Buscando responsables:`, responsablesEquipo);
            
            try {
              for (const nombreResponsable of responsablesEquipo) {
                const usuarioResponse = await fetch(
                  `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_USUARIOS}?filterByFormula=SEARCH("${nombreResponsable}",{Nombre})`,
                  {
                    headers: {
                      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                    }
                  }
                );
                
                if (usuarioResponse.ok) {
                  const usuarioData = await usuarioResponse.json();
                  if (usuarioData.records && usuarioData.records.length > 0) {
                    responsablesIds.push(usuarioData.records[0].id);
                    console.log(`✅ [${nombreMicroorganismo}] Usuario encontrado: ${nombreResponsable} -> ${usuarioData.records[0].id}`);
                  } else {
                    console.warn(`⚠️ [${nombreMicroorganismo}] Usuario no encontrado: ${nombreResponsable}`);
                  }
                }
              }
            } catch (error) {
              console.error(`❌ [${nombreMicroorganismo}] Error buscando responsables:`, error);
            }
          }
          
          // Calcular fechas para 24 horas (escalado 50ml)
          let fechaInicioDate: Date;
          if (fechaInicio) {
            // Si la fecha viene en formato ISO (como desde el frontend directo), usarla directamente
            if (fechaInicio.includes('T')) {
              fechaInicioDate = new Date(fechaInicio);
            } else {
              // Si viene en formato YYYY-MM-DD (como del formulario), procesarla localmente
              const [year, month, day] = fechaInicio.split('-').map(Number);
              fechaInicioDate = new Date(year, month - 1, day);
            }
          } else {
            fechaInicioDate = new Date();
          }
          
          // Validar que la fecha es válida
          if (isNaN(fechaInicioDate.getTime())) {
            console.error(`❌ [${nombreMicroorganismo}] Fecha de inicio inválida:`, fechaInicio);
            return NextResponse.json({
              success: false,
              error: 'Fecha de inicio inválida para microorganismo individual',
              details: `Fecha recibida: ${fechaInicio}`
            }, { status: 400 });
          }
          
          const fechaFinalizacion = new Date(fechaInicioDate);
          
          // Calcular duración total del proceso completo para el microorganismo individual
          let duracionTotalHoras = 0;
          
          // Etapas de escalado (aplican a todos): 50ml + 250ml + 800ml = 72 horas
          duracionTotalHoras += 24 + 24 + 24; // 72 horas de escalado
          
          // Fermentaciones específicas por microorganismo
          if (nombreMicroorganismo === 'PseudoMonas') {
            duracionTotalHoras += 12 + 12 + 72; // 12L + 100L + Final = 96 horas
          } else if (nombreMicroorganismo === 'AzosPirillum') {
            duracionTotalHoras += 24 + 24 + 72; // 12L + 100L + Final = 120 horas
          } else if (nombreMicroorganismo === 'AzotoBacter') {
            duracionTotalHoras += 36 + 36 + 72; // 12L + 100L + Final = 144 horas
          }
          
          // Sumar las horas totales a la fecha de inicio
          fechaFinalizacion.setHours(fechaFinalizacion.getHours() + duracionTotalHoras);
          
          console.log(`📅 [${nombreMicroorganismo}] Fecha inicio:`, fechaInicioDate.toISOString());
          console.log(`📅 [${nombreMicroorganismo}] Duración total: ${duracionTotalHoras} horas (${Math.round(duracionTotalHoras/24*10)/10} días)`);
          console.log(`📅 [${nombreMicroorganismo}] Fecha fin estimada:`, fechaFinalizacion.toISOString());

          // Preparar datos para el registro de Escalado 50ml
          const recordData = {
            fields: {
              'Fecha Inicia Fermentacion': fechaInicioDate.toISOString(),
              'Fecha Termina Fermentacion': fechaFinalizacion.toISOString(),
              'Fecha Inicia Escalado 50ml': fechaInicioDate.toISOString(),
              'Cantidad Litros': 0.05, // 50ml = 0.05L
              'Etapa Produccion': 'Escalado 50ml',
              'Observaciones': `${observaciones || ''} - Escalado inicial ${nombreMicroorganismo} (50ml) - Proceso completo estimado: ${Math.round(duracionTotalHoras/24*10)/10} días`,
              'Realiza Registro': realizaRegistro || 'Sistema',
              'Microorganismos': [microorganismoId],
              'Responsables': responsablesIds.length > 0 ? responsablesIds : []
            }
          };          console.log(`📦 [${nombreMicroorganismo}] Datos para Airtable:`, JSON.stringify(recordData, null, 2));
          console.log(`👥 [${nombreMicroorganismo}] Responsables IDs encontrados:`, responsablesIds);
          
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
          console.log(`📊 [${nombreMicroorganismo}] Respuesta de Airtable:`, JSON.stringify(airtableResult, null, 2));
          
          if (!airtableResponse.ok) {
            console.error(`❌ [${nombreMicroorganismo}] Error de Airtable:`, airtableResult);
            return NextResponse.json({
              success: false,
              error: `Error al crear registro de escalado para ${nombreMicroorganismo}`,
              details: airtableResult
            }, { status: 500 });
          }
          
          const createdRecord = airtableResult.records[0];
          console.log(`✅ [${nombreMicroorganismo}] Registro creado exitosamente:`, createdRecord.id);
          
          // Retornar respuesta específica para microorganismo individual
          return NextResponse.json({
            success: true,
            message: `Escalado de ${nombreMicroorganismo} iniciado exitosamente`,
            tipoProduccion: 'Microorganismo Individual - Escalado 50ml',
            microorganismo: nombreMicroorganismo,
            fermentacionId: createdRecord.id,
            fechaInicio: fechaInicioDate.toISOString(),
            fechaFinalizacion: fechaFinalizacion.toISOString(),
            volumen: '50ml (0.05L)',
            etapa: 'Escalado 50ml',
            duracion: `${duracionTotalHoras} horas (${Math.round(duracionTotalHoras/24*10)/10} días proceso completo)`,
            duracionCompleta: `${Math.round(duracionTotalHoras/24*10)/10} días`,
            cantidadLitros: 0.05,
            observaciones: observaciones || '',
            realizaRegistro: realizaRegistro || 'Sistema'
          });
          
        } else {
          console.log('❌ [PROD-DEBUG] MICROORGANISMO NO RECONOCIDO - Proceso estándar');
          console.log('🔍 [PROD-DEBUG] Nombres esperados: "Bacillus thuringiensis", "Siriusbacter", "PseudoMonas", "AzosPirillum", "AzotoBacter"');
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
