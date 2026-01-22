import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { debugLog } from '@/lib/debug';

// Validar configuración requerida
if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
  throw new Error('Variables de entorno AIRTABLE_API_KEY y AIRTABLE_BASE_ID son requeridas');
}

// Configurar Airtable de forma segura
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

export async function GET() {
  try {
    console.log('🔍 API STOCK-INSUMOS GET: Iniciando obtención de registros...');
    
    // Usar la tabla de Insumos Laboratorio desde variables de entorno
    const tableId = process.env.AIRTABLE_TABLE_INSUMOS_LABORATORIO;
    
    console.log('📋 API STOCK-INSUMOS: Table ID:', tableId);
    
    if (!tableId) {
      console.error('❌ API STOCK-INSUMOS: Missing AIRTABLE_TABLE_INSUMOS_LABORATORIO environment variable');
      throw new Error('Missing AIRTABLE_TABLE_INSUMOS_LABORATORIO environment variable');
    }

    console.log('📡 API STOCK-INSUMOS: Haciendo query a Airtable...');
    
    // Obtener TODOS los registros de Airtable usando nombres de campos exactos
    const allRecords: any[] = [];
    
    // Función para obtener todos los registros con paginación
    const fetchAllRecords = (): Promise<any[]> => {
      return new Promise((resolve, reject) => {
        base(tableId)
          .select({
            sort: [{ field: 'nombre', direction: 'asc' }]
          })
          .eachPage(
            function page(records, fetchNextPage) {
              allRecords.push(...records);
              fetchNextPage();
            },
            function done(err) {
              if (err) {
                console.error('❌ API STOCK-INSUMOS: Error en paginación:', err);
                reject(err);
              } else {
                resolve(allRecords);
              }
            }
          );
      });
    };

    await fetchAllRecords();

    debugLog('📊 API STOCK-INSUMOS: Records obtenidos:', allRecords.length);
    
    // Log de cada record para ver su estructura - solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      allRecords.forEach((record: any, index: number) => {
        debugLog(`📦 API STOCK-INSUMOS: Record ${index + 1}:`, {
          id: record.id,
          fields: record.fields,
          nombre: record.get('nombre'),
          categoria: record.get('categoria_insumo'),
          totalCantidad: record.get('Total Cantidad Producto'),
          rangoMinimo: record.get('Rango Minimo Stock'),
          estado: record.get('estado')
        });
      });
    }

    // Mapear los registros a un formato más amigable y seguro para React
    const insumos = allRecords.map((record: any) => {
      const fields = { ...record.fields };
      
      // Manejar el campo descripción que puede ser un objeto {state, value, isStale}
      if (fields.descripcion && typeof fields.descripcion === 'object' && 'value' in fields.descripcion) {
        fields.descripcion = (fields.descripcion as any).value;
      } else if (fields.descripcion && typeof fields.descripcion === 'object') {
        // Si es un objeto pero no tiene 'value', convertir a string vacío
        fields.descripcion = '';
      }
      
      // Asegurar que otros campos sean del tipo correcto
      if (typeof fields.nombre !== 'string') fields.nombre = fields.nombre || '';
      if (typeof fields.categoria_insumo !== 'string') fields.categoria_insumo = fields.categoria_insumo || '';
      if (typeof fields.unidad_medida !== 'string') fields.unidad_medida = fields.unidad_medida || '';
      
      return {
        id: record.id,
        fields: fields
      };
    });

    console.log('✅ API STOCK-INSUMOS GET: Respuesta preparada con', insumos.length, 'insumos');

    return NextResponse.json({
      success: true,
      insumos: insumos,
      total: insumos.length
    });

  } catch (error) {
    console.error('❌ API STOCK-INSUMOS GET: Error al obtener insumos:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al obtener insumos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('➕ API STOCK-INSUMOS POST: Iniciando creación de insumo...');
    
    const insumoData = await request.json();
    
    debugLog('📋 API STOCK-INSUMOS POST: Datos recibidos:', insumoData);
    debugLog('👤 API STOCK-INSUMOS POST: Registrado por:', insumoData.realizaRegistro || 'No especificado');

    const tableId = process.env.AIRTABLE_TABLE_INSUMOS_LABORATORIO;
    
    if (!tableId) {
      console.error('❌ API STOCK-INSUMOS POST: Missing AIRTABLE_TABLE_INSUMOS_LABORATORIO environment variable');
      throw new Error('Missing AIRTABLE_TABLE_INSUMOS_LABORATORIO environment variable');
    }

    console.log('📡 API STOCK-INSUMOS POST: Creando registro en Airtable...');
    console.log('📋 API STOCK-INSUMOS POST: Table ID:', tableId);

    // Validar que los campos requeridos estén presentes
    if (!insumoData.nombre || insumoData.nombre.trim() === '') {
      throw new Error('El nombre del insumo es requerido');
    }

    // Mapear los campos al formato de Airtable usando field IDs exactos de la documentación
    const fieldsToCreate: any = {
      [process.env.AIRTABLE_FIELD_INSUMOS_NOMBRE || 'nombre']: insumoData.nombre.trim(),
      [process.env.AIRTABLE_FIELD_INSUMOS_CATEGORIA_INSUMO || 'categoria_insumo']: insumoData.categoria_insumo || 'Materiales y Suministros Generales',
      [process.env.AIRTABLE_FIELD_INSUMOS_UNIDAD_INGRESA_INSUMO || 'Unidad Ingresa Insumo']: insumoData.unidad_medida || 'UNIDAD',
    };

    // Agregar campo Realiza Registro si está definido
    if (insumoData.realizaRegistro) {
      fieldsToCreate[process.env.AIRTABLE_FIELD_INSUMOS_REALIZA_REGISTRO || 'Realiza Registro'] = insumoData.realizaRegistro;
    }

    // Agregar campos opcionales
    if (insumoData.descripcion && insumoData.descripcion.trim() !== '') {
      fieldsToCreate[process.env.AIRTABLE_FIELD_INSUMOS_DESCRIPCION || 'descripcion'] = insumoData.descripcion.trim();
    }

    // Agregar cantidad presentación insumo si está definida
    if (insumoData.cantidadPresentacion && Number(insumoData.cantidadPresentacion) > 0) {
      fieldsToCreate[process.env.AIRTABLE_FIELD_INSUMOS_CANTIDAD_PRESENTACION_INSUMO || 'Cantidad Presentacion Insumo'] = Number(insumoData.cantidadPresentacion);
    }

    console.log('📋 API STOCK-INSUMOS POST: Campos a crear:', fieldsToCreate);

    // Crear el registro en Airtable
    const createdRecords = await base(tableId).create([{
      fields: fieldsToCreate
    }], { typecast: true }); // typecast para auto-conversión de tipos

    const createdRecord = createdRecords[0];

    console.log('✅ API STOCK-INSUMOS POST: Insumo creado:', {
      id: createdRecord.id,
      fields: createdRecord.fields
    });

    // Si se proporciona cantidad inicial y fecha de vencimiento, crear registro en Entrada Insumos
    if (insumoData.cantidadInicial && Number(insumoData.cantidadInicial) > 0) {
      try {
        console.log('� API STOCK-INSUMOS POST: Creando entrada inicial de insumo...');
        
        const entradaFields: any = {
          [process.env.AIRTABLE_FIELD_ENTRADA_INSUMOS_INSUMOS_LABORATORIO || 'Insumos Laboratorio']: [createdRecord.id],
          [process.env.AIRTABLE_FIELD_ENTRADA_INSUMOS_CANTIDAD_INGRESA_UNIDADES || 'Cantidad Ingresa Unidades']: Number(insumoData.cantidadInicial),
          [process.env.AIRTABLE_FIELD_ENTRADA_INSUMOS_REALIZA_REGISTRO || 'Realiza Registro']: 'Sistema - Registro inicial'
        };

        // Agregar fecha de ingreso (hoy)
        const today = new Date().toISOString().split('T')[0];
        entradaFields[process.env.AIRTABLE_FIELD_ENTRADA_INSUMOS_FECHA_INGRESO || 'Fecha Ingreso'] = today;

        // Agregar fecha de vencimiento si se proporciona
        if (insumoData.fechaVencimiento) {
          entradaFields[process.env.AIRTABLE_FIELD_ENTRADA_INSUMOS_FECHA_VENCIMIENTO || 'Fecha Vencimiento'] = insumoData.fechaVencimiento;
        }

        // Calcular cantidad en formato granel
        const cantidadPresentacion = Number(insumoData.cantidadPresentacion) || 1;
        const cantidadGranel = Number(insumoData.cantidadInicial) * cantidadPresentacion;
        entradaFields[process.env.AIRTABLE_FIELD_ENTRADA_INSUMOS_CANTIDAD_FORMATO_GRANEL || 'Cantidad Formato Granel'] = cantidadGranel;

        console.log('📋 API STOCK-INSUMOS POST: Campos de entrada:', entradaFields);

        await base(process.env.AIRTABLE_TABLE_ENTRADA_INSUMOS || 'Entrada Insumos').create([{
          fields: entradaFields
        }], { typecast: true });

        console.log('✅ API STOCK-INSUMOS POST: Entrada inicial creada exitosamente');
      } catch (entradaError) {
        console.warn('⚠️ API STOCK-INSUMOS POST: Error al crear entrada inicial:', entradaError);
        // No fallar la operación completa por este error
      }
    }

    console.log('✅ API STOCK-INSUMOS POST: Insumo creado:', {
      id: createdRecord.id,
      fields: createdRecord.fields
    });

    return NextResponse.json({
      success: true,
      insumo: {
        id: createdRecord.id,
        fields: createdRecord.fields
      },
      message: 'Insumo creado exitosamente'
    });

  } catch (error) {
    console.error('❌ API STOCK-INSUMOS POST: Error al crear insumo:', error);
    
    // Proporcionar más detalles del error
    let errorMessage = 'Error al crear insumo';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
    }
    
    console.error('❌ API STOCK-INSUMOS POST: Stack trace:', errorDetails);
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: errorDetails
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 API STOCK-INSUMOS PUT: Iniciando operación de stock...');
    
    const requestData = await request.json();
    const { id, operacion, ...updateData } = requestData;
    
    console.log('📋 API STOCK-INSUMOS PUT: Datos recibidos:', {
      id,
      operacion,
      updateData
    });

    if (!id) {
      console.error('❌ API STOCK-INSUMOS PUT: Falta ID del insumo');
      return NextResponse.json(
        { success: false, error: 'ID del insumo es requerido' },
        { status: 400 }
      );
    }

    const tableId = process.env.AIRTABLE_TABLE_INSUMOS_LABORATORIO;
    
    if (!tableId) {
      console.error('❌ API STOCK-INSUMOS PUT: Missing AIRTABLE_TABLE_INSUMOS_LABORATORIO environment variable');
      throw new Error('Missing AIRTABLE_TABLE_INSUMOS_LABORATORIO environment variable');
    }

    // Si es una operación de stock, manejamos los movimientos
    if (operacion === 'descontar' || operacion === 'recibir') {
      console.log(`📦 API STOCK-INSUMOS PUT: Procesando operación de ${operacion}...`);
      
      // Primero obtener el registro actual para conocer el stock
      const currentRecord = await base(tableId).find(id);
      const stockActual = currentRecord.get('Total Cantidad Producto') as number || 0;
      
      console.log('📊 API STOCK-INSUMOS PUT: Stock actual:', stockActual);
      
      let nuevoStock: number = stockActual;
      const fieldsToUpdate: any = {};
      
      if (operacion === 'descontar') {
        const { cantidad, motivo, observaciones } = updateData;
        
        if (!cantidad || cantidad <= 0) {
          return NextResponse.json(
            { success: false, error: 'Cantidad a descontar debe ser mayor a 0' },
            { status: 400 }
          );
        }
        
        if (cantidad > stockActual) {
          return NextResponse.json(
            { success: false, error: 'No hay suficiente stock para descontar' },
            { status: 400 }
          );
        }
        
        nuevoStock = stockActual - cantidad;
        fieldsToUpdate['Total Cantidad Producto'] = nuevoStock;
        
        // Actualizar estado si se agota
        if (nuevoStock === 0) {
          fieldsToUpdate['estado'] = 'Agotado';
        }
        
        console.log(`📤 API STOCK-INSUMOS PUT: Descontando ${cantidad}. Stock ${stockActual} -> ${nuevoStock}`);
        
      } else if (operacion === 'recibir') {
        const { cantidad, proveedor, numeroFactura, fechaVencimiento, observaciones } = updateData;
        
        if (!cantidad || cantidad <= 0) {
          return NextResponse.json(
            { success: false, error: 'Cantidad a recibir debe ser mayor a 0' },
            { status: 400 }
          );
        }
        
        nuevoStock = stockActual + cantidad;
        fieldsToUpdate['Total Cantidad Producto'] = nuevoStock;
        
        // Cambiar estado a disponible si estaba agotado
        if (stockActual === 0) {
          fieldsToUpdate['estado'] = 'Disponible';
        }
        
        console.log(`📥 API STOCK-INSUMOS PUT: Recibiendo ${cantidad}. Stock ${stockActual} -> ${nuevoStock}`);
      }
      
      // Actualizar el registro en Airtable
      const updatedRecords = await base(tableId).update([{
        id: id,
        fields: fieldsToUpdate
      }]);

      const updatedRecord = updatedRecords[0];

      console.log('✅ API STOCK-INSUMOS PUT: Operación de stock completada:', {
        id: updatedRecord.id,
        operacion,
        nuevoStock,
        fields: updatedRecord.fields
      });

      return NextResponse.json({
        success: true,
        message: `Stock ${operacion === 'descontar' ? 'descontado' : 'recibido'} exitosamente`,
        insumo: {
          id: updatedRecord.id,
          fields: updatedRecord.fields
        },
        stockAnterior: stockActual,
        stockNuevo: nuevoStock,
        operacion
      });
      
    } else {
      // Operación de actualización normal
      console.log('📡 API STOCK-INSUMOS PUT: Actualizando registro normal...');

      const fieldsToUpdate: any = {};
      
      if (updateData.nombre) fieldsToUpdate['nombre'] = updateData.nombre;
      if (updateData.categoria_insumo) fieldsToUpdate['categoria_insumo'] = updateData.categoria_insumo;
      if (updateData.unidad_medida) fieldsToUpdate['unidad_medida'] = updateData.unidad_medida;
      if (updateData.descripcion) fieldsToUpdate['descripcion'] = updateData.descripcion;
      if (updateData.rangoMinimoStock !== undefined) fieldsToUpdate['Rango Minimo Stock'] = updateData.rangoMinimoStock;
      if (updateData.estado) fieldsToUpdate['estado'] = updateData.estado;

      console.log('📋 API STOCK-INSUMOS PUT: Campos a actualizar:', fieldsToUpdate);

      // Actualizar el registro en Airtable
      const updatedRecords = await base(tableId).update([{
        id: id,
        fields: fieldsToUpdate
      }]);

      const updatedRecord = updatedRecords[0];

      console.log('✅ API STOCK-INSUMOS PUT: Insumo actualizado:', {
        id: updatedRecord.id,
        fields: updatedRecord.fields
      });

      return NextResponse.json({
        success: true,
        insumo: {
          id: updatedRecord.id,
          fields: updatedRecord.fields
        }
      });
    }

  } catch (error) {
    console.error('❌ API STOCK-INSUMOS PUT: Error en operación:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error en operación de stock',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
