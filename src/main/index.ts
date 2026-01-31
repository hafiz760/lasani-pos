import { app, shell, BrowserWindow, ipcMain, protocol, nativeImage } from 'electron'
import { join } from 'path'
import * as path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { connectToDatabase } from './lib/mongodb'
import { registerIpcHandlers } from './ipc/handlers'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    show: false,
    title: 'RexPOS',
    autoHideMenuBar: true,
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.webContents.openDevTools()
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  app.name = 'RexPOS'

  // Set dock icon for macOS in development
  if (process.platform === 'darwin' && is.dev) {
    const iconPath = path.join(__dirname, '../../resources/icon.png')
    const image = nativeImage.createFromPath(iconPath)
    app.dock?.setIcon(image)
  }

  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  // Register media protocol
  protocol.registerFileProtocol('media', (request, callback) => {
    const url = request.url.replace('media://', '')
    try {
      const uploadsDir = path.join(app.getPath('userData'), 'Uploads')
      return callback(path.join(uploadsDir, url))
    } catch (error) {
      console.error(error)
      return callback({ error: -6 }) // net::ERR_FILE_NOT_FOUND
    }
  })

  // Connect to Database and Register handlers
  connectToDatabase().catch(console.error)
  registerIpcHandlers()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
