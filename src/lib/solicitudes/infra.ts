/**
 * Implementación de los puertos de @sirius/solicitudes para DataLab.
 *
 * El paquete trae el documento del día siriano hecho —maqueta institucional,
 * logo, QR y firma de Gestión del Ser—; aquí solo se dice dónde archivar la firma
 * del trabajador y el PDF. Así el permiso sale igual desde las tres apps.
 */
import { createHash } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { SolicitudesInfra } from '@sirius/solicitudes/infra';
import { crearDiaSirianoInfra } from '@sirius/solicitudes/dia-siriano';

/**
 * ⚠️ Las firmas y los documentos de nómina NO van al bucket de DataLab.
 *
 * La `Firma_S3_Key` y la `PDF_Autorizacion_S3_Key` que quedan en Airtable las lee
 * Gestión del Ser para servir el documento del permiso, y las resuelve contra
 * `S3_BUCKET_FIRMAS`. Si DataLab las escribiera en el bucket de remisiones, el
 * registro apuntaría a un objeto que las otras apps no encuentran: el permiso
 * quedaría radicado y su respaldo inaccesible, sin error visible en ninguna.
 *
 * Sin valor por defecto a propósito: adivinar el nombre archiva el documento donde
 * nadie lo busca. Mejor que radicar falle y se vea en el log.
 */
export function bucketFirmas(): string {
  const bucket = process.env.S3_BUCKET_FIRMAS;
  if (!bucket) {
    throw new Error(
      'Falta S3_BUCKET_FIRMAS: es el bucket de firmas de nómina, el mismo que lee ' +
        'Gestión del Ser para servir el documento del permiso.',
    );
  }
  return bucket;
}

let cliente: S3Client | null = null;

function s3(): S3Client {
  if (!cliente) {
    cliente = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return cliente;
}

/** Los mismos prefijos que usa Gestión del Ser: la ruta es parte del contrato. */
const PREFIJOS: Record<string, string> = {
  permiso: 'firmas/permisos',
  vacaciones: 'firmas/vacaciones',
  'autorizacion-permiso': 'firmas/autorizaciones',
};

/** Los metadatos de S3 solo admiten ASCII: un nombre con tilde tumba el PUT. */
function soloAscii(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, '');
}

export const solicitudesInfra: SolicitudesInfra = {
  async guardarFirma({ base64, cedula, idCore, tipo, metadata = {} }) {
    if (!base64 || base64.length < 100) {
      throw new Error('Base64 de firma inválido o vacío');
    }

    const prefijo = PREFIJOS[tipo] ?? 'firmas/permisos';
    const key = `${prefijo}/${idCore}/${Date.now()}_${cedula}.png`;
    const archivadaEn = new Date().toISOString();

    const auditoria: Record<string, string> = {
      cedula,
      idCore,
      tipo,
      uploadedAt: archivadaEn,
      source: 'sirius-datalab',
    };
    for (const [k, v] of Object.entries(metadata)) auditoria[k] = soloAscii(v);

    await s3().send(
      new PutObjectCommand({
        Bucket: bucketFirmas(),
        Key: key,
        Body: Buffer.from(base64, 'base64'),
        ContentType: 'image/png',
        // El bucket guarda documentos laborales: cifrado en reposo.
        ServerSideEncryption: 'AES256',
        Metadata: auditoria,
      }),
    );

    return { key, archivadaEn };
  },

  // `adjuntar` se omite a propósito: copiar la firma a un campo Attachment de
  // Airtable es comodidad de consulta, y la referencia canónica ya es la key.

  // El día siriano nace autorizado y el PDF es su único respaldo. El paquete lo
  // emite; DataLab lo archiva con la misma estructura que las otras apps.
  diaSiriano: crearDiaSirianoInfra({
    async archivarDocumento({ pdf, cedula, idCore, fechaPermiso, metadata = {} }) {
      if (!pdf || pdf.byteLength === 0) throw new Error('PDF vacío');

      const [anio, mes] = fechaPermiso.split('-');
      const filename = `${idCore}_${cedula}_${fechaPermiso}_${Date.now()}.pdf`;
      // `dias-sirianos`, nunca `dias-pacto`: ese es el prefijo anterior al
      // renombre y solo se conserva para leer los PDF ya emitidos.
      const key = `permisos/dias-sirianos/${anio}/${mes}/${filename}`;
      const cuerpo = Buffer.from(pdf);

      const auditoria: Record<string, string> = {
        cedula,
        idCore,
        fechaPermiso,
        uploadedAt: new Date().toISOString(),
        source: 'sirius-datalab',
      };
      for (const [k, v] of Object.entries(metadata)) auditoria[k] = soloAscii(v);

      const bucket = bucketFirmas();
      await s3().send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: cuerpo,
          ContentType: 'application/pdf',
          ServerSideEncryption: 'AES256',
          Metadata: auditoria,
        }),
      );

      return {
        key,
        // Referencia al objeto, no un enlace para el navegador: es privado. El
        // enlace que se guarda en Airtable lo arma el paquete apuntando a
        // /api/documentos/permiso/{id}, que exige sesión.
        url: `https://${bucket}.s3.amazonaws.com/${key}`,
        filename,
        // Huella del documento: permite verificar después que el PDF archivado es
        // el mismo que se firmó.
        sha256: createHash('sha256').update(cuerpo).digest('hex'),
      };
    },
  }),
};
