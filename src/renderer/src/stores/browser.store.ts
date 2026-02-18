import { create } from 'zustand'
import { useTabStore, type SortField, type SortDirection } from './tab.store'
import type { S3Object } from '@shared/types'

interface BrowserStore {
  // State - these are computed from the active tab
  currentBucket: string | null
  currentPrefix: string
  objects: S3Object[]
  loading: boolean
  continuationToken: string | undefined
  isTruncated: boolean
  sortField: SortField
  sortDirection: SortDirection
  selectedKeys: Set<string>
  error: string | null

  // Actions - delegated to tab store
  navigateToBucket: (name: string, startingPrefix?: string) => Promise<void>
  navigateToPrefix: (prefix: string) => Promise<void>
  navigateUp: () => Promise<void>
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  setSort: (field: SortField, direction: SortDirection) => void
  selectKey: (key: string) => void
  toggleSelect: (key: string) => void
  selectAll: () => void
  clearSelection: () => void
  selectRange: (key: string) => void
}

// Default state when no active tab
const defaultState = {
  currentBucket: null,
  currentPrefix: '',
  objects: [] as S3Object[],
  loading: false,
  continuationToken: undefined,
  isTruncated: false,
  sortField: 'name' as SortField,
  sortDirection: 'asc' as SortDirection,
  selectedKeys: new Set<string>(),
  error: null
}

// Create a store that syncs with the active tab's browser state
export const useBrowserStore = create<BrowserStore>()(() => ({
  // State getters - will be updated via subscription
  ...defaultState,

  // Actions - delegate to tab store
  navigateToBucket: async (name: string, startingPrefix?: string) => {
    await useTabStore.getState().navigateToBucket(name, startingPrefix)
  },

  navigateToPrefix: async (prefix: string) => {
    await useTabStore.getState().navigateToPrefix(prefix)
  },

  navigateUp: async () => {
    await useTabStore.getState().navigateUp()
  },

  loadMore: async () => {
    await useTabStore.getState().loadMore()
  },

  refresh: async () => {
    await useTabStore.getState().refresh()
  },

  setSort: (field: SortField, direction: SortDirection) => {
    useTabStore.getState().setSort(field, direction)
  },

  selectKey: (key: string) => {
    useTabStore.getState().selectKey(key)
  },

  toggleSelect: (key: string) => {
    useTabStore.getState().toggleSelect(key)
  },

  selectAll: () => {
    useTabStore.getState().selectAll()
  },

  clearSelection: () => {
    useTabStore.getState().clearSelection()
  },

  selectRange: (key: string) => {
    useTabStore.getState().selectRange(key)
  }
}))

// Subscribe to tab store changes and sync browser store state
useTabStore.subscribe((state) => {
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId)
  if (activeTab) {
    useBrowserStore.setState({
      currentBucket: activeTab.browserState.currentBucket,
      currentPrefix: activeTab.browserState.currentPrefix,
      objects: activeTab.browserState.objects,
      loading: activeTab.browserState.loading,
      continuationToken: activeTab.browserState.continuationToken,
      isTruncated: activeTab.browserState.isTruncated,
      sortField: activeTab.browserState.sortField,
      sortDirection: activeTab.browserState.sortDirection,
      selectedKeys: activeTab.browserState.selectedKeys,
      error: activeTab.browserState.error
    })
  } else {
    useBrowserStore.setState(defaultState)
  }
})
