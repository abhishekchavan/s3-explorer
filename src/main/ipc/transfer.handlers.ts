import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type { UploadRequest, UploadDirectoryRequest, DownloadRequest } from '@shared/types'
import { transferManager } from '../services/transfer/transfer-manager'

export function registerTransferHandlers(): void {
  ipcMain.handle(IPC.TRANSFER_UPLOAD, async (_event, request: UploadRequest) => {
    try {
      const items = transferManager.addUploads(request)
      return { success: true, data: items }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to queue uploads'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.TRANSFER_UPLOAD_DIRECTORY, async (_event, request: UploadDirectoryRequest) => {
    try {
      const items = transferManager.addDirectoryUpload(request)
      return { success: true, data: items }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to queue directory upload'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.TRANSFER_DOWNLOAD, async (_event, request: DownloadRequest) => {
    try {
      const items = transferManager.addDownloads(request)
      return { success: true, data: items }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to queue downloads'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.TRANSFER_PAUSE, async (_event, transferId: string) => {
    try {
      transferManager.pause(transferId)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to pause transfer'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.TRANSFER_RESUME, async (_event, transferId: string) => {
    try {
      transferManager.resume(transferId)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resume transfer'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.TRANSFER_CANCEL, async (_event, transferId: string) => {
    try {
      transferManager.cancel(transferId)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel transfer'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.TRANSFER_RETRY, async (_event, transferId: string) => {
    try {
      transferManager.retry(transferId)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to retry transfer'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.TRANSFER_CLEAR_COMPLETED, async () => {
    try {
      transferManager.clearCompleted()
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear completed transfers'
      return { success: false, error: message }
    }
  })
}
