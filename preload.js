const { contextBridge } = require('electron');

// Exponer API segura al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Aquí puedes agregar funciones si necesitas comunicación con el proceso principal
  platform: process.platform
});
