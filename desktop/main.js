import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } from 'electron'
import { spawn, exec } from 'child_process'
import { createServer } from 'net'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

let mainWindow = null
let testWindow = null
let backendProcess = null
let tray = null
let backendPort = 41000

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

  backendProcess = spawn('node', [distIndex, 'desktop', '--port', String(port)], {
    cwd: rootDir,
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' },
    stdio: ['pipe', 'pipe', 'pipe']
  })

  backendProcess.stdout.on('data', (data) => {
    console.log('[Backend]', data.toString())
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

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function getIconPath() {
  const isDev = !app.isPackaged
  const basePath = isDev ? __dirname : process.resourcesPath
  const logoPath = join(basePath, 'assets', 'logo.png')
  if (existsSync(logoPath)) return logoPath
  if (process.platform === 'win32') {
    const icoPath = join(basePath, 'assets', 'icon.ico')
    if (existsSync(icoPath)) return icoPath
  } else if (process.platform === 'darwin') {
    const icnsPath = join(basePath, 'assets', 'icon.icns')
    if (existsSync(icnsPath)) return icnsPath
  }
  const pngPath = join(basePath, 'assets', 'icon.png')
  if (existsSync(pngPath)) return pngPath
  return undefined
}

function createTray() {
  const trayIconPath = getIconPath()
  if (!trayIconPath || !existsSync(trayIconPath)) {
    const icon = nativeImage.createEmpty()
    tray = new Tray(icon.resize({ width: 16, height: 16 }))
  } else {
    const icon = nativeImage.createFromPath(trayIconPath)
    tray = new Tray(icon.resize({ width: 16, height: 16 }))
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

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
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
  }).toString()

  const distIndex = join(__dirname, 'dist', 'index.html')

  if (isDev) {
    testWindow.loadURL(`http://localhost:5173/#/test?${query}`)
  } else {
    testWindow.loadFile(distIndex, { hash: `/test?${query}` })
  }

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

app.on('before-quit', () => {
  app.isQuitting = true
  if (testWindow && !testWindow.isDestroyed()) {
    testWindow.close()
  }
  testWindow = null
  if (backendProcess && backendProcess.pid) {
    const pid = backendProcess.pid
    backendProcess.kill('SIGTERM')
    setTimeout(() => {
      try {
        process.kill(pid, 0)
        if (process.platform === 'win32') {
          exec(`taskkill /F /PID ${pid}`)
        } else {
          process.kill(pid, 'SIGKILL')
        }
      } catch { /* 进程已退出 */ }
    }, 2000)
  }
  backendProcess = null
  if (tray) {
    tray.destroy()
    tray = null
  }
})
