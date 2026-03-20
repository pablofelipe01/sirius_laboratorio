# Sirius DataLab — Sistema de Agentes de Inteligencia Artificial

> Estructura de agentes especializados e inteligencia de dominio para coordinación del laboratorio microbiológico de SiriusLab.

## 📋 contenido

```
.claude/
├── settings.json              # Configuración global (permisos, modelo)
├── agents/                    # 5 agentes especializados
│   ├── lab-coordinator.md     # Orquestación general, APIs backend
│   ├── fermentation-specialist.md # Procesos fermentación
│   ├── cultivation-specialist.md  # Cultivos y lotes
│   ├── api-developer.md        # Desarrollo backend endpoints
│   └── ui-developer.md         # Desarrollo frontend UI
└── skills/                    # Base de conocimiento especializada
    ├── cepas-patterns.md      # Gestión microorganismos, cepas
    ├── fermentation-patterns.md # Control fermentación, parámetros
    ├── cultivos-patterns.md   # Ciclo vida cultivos, lotes
    ├── api-conventions.md     # Patrones, convenciones APIs
    └── ui-patterns.md         # Componentes, diseño, layouts
```

---

## 🤖 Agentes Especializados

Cada agente tiene un scope específico, stack de conocimiento, y responsabilidades claras.

### 1. **Lab Coordinator** (lab-coordinator.md)
**Rol**: Orquestador técnico del laboratorio

**Responsabilidades**:
- Estructura general de APIs backend
- Gestión de cepas, lotes, cultivos
- Fermentación, inoculación, cosecha
- Autenticación, autorización (RBAC)
- Integración Airtable
- Dashboards y analítica

**Stack**: Next.js App Router, TypeScript, Airtable, JWT, Zod

**Cuándo invocar**: 
- "¿Cómo estructuro la API de lotes?"
- "Necesito crear endpoint para fermentación"
- "¿Dónde va la lógica de cambio de estado?"

---

### 2. **Fermentation Specialist** (fermentation-specialist.md)
**Rol**: Experto en microbiología y procesos fermentativos

**Responsabilidades**:
- Monitoreo parámetros fermentación (>50 variables)
- Alertas y alarmas
- Cálculos cinéticos (μ, Td, productividad)
- Fases fermentación (Lag, Log, Stationary, Decline)
- Biorreactores y hardware sensors
- Optimización procesos

**Stack**: Microbiología aplicada, IoT, datos tiempo real

**Cuándo invocar**:
- "¿Cuál es el rango óptimo de pH para Trichoderma?"
- "Cómo validar que fermentación entró en Log Phase?"
- "¿Cuál debe ser la presión máxima en BR-02?"

---

### 3. **Cultivation Specialist** (cultivation-specialist.md)
**Rol**: Experto en gestión agrícola y ciclo de vida cultivos

**Responsabilidades**:
- Creación y seguimiento lotes
- Ciclo vida cultivos (planeación, producción, cosecha)
- Aplicaciones (venta, inóculo, investigación)
- Trazabilidad completa
- Disponibilidad y stock
- Clonación de lotes exitosos
- Métricas y rendimiento

**Stack**: Gestión producción, agronomía, logística

**Cuándo invocar**:
- "Cómo estructurar un lote nuevo?"
- "¿Cuál es el ciclo de vida típico de un cultivo?"
- "¿Dónde asigno la biomasa cosechada?"

---

### 4. **API Developer** (api-developer.md)
**Rol**: Desarrollador backend especializado en APIs

**Responsabilidades**:
- Implementar endpoints (GET/POST/PUT/DELETE)
- Validación entrada (Zod)
- Seguridad (JWT, RBAC, escaping SQL)
- Error handling
- Status codes correctos
- Rate limiting
- Tests

**Stack**: Next.js Route Handlers, TypeScript, Zod, Airtable API

**Cuándo invocar**:
- "Implemente un POST /api/cepas con validación"
- "¿Cómo verificar permisos en este endpoint?"
- "Qué status code debería retornar aquí?"

---

### 5. **UI Developer** (ui-developer.md)
**Rol**: Desarrollador frontend especializado en interfaces

**Responsabilidades**:
- Componentes React 19
- Tailwind CSS 4, Glass-morphism
- Dashboards con gráficas (Recharts)
- Formularios controlados
- Visualización 3D (Three.js)
- Animaciones (Framer Motion)
- Responsive design, accesibilidad
- Integración con APIs

**Stack**: React 19, Next.js, Tailwind CSS 4, Recharts, Three.js, Framer Motion

**Cuándo invocar**:
- "Diseña un dashboard de fermentación en tiempo real"
- "¿Cómo hago responsivo este grid?"
- "¿Qué color uso para estado 'Abortado'?"

---

## 💡 Skills Especializados (Base de Conocimiento)

Cada skill documenta patrones, esquemas, fórmulas y mejores prácticas de un dominio específico.

### 1. **Cepas Patterns** (cepas-patterns.md)
Microorganismos: Bacillus, Trichoderma, Aspergillus, etc.
- Schema Airtable de cepas
- Ciclo vida cepa (aislamiento → propagación → cosecha)
- API patterns por operación
- Validaciones (generaciones, viabilidad)
- Ejemplos de cepas comunes

**Consulta cuando**: Necesites entender modelo de cepas, crear cepa nueva, o asignar a cultivo

### 2. **Fermentation Patterns** (fermentation-patterns.md)
Procesos fermentativos microbiológicos
- Tipos fermentación (Batch, Fed-Batch, Continuous)
- 50+ parámetros monitoreados
- Fases fermentación
- Cálculos cinéticos (ecuaciones)
- Schema datos fermentación
- Alertas y límites

