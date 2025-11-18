const { app, BrowserWindow, globalShortcut, screen } = require('electron');
const path = require('path');

// Window configuration constants
const WINDOW_WIDTH = 480;
const WINDOW_MARGIN = 20;

let chatWindow = null;
let isVisible = false;

// Ocultar el icono del dock en macOS
if (process.platform === 'darwin') {
  app.dock.hide();
}

function createChatWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // Ventana con toda la altura en el lado derecho
  chatWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: height, // Toda la altura de la pantalla
    x: width, // Empieza fuera de la pantalla (derecha)
    y: 0, // Desde arriba
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false, // Desactivar resize para mantener consistencia
    show: false,
    backgroundColor: '#00000000',
    visibleOnAllWorkspaces: true,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  chatWindow.loadFile('index.html');

  // Mantener la ventana en todos los espacios de trabajo
  // La opción visibleOnFullScreen solo está disponible en macOS
  if (process.platform === 'darwin') {
    chatWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } else {
    chatWindow.setVisibleOnAllWorkspaces(true);
  }

  chatWindow.on('closed', () => {
    chatWindow = null;
  });
}

function toggleWindow() {
  if (!chatWindow) {
    createChatWindow();
  }

  if (isVisible) {
    // Animación de salida: slide hacia la derecha
    const cursorPoint = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
    const { width, height } = currentDisplay.workArea;

    const startX = currentDisplay.workArea.x + width - WINDOW_WIDTH;
    const endX = currentDisplay.workArea.x + width; // Fuera de la pantalla
    const yPos = currentDisplay.workArea.y;

    animateWindow(startX, endX, yPos, 200, () => {
      chatWindow.hide();
      isVisible = false;
    });

    if (process.platform === 'darwin') {
      app.dock.hide();
    }
  } else {
    // Obtener la pantalla actual del cursor
    const cursorPoint = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
    const { width, height } = currentDisplay.workArea;

    // Posición inicial (fuera de la pantalla a la derecha)
    const startX = currentDisplay.workArea.x + width;
    const endX = currentDisplay.workArea.x + width - WINDOW_WIDTH;
    const yPos = currentDisplay.workArea.y;

    // Posicionar fuera de la pantalla y mostrar
    chatWindow.setPosition(startX, yPos);
    chatWindow.show();
    chatWindow.focus();

    // Animación de entrada: slide desde la derecha
    animateWindow(startX, endX, yPos, 200, () => {
      isVisible = true;
    });

    if (process.platform === 'darwin') {
      app.dock.hide();
    }
  }
}

// Función para animar la ventana
function animateWindow(startX, endX, yPos, duration, callback) {
  const startTime = Date.now();
  const distance = endX - startX;

  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function (ease-out cubic)
    const eased = 1 - Math.pow(1 - progress, 3);

    const currentX = Math.round(startX + distance * eased);
    chatWindow.setPosition(currentX, yPos);

    if (progress < 1) {
      setTimeout(animate, 16); // ~60fps
    } else {
      if (callback) callback();
    }
  }

  animate();
}

app.whenReady().then(() => {
  createChatWindow();

  // Registrar hotkey global: Option + Espacio
  // En macOS: Alt = Option
  const ret = globalShortcut.register('Alt+Space', () => {
    toggleWindow();
  });

  if (!ret) {
    console.log('Registro del hotkey falló');
  }

  console.log('Hotkey Option+Espacio registrado correctamente');
  console.log('Presiona Option+Espacio para mostrar/ocultar el chat');
});

app.on('window-all-closed', () => {
  // No hacer nada - mantener la app corriendo en background
  // La app solo se cierra explícitamente con Cmd+Q
});

app.on('activate', () => {
  if (!chatWindow) {
    createChatWindow();
  }
});

app.on('will-quit', () => {
  // Desregistrar todos los atajos
  globalShortcut.unregisterAll();
});
