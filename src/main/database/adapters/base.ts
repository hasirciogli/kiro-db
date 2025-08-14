import {
  DatabaseConnection,
  QueryResult,
  DatabaseSchema,
  ConnectionStatus
} from '../../../shared/types/database'

/**
 * Abstract base class for database adapters
 */
export abstract class DatabaseAdapter {
  protected connection: any
  protected config: DatabaseConnection
  protected connectionStatus: ConnectionStatus

  constructor(config: DatabaseConnection) {
    this.config = config
    this.connectionStatus = {
      id: config.id,
      status: 'disconnected',
      lastConnected: undefined,
      error: undefined
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus }
  }

  /**
   * Update connection status
   */
  protected updateConnectionStatus(status: ConnectionStatus['status'], error?: string): void {
    this.connectionStatus = {
      ...this.connectionStatus,
      status,
      error,
      lastConnected: status === 'connected' ? new Date() : this.connectionStatus.lastConnected
    }
  }

  /**
   * Establish connection to the database
   */
  abstract connect(): Promise<void>

  /**
   * Close the database connection
   */
  abstract disconnect(): Promise<void>

  /**
   * Execute a SQL query
   */
  abstract executeQuery(sql: string, params?: any[]): Promise<QueryResult>

  /**
   * Get database schema information
   */
  abstract getSchema(): Promise<DatabaseSchema>

  /**
   * Test the database connection
   */
  abstract testConnection(): Promise<boolean>

  /**
   * Check if the connection is active
   */
  abstract isConnected(): boolean

  /**
   * Cancel a running query
   */
  abstract cancelQuery(): Promise<void>

  /**
   * Get connection configuration (without sensitive data)
   */
  getConnectionConfig(): Omit<DatabaseConnection, 'password'> {
    const { password, ...config } = this.config
    return config
  }

  /**
   * Validate connection configuration
   */
  protected validateConfig(): void {
    if (!this.config.host) {
      throw new Error('Host is required')
    }
    if (!this.config.port || this.config.port <= 0) {
      throw new Error('Valid port is required')
    }
    if (!this.config.database) {
      throw new Error('Database name is required')
    }
    if (!this.config.username) {
      throw new Error('Username is required')
    }
    if (!this.config.password) {
      throw new Error('Password is required')
    }
  }

  /**
   * Handle connection errors and update status
   */
  protected handleConnectionError(error: any): void {
    const errorMessage = error.message || 'Unknown connection error'
    this.updateConnectionStatus('error', errorMessage)
    throw error
  }
}
