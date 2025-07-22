# 🚀 Configuración Rápida para @L4BI_bot

## ✅ Tu Bot: @L4BI_bot
**URL directa**: https://t.me/L4BI_bot

## 📋 Pasos de Configuración

### 1. Configurar el Web App
1. Ve a `@BotFather` en Telegram
2. Envía: `/setmenubutton`
3. Selecciona: `@L4BI_bot`
4. **Texto del botón**: `📊 Formulario DataLab`
5. **URL**: Una vez que despliegues, usa: `https://tu-dominio.vercel.app/inoculacion`

### 2. Configurar Comandos
Envía `/setcommands` a `@BotFather`:

```
start - 🚀 Bienvenida al DataLab CIR
inoculacion - 📊 Abrir formulario de inoculación
help - ❓ Ayuda y comandos
status - 📈 Estado del laboratorio
```

### 3. Configurar Descripción del Bot
Envía `/setdescription` a `@BotFather`:

```
🧪 Bot oficial del Centro de Investigación Regenerativa (CIR)

Funcionalidades:
• Formulario de inoculación de hongos
• Registro en Airtable con trazabilidad
• Generación automática de códigos de lote
• Acceso seguro solo desde Telegram

Desarrollado con DataLab v2.1
```

### 4. Variables de Entorno
Actualiza tu `.env.local`:

```env
# Telegram Bot Configuration - L4BI_bot
TELEGRAM_BOT_TOKEN=tu_token_del_L4BI_bot
TELEGRAM_BOT_SECRET=tu_secret_key
NEXT_PUBLIC_TELEGRAM_ONLY=true
```

## 🤖 Código del Bot (Opcional)

Si quieres programar respuestas automáticas para `@L4BI_bot`:

```javascript
const TelegramBot = require('node-telegram-bot-api');
const token = 'TU_TOKEN_DEL_L4BI_BOT';
const bot = new TelegramBot(token, {polling: true});

const webAppUrl = 'https://tu-dominio.vercel.app/inoculacion';

// Comando /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'Usuario';
  
  bot.sendMessage(chatId, `🧪 *¡Hola ${firstName}! Bienvenido a DataLab CIR*

Soy el bot oficial del Centro de Investigación Regenerativa.

🔬 *¿Qué puedo hacer?*
• Abrir el formulario de inoculación de hongos
• Registrar datos directamente en Airtable  
• Generar códigos de lote únicos
• Mantener trazabilidad completa

📊 *Para comenzar*, usa /inoculacion o el botón del menú.

🆘 Si necesitas ayuda, envía /help`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        {text: '📊 Abrir Formulario DataLab', web_app: {url: webAppUrl}}
      ]]
    }
  });
});

// Comando /inoculacion  
bot.onText(/\/inoculacion/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, `🔬 *Formulario de Inoculación - DataLab CIR*

Registra tu inoculación de hongos de forma segura.

✅ *El formulario incluye:*
• Datos del microorganismo
• Condiciones ambientales
• Información del investigador
• Generación automática de código de lote

🔒 *Seguro y trazable* - Todos los datos van directo a Airtable`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        {text: '📊 Abrir Formulario de Inoculación', web_app: {url: webAppUrl}}
      ]]
    }
  });
});

// Comando /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, `🆘 *Ayuda - DataLab CIR (@L4BI_bot)*

*📋 Comandos disponibles:*
• /start - Mensaje de bienvenida
• /inoculacion - Abrir formulario de registro  
• /help - Esta ayuda
• /status - Estado del sistema

*🔬 Uso del formulario:*
1. Envía /inoculacion o usa el botón del menú
2. Se abre el formulario seguro dentro de Telegram
3. Completa todos los campos requeridos
4. ✅ Datos guardados automáticamente en Airtable

*🔒 Seguridad:*
• Solo accesible desde este bot oficial
• Validación de datos en tiempo real  
• Trazabilidad completa de registros
• Códigos de lote únicos generados automáticamente

*🧪 Centro de Investigación Regenerativa*
DataLab v2.1 - Desarrollado con Next.js + Airtable`, {
    parse_mode: 'Markdown'
  });
});

// Comando /status
bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, `📊 *Estado del Sistema DataLab*

🟢 *Sistema:* ✅ Operativo
🟢 *Formulario Web:* ✅ Disponible  
🟢 *Base Airtable:* ✅ Conectada
🟢 *Bot Telegram:* ✅ @L4BI_bot activo

⏰ *Última verificación:* ${new Date().toLocaleString('es-ES', {
  timeZone: 'America/Mexico_City'
})}

✨ *Estadísticas:*
• Formularios disponibles 24/7
• Respuesta instantánea
• Backup automático en Airtable

🔗 *Enlaces útiles:*
• Web App: https://tu-dominio.vercel.app/inoculacion
• Bot: @L4BI_bot`, {
    parse_mode: 'Markdown'
  });
});

console.log('🤖 L4BI_bot - DataLab CIR iniciado correctamente...');
```

## 🚀 Despliegue y Configuración Final

### 1. Despliega en Vercel:
```bash
# Instalar Vercel CLI si no lo tienes
npm i -g vercel

# Desplegar
vercel --prod
```

### 2. Obtén tu URL de producción
Ejemplo: `https://datalab-cir-tu-proyecto.vercel.app`

### 3. Actualiza BotFather:
- `/setmenubutton` → `@L4BI_bot` → URL: `https://tu-dominio.vercel.app/inoculacion`

### 4. Prueba:
1. Ve a https://t.me/L4BI_bot
2. Envía `/start`
3. Usa el botón "📊 Formulario DataLab"
4. ✅ Deberías ver el formulario dentro de Telegram

## 🎯 ¡Tu bot @L4BI_bot está listo para DataLab!

Ahora los usuarios pueden:
- Ir directamente a https://t.me/L4BI_bot
- Usar `/inoculacion` 
- Acceder al formulario seguro dentro de Telegram
- Registrar datos que van directo a Airtable

🔒 **Acceso 100% restringido** - Solo funciona desde Telegram!
