import { create } from 'zustand'

export const useSettings = create((set) => ({
  open: false,
  setOpen: (value: number) => set({ open: value })
}))
