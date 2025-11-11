// Configuración
let config = {
  apiUrl: localStorage.getItem('apiUrl') || 'http://localhost:1234',
  temperature: parseFloat(localStorage.getItem('temperature')) || 0.7,
  noThink: localStorage.getItem('noThink') !== 'false' // Vuelve a gestionar el estado
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
const temperatureInput = document.getElementById('temperature');
const tempValueSpan = document.getElementById('tempValue');
const noThinkCheckbox = document.getElementById('noThink'); // Vuelve a añadir el checkbox
const suggestionsWindow = document.getElementById('suggestionsWindow');
const suggestionsList = document.getElementById('suggestionsList');
const queueContainer = document.getElementById('queueContainer');
const thinkingIndicator = document.getElementById('thinkingIndicator');
const thinkingMessage = document.getElementById('thinkingMessage');

// Thinking state
let isInsideThink = false;
let thinkingContent = '';
let currentThinkingMessageId = null;

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

// Inicializar
function init() {
  loadSettings();
  setupEventListeners();
  initLucideIcons();
}

// Cargar configuración
function loadSettings() {
  apiUrlInput.value = config.apiUrl;
  temperatureInput.value = config.temperature;
  tempValueSpan.textContent = config.temperature;
  noThinkCheckbox.checked = config.noThink; // Carga el estado
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

  // Update thinking indicator when checkbox changes
  noThinkCheckbox.addEventListener('change', () => {
    updateThinkingIndicator();
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
  chatHistory = []; // Limpia el historial en memoria
  messagesContainer.innerHTML = '';
  resultsWindow.classList.add('hidden');
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

// Thinking message functions
function showThinkingMessage() {
  thinkingMessage.classList.remove('hidden');
  thinkingContent = '';
  isInsideThink = true;
}

function hideThinkingMessage() {
  thinkingMessage.classList.add('hidden');
  isInsideThink = false;
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
  config.apiUrl = apiUrlInput.value.trim().replace(/\/$/, ''); // Eliminar barra final
  config.temperature = parseFloat(temperatureInput.value);
  config.noThink = noThinkCheckbox.checked; // Guarda el estado del interruptor

  localStorage.setItem('apiUrl', config.apiUrl);
  localStorage.setItem('temperature', config.temperature);
  localStorage.setItem('noThink', config.noThink); // Persiste el estado

  settingsWindow.classList.add('hidden');

  // Si hay historial de chat, mostrar la ventana de resultados
  if (chatHistory.length > 0) {
    resultsWindow.classList.remove('hidden');
  }

  checkAPIHealth();
}

// Verificar salud de la API de LM Studio
async function checkAPIHealth() {
  try {
    // El endpoint /v1/models es una buena forma de ver si el servidor está activo
    const response = await fetch(`${config.apiUrl}/v1/models`);

    if (response.ok) {
      statusDot.classList.remove('disconnected');
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

// Enviar mensaje
async function sendMessage(message) {
  // Mostrar ventana de resultados
  resultsWindow.classList.remove('hidden');

  // 1. Añadir mensaje del usuario SOLO a la UI
  addMessage('user', message);

  // Marcar como loading
  isLoading = true;

  // Mostrar loading
  const loadingId = addLoadingMessage();

  try {
    // 2. Preparar el contenido del mensaje para la API
    let messageContent = message;
    if (config.noThink) {
      messageContent += " /no_think"; // Añade la etiqueta si está activado
    }

    // 3. Preparar el array de mensajes para enviar
    const messagesToSend = [
      ...chatHistory, // El historial ANTIGUO
      { role: 'user', content: messageContent } // El nuevo mensaje con la etiqueta
    ];

    // Crear controlador de timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

    // 4. Llamar a la API de LM Studio
    const response = await fetch(`${config.apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messagesToSend,
        temperature: config.temperature,
        stream: true // Enable streaming
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

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
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              buffer += content;
              fullResponse += content;

              // Check for <think> opening tag
              if (buffer.includes('<think>') && !isInsideThink) {
                showThinkingMessage();
                const thinkIndex = buffer.indexOf('<think>');
                buffer = buffer.substring(thinkIndex + 7); // Remove <think>
              }

              // If we're inside think, accumulate content
              if (isInsideThink) {
                // Check for closing tag
                if (buffer.includes('</think>')) {
                  const closeIndex = buffer.indexOf('</think>');
                  const thinkText = buffer.substring(0, closeIndex);
                  thinkingContent += thinkText;

                  hideThinkingMessage();

                  // Start normal message with remaining content
                  buffer = buffer.substring(closeIndex + 8); // Remove </think>

                  // Create the actual message now
                  if (!messageId) {
                    messageId = createStreamingMessage();
                  }
                  updateStreamingMessage(messageId, buffer);
                } else {
                  // Still inside think, just accumulate
                  thinkingContent += content;
                }
              } else {
                // Normal streaming outside think tags
                if (!messageId) {
                  messageId = createStreamingMessage();
                }
                updateStreamingMessage(messageId, buffer);
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    // Ensure thinking message is hidden
    if (!thinkingMessage.classList.contains('hidden')) {
      hideThinkingMessage();
    }

    // 7. ACTUALIZAR el historial en memoria AHORA
    chatHistory.push({ role: 'user', content: message }); // El mensaje original, SIN la etiqueta
    chatHistory.push({ role: 'assistant', content: fullResponse });

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
    isLoading = false;
    messageInput.focus();
    // Continuar procesando la cola si hay más mensajes
    processQueue();
  }
}

// Parse content with <think> tags and markdown
function parseContent(content) {
  // Simply remove all <think> tags and return clean content
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
  messagesContainer.appendChild(messageDiv);

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

  messagesContainer.appendChild(messageDiv);
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