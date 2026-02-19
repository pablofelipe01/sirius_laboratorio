import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { SIRIUS_CLIENT_CORE_CONFIG } from '@/lib/constants/airtable';
import { enviarCorreo } from '@/lib/email';

// Configurar Airtable para Client Core
const baseClientCore = new Airtable({
  apiKey: SIRIUS_CLIENT_CORE_CONFIG.API_KEY
}).base(SIRIUS_CLIENT_CORE_CONFIG.BASE_ID);

const FIELDS = SIRIUS_CLIENT_CORE_CONFIG.FIELDS_PERSONAL;

/**
 * POST /api/remisiones/notificar
 * Envía notificación por correo a los contactos activos del cliente sobre una remisión.
 * Deduplica por email para no enviar correos repetidos.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      idCliente,
      idRemision,
      nombreCliente,
      productos,
      cantidadTotal,
      esDespachoCompleto,
      idPedido,
      urlRemision,
    } = body;

    console.log('📧 [NOTIFICAR-REMISION] Iniciando notificación para remisión:', idRemision);
    console.log('🏢 Cliente:', idCliente, '-', nombreCliente);

    if (!idCliente || !idRemision) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere idCliente e idRemision'
      }, { status: 400 });
    }

    // ====================================================================
    // PASO 1: Encontrar el Record ID del cliente en la tabla Clientes
    // idCliente = "CL-0003", campo en Airtable = "ID"
    // ====================================================================
    let clienteRecordId: string | null = null;

    try {
      const clienteRecords = await baseClientCore(SIRIUS_CLIENT_CORE_CONFIG.TABLES.CLIENTES)
        .select({
          filterByFormula: `{ID} = "${idCliente}"`,
          maxRecords: 1
        })
        .firstPage();

      if (clienteRecords.length > 0) {
        clienteRecordId = clienteRecords[0].id;
        console.log('✅ Cliente encontrado en Airtable, recordId:', clienteRecordId);
      } else {
        console.warn('⚠️ Cliente no encontrado con ID:', idCliente);
      }
    } catch (error) {
      console.error('❌ Error buscando cliente:', error);
    }

    if (!clienteRecordId) {
      return NextResponse.json({
        success: false,
        error: `Cliente no encontrado: ${idCliente}`,
        emailsEnviados: 0
      }, { status: 404 });
    }

    // ====================================================================
    // PASO 2: Obtener todo el personal ACTIVO del cliente
    // El campo "Cliente" es un linked record (array de record IDs)
    // filterByFormula usa NOMBRES de campo, no IDs
    // ====================================================================
    const emailsUnicos: Set<string> = new Set();
    const nombresNotificados: string[] = [];

    try {
      // Obtener todo el personal activo — filtramos el cliente en JS
      // porque filterByFormula con linked records es poco fiable con IDs
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

      console.log(`📋 Total personal activo en base: ${personalRecords.length}`);
      console.log(`🔍 Buscando personal para cliente: idCliente="${idCliente}", recordId="${clienteRecordId}"`);

      // IMPORTANTE: Airtable API devuelve field NAMES como keys, no field IDs.
      // Aunque fields[] acepta IDs para seleccionar qué campos traer,
      // record.get() debe usar el NOMBRE del campo.
      personalRecords.forEach(record => {
        const clienteField = record.get('Cliente');
        const codigoPersona = record.get('Codigo Persona Cliente') as string || '';
        const nombre = record.get('Nombre Completo') as string || 'Sin nombre';

        // Debug: mostrar qué devuelve el campo Cliente
        console.log(`  👤 ${nombre} | Cliente field: ${JSON.stringify(clienteField)} | Codigo: ${codigoPersona}`);

        let isClienteMatch = false;

        // El campo "Cliente" es linked record → array de record IDs
        if (Array.isArray(clienteField)) {
          isClienteMatch = clienteField.some(
            (val: string) => val === clienteRecordId || val === idCliente
          );
        } else if (typeof clienteField === 'string') {
          isClienteMatch = clienteField === clienteRecordId || clienteField === idCliente;
        }

        // Fallback: Codigo Persona Cliente empieza con idCliente
        // ej: "CL-0003-PER-0005".startsWith("CL-0003")
        if (!isClienteMatch && codigoPersona && idCliente) {
          isClienteMatch = codigoPersona.startsWith(idCliente);
        }

        if (!isClienteMatch) {
          return; // Este personal no pertenece al cliente
        }

        // Prioridad: Email Notificacion > Email
        const emailNotif = record.get('Email Notificacion') as string;
        const emailNormal = record.get('Email') as string;
        const email = emailNotif || emailNormal;

        if (email && email.trim()) {
          const emailLower = email.trim().toLowerCase();
          if (!emailsUnicos.has(emailLower)) {
            emailsUnicos.add(emailLower);
            nombresNotificados.push(nombre);
            console.log(`  📬 MATCH → ${nombre}: ${email}`);
          } else {
            console.log(`  ⏭️ Email duplicado omitido: ${email} (${nombre})`);
          }
        } else {
          console.log(`  ⚠️ Personal sin email: ${nombre}`);
        }
      });
    } catch (error) {
      console.error('❌ Error obteniendo personal del cliente:', error);
      return NextResponse.json({
        success: false,
        error: 'Error consultando personal del cliente',
        emailsEnviados: 0
      }, { status: 500 });
    }

    if (emailsUnicos.size === 0) {
      console.warn('⚠️ No se encontraron correos de notificación para el cliente:', idCliente);
      return NextResponse.json({
        success: true,
        message: 'No se encontraron correos de notificación para este cliente',
        emailsEnviados: 0
      });
    }

    console.log(`📧 Correos únicos a notificar: ${emailsUnicos.size} → [${Array.from(emailsUnicos).join(', ')}]`);

    // ====================================================================
    // PASO 3: Construir el HTML del correo
    // ====================================================================
    const productosHtml = (productos || []).map((p: { nombre?: string; notas?: string; cantidad?: number; unidad?: string }) =>
      `<tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;">${p.nombre || p.notas || 'Producto'}</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; text-align: center; font-weight: 600;">${p.cantidad}</td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center;">${p.unidad || 'Ud'}</td>
      </tr>`
    ).join('');

    const tipoDespacho = esDespachoCompleto ? 'Despacho Completo' : 'Despacho Parcial';
    const colorEstado = esDespachoCompleto ? '#059669' : '#d97706';

    const htmlBody = buildEmailHtml({
      idRemision,
      idPedido,
      nombreCliente: nombreCliente || idCliente,
      tipoDespacho,
      colorEstado,
      productosHtml,
      cantidadTotal,
      productos,
      urlRemision,
    });

    // ====================================================================
    // PASO 4: Enviar UN solo correo con todos los destinatarios
    // Usa to: array para no repetir envíos
    // Agrega CC a los correos corporativos fijos (desde variables de entorno)
    // ====================================================================
    const emailsArray = Array.from(emailsUnicos);
    const emailsCorporativosFijos = (process.env.REMISION_EMAIL_CC || '')
      .split(',')
      .map(email => email.trim())
      .filter(email => email);

    try {
      await enviarCorreo({
        to: emailsArray,
        cc: emailsCorporativosFijos,
        subject: `📋 Remisión ${idRemision} - ${tipoDespacho} | Pedido ${idPedido || ''} - ${nombreCliente || idCliente}`,
        body: htmlBody,
      });

      console.log(`✅ Correo enviado exitosamente a ${emailsArray.length} destinatario(s): ${emailsArray.join(', ')}`);
      console.log(`📋 CC enviado a: ${emailsCorporativosFijos.join(', ')}`);

      return NextResponse.json({
        success: true,
        emailsEnviados: emailsArray.length,
        totalEmails: emailsArray.length,
        destinatarios: emailsArray,
        nombresNotificados,
        message: `Notificación enviada a ${emailsArray.length} correo(s)`
      });
    } catch (emailError: unknown) {
      const errMsg = emailError instanceof Error ? emailError.message : String(emailError);
      console.error('❌ Error enviando correo de notificación:', errMsg);
      return NextResponse.json({
        success: false,
        error: `Error enviando correo: ${errMsg}`,
        emailsEnviados: 0
      }, { status: 500 });
    }

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error en notificar remisión:', error);
    return NextResponse.json({
      success: false,
      error: errMsg || 'Error interno al notificar',
      emailsEnviados: 0
    }, { status: 500 });
  }
}

// ====================================================================
// Helper: Construir HTML del correo
// ====================================================================
function buildEmailHtml(params: {
  idRemision: string;
  idPedido: string;
  nombreCliente: string;
  tipoDespacho: string;
  colorEstado: string;
  productosHtml: string;
  cantidadTotal: number;
  productos: { unidad?: string }[];
  urlRemision: string;
}): string {
  const { idRemision, idPedido, nombreCliente, tipoDespacho, colorEstado, productosHtml, cantidadTotal, productos, urlRemision } = params;

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
            <td style="background: linear-gradient(135deg, #1e3a5f, #2563eb); padding: 32px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">
                Nueva Remision de Despacho
              </h1>
              <p style="color: #bfdbfe; margin: 0; font-size: 14px;">
                Sirius Laboratorio - Sistema de Despachos
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 40px;">
              
              <!-- Estado badge -->
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; background-color: ${colorEstado}; color: #ffffff; padding: 6px 20px; border-radius: 20px; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">
                  ${tipoDespacho}
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
                  <td style="padding: 12px 16px; background-color: #f8fafc; border-radius: 0 0 8px 8px;">
                    <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Cliente</span>
                    <p style="margin: 4px 0 0; font-size: 15px; font-weight: 600; color: #1f2937;">${nombreCliente}</p>
                  </td>
                  <td style="padding: 12px 16px; background-color: #f8fafc; border-radius: 0 0 8px 8px;">
                    <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Fecha</span>
                    <p style="margin: 4px 0 0; font-size: 15px; font-weight: 600; color: #1f2937;">${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </td>
                </tr>
              </table>

              <!-- Productos -->
              ${productosHtml ? `
              <h3 style="font-size: 14px; color: #374151; margin: 0 0 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                Productos Despachados
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
                    <td style="padding: 10px 16px; text-align: center; font-size: 14px; color: #ffffff;">${(productos && productos[0]?.unidad) || 'Ud'}</td>
                  </tr>
                </tbody>
              </table>
              ` : ''}

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0 16px;">
                <a href="${urlRemision}" 
                   style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(79,70,229,0.35);">
                  Ver Remision y Firmar
                </a>
              </div>
              <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 8px;">
                Haga clic en el boton para ver los detalles completos y firmar la recepcion del despacho.
              </p>

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
