import { ChevronUp, ChevronDown, X, Pause, Play, RotateCcw, Trash2, FolderOpen } from 'lucide-react'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { ScrollArea } from '../ui/scroll-area'
import { useTransferStore } from '../../stores/transfer.store'
import { formatFileSize } from '../../lib/utils'
import { cn } from '../../lib/utils'
import type { TransferItem } from '@shared/types'

export function TransferDrawer(): JSX.Element {
  const { transfers, showDrawer, toggleDrawer, clearCompleted } = useTransferStore()

  const activeCount = transfers.filter(
    (t) => t.status === 'active' || t.status === 'queued'
  ).length
  const hasCompleted = transfers.some(
    (t) => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
  )

  if (transfers.length === 0) return <></>

  return (
    <div className={cn('border-t border-border bg-card shrink-0 transition-all', showDrawer ? 'h-56' : 'h-8')}>
      <div
        className="h-8 flex items-center px-3 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={toggleDrawer}
      >
        <span className="text-xs font-medium">
          Transfers ({activeCount} active, {transfers.length} total)
        </span>
        <div className="ml-auto flex items-center gap-1">
          {hasCompleted && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation()
                clearCompleted()
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          {showDrawer ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </div>
      </div>
      {showDrawer && (
        <ScrollArea className="h-48">
          <div className="px-3 pb-2 space-y-1">
            {transfers.map((transfer) => (
              <TransferItemRow key={transfer.id} item={transfer} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

function TransferItemRow({ item }: { item: TransferItem }): JSX.Element {
  const { pause, resume, cancel, retry } = useTransferStore()
  const progress = item.size > 0 ? (item.bytesTransferred / item.size) * 100 : 0

  return (
    <div className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-accent/30">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium truncate">{item.fileName}</span>
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
              item.status === 'active' && 'bg-blue-500/20 text-blue-400',
              item.status === 'completed' && 'bg-green-500/20 text-green-400',
              item.status === 'failed' && 'bg-red-500/20 text-red-400',
              item.status === 'paused' && 'bg-yellow-500/20 text-yellow-400',
              item.status === 'queued' && 'bg-muted text-muted-foreground',
              item.status === 'cancelled' && 'bg-muted text-muted-foreground'
            )}
          >
            {item.status}
          </span>
        </div>
        {item.status === 'active' && (
          <div className="flex items-center gap-2 mt-1">
            <Progress value={progress} className="h-1 flex-1" />
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatFileSize(item.bytesTransferred)} / {formatFileSize(item.size)}
            </span>
          </div>
        )}
        {item.error && <p className="text-[10px] text-destructive mt-0.5">{item.error}</p>}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {item.status === 'completed' && item.type === 'download' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => window.api.showInFinder(item.localPath)}
            title="Show in Finder"
          >
            <FolderOpen className="h-3 w-3" />
          </Button>
        )}
        {item.status === 'active' && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => pause(item.id)}>
            <Pause className="h-3 w-3" />
          </Button>
        )}
        {item.status === 'paused' && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => resume(item.id)}>
            <Play className="h-3 w-3" />
          </Button>
        )}
        {item.status === 'failed' && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => retry(item.id)}>
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
        {(item.status === 'active' || item.status === 'queued' || item.status === 'paused') && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => cancel(item.id)}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
