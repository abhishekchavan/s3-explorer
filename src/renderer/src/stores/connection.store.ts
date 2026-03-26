import { create } from 'zustand'
import type {
  AwsProfile,
  ManualCredentials,
  SavedCredential,
  S3Bucket,
  ConnectionState,
  SftpCredential
} from '@shared/types'
import { useBrowserStore } from './browser.store'
import { useTabStore } from './tab.store'

interface ConnectionStore {
  // State
  connected: boolean
  connecting: boolean
  connectionInfo: ConnectionState | null
  profiles: AwsProfile[]
  savedCredentials: SavedCredential[]
  sftpCredentials: SftpCredential[]
  buckets: S3Bucket[]
  error: string | null
  listBucketsError: string | null
  presignedUrlSupported: boolean

  // Actions
  loadProfiles: () => Promise<void>
  connectProfile: (name: string, region?: string) => Promise<void>
  connectManual: (creds: ManualCredentials) => Promise<void>
  disconnect: () => Promise<void>
  loadSavedCredentials: () => Promise<void>
  connectSavedCredential: (id: string) => Promise<void>
  saveCreds: (creds: ManualCredentials) => Promise<void>
  deleteCreds: (id: string) => Promise<void>
  setPresignedUrlSupported: (supported: boolean) => void
  addManualBucket: (bucketName: string, region?: string, startingPrefix?: string) => void
  removeManualBucket: (bucketName: string) => void

  // SFTP
  loadSftpCredentials: () => Promise<void>
  connectSftp: (credentialId: string) => Promise<void>
  saveSftpCredential: (credential: Omit<SftpCredential, 'id' | 'createdAt'>) => Promise<void>
  deleteSftpCredential: (id: string) => Promise<void>
}

