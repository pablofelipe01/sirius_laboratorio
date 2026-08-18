/**
 * Perfil del colaborador autenticado.
 *
 * Lo consumen los formularios de @sirius/solicitudes al montar, para llenar los
 * campos que no se le piden a alguien que ya tiene sesión: nombre, cédula, id de
 * empleado y cargo. La forma de la respuesta es contrato del paquete.
 *
 * El cargo es el único dato que no viaja en el JWT, así que se busca en Nómina
 * Core. **No es bloqueante**: si falla o si la tabla de roles no está configurada,
 * se devuelve vacío. Perder el cargo deja un campo en blanco en el formulario;
 * fallar aquí impediría radicar cualquier solicitud.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { COOKIE_SESION } from '@/lib/solicitudes/auth';
import {
  SIRIUS_NOMINA_CORE_CONFIG,
  getSiriusNominaCoreHeaders,
} from '@/lib/constants/airtable';

const TABLA_ROLES = process.env.AIRTABLE_TABLE_NOMINA_ROLES;

async function cargoDelColaborador(personalRecordId: string): Promise<string> {
  if (!TABLA_ROLES) return '';

  try {
    const base = SIRIUS_NOMINA_CORE_CONFIG.BASE_ID;
    const headers = getSiriusNominaCoreHeaders();

    const personal = await fetch(
      `https://api.airtable.com/v0/${base}/${encodeURIComponent(
        SIRIUS_NOMINA_CORE_CONFIG.TABLES.PERSONAL,
      )}/${personalRecordId}`,
      { headers, cache: 'no-store' },
    );
    if (!personal.ok) return '';

    const record = await personal.json();
    const rolId = (record.fields?.Rol as string[] | undefined)?.[0];
    if (!rolId) return '';

    const rol = await fetch(
      `https://api.airtable.com/v0/${base}/${encodeURIComponent(TABLA_ROLES)}/${rolId}`,
      { headers, cache: 'no-store' },
    );
    if (!rol.ok) return '';

    const rolRecord = await rol.json();
    return String(rolRecord.fields?.Rol ?? '');
  } catch (error) {
    console.error('[api/me] no se pudo resolver el cargo:', error);
    return '';
  }
}

export async function GET() {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  return NextResponse.json({
    nombre: payload.nombre,
    cedula: payload.cedula,
    // El ID Empleado de Personal (SIRIUS-PER-XXXX): la FK canónica del
    // colaborador. Nunca el record ID de Airtable.
    idCore: payload.idEmpleado ?? '',
    cargo: await cargoDelColaborador(payload.userId),
  });
}
