// Gestión local de tareas (sin servidor, usando localStorage)

// Estado de tareas
let tasks = [];
let sessions = [];
let currentSession = null;
let sessionElapsedSeconds = 0;
let sessionInterval = null;
let isPaused = false;

// Cargar datos desde localStorage
function loadTasksFromStorage() {
  try {
    const savedTasks = localStorage.getItem('tasks');
    if (!savedTasks) {
      tasks = [];
      return tasks;
    }
    const parsed = JSON.parse(savedTasks);
    // Validar que sea un array
    if (!Array.isArray(parsed)) {
      console.error('Invalid tasks data in localStorage, resetting');
      tasks = [];
      saveTasksToStorage();
      return tasks;
    }
    tasks = parsed;
    return tasks;
  } catch (error) {
    console.error('Error loading tasks from storage:', error);
    tasks = [];
    // Intentar guardar estado limpio
    try {
      saveTasksToStorage();
    } catch (e) {
      console.error('Could not reset tasks storage:', e);
    }
    return tasks;
  }
}

function loadSessionsFromStorage() {
  try {
    const savedSessions = localStorage.getItem('sessions');
    if (!savedSessions) {
      sessions = [];
      return sessions;
    }
    const parsed = JSON.parse(savedSessions);
    // Validar que sea un array
    if (!Array.isArray(parsed)) {
      console.error('Invalid sessions data in localStorage, resetting');
      sessions = [];
      saveSessionsToStorage();
      return sessions;
    }
    sessions = parsed;
    return sessions;
  } catch (error) {
    console.error('Error loading sessions from storage:', error);
    sessions = [];
    // Intentar guardar estado limpio
    try {
      saveSessionsToStorage();
    } catch (e) {
      console.error('Could not reset sessions storage:', e);
    }
    return sessions;
  }
}

// Guardar datos en localStorage
function saveTasksToStorage() {
  try {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  } catch (error) {
    console.error('Error saving tasks to storage:', error);
    throw error;
  }
}

