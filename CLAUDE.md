# CLAUDE.md — Sirius DataLab (Laboratorio de Producción Microbiológica)

> Archivo leído automáticamente por Claude Code CLI en cada sesión. Documenta el proyecto integrado de laboratorio para todos los agentes de desarrollo e investigación.

## Stack Tecnológico

- **Framework**: Next.js 16.1.6 con App Router (monorepo — backend + frontend integrados)
- **React**: 19.1.2 con Server Components
- **TypeScript**: 5.x (strict mode)
- **Estilos**: Tailwind CSS 4 con PostCSS, Glass-morphism UI
- **Visualización 3D**: Three.js + React Three Fiber (LABI 3D Interface)
- **Base de datos**: Airtable (múltiples bases: Cepas, Cultivos, Lotes, Fermentación, etc.)
- **IA**: OpenAI API + Anthropic Claude para agentes
- **Auth**: JWT HMAC-SHA256 custom, bcryptjs (12 rounds)
- **Documentos**: docx, pdf-lib (generador de actas, remisiones, protocolos)
- **Testing**: Vitest + jsdom
- **CI/CD**: GitHub Actions

## Estructura del Monorepo — DataLab

```
src/
├── app/
│   ├── api/                        # Backend — Route handlers (Next.js)
│   │   ├── almacenamiento/         # Gestión de almacén
│   │   ├── cepas/                  # CRUD cepas microbianas
│   │   ├── cepas-disponibles/      # Consulta disponibilidad
│   │   ├── cultivos-core/          # Gestión cultivos base
│   │   ├── cultivos-lotes/         # Cultivos por lotes
│   │   ├── lotes-core/             # Gestión lotes principales
│   │   ├── lotes-disponibles/      # Consulta lotes
│   │   ├── lote-complete/          # Datos completos de lote
│   │   ├── inoculacion/            # Procesos de inoculación
│   │   ├── fermentacion/           # Control fermentación (T°, pH, > 50 params)
│   │   ├── cosecha/                # Seguimiento cosechas
│   │   ├── microorganismos/        # Catálogo microorganismos
│   │   ├── clientes/               # Gestión clientes
│   │   ├── pedidos/                # Sistema de pedidos
│   │   ├── pedidos-ia/             # Pedidos con IA (OpenAI)
│   │   ├── remisiones/             # Generación remisiones PDF
│   │   ├── dashboard-lab/          # KPIs laboratorio
│   │   ├── dashboard-analytics/    # Analítica avanzada
│   │   ├── bitacora-laboratorio/   # Eventos y logs
│   │   ├── calendario-produccion/  # Planificación producción
│   │   ├── seguimiento-diario/     # Reportes diarios
│   │   ├── entrada-insumos/        # Registro insumos
│   │   ├── salida-insumos/         # Salida/consumo insumos
│   │   ├── equipo/                 # Gestión equipos laboratorio
│   │   ├── formulas/               # Cálculos fórmulas químicas
│   │   ├── descartes/              # Registro descartes
│   │   └── auth/                   # Login, JWT, verificación
│   │
│   ├── página principal (page.tsx) # Home con SIRIUS 3D
│   ├── bacterias/                  # Catálogo bacterias
│   ├── cepas/                      # Interfaz gestión cepas
│   ├── inoculacion/                # Interfaz inoculación
│   ├── fermentacion/               # Dashboard fermentación
│   ├── cosecha/                    # Gestión cosechas
│   ├── almacenamiento/             # Inventario
│   ├── stock-insumos/              # Control stock
│   ├── remisiones/                 # Generador remisiones
│   ├── calendario-produccion/      # Planificador
│   ├── seguimiento-diario/         # Dashboard diario
│   ├── dashboard-lab/              # Dashboard principal
│   ├── sirius/                     # Portal SIRIUS
│   ├── labi/                       # Interface 3D LABI
│   ├── manual-usuario/             # Documentación
│   ├── layout.tsx                  # Root layout
│   └── globals.css                 # Tailwind 4 global
│
├── components/                     # Componentes compartidos
│   ├── LABI3DInterface.tsx         # Interface 3D del laboratorio
│   ├── SIRIUS3DInterface.tsx       # Interface 3D SIRIUS
│   ├── ParticleGalaxy3D.tsx        # Visualización 3D galáctico
│   ├── CepaSelector.tsx            # Selector de cepas
│   ├── LoteSelector.tsx            # Selector de lotes
│   ├── ProgresoAplicaciones.tsx    # Progreso visual
│   ├── MushroomInoculationForm.tsx # Formulario inoculación
│   ├── AudioRecorder.tsx           # Grabadora audio
│   ├── Navbar.tsx                  # Navegación
│   ├── Footer.tsx                  # Pie de página
│   └── [...otros componentes]
│
├── contexts/
│   └── AuthContext.tsx             # Context para autenticación
│
├── solicitudes/                    # (en app/) Permisos, vacaciones y novedades —
│                                   # los componentes son de @sirius/solicitudes
│
├── lib/                            # Lógica de negocio
│   ├── auth.ts                     # signJWT(), verifyJWT(), hashPassword(), verifyPassword()
│   ├── s3.ts                       # Subida archivos AWS S3
│   ├── email.ts                    # Notificaciones email
│   ├── remision-pdf-generator.ts   # Generador PDF remisiones
│   ├── remision-generator.ts       # Datos remisiones
│   ├── personas-remision.ts        # Gestión personas remisión
│   ├── debug.ts                    # Utilities debug
│   ├── constants/                  # Constantes del sistema
│   ├── services/                   # Servicios API externas
│   ├── validation/                 # Validación esquemas (zod)
│   └── [otros utilitarios]
│
└── middleware.ts                   # JWT verification (edge-compatible)
```

