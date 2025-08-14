/* eslint-disable @typescript-eslint/no-explicit-any */
import { DatabaseConnection, ConnectionStatus, QueryResult, DatabaseSchema } from './database'

// IPC API Interface
export interface DatabaseAPI {
  // Connection Management
  saveConnection(connection: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>
  updateConnection(id: string, connection: Partial<DatabaseConnection>): Promise<void>
  deleteConnection(id: string): Promise<void>
  getConnections(): Promise<DatabaseConnection[]>

  // Database Operations
  connect(id: string): Promise<ConnectionStatus>
  disconnect(id: string): Promise<void>
  testConnection(connection: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean>

  // Query Operations
  executeQuery(connectionId: string, sql: string, params?: any[]): Promise<QueryResult>
  cancelQuery(connectionId: string): Promise<void>
  getSchema(connectionId: string): Promise<DatabaseSchema>
}

// IPC Channel Names
export const IPC_CHANNELS = {
  // Connection Management
  SAVE_CONNECTION: 'database:save-connection',
  UPDATE_CONNECTION: 'database:update-connection',
  DELETE_CONNECTION: 'database:delete-connection',
  GET_CONNECTIONS: 'database:get-connections',

  // Database Operations
  CONNECT: 'database:connect',
  DISCONNECT: 'database:disconnect',
  TEST_CONNECTION: 'database:test-connection',

  // Query Operations
  EXECUTE_QUERY: 'database:execute-query',
  CANCEL_QUERY: 'database:cancel-query',
  GET_SCHEMA: 'database:get-schema'
} as const
