// Manejo del redimensionamiento entre tareas y chat

let isResizing = false;
let startY = 0;
let startTasksHeight = 0;
let startChatHeight = 0;

function initResize() {
  const resizeHandle = document.getElementById('resizeHandle');
  const tasksPanel = document.querySelector('.tasks-panel');
  const chatPanel = document.querySelector('.chat-panel');
  const mainContainer = document.querySelector('.main-container');

  if (!resizeHandle || !tasksPanel || !chatPanel) {
    console.warn('Resize elements not found');
    return;
  }

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startY = e.clientY;

    // Obtener tamaños actuales
    const tasksRect = tasksPanel.getBoundingClientRect();
    const chatRect = chatPanel.getBoundingClientRect();
    startTasksHeight = tasksRect.height;
    startChatHeight = chatRect.height;

    // Cambiar cursor globalmente
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const deltaY = e.clientY - startY;
    const containerHeight = mainContainer.getBoundingClientRect().height;
    const resizeHandleHeight = 8; // altura del handle

    // Calcular nuevas alturas
    let newTasksHeight = startTasksHeight + deltaY;
    let newChatHeight = startChatHeight - deltaY;

    // Límites mínimos y máximos
    const minTasksHeight = 200;
    const minChatHeight = 150;
    const maxTasksHeight = containerHeight - minChatHeight - resizeHandleHeight;
    const maxChatHeight = containerHeight - minTasksHeight - resizeHandleHeight;

    // Aplicar límites
    if (newTasksHeight < minTasksHeight) {
      newTasksHeight = minTasksHeight;
      newChatHeight = containerHeight - minTasksHeight - resizeHandleHeight;
    } else if (newTasksHeight > maxTasksHeight) {
      newTasksHeight = maxTasksHeight;
      newChatHeight = minChatHeight;
    }

    // Calcular flex-grow basado en las proporciones
    const totalHeight = newTasksHeight + newChatHeight;
    const tasksFlexRatio = newTasksHeight / totalHeight;
    const chatFlexRatio = newChatHeight / totalHeight;

    // Aplicar nuevos flex values
    tasksPanel.style.flex = `${tasksFlexRatio * 2.5}`;
    chatPanel.style.flex = `${chatFlexRatio * 2.5}`;

    e.preventDefault();
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initResize);
} else {
  initResize();
}
