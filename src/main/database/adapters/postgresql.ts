import { Client } from 'pg'
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
 * PostgreSQL database adapter implementation
 */
export class PostgreSQLAdapter extends DatabaseAdapter {
  private queryTimeout = 30000 // 30 seconds
  private currentQuery: any = null

  async connect(): Promise<void> {
    try {
      this.validateConfig()
      this.updateConnectionStatus('connecting')

      const connectionConfig = {
        host: this.config.host,
        port: this.config.port,
        user: this.config.username,
        password: this.config.password,
        database: this.config.database,
        ssl: this.config.ssl ? { rejectUnauthorized: true } : false,
        connectionTimeoutMillis: 10000,
        query_timeout: this.queryTimeout
      }

      this.connection = new Client(connectionConfig)
      await this.connection.connect()
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
      this.currentQuery = this.connection.query(sql, params || [])
      const result = await this.currentQuery
      const executionTime = Date.now() - startTime

      const queryResult: QueryResult = {
        rows: result.rows || [],
        fields: this.formatFields(result.fields),
        rowCount: result.rows?.length || 0,
        executionTime,
        affectedRows: result.rowCount
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
        await this.connection.end()
        this.currentQuery = null
        this.updateConnectionStatus('disconnected')
      } catch (error) {
        console.error('Error cancelling PostgreSQL query:', error)
      }
    }
  }

  private formatFields(fields: any[]): FieldInfo[] {
    if (!fields) return []

    return fields.map((field) => ({
      name: field.name,
      type: field.dataTypeID?.toString() || 'unknown',
      length: field.dataTypeSize
    }))
  }

  private async getTables(): Promise<TableInfo[]> {
    const result = await this.connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)

    const tables: TableInfo[] = []

    for (const row of result.rows) {
      const tableName = row.table_name
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
    const result = await this.connection.query(
      `
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
        CASE WHEN c.column_default LIKE 'nextval%' THEN true ELSE false END as is_auto_increment
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.column_name = pk.column_name
      WHERE c.table_name = $1 AND c.table_schema = 'public'
      ORDER BY c.ordinal_position
    `,
      [tableName]
    )

    return result.rows.map((row) => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      isPrimaryKey: row.is_primary_key,
      isAutoIncrement: row.is_auto_increment
    }))
  }

  private async getTableIndexes(tableName: string): Promise<IndexInfo[]> {
    const result = await this.connection.query(
      `
      SELECT 
        i.relname as index_name,
        a.attname as column_name,
        ix.indisunique as is_unique,
        ix.indisprimary as is_primary
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relname = $1 AND t.relkind = 'r'
      ORDER BY i.relname, a.attnum
    `,
      [tableName]
    )

    const indexMap = new Map<string, IndexInfo>()

    for (const row of result.rows) {
      const indexName = row.index_name
      if (!indexMap.has(indexName)) {
        indexMap.set(indexName, {
          name: indexName,
          columns: [],
          isUnique: row.is_unique,
          isPrimary: row.is_primary
        })
      }
      indexMap.get(indexName)!.columns.push(row.column_name)
    }

    return Array.from(indexMap.values())
  }

  private async getTableForeignKeys(tableName: string): Promise<ForeignKeyInfo[]> {
    const result = await this.connection.query(
      `
      SELECT 
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS referenced_table_name,
        ccu.column_name AS referenced_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1
    `,
      [tableName]
    )

    return result.rows.map((row) => ({
      name: row.constraint_name,
      column: row.column_name,
      referencedTable: row.referenced_table_name,
      referencedColumn: row.referenced_column_name
    }))
  }

  private async getTableRowCount(tableName: string): Promise<number> {
    try {
      const result = await this.connection.query(`SELECT COUNT(*) as count FROM "${tableName}"`)
      return parseInt(result.rows[0].count)
    } catch (error) {
      return 0
    }
  }

  private async getViews(): Promise<ViewInfo[]> {
    const result = await this.connection.query(`
      SELECT 
        table_name,
        view_definition
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

    const views: ViewInfo[] = []

    for (const row of result.rows) {
      const viewName = row.table_name
      const columns = await this.getTableColumns(viewName)

      views.push({
        name: viewName,
        columns,
        definition: row.view_definition
      })
    }

    return views
  }

  private async getFunctions(): Promise<FunctionInfo[]> {
    const result = await this.connection.query(`
      SELECT 
        p.proname as routine_name,
        pg_get_functiondef(p.oid) as routine_definition,
        t.typname as return_type
      FROM pg_proc p
      JOIN pg_type t ON p.prorettype = t.oid
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.prokind = 'f'
      ORDER BY p.proname
    `)

    return result.rows.map((row) => ({
      name: row.routine_name,
      parameters: [], // PostgreSQL parameter introspection is complex, simplified for now
      returnType: row.return_type || 'unknown',
      definition: row.routine_definition || ''
    }))
  }

  private async getProcedures(): Promise<ProcedureInfo[]> {
    const result = await this.connection.query(`
      SELECT 
        p.proname as routine_name,
        pg_get_functiondef(p.oid) as routine_definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.prokind = 'p'
      ORDER BY p.proname
    `)

    return result.rows.map((row) => ({
      name: row.routine_name,
      parameters: [], // PostgreSQL parameter introspection is complex, simplified for now
      definition: row.routine_definition || ''
    }))
  }
}
