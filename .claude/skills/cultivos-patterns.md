# Skill: Patrones de Cultivos y Lotes

Conocimiento de dominio sobre gestión de cultivos y lotes en Sirius DataLab.

## Conceptos Fundamentales

### Lote (Batch)
**Definición**: Unidad de producción principal que agrupa uno o más cultivos. Tiene duración típica 4-12 semanas desde planeación a venta.

**Características**:
- ID único: `Lote-YYYY-MM-NNN`
- Fecha inicio y fin planificadas/reales
- Responsable técnico asignado
- Presupuesto y costos trazados
- Vector de cultivo específico (no se mezclan tipos)
- Trazabilidad completa de eventos

### Cultivo (Culture)
**Definición**: Producción específica de una cepa dentro de un lote. Un lote puede tener múltiples cultivos (ej: Cultivo-A y Cultivo-B ambos en Lote-2025-03-001, pero físicamente separados).

**Ciclo de Cultivo**:
```
Inoculación → Lag Phase → Log Phase → Stationary → Cosecha
    ↓            ↓           ↓          ↓           ↓
  Día 1      Días 1-2     Días 3-7    Días 8-10   Día 10-15
```

### Estado del Lote

```
┌─ Planeado
│  └─→ En Producción
│      └─→ Cosecha
│          └─→ Post-Cosecha
│              └─→ Finalizado (Vendido/Usado)
└─→ Abortado (En cualquier punto)
```

## Airtable Schema — Lotes

```json
// BASE: Lotes
{
  "id": "Lote-2025-03-001",
  "nombre": "Producción Marzo #1 - Bacillus + Trichoderma",
  
  // Temporalidad
  "fecha_creacion": "2025-02-25T09:00:00Z",
  "fecha_inicio_planeado": "2025-03-01T00:00:00Z",
  "fecha_inicio_real": "2025-03-01T08:30:00Z",
  "fecha_cosecha_planeado": "2025-04-15T00:00:00Z",
  "fecha_cosecha_real": null,  // Se llena cuando termina
  "duracion_dias_estimado": 45,
  "duracion_dias_real": null,
  
  // Responsabilidad
  "responsable_creacion": "Admin Lab",
  "responsable_ejecucion": "Jorge García",
  "responsable_cosecha": null,
  
  // Cultivos
  "cultivos_dentro": [
    {
      "id": "Cultivo-2025-03-001",
      "cepa_id": "Ref → CEPA-00001",  // Bacillus subtilis
      "biorreactor": "BR-02",
      "volumen_inicial_L": 50,
      "estado": "En Producción",
      "fecha_inoculacion": "2025-03-01T10:00:00Z",
      "viabilidad_inoculo": 95
    },
    {
      "id": "Cultivo-2025-03-002",
      "cepa_id": "Ref → CEPA-00003",  // Trichoderma harzianum
      "biorreactor": "BR-03",
      "volumen_inicial_L": 50,
      "estado": "Cosecha",
      "fecha_inoculacion": "2025-03-05T10:00:00Z",
      "viabilidad_inoculo": 92
    }
  ],
  
  // Presupuesto
  "costo_estimado": 2500.00,
  "costo_real": 2450.75,
  "insumo_medio_cultivo_kg": 150,
  "insumo_aditivos": ["Vitaminas", "Oligoelementos"],
  "insumo_gas": "N2 + aire",
  "insumo_energia_kwh": 320,
  
  // Resultados esperados
  "rendimiento_esperado_kg": 150,
  "rendimiento_real_kg": null,
  "calidad_esperada": "Premium",
  "calidad_real": null,
  
  // Aplicaciones finales
  "aplicaciones_planeadas": [
    {
      "tipo": "Venta",
      "cantidad_kg": 140,
      "cliente": "Ref → Clientes",
      "producto": "Biofertilizante Líquido 1L"
    },
    {
      "tipo": "Investigación",
      "cantidad_kg": 10,
      "proyecto": "Mejora de cepas"
    }
  ],
  
  // Estado actual
  "estado": "En Producción",
  "estado_cultivos": ["En Producción", "Cosecha"],
  
  // Trazabilidad completa
  "eventos": [
    {
      "timestamp": "2025-02-25T09:00:00Z",
      "tipo": "Creación de Lote",
      "usuario": "Admin Lab",
      "notas": "Lote planificado para marzo"
    },
    {
      "timestamp": "2025-03-01T08:30:00Z",
      "tipo": "Inicio Real",
      "usuario": "Jorge García",
      "notas": "Comienzo inoculación"
    },
    {
      "timestamp": "2025-03-01T10:00:00Z",
      "tipo": "Inoculacion Cultivo-001",
      "usuario": "Jorge García",
      "cepa": "Bacillus subtilis ATCC 23857",
      "viabilidad": 95,
      "observaciones": "Óptimas condiciones"
    },
    {
      "timestamp": "2025-03-15T14:00:00Z",
      "tipo": "Alarma",
      "parametro": "pH Cultivo-001",
      "valor": 6.1,
      "accion_tomada": "Aireación aumentada"
    },
    {
      "timestamp": "2025-03-20T16:00:00Z",
      "tipo": "Cosecha Cultivo-002",
      "usuario": "Marcia López",
      "biomasa_kg": 78.5,
      "viabilidad": 89,
      "contaminacion": false
    }
  ],
  
  // Notas y observaciones
  "notas_generales": "Lote con excelente productividad. Cultivo-002 cosechado exitosamente.",
  "incidentes": "Breve spike de presión en BR-03, resuelta con válvula de alivio",
  
  // Control de calidad
  "pruebas_calidad": [
    {
      "fecha": "2025-03-20",
      "prueba": "Viabilidad celular",
      "resultado": "89%",
      "estatus": "PASS"
    },
    {
      "fecha": "2025-03-20",
      "prueba": "Contaminación por cultivo",
      "resultado": "Negativo",
      "estatus": "PASS"
    }
  ]
}
```

