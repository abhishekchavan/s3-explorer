import { Plus, RefreshCw, Upload, Download, Trash2, Eye, Database } from 'lucide-react'
import { Button } from '../ui/button'
import { ThemeToggle } from './ThemeToggle'
import { useUiStore } from '../../stores/ui.store'
import { useConnectionStore } from '../../stores/connection.store'
import { useBrowserStore } from '../../stores/browser.store'
import { useTransferStore } from '../../stores/transfer.store'

export function TitleBar(): JSX.Element {
  const { connected, connectionInfo } = useConnectionStore()
  const { currentBucket } = useBrowserStore()
  const { toggleConnectionDialog, togglePreview, showPreview } = useUiStore()

  return (
    <div className="titlebar-drag h-12 flex items-center px-20 border-b border-border bg-card shrink-0">
      <div className="titlebar-no-drag flex items-center gap-1 mr-4">
        <ToolbarActions />
      </div>
      <div className="flex-1 text-center">
        {connected && connectionInfo ? (
          <span className="text-sm font-medium text-muted-foreground">
            {connectionInfo.label} — {currentBucket || 'Select a bucket'}
          </span>
        ) : (
          <span className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-primary" />
            <span>
              S3 <span className="text-primary">Browser Downloader</span>
            </span>
          </span>
        )}
      </div>
      <div className="titlebar-no-drag flex items-center gap-1">
        <ThemeToggle />
        {connected && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={togglePreview}>
            <Eye className={`h-4 w-4 ${showPreview ? 'text-primary' : ''}`} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={toggleConnectionDialog}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function ToolbarActions(): JSX.Element {
  const { connected } = useConnectionStore()
  const { currentBucket, refresh, selectedKeys } = useBrowserStore()
  const { showNewFolder, showDeleteConfirmDialog } = useUiStore()

  const handleUpload = async (): Promise<void> => {
    const result = await window.api.selectFiles()
    if (result.success && result.data && result.data.length > 0) {
      const { currentBucket, currentPrefix } = useBrowserStore.getState()
      if (currentBucket) {
        useTransferStore.getState().upload(currentBucket, currentPrefix, result.data)
      }
    }
  }

  const handleDownload = async (): Promise<void> => {
    const { currentBucket, selectedKeys } = useBrowserStore.getState()
    if (!currentBucket || selectedKeys.size === 0) return
    const result = await window.api.selectDownloadDirectory()
    if (result.success && result.data) {
      useTransferStore.getState().download(currentBucket, Array.from(selectedKeys), result.data)
    }
  }

  if (!connected || !currentBucket) return <></>

  return (
    <>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={refresh} title="Refresh">
        <RefreshCw className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleUpload} title="Upload files">
        <Upload className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleDownload}
        disabled={selectedKeys.size === 0}
        title="Download selected"
      >
        <Download className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={showNewFolder} title="New folder">
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => showDeleteConfirmDialog(Array.from(selectedKeys))}
        disabled={selectedKeys.size === 0}
        title="Delete selected"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  )
}
