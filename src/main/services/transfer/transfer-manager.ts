import { v4 as uuidv4 } from 'uuid'
import { basename, join } from 'path'
import { statSync, readdirSync } from 'fs'
import { downloadFile } from './download.service'
import { uploadFile } from './upload.service'
import { getMainWindow } from '../../index'
import { IPC } from '@shared/ipc-channels'
import type {
  TransferItem,
  TransferStatus,
  TransferProgress,
  TransferStatusUpdate,
  UploadRequest,
  UploadDirectoryRequest,
  DownloadRequest
} from '@shared/types'

const MAX_CONCURRENT = 3
const PROGRESS_THROTTLE_MS = 200

interface InternalTransferItem extends TransferItem {
  abortController?: AbortController
}

class TransferManager {
  private queue: InternalTransferItem[] = []
  private activeCount = 0
  private progressTimers = new Map<string, number>()

  getAll(): TransferItem[] {
    return this.queue.map(({ abortController, ...item }) => item)
  }

  addDownloads(request: DownloadRequest): TransferItem[] {
    const items: TransferItem[] = []

    for (const key of request.keys) {
      const fileName = basename(key) || key
      const relativePath = this.getSafeDownloadRelativePath(key)
      const localPath = join(request.destinationPath, relativePath)

      const item: InternalTransferItem = {
        id: uuidv4(),
        type: 'download',
        status: 'queued',
        fileName,
        localPath,
        bucket: request.bucket,
        key,
        size: 0,
        bytesTransferred: 0
      }

      this.queue.push(item)
      items.push({ ...item })
      this.sendStatusUpdate(item.id, 'queued')
    }

    this.processQueue()
    return items
  }

  addUploads(request: UploadRequest): TransferItem[] {
    const items: TransferItem[] = []

    for (const filePath of request.filePaths) {
      const fileName = basename(filePath)
      const key = request.prefix ? `${request.prefix}${fileName}` : fileName

      let size = 0
      try {
        size = statSync(filePath).size
      } catch {
        // File may not be accessible, size stays 0
      }

      const item: InternalTransferItem = {
        id: uuidv4(),
        type: 'upload',
        status: 'queued',
        fileName,
        localPath: filePath,
        bucket: request.bucket,
        key,
        size,
        bytesTransferred: 0
      }

      this.queue.push(item)
      items.push({ ...item })
      this.sendStatusUpdate(item.id, 'queued')
    }

    this.processQueue()
    return items
  }

  addDirectoryUpload(request: UploadDirectoryRequest): TransferItem[] {
    const filePaths = this.collectFiles(request.directoryPath, request.directoryPath)

    const items: TransferItem[] = []

    for (const { absolutePath, relativePath } of filePaths) {
      const key = request.prefix ? `${request.prefix}${relativePath}` : relativePath
      const fileName = basename(absolutePath)

      let size = 0
      try {
        size = statSync(absolutePath).size
      } catch {
        // File may not be accessible
      }

      const item: InternalTransferItem = {
        id: uuidv4(),
        type: 'upload',
        status: 'queued',
        fileName,
        localPath: absolutePath,
        bucket: request.bucket,
        key,
        size,
        bytesTransferred: 0
      }

      this.queue.push(item)
      items.push({ ...item })
      this.sendStatusUpdate(item.id, 'queued')
    }

    this.processQueue()
    return items
  }

  pause(id: string): void {
    const item = this.findItem(id)
    if (!item) return

    if (item.status === 'active') {
      item.abortController?.abort()
      item.status = 'paused'
      this.activeCount--
      this.sendStatusUpdate(id, 'paused')
      this.processQueue()
    } else if (item.status === 'queued') {
      item.status = 'paused'
      this.sendStatusUpdate(id, 'paused')
    }
  }

  resume(id: string): void {
    const item = this.findItem(id)
    if (!item || item.status !== 'paused') return

    item.status = 'queued'
    item.abortController = undefined
    this.sendStatusUpdate(id, 'queued')
    this.processQueue()
  }

  cancel(id: string): void {
    const item = this.findItem(id)
    if (!item) return

    if (item.status === 'active') {
      item.abortController?.abort()
      this.activeCount--
    }

    item.status = 'cancelled'
    item.abortController = undefined
    this.sendStatusUpdate(id, 'cancelled')
    this.processQueue()
  }

  retry(id: string): void {
    const item = this.findItem(id)
    if (!item || (item.status !== 'failed' && item.status !== 'cancelled')) return

    item.status = 'queued'
    item.bytesTransferred = 0
    item.error = undefined
    item.abortController = undefined
    this.sendStatusUpdate(id, 'queued')
    this.processQueue()
  }

  clearCompleted(): void {
    this.queue = this.queue.filter(
      (item) => item.status !== 'completed' && item.status !== 'cancelled' && item.status !== 'failed'
    )
  }

