import { redirect } from 'next/navigation';
import { SolicitudesShell } from '@/components/SolicitudesShell';
import { resolvePayload } from '@/lib/solicitudes/auth';
import { FormularioAutoentrega } from './FormularioAutoentrega';

/**
 * Autoentrega de EPP.
 *
 * El colaborador toma lo que necesita de la bodega de SST y firma aquí mismo:
 * el acta nace confirmada, con su firma, y el inventario se descuenta en
 * Sirius Insumos Core. Nada de esto vive en DataLab —el módulo es un cliente
 * de SG-SST—, pero la pantalla sí, porque es en el laboratorio donde alguien
 * se pone unos guantes.
 *
 * Reusa `SolicitudesShell` porque es el mismo gesto que un permiso: un trámite
 * personal que el colaborador radica y firma por su cuenta.
 */
export const dynamic = 'force-dynamic';

export default async function AutoentregaEppPage() {
  const sesion = await resolvePayload();
  // Mismo destino que da el middleware al resto de las rutas privadas.
  if (!sesion) redirect('/');

  return (
    <SolicitudesShell>
      <FormularioAutoentrega nombre={sesion.nombre} />
    </SolicitudesShell>
  );
}
