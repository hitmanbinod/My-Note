const { app } = require('electron');
const path = require('node:path');
const brand = require('../brand.json');

// DO NOT CHANGE: keeps existing user data after the rename (see PROGRESS.md Decisions).
// Electron derives the data folder from productName — pinning it to the legacy
// folder before anything reads app paths prevents users' notes from "vanishing".
app.setPath('userData', path.join(app.getPath('appData'), brand.legacyUserDataDir));

const { BrowserWindow, shell, ipcMain, clipboard, dialog } = require('electron');
const fs = require('node:fs/promises');
const http = require('node:http');
const { URL } = require('node:url');

let mainWindow = null;
let autoUpdaterRef = null;

// ---- Auto-update (electron-updater): check on launch + every 6 hours,
// download silently in the background, install when the app closes.
// The feed is GitHub Releases (see "publish" in package.json). ----
function setupAutoUpdate() {
  if (!app.isPackaged) return; // never in `npm run desktop` dev runs
  let autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch {
    return; // updater missing — keep the app running without it
  }
  autoUpdaterRef = autoUpdater;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = null;

  const push = (state, info) => mainWindow?.webContents.send('app:update:status', { state, info });
  autoUpdater.on('checking-for-update', () => push('checking'));
  autoUpdater.on('update-available', (info) => push('available', { version: info?.version }));
  autoUpdater.on('update-not-available', () => push('up-to-date'));
  autoUpdater.on('download-progress', (progress) => push('downloading', { percent: Math.round(progress?.percent ?? 0) }));
  autoUpdater.on('update-downloaded', (info) => push('ready', { version: info?.version }));
  autoUpdater.on('error', () => push('error'));

  const check = () => autoUpdater.checkForUpdates().catch(() => undefined);
  ipcMain.handle('app:update:check', () =>
    autoUpdater.checkForUpdates().then((result) => ({ version: result?.updateInfo?.version ?? null })).catch((error) => ({ error: String(error?.message || error) }))
  );
  check();
  setInterval(check, 6 * 60 * 60 * 1000);
}

ipcMain.handle('app:update:install', () => {
  autoUpdaterRef?.quitAndInstall();
});

// Native edit commands for the renderer's context menu. They act on whatever
// has focus (rich editor selection or a plain input), exactly like Ctrl+X/C/V.
ipcMain.handle('edit:cut', () => mainWindow?.webContents.cut());
// Keep the native window-button strip in step with the theme.
ipcMain.handle('titlebar:update', (_event, { color, symbolColor }) => {
  try {
    if (process.platform === 'win32' && typeof mainWindow?.setTitleBarOverlay === 'function') {
      mainWindow.setTitleBarOverlay({ color, symbolColor, height: 48 });
      return true;
    }
  } catch {
    // Overlay unsupported (e.g. non-Windows) — the renderer bar still matches.
  }
  return false;
});
ipcMain.handle('edit:copy', () => mainWindow?.webContents.copy());
ipcMain.handle('edit:paste', () => mainWindow?.webContents.paste());
ipcMain.handle('edit:pasteAndMatchStyle', () => mainWindow?.webContents.pasteAndMatchStyle());
ipcMain.handle('edit:selectAll', () => mainWindow?.webContents.selectAll());
ipcMain.handle('clipboard:copyRich', (_event, html, text) => {
  if (typeof clipboard.writeHTML === 'function') clipboard.writeHTML(html);
  clipboard.writeText(text ?? '');
});

// ---- Local backups (UpNote-style): notes live as dated JSON files in a
// user-chosen folder, pruned to the configured maximum. ----
const BACKUP_PREFIXES = ['tipot-backup-', 'my-notes-backup-']; // old builds wrote the legacy prefix

ipcMain.handle('backup:selectFolder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'], title: 'Choose backup folder' });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('backup:write', async (_event, { dir, fileName, json, maxCount }) => {
  if (!dir) throw new Error('No backup folder selected');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), json, 'utf8');
  // Prune the oldest backups beyond the limit
  const files = (await fs.readdir(dir)).filter((f) => BACKUP_PREFIXES.some((p) => f.startsWith(p)) && f.endsWith('.json')).sort();
  const excess = files.length - Math.max(1, maxCount);
  for (let i = 0; i < excess; i++) {
    await fs.rm(path.join(dir, files[i]), { force: true });
  }
  return true;
});

