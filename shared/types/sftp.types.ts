export interface SftpCredential {
  id: string
  label: string
  host: string
  port: number
  username: string
  password?: string
  privateKeyPath?: string
  createdAt: number
}

export interface SftpFileEntry {
  key: string
  name: string
  size: number
  lastModified?: string
  isFolder: boolean
  permissions?: string
}

export interface SftpListRequest {
  path: string
}

export interface SftpListResponse {
  entries: SftpFileEntry[]
  path: string
}

export interface SftpDownloadRequest {
  remotePath: string
  localDir: string
}

export interface SftpUploadRequest {
  localPaths: string[]
  remotePath: string
}

export interface SftpDeleteRequest {
  remotePaths: string[]
}
