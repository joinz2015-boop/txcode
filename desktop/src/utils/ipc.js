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

export function getPlatform() {
  if (electronAPI.getPlatform) {
    return electronAPI.getPlatform()
  }
  return 'win32'
}

export function onBackendReady(callback) {
  if (electronAPI.onBackendReady) {
    electronAPI.onBackendReady(callback)
  }
}

export function openTestWindow() {
  electronAPI.openTestWindow && electronAPI.openTestWindow()
}

export function onRequestTestContext(callback) {
  if (electronAPI.onRequestTestContext) {
    return electronAPI.onRequestTestContext(callback)
  }
  return () => {}
}

export function sendTestContext(context) {
  electronAPI.sendTestContext && electronAPI.sendTestContext(context)
}

export function onSaveTestUrl(callback) {
  if (electronAPI.onSaveTestUrl) {
    return electronAPI.onSaveTestUrl(callback)
  }
  return () => {}
}

export function onTestWindowClosed(callback) {
  if (electronAPI.onTestWindowClosed) {
    return electronAPI.onTestWindowClosed(callback)
  }
  return () => {}
}

export function closeTestWindow() {
  electronAPI.closeTestWindow && electronAPI.closeTestWindow()
}

export function saveTestUrl(url) {
  electronAPI.saveTestUrl && electronAPI.saveTestUrl(url)
}
