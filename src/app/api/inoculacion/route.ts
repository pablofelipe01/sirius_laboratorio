import { NextRequest, NextResponse } from 'next/server';
import Airtable, { FieldSet } from 'airtable';
import { InoculationSchema, validateData } from '@/lib/validation/schemas';

// Validar configuración requerida
if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
  throw new Error('Variables de entorno AIRTABLE_API_KEY y AIRTABLE_BASE_ID son requeridas');
}

// Configurar Airtable de forma segura
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

// Configurar Airtable para Sirius Product Core
const productCoreBase = process.env.AIRTABLE_API_KEY_SIRIUS_PRODUCT_CORE && process.env.AIRTABLE_BASE_ID_SIRIUS_PRODUCT_CORE
  ? new Airtable({ apiKey: process.env.AIRTABLE_API_KEY_SIRIUS_PRODUCT_CORE }).base(process.env.AIRTABLE_BASE_ID_SIRIUS_PRODUCT_CORE)
  : null;

// Nombres de campos de Airtable configurables
const FIELD_RESPONSABLES = process.env.AIRTABLE_FIELD_INOCULACION_RESPONSABLES || 'Responsables';
const FIELD_RESPONSABLES_CORE = 'ID Responsable Core'; // Campo de texto para IDs de Sirius Nomina Core
const FIELD_CANTIDAD_BOLSAS = process.env.AIRTABLE_FIELD_INOCULACION_CANTIDAD_BOLSAS || 'Cantidad Bolsas Inoculadas';
const FIELD_FECHA_INOCULACION = process.env.AIRTABLE_FIELD_INOCULACION_FECHA || 'Fecha Inoculacion';
const FIELD_REALIZA_REGISTRO = process.env.AIRTABLE_FIELD_INOCULACION_REALIZA_REGISTRO || 'Realiza Registro';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 Helper: Obtener código de producto desde Sirius Product Core
// El microorganismId es el record ID de Airtable, necesitamos el código SIRIUS-PRODUCT-XXXX
// ═══════════════════════════════════════════════════════════════════════════════
async function getProductCodeFromProductCore(recordId: string): Promise<string | null> {
  const productosTableId = process.env.AIRTABLE_TABLE_PRODUCTOS;
  
  if (!productCoreBase || !productosTableId || !recordId) {
    console.log('⚠️ No se puede obtener código de producto: configuración faltante');
    return null;
  }

  try {
    console.log(`🔍 Buscando código de producto para record ID: ${recordId}`);
    
    // Obtener el registro directamente por ID
    const record = await productCoreBase(productosTableId).find(recordId);
    
    const codigoProducto = record.fields['Codigo Producto'] as string;
    
    if (codigoProducto) {
      console.log(`✅ Código de producto encontrado: ${codigoProducto}`);
      return codigoProducto;
    } else {
      console.log(`⚠️ Registro encontrado pero sin código de producto`);
      return null;
    }
  } catch (error) {
    console.error('❌ Error obteniendo código de producto:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 Helper: Buscar responsables en DataLab por nombre
// Los responsables vienen de Sirius Nomina Core, pero necesitamos los IDs de DataLab
// ═══════════════════════════════════════════════════════════════════════════════
async function findResponsablesInDataLab(nombres: string[]): Promise<string[]> {
  const equipoTableId = process.env.AIRTABLE_TABLE_EQUIPO_LABORATORIO;
  
  if (!equipoTableId || nombres.length === 0) {
    console.log('⚠️ No hay tabla de equipo o nombres vacíos');
    return [];
  }

  try {
    // Obtener todos los usuarios de Equipo Laboratorio
    const records = await base(equipoTableId)
      .select({
        fields: ['Nombre'],
      })
      .all();

    // Crear un mapa de nombre -> id para búsqueda rápida
    const nombreToId = new Map<string, string>();
    records.forEach(record => {
      const nombre = record.fields['Nombre'] as string;
      if (nombre) {
        // Guardar con nombre exacto y también normalizado (lowercase, sin espacios extras)
        nombreToId.set(nombre, record.id);
        nombreToId.set(nombre.toLowerCase().trim(), record.id);
      }
    });

    // Buscar cada nombre
    const foundIds: string[] = [];
    for (const nombre of nombres) {
      // Intentar búsqueda exacta primero
      let id = nombreToId.get(nombre);
      
      // Si no encuentra, intentar normalizado
      if (!id) {
        id = nombreToId.get(nombre.toLowerCase().trim());
      }
      
      // Si aún no encuentra, buscar parcialmente (primer nombre + primer apellido)
      if (!id) {
        const nombreParts = nombre.toLowerCase().split(' ').slice(0, 2).join(' ');
        for (const [key, value] of nombreToId.entries()) {
          if (key.toLowerCase().includes(nombreParts)) {
            id = value;
            break;
          }
        }
      }

      if (id) {
        foundIds.push(id);
        console.log(`✅ Responsable encontrado en DataLab: "${nombre}" -> ${id}`);
      } else {
        console.log(`⚠️ Responsable NO encontrado en DataLab: "${nombre}"`);
      }
    }

    return foundIds;
  } catch (error) {
    console.error('❌ Error buscando responsables en DataLab:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json();
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    
    // Extraer información básica del navegador para logging
    const getBrowserFromUA = (ua: string) => {
      if (ua.includes('TelegramBot')) return 'Telegram WebApp';
      if (ua.includes('Telegram')) return 'Telegram';
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Safari')) return 'Safari';
      if (ua.includes('Edge')) return 'Edge';
      return 'Unknown';
    };
    
    const browserName = getBrowserFromUA(userAgent);
    
    // Log del intento de registro
    console.log('📝 Inoculación Request:', {
      browser: browserName,
      userAgent: userAgent.substring(0, 100),
      timestamp: new Date().toISOString(),
      dataFields: Object.keys(rawData)
    });
    
    // Log de los datos crudos recibidos
    console.log('📦 RAW DATA RECIBIDO:', JSON.stringify(rawData, null, 2));
    
    // Validar datos de entrada con Zod
    const validation = validateData(InoculationSchema, rawData);
    
    if (!validation.success) {
      console.error('❌ Validation failed:', {
        browser: browserName,
        errors: validation.errors,
        rawData: rawData,
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json({ 
        error: 'Datos de entrada inválidos',
        details: validation.errors 
      }, { status: 400 });
    }

    const data = validation.data!;

    // Usar la tabla de Inoculación con nombres de campos
    const tableId = process.env.AIRTABLE_TABLE_INOCULACION;
    
    if (!tableId) {
      throw new Error('Missing AIRTABLE_TABLE_INOCULACION environment variable');
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🔄 Buscar responsables en DataLab por nombre
    // Los IDs vienen de Sirius Nomina Core, pero necesitamos IDs de DataLab
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('🔍 Buscando responsables en DataLab por nombre:', data.responsables);
    const responsablesIdsDataLab = await findResponsablesInDataLab(data.responsables || []);
    console.log('📋 IDs de responsables en DataLab:', responsablesIdsDataLab);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🔄 Obtener código de producto desde Sirius Product Core
    // El microorganismId es el record ID, pero necesitamos el código SIRIUS-PRODUCT-XXXX
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('📦 Obteniendo código de producto para ID:', data.microorganismId);
    const codigoProductoCore = await getProductCodeFromProductCore(data.microorganismId || '');
    console.log('📋 Código de producto obtenido:', codigoProductoCore);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🏷️ Generar código de lote: DDMMYYAB (fecha + abreviatura del microorganismo)
    // La abreviatura viene de Sirius Product Core (microorganismAbreviatura)
    // Fallback: usar abreviatura de las cepas seleccionadas
    // ═══════════════════════════════════════════════════════════════════════════
    let codigoLote = '';
    // Intentar obtener abreviatura: primero del producto, luego de las cepas
    const abreviatura = data.microorganismAbreviatura || 
                        (data.cepasSeleccionadas && data.cepasSeleccionadas[0]?.abreviatura) || 
                        '';
    
    if (data.inoculationDate && abreviatura) {
      // Convertir fecha YYYY-MM-DD a DDMMYY
      const [year, month, day] = data.inoculationDate.split('-');
      const fechaFormateada = `${day}${month}${year.slice(2)}`; // DDMMYY
      
      codigoLote = `${fechaFormateada}${abreviatura}`;
      console.log('🏷️ Código de lote generado:', codigoLote);
    } else {
      console.log('⚠️ No se pudo generar código de lote: falta fecha o abreviatura del microorganismo');
    }
    
    // Preparar IDs Core como string separado por comas (para referencia)
    const responsablesIdsCore = (data.responsablesIdsCore || []).join(', ');
    
    // Preparar campos para Airtable
    const fieldsToCreate: Partial<FieldSet> = {
      [FIELD_RESPONSABLES_CORE]: responsablesIdsCore, // String con IDs de Sirius Nomina Core
      [FIELD_CANTIDAD_BOLSAS]: data.bagQuantity, // Number
      [FIELD_FECHA_INOCULACION]: data.inoculationDate, // Date (ISO format)
      [FIELD_REALIZA_REGISTRO]: data.registradoPor, // Text
      'ID Producto Core': codigoProductoCore || '', // Código del producto (ej: SIRIUS-PRODUCT-0004)
      'Codigo Lote': codigoLote,
    };
    
    // Solo agregar responsables si encontramos IDs válidos en DataLab
    if (responsablesIdsDataLab.length > 0) {
      fieldsToCreate[FIELD_RESPONSABLES] = responsablesIdsDataLab;
    } else {
      console.log('⚠️ No se encontraron responsables en DataLab, guardando sin linked records');
    }
    
    const record = await base(tableId).create([
      {
        fields: fieldsToCreate
      }
    ]);

    // Log del registro exitoso
    console.log('✅ Inoculación registrada:', {
      recordId: record[0].id,
      browser: browserName,
      microorganismo: data.microorganism,
      codigoProductoCore: codigoProductoCore,  // Código de Sirius Product Core (SIRIUS-PRODUCT-XXXX)
      codigoLote: codigoLote, // Código de lote generado
      bagQuantity: data.bagQuantity,
      responsables: data.responsables,
      responsablesIdsNominaCore: data.responsablesIdsCore, // IDs de Sirius Nomina Core (referencia)
      responsablesIdsDataLab: responsablesIdsDataLab,      // IDs encontrados en DataLab
      realizaRegistro: data.registradoPor,
      cepasSeleccionadas: data.cepasSeleccionadas,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Inoculación registrada exitosamente',
      recordId: record[0].id
    });

  } catch (error) {
    console.error('Error en API de inoculación:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 API INOCULACION PUT: Iniciando actualización de lote...');
    
    const { loteId, nuevoEstado, fechaGuardadoRefrigeracion } = await request.json();
    
    console.log('📋 API INOCULACION PUT: Datos recibidos:', {
      loteId,
      nuevoEstado,
      fechaGuardadoRefrigeracion
    });

    if (!loteId || !nuevoEstado) {
      console.error('❌ API INOCULACION PUT: Faltan datos requeridos');
      return NextResponse.json(
        { success: false, error: 'loteId y nuevoEstado son requeridos' },
        { status: 400 }
      );
    }

    const tableId = process.env.AIRTABLE_TABLE_INOCULACION;
    
    if (!tableId) {
      console.error('❌ API INOCULACION PUT: Missing AIRTABLE_TABLE_INOCULACION environment variable');
      throw new Error('Missing AIRTABLE_TABLE_INOCULACION environment variable');
    }

    console.log('📡 API INOCULACION PUT: Actualizando registro en Airtable...');

    // Preparar los campos a actualizar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fieldsToUpdate: any = {
      'Estado Lote': nuevoEstado
    };

    // Si se está cambiando a Refrigeración, agregar la fecha
    if ((nuevoEstado === 'Refrigeración' || nuevoEstado === 'Refrigerado') && fechaGuardadoRefrigeracion) {
      console.log('📅 API INOCULACION PUT: Guardando fecha de refrigeración:', fechaGuardadoRefrigeracion);
      // Usar el nuevo nombre de campo para nuevos registros
      fieldsToUpdate['Fecha Guardado Refrigeración'] = fechaGuardadoRefrigeracion;
    }

    console.log('📋 API INOCULACION PUT: Campos a actualizar:', fieldsToUpdate);

    // Actualizar el registro en Airtable
    const updatedRecords = await base(tableId).update([{
      id: loteId,
      fields: fieldsToUpdate
    }]);

    const updatedRecord = updatedRecords[0];

    console.log('✅ API INOCULACION PUT: Registro actualizado:', {
      id: updatedRecord.id,
      fields: updatedRecord.fields
    });

    return NextResponse.json({
      success: true,
      lote: {
        id: updatedRecord.id,
        fields: updatedRecord.fields
      }
    });

  } catch (error) {
    console.error('❌ API INOCULACION PUT: Error al actualizar lote:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al actualizar lote',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API INOCULACION GET: Iniciando obtención de registros...');
    
    const { searchParams } = new URL(request.url);
    const codigo = searchParams.get('codigo');
    
    // Usar la tabla de Inoculación desde variables de entorno
    const tableId = process.env.AIRTABLE_TABLE_INOCULACION;
    
    console.log('📋 API INOCULACION: Table ID:', tableId);
    console.log('🔍 API INOCULACION: Codigo filtro:', codigo);
    
    if (!tableId) {
      console.error('❌ API INOCULACION: Missing AIRTABLE_TABLE_INOCULACION environment variable');
      throw new Error('Missing AIRTABLE_TABLE_INOCULACION environment variable');
    }

    console.log('📡 API INOCULACION: Haciendo query a Airtable...');
    
    // Preparar configuración de query
    const queryConfig: any = {
      maxRecords: 100,
      sort: [{ field: 'Fecha Creacion', direction: 'desc' }]
    };

    // Si se proporciona código, filtrar por ese código
    if (codigo) {
      queryConfig.filterByFormula = `{Codigo Lote} = '${codigo}'`;
      console.log('📋 API INOCULACION: Filtrando por código:', codigo);
    }
    
    // Obtener registros de Airtable usando nombres de campos exactos
    const records = await base(tableId)
      .select(queryConfig)
      .firstPage();

    console.log('📊 API INOCULACION: Records obtenidos:', records.length);
    
    // Log de cada record para ver su estructura
    records.forEach((record, index) => {
      console.log(`📦 API INOCULACION: Record ${index + 1}:`, {
        id: record.id,
        fields: record.fields,
        estadoLote: record.get('Estado Lote'),
        codigoLote: record.get('Codigo Lote'),
        fechaGuardadoRefrigeracion: record.get('Fecha Guardado Refrigeración'),
        fechaGuardadoRefrigerador: record.get('Fecha Guardado Refrigerador') // Para compatibilidad
      });
    });

    const formattedRecords = records.map(record => ({
      id: record.id,
      fields: record.fields // Devolver todos los fields como están en Airtable
    }));

    console.log('✅ API INOCULACION: Records formateados:', formattedRecords.length);
    console.log('📋 API INOCULACION: Primer record ejemplo:', formattedRecords[0]);

    const response = {
      success: true,
      records: formattedRecords, // Devolver como 'records' para compatibilidad con frontend
      total: formattedRecords.length
    };
    
    console.log('🚀 API INOCULACION: Enviando response:', {
      success: response.success,
      records_count: response.records.length,
      total: response.total
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ API INOCULACION: Error al obtener registros:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener datos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}


