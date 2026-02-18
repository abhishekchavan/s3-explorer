import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type {
  AwsProfile,
  ManualCredentials,
  SavedCredential,
  S3Bucket,
  ListObjectsRequest,
  ListObjectsResponse,
  HeadObjectResponse,
  DeleteObjectsRequest,
  CreateFolderRequest,
  CopyObjectRequest,
  PresignedUrlRequest,
  GetObjectContentRequest,
  SearchObjectsRequest,
  UploadRequest,
  UploadDirectoryRequest,
  DownloadRequest,
  TransferItem,
  TransferProgress,
  TransferStatusUpdate,
  Bookmark,
  FavoriteBucket
} from '@shared/types'

export interface ElectronAPI {
  // Credentials
  listProfiles(): Promise<{ success: boolean; data?: AwsProfile[]; error?: string }>
  connectProfile(profileName: string, region?: string): Promise<{ success: boolean; data?: S3Bucket[]; error?: string; listBucketsError?: string }>
  connectManual(creds: ManualCredentials): Promise<{ success: boolean; data?: S3Bucket[]; error?: string; listBucketsError?: string }>
  disconnect(): Promise<{ success: boolean; error?: string }>
  saveManualCredential(creds: ManualCredentials): Promise<{ success: boolean; error?: string }>
  deleteManualCredential(id: string): Promise<{ success: boolean; error?: string }>
  listSavedCredentials(): Promise<{ success: boolean; data?: SavedCredential[]; error?: string }>
  connectSavedCredential(id: string): Promise<{ success: boolean; data?: S3Bucket[]; error?: string; listBucketsError?: string }>

  // S3 Buckets
  listBuckets(): Promise<{ success: boolean; data?: S3Bucket[]; error?: string }>
  getBucketLocation(bucket: string): Promise<{ success: boolean; data?: string; error?: string }>

  // S3 Objects
  listObjects(req: ListObjectsRequest): Promise<{ success: boolean; data?: ListObjectsResponse; error?: string }>
  headObject(bucket: string, key: string): Promise<{ success: boolean; data?: HeadObjectResponse; error?: string }>
  deleteObjects(req: DeleteObjectsRequest): Promise<{ success: boolean; error?: string }>
  createFolder(req: CreateFolderRequest): Promise<{ success: boolean; error?: string }>
  copyObject(req: CopyObjectRequest): Promise<{ success: boolean; error?: string }>
  moveObject(req: CopyObjectRequest): Promise<{ success: boolean; error?: string }>
  getPresignedUrl(req: PresignedUrlRequest): Promise<{ success: boolean; data?: string; error?: string }>
  getObjectContent(req: GetObjectContentRequest): Promise<{ success: boolean; data?: string; error?: string }>
  searchObjects(req: SearchObjectsRequest): Promise<{ success: boolean; error?: string }>
  cancelSearch(): Promise<{ success: boolean; error?: string }>

  // Transfers
  upload(req: UploadRequest): Promise<{ success: boolean; data?: TransferItem[]; error?: string }>
  uploadDirectory(req: UploadDirectoryRequest): Promise<{ success: boolean; data?: TransferItem[]; error?: string }>
  download(req: DownloadRequest): Promise<{ success: boolean; data?: TransferItem[]; error?: string }>
  pauseTransfer(id: string): Promise<{ success: boolean; error?: string }>
  resumeTransfer(id: string): Promise<{ success: boolean; error?: string }>
  cancelTransfer(id: string): Promise<{ success: boolean; error?: string }>
  retryTransfer(id: string): Promise<{ success: boolean; error?: string }>
  clearCompletedTransfers(): Promise<{ success: boolean; error?: string }>

  // Transfer events
  onTransferProgress(callback: (progress: TransferProgress) => void): () => void
  onTransferStatus(callback: (status: TransferStatusUpdate) => void): () => void

  // Search events
  onSearchResults(callback: (results: { objects: import('@shared/types').S3Object[] }) => void): () => void
  onSearchComplete(callback: () => void): () => void