## Entidades y Conceptos Clave

### Microbiología
- **Cepas**: Cultivos puros de microorganismos (bacterias, hongos, etc.)
- **Microorganismos**: Catálogo de tipos (Bacillus, Trichoderma, etc.)
- **Inoculación**: Proceso de introducir microorganismos en medio
- **Fermentación**: Control de parámetros (T°, pH, O₂, CO₂, etc.) — >50 variables

### Producción
- **Lotes**: Unidades de producción agrupadas (ej: Lote-2025-03-001)
- **Cultivos**: Producción dentro de lotes
- **Cosecha**: Recolección de biomasas
- **Productos Secos**: Post-cosecha, deshidratación
- **Calidad**: Análisis, pruebas, certificaciones

### Logística
- **Almacenamiento**: Control inventario, ubicaciones física
- **Insumos**: Entrada/salida de materiales
- **Equipo**: Mantenimiento de maquinaria
- **Descartes**: Registro de residuos/pérdidas

### Negocio
- **Clientes**: Base de clientes agrícolas/industria
- **Pedidos**: Órdenes de productos finales
- **Remisiones**: Documentos de entrega PDF
- **Planificación**: Calendario producción, pronósticos

## Convenciones

- **Idioma**: Español colombiano (UI, comentarios, mensajes de agentes)
- **Path alias**: `@/*` → `./src/*`
- **API pattern**: GET/POST/PUT/DELETE en un solo `route.ts` por recurso
- **Auth**: Cookie `sirius-auth` (httpOnly, 24h), JWT header-based
- **RBAC**: Niveles según rol (Admin > Técnico > Operario > Viewer)
- **Soft-delete**: Registros nunca eliminados, marcados como inactivos
- **Unidades**: Sistema métrico decimal (kg, L, °C, pH 0-14, horas)
- **Airtable safety**: OBLIGATORIO usar `escapeAirtableValue()` en fórmulas
- **3D Assets**: Three.js para visualización laboratorio + partículas

## Patrones Clave

### Modales y Formularios
- Usar componentes controlados (React 19 hooks)
- Validación con Zod
- Mensajes de error/éxito inline

### 3D Visualization
- Three.js + React Three Fiber para LABI y SIRIUS
- Particle systems para efectos visuales
- WebGL optimization

### API Security
- JWT en cookies httpOnly
- CORS para dominios permitidos
- Rate limiting en endpoints sensibles
- Validación entrada con Zod

### Documentación
- Actas de producción (docx)
- Remisiones (PDF con QR)
- Reportes análisis
- Bitácora eventos

## Patrones Airtable — Linked Records entre Bases

### Puente entre Sirius Product Core y DataLab

DataLab maneja **dos bases de Airtable distintas**: la base principal de DataLab (`appUnQeSFnwx04Axi`) y Sirius Product Core (`app3Ee3rhDFbVlNXm`). Los IDs de registro (`recXXXXXX`) son únicos por base y **no son intercambiables** como linked records entre bases.

**Campo puente**: `ID Producto` (ej. `SIRIUS-PRODUCT-0004`) es un campo de texto que existe en ambas bases y permite sincronizar referencias.

