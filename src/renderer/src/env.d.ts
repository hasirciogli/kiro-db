/// <reference types="vite/client" />
import type { DatabaseAPI } from '../../shared/types/api'

declare global {
  interface Window {
    dbapi: DatabaseAPI
  }
}

export {}
