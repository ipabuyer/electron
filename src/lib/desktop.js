import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/plugin-dialog';

const currentWindow = getCurrentWindow();

const normalizeError = (error) => ({
  ok: false,
  error: error?.message || String(error || 'unknown error')
});

export const desktopAPI = {
  listAppStatuses: () => invoke('db_list'),
  setAppStatuses: (payload) => invoke('db_set_many', { payload }),
  deleteAppStatuses: (payload) => invoke('db_delete_many', { payload }),
  clearDatabase: () => invoke('db_clear'),
  readPassphrase: () => invoke('passphrase_read'),
  savePassphrase: (value) => invoke('passphrase_write', { value }),
  readCountry: () => invoke('country_read'),
  saveCountry: (value) => invoke('country_write', { value }),
  readDownloadPath: () => invoke('download_path_read'),
  saveDownloadPath: (value) => invoke('download_path_write', { value }),
  openDownloadPath: (value) => invoke('app_open_path', { value }),
  openExternal: (url) => invoke('app_open_external', { url }),
  windowMinimize: () => currentWindow.minimize(),
  windowMaximize: async () => {
    const maximized = await currentWindow.isMaximized();
    if (maximized) {
      return currentWindow.unmaximize();
    }
    return currentWindow.maximize();
  },
  windowClose: () => currentWindow.close(),
  login: (payload) => invoke('auth_login', { payload }),
  authInfo: (payload) => invoke('auth_info', { payload }),
  authRevoke: () => invoke('auth_revoke'),
  purchase: (payload) => invoke('ipatool_purchase', { payload }),
  download: (payload) => invoke('ipatool_download', { payload }),
  cancelDownload: () => invoke('ipatool_download_cancel'),
  cancelDownloadCurrent: () => invoke('ipatool_download_cancel_current'),
  searchItunes: (params) => invoke('itunes_search', { params }),
  onDownloadLog: async (callback) =>
    listen('download:log', (event) => {
      callback(event.payload);
    }),
  pickDownloadPath: async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择下载路径'
      });
      if (!selected) {
        return { ok: false, canceled: true };
      }
      const path = Array.isArray(selected) ? selected[0] : selected;
      await invoke('download_path_write', { value: path });
      return { ok: true, path };
    } catch (error) {
      return normalizeError(error);
    }
  }
};
