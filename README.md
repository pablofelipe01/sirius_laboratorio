# DataLab - Sirius Regenerative Solutions S.A.S ZOMAC

## 🔬 Sistema Integral de Laboratorio con IA

**DataLab** es una aplicación avanzada desarrollada por **Sirius Regenerative Solutions S.A.S ZOMAC** para la gestión integral de todos los procesos de producción de laboratorio, implementando tecnologías de Inteligencia Artificial y herramientas de análisis avanzadas.

---
---

## ⚖️ **AVISO DE PROPIEDAD INTELECTUAL**

### **© 2025 Sirius Regenerative Solutions S.A.S ZOMAC - Todos los Derechos Reservados**

**🚨 IMPORTANTE: USO RESTRINGIDO Y AUTORIZADO ÚNICAMENTE**

Este software y toda su documentación asociada son **propiedad exclusiva** de **Sirius Regenerative Solutions S.A.S ZOMAC**. El uso, reproducción, distribución, modificación o cualquier otra forma de utilización de este software está **ESTRICTAMENTE PROHIBIDO** sin autorización previa y por escrito de la empresa.

### **Términos de Propiedad:**

- **Propietario:** Sirius Regenerative Solutions S.A.S ZOMAC
- **Desarrolladores:** Hermes David Hernandez Garcia, Pablo Felipe Acevedo
- **Licencia:** Propietaria - Uso Restringido
- **Contacto Legal:** [adm@siriusregenerative.com]

### **Restricciones de Uso:**

❌ **PROHIBIDO:**
- Uso no autorizado del software
- Copia o reproducción del código fuente
- Distribución a terceros
- Ingeniería inversa
- Modificación sin autorización
- Uso comercial no autorizado

✅ **AUTORIZADO ÚNICAMENTE:**
- Personal autorizado de Sirius Regenerative Solutions S.A.S ZOMAC
- Uso interno de la empresa bajo supervisión
- Acceso a través del bot de Telegram LABI

### **Violación de Derechos:**

Cualquier uso no autorizado de este software constituye una **violación de los derechos de propiedad intelectual** y será perseguido con el **máximo rigor de la ley**, incluyendo pero no limitado a:

- Acciones civiles por daños y perjuicios
- Medidas cautelares y de cese inmediato
- Acciones penales por violación de derechos de autor
- Reclamación de beneficios indebidamente obtenidos

---

## 🏭 **Acerca de DataLab**

### **Propósito**
DataLab es un sistema completo de gestión de laboratorio que integra:

- **🤖 Inteligencia Artificial** para análisis predictivo
- **📊 Analytics Avanzados** para optimización de procesos
- **🔬 Gestión de Inoculaciones** y procedimientos de laboratorio
- **📱 Interfaz Telegram** para acceso seguro y móvil
- **🛡️ Seguridad Empresarial** con autenticación robusta

### **Características Principales**

- ✅ **Gestión de Inoculaciones:** Registro y seguimiento de procesos de laboratorio
- ✅ **Integración Airtable:** Base de datos centralizada y sincronizada
- ✅ **Bot Telegram LABI:** Acceso seguro y controlado
- ✅ **Validación Avanzada:** Esquemas Zod para integridad de datos
- ✅ **Headers de Seguridad:** Protección contra ataques web
- ✅ **Middleware de Autenticación:** Control de acceso por User-Agent
- ✅ **Logging de Seguridad:** Monitoreo de accesos no autorizados

### **Tecnologías Implementadas**

- **Frontend:** Next.js 15.4.2, React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Next.js API Routes
- **Base de Datos:** Airtable con 17+ tablas especializadas
- **Validación:** Zod schemas con TypeScript
- **Seguridad:** Middleware personalizado, HMAC SHA-256
- **Integración:** Telegram WebApp API
- **IA/ML:** Herramientas de análisis y predicción

---

## 🛡️ **Arquitectura de Seguridad**

### **Capas de Protección**

1. **Middleware de Autenticación**
   - Verificación de User-Agent de Telegram
   - Bloqueo automático de accesos no autorizados
   - Headers de seguridad HTTP

2. **Validación de Datos**
   - Esquemas Zod para todas las entradas
   - Sanitización automática de inputs
   - Límites de tamaño y formato

3. **Encriptación y Hashing**
   - HMAC SHA-256 para validación Telegram
   - Variables de entorno protegidas
   - Tokens seguros para APIs

4. **Monitoreo y Logging**
   - Registro de intentos de acceso
   - Alertas de seguridad automáticas
   - Auditoría de operaciones críticas

---

## � **Instalación y Configuración** (Solo Personal Autorizado)

### **Prerrequisitos**

```bash
Node.js >= 18.0.0
npm >= 9.0.0
Acceso autorizado a variables de entorno
```

### **Variables de Entorno Requeridas**

```env
AIRTABLE_API_KEY=patXXXXXXXXXXXXXX.XXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
TELEGRAM_BOT_TOKEN=XXXXXXXXX:XXXXXXXXXXXXXXX
NEXT_PUBLIC_TELEGRAM_BOT_NAME=LABI
```

### **Comandos de Desarrollo**

```bash
# Solo para personal autorizado
npm install          # Instalar dependencias
npm run dev         # Entorno de desarrollo
npm run build       # Build de producción
npm run start       # Servidor de producción
```
## ⚠️ **Descargo de Responsabilidad**

Este software es proporcionado "tal como está" sin garantías de ningún tipo. **Sirius Regenerative Solutions S.A.S ZOMAC** no se hace responsable por el uso indebido, no autorizado o cualquier daño resultante del uso inapropiado de este software.

El acceso y uso de este sistema implica la aceptación total de estos términos y condiciones de propiedad intelectual.

---

**© 2025 Sirius Regenerative Solutions S.A.S ZOMAC**  
**Todos los Derechos Reservados | All Rights Reserved**  
**Prohibida su reproducción total o parcial sin autorización escrita**
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
└── components/
    ├── Navbar.tsx
    ├── Hero.tsx
    ├── Services.tsx
    ├── Contact.tsx
    └── Footer.tsx
```

## 🎯 Funcionalidades Principales

### Navbar
- Navegación responsiva con menú hamburguesa en móvil
- Efecto de transparencia que cambia al hacer scroll
- Enlaces de navegación suave a secciones
- Botón CTA destacado

### Hero Section
- Video de fondo desde Cloudinary
- Overlay con gradiente para mejor legibilidad
- Call-to-action buttons
- Estadísticas destacadas

### Services
- Grid responsivo de servicios
- Iconografía SVG personalizada
- Hover effects y animaciones
- Sección CTA integrada

### Contact
- Formulario de contacto funcional
- Información de contacto destacada
- Diseño responsivo
- Validación de campos

### Footer
- Links organizados por categorías
- Newsletter subscription
- Enlaces sociales
- Información de copyright

## 🚀 Deploy

Para construir la aplicación para producción:

```bash
npm run build
npm start
```

## 📧 Contacto

Para soporte o consultas sobre el proyecto DataLab, contacta al equipo de desarrollo.
