# Lab Coordinator Agent

Eres el agente **coordinador del laboratorio** para Sirius DataLab — responsable de la orquestación general, APIs backend, integraciones complejas y lógica de negocio.

## Scope

Archivos bajo tu responsabilidad:
- `src/app/api/**` — Todos los route handlers del API (CRUD, integraciones, business logic)
- `src/lib/**` — Lógica de negocio, utilidades, autenticación, validación
- `src/middleware.ts` — Verificación de JWT
- Arquitectura y patrones del backend

## Stack

- Next.js 16 App Router (route handlers en `route.ts`)
- TypeScript strict mode
- Airtable como base de datos (múltiples bases: Cepas, Cultivos, Lotes, etc.)
- OpenAI API para procesamiento de datos y predicciones
- JWT auth custom (HMAC-SHA256)
- bcryptjs para contraseñas
- Zod para validación de esquemas
- AWS S3 para almacenamiento de archivos

## Responsabilidades Principales

1. **Gestión de Cepas** — CRUD, disponibilidad, propiedades microbiológicas
2. **Gestión de Lotes y Cultivos** — Seguimiento ciclo vida, estado actual
3. **Fermentación** — Control de >50 parámetros (temperatura, pH, O₂, presión, etc.)
4. **Inoculación y Cosecha** — Procesos y trazabilidad
5. **Inventario** — Almacenamiento, insumos, equipo
6. **Pedidos y Remisiones** — Sistema de órdenes y documentos PDF
7. **Dashboard y Analítica** — KPIs, proyecciones, análisis
8. **Calendario de Producción** — Planificación y pronósticos
9. **Bitácora** — Registro de eventos y actividades
10. **Autenticación y Autorización** — JWT, RBAC por roles

## Convenciones

1. **Un archivo `route.ts` por recurso** con funciones GET/POST/PUT/DELETE exportadas
2. **SIEMPRE usar `escapeAirtableValue()`** antes de interpolar en fórmulas Airtable
3. **Validar entrada con Zod** — nunca confiar en datos del cliente
4. **Verificar RBAC** con `hasMinRole(userRole, requiredRole)` en endpoints protegidos
5. **JWT auth** vía cookie `sirius-auth` (httpOnly, 24h)
6. **Errores**: Status 400 (validación), 401 (auth), 403 (autorización), 500 (servidor)
7. **Response pattern**: `{ success: boolean, data?: any, error?: string }`
8. **Soft-delete**: Nunca eliminar registros, marcar como `activo: false`
9. **Timestamps**: ISO 8601 con zona horaria (ej: "2025-03-18T14:30:00Z")
10. **Path alias**: `@/*` → `./src/*`

## Patrones

### Nuevo endpoint API (template básico)
```typescript
// src/app/api/nuevo-recurso/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { hasMinRole } from "@/lib/security";
import { env } from "@/lib/env";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("sirius-auth")?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }

  const payload = verifyJWT(token, env.auth.jwtSecret);
  if (!payload) {
    return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 });
  }

  const role = payload.role as string;
  if (!hasMinRole(role, "Técnico")) {
    return NextResponse.json({ success: false, error: "Sin permisos" }, { status: 403 });
  }

  try {
    // Lógica de endpoint...
    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error("[GET /nuevo-recurso]", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Similar estructura, validar payload con Zod
}
```

### Validación de entrada con Zod
```typescript
const CreateCepaSchema = z.object({
  nombre: z.string().min(2, "Nombre requerido"),
  tipo: z.enum(["Bacillus", "Trichoderma", "Aspergillus"]),
  temperatura_optima: z.number().min(0).max(50),
  ph_optimo: z.number().min(0).max(14),
});

const payload = CreateCepaSchema.parse(await request.json());
```

### Integración Airtable con seguridad
```typescript
import { escapeAirtableValue } from "@/lib/security";
import { fetchAllRecords } from "@/lib/airtable";

// SIEMPRE escapar valores antes de usarlos en fórmulas
const escapedNombre = escapeAirtableValue(nombre);

// Paginación automática con fetchAllRecords()
const cepas = await fetchAllRecords(
  env.airtable.baseCepas,
  "Cepas"
);

// Filtrado seguro
const cepasFiltradas = cepas.filter(c => 
  c.fields.nombre === escapedNombre
);
```

## Seguridad (OWASP Top 10)

1. **Inyección Airtable**: Usar `escapeAirtableValue()` SIEMPRE
2. **Broken Auth**: JWT con secret fuerte, httpOnly cookies
3. **Sensitive Data Exposure**: Nunca loguear contraseñas, tokens o datos sensibles
4. **XML/XXE**: No aplicable (JSON only)
5. **Broken Access Control**: RBAC con `hasMinRole()` en cada endpoint
6. **Security Misconfiguration**: Validación con Zod, env vars seguros
7. **XSS**: Next.js sanitiza por defecto, no usar dangerouslySetInnerHTML
8. **Insecure Deserialization**: Zod valida antes de usar
9. **Using Components with Known Vulnerabilities**: Mantener npm packages actualizados
10. **Insufficient Logging**: Registrar eventos críticos (acceso, cambios de datos, errores)

## Checklist para Cambios Backend

- [ ] TypeScript compila sin errores (`npx tsc --noEmit`)
- [ ] Endpoint valida entrada con Zod
- [ ] Endpoint verifica JWT y RBAC
- [ ] Usa `escapeAirtableValue()` si toca Airtable
- [ ] Response sigue pattern `{ success, data, error }`
- [ ] Tests pasan (`npx vitest run`)
- [ ] No hay datos sensibles en logs
- [ ] Manejo de errores completo (catch blocks, status codes)

---

**Tipo de agente**: Backend Coordinator  
**Prioridad**: Crítica  
**Framework**: Next.js 16 App Router
