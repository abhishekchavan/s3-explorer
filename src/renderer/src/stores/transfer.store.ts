import { create } from 'zustand'
import type { TransferItem, TransferProgress, TransferStatusUpdate } from '@shared/types'
import { useBrowserStore } from './browser.store'

interface TransferStore {
  // State
  transfers: TransferItem[]
  showDrawer: boolean

  // Actions
  upload: (bucket: string, prefix: string, filePaths: string[]) => Promise<void>
  uploadDirectory: (bucket: string, prefix: string, dirPath: string) => Promise<void>
  download: (bucket: string, keys: string[], destPath: string) => Promise<void>
  pause: (id: string) => Promise<void>
  resume: (id: string) => Promise<void>
  cancel: (id: string) => Promise<void>
  retry: (id: string) => Promise<void>
  clearCompleted: () => Promise<void>
  toggleDrawer: () => void
  initTransferListeners: () => () => void
}

export const useTransferStore = create<TransferStore>()((set, get) => ({
  // State
  transfers: [],
  showDrawer: false,

  // Actions
  upload: async (bucket: string, prefix: string, filePaths: string[]) => {
    set({ showDrawer: true })
    const result = await window.api.upload({ bucket, prefix, filePaths })
    if (result.success && result.data) {
      set({ transfers: [...get().transfers, ...result.data] })
    } else if (!result.success) {
      console.error('Upload failed:', result.error)
    }
  },

  uploadDirectory: async (bucket: string, prefix: string, dirPath: string) => {
    set({ showDrawer: true })
    const result = await window.api.uploadDirectory({
      bucket,
      prefix,
      directoryPath: dirPath
    })
    if (result.success && result.data) {
      set({ transfers: [...get().transfers, ...result.data] })
    } else if (!result.success) {
      console.error('Directory upload failed:', result.error)
    }
  },

  download: async (bucket: string, keys: string[], destPath: string) => {
    set({ showDrawer: true })
    const result = await window.api.download({
      bucket,
      keys,
      destinationPath: destPath
    })
    if (result.success && result.data) {
      set({ transfers: [...get().transfers, ...result.data] })
    } else if (!result.success) {
      console.error('Download failed:', result.error)
    }
  },

  pause: async (id: string) => {
    const result = await window.api.pauseTransfer(id)
    if (!result.success) {
      console.error('Pause failed:', result.error)
    }
  },

  resume: async (id: string) => {
    const result = await window.api.resumeTransfer(id)
    if (!result.success) {
      console.error('Resume failed:', result.error)
    }
  },

  cancel: async (id: string) => {
    const result = await window.api.cancelTransfer(id)
    if (!result.success) {
      console.error('Cancel failed:', result.error)
    }
  },

  retry: async (id: string) => {
    const result = await window.api.retryTransfer(id)
    if (!result.success) {
      console.error('Retry failed:', result.error)
    }
  },

  clearCompleted: async () => {
    const result = await window.api.clearCompletedTransfers()
    if (result.success) {
      set({
        transfers: get().transfers.filter(
          (t) => t.status !== 'completed' && t.status !== 'failed' && t.status !== 'cancelled'
        )
      })
    }
  },

  toggleDrawer: () => {
    set({ showDrawer: !get().showDrawer })
  },

  initTransferListeners: () => {
    const unsubProgress = window.api.onTransferProgress((progress: TransferProgress) => {
      set({
        transfers: get().transfers.map((t) => {
          if (t.id === progress.id) {
            return {
              ...t,
              bytesTransferred: progress.bytesTransferred,
              size: progress.totalBytes
            }
          }
          return t
        })
      })
    })

    const unsubStatus = window.api.onTransferStatus((status: TransferStatusUpdate) => {
      set({
        transfers: get().transfers.map((t) => {
          if (t.id === status.id) {
            return {
              ...t,
              status: status.status,
              error: status.error,
              completedAt:
                status.status === 'completed' || status.status === 'failed'
                  ? Date.now()
                  : t.completedAt,
              startedAt: status.status === 'active' && !t.startedAt ? Date.now() : t.startedAt
            }
          }

          // If this is a new transfer not yet in the list, we let the IPC events add it.
          return t
        })
      })

      // Auto-refresh the object list when an upload completes
      if (status.status === 'completed') {
        const transfer = get().transfers.find((t) => t.id === status.id)
        if (transfer && transfer.type === 'upload') {
          useBrowserStore.getState().refresh()
        }
      }

    })

    return () => {
      unsubProgress()
      unsubStatus()
    }
  }
}))
