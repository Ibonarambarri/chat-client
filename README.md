# LM Studio Chat Client

Cliente de escritorio con interfaz flotante para interactuar con la API de LM Studio.

## Características

- **Interfaz flotante** en la esquina inferior derecha de tu pantalla
- **Hotkey global**: `Option + Espacio` para mostrar/ocultar
- **Siempre visible** (always on top)
- **Chat con historial** completo
- **Configuración personalizable**: URL de API, temperatura, etc.
- **Indicador de estado** de conexión con la API
- **Diseño moderno** con gradientes y efectos de vidrio

## Requisitos

- **Node.js** (v16 o superior)
- **macOS** (el hotkey Option+Space es específico de Mac)
- **API de FastAPI** corriendo (del servidor que creaste antes)

## Instalación

```bash
cd chat-client

# Instalar dependencias
npm install
```

## Uso

### Iniciar la aplicación

```bash
npm start
```

### Primera configuración

1. La ventana aparecerá en la esquina inferior derecha
2. Haz clic en el icono **⚙️** (configuración)
3. Configura la **URL de tu API**:
   - Localhost: `http://localhost:8443`
   - Tailscale: `https://tu-maquina.tail-scale.ts.net`
4. Ajusta la temperatura si lo deseas (default: 0.7)
5. Haz clic en **Guardar**

### Usar el chat

1. Escribe tu mensaje en el campo de texto
2. Presiona **Enter** para enviar (Shift+Enter para nueva línea)
3. El historial de conversación se mantiene durante la sesión

### Atajos de teclado

- **Option + Espacio**: Mostrar/ocultar ventana
- **Enter**: Enviar mensaje
- **Shift + Enter**: Nueva línea en el mensaje

## Estructura del proyecto

```
chat-client/
├── main.js           # Proceso principal de Electron
├── preload.js        # Script de preload (seguridad)
├── index.html        # Interfaz HTML
├── styles.css        # Estilos de la interfaz
├── renderer.js       # Lógica del cliente y conexión con API
├── package.json      # Configuración de npm
└── README.md         # Este archivo
```

## Configuración avanzada

### Cambiar la posición de la ventana

Edita `main.js` líneas 13-14:

```javascript
// Para cambiar la posición, modifica estos valores:
x: width - windowWidth - margin,  // Posición X
y: height - windowHeight - margin, // Posición Y
```

Ejemplos:
- **Inferior izquierda**: `x: margin, y: height - windowHeight - margin`
- **Superior derecha**: `x: width - windowWidth - margin, y: margin`
- **Centro**: `x: (width - windowWidth) / 2, y: (height - windowHeight) / 2`

### Cambiar el tamaño de la ventana

Edita `main.js` líneas 10-11:

```javascript
const windowWidth = 400;   // Ancho en píxeles
const windowHeight = 600;  // Alto en píxeles
```

### Cambiar el hotkey

Edita `main.js` línea 44:

```javascript
// Cambiar 'Alt+Space' por otro atajo:
globalShortcut.register('Alt+Space', () => {
  // ...
});
```

Opciones:
- `'CommandOrControl+Shift+Space'` - Cmd+Shift+Espacio
- `'Alt+C'` - Option+C
- `'CommandOrControl+K'` - Cmd+K

Ver más opciones en: [Electron Accelerators](https://www.electronjs.org/docs/latest/api/accelerator)

### Ocultar al perder foco

Si quieres que la ventana se oculte cuando haces clic fuera de ella, descomenta la línea 32 en `main.js`:

```javascript
chatWindow.on('blur', () => {
  toggleWindow();  // Descomentar esta línea
});
```

## Construir aplicación nativa

Para crear un .app de macOS:

```bash
npm run build
```

Esto generará una aplicación en `dist/` que puedes arrastrar a tu carpeta de Aplicaciones.

## Troubleshooting

### Error: "Cannot find module 'electron'"

```bash
rm -rf node_modules package-lock.json
npm install
```

### La ventana no aparece

1. Verifica que Electron se instaló correctamente
2. Revisa la consola para errores
3. Asegúrate de que no hay otro proceso usando Electron

### El hotkey no funciona

1. Verifica que no haya conflictos con otros atajos del sistema
2. Intenta con otro atajo en `main.js`
3. Ejecuta la app con permisos de accesibilidad:
   - **System Settings → Privacy & Security → Accessibility**
   - Añade la aplicación Terminal o Electron

### No se conecta a la API

1. Verifica que la API esté corriendo
2. Revisa la URL en configuración (⚙️)
3. Para Tailscale Funnel, usa `https://` no `http://`
4. Para localhost, usa `http://localhost:8443`
5. Verifica el indicador de estado (verde = conectado, rojo = desconectado)

### Error de CORS

Si ves errores de CORS en la consola, asegúrate de que tu API FastAPI tiene el middleware CORS configurado (ya lo tiene en el código del servidor).

## Características futuras

Posibles mejoras que puedes implementar:

- [ ] Modo oscuro/claro
- [ ] Múltiples conversaciones guardadas
- [ ] Exportar chat a texto/markdown
- [ ] Notificaciones del sistema
- [ ] Auto-actualización
- [ ] Soporte para imágenes
- [ ] Comandos slash (/help, /clear, etc.)
- [ ] Temas personalizables
- [ ] Atajos de teclado adicionales
- [ ] Streaming de respuestas

## Desarrollo

Para desarrollar con hot-reload:

```bash
# Instalar nodemon globalmente
npm install -g nodemon

# Ejecutar con auto-restart
nodemon --exec npm start
```

## Licencia

MIT
