/**
 * API de prueba para enviar correos electrónicos
 * POST /api/test-email - enviar correo
 * GET /api/test-email - diagnóstico de configuración
 */
import { NextResponse } from 'next/server';
import { enviarCorreo } from '@/lib/email';
import { ConfidentialClientApplication } from '@azure/msal-node';

// GET: Diagnóstico
export async function GET() {
  const clientId = process.env.AZURE_CLIENT_ID;
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const senderEmail = process.env.OUTLOOK_SENDER_EMAIL;

  const diag: any = {
    config: {
      clientId: clientId ? `${clientId.substring(0, 8)}...` : 'MISSING',
      tenantId: tenantId ? `${tenantId.substring(0, 8)}...` : 'MISSING',
      clientSecret: clientSecret ? `${clientSecret.substring(0, 8)}...` : 'MISSING',
      senderEmail: senderEmail || 'MISSING',
    },
    tokenTest: null,
    graphTest: null,
  };

  // Test token acquisition
  try {
    const msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: clientId!,
        clientSecret: clientSecret!,
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
    });
    const result = await msalClient.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default'],
    });
    diag.tokenTest = {
      success: true,
      tokenLength: result?.accessToken?.length,
      expiresOn: result?.expiresOn,
    };

    // Test Graph API - check mailbox exists
    if (result?.accessToken) {
      const graphRes = await fetch(
        `https://graph.microsoft.com/v1.0/users/${senderEmail}`,
        { headers: { Authorization: `Bearer ${result.accessToken}` } }
      );
      const graphData = await graphRes.json();
      diag.graphTest = {
        status: graphRes.status,
        userFound: graphRes.ok,
        displayName: graphData.displayName || null,
        mail: graphData.mail || null,
        error: graphData.error || null,
      };
    }
  } catch (err: any) {
    diag.tokenTest = { success: false, error: err.message };
  }

  return NextResponse.json(diag);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, message } = body;

    if (!to) {
      return NextResponse.json({ success: false, error: 'Se requiere destinatario (to)' }, { status: 400 });
    }

    const resultado = await enviarCorreo({
      to,
      subject: subject || '🧪 Prueba de correo - Sirius Regenerative Solutions',
      body: message || `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: #111111; padding: 30px 40px; text-align: center;">
            <h1 style="color: #2ebd6b; margin: 0; font-size: 24px; letter-spacing: 2px;">SIRIUS</h1>
            <p style="color: #999999; margin: 5px 0 0; font-size: 12px; letter-spacing: 1px;">REGENERATIVE SOLUTIONS</p>
          </div>
          
          <!-- Green accent -->
          <div style="height: 3px; background: #2ebd6b;"></div>
          
          <!-- Body -->
          <div style="padding: 40px;">
            <h2 style="color: #222222; font-size: 20px; margin: 0 0 15px;">Prueba de Correo Exitosa</h2>
            <p style="color: #555555; font-size: 14px; line-height: 1.6;">
              Este es un correo de prueba enviado desde el sistema <strong>DataLab</strong> de Sirius Regenerative Solutions.
            </p>
            <p style="color: #555555; font-size: 14px; line-height: 1.6;">
              Si recibes este mensaje, la integración con Microsoft Graph está funcionando correctamente.
            </p>
            
            <!-- Info box -->
            <div style="background: #ecfaf1; border-left: 4px solid #2ebd6b; padding: 15px 20px; margin: 25px 0; border-radius: 4px;">
              <p style="color: #176633; margin: 0; font-size: 13px;">
                <strong>Sistema:</strong> DataLab - Sirius Regenerative Solutions<br/>
                <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}<br/>
                <strong>Hora:</strong> ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 20px 40px; border-top: 1px solid #e8e8e8; text-align: center;">
            <p style="color: #999999; font-size: 11px; margin: 0;">
              Sirius Regenerative Solutions S.A.S. ZOMAC<br/>
              Este correo fue generado automáticamente por DataLab.
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json(resultado);

  } catch (error: any) {
    console.error('❌ Error en test-email:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error desconocido enviando correo',
    }, { status: 500 });
  }
}
