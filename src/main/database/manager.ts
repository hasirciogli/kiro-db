import { DatabaseAdapter } from './adapters/base'
import { MySQLAdapter } from './adapters/mysql'
import { PostgreSQLAdapter } from './adapters/postgresql'
import {
  DatabaseConnection,
  ConnectionStatus,
  QueryResult,
  DatabaseSchema,
  DatabaseError,
  DatabaseErrorType
} from '../../shared/types/database'

/**
 * Database Manager - Coordinates database adapters and manages connections
 */
export class DatabaseManager {
  private connections: Map<string, DatabaseAdapter> = new Map()
  private connectionStatuses: Map<string, ConnectionStatus> = new Map()
  private queryTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private readonly defaultQueryTimeout = 30000 // 30 seconds
  private readonly defaultConnectionTimeout = 10000 // 10 seconds
  private readonly defaultIdleTimeout = 5 * 60 * 1000 // 5 minutes
  private idleTimers: Map<string, NodeJS.Timeout> = new Map()
  private healthCheckTimers: Map<string, NodeJS.Timeout> = new Map()
  private readonly maxConnections = 10
  private cleanupHandlers: (() => Promise<void>)[] = []

  constructor() {
    // Setup cleanup on process exit
    this.setupCleanupHandlers()
  }

  /**
   * Create and connect to a database
   */
  async connect(connection: DatabaseConnection): Promise<ConnectionStatus> {
    if (connection.type !== 'mysql' && connection.type !== 'postgresql') {
      throw new Error(`Unsupported database type: ${connection.type}`)
    }
    try {
      // Check connection limit
      if (this.connections.size >= this.maxConnections) {
        throw new Error(`Maximum number of connections (${this.maxConnections}) reached`)
      }

      // Create adapter based on database type
      const adapter = this.createAdapter(connection)

      // Store adapter and initial status
      this.connections.set(connection.id, adapter)
      this.updateConnectionStatus(connection.id, 'connecting')

      // Attempt connection
      await adapter.connect()

      // Update status from adapter
      const status = adapter.getConnectionStatus()
      this.connectionStatuses.set(connection.id, status)

      // Start idle timer and health checks
      this.startIdleTimer(connection.id, connection.idleTimeoutMs ?? this.defaultIdleTimeout)
      this.startHealthCheck(connection.id, connection.healthCheckIntervalMs ?? 30_000)

      return status
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error'
      const status: ConnectionStatus = {
        id: connection.id,
        status: 'error',
        error: errorMessage
      }

      this.connectionStatuses.set(connection.id, status)

      // Remove failed connection
      this.connections.delete(connection.id)

      throw this.createDatabaseError(
        DatabaseErrorType.CONNECTION_FAILED,
        errorMessage,
        connection.id
      )
    }
  }

  /**
   * Disconnect from a database
   */
  async disconnect(connectionId: string): Promise<void> {
    try {
      const adapter = this.connections.get(connectionId)
      if (!adapter) {
        throw new Error(`Connection ${connectionId} not found`)
      }

      // Cancel any running queries
      await this.cancelQuery(connectionId)

      // Disconnect adapter
      await adapter.disconnect()

      // Update status
      const status = adapter.getConnectionStatus()
      this.connectionStatuses.set(connectionId, status)

      // Remove from connections and clear timers
      this.connections.delete(connectionId)
      this.clearIdleTimer(connectionId)
      this.clearHealthCheck(connectionId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown disconnection error'
      this.updateConnectionStatus(connectionId, 'error', errorMessage)
      throw error
    }
  }

  /**
   * Execute a query with timeout handling
   */
  async executeQuery(
    connectionId: string,
    sql: string,
    params?: any[],
    timeoutMs?: number
  ): Promise<QueryResult> {
    const adapter = this.connections.get(connectionId)
    if (!adapter) {
      throw this.createDatabaseError(
        DatabaseErrorType.CONNECTION_FAILED,
        `Connection ${connectionId} not found`,
        connectionId
      )
    }

    if (!adapter.isConnected()) {
      throw this.createDatabaseError(
        DatabaseErrorType.CONNECTION_FAILED,
        `Connection ${connectionId} is not active`,
        connectionId
      )
    }

    const timeout = timeoutMs || this.defaultQueryTimeout

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(
            this.createDatabaseError(
              DatabaseErrorType.TIMEOUT,
              `Query timeout after ${timeout}ms`,
              connectionId
            )
          )
        }, timeout)

