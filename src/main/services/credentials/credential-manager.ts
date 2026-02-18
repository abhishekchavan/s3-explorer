import { fromIni } from '@aws-sdk/credential-providers'
import type { AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { listAwsProfiles } from './aws-profile.reader'
import {
  listSavedCredentials,
  saveCredential,
  getDecryptedCredential,
  deleteCredential
} from './secure-store.service'
import type {
  AwsProfile,
  ManualCredentials,
  SavedCredential,
  ConnectionState
} from '@shared/types'

let currentConnection: ConnectionState | null = null
let currentCredentialProvider: AwsCredentialIdentityProvider | null = null

export async function getProfiles(): Promise<AwsProfile[]> {
  return listAwsProfiles()
}

export function getSavedCredentials(): SavedCredential[] {
  return listSavedCredentials()
}

export function saveManualCredential(credential: ManualCredentials): SavedCredential {
  return saveCredential(credential)
}

export function deleteManualCredential(id: string): boolean {
  return deleteCredential(id)
}

export function connectWithProfile(profileName: string, region?: string): ConnectionState {
  const provider = fromIni({ profile: profileName })

  currentCredentialProvider = provider
  currentConnection = {
    type: 'profile',
    profileName,
    label: profileName,
    region: region || 'us-east-1',
    connected: true
  }

  return currentConnection
}

export function connectWithManualCredentials(credential: ManualCredentials): ConnectionState {
  const staticCredentials = {
    accessKeyId: credential.accessKeyId,
    secretAccessKey: credential.secretAccessKey,
    ...(credential.sessionToken ? { sessionToken: credential.sessionToken } : {})
  }

  currentCredentialProvider = async () => staticCredentials
  currentConnection = {
    type: 'manual',
    credentialId: credential.id,
    label: credential.label,
    region: credential.region || 'us-east-1',
    connected: true
  }

  return currentConnection
}

export function connectWithSavedCredential(id: string): ConnectionState {
  const credential = getDecryptedCredential(id)
  if (!credential) {
    throw new Error(`Saved credential not found: ${id}`)
  }
  return connectWithManualCredentials(credential)
}

export function disconnect(): void {
  currentCredentialProvider = null
  currentConnection = null
}

export function getCredentialProvider(): AwsCredentialIdentityProvider {
  if (!currentCredentialProvider) {
    throw new Error('Not connected. Please connect to an AWS account first.')
  }
  return currentCredentialProvider
}

export function getCurrentConnection(): ConnectionState | null {
  return currentConnection
}

export function getCurrentRegion(): string {
  return currentConnection?.region || 'us-east-1'
}

export function isConnected(): boolean {
  return currentConnection !== null && currentConnection.connected
}
