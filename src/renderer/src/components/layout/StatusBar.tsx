import { useConnectionStore } from '../../stores/connection.store'
import { useBrowserStore } from '../../stores/browser.store'
import { useTransferStore } from '../../stores/transfer.store'
import { formatFileSize } from '../../lib/utils'

export function StatusBar(): JSX.Element {
  const { connected, connectionInfo } = useConnectionStore()
  const { objects, selectedKeys, currentBucket } = useBrowserStore()
  const { transfers } = useTransferStore()

  const activeTransfers = transfers.filter((t) => t.status === 'active' || t.status === 'queued')
  const selectedObjects = objects.filter((o) => selectedKeys.has(o.key))
  const totalSelectedSize = selectedObjects.reduce((sum, o) => sum + o.size, 0)

  return (
    <div className="h-6 flex items-center px-3 text-xs text-muted-foreground border-t border-border bg-card shrink-0 gap-4">
      {connected && connectionInfo ? (
        <>
          <span>{connectionInfo.label}</span>
          <span>{connectionInfo.region}</span>
          {currentBucket && (
            <>
              <span>{objects.length} objects</span>
              {selectedKeys.size > 0 && (
                <span>
                  {selectedKeys.size} selected ({formatFileSize(totalSelectedSize)})
                </span>
              )}
            </>
          )}
          {activeTransfers.length > 0 && (
            <span className="ml-auto">
              {activeTransfers.length} transfer{activeTransfers.length !== 1 ? 's' : ''} in progress
            </span>
          )}
        </>
      ) : (
        <span>Not connected</span>
      )}
    </div>
  )
}
