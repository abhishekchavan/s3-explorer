import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return date.toLocaleDateString()
}

export function formatFullDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export function getFileExtension(key: string): string {
  const parts = key.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

export function getFileName(key: string): string {
  if (key.endsWith('/')) {
    const parts = key.slice(0, -1).split('/')
    return parts[parts.length - 1] + '/'
  }
  const parts = key.split('/')
  return parts[parts.length - 1]
}

export function getParentPrefix(prefix: string): string {
  if (!prefix || prefix === '/') return ''
  const trimmed = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
  const lastSlash = trimmed.lastIndexOf('/')
  return lastSlash >= 0 ? trimmed.substring(0, lastSlash + 1) : ''
}

export function getMimeCategory(extension: string): 'image' | 'text' | 'json' | 'csv' | 'other' {
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']
  const textExts = ['txt', 'md', 'log', 'yml', 'yaml', 'xml', 'html', 'css', 'js', 'ts', 'tsx', 'jsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'sh', 'bash', 'zsh', 'env', 'conf', 'cfg', 'ini', 'toml']
  const jsonExts = ['json', 'jsonl', 'geojson']
  const csvExts = ['csv', 'tsv']

  if (imageExts.includes(extension)) return 'image'
  if (textExts.includes(extension)) return 'text'
  if (jsonExts.includes(extension)) return 'json'
  if (csvExts.includes(extension)) return 'csv'
  return 'other'
}