  // Bookmarks
  listBookmarks(): Promise<{ success: boolean; data?: Bookmark[]; error?: string }>
  addBookmark(bookmark: Omit<Bookmark, 'id' | 'createdAt'>): Promise<{ success: boolean; data?: Bookmark; error?: string }>
  updateBookmark(id: string, updates: Partial<Bookmark>): Promise<{ success: boolean; error?: string }>
  deleteBookmark(id: string): Promise<{ success: boolean; error?: string }>
  reorderBookmarks(ids: string[]): Promise<{ success: boolean; error?: string }>

  // Favorites
  listFavorites(): Promise<{ success: boolean; data?: FavoriteBucket[]; error?: string }>
  addFavorite(bucketName: string): Promise<{ success: boolean; data?: FavoriteBucket; error?: string }>
  removeFavorite(bucketName: string): Promise<{ success: boolean; error?: string }>

  // Filesystem
  selectFiles(): Promise<{ success: boolean; data?: string[]; error?: string }>
  selectDirectory(): Promise<{ success: boolean; data?: string; error?: string }>
  selectDownloadDirectory(): Promise<{ success: boolean; data?: string; error?: string }>
  selectSavePath(defaultName: string): Promise<{ success: boolean; data?: string; error?: string }>
  startDrag(filePath: string): void
  showInFinder(filePath: string): Promise<{ success: boolean; error?: string }>

  // App
  getPlatform(): Promise<string>
  isMasBuild(): Promise<boolean>
  getPathForFile(file: File): string
}

