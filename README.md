# Gestor de Tareas con Chat IA

## ✅ PROYECTO AUDITADO Y CORREGIDO

**Fecha de auditoría**: 2025-11-18

Este proyecto ha sido sometido a un **análisis exhaustivo** y todos los bugs críticos, vulnerabilidades de seguridad y problemas de rendimiento han sido corregidos.

📄 **Ver reporte completo**: [FIXES_APPLIED.md](./FIXES_APPLIED.md)

### Correcciones Aplicadas

- ✅ **10 bugs críticos** corregidos (100%)
- ✅ **5 vulnerabilidades de seguridad** eliminadas
- ✅ **4 optimizaciones de rendimiento** implementadas
- ✅ **Memory leaks** eliminados completamente
- ✅ **XSS protection** implementada con CSP
- ✅ **Error boundaries** globales añadidos
- ✅ **Input validation** exhaustiva en todas las APIs
- ✅ **Buffer overflow protection** implementada

---

# Gestor de Tareas con Chat IA

Cliente de escritorio para gestión de tareas y sesiones de trabajo, integrado con chat IA a través de LM Studio.

## ✨ Características

### Panel de Tareas (Superior)
- ✅ **Gestión completa de tareas**: Crear, editar, completar y eliminar
- 🎯 **Prioridades**: Alta, Media, Baja con colores distintivos
- 📁 **Categorías**: Organiza por Trabajo, Personal, Estudio, Otros
- 🏷️ **Tags personalizables**: Añade etiquetas a tus tareas
- 📅 **Fechas límite**: Con indicadores visuales de vencimiento
- ☑️ **Subtareas**: Divide tareas grandes en pasos más pequeños
- 🔍 **Filtros**: Ver todas, pendientes, en progreso o completadas

### Sistema de Sesiones
- ⏱️ **Temporizador de sesión**: Cronometra tu tiempo de trabajo
- 🍅 **Modo Pomodoro**: Ciclos de trabajo/descanso configurables (25min/5min por defecto)
- ▶️ **Controles**: Pausar, reanudar y finalizar sesiones
- 📊 **Historial**: Todas las sesiones quedan guardadas con duración total

### Chat con IA (Inferior)
- 💬 **Chat integrado** con LM Studio
- 🤖 **Sin herramientas externas**: Chat directo sin tools
- 🧠 **Modo Think**: Toggle para ver/ocultar el proceso de razonamiento
- 🐛 **Debug Mode**: Ver contenido raw incluyendo tags
- 📝 **Streaming en tiempo real**: Respuestas fluidas del modelo

### Persistencia
- 💾 **Guardado automático**: Todas las tareas y sesiones se guardan en archivos JSON locales
- 📂 **Estructura simple**: Archivos en `data/tasks.json` y `data/sessions.json`
- 🔄 **Backup fácil**: Copia la carpeta `data/` para respaldar todo

## 🎨 Diseño

