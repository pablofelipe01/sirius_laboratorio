'use client';

import { PermisoForm } from '@sirius/solicitudes';
import { SolicitudesShell } from '@/components/SolicitudesShell';

export default function PermisoPage() {
  return (
    <SolicitudesShell>
      {/*
        El día siriano queda habilitado (es el valor por defecto): DataLab emite su
        documento con el generador del paquete y lo sirve por
        /api/documentos/permiso/[id]. Si alguna vez se le quita esa infraestructura,
        hay que pasar diaSirianoHabilitado={false} — el handler responde 400 sin
        ella, y el formulario no debe ofrecer un camino que termina en error.
      */}
      <PermisoForm basePath="/solicitudes" />
    </SolicitudesShell>
  );
}
