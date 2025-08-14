/* eslint-disable @typescript-eslint/no-explicit-any */
import { promises as fs } from 'fs'
import { join } from 'path'
import { EncryptionManager } from './encryption'

// Dynamic import for electron to handle testing environment
let electronApp: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  electronApp = require('electron').app
} catch {
  // In test environment, electron might not be available
}

export interface DatabaseConnection {
  id: string
  name: string
  type: 'postgresql' | 'mysql'
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface StoredConnection {
  id: string
  name: string
  type: 'postgresql' | 'mysql'
  host: string
  port: number
  database: string
  username: string
  encryptedPassword: string
  ssl?: boolean
  createdAt: string
  updatedAt: string
}

export class LocalStorageManager {
  private static instance: LocalStorageManager | null = null
  private readonly dataPath: string
  private readonly connectionsFile: string
  private encryptionManager: EncryptionManager

  private constructor(testDataPath?: string) {
    if (testDataPath) {
      this.dataPath = testDataPath
    } else if (electronApp) {
      const userDataPath = electronApp.getPath('userData')
      this.dataPath = join(userDataPath, 'database-connections')
    } else {
      // Fallback for testing
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { tmpdir } = require('os')
      this.dataPath = join(tmpdir(), 'test-storage-' + Date.now())
    }

    this.connectionsFile = join(this.dataPath, 'connections.json')
    this.encryptionManager = EncryptionManager.getInstance(testDataPath)
  }

  public static getInstance(testDataPath?: string): LocalStorageManager {
    if (!LocalStorageManager.instance) {
      LocalStorageManager.instance = new LocalStorageManager(testDataPath)
    }
    return LocalStorageManager.instance
  }

  /**
   * Initialize the storage manager
   */
  public async initialize(): Promise<void> {
    // Ensure encryption manager is initialized
    await this.encryptionManager.initialize()

    // Create data directory if it doesn't exist
    await this.ensureDataDirectory()

    // Create connections file if it doesn't exist
    await this.ensureConnectionsFile()
  }

  /**
   * Save a database connection
   */
  public async saveConnection(connection: DatabaseConnection): Promise<void> {
    const connections = await this.loadConnections()

    // Encrypt the password
    const encryptedPassword = this.encryptionManager.encrypt(connection.password)

    const storedConnection: StoredConnection = {
      id: connection.id,
      name: connection.name,
      type: connection.type,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: connection.username,
      encryptedPassword,
      ssl: connection.ssl,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Update or add connection
    const existingIndex = connections.findIndex((c) => c.id === connection.id)
    if (existingIndex >= 0) {
      connections[existingIndex] = storedConnection
    } else {
      connections.push(storedConnection)
    }

    await this.saveConnections(connections)
  }

  /**
   * Load a database connection by ID
   */
  public async loadConnection(id: string): Promise<DatabaseConnection | null> {
    const connections = await this.loadConnections()
    const storedConnection = connections.find((c) => c.id === id)

    if (!storedConnection) {
      return null
    }

    // Decrypt the password
    const password = this.encryptionManager.decrypt(storedConnection.encryptedPassword)

    const connection: DatabaseConnection = {
      id: storedConnection.id,
      name: storedConnection.name,
      type: storedConnection.type,
      host: storedConnection.host,
      port: storedConnection.port,
      database: storedConnection.database,
      username: storedConnection.username,
      password,
      ssl: storedConnection.ssl,
      createdAt: new Date(storedConnection.createdAt),
      updatedAt: new Date(storedConnection.updatedAt)
    }

    return connection
  }

  /**
   * Load all database connections
   */
  public async loadAllConnections(): Promise<DatabaseConnection[]> {
    const connections = await this.loadConnections()

    return Promise.all(
      connections.map(async (storedConnection) => {
        const password = this.encryptionManager.decrypt(storedConnection.encryptedPassword)

        const connection: DatabaseConnection = {
          id: storedConnection.id,
          name: storedConnection.name,
          type: storedConnection.type,
          host: storedConnection.host,
          port: storedConnection.port,
          database: storedConnection.database,
          username: storedConnection.username,
          password,
          ssl: storedConnection.ssl,
          createdAt: new Date(storedConnection.createdAt),
          updatedAt: new Date(storedConnection.updatedAt)
        }

        return connection
      })
    )
  }

  /**
   * Delete a database connection
   */
  public async deleteConnection(id: string): Promise<boolean> {
    const connections = await this.loadConnections()
    const initialLength = connections.length

    const filteredConnections = connections.filter((c) => c.id !== id)

    if (filteredConnections.length === initialLength) {
      return false // Connection not found
    }

    await this.saveConnections(filteredConnections)
    return true
  }

  /**
   * Update a database connection
   */
  public async updateConnection(connection: DatabaseConnection): Promise<boolean> {
    const connections = await this.loadConnections()
    const existingIndex = connections.findIndex((c) => c.id === connection.id)

    if (existingIndex < 0) {
      return false // Connection not found
    }

    // Encrypt the password
    const encryptedPassword = this.encryptionManager.encrypt(connection.password)

    const storedConnection: StoredConnection = {
      id: connection.id,
      name: connection.name,
      type: connection.type,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: connection.username,
      encryptedPassword,
      ssl: connection.ssl,
      createdAt: connections[existingIndex].createdAt, // Keep original creation date
      updatedAt: new Date().toISOString()
    }

    connections[existingIndex] = storedConnection
    await this.saveConnections(connections)
    return true
  }

  /**
   * Check if a connection exists
   */
  public async connectionExists(id: string): Promise<boolean> {
    const connections = await this.loadConnections()
    return connections.some((c) => c.id === id)
  }

  /**
   * Get the data directory path
   */
  public getDataPath(): string {
    return this.dataPath
  }

  /**
   * Get the connections file path
   */
  public getConnectionsFilePath(): string {
    return this.connectionsFile
  }

  /**
   * Ensure the data directory exists
   */
  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.dataPath, { recursive: true })
    } catch (error) {
      throw new Error(`Failed to create data directory: ${error}`)
    }
  }

  /**
   * Ensure the connections file exists
   */
  private async ensureConnectionsFile(): Promise<void> {
    try {
      await fs.access(this.connectionsFile)
    } catch {
      // File doesn't exist, create it with empty array
      await fs.writeFile(this.connectionsFile, JSON.stringify([], null, 2), 'utf8')
    }
  }

  /**
   * Load connections from file
   */
  private async loadConnections(): Promise<StoredConnection[]> {
    try {
      const data = await fs.readFile(this.connectionsFile, 'utf8')
      return JSON.parse(data) as StoredConnection[]
    } catch (error) {
      throw new Error(`Failed to load connections: ${error}`)
    }
  }

  /**
   * Save connections to file
   */
  private async saveConnections(connections: StoredConnection[]): Promise<void> {
    try {
      const data = JSON.stringify(connections, null, 2)
      await fs.writeFile(this.connectionsFile, data, 'utf8')
    } catch (error) {
      throw new Error(`Failed to save connections: ${error}`)
    }
  }
}
