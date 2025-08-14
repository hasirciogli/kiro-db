/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand'
import type {
  ConnectionStatus,
  DatabaseConnection
} from '../../../shared/types/database'

interface ConnectionStoreState {
  connections: DatabaseConnection[]
  connectionStatuses: Map<string, ConnectionStatus>
  activeConnectionId: string | null

  loadConnections: () => Promise<void>
  saveConnection: (connection: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateConnection: (id: string, updates: Partial<DatabaseConnection>) => Promise<void>
  deleteConnection: (id: string) => Promise<void>

  connect: (id: string) => Promise<void>
  disconnect: (id: string) => Promise<void>
  testConnection: (connection: Omit<DatabaseConnection, 'id'>) => Promise<boolean>

  setActiveConnection: (id: string | null) => void
}

export const useConnectionStore = create<ConnectionStoreState>((set, get) => ({
  connections: [],
  connectionStatuses: new Map<string, ConnectionStatus>(),
  activeConnectionId: null,

  loadConnections: async () => {
    const connections = await window.dbapi.getConnections()
    set({ connections })
  },

  saveConnection: async (connection) => {
    const id = await window.dbapi.saveConnection({
      ...connection
    })
    await get().loadConnections()
    return id
  },

  updateConnection: async (id, updates) => {
    await window.dbapi.updateConnection(id, updates)
    await get().loadConnections()
  },

  deleteConnection: async (id) => {
    await window.dbapi.deleteConnection(id)
    await get().loadConnections()
    const { activeConnectionId } = get()
    if (activeConnectionId === id) {
      set({ activeConnectionId: null })
    }
  },

  connect: async (id) => {
    const status = await window.dbapi.connect(id)
    set((state) => {
      const updated = new Map(state.connectionStatuses)
      updated.set(id, status)
      return { connectionStatuses: updated, activeConnectionId: id }
    })
  },

  disconnect: async (id) => {
    await window.dbapi.disconnect(id)
    set((state) => {
      const updated = new Map(state.connectionStatuses)
      updated.set(id, { id, status: 'disconnected' })
      const nextActive = state.activeConnectionId === id ? null : state.activeConnectionId
      return { connectionStatuses: updated, activeConnectionId: nextActive }
    })
  },

  testConnection: async (connection) => {
    return window.dbapi.testConnection(connection)
  },

  setActiveConnection: (id) => set({ activeConnectionId: id })
}))


