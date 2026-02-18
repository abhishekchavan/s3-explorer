import { create } from 'zustand'
import type { S3Object } from '@shared/types'

type SearchMode = 'filter' | 'search'

interface SearchStore {
  // State
  query: string
  mode: SearchMode
  searchResults: S3Object[]
  searching: boolean
  filterResults: S3Object[]

  // Actions
  setQuery: (q: string) => void
  setMode: (m: SearchMode) => void
  executeSearch: (bucket: string, prefix?: string) => Promise<void>
  cancelSearch: () => Promise<void>
  applyFilter: (objects: S3Object[]) => void
  initSearchListeners: () => () => void
}

export const useSearchStore = create<SearchStore>()((set, get) => ({
  // State
  query: '',
  mode: 'filter',
  searchResults: [],
  searching: false,
  filterResults: [],

  // Actions
  setQuery: (q: string) => {
    set({ query: q })
  },

  setMode: (m: SearchMode) => {
    set({
      mode: m,
      searchResults: [],
      filterResults: [],
      searching: false
    })
  },

  executeSearch: async (bucket: string, prefix?: string) => {
    const { query } = get()
    if (!query.trim()) return

    set({ searching: true, searchResults: [] })

    const result = await window.api.searchObjects({
      bucket,
      prefix,
      query: query.trim()
    })

    if (!result.success) {
      set({ searching: false })
      console.error('Search failed:', result.error)
    }
    // Results will arrive via onSearchResults / onSearchComplete events
  },

  cancelSearch: async () => {
    await window.api.cancelSearch()
    set({ searching: false })
  },

  applyFilter: (objects: S3Object[]) => {
    const { query } = get()
    if (!query.trim()) {
      set({ filterResults: [] })
      return
    }

    const lowerQuery = query.toLowerCase()
    const filtered = objects.filter((obj) => obj.name.toLowerCase().includes(lowerQuery))
    set({ filterResults: filtered })
  },

  initSearchListeners: () => {
    const unsubResults = window.api.onSearchResults((results) => {
      set({
        searchResults: [...get().searchResults, ...results.objects]
      })
    })

    const unsubComplete = window.api.onSearchComplete(() => {
      set({ searching: false })
    })

    return () => {
      unsubResults()
      unsubComplete()
    }
  }
}))
