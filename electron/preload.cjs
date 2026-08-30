const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  startGoogleAuth: (authUrl) => ipcRenderer.invoke('google-auth:start', authUrl)
});
