import { create } from 'zustand'

interface QueryHistoryState {
  // connectionId -> list of queries (newest first)
  historyByConnection: Record<string, string[]>
  addQuery: (connectionId: string, query: string) => void
  getHistory: (connectionId: string) => string[]
  clearHistory: (connectionId: string) => void
}

const STORAGE_KEY = 'kirodb:queryHistory'

function loadFromStorage(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, string[]>
    return parsed ?? {}
  } catch {
    return {}
  }
}

function saveToStorage(state: Record<string, string[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

export const useQueryHistory = create<QueryHistoryState>((set, get) => ({
  historyByConnection: loadFromStorage(),
  addQuery: (connectionId, query) => {
    if (!query.trim()) return
    set((s) => {
      const current = s.historyByConnection[connectionId] ?? []
      // avoid consecutive duplicates
      const withoutDup = current[0] === query ? current : [query, ...current]
      const next = { ...s.historyByConnection, [connectionId]: withoutDup.slice(0, 50) }
      saveToStorage(next)
      return { historyByConnection: next }
    })
  },
  getHistory: (connectionId) => {
    const state = get()
    return state.historyByConnection[connectionId] ?? []
  },
  clearHistory: (connectionId) => {
    set((s) => {
      const next = { ...s.historyByConnection, [connectionId]: [] }
      saveToStorage(next)
      return { historyByConnection: next }
    })
  }
}))


