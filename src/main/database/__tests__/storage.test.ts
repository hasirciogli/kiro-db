/* eslint-disable @typescript-eslint/no-explicit-any */
import { LocalStorageManager, DatabaseConnection } from '../storage'
import { EncryptionManager } from '../encryption'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { describe, beforeEach, afterEach, it, expect } from '@jest/globals'

describe('LocalStorageManager', () => {
  let storageManager: LocalStorageManager
  let testDataPath: string
  let sampleConnection: DatabaseConnection

  beforeEach(async () => {
    // Reset singletons
    ;(LocalStorageManager as any).instance = null
    ;(EncryptionManager as any).instance = null

    // Create test data path
    testDataPath = join(tmpdir(), 'test-storage-' + Date.now())
    storageManager = LocalStorageManager.getInstance(testDataPath)

    await storageManager.initialize()

    // Create sample connection
    sampleConnection = {
      id: 'test-connection-1',
      name: 'Test Database',
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      username: 'testuser',
      password: 'testpassword123',
      ssl: true,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z')
    }
  })

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rm(testDataPath, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = LocalStorageManager.getInstance(testDataPath)
      const instance2 = LocalStorageManager.getInstance(testDataPath)
      expect(instance1).toBe(instance2)
    })
  })

  describe('Initialization', () => {
    it('should create data directory on initialization', async () => {
      const dataPath = storageManager.getDataPath()
      const dirExists = await fs
        .access(dataPath)
        .then(() => true)
        .catch(() => false)
      expect(dirExists).toBe(true)
    })

    it('should create connections file on initialization', async () => {
      const connectionsFile = storageManager.getConnectionsFilePath()
      const fileExists = await fs
        .access(connectionsFile)
        .then(() => true)
        .catch(() => false)
      expect(fileExists).toBe(true)
    })

    it('should initialize with empty connections array', async () => {
      const connections = await storageManager.loadAllConnections()
      expect(connections).toEqual([])
    })
  })

  describe('Connection CRUD Operations', () => {
    it('should save a connection', async () => {
      await storageManager.saveConnection(sampleConnection)

      const exists = await storageManager.connectionExists(sampleConnection.id)
      expect(exists).toBe(true)
    })

    it('should load a saved connection', async () => {
      await storageManager.saveConnection(sampleConnection)

      const loadedConnection = await storageManager.loadConnection(sampleConnection.id)
      expect(loadedConnection).not.toBeNull()
      expect(loadedConnection?.id).toBe(sampleConnection.id)
      expect(loadedConnection?.name).toBe(sampleConnection.name)
      expect(loadedConnection?.password).toBe(sampleConnection.password)
    })

    it('should return null for non-existent connection', async () => {
      const loadedConnection = await storageManager.loadConnection('non-existent-id')
      expect(loadedConnection).toBeNull()
    })

    it('should load all connections', async () => {
      const connection2: DatabaseConnection = {
        ...sampleConnection,
        id: 'test-connection-2',
        name: 'Test Database 2'
      }

      await storageManager.saveConnection(sampleConnection)
      await storageManager.saveConnection(connection2)

      const allConnections = await storageManager.loadAllConnections()
      expect(allConnections).toHaveLength(2)
      expect(allConnections.map((c) => c.id)).toContain(sampleConnection.id)
      expect(allConnections.map((c) => c.id)).toContain(connection2.id)
    })

    it('should update an existing connection', async () => {
      await storageManager.saveConnection(sampleConnection)

      const updatedConnection = {
        ...sampleConnection,
        name: 'Updated Database Name',
        password: 'newpassword456'
      }

      const updateResult = await storageManager.updateConnection(updatedConnection)
      expect(updateResult).toBe(true)

      const loadedConnection = await storageManager.loadConnection(sampleConnection.id)
      expect(loadedConnection?.name).toBe('Updated Database Name')
      expect(loadedConnection?.password).toBe('newpassword456')
    })

    it('should return false when updating non-existent connection', async () => {
      const updateResult = await storageManager.updateConnection(sampleConnection)
      expect(updateResult).toBe(false)
    })

    it('should delete a connection', async () => {
      await storageManager.saveConnection(sampleConnection)

      const deleteResult = await storageManager.deleteConnection(sampleConnection.id)
      expect(deleteResult).toBe(true)

      const exists = await storageManager.connectionExists(sampleConnection.id)
      expect(exists).toBe(false)
    })

    it('should return false when deleting non-existent connection', async () => {
      const deleteResult = await storageManager.deleteConnection('non-existent-id')
      expect(deleteResult).toBe(false)
    })

    it('should check if connection exists', async () => {
      expect(await storageManager.connectionExists(sampleConnection.id)).toBe(false)

      await storageManager.saveConnection(sampleConnection)
      expect(await storageManager.connectionExists(sampleConnection.id)).toBe(true)
    })
  })

  describe('Password Encryption', () => {
    it('should encrypt passwords when saving', async () => {
      await storageManager.saveConnection(sampleConnection)

      // Read the raw file to check if password is encrypted
      const connectionsFile = storageManager.getConnectionsFilePath()
      const rawData = await fs.readFile(connectionsFile, 'utf8')
      const storedConnections = JSON.parse(rawData)

      expect(storedConnections[0].encryptedPassword).toBeDefined()
      expect(storedConnections[0].password).toBeUndefined()
      expect(storedConnections[0].encryptedPassword).not.toBe(sampleConnection.password)
    })

    it('should decrypt passwords when loading', async () => {
      await storageManager.saveConnection(sampleConnection)

      const loadedConnection = await storageManager.loadConnection(sampleConnection.id)
      expect(loadedConnection?.password).toBe(sampleConnection.password)
    })

    it('should handle different password types', async () => {
      const testPasswords = [
        'simple',
        'complex!@#$%^&*()password123',
        'unicode测试密码🔐',
        '',
        'a'.repeat(1000) // Long password
      ]

      for (let i = 0; i < testPasswords.length; i++) {
        const connection = {
          ...sampleConnection,
          id: `test-${i}`,
          password: testPasswords[i]
        }

        await storageManager.saveConnection(connection)
        const loaded = await storageManager.loadConnection(connection.id)
        expect(loaded?.password).toBe(testPasswords[i])
      }
    })
  })

  describe('Data Persistence', () => {
    it('should persist data across manager instances', async () => {
      await storageManager.saveConnection(sampleConnection)

      // Create new instance
      ;(LocalStorageManager as any).instance = null
      const newManager = LocalStorageManager.getInstance(testDataPath)
      await newManager.initialize()

      const loadedConnection = await newManager.loadConnection(sampleConnection.id)
      expect(loadedConnection?.id).toBe(sampleConnection.id)
      expect(loadedConnection?.password).toBe(sampleConnection.password)
    })

    it('should handle corrupted connections file gracefully', async () => {
      // Write invalid JSON to connections file
      const connectionsFile = storageManager.getConnectionsFilePath()
      await fs.writeFile(connectionsFile, 'invalid json', 'utf8')

      // Should throw error when trying to load
      await expect(storageManager.loadAllConnections()).rejects.toThrow(
        'Failed to load connections'
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle file system errors when creating directory', async () => {
      // Create manager with invalid path
      ;(LocalStorageManager as any).instance = null
      const invalidManager = LocalStorageManager.getInstance('/invalid/path/that/cannot/be/created')

      await expect(invalidManager.initialize()).rejects.toThrow('Failed to create data directory')
    })
  })

  describe('Connection Types', () => {
    it('should handle PostgreSQL connections', async () => {
      const pgConnection: DatabaseConnection = {
        ...sampleConnection,
        type: 'postgresql'
      }

      await storageManager.saveConnection(pgConnection)
      const loaded = await storageManager.loadConnection(pgConnection.id)
      expect(loaded?.type).toBe('postgresql')
    })

    it('should handle MySQL connections', async () => {
      const mysqlConnection: DatabaseConnection = {
        ...sampleConnection,
        type: 'mysql',
        port: 3306
      }

      await storageManager.saveConnection(mysqlConnection)
      const loaded = await storageManager.loadConnection(mysqlConnection.id)
      expect(loaded?.type).toBe('mysql')
      expect(loaded?.port).toBe(3306)
    })
  })

  describe('Date Handling', () => {
    it('should preserve creation date when updating', async () => {
      await storageManager.saveConnection(sampleConnection)

      const updatedConnection = {
        ...sampleConnection,
        name: 'Updated Name'
      }

      await storageManager.updateConnection(updatedConnection)
      const loaded = await storageManager.loadConnection(sampleConnection.id)

      expect(loaded?.createdAt).toEqual(sampleConnection.createdAt)
      expect(loaded?.updatedAt.getTime()).toBeGreaterThan(sampleConnection.updatedAt.getTime())
    })

    it('should handle date serialization correctly', async () => {
      await storageManager.saveConnection(sampleConnection)
      const loaded = await storageManager.loadConnection(sampleConnection.id)

      expect(loaded?.createdAt).toBeInstanceOf(Date)
      expect(loaded?.updatedAt).toBeInstanceOf(Date)
      expect(loaded?.createdAt).toEqual(sampleConnection.createdAt)
    })
  })
})
