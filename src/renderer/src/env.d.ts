/// <reference types="vite/client" />

declare global {
  interface Window {
    dbapi: {
      connect(dialect: 'postgres' | 'mysql', params: any): Promise<{ ok: boolean }>
      disconnect(id: string): Promise<{ ok: boolean }>
      execute(
        id: string,
        sql: string,
        params?: any[]
      ): Promise<{ columns: string[]; rows: any[]; rowCount?: number }>
      schema(id: string): Promise<any>
      cancel(id: string): Promise<{ ok: boolean }>
    }
  }
}

export {}
