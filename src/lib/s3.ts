import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Configuración del cliente S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_REMISIONES;

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

/**
 * Sube un archivo a S3 (soporta texto o binario)
 */
export async function uploadToS3(
  content: string | Buffer | Uint8Array,
  fileName: string,
  contentType: string = 'text/html'
): Promise<UploadResult> {
  try {
    console.log('📤 Subiendo archivo a S3:', fileName, '| ContentType:', contentType);
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: content,
      ContentType: contentType,
    });

    await s3Client.send(command);

    // Construir URL pública del archivo
    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${encodeURIComponent(fileName)}`;

    console.log('✅ Archivo subido exitosamente:', url);

    return {
      success: true,
      url,
      key: fileName
    };
  } catch (error: any) {
    console.error('❌ Error subiendo a S3:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Genera el nombre del archivo para la remisión
 * Formato: Remision_CLIENTE_FECHA_PRODUCTOS_NUMERO
 */
export function generateRemisionFileName(
  cliente: string,
  fecha: string,
  productos: string[],
  numeracion: number
): string {
  // Limpiar nombre del cliente (remover caracteres especiales)
  const clienteLimpio = cliente
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  
  // Tomar solo los nombres de productos (sin códigos)
  const productosStr = productos.slice(0, 5).join(',');
  
  return `Remision_${clienteLimpio}_${fecha}_${productosStr}_${numeracion}`;
}
