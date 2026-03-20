# Skill: Patrones UI y Componentes DataLab

Conocimiento de dominio sobre diseño visual, componentes reutilizables y patrones de interfaz en Sirius DataLab.

## Paleta de Colores

### Primarios (Acción, Interacción)
```
Azul Principal: #3b82f6 (Tailwind: bg-blue-600, text-blue-600)
  Uso: Botones, links, tabs activos, highlights
  RGB: rgb(59, 130, 246)

Púrpura (Secundario): #8b5cf6 (Tailwind: bg-purple-600)
  Uso: Backgrounds alternos, cards premium
  RGB: rgb(139, 92, 246)
```

### Estados (Semáforo)
```
Verde (OK, Activo): #10b981 (Tailwind: bg-emerald-500)
  Uso: Checkmarks, status "Activo", éxito

Amarillo (Alerta): #f59e0b (Tailwind: bg-amber-500)
  Uso: Warnings, "Verificar", "Necesita atención"

Rojo (Error, Crítico): #ef4444 (Tailwind: bg-red-500)
  Uso: Errores, "Abortado", "Sin stock", estado crítico

Gris (Inactivo): #6b7280 (Tailwind: bg-gray-500)
  Uso: Disabled buttons, elementos inactivos, histórico
```

### Gradientes (Backgrounds)
```
Glass-Morphism:
  bg: rgba(255, 255, 255, 0.1) + backdrop-blur-xl
  border: rgba(255, 255, 255, 0.2)
  Tailwind: bg-white/10 backdrop-blur-xl border border-white/20

Gradient Azul-Púrpura:
  from: #3b82f6 to: #8b5cf6
  Tailwind: bg-gradient-to-r from-blue-500 to-purple-600
```

## Componentes Comunes

### 1. StatCard (Tarjeta KPI)

```typescript
// src/components/StatCard.tsx
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string; // emoji
  color?: "bg-blue-500" | "bg-green-500" | "bg-red-500" | "bg-purple-500";
  trend?: { value: string; positive: boolean };
  onClick?: () => void;
}

export function StatCard({ title, value, icon, color = "bg-blue-500", trend, onClick }: StatCardProps) {
  return (
    <div
      className={`${color} rounded-xl p-6 text-white cursor-pointer hover:shadow-lg transition-all`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm opacity-90">{title}</p>
          <h3 className="text-3xl font-bold mt-2">{value}</h3>
          {trend && (
            <p className={`text-sm mt-1 ${trend.positive ? "text-green-200" : "text-red-200"}`}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        {icon && <span className="text-4xl">{icon}</span>}
      </div>
    </div>
  );
}

// Uso:
<StatCard
  title="Cepas Activas"
  value={24}
  icon="🧬"
  color="bg-blue-500"
  trend={{ value: "+3 esta semana", positive: true }}
/>
```

### 2. ProgresoAplicaciones (Barra de Progreso)

```typescript
// src/components/ProgresoAplicaciones.tsx
interface ProgresoProps {
  titulo: string;
  completado: number;
  total: number;
  color?: string;
  showProcentaje?: boolean;
}

export function ProgresoAplicaciones({ 
  titulo, completado, total, color = "bg-blue-500", showProcentaje = true 
}: ProgresoProps) {
  const porcentaje = (completado / total) * 100;
  
  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        <label className="text-sm font-medium">{titulo}</label>
        {showProcentaje && <span className="text-sm font-bold">{Math.round(porcentaje)}%</span>}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`${color} h-full rounded-full transition-all duration-300`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">{completado} de {total}</p>
    </div>
  );
}

// Uso:
<ProgresoAplicaciones
  titulo="Lotes en Cosecha"
  completado={8}
  total={12}
  color="bg-green-500"
/>
```

### 3. DataTable (Tabla Genérica)

```typescript
// src/components/DataTable.tsx
interface DataTableProps {
  columns: string[];
  rows: (string | number | JSX.Element)[][];
  onRowClick?: (rowIndex: number) => void;
  sortableColumns?: number[]; // indices
}

export function DataTable({ columns, rows, onRowClick, sortableColumns }: DataTableProps) {
  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className={`px-6 py-3 text-left font-semibold text-gray-700 ${
                  sortableColumns?.includes(i) ? "cursor-pointer hover:bg-gray-200" : ""
                }`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="border-b hover:bg-gray-50 cursor-pointer transition"
              onClick={() => onRowClick?.(rowIdx)}
            >
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-6 py-4 text-gray-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Uso:
<DataTable
  columns={["Nombre Cepa", "Tipo", "T° Óptima", "pH Óptimo", "Estado"]}
  rows={cepas.map(c => [c.nombre, c.tipo, `${c.temp}°C`, c.pH, c.estado])}
  onRowClick={idx => navigateToCepa(cepas[idx].id)}
/>
```

### 4. Selector de Lotes/Cepas