const api: ElectronAPI = {
  // Credentials
  listProfiles: () => ipcRenderer.invoke(IPC.CREDENTIALS_LIST_PROFILES),
  connectProfile: (profileName, region) => ipcRenderer.invoke(IPC.CREDENTIALS_CONNECT_PROFILE, profileName, region),
  connectManual: (creds) => ipcRenderer.invoke(IPC.CREDENTIALS_CONNECT_MANUAL, creds),
  disconnect: () => ipcRenderer.invoke(IPC.CREDENTIALS_DISCONNECT),
  saveManualCredential: (creds) => ipcRenderer.invoke(IPC.CREDENTIALS_SAVE_MANUAL, creds),
  deleteManualCredential: (id) => ipcRenderer.invoke(IPC.CREDENTIALS_DELETE_MANUAL, id),
  listSavedCredentials: () => ipcRenderer.invoke(IPC.CREDENTIALS_LIST_SAVED),
  connectSavedCredential: (id) => ipcRenderer.invoke(IPC.CREDENTIALS_CONNECT_SAVED, id),

  // S3 Buckets
  listBuckets: () => ipcRenderer.invoke(IPC.S3_LIST_BUCKETS),
  getBucketLocation: (bucket) => ipcRenderer.invoke(IPC.S3_GET_BUCKET_LOCATION, bucket),

  // S3 Objects
  listObjects: (req) => ipcRenderer.invoke(IPC.S3_LIST_OBJECTS, req),
  headObject: (bucket, key) => ipcRenderer.invoke(IPC.S3_HEAD_OBJECT, bucket, key),
  deleteObjects: (req) => ipcRenderer.invoke(IPC.S3_DELETE_OBJECTS, req),
  createFolder: (req) => ipcRenderer.invoke(IPC.S3_CREATE_FOLDER, req),
  copyObject: (req) => ipcRenderer.invoke(IPC.S3_COPY_OBJECT, req),
  moveObject: (req) => ipcRenderer.invoke(IPC.S3_MOVE_OBJECT, req),
  getPresignedUrl: (req) => ipcRenderer.invoke(IPC.S3_GET_PRESIGNED_URL, req),
  getObjectContent: (req) => ipcRenderer.invoke(IPC.S3_GET_OBJECT_CONTENT, req),
  searchObjects: (req) => ipcRenderer.invoke(IPC.S3_SEARCH_OBJECTS, req),
  cancelSearch: () => ipcRenderer.invoke(IPC.S3_CANCEL_SEARCH),

  // Transfers
  upload: (req) => ipcRenderer.invoke(IPC.TRANSFER_UPLOAD, req),
  uploadDirectory: (req) => ipcRenderer.invoke(IPC.TRANSFER_UPLOAD_DIRECTORY, req),
  download: (req) => ipcRenderer.invoke(IPC.TRANSFER_DOWNLOAD, req),
  pauseTransfer: (id) => ipcRenderer.invoke(IPC.TRANSFER_PAUSE, id),
  resumeTransfer: (id) => ipcRenderer.invoke(IPC.TRANSFER_RESUME, id),
  cancelTransfer: (id) => ipcRenderer.invoke(IPC.TRANSFER_CANCEL, id),
  retryTransfer: (id) => ipcRenderer.invoke(IPC.TRANSFER_RETRY, id),
  clearCompletedTransfers: () => ipcRenderer.invoke(IPC.TRANSFER_CLEAR_COMPLETED),

  // Transfer events
  onTransferProgress: (callback) => {
    const handler = (_: unknown, progress: TransferProgress) => callback(progress)
    ipcRenderer.on(IPC.TRANSFER_PROGRESS, handler)
    return () => ipcRenderer.removeListener(IPC.TRANSFER_PROGRESS, handler)
  },
  onTransferStatus: (callback) => {
    const handler = (_: unknown, status: TransferStatusUpdate) => callback(status)
    ipcRenderer.on(IPC.TRANSFER_STATUS, handler)
    return () => ipcRenderer.removeListener(IPC.TRANSFER_STATUS, handler)
  },

  // Search events
  onSearchResults: (callback) => {
    const handler = (_: unknown, results: any) => callback(results)
    ipcRenderer.on(IPC.SEARCH_RESULTS, handler)
    return () => ipcRenderer.removeListener(IPC.SEARCH_RESULTS, handler)
  },
  onSearchComplete: (callback) => {
    const handler = () => callback()
    ipcRenderer.on(IPC.SEARCH_COMPLETE, handler)
    return () => ipcRenderer.removeListener(IPC.SEARCH_COMPLETE, handler)
  },

  // Bookmarks
  listBookmarks: () => ipcRenderer.invoke(IPC.BOOKMARK_LIST),
  addBookmark: (bookmark) => ipcRenderer.invoke(IPC.BOOKMARK_ADD, bookmark),
  updateBookmark: (id, updates) => ipcRenderer.invoke(IPC.BOOKMARK_UPDATE, id, updates),
  deleteBookmark: (id) => ipcRenderer.invoke(IPC.BOOKMARK_DELETE, id),
  reorderBookmarks: (ids) => ipcRenderer.invoke(IPC.BOOKMARK_REORDER, ids),

  // Favorites
  listFavorites: () => ipcRenderer.invoke(IPC.FAVORITE_LIST),
  addFavorite: (bucketName) => ipcRenderer.invoke(IPC.FAVORITE_ADD, bucketName),
  removeFavorite: (bucketName) => ipcRenderer.invoke(IPC.FAVORITE_REMOVE, bucketName),

  // Filesystem
  selectFiles: () => ipcRenderer.invoke(IPC.FS_SELECT_FILES),
  selectDirectory: () => ipcRenderer.invoke(IPC.FS_SELECT_DIRECTORY),
  selectDownloadDirectory: () => ipcRenderer.invoke(IPC.FS_SELECT_DOWNLOAD_DIRECTORY),
  selectSavePath: (defaultName) => ipcRenderer.invoke(IPC.FS_SELECT_SAVE_PATH, defaultName),
  startDrag: (filePath) => ipcRenderer.send(IPC.FS_START_DRAG, filePath),
  showInFinder: (filePath) => ipcRenderer.invoke(IPC.FS_SHOW_IN_FINDER, filePath),

  // App
  getPlatform: () => ipcRenderer.invoke(IPC.APP_GET_PLATFORM),
  isMasBuild: () => Promise.resolve(!!process.mas),
  getPathForFile: (file: File) => webUtils.getPathForFile(file)
}

contextBridge.exposeInMainWorld('api', api)
