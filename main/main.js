const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('node:path');
const {
  ensureDatabase,
  listStatuses,
  upsertMany,
  getDownloadsDir,
  readPassphrase,
  writePassphrase,
  readCountry,
  writeCountry,
  readDownloadPath,
  writeDownloadPath,
  clearDatabase
} = require('./db');
const { login, authInfo, authRevoke, purchase, download } = require('./ipatool');
const axios = require('axios');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let currentAuth = { email: null, isTest: false, passphrase: '' };
let currentDownloadController = null;

const createWindow = async () => {
  await ensureDatabase();
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1080,
    minHeight: 720,
    title: 'IPAbuyer',
    icon: path.join(__dirname, '../assets/Icon.ico'),
    backgroundColor: '#0f1115',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false
    }
  });

  if (isDev) {
    await win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    await win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

app.whenReady().then(() => {
  app.setAppUserModelId('IPAbuyer.IPAbuyer');
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('db:list', async () => listStatuses());
ipcMain.handle('db:setMany', async (_event, payload = []) => upsertMany(payload));
ipcMain.handle('db:clear', async () => {
  try {
    await clearDatabase();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('passphrase:read', async () => readPassphrase());
ipcMain.handle('passphrase:write', async (_event, value) => writePassphrase(value));
ipcMain.handle('country:read', async () => readCountry());
ipcMain.handle('country:write', async (_event, value) => writeCountry(value));
ipcMain.handle('downloadPath:read', async () => readDownloadPath());
ipcMain.handle('downloadPath:write', async (_event, value) => writeDownloadPath(value));
ipcMain.handle('downloadPath:open', async (_event, value) => {
  try {
    await shell.openPath(value);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});
ipcMain.handle('downloadPath:pick', async (event) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win, {
      title: '选择下载路径',
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || !result.filePaths?.length) {
      return { ok: false, canceled: true };
    }
    const selected = result.filePaths[0];
    await writeDownloadPath(selected);
    return { ok: true, path: selected };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});
ipcMain.handle('app:openExternal', async (_event, url) => {
  try {
    await shell.openExternal(url);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('window:minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});
ipcMain.handle('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});
ipcMain.handle('window:close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.handle('auth:login', async (_event, payload) => {
  try {
    const result = await login(payload);
    if (result.ok) {
      currentAuth = {
        email: payload.email,
        isTest: result.mock === true,
        passphrase: payload.passphrase || ''
      };
      await writePassphrase(payload.passphrase || '');
    }
    return result;
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('auth:info', async (_event, payload) => {
  try {
    return await authInfo({ ...payload, currentAuth });
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('auth:revoke', async () => {
  try {
    const result = await authRevoke({ currentAuth });
    if (result.ok) {
      currentAuth = { email: null, isTest: false, passphrase: '' };
    }
    return result;
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('ipatool:purchase', async (_event, payload) => {
  try {
    const passphrase = payload.passphrase || currentAuth.passphrase || (await readPassphrase());
    const result = await purchase({
      bundleIds: payload.bundleIds,
      passphrase,
      currentAuth
    });
    if (payload.bundleIds?.length) {
      const email = currentAuth.email || payload.email || '';
      if (result.ok) {
        const rows = payload.bundleIds.map((bundleId) => ({
          bundleId,
          appName: payload.appNameMap?.[bundleId] || '',
          email,
          status: 'purchased'
        }));
        await upsertMany(rows);
      } else if (Array.isArray(result.results)) {
        const ownedRows = result.results
          .filter((item) => {
            const text = `${item.stderr || ''}\n${item.output || ''}`.toLowerCase();
            return text.includes('stdq') || text.includes('already') || text.includes('owned');
          })
          .map((item) => ({
            bundleId: item.bundleId,
            appName: payload.appNameMap?.[item.bundleId] || '',
            email,
            status: 'owned'
          }));
        if (ownedRows.length) {
          await upsertMany(ownedRows);
          result.ownedApps = ownedRows.map((row) => ({
            bundleId: row.bundleId,
            appName: row.appName || ''
          }));
        }
      }
    }
    return result;
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('ipatool:download', async (_event, payload) => {
  try {
    const passphrase = payload.passphrase || currentAuth.passphrase || (await readPassphrase());
    const outputDir = payload.outputDir || getDownloadsDir();
    let sentLog = false;
    const sendLog = (data) => {
      sentLog = true;
      _event.sender.send('download:log', data);
    };
    currentDownloadController = {
      canceled: false,
      child: null,
      skipCurrent: false
    };
    const result = await download({
      bundleIds: payload.bundleIds,
      passphrase,
      outputDir,
      currentAuth,
      onLog: sendLog,
      controller: currentDownloadController
    });
    if (!sentLog && Array.isArray(result.results)) {
      result.results.forEach((item) => {
        const text = [item.stdout, item.stderr, item.output].filter(Boolean).join('\n');
        if (!text) return;
        text.split(/\r?\n/).forEach((line) => {
          const cleaned = (line || '').trim();
          if (cleaned) {
            sendLog({ bundleId: item.bundleId, line: cleaned, stream: 'summary' });
          }
        });
      });
    }
    currentDownloadController = null;
    return { ...result, outputDir };
  } catch (error) {
    currentDownloadController = null;
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('ipatool:download:cancel', async () => {
  if (currentDownloadController?.child) {
    currentDownloadController.canceled = true;
    try {
      currentDownloadController.child.kill();
    } catch (_error) {
      // ignore kill errors
    }
    return { ok: true };
  }
  return { ok: false, error: 'no active download' };
});

ipcMain.handle('ipatool:download:cancelCurrent', async () => {
  if (currentDownloadController?.child) {
    currentDownloadController.skipCurrent = true;
    try {
      currentDownloadController.child.kill();
    } catch (_error) {
      // ignore kill errors
    }
    return { ok: true };
  }
  return { ok: false, error: 'no active download' };
});

ipcMain.handle('itunes:search', async (_event, params) => {
  try {
    const resp = await axios.get('https://itunes.apple.com/search', { params });
    return { ok: true, data: resp.data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});
