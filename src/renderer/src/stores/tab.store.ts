import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { S3Object } from '@shared/types'

export type SortField = 'name' | 'size' | 'lastModified'
export type SortDirection = 'asc' | 'desc'

export interface TabBrowserState {
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
}

export interface Tab {
  id: string
  title: string
  browserState: TabBrowserState
}

interface PersistedTab {
  id: string
  bucket: string | null
  prefix: string
}

interface TabStore {
  tabs: Tab[]
  activeTabId: string | null
  maxTabs: number

  // Tab management actions
  createTab: (bucket?: string | null, prefix?: string) => string | null
  closeTab: (tabId: string) => void
  switchTab: (tabId: string) => void
  nextTab: () => void
  previousTab: () => void
  getActiveTab: () => Tab | undefined
  updateTabTitle: (tabId: string, bucket: string | null, prefix: string) => void

  // Browser state actions for active tab
  setActiveTabBrowserState: (state: Partial<TabBrowserState>) => void
  getActiveTabBrowserState: () => TabBrowserState | undefined

  // Navigation actions
  navigateToBucket: (name: string, startingPrefix?: string) => Promise<void>
  navigateToPrefix: (prefix: string) => Promise<void>
  navigateUp: () => Promise<void>
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  setSort: (field: SortField, direction: SortDirection) => void

  // Selection actions
  selectKey: (key: string) => void
  toggleSelect: (key: string) => void
  selectAll: () => void
  clearSelection: () => void
  selectRange: (key: string) => void

  // Persistence
  initFromStorage: () => void
}

function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function getTabTitle(bucket: string | null, prefix: string): string {
  if (!bucket) return 'New Tab'
  if (!prefix) return bucket
  const parts = prefix.replace(/\/$/, '').split('/')
  return parts[parts.length - 1] || bucket
}

function createDefaultBrowserState(): TabBrowserState {
  return {
    currentBucket: null,
    currentPrefix: '',
    objects: [],
    loading: false,
    continuationToken: undefined,
    isTruncated: false,
    sortField: 'name',
    sortDirection: 'asc',
    selectedKeys: new Set<string>(),
    error: null
  }
}

function sortObjects(objects: S3Object[], field: SortField, direction: SortDirection): S3Object[] {
  const sorted = [...objects].sort((a, b) => {
    // Folders always come first
    if (a.isFolder && !b.isFolder) return -1
    if (!a.isFolder && b.isFolder) return 1

    let comparison = 0
    switch (field) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'size':
        comparison = a.size - b.size
        break
      case 'lastModified': {
        const aTime = a.lastModified ? new Date(a.lastModified).getTime() : 0
        const bTime = b.lastModified ? new Date(b.lastModified).getTime() : 0
        comparison = aTime - bTime
        break
      }
    }

    return direction === 'asc' ? comparison : -comparison
  })

  return sorted
}

const STORAGE_KEY = 's3explorer-tabs'

