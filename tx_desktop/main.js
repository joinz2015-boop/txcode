import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, dialog } from 'electron'
import { spawn, fork, exec } from 'child_process'
import { createServer } from 'net'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { existsSync } from 'fs'
import { tmpdir } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))

const UPGRADE_MARK_FILE = join(tmpdir(), 'txcode-upgrade.lock')
const UPGRADE_MARK_FILE_ALL_USERS = join(
  process.env.ProgramData || join(process.env.SystemDrive || 'C:', 'ProgramData'),
  'txcode',
  'upgrade.lock'
)
const isUpdated = process.argv.includes('--updated')
const isQuitRequest = process.argv.includes('--quit')

let mainWindow = null
let testWindow = null
let backendProcess = null
let tray = null
let backendPort = 41000
let cleanupPromise = null
let cleanupDone = false

function isUpgradeClosing() {
  return existsSync(UPGRADE_MARK_FILE) || existsSync(UPGRADE_MARK_FILE_ALL_USERS)
}

function findAvailablePort(startPort) {
  return new Promise((resolve) => {
    const server = createServer()
    server.listen(startPort, () => {
      server.close(() => resolve(startPort))
    })
    server.on('error', async () => {
      resolve(await findAvailablePort(startPort + 1))
    })
  })
}

function startBackend(port) {
  const isDev = !app.isPackaged
  const rootDir = isDev ? join(__dirname, '..') : join(process.resourcesPath, 'app')

  const distIndex = isDev
    ? join(rootDir, 'dist', 'index.js')
    : join(process.resourcesPath, 'app', 'dist', 'index.js')

  console.log('Starting backend from:', distIndex)
  console.log('Backend port:', port)

  if (isDev) {
    backendProcess = spawn('node', [distIndex, 'desktop', '--port', String(port)], {
      cwd: rootDir,
      env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' },
      stdio: ['pipe', 'pipe', 'pipe']
    })
  } else {
    backendProcess = fork(distIndex, ['desktop', '--port', String(port)], {
      cwd: rootDir,
      env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' },
      silent: true
    })
  }

  backendProcess.stdout.on('data', (data) => {
    const text = data.toString()
    console.log('[Backend]', text)

    const actionMatch = text.match(/__TXCODE_ACTION__:(.+)/)
    if (actionMatch) {
      try {
        const action = JSON.parse(actionMatch[1])
        if (action.action === 'open-test-window') {
          const ctx = action.context || {}
          createTestWindow({ ...ctx, backendPort: ctx.backendPort || backendPort })
        }
      } catch (e) {
        console.error('[Backend Action Parse Error]', e)
      }
    }
  })

  backendProcess.stderr.on('data', (data) => {
    console.error('[Backend Error]', data.toString())
  })

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err)
  })

  backendProcess.on('close', (code) => {
    console.log('Backend process exited with code:', code)
    backendProcess = null
  })
}

