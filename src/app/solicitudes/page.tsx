import { redirect } from 'next/navigation';
import { SolicitudesOverview } from '@sirius/solicitudes';
import { resolvePayload } from '@/lib/solicitudes/auth';
import { solicitudesAirtable } from '@/lib/solicitudes/airtable';
import { SolicitudesShell } from '@/components/SolicitudesShell';

/**
 * Depende de la cookie de sesión, así que nunca se prerenderiza.
 */
export const dynamic = 'force-dynamic';

/**
 * Historial y accesos del colaborador. El overview lee las tres tablas por su
 * cuenta, así que recibe la misma config de Airtable que los handlers: apuntarlo
 * a otras tablas dejaría el historial siempre vacío.
 *
 * Sin sesión redirige a `/`, que es lo que hace el middleware para el resto de
 * las rutas privadas de DataLab.
 */
export default async function SolicitudesPage() {
  const sesion = await resolvePayload();
  if (!sesion) redirect('/');

  return (
    <SolicitudesShell>
      <SolicitudesOverview
        idCore={sesion.idCore}
        nombre={sesion.nombre}
        basePath="/solicitudes"
        airtable={solicitudesAirtable}
      />
    </SolicitudesShell>
  );
}
