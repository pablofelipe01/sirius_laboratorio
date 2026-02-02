import { NextRequest, NextResponse } from 'next/server';
import Airtable, { FieldSet } from 'airtable';
import { CepasSchema, validateData } from '@/lib/validation/schemas';

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

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 Helper: Obtener código de producto desde Sirius Product Core
// ═══════════════════════════════════════════════════════════════════════════════
async function getProductCodeFromProductCore(recordId: string): Promise<string | null> {
  const productosTableId = process.env.AIRTABLE_TABLE_PRODUCTOS;
  
  if (!productCoreBase || !productosTableId || !recordId) {
    console.log('⚠️ No se puede obtener código de producto: configuración faltante');
    return null;
  }

  try {
    console.log(`🔍 Buscando código de producto para record ID: ${recordId}`);
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
// ═══════════════════════════════════════════════════════════════════════════════
async function findResponsablesInDataLab(nombres: string[]): Promise<string[]> {
  const equipoTableId = process.env.AIRTABLE_TABLE_EQUIPO_LABORATORIO;
  
  if (!equipoTableId || nombres.length === 0) {
    console.log('⚠️ No hay tabla de equipo o nombres vacíos');
    return [];
  }

  try {
    const records = await base(equipoTableId)
      .select({ fields: ['Nombre'] })
      .all();

    const nombreToId = new Map<string, string>();
    records.forEach(record => {
      const nombre = record.fields['Nombre'] as string;
      if (nombre) {
        nombreToId.set(nombre, record.id);
        nombreToId.set(nombre.toLowerCase().trim(), record.id);
      }
    });

    const foundIds: string[] = [];
    for (const nombre of nombres) {
      let id = nombreToId.get(nombre) || nombreToId.get(nombre.toLowerCase().trim());
      
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
    console.log('📝 Cepas Request:', {
      browser: browserName,
      userAgent: userAgent.substring(0, 100),
      timestamp: new Date().toISOString(),
      dataFields: Object.keys(rawData)
    });
    
    // Validar datos de entrada con Zod
    const validation = validateData(CepasSchema, rawData);
    
    if (!validation.success) {
      console.error('❌ Validation failed:', {
        browser: browserName,
        errors: validation.errors,
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json({ 
        error: 'Datos de entrada inválidos',
        details: validation.errors 
      }, { status: 400 });
    }

    const data = validation.data!;

    console.log('📦 RAW DATA RECIBIDO:', JSON.stringify(data, null, 2));

    // Mapear el tipo de registro del frontend a los valores de Airtable
    const mapearTipoCepa = (tipoRegistro: string): string => {
      switch (tipoRegistro) {
        case 'Cepa Producida por Inoculación':
          return 'Produccion - Inoculacion';
        case 'Cepa Adquirida por Compra':
          return 'Adquirida - Comprada';
        case 'Cepa Convertida desde Lote de Producción':
          return 'Bolsas Normales - Convertida';
        default:
          throw new Error(`Tipo de registro no válido: ${tipoRegistro}`);
      }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔄 Buscar responsables en DataLab por nombre (traducir IDs)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('🔍 Buscando responsables en DataLab por nombre:', data.responsables);
    const responsablesIdsDataLab = await findResponsablesInDataLab(data.responsables);
    console.log('📋 IDs de responsables en DataLab:', responsablesIdsDataLab);

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔄 Obtener código de producto desde Sirius Product Core
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('📦 Obteniendo código de producto para ID:', data.microorganismoId);
    const codigoProductoCore = await getProductCodeFromProductCore(data.microorganismoId || '');
    console.log('📋 Código de producto obtenido:', codigoProductoCore);

    // ═══════════════════════════════════════════════════════════════════════════
    // 🏷️ Generar código de cepa: DDMMYYAB (fecha + abreviatura del microorganismo)
    // ═══════════════════════════════════════════════════════════════════════════
    let codigoCepa = '';
    const abreviatura = data.microorganismoAbreviatura || '';
    
    if (data.fechaCreacion && abreviatura) {
      const [year, month, day] = data.fechaCreacion.split('-');
      const fechaFormateada = `${day}${month}${year.slice(2)}`; // DDMMYY
      codigoCepa = `${fechaFormateada}${abreviatura}`;
      console.log('🏷️ Código de cepa generado:', codigoCepa);
    } else {
      console.log('⚠️ No se pudo generar código de cepa: falta fecha o abreviatura');
    }

    // Preparar IDs Core como string separado por comas
    const responsablesIdsCore = (data.responsablesIdsCore || []).join(', ');

    // Usar la tabla de Cepas desde variables de entorno
    const tableId = process.env.AIRTABLE_TABLE_CEPAS;
    
    if (!tableId) {
      throw new Error('Missing AIRTABLE_TABLE_CEPAS environment variable');
    }

    // Preparar campos para Airtable
    const fieldsToCreate: Partial<FieldSet> = {
      'Fecha Creacion': data.fechaCreacion,
      'Cantidad Bolsas': data.cantidadBolsas,
      'Realiza Registro': data.registradoPor,
      'Tipo Cepa': mapearTipoCepa(data.tipoRegistro),
      'ID Responsable Core': responsablesIdsCore,
      'ID Product Core': codigoProductoCore || '',
      'Codigo Cepa Core': codigoCepa,
    };

    // Solo agregar responsables si encontramos IDs válidos en DataLab
    if (responsablesIdsDataLab.length > 0) {
      fieldsToCreate['Responsables'] = responsablesIdsDataLab;
    } else {
      console.log('⚠️ No se encontraron responsables en DataLab, guardando sin linked records');
    }

    // NOTA: El campo Microorganismos sigue vinculado a DataLab (no migrado aún)
    // Por ahora no enviamos este linked record ya que los IDs son de Sirius Product Core
    // Si necesitas mantener compatibilidad, deberás crear un helper similar a findResponsablesInDataLab

    // Crear registro en Airtable
    const record = await base(tableId).create([{ fields: fieldsToCreate }]);

    // Log del registro exitoso
    console.log('✅ Cepa registrada:', {
      recordId: record[0].id,
      browser: browserName,
      microorganismo: data.microorganismo,
      codigoProductoCore: codigoProductoCore,
      codigoCepa: codigoCepa,
      cantidadBolsas: data.cantidadBolsas,
      responsablesIdsCore: responsablesIdsCore,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Cepa registrada exitosamente',
      recordId: record[0].id,
      codigoCepa: codigoCepa
    });

  } catch (error) {
    console.error('Error en API de cepas:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Usar la tabla de Cepas desde variables de entorno
    const tableId = process.env.AIRTABLE_TABLE_CEPAS;
    
    if (!tableId) {
      throw new Error('Missing AIRTABLE_TABLE_CEPAS environment variable');
    }

    // Obtener registros de Airtable usando nombres de campos exactos
    const records = await base(tableId)
      .select({
        maxRecords: 50,
        sort: [{ field: 'Creacion', direction: 'desc' }]
      })
      .firstPage();

    const formattedRecords = records.map(record => ({
      id: record.get('ID'),
      responsables: record.get('Nombre (from Responsables)'),
      cantidadBolsas: record.get('Cantidad Bolsas'),
      microorganismos: record.get('Microorganismo (from Microorganismos)'),
      fechaCreacion: record.get('Fecha Creacion'),
      creacion: record.get('Creacion')
    }));

    return NextResponse.json({
      success: true,
      records: formattedRecords,
      total: formattedRecords.length
    });

  } catch (error) {
    console.error('Error al obtener registros de Cepas:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener datos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
