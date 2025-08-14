/* eslint-disable @typescript-eslint/no-explicit-any */
import { PostgreSQLAdapter } from '../postgresql'
import { DatabaseConnection } from '../../../../shared/types/database'
import { jest, describe, beforeEach, afterEach, expect, it } from '@jest/globals'

// Mock pg
jest.mock('pg', () => ({
  Client: jest.fn()
}))

import { Client } from 'pg'

describe('PostgreSQLAdapter', () => {
  let adapter: PostgreSQLAdapter
  let mockClient: any
  let testConfig: DatabaseConnection

  beforeEach(() => {
    testConfig = {
      id: 'test-id',
      name: 'Test PostgreSQL',
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      username: 'testuser',
      password: 'testpass',
      ssl: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    mockClient = {
      connect: jest.fn(),
      query: jest.fn(),
      end: jest.fn()
    }
    ;(Client as jest.MockedClass<typeof Client>).mockImplementation(() => mockClient)
    adapter = new PostgreSQLAdapter(testConfig)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('connect', () => {
    it('should connect successfully with valid config', async () => {
      ;(mockClient.connect as jest.Mock).mockImplementation(() => Promise.resolve())

      await adapter.connect()

      expect(Client).toHaveBeenCalledWith({
        host: 'localhost',
        port: 5432,
        user: 'testuser',
        password: 'testpass',
        database: 'testdb',
        ssl: false,
        connectionTimeoutMillis: 10000,
        query_timeout: 30000
      })

      expect(mockClient.connect).toHaveBeenCalled()
      expect(adapter.getConnectionStatus().status).toBe('connected')
    })

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed')
      ;(mockClient.connect as jest.Mock).mockImplementation(() => Promise.reject(error))

      await expect(adapter.connect()).rejects.toThrow('Connection failed')
      expect(adapter.getConnectionStatus().status).toBe('error')
    })

    it('should validate config before connecting', async () => {
      const invalidConfig = { ...testConfig, host: '' }
      const invalidAdapter = new PostgreSQLAdapter(invalidConfig)

      await expect(invalidAdapter.connect()).rejects.toThrow('Host is required')
    })
  })

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      ;(mockClient.connect as jest.Mock).mockImplementation(() => Promise.resolve())
      await adapter.connect()
      ;(mockClient.end as jest.Mock).mockImplementation(() => Promise.resolve())
      await adapter.disconnect()

      expect(mockClient.end).toHaveBeenCalled()
      expect(adapter.getConnectionStatus().status).toBe('disconnected')
    })

    it('should handle disconnect errors gracefully', async () => {
      ;(mockClient.connect as jest.Mock).mockImplementation(() => Promise.resolve())
      await adapter.connect()
      ;(mockClient.end as jest.Mock).mockImplementation(() =>
        Promise.reject(new Error('Disconnect failed'))
      )

      await adapter.disconnect()
      expect(adapter.getConnectionStatus().status).toBe('error')
    })
  })

  describe('executeQuery', () => {
    beforeEach(async () => {
      ;(mockClient.connect as jest.Mock).mockImplementation(() => Promise.resolve())
      await adapter.connect()
    })

    it('should execute query successfully', async () => {
      const mockResult = {
        rows: [{ id: 1, name: 'test' }],
        fields: [
          { name: 'id', dataTypeID: 23 },
          { name: 'name', dataTypeID: 1043 }
        ],
        rowCount: 1
      }
      ;(mockClient.query as jest.Mock).mockImplementation(() => Promise.resolve(mockResult))

      const result = await adapter.executeQuery('SELECT * FROM users')

      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM users', [])
      expect(result.rows).toEqual(mockResult.rows)
      expect(result.rowCount).toBe(1)
      expect(result.fields).toEqual([
        { name: 'id', type: '23', length: undefined },
        { name: 'name', type: '1043', length: undefined }
      ])
    })

    it('should execute query with parameters', async () => {
      const mockResult = {
        rows: [{ id: 1 }],
        fields: [{ name: 'id', dataTypeID: 23 }],
        rowCount: 1
      }
      ;(mockClient.query as jest.Mock).mockImplementation(() => Promise.resolve(mockResult))

      await adapter.executeQuery('SELECT * FROM users WHERE id = $1', [1])

      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1])
    })

    it('should throw error when not connected', async () => {
      await adapter.disconnect()

      await expect(adapter.executeQuery('SELECT 1')).rejects.toThrow('Not connected to database')
    })

    it('should handle query errors', async () => {
      ;(mockClient.query as jest.Mock).mockImplementation(() =>
        Promise.reject(new Error('Query failed'))
      )

      await expect(adapter.executeQuery('INVALID SQL')).rejects.toThrow('Query failed')
    })
  })

  describe('testConnection', () => {
    it('should return true for successful connection test', async () => {
      ;(mockClient.connect as jest.Mock).mockImplementation(() => Promise.resolve())
      ;(mockClient.query as jest.Mock).mockImplementation(() =>
        Promise.resolve({ rows: [], fields: [] })
      )

      const result = await adapter.testConnection()

      expect(result).toBe(true)
    })

    it('should return false for failed connection test', async () => {
      ;(mockClient.connect as jest.Mock).mockImplementation(() =>
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
      ;(mockClient.connect as jest.Mock).mockImplementation(() => Promise.resolve())
      await adapter.connect()
      expect(adapter.isConnected()).toBe(true)
    })
  })

  describe('cancelQuery', () => {
    it('should cancel running query', async () => {
      ;(mockClient.connect as jest.Mock).mockImplementation(() => Promise.resolve())
      await adapter.connect()

      // Simulate a running query
      ;(adapter as any).currentQuery = Promise.resolve()
      ;(mockClient.end as jest.Mock).mockImplementation(() => Promise.resolve())
      await adapter.cancelQuery()

      expect(mockClient.end).toHaveBeenCalled()
      expect(adapter.getConnectionStatus().status).toBe('disconnected')
    })
  })

  describe('getSchema', () => {
    beforeEach(async () => {
      ;(mockClient.connect as jest.Mock).mockImplementation(() => Promise.resolve())
      await adapter.connect()
    })

    it('should get database schema', async () => {
      // Mock all the queries for schema introspection
      const mockQuery = mockClient.query as jest.Mock
      mockQuery
        .mockImplementationOnce(() =>
          Promise.resolve({
            rows: [{ table_name: 'users' }, { table_name: 'posts' }]
          })
        )
        // Mock columns query for users table
        .mockImplementationOnce(() =>
          Promise.resolve({
            rows: [
              {
                column_name: 'id',
                data_type: 'integer',
                is_nullable: 'NO',
                column_default: "nextval('users_id_seq'::regclass)",
                is_primary_key: true,
                is_auto_increment: true
              }
            ]
          })
        )
        // Mock indexes query for users table
        .mockImplementationOnce(() => Promise.resolve({ rows: [] }))
        // Mock foreign keys query for users table
        .mockImplementationOnce(() => Promise.resolve({ rows: [] }))
        // Mock row count query for users table
        .mockImplementationOnce(() => Promise.resolve({ rows: [{ count: '10' }] }))
        // Mock columns query for posts table
        .mockImplementationOnce(() =>
          Promise.resolve({
            rows: [
              {
                column_name: 'id',
                data_type: 'integer',
                is_nullable: 'NO',
                column_default: "nextval('posts_id_seq'::regclass)",
                is_primary_key: true,
                is_auto_increment: true
              }
            ]
          })
        )
        // Mock indexes query for posts table
        .mockImplementationOnce(() => Promise.resolve({ rows: [] }))
        // Mock foreign keys query for posts table
        .mockImplementationOnce(() => Promise.resolve({ rows: [] }))
        // Mock row count query for posts table
        .mockImplementationOnce(() => Promise.resolve({ rows: [{ count: '5' }] }))
        // Mock views query
        .mockImplementationOnce(() => Promise.resolve({ rows: [] }))
        // Mock functions query
        .mockImplementationOnce(() => Promise.resolve({ rows: [] }))
        // Mock procedures query
        .mockImplementationOnce(() => Promise.resolve({ rows: [] }))

      const schema = await adapter.getSchema()

      expect(schema.tables).toHaveLength(2)
      expect(schema.tables[0].name).toBe('users')
      expect(schema.tables[0].columns[0].name).toBe('id')
      expect(schema.tables[0].columns[0].isPrimaryKey).toBe(true)
      expect(schema.tables[0].columns[0].isAutoIncrement).toBe(true)
      expect(schema.tables[0].rowCount).toBe(10)
    })

    it('should throw error when not connected', async () => {
      await adapter.disconnect()

      await expect(adapter.getSchema()).rejects.toThrow('Not connected to database')
    })
  })
})
