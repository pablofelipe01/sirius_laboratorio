import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configuración de Airtable con variables de entorno
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_BASE_ID!);

export async function POST(request: NextRequest) {
  console.log('📦 API SALIDA-INSUMOS AUTO: Iniciando creación automática con lógica FIFO...');
  
  try {
    const body = await request.json();
    const { registros, inoculacionId, cepaId, fermentacionId } = body;

    if (!registros || registros.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No se recibieron registros para procesar' 
      }, { status: 400 });
    }

    // Validar que se proporcione al menos uno de los IDs de referencia
    if (!inoculacionId && !cepaId && !fermentacionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Debe proporcionarse inoculacionId, cepaId o fermentacionId' 
      }, { status: 400 });
    }

    const tipoEvento = inoculacionId ? 'inoculación' : cepaId ? 'cepa' : 'fermentación';
    const referenciaId = inoculacionId || cepaId || fermentacionId;
    
    console.log(`📋 API SALIDA-INSUMOS AUTO: Procesando ${registros.length} insumos con lógica FIFO para ${tipoEvento} ${referenciaId}`);
    
    // Procesar cada insumo usando lógica FIFO
    for (const registro of registros) {
      try {
        console.log(`🔍 Procesando insumo: ${registro.insumoId} - Cantidad necesaria: ${registro.cantidad} gramos`);
        console.log(`📋 Registro completo:`, registro);
        
        // Calcular cuántas unidades necesitamos (convertir gramos a unidades)
        const unidadesNecesarias = registro.cantidad / registro.equivalenciaGramos;
        console.log(`🔢 Conversión: ${registro.cantidad}g = ${unidadesNecesarias} unidades (${registro.equivalenciaGramos}g por unidad)`);
        
        // 1. Obtener todas las entradas de este insumo ordenadas por fecha (FIFO)
        console.log(`📡 Consultando entradas de insumo ${registro.insumoId}...`);
        
        const entradasResponse = await base(process.env.AIRTABLE_TABLE_ENTRADA_INSUMOS!)
          .select({
            filterByFormula: `FIND("${registro.insumoId}", ARRAYJOIN({Insumos Laboratorio}, ","))`,
            sort: [{ field: "fecha_ingreso", direction: "asc" }] // Ordenar del más viejo al más nuevo
          })
          .all();

        console.log(`📊 Encontradas ${entradasResponse.length} entradas para el insumo ${registro.insumoId}`);
        
        if (entradasResponse.length === 0) {
          throw new Error(`No se encontraron entradas para el insumo ${registro.insumoId}`);
        }

        let unidadesRestantes = unidadesNecesarias;
        const salidasACrear = [];

        // 2. Procesar cada entrada en orden FIFO hasta cubrir la cantidad necesaria
        for (const entrada of entradasResponse) {
          if (unidadesRestantes <= 0) break;

          // Usar cantidad disponible en unidades, no en granos
          const unidadesDisponibles = Number(entrada.fields['Cantidad Ingresa Unidades'] || 0);
          // Obtener cuánto se ha usado ya de esta entrada
          const salidasArray = entrada.fields['Cantidad Salida Unidades (from Salida Insumos)'];
          const unidadesUsadas = Array.isArray(salidasArray) 
            ? salidasArray.reduce((sum: number, val: any) => sum + Number(val), 0) 
            : 0;
          const unidadesReales = unidadesDisponibles - unidadesUsadas;
          
          console.log(`📦 Entrada ${entrada.id}: Ingresadas ${unidadesDisponibles}, Usadas ${unidadesUsadas}, Disponibles ${unidadesReales} unidades`);

          if (unidadesReales > 0) {
            const unidadesAUsar = Math.min(unidadesRestantes, unidadesReales);
            console.log(`📤 Usando ${unidadesAUsar} unidades de la entrada ${entrada.id}`);

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
        if (unidadesRestantes > 0) {
          throw new Error(`Stock insuficiente para el insumo ${registro.insumoId}. Faltan ${unidadesRestantes} unidades`);
        }

        // 4. Crear todos los registros de salida para este insumo
        if (salidasACrear.length > 0) {
          console.log(`📡 Creando ${salidasACrear.length} registros de salida para insumo ${registro.insumoId}...`);
          
          const salidasCreadas = await base(process.env.AIRTABLE_TABLE_SALIDA_INSUMOS!)
            .create(salidasACrear);
          
          console.log(`✅ Creados ${salidasCreadas.length} registros de salida para insumo ${registro.insumoId}`);
        }

      } catch (insumoError) {
        console.error(`❌ Error procesando insumo ${registro.insumoId}:`, insumoError);
        throw new Error(`Error en insumo ${registro.insumoId}: ${insumoError instanceof Error ? insumoError.message : 'Error desconocido'}`);
      }
    }

    console.log('✅ API SALIDA-INSUMOS AUTO: Todos los insumos procesados exitosamente con lógica FIFO');
    
    return NextResponse.json({
      success: true,
      message: 'Salidas de insumos creadas exitosamente con lógica FIFO',
      procesados: registros.length
    });

  } catch (error) {
    console.error('❌ API SALIDA-INSUMOS AUTO: Error general:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al procesar salidas automáticas'
    }, { status: 500 });
  }
}
