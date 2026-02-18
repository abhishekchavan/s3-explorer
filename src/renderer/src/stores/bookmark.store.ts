import { create } from 'zustand'
import type { Bookmark } from '@shared/types'

interface BookmarkStore {
  // State
  bookmarks: Bookmark[]
  loading: boolean
  newlyAddedId: string | null

  // Actions
  load: () => Promise<void>
  add: (label: string, bucket: string, prefix: string, connectionLabel: string) => Promise<void>
  remove: (id: string) => Promise<void>
  rename: (id: string, newLabel: string) => Promise<void>
  reorder: (ids: string[]) => Promise<void>
  clearNewlyAdded: () => void
}

export const useBookmarkStore = create<BookmarkStore>()((set, get) => ({
  // State
  bookmarks: [],
  loading: false,
  newlyAddedId: null,

  // Actions
  load: async () => {
    set({ loading: true })
    try {
      const result = await window.api.listBookmarks()
      if (result.success && result.data) {
        set({ bookmarks: result.data, loading: false })
      } else {
        set({ loading: false })
      }
    } catch {
      set({ loading: false })
    }
  },

  add: async (label: string, bucket: string, prefix: string, connectionLabel: string) => {
    const result = await window.api.addBookmark({ label, bucket, prefix, connectionLabel })
    if (result.success && result.data) {
      const newBookmark = result.data
      set({ bookmarks: [...get().bookmarks, newBookmark], newlyAddedId: newBookmark.id })
      // Clear the newly added indicator after animation completes
      setTimeout(() => {
        if (get().newlyAddedId === newBookmark.id) {
          set({ newlyAddedId: null })
        }
      }, 2000)
    }
  },

  clearNewlyAdded: () => set({ newlyAddedId: null }),

  remove: async (id: string) => {
    const result = await window.api.deleteBookmark(id)
    if (result.success) {
      set({ bookmarks: get().bookmarks.filter((b) => b.id !== id) })
    }
  },

  rename: async (id: string, newLabel: string) => {
    const result = await window.api.updateBookmark(id, { label: newLabel })
    if (result.success) {
      set({
        bookmarks: get().bookmarks.map((b) => (b.id === id ? { ...b, label: newLabel } : b))
      })
    }
  },

  reorder: async (ids: string[]) => {
    const result = await window.api.reorderBookmarks(ids)
    if (result.success) {
      // Reorder local bookmarks to match the provided order
      const bookmarkMap = new Map(get().bookmarks.map((b) => [b.id, b]))
      const reordered = ids.map((id) => bookmarkMap.get(id)).filter(Boolean) as Bookmark[]
      set({ bookmarks: reordered })
    }
  }
}))
