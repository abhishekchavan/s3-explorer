import { ipcMain } from 'electron'
import { IPC } from '../../../shared/ipc-channels'
import {
  listSftpCredentials,
  saveSftpCredential,
  deleteSftpCredential,
  getSftpCredential
} from '../services/sftp/sftp-credential.service'
import {
  connectSftp,
  disconnectSftp,
  listDirectory,
  downloadFile,
  uploadFiles,
  deleteRemotePaths,
  createDirectory,
  renameRemotePath
} from '../services/sftp/sftp-client.service'
import type { SftpCredential } from '@shared/types'

export function registerSftpHandlers(): void {
  ipcMain.handle(IPC.SFTP_LIST_CREDENTIALS, () => {
    try {
      return { success: true, data: listSftpCredentials() }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(
    IPC.SFTP_SAVE_CREDENTIAL,
    (_event, credential: Omit<SftpCredential, 'id' | 'createdAt'>) => {
      try {
        const saved = saveSftpCredential(credential)
        return { success: true, data: saved }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(IPC.SFTP_DELETE_CREDENTIAL, (_event, id: string) => {
    try {
      deleteSftpCredential(id)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.SFTP_CONNECT, async (_event, credentialId: string) => {
    try {
      const credential = getSftpCredential(credentialId)
      if (!credential) return { success: false, error: 'Credential not found' }
      const homeDir = await connectSftp(credential)
      return { success: true, data: { homeDir, label: credential.label } }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.SFTP_DISCONNECT, async () => {
    try {
      await disconnectSftp()
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.SFTP_LIST_DIRECTORY, async (_event, remotePath: string) => {
    try {
      const result = await listDirectory(remotePath)
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(
    IPC.SFTP_DOWNLOAD,
    async (_event, remotePath: string, localDir: string) => {
      try {
        const localPath = await downloadFile(remotePath, localDir)
        return { success: true, data: localPath }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC.SFTP_UPLOAD,
    async (_event, localPaths: string[], remotePath: string) => {
      try {
        await uploadFiles(localPaths, remotePath)
        return { success: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(IPC.SFTP_DELETE, async (_event, remotePaths: string[]) => {
    try {
      await deleteRemotePaths(remotePaths)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.SFTP_CREATE_DIRECTORY, async (_event, remotePath: string) => {
    try {
      await createDirectory(remotePath)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(
    IPC.SFTP_RENAME,
    async (_event, oldPath: string, newPath: string) => {
      try {
        await renameRemotePath(oldPath, newPath)
        return { success: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )
}
