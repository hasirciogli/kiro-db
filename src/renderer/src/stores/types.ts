import {
  DatabaseConnection,
  ConnectionStatus,
  DatabaseSchema,
  DatabaseObject
} from '../../../shared/types/database'

// Connection Store Types
export interface ConnectionStore {
  connections: DatabaseConnection[]
  connectionStatuses: Map<string, ConnectionStatus>
  activeConnection: string | null

  // Actions
  loadConnections: () => Promise<void>
  saveConnection: (connection: Omit<DatabaseConnection, 'id'>) => Promise<void>
  updateConnection: (id: string, updates: Partial<DatabaseConnection>) => Promise<void>
  deleteConnection: (id: string) => Promise<void>
  connect: (id: string) => Promise<void>
  disconnect: (id: string) => Promise<void>
  testConnection: (connection: Omit<DatabaseConnection, 'id'>) => Promise<boolean>
}

// Database Store Types
export interface DatabaseStore {
  schema: DatabaseSchema | null
  selectedTable: string | null
  selectedObject: DatabaseObject | null
  tableData: any[]
  selectedRow: any | null
  isLoading: boolean
  error: string | null

  // Actions
  loadSchema: (connectionId: string) => Promise<void>
  selectTable: (tableName: string) => Promise<void>
  selectObject: (object: DatabaseObject) => void
  loadTableData: (tableName: string) => Promise<void>
  selectRow: (row: any) => void
  clearError: () => void
}

// UI Store Types
export interface UIStore {
  leftSidebarOpen: boolean
  databaseSidebarOpen: boolean
  rowDetailSheetOpen: boolean

  // Actions
  toggleLeftSidebar: () => void
  toggleDatabaseSidebar: () => void
  toggleRowDetailSheet: () => void
  setLeftSidebarOpen: (open: boolean) => void
  setDatabaseSidebarOpen: (open: boolean) => void
  setRowDetailSheetOpen: (open: boolean) => void
}