        this.queryTimeouts.set(connectionId, timeoutId)
      })

      // Execute query with timeout
      const queryPromise = adapter.executeQuery(sql, params)

      const result = await Promise.race([queryPromise, timeoutPromise])

      // Clear timeout
      this.clearQueryTimeout(connectionId)

      // Reset idle timer on activity
      this.resetIdleTimer(connectionId)

      return result
    } catch (error) {
      // Clear timeout on error
      this.clearQueryTimeout(connectionId)

      // Normalize timeout errors and ensure query cancellation
      const isTimeoutType = (error as DatabaseError)?.type === DatabaseErrorType.TIMEOUT
      const isTimeoutMessage =
        error instanceof Error && error.message.startsWith('Query timeout after')

      if (isTimeoutType || isTimeoutMessage) {
        try {
          await adapter.cancelQuery()
        } catch (cancelError) {
          console.error('Error cancelling query:', cancelError)
        }

        // Always standardize the timeout message using the effective timeout value
        throw this.createDatabaseError(
          DatabaseErrorType.TIMEOUT,
          `Query timeout after ${timeout}ms`,
          connectionId
        )
      }

      if (error instanceof Error && error.message.includes('timeout')) {
        // Try to cancel the query for other timeout-like errors
        try {
          await adapter.cancelQuery()
        } catch (cancelError) {
          console.error('Error cancelling query:', cancelError)
        }
      }

      // Determine error type
      let errorType = DatabaseErrorType.QUERY_ERROR
      if (error instanceof Error) {
        if (
          error.message.includes('authentication') ||
          error.message.includes('access denied')
        ) {
          errorType = DatabaseErrorType.AUTHENTICATION_FAILED
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          errorType = DatabaseErrorType.NETWORK_ERROR
        }
      }

      throw this.createDatabaseError(
        errorType,
        error instanceof Error ? error.message : 'Unknown query error',
        connectionId
      )
    }
  }

  /**
   * Cancel a running query
   */
  async cancelQuery(connectionId: string): Promise<void> {
    const adapter = this.connections.get(connectionId)
    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`)
    }

    // Clear timeout
    this.clearQueryTimeout(connectionId)

    // Cancel query in adapter
    await adapter.cancelQuery()
  }

  /**
   * Get database schema
   */
  async getSchema(connectionId: string): Promise<DatabaseSchema> {
    const adapter = this.connections.get(connectionId)
    if (!adapter) {
      throw this.createDatabaseError(
        DatabaseErrorType.CONNECTION_FAILED,
        `Connection ${connectionId} not found`,
        connectionId
      )
    }

    if (!adapter.isConnected()) {
      throw this.createDatabaseError(
        DatabaseErrorType.CONNECTION_FAILED,
        `Connection ${connectionId} is not active`,
        connectionId
      )
    }

    try {
      return await adapter.getSchema()
    } catch (error) {
      throw this.createDatabaseError(
        DatabaseErrorType.QUERY_ERROR,
        error instanceof Error ? error.message : 'Failed to get schema',
        connectionId
      )
    }
  }

  /**
   * Test a database connection
   */
  async testConnection(connection: DatabaseConnection): Promise<boolean> {
    try {
      const adapter = this.createAdapter(connection)
      return await adapter.testConnection()
    } catch (error) {
      return false
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(connectionId: string): ConnectionStatus | undefined {
    return this.connectionStatuses.get(connectionId)
  }

  /**
   * Get all connection statuses
   */
  getAllConnectionStatuses(): Map<string, ConnectionStatus> {
    return new Map(this.connectionStatuses)
  }

  /**
   * Get active connection count
   */
  getActiveConnectionCount(): number {
    return Array.from(this.connectionStatuses.values()).filter(
      (status) => status.status === 'connected'
    ).length
  }

  /**
   * Check if connection exists and is active
   */
  isConnectionActive(connectionId: string): boolean {
    const adapter = this.connections.get(connectionId)
    return adapter ? adapter.isConnected() : false
  }

  /**
   * Disconnect all connections
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.keys()).map((connectionId) =>
      this.disconnect(connectionId).catch((error) => {
        console.error(`Error disconnecting ${connectionId}:`, error)
      })
    )

    await Promise.all(disconnectPromises)
  }

  /**
   * Cleanup resources and connections
   */
  async cleanup(): Promise<void> {
    // Clear all query timeouts
    for (const timeoutId of this.queryTimeouts.values()) {
      clearTimeout(timeoutId)
    }
    this.queryTimeouts.clear()

    // Disconnect all connections
    await this.disconnectAll()

    this.connections.clear()
    this.connectionStatuses.clear()

    // Run additional cleanup handlers
    for (const handler of this.cleanupHandlers) {
      try {
        await handler()
      } catch (error) {
        console.error('Error in cleanup handler:', error)
      }
    }
  }

  /**
   * Add a cleanup handler
   */
  addCleanupHandler(handler: () => Promise<void>): void {
    this.cleanupHandlers.push(handler)
  }

  /**
   * Create appropriate database adapter
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
    const currentStatus = this.connectionStatuses.get(connectionId)
    const newStatus: ConnectionStatus = {
      id: connectionId,
      status,
      error,
      lastConnected: status === 'connected' ? new Date() : currentStatus?.lastConnected
    }

    this.connectionStatuses.set(connectionId, newStatus)
  }

  /**
   * Clear query timeout
   */
  private clearQueryTimeout(connectionId: string): void {
    const timeoutId = this.queryTimeouts.get(connectionId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.queryTimeouts.delete(connectionId)
    }
  }

  /**
   * Create a structured database error
   */
  private createDatabaseError(
    type: DatabaseErrorType,
    message: string,
    connectionId?: string
  ): DatabaseError {
    return {
      type,
      message,
      connectionId,
      details: undefined
    }
  }

  /**
   * Setup cleanup handlers for process exit
   */
  private setupCleanupHandlers(): void {
    const cleanup = async () => {
      console.log('Database Manager: Cleaning up connections...')
      await this.cleanup()
    }

    // Handle different exit scenarios
    process.on('exit', () => {
      // Synchronous cleanup only
      console.log('Database Manager: Process exiting')
    })

    process.on('SIGINT', async () => {
      console.log('Database Manager: Received SIGINT')
      await cleanup()
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      console.log('Database Manager: Received SIGTERM')
      await cleanup()
      process.exit(0)
    })

    process.on('uncaughtException', async (error) => {
      console.error('Database Manager: Uncaught exception:', error)
      await cleanup()
      process.exit(1)
    })

    process.on('unhandledRejection', async (reason) => {
      console.error('Database Manager: Unhandled rejection:', reason)
      await cleanup()
      process.exit(1)
    })
  }

  // Idle handling and health checks
  private startIdleTimer(connectionId: string, idleTimeoutMs: number): void {
    this.clearIdleTimer(connectionId)
    const timer = setTimeout(async () => {
      try {
        await this.disconnect(connectionId)
        console.log(`Disconnected idle connection ${connectionId}`)
      } catch (e) {
        console.error('Idle disconnect failed', e)
      }
    }, idleTimeoutMs)
    this.idleTimers.set(connectionId, timer)
  }

  private resetIdleTimer(connectionId: string): void {
    const currentStatus = this.connectionStatuses.get(connectionId)
    if (!currentStatus || currentStatus.status !== 'connected') return
    const idle = this.idleTimers.get(connectionId)
    if (idle) {
      clearTimeout(idle)
    }
    // Default to 5 mins on reset; if a custom idle timeout is needed, caller should call startIdleTimer
    this.startIdleTimer(connectionId, this.defaultIdleTimeout)
  }

  private clearIdleTimer(connectionId: string): void {
    const idle = this.idleTimers.get(connectionId)
    if (idle) {
      clearTimeout(idle)
      this.idleTimers.delete(connectionId)
    }
  }

  private startHealthCheck(connectionId: string, intervalMs: number): void {
    this.clearHealthCheck(connectionId)
    const timer = setInterval(() => {
      const isActive = this.isConnectionActive(connectionId)
      if (!isActive) return
      // For now, health check = lightweight query
      const adapter = this.connections.get(connectionId)
      if (!adapter) return
      adapter
        .executeQuery('SELECT 1')
        .then(() => {
          // OK
        })
        .catch(async (e) => {
          console.error(`Health check failed for ${connectionId}`, e)
          try {
            await this.disconnect(connectionId)
          } catch (err) {
            console.error('Error disconnecting after health check failure', err)
          }
        })
    }, intervalMs)
    this.healthCheckTimers.set(connectionId, timer as unknown as NodeJS.Timeout)
  }

  private clearHealthCheck(connectionId: string): void {
    const timer = this.healthCheckTimers.get(connectionId)
    if (timer) {
      clearInterval(timer as unknown as NodeJS.Timeout)
      this.healthCheckTimers.delete(connectionId)
    }
  }
}

// Export singleton instance
export const databaseManager = new DatabaseManager()