**Patrón correcto para crear un linked record a `Microorganismos` en DataLab:**
```typescript
// ❌ INCORRECTO: usar el recId de Sirius Product Core directamente
fieldsToCreate['Microorganismos'] = [data.microorganismoId]; // recId de otra base

// ✅ CORRECTO: buscar el recId equivalente en DataLab por ID Producto
async function findMicroorganismoIdByProductCode(codigoProducto: string): Promise<string | null> {
  const records = await base(process.env.AIRTABLE_TABLE_MICROORGANISMOS!)
    .select({
      fields: ['ID Producto'],
      filterByFormula: `{ID Producto} = '${codigoProducto.replace(/'/g, "\\'")}'`,
      maxRecords: 1,
    }).all();
  return records.length > 0 ? records[0].id : null;
}

const microorganismoDataLabId = await findMicroorganismoIdByProductCode(codigoProductoCore);
if (microorganismoDataLabId) {
  fieldsToCreate['Microorganismos'] = [microorganismoDataLabId];
}
```

Este patrón aplica a **cualquier tabla de DataLab** que tenga un linked record apuntando a `Microorganismos`.

### Lookup fields dependen del linked record

Los campos calculados en Airtable (`Abreviatura Hongo`, `Abreviatura`, `Microorganismo`, `Codigo Cepa`, `Codigo Lote`) son **lookup/formula fields** que requieren que el linked record `Microorganismos` esté seteado. Si el linked record está vacío, estos campos retornan `null`/`undefined`, lo que puede causar:
- Campos `Codigo Lote` con valor `N/A` en la UI
- Errores de validación Zod en el frontend (campo requerido enviado como `undefined`)

## Bugs Resueltos (Referencia)

### Bug 1 — Código de Lote N/A en Cepas de Hongos
**Fecha**: 2026-05-08  
**Archivos afectados**: `src/app/api/cepas/route.ts`  
**Causa raíz**: El handler POST de cepas nunca guardaba el campo `Microorganismos` (linked record). El ID disponible en la request (`data.microorganismoId`) era un `recId` de Sirius Product Core, no de DataLab, por lo que no se podía usar directamente.  
**Síntoma**: Campo `Codigo Lote` mostraba `N/A` en todas las cepas de hongos recién creadas.  
**Solución**: Se agregó el helper `findMicroorganismoIdByProductCode(codigoProducto)` que busca en la tabla `Microorganismos` de DataLab usando el campo `{ID Producto}` como puente, y se asigna el resultado a `fieldsToCreate['Microorganismos']`.

### Bug 2 — Error `❌ ERROR EN RESPUESTA: {}` al enviar Inoculación
**Fecha**: 2026-05-08  
**Archivos afectados**:
- `src/app/api/inoculacion/route.ts`
- `src/components/MushroomInoculationForm.tsx`
- `src/components/CepaSelector.tsx`

**Causa raíz (multi-capa)**:

1. **API** — `findMicroorganismoInDataLab` buscaba por nombre del microorganismo. Los nombres en Sirius Product Core incluyen sufijo `(L)` (ej. "Beauveria bassiana (L)") mientras que en DataLab son sin sufijo ("Beauveria bassiana"). La búsqueda siempre retornaba `null` → `Microorganismos: []` → campo `Abreviatura` lookup vacío en los registros de inoculación.

2. **Frontend** — `CepaSelector` no recibía el prop `abreviaturaSeleccionada`. Para cepas antiguas (creadas antes del fix del Bug 1), el lookup `Abreviatura Hongo` es `undefined`. Al serializar con `JSON.stringify`, la propiedad se omitía → Zod retornaba error "Required" para `cepasSeleccionadas[].abreviatura` → API respondía 400 → Next.js mostraba el cuerpo colapsado como `{}`.

**Soluciones aplicadas**:
- `inoculacion/route.ts`: `findMicroorganismoInDataLab` ahora busca por `{ID Producto}` en vez de por nombre (mismo patrón del Bug 1).
- `MushroomInoculationForm.tsx`: Se pasa `abreviaturaSeleccionada={formData.microorganismAbreviatura}` al `CepaSelector`.
- `CepaSelector.tsx`: En `handleAgregarCepa`, la abreviatura usa fallback: `rawAbreviatura || abreviaturaSeleccionada || ''`, cubriendo cepas antiguas sin linked record.

## Solicitudes de Nómina — el paquete `@sirius/solicitudes`

`/solicitudes` y `/api/solicitudes/**` **no son código de DataLab**: los trae el
paquete `@sirius/solicitudes`, el mismo módulo que usan Gestión del Ser y
PiroliApp. Se instala desde el tarball versionado en `vendor/`, se distribuye en
TypeScript sin build (de ahí `transpilePackages` en `next.config.ts`) y sus
primitivas visuales entran por `globals.css` con un `@source` — Tailwind no
escanea `node_modules`, y sin él los formularios salen sin estilos.

| Lo que DataLab le inyecta | Archivo |
|---|---|
| Sesión (`idCore`, nombre, cédula) | `src/lib/solicitudes/auth.ts` |
| Base y tablas de Airtable | `src/lib/solicitudes/airtable.ts` |
| Almacenamiento de firma y PDF | `src/lib/solicitudes/infra.ts` |
| Cromado (foto, Navbar, Footer) | `src/components/SolicitudesShell.tsx` |
| Perfil del colaborador | `src/app/api/me/route.ts` |
| Servir el documento con control de acceso | `src/app/api/documentos/permiso/[id]/route.ts` |

⚠️ **No lo aliases en `tsconfig.json` ni copies su `src/` al repo.** Se resuelve
por el `exports` de su package.json, como cualquier dependencia. Una copia local
se queda atrás en silencio: en PiroliApp llegó a estar doce archivos desactualizada.

Cuatro cosas que no se pueden aflojar:

**La PAT global NO sirve para Novedades Nómina.** `AIRTABLE_API_KEY_GLOBAL` no
incluye esa base: con ella Airtable responde 403 en todas sus tablas. Por eso
`SIRIUS_NOVEDADES_NOMINA_CONFIG` es la única config donde la key **específica**
(`AIRTABLE_API_KEY_NOVEDADES_NOMINA`) tiene prioridad sobre la global, al revés
que el resto. Si algún día se agrega esa base a la PAT global, se puede volver a
`getApiKey(...)`.

**La firma y el PDF van al bucket de nómina, no al de DataLab.** La
`Firma_S3_Key` y la `PDF_Autorizacion_S3_Key` que quedan en Airtable las resuelve
Gestión del Ser contra `S3_BUCKET_FIRMAS` para servir el documento. Escribirlas en
el bucket de remisiones dejaría el permiso radicado y su respaldo inaccesible, sin
error visible en ninguna de las apps.

**El día siriano está encendido**, y eso arrastra dos requisitos. Ese permiso nace
autorizado: su único respaldo es el PDF que se emite al radicarlo. El documento lo
genera el paquete (`@sirius/solicitudes/dia-siriano`), pero necesita
**`FIRMA_GESTION_SER_BASE64`** en el entorno del despliegue —una firma manuscrita,
que no va al repositorio ni a los tests, que usan el trazo sintético del paquete— y
un endpoint que sirva el PDF. Sin cualquiera de los dos, el handler responde 400
antes de registrar nada, que es mejor que un permiso concedido sin respaldo.

**`/api/documentos/permiso/[id]` sirve solo al dueño.** El PDF lleva el motivo del
permiso —a menudo médico—, la cédula y la firma manuscrita, así que tener sesión no
basta. La regla es completa para DataLab: esta app no autoriza solicitudes ni tiene
jefaturas con potestad sobre ellas (eso vive en Gestión del Ser, que además abre el
documento a quien autorizó). Al denegar responde **404, no 403**: un 403 confirmaría
que el registro existe. El cliente nunca nombra el archivo y el PDF se transmite por
el route — una URL firmada sale del perímetro y funciona sin sesión mientras viva.

## Verificación de Cambios

Después de cada cambio:
```bash
npx tsc --noEmit     # Type-check todo
npx eslint src       # ESLint strict
npm run build        # Build exitoso
npx vitest run       # Tests pasan
```

⚠️ `npm run lint` está roto: Next 16 retiró `next lint` y el script intenta usarlo
como directorio (`no such directory: .../lint`). Usa `npx eslint` mientras no se
migre con `npx @next/codemod@canary next-lint-to-eslint-cli .`.

## Testing

- Framework: Vitest
- Assertion: jsdom para DOM
- Pattern: Uno `.test.ts` por módulo crítico
- Coverage target: APIs, auth, validación

---

**Última actualización**: 2026-08-14 — se integró @sirius/solicitudes
**Mantenido por**: DataLab Development Team
