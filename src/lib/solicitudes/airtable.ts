/**
 * Base y tablas de Novedades Nómina para @sirius/solicitudes.
 *
 * El paquete las leería de sus propias variables de entorno, pero DataLab centra
 * toda la configuración de Airtable en `constants/airtable.ts` —incluida la
 * prioridad de la API key global sobre las específicas—, así que se le pasan
 * explícitas para que las dos rutas de configuración no se separen.
 *
 * Los nombres de tabla van sin valor por defecto: si no están en el entorno, el
 * paquete usa los de la base compartida (`Solicitud_Permiso`, etc.).
 */
import { SIRIUS_NOVEDADES_NOMINA_CONFIG } from '@/lib/constants/airtable';
import type { AirtableConfig } from '@sirius/solicitudes/infra';

export const solicitudesAirtable: AirtableConfig = {
  // Si falta la base, el paquete lanza en el request con un mensaje que nombra la
  // variable: no se valida aquí para no tumbar el build donde el entorno no está.
  baseId: SIRIUS_NOVEDADES_NOMINA_CONFIG.BASE_ID,
  apiKey: SIRIUS_NOVEDADES_NOMINA_CONFIG.API_KEY,
  tablas: {
    permiso: SIRIUS_NOVEDADES_NOMINA_CONFIG.TABLES.PERMISO,
    vacaciones: SIRIUS_NOVEDADES_NOMINA_CONFIG.TABLES.VACACIONES,
    novedades: SIRIUS_NOVEDADES_NOMINA_CONFIG.TABLES.NOVEDADES,
    diasSirianos: SIRIUS_NOVEDADES_NOMINA_CONFIG.TABLES.DIAS_SIRIANOS,
  },
};
