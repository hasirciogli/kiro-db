import { ElectronAPI } from '@electron-toolkit/preload'
import type { DatabaseAPI } from '../shared/types/api'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    dbapi: DatabaseAPI
  }
}
