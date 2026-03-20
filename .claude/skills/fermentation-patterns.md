# Skill: Patrones de Fermentación

Conocimiento de dominio sobre procesos de fermentación microbiológica en Sirius DataLab.

## Tipos de Fermentación

### Batch (Por Lotes)
- Duración fija (típico 48-72h)
- Volumen inicial predefinido
- Sin agregación de sustrato durante proceso
- Más simple, menor productividad
- Controlado automático: T°, pH, aireación

### Fed-Batch (Alimentación Controlada)
- Duración variable según progreso
- Agregación de sustrato estratégicamente
- Mayor rendimiento que batch
- Requiere monitoreo más frecuente
- Perfil de alimentación (exponencial, lineal, etc.)

### Continuous (Continuo)
- Operación permanente
- Entrada y salida simultánea
- Máxima productividad
- Requiere biorreactor muy estable
- Caro, complejo operacionalmente

## Parámetros Críticos (>50 variables)

### Parámetros Físicos
| Variable | Rango Típico | Unidad | Sensor |
|----------|-------------|--------|--------|
| Temperatura | 15-45 | °C | RTD/Pt100 |
| Presión Interna | 0-3 | bar | Manómetro digital |
| Agitación | 100-1000 | RPM | Tacómetro |
| Flujo Aire (vvm) | 0.5-2.0 | L/L·min | Flujómetro |
| pH | 3-9 | pH | Electrodo vidrio |
| Oxígeno Disuelto | 20-100 | % saturación | Clark electrode |

### Parámetros Químicos (monitoreo periódico)
| Variable | Unidad | Frecuencia |
|----------|--------|-----------|
| Glucosa Residual | g/L | Cada 12h |
| Aminoácidos | mg/L | Daily |
| Ácidos Orgánicos | g/L | Daily |
| Amonio | mg/L | Daily |
| Nitrógeno Total | % | Weekly |
| Fósforo | mg/L | Weekly |

### Parámetros Biológicos
| Variable | Método | Frecuencia |
|----------|--------|-----------|
| Densidad Óptica (OD600) | Espectrofotometría | Cada 6h |
| Viabilidad Celular | Cultivo en placa | Daily |
| Conteo Células | Hemocitómetro | Cada 12h |
| Esporas (si aplica) | Tinción Schaeffer-Fulton | Weekly |
| Tasa Crecimiento (μ) | Cálculo desde OD | Cada 12h |

### Parámetros de Producción (metabolitos)
| Variable | Unidad | Ejemplo |
|----------|--------|---------|
| Biomasa Seca | g/L | 15-50 |
| Productividad Volumétrica | g/L/h | 0.3-0.8 |
| Rendimiento (Yx/s) | g biomasa/g sustrato | 0.4-0.7 |
| Tasa Consumo Sustrato | g/L/h | 0.2-0.5 |
| Metabolito Principal | g/L | Variar |
| CO₂ Producción | % gas salida | 2-8 |

## Fases de Fermentación

```
Lag Phase (Adaptación)
├─ Duración: 0-12h típico
├─ Observations: Bajo μ, ajuste metabólico
├─ Acciones: Monitoreo frecuente (cada 2h)
└─ Target: Parámetros estables

Log Phase (Crecimiento Exponencial) *** MÁS IMPORTANTE
├─ Duración: 6-36h tipicamente
├─ Observations: Máximo μ, rápido OD
├─ Acciones: Mantener setpoints, máxima productividad
└─ Target: OD crece 0.3-0.5 por hora

Stationary Phase (Equilibrio)
├─ Duración: Variable
├─ Observations: μ cae, producción metabolitos secundarios
├─ Acciones: Cambio estrategia si necesario (fed-batch)
└─ Target: Optimizar producción objetivo

Decline Phase (Decaimiento)
├─ Duración: Hacia final fermentación
├─ Observations: Muerte celular, acumulación tóxicos
├─ Acciones: Decidir si cosechar o continuar
└─ Target: Viabilidad > 80% si posible
```

## Ejemplo de Datos de Fermentación

