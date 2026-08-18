// Saldo de días sirianos del colaborador. Lo sirve el paquete: la forma de la
// respuesta es parte del contrato de PermisoForm, que la consulta para mostrar
// cuántos quedan y apagar el envío si no hay ninguno.
import { createDiasSirianosHandlers } from '@sirius/solicitudes/server';
import { resolvePayload } from '@/lib/solicitudes/auth';
import { solicitudesAirtable } from '@/lib/solicitudes/airtable';

export const { GET } = createDiasSirianosHandlers({
  resolvePayload,
  airtable: solicitudesAirtable,
});
