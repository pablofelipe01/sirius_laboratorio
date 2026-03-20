# Skill: Convenciones API DataLab

Conocimiento de patrones, convenciones y mejores prácticas para APIs en Sirius DataLab.

## Estructura General de Endpoint

```
método: GET | POST | PUT | DELETE | PATCH
ruta: /api/[recurso]/[id-opcional]/[acción-opcional]
auth: Cookie sirius-auth (JWT)
respuesta: 
{
  success: boolean,
  data?: T,
  error?: string
}
```

## Status Codes Estándar

| Code | Significa | Cuando usar |
|------|-----------|-----------|
| 200 | OK | GET exitoso, datos retornados |
| 201 | Created | POST creó recurso, retorna el recurso creado |
| 204 | No Content | DELETE exitoso, sin body |
| 400 | Bad Request | Validación fallida (Zod error) |
| 401 | Unauthorized | Sin token o token inválido |
| 403 | Forbidden | Token válido pero sin permisos RBAC |
| 404 | Not Found | Recurso no existe |
| 409 | Conflict | Recurso ya existe (duplicado), constraint violation |
| 429 | Too Many Requests | Rate limit excedido |
| 500 | Internal Server Error | Error no manejado en servidor |
| 503 | Service Unavailable | Airtable no disponible, DB cae |

## Response Pattern

### Éxito (GET, POST)
```json
{
  "success": true,
  "data": { /* recurso o array */ }
}
```

**Ejemplo GET /api/cepas**:
```json
{
  "success": true,
  "data": [
    {
      "id": "CEPA-00001",
      "nombre": "Bacillus subtilis",
      "tipo": "Bacteria",
      "temp_optima": 37
    }
  ]
}
```

**Ejemplo POST /api/cepas**:
```json
{
  "success": true,
  "data": {
    "id": "CEPA-00010",
    "nombre": "Nueva Cepa",
    "tipo": "Bacillus",
    "temp_optima": 35,
    "fecha_creacion": "2025-03-18T14:30:00Z"
  }
}
```

### Error
```json
{
  "success": false,
  "error": "Descripción clara del error para usuario"
}
```

**Ejemplo validación fallida (400)**:
```json
{
  "success": false,
  "error": "Validación fallida",
  "details": {
    "campo": "temperatura_optima",
    "mensaje": "Debe estar entre 0 y 50°C"
  }
}
```

**Ejemplo auth fallida (401)**:
```json
{
  "success": false,
  "error": "Token inválido o expirado. Por favor inicie sesión nuevamente."
}
```

**Ejemplo sin permisos (403)**:
```json
{
  "success": false,
  "error": "No tienes permisos para crear cepas. Requiere rol: Técnico"
}
```

## Rutas y Patrones Comunes

### CRUD Básico
```
GET    /api/recurso          → Listar todos
GET    /api/recurso/[id]     → Detalle específico
POST   /api/recurso          → Crear nuevo
PUT    /api/recurso/[id]     → Actualizar completo
PATCH  /api/recurso/[id]     → Actualizar parcial
DELETE /api/recurso/[id]     → Eliminar (soft-delete)
```

### Con Acciones
```
POST   /api/recurso/[id]/accion-especial
POST   /api/lotes/[id]/cosecha     → Registrar cosecha
POST   /api/cepas/[id]/verificacion → Prueba calidad
POST   /api/lotes/[id]/cambiar-estado → Cambio de estado
```

### Búsqueda y Filtrado
```
GET /api/cepas?tipo=Bacillus&estado=Activa&limit=20&offset=0
GET /api/lotes-disponibles?estado=En%20Producción&mes=2025-03
GET /api/fermentacion?lote_id=Lote-2025-03-001
```

**Query params recomendados**:
- `limit`: 10-100 (paginación)
- `offset`: 0, 10, 20... (para próxima página)
- `sort`: "nombre", "-fecha" (ascendente/-descendente)
- `campos`: "id,nombre,tipo" (select específico)

## Autenticación y Autorización

### Token JWT (en cookie)
```
Cookie: sirius-auth=eyJhbGcOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Estructura JWT**:
```json
{
  "sub": "usuario-id-123",
  "email": "jorge@datalab.local",
  "nombre": "Jorge García",
  "role": "Técnico",
  "lotes_asignados": ["Lote-2025-03-001"],
  "iat": 1710769800,
  "exp": 1710856200  // 24 horas después
}
```

**Verificación en endpoint**:
```typescript
const token = request.cookies.get("sirius-auth")?.value;
if (!token) {
  return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
}

const payload = verifyJWT(token, env.auth.jwtSecret);
if (!payload) {
  return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 });
}

const role = payload.role;
if (!hasMinRole(role, "Técnico")) {
  return NextResponse.json({ success: false, error: "Sin permisos" }, { status: 403 });
}
```

### Roles Jerárquicos
```
Super Admin
    ↓ (puede hacer todo)