  private findItem(id: string): InternalTransferItem | undefined {
    return this.queue.find((item) => item.id === id)
  }

  private processQueue(): void {
    while (this.activeCount < MAX_CONCURRENT) {
      const nextItem = this.queue.find((item) => item.status === 'queued')
      if (!nextItem) break

      this.startTransfer(nextItem)
    }
  }

  private async startTransfer(item: InternalTransferItem): Promise<void> {
    item.status = 'active'
    item.startedAt = Date.now()
    item.abortController = new AbortController()
    this.activeCount++

    this.sendStatusUpdate(item.id, 'active')

    const progressCallback = this.createThrottledProgressCallback(item.id)

    try {
      if (item.type === 'download') {
        await downloadFile({
          bucket: item.bucket,
          key: item.key,
          localPath: item.localPath,
          onProgress: (progress) => {
            item.bytesTransferred = progress.bytesTransferred
            item.size = progress.totalBytes || item.size
            progressCallback({
              id: item.id,
              bytesTransferred: progress.bytesTransferred,
              totalBytes: progress.totalBytes
            })
          },
          abortSignal: item.abortController.signal
        })
      } else {
        await uploadFile({
          bucket: item.bucket,
          key: item.key,
          localPath: item.localPath,
          onProgress: (progress) => {
            item.bytesTransferred = progress.bytesTransferred
            item.size = progress.totalBytes || item.size
            progressCallback({
              id: item.id,
              bytesTransferred: progress.bytesTransferred,
              totalBytes: progress.totalBytes
            })
          },
          abortSignal: item.abortController.signal
        })
      }

      // Only mark completed if still active (wasn't paused/cancelled during transfer)
      if (item.status === 'active') {
        item.status = 'completed'
        item.completedAt = Date.now()
        item.bytesTransferred = item.size
        this.activeCount--
        this.sendStatusUpdate(item.id, 'completed')

        // Send final progress
        this.sendProgress({
          id: item.id,
          bytesTransferred: item.size,
          totalBytes: item.size
        })
      }
    } catch (err) {
      // Only mark as failed if still active (wasn't paused/cancelled)
      if (item.status === 'active') {
        item.status = 'failed'
        item.error = err instanceof Error ? err.message : String(err)
        this.activeCount--
        this.sendStatusUpdate(item.id, 'failed', item.error)
      }
    } finally {
      this.clearProgressTimer(item.id)
      this.processQueue()
    }
  }

  private createThrottledProgressCallback(
    transferId: string
  ): (progress: TransferProgress) => void {
    let lastSent = 0
    let pendingProgress: TransferProgress | null = null

    return (progress: TransferProgress): void => {
      const now = Date.now()
      if (now - lastSent >= PROGRESS_THROTTLE_MS) {
        this.sendProgress(progress)
        lastSent = now
        pendingProgress = null
      } else {
        pendingProgress = progress
        // Schedule sending the pending progress if not already scheduled
        if (!this.progressTimers.has(transferId)) {
          const timerId = setTimeout(() => {
            if (pendingProgress) {
              this.sendProgress(pendingProgress)
              pendingProgress = null
            }
            this.progressTimers.delete(transferId)
          }, PROGRESS_THROTTLE_MS - (now - lastSent)) as unknown as number

          this.progressTimers.set(transferId, timerId)
        }
      }
    }
  }

  private clearProgressTimer(transferId: string): void {
    const timerId = this.progressTimers.get(transferId)
    if (timerId !== undefined) {
      clearTimeout(timerId)
      this.progressTimers.delete(transferId)
    }
  }

  private sendProgress(progress: TransferProgress): void {
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC.TRANSFER_PROGRESS, progress)
    }
  }

  private sendStatusUpdate(id: string, status: TransferStatus, error?: string): void {
    const update: TransferStatusUpdate = { id, status, error }
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC.TRANSFER_STATUS, update)
    }
  }

  private collectFiles(
    rootDir: string,
    currentDir: string
  ): { absolutePath: string; relativePath: string }[] {
    const results: { absolutePath: string; relativePath: string }[] = []

    try {
      const entries = readdirSync(currentDir, { withFileTypes: true })

      for (const entry of entries) {
        const absolutePath = join(currentDir, entry.name)

        if (entry.isDirectory()) {
          results.push(...this.collectFiles(rootDir, absolutePath))
        } else if (entry.isFile()) {
          const relativePath = absolutePath.slice(rootDir.length + 1).replace(/\\/g, '/')
          results.push({ absolutePath, relativePath })
        }
      }
    } catch {
      // Skip directories we can't read
    }

    return results
  }

  private getSafeDownloadRelativePath(key: string): string {
    const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '')
    const segments = normalized
      .split('/')
      .filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..')

    if (segments.length === 0) {
      return 'downloaded-object'
    }

    return segments.join('/')
  }
}

export const transferManager = new TransferManager()