**Consulta cuando**: Diseñes sistema monitoreo, cálcules productividad, o configures alarmas

### 3. **Cultivos Patterns** (cultivos-patterns.md)
Gestión lotes y cultivos
- Conceptos lote vs cultivo
- Schema Airtable completo
- Flujo lote (planeación → inoculación → fermentación → cosecha → venta)
- Aplicaciones (qué se hace con cosecha)
- Trazabilidad eventos
- Métricas clave

**Consulta cuando**: Crees lote, sigas ciclo, declares aplicaciones, o analices rendimiento

### 4. **API Conventions** (api-conventions.md)
Patrones y convenciones de APIs
- Response pattern { success, data/error }
- Status codes estándar
- Rutas CRUD + acciones
- Autenticación JWT
- Roles jerárquicos
- Validación Zod
- Airtable safety (escaping)
- Logging seguro
- Rate limiting

**Consulta cuando**: Implementes endpoint, definas response, o manejes errores

### 5. **UI Patterns** (ui-patterns.md)
Componentes y diseño frontend
- Paleta colores (primarios + semáforo)
- Componentes comunes (StatCard, ProgresoAplicaciones, DataTable)
- Layouts dashboard, formularios, cards
- Glass-morphism
- Animaciones
- Responsive breakpoints
- Accesibilidad (a11y)

**Consulta cuando**: Diseñes componente, hagas layout, o apliques estilos

---

## 🚀 Flujo de Trabajo

### Para Tareas Coordinación General
1. Consulta con **Lab Coordinator**
2. Lab Coordinator identifica qué skill/agente especializados necesita
3. Invoca otros agentes como sub-queries

### Para Tareas Técnicas Backend
1. Consulta con **API Developer** o **Lab Coordinator**
2. API Developer revisa **API Conventions** skill
3. Si necesita lógica de dominio, consulta **Cultivation** o **Fermentation** specialist

### Para Tareas Frontend
1. Consulta con **UI Developer**
2. UI Developer revisa **UI Patterns** skill
3. Obtiene datos via **API Developer** (que sigue **API Conventions**)

### Para Tareas de Dominio Puro
1. Consulta especialista (**Fermentation** o **Cultivation**)
2. Especialista revisa su skill correspondiente
3. Si necesita implementación, consulta con **API Developer** o **UI Developer**

---

## 📚 Cómo Usar Esta Infraestructura

### Opción 1: Consulta General
```
"Hey, necesito un nuevo endpoint para registrar inoculación."
→ Lab Coordinator atiende, identifica pasos necesarios
→ Coordina con API Developer + Fermentation Specialist
→ Resultado: endpoint robusto con lógica correcta
```

### Opción 2: Consulta Especializada
```
"¿Cuál es el porcentaje mínimo de viabilidad para usar una cepa en fermentación?"
→ Fermentation Specialist revisa skills
→ Retorna valor validado y referencias
```

### Opción 3: Implementación Frontend
```
"Necesito dashboard de fermentaciones en tiempo real."
→ UI Developer diseña layout
→ Consulta API Conventions para endpoints necesarios
→ API Developer implementa endpoints
→ Fermentation Specialist valida lógica
```

---

## 🔐 settings.json

```json
{
  "permissions": {
    "allow": [
      "Read", "Write", "Edit",
      "Bash(npm run ...)",
      "Bash(git ...)",
      "Grep", "Glob"
    ],
    "deny": [
      "Bash(rm -rf ...)",
      "Bash(git push --force ...)"
    ]
  },
  "model": "claude-sonnet-4-5",
  "memory": "project"
}
```

**Explicación**:
- Agentes pueden leer/escribir archivos
- Pueden ejecutar comandos npm, git (pero con restricciones de seguridad)
- NO pueden: borrar archivos masivamente, forzar pushes
- Modelo: Claude Sonnet 4.5 (balance speed/quality)
- Memory: project-level (persiste datos durante sesión)

---

## 📖 CLAUDE.md

El archivo `CLAUDE.md` en raíz documenta:
- Stack tecnológico del proyecto
- Estructura monorepo completa
- Conceptos clave (cepas, lotes, fermentación, etc.)
- Convenciones globales
- Patrones

**Se lee automáticamente** en cada sesión de Claude Code CLI.

---

## ✅ Verificación de Cambios

Después de cualquier desarrollo:

```bash
npx tsc --noEmit     # Type-check
npm run lint         # ESLint strict
npm run build        # Build exitoso
npx vitest run       # Tests (si existen)
```

---

## 🎯 Resumen: Qué Preguntar a Cada Agente

| Pregunta | Agente Principal | Consulta Skill |
|----------|-----------------|----------------|
| "¿Cómo estructuro una API?" | API Developer | api-conventions.md |
| "¿Cómo hago un dashboard?" | UI Developer | ui-patterns.md |
| "¿Cuál es ciclo vida lote?" | Cultivation Specialist | cultivos-patterns.md |
| "¿Parámetros fermentación?" | Fermentation Specialist | fermentation-patterns.md |
| "¿Cómo gestiono cepas?" | Lab Coordinator + Fermentation | cepas-patterns.md |
| "¿Cómo coordino todo esto?" | Lab Coordinator | CLAUDE.md |

---

**Generado**: 2025-03-18  
**Versión**: 1.0 (Integración inicial de SiriusLab)  
**Mantenedor**: DataLab Development Team