export const useConnectionStore = create<ConnectionStore>()((set, get) => ({
  // State
  connected: false,
  connecting: false,
  connectionInfo: null,
  profiles: [],
  savedCredentials: [],
  sftpCredentials: [],
  buckets: [],
  error: null,
  listBucketsError: null,
  presignedUrlSupported: true,

  // Actions
  loadProfiles: async () => {
    const result = await window.api.listProfiles()
    if (result.success && result.data) {
      set({ profiles: result.data })
    } else {
      set({ error: result.error ?? 'Failed to load profiles' })
    }
  },

  connectProfile: async (name: string, region?: string) => {
    set({ connecting: true, error: null, listBucketsError: null })
    try {
      const result = await window.api.connectProfile(name, region)
      if (result.success) {
        const profile = get().profiles.find((p) => p.name === name)
        useTabStore.getState().clearAllTabBrowserStates()
        set({
          connected: true,
          connecting: false,
          buckets: result.data ?? [],
          listBucketsError: result.listBucketsError ?? null,
          presignedUrlSupported: true,
          connectionInfo: {
            type: 'profile',
            profileName: name,
            label: name,
            region: region ?? profile?.region ?? '',
            connected: true
          }
        })
      } else {
        set({
          connecting: false,
          error: result.error ?? 'Failed to connect with profile'
        })
      }
    } catch (err) {
      set({
        connecting: false,
        error: err instanceof Error ? err.message : 'Failed to connect with profile'
      })
    }
  },

  connectManual: async (creds: ManualCredentials) => {
    set({ connecting: true, error: null, listBucketsError: null })
    try {
      const result = await window.api.connectManual(creds)
      if (result.success) {
        useTabStore.getState().clearAllTabBrowserStates()
        set({
          connected: true,
          connecting: false,
          buckets: result.data ?? [],
          listBucketsError: result.listBucketsError ?? null,
          presignedUrlSupported: true,
          connectionInfo: {
            type: 'manual',
            credentialId: creds.id,
            label: creds.label,
            region: creds.region,
            connected: true
          }
        })
      } else {
        set({
          connecting: false,
          error: result.error ?? 'Failed to connect with credentials'
        })
      }
    } catch (err) {
      set({
        connecting: false,
        error: err instanceof Error ? err.message : 'Failed to connect with credentials'
      })
    }
  },

  disconnect: async () => {
    const { connectionInfo } = get()
    try {
      if (connectionInfo?.type === 'sftp') {
        await window.api.sftpDisconnect()
      } else {
        await window.api.disconnect()
      }
    } finally {
      useTabStore.getState().clearAllTabBrowserStates()
      set({
        connected: false,
        connecting: false,
        connectionInfo: null,
        buckets: [],
        error: null,
        listBucketsError: null
      })
    }
  },

  loadSavedCredentials: async () => {
    const result = await window.api.listSavedCredentials()
    if (result.success && result.data) {
      set({ savedCredentials: result.data })
    } else {
      set({ error: result.error ?? 'Failed to load saved credentials' })
    }
  },

  connectSavedCredential: async (id: string) => {
    set({ connecting: true, error: null, listBucketsError: null })
    try {
      const savedCred = get().savedCredentials.find((c) => c.id === id)
      const result = await window.api.connectSavedCredential(id)
      if (result.success) {
        useTabStore.getState().clearAllTabBrowserStates()

        // If default bucket is set, suppress listBucketsError since we'll navigate directly
        const suppressListBucketsError = !!(savedCred?.defaultBucket)

        set({
          connected: true,
          connecting: false,
          buckets: result.data ?? [],
          listBucketsError: suppressListBucketsError ? null : (result.listBucketsError ?? null),
          presignedUrlSupported: true,
          connectionInfo: {
            type: 'manual',
            credentialId: id,
            label: savedCred?.label ?? 'Saved Credential',
            region: savedCred?.region ?? '',
            connected: true
          }
        })

        // Navigate to default bucket/prefix if set
        if (savedCred?.defaultBucket) {
          setTimeout(() => {
            useBrowserStore.getState().navigateToBucket(
              savedCred.defaultBucket!,
              savedCred.defaultPrefix || ''
            )
          }, 100)
        }
      } else {
        set({
          connecting: false,
          error: result.error ?? 'Failed to connect with saved credentials'
        })
      }
    } catch (err) {
      set({
        connecting: false,
        error: err instanceof Error ? err.message : 'Failed to connect with saved credentials'
      })
    }
  },

  saveCreds: async (creds: ManualCredentials) => {
    const result = await window.api.saveManualCredential(creds)
    if (result.success) {
      await get().loadSavedCredentials()
    } else {
      set({ error: result.error ?? 'Failed to save credentials' })
    }
  },

  deleteCreds: async (id: string) => {
    const result = await window.api.deleteManualCredential(id)
    if (result.success) {
      await get().loadSavedCredentials()
    } else {
      set({ error: result.error ?? 'Failed to delete credentials' })
    }
  },

  setPresignedUrlSupported: (supported: boolean) => {
    set({ presignedUrlSupported: supported })
  },

  addManualBucket: (bucketName: string, region?: string, startingPrefix?: string) => {
    const { buckets } = get()
    // Don't add if already exists with same name and prefix
    const existingIndex = buckets.findIndex((b) => b.name === bucketName && b.startingPrefix === startingPrefix)
    if (existingIndex >= 0) {
      return
    }
    const newBucket: S3Bucket = {
      name: bucketName,
      region: region,
      startingPrefix: startingPrefix
    }
    set({ buckets: [...buckets, newBucket] })
  },

  removeManualBucket: (bucketName: string) => {
    const { buckets } = get()
    set({ buckets: buckets.filter((b) => b.name !== bucketName) })
  },

  loadSftpCredentials: async () => {
    const result = await window.api.listSftpCredentials()
    if (result.success && result.data) {
      set({ sftpCredentials: result.data })
    } else {
      set({ error: result.error ?? 'Failed to load SFTP credentials' })
    }
  },

  connectSftp: async (credentialId: string) => {
    set({ connecting: true, error: null })
    try {
      const result = await window.api.sftpConnect(credentialId)
      if (result.success && result.data) {
        const { homeDir, label } = result.data
        useTabStore.getState().clearAllTabBrowserStates()
        set({
          connected: true,
          connecting: false,
          buckets: [],
          connectionInfo: {
            type: 'sftp',
            credentialId,
            label,
            region: '',
            connected: true,
            sftpHome: homeDir
          }
        })
        setTimeout(() => {
          useTabStore.getState().navigateToSftpDirectory(homeDir, label)
        }, 50)
      } else {
        set({ connecting: false, error: result.error ?? 'Failed to connect via SFTP' })
      }
    } catch (err) {
      set({
        connecting: false,
        error: err instanceof Error ? err.message : 'Failed to connect via SFTP'
      })
    }
  },

  saveSftpCredential: async (credential) => {
    const result = await window.api.saveSftpCredential(credential)
    if (result.success) {
      await get().loadSftpCredentials()
    } else {
      set({ error: result.error ?? 'Failed to save SFTP credential' })
    }
  },

  deleteSftpCredential: async (id: string) => {
    const result = await window.api.deleteSftpCredential(id)
    if (result.success) {
      await get().loadSftpCredentials()
    } else {
      set({ error: result.error ?? 'Failed to delete SFTP credential' })
    }
  }
}))
