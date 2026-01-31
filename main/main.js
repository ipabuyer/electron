const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { useUIKit } = require('@electron-uikit/core/main');
const { registerTitleBarListener, attachTitleBarToWindow } = require('@electron-uikit/titlebar/main');
const path = require('node:path');
const {
  ensureDatabase,
  listStatuses,
  upsertMany,
  getDownloadsDir,
  readPassphrase,
  writePassphrase,
  clearDatabase
} = require('./db');
const { login, authInfo, authRevoke, purchase, download } = require('./ipatool');
const axios = require('axios');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let currentAuth = { email: null, isTest: false, passphrase: '' };

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

  attachTitleBarToWindow(win);

  if (isDev) {
    await win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    await win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

app.whenReady().then(() => {
  app.setAppUserModelId('IPAbuyer.IPAbuyer');
  useUIKit();
  registerTitleBarListener();
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
ipcMain.handle('app:openExternal', async (_event, url) => {
  try {
    await shell.openExternal(url);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
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
    if (result.ok && payload.bundleIds?.length) {
      const rows = payload.bundleIds.map((bundleId) => ({
        bundleId,
        appName: payload.appNameMap?.[bundleId] || '',
        email: currentAuth.email || payload.email || '',
        status: 'purchased'
      }));
      await upsertMany(rows);
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
    const result = await download({
      bundleIds: payload.bundleIds,
      passphrase,
      outputDir,
      currentAuth
    });
    return { ...result, outputDir };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('itunes:search', async (_event, params) => {
  try {
    const resp = await axios.get('https://itunes.apple.com/search', { params });
    return { ok: true, data: resp.data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});
