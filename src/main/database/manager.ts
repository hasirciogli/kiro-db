import {
  DatabaseConnection,
  ConnectionStatus,
  QueryResult,
  DatabaseSchema
} from '../../shared/types/database'
import { DatabaseAdapter } from './adapters/base'
import { MySQLAdapter } from './adapters/mysql'
import { PostgreSQLAdapter } from './adapters/postgresql'

/**
 * Database manager that coordinates database adapters and connections
 */
export class DatabaseManager {
  private connections: Map<string, DatabaseAdapter> = new Map()
  private connectionStatuses: Map<string, ConnectionStatus> = new Map()

  /**
   * Create and connect to a database
   */
  async connect(connection: DatabaseConnection): Promise<void> {
    const adapter = this.createAdapter(connection)

    try {
      await adapter.connect()
      this.connections.set(connection.id, adapter)
      this.updateConnectionStatus(connection.id, 'connected')
    } catch (error) {
      this.updateConnectionStatus(
        connection.id,
        'error',
        error instanceof Error ? error.message : 'Unknown error'
      )
      throw error
    }
  }

  /**
   * Disconnect from a database
   */
  async disconnect(connectionId: string): Promise<void> {
    const adapter = this.connections.get(connectionId)
    if (adapter) {
      try {
        await adapter.disconnect()
        this.connections.delete(connectionId)
        this.updateConnectionStatus(connectionId, 'disconnected')
      } catch (error) {
        this.updateConnectionStatus(
          connectionId,
          'error',
          error instanceof Error ? error.message : 'Unknown error'
        )
        throw error
      }
    }
  }

  /**
   * Execute a SQL query on a connection
   */
  async executeQuery(connectionId: string, sql: string, params?: unknown[]): Promise<QueryResult> {
    const adapter = this.connections.get(connectionId)
    if (!adapter) {
      throw new Error(`No active connection found for ID: ${connectionId}`)
    }

    return adapter.executeQuery(sql, params)
  }

  /**
   * Get database schema for a connection
   */
  async getSchema(connectionId: string): Promise<DatabaseSchema> {
    const adapter = this.connections.get(connectionId)
    if (!adapter) {
      throw new Error(`No active connection found for ID: ${connectionId}`)
    }

    return adapter.getSchema()
  }

  /**
   * Test a database connection without storing it
   */
  async testConnection(connection: DatabaseConnection): Promise<boolean> {
    const adapter = this.createAdapter(connection)
    try {
      return await adapter.testConnection()
    } catch (err) {
      return false
    }
  }

  /**
   * Cancel a running query
   */
  async cancelQuery(connectionId: string): Promise<void> {
    const adapter = this.connections.get(connectionId)
    if (adapter) {
      await adapter.cancelQuery()
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(connectionId: string): ConnectionStatus | undefined {
    return this.connectionStatuses.get(connectionId)
  }

  /**
   * Cleanup all connections
   */
  async cleanup(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.keys()).map((id) =>
      this.disconnect(id).catch(console.error)
    )
    await Promise.all(disconnectPromises)
  }

  /**
   * Create appropriate database adapter based on connection type
   */
  private createAdapter(connection: DatabaseConnection): DatabaseAdapter {
    switch (connection.type) {
      case 'mysql':
        return new MySQLAdapter(connection)
      case 'postgresql':
        return new PostgreSQLAdapter(connection)
      default:
        throw new Error(`Unsupported database type: ${connection.type}`)
    }
  }

  /**
   * Update connection status
   */
  private updateConnectionStatus(
    connectionId: string,
    status: ConnectionStatus['status'],
    error?: string
  ): void {
    const currentStatus = this.connectionStatuses.get(connectionId) || {
      id: connectionId,
      status: 'disconnected'
    }

    this.connectionStatuses.set(connectionId, {
      ...currentStatus,
      status,
      error,
      lastConnected: status === 'connected' ? new Date() : currentStatus.lastConnected
    })
  }
}
