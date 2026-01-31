const { app } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const initSqlJs = require('sql.js');

const DB_FILE = 'PurchasedAppDb.db';
const PASSPHRASE_FILE = 'passphrase.txt';
const SETTINGS_FILE = 'settings.json';
const ALLOWED_STATUSES = new Set(['purchased', 'owned']);

let sqlInstancePromise;
let database;

const sqlWasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');

const getBaseDir = () => {
  if (!app.isPackaged) {
    return path.join(app.getPath('appData'), 'IPAbuyer');
  }
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(localAppData, 'Packages', 'IPAbuyer.IPAbuyer_kr1hdvrv6tpd0', 'LocalState');
};

const getDbPath = () => path.join(getBaseDir(), DB_FILE);
const getDefaultDownloadsDir = () => app.getPath('downloads');
const getDownloadsDir = () => {
  const settings = readSettings();
  return settings.downloadPath || getDefaultDownloadsDir();
};

const ensureBaseDir = () => {
  fs.mkdirSync(getBaseDir(), { recursive: true });
};

const getSql = async () => {
  if (!sqlInstancePromise) {
    sqlInstancePromise = initSqlJs({
      locateFile: () => sqlWasmPath
    });
  }
  return sqlInstancePromise;
};

const ensureDatabase = async () => {
  ensureBaseDir();
  if (database) return database;

  const SQL = await getSql();
  const dbPath = getDbPath();
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    database = new SQL.Database(new Uint8Array(buffer));
  } else {
    database = new SQL.Database();
  }

  database.run(`
    CREATE TABLE IF NOT EXISTS apps (
      bundleId TEXT PRIMARY KEY,
      appName TEXT,
      email TEXT,
      status TEXT,
      updatedAt TEXT
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      email TEXT PRIMARY KEY,
      password TEXT
    );
  `);

  database.run('INSERT OR IGNORE INTO accounts (email, password) VALUES (?, ?);', ['test', 'test']);

  return database;
};

const persistDb = () => {
  if (!database) return;
  const data = database.export();
  fs.writeFileSync(getDbPath(), Buffer.from(data));
};

const normalizeStatus = (status) => {
  if (!ALLOWED_STATUSES.has(status)) return null;
  return status;
};

const listStatuses = async () => {
  const db = await ensureDatabase();
  const stmt = db.prepare('SELECT bundleId, appName, email, status, updatedAt FROM apps ORDER BY updatedAt DESC');
  const items = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    items.push({
      bundleId: row.bundleId,
      appName: row.appName,
      email: row.email,
      status: row.status,
      updatedAt: row.updatedAt
    });
  }
  stmt.free();
  return items;
};

const upsertStatus = async ({ bundleId, appName, email, status }) => {
  const normalized = normalizeStatus(status);
  if (!bundleId || !normalized) {
    throw new Error('Invalid status payload');
  }
  const db = await ensureDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare(
    'INSERT INTO apps (bundleId, appName, email, status, updatedAt) VALUES (?, ?, ?, ?, ?) ' +
      'ON CONFLICT(bundleId) DO UPDATE SET appName=excluded.appName, email=excluded.email, status=excluded.status, updatedAt=excluded.updatedAt'
  );
  stmt.bind([bundleId, appName || '', email || '', normalized, now]);
  stmt.step();
  stmt.free();
  persistDb();
  return listStatuses();
};

const upsertMany = async (rows) => {
  const db = await ensureDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare(
    'INSERT INTO apps (bundleId, appName, email, status, updatedAt) VALUES (?, ?, ?, ?, ?) ' +
      'ON CONFLICT(bundleId) DO UPDATE SET appName=excluded.appName, email=excluded.email, status=excluded.status, updatedAt=excluded.updatedAt'
  );
  db.run('BEGIN TRANSACTION');
  for (const row of rows) {
    const normalized = normalizeStatus(row.status);
    if (!row.bundleId || !normalized) continue;
    stmt.bind([row.bundleId, row.appName || '', row.email || '', normalized, now]);
    stmt.step();
    stmt.reset();
  }
  db.run('COMMIT');
  stmt.free();
  persistDb();
  return listStatuses();
};

const readPassphrase = async () => {
  ensureBaseDir();
  const passPath = path.join(getBaseDir(), PASSPHRASE_FILE);
  if (!fs.existsSync(passPath)) return '';
  return fs.readFileSync(passPath, 'utf-8');
};

const writePassphrase = async (value) => {
  ensureBaseDir();
  const passPath = path.join(getBaseDir(), PASSPHRASE_FILE);
  fs.writeFileSync(passPath, value || '', 'utf-8');
  return true;
};

const readSettings = () => {
  ensureBaseDir();
  const settingsPath = path.join(getBaseDir(), SETTINGS_FILE);
  if (!fs.existsSync(settingsPath)) return {};
  try {
    const raw = fs.readFileSync(settingsPath, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch (_error) {
    return {};
  }
};

const writeSettings = (next) => {
  ensureBaseDir();
  const settingsPath = path.join(getBaseDir(), SETTINGS_FILE);
  fs.writeFileSync(settingsPath, JSON.stringify(next, null, 2), 'utf-8');
  return true;
};

const readCountry = async () => {
  const settings = readSettings();
  return (settings.country || '').trim();
};

const writeCountry = async (value) => {
  const settings = readSettings();
  settings.country = (value || '').trim();
  writeSettings(settings);
  return true;
};

const readDownloadPath = async () => {
  const settings = readSettings();
  return (settings.downloadPath || getDefaultDownloadsDir()).trim();
};

const writeDownloadPath = async (value) => {
  const settings = readSettings();
  settings.downloadPath = (value || '').trim();
  writeSettings(settings);
  return true;
};

const clearDatabase = async () => {
  ensureBaseDir();
  if (database) {
    try {
      database.close();
    } catch (_error) {
      // ignore close errors
    }
    database = null;
  }
  const dbPath = getDbPath();
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  await ensureDatabase();
  persistDb();
  return true;
};

module.exports = {
  ensureDatabase,
  listStatuses,
  upsertStatus,
  upsertMany,
  getDbPath,
  getBaseDir,
  getDownloadsDir,
  readPassphrase,
  writePassphrase,
  readCountry,
  writeCountry,
  readDownloadPath,
  writeDownloadPath,
  clearDatabase
};