function createWindow() {
  const preloadPath = join(__dirname, 'preload.cjs')

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: getIconPath()
  })

  const distIndex = join(__dirname, 'dist', 'index.html')

  if (existsSync(distIndex)) {
    mainWindow.loadFile(distIndex)
  } else {
    mainWindow.loadURL('http://localhost:5173')
  }

  mainWindow.on('close', async (e) => {
    if (!app.isQuitting) {
      if (isUpgradeClosing()) {
        console.log('[Upgrade] upgrade in progress, quit silently')
        app.isQuitting = true
        app.quit()
        return
      }
      e.preventDefault()
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['最小化到托盘', '退出应用'],
        defaultId: 0,
        cancelId: 0,
        title: 'txcode',
        message: '请选择操作',
        detail: '是否要退出 txcode 或将其最小化到系统托盘？',
      })
      if (response === 0) {
        mainWindow.hide()
      } else {
        app.isQuitting = true
        app.quit()
      }
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function getIconPath() {
  const isDev = !app.isPackaged
  const basePath = isDev ? __dirname : app.getAppPath()
  const logoPath = join(basePath, 'assets', 'logo.png')
  if (existsSync(logoPath)) return logoPath
  if (process.platform === 'win32') {
    const icoPath = join(basePath, 'assets', 'icon.ico')
    if (existsSync(icoPath)) return icoPath
  }
  const pngPath = join(basePath, 'assets', 'icon.png')
  if (existsSync(pngPath)) return pngPath
  return undefined
}

function createTray() {
  const isDev = !app.isPackaged
  const basePath = isDev ? __dirname : app.getAppPath()

  let trayIconPath = null

  if (process.platform === 'darwin') {
    const templatePath = join(basePath, 'assets', 'trayIconTemplate.png')
    if (existsSync(templatePath)) {
      trayIconPath = templatePath
    }
  }

  if (!trayIconPath || !existsSync(trayIconPath)) {
    trayIconPath = join(basePath, 'assets', 'logo.png')
  }

  if (!existsSync(trayIconPath)) {
    console.warn('[Tray] 托盘图标文件不存在，使用空白图标')
    const icon = nativeImage.createEmpty()
    tray = new Tray(icon.resize({ width: 16, height: 16 }))
  } else {
    const icon = nativeImage.createFromPath(trayIconPath)
    if (icon.isEmpty()) {
      console.warn('[Tray] 图标加载失败，文件路径:', trayIconPath)
      const emptyIcon = nativeImage.createEmpty()
      tray = new Tray(emptyIcon.resize({ width: 16, height: 16 }))
    } else {
      tray = new Tray(icon.resize({ width: 16, height: 16 }))
    }
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('txcode')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

ipcMain.handle('get-port', () => {
  return backendPort
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-node-version', () => {
  return process.version
})

ipcMain.handle('get-platform', () => {
  return process.platform
})

ipcMain.handle('is-updated', () => {
  return isUpdated
})

ipcMain.on('minimize-window', () => {
  mainWindow && mainWindow.minimize()
})

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.on('close-window', () => {
  mainWindow && mainWindow.hide()
})

function refocusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  try {
    if (!mainWindow.isVisible()) mainWindow.show()
    mainWindow.blur()
    mainWindow.focus()
  } catch (err) {
    console.error('[Focus] restore focus failed:', err)
  }
}

ipcMain.on('app-alert', (event, payload) => {
  const window = BrowserWindow.fromWebContents(event.sender) || mainWindow
  try {
    dialog.showMessageBoxSync(window, {
      type: 'warning',
      title: 'txcode',
      message: (payload && payload.message) || '',
      buttons: ['确定'],
      defaultId: 0,
      noLink: true,
    })
  } catch (err) {
    console.error('[Dialog] alert failed:', err)
  }
  refocusMainWindow()
  event.returnValue = undefined
})

ipcMain.on('app-confirm', (event, payload) => {
  const window = BrowserWindow.fromWebContents(event.sender) || mainWindow
  let response = 1
  try {
    response = dialog.showMessageBoxSync(window, {
      type: 'question',
      title: 'txcode',
      message: (payload && payload.message) || '',
      buttons: ['取消', '确定'],
      defaultId: 1,
      cancelId: 0,
      noLink: true,
    })
  } catch (err) {
    console.error('[Dialog] confirm failed:', err)
  }
  refocusMainWindow()
  event.returnValue = response === 1
})

ipcMain.on('focus-fix', () => {
  refocusMainWindow()
})

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, argv) => {
    if (argv && argv.includes('--quit')) {
      console.log('[Upgrade] received --quit from installer, quitting silently')
      app.isQuitting = true
      app.quit()
      return
    }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function createTestWindow(context) {
  const preloadPath = join(__dirname, 'preload.cjs')
  const isDev = !app.isPackaged

  if (testWindow && !testWindow.isDestroyed()) {
    testWindow.focus()
    return
  }

  testWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    frame: true,
    title: '测试 - ' + (context.planFolderName || ''),
    icon: getIconPath(),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  })

  const query = new URLSearchParams({
    backendPort: String(context.backendPort),
    planFolderName: context.planFolderName || '',
    planFilePath: context.planFilePath || '',
    testUrl: context.testUrl || '',
    modelName: context.modelName || '',
    sessionId: context.sessionId || '',
    projectPath: context.projectPath || '',
  }).toString()

  const distIndex = join(__dirname, 'dist', 'index.html')

  if (isDev) {
    testWindow.loadURL(`http://localhost:5173/#/views/test/testWindow?${query}`)
  } else {
    const fileUrl = pathToFileURL(distIndex).href + `#/views/test/testWindow?${query}`
    testWindow.loadURL(fileUrl)
  }

  testWindow.focus()

  testWindow.on('closed', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('test-window-closed')
    }
    testWindow = null
  })
}

