import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '../ui/context-menu'
import {
  Download,
  Trash2,
  Copy,
  Link,
  Eye,
  Star,
  FolderOpen,
  SquarePlus
} from 'lucide-react'
import { useBrowserStore } from '../../stores/browser.store'
import { useTabStore } from '../../stores/tab.store'
import { useTransferStore } from '../../stores/transfer.store'
import { useBookmarkStore } from '../../stores/bookmark.store'
import { useConnectionStore } from '../../stores/connection.store'
import { useUiStore } from '../../stores/ui.store'
import { toast } from '../ui/use-toast'
import type { S3Object } from '@shared/types'

interface ObjectContextMenuProps {
  object: S3Object
  children: React.ReactNode
}

export function ObjectContextMenu({ object, children }: ObjectContextMenuProps): JSX.Element {
  const { currentBucket, navigateToPrefix, selectedKeys } = useBrowserStore()
  const { createTab, tabs, maxTabs } = useTabStore()
  const { download } = useTransferStore()
  const { add: addBookmark } = useBookmarkStore()
  const { connectionInfo, presignedUrlSupported, setPresignedUrlSupported } = useConnectionStore()
  const { setPreviewObject, showDeleteConfirmDialog } = useUiStore()

  const canOpenInNewTab = tabs.length < maxTabs

  const handleDownload = async (): Promise<void> => {
    if (!currentBucket) return
    const result = await window.api.selectDownloadDirectory()
    if (result.success && result.data) {
      const keys = selectedKeys.has(object.key) ? Array.from(selectedKeys) : [object.key]
      download(currentBucket, keys, result.data)
    }
  }

  const handlePreview = (): void => {
    setPreviewObject(object)
  }

  const handleDelete = (): void => {
    const keys = selectedKeys.has(object.key) ? Array.from(selectedKeys) : [object.key]
    showDeleteConfirmDialog(keys)
  }

  const handleBookmark = (): void => {
    if (!currentBucket || !connectionInfo) return
    const prefix = object.isFolder ? object.key : ''
    addBookmark(object.name, currentBucket, prefix, connectionInfo.label)
  }

  const handleCopyPath = (): void => {
    navigator.clipboard.writeText(`s3://${currentBucket}/${object.key}`)
  }

  const handleOpenInNewTab = (): void => {
    if (!currentBucket || !object.isFolder || !canOpenInNewTab) return
    const tabId = createTab(currentBucket, object.key)
    if (tabId) {
      // Load the folder contents in the new tab
      useTabStore.getState().navigateToPrefix(object.key)
    }
  }

  const handleCopyPresignedUrl = async (): Promise<void> => {
    if (!currentBucket || object.isFolder || !presignedUrlSupported) return
    const result = await window.api.getPresignedUrl({
      bucket: currentBucket,
      key: object.key,
      expiresIn: 900
    })
    if (result.success && result.data) {
      await navigator.clipboard.writeText(result.data)
      toast({
        title: 'URL copied',
        description: 'Download URL valid for 15 minutes'
      })
    } else {
      const errorMsg = result.error || 'Unknown error'
      // Check if it's an access denied error
      if (errorMsg.toLowerCase().includes('access denied') ||
          errorMsg.toLowerCase().includes('forbidden') ||
          errorMsg.toLowerCase().includes('not authorized')) {
        setPresignedUrlSupported(false)
      }
      toast({
        title: 'Failed to generate URL',
        description: errorMsg,
        variant: 'destructive'
      })
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {object.isFolder ? (
          <>
            <ContextMenuItem onClick={() => navigateToPrefix(object.key)}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Open
            </ContextMenuItem>
            <ContextMenuItem
              onClick={handleOpenInNewTab}
              disabled={!canOpenInNewTab}
              className={!canOpenInNewTab ? 'opacity-50' : ''}
            >
              <SquarePlus className="h-4 w-4 mr-2" />
              Open in New Tab
            </ContextMenuItem>
          </>
        ) : (
          <ContextMenuItem onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleCopyPath}>
          <Copy className="h-4 w-4 mr-2" />
          Copy S3 Path
        </ContextMenuItem>
        {!object.isFolder && (
          <ContextMenuItem
            onClick={handleCopyPresignedUrl}
            disabled={!presignedUrlSupported}
            className={!presignedUrlSupported ? 'opacity-50 cursor-not-allowed' : ''}
          >
            <Link className="h-4 w-4 mr-2" />
            {presignedUrlSupported ? 'Copy Download URL (15 min)' : 'Download URL (No Access)'}
          </ContextMenuItem>
        )}
        {object.isFolder && (
          <ContextMenuItem onClick={handleBookmark}>
            <Star className="h-4 w-4 mr-2" />
            Bookmark
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
