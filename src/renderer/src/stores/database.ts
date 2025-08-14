/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand'
import type { DatabaseSchema } from '../../../shared/types/database'

interface DatabaseStoreState {
  schema: DatabaseSchema | null
  selectedTable: string | null
  tableData: any[]
  loading: boolean
  error: string | null

  loadSchema: (connectionId: string) => Promise<void>
  selectTable: (tableName: string | null) => Promise<void>
  loadTableData: (connectionId: string, tableName: string) => Promise<void>
}

export const useDatabaseStore = create<DatabaseStoreState>((set) => ({
  schema: null,
  selectedTable: null,
  tableData: [],
  loading: false,
  error: null,

  loadSchema: async (connectionId) => {
    set({ loading: true, error: null })
    try {
      const schema = await window.dbapi.getSchema(connectionId)
      set({ schema })
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to load schema' })
    } finally {
      set({ loading: false })
    }
  },

  selectTable: async (tableName) => {
    set({ selectedTable: tableName })
  },

  loadTableData: async (connectionId, tableName) => {
    set({ loading: true, error: null })
    try {
      const result = await window.dbapi.executeQuery(
        connectionId,
        `SELECT * FROM ${tableName} LIMIT 100`
      )
      set({ tableData: result.rows })
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to load table data' })
    } finally {
      set({ loading: false })
    }
  }
}))


