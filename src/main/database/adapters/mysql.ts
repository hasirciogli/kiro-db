import * as mysql from 'mysql2/promise'
import { DatabaseAdapter } from './base'
import {
  QueryResult,
  DatabaseSchema,
  TableInfo,
  ColumnInfo,
  IndexInfo,
  ForeignKeyInfo,
  ViewInfo,
  FunctionInfo,
  ProcedureInfo,
  FieldInfo
} from '../../../shared/types/database'

/**
 * MySQL database adapter implementation
 */
export class MySQLAdapter extends DatabaseAdapter {
  private queryTimeout = 30000 // 30 seconds
  private currentQuery: any = null

  async connect(): Promise<void> {
    try {
      this.validateConfig()
      this.updateConnectionStatus('connecting')

      const connectionConfig: mysql.ConnectionOptions = {
        host: this.config.host,
        port: this.config.port,
        user: this.config.username,
        password: this.config.password,
        database: this.config.database,
        ssl: this.config.ssl ? { rejectUnauthorized: true } : undefined,
        connectTimeout: 10000
      }

      this.connection = await mysql.createConnection(connectionConfig)
      this.updateConnectionStatus('connected')
    } catch (error) {
      this.handleConnectionError(error)
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connection) {
        await this.connection.end()
        this.connection = null
        this.updateConnectionStatus('disconnected')
      }
    } catch (error) {
      this.updateConnectionStatus(
        'error',
        error instanceof Error ? error.message : (error as string)
      )
    }
  }

  async executeQuery(sql: string, params?: any[]): Promise<QueryResult> {
    if (!this.isConnected()) {
      throw new Error('Not connected to database')
    }

    const startTime = Date.now()

    try {
      this.currentQuery = this.connection.execute(sql, params || [])
      const [rows, fields] = await this.currentQuery
      const executionTime = Date.now() - startTime

      const queryResult: QueryResult = {
        rows: Array.isArray(rows) ? rows : [],
        fields: this.formatFields(fields),
        rowCount: Array.isArray(rows) ? rows.length : 0,
        executionTime,
        affectedRows: (rows as any)?.affectedRows
      }

      this.currentQuery = null
      return queryResult
    } catch (error) {
      this.currentQuery = null
      throw error
    }
  }

  async getSchema(): Promise<DatabaseSchema> {
    if (!this.isConnected()) {
      throw new Error('Not connected to database')
    }

    const [tables, views, functions, procedures] = await Promise.all([
      this.getTables(),
      this.getViews(),
      this.getFunctions(),
      this.getProcedures()
    ])

    return {
      tables,
      views,
      functions,
      procedures
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.connect()
      await this.executeQuery('SELECT 1')
      return true
    } catch (error) {
      return false
    }
  }

  isConnected(): boolean {
    return !!(this.connection && this.connectionStatus.status === 'connected')
  }

  async cancelQuery(): Promise<void> {
    if (this.currentQuery && this.connection) {
      try {
        await this.connection.destroy()
        this.currentQuery = null
        this.updateConnectionStatus('disconnected')
      } catch (error) {
        console.error('Error cancelling MySQL query:', error)
      }
    }
  }

  private formatFields(fields: any[]): FieldInfo[] {
    if (!fields) return []

    return fields.map((field) => ({
      name: field.name,
      type: field.type,
      length: field.length
    }))
  }

  private async getTables(): Promise<TableInfo[]> {
    const [rows] = await this.connection.execute(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = "BASE TABLE"',
      [this.config.database]
    )

    const tables: TableInfo[] = []

    for (const row of rows as any[]) {
      const tableName = row.TABLE_NAME
      const [columns, indexes, foreignKeys] = await Promise.all([
        this.getTableColumns(tableName),
        this.getTableIndexes(tableName),
        this.getTableForeignKeys(tableName)
      ])

      tables.push({
        name: tableName,
        columns,
        indexes,
        foreignKeys,
        rowCount: await this.getTableRowCount(tableName)
      })
    }

    return tables
  }

  private async getTableColumns(tableName: string): Promise<ColumnInfo[]> {
    const [rows] = await this.connection.execute(
      `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_KEY,
        EXTRA
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `,
      [this.config.database, tableName]
    )

    return (rows as any[]).map((row) => ({
      name: row.COLUMN_NAME,
      type: row.DATA_TYPE,
      nullable: row.IS_NULLABLE === 'YES',
      defaultValue: row.COLUMN_DEFAULT,
      isPrimaryKey: row.COLUMN_KEY === 'PRI',
      isAutoIncrement: row.EXTRA?.includes('auto_increment') || false
    }))
  }

  private async getTableIndexes(tableName: string): Promise<IndexInfo[]> {
    const [rows] = await this.connection.execute(
      `
      SELECT 
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE
      FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `,
      [this.config.database, tableName]
    )

    const indexMap = new Map<string, IndexInfo>()

    for (const row of rows as any[]) {
      const indexName = row.INDEX_NAME
      if (!indexMap.has(indexName)) {
        indexMap.set(indexName, {
          name: indexName,
          columns: [],
          isUnique: row.NON_UNIQUE === 0,
          isPrimary: indexName === 'PRIMARY'
        })
      }
      indexMap.get(indexName)!.columns.push(row.COLUMN_NAME)
    }

    return Array.from(indexMap.values())
  }

  private async getTableForeignKeys(tableName: string): Promise<ForeignKeyInfo[]> {
    const [rows] = await this.connection.execute(
      `
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
      [this.config.database, tableName]
    )

    return (rows as any[]).map((row) => ({
      name: row.CONSTRAINT_NAME,
      column: row.COLUMN_NAME,
      referencedTable: row.REFERENCED_TABLE_NAME,
      referencedColumn: row.REFERENCED_COLUMN_NAME
    }))
  }

  private async getTableRowCount(tableName: string): Promise<number> {
    try {
      const [rows] = await this.connection.execute(`SELECT COUNT(*) as count FROM \`${tableName}\``)
      return (rows as any[])[0].count
    } catch (error) {
      return 0
    }
  }

  private async getViews(): Promise<ViewInfo[]> {
    const [rows] = await this.connection.execute(
      `
      SELECT 
        TABLE_NAME,
        VIEW_DEFINITION
      FROM information_schema.VIEWS 
      WHERE TABLE_SCHEMA = ?
    `,
      [this.config.database]
    )

    const views: ViewInfo[] = []

    for (const row of rows as any[]) {
      const viewName = row.TABLE_NAME
      const columns = await this.getTableColumns(viewName)

      views.push({
        name: viewName,
        columns,
        definition: row.VIEW_DEFINITION
      })
    }

    return views
  }

  private async getFunctions(): Promise<FunctionInfo[]> {
    const [rows] = await this.connection.execute(
      `
      SELECT 
        ROUTINE_NAME,
        ROUTINE_DEFINITION,
        DATA_TYPE
      FROM information_schema.ROUTINES 
      WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'FUNCTION'
    `,
      [this.config.database]
    )

    return (rows as any[]).map((row) => ({
      name: row.ROUTINE_NAME,
      parameters: [], // MySQL parameter introspection is complex, simplified for now
      returnType: row.DATA_TYPE || 'unknown',
      definition: row.ROUTINE_DEFINITION || ''
    }))
  }

  private async getProcedures(): Promise<ProcedureInfo[]> {
    const [rows] = await this.connection.execute(
      `
      SELECT 
        ROUTINE_NAME,
        ROUTINE_DEFINITION
      FROM information_schema.ROUTINES 
      WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'
    `,
      [this.config.database]
    )

    return (rows as any[]).map((row) => ({
      name: row.ROUTINE_NAME,
      parameters: [], // MySQL parameter introspection is complex, simplified for now
      definition: row.ROUTINE_DEFINITION || ''
    }))
  }
}
