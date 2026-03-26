import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { SftpCredential } from '@shared/types'

const credentialsFilePath = (): string =>
  path.join(app.getPath('userData'), 'sftp-credentials.json')

function readAll(): SftpCredential[] {
  const filePath = credentialsFilePath()
  if (!fs.existsSync(filePath)) return []
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as SftpCredential[]
  } catch {
    return []
  }
}

function writeAll(credentials: SftpCredential[]): void {
  fs.writeFileSync(credentialsFilePath(), JSON.stringify(credentials, null, 2), 'utf-8')
}

export function listSftpCredentials(): SftpCredential[] {
  return readAll()
}

export function saveSftpCredential(
  credential: Omit<SftpCredential, 'id' | 'createdAt'>
): SftpCredential {
  const all = readAll()
  const saved: SftpCredential = {
    ...credential,
    id: uuidv4(),
    createdAt: Date.now()
  }
  all.push(saved)
  writeAll(all)
  return saved
}

export function deleteSftpCredential(id: string): void {
  const all = readAll().filter((c) => c.id !== id)
  writeAll(all)
}

export function getSftpCredential(id: string): SftpCredential | undefined {
  return readAll().find((c) => c.id === id)
}
