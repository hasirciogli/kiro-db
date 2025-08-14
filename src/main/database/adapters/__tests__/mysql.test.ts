import { MySQLAdapter } from '../mysql'
import { DatabaseConnection } from '../../../../shared/types/database'
import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals'

// Mock mysql2/promise
jest.mock('mysql2/promise', () => ({
  createConnection: jest.fn()
}))

import * as mockMysql from 'mysql2/promise'

describe('MySQLAdapter', () => {
  let adapter: MySQLAdapter
  let mockConnection: any
  let testConfig: DatabaseConnection

  beforeEach(() => {
    testConfig = {
      id: 'test-id',
      name: 'Test MySQL',
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      database: 'testdb',
      username: 'testuser',
      password: 'testpass',
      ssl: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    mockConnection = {
      execute: jest.fn(),
      end: jest.fn(),
      destroy: jest.fn()
    }
    ;(mockMysql.createConnection as jest.Mock).mockImplementation(() =>
      Promise.resolve(mockConnection)
    )
    adapter = new MySQLAdapter(testConfig)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('connect', () => {
    it('should connect successfully with valid config', async () => {
      await adapter.connect()

      expect(mockMysql.createConnection).toHaveBeenCalledWith({
        host: 'localhost',
        port: 3306,
        user: 'testuser',
        password: 'testpass',
        database: 'testdb',
        ssl: undefined,
        connectTimeout: 10000
      })

      expect(adapter.getConnectionStatus().status).toBe('connected')
    })

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed')
      ;(mockMysql.createConnection as jest.Mock).mockImplementation(() => Promise.reject(error))

      await expect(adapter.connect()).rejects.toThrow('Connection failed')
      expect(adapter.getConnectionStatus().status).toBe('error')
    })

    it('should validate config before connecting', async () => {
      const invalidConfig = { ...testConfig, host: '' }
      const invalidAdapter = new MySQLAdapter(invalidConfig)

      await expect(invalidAdapter.connect()).rejects.toThrow('Host is required')
    })
  })

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await adapter.connect()
      await adapter.disconnect()

      expect(mockConnection.end).toHaveBeenCalled()
      expect(adapter.getConnectionStatus().status).toBe('disconnected')
    })

    it('should handle disconnect errors gracefully', async () => {
      await adapter.connect()
      ;(mockConnection.end as jest.Mock).mockImplementation(() =>
        Promise.reject(new Error('Disconnect failed'))
      )

      await adapter.disconnect()
      expect(adapter.getConnectionStatus().status).toBe('error')
    })
  })

  describe('executeQuery', () => {
    beforeEach(async () => {
      await adapter.connect()
    })

    it('should execute query successfully', async () => {
      const mockRows = [{ id: 1, name: 'test' }]
      const mockFields = [
        { name: 'id', type: 'int' },
        { name: 'name', type: 'varchar' }
      ]
      ;(mockConnection.execute as jest.Mock).mockImplementation(() =>
        Promise.resolve([mockRows, mockFields])
      )

      const result = await adapter.executeQuery('SELECT * FROM users')

      expect(mockConnection.execute).toHaveBeenCalledWith('SELECT * FROM users', [])
      expect(result.rows).toEqual(mockRows)
      expect(result.rowCount).toBe(1)
      expect(result.fields).toEqual([
        { name: 'id', type: 'int', length: undefined },
        { name: 'name', type: 'varchar', length: undefined }
      ])
    })

    it('should execute query with parameters', async () => {
      const mockRows = [{ id: 1 }]
      const mockFields = [{ name: 'id', type: 'int' }]
      ;(mockConnection.execute as jest.Mock).mockImplementation(() =>
        Promise.resolve([mockRows, mockFields])
      )

      await adapter.executeQuery('SELECT * FROM users WHERE id = ?', [1])

      expect(mockConnection.execute).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [1])
    })

    it('should throw error when not connected', async () => {
      await adapter.disconnect()

      await expect(adapter.executeQuery('SELECT 1')).rejects.toThrow('Not connected to database')
    })

    it('should handle query errors', async () => {
      ;(mockConnection.execute as jest.Mock).mockImplementation(() =>
        Promise.reject(new Error('Query failed'))
      )

      await expect(adapter.executeQuery('INVALID SQL')).rejects.toThrow('Query failed')
    })
  })

  describe('testConnection', () => {
    it('should return true for successful connection test', async () => {
      ;(mockConnection.execute as jest.Mock).mockImplementation(() => Promise.resolve([[], []]))

      const result = await adapter.testConnection()

      expect(result).toBe(true)
    })

    it('should return false for failed connection test', async () => {
      ;(mockMysql.createConnection as jest.Mock).mockImplementation(() =>
        Promise.reject(new Error('Connection failed'))
      )

      const result = await adapter.testConnection()

      expect(result).toBe(false)
    })
  })

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      expect(adapter.isConnected()).toBe(false)
    })

    it('should return true when connected', async () => {
      await adapter.connect()
      expect(adapter.isConnected()).toBe(true)
    })
  })

  describe('cancelQuery', () => {
    it('should cancel running query', async () => {
      await adapter.connect()

      // Simulate a running query
      ;(adapter as any).currentQuery = Promise.resolve()

      await adapter.cancelQuery()

      expect(mockConnection.destroy).toHaveBeenCalled()
      expect(adapter.getConnectionStatus().status).toBe('disconnected')
    })
  })

  describe('getSchema', () => {
    beforeEach(async () => {
      await adapter.connect()
    })

    it('should get database schema', async () => {
      // Mock all the queries for schema introspection
      const mockExecute = mockConnection.execute as jest.Mock

      // Mock all queries with a general implementation
      mockExecute.mockImplementation((sql: any) => {
        if (sql.includes('information_schema.TABLES')) {
          // Tables query
          return Promise.resolve([[{ TABLE_NAME: 'users' }], []])
        } else if (sql.includes('information_schema.COLUMNS')) {
          // Columns query
          return Promise.resolve([
            [
              {
                COLUMN_NAME: 'id',
                DATA_TYPE: 'int',
                IS_NULLABLE: 'NO',
                COLUMN_DEFAULT: null,
                COLUMN_KEY: 'PRI',
                EXTRA: 'auto_increment'
              },
              {
                COLUMN_NAME: 'name',
                DATA_TYPE: 'varchar',
                IS_NULLABLE: 'YES',
                COLUMN_DEFAULT: null,
                COLUMN_KEY: '',
                EXTRA: null
              }
            ],
            []
          ])
        } else if (sql.includes('information_schema.STATISTICS')) {
          // Indexes query
          return Promise.resolve([[], []])
        } else if (sql.includes('information_schema.KEY_COLUMN_USAGE')) {
          // Foreign keys query
          return Promise.resolve([[], []])
        } else if (sql.includes('COUNT(*)')) {
          // Row count query
          return Promise.resolve([[{ count: 10 }], []])
        } else if (sql.includes('information_schema.VIEWS')) {
          // Views query
          return Promise.resolve([[], []])
        } else if (sql.includes('information_schema.ROUTINES')) {
          // Functions/procedures query
          return Promise.resolve([[], []])
        }
        return Promise.resolve([[], []])
      })

      const schema = await adapter.getSchema()

      expect(schema.tables).toHaveLength(1)
      expect(schema.tables[0].name).toBe('users')
      expect(schema.tables[0].columns[0].name).toBe('id')
      expect(schema.tables[0].columns[0].isPrimaryKey).toBe(true)
      expect(schema.tables[0].columns[0].isAutoIncrement).toBe(true)
      expect(schema.tables[0].columns[1].name).toBe('name')
      expect(schema.tables[0].columns[1].isAutoIncrement).toBe(false)
      expect(schema.tables[0].rowCount).toBe(10)
    })

    it('should throw error when not connected', async () => {
      await adapter.disconnect()

      await expect(adapter.getSchema()).rejects.toThrow('Not connected to database')
    })
  })
})