ipcMain.handle('backup:list', async (_event, dir) => {
  if (!dir) return [];
  try {
    const files = (await fs.readdir(dir)).filter((f) => f.startsWith(BACKUP_PREFIX) && f.endsWith('.json')).sort().reverse();
    const out = [];
    for (const file of files) {
      const full = path.join(dir, file);
      const stat = await fs.stat(full);
      out.push({ file, path: full, mtimeMs: stat.mtimeMs });
    }
    return out;
  } catch {
    return [];
  }
});

ipcMain.handle('backup:read', async (_event, filePath) => {
  return fs.readFile(filePath, 'utf8');
});

ipcMain.handle('backup:openFolder', async (_event, dir) => {
  if (!dir) return;
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch { /* open anyway */ }
  shell.openPath(dir);
});

ipcMain.handle('import:openFile', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Notes (JSON, Markdown, ENEX, HTML)', extensions: ['json', 'md', 'markdown', 'enex', 'html', 'htm', 'txt'] }
    ]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  const text = await fs.readFile(filePath, 'utf8');
  return { name: path.basename(filePath), path: filePath, text };
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 420,
    minHeight: 500,
    title: brand.name,
    icon: path.join(__dirname, '../build/icon.ico'),
    backgroundColor: '#f6f5f2',
    autoHideMenuBar: true,
    // Merged 48px top bar: the renderer draws the bar, the OS draws the
    // window buttons into the same strip (colors follow the theme via IPC).
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#f6f5f2', symbolColor: '#6b6f75', height: 48 },
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  win.once('ready-to-show', () => win.show());
  mainWindow = win;

  // Right-click menus are drawn by the renderer (editor-aware: formatting,
  // tables, whiteboards). The native menu stays off so the two never stack.

  // Open external links (e.g. Google sign-in) in the system browser, not inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) {
      event.preventDefault();
      if (url.startsWith('https://')) shell.openExternal(url);
    }
  });

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.mynote.app');
  createWindow();
  setupAutoUpdate();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Opens the system browser for Google sign-in and catches the redirect on a local loopback
// server, since a packaged app has no dev server to receive it (Google also blocks OAuth
// inside embedded/automated webviews, so this can't just navigate the app window itself).
ipcMain.handle('google-auth:start', (_event, authUrl, redirectUri) => {
  return new Promise((resolve, reject) => {
    let parsedAuthUrl;
    let parsedRedirectUri;
    try {
      parsedAuthUrl = new URL(authUrl);
      parsedRedirectUri = new URL(redirectUri);
    } catch {
      reject(new Error('Invalid OAuth URL'));
      return;
    }

    if (parsedAuthUrl.protocol !== 'https:' || parsedAuthUrl.hostname !== 'accounts.google.com') {
      reject(new Error('Unsupported authorization provider'));
      return;
    }

    const isLoopbackHost = ['localhost', '127.0.0.1', '::1'].includes(parsedRedirectUri.hostname);
    const callbackPort = Number(parsedRedirectUri.port);
    if (
      parsedRedirectUri.protocol !== 'http:' ||
      !isLoopbackHost ||
      parsedRedirectUri.pathname !== '/auth/callback' ||
      !Number.isInteger(callbackPort) ||
      callbackPort < 1024 ||
      callbackPort > 65535
    ) {
      reject(new Error('Unsupported OAuth callback URL'));
      return;
    }

    const server = http.createServer((req, res) => {
      const url = new URL(req.url, parsedRedirectUri.origin);
      if (url.pathname !== parsedRedirectUri.pathname) {
        res.writeHead(404).end();
        return;
      }

      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        '<html><body style="font-family:sans-serif;text-align:center;padding-top:4rem">' +
          '<h2>You can close this window</h2><p>Return to Tipot.</p></body></html>'
      );
      server.close();

      if (error) reject(new Error(error));
      else if (code) resolve(code);
      else reject(new Error('No authorization code received'));
    });

    server.on('error', reject);
    server.listen(callbackPort, parsedRedirectUri.hostname, () => {
      shell.openExternal(parsedAuthUrl.toString());
    });
  });
});