// IPC: 测试窗口相关
ipcMain.on('open-test-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('request-test-context')
  }
})

ipcMain.on('test-context-ready', (event, context) => {
  createTestWindow({ ...context, backendPort })
})

ipcMain.on('close-test-window', () => {
  if (testWindow && !testWindow.isDestroyed()) testWindow.close()
})

ipcMain.on('test-window-save-url', (event, testUrl) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('save-test-url', testUrl)
  }
})

app.commandLine.appendSwitch('remote-debugging-port', '9222')

app.whenReady().then(async () => {
  if (isQuitRequest) {
    console.log('[Upgrade] --quit requested but no running instance, exiting without starting')
    app.isQuitting = true
    app.exit(0)
    return
  }
  if (isUpdated) {
    console.log('[Startup] launched after update (--updated)')
  }
  backendPort = await findAvailablePort(41000)
  startBackend(backendPort)

  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else if (mainWindow) {
      mainWindow.show()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function waitForExit(pid, timeout) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeout
    const timer = setInterval(() => {
      if (!isProcessAlive(pid)) {
        clearInterval(timer)
        resolve(true)
      } else if (Date.now() >= deadline) {
        clearInterval(timer)
        resolve(false)
      }
    }, 100)
  })
}

function killProcessTree(pid) {
  if (!pid) return
  if (process.platform === 'win32') {
    exec(`taskkill /F /T /PID ${pid}`, () => { /* 忽略错误 */ })
  } else {
    try {
      process.kill(pid, 'SIGKILL')
    } catch { /* 进程已退出 */ }
  }
}

function cleanup() {
  if (cleanupPromise) return cleanupPromise
  cleanupPromise = (async () => {
    if (tray) {
      try { tray.destroy() } catch { /* 忽略错误 */ }
      tray = null
    }
    if (testWindow && !testWindow.isDestroyed()) {
      testWindow.destroy()
    }
    testWindow = null

    const proc = backendProcess
    backendProcess = null
    const pid = proc?.pid
    if (!pid) return

    try {
      if (proc.connected) proc.send({ type: 'shutdown' })
    } catch (err) {
      console.error('[Quit] send shutdown to backend failed:', err)
    }
    const exited = await waitForExit(pid, 1500)
    if (!exited) {
      killProcessTree(pid)
      await waitForExit(pid, 1500)
    }
  })()
  return cleanupPromise
}

function quitWithCleanup(code) {
  const guard = new Promise((resolve) => setTimeout(resolve, 6000))
  Promise.race([cleanup(), guard]).then(() => {
    cleanupDone = true
    app.exit(code)
  })
}

app.on('before-quit', () => {
  app.isQuitting = true
})

app.on('will-quit', (e) => {
  if (cleanupDone) return
  e.preventDefault()
  quitWithCleanup(0)
})

process.on('uncaughtException', (err) => {
  console.error('[Main] uncaught exception:', err)
  app.isQuitting = true
  quitWithCleanup(1)
})

process.on('SIGTERM', () => {
  app.isQuitting = true
  app.quit()
})

process.on('SIGINT', () => {
  app.isQuitting = true
  app.quit()
})