export const useTabStore = create<TabStore>()((set, get) => {
  // Helper to update a specific tab's browser state
  const updateTabBrowserState = (tabId: string, updates: Partial<TabBrowserState>): void => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId
          ? { ...tab, browserState: { ...tab.browserState, ...updates } }
          : tab
      )
    }))
  }

  // Helper to persist tabs to localStorage
  const persistTabs = (): void => {
    const { tabs, activeTabId } = get()
    const persistedTabs: PersistedTab[] = tabs.map((tab) => ({
      id: tab.id,
      bucket: tab.browserState.currentBucket,
      prefix: tab.browserState.currentPrefix
    }))
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ tabs: persistedTabs, activeTabId })
    )
  }

  return {
    tabs: [],
    activeTabId: null,
    maxTabs: 5,

    createTab: (bucket = null, prefix = '') => {
      const { tabs, maxTabs } = get()
      if (tabs.length >= maxTabs) return null

      const id = generateTabId()
      const newTab: Tab = {
        id,
        title: getTabTitle(bucket, prefix),
        browserState: {
          ...createDefaultBrowserState(),
          currentBucket: bucket,
          currentPrefix: prefix
        }
      }

      set((state) => ({
        tabs: [...state.tabs, newTab],
        activeTabId: id
      }))

      persistTabs()
      return id
    },

    closeTab: (tabId: string) => {
      const { tabs, activeTabId } = get()
      if (tabs.length <= 1) return // Don't close the last tab

      const tabIndex = tabs.findIndex((t) => t.id === tabId)
      if (tabIndex === -1) return

      const newTabs = tabs.filter((t) => t.id !== tabId)
      let newActiveId = activeTabId

      if (activeTabId === tabId) {
        // Switch to adjacent tab
        if (tabIndex >= newTabs.length) {
          newActiveId = newTabs[newTabs.length - 1].id
        } else {
          newActiveId = newTabs[tabIndex].id
        }
      }

      set({ tabs: newTabs, activeTabId: newActiveId })
      persistTabs()
    },

    switchTab: (tabId: string) => {
      const { tabs } = get()
      if (tabs.some((t) => t.id === tabId)) {
        set({ activeTabId: tabId })
        persistTabs()
      }
    },

    nextTab: () => {
      const { tabs, activeTabId } = get()
      if (tabs.length <= 1) return

      const currentIndex = tabs.findIndex((t) => t.id === activeTabId)
      const nextIndex = (currentIndex + 1) % tabs.length
      set({ activeTabId: tabs[nextIndex].id })
      persistTabs()
    },

    previousTab: () => {
      const { tabs, activeTabId } = get()
      if (tabs.length <= 1) return

      const currentIndex = tabs.findIndex((t) => t.id === activeTabId)
      const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1
      set({ activeTabId: tabs[prevIndex].id })
      persistTabs()
    },

    getActiveTab: () => {
      const { tabs, activeTabId } = get()
      return tabs.find((t) => t.id === activeTabId)
    },

    updateTabTitle: (tabId: string, bucket: string | null, prefix: string) => {
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === tabId ? { ...tab, title: getTabTitle(bucket, prefix) } : tab
        )
      }))
    },

    setActiveTabBrowserState: (updates: Partial<TabBrowserState>) => {
      const { activeTabId } = get()
      if (activeTabId) {
        updateTabBrowserState(activeTabId, updates)
      }
    },

    getActiveTabBrowserState: () => {
      const tab = get().getActiveTab()
      return tab?.browserState
    },

    navigateToBucket: async (name: string, startingPrefix?: string) => {
      const { activeTabId, updateTabTitle } = get()
      if (!activeTabId) return

      const prefix = startingPrefix ?? ''

      // Import useUiStore lazily to avoid circular dependency
      const { useUiStore } = await import('./ui.store')
      useUiStore.setState({ previewObject: null })

      updateTabBrowserState(activeTabId, {
        currentBucket: name,
        currentPrefix: prefix,
        objects: [],
        loading: true,
        continuationToken: undefined,
        isTruncated: false,
        selectedKeys: new Set<string>(),
        error: null
      })

      updateTabTitle(activeTabId, name, prefix)

      try {
        const result = await window.api.listObjects({ bucket: name, prefix, delimiter: '/' })
        const browserState = get().getActiveTabBrowserState()
        if (result.success && result.data && browserState) {
          updateTabBrowserState(activeTabId, {
            objects: sortObjects(result.data.objects, browserState.sortField, browserState.sortDirection),
            continuationToken: result.data.continuationToken,
            isTruncated: result.data.isTruncated,
            loading: false
          })
        } else {
          updateTabBrowserState(activeTabId, {
            loading: false,
            error: result.error ?? 'Failed to list objects'
          })
        }
      } catch (err) {
        updateTabBrowserState(activeTabId, {
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to list objects'
        })
      }

      persistTabs()
    },

    navigateToPrefix: async (prefix: string) => {
      const { activeTabId, updateTabTitle, getActiveTabBrowserState } = get()
      if (!activeTabId) return

      const browserState = getActiveTabBrowserState()
      if (!browserState?.currentBucket) return

      const currentBucket = browserState.currentBucket

      updateTabBrowserState(activeTabId, {
        currentPrefix: prefix,
        objects: [],
        loading: true,
        continuationToken: undefined,
        isTruncated: false,
        selectedKeys: new Set<string>(),
        error: null
      })

      updateTabTitle(activeTabId, currentBucket, prefix)

      try {
        const result = await window.api.listObjects({
          bucket: currentBucket,
          prefix,
          delimiter: '/'
        })
        const newBrowserState = get().getActiveTabBrowserState()
        if (result.success && result.data && newBrowserState) {
          updateTabBrowserState(activeTabId, {
            objects: sortObjects(result.data.objects, newBrowserState.sortField, newBrowserState.sortDirection),
            continuationToken: result.data.continuationToken,
            isTruncated: result.data.isTruncated,
            loading: false
          })
        } else {
          updateTabBrowserState(activeTabId, {
            loading: false,
            error: result.error ?? 'Failed to list objects'
          })
        }
      } catch (err) {
        updateTabBrowserState(activeTabId, {
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to list objects'
        })
      }

      persistTabs()
    },

    navigateUp: async () => {
      const { getActiveTabBrowserState, navigateToPrefix } = get()
      const browserState = getActiveTabBrowserState()
      if (!browserState?.currentPrefix) return

      const trimmed = browserState.currentPrefix.endsWith('/')
        ? browserState.currentPrefix.slice(0, -1)
        : browserState.currentPrefix
      const lastSlash = trimmed.lastIndexOf('/')
      const parentPrefix = lastSlash >= 0 ? trimmed.substring(0, lastSlash + 1) : ''

      await navigateToPrefix(parentPrefix)
    },

    loadMore: async () => {
      const { activeTabId, getActiveTabBrowserState } = get()
      if (!activeTabId) return

      const browserState = getActiveTabBrowserState()
      if (!browserState?.currentBucket || !browserState.continuationToken || browserState.loading) return

      updateTabBrowserState(activeTabId, { loading: true })

      try {
        const result = await window.api.listObjects({
          bucket: browserState.currentBucket,
          prefix: browserState.currentPrefix,
          delimiter: '/',
          continuationToken: browserState.continuationToken
        })
        const newBrowserState = get().getActiveTabBrowserState()
        if (result.success && result.data && newBrowserState) {
          const allObjects = [...newBrowserState.objects, ...result.data.objects]
          updateTabBrowserState(activeTabId, {
            objects: sortObjects(allObjects, newBrowserState.sortField, newBrowserState.sortDirection),
            continuationToken: result.data.continuationToken,
            isTruncated: result.data.isTruncated,
            loading: false
          })
        } else {
          updateTabBrowserState(activeTabId, {
            loading: false,
            error: result.error ?? 'Failed to load more objects'
          })
        }
      } catch (err) {
        updateTabBrowserState(activeTabId, {
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load more objects'
        })
      }
    },

    refresh: async () => {
      const { getActiveTabBrowserState, navigateToBucket, navigateToPrefix } = get()
      const browserState = getActiveTabBrowserState()
      if (!browserState?.currentBucket) return

      if (browserState.currentPrefix === '') {
        await navigateToBucket(browserState.currentBucket)
      } else {
        await navigateToPrefix(browserState.currentPrefix)
      }
    },

    setSort: (field: SortField, direction: SortDirection) => {
      const { activeTabId, getActiveTabBrowserState } = get()
      if (!activeTabId) return

      const browserState = getActiveTabBrowserState()
      if (!browserState) return

      updateTabBrowserState(activeTabId, {
        sortField: field,
        sortDirection: direction,
        objects: sortObjects(browserState.objects, field, direction)
      })
    },

    selectKey: (key: string) => {
      const { activeTabId } = get()
      if (activeTabId) {
        updateTabBrowserState(activeTabId, { selectedKeys: new Set([key]) })
      }
    },

    toggleSelect: (key: string) => {
      const { activeTabId, getActiveTabBrowserState } = get()
      if (!activeTabId) return

      const browserState = getActiveTabBrowserState()
      if (!browserState) return

      const next = new Set(browserState.selectedKeys)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      updateTabBrowserState(activeTabId, { selectedKeys: next })
    },

    selectAll: () => {
      const { activeTabId, getActiveTabBrowserState } = get()
      if (!activeTabId) return

      const browserState = getActiveTabBrowserState()
      if (!browserState) return

      const allKeys = new Set(browserState.objects.map((o) => o.key))
      updateTabBrowserState(activeTabId, { selectedKeys: allKeys })
    },

    clearSelection: () => {
      const { activeTabId } = get()
      if (activeTabId) {
        updateTabBrowserState(activeTabId, { selectedKeys: new Set<string>() })
      }
    },

    selectRange: (key: string) => {
      const { activeTabId, getActiveTabBrowserState } = get()
      if (!activeTabId) return

      const browserState = getActiveTabBrowserState()
      if (!browserState) return

      if (browserState.selectedKeys.size === 0) {
        updateTabBrowserState(activeTabId, { selectedKeys: new Set([key]) })
        return
      }

      const objectKeys = browserState.objects.map((o) => o.key)
      const targetIndex = objectKeys.indexOf(key)
      if (targetIndex === -1) return

      let lastSelectedIndex = -1
      for (const selected of browserState.selectedKeys) {
        const idx = objectKeys.indexOf(selected)
        if (idx !== -1) {
          lastSelectedIndex = idx
        }
      }

      if (lastSelectedIndex === -1) {
        updateTabBrowserState(activeTabId, { selectedKeys: new Set([key]) })
        return
      }

      const start = Math.min(lastSelectedIndex, targetIndex)
      const end = Math.max(lastSelectedIndex, targetIndex)
      const rangeKeys = objectKeys.slice(start, end + 1)

      const next = new Set(browserState.selectedKeys)
      for (const k of rangeKeys) {
        next.add(k)
      }
      updateTabBrowserState(activeTabId, { selectedKeys: next })
    },

    initFromStorage: () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const { tabs: persistedTabs, activeTabId } = JSON.parse(stored) as {
            tabs: PersistedTab[]
            activeTabId: string | null
          }

          if (persistedTabs && persistedTabs.length > 0) {
            const restoredTabs: Tab[] = persistedTabs.map((pt) => ({
              id: pt.id,
              title: getTabTitle(pt.bucket, pt.prefix),
              browserState: {
                ...createDefaultBrowserState(),
                currentBucket: pt.bucket,
                currentPrefix: pt.prefix
              }
            }))

            const validActiveId =
              activeTabId && restoredTabs.some((t) => t.id === activeTabId)
                ? activeTabId
                : restoredTabs[0].id

            set({ tabs: restoredTabs, activeTabId: validActiveId })
            return
          }
        }
      } catch (e) {
        console.error('Failed to restore tabs from storage:', e)
      }

      // Create default tab if no stored tabs
      const { createTab } = get()
      createTab()
    }
  }
})