function saveSessionsToStorage() {
  try {
    localStorage.setItem('sessions', JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving sessions to storage:', error);
    throw error;
  }
}

// Generar ID único usando crypto API si está disponible
function generateId() {
  // Usar crypto.randomUUID si está disponible (más seguro)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: timestamp + random con más entropía
  const timestamp = Date.now().toString(36);
  const randomPart1 = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  const performanceNow = (typeof performance !== 'undefined' && performance.now)
    ? performance.now().toString(36).replace('.', '')
    : '';

  return `${timestamp}-${randomPart1}${randomPart2}${performanceNow}`;
}

// ===== OPERACIONES DE TAREAS =====

// Validar prioridad
function isValidPriority(priority) {
  return ['alta', 'media', 'baja'].includes(priority);
}

// Validar categoría
function isValidCategory(category) {
  return ['Trabajo', 'Personal', 'Estudio', 'Otros'].includes(category);
}

// Validar status
function isValidStatus(status) {
  return ['pendiente', 'en_progreso', 'completada'].includes(status);
}

function createTask(taskData) {
  // Validar que taskData sea un objeto
  if (!taskData || typeof taskData !== 'object') {
    throw new TypeError('taskData must be an object');
  }

  // Validar título (requerido)
  if (typeof taskData.title !== 'string' || taskData.title.trim().length === 0) {
    throw new Error('title is required and must be a non-empty string');
  }

  // Validar y sanitizar campos
  const title = taskData.title.trim();
  if (title.length > 200) {
    throw new Error('title must be less than 200 characters');
  }

  const description = typeof taskData.description === 'string'
    ? taskData.description.trim().substring(0, 2000)  // Límite de 2000 chars
    : '';

  const priority = isValidPriority(taskData.priority) ? taskData.priority : 'media';
  const category = isValidCategory(taskData.category) ? taskData.category : 'Otros';

  // Validar tags
  let tags = [];
  if (Array.isArray(taskData.tags)) {
    tags = taskData.tags
      .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
      .map(tag => tag.trim().substring(0, 50))  // Límite por tag
      .slice(0, 10);  // Máximo 10 tags
  }

  // Validar deadline
  let deadline = null;
  if (taskData.deadline) {
    const deadlineDate = new Date(taskData.deadline);
    if (!isNaN(deadlineDate.getTime())) {
      deadline = deadlineDate.toISOString();
    }
  }

  const newTask = {
    id: generateId(),
    title,
    description,
    priority,
    category,
    tags,
    deadline,
    status: 'pendiente',
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  tasks.push(newTask);
  saveTasksToStorage();
  return newTask;
}

function updateTask(taskId, updates) {
  if (!taskId || typeof taskId !== 'string') {
    throw new TypeError('taskId must be a string');
  }

  if (!updates || typeof updates !== 'object') {
    throw new TypeError('updates must be an object');
  }

  const taskIndex = tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return null;

  // Validar updates
  const validatedUpdates = {};

  if (updates.title !== undefined) {
    if (typeof updates.title !== 'string' || updates.title.trim().length === 0) {
      throw new Error('title must be a non-empty string');
    }
    validatedUpdates.title = updates.title.trim().substring(0, 200);
  }

  if (updates.description !== undefined) {
    validatedUpdates.description = typeof updates.description === 'string'
      ? updates.description.trim().substring(0, 2000)
      : '';
  }

  if (updates.priority !== undefined && isValidPriority(updates.priority)) {
    validatedUpdates.priority = updates.priority;
  }

  if (updates.category !== undefined && isValidCategory(updates.category)) {
    validatedUpdates.category = updates.category;
  }

  if (updates.status !== undefined && isValidStatus(updates.status)) {
    validatedUpdates.status = updates.status;
  }

  if (updates.tags !== undefined && Array.isArray(updates.tags)) {
    validatedUpdates.tags = updates.tags
      .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
      .map(tag => tag.trim().substring(0, 50))
      .slice(0, 10);
  }

  if (updates.deadline !== undefined) {
    if (updates.deadline === null) {
      validatedUpdates.deadline = null;
    } else {
      const deadlineDate = new Date(updates.deadline);
      if (!isNaN(deadlineDate.getTime())) {
        validatedUpdates.deadline = deadlineDate.toISOString();
      }
    }
  }

  tasks[taskIndex] = {
    ...tasks[taskIndex],
    ...validatedUpdates,
    updatedAt: new Date().toISOString()
  };

  // Si se marca como completada, guardar timestamp
  if (validatedUpdates.status === 'completada' && !tasks[taskIndex].completedAt) {
    tasks[taskIndex].completedAt = new Date().toISOString();
  }

  // Si se marca como no completada, limpiar timestamp
  if (validatedUpdates.status && validatedUpdates.status !== 'completada') {
    tasks[taskIndex].completedAt = null;
  }

  saveTasksToStorage();
  return tasks[taskIndex];
}

function deleteTask(taskId) {
  const initialLength = tasks.length;
  tasks = tasks.filter(t => t.id !== taskId);

  if (tasks.length < initialLength) {
    saveTasksToStorage();
    return true;
  }
  return false;
}

function getTasks(filter = 'all') {
  if (filter === 'all') return tasks;
  return tasks.filter(t => t.status === filter);
}

// ===== OPERACIONES DE SESIONES =====

function createSession(sessionData) {
  // Validar que sessionData sea un objeto
  if (!sessionData || typeof sessionData !== 'object') {
    throw new TypeError('sessionData must be an object');
  }

  // Validar nombre (requerido)
  if (typeof sessionData.name !== 'string' || sessionData.name.trim().length === 0) {
    throw new Error('name is required and must be a non-empty string');
  }

  const name = sessionData.name.trim().substring(0, 100);
  const description = typeof sessionData.description === 'string'
    ? sessionData.description.trim().substring(0, 500)
    : '';

  // Validar taskIds
  let taskIds = [];
  if (Array.isArray(sessionData.taskIds)) {
    taskIds = sessionData.taskIds
      .filter(id => typeof id === 'string' && id.trim().length > 0)
      .slice(0, 50);  // Máximo 50 tareas por sesión
  }

  // Validar pomodoro settings
  const pomodoroEnabled = Boolean(sessionData.pomodoroEnabled);

  let pomodoroWorkMinutes = 25;
  if (typeof sessionData.pomodoroWorkMinutes === 'number') {
    pomodoroWorkMinutes = Math.max(1, Math.min(120, Math.floor(sessionData.pomodoroWorkMinutes)));
  }

  let pomodoroBreakMinutes = 5;
  if (typeof sessionData.pomodoroBreakMinutes === 'number') {
    pomodoroBreakMinutes = Math.max(1, Math.min(30, Math.floor(sessionData.pomodoroBreakMinutes)));
  }

  const newSession = {
    id: generateId(),
    name,
    description,
    taskIds,
    startTime: new Date().toISOString(),
    endTime: null,
    totalMinutes: 0,
    pomodoroEnabled,
    pomodoroWorkMinutes,
    pomodoroBreakMinutes,
    status: 'activa',
    createdAt: new Date().toISOString()
  };

  sessions.push(newSession);
  saveSessionsToStorage();
  return newSession;
}

function updateSession(sessionId, updates) {
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex === -1) return null;

  sessions[sessionIndex] = {
    ...sessions[sessionIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  saveSessionsToStorage();
  return sessions[sessionIndex];
}

function deleteSession(sessionId) {
  const initialLength = sessions.length;
  sessions = sessions.filter(s => s.id !== sessionId);

  if (sessions.length < initialLength) {
    saveSessionsToStorage();
    return true;
  }
  return false;
}

function getSessions() {
  return sessions;
}

// Inicializar al cargar
loadTasksFromStorage();
loadSessionsFromStorage();

// Exponer API global
window.tasksAPI = {
  // Tareas
  createTask,
  updateTask,
  deleteTask,
  getTasks,

  // Sesiones
  createSession,
  updateSession,
  deleteSession,
  getSessions,

  // Estado
  get tasks() { return tasks; },
  get sessions() { return sessions; },
  get currentSession() { return currentSession; },
  set currentSession(session) { currentSession = session; }
};
