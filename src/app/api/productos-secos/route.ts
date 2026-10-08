import { NextRequest, NextResponse } from 'next/server';
import { 
  SIRIUS_PRODUCT_CORE_CONFIG, 
  SIRIUS_INVENTARIO_CONFIG,
  getSiriusProductCoreHeaders,
  getSiriusInventarioHeaders,
  buildSiriusProductCoreUrl,
  buildSiriusInventarioUrl
} from '@/lib/constants/airtable';
import {
  DOCUMENTO_SIN_FERMENTACION,
  RespaldoInvalido,
  descontarFermentacion,
  deshacerDescuentoFermentacion,
  resolverRespaldo,
  type RespaldoEntrada,
} from '@/lib/inventario/respaldo-bacterias';

// ============================================================================
// Interfaces
// ============================================================================

interface ProductoSeco {
  id: string;
  airtableId: string;
  codigo: string;
  nombre: string;
  categoria: string[];
  tipo: string;
  unidadBase: string;
  activo: boolean;
  observaciones?: string;
  idNumerico: number;
  area?: string;
  precioVentaUnitario: number;
}

interface MovimientoInventario {
  id: string;
  fields: {
    'ID Movimiento'?: string;
    'Product ID'?: string;
    'Tipo Movimiento'?: string;
    'Cantidad'?: number;
    'Unidad Medida'?: string;
    'Motivo'?: string;
    'Documento Referencia'?: string;
    'Responsable'?: string;
    'Fecha Movimiento'?: string;
    'Observaciones'?: string;
  };
  createdTime: string;
}

