/**
 * Servicio de correo electrónico corporativo
 * Usa Microsoft Graph API con OAuth2 Client Credentials
 * App: sirius-notificaciones-core (Azure AD)
 */
import { ConfidentialClientApplication } from '@azure/msal-node';

// ============ CONFIGURACIÓN ============
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID!;
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID!;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET!;
const SENDER_EMAIL = process.env.OUTLOOK_SENDER_EMAIL!;

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: AZURE_CLIENT_ID,
    clientSecret: AZURE_CLIENT_SECRET,
    authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
  },
});

// ============ TIPOS ============
export interface EmailOptions {
  to: string | string[];
  subject: string;
  body: string;        // HTML content
  cc?: string[];
  bcc?: string[];
  attachments?: {
    name: string;
    contentType: string;
    contentBytes: string; // base64
  }[];
}

// ============ FUNCIONES ============

/**
 * Obtiene un token de acceso para Microsoft Graph
 */
async function getAccessToken(): Promise<string> {
  const result = await msalClient.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  });

  if (!result?.accessToken) {
    throw new Error('No se pudo obtener token de acceso de Microsoft Graph');
  }

  return result.accessToken;
}

/**
 * Envía un correo electrónico usando Microsoft Graph API
 */
export async function enviarCorreo(options: EmailOptions): Promise<{ success: boolean; message: string }> {
  const { to, subject, body, cc, bcc, attachments } = options;

  // Validar configuración
  if (!AZURE_CLIENT_ID || !AZURE_TENANT_ID || !AZURE_CLIENT_SECRET || !SENDER_EMAIL) {
    throw new Error('Faltan variables de entorno de Azure para el servicio de correo');
  }

  const token = await getAccessToken();

  // Construir destinatarios
  const toRecipients = (Array.isArray(to) ? to : [to]).map(email => ({
    emailAddress: { address: email }
  }));

  const ccRecipients = cc?.map(email => ({
    emailAddress: { address: email }
  })) || [];

  const bccRecipients = bcc?.map(email => ({
    emailAddress: { address: email }
  })) || [];

  // Construir mensaje
  const message: any = {
    subject,
    body: {
      contentType: 'HTML',
      content: body,
    },
    toRecipients,
    ccRecipients,
    bccRecipients,
  };

  // Adjuntos
  if (attachments && attachments.length > 0) {
    message.attachments = attachments.map(att => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: att.name,
      contentType: att.contentType,
      contentBytes: att.contentBytes,
    }));
  }

  // Enviar via Graph API
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        saveToSentItems: true,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
    const errorCode = errorData?.error?.code || 'Unknown';
    console.error('❌ Error enviando correo:', JSON.stringify(errorData, null, 2));
    console.error('📧 Sender:', SENDER_EMAIL);
    console.error('📬 To:', to);
    console.error('🔑 Token (primeros 20 chars):', token.substring(0, 20) + '...');
    throw new Error(`Error enviando correo [${errorCode}]: ${errorMsg}`);
  }

  console.log(`✅ Correo enviado a ${Array.isArray(to) ? to.join(', ') : to}`);
  return { success: true, message: `Correo enviado exitosamente a ${Array.isArray(to) ? to.join(', ') : to}` };
}
