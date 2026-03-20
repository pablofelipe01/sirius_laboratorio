# Skill: Patrones de Cepas (Microorganismos)

Conocimiento de dominio sobre gestión de cepas microbiológicas en Sirius DataLab.

## Base de Datos

| Base      | ID Variable | Tablas Principales |
|-----------|-------------|-------------------|
| Cepas Core | `AIRTABLE_BASE_CEPAS` | Cepas, Microorganismos, Propiedades, Historiales |

## Tipos de Microorganismos

### Bacterias Benéficas
- **Bacillus subtilis** — Biofertilizante, control plagas, fijación N₂
- **Bacillus megaterium** — Solubilización fósforo, hormonas
- **Bacillus cereus** — Controla insectos (cristales Bt)
- **Pseudomonas fluorescens** — Biocontrol, antibiosis

### Hongos Benéficos
- **Trichoderma harzianum** — Control plagas (hiperparasitismo), enzimas
- **Trichoderma viride** — Similar a harzianum
- **Aspergillus oryzae** — Fermentación (koji), enzimas
- **Beauveria bassiana** — Bioinsecticida (entomopatógeno)

### Actinomicetos
- **Streptomyces** — Producción antibióticos, compost

## Ciclo de Vida de una Cepa

```
Aislamiento
    ↓
Caracterización (bioquímica, gene sequencing)
    ↓
Conservación (stock madre)
    ↓
Verificación (pureza, viabilidad)
    ↓
Propagación (cultivo de trabajo)
    ↓
Inoculación (lotes de producción)
    ↓
Monitoreo (durante fermentación)
    ↓
Cosecha & Almacenamiento
```

## Schema Airtable — Cepas

```json
{
  "id": "CEPA-00001",
  "nombre": "Bacillus subtilis ATCC 23857",
  "codigo_interno": "BS-001",
  "microorganismo_clasificacion": "Bacteria Gram-positiva",
  "genero": "Bacillus",
  "especie": "subtilis",
  "cepa_original": "ATCC 23857",  // Referencia de colección
  "proveedor_original": "American Type Culture Collection",
  "fecha_adquisicion": "2024-01-15",
  
  // Características microbiológicas
  "caracteristicas": {
    "forma": "Bacilos rectos",
    "tamaño_um": "0.7 x 2-3",
    "motilidad": true,
    "esporulation": true,
    "temperatura_minima": 5,
    "temperatura_optima": 37,
    "temperatura_maxima": 50,
    "pH_minimo": 4.5,
    "pH_optimo": 7.0,
    "pH_maximo": 9.0,
    "aerobico": true,
    "anaerobico": false
  },

  // Capacidades funcionales
  "capacidades": {
    "fijacion_nitrogeno": false,
    "solubiliza_fosforo": false,
    "produce_auxinas": true,
    "produce_giberelinas": true,
    "biocontrol_hongos": true,
    "biocontrol_bacterias": false,
    "entomopatogo": false,
    "celulose_degradacion": true,
    "amilasa_produccion": true,
    "proteasa_produccion": true,
    "antibiotico_produccion": "Bacitracina, Subtilosina"
  },

  // Stock y disponibilidad
  "estado": "Activa",  // Activa, Inactiva, Contaminada
  "stock_madres": 5,   // Ampolletas/tubos stock madre
  "stock_trabajo": 12, // Cultivos activos de trabajo
  "garantia_pureza": 99.5,  // % pureza
  "viabilidad_ultima_verificacion": 98,  // %
  "fecha_verificacion": "2025-03-10",
  
  // Almacenamiento
  "metodo_almacenamiento": "Ultracongélation (-80°C) + Liofilización",
  "ubicacion_fisica": "Congelador -80 / Rack 03 / Caja 12",
  "fecha_proximo_refreshment": "2025-09-15",

  // Trazabilidad
  "numero_generaciones_cultivo": 8,  // Desde stock madre
  "ultimos_cultivos": [
    {
      "fecha": "2025-03-15",
      "lote_id": "Lote-2025-03-001",
      "proposito": "Inoculación producción",
      "resultado": "OK"
    }
  ],

  // Documentación
  "notas": "Excelente productora de proteasas. Verificar contaminación cada 2 meses.",
  "publicaciones_referencia": [
    "Stein et al. (2016) - Genomics of Bacillus subtilis",
    "Vallalba et al. (2020) - Biofertilizante eficacia"
  ]
}
```

## Patrones de API

### GET /api/cepas — Listar todas
```typescript
export async function GET(request: NextRequest) {
  // Retorna array de todas las cepas ACTIVAS
  // Campos: id, nombre, tipo, temp_optima, ph_optimo, stock_madres, estado
  // Filtro opcional: ?estado=Activa&genero=Bacillus
}
```

### GET /api/cepas/[id] — Detalle completo
```typescript
export async function GET(request: NextRequest, { params }) {
  // Retorna cepa CON: características, capacidades, histórico cultivos
  // Incluir stock actual, próxima fecha verificación
}
```

### POST /api/cepas — Crear nueva
```typescript
export async function POST(request: NextRequest) {
  // Input: nombre, tipo, temp_optima, ph_optimo, capacidades
  // Generar automáticamente ID (CEPA-00001, CEPA-00002, etc)
  // Guardar en stock madre = 0, requiere "Refreshment" manual
}
```

### PUT /api/cepas/[id]/refreshment — Actualizar stock
```typescript
// Cuando haces un cultivo nuevo a partir de stock madre
// Actualizar: numero_generaciones_cultivo, stock_trabajo, ultimos_cultivos[]
```

### POST /api/cepas/[id]/verificacion — Registrar prueba pureza
```typescript
// Input: fecha, resultado_pureza, viabilidad
// Actualizar fecha_verificacion, garantia_pureza
// Si viabilidad < 80%, marcar como "En Riesgo"
```

## Validaciones

- **Nombre**: Mínimo 5 caracteres, no duplicados
- **Generaciones**: No usar cepa > 20 generaciones (degradación genética)
- **Temperatura**: Mínima < Óptima < Máxima
- **pH**: 0-14, Mínimo < Óptimo < Máximo
- **Stock madre**: Verificación cada 6 meses máximo
- **Viabilidad**: Alarma si cae < 85%

## Ejemplos de Cepas Comunes

### Bacillus subtilis
```json
{
  "nombre": "Bacillus subtilis ATCC 23857",
  "temperatura_optima": 37,
  "pH_optimo": 7.0,
  "caracteristicas": {
    "esporulation": true,
    "aerobico": true
  },
  "capacidades": {
    "produce_auxinas": true,
    "biocontrol_hongos": true,
    "celulose_degradacion": true
  }
}
```

### Trichoderma harzianum
```json
{
  "nombre": "Trichoderma harzianum Th-003",
  "temperatura_optima": 28,
  "pH_optimo": 5.5,
  "caracteristicas": {
    "esporulation": true,
    "aerobico": true
  },
  "capacidades": {
    "biocontrol_hongos": true,
    "celulose_degradacion": true
  }
}
```

## Seguridad y Bioseguridad

- **Nivel Bioseguridad**: Mayoría BSL-1 (bajo riesgo)
- **Cepas críticas**: Mayores controles de acceso
- **Trazabilidad**: OBLIGATORIO registrar:
  - Quién accedió a la cepa
  - Cuándo
  - Para qué (inoculación, investigación, etc.)
  - Resultado
- **Auditoría**: Log de todos cambios a cepas críticas

---

**Dominio**: Microbiología Aplicada | **Crítica**: Máxima
