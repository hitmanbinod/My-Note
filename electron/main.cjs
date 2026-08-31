const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('node:path');
const http = require('node:http');
const { URL } = require('node:url');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'My Notes',
    backgroundColor: '#f6f5f2',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  win.once('ready-to-show', () => win.show());

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
          '<h2>You can close this window</h2><p>Return to My Notes.</p></body></html>'
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
