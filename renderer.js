// ===== CONSTANTS =====
const MAX_BUFFER_SIZE = 10 * 1024 * 1024;  // 10 MB
const MAX_RESPONSE_SIZE = 50 * 1024 * 1024;  // 50 MB
const MAX_THINKING_CONTENT_SIZE = 5 * 1024 * 1024;  // 5 MB
const REQUEST_TIMEOUT_MS = 30000;  // 30 segundos
const MAX_MESSAGE_LENGTH = 2000;
const MIN_MESSAGE_LENGTH = 3;
const DEBOUNCE_INPUT_MS = 300;
const MAX_TOOL_RECURSION_DEPTH = 5;

// ===== STATE =====
// Configuración
let config = {
  apiUrl: localStorage.getItem('apiUrl') || 'http://localhost:1234',
  temperature: parseFloat(localStorage.getItem('temperature')) || 0.7,
  noThink: localStorage.getItem('noThink') !== 'false', // Vuelve a gestionar el estado
  debugMode: localStorage.getItem('debugMode') === 'true' // Debug mode para ver tags <think>
};

let isLoading = false;
let selectedSuggestionIndex = -1;
let currentSuggestions = [];
let messageQueue = [];
let countdownInterval = null;
let toolRecursionDepth = 0;  // Prevenir loops infinitos

// Control de concurrencia para thinking messages
let thinkingMessageLock = false;
let callingToolMessageLock = false;

// ===== TOOL DEFINITIONS =====
// No hay herramientas configuradas actualmente
const availableTools = [];
const toolFunctions = {};

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
const temperatureInput = document.getElementById('temperature');
const tempValueSpan = document.getElementById('tempValue');
const noThinkCheckbox = document.getElementById('noThink'); // Vuelve a añadir el checkbox
const debugModeCheckbox = document.getElementById('debugMode'); // Checkbox para debug mode
const suggestionsWindow = document.getElementById('suggestionsWindow');
const suggestionsList = document.getElementById('suggestionsList');
const queueContainer = document.getElementById('queueContainer');
const thinkingIndicator = document.getElementById('thinkingIndicator');

// Thinking state
let isInsideThink = false;
let thinkingContent = '';
let currentThinkingMessageId = null;
let callingToolMessageElement = null;
let thinkingMessageElement = null;

// Initialize markdown-it
let md = null;
if (typeof markdownit !== 'undefined') {
  md = markdownit({
    html: false,
    linkify: true,
    typographer: true,
    breaks: true
  });
}

// Comandos disponibles con descripciones
const commandsData = [
  { command: '/help', description: 'Mostrar esta ayuda', action: showHelp },
  { command: '/settings', description: 'Abrir configuración', action: openSettings },
  { command: '/clear', description: 'Limpiar historial', action: clearChat }
];

// Derivar comandos automáticamente de commandsData
const commands = Object.fromEntries(
  commandsData.map(cmd => [cmd.command, cmd.action])
);

// ===== UTILITY FUNCTIONS =====

