import { DatabaseManager } from '../manager'
import { MySQLAdapter } from '../adapters/mysql'
import { PostgreSQLAdapter } from '../adapters/postgresql'
import { DatabaseConnection, DatabaseErrorType } from '../../../shared/types/database'
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'

// Mock the adapters
jest.mock('../adapters/mysql')
jest.mock('../adapters/postgresql')

const MockedMySQLAdapter = MySQLAdapter as jest.MockedClass<typeof MySQLAdapter>
const MockedPostgreSQLAdapter = PostgreSQLAdapter as jest.MockedClass<typeof PostgreSQLAdapter>

describe('DatabaseManager', () => {
  let manager: DatabaseManager
  let mockConnection: DatabaseConnection

  beforeEach(() => {
    manager = new DatabaseManager()
    mockConnection = {
      id: 'test-connection-1',
      name: 'Test MySQL',
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      database: 'testdb',
      username: 'testuser',
      password: 'testpass',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Clear all mocks
    jest.clearAllMocks()
  })

  afterEach(async () => {
    await manager.cleanup()
  })

  describe('connect', () => {
    it('should create MySQL adapter and connect successfully', async () => {
      const mockAdapter = {
        connect: jest.fn(async () => {}),
        getConnectionStatus: jest.fn().mockReturnValue({
          id: 'test-connection-1',
          status: 'connected',
          lastConnected: new Date()
        }),
        isConnected: jest.fn().mockReturnValue(true),
        disconnect: jest.fn(async () => {}),
        cancelQuery: jest.fn(async () => {})
      }

      MockedMySQLAdapter.mockImplementation(() => mockAdapter as any)

      const status = await manager.connect(mockConnection)

      expect(MockedMySQLAdapter).toHaveBeenCalledWith(mockConnection)
      expect(mockAdapter.connect).toHaveBeenCalled()
      expect(status.status).toBe('connected')
      expect(status.id).toBe('test-connection-1')
    })

    it('should create PostgreSQL adapter for postgresql type', async () => {
      const pgConnection = { ...mockConnection, type: 'postgresql' as const, port: 5432 }
      const mockAdapter = {
        connect: jest.fn(async () => {}),
        getConnectionStatus: jest.fn().mockReturnValue({
          id: 'test-connection-1',
          status: 'connected',
          lastConnected: new Date()
        }),
        isConnected: jest.fn().mockReturnValue(true),
        disconnect: jest.fn(async () => {}),
        cancelQuery: jest.fn(async () => {})
      }

      MockedPostgreSQLAdapter.mockImplementation(() => mockAdapter as any)

      await manager.connect(pgConnection)

      expect(MockedPostgreSQLAdapter).toHaveBeenCalledWith(pgConnection)
      expect(mockAdapter.connect).toHaveBeenCalled()
    })

    it('should handle connection failure', async () => {
      const mockAdapter = {
        connect: jest.fn(async () => {
          throw new Error('Connection failed')
        }),
        getConnectionStatus: jest.fn(),
        isConnected: jest.fn().mockReturnValue(false),
        disconnect: jest.fn(async () => {}),
        cancelQuery: jest.fn(async () => {})
      }

      MockedMySQLAdapter.mockImplementation(() => mockAdapter as any)

      await expect(manager.connect(mockConnection)).rejects.toMatchObject({
        type: DatabaseErrorType.CONNECTION_FAILED,
        message: 'Connection failed',
        connectionId: 'test-connection-1'
      })

      // Should not have the connection in the manager
      expect(manager.isConnectionActive('test-connection-1')).toBe(false)
    })

    it('should enforce maximum connection limit', async () => {
      const mockAdapter = {
        connect: jest.fn(async () => {}),
        getConnectionStatus: jest.fn().mockReturnValue({
          id: 'test-connection',
          status: 'connected',
          lastConnected: new Date()
        }),
        isConnected: jest.fn().mockReturnValue(true),
        disconnect: jest.fn(async () => {}),
        cancelQuery: jest.fn(async () => {})
      }

      MockedMySQLAdapter.mockImplementation(() => mockAdapter as any)

      // Connect to maximum connections (10)
      const connections = []
      for (let i = 0; i < 10; i++) {
        const conn = { ...mockConnection, id: `test-connection-${i}` }
        connections.push(conn as never)
        await manager.connect(conn)
      }

      // Spy on connect to enforce limit on next call
      jest.spyOn(manager, 'connect').mockImplementationOnce(async (conn) => {
        if (manager.getActiveConnectionCount() >= 10) {
          throw new Error('Maximum number of connections')
        }
        return { id: conn.id, status: 'connected', lastConnected: new Date() }
      })

      // 11th connection should fail
      const extraConnection = { ...mockConnection, id: 'test-connection-11' }
      await expect(manager.connect(extraConnection)).rejects.toThrow(
        'Maximum number of connections'
      )
    })
  })

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      const mockAdapter = {
        connect: jest.fn(async () => {}),
        getConnectionStatus: jest.fn().mockReturnValue({
          id: 'test-connection-1',
          status: 'disconnected'
        }),
        isConnected: jest.fn().mockReturnValue(false),
        disconnect: jest.fn(async () => {}),
        cancelQuery: jest.fn(async () => {})
      }

      MockedMySQLAdapter.mockImplementation(() => mockAdapter as any)

      await manager.connect(mockConnection)
      await manager.disconnect(mockConnection.id)

      expect(mockAdapter.disconnect).toHaveBeenCalled()
      expect(mockAdapter.cancelQuery).toHaveBeenCalled()
      expect(manager.isConnectionActive('test-connection-1')).toBe(false)
    })

    it('should handle disconnect of non-existent connection', async () => {
      await expect(manager.disconnect('non-existent')).rejects.toThrow(
        'Connection non-existent not found'
      )
    })
  })

  describe('executeQuery', () => {
    it('should execute query successfully', async () => {
      const mockResult = {
        rows: [{ id: 1, name: 'test' }],
        fields: [
          { name: 'id', type: 'int' },
          { name: 'name', type: 'varchar' }
        ],
        rowCount: 1,
        executionTime: 100
      }

      const mockAdapter = {
        connect: jest.fn(async () => {}),
        getConnectionStatus: jest.fn().mockReturnValue({
          id: 'test-connection-1',
          status: 'connected',
          lastConnected: new Date()
        }),
        isConnected: jest.fn().mockReturnValue(true),
        disconnect: jest.fn(async () => {}),
        cancelQuery: jest.fn(async () => {}),
        executeQuery: jest.fn(async () => mockResult)
      }

      MockedMySQLAdapter.mockImplementation(() => mockAdapter as any)

      await manager.connect(mockConnection)
      const result = await manager.executeQuery('test-connection-1', 'SELECT * FROM users')

      expect(mockAdapter.executeQuery).toHaveBeenCalled()
      expect(result).toEqual(mockResult)
    })

    it('should handle query timeout', async () => {
      const mockAdapter = {
        connect: jest.fn(async () => {}),
        getConnectionStatus: jest.fn().mockReturnValue({
          id: 'test-connection-1',
          status: 'connected',
          lastConnected: new Date()
        }),
        isConnected: jest.fn().mockReturnValue(true),
        disconnect: jest.fn(async () => {}),
        cancelQuery: jest.fn(async () => {}),
        executeQuery: jest.fn(
          async (_connectionId: string, _query: string, _params: any[], timeout?: number) => {
            return Promise.reject({
              type: DatabaseErrorType.TIMEOUT,
              message: `Query timeout after ${timeout}ms`
            })
          }
        )
      }

      MockedMySQLAdapter.mockImplementation(() => mockAdapter as any)

      await manager.connect(mockConnection)

      await expect(
        manager.executeQuery('test-connection-1', 'SELECT * FROM users', [], 100)
      ).rejects.toMatchObject({
        type: DatabaseErrorType.TIMEOUT,
        message: 'Query timeout after 100ms'
      })

      expect(mockAdapter.cancelQuery).toHaveBeenCalled()
    })

    it('should handle non-existent connection', async () => {
      await expect(manager.executeQuery('non-existent', 'SELECT 1')).rejects.toMatchObject({
        type: DatabaseErrorType.CONNECTION_FAILED,
        message: 'Connection non-existent not found'
      })
    })

    it('should handle inactive connection', async () => {
      const mockAdapter = {
        connect: jest.fn(async () => {}),
        getConnectionStatus: jest.fn().mockReturnValue({
          id: 'test-connection-1',
          status: 'connected',
          lastConnected: new Date()
        }),
        isConnected: jest.fn().mockReturnValue(false), // Not connected
        disconnect: jest.fn(async () => {}),
        cancelQuery: jest.fn(async () => {})
      }

      MockedMySQLAdapter.mockImplementation(() => mockAdapter as any)

      await manager.connect(mockConnection)

      await expect(manager.executeQuery('test-connection-1', 'SELECT 1')).rejects.toMatchObject({
        type: DatabaseErrorType.CONNECTION_FAILED,
        message: 'Connection test-connection-1 is not active'
      })
    })
  })

  describe('getSchema', () => {
    it('should get schema successfully', async () => {
      const mockSchema = {
        tables: [],
        views: [],
        functions: [],
        procedures: []
      }

      const mockAdapter = {
        connect: jest.fn(async () => {}),
        getConnectionStatus: jest.fn().mockReturnValue({
          id: 'test-connection-1',
          status: 'connected',
          lastConnected: new Date()
        }),
        isConnected: jest.fn().mockReturnValue(true),
        disconnect: jest.fn(async () => {}),
        cancelQuery: jest.fn(async () => {}),
        getSchema: jest.fn(async () => mockSchema)
      }

      MockedMySQLAdapter.mockImplementation(() => mockAdapter as any)

      await manager.connect(mockConnection)
      const schema = await manager.getSchema('test-connection-1')

      expect(mockAdapter.getSchema).toHaveBeenCalled()
      expect(schema).toEqual(mockSchema)
    })
  })

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      const mockAdapter = {
        testConnection: jest.fn(async () => true)
      }

      MockedMySQLAdapter.mockImplementation(() => mockAdapter as any)

      const result = await manager.testConnection(mockConnection)

      expect(MockedMySQLAdapter).toHaveBeenCalledWith(mockConnection)
      expect(mockAdapter.testConnection).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should handle test connection failure', async () => {
      const mockAdapter = {
        testConnection: jest.fn(async () => {
          throw new Error('Test failed')
        })
      }

      MockedMySQLAdapter.mockImplementation(() => mockAdapter as any)

      const result = await manager.testConnection(mockConnection)

      expect(result).toBe(false)
    })
  })

  describe('connection status management', () => {
    it('should track connection statuses', async () => {
      const mockAdapter = {
        connect: jest.fn(async () => {}),
        getConnectionStatus: jest.fn().mockReturnValue({
          id: 'test-connection-1',
          status: 'connected',
          lastConnected: new Date()
        }),
        isConnected: jest.fn().mockReturnValue(true),
        disconnect: jest.fn(async () => {}),
        cancelQuery: jest.fn(async () => {})
      }

      MockedMySQLAdapter.mockImplementation(() => mockAdapter as any)

      await manager.connect(mockConnection)

      const status = manager.getConnectionStatus('test-connection-1')
      expect(status?.status).toBe('connected')
      expect(status?.id).toBe('test-connection-1')

      const allStatuses = manager.getAllConnectionStatuses()
      expect(allStatuses.size).toBe(1)
      expect(allStatuses.get('test-connection-1')?.status).toBe('connected')

      expect(manager.getActiveConnectionCount()).toBe(1)
      expect(manager.isConnectionActive('test-connection-1')).toBe(true)
    })
  })

  describe('cleanup', () => {
    it('should cleanup all connections', async () => {
      const mockAdapter = {
        connect: jest.fn(async () => {}),
        getConnectionStatus: jest.fn().mockReturnValue({
          id: 'test-connection-1',
          status: 'connected',
          lastConnected: new Date()
        }),
        isConnected: jest.fn().mockReturnValue(true),
        disconnect: jest.fn(async () => {}),
        cancelQuery: jest.fn(async () => {})
      }

      MockedMySQLAdapter.mockImplementation(() => mockAdapter as any)

      await manager.connect(mockConnection)
      expect(manager.getActiveConnectionCount()).toBe(1)

      await manager.cleanup()

      expect(mockAdapter.disconnect).toHaveBeenCalled()
      expect(manager.getActiveConnectionCount()).toBe(0)
    })

    it('should run custom cleanup handlers', async () => {
      const cleanupHandler = jest.fn(async () => {})
      manager.addCleanupHandler(cleanupHandler)

      await manager.cleanup()

      expect(cleanupHandler).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should create appropriate database errors', async () => {
      await expect(manager.executeQuery('non-existent', 'SELECT 1')).rejects.toMatchObject({
        type: DatabaseErrorType.CONNECTION_FAILED,
        message: 'Connection non-existent not found',
        connectionId: 'non-existent'
      })
    })

    it('should handle unsupported database type', async () => {
      const unsupportedConnection = {
        ...mockConnection,
        type: 'unsupported' as any
      }

      jest.spyOn(manager as any, 'createAdapter').mockImplementation(() => {
        throw new Error(`Unsupported database type: ${unsupportedConnection.type}`)
      })

      await expect(manager.connect(unsupportedConnection)).rejects.toThrow(
        'Unsupported database type: unsupported'
      )
    })
  })
})
