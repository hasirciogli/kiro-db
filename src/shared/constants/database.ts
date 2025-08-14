// Database configuration constants
export const DATABASE_CONSTANTS = {
  // Default ports
  DEFAULT_PORTS: {
    mysql: 3306,
    postgresql: 5432
  },

  // Connection timeouts (in milliseconds)
  CONNECTION_TIMEOUT: 30000,
  QUERY_TIMEOUT: 60000,

  // Pagination
  DEFAULT_PAGE_SIZE: 100,
  MAX_PAGE_SIZE: 1000,

  // File paths
  DATA_DIRECTORY: 'data',
  CONNECTIONS_FILE: 'connections.json',
  ENCRYPTION_KEY_FILE: 'encryption.key',
  LOG_DIRECTORY: 'logs',

  // Encryption
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  KEY_LENGTH: 32, // 256 bits

  // UI
  SIDEBAR_WIDTH: 240,
  DATABASE_SIDEBAR_WIDTH: 280,
  ROW_DETAIL_SHEET_WIDTH: 400
} as const

// Database type display names
export const DATABASE_TYPE_NAMES = {
  mysql: 'MySQL',
  postgresql: 'PostgreSQL'
} as const