## Schema — Cultivos (dentro de Lote)

```json
{
  "id": "Cultivo-2025-03-001",
  "lote_padre": "Ref → Lote-2025-03-001",
  "cepa_origen": "Ref → CEPA-00001",  // Bacillus subtilis
  "biorreactor_asignado": "BR-02",
  "volumen_inicial_L": 50,
  "tipo_fermentacion": "Fed-Batch",
  "estado": "En Producción",  // Planeado, Inoculado, Log Phase, Cosecha-Ready, Cosechado
  
  // Inoculación
  "fecha_inoculacion": "2025-03-01T10:00:00Z",
  "viabilidad_inoculo": 95,
  "volumen_inoculo_mL": 500,
  "concentracion_inicial": 1e6,  // CFU/mL
  
  // Fermentación (vinculado a FERM-*)
  "fermentacion_id": "Ref → FERM-2025-03-001",
  "fecha_inicio_fermentacion": "2025-03-01T10:30:00Z",
  "fecha_fin_fermentacion": null,
  "duracion_horas": null,
  "temperatura_optima": 28,
  "pH_optimo": 6.5,
  
  // Monitoreo continuidad
  "parametros_monitoreados": {
    "temperatura_actual": 28.1,
    "pH_actual": 6.48,
    "od_disuelto": 42,
    "presion_actual": 1.2,
    "OD_600_ultima": 0.85,
    "ultima_actualizacion": "2025-03-15T14:00:00Z"
  },
  
  // Cosecha (cuando listo)
  "cosecha": {
    "fecha": null,
    "biomasa_seca_g": null,
    "productividad_g_l_h": null,
    "rendimiento_yx_s": null,
    "viabilidad_final": null,
    "contaminacion_detectada": null
  },
  
  // Post-cosecha
  "destino": null,  // Venta, Siembra (inóculo), Investigación, Descarte
  "cantidad_asignada_aplicacion": null,
  
  // Trazabilidad eventos
  "eventos_cultivo": [
    {
      "timestamp": "2025-03-01T10:00:00Z",
      "evento": "Inoculación",
      "usuario": "Jorge"
    }
  ]
}
```

## Flujo Típico de Lote

### Fase 1: Planeación (Days -7 a 0)
```
✓ Definir objetivos de producción
✓ Seleccionar cepas a usar
✓ Calcular requerimientos insumos
✓ Asignar biorreactores disponibles
✓ Establecer presupuesto
✓ Preparar medio cultivo
✓ Esterilizar equipamiento
✓ Crear registros en Airtable
```

