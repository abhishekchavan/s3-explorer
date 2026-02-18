import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { parse } from 'ini'
import type { AwsProfile } from '@shared/types'

const credentialsPath = join(homedir(), '.aws', 'credentials')
const configPath = join(homedir(), '.aws', 'config')

interface IniSection {
  aws_access_key_id?: string
  aws_secret_access_key?: string
  region?: string
  sso_start_url?: string
  sso_account_id?: string
  sso_role_name?: string
  sso_region?: string
  source_profile?: string
  role_arn?: string
  [key: string]: string | undefined
}

type IniData = Record<string, IniSection>

async function readIniFile(filePath: string): Promise<IniData> {
  if (!existsSync(filePath)) {
    return {}
  }
  try {
    const content = await readFile(filePath, 'utf-8')
    return parse(content) as IniData
  } catch {
    return {}
  }
}

function isSsoProfile(section: IniSection): boolean {
  return !!(section.sso_start_url || section.sso_account_id || section.sso_role_name)
}

export async function listAwsProfiles(): Promise<AwsProfile[]> {
  // Mac App Store sandboxed builds cannot read ~/.aws files directly.
  if (process.mas) {
    return []
  }

  const [credentialsData, configData] = await Promise.all([
    readIniFile(credentialsPath),
    readIniFile(configPath)
  ])

  const profileMap = new Map<string, AwsProfile>()

  // Parse credentials file - sections are named directly (e.g., [default], [myprofile])
  for (const [sectionName, section] of Object.entries(credentialsData)) {
    if (section.aws_access_key_id) {
      profileMap.set(sectionName, {
        name: sectionName,
        accessKeyId: section.aws_access_key_id,
        region: section.region,
        source: 'credentials'
      })
    }
  }

  // Parse config file - sections are named [profile myprofile] except [default]
  for (const [rawSectionName, section] of Object.entries(configData)) {
    const profileName = rawSectionName.startsWith('profile ')
      ? rawSectionName.slice('profile '.length)
      : rawSectionName

    const existing = profileMap.get(profileName)

    if (isSsoProfile(section)) {
      // SSO profile - override or add
      profileMap.set(profileName, {
        name: profileName,
        region: section.region || section.sso_region || existing?.region,
        source: 'sso'
      })
    } else if (existing) {
      // Merge region from config into existing credentials profile
      if (section.region && !existing.region) {
        existing.region = section.region
      }
    } else if (section.role_arn || section.source_profile) {
      // Assume-role profile defined only in config
      profileMap.set(profileName, {
        name: profileName,
        region: section.region,
        source: 'config'
      })
    }
  }

  // Sort alphabetically but put 'default' first
  const profiles = Array.from(profileMap.values())
  profiles.sort((a, b) => {
    if (a.name === 'default') return -1
    if (b.name === 'default') return 1
    return a.name.localeCompare(b.name)
  })

  return profiles
}