/**
 * Debounce function - prevents excessive function calls
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Inicializar
function init() {
  loadSettings();
  setupEventListeners();
  // Esperar a que Lucide se cargue completamente
  setTimeout(() => {
    initLucideIcons();
  }, 100);
}

// Cargar configuración
function loadSettings() {
  apiUrlInput.value = config.apiUrl;
  temperatureInput.value = config.temperature;
  tempValueSpan.textContent = config.temperature;
  noThinkCheckbox.checked = config.noThink; // Carga el estado
  debugModeCheckbox.checked = config.debugMode; // Carga el estado del debug mode
  updateThinkingIndicator();
}

// Event Listeners
function setupEventListeners() {
  messageInput.addEventListener('keydown', (e) => {
    // Shift+Tab para toggle thinking mode
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      config.noThink = !config.noThink;
      noThinkCheckbox.checked = config.noThink;
      localStorage.setItem('noThink', config.noThink);
      updateThinkingIndicator();
      return;
    }

    // Escape para cerrar ventanas abiertas o sugerencias
    if (e.key === 'Escape') {
      // Primero verificar si hay ventanas abiertas
      if (!helpWindow.classList.contains('hidden')) {
        helpWindow.classList.add('hidden');
        resultsWindow.classList.add('hidden');
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

    // Enter con sugerencia seleccionada o para enviar mensaje
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!suggestionsWindow.classList.contains('hidden') && selectedSuggestionIndex >= 0) {
        applySuggestion(currentSuggestions[selectedSuggestionIndex]);
      } else {
        handleInput();
      }
      return;
    }
  });

  // Debounced input handler para optimizar performance
  const debouncedInputHandler = debounce((input) => {
    // Detectar si empieza con "/"
    if (input.startsWith('/')) {
      showSuggestions(input);
    } else {
      hideSuggestions();
    }
  }, DEBOUNCE_INPUT_MS);

  messageInput.addEventListener('input', (e) => {
    const input = e.target.value;
    debouncedInputHandler(input);
  });

  closeSettings.addEventListener('click', () => {
    // Guardar configuración antes de cerrar
    saveSettings();
  });

  closeHelp.addEventListener('click', () => {
    helpWindow.classList.add('hidden');
    resultsWindow.classList.add('hidden');
  });

  temperatureInput.addEventListener('input', (e) => {
    tempValueSpan.textContent = e.target.value;
  });

  // Update thinking indicator when checkbox changes
  noThinkCheckbox.addEventListener('change', () => {
    updateThinkingIndicator();
  });

  // Debug mode checkbox listener
  debugModeCheckbox.addEventListener('change', () => {
    config.debugMode = debugModeCheckbox.checked;
    localStorage.setItem('debugMode', config.debugMode);
    console.log('[DEBUG MODE]', config.debugMode ? 'ENABLED' : 'DISABLED');
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
  messagesContainer.innerHTML = '';
  resultsWindow.classList.add('hidden');
  currentInteractionBlock = null; // Reset del bloque actual
}

function openSettings() {
  closeAllWindows();
  settingsWindow.classList.remove('hidden');
  checkAPIHealth(); // Check API health when opening settings
}

function closeAllWindows() {
  resultsWindow.classList.add('hidden');
  settingsWindow.classList.add('hidden');
  helpWindow.classList.add('hidden');
}

function showCommandError(command) {
  console.log(`Comando desconocido: ${command}`);
}

// Update thinking indicator
function updateThinkingIndicator() {
  const icon = thinkingIndicator.querySelector('i');
  if (config.noThink) {
    thinkingIndicator.classList.add('no-think');
    thinkingIndicator.classList.remove('think');
    if (icon) {
      icon.setAttribute('data-lucide', 'brain');
    }
  } else {
    thinkingIndicator.classList.add('think');
    thinkingIndicator.classList.remove('no-think');
    if (icon) {
      icon.setAttribute('data-lucide', 'brain');
    }
  }
  initLucideIcons();
}

// Initialize Lucide icons
function initLucideIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Calling tool message functions
function showCallingToolMessage() {
  // Usar lock para prevenir race conditions
  if (callingToolMessageLock) {
    console.log('[DEBUG] Calling tool message already locked');
    return;
  }

  console.log('[DEBUG] Showing calling tool message');

  // Si ya existe (verificar tanto la referencia como su presencia en el DOM), no crear otro
  if (callingToolMessageElement) {
    // If we have a reference, verify it's still in DOM
    if (messagesContainer.contains(callingToolMessageElement)) {
      return; // Already showing
    }
    // Reference exists but not in DOM, clear it
    callingToolMessageElement = null;
  }

  callingToolMessageLock = true;

  // Crear el elemento dinámicamente
  callingToolMessageElement = document.createElement('div');
  callingToolMessageElement.className = 'calling-tool-message';
  callingToolMessageElement.innerHTML = `
    <span class="calling-tool-text">Calling tool</span>
    <span class="calling-tool-dots">
      <span class="dot">.</span>
      <span class="dot">.</span>
      <span class="dot">.</span>
    </span>
  `;

  // Añadir al bloque de interacción actual si existe, sino al contenedor principal
  if (currentInteractionBlock) {
    currentInteractionBlock.appendChild(callingToolMessageElement);
  } else {
    messagesContainer.appendChild(callingToolMessageElement);
  }

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideCallingToolMessage() {
  console.log('[DEBUG] Hiding calling tool message');
  if (callingToolMessageElement && messagesContainer.contains(callingToolMessageElement)) {
    callingToolMessageElement.remove();
    callingToolMessageElement = null;
  }
  callingToolMessageLock = false;
}

// Thinking message functions
function showThinkingMessage() {
  // Usar lock para prevenir race conditions
  if (thinkingMessageLock) {
    console.log('[DEBUG] Thinking message already locked');
    return;
  }

  console.log('[DEBUG] Showing thinking message');

  // Si ya existe (verificar tanto la referencia como su presencia en el DOM), no crear otro
  if (thinkingMessageElement) {
    // If we have a reference, verify it's still in DOM
    if (messagesContainer.contains(thinkingMessageElement)) {
      return; // Already showing
    }
    // Reference exists but not in DOM, clear it
    thinkingMessageElement = null;
  }

  thinkingMessageLock = true;

  // Crear el elemento dinámicamente
  thinkingMessageElement = document.createElement('div');
  thinkingMessageElement.className = 'thinking-message';
  thinkingMessageElement.innerHTML = `
    <span class="thinking-text">Thinking</span>
    <span class="thinking-dots">
      <span class="dot">.</span>
      <span class="dot">.</span>
      <span class="dot">.</span>
    </span>
  `;

  // Añadir al bloque de interacción actual si existe, sino al contenedor principal
  if (currentInteractionBlock) {
    currentInteractionBlock.appendChild(thinkingMessageElement);
  } else {
    messagesContainer.appendChild(thinkingMessageElement);
  }

  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  thinkingContent = '';
  isInsideThink = true;
}

function hideThinkingMessage() {
  console.log('[DEBUG] Hiding thinking message');
  if (thinkingMessageElement && messagesContainer.contains(thinkingMessageElement)) {
    thinkingMessageElement.remove();
    thinkingMessageElement = null;
  }
  isInsideThink = false;
  thinkingMessageLock = false;
}

// ============================================================================
// SHARED HELPER FUNCTIONS - Think Tag and Tool Call Processing
// ============================================================================

/**
 * Processes think tag logic for streaming content
 * Handles both opening and closing <think> tags
 * @param {string} buffer - Current buffer content
 * @param {string} content - New content chunk
 * @param {object} state - State object with: isInsideThink, thinkingContent, messageId
 * @returns {object} - Updated state: { buffer, isInsideThink, thinkingContent, messageId }
 */
function processThinkTags(buffer, content, state) {
  let { isInsideThink, thinkingContent, messageId } = state;

  // Si debug mode está activado, NO procesar tags <think> - mostrar todo
  if (config.debugMode) {
    if (buffer.trim()) {
      if (!messageId) {
        messageId = createStreamingMessage();
      }
      updateStreamingMessage(messageId, buffer);
    }
    return { buffer, isInsideThink, thinkingContent, messageId };
  }

  // Check for <think> opening tag
  if (buffer.includes('<think>') && !isInsideThink) {
    const thinkIndex = buffer.indexOf('<think>');

    // First, display any content BEFORE the <think> tag
    const beforeThink = buffer.substring(0, thinkIndex);
    if (beforeThink.trim()) {
      if (!messageId) {
        messageId = createStreamingMessage();
      }
      updateStreamingMessage(messageId, beforeThink);
    }

    // Now enter thinking mode
    showThinkingMessage();
    isInsideThink = true;
    buffer = buffer.substring(thinkIndex + 7); // Remove <think> and content before it
  }

  // If we're inside think, accumulate content
  if (isInsideThink) {
    // Check for closing tag
    if (buffer.includes('</think>')) {
      const closeIndex = buffer.indexOf('</think>');
      const thinkText = buffer.substring(0, closeIndex);
      thinkingContent += thinkText;

      hideThinkingMessage();
      isInsideThink = false;

      // Start normal message with remaining content
      buffer = buffer.substring(closeIndex + 8); // Remove </think>

      // Create the actual message now if there's content
      if (buffer.trim()) {
        if (!messageId) {
          messageId = createStreamingMessage();
        }
        updateStreamingMessage(messageId, buffer);
      }
    } else {
      // Still inside think, just accumulate
      thinkingContent += content;
    }
  } else {
    // Normal streaming outside think tags - only create message if there's actual content
    if (buffer.trim()) {
      if (!messageId) {
        messageId = createStreamingMessage();
      }
      updateStreamingMessage(messageId, buffer);
    }
  }

  return { buffer, isInsideThink, thinkingContent, messageId };
}

