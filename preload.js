const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getCharacter:   () => ipcRenderer.invoke('get-character'),
  recordResult:   (data) => ipcRenderer.invoke('record-result', data),
  skipCharacter:  (data) => ipcRenderer.invoke('skip-character', data),
  closePopup:     () => ipcRenderer.invoke('close-popup'),
  getSettings:    () => ipcRenderer.invoke('get-settings'),
  saveSettings:   (s) => ipcRenderer.invoke('save-settings', s),
  resetStats:     () => ipcRenderer.invoke('reset-stats'),
  getStats:       () => ipcRenderer.invoke('get-stats'),
});