```typescript
// src/components/LoteSelector.tsx
"use client";

import { useState, useEffect } from "react";

interface LoteSelectorProps {
  onSelect: (loteId: string) => void;
  filtro?: string;
}

export function LoteSelector({ onSelect, filtro = "En Producción" }: LoteSelectorProps) {
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/lotes-disponibles?estado=${filtro}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setLotes(d.data);
      })
      .finally(() => setLoading(false));
  }, [filtro]);

  if (loading) return <div>Cargando lotes...</div>;

  return (
    <select
      onChange={e => onSelect(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">Seleccionar lote...</option>
      {lotes.map(lote => (
        <option key={lote.id} value={lote.id}>
          {lote.nombre} ({lote.estado})
        </option>
      ))}
    </select>
  );
}
```

## Layouts Comunes

### Dashboard Grid (KPIs)
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard title="Cepas" value={24} color="bg-blue-500" />
  <StatCard title="Lotes" value={8} color="bg-green-500" />
  <StatCard title="Fermentaciones" value={5} color="bg-purple-500" />
  <StatCard title="Pedidos" value={12} color="bg-orange-500" />
</div>
```

### Formulario (2 columnas)
```jsx
<form className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
  <h2 className="text-2xl font-bold mb-6">Nuevo Lote</h2>
  
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium mb-1">Nombre</label>
      <input type="text" className="w-full px-3 py-2 border rounded-lg" />
    </div>
    <div>
      <label className="block text-sm font-medium mb-1">Responsable</label>
      <input type="text" className="w-full px-3 py-2 border rounded-lg" />
    </div>
    {/* más campos */}
  </div>
  
  <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg mt-6">
    Crear Lote
  </button>
</form>
```

### Cards con Glass-Morphism
```jsx
<div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-white">
  <h3 className="text-xl font-bold mb-2">Fermentación Activa</h3>
  <p className="text-sm opacity-90">Cultivo BR-02, Bacillus subtilis</p>
  <div className="mt-4 flex justify-between">
    <div><span className="text-sm opacity-75">Temperatura</span><p className="text-2xl font-bold">28°C</p></div>
    <div><span className="text-sm opacity-75">pH</span><p className="text-2xl font-bold">6.5</p></div>
    <div><span className="text-sm opacity-75">OD</span><p className="text-2xl font-bold">45%</p></div>
  </div>
</div>
```

## Estados y Badges

```typescript
// src/components/StatusBadge.tsx
const statusColors = {
  "Activo": "bg-green-100 text-green-800",
  "En Producción": "bg-blue-100 text-blue-800",
  "Cosecha": "bg-amber-100 text-amber-800",
  "Completado": "bg-green-100 text-green-800",
  "Abortado": "bg-red-100 text-red-800",
  "Inactivo": "bg-gray-100 text-gray-800",
};

export function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] || "bg-gray-100 text-gray-800";
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
      {status}
    </span>
  );
}
```

## Animaciones (Framer Motion)

```typescript
"use client";
import { motion } from "framer-motion";

export function AnimatedCard({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 bg-white rounded-lg shadow-md"
    >
      {children}
    </motion.div>
  );
}
```

## Responsive Breakpoints

```
Mobile (default): < 640px
sm: ≥ 640px   (Tableta pequeña)
md: ≥ 768px   (Tableta)
lg: ≥ 1024px  (Desktop)
xl: ≥ 1280px  (Desktop grande)
2xl: ≥ 1536px (Ultra-wide)
```

**Ejemplo responsive**:
```jsx
<div className="
  grid
  grid-cols-1       /* 1 col en mobile */
  sm:grid-cols-2    /* 2 cols en tablet */
  lg:grid-cols-3    /* 3 cols en desktop */
  gap-4
">
  {/* Cards */}
</div>
```

## Accesibilidad (a11y)

```jsx
// ✓ Labels vinculados
<label htmlFor="cepa-input">Seleccionar Cepa</label>
<select id="cepa-input" aria-label="Cepa microbiológica">
  {/* options */}
</select>

// ✓ Aria-live para actualizaciones dinámicas
<div aria-live="polite" aria-atomic="true">
  {mensaje}
</div>

// ✓ Contrast ratio >= 4.5:1
// ✓ Navegación por teclado soportada
// ✓ Focus visible en botones interactivos
```

## Checklist UI Implementation

- [ ] Responsive en mobile, tablet, desktop
- [ ] Colores cumplen contraste (a11y)
- [ ] Mensajes error/éxito claros y visibles
- [ ] Loading states para async operations
- [ ] Validación de entrada antes submit
- [ ] Usa componentes compartidos (no duplicar código)
- [ ] Glass-morphism si corresponde al diseño
- [ ] TypeScript strict sin errors
- [ ] Performance (no renders innecesarios)

---

**Dominio**: UI/UX Design & Frontend Patterns | **Crítica**: Alta