/**
 * Accumulates tool call deltas during streaming
 * @param {object} delta - Delta object from streaming response
 * @param {array} toolCalls - Current tool calls array
 * @returns {array} - Updated tool calls array
 */
function accumulateToolCalls(delta, toolCalls) {
  if (delta.tool_calls) {
    for (const toolCall of delta.tool_calls) {
      const index = toolCall.index;

      // Initialize if needed
      if (!toolCalls[index]) {
        toolCalls[index] = {
          id: '',
          type: 'function',
          function: {
            name: '',
            arguments: ''
          }
        };
      }

      // Accumulate each field
      if (toolCall.function?.arguments) {
        toolCalls[index].function.arguments += toolCall.function.arguments;
      }
      if (toolCall.function?.name) {
        toolCalls[index].function.name += toolCall.function.name;
      }
      if (toolCall.id) {
        toolCalls[index].id += toolCall.id;
      }
    }
  }

  return toolCalls;
}

// ============================================================================
// END SHARED HELPER FUNCTIONS
// ============================================================================

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
  config.apiUrl = apiUrlInput.value.trim().replace(/\/$/, ''); // Eliminar barra final
  config.temperature = parseFloat(temperatureInput.value);
  config.noThink = noThinkCheckbox.checked; // Guarda el estado del interruptor
  config.debugMode = debugModeCheckbox.checked; // Guarda el estado del debug mode

  localStorage.setItem('apiUrl', config.apiUrl);
  localStorage.setItem('temperature', config.temperature);
  localStorage.setItem('noThink', config.noThink); // Persiste el estado
  localStorage.setItem('debugMode', config.debugMode); // Persiste el debug mode

  settingsWindow.classList.add('hidden');

  // Ocultar ventana de resultados
  resultsWindow.classList.add('hidden');

  checkAPIHealth();
}

// Verificar salud de la API de LM Studio
async function checkAPIHealth() {
  try {
    // El endpoint /v1/models es una buena forma de ver si el servidor está activo
    const response = await fetch(`${config.apiUrl}/v1/models`);

    if (response.ok) {
      statusDot.classList.remove('disconnected');
      console.log('Tools disponibles:', availableTools.length);
    } else {
      statusDot.classList.add('disconnected');
    }
  } catch (error) {
    statusDot.classList.add('disconnected');
    console.error('Error checking API health:', error);
  }
}

// Sistema de cola de mensajes (sin cambios)
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

// Variable global para rastrear el bloque de interacción actual
let currentInteractionBlock = null;

