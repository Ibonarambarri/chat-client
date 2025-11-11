const { app, BrowserWindow, globalShortcut, screen } = require('electron');
const path = require('path');

let chatWindow = null;
let isVisible = false;

// Ocultar el icono del dock en macOS
if (process.platform === 'darwin') {
  app.dock.hide();
}

function createChatWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // Ventana pequeña en la esquina inferior derecha
  const windowWidth = 480;
  const windowHeight = 480;
  const margin = 20;

  chatWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: width - windowWidth - margin,
    y: height - windowHeight - margin,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
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

  // Ocultar ventana al perder foco (opcional, comenta si no lo quieres)
  chatWindow.on('blur', () => {
    // Comentado para que no se oculte al hacer clic fuera
    // toggleWindow();
  });

  chatWindow.on('closed', () => {
    chatWindow = null;
  });
}

function toggleWindow() {
  if (!chatWindow) {
    createChatWindow();
  }

  if (isVisible) {
    chatWindow.hide();
    isVisible = false;
    if (process.platform === 'darwin') {
      app.dock.hide();
    }
  } else {
    // Obtener la pantalla actual del cursor
    const cursorPoint = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
    const { width, height } = currentDisplay.workArea;

    // Reposicionar la ventana en el escritorio actual
    const windowWidth = 480;
    const windowHeight = 480;
    const margin = 20;

    chatWindow.setPosition(
      currentDisplay.workArea.x + width - windowWidth - margin,
      currentDisplay.workArea.y + height - windowHeight - margin
    );

    chatWindow.show();
    chatWindow.focus();
    isVisible = true;

    if (process.platform === 'darwin') {
      app.dock.hide();
    }
  }
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
