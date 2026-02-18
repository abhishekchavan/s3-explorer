export type TransferType = 'upload' | 'download'
export type TransferStatus = 'queued' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled'

export interface TransferItem {
  id: string
  type: TransferType
  status: TransferStatus
  fileName: string
  localPath: string
  bucket: string
  key: string
  size: number
  bytesTransferred: number
  error?: string
  startedAt?: number
  completedAt?: number
}

export interface TransferProgress {
  id: string
  bytesTransferred: number
  totalBytes: number
}

export interface TransferStatusUpdate {
  id: string
  status: TransferStatus
  error?: string
}

export interface UploadRequest {
  bucket: string
  prefix: string
  filePaths: string[]
}

export interface UploadDirectoryRequest {
  bucket: string
  prefix: string
  directoryPath: string
}

export interface DownloadRequest {
  bucket: string
  keys: string[]
  destinationPath: string
}
