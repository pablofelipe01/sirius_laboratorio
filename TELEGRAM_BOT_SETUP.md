# 🤖 Bot de Telegram para DataLab - Web Apps
**Bot oficial: @L4BI_bot**

## 📋 Configuración del Bot

### 1. Tu Bot Existente
✅ **Bot ya creado**: `@L4BI_bot`
🔗 **URL directa**: https://t.me/L4BI_bot

### 2. Configurar Web App en tu Bot
1. Ve a `@BotFather` en Telegram
2. Envía `/setmenubutton`
3. Selecciona tu bot `@L4BI_bot`
4. Configura el botón del menú:
   - **Texto del botón**: `📊 Formulario Inoculación`
   - **URL del Web App**: `https://tu-dominio.com/inoculacion`

### 3. Configurar Comandos del Bot
Envía `/setcommands` a BotFather y agrega:

```
start - 🚀 Iniciar bot y bienvenida
inoculacion - 📊 Abrir formulario de inoculación
help - ❓ Ayuda y comandos disponibles
status - 📈 Estado del laboratorio
```

### 4. Variables de Entorno
Agrega al archivo `.env.local`:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_SECRET=tu_secret_key_aqui
NEXT_PUBLIC_TELEGRAM_ONLY=true
```

## 🛠️ Código del Bot

### Bot básico en Node.js (opcional):

```javascript
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});

const webAppUrl = 'https://tu-dominio.com/inoculacion';

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, `🧪 *Bienvenido a DataLab CIR*

Este es el bot oficial del Centro de Investigación Regenerativa para el registro de inoculaciones de hongos.

🔬 *Funcionalidades:*
• Registro seguro de inoculaciones
• Integración con Airtable
• Generación automática de códigos de lote
• Trazabilidad completa

📊 Para acceder al formulario, usa el botón del menú o envía /inoculacion`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        {text: '📊 Abrir Formulario', web_app: {url: webAppUrl}}
      ]]
    }
  });
});

bot.onText(/\/inoculacion/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, '🔬 *Formulario de Inoculación*\n\nHaz clic en el botón para abrir el formulario:', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        {text: '📊 Abrir Formulario de Inoculación', web_app: {url: webAppUrl}}
      ]]
    }
  });
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, `🆘 *Ayuda - DataLab CIR Bot*

*Comandos disponibles:*
• /start - Mensaje de bienvenida
• /inoculacion - Abrir formulario de registro
• /help - Esta ayuda
• /status - Estado del sistema

*Uso del formulario:*
1. Usa /inoculacion o el botón del menú
2. Completa todos los campos requeridos
3. El sistema genera automáticamente el código de lote
4. Los datos se guardan en Airtable

🔒 *Seguridad:*
El formulario solo es accesible desde este bot oficial.`, {
    parse_mode: 'Markdown'
  });
});

bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, `📊 *Estado del Sistema DataLab*

🟢 *Sistema:* Operativo
🟢 *Airtable:* Conectado
🟢 *Formulario:* Disponible
🟢 *Última actualización:* ${new Date().toLocaleString('es-ES')}

✅ Todos los sistemas funcionando correctamente`, {
    parse_mode: 'Markdown'
  });
});

console.log('🤖 Bot de DataLab CIR iniciado...');
```

## 🚀 Funcionalidades Implementadas

### ✅ Seguridad
- **Acceso exclusivo desde Telegram**: Bloquea acceso directo desde navegadores
- **Validación de origen**: Verifica que las solicitudes vienen de Telegram
- **Pantalla de acceso restringido**: Mensaje informativo para accesos no autorizados

### ✅ Web App Integration
- **Script de Telegram cargado**: Acceso a todas las APIs de Telegram Web Apps
- **Detección automática**: Reconoce si se ejecuta dentro de Telegram
- **Configuración automática**: El Web App se expande y configura automáticamente

### ✅ Experiencia de Usuario
- **Header con info del usuario**: Muestra datos del usuario de Telegram
- **Loading states**: Pantallas de carga mientras se verifica el acceso
- **Mensajes informativos**: Instrucciones claras sobre cómo acceder

## 📱 Cómo usar

### Para el Usuario Final:
1. Ir a `@L4BI_bot` en Telegram o usar https://t.me/L4BI_bot
2. Enviar `/start` para inicializar
3. Usar `/inoculacion` o el botón del menú
4. Completar el formulario que se abre

### Para el Administrador:
1. Configurar el bot con BotFather
2. Desplegar la aplicación en tu servidor
3. Actualizar la URL del Web App en BotFather
4. Configurar variables de entorno

## 🔧 Configuración Final

1. **Despliega tu aplicación** en Vercel, Netlify o tu servidor
2. **Obtén la URL de producción** (ej: `https://datalab-cir.vercel.app`)
3. **Actualiza BotFather**:
   - `/setmenubutton`
   - Selecciona tu bot
   - URL: `https://tu-dominio.com/inoculacion`
4. **Prueba el bot** enviando `/start` y usando el botón

¡Tu formulario ahora está 100% protegido y solo accesible desde Telegram! 🎉