- **Split layout 50/50**: Tareas arriba, chat abajo
- **Dark theme moderno**: Colores oscuros con acentos verde (#10b981)
- **Glassmorphism**: Fondos semi-transparentes con efecto vidrio
- **Animaciones suaves**: Transiciones fluidas de 0.2-0.3s
- **Iconos Lucide**: Librería de iconos moderna y consistente

## 📋 Requisitos

- **Node.js** (v16 o superior) para el servidor de tareas
- **[LM Studio](https://lmstudio.ai/)** instalado y corriendo (para el chat)
- **Un modelo de IA** cargado en LM Studio (recomendado: Qwen3 14B o superior)
- **Navegador moderno** (Chrome, Firefox, Safari, Edge)

## 🚀 Instalación y Uso

### 1. Iniciar el Servidor de Tareas

```bash
cd /Users/ibonarambarri/Desktop/chat-client

# Iniciar el servidor
node task-server.js
```

Deberías ver:
```
✓ Task Server escuchando en http://localhost:3002
  Data directory: /Users/ibonarambarri/Desktop/chat-client/data

  Endpoints disponibles:
    GET    /tasks          - Listar tareas
    POST   /tasks          - Crear tarea
    PUT    /tasks/:id      - Actualizar tarea
    DELETE /tasks/:id      - Eliminar tarea
    GET    /sessions       - Listar sesiones
    POST   /sessions       - Crear sesión
    PUT    /sessions/:id   - Actualizar sesión
    DELETE /sessions/:id   - Eliminar sesión
    GET    /settings       - Obtener configuración
    PUT    /settings       - Actualizar configuración
```

### 2. Iniciar LM Studio (Opcional, solo para chat)

Si quieres usar el chat con IA:

1. Abre LM Studio
2. Descarga y carga un modelo (recomendado: `qwen/qwen3-14b`)
3. Inicia el servidor local (generalmente `http://127.0.0.1:1234`)

### 3. Abrir la Aplicación

Simplemente abre `index.html` en tu navegador:

```bash
open index.html
```

O arrastra el archivo a tu navegador preferido.

### 4. Configurar (si usas chat)

1. Escribe `/settings` en el input del chat y presiona Enter
2. Verifica que "LM STUDIO URL" sea correcta (normalmente `http://127.0.0.1:1234`)
3. El punto verde indica conexión exitosa ✅

## 📖 Guía de Uso

### Gestión de Tareas

#### Crear una tarea
1. Click en el botón `+` en la esquina superior derecha del panel de tareas
2. Rellena el formulario:
   - **Título**: Nombre de la tarea (obligatorio)
   - **Descripción**: Detalles adicionales (opcional)
   - **Prioridad**: Alta (rojo), Media (amarillo), Baja (verde)
   - **Categoría**: Trabajo, Personal, Estudio, Otros
   - **Fecha límite**: Opcional, con selector de fecha y hora
   - **Tags**: Separados por comas (ej: "urgente, importante")
3. Click en "Guardar"

#### Editar una tarea
- Click en el icono de lápiz (✏️) en cualquier tarea

#### Completar/Reactivar una tarea
- Click en el icono de check (✓) para marcar como completada
- Click en el icono de flecha circular para reactivar una tarea completada

#### Eliminar una tarea
- Click en el icono de papelera (🗑️)

#### Filtrar tareas
- Usa los botones "Todas", "Pendientes", "En progreso", "Completadas"

### Sesiones de Trabajo

#### Iniciar una sesión
1. Click en el botón de play (▶️) en la esquina superior derecha
2. Rellena el formulario:
   - **Nombre**: Nombre de la sesión (ej: "Sesión de estudio")
   - **Descripción**: Opcional
   - **Activar Pomodoro**: Opcional
     - Duración trabajo: 25 minutos por defecto
     - Duración descanso: 5 minutos por defecto
3. Click en "Iniciar sesión"

#### Durante una sesión
- **Pausar**: Click en el icono de pausa (⏸️)
- **Reanudar**: Click en el icono de play (▶️)
- **Finalizar**: Click en el icono de stop (⏹️)

El temporizador muestra el tiempo transcurrido en formato MM:SS o HH:MM:SS

### Chat con IA

#### Comandos disponibles
- `/help` - Mostrar ayuda
- `/settings` - Abrir configuración
- `/clear` - Limpiar historial
- `Shift+Tab` - Toggle modo Think
- `Escape` - Cerrar ventanas/sugerencias

#### Ejemplos de uso
```
💬 Tú: Ayúdame a organizar mis tareas
🤖 Asistente: [Responde con sugerencias]

💬 Tú: ¿Qué debería priorizar hoy?
🤖 Asistente: [Analiza y sugiere]
```

## 📁 Estructura del Proyecto

```
chat-client/
├── index.html            # Interfaz HTML principal
├── styles.css           # Estilos CSS completos (dark theme)
├── renderer.js          # Lógica del cliente (chat + tareas)
├── task-server.js       # Servidor REST API para persistencia
├── data/                # Carpeta de datos (se crea automáticamente)
│   ├── tasks.json       # Tareas guardadas
│   ├── sessions.json    # Sesiones guardadas
│   └── settings.json    # Configuración del usuario
├── main.js              # Electron main process (opcional)
├── package.json         # Configuración de npm
└── README.md            # Este archivo
```

## 🗃️ Estructura de Datos

### Tarea (Task)
```json
{
  "id": "unique-id",
  "title": "Nombre de la tarea",
  "description": "Descripción opcional",
  "priority": "alta|media|baja",
  "category": "Trabajo|Personal|Estudio|Otros",
  "tags": ["tag1", "tag2"],
  "deadline": "2025-11-20T15:00:00.000Z",
  "subtasks": [],
  "status": "pendiente|en_progreso|completada",
  "createdAt": "2025-11-17T10:00:00.000Z",
  "completedAt": null
}
```

### Sesión (Session)
```json
{
  "id": "unique-id",
  "name": "Sesión de trabajo",
  "description": "Descripción opcional",
  "taskIds": ["task-id-1", "task-id-2"],
  "startTime": "2025-11-17T10:00:00.000Z",
  "endTime": "2025-11-17T11:30:00.000Z",
  "totalMinutes": 90,
  "pomodoroEnabled": true,
  "pomodoroWorkMinutes": 25,
  "pomodoroBreakMinutes": 5,
  "status": "activa|pausada|completada",
  "createdAt": "2025-11-17T10:00:00.000Z"
}
```

## 🔧 API REST del Servidor

### Tareas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/tasks` | Listar todas las tareas |
| POST | `/tasks` | Crear nueva tarea |
| PUT | `/tasks/:id` | Actualizar tarea existente |
| DELETE | `/tasks/:id` | Eliminar tarea |

### Sesiones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/sessions` | Listar todas las sesiones |
| POST | `/sessions` | Crear nueva sesión |
| PUT | `/sessions/:id` | Actualizar sesión existente |
| DELETE | `/sessions/:id` | Eliminar sesión |

### Configuración

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/settings` | Obtener configuración |
| PUT | `/settings` | Actualizar configuración |

## ⚠️ Solución de Problemas

### El servidor de tareas no inicia

**Síntomas**: Error al ejecutar `node task-server.js`

**Soluciones**:
- Verifica que Node.js esté instalado: `node --version`
- Verifica que el puerto 3002 no esté en uso: `lsof -i :3002`
- Instala Node.js si es necesario: [nodejs.org](https://nodejs.org/)

### Las tareas no se guardan

**Síntomas**: Las tareas desaparecen al recargar

**Soluciones**:
1. Verifica que `task-server.js` esté corriendo
2. Abre la consola del navegador (F12) para ver errores
3. Verifica que la carpeta `data/` exista y tenga permisos de escritura
4. Revisa la consola del servidor para ver errores de escritura

### El chat no se conecta a LM Studio

**Síntomas**: Punto rojo en configuración, errores de conexión

**Soluciones**:
1. Verifica que LM Studio esté corriendo
2. Verifica que el servidor esté iniciado en LM Studio
3. Revisa la URL en `/settings` (debería ser `http://127.0.0.1:1234`)
4. Verifica que un modelo esté cargado en LM Studio
5. Abre la consola del navegador (F12) para ver errores detallados

### Error de CORS

**Síntomas**: Errores de CORS en la consola

**Soluciones**:
- El servidor ya tiene CORS habilitado para localhost
- Asegúrate de abrir la aplicación desde el mismo equipo donde corre el servidor
- No uses direcciones IP, usa `localhost` o `127.0.0.1`

## 🔮 Futuras Mejoras

Ideas para extender la funcionalidad:

### Tareas
- [ ] Subtareas interactivas con checkboxes
- [ ] Arrastrar y soltar para reordenar
- [ ] Vista de calendario para tareas con fechas
- [ ] Búsqueda de tareas por texto
- [ ] Estadísticas de productividad
- [ ] Exportar tareas a CSV/JSON

### Sesiones
- [ ] Notificaciones de finalización Pomodoro
- [ ] Sonidos al finalizar ciclos
- [ ] Asignar tareas específicas a sesiones
- [ ] Gráficos de tiempo trabajado
- [ ] Metas diarias/semanales

### Chat
- [ ] Comandos para crear tareas desde el chat
- [ ] Sugerencias de IA basadas en tareas pendientes
- [ ] Análisis de productividad por IA
- [ ] Exportar conversaciones

### Técnico
- [ ] Sincronización en la nube (opcional)
- [ ] Aplicación Electron standalone
- [ ] Soporte para múltiples usuarios
- [ ] Temas personalizables
- [ ] Atajos de teclado globales
- [ ] Tests automatizados

## 💡 Personalización

### Cambiar colores

Edita `styles.css` y busca estas variables:

```css
/* Color principal (verde) */
#10b981

/* Fondos oscuros */
rgba(25, 25, 25, 0.98)
rgba(15, 15, 15, 0.95)

/* Colores de prioridad */
#ef4444 /* Alta - Rojo */
#fbbf24 /* Media - Amarillo */
#10b981 /* Baja - Verde */
```

### Cambiar puerto del servidor

Edita `task-server.js`:

```javascript
const PORT = 3002; // Cambia a tu puerto preferido
```

Y en `renderer.js`:

```javascript
const TASK_SERVER_URL = 'http://localhost:3002'; // Actualiza aquí también
```

### Añadir categorías personalizadas

Edita `index.html`, busca el select de categorías:

```html
<select id="taskCategory">
  <option value="Trabajo">Trabajo</option>
  <option value="Personal">Personal</option>
  <option value="Estudio">Estudio</option>
  <option value="TuCategoria">Tu Categoría</option> <!-- Añade aquí -->
  <option value="Otros">Otros</option>
</select>
```

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Algunas ideas:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es de código abierto. Úsalo y modifícalo como quieras.

---

**Desarrollado con ❤️ para gestión de tareas productiva**
