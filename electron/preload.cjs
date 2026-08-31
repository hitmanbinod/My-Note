const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  startGoogleAuth: (authUrl, redirectUri) =>
    ipcRenderer.invoke('google-auth:start', authUrl, redirectUri)
});
