// Configuración
let config = {
  apiUrl: localStorage.getItem('apiUrl') || 'http://localhost:8443',
  apiKey: localStorage.getItem('apiKey') || '',
  temperature: parseFloat(localStorage.getItem('temperature')) || 0.7,
  noThink: localStorage.getItem('noThink') !== 'false'
};

let chatHistory = [];
let isLoading = false;
let selectedSuggestionIndex = -1;
let currentSuggestions = [];
let messageQueue = [];
let countdownInterval = null;

// Elementos del DOM
const messageInput = document.getElementById('messageInput');
const statusDot = document.getElementById('statusDot');
const resultsWindow = document.getElementById('resultsWindow');
const messagesContainer = document.getElementById('messagesContainer');
const settingsWindow = document.getElementById('settingsWindow');
const closeSettings = document.getElementById('closeSettings');
const helpWindow = document.getElementById('helpWindow');
const closeHelp = document.getElementById('closeHelp');
const apiUrlInput = document.getElementById('apiUrl');
const apiKeyInput = document.getElementById('apiKey');
const temperatureInput = document.getElementById('temperature');
const tempValueSpan = document.getElementById('tempValue');
const noThinkCheckbox = document.getElementById('noThink');
const suggestionsWindow = document.getElementById('suggestionsWindow');
const suggestionsList = document.getElementById('suggestionsList');
const queueContainer = document.getElementById('queueContainer');

// Comandos disponibles con descripciones
const commandsData = [
  { command: '/help', description: 'Mostrar esta ayuda', action: showHelp },
  { command: '/settings', description: 'Abrir configuración', action: openSettings },
  { command: '/clear', description: 'Limpiar historial', action: clearChat },
  { command: '/close', description: 'Cerrar ventana actual', action: closeCurrentWindow }
];

// Derivar comandos automáticamente de commandsData
const commands = Object.fromEntries(
  commandsData.map(cmd => [cmd.command, cmd.action])
);

// Inicializar
function init() {
  loadSettings();
  checkAPIHealth();
  setupEventListeners();
}

// Cargar configuración
function loadSettings() {
  apiUrlInput.value = config.apiUrl;
  apiKeyInput.value = config.apiKey;
  temperatureInput.value = config.temperature;
  tempValueSpan.textContent = config.temperature;
  noThinkCheckbox.checked = config.noThink;
}

// Event Listeners
function setupEventListeners() {
  messageInput.addEventListener('keydown', (e) => {
    // Escape para cerrar ventanas abiertas o sugerencias
    if (e.key === 'Escape') {
      // Primero verificar si hay ventanas abiertas
      if (!helpWindow.classList.contains('hidden')) {
        helpWindow.classList.add('hidden');
        if (chatHistory.length > 0) {
          resultsWindow.classList.remove('hidden');
        }
        return;
      }

      if (!settingsWindow.classList.contains('hidden')) {
        saveSettings();
        return;
      }

      // Si no hay ventanas, cerrar sugerencias
      if (!suggestionsWindow.classList.contains('hidden')) {
        hideSuggestions();
        return;
      }
      return;
    }

    // Navegación con flechas en sugerencias
    if (e.key === 'ArrowDown' && !suggestionsWindow.classList.contains('hidden')) {
      e.preventDefault();
      selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, currentSuggestions.length - 1);
      updateSuggestionsUI();
      return;
    }

    if (e.key === 'ArrowUp' && !suggestionsWindow.classList.contains('hidden')) {
      e.preventDefault();
      selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, 0);
      updateSuggestionsUI();
      return;
    }

    // Enter con sugerencia seleccionada
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!suggestionsWindow.classList.contains('hidden') && selectedSuggestionIndex >= 0) {
        applySuggestion(currentSuggestions[selectedSuggestionIndex]);
      } else {
        handleInput();
      }
      return;
    }
  });

  messageInput.addEventListener('input', (e) => {
    const input = e.target.value;

    // Detectar si empieza con "/"
    if (input.startsWith('/')) {
      showSuggestions(input);
    } else {
      hideSuggestions();
    }
  });

  closeSettings.addEventListener('click', () => {
    // Guardar configuración antes de cerrar
    saveSettings();
  });

  closeHelp.addEventListener('click', () => {
    helpWindow.classList.add('hidden');
    // Si hay historial de chat, mostrar la ventana de resultados
    if (chatHistory.length > 0) {
      resultsWindow.classList.remove('hidden');
    }
  });

  temperatureInput.addEventListener('input', (e) => {
    tempValueSpan.textContent = e.target.value;
  });
}

