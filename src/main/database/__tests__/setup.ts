// Test setup file
import { jest, expect } from '@jest/globals'

// Extend Jest matchers
expect.extend({
  toBeBuffer(received) {
    const pass = Buffer.isBuffer(received)
    if (pass) {
      return {
        message: () => `expected ${received} not to be a Buffer`,
        pass: true
      }
    } else {
      return {
        message: () => `expected ${received} to be a Buffer`,
        pass: false
      }
    }
  }
})

// Global test timeout
jest.setTimeout(10000)
