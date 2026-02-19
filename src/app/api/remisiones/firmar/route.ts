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
import { enviarCorreo } from '@/lib/email';

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

    // ====================================================================
    // 8. Enviar correo con la remisión firmada adjunta
    // Busca contactos activos del cliente y envía el PDF como adjunto
    // ====================================================================
    try {
      console.log('📧 Iniciando envío de correo con remisión firmada...');
      
      const FIELDS = SIRIUS_CLIENT_CORE_CONFIG.FIELDS_PERSONAL;
      
      // 8a. Encontrar el Record ID del cliente
      let clienteRecordId: string | null = null;
      const clienteRecordsForEmail = await baseClientCore(SIRIUS_CLIENT_CORE_CONFIG.TABLES.CLIENTES)
        .select({
          filterByFormula: `{ID} = "${idCliente}"`,
          maxRecords: 1
        })
        .firstPage();

      if (clienteRecordsForEmail.length > 0) {
        clienteRecordId = clienteRecordsForEmail[0].id;
      }

      // 8b. Obtener personal activo del cliente
      const emailsUnicos: Set<string> = new Set();
      
      if (clienteRecordId) {
        const personalRecords = await baseClientCore(SIRIUS_CLIENT_CORE_CONFIG.TABLES.PERSONAL_CLIENTE)
          .select({
            filterByFormula: `{Estado Personal} = "Activo"`,
            fields: [
              FIELDS.CODIGO_PERSONA,
              FIELDS.NOMBRE_COMPLETO,
              FIELDS.EMAIL_NOTIFICACION,
              FIELDS.EMAIL,
              FIELDS.CLIENTE,
              FIELDS.ESTADO_PERSONAL,
            ]
          })
          .all();

        personalRecords.forEach(record => {
          const clienteField = record.get('Cliente');
          const codigoPersona = record.get('Codigo Persona Cliente') as string || '';

          let isClienteMatch = false;
          if (Array.isArray(clienteField)) {
            isClienteMatch = clienteField.some(
              (val: string) => val === clienteRecordId || val === idCliente
            );
          } else if (typeof clienteField === 'string') {
            isClienteMatch = clienteField === clienteRecordId || clienteField === idCliente;
          }
          if (!isClienteMatch && codigoPersona && idCliente) {
            isClienteMatch = codigoPersona.startsWith(idCliente);
          }

          if (!isClienteMatch) return;

          const emailNotif = record.get('Email Notificacion') as string;
          const emailNormal = record.get('Email') as string;
          const email = emailNotif || emailNormal;

          if (email && email.trim()) {
            emailsUnicos.add(email.trim().toLowerCase());
          }
        });
      }

      // 8c. Preparar CC corporativos fijos
      const emailsCorporativosFijos = (process.env.REMISION_EMAIL_CC || '')
        .split(',')
        .map(e => e.trim())
        .filter(e => e);

      const emailsArray = Array.from(emailsUnicos);
      const todosDestinatarios = [...emailsArray, ...emailsCorporativosFijos];

      if (todosDestinatarios.length === 0) {
        console.warn('⚠️ No se encontraron destinatarios para el correo de remisión firmada');
      } else {
        // 8d. Construir HTML del correo de remisión entregada
        const cantidadTotal = productosRemitidos.reduce((sum, p) => sum + p.cantidad, 0);
        const productosHtml = productosRemitidos.map(p =>
          `<tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;">${p.nombre}</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; text-align: center; font-weight: 600;">${p.cantidad}</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center;">${p.unidad || 'Ud'}</td>
          </tr>`
        ).join('');

        const htmlBody = buildRemisionEntregadaEmailHtml({
          idRemision,
          idPedido,
          nombreCliente,
          productosHtml,
          cantidadTotal,
          unidad: (productosRemitidos[0]?.unidad) || 'Ud',
          receptorNombre: nombreFinal,
          receptorCedula,
          fechaRecepcion,
          transportistaNombre: transportista?.nombreCompleto || 'N/A',
          urlDocumento: urlDocumentoFinal,
        });

        // 8e. Preparar PDF como adjunto (base64)
        const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

        // 8f. Enviar correo
        await enviarCorreo({
          to: emailsArray.length > 0 ? emailsArray : emailsCorporativosFijos,
          cc: emailsArray.length > 0 ? emailsCorporativosFijos : undefined,
          subject: `✅ Remisión ${idRemision} - Entregada y Firmada | Pedido ${idPedido || ''} - ${nombreCliente}`,
          body: htmlBody,
          attachments: [{
            name: `${idRemision}.pdf`,
            contentType: 'application/pdf',
            contentBytes: pdfBase64,
          }],
        });

        console.log(`✅ Correo de remisión firmada enviado a: ${todosDestinatarios.join(', ')}`);
      }
    } catch (emailError) {
      // No bloquear el flujo principal si falla el correo
      console.error('⚠️ Error enviando correo de remisión firmada (no bloquea):', emailError);
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

// ====================================================================
// Helper: Construir HTML del correo de remisión entregada
// ====================================================================
function buildRemisionEntregadaEmailHtml(params: {
  idRemision: string;
  idPedido: string;
  nombreCliente: string;
  productosHtml: string;
  cantidadTotal: number;
  unidad: string;
  receptorNombre: string;
  receptorCedula: string;
  fechaRecepcion: string;
  transportistaNombre: string;
  urlDocumento: string;
}): string {
  const { idRemision, idPedido, nombreCliente, productosHtml, cantidadTotal, unidad, receptorNombre, receptorCedula, fechaRecepcion, transportistaNombre, urlDocumento } = params;

  const fechaFormateada = new Date(fechaRecepcion + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669, #10b981); padding: 32px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">
                Remision Entregada y Firmada
              </h1>
              <p style="color: #d1fae5; margin: 0; font-size: 14px;">
                Sirius Laboratorio - Sistema de Despachos
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 40px;">
              
              <!-- Estado badge -->
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; background-color: #059669; color: #ffffff; padding: 8px 24px; border-radius: 20px; font-size: 14px; font-weight: 700; letter-spacing: 0.5px;">
                  ENTREGADA
                </span>
              </div>

              <!-- Info general -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #f8fafc; border-radius: 8px 8px 0 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Remision</span>
                    <p style="margin: 4px 0 0; font-size: 18px; font-weight: 700; color: #1e3a5f;">${idRemision}</p>
                  </td>
                  <td style="padding: 12px 16px; background-color: #f8fafc; border-radius: 8px 8px 0 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Pedido</span>
                    <p style="margin: 4px 0 0; font-size: 18px; font-weight: 700; color: #4f46e5;">${idPedido || 'N/A'}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Cliente</span>
                    <p style="margin: 4px 0 0; font-size: 15px; font-weight: 600; color: #1f2937;">${nombreCliente}</p>
                  </td>
                  <td style="padding: 12px 16px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Fecha de Recepcion</span>
                    <p style="margin: 4px 0 0; font-size: 15px; font-weight: 600; color: #1f2937;">${fechaFormateada}</p>
                  </td>
                </tr>
              </table>

              <!-- Recepción -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border: 2px solid #059669; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background-color: #059669; padding: 10px 16px;">
                    <span style="font-size: 12px; color: #ffffff; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Datos de Recepcion</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 4px 0;">
                          <span style="font-size: 12px; color: #64748b;">Recibido por:</span>
                          <p style="margin: 2px 0 8px; font-size: 15px; font-weight: 600; color: #1f2937;">${receptorNombre}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0;">
                          <span style="font-size: 12px; color: #64748b;">Cedula:</span>
                          <span style="font-size: 14px; font-weight: 600; color: #1f2937; margin-left: 8px;">${receptorCedula}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0;">
                          <span style="font-size: 12px; color: #64748b;">Transportista:</span>
                          <span style="font-size: 14px; color: #1f2937; margin-left: 8px;">${transportistaNombre}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Productos -->
              ${productosHtml ? `
              <h3 style="font-size: 14px; color: #374151; margin: 0 0 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                Productos Entregados
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                <thead>
                  <tr style="background-color: #1e3a5f;">
                    <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #ffffff; font-weight: 600; text-transform: uppercase;">Producto</th>
                    <th style="padding: 10px 16px; text-align: center; font-size: 12px; color: #ffffff; font-weight: 600; text-transform: uppercase;">Cantidad</th>
                    <th style="padding: 10px 16px; text-align: center; font-size: 12px; color: #ffffff; font-weight: 600; text-transform: uppercase;">Unidad</th>
                  </tr>
                </thead>
                <tbody>
                  ${productosHtml}
                  <tr style="background-color: #1e3a5f;">
                    <td style="padding: 10px 16px; font-size: 14px; color: #ffffff; font-weight: 600;">Total</td>
                    <td style="padding: 10px 16px; text-align: center; font-size: 14px; color: #ffffff; font-weight: 700;">${cantidadTotal || 0}</td>
                    <td style="padding: 10px 16px; text-align: center; font-size: 14px; color: #ffffff;">${unidad}</td>
                  </tr>
                </tbody>
              </table>
              ` : ''}

              <!-- Nota sobre adjunto -->
              <div style="text-align: center; margin: 24px 0 8px; padding: 16px; background-color: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;">
                <p style="margin: 0; font-size: 14px; color: #1e40af; font-weight: 600;">
                  La remision firmada esta adjunta a este correo en formato PDF.
                </p>
              </div>

              ${urlDocumento ? `
              <!-- CTA Button -->
              <div style="text-align: center; margin: 16px 0 16px;">
                <a href="${urlDocumento}" 
                   style="display: inline-block; background: linear-gradient(135deg, #059669, #10b981); color: #ffffff; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(5,150,105,0.35);">
                  Ver Remision Online
                </a>
              </div>
              ` : ''}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 13px; color: #6b7280;">
                Sirius Regenerative - Laboratorio de Microorganismos
              </p>
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                Este correo fue enviado automaticamente. No responda a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}