// Manejar input
function handleInput() {
  const input = messageInput.value.trim();

  if (!input) return;

  // Validar longitud del mensaje
  if (input.length < 3) {
    showError('El mensaje debe tener al menos 3 caracteres');
    return;
  }

  if (input.length > 2000) {
    showError('El mensaje no puede tener más de 2000 caracteres');
    return;
  }

  // Limpiar input
  messageInput.value = '';

  // Verificar si es un comando
  if (input.startsWith('/')) {
    const command = input.split(' ')[0];
    if (commands[command]) {
      commands[command](input);
      return;
    } else {
      showCommandError(command);
      return;
    }
  }

  // Si no es comando, añadir a cola o enviar directamente
  if (isLoading) {
    addToQueue(input);
  } else {
    sendMessage(input);
  }
}

function showError(message) {
  // Mostrar error temporal en el input
  const originalPlaceholder = messageInput.placeholder;
  messageInput.placeholder = message;
  messageInput.classList.add('error');

  setTimeout(() => {
    messageInput.placeholder = originalPlaceholder;
    messageInput.classList.remove('error');
  }, 3000);
}

// Comandos
function showHelp() {
  closeAllWindows();
  helpWindow.classList.remove('hidden');
}

function clearChat() {
  chatHistory = [];
  messagesContainer.innerHTML = '';
  resultsWindow.classList.add('hidden');
}

function openSettings() {
  closeAllWindows();
  settingsWindow.classList.remove('hidden');
}

function closeAllWindows() {
  resultsWindow.classList.add('hidden');
  settingsWindow.classList.add('hidden');
  helpWindow.classList.add('hidden');
}

function closeCurrentWindow() {
  // Cerrar help si está abierto
  if (!helpWindow.classList.contains('hidden')) {
    helpWindow.classList.add('hidden');
    if (chatHistory.length > 0) {
      resultsWindow.classList.remove('hidden');
    }
    return;
  }

  // Cerrar settings si está abierto
  if (!settingsWindow.classList.contains('hidden')) {
    saveSettings();
    return;
  }

  // Cerrar results si está abierto
  if (!resultsWindow.classList.contains('hidden')) {
    resultsWindow.classList.add('hidden');
    return;
  }
}

function showCommandError(command) {
  console.log(`Comando desconocido: ${command}`);
}

// Sistema de sugerencias de comandos
function showSuggestions(input) {
  // Filtrar comandos que coincidan
  const filtered = commandsData.filter(cmd =>
    cmd.command.startsWith(input.toLowerCase())
  );

  currentSuggestions = filtered;

  if (filtered.length === 0) {
    hideSuggestions();
    return;
  }

  // Resetear índice de selección
  selectedSuggestionIndex = 0;

  // Renderizar sugerencias
  suggestionsList.innerHTML = '';
  filtered.forEach((cmd, index) => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    if (index === selectedSuggestionIndex) {
      item.classList.add('selected');
    }

    const commandSpan = document.createElement('span');
    commandSpan.className = 'suggestion-command';
    commandSpan.textContent = cmd.command;

    const descSpan = document.createElement('span');
    descSpan.className = 'suggestion-desc';
    descSpan.textContent = cmd.description;

    item.appendChild(commandSpan);
    item.appendChild(descSpan);

    // Click en sugerencia
    item.addEventListener('click', () => {
      applySuggestion(cmd);
    });

    suggestionsList.appendChild(item);
  });

  // Mostrar ventana de sugerencias
  suggestionsWindow.classList.remove('hidden');
}

function hideSuggestions() {
  suggestionsWindow.classList.add('hidden');
  currentSuggestions = [];
  selectedSuggestionIndex = -1;
}