// Enviar mensaje
async function sendMessage(message) {
  // Mostrar ventana de resultados
  resultsWindow.classList.remove('hidden');

  // Crear un nuevo bloque de interacción
  currentInteractionBlock = document.createElement('div');
  currentInteractionBlock.className = 'interaction-block';
  messagesContainer.appendChild(currentInteractionBlock);

  // 1. Añadir mensaje del usuario SOLO a la UI
  addMessage('user', message);

  // Marcar como loading
  isLoading = true;

  // Mostrar loading
  const loadingId = addLoadingMessage();

  try {
    // 2. Preparar el contenido del mensaje para la API
    let messageContent = message;

    // 3. Preparar el array de mensajes para enviar (sin historial)
    const messagesToSend = [];

    // Si noThink está activado, añadir instrucción de sistema MÁS FUERTE
    if (config.noThink) {
      messagesToSend.push({
        role: 'system',
        content: 'IMPORTANT: You must respond directly without using any <think> or </think> tags. Never show your reasoning process. Do not use thinking tags under any circumstances. Provide only the final answer.'
      });
      // También añadir al mensaje del usuario
      messagesToSend.push({
        role: 'user',
        content: message + '\n\n(Remember: Respond without <think> tags)'
      });
    } else {
      messagesToSend.push({ role: 'user', content: message });
    }

    // Crear controlador de timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      // 4. Llamar a la API de LM Studio
      const requestBody = {
        messages: messagesToSend,
        temperature: config.temperature,
        stream: true // Enable streaming
      };

      // NO añadir stop sequences - interfieren con la generación
      // El modelo debe poder generar libremente

      // Incluir tools si están disponibles
      if (availableTools.length > 0) {
        requestBody.tools = availableTools;
        requestBody.tool_choice = 'auto'; // El modelo decide cuándo usar tools
      }

      // Log para debug en terminal
      console.log('\n═══════════════════════════════════════════════');
      console.log('📤 [REQUEST]');
      console.log('noThink:', config.noThink);
      console.log('debugMode:', config.debugMode);
      console.log('Message:', message);
      console.log('═══════════════════════════════════════════════\n');

      const response = await fetch(`${config.apiUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Límite de peticiones excedido. Espera un momento');
        } else if (response.status >= 500) {
          throw new Error(`Error del servidor (${response.status}). LM Studio no disponible`);
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || `Error HTTP ${response.status}`);
        }
      }

      // Remover loading
      removeLoadingMessage(loadingId);

    // 5. Stream the response with <think> tag detection
    currentThinkingMessageId = null;
    let fullResponse = '';
    let messageId = null;
    let buffer = '';
    isInsideThink = false;
    thinkingContent = '';
    let toolCalls = [];
    let currentToolCall = null;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices[0]?.delta;

            // Manejar tool_calls usando función compartida
            toolCalls = accumulateToolCalls(delta, toolCalls);

            const content = delta?.content;
            if (content) {
              // Verificar límites de buffer ANTES de acumular
              if (buffer.length + content.length > MAX_BUFFER_SIZE) {
                console.error('[BUFFER OVERFLOW] Buffer exceeded max size, truncating');
                throw new Error('Respuesta demasiado grande (buffer overflow)');
              }

              if (fullResponse.length + content.length > MAX_RESPONSE_SIZE) {
                console.error('[RESPONSE OVERFLOW] Response exceeded max size');
                throw new Error('Respuesta demasiado grande (response overflow)');
              }

              if (isInsideThink && thinkingContent.length + content.length > MAX_THINKING_CONTENT_SIZE) {
                console.error('[THINKING OVERFLOW] Thinking content exceeded max size');
                throw new Error('Contenido de thinking demasiado grande');
              }

              buffer += content;
              fullResponse += content;

              // Log cada chunk recibido en terminal (solo primeros caracteres)
              if (fullResponse.length < 100) {
                console.log('📥 [STREAM]:', content.substring(0, 30) + (content.length > 30 ? '...' : ''));
              }

              // Si debug mode está activado, mostrar todo sin procesar tags
              if (config.debugMode) {
                if (!messageId) {
                  messageId = createStreamingMessage();
                }
                updateStreamingMessage(messageId, buffer);
              }
              // Si NO hay tags <think> en el buffer, mostrar contenido normal
              else if (!buffer.includes('<think>') && !isInsideThink) {
                if (!messageId) {
                  messageId = createStreamingMessage();
                }
                updateStreamingMessage(messageId, buffer);
              }
              // Procesar tags <think> si existen
              else {
                // Check for <think> opening tag
                if (buffer.includes('<think>') && !isInsideThink) {
                  const thinkIndex = buffer.indexOf('<think>');

                  // First, display any content BEFORE the <think> tag
                  const beforeThink = buffer.substring(0, thinkIndex);
                  if (beforeThink.trim()) {
                    if (!messageId) {
                      messageId = createStreamingMessage();
                    }
                    updateStreamingMessage(messageId, beforeThink);
                  }

                  // Now enter thinking mode
                  showThinkingMessage();
                  isInsideThink = true;
                  buffer = buffer.substring(thinkIndex + 7); // Remove <think> and content before it
                }

                // If we're inside think, accumulate content
                if (isInsideThink) {
                  // Check for closing tag
                  if (buffer.includes('</think>')) {
                    const closeIndex = buffer.indexOf('</think>');
                    const thinkText = buffer.substring(0, closeIndex);
                    thinkingContent += thinkText;

                    hideThinkingMessage();
                    isInsideThink = false;

                    // Start normal message with remaining content
                    buffer = buffer.substring(closeIndex + 8); // Remove </think>

                    // Create the actual message now if there's content
                    if (buffer.trim()) {
                      if (!messageId) {
                        messageId = createStreamingMessage();
                      }
                      updateStreamingMessage(messageId, buffer);
                    }
                  } else {
                    // Still inside think, just accumulate
                    thinkingContent += content;
                  }
                }
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    // Ensure thinking message is hidden
    if (thinkingMessageElement) {
      hideThinkingMessage();
    }

    // Log de respuesta completa en terminal
    console.log('\n═══════════════════════════════════════════════');
    console.log('✅ [RESPONSE COMPLETE]');
    console.log('Length:', fullResponse.length, 'characters');
    console.log('Has <think> tags:', fullResponse.includes('<think>'));
    console.log('Tool calls:', toolCalls.length);
    console.log('───────────────────────────────────────────────');
    console.log('Response:');
    console.log(fullResponse);
    console.log('═══════════════════════════════════════════════\n');

    // 6. Procesar tool_calls si existen
    if (toolCalls.length > 0) {
      console.log('[DEBUG] Tool calls detected:', toolCalls.length);
      // Si creamos un mensaje vacío, eliminarlo
      if (messageId && !fullResponse.trim()) {
        const emptyMessage = document.getElementById(messageId);
        if (emptyMessage) {
          emptyMessage.remove();
        }
      }

      // Mostrar "Calling tool..."
      console.log('[DEBUG] About to show calling tool message');
      showCallingToolMessage();

      // Ejecutar los tools y continuar la conversación
      await executeToolCalls(toolCalls, messageId, message, config.noThink);
      return;
    }

    // No guardar en historial - solo mostrar en UI

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

    // Añadir mensaje de error a la UI (no se guarda en historial)
    addMessage('assistant', `Error: ${errorMessage}`);
  } finally {
    // SIEMPRE limpiar el timeout
    clearTimeout(timeoutId);
    isLoading = false;
    messageInput.focus();
    // Continuar procesando la cola si hay más mensajes
    processQueue();
  }
}

// Parse content with <think> tags and markdown
function parseContent(content) {
  // Si debug mode está activado, mostrar el contenido tal cual (con tags <think>)
  if (config.debugMode) {
    console.log('[DEBUG MODE] Showing raw content with <think> tags:', content);
    return [{
      type: 'normal',
      content: content
    }];
  }

  // Modo normal: eliminar tags <think>
  const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  if (cleanContent) {
    return [{
      type: 'normal',
      content: cleanContent
    }];
  }

  return [];
}

// Render content with markdown
function renderMarkdown(content) {
  if (md) {
    try {
      return md.render(content);
    } catch (e) {
      console.error('Markdown render error:', e);
      return content;
    }
  }
  return content;
}

// Añadir mensaje al chat (MODIFICADO)
// Esta función ahora SOLO añade a la UI. El historial se maneja en sendMessage.
function addMessage(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  if (role === 'assistant') {
    const parts = parseContent(content);
    parts.forEach(part => {
      if (part.content.trim()) {
        const normalDiv = document.createElement('div');
        normalDiv.className = 'normal-section';
        normalDiv.innerHTML = renderMarkdown(part.content);
        contentDiv.appendChild(normalDiv);
      }
    });
  } else {
    contentDiv.textContent = content;
  }

  messageDiv.appendChild(contentDiv);

  // Añadir al bloque de interacción actual si existe, sino al contenedor principal
  if (currentInteractionBlock) {
    currentInteractionBlock.appendChild(messageDiv);
  } else {
    messagesContainer.appendChild(messageDiv);
  }

  // Scroll al final
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Initialize icons if any were added
  initLucideIcons();
}

// Create streaming message
function createStreamingMessage() {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant';
  const id = 'streaming-' + Date.now();
  messageDiv.id = id;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  messageDiv.appendChild(contentDiv);

  // Añadir al bloque de interacción actual si existe, sino al contenedor principal
  if (currentInteractionBlock) {
    currentInteractionBlock.appendChild(messageDiv);
  } else {
    messagesContainer.appendChild(messageDiv);
  }

  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  return id;
}

// Update streaming message
function updateStreamingMessage(id, content) {
  const messageDiv = document.getElementById(id);
  if (!messageDiv) return;

  const contentDiv = messageDiv.querySelector('.message-content');
  contentDiv.innerHTML = '';

  const parts = parseContent(content);
  parts.forEach(part => {
    if (part.content.trim()) {
      const normalDiv = document.createElement('div');
      normalDiv.className = 'normal-section';
      normalDiv.innerHTML = renderMarkdown(part.content);
      contentDiv.appendChild(normalDiv);
    }
  });

  // Scroll al final
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Initialize icons if any were added
  initLucideIcons();
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

  // Añadir al bloque de interacción actual si existe, sino al contenedor principal
  if (currentInteractionBlock) {
    currentInteractionBlock.appendChild(messageDiv);
  } else {
    messagesContainer.appendChild(messageDiv);
  }

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

// Ejecutar tool calls y continuar la conversación
async function executeToolCalls(toolCalls, messageId, originalMessage, noThinkEnabled) {
  try {
    console.log(`[DEBUG] executeToolCalls called with ${toolCalls.length} tool(s)`);
    console.log(`🔧 Ejecutando ${toolCalls.length} tool(s)...`);

    // Ejecutar cada tool y recolectar resultados
    const toolResults = [];
    for (const toolCall of toolCalls) {
      try {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        console.log(`Tool solicitado: ${functionName}`, functionArgs);

        // Verificar si la función existe localmente en toolFunctions
        if (toolFunctions[functionName]) {
          console.log(`Ejecutando ${functionName} localmente...`);
          const result = await toolFunctions[functionName](functionArgs);

          // Añadir resultado al array
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify(result)
          });

          console.log(`Resultado de ${functionName}:`, result);

          // NO mostrar output en la UI aquí - dejamos que el modelo lo interprete
          // y lo incluya en su respuesta final
          console.log(`✓ Tool ${functionName} ejecutado exitosamente`);
        } else {
          // Si no existe localmente, es un tool de MCP manejado por LM Studio
          console.log(`${functionName} es manejado por LM Studio MCP`);

          // Para tools de MCP, simplemente agregamos un placeholder
          // LM Studio manejará la ejecución real
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify({
              status: "mcp_handled",
              message: "Tool ejecutado por LM Studio MCP"
            })
          });

          // Mostrar indicador visual
          if (messageId) {
            const toolOutput = document.createElement('div');
            toolOutput.className = 'tool-output';
            toolOutput.innerHTML = `
              <div class="tool-output-header">📅 ${functionName}</div>
              <div class="tool-output-content">Ejecutando a través de Google Calendar MCP...</div>
            `;
            const messageDiv = document.getElementById(messageId);
            if (messageDiv) {
              messageDiv.appendChild(toolOutput);
            }
          }
        }
      } catch (error) {
        console.error(`Error ejecutando tool ${toolCall.function.name}:`, error);
        // Añadir resultado de error
        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: toolCall.function.name,
          content: JSON.stringify({ error: error.message })
        });
      }
    }

    console.log(`✓ ${toolCalls.length} tool(s) ejecutado(s)`);

    // Ocultar "Calling tool..." antes de continuar
    hideCallingToolMessage();

    // Continuar la conversación con los resultados de los tools
    await continueConversationWithToolResults(toolResults, toolCalls, originalMessage, noThinkEnabled);

  } catch (error) {
    console.error('Error en executeToolCalls:', error);
    addMessage('assistant', `Error ejecutando tools: ${error.message}`);
  } finally {
    isLoading = false;
    messageInput.focus();
    processQueue();
  }
}

// Continuar la conversación con los resultados de los tools
async function continueConversationWithToolResults(toolResults, toolCalls, originalMessage, noThinkEnabled) {
  isLoading = true;
  const loadingId = addLoadingMessage();

  try {
    // Construir mensajes sin historial: solo el mensaje actual + tool calls + tool results
    const messages = [];

    // Si noThink está activado, añadir instrucción de sistema MÁS FUERTE
    if (noThinkEnabled) {
      messages.push({
        role: 'system',
        content: 'IMPORTANT: You must respond directly without using any <think> or </think> tags. Never show your reasoning process. Do not use thinking tags under any circumstances. Provide only the final answer.'
      });
      messages.push(
        { role: 'user', content: originalMessage + '\n\n(Remember: Respond without <think> tags)' },
        {
          role: 'assistant',
          content: null,
          tool_calls: toolCalls
        },
        ...toolResults
      );
    } else {
      messages.push(
        { role: 'user', content: originalMessage },
        {
          role: 'assistant',
          content: null,
          tool_calls: toolCalls
        },
        ...toolResults
      );
    }

    const requestBody = {
      messages: messages,
      temperature: config.temperature,
      stream: true
    };

    // NO añadir stop sequences - interfieren con la generación
    // El modelo debe poder generar libremente

    // Incluir tools si están disponibles
    if (availableTools.length > 0) {
      requestBody.tools = availableTools;
      requestBody.tool_choice = 'auto';
    }

    const response = await fetch(`${config.apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    removeLoadingMessage(loadingId);

    // Stream la respuesta
    let fullResponse = '';
    let messageId = null;
    let buffer = '';
    let newToolCalls = [];
    // Reset global variables for think tag detection
    isInsideThink = false;
    thinkingContent = '';
    console.log('[DEBUG] Starting continueConversationWithToolResults - reset think variables');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices[0]?.delta;

            // Manejar nuevos tool_calls
            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                const index = toolCall.index || 0;
                if (!newToolCalls[index]) {
                  newToolCalls[index] = {
                    id: toolCall.id || '',
                    type: toolCall.type || 'function',
                    function: {
                      name: toolCall.function?.name || '',
                      arguments: toolCall.function?.arguments || ''
                    }
                  };
                } else {
                  if (toolCall.function?.arguments) {
                    newToolCalls[index].function.arguments += toolCall.function.arguments;
                  }
                  if (toolCall.function?.name) {
                    newToolCalls[index].function.name += toolCall.function.name;
                  }
                  if (toolCall.id) {
                    newToolCalls[index].id += toolCall.id;
                  }
                }
              }
            }

            const content = delta?.content;
            if (content) {
              buffer += content;
              fullResponse += content;

              // Log cada chunk recibido en tool response (reducido)
              if (fullResponse.length < 100) {
                console.log('🔧 [TOOL STREAM]:', content.substring(0, 30) + (content.length > 30 ? '...' : ''));
              }

              // Si debug mode está activado, mostrar todo sin procesar tags
              if (config.debugMode) {
                if (!messageId) {
                  messageId = createStreamingMessage();
                }
                updateStreamingMessage(messageId, buffer);
              }
              // Si NO hay tags <think> en el buffer, mostrar contenido normal
              else if (!buffer.includes('<think>') && !isInsideThink) {
                if (!messageId) {
                  messageId = createStreamingMessage();
                }
                updateStreamingMessage(messageId, buffer);
              }
              // Procesar tags <think> si existen
              else {
                // Check for <think> opening tag
                if (buffer.includes('<think>') && !isInsideThink) {
                  console.log('[DEBUG] <think> tag detected in continueConversation, showing thinking message');
                  const thinkIndex = buffer.indexOf('<think>');

                  // First, display any content BEFORE the <think> tag
                  const beforeThink = buffer.substring(0, thinkIndex);
                  if (beforeThink.trim()) {
                    if (!messageId) {
                      messageId = createStreamingMessage();
                    }
                    updateStreamingMessage(messageId, beforeThink);
                  }

                  // Now enter thinking mode
                  showThinkingMessage();
                  isInsideThink = true;
                  buffer = buffer.substring(thinkIndex + 7); // Remove <think> and content before it
                  console.log('[DEBUG] isInsideThink set to true, buffer after <think>:', buffer.substring(0, 50));
                }

                // If we're inside think, accumulate content
                if (isInsideThink) {
                  console.log('[DEBUG] Inside think mode, buffer length:', buffer.length);
                  // Check for closing tag
                  if (buffer.includes('</think>')) {
                    console.log('[DEBUG] </think> tag detected, hiding thinking message');
                    const closeIndex = buffer.indexOf('</think>');
                    const thinkText = buffer.substring(0, closeIndex);
                    thinkingContent += thinkText;

                    hideThinkingMessage();
                    isInsideThink = false;

                    // Start normal message with remaining content
                    buffer = buffer.substring(closeIndex + 8); // Remove </think>
                    console.log('[DEBUG] Remaining buffer after </think>:', buffer.substring(0, 100));

                    // Create the actual message now if there's content
                    if (buffer.trim()) {
                      if (!messageId) {
                        messageId = createStreamingMessage();
                      }
                      updateStreamingMessage(messageId, buffer);
                    }
                  } else {
                    // Still inside think, just accumulate
                    thinkingContent += content;
                  }
                }
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    // Ensure thinking message is hidden
    if (thinkingMessageElement) {
      console.log('[DEBUG] Force hiding thinking message at end');
      hideThinkingMessage();
    }

    // Log de respuesta completa después de tool calls en terminal
    console.log('\n═══════════════════════════════════════════════');
    console.log('🔧 [TOOL RESPONSE COMPLETE]');
    console.log('Length:', fullResponse.length, 'characters');
    console.log('Has <think> tags:', fullResponse.includes('<think>'));
    console.log('New tool calls:', newToolCalls.length);
    console.log('───────────────────────────────────────────────');
    console.log('Response:');
    console.log(fullResponse);
    console.log('═══════════════════════════════════════════════\n');

    // Si hay más tool_calls, ejecutarlos recursivamente
    if (newToolCalls.length > 0) {
      // Nota: Las tool calls recursivas ya no necesitan historial
      await executeToolCalls(newToolCalls, messageId, originalMessage, noThinkEnabled);
    }
    // No guardar en historial - solo mostrar en UI

  } catch (error) {
    console.error('Error continuando conversación:', error);
    removeLoadingMessage(loadingId);
    addMessage('assistant', `Error: ${error.message}`);
  } finally {
    isLoading = false;
    messageInput.focus();
  }
}

// ===== TASK MANAGEMENT SYSTEM =====
// Ahora usamos la API local (tasks-local.js) en lugar de servidor

// State (tasks y sessions ahora se manejan en tasks-local.js)
let currentFilter = 'all';
let currentSession = null;
let sessionTimer = null;
let sessionElapsedSeconds = 0;
let isPaused = false;

// DOM elements for tasks
const tasksList = document.getElementById('tasksList');
const newTaskBtn = document.getElementById('newTaskBtn');
const newSessionBtn = document.getElementById('newSessionBtn');
const taskModal = document.getElementById('taskModal');
const sessionModal = document.getElementById('sessionModal');
const closeTaskModal = document.getElementById('closeTaskModal');
const closeSessionModal = document.getElementById('closeSessionModal');
const cancelTaskModal = document.getElementById('cancelTaskModal');
const cancelSessionModal = document.getElementById('cancelSessionModal');
const saveTask = document.getElementById('saveTask');
const saveSession = document.getElementById('saveSession');
const filterBtns = document.querySelectorAll('.filter-btn');
const sessionPomodoroCheckbox = document.getElementById('sessionPomodoro');
const pomodoroSettings = document.getElementById('pomodoroSettings');
const activeSessionEl = document.getElementById('activeSession');
const sessionNameEl = document.getElementById('sessionName');
const sessionTimerEl = document.getElementById('sessionTimer');
const sessionPlayPauseBtn = document.getElementById('sessionPlayPause');
const sessionStopBtn = document.getElementById('sessionStop');

// Initialize task system
function initTaskSystem() {
  loadTasks();
  loadSessions();
  setupTaskEventListeners();
  renderTasks();

  // Check if there's an active session
  const activeSession = sessions.find(s => s.status === 'activa');
  if (activeSession) {
    resumeSession(activeSession);
  }
}

// Setup event listeners
function setupTaskEventListeners() {
  // New task button
  newTaskBtn.addEventListener('click', openNewTaskModal);

  // New session button
  newSessionBtn.addEventListener('click', () => {
    sessionModal.classList.remove('hidden');
    initLucideIcons();
  });

  // Close modals
  closeTaskModal.addEventListener('click', () => taskModal.classList.add('hidden'));
  closeSessionModal.addEventListener('click', () => sessionModal.classList.add('hidden'));
  cancelTaskModal.addEventListener('click', () => taskModal.classList.add('hidden'));
  cancelSessionModal.addEventListener('click', () => sessionModal.classList.add('hidden'));

  // Save task
  saveTask.addEventListener('click', handleSaveTask);

  // Save session
  saveSession.addEventListener('click', handleSaveSession);

  // Filter buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  // Priority selector buttons
  const priorityBtns = document.querySelectorAll('.priority-btn');
  priorityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      priorityBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Pomodoro checkbox
  sessionPomodoroCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      pomodoroSettings.classList.remove('hidden');
    } else {
      pomodoroSettings.classList.add('hidden');
    }
  });

  // Session controls
  sessionPlayPauseBtn.addEventListener('click', toggleSessionPause);
  sessionStopBtn.addEventListener('click', stopSession);

  // Event delegation para task actions (SEGURIDAD: previene XSS en onclick)
  tasksList.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const taskId = button.dataset.taskId;

    if (!taskId) return;

    switch (action) {
      case 'toggle-complete':
        toggleTaskComplete(taskId);
        break;
      case 'edit':
        editTask(taskId);
        break;
      case 'delete':
        deleteTask(taskId);
        break;
    }
  });
}

