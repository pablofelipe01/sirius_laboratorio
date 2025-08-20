# Gestión de Órdenes de Compra - Sistema de Clientes

## 📋 Descripción

El módulo de Gestión de Clientes permite consultar y administrar todas las órdenes de compra del laboratorio. Incluye funcionalidades para:

- ✅ Consultar órdenes pendientes, en proceso, listas y entregadas
- ✅ Filtrar por estado y ordenar por diferentes criterios
- ✅ Actualizar estados de órdenes en tiempo real
- ✅ Crear nuevas órdenes de compra
- ✅ Dashboard con estadísticas rápidas
- ✅ Alertas para órdenes urgentes
- ✅ Seguimiento de fechas de entrega

## 🚀 Funcionalidades Implementadas

### Página Principal (`/clientes`)
- Lista todas las órdenes con filtros avanzados
- Estadísticas en tiempo real (pendientes, en proceso, listas, urgentes)
- Sistema de prioridades visuales (alta, media, baja)
- Indicadores de fechas de entrega (normal, próxima, vencida)
- Botones de acción rápida para cambio de estados
- Diseño responsivo y moderno

### Creación de Órdenes (`/clientes/nueva`)
- Formulario completo para nuevas órdenes
- Gestión dinámica de productos y cantidades
- Validaciones en tiempo real
- Configuración de prioridades
- Campo de observaciones

### Estados de Órdenes
- **Pendiente**: Orden recién creada, esperando procesamiento
- **En Proceso**: Orden siendo preparada en el laboratorio
- **Listo**: Orden completada, lista para entrega
- **Entregado**: Orden entregada al cliente
- **Cancelado**: Orden cancelada (opcional)

## 🛠️ Configuración de Airtable

### Estructura de Tabla Requerida

Crea una tabla en Airtable con el nombre `Órdenes de Compra` y los siguientes campos:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Cliente` | Single line text | Nombre del cliente |
| `Fecha Pedido` | Date | Fecha de creación de la orden |
| `Fecha Entrega` | Date | Fecha acordada de entrega |
| `Estado` | Single select | pendiente, en_proceso, listo, entregado, cancelado |
| `Productos` | Long text | Lista de productos separados por comas |
| `Cantidades` | Long text | Cantidades correspondientes separadas por comas |
| `Observaciones` | Long text | Notas adicionales |
| `Total` | Number | Cantidad total o valor (opcional) |
| `Prioridad` | Single select | alta, media, baja |
| `Creado Por` | Single line text | Usuario que creó la orden |
| `Fecha Creacion` | Date | Timestamp de creación |
| `Actualizado Por` | Single line text | Último usuario que modificó |
| `Fecha Actualizacion` | Date | Timestamp de última modificación |

### Configuración del Código

1. **Obtén tu Table ID de Airtable:**
   - Ve a tu base de Airtable
   - Abre la tabla "Órdenes de Compra"
   - El Table ID aparece en la URL: `tbl...`

2. **Actualiza el código:**
   ```typescript
   // En src/app/api/ordenes-compras/route.ts
   const AIRTABLE_TABLE_ID = 'TU_TABLE_ID_AQUI'; // Reemplaza con tu Table ID real
   ```

3. **Cambia a usar la API real:**
   ```typescript
   // En src/app/clientes/page.tsx, línea ~45
   // Cambia esta línea:
   const response = await fetch(`/api/ordenes-compras-ejemplo?estado=${filtroEstado}&orderBy=${ordenamientoPor}`);
   
   // Por esta:
   const response = await fetch(`/api/ordenes-compras?estado=${filtroEstado}&orderBy=${ordenamientoPor}`);
   ```

4. **Actualiza también la función de actualización:**
   ```typescript
   // En src/app/clientes/page.tsx, línea ~64
   // Cambia:
   const response = await fetch(`/api/ordenes-compras-ejemplo/${ordenId}`, {
   
   // Por:
   const response = await fetch(`/api/ordenes-compras/${ordenId}`, {
   ```

## 📊 Datos de Ejemplo

Mientras configuras Airtable, el sistema usa datos de ejemplo que incluyen:

- Restaurante La Plaza (orden urgente)
- Mercado Orgánico Verde (en proceso)
- Supermercado Central (orden lista)
- Café Gourmet (orden pendiente urgente)
- Distribuidora Los Andes (orden entregada)

## 🎨 Interfaz de Usuario

### Colores por Estado
- **Pendiente**: Amarillo (⏳)
- **En Proceso**: Azul (🔄)
- **Listo**: Verde (✅)
- **Entregado**: Gris (📦)
- **Cancelado**: Rojo (❌)

### Prioridades
- **Alta**: Rojo (🚨)
- **Media**: Amarillo (⚠️)
- **Baja**: Verde (✅)

### Alertas de Fechas
- **Hoy**: Marca "HOY" en rojo
- **2 días o menos**: Icono 🚨 y texto rojo
- **Atrasado**: "X días atrasado" en rojo

## 🔧 Próximas Mejoras

- [ ] Integración con sistema de inventario
- [ ] Notificaciones automáticas por email
- [ ] Reportes y analytics
- [ ] Historial de cambios de estado
- [ ] Integración con sistema de facturación
- [ ] API de webhooks para actualizaciones en tiempo real

## 🚀 Cómo Usar

1. **Acceder al módulo**: Clic en "👥 Clientes" en la navegación
2. **Ver órdenes**: Automáticamente carga las órdenes pendientes
3. **Filtrar**: Usa los dropdowns para filtrar por estado y ordenar
4. **Crear orden**: Clic en "➕ Nueva Orden de Compra"
5. **Actualizar estado**: Usa los botones de acción en cada orden
6. **Monitorear**: Revisa las estadísticas en el dashboard superior

## 🔗 Archivos Importantes

- `src/app/clientes/page.tsx` - Página principal de gestión
- `src/app/clientes/nueva/page.tsx` - Formulario de nueva orden
- `src/app/api/ordenes-compras/route.ts` - API principal
- `src/app/api/ordenes-compras/[id]/route.ts` - API para órdenes específicas
- `src/app/api/ordenes-compras-ejemplo/` - APIs de datos de ejemplo

¡El sistema está listo para usar con datos de ejemplo y fácil de migrar a Airtable cuando esté configurado!
