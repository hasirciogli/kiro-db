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
  page: number
  pageSize: number
  totalRows: number | null

  loadSchema: (connectionId: string) => Promise<void>
  selectTable: (tableName: string | null) => Promise<void>
  loadTableData: (connectionId: string, tableName: string) => Promise<void>
  executeQuery: (connectionId: string, sql: string, params?: any[]) => Promise<QueryResult>
  selectRow: (row: any | null) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
}

export const useDatabaseStore = create<DatabaseStoreState>((set, get) => ({
  schema: null,
  selectedTable: null,
  tableData: [],
  fields: [],
  loading: false,
  error: null,
  selectedRow: null,
  page: 1,
  pageSize: 50,
  totalRows: null,

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
    set({ selectedTable: tableName, page: 1 })
  },

  loadTableData: async (connectionId, tableName) => {
    set({ loading: true, error: null })
    try {
      const state = get()
      const offset = (state.page - 1) * state.pageSize
      const result = await window.dbapi.executeQuery(
        connectionId,
        `SELECT * FROM ${tableName} LIMIT ${state.pageSize} OFFSET ${offset}`
      )
      // fetch total rows lazily once
      let total = state.totalRows
      if (total == null) {
        const countResult = await window.dbapi.executeQuery(
          connectionId,
          `SELECT COUNT(*) as count FROM ${tableName}`
        )
        total = Number(countResult.rows?.[0]?.count ?? 0)
      }
      set({ tableData: result.rows, fields: result.fields, totalRows: total })
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

  selectRow: (row) => set({ selectedRow: row }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1, totalRows: null })
}))