// Load tasks from local storage
function loadTasks() {
  try {
    tasks = window.tasksAPI.getTasks();
  } catch (error) {
    console.error('Error loading tasks:', error);
    tasks = [];
  }
}

// Load sessions from local storage
function loadSessions() {
  try {
    sessions = window.tasksAPI.getSessions();
  } catch (error) {
    console.error('Error loading sessions:', error);
    sessions = [];
  }
}

// Render tasks
function renderTasks() {
  const filteredTasks = currentFilter === 'all'
    ? tasks
    : tasks.filter(t => t.status === currentFilter);

  if (filteredTasks.length === 0) {
    tasksList.innerHTML = `
      <div class="tasks-empty">
        <i data-lucide="clipboard-list"></i>
        <p>No hay tareas ${currentFilter === 'all' ? '' : 'en esta categoría'}</p>
      </div>
    `;
    initLucideIcons();
    return;
  }

  tasksList.innerHTML = filteredTasks.map(task => `
    <div class="task-card ${task.status === 'completada' ? 'completed' : ''}" data-task-id="${task.id}">
      <div class="task-card-header">
        <div>
          <div class="task-card-title">${escapeHtml(task.title)}</div>
          ${task.description ? `<div class="task-card-description">${escapeHtml(task.description)}</div>` : ''}
        </div>
        <div class="task-priority ${task.priority}">
          <i data-lucide="${getPriorityIcon(task.priority)}"></i>
          ${task.priority}
        </div>
      </div>

      <div class="task-card-footer">
        <div style="display: flex; gap: 9px; flex-wrap: wrap; align-items: center;">
          <span style="font-size: 12px; color: #888;">${task.category}</span>
          ${task.tags && task.tags.length > 0 ? `
            <div class="task-tags">
              ${task.tags.map(tag => `<span class="task-tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
          ` : ''}
          ${task.deadline ? `
            <div class="task-deadline ${isOverdue(task.deadline) ? 'overdue' : ''}">
              <i data-lucide="calendar"></i>
              <span>${formatDeadline(task.deadline)}</span>
            </div>
          ` : ''}
        </div>

        <div class="task-actions">
          <button class="task-action-btn complete-btn" data-action="toggle-complete" data-task-id="${escapeHtml(task.id)}">
            <i data-lucide="${task.status === 'completada' ? 'rotate-ccw' : 'check'}"></i>
          </button>
          <button class="task-action-btn" data-action="edit" data-task-id="${escapeHtml(task.id)}">
            <i data-lucide="edit"></i>
          </button>
          <button class="task-action-btn delete-btn" data-action="delete" data-task-id="${escapeHtml(task.id)}">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  initLucideIcons();
}

// Open new task modal
function openNewTaskModal() {
  document.getElementById('taskId').value = '';
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskDescription').value = '';
  document.getElementById('taskCategory').value = 'Trabajo';
  document.getElementById('taskDeadline').value = '';
  document.getElementById('taskTags').value = '';
  document.getElementById('taskModalTitle').textContent = 'Nueva tarea';

  // Reset priority
  const priorityBtns = document.querySelectorAll('.priority-btn');
  priorityBtns.forEach(btn => btn.classList.remove('active'));
  document.querySelector('.priority-btn[data-priority="media"]').classList.add('active');

  taskModal.classList.remove('hidden');
  initLucideIcons();
}

// Handle save task
function handleSaveTask() {
  const id = document.getElementById('taskId').value;
  const title = document.getElementById('taskTitle').value.trim();
  const description = document.getElementById('taskDescription').value.trim();
  const category = document.getElementById('taskCategory').value;
  const deadline = document.getElementById('taskDeadline').value;
  const tagsInput = document.getElementById('taskTags').value.trim();
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [];
  const priority = document.querySelector('.priority-btn.active').dataset.priority;

  if (!title) {
    alert('El título es obligatorio');
    return;
  }

  const taskData = {
    title,
    description,
    category,
    deadline: deadline || null,
    tags,
    priority
  };

  try {
    if (id) {
      // Update existing task
      const updated = window.tasksAPI.updateTask(id, taskData);
      if (updated) {
        const index = tasks.findIndex(t => t.id === id);
        if (index !== -1) {
          tasks[index] = updated;
        }
      }
    } else {
      // Create new task
      const newTask = window.tasksAPI.createTask(taskData);
      tasks.push(newTask);
    }

    taskModal.classList.add('hidden');
    renderTasks();
  } catch (error) {
    console.error('Error saving task:', error);
    alert('Error al guardar la tarea');
  }
}

// Handle save session
function handleSaveSession() {
  const name = document.getElementById('sessionNameInput').value.trim();
  const description = document.getElementById('sessionDescription').value.trim();
  const pomodoroEnabled = sessionPomodoroCheckbox.checked;
  const pomodoroWork = parseInt(document.getElementById('pomodoroWork').value) || 25;
  const pomodoroBreak = parseInt(document.getElementById('pomodoroBreak').value) || 5;

  if (!name) {
    alert('El nombre de la sesión es obligatorio');
    return;
  }

  const sessionData = {
    name,
    description,
    pomodoroEnabled,
    pomodoroWorkMinutes: pomodoroWork,
    pomodoroBreakMinutes: pomodoroBreak,
    startTime: new Date().toISOString(),
    status: 'activa'
  };

  try {
    const newSession = window.tasksAPI.createSession(sessionData);
    sessions.push(newSession);
    sessionModal.classList.add('hidden');
    startSession(newSession);
  } catch (error) {
    console.error('Error creating session:', error);
    alert(`Error al crear la sesión: ${error.message}`);
  }
}

// Start session
function startSession(session) {
  // CRÍTICO: Limpiar interval anterior para prevenir memory leak
  if (sessionTimer) {
    console.log('[SESSION] Clearing previous session timer');
    clearInterval(sessionTimer);
    sessionTimer = null;
  }

  currentSession = session;
  sessionElapsedSeconds = 0;
  isPaused = false;

  activeSessionEl.classList.remove('hidden');
  sessionNameEl.textContent = session.name;
  updateSessionTimer();

  sessionTimer = setInterval(() => {
    if (!isPaused) {
      sessionElapsedSeconds++;
      updateSessionTimer();
    }
  }, 1000);

  updateSessionPlayPauseIcon();
}

// Resume session
function resumeSession(session) {
  // CRÍTICO: Limpiar interval anterior para prevenir memory leak
  if (sessionTimer) {
    console.log('[SESSION] Clearing previous session timer on resume');
    clearInterval(sessionTimer);
    sessionTimer = null;
  }

  currentSession = session;
  const startTime = new Date(session.startTime);
  sessionElapsedSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
  isPaused = false;

  activeSessionEl.classList.remove('hidden');
  sessionNameEl.textContent = session.name;
  updateSessionTimer();

  sessionTimer = setInterval(() => {
    if (!isPaused) {
      sessionElapsedSeconds++;
      updateSessionTimer();
    }
  }, 1000);

  updateSessionPlayPauseIcon();
}

// Toggle session pause
function toggleSessionPause() {
  isPaused = !isPaused;
  updateSessionPlayPauseIcon();
}

// Update play/pause icon
function updateSessionPlayPauseIcon() {
  const icon = sessionPlayPauseBtn.querySelector('i');
  icon.setAttribute('data-lucide', isPaused ? 'play' : 'pause');
  initLucideIcons();
}

// Stop session
function stopSession() {
  if (!currentSession) return;

  const confirmStop = confirm('¿Quieres finalizar esta sesión?');
  if (!confirmStop) return;

  clearInterval(sessionTimer);

  try {
    const updated = window.tasksAPI.updateSession(currentSession.id, {
      status: 'completada',
      endTime: new Date().toISOString(),
      totalMinutes: Math.floor(sessionElapsedSeconds / 60)
    });

    if (updated) {
      const index = sessions.findIndex(s => s.id === currentSession.id);
      if (index !== -1) {
        sessions[index] = updated;
      }
    }
  } catch (error) {
    console.error('Error stopping session:', error);
  }

  activeSessionEl.classList.add('hidden');
  currentSession = null;
  sessionTimer = null;
  sessionElapsedSeconds = 0;
}

// Update session timer display
function updateSessionTimer() {
  const hours = Math.floor(sessionElapsedSeconds / 3600);
  const minutes = Math.floor((sessionElapsedSeconds % 3600) / 60);
  const seconds = sessionElapsedSeconds % 60;

  const timeStr = hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;

  sessionTimerEl.textContent = timeStr;
}

// Pad number with zero
function pad(num) {
  return num.toString().padStart(2, '0');
}

// Toggle task complete
window.toggleTaskComplete = function(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const newStatus = task.status === 'completada' ? 'pendiente' : 'completada';

  try {
    const updated = window.tasksAPI.updateTask(taskId, { status: newStatus });
    if (updated) {
      const index = tasks.findIndex(t => t.id === taskId);
      if (index !== -1) {
        tasks[index] = updated;
      }
      renderTasks();
    }
  } catch (error) {
    console.error('Error updating task:', error);
  }
};

// Edit task
window.editTask = function(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  document.getElementById('taskId').value = task.id;
  document.getElementById('taskTitle').value = task.title;
  document.getElementById('taskDescription').value = task.description || '';
  document.getElementById('taskCategory').value = task.category;
  document.getElementById('taskDeadline').value = task.deadline ? task.deadline.slice(0, 16) : '';
  document.getElementById('taskTags').value = task.tags ? task.tags.join(', ') : '';
  document.getElementById('taskModalTitle').textContent = 'Editar tarea';

  // Set priority
  const priorityBtns = document.querySelectorAll('.priority-btn');
  priorityBtns.forEach(btn => {
    if (btn.dataset.priority === task.priority) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  taskModal.classList.remove('hidden');
  initLucideIcons();
};

// Delete task
window.deleteTask = function(taskId) {
  const confirmDelete = confirm('¿Estás seguro de eliminar esta tarea?');
  if (!confirmDelete) return;

  try {
    const success = window.tasksAPI.deleteTask(taskId);
    if (success) {
      tasks = tasks.filter(t => t.id !== taskId);
      renderTasks();
    }
  } catch (error) {
    console.error('Error deleting task:', error);
  }
};

// Helper functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getPriorityIcon(priority) {
  switch (priority) {
    case 'alta': return 'chevron-up';
    case 'media': return 'minus';
    case 'baja': return 'chevron-down';
    default: return 'minus';
  }
}

function isOverdue(deadline) {
  return new Date(deadline) < new Date();
}

function formatDeadline(deadline) {
  const date = new Date(deadline);
  const now = new Date();
  const diffMs = date - now;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Vencida';
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Mañana';
  if (diffDays < 7) return `${diffDays} días`;

  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// ===== ERROR BOUNDARY =====
// Global error handler para catchear errores no manejados
window.addEventListener('error', (event) => {
  console.error('[GLOBAL ERROR]', event.error);

  // Mostrar mensaje de error al usuario
  const errorMsg = event.error?.message || 'Error desconocido';
  addMessage('assistant', `❌ Error crítico: ${errorMsg}`);

  // Intentar recuperar el estado
  try {
    isLoading = false;
    messageInput.disabled = false;
    messageInput.focus();
  } catch (e) {
    console.error('[ERROR RECOVERY FAILED]', e);
  }

  // Prevenir que el error crashee la app
  event.preventDefault();
});

// Handler para promesas rechazadas no manejadas
window.addEventListener('unhandledrejection', (event) => {
  console.error('[UNHANDLED PROMISE REJECTION]', event.reason);

  const errorMsg = event.reason?.message || String(event.reason) || 'Promise rejected';
  addMessage('assistant', `❌ Error asíncrono: ${errorMsg}`);

  // Intentar recuperar el estado
  try {
    isLoading = false;
    messageInput.disabled = false;
    messageInput.focus();
  } catch (e) {
    console.error('[ERROR RECOVERY FAILED]', e);
  }

  // Prevenir que la promise rejection crashee la app
  event.preventDefault();
});

// Iniciar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  try {
    init();
    initTaskSystem();
  } catch (error) {
    console.error('[INITIALIZATION ERROR]', error);
    alert('Error al inicializar la aplicación. Por favor, recarga la página.');
  }
});