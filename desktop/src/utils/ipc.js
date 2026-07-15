const electronAPI = window.electronAPI || {}

export async function getPort() {
  if (electronAPI.getPort) {
    return electronAPI.getPort()
  }
  return 40000
}

export function minimizeWindow() {
  electronAPI.minimizeWindow && electronAPI.minimizeWindow()
}

export function maximizeWindow() {
  electronAPI.maximizeWindow && electronAPI.maximizeWindow()
}

export function closeWindow() {
  electronAPI.closeWindow && electronAPI.closeWindow()
}

export function getAppVersion() {
  if (electronAPI.getAppVersion) {
    return electronAPI.getAppVersion()
  }
  return '1.0.0'
}

export function getNodeVersion() {
  if (electronAPI.getNodeVersion) {
    return electronAPI.getNodeVersion()
  }
  return ''
}

export function onBackendReady(callback) {
  if (electronAPI.onBackendReady) {
    electronAPI.onBackendReady(callback)
  }
}
