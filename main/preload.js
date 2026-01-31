const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  listAppStatuses: () => ipcRenderer.invoke('db:list'),
  setAppStatuses: (payload) => ipcRenderer.invoke('db:setMany', payload),
  clearDatabase: () => ipcRenderer.invoke('db:clear'),
  readPassphrase: () => ipcRenderer.invoke('passphrase:read'),
  savePassphrase: (value) => ipcRenderer.invoke('passphrase:write', value),
  login: (payload) => ipcRenderer.invoke('auth:login', payload),
  authInfo: (payload) => ipcRenderer.invoke('auth:info', payload),
  authRevoke: () => ipcRenderer.invoke('auth:revoke'),
  purchase: (payload) => ipcRenderer.invoke('ipatool:purchase', payload),
  download: (payload) => ipcRenderer.invoke('ipatool:download', payload),
  searchItunes: (params) => ipcRenderer.invoke('itunes:search', params)
});
