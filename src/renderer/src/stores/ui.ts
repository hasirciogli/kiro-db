import { create } from 'zustand'

interface UIStoreState {
  leftSidebarOpen: boolean
  databaseSidebarOpen: boolean
  isAddConnectionOpen: boolean

  toggleLeftSidebar: () => void
  toggleDatabaseSidebar: () => void
  openAddConnection: () => void
  closeAddConnection: () => void
}

export const useUIStore = create<UIStoreState>((set) => ({
  leftSidebarOpen: true,
  databaseSidebarOpen: true,
  isAddConnectionOpen: false,

  toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
  toggleDatabaseSidebar: () => set((s) => ({ databaseSidebarOpen: !s.databaseSidebarOpen })),
  openAddConnection: () => set({ isAddConnectionOpen: true }),
  closeAddConnection: () => set({ isAddConnectionOpen: false })
}))


