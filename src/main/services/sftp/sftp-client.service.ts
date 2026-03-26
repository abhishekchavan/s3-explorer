import SftpClient from 'ssh2-sftp-client'
import fs from 'fs'
import path from 'path'
import type { SftpCredential, SftpFileEntry, SftpListResponse } from '@shared/types'

let activeClient: SftpClient | null = null
let activeCredentialId: string | null = null
let homeDirectory: string = '/'

export async function connectSftp(credential: SftpCredential): Promise<string> {
  if (activeClient) {
    try {
      await activeClient.end()
    } catch {
      // ignore
    }
    activeClient = null
  }

  const client = new SftpClient()

  const connectConfig: Record<string, unknown> = {
    host: credential.host,
    port: credential.port,
    username: credential.username
  }

  if (credential.privateKeyPath) {
    connectConfig.privateKey = fs.readFileSync(credential.privateKeyPath)
  } else if (credential.password) {
    connectConfig.password = credential.password
  }

  await client.connect(connectConfig)

  activeClient = client
  activeCredentialId = credential.id

  try {
    homeDirectory = (await client.realPath('.')) || '/'
  } catch {
    homeDirectory = '/'
  }

  return homeDirectory
}

export async function disconnectSftp(): Promise<void> {
  if (activeClient) {
    try {
      await activeClient.end()
    } catch {
      // ignore
    }
    activeClient = null
    activeCredentialId = null
    homeDirectory = '/'
  }
}

export function getActiveCredentialId(): string | null {
  return activeCredentialId
}

export function getHomeDirectory(): string {
  return homeDirectory
}

function getClient(): SftpClient {
  if (!activeClient) throw new Error('Not connected to SFTP server')
  return activeClient
}

export async function listDirectory(remotePath: string): Promise<SftpListResponse> {
  const client = getClient()
  const list = await client.list(remotePath)

  const entries: SftpFileEntry[] = list
    .filter((item) => item.name !== '.' && item.name !== '..')
    .map((item) => ({
      key: remotePath.endsWith('/') ? `${remotePath}${item.name}` : `${remotePath}/${item.name}`,
      name: item.name,
      size: item.size,
      lastModified: new Date(item.modifyTime).toISOString(),
      isFolder: item.type === 'd',
      permissions: item.rights
        ? `${item.rights.user}${item.rights.group}${item.rights.other}`
        : undefined
    }))

  // Folders first, then alphabetical
  entries.sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return { entries, path: remotePath }
}

export async function downloadFile(remotePath: string, localDir: string): Promise<string> {
  const client = getClient()
  const fileName = path.basename(remotePath)
  const localPath = path.join(localDir, fileName)
  fs.mkdirSync(localDir, { recursive: true })
  await client.get(remotePath, localPath)
  return localPath
}

export async function uploadFiles(localPaths: string[], remotePath: string): Promise<void> {
  const client = getClient()
  for (const localPath of localPaths) {
    const fileName = path.basename(localPath)
    const dest = remotePath.endsWith('/') ? `${remotePath}${fileName}` : `${remotePath}/${fileName}`
    await client.put(localPath, dest)
  }
}

export async function deleteRemotePaths(remotePaths: string[]): Promise<void> {
  const client = getClient()
  for (const remotePath of remotePaths) {
    const stat = await client.stat(remotePath)
    if (stat.isDirectory) {
      await client.rmdir(remotePath, true)
    } else {
      await client.delete(remotePath)
    }
  }
}

export async function createDirectory(remotePath: string): Promise<void> {
  const client = getClient()
  await client.mkdir(remotePath, true)
}

export async function renameRemotePath(oldPath: string, newPath: string): Promise<void> {
  const client = getClient()
  await client.rename(oldPath, newPath)
}
