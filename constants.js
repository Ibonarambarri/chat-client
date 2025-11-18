// Constants para toda la aplicación

// Configuración de API
export const API_CONFIG = {
  DEFAULT_URL: 'http://localhost:1234',
  DEFAULT_TEMPERATURE: 0.7,
  REQUEST_TIMEOUT_MS: 30000,  // 30 segundos
  MAX_MESSAGE_LENGTH: 2000,
  MIN_MESSAGE_LENGTH: 3
};

// Configuración de Queue
export const QUEUE_CONFIG = {
  COUNTDOWN_DURATION_MS: 500,
  INTERVAL_DURATION_MS: 50
};

// Configuración de Streaming
export const STREAM_CONFIG = {
  MAX_BUFFER_SIZE: 10 * 1024 * 1024,  // 10 MB
  MAX_RESPONSE_SIZE: 50 * 1024 * 1024,  // 50 MB
  MAX_THINKING_CONTENT_SIZE: 5 * 1024 * 1024  // 5 MB
};

// Configuración de Tareas
export const TASK_CONFIG = {
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 2000,
  MAX_TAG_LENGTH: 50,
  MAX_TAGS_PER_TASK: 10,
  MAX_TASKS_DISPLAY: 1000
};

// Configuración de Sesiones
export const SESSION_CONFIG = {
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_TASKS_PER_SESSION: 50,
  MIN_POMODORO_WORK_MINUTES: 1,
  MAX_POMODORO_WORK_MINUTES: 120,
  MIN_POMODORO_BREAK_MINUTES: 1,
  MAX_POMODORO_BREAK_MINUTES: 30,
  DEFAULT_POMODORO_WORK_MINUTES: 25,
  DEFAULT_POMODORO_BREAK_MINUTES: 5,
  TIMER_INTERVAL_MS: 1000
};

// Configuración de UI
export const UI_CONFIG = {
  DEBOUNCE_INPUT_MS: 300,
  ANIMATION_DURATION_MS: 200,
  SCROLL_SMOOTH_DELAY_MS: 100,
  MIN_TASKS_PANEL_HEIGHT: 200,
  MIN_CHAT_PANEL_HEIGHT: 150,
  RESIZE_HANDLE_HEIGHT: 8
};

// Electron Window
export const WINDOW_CONFIG = {
  WIDTH: 480,
  MARGIN: 20,
  ANIMATION_FPS: 60,
  ANIMATION_FRAME_MS: 16
};

// Validaciones
export const VALID_PRIORITIES = ['alta', 'media', 'baja'];
export const VALID_CATEGORIES = ['Trabajo', 'Personal', 'Estudio', 'Otros'];
export const VALID_STATUSES = ['pendiente', 'en_progreso', 'completada'];
export const VALID_SESSION_STATUSES = ['activa', 'pausada', 'completada'];

// Tool Calls
export const TOOL_CONFIG = {
  MAX_RECURSION_DEPTH: 5,
  EXECUTION_TIMEOUT_MS: 60000  // 1 minuto
};

// Comandos
export const COMMANDS = {
  HELP: '/help',
  SETTINGS: '/settings',
  CLEAR: '/clear'
};

// Storage Keys
export const STORAGE_KEYS = {
  TASKS: 'tasks',
  SESSIONS: 'sessions',
  API_URL: 'apiUrl',
  TEMPERATURE: 'temperature',
  NO_THINK: 'noThink',
  DEBUG_MODE: 'debugMode'
};

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_JSON: 'Datos corruptos en localStorage',
  NETWORK_ERROR: 'Error de red. Verifica la URL en /settings',
  TIMEOUT_ERROR: 'Timeout: Petición excedió el tiempo límite',
  RATE_LIMIT: 'Límite de peticiones excedido. Espera un momento',
  SERVER_ERROR: 'Error del servidor. LM Studio no disponible',
  BUFFER_OVERFLOW: 'Respuesta demasiado grande',
  INVALID_TASK_DATA: 'Datos de tarea inválidos',
  INVALID_SESSION_DATA: 'Datos de sesión inválidos'
};
