import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type { ManualCredentials } from '@shared/types'
import * as credentialManager from '../services/credentials/credential-manager'
import { listAwsProfiles } from '../services/credentials/aws-profile.reader'
import { saveCredential, deleteCredential, listSavedCredentials, getDecryptedCredential } from '../services/credentials/secure-store.service'
import { listBuckets } from '../services/s3/s3-bucket.service'
import { clearClients } from '../services/s3/s3-client.factory'

export function registerCredentialHandlers(): void {
  ipcMain.handle(IPC.CREDENTIALS_LIST_PROFILES, async () => {
    try {
      const profiles = await listAwsProfiles()
      return { success: true, data: profiles }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list profiles'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.CREDENTIALS_CONNECT_PROFILE, async (_event, profileName: string, region?: string) => {
    try {
      if (process.mas) {
        return {
          success: false,
          error: 'AWS profile-based login is unavailable in the Mac App Store build. Use manual or saved credentials.'
        }
      }

      clearClients()
      credentialManager.connectWithProfile(profileName, region)
      // Try to list buckets, but don't fail connection if listing fails
      // (user may not have ListAllMyBuckets permission)
      let buckets: Awaited<ReturnType<typeof listBuckets>> = []
      let listBucketsError: string | undefined
      try {
        buckets = await listBuckets()
      } catch (listError) {
        listBucketsError = listError instanceof Error ? listError.message : 'Failed to list buckets'
      }
      return { success: true, data: buckets, listBucketsError }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect with profile'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.CREDENTIALS_CONNECT_MANUAL, async (_event, credentials: ManualCredentials) => {
    try {
      clearClients()
      credentialManager.connectWithManualCredentials(credentials)
      // Try to list buckets, but don't fail connection if listing fails
      // (user may not have ListAllMyBuckets permission)
      let buckets: Awaited<ReturnType<typeof listBuckets>> = []
      let listBucketsError: string | undefined
      try {
        buckets = await listBuckets()
      } catch (listError) {
        listBucketsError = listError instanceof Error ? listError.message : 'Failed to list buckets'
      }
      return { success: true, data: buckets, listBucketsError }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect with credentials'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.CREDENTIALS_DISCONNECT, async () => {
    try {
      credentialManager.disconnect()
      clearClients()
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to disconnect'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.CREDENTIALS_SAVE_MANUAL, async (_event, credentials: ManualCredentials) => {
    try {
      saveCredential(credentials)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save credentials'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.CREDENTIALS_DELETE_MANUAL, async (_event, credentialId: string) => {
    try {
      deleteCredential(credentialId)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete credentials'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.CREDENTIALS_LIST_SAVED, async () => {
    try {
      const saved = listSavedCredentials()
      return { success: true, data: saved }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list saved credentials'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.CREDENTIALS_CONNECT_SAVED, async (_event, credentialId: string) => {
    try {
      const credentials = getDecryptedCredential(credentialId)
      if (!credentials) {
        return { success: false, error: 'Saved credential not found' }
      }
      clearClients()
      credentialManager.connectWithManualCredentials(credentials)
      // Try to list buckets, but don't fail connection if listing fails
      let buckets: Awaited<ReturnType<typeof listBuckets>> = []
      let listBucketsError: string | undefined
      try {
        buckets = await listBuckets()
      } catch (listError) {
        listBucketsError = listError instanceof Error ? listError.message : 'Failed to list buckets'
      }
      return { success: true, data: buckets, listBucketsError }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect with saved credentials'
      return { success: false, error: message }
    }
  })
}
