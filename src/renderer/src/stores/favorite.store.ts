import { create } from 'zustand'

interface FavoriteStore {
  favorites: Set<string>
  loading: boolean

  load: () => Promise<void>
  toggle: (bucketName: string) => Promise<void>
  isFavorite: (bucketName: string) => boolean
}

export const useFavoriteStore = create<FavoriteStore>()((set, get) => ({
  favorites: new Set<string>(),
  loading: false,

  load: async () => {
    set({ loading: true })
    try {
      const result = await window.api.listFavorites()
      if (result.success && result.data) {
        set({ favorites: new Set(result.data.map((f) => f.bucketName)), loading: false })
      } else {
        set({ loading: false })
      }
    } catch {
      set({ loading: false })
    }
  },

  toggle: async (bucketName: string) => {
    const { favorites } = get()
    if (favorites.has(bucketName)) {
      const result = await window.api.removeFavorite(bucketName)
      if (result.success) {
        const next = new Set(favorites)
        next.delete(bucketName)
        set({ favorites: next })
      }
    } else {
      const result = await window.api.addFavorite(bucketName)
      if (result.success) {
        const next = new Set(favorites)
        next.add(bucketName)
        set({ favorites: next })
      }
    }
  },

  isFavorite: (bucketName: string) => {
    return get().favorites.has(bucketName)
  }
}))
