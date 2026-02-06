import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { 
  SIRIUS_REMISIONES_CORE_CONFIG,
  SIRIUS_CLIENT_CORE_CONFIG,
  SIRIUS_PRODUCT_CORE_CONFIG,
  SIRIUS_PEDIDOS_CORE_CONFIG
} from '@/lib/constants/airtable';
import { uploadToS3 } from '@/lib/s3';
import { generarRemisionPDF, DatosRemisionPDF } from '@/lib/remision-pdf-generator';
import { buscarOCrearPersona, vincularPersonaARemision, obtenerPersonasDeRemision } from '@/lib/personas-remision';

const baseRemisiones = new Airtable({
  apiKey: SIRIUS_REMISIONES_CORE_CONFIG.API_KEY
}).base(SIRIUS_REMISIONES_CORE_CONFIG.BASE_ID);

const baseClientCore = new Airtable({
  apiKey: SIRIUS_CLIENT_CORE_CONFIG.API_KEY
}).base(SIRIUS_CLIENT_CORE_CONFIG.BASE_ID);

/**
 * POST /api/remisiones/firmar
 * Firma la remisión como receptor y genera el documento final
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      remisionId,
      receptorNombre,
      receptorCedula
    } = body;

    console.log('📝 Firmando remisión:', remisionId, 'Receptor:', receptorNombre || '(auto-lookup por cédula)');

    if (!remisionId || !receptorCedula) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere remisionId y receptorCedula'
      }, { status: 400 });
    }

    // Si no se proporcionó nombre, buscar por cédula en personas existentes
    let nombreFinal = receptorNombre;
    if (!nombreFinal) {
      try {
        const personasExistentes = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.PERSONAS)
          .select({
            filterByFormula: `{Cedula} = "${receptorCedula}"`,
            maxRecords: 1
          })
          .firstPage();
        
        if (personasExistentes.length > 0) {
          nombreFinal = personasExistentes[0].get('Nombre Completo') as string;
          console.log('✅ Nombre encontrado por cédula:', nombreFinal);
        }
      } catch (error) {
        console.warn('⚠️ Error buscando persona por cédula:', error);
      }
      
      if (!nombreFinal) {
        return NextResponse.json({
          success: false,
          error: 'No se encontró una persona con esa cédula. Proporcione el nombre completo.',
          requireNombre: true
        }, { status: 400 });
      }
    }

    // 1. Buscar la remisión
    let remisionRecord;
    if (remisionId.startsWith('rec')) {
      remisionRecord = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.REMISIONES).find(remisionId);
    } else {
      const records = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.REMISIONES)
        .select({
          filterByFormula: `{ID} = "${remisionId}"`,
          maxRecords: 1
        })
        .firstPage();
      remisionRecord = records[0];
    }

    if (!remisionRecord) {
      return NextResponse.json({
        success: false,
        error: 'Remisión no encontrada'
      }, { status: 404 });
    }

    // 2. Verificar que no esté ya entregada
    const estadoActual = remisionRecord.get('Estado') as string;
    if (estadoActual === 'Entregada') {
      return NextResponse.json({
        success: false,
        error: 'Esta remisión ya fue entregada'
      }, { status: 400 });
    }

    const fechaRecepcion = new Date().toISOString().split('T')[0];

    // 3. Crear/buscar persona receptora y vincularla
    const personaReceptor = await buscarOCrearPersona({
      nombreCompleto: nombreFinal,
      cedula: receptorCedula,
      tipo: 'Receptor',
    });

    const personasActuales = remisionRecord.get('Personas') as string[] || [];
    await vincularPersonaARemision(remisionRecord.id, personaReceptor.recordId, personasActuales);
    
    console.log('✅ Receptor vinculado:', personaReceptor.codigo);

    // 4. Actualizar la remisión a estado Entregada
    await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.REMISIONES)
      .update(remisionRecord.id, {
        'Fecha Recibido': fechaRecepcion,
        'Estado': 'Entregada'
      });

    console.log('✅ Remisión actualizada con firma del receptor');

    // 5. Obtener todas las personas vinculadas para el documento
    const todasLasPersonas = await obtenerPersonasDeRemision(remisionRecord.id);
    const transportista = todasLasPersonas.find(p => p.tipo === 'Transportista');
    const receptor = todasLasPersonas.find(p => p.tipo === 'Receptor');

    // 6. Regenerar documento con todas las firmas
    const idRemision = remisionRecord.get('ID') as string;
    const numeracion = remisionRecord.get('numeracion') as number;
    const idCliente = remisionRecord.get('ID Cliente') as string;
    const idPedido = remisionRecord.get('ID Pedido') as string;
    const areaOrigen = remisionRecord.get('Area Origen') as string || 'Laboratorio';
    const responsable = remisionRecord.get('Responsable Entrega') as string;
    const fechaDespacho = remisionRecord.get('Fecha Pedido Despachado') as string;
    const notas = remisionRecord.get('Notas de Remisión') as string;
    const productosRemitidosIds = remisionRecord.get('Productos Remitidos') as string[] || [];

    // Obtener nombre del cliente
    const clienteRecords = await baseClientCore(SIRIUS_CLIENT_CORE_CONFIG.TABLES.CLIENTES)
      .select({
        filterByFormula: `{ID} = "${idCliente}"`,
        maxRecords: 1
      })
      .firstPage();
    
    const nombreCliente = clienteRecords.length > 0 
      ? clienteRecords[0].get('Cliente') as string
      : idCliente;

    // Obtener productos remitidos con nombres completos
    const baseProductCore = new Airtable({
      apiKey: SIRIUS_PRODUCT_CORE_CONFIG.API_KEY
    }).base(SIRIUS_PRODUCT_CORE_CONFIG.BASE_ID);

    const productosRemitidos = await Promise.all(
      productosRemitidosIds.map(async (prodId) => {
        const prodRecord = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.PRODUCTOS_REMITIDOS).find(prodId);
        const idProducto = prodRecord.get('ID Producto') as string;
        const cantidad = prodRecord.get('Cantidad') as number || 0;
        const unidad = prodRecord.get('Unidad') as string || 'L';

        // Obtener nombre del producto desde Product Core
        let nombreProducto = idProducto;
        try {
          const productRecords = await baseProductCore(SIRIUS_PRODUCT_CORE_CONFIG.TABLES.PRODUCTOS)
            .select({
              filterByFormula: `{Codigo Producto} = "${idProducto}"`,
              maxRecords: 1
            })
            .firstPage();

          if (productRecords.length > 0) {
            nombreProducto = productRecords[0].get('Nombre Comercial') as string || idProducto;
          }
        } catch (error) {
          console.warn('⚠️ No se pudo obtener nombre del producto:', idProducto);
        }

        return {
          nombre: nombreProducto,
          cantidad,
          unidad
        };
      })
    );

    const datosRemision: DatosRemisionPDF = {
      idRemision,
      numeracion,
      fechaRemision: remisionRecord.get('Fecha de Remisión') as string,
      cliente: nombreCliente,
      idCliente,
      idPedido,
      productos: productosRemitidos,
      responsableEntrega: responsable,
      transportista: transportista ? {
        nombre: transportista.nombreCompleto,
        cedula: transportista.cedula,
        fechaFirma: fechaDespacho
      } : undefined,
      receptor: receptor ? {
        nombre: receptor.nombreCompleto,
        cedula: receptor.cedula,
        fechaFirma: fechaRecepcion
      } : undefined,
      areaOrigen,
      notas: notas
    };

    // Generar PDF profesional
    console.log('📄 Generando PDF de remisión...');
    const pdfBytes = await generarRemisionPDF(datosRemision);
    console.log('✅ PDF generado:', pdfBytes.length, 'bytes');
    
    // Nombre del archivo = ID de la remisi\u00f3n (ej: SIRIUS-REM-0004.pdf)
    const nombreArchivo = `${idRemision}.pdf`;

    console.log('📤 Subiendo PDF a S3:', nombreArchivo);
    const resultadoS3 = await uploadToS3(
      Buffer.from(pdfBytes),
      nombreArchivo,
      'application/pdf'
    );

    let urlDocumentoFinal = '';
    if (resultadoS3.success && resultadoS3.url) {
      urlDocumentoFinal = resultadoS3.url;
      // Actualizar la remisión con la nueva URL
      await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.REMISIONES)
        .update(remisionRecord.id, {
          'URL Remision Generada': resultadoS3.url
        });
      
      console.log('✅ PDF subido exitosamente:', resultadoS3.url);
    } else {
      console.error('❌ Error subiendo PDF a S3:', resultadoS3.error);
    }

    // Actualizar estado del pedido a "Completado"
    try {
      console.log('📦 Actualizando estado del pedido a "Completado"...');
      
      const basePedidos = new Airtable({
        apiKey: SIRIUS_PEDIDOS_CORE_CONFIG.API_KEY
      }).base(SIRIUS_PEDIDOS_CORE_CONFIG.BASE_ID);

      const pedidosRecords = await basePedidos(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PEDIDOS)
        .select({
          filterByFormula: `{ID Pedido Core} = "${idPedido}"`,
          maxRecords: 1
        })
        .firstPage();

      if (pedidosRecords.length > 0) {
        await basePedidos(SIRIUS_PEDIDOS_CORE_CONFIG.TABLES.PEDIDOS)
          .update(pedidosRecords[0].id, {
            'Estado': 'Completado'
          });
        console.log('✅ Estado del pedido actualizado a "Completado"');
      }
    } catch (pedidoError) {
      console.warn('⚠️ No se pudo actualizar el estado del pedido:', pedidoError);
      // No lanzar error para no bloquear el flujo principal
    }

    return NextResponse.json({
      success: true,
      remision: {
        id: remisionRecord.id,
        idRemision,
        estado: 'Entregada',
        urlDocumento: urlDocumentoFinal || null,
        nombreArchivo: nombreArchivo
      },
      mensaje: `Remisión ${idRemision} firmada exitosamente por ${nombreFinal}`
    });

  } catch (error: any) {
    console.error('❌ Error firmando remisión:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al firmar la remisión',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * GET /api/remisiones/firmar?remisionId=XXX
 * Obtiene los datos de una remisión para mostrar el formulario de firma
 */
