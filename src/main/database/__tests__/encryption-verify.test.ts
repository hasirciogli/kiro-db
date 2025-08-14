/* eslint-disable @typescript-eslint/no-explicit-any */

import { EncryptionManager } from '../encryption'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { describe, beforeEach, afterEach, it, expect } from '@jest/globals'

describe('EncryptionManager - Verification Tests', () => {
  let testDataPath: string

  beforeEach(() => {
    // Reset singleton for each test
    ;(EncryptionManager as any).instance = null
    testDataPath = join(tmpdir(), 'test-encryption-verify-' + Date.now())
  })

  afterEach(async () => {
    // Cleanup
    try {
      await fs.rm(testDataPath, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  it('should handle singleton pattern correctly', async () => {
    const instance1 = EncryptionManager.getInstance(testDataPath)
    const instance2 = EncryptionManager.getInstance(testDataPath)
    expect(instance1).toBe(instance2)
  })

  it('should generate 32-byte keys', async () => {
    const manager = EncryptionManager.getInstance(testDataPath)
    await manager.initialize()
    const key = manager.generateKey()
    expect(key).toBeInstanceOf(Buffer)
    expect(key.length).toBe(32)
  })

  it('should initialize correctly', async () => {
    const manager = EncryptionManager.getInstance(testDataPath)
    await manager.initialize()
    expect(manager.isInitialized()).toBe(true)
  })

  it('should encrypt and decrypt simple strings', async () => {
    const manager = EncryptionManager.getInstance(testDataPath)
    await manager.initialize()

    const testString = 'test password'
    const encrypted = manager.encrypt(testString)
    const decrypted = manager.decrypt(encrypted)

    expect(decrypted).toBe(testString)
    expect(encrypted).not.toBe(testString)
    expect(encrypted.length).toBeGreaterThan(0)
  })

  it('should handle complex passwords', async () => {
    const manager = EncryptionManager.getInstance(testDataPath)
    await manager.initialize()

    const testString = 'complex!@#$%^&*()password123'
    const encrypted = manager.encrypt(testString)
    const decrypted = manager.decrypt(encrypted)

    expect(decrypted).toBe(testString)
  })

  it('should handle unicode characters', async () => {
    const manager = EncryptionManager.getInstance(testDataPath)
    await manager.initialize()

    const testString = 'unicode测试密码🔐'
    const encrypted = manager.encrypt(testString)
    const decrypted = manager.decrypt(encrypted)

    expect(decrypted).toBe(testString)
  })

  it('should handle empty strings', async () => {
    const manager = EncryptionManager.getInstance(testDataPath)
    await manager.initialize()

    const testString = ''
    const encrypted = manager.encrypt(testString)
    const decrypted = manager.decrypt(encrypted)

    expect(decrypted).toBe(testString)
  })

  it('should handle long strings', async () => {
    const manager = EncryptionManager.getInstance(testDataPath)
    await manager.initialize()

    const testString = 'a'.repeat(1000)
    const encrypted = manager.encrypt(testString)
    const decrypted = manager.decrypt(encrypted)

    expect(decrypted).toBe(testString)
  })

  it('should handle JSON data', async () => {
    const manager = EncryptionManager.getInstance(testDataPath)
    await manager.initialize()

    const testString = JSON.stringify({ user: 'test', pass: 'secret', port: 5432 })
    const encrypted = manager.encrypt(testString)
    const decrypted = manager.decrypt(encrypted)

    expect(decrypted).toBe(testString)
  })

  it('should produce different encrypted outputs for same input', async () => {
    const manager = EncryptionManager.getInstance(testDataPath)
    await manager.initialize()

    const testString = 'test password'
    const encrypted1 = manager.encrypt(testString)
    const encrypted2 = manager.encrypt(testString)

    expect(encrypted1).not.toBe(encrypted2)
    expect(manager.decrypt(encrypted1)).toBe(testString)
    expect(manager.decrypt(encrypted2)).toBe(testString)
  })

  it('should throw error when encrypting without initialization', () => {
    const manager = EncryptionManager.getInstance(testDataPath)

    expect(() => {
      manager.encrypt('test')
    }).toThrow('Encryption manager not initialized')
  })

  it('should throw error when decrypting without initialization', () => {
    const manager = EncryptionManager.getInstance(testDataPath)

    expect(() => {
      manager.decrypt('dGVzdA==')
    }).toThrow('Encryption manager not initialized')
  })

  it('should throw error for invalid encrypted data', async () => {
    const manager = EncryptionManager.getInstance(testDataPath)
    await manager.initialize()

    expect(() => {
      manager.decrypt('invalid-encrypted-data')
    }).toThrow()
  })

  it('should use different IV for each encryption', async () => {
    const manager = EncryptionManager.getInstance(testDataPath)
    await manager.initialize()

    const testString = 'test password'
    const encrypted1 = Buffer.from(manager.encrypt(testString), 'base64')
    const encrypted2 = Buffer.from(manager.encrypt(testString), 'base64')

    // Extract IVs (first 16 bytes)
    const iv1 = encrypted1.subarray(0, 16)
    const iv2 = encrypted2.subarray(0, 16)

    expect(iv1.equals(iv2)).toBe(false)
  })

  it('should use different salt for each encryption', async () => {
    const manager = EncryptionManager.getInstance(testDataPath)
    await manager.initialize()

    const testString = 'test password'
    const encrypted1 = Buffer.from(manager.encrypt(testString), 'base64')
    const encrypted2 = Buffer.from(manager.encrypt(testString), 'base64')

    // Extract salts (bytes 16-48)
    const salt1 = encrypted1.subarray(16, 48)
    const salt2 = encrypted2.subarray(16, 48)

    expect(salt1.equals(salt2)).toBe(false)
  })

  it('should include authentication tag for integrity', async () => {
    const manager = EncryptionManager.getInstance(testDataPath)
    await manager.initialize()

    const testString = 'test password'
    const encrypted = Buffer.from(manager.encrypt(testString), 'base64')

    // Should have at least IV (16) + salt (32) + authTag (16) + data
    expect(encrypted.length).toBeGreaterThanOrEqual(64)
  })
})
