import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('dbapi', {
      connect: (dialect, params) => ipcRenderer.invoke('db:connect', { dialect, params }),
      disconnect: (id) => ipcRenderer.invoke('db:disconnect', id),
      execute: (id, sql, params) => ipcRenderer.invoke('db:execute', { id, sql, params }),
      schema: (id) => ipcRenderer.invoke('db:schema', { id }),
      cancel: (id) => ipcRenderer.invoke('db:cancel', id),
      connections: () => ipcRenderer.invoke('connections')
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