function updateSuggestionsUI() {
  const items = suggestionsList.querySelectorAll('.suggestion-item');
  items.forEach((item, index) => {
    if (index === selectedSuggestionIndex) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

function applySuggestion(suggestion) {
  messageInput.value = suggestion.command;
  hideSuggestions();
  messageInput.focus();
}

// Guardar configuración
function saveSettings() {
  config.apiUrl = apiUrlInput.value.trim();
  config.apiKey = apiKeyInput.value.trim();
  config.temperature = parseFloat(temperatureInput.value);
  config.noThink = noThinkCheckbox.checked;

  localStorage.setItem('apiUrl', config.apiUrl);
  localStorage.setItem('apiKey', config.apiKey);
  localStorage.setItem('temperature', config.temperature);
  localStorage.setItem('noThink', config.noThink);

  settingsWindow.classList.add('hidden');

  // Si hay historial de chat, mostrar la ventana de resultados
  if (chatHistory.length > 0) {
    resultsWindow.classList.remove('hidden');
  }

  checkAPIHealth();
}

// Verificar salud de la API
async function checkAPIHealth() {
  try {
    const response = await fetch(`${config.apiUrl}/health`);
    const data = await response.json();

    if (data.status === 'ok') {
      statusDot.classList.remove('disconnected');
    } else {
      statusDot.classList.add('disconnected');
    }
  } catch (error) {
    statusDot.classList.add('disconnected');
    console.error('Error checking API health:', error);
  }
}

// Sistema de cola de mensajes
function addToQueue(message) {
  messageQueue.push({ text: message, countdown: 500 });
  updateQueueUI();
  processQueue();
}

function removeFromQueue(index) {
  messageQueue.splice(index, 1);
  updateQueueUI();
}

function updateQueueUI() {
  queueContainer.innerHTML = '';

  if (messageQueue.length === 0) {
    return;
  }

  messageQueue.forEach((msg, index) => {
    const item = document.createElement('div');
    item.className = 'queue-item';

    const text = document.createElement('div');
    text.className = 'queue-item-text';
    text.textContent = msg.text;

    const countdown = document.createElement('div');
    countdown.className = 'queue-countdown';
    countdown.textContent = (msg.countdown / 1000).toFixed(1) + 's';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'queue-item-cancel';
    cancelBtn.textContent = '×';
    cancelBtn.addEventListener('click', () => {
      removeFromQueue(index);
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    });

    item.appendChild(text);
    item.appendChild(countdown);
    item.appendChild(cancelBtn);

    queueContainer.appendChild(item);
  });
}

async function processQueue() {
  if (isLoading || messageQueue.length === 0) {
    return;
  }

  // Countdown visual de 500ms
  const countdownDuration = 500;
  const intervalDuration = 50; // Actualizar cada 50ms
  let elapsed = 0;

  countdownInterval = setInterval(() => {
    elapsed += intervalDuration;
    if (messageQueue.length > 0) {
      messageQueue[0].countdown = countdownDuration - elapsed;
      updateQueueUI();
    }
  }, intervalDuration);

  await new Promise(resolve => setTimeout(resolve, countdownDuration));

  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  // Verificar de nuevo si la cola sigue teniendo mensajes
  if (messageQueue.length === 0) {
    return;
  }

  const message = messageQueue.shift().text;
  updateQueueUI();

  await sendMessage(message);

  // Procesar siguiente mensaje en cola
  if (messageQueue.length > 0) {
    processQueue();
  }
}

// Enviar mensaje
async function sendMessage(message) {
  // Mostrar ventana de resultados
  resultsWindow.classList.remove('hidden');

  // Añadir mensaje del usuario
  addMessage('user', message);

  // Marcar como loading (pero SIN deshabilitar input)
  isLoading = true;

  // Mostrar loading
  const loadingId = addLoadingMessage();

  try {
    // Verificar que hay API KEY configurada
    if (!config.apiKey) {
      throw new Error('API KEY no configurada. Configura en /settings');
    }

    // Preparar historial
    const history = chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Crear controlador de timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

    // Llamar a la API
    const response = await fetch(`${config.apiUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey
      },
      body: JSON.stringify({
        message: message,
        history: history,
        temperature: config.temperature,
        no_think: config.noThink
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('API KEY inválida. Verifica en /settings');
      } else if (response.status === 429) {
        throw new Error('Límite de peticiones excedido. Espera un momento');
      } else if (response.status >= 500) {
        throw new Error(`Error del servidor (${response.status}). LM Studio no disponible`);
      } else {
        throw new Error(`Error HTTP ${response.status}`);
      }
    }

    const data = await response.json();

    // Remover loading
    removeLoadingMessage(loadingId);

    // Añadir respuesta del asistente
    addMessage('assistant', data.response);

    // Actualizar historial
    chatHistory = data.history;

  } catch (error) {
    console.error('Error sending message:', error);
    removeLoadingMessage(loadingId);

    let errorMessage = 'Error desconocido';

    if (error.name === 'AbortError') {
      errorMessage = 'Timeout: Petición excedió 30 segundos';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorMessage = 'Error de red. Verifica la URL en /settings';
    } else {
      errorMessage = error.message;
    }

    addMessage('assistant', `Error: ${errorMessage}`);
  } finally {
    isLoading = false;
    messageInput.focus();
    // Continuar procesando la cola si hay más mensajes
    processQueue();
  }
}

// Añadir mensaje al chat
function addMessage(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = content;

  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);

  // Scroll al final
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Guardar en historial
  if (role !== 'system') {
    chatHistory.push({ role, content });
  }
}

// Añadir mensaje de carga
function addLoadingMessage() {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant';
  messageDiv.id = 'loading-message';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content loading';

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = 'loading-dot';
    contentDiv.appendChild(dot);
  }

  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  return 'loading-message';
}

// Remover mensaje de carga
function removeLoadingMessage(id) {
  const loadingMsg = document.getElementById(id);
  if (loadingMsg) {
    loadingMsg.remove();
  }
}

// Iniciar al cargar la página
document.addEventListener('DOMContentLoaded', init);

// Verificar salud cada 30 segundos
setInterval(checkAPIHealth, 30000);
