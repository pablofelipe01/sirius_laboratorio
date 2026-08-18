import { createPermisoHandlers } from '@sirius/solicitudes/server';
import { resolvePayload } from '@/lib/solicitudes/auth';
import { solicitudesInfra } from '@/lib/solicitudes/infra';
import { solicitudesAirtable } from '@/lib/solicitudes/airtable';

export const { GET, POST } = createPermisoHandlers({
  resolvePayload,
  infra: solicitudesInfra,
  airtable: solicitudesAirtable,
});
