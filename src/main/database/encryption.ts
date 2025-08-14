/* eslint-disable @typescript-eslint/no-explicit-any */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { promises as fs } from 'fs'
import { join } from 'path'

// Dynamic import for electron to handle testing environment
let electronApp: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  electronApp = require('electron').app
} catch {
  // In test environment, electron might not be available
}

export class EncryptionManager {
  public static instance: EncryptionManager | null = null
  private masterKey: Buffer | null = null
  private readonly keyPath: string

  private constructor(testDataPath?: string) {
    if (testDataPath) {
      this.keyPath = join(testDataPath, 'encryption.key')
    } else if (electronApp) {
      const userDataPath = electronApp.getPath('userData')
      this.keyPath = join(userDataPath, 'encryption.key')
    } else {
      // Fallback for testing
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { tmpdir } = require('os')
      this.keyPath = join(tmpdir(), 'test-encryption-' + Date.now(), 'encryption.key')
    }
  }

  public static getInstance(testDataPath?: string): EncryptionManager {
    if (!EncryptionManager.instance) {
      EncryptionManager.instance = new EncryptionManager(testDataPath)
    }
    return EncryptionManager.instance
  }

  /**
   * Initialize the encryption manager by loading or creating the master key
   */
  public async initialize(): Promise<void> {
    this.masterKey = await this.loadOrCreateKey()
  }

  /**
   * Encrypt a string using AES-256-GCM
   */
  public encrypt(text: string): string {
    if (!this.masterKey) {
      throw new Error('Encryption manager not initialized')
    }

    const iv = randomBytes(16)
    const salt = randomBytes(32)
    const key = scryptSync(this.masterKey, salt, 32)

    const cipher = createCipheriv('aes-256-gcm', key, iv)
    cipher.setAAD(Buffer.from('database-connection-manager'))

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = (cipher as any).getAuthTag()

    // Combine iv, salt, authTag, and encrypted data
    const combined = Buffer.concat([iv, salt, authTag, Buffer.from(encrypted, 'hex')])

    return combined.toString('base64')
  }

  /**
   * Decrypt a string using AES-256-GCM
   */
  public decrypt(encryptedText: string): string {
    if (!this.masterKey) {
      throw new Error('Encryption manager not initialized')
    }

    const combined = Buffer.from(encryptedText, 'base64')

    // Extract components
    const iv = combined.subarray(0, 16)
    const salt = combined.subarray(16, 48)
    const authTag = combined.subarray(48, 64)
    const encrypted = combined.subarray(64)

    const key = scryptSync(this.masterKey, salt, 32)

    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAAD(Buffer.from('database-connection-manager'))
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, undefined, 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  /**
   * Generate a new encryption key
   */
  public generateKey(): Buffer {
    return randomBytes(32)
  }

  /**
   * Load existing key or create a new one
   */
  private async loadOrCreateKey(): Promise<Buffer> {
    try {
      const keyData = await fs.readFile(this.keyPath)
      return keyData
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Key file doesn't exist, create a new one
        const newKey = this.generateKey()
        await this.saveKey(newKey)
        return newKey
      }
      throw error
    }
  }

  /**
   * Save the encryption key to file
   */
  private async saveKey(key: Buffer): Promise<void> {
    try {
      // Ensure the directory exists
      await fs.mkdir(join(this.keyPath, '..'), { recursive: true })
      await fs.writeFile(this.keyPath, key, { mode: 0o600 })
    } catch (error) {
      throw new Error(`Failed to save encryption key: ${error}`)
    }
  }

  /**
   * Get the key file path (for testing purposes)
   */
  public getKeyPath(): string {
    return this.keyPath
  }

  /**
   * Check if the encryption manager is initialized
   */
  public isInitialized(): boolean {
    return this.masterKey !== null
  }
}
