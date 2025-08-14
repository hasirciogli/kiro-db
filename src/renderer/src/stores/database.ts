/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand'
import type { DatabaseSchema, QueryResult } from '../../../shared/types/database'

interface DatabaseStoreState {
  schema: DatabaseSchema | null
  selectedTable: string | null
  tableData: any[]
  fields: { name: string; type: string; length?: number }[]
  loading: boolean
  error: string | null
  selectedRow: any | null

  loadSchema: (connectionId: string) => Promise<void>
  selectTable: (tableName: string | null) => Promise<void>
  loadTableData: (connectionId: string, tableName: string) => Promise<void>
  executeQuery: (connectionId: string, sql: string, params?: any[]) => Promise<QueryResult>
  selectRow: (row: any | null) => void
}

export const useDatabaseStore = create<DatabaseStoreState>((set) => ({
  schema: null,
  selectedTable: null,
  tableData: [],
  fields: [],
  loading: false,
  error: null,
  selectedRow: null,

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
      set({ tableData: result.rows, fields: result.fields })
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to load table data' })
    } finally {
      set({ loading: false })
    }
  },

  executeQuery: async (connectionId, sql, params) => {
    set({ loading: true, error: null })
    try {
      const result = await window.dbapi.executeQuery(connectionId, sql, params)
      set({ tableData: result.rows, fields: result.fields })
      return result
    } catch (e: any) {
      set({ error: e?.message ?? 'Query failed' })
      throw e
    } finally {
      set({ loading: false })
    }
  },

  selectRow: (row) => set({ selectedRow: row })
}))


