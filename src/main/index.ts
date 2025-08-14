import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { IPC_CHANNELS } from '../shared/types/api'
import { databaseManager } from './database'
import { LocalStorageManager } from './database/storage'
import { randomUUID } from 'crypto'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
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

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))
  // IPC registrations
  const storage = LocalStorageManager.getInstance()
  storage.initialize().catch((e) => console.error('Storage initialize failed', e))

  // Connection Management
  ipcMain.handle(IPC_CHANNELS.SAVE_CONNECTION, async (_event, connection) => {
    const id = randomUUID()
    const now = new Date()
    await storage.saveConnection({
      id,
      name: connection.name,
      type: connection.type,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: connection.username,
      password: connection.password,
      ssl: connection.ssl,
      createdAt: now,
      updatedAt: now
    })
    return id
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_CONNECTION, async (_event, { id, updates }) => {
    const existing = await storage.loadConnection(id)
    if (!existing) {
      throw new Error(`Connection ${id} not found`)
    }
    const updated = {
      ...existing,
      ...updates,
      // Ensure updatedAt is refreshed
      updatedAt: new Date()
    }
    await storage.updateConnection(updated)
  })

  ipcMain.handle(IPC_CHANNELS.DELETE_CONNECTION, async (_event, id: string) => {
    const ok = await storage.deleteConnection(id)
    if (!ok) throw new Error(`Connection ${id} not found`)
  })

  ipcMain.handle(IPC_CHANNELS.GET_CONNECTIONS, async () => {
    return storage.loadAllConnections()
  })

  // Database Operations
  ipcMain.handle(IPC_CHANNELS.CONNECT, async (_event, id: string) => {
    const connection = await storage.loadConnection(id)
    if (!connection) {
      throw new Error(`Connection ${id} not found`)
    }
    return databaseManager.connect(connection)
  })

  ipcMain.handle(IPC_CHANNELS.DISCONNECT, async (_event, id: string) => {
    await databaseManager.disconnect(id)
  })

  ipcMain.handle(IPC_CHANNELS.TEST_CONNECTION, async (_event, connection) => {
    // Provide a temporary id for testing consistency
    const temp = { ...connection, id: `test-${randomUUID()}`, createdAt: new Date(), updatedAt: new Date() }
    return databaseManager.testConnection(temp)
  })

  // Query Operations
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_QUERY,
    async (_event, { connectionId, sql, params }: { connectionId: string; sql: string; params?: any[] }) => {
      return databaseManager.executeQuery(connectionId, sql, params)
    }
  )

  ipcMain.handle(IPC_CHANNELS.CANCEL_QUERY, async (_event, connectionId: string) => {
    await databaseManager.cancelQuery(connectionId)
  })

  ipcMain.handle(IPC_CHANNELS.GET_SCHEMA, async (_event, connectionId: string) => {
    return databaseManager.getSchema(connectionId)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
