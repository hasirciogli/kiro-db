/* eslint-disable @typescript-eslint/no-explicit-any */
// Database Connection Types
export interface DatabaseConnection {
  id: string
  name: string
  type: 'mysql' | 'postgresql'
  host: string
  port: number
  database: string
  username: string
  password: string // Encrypted in storage
  ssl?: boolean
  // Optional timeouts/configuration
  connectionTimeoutMs?: number
  queryTimeoutMs?: number
  idleTimeoutMs?: number
  healthCheckIntervalMs?: number
  createdAt: Date
  updatedAt: Date
}

export interface ConnectionStatus {
  id: string
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  error?: string
  lastConnected?: Date
}

// Database Schema Types
export interface DatabaseSchema {
  tables: TableInfo[]
  views: ViewInfo[]
  functions: FunctionInfo[]
  procedures: ProcedureInfo[]
}

export interface DatabaseObject {
  name: string
  type: 'table' | 'view' | 'function' | 'procedure'
  schema?: string
}

export interface TableInfo {
  name: string
  columns: ColumnInfo[]
  indexes: IndexInfo[]
  foreignKeys: ForeignKeyInfo[]
  rowCount?: number
}

export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  defaultValue?: any
  isPrimaryKey: boolean
  isAutoIncrement: boolean
}

export interface IndexInfo {
  name: string
  columns: string[]
  isUnique: boolean
  isPrimary: boolean
}

export interface ForeignKeyInfo {
  name: string
  column: string
  referencedTable: string
  referencedColumn: string
}

export interface ViewInfo {
  name: string
  columns: ColumnInfo[]
  definition: string
}

export interface FunctionInfo {
  name: string
  parameters: ParameterInfo[]
  returnType: string
  definition: string
}

export interface ProcedureInfo {
  name: string
  parameters: ParameterInfo[]
  definition: string
}

export interface ParameterInfo {
  name: string
  type: string
  mode: 'IN' | 'OUT' | 'INOUT'
  defaultValue?: any
}

// Query Result Types
export interface QueryResult {
  rows: any[]
  fields: FieldInfo[]
  rowCount: number
  executionTime: number
  affectedRows?: number
}

export interface FieldInfo {
  name: string
  type: string
  length?: number
}

// Error Types
export enum DatabaseErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  QUERY_ERROR = 'QUERY_ERROR',
  TIMEOUT = 'TIMEOUT',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR'
}

export interface DatabaseError {
  type: DatabaseErrorType
  message: string
  details?: any
  connectionId?: string
}
