import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog'
import { Button } from '../ui/button'
import { useUiStore } from '../../stores/ui.store'
import { useBrowserStore } from '../../stores/browser.store'
import { Loader2 } from 'lucide-react'

export function DeleteConfirmDialog(): JSX.Element {
  const { showDeleteConfirm, deleteTargetKeys, hideDialogs } = useUiStore()
  const { currentBucket, refresh, clearSelection } = useBrowserStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hasFolder = deleteTargetKeys.some((k) => k.endsWith('/'))

  const handleDelete = async (): Promise<void> => {
    if (!currentBucket || deleteTargetKeys.length === 0) return

    setLoading(true)
    setError('')

    const result = await window.api.deleteObjects({
      bucket: currentBucket,
      keys: deleteTargetKeys,
      recursive: hasFolder
    })

    if (result.success) {
      hideDialogs()
      clearSelection()
      refresh()
    } else {
      setError(result.error || 'Failed to delete objects')
    }
    setLoading(false)
  }

  return (
    <Dialog open={showDeleteConfirm} onOpenChange={() => { setError(''); hideDialogs() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {deleteTargetKeys.length} item
            {deleteTargetKeys.length !== 1 ? 's' : ''}?
            {hasFolder && ' Folders will be deleted recursively.'}
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => { setError(''); hideDialogs() }}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
