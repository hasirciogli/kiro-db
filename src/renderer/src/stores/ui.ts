import { create } from 'zustand'

interface UIStoreState {
  leftSidebarOpen: boolean
  databaseSidebarOpen: boolean
  isAddConnectionOpen: boolean
  rowDetailSheetOpen: boolean
  isGlobalLoading: boolean
  globalError: string | null
  editingConnectionId: string | null
  deletingConnectionId: string | null

  toggleLeftSidebar: () => void
  toggleDatabaseSidebar: () => void
  openAddConnection: () => void
  closeAddConnection: () => void
  openRowDetailSheet: () => void
  closeRowDetailSheet: () => void
  setGlobalLoading: (value: boolean) => void
  setGlobalError: (message: string | null) => void
  openEditConnection: (id: string) => void
  closeEditConnection: () => void
  askDeleteConnection: (id: string) => void
  cancelDeleteConnection: () => void
}

export const useUIStore = create<UIStoreState>((set) => ({
  leftSidebarOpen: true,
  databaseSidebarOpen: true,
  isAddConnectionOpen: false,
  rowDetailSheetOpen: false,
  isGlobalLoading: false,
  globalError: null,
  editingConnectionId: null,
  deletingConnectionId: null,

  toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
  toggleDatabaseSidebar: () => set((s) => ({ databaseSidebarOpen: !s.databaseSidebarOpen })),
  openAddConnection: () => set({ isAddConnectionOpen: true }),
  closeAddConnection: () => set({ isAddConnectionOpen: false }),
  openRowDetailSheet: () => set({ rowDetailSheetOpen: true }),
  closeRowDetailSheet: () => set({ rowDetailSheetOpen: false }),
  setGlobalLoading: (value) => set({ isGlobalLoading: value }),
  setGlobalError: (message) => set({ globalError: message }),
  openEditConnection: (id) => set({ editingConnectionId: id }),
  closeEditConnection: () => set({ editingConnectionId: null }),
  askDeleteConnection: (id) => set({ deletingConnectionId: id }),
  cancelDeleteConnection: () => set({ deletingConnectionId: null })
}))
