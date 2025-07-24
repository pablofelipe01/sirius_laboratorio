import { z } from 'zod';

// Esquema de validación para datos de inoculación
export const InoculationSchema = z.object({
  bagQuantity: z.number()
    .int('La cantidad de bolsas debe ser un número entero')
    .min(1, 'La cantidad mínima es 1 bolsa')
    .max(1000, 'La cantidad máxima es 1000 bolsas'),
  
  microorganism: z.string()
    .min(1, 'El microorganismo es requerido')
    .max(100, 'El nombre del microorganismo es demasiado largo')
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, 'Caracteres no válidos en el microorganismo'),
  
  inoculationDate: z.string()
    .min(1, 'La fecha de inoculación es requerida')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  
  researcher: z.array(z.string().min(1, 'Nombre de investigador no puede estar vacío'))
    .min(1, 'Debe asignar al menos un investigador')
    .max(5, 'Máximo 5 investigadores por inoculación'),
  
  substrate: z.string()
    .max(100, 'Nombre del sustrato demasiado largo')
    .optional(),
  
  temperature: z.number()
    .min(-50, 'Temperatura mínima: -50°C')
    .max(100, 'Temperatura máxima: 100°C')
    .optional(),
  
  humidity: z.number()
    .min(0, 'Humedad mínima: 0%')
    .max(100, 'Humedad máxima: 100%')
    .optional(),
  
  notes: z.string()
    .max(500, 'Las notas no pueden exceder 500 caracteres')
    .optional()
});

// Esquema para datos de Telegram WebApp
export const TelegramWebAppSchema = z.object({
  query_id: z.string().optional(),
  user: z.object({
    id: z.number(),
    first_name: z.string(),
    last_name: z.string().optional(),
    username: z.string().optional(),
    language_code: z.string().optional(),
  }).optional(),
  auth_date: z.number(),
  hash: z.string().min(1, 'Hash es requerido'),
});

// Esquema para validar parámetros de consulta de APIs
export const ApiQuerySchema = z.object({
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0),
  search: z.string().max(100).optional(),
});

// Tipos TypeScript generados a partir de los esquemas
export type InoculationData = z.infer<typeof InoculationSchema>;
export type TelegramWebAppData = z.infer<typeof TelegramWebAppSchema>;
export type ApiQuery = z.infer<typeof ApiQuerySchema>;

// Función helper para validar datos con manejo de errores
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      );
      return { success: false, errors };
    }
    return { success: false, errors: ['Error de validación desconocido'] };
  }
}
