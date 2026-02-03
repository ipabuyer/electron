const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  listAppStatuses: () => ipcRenderer.invoke('db:list'),
  setAppStatuses: (payload) => ipcRenderer.invoke('db:setMany', payload),
  deleteAppStatuses: (payload) => ipcRenderer.invoke('db:deleteMany', payload),
  clearDatabase: () => ipcRenderer.invoke('db:clear'),
  readPassphrase: () => ipcRenderer.invoke('passphrase:read'),
  savePassphrase: (value) => ipcRenderer.invoke('passphrase:write', value),
  readCountry: () => ipcRenderer.invoke('country:read'),
  saveCountry: (value) => ipcRenderer.invoke('country:write', value),
  readDownloadPath: () => ipcRenderer.invoke('downloadPath:read'),
  saveDownloadPath: (value) => ipcRenderer.invoke('downloadPath:write', value),
  openDownloadPath: (value) => ipcRenderer.invoke('downloadPath:open', value),
  pickDownloadPath: () => ipcRenderer.invoke('downloadPath:pick'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowMaximize: () => ipcRenderer.invoke('window:maximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),
  login: (payload) => ipcRenderer.invoke('auth:login', payload),
  authInfo: (payload) => ipcRenderer.invoke('auth:info', payload),
  authRevoke: () => ipcRenderer.invoke('auth:revoke'),
  purchase: (payload) => ipcRenderer.invoke('ipatool:purchase', payload),
  download: (payload) => ipcRenderer.invoke('ipatool:download', payload),
  onDownloadLog: (callback) => ipcRenderer.on('download:log', (_event, data) => callback(data)),
  cancelDownload: () => ipcRenderer.invoke('ipatool:download:cancel'),
  cancelDownloadCurrent: () => ipcRenderer.invoke('ipatool:download:cancelCurrent'),
  searchItunes: (params) => ipcRenderer.invoke('itunes:search', params)
});
