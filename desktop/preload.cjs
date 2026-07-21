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
  },
  openTestWindow: () => ipcRenderer.send('open-test-window'),
  onRequestTestContext: (callback) => {
    ipcRenderer.on('request-test-context', () => callback())
    return () => ipcRenderer.removeAllListeners('request-test-context')
  },
  sendTestContext: (context) => ipcRenderer.send('test-context-ready', context),
  onSaveTestUrl: (callback) => {
    ipcRenderer.on('save-test-url', (_, url) => callback(url))
    return () => ipcRenderer.removeAllListeners('save-test-url')
  },
  onTestWindowClosed: (callback) => {
    ipcRenderer.on('test-window-closed', () => callback())
    return () => ipcRenderer.removeAllListeners('test-window-closed')
  },
  closeTestWindow: () => ipcRenderer.send('close-test-window'),
  saveTestUrl: (url) => ipcRenderer.send('test-window-save-url', url),
})
