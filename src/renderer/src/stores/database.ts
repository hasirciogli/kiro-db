import { create } from 'zustand'
import type { DatabaseSchema, QueryResult, DatabaseObject } from '../../../shared/types/database'

interface DatabaseStoreState {
  schema: DatabaseSchema | null
  currentSchemaConnectionId: string | null
  selectedTable: string | null
  selectedObject: DatabaseObject | null
  tableData: any[]
  fields: { name: string; type: string; length?: number }[]
  loading: boolean
  error: string | null
  selectedRow: any | null
  page: number
  pageSize: number
  totalRows: number | null
  resultCache: Record<
    string,
    { rows: any[]; fields: { name: string; type: string; length?: number }[]; totalRows: number }
  >

  loadSchema: (connectionId: string) => Promise<void>
  selectTable: (tableName: string | null) => Promise<void>
  selectObject: (object: DatabaseObject | null) => void
  loadTableData: (connectionId: string, tableName: string) => Promise<void>
  executeQuery: (connectionId: string, sql: string, params?: any[]) => Promise<QueryResult>
  selectRow: (row: any | null) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
}

export const useDatabaseStore = create<DatabaseStoreState>((set, get) => ({
  schema: null,
  currentSchemaConnectionId: null,
  selectedTable: null,
  selectedObject: null,
  tableData: [],
  fields: [],
  loading: false,
  error: null,
  selectedRow: null,
  page: 1,
  pageSize: 50,
  totalRows: null,
  resultCache: {},

  loadSchema: async (connectionId) => {
    // Avoid refetch if same connection schema is already loaded
    const state = get()
    if (state.schema && state.currentSchemaConnectionId === connectionId) {
      return
    }
    set({ loading: true, error: null })
    try {
      const schema = await window.dbapi.getSchema(connectionId)
      set({ schema, currentSchemaConnectionId: connectionId })
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to load schema' })
    } finally {
      set({ loading: false })
    }
  },

  selectTable: async (tableName) => {
    set({
      selectedTable: tableName,
      page: 1,
      selectedObject: tableName ? { name: tableName, type: 'table' } : null
    })
  },

  selectObject: (object) => set({ selectedObject: object }),

  loadTableData: async (connectionId, tableName) => {
    set({ loading: true, error: null })
    try {
      const state = get()
      const offset = (state.page - 1) * state.pageSize
      const cacheKey = `${connectionId}:${tableName}:${state.page}:${state.pageSize}`
      const cached = state.resultCache[cacheKey]
      if (cached) {
        set({ tableData: cached.rows, fields: cached.fields, totalRows: cached.totalRows })
        return
      }
      const result = await window.dbapi.executeQuery(
        connectionId,
        `SELECT * FROM ${tableName} LIMIT ${state.pageSize} OFFSET ${offset}`
      )
      const countResult = await window.dbapi.executeQuery(
        connectionId,
        `SELECT COUNT(*) as count FROM ${tableName}`
      )
      const total = Number(countResult.rows?.[0]?.count ?? 0)
      set((s) => ({
        tableData: result.rows,
        fields: result.fields,
        totalRows: total,
        resultCache: {
          ...s.resultCache,
          [cacheKey]: { rows: result.rows, fields: result.fields, totalRows: total }
        }
      }))
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