### Fase 2: Inoculación (Day 1)
```
✓ Verificar stock madre viables (>85%)
✓ Preparar inóculo en escala apropiada
✓ Verificar parámetros biorreactor listo
✓ Inocular cultivos
✓ Registrar viabilidad inóculo
✓ Iniciar monitoreo
✓ Evento "Lote iniciado"
```

### Fase 3: Fermentación (Days 2-10)
```
✓ Monitoreo 2-horariamiento (T, pH, OD)
✓ Muestreo cada 6-12 horas (biomasa, viabilidad)
✓ Responder alarmas ( pH ± 0.5, T° ± 2)
✓ Ajustes de alimentación (si fed-batch)
✓ Registrar eventos significativos
✓ Observaciones diarias en bitácora (notas, incidentes)
```

### Fase 4: Cosecha (Day 10-15)
```
✓ Verificar viabilidad > 80%
✓ Preparar equipamiento cosecha (centrifuga, etc)
✓ Centrifugar cultivo
✓ Pesar biomasa húmeda
✓ Secado en horno (110°C, 24h) o liofilización
✓ Pesar biomasa seca
✓ Muestreo control calidad
✓ Registrar yields, productividad
✓ Asignar destino (venta, inóculo, etc)
```

### Fase 5: Post-Cosecha y Venta (Days 15-45)
```
✓ Empaquetado
✓ Etiquetado (lote, fecha, cepa)
✓ Control calidad final
✓ Almacenamiento (temp, humedad controlada)
✓ Emisión remisión a cliente
✓ Instalación producto en cliente (si requiere)
✓ Cerrar lote (marcar Finalizado)
```

## Patrones API

### GET /api/lotes-core — Listar lotes
```typescript
// query params:
// ?estado=En%20Producción
// ?mes=2025-03
// ?responsable=Jorge%20García
// Retorna: [{ id, nombre, estado, fecha_inicio, responsable }]
```

### GET /api/lote-complete/[id] — Detalle completo
```typescript
// Retorna lote CON:
// - Cultivos dentro (todos los datos)
// - Fermentaciones asociadas
// - Trazabilidad completa
// - Aplicaciones planeadas
// - Resultados finales
```

### POST /api/lotes-core — Crear nuevo
```typescript
// Input: nombre, fecha_inicio, cultivos[]
// Auto-genera ID (Lote-YYYY-MM-NNN)
// Crea eventos de trazabilidad
```

### PUT /api/lotes-core/[id]/estado — Cambiar estado
```typescript
// Input: nuevo_estado, notas
// Validar transiciones legales
// Registrar cambio en eventos
```

## Validaciones

- **Nombre lote**: Único, descriptivo
- **Cultivos**: Cada uno debe tener cepa válida
- **Fechas**: Inicio < Cosecha
- **Responsables**: Usuario en sistema
- **Presupuesto**: >= suma insumos
- **Rendimiento esperado**: Realista (+/- 20% de historial)
- **Cambios de estado**: Transiciones válidas (no saltar fases)

## Métricas Clave

### Por Lote
- **Duración Total**: Inicio real - Cosecha real (en días)
- **Rendimiento Alcanzado**: Biomasa total cosechada (kg)
- **Rendimiento vs Esperado**: % (Rend_Real / Rend_Esperado × 100)
- **Costo por kg**: Costo_Total / Rendimiento_kg
- **Incidentes**: Número desviaciones de setpoints

### Por Cultivo (dentro de lote)
- **Productividad**: g biomasa / L / hora
- **Viabilidad**: % células vivas al cosecha
- **Duración Log Phase**: Horas de crecimiento exponencial
- **Contaminación**: Sí/No

## Clonación de Lotes

Permite copiar un lote exitoso para repetir:
```
selectLote("Lote-2025-03-001") → clonarLote()
→ Crea: "Lote-2025-04-001" con mismos cultivos, parámetros, presupuesto
```

---

**Dominio**: Gestión de Producción Agrícola | **Crítica**: Máxima
