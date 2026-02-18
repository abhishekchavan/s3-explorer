import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { useUiStore } from '../../stores/ui.store'
import { useBrowserStore } from '../../stores/browser.store'
import { Loader2 } from 'lucide-react'

export function NewFolderDialog(): JSX.Element {
  const { showNewFolderDialog, hideDialogs } = useUiStore()
  const { currentBucket, currentPrefix, refresh } = useBrowserStore()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (): Promise<void> => {
    if (!name.trim() || !currentBucket) return

    setLoading(true)
    setError('')

    const key = `${currentPrefix}${name.trim()}/`
    const result = await window.api.createFolder({ bucket: currentBucket, key })

    if (result.success) {
      setName('')
      hideDialogs()
      refresh()
    } else {
      setError(result.error || 'Failed to create folder')
    }
    setLoading(false)
  }

  return (
    <Dialog open={showNewFolderDialog} onOpenChange={() => { setName(''); setError(''); hideDialogs() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Folder</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setName(''); setError(''); hideDialogs() }}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
