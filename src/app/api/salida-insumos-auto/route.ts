import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configuración de Airtable con variables de entorno
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_BASE_ID!);

export async function POST(request: NextRequest) {
  console.log('📦 [PROD-DEBUG] ===== API SALIDA-INSUMOS AUTO INICIADA =====');
  console.log('🌍 [PROD-DEBUG] Environment:', process.env.NODE_ENV);
  console.log('📅 [PROD-DEBUG] Timestamp:', new Date().toISOString());
  
  try {
    const body = await request.json();
    console.log('📦 [PROD-DEBUG] Request body completo:', JSON.stringify(body, null, 2));
    
    const { registros, inoculacionId, cepaId, fermentacionId } = body;

    console.log('🔍 [PROD-DEBUG] Datos extraídos:');
    console.log('  - registros.length:', registros?.length || 0);
    console.log('  - inoculacionId:', inoculacionId);
    console.log('  - cepaId:', cepaId);
    console.log('  - fermentacionId:', fermentacionId);
    console.log('  - registros detalle:', JSON.stringify(registros, null, 2));

    console.log('🔍 [PROD-DEBUG] Validando datos recibidos...');
    
    if (!registros || registros.length === 0) {
      console.error('❌ [PROD-DEBUG] No se recibieron registros para procesar');
      return NextResponse.json({ 
        success: false, 
        error: 'No se recibieron registros para procesar' 
      }, { status: 400 });
    }

    // Validar que se proporcione al menos uno de los IDs de referencia
    if (!inoculacionId && !cepaId && !fermentacionId) {
      console.error('❌ [PROD-DEBUG] Falta ID de referencia');
      return NextResponse.json({ 
        success: false, 
        error: 'Debe proporcionarse inoculacionId, cepaId o fermentacionId' 
      }, { status: 400 });
    }

    const tipoEvento = inoculacionId ? 'inoculación' : cepaId ? 'cepa' : 'fermentación';
    const referenciaId = inoculacionId || cepaId || fermentacionId;
    
    console.log(`📋 [PROD-DEBUG] ===== PROCESANDO ${registros.length} INSUMOS CON LÓGICA FIFO =====`);
    console.log(`📋 [PROD-DEBUG] Tipo de evento: ${tipoEvento}`);
    console.log(`📋 [PROD-DEBUG] ID de referencia: ${referenciaId}`);
    
    // Procesar cada insumo usando lógica FIFO
    for (const registro of registros) {
      console.log(`🔍 [PROD-DEBUG] ===== PROCESANDO INSUMO ${registro.insumoId} =====`);
      console.log(`🔍 [PROD-DEBUG] Registro completo:`, JSON.stringify(registro, null, 2));
      console.log(`🔍 [PROD-DEBUG] Cantidad necesaria: ${registro.cantidad} gramos`);
      console.log(`🔍 [PROD-DEBUG] Equivalencia: ${registro.equivalenciaGramos} gramos por unidad`);
      
      try {
        console.log(`📋 [PROD-DEBUG] Registro completo:`, JSON.stringify(registro, null, 2));
        
        // Calcular cuántas unidades necesitamos (convertir gramos a unidades)
        const unidadesNecesarias = registro.cantidad / registro.equivalenciaGramos;
        console.log(`🔢 [PROD-DEBUG] Conversión: ${registro.cantidad}g ÷ ${registro.equivalenciaGramos}g/unidad = ${unidadesNecesarias} unidades`);
        
        // 1. Obtener todas las entradas de este insumo ordenadas por fecha (FIFO)
        console.log(`📡 [PROD-DEBUG] ===== CONSULTANDO ENTRADAS DE INSUMO ${registro.insumoId} =====`);
        console.log(`🗄️ [PROD-DEBUG] Tabla: ${process.env.AIRTABLE_TABLE_ENTRADA_INSUMOS}`);
        
        const filtroFormula = `FIND("${registro.insumoId}", ARRAYJOIN({Insumos Laboratorio}, ","))`;
        console.log(`🔍 [PROD-DEBUG] Fórmula de filtro: ${filtroFormula}`);
        
        const entradasResponse = await base(process.env.AIRTABLE_TABLE_ENTRADA_INSUMOS!)
          .select({
            filterByFormula: filtroFormula,
            sort: [{ field: "fecha_ingreso", direction: "asc" }] // Ordenar del más viejo al más nuevo
          })
          .all();

        console.log(`📊 [PROD-DEBUG] Encontradas ${entradasResponse.length} entradas para el insumo ${registro.insumoId}`);
        console.log(`📊 [PROD-DEBUG] Lista de entradas:`, entradasResponse.map(e => ({
          id: e.id,
          fecha: e.fields.fecha_ingreso,
          cantidad: e.fields['Cantidad Entrada Unidades'],
          usado: e.fields['Cantidad Usada Unidades'] || 0
        })));
        
        if (entradasResponse.length === 0) {
          console.error(`❌ [PROD-DEBUG] No se encontraron entradas para el insumo ${registro.insumoId}`);
          throw new Error(`No se encontraron entradas para el insumo ${registro.insumoId}`);
        }

        let unidadesRestantes = unidadesNecesarias;
        const salidasACrear = [];
        console.log(`🔄 [PROD-DEBUG] ===== INICIANDO LÓGICA FIFO =====`);
        console.log(`🔄 [PROD-DEBUG] Unidades necesarias: ${unidadesNecesarias}`);
        console.log(`🔄 [PROD-DEBUG] Unidades restantes iniciales: ${unidadesRestantes}`);

        // 2. Procesar cada entrada en orden FIFO hasta cubrir la cantidad necesaria
        for (const entrada of entradasResponse) {
          if (unidadesRestantes <= 0) {
            console.log(`✅ [PROD-DEBUG] Ya se cubrió toda la cantidad necesaria, saliendo del bucle`);
            break;
          }

          console.log(`📦 [PROD-DEBUG] ===== PROCESANDO ENTRADA ${entrada.id} =====`);
          console.log(`📦 [PROD-DEBUG] Entrada completa:`, JSON.stringify(entrada.fields, null, 2));
          
          // Usar cantidad disponible en unidades, no en granos
          const unidadesDisponibles = Number(entrada.fields['Cantidad Ingresa Unidades'] || 0);
          console.log(`📦 [PROD-DEBUG] Unidades disponibles en entrada: ${unidadesDisponibles}`);
          
          // Obtener cuánto se ha usado ya de esta entrada
          const salidasArray = entrada.fields['Cantidad Salida Unidades (from Salida Insumos)'];
          console.log(`📦 [PROD-DEBUG] Array de salidas:`, salidasArray);
          
          const unidadesUsadas = Array.isArray(salidasArray) 
            ? salidasArray.reduce((sum: number, val: any) => sum + Number(val), 0) 
            : 0;
          console.log(`📦 [PROD-DEBUG] Unidades ya usadas: ${unidadesUsadas}`);
          
          const unidadesReales = unidadesDisponibles - unidadesUsadas;
          console.log(`📦 [PROD-DEBUG] Unidades realmente disponibles: ${unidadesReales}`);
          
          console.log(`📦 [PROD-DEBUG] Resumen entrada ${entrada.id}: Ingresadas ${unidadesDisponibles}, Usadas ${unidadesUsadas}, Disponibles ${unidadesReales} unidades`);

          if (unidadesReales > 0) {
            const unidadesAUsar = Math.min(unidadesRestantes, unidadesReales);
            console.log(`📤 [PROD-DEBUG] ===== CREANDO REGISTRO DE SALIDA =====`);
            console.log(`📤 [PROD-DEBUG] Unidades a usar: ${unidadesAUsar} (min entre ${unidadesRestantes} restantes y ${unidadesReales} disponibles)`);

            // Crear registro de salida para esta entrada específica
            const registroSalida: {
              fields: {
                'Cantidad Salida Unidades': number;
                'Fecha Evento': string;
                'Entrada': string[];
                'Insumos Laboratorio': string[];
                'Nombre Evento': string;
                'Realiza Registro': string;
                'Inoculacion'?: string[];
                'Cepa'?: string[];
                'Cepas'?: string[];
                'Fermentacion'?: string[];
              };
            } = {
              fields: {
                'Cantidad Salida Unidades': unidadesAUsar,
                'Fecha Evento': registro.fecha,
                'Entrada': [entrada.id],
                'Insumos Laboratorio': [registro.insumoId],
                'Nombre Evento': registro.nombreEvento,
                'Realiza Registro': registro.userName
              }
            };

            // Agregar referencia según el tipo de evento
            if (inoculacionId) {
              registroSalida.fields['Inoculacion'] = [inoculacionId];
            }
            if (cepaId) {
              registroSalida.fields['Cepas'] = [cepaId]; // Usar 'Cepas' (plural) según documentación
            }
            if (fermentacionId) {
              registroSalida.fields['Fermentacion'] = [fermentacionId]; // Vincular a la fermentación
            }

            console.log(`📋 Registro a crear en Airtable:`, registroSalida);
            salidasACrear.push(registroSalida);

            unidadesRestantes -= unidadesAUsar;
            console.log(`📊 Unidades restantes: ${unidadesRestantes}`);
          }
        }

        // 3. Verificar que se pudo cubrir toda la cantidad necesaria
        console.log(`🔍 [PROD-DEBUG] ===== VERIFICACIÓN FINAL =====`);
        console.log(`🔍 [PROD-DEBUG] Unidades restantes: ${unidadesRestantes}`);
        console.log(`🔍 [PROD-DEBUG] Registros de salida a crear: ${salidasACrear.length}`);
        console.log(`🔍 [PROD-DEBUG] Detalles registros salida:`, JSON.stringify(salidasACrear, null, 2));
        
        if (unidadesRestantes > 0) {
          console.error(`❌ [PROD-DEBUG] Stock insuficiente para el insumo ${registro.insumoId}. Faltan ${unidadesRestantes} unidades`);
          throw new Error(`Stock insuficiente para el insumo ${registro.insumoId}. Faltan ${unidadesRestantes} unidades`);
        }

        // 4. Crear todos los registros de salida para este insumo
        if (salidasACrear.length > 0) {
          console.log(`📡 [PROD-DEBUG] ===== CREANDO REGISTROS EN AIRTABLE =====`);
          console.log(`📡 [PROD-DEBUG] Creando ${salidasACrear.length} registros de salida para insumo ${registro.insumoId}...`);
          console.log(`🗄️ [PROD-DEBUG] Tabla destino: ${process.env.AIRTABLE_TABLE_SALIDA_INSUMOS}`);
          
          const salidasCreadas = await base(process.env.AIRTABLE_TABLE_SALIDA_INSUMOS!)
            .create(salidasACrear);
          
          console.log(`✅ [PROD-DEBUG] Creados ${salidasCreadas.length} registros de salida para insumo ${registro.insumoId}`);
          console.log(`✅ [PROD-DEBUG] IDs creados:`, salidasCreadas.map(s => s.id));
        }

      } catch (insumoError) {
        console.error(`❌ [PROD-DEBUG] Error procesando insumo ${registro.insumoId}:`, insumoError);
        console.error(`❌ [PROD-DEBUG] Stack trace:`, insumoError instanceof Error ? insumoError.stack : 'No stack available');
        throw new Error(`Error en insumo ${registro.insumoId}: ${insumoError instanceof Error ? insumoError.message : 'Error desconocido'}`);
      }
    }

    console.log('✅ [PROD-DEBUG] ===== TODOS LOS INSUMOS PROCESADOS EXITOSAMENTE =====');
    console.log('✅ [PROD-DEBUG] API SALIDA-INSUMOS AUTO: Procesamiento completado con lógica FIFO');
    
    const respuestaExito = {
      success: true,
      message: 'Salidas de insumos creadas exitosamente con lógica FIFO',
      procesados: registros.length
    };
    
    console.log('📤 [PROD-DEBUG] Respuesta de éxito:', JSON.stringify(respuestaExito, null, 2));
    
    return NextResponse.json(respuestaExito);

  } catch (error) {
    console.error('❌ [PROD-DEBUG] ===== ERROR GENERAL EN API SALIDA-INSUMOS-AUTO =====');
    console.error('❌ [PROD-DEBUG] Error completo:', error);
    console.error('❌ [PROD-DEBUG] Stack trace:', error instanceof Error ? error.stack : 'No stack available');
    console.error('❌ [PROD-DEBUG] Tipo de error:', typeof error);
    
    const respuestaError = {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al procesar salidas automáticas'
    };
    
    console.log('📤 [PROD-DEBUG] Respuesta de error:', JSON.stringify(respuestaError, null, 2));
    
    return NextResponse.json(respuestaError, { status: 500 });
  }
}
