export interface AwsProfile {
  name: string
  accessKeyId?: string
  region?: string
  source: 'credentials' | 'config' | 'sso'
}

export interface ManualCredentials {
  id: string
  label: string
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
  region: string
  defaultBucket?: string
  defaultPrefix?: string
}

export interface SavedCredential {
  id: string
  label: string
  accessKeyId: string
  region: string
  defaultBucket?: string
  defaultPrefix?: string
}

export interface ConnectionState {
  type: 'profile' | 'manual' | 'sftp'
  profileName?: string
  credentialId?: string
  label: string
  region: string
  connected: boolean
  sftpHome?: string
}