// ============================================================================
// GET - Obtener productos secos disponibles para ingreso
// Filtra: Área = Laboratorio, Unidad Base = kg, Activo = Sí
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    console.log('📦 [PRODUCTOS-SECOS-API] Obteniendo productos secos del catálogo...');

    const { searchParams } = new URL(request.url);
    const incluirHistorial = searchParams.get('incluirHistorial') === 'true';

    // ========================================================================
    // PASO 1: Obtener productos de Sirius Product Core
    // ========================================================================
    const productosUrl = buildSiriusProductCoreUrl(SIRIUS_PRODUCT_CORE_CONFIG.TABLES.PRODUCTOS);
    
    // Filtro: Activo = "Sí" AND Area = "Laboratorio" AND Unidad Base = "Kg"
    // Nota: "Kg" con K mayúscula según el esquema de Airtable
    const filterFormula = encodeURIComponent(`AND({Activo}="Sí",{Area}="Laboratorio",{Unidad Base}="Kg")`);
    const fullUrl = `${productosUrl}?filterByFormula=${filterFormula}`;
    
    console.log('🔗 URL Productos:', fullUrl);

    const productosResponse = await fetch(fullUrl, {
      method: 'GET',
      headers: getSiriusProductCoreHeaders(),
    });

    if (!productosResponse.ok) {
      const errorText = await productosResponse.text();
      console.error('❌ Error obteniendo productos:', errorText);
      throw new Error(`Error obteniendo productos: ${productosResponse.status}`);
    }

    const productosData = await productosResponse.json();
    const productosRaw = productosData.records || [];

    console.log(`✅ ${productosRaw.length} productos secos encontrados`);

    // Formatear productos
    const productos: ProductoSeco[] = productosRaw.map((record: any) => ({
      id: record.id,
      airtableId: record.id,
      codigo: record.fields['Codigo Producto'] || '',
      nombre: record.fields['Nombre Comercial'] || '',
      categoria: record.fields['Categoria Producto'] || [],
      tipo: record.fields['Tipo Producto'] || '',
      unidadBase: record.fields['Unidad Base'] || 'kg',
      activo: record.fields['Activo'] === 'Sí',
      observaciones: record.fields['Observaciones'] || '',
      idNumerico: record.fields['ID'] || 0,
      area: record.fields['Area'] || '',
      precioVentaUnitario: record.fields['Precio Venta Unitario'] || 0
    }));

    // ========================================================================
    // PASO 2: Obtener historial de movimientos (si se solicita)
    // ========================================================================
    let historial: any[] = [];
    
    // Obtener Field IDs desde la configuración
    const FIELD_IDS = SIRIUS_INVENTARIO_CONFIG.FIELDS_MOVIMIENTOS;
    
    if (incluirHistorial) {
      try {
        const movimientosUrl = buildSiriusInventarioUrl(SIRIUS_INVENTARIO_CONFIG.TABLES.MOVIMIENTOS_INVENTARIO);
        
        // Obtener todos los movimientos recientes sin filtrar por tipo
        // (el filtro por nombre de campo puede fallar según la configuración de Airtable)
        const movimientosFullUrl = `${movimientosUrl}?returnFieldsByFieldId=true&maxRecords=100`;
        
        console.log('🔗 URL Movimientos:', movimientosFullUrl);

        const movimientosResponse = await fetch(movimientosFullUrl, {
          method: 'GET',
          headers: getSiriusInventarioHeaders(),
        });

        if (movimientosResponse.ok) {
          const movimientosData = await movimientosResponse.json();
          const movimientosRaw = movimientosData.records || [];
          
          console.log(`📊 Total movimientos encontrados: ${movimientosRaw.length}`);
          
          // Filtrar solo entradas de productos secos (Compras en kg)
          historial = movimientosRaw
            .filter((mov: any) => {
              const tipoMov = mov.fields[FIELD_IDS.TIPO_MOVIMIENTO];
              const unidadMedida = mov.fields[FIELD_IDS.UNIDAD_MEDIDA];
              const motivo = mov.fields[FIELD_IDS.MOTIVO];
              
              // Solo mostrar: Entradas con unidad "kg" y motivo "Compra"
              const esEntrada = tipoMov === 'Entrada';
              const esKg = unidadMedida === 'kg' || unidadMedida === 'Kg';
              const esCompra = motivo === 'Compra';
              
              return esEntrada && esKg && esCompra;
            })
            .map((mov: any) => ({
              id: mov.id,
              idMovimiento: mov.fields[FIELD_IDS.ID_MOVIMIENTO] || mov.fields[FIELD_IDS.ID] || '',
              productoId: mov.fields[FIELD_IDS.PRODUCT_ID] || '',
              tipo: mov.fields[FIELD_IDS.TIPO_MOVIMIENTO] || '',
              cantidad: mov.fields[FIELD_IDS.CANTIDAD] || 0,
              unidadMedida: mov.fields[FIELD_IDS.UNIDAD_MEDIDA] || 'kg',
              motivo: mov.fields[FIELD_IDS.MOTIVO] || '',
              documentoReferencia: mov.fields[FIELD_IDS.DOCUMENTO_REFERENCIA] || '',
              responsable: mov.fields[FIELD_IDS.RESPONSABLE] || '',
              fechaMovimiento: mov.fields[FIELD_IDS.FECHA_MOVIMIENTO] || '',
              observaciones: mov.fields[FIELD_IDS.OBSERVACIONES] || '',
              createdTime: mov.createdTime
            }))
            .sort((a: any, b: any) => {
              // Ordenar por fecha descendente
              return new Date(b.fechaMovimiento || b.createdTime).getTime() - 
                     new Date(a.fechaMovimiento || a.createdTime).getTime();
            })
            .slice(0, 50); // Limitar a 50 registros
          
          console.log(`✅ ${historial.length} entradas de productos secos (Compras en kg) encontradas`);
        } else {
          const errorText = await movimientosResponse.text();
          console.error('❌ Error obteniendo movimientos:', errorText);
        }
      } catch (historialError) {
        console.warn('⚠️ No se pudo obtener historial:', historialError);
      }
    }

    return NextResponse.json({
      success: true,
      productos,
      historial: incluirHistorial ? historial : undefined,
      total: productos.length,
      mensaje: `${productos.length} productos secos disponibles para ingreso`
    });

  } catch (error) {
    console.error('❌ Error en productos-secos GET:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor',
        productos: [],
        total: 0
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Registrar ingreso de producto seco (Compra)
// Crea un movimiento de tipo "Entrada" en Inventario Production Core
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 [PRODUCTOS-SECOS-API] Registrando ingreso de producto seco:', JSON.stringify(body, null, 2));

    // Validaciones
    if (!body.productoId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere el ID del producto' },
        { status: 400 }
      );
    }

    if (!body.cantidad || body.cantidad <= 0) {
      return NextResponse.json(
        { success: false, error: 'Se requiere una cantidad válida mayor a 0' },
        { status: 400 }
      );
    }

    // ========================================================================
    // PASO 1: Verificar que el producto existe en Sirius Product Core
    // Si productoId empieza con "rec", es un Airtable Record ID → fetch directo
    // Si no, buscar por "Codigo Producto"
    // ========================================================================
    const productosBaseUrl = buildSiriusProductCoreUrl(SIRIUS_PRODUCT_CORE_CONFIG.TABLES.PRODUCTOS);
    
    let productoUrl: string;
    const esRecordId = body.productoId.startsWith('rec');
    
    if (esRecordId) {
      // Fetch directo por Record ID
      productoUrl = `${productosBaseUrl}/${body.productoId}`;
      console.log('🔍 Verificando producto por Record ID:', productoUrl);
    } else {
      // Buscar por Codigo Producto
      const filterFormula = encodeURIComponent(`{Codigo Producto}="${body.productoId}"`);
      productoUrl = `${productosBaseUrl}?filterByFormula=${filterFormula}&maxRecords=1`;
      console.log('🔍 Verificando producto por código:', productoUrl);
    }
    
    const productoResponse = await fetch(productoUrl, {
      method: 'GET',
      headers: getSiriusProductCoreHeaders(),
    });

    if (!productoResponse.ok) {
      console.error('❌ Error buscando producto');
      return NextResponse.json(
        { success: false, error: 'Error buscando producto en el catálogo' },
        { status: 500 }
      );
    }

    const productoResponseData = await productoResponse.json();
    
    // Normalizar: fetch directo devuelve un record, filtro devuelve { records: [...] }
    let producto: any;
    if (esRecordId) {
      if (!productoResponseData.id) {
        console.error('❌ Producto no encontrado con Record ID:', body.productoId);
        return NextResponse.json(
          { success: false, error: `Producto no encontrado con ID: ${body.productoId}` },
          { status: 404 }
        );
      }
      producto = productoResponseData;
    } else {
      if (!productoResponseData.records || productoResponseData.records.length === 0) {
        console.error('❌ Producto no encontrado con código:', body.productoId);
        return NextResponse.json(
          { success: false, error: `Producto no encontrado con código: ${body.productoId}` },
          { status: 404 }
        );
      }
      producto = productoResponseData.records[0];
    }
    const codigoProducto = producto.fields['Codigo Producto'] || body.productoId;
    const nombreProducto = producto.fields['Nombre Comercial'] || 'Producto';
    
    console.log(`✅ Producto verificado: ${nombreProducto} (${codigoProducto})`);

    // ========================================================================
    // PASO 1b: Las bacterias entran con respaldo — la fermentación de donde
    // salen, o el lote y el motivo si no está registrada. Ver respaldo-bacterias.
    // ========================================================================
    let respaldo: RespaldoEntrada | null;
    try {
      respaldo = await resolverRespaldo(codigoProducto, Number(body.cantidad), {
        fermentacionId: body.fermentacionId,
        codigoLote: body.codigoLote,
        motivoSinFermentacion: body.motivoSinFermentacion,
      });
    } catch (error) {
      if (error instanceof RespaldoInvalido) {
        return NextResponse.json({ success: false, error: error.message }, { status: error.status });
      }
      throw error;
    }

    // ========================================================================
    // PASO 2: Crear movimiento de inventario (Entrada = Compra)
    // Usamos Field IDs de las variables de entorno
    // ========================================================================
    const movimientosUrl = buildSiriusInventarioUrl(SIRIUS_INVENTARIO_CONFIG.TABLES.MOVIMIENTOS_INVENTARIO);
    
    // Preparar fecha de movimiento
    let fechaMovimiento = body.fechaMovimiento;
    if (!fechaMovimiento) {
      fechaMovimiento = new Date().toISOString();
    } else if (!fechaMovimiento.includes('T')) {
      fechaMovimiento = new Date(fechaMovimiento + 'T00:00:00.000Z').toISOString();
    }

    // Obtener Field IDs desde la configuración
    const FIELD_IDS = SIRIUS_INVENTARIO_CONFIG.FIELDS_MOVIMIENTOS;

    // Construir campos del movimiento usando Field IDs
    const movimientoFields: Record<string, any> = {};
    
    // Determinar unidad de medida y motivo (por defecto kg y Compra, pero puede venir del body)
    const unidadMedida = body.unidadMedida || 'kg';
    const motivo = body.motivo || 'Compra';

    // Campos obligatorios
    if (FIELD_IDS.PRODUCT_ID) {
      movimientoFields[FIELD_IDS.PRODUCT_ID] = codigoProducto;
    }
    if (FIELD_IDS.TIPO_MOVIMIENTO) {
      movimientoFields[FIELD_IDS.TIPO_MOVIMIENTO] = 'Entrada';
    }
    if (FIELD_IDS.CANTIDAD) {
      movimientoFields[FIELD_IDS.CANTIDAD] = body.cantidad;
    }
    if (FIELD_IDS.UNIDAD_MEDIDA) {
      movimientoFields[FIELD_IDS.UNIDAD_MEDIDA] = unidadMedida;
    }
    if (FIELD_IDS.MOTIVO) {
      movimientoFields[FIELD_IDS.MOTIVO] = motivo;
    }
    // Ubicación destino: pedido específico o STOCK-GENERAL por defecto
    if (FIELD_IDS.UBICACION_DESTINO_ID) {
      movimientoFields[FIELD_IDS.UBICACION_DESTINO_ID] = body.ubicacionDestinoId || 'STOCK-GENERAL';
    }
    if (FIELD_IDS.FECHA_MOVIMIENTO) {
      movimientoFields[FIELD_IDS.FECHA_MOVIMIENTO] = fechaMovimiento;
    }

    // Campos opcionales
    if (body.responsable && FIELD_IDS.RESPONSABLE) {
      movimientoFields[FIELD_IDS.RESPONSABLE] = body.responsable;
    }
    
    if ((body.documentoReferencia || body.numeroFactura) && FIELD_IDS.DOCUMENTO_REFERENCIA) {
      movimientoFields[FIELD_IDS.DOCUMENTO_REFERENCIA] = body.documentoReferencia || body.numeroFactura;
    }

    // El lote va en el origen del movimiento y la fermentación en el documento:
    // es lo que permite ir de una entrada de bacterias a su producción.
    if (respaldo) {
      if (respaldo.codigoLote) movimientoFields[FIELD_IDS.UBICACION_ORIGEN_ID] = respaldo.codigoLote;
      movimientoFields[FIELD_IDS.DOCUMENTO_REFERENCIA] =
        respaldo.tipo === 'fermentacion' ? `FERMENTACION-${respaldo.fermentacionId}` : DOCUMENTO_SIN_FERMENTACION;
    }

    // Construir observaciones
    let observaciones = '';
    if (respaldo?.tipo === 'fermentacion') {
      observaciones += `Fermentación ${respaldo.codigoLote}. `;
    } else if (respaldo?.tipo === 'sin-fermentacion') {
      observaciones += 'Sin fermentación registrada';
      if (respaldo.codigoLote) observaciones += ` (lote ${respaldo.codigoLote})`;
      observaciones += respaldo.motivo ? `: ${respaldo.motivo}. ` : '. ';
    }
    if (body.fechaVencimiento) {
      observaciones += `Vencimiento: ${body.fechaVencimiento}. `;
    }
    if (body.lote) {
      observaciones += `Lote: ${body.lote}. `;
    }
    if (body.proveedor) {
      observaciones += `Proveedor: ${body.proveedor}. `;
    }
    if (body.observaciones || body.notas) {
      observaciones += body.observaciones || body.notas;
    }
    
    if (observaciones && FIELD_IDS.OBSERVACIONES) {
      movimientoFields[FIELD_IDS.OBSERVACIONES] = observaciones.trim();
    }

    const movimientoData = {
      fields: movimientoFields
    };

    console.log('📤 Creando movimiento de inventario:', movimientoData);

    // Primero se descuenta la fermentación: si eso falla no se ha escrito nada.
    const salidaFermentacionId =
      respaldo?.tipo === 'fermentacion'
        ? await descontarFermentacion(respaldo.fermentacionId, Number(body.cantidad), body.responsable || 'Sistema')
        : null;

    // Sin la entrada, el descuento dejaría litros de la fermentación perdidos.
    const deshacerDescuento = async () => {
      if (!salidaFermentacionId) return;
      await deshacerDescuentoFermentacion(salidaFermentacionId).catch((e) =>
        console.error('❌ No se pudo deshacer la salida de fermentación', salidaFermentacionId, e),
      );
    };

    let movimientoResponse: Response;
    try {
      movimientoResponse = await fetch(movimientosUrl, {
        method: 'POST',
        headers: getSiriusInventarioHeaders(),
        body: JSON.stringify(movimientoData),
      });
    } catch (error) {
      await deshacerDescuento();
      throw error;
    }

    if (!movimientoResponse.ok) {
      const errorText = await movimientoResponse.text();
      console.error('❌ Error creando movimiento:', errorText);
      await deshacerDescuento();
      throw new Error(`Error registrando ingreso: ${movimientoResponse.status} - ${errorText}`);
    }

    const movimientoCreado: MovimientoInventario = await movimientoResponse.json();
    console.log('✅ Movimiento de inventario creado:', movimientoCreado.id);

    return NextResponse.json({
      success: true,
      movimiento: {
        id: movimientoCreado.id,
        idMovimiento: movimientoCreado.fields['ID Movimiento'],
        productoId: codigoProducto,
        nombreProducto: nombreProducto,
        tipo: 'Entrada',
        cantidad: body.cantidad,
        unidadMedida: unidadMedida,
        motivo: motivo,
        fechaMovimiento: fechaMovimiento,
      },
      mensaje: `Ingreso de ${body.cantidad} kg de ${nombreProducto} registrado exitosamente`
    });

  } catch (error) {
    console.error('❌ Error en productos-secos POST:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}
