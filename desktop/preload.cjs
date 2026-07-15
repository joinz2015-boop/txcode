const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getPort: () => ipcRenderer.invoke('get-port'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getNodeVersion: () => ipcRenderer.invoke('get-node-version'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  onBackendReady: (callback) => {
    ipcRenderer.on('backend-ready', (event, port) => callback(port))
  }
})
