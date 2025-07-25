import { z } from 'zod';

// Esquema de validación para autenticación
export const LoginSchema = z.object({
  cedula: z.string()
    .min(1, 'La cédula es requerida')
    .max(20, 'La cédula es demasiado larga')
    .regex(/^[0-9]+$/, 'La cédula debe contener solo números'),
  
  password: z.string()
    .optional()
});

export const SetPasswordSchema = z.object({
  cedula: z.string()
    .min(1, 'La cédula es requerida')
    .max(20, 'La cédula es demasiado larga')
    .regex(/^[0-9]+$/, 'La cédula debe contener solo números'),
  
  password: z.string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(50, 'La contraseña es demasiado larga'),
  
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

// Esquema de validación para datos de inoculación
export const InoculationSchema = z.object({
  bagQuantity: z.number()
    .int('La cantidad de bolsas debe ser un número entero')
    .min(1, 'La cantidad mínima es 1 bolsa')
    .max(10000, 'La cantidad máxima es 10,000 bolsas'),
  
  microorganism: z.string()
    .min(1, 'El microorganismo es requerido')
    .max(100, 'El nombre del microorganismo es demasiado largo')
    .regex(/^[a-zA-Z0-9\s\-_.()]+$/, 'Caracteres no válidos en el microorganismo'),
  
  microorganismId: z.string()
    .min(1, 'ID del microorganismo es requerido'),
  
  inoculationDate: z.string()
    .min(1, 'La fecha de inoculación es requerida')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  
  responsables: z.array(z.string().min(1, 'Nombre de responsable no puede estar vacío'))
    .min(1, 'Debe asignar al menos un responsable')
    .max(5, 'Máximo 5 responsables por inoculación'),
  
  responsablesIds: z.array(z.string().min(1, 'ID de responsable no puede estar vacío'))
    .min(1, 'Debe asignar al menos un responsable')
    .max(5, 'Máximo 5 responsables por inoculación'),
  
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

// Esquema para validar parámetros de consulta de APIs
export const ApiQuerySchema = z.object({
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0),
  search: z.string().max(100).optional(),
});

// Tipos TypeScript generados a partir de los esquemas
export type InoculationData = z.infer<typeof InoculationSchema>;
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
