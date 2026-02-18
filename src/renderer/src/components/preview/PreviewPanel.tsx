import { useEffect, useState } from 'react'
import { X, Loader2, FileWarning } from 'lucide-react'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { useUiStore } from '../../stores/ui.store'
import { useBrowserStore } from '../../stores/browser.store'
import { formatFileSize, getFileExtension, getMimeCategory } from '../../lib/utils'
import type { S3Object } from '@shared/types'

export function PreviewPanel(): JSX.Element {
  const { previewObject, togglePreview, setPreviewObject } = useUiStore()
  const { selectedKeys, objects } = useBrowserStore()

  // Auto-select first selected object for preview
  useEffect(() => {
    if (selectedKeys.size === 1) {
      const key = Array.from(selectedKeys)[0]
      const obj = objects.find((o) => o.key === key)
      if (obj && !obj.isFolder) {
        setPreviewObject(obj)
      }
    }
  }, [selectedKeys, objects, setPreviewObject])

  return (
    <div className="w-80 shrink-0 flex flex-col bg-card">
      <div className="h-8 flex items-center px-3 border-b border-border">
        <span className="text-xs font-medium truncate flex-1">
          {previewObject ? previewObject.name : 'Preview'}
        </span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={togglePreview}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {previewObject ? (
        <PreviewContent object={previewObject} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Select a file to preview
        </div>
      )}
    </div>
  )
}

function PreviewContent({ object }: { object: S3Object }): JSX.Element {
  const { currentBucket } = useBrowserStore()
  const ext = getFileExtension(object.key)
  const category = getMimeCategory(ext)
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setContent(null)
    setError(null)

    if (!currentBucket) return

    if (category === 'image') {
      setLoading(true)
      window.api
        .getPresignedUrl({ bucket: currentBucket, key: object.key, expiresIn: 300 })
        .then((res) => {
          if (res.success && res.data) setContent(res.data)
          else setError(res.error || 'Failed to generate preview URL')
        })
        .finally(() => setLoading(false))
    } else if (category === 'text' || category === 'json' || category === 'csv') {
      setLoading(true)
      window.api
        .getObjectContent({ bucket: currentBucket, key: object.key, maxBytes: 1024 * 1024 })
        .then((res) => {
          if (res.success && res.data) setContent(res.data)
          else setError(res.error || 'Failed to load content')
        })
        .finally(() => setLoading(false))
    }
  }, [object.key, currentBucket, category])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4">
        <FileWarning className="h-8 w-8 text-muted-foreground" />
        <p className="text-xs text-destructive text-center">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Metadata */}
      <div className="px-3 py-2 border-b border-border space-y-1">
        <MetaRow label="Size" value={formatFileSize(object.size)} />
        {object.lastModified && <MetaRow label="Modified" value={new Date(object.lastModified).toLocaleString()} />}
        {object.storageClass && <MetaRow label="Class" value={object.storageClass} />}
      </div>

      {/* Preview content */}
      <div className="flex-1 overflow-hidden">
        {category === 'image' && content && <ImagePreview url={content} />}
        {category === 'text' && content && <TextPreview text={content} />}
        {category === 'json' && content && <JsonPreview text={content} />}
        {category === 'csv' && content && <CsvPreview text={content} />}
        {category === 'other' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4">
            <FileWarning className="h-8 w-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Preview not available for this file type</p>
          </div>
        )}
      </div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function ImagePreview({ url }: { url: string }): JSX.Element {
  return (
    <div className="flex items-center justify-center p-4 h-full">
      <img
        src={url}
        alt="Preview"
        className="max-w-full max-h-full object-contain rounded"
        onError={(e) => {
          ;(e.target as HTMLImageElement).style.display = 'none'
        }}
      />
    </div>
  )
}

function TextPreview({ text }: { text: string }): JSX.Element {
  return (
    <ScrollArea className="h-full">
      <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all select-text">{text}</pre>
    </ScrollArea>
  )
}

function JsonPreview({ text }: { text: string }): JSX.Element {
  let formatted: string
  try {
    formatted = JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    formatted = text
  }

  return (
    <ScrollArea className="h-full">
      <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all select-text">{formatted}</pre>
    </ScrollArea>
  )
}

function CsvPreview({ text }: { text: string }): JSX.Element {
  const lines = text.split('\n').slice(0, 101)
  const rows = lines.map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')))
  const headers = rows[0] || []
  const data = rows.slice(1)

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        <table className="w-full text-xs">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-2 py-1 text-left font-medium text-muted-foreground border-b border-border">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => (
              <tr key={ri} className="hover:bg-accent/30">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-2 py-0.5 truncate max-w-[120px]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {lines.length > 100 && (
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Showing first 100 rows
          </p>
        )}
      </div>
    </ScrollArea>
  )
}
