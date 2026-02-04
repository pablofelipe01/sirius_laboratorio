import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configuración de Airtable con variables de entorno
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_BASE_ID!);

/**
 * API para registrar salidas de insumos automáticamente
 * 
 * La cantidad viene ya calculada: cantidadSalida = bolsas × factor/bolsa
 * Usa lógica FIFO para descontar de las entradas más antiguas primero
 * 
 * Campos Airtable relevantes:
 * - Entrada Insumos: 'Cantidad Ingresa Insumo', 'Total Cantidad Granel Actual'
 * - Salida Insumos: 'Cantidad Salida Unidades'
 */
export async function POST(request: NextRequest) {
  console.log('📦 ===== API SALIDA-INSUMOS AUTO INICIADA =====');
  console.log('📅 Timestamp:', new Date().toISOString());
  
  // Validación de variables de entorno
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    console.error('❌ FATAL: Variables de entorno de Airtable no configuradas');
    return NextResponse.json({ 
      success: false, 
      error: 'Error de configuración: Variables de Airtable no configuradas'
    }, { status: 500 });
  }
  
  try {
    const body = await request.json();
    const { registros, inoculacionId, cepaId, fermentacionId } = body;

    console.log('📋 Registros recibidos:', registros?.length || 0);
    console.log('📋 Referencias:', { inoculacionId, cepaId, fermentacionId });
    
    if (!registros || registros.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No se recibieron registros para procesar' 
      }, { status: 400 });
    }

    if (!inoculacionId && !cepaId && !fermentacionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Debe proporcionarse inoculacionId, cepaId o fermentacionId' 
      }, { status: 400 });
    }

    const tipoEvento = inoculacionId ? 'inoculación' : cepaId ? 'cepa' : 'fermentación';
    console.log(`📋 Procesando ${registros.length} insumos para ${tipoEvento} con lógica FIFO`);
    
    // Procesar cada insumo usando lógica FIFO
    for (const registro of registros) {
      // La cantidad ya viene calculada: cantidadSalida = bolsas × factor
      const cantidadNecesaria = registro.cantidadSalida;
      
      // Obtener nombre del insumo para mensajes de error
      let insumoNombre = `ID: ${registro.insumoId}`;
      try {
        const insumoRecord = await base(process.env.AIRTABLE_TABLE_INSUMOS_LABORATORIO!)
          .find(registro.insumoId);
        if (insumoRecord.fields.nombre && typeof insumoRecord.fields.nombre === 'string') {
          insumoNombre = insumoRecord.fields.nombre;
        }
      } catch (error) {
        console.warn(`⚠️ No se pudo obtener el nombre del insumo ${registro.insumoId}`);
      }
      
      console.log(`🔍 Procesando: ${insumoNombre} - Cantidad: ${cantidadNecesaria}`);
      
      try {
        // 1. Obtener todas las entradas de este insumo ordenadas por fecha (FIFO)
        const filtroFormula = `FIND("${registro.insumoId}", ARRAYJOIN({Insumos Laboratorio}, ","))`;
        
        const entradasResponse = await base(process.env.AIRTABLE_TABLE_ENTRADA_INSUMOS!)
          .select({
            filterByFormula: filtroFormula,
            sort: [{ field: "fecha_ingreso", direction: "asc" }] // FIFO: más antiguas primero
          })
          .all();

        console.log(`📊 Encontradas ${entradasResponse.length} entradas para ${insumoNombre}`);
        
        if (entradasResponse.length === 0) {
          throw new Error(`No se encontraron entradas para el insumo ${insumoNombre}`);
        }

        let cantidadRestante = cantidadNecesaria;
        const salidasACrear: { fields: Record<string, any> }[] = [];

        // 2. Procesar cada entrada en orden FIFO hasta cubrir la cantidad necesaria
        for (const entrada of entradasResponse) {
          if (cantidadRestante <= 0) break;

          // Cantidad ingresada originalmente
          const cantidadIngresada = Number(entrada.fields['Cantidad Ingresa Insumo'] || 0);
          
          // Cantidad ya usada (suma de salidas vinculadas a esta entrada)
          const salidasArray = entrada.fields['Cantidad Salida Unidades (from Salida Insumos)'];
          const cantidadUsada = Array.isArray(salidasArray) 
            ? salidasArray.reduce((sum: number, val: any) => sum + Number(val), 0) 
            : 0;
          
          // Disponible = Ingresada - Usada
          const cantidadDisponible = cantidadIngresada - cantidadUsada;
          
          console.log(`  📦 Entrada ${entrada.id}: Ingresada ${cantidadIngresada}, Usada ${cantidadUsada}, Disponible ${cantidadDisponible}`);

          if (cantidadDisponible > 0) {
            // Tomar lo que se pueda de esta entrada
            const cantidadAUsar = Math.min(cantidadRestante, cantidadDisponible);
            
            // Crear registro de salida vinculado a esta entrada específica
            const registroSalida: { fields: Record<string, any> } = {
              fields: {
                'Cantidad Salida Unidades': cantidadAUsar,
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
              registroSalida.fields['Cepas'] = [cepaId];
            }
            if (fermentacionId) {
              registroSalida.fields['Fermentacion'] = [fermentacionId];
            }

            salidasACrear.push(registroSalida);
            cantidadRestante -= cantidadAUsar;
            
            console.log(`  📤 Salida: ${cantidadAUsar} de entrada ${entrada.id}. Restante: ${cantidadRestante}`);
          }
        }

        // 3. Verificar stock suficiente
        if (cantidadRestante > 0) {
          throw new Error(`Stock insuficiente para ${insumoNombre}. Faltan ${cantidadRestante.toFixed(2)} unidades`);
        }

        // 4. Crear los registros de salida en Airtable
        if (salidasACrear.length > 0) {
          const salidasCreadas = await base(process.env.AIRTABLE_TABLE_SALIDA_INSUMOS!)
            .create(salidasACrear);
          
          console.log(`✅ Creados ${salidasCreadas.length} registros de salida para ${insumoNombre}`);
        }

      } catch (insumoError) {
        console.error(`❌ Error procesando insumo ${insumoNombre}:`, insumoError);
        throw new Error(`Error en insumo ${insumoNombre}: ${insumoError instanceof Error ? insumoError.message : 'Error desconocido'}`);
      }
    }

    console.log('✅ ===== TODOS LOS INSUMOS PROCESADOS EXITOSAMENTE =====');
    
    return NextResponse.json({
      success: true,
      message: 'Salidas de insumos creadas exitosamente con lógica FIFO',
      procesados: registros.length
    });

  } catch (error) {
    console.error('❌ Error general en API salida-insumos-auto:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al procesar salidas automáticas'
    }, { status: 500 });
  }
}