/**
 * GET /api/remisiones/firmar?remisionId=XXX
 * Obtiene los datos de una remisión para mostrar en la página de firma
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const remisionId = searchParams.get('remisionId');

    if (!remisionId) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere remisionId'
      }, { status: 400 });
    }

    // Buscar la remisión
    let remisionRecord;
    if (remisionId.startsWith('rec')) {
      remisionRecord = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.REMISIONES).find(remisionId);
    } else {
      const records = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.REMISIONES)
        .select({
          filterByFormula: `{ID} = "${remisionId}"`,
          maxRecords: 1
        })
        .firstPage();
      remisionRecord = records[0];
    }

    if (!remisionRecord) {
      return NextResponse.json({
        success: false,
        error: 'Remisión no encontrada'
      }, { status: 404 });
    }

    const idRemision = remisionRecord.get('ID') as string;
    const numeracion = remisionRecord.get('numeracion') as number;
    const estado = remisionRecord.get('Estado') as string;
    const idCliente = remisionRecord.get('ID Cliente') as string;
    const idPedido = remisionRecord.get('ID Pedido') as string;
    const fechaRemision = remisionRecord.get('Fecha de Remisión') as string || '';
    const areaOrigen = remisionRecord.get('Area Origen') as string || 'Laboratorio';
    const responsableEntrega = remisionRecord.get('Responsable Entrega') as string || '';
    const notas = remisionRecord.get('Notas de Remisión') as string || '';
    const totalCantidad = remisionRecord.get('Total Cantidad Remitida') as number || 0;
    const fechaDespacho = remisionRecord.get('Fecha Pedido Despachado') as string || '';
    const urlDocumento = remisionRecord.get('URL Remision Generada') as string || '';
    const productosRemitidosIds = remisionRecord.get('Productos Remitidos') as string[] || [];

    // Obtener nombre del cliente
    let nombreCliente = idCliente;
    try {
      const clienteRecords = await baseClientCore(SIRIUS_CLIENT_CORE_CONFIG.TABLES.CLIENTES)
        .select({
          filterByFormula: `{ID} = "${idCliente}"`,
          maxRecords: 1
        })
        .firstPage();
      if (clienteRecords.length > 0) {
        nombreCliente = clienteRecords[0].get('Cliente') as string || idCliente;
      }
    } catch (error) {
      console.warn('⚠️ No se pudo obtener nombre del cliente:', idCliente);
    }

    // Obtener personas vinculadas
    const personas = await obtenerPersonasDeRemision(remisionRecord.id);
    const transportistaPersona = personas.find(p => p.tipo === 'Transportista');
    const receptor = personas.find(p => p.tipo === 'Receptor');
    const yaFirmada = estado === 'Entregada' && receptor !== undefined;

    // Obtener productos con nombres completos
    const baseProductCore = new Airtable({
      apiKey: SIRIUS_PRODUCT_CORE_CONFIG.API_KEY
    }).base(SIRIUS_PRODUCT_CORE_CONFIG.BASE_ID);

    const productos = await Promise.all(
      productosRemitidosIds.map(async (prodId) => {
        const prodRecord = await baseRemisiones(SIRIUS_REMISIONES_CORE_CONFIG.TABLES.PRODUCTOS_REMITIDOS).find(prodId);
        const idProducto = prodRecord.get('ID Producto') as string;
        const cantidad = prodRecord.get('Cantidad') as number || 0;
        const unidad = prodRecord.get('Unidad') as string || 'L';

        // Obtener nombre del producto desde Product Core
        let nombreProducto = idProducto;
        try {
          const productRecords = await baseProductCore(SIRIUS_PRODUCT_CORE_CONFIG.TABLES.PRODUCTOS)
            .select({
              filterByFormula: `{Codigo Producto} = "${idProducto}"`,
              maxRecords: 1
            })
            .firstPage();

          if (productRecords.length > 0) {
            nombreProducto = productRecords[0].get('Nombre Comercial') as string || idProducto;
          }
        } catch (error) {
          console.warn('⚠️ No se pudo obtener nombre del producto:', idProducto);
        }

        return {
          nombre: nombreProducto,
          cantidad,
          unidad
        };
      })
    );

    return NextResponse.json({
      success: true,
      remision: {
        id: remisionRecord.id,
        idRemision,
        numeracion,
        estado,
        idCliente,
        nombreCliente,
        idPedido,
        fechaRemision,
        areaOrigen,
        responsableEntrega,
        notas,
        totalCantidad,
        fechaDespacho,
        urlDocumento,
        productos,
        yaFirmada,
        transportista: transportistaPersona ? {
          nombreCompleto: transportistaPersona.nombreCompleto,
          cedula: transportistaPersona.cedula,
        } : null,
        receptor: receptor ? {
          nombreCompleto: receptor.nombreCompleto,
          cedula: receptor.cedula,
        } : null,
      }
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo remisión:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al obtener la remisión',
      details: error.message
    }, { status: 500 });
  }
}
