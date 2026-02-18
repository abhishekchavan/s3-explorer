import { create } from 'zustand'
import type { S3Object } from '@shared/types'

interface UiStore {
  // State
  showConnectionDialog: boolean
  showPreview: boolean
  previewObject: S3Object | null
  sidebarWidth: number
  previewWidth: number
  showNewFolderDialog: boolean
  showDeleteConfirm: boolean
  deleteTargetKeys: string[]

  // Actions
  toggleConnectionDialog: () => void
  togglePreview: () => void
  setPreviewObject: (obj: S3Object | null) => void
  setSidebarWidth: (width: number) => void
  setPreviewWidth: (width: number) => void
  showNewFolder: () => void
  showDeleteConfirmDialog: (keys: string[]) => void
  hideDialogs: () => void
}

export const useUiStore = create<UiStore>()((set, get) => ({
  // State
  showConnectionDialog: false,
  showPreview: false,
  previewObject: null,
  sidebarWidth: 240,
  previewWidth: 320,
  showNewFolderDialog: false,
  showDeleteConfirm: false,
  deleteTargetKeys: [],

  // Actions
  toggleConnectionDialog: () => {
    set({ showConnectionDialog: !get().showConnectionDialog })
  },

  togglePreview: () => {
    set({ showPreview: !get().showPreview })
  },

  setPreviewObject: (obj: S3Object | null) => {
    set({ previewObject: obj, showPreview: obj !== null })
  },

  setSidebarWidth: (width: number) => {
    set({ sidebarWidth: width })
  },

  setPreviewWidth: (width: number) => {
    set({ previewWidth: width })
  },

  showNewFolder: () => {
    set({ showNewFolderDialog: true })
  },

  showDeleteConfirmDialog: (keys: string[]) => {
    set({ showDeleteConfirm: true, deleteTargetKeys: keys })
  },

  hideDialogs: () => {
    set({
      showConnectionDialog: false,
      showNewFolderDialog: false,
      showDeleteConfirm: false,
      deleteTargetKeys: []
    })
  }
}))
