# Configuración de Airtable para DataLab

## 📋 Configuración Inicial

### 1. Crear Base en Airtable
1. Ve a [Airtable.com](https://airtable.com) y crea una cuenta
2. Crea una nueva Base llamada "DataLab CIR"
3. Crea una tabla llamada "Inoculaciones"

### 2. Estructura de la Tabla "Inoculaciones"

Crear los siguientes campos en Airtable:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Codigo_Lote` | Single line text | Código único generado automáticamente |
| `Cantidad_Bolsas` | Number | Número de bolsas inoculadas |
| `Microorganismo` | Single select | Tipo de hongo/microorganismo |
| `Fecha_Inoculacion` | Date | Fecha de la inoculación |
| `Investigador` | Single line text | Nombre del investigador responsable |
| `Sustrato` | Single select | Tipo de sustrato utilizado |
| `Temperatura` | Number | Temperatura en °C |
| `Humedad` | Number | Humedad relativa en % |
| `Notas` | Long text | Observaciones adicionales |
| `Fecha_Registro` | Date | Timestamp de cuando se creó el registro |
| `Estado` | Single select | Estado del cultivo (Activo, Completado, etc.) |

### 3. Opciones para campos Select

#### Microorganismo (Single select):
- Pleurotus ostreatus
- Pleurotus pulmonarius
- Shiitake (Lentinula edodes)
- Reishi (Ganoderma lucidum)
- Lion's Mane (Hericium erinaceus)
- Oyster King (Pleurotus eryngii)
- Enoki (Flammulina velutipes)
- Maitake (Grifola frondosa)
- Otro

#### Sustrato (Single select):
- Paja de trigo
- Aserrín de roble
- Aserrín de haya
- Bagazo de caña
- Pulpa de café
- Mezcla personalizada
- Otro

#### Estado (Single select):
- Activo
- En Crecimiento
- Cosechado
- Completado
- Descartado

### 4. Obtener Credenciales

#### API Key:
1. Ve a tu perfil en Airtable
2. Selecciona "Personal Access Tokens"
3. Crea un nuevo token con permisos de lectura y escritura
4. Copia el token

#### Base ID:
1. Ve a [airtable.com/api](https://airtable.com/api)
2. Selecciona tu base "DataLab CIR"
3. El Base ID aparece en la URL: `app...`

### 5. Configurar Variables de Entorno

Actualiza el archivo `.env.local`:

```env
# Airtable Configuration
AIRTABLE_API_KEY=pat...tu_token_aqui
AIRTABLE_BASE_ID=app...tu_base_id_aqui
AIRTABLE_TABLE_NAME=Inoculaciones
```

### 6. Verificar Conexión

1. Reinicia el servidor de desarrollo: `npm run dev`
2. Ve a `http://localhost:3000/inoculacion`
3. Completa el formulario de prueba
4. Verifica que el registro aparezca en tu base de Airtable

## 🔧 Estructura de Datos

### Ejemplo de registro enviado:
```json
{
  "bagQuantity": 25,
  "microorganism": "Pleurotus ostreatus",
  "inoculationDate": "2025-01-22",
  "researcher": "Dr. María García",
  "substrate": "Paja de trigo",
  "temperature": 24.5,
  "humidity": 85.0,
  "notes": "Condiciones óptimas, sustrato bien preparado"
}
```

### Respuesta exitosa:
```json
{
  "success": true,
  "message": "Inoculación registrada exitosamente",
  "batchCode": "INO-20250122-A8K9",
  "recordId": "recXXXXXXXXXXXXX"
}
```

## 📊 Funcionalidades

- ✅ Creación automática de registros en Airtable
- ✅ Generación de códigos de lote únicos
- ✅ Validación de datos antes del envío
- ✅ Manejo de errores y mensajes informativos
- ✅ Trazabilidad completa de cada inoculación
- ✅ API GET para consultar registros existentes

## 🚀 Próximas Mejoras

- [ ] Dashboard para visualizar datos de Airtable
- [ ] Búsqueda y filtrado de registros
- [ ] Exportación de reportes
- [ ] Notificaciones por email
- [ ] Integración con otros sistemas del laboratorio
