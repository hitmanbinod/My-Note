const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('node:path');
const http = require('node:http');
const { URL } = require('node:url');

// Fixed so it can be pre-registered as an authorized redirect URI in the Google Cloud OAuth client.
const LOOPBACK_PORT = 5174;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // Open external links (e.g. Google sign-in) in the system browser, not inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Opens the system browser for Google sign-in and catches the redirect on a local loopback
// server, since a packaged app has no dev server to receive it (Google also blocks OAuth
// inside embedded/automated webviews, so this can't just navigate the app window itself).
ipcMain.handle('google-auth:start', (_event, authUrl) => {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${LOOPBACK_PORT}`);
      if (url.pathname !== '/auth/callback') {
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
    server.listen(LOOPBACK_PORT, '127.0.0.1', () => {
      shell.openExternal(authUrl);
    });
  });
});