Admin Lab
    ↓ (gestión general)
Técnico
    ↓ (crear/modificar datos técnicos)
Operario
    ↓ (ejecutar procesos)
Viewer (Lectura solo)
    ↓ (sin crear nada)
```

Función `hasMinRole(userRole, requiredRole)` retorna `true` si userRole >= requiredRole en jerarquía.

## Validación Entrada (Zod)

```typescript
import { z } from "zod";

const CreateCepaSchema = z.object({
  nombre: z.string().min(2).max(100),
  tipo: z.enum(["Bacillus", "Trichoderma", "Aspergillus"]),
  temperatura_optima: z.number().min(0).max(50),
  pH_optimo: z.number().min(0).max(14),
  descripcion: z.string().optional(),
});

try {
  const validPayload = CreateCepaSchema.parse(await request.json());
  // Proceder con datos válidos
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: "Validación fallida",
        details: error.errors[0]
      },
      { status: 400 }
    );
  }
}
```

## Airtable Safety

### SIEMPRE Escapar Valores
```typescript
import { escapeAirtableValue } from "@/lib/security";

// NUNCA:
const filterFormula = `{nombre} = '${nombre}'`; // ❌ Inyección SQL posible

// SIEMPRE:
const escapedNombre = escapeAirtableValue(nombre);
const filterFormula = `{nombre} = '${escapedNombre}'`; // ✓ Seguro

// Función escapeAirtableValue():
// - Reemplaza \ por \\
// - Reemplaza ' por \'
// - Elimina caracteres de control
```

### Fetch Airtable con Paginación
```typescript
import { fetchAllRecords } from "@/lib/airtable";

// Automáticamente pagina (máx 100/request)
const cepas = await fetchAllRecords(
  env.airtable.baseCepas,
  "Cepas"
);

// Opcional: con cache ISR
const cepas = await fetch(
  `https://api.airtable.com/v0/${baseId}/Cepas`,
  {
    headers: { Authorization: `Bearer ${apiKey}` },
    next: { revalidate: 60 } // Cache 60 segundos
  }
);
```

## Manejo de Errores

```typescript
try {
  // Lógica endpoint
  const result = await fetchAllRecords(...);
  return NextResponse.json({ success: true, data: result });
  
} catch (error) {
  // 1. Errores de validación Zod
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { success: false, error: "Datos inválidos", details: error.errors },
      { status: 400 }
    );
  }
  
  // 2. Errores lógica negocio
  if (error instanceof BusinessError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.statusCode }
    );
  }
  
  // 3. Errores desconocidos
  console.error("[POST /api/cepas]", error);
  return NextResponse.json(
    { success: false, error: "Error interno del servidor" },
    { status: 500 }
  );
}
```

## Logging y Debugging

```typescript
// Nivel: INFO (eventos normales)
console.log("[GET /api/cepas] Usuario:", payload.email, "Cepas:", cepas.length);

// Nivel: WARN (comportamiento inesperado)
console.warn("[PUT /api/lotes/123] Lote sin responsable, asignando admin");

// Nivel: ERROR (fallos que requieren atención)
console.error("[POST /api/cepas] DB error:", error);

// NUNCA loguear:
// ❌ Contraseñas
// ❌ Tokens JWT
// ❌ Datos sensibles de cliente
// ❌ PII (Personally Identifiable Information)
```

## Rate Limiting

```typescript
import { checkRateLimit } from "@/lib/security";

// En endpoint sensible (ej: login, create)
const clientId = request.ip || "unknown";
const allowed = await checkRateLimit(
  clientId,
  "crear_cepas",        // action key
  10,                    // max requests
  3600                   // time window (segundos)
);

if (!allowed) {
  return NextResponse.json(
    { success: false, error: "Demasiadas peticiones. Intente más tarde." },
    { status: 429 }
  );
}
```

## Documentación API (ejemplo)

```markdown
### GET /api/cepas

Obtiene lista de todas las cepas activas en el laboratorio.

**Headers**:
```
Cookie: sirius-auth=<JWT>
```

**Query Params**:
- `tipo` (opcional): "Bacillus" | "Trichoderma" | "Aspergillus"
- `estado` (opcional): "Activa" | "Inactiva"
- `limit` (opcional): 10-100, default 50
- `offset` (opcional): para paginación

**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "CEPA-00001",
      "nombre": "Bacillus subtilis ATCC 23857",
      "tipo": "Bacillus",
      "temperatura_optima": 37,
      "pH_optimo": 7.0,
      "estado": "Activa",
      "stock_madres": 5
    }
  ]
}
```

**Errores**:
- 401: Token inválido
- 403: Sin permisos para ver cepas
- 500: Error servidor
```

---

**Dominio**: Arquitectura API & Backend Patterns | **Crítica**: Máxima
