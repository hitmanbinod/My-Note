const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  startGoogleAuth: (authUrl, redirectUri) =>
    ipcRenderer.invoke('google-auth:start', authUrl, redirectUri),
  // Edit menu bridges — the main process runs the native commands on the
  // focused element, so they work for both the rich editor and plain inputs.
  editCut: () => ipcRenderer.invoke('edit:cut'),
  editCopy: () => ipcRenderer.invoke('edit:copy'),
  editPaste: () => ipcRenderer.invoke('edit:paste'),
  editPasteAndMatchStyle: () => ipcRenderer.invoke('edit:pasteAndMatchStyle'),
  editSelectAll: () => ipcRenderer.invoke('edit:selectAll'),
  // Native window-button strip recolor (follows app theme)
  updateTitlebar: (color, symbolColor) => ipcRenderer.invoke('titlebar:update', { color, symbolColor }),
  copyRich: (html, text) => ipcRenderer.invoke('clipboard:copyRich', html, text),
  // Local backup folder access (UpNote-style backups)
  backupSelectFolder: () => ipcRenderer.invoke('backup:selectFolder'),
  backupWrite: (args) => ipcRenderer.invoke('backup:write', args),
  backupList: (dir) => ipcRenderer.invoke('backup:list', dir),
  backupRead: (path) => ipcRenderer.invoke('backup:read', path),
  backupOpenFolder: (dir) => ipcRenderer.invoke('backup:openFolder', dir),
  importOpenFile: () => ipcRenderer.invoke('import:openFile'),
  // App auto-update (electron-updater via GitHub Releases)
  checkForAppUpdate: () => ipcRenderer.invoke('app:update:check'),
  installAppUpdate: () => ipcRenderer.invoke('app:update:install'),
  onAppUpdateStatus: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('app:update:status', handler);
    return () => ipcRenderer.removeListener('app:update:status', handler);
  }
});
