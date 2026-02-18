import Store from 'electron-store'
import { safeStorage } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import type { ManualCredentials, SavedCredential } from '@shared/types'

interface StoredCredentialEntry {
  id: string
  label: string
  accessKeyId: string
  region: string
  encryptedSecretAccessKey: string
  encryptedSessionToken?: string
  defaultBucket?: string
  defaultPrefix?: string
}

interface SecureStoreSchema {
  credentials: StoredCredentialEntry[]
}

const store = new Store<SecureStoreSchema>({
  name: 's3explorer-credentials',
  defaults: {
    credentials: []
  }
})

function assertEncryptionAvailable(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure credential storage is unavailable on this system')
  }
}

function encryptValue(value: string): string {
  assertEncryptionAvailable()
  const buffer = safeStorage.encryptString(value)
  return buffer.toString('base64')
}

function decryptValue(encrypted: string): string {
  assertEncryptionAvailable()
  const buffer = Buffer.from(encrypted, 'base64')
  return safeStorage.decryptString(buffer)
}

export function listSavedCredentials(): SavedCredential[] {
  const entries = store.get('credentials', [])
  return entries.map((entry) => ({
    id: entry.id,
    label: entry.label,
    accessKeyId: entry.accessKeyId,
    region: entry.region,
    defaultBucket: entry.defaultBucket,
    defaultPrefix: entry.defaultPrefix
  }))
}

export function saveCredential(credential: ManualCredentials): SavedCredential {
  const entries = store.get('credentials', [])

  const entry: StoredCredentialEntry = {
    id: credential.id || uuidv4(),
    label: credential.label,
    accessKeyId: credential.accessKeyId,
    region: credential.region,
    encryptedSecretAccessKey: encryptValue(credential.secretAccessKey),
    encryptedSessionToken: credential.sessionToken
      ? encryptValue(credential.sessionToken)
      : undefined,
    defaultBucket: credential.defaultBucket,
    defaultPrefix: credential.defaultPrefix
  }

  // Check if updating an existing entry
  const existingIndex = entries.findIndex((e) => e.id === entry.id)
  if (existingIndex >= 0) {
    entries[existingIndex] = entry
  } else {
    entries.push(entry)
  }

  store.set('credentials', entries)

  return {
    id: entry.id,
    label: entry.label,
    accessKeyId: entry.accessKeyId,
    region: entry.region,
    defaultBucket: entry.defaultBucket,
    defaultPrefix: entry.defaultPrefix
  }
}

export function getDecryptedCredential(id: string): ManualCredentials | null {
  const entries = store.get('credentials', [])
  const entry = entries.find((e) => e.id === id)

  if (!entry) {
    return null
  }

  return {
    id: entry.id,
    label: entry.label,
    accessKeyId: entry.accessKeyId,
    secretAccessKey: decryptValue(entry.encryptedSecretAccessKey),
    sessionToken: entry.encryptedSessionToken
      ? decryptValue(entry.encryptedSessionToken)
      : undefined,
    region: entry.region,
    defaultBucket: entry.defaultBucket,
    defaultPrefix: entry.defaultPrefix
  }
}

export function deleteCredential(id: string): boolean {
  const entries = store.get('credentials', [])
  const filtered = entries.filter((e) => e.id !== id)

  if (filtered.length === entries.length) {
    return false
  }

  store.set('credentials', filtered)
  return true
}
