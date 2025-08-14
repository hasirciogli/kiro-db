/* eslint-disable @typescript-eslint/no-explicit-any */

import { EncryptionManager } from '../encryption'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals'

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => join(tmpdir(), 'test-encryption-' + Date.now()))
  }
}))

describe('EncryptionManager', () => {
  let encryptionManager: EncryptionManager
  let testDataPath: string

  beforeEach(async () => {
    // Get a fresh instance for each test
    EncryptionManager.instance = null

    // Create test data path
    testDataPath = join(tmpdir(), 'test-encryption-' + Date.now())
    encryptionManager = EncryptionManager.getInstance(testDataPath)

    await encryptionManager.initialize()
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
      const instance1 = EncryptionManager.getInstance(testDataPath)
      const instance2 = EncryptionManager.getInstance(testDataPath)
      expect(instance1).toBe(instance2)
    })
  })

  describe('Key Management', () => {
    it('should generate a 32-byte key', () => {
      const key = encryptionManager.generateKey()
      expect(key).toBeInstanceOf(Buffer)
      expect(key.length).toBe(32)
    })

    it('should create a key file on first initialization', async () => {
      const keyPath = encryptionManager.getKeyPath()
      const keyExists = await fs
        .access(keyPath)
        .then(() => true)
        .catch(() => false)
      expect(keyExists).toBe(true)
    })

    it('should load existing key on subsequent initializations', async () => {
      const keyPath = encryptionManager.getKeyPath()
      const originalKey = await fs.readFile(keyPath)

      // Create a new instance
      EncryptionManager.instance = null
      const newManager = EncryptionManager.getInstance(testDataPath)
      await newManager.initialize()

      const loadedKey = await fs.readFile(keyPath)
      expect(loadedKey.equals(originalKey)).toBe(true)
    })

    it('should be initialized after calling initialize()', async () => {
      expect(encryptionManager.isInitialized()).toBe(true)
    })
  })

  describe('Encryption/Decryption', () => {
    const testData = [
      'simple password',
      'complex!@#$%^&*()password123',
      'unicode测试密码🔐',
      '',
      'a'.repeat(1000), // Long string
      JSON.stringify({ user: 'test', pass: 'secret', port: 5432 })
    ]

    testData.forEach((testString, index) => {
      it(`should encrypt and decrypt string ${index + 1}: "${testString.substring(0, 20)}${testString.length > 20 ? '...' : ''}"`, () => {
        const encrypted = encryptionManager.encrypt(testString)
        const decrypted = encryptionManager.decrypt(encrypted)

        expect(decrypted).toBe(testString)
        expect(encrypted).not.toBe(testString)
        expect(encrypted.length).toBeGreaterThan(0)
      })
    })

    it('should produce different encrypted outputs for the same input', () => {
      const testString = 'test password'
      const encrypted1 = encryptionManager.encrypt(testString)
      const encrypted2 = encryptionManager.encrypt(testString)

      expect(encrypted1).not.toBe(encrypted2)
      expect(encryptionManager.decrypt(encrypted1)).toBe(testString)
      expect(encryptionManager.decrypt(encrypted2)).toBe(testString)
    })

    it('should throw error when trying to encrypt without initialization', () => {
      ;(EncryptionManager as any).instance = null
      const uninitializedManager = EncryptionManager.getInstance(testDataPath)

      expect(() => {
        uninitializedManager.encrypt('test')
      }).toThrow('Encryption manager not initialized')
    })

    it('should throw error when trying to decrypt without initialization', () => {
      ;(EncryptionManager as any).instance = null
      const uninitializedManager = EncryptionManager.getInstance(testDataPath)

      expect(() => {
        uninitializedManager.decrypt('dGVzdA==')
      }).toThrow('Encryption manager not initialized')
    })

    it('should throw error when trying to decrypt invalid data', () => {
      expect(() => {
        encryptionManager.decrypt('invalid-encrypted-data')
      }).toThrow()
    })

    it('should throw error when trying to decrypt tampered data', () => {
      const encrypted = encryptionManager.encrypt('test password')
      const tamperedData = encrypted.slice(0, -4) + 'XXXX'

      expect(() => {
        encryptionManager.decrypt(tamperedData)
      }).toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle file system errors when saving key', async () => {
      // Create a path that will cause permission error (read-only directory)
      const readOnlyPath = '/root/encryption-test'

      ;(EncryptionManager as any).instance = null
      const manager = EncryptionManager.getInstance(readOnlyPath)

      // This should fail due to permission issues
      await expect(manager.initialize()).rejects.toThrow()
    })
  })

  describe('Security Properties', () => {
    it('should use different IV for each encryption', () => {
      const testString = 'test password'
      const encrypted1 = Buffer.from(encryptionManager.encrypt(testString), 'base64')
      const encrypted2 = Buffer.from(encryptionManager.encrypt(testString), 'base64')

      // Extract IVs (first 16 bytes)
      const iv1 = encrypted1.subarray(0, 16)
      const iv2 = encrypted2.subarray(0, 16)

      expect(iv1.equals(iv2)).toBe(false)
    })

    it('should use different salt for each encryption', () => {
      const testString = 'test password'
      const encrypted1 = Buffer.from(encryptionManager.encrypt(testString), 'base64')
      const encrypted2 = Buffer.from(encryptionManager.encrypt(testString), 'base64')

      // Extract salts (bytes 16-48)
      const salt1 = encrypted1.subarray(16, 48)
      const salt2 = encrypted2.subarray(16, 48)

      expect(salt1.equals(salt2)).toBe(false)
    })

    it('should include authentication tag for integrity', () => {
      const testString = 'test password'
      const encrypted = Buffer.from(encryptionManager.encrypt(testString), 'base64')

      // Should have at least IV (16) + salt (32) + authTag (16) + data
      expect(encrypted.length).toBeGreaterThanOrEqual(64)
    })
  })
})
