import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { DatabaseAPI } from '../shared/types/api'
import { IPC_CHANNELS } from '../shared/types/api'

// Custom APIs for renderer
const api = {}

const dbapi: DatabaseAPI = {
  // Connection Management
  saveConnection: (connection) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_CONNECTION, connection),
  updateConnection: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CONNECTION, { id, updates }),
  deleteConnection: (id) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_CONNECTION, id),
  getConnections: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CONNECTIONS),

  // Database Operations
  connect: (id) => ipcRenderer.invoke(IPC_CHANNELS.CONNECT, id),
  disconnect: (id) => ipcRenderer.invoke(IPC_CHANNELS.DISCONNECT, id),
  testConnection: (connection) => ipcRenderer.invoke(IPC_CHANNELS.TEST_CONNECTION, connection),

  // Query Operations
  executeQuery: (connectionId, sql, params) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_QUERY, { connectionId, sql, params }),
  cancelQuery: (connectionId) => ipcRenderer.invoke(IPC_CHANNELS.CANCEL_QUERY, connectionId),
  getSchema: (connectionId) => ipcRenderer.invoke(IPC_CHANNELS.GET_SCHEMA, connectionId)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('dbapi', dbapi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.dbapi = dbapi
}
