/**
 * Cómo resuelve DataLab la sesión que @sirius/solicitudes pide inyectar.
 *
 * El paquete no sabe nada del sistema de auth de la app: solo pide idCore, nombre
 * y cédula. `idEmpleado` del JWT es el `ID Empleado` de Personal (Nómina Core),
 * o sea el `SIRIUS-PER-XXXX` que es la FK canónica de las tablas de solicitudes.
 * Un token viejo puede no traerlo —el campo es opcional en JWTPayload—, y sin él
 * no hay a quién atribuir la solicitud: se devuelve null y el handler responde 401.
 */
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import type { ResolvePayload } from '@sirius/solicitudes/server';

/** Misma cookie que lee el middleware. */
export const COOKIE_SESION = 'auth_token';

export const resolvePayload: ResolvePayload = async () => {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload?.idEmpleado) return null;

  return {
    idCore: payload.idEmpleado,
    nombre: payload.nombre,
    cedula: payload.cedula,
  };
};