```json
{
  "id": "FERM-2025-03-001",
  "lote_id": "Lote-2025-03-001",
  "cepa_id": "CEPA-00001",  // Bacillus subtilis
  "biorreactor_id": "BR-02",
  "volumen_inicial_L": 100,
  "tipo_fermentacion": "Fed-Batch",
  "fecha_inicio": "2025-03-15T10:00:00Z",
  "fecha_fin": "2025-03-17T22:00:00Z",
  "duracion_horas": 60,
  "estado": "Completado",  // En Progreso, Pausado, Completado, Abortado

  "setpoints": {
    "temperatura": 28,      // °C
    "pH": 6.5,             // pH value
    "presion": 1.5,        // bar
    "aireacion": 1.0,      // vvm (volumen aire/volumen medio/minuto)
    "agitacion": 400       // RPM
  },

  "datos_recolectados": [
    {
      "timestamp": "2025-03-15T10:00:00Z",
      "temperatura": 28.0,
      "pH": 6.48,
      "od_disuelto": 100,
      "od_actual": 600,    // OD a 600nm
      "presion": 1.48,
      "aireacion_actual": 1.01,
      "agitacion_actual": 402,
      "glucosa_residual": 45.0,
      "biomasa_seca_estimada": 2.5,
      "mu_especifico": 0.15  // Growth rate h^-1
    },
    // ... más puntos cada 2 horas
  ],

  "eventos_significativos": [
    {
      "timestamp": "2025-03-15T14:30:00Z",
      "tipo": "Logró Log Phase",
      "parametro": "OD",
      "comentario": "Crecimiento exponencial iniciado"
    },
    {
      "timestamp": "2025-03-16T08:00:00Z",
      "tipo": "Alarma",
      "parametro": "pH",
      "valor_actual": 6.1,
      "setpoint": 6.5,
      "accion": "Aumentada aireación a 1.2 vvm"
    },
    {
      "timestamp": "2025-03-16T16:00:00Z",
      "tipo": "Entrada Fed-Batch",
      "volumen_agregado_L": 20,
      "concentracion_sustrato": "50% glucosa",
      "razon": "Mantener glucosa > 5 g/L"
    }
  ],

  "resultado_final": {
    "fecha_cosecha": "2025-03-17T22:00:00Z",
    "biomasa_seca_final": 35.5,    // g/L
    "viabilidad_final": 92,        // %
    "productividad": 0.59,         // g/L/h
    "rendimiento_yx_s": 0.52,      // g biomasa / g sustrato
    "duracion_log_phase": 28,      // horas
    "yx_ph": 0.35,                 // metabolito/sustrato
    "contaminacion": false,
    "observaciones": "Fermentación exitosa. Máxima productividad alcanzada."
  },

  "post_cosecha": {
    "metodo_cosecha": "Centrifugación",
    "velocidad_centrifuga": 5000,  // RPM
    "tiempo_centrifuga": 10,       // minutos
    "volumen_cosechado": 95,       // L (pérdidas normales)
    "peso_biotecnico_humedo": 1850, // g
    "peso_biotecnico_seco": 385,    // g @ 110°C
    "destino": "Secado en horno, empaque"
  }
}
```

## Cálculos Cinéticos

### Velocidad Específica de Crecimiento (μ)
```
μ = ln(X₂/X₁) / (t₂ - t₁)
μ en h⁻¹
Donde X = concentración biomasa (g/L), t = tiempo (h)
```

### Tiempo de Duplicación (Doubling Time)
```
Td = ln(2) / μ = 0.693 / μ
Típico: 0.5-2 horas para bacterias rápido-crecientes
```

### Productividad Volumétrica
```
Px = (X - X₀) / t
X = biomasa final, X₀ = inicial, t = tiempo
Tipicamente: 0.2-0.8 g/L/h
```

### Rendimiento (Yield)
```
Yx/s = ΔX / ΔS
Cambio biomasa / Cambio sustrato
Típico: 0.4-0.7
```

### Tasa de Consumo de Sustrato
```
qs = (S₀ - S) / (X·t)
Sustrato consumido por unidad biomasa por hora
```

## Monitoreo en Tiempo Real (Recomendado)

**Intervalo cada 2 horas durante fermentación:**
- Temperatura corporal
- pH
- OD (Oxígeno Disuelto)
- Presión
- RPM agitación
- Observación visual (espuma, color, turbidez)

**Muestreo cada 6 horas:**
- OD600 (espectrofotometría)
- Glucosa residual (HPLC o glucómetro)
- Biomasa seca (pequeña alícuota)

**Daily:**
- Cultivo en placa (viabilidad)
- Prueba de contaminación (Gram, DAPI)

## Alertas y Límites

| Parámetro | Alarma Baja | Alarma Alta | Acción |
|-----------|------------|------------|--------|
| Temperatura | < 25°C | > 32°C | Ajustar calefacción/enfriamiento |
| pH | < 6.0 | > 7.0 | Agregar ácido/base según caso |
| OD | < 30% | > 95% | Reducir aireación |
| Presión | < 1.0 | > 2.5 bar | Revisar válvulas, aliviar presión |
| Espuma | Nivel alto | — | Agregar antiespumante |
| Contaminación | — | Detección | ABORTAR fermentación inmediatamente |

## Checklist Pre-Fermentación

- [ ] Biorreactor limpio, esterilizado
- [ ] Medio cultivo preparado y autoclavado
- [ ] Sensores calibrados (pH, OD, T°)
- [ ] Setpoints confirmados en sistema
- [ ] Inóculo preparado (viabilidad > 85%)
- [ ] Alineación personal (quién vigila qué)
- [ ] Alerta para absorbentes (descarga espuma)

## Referencias de Éxito

- **Duración esperada**: 48-72h para mayoría
- **Productividad mínima**: 0.3 g/L/h
- **Viabilidad mínima**: 80% al final
- **Contaminación máxima**: CERO tolerancia

---

**Dominio**: Ingeniería Bioquímica | **Crítica**: Máxima
