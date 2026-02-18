import { useEffect } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { ConnectionDialog } from './components/connection/ConnectionDialog'
import { NewFolderDialog } from './components/shared/NewFolderDialog'
import { DeleteConfirmDialog } from './components/shared/DeleteConfirmDialog'
import { Toaster } from './components/ui/toaster'
import { TooltipProvider } from './components/ui/tooltip'
import { useConnectionStore } from './stores/connection.store'
import { useTransferStore } from './stores/transfer.store'
import { useUiStore } from './stores/ui.store'
import { useThemeStore } from './stores/theme.store'
import { useTabStore } from './stores/tab.store'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

export default function App(): JSX.Element {
  const { connected } = useConnectionStore()
  const { showConnectionDialog, toggleConnectionDialog } = useUiStore()
  const initTransferListeners = useTransferStore((s) => s.initTransferListeners)

  useKeyboardShortcuts()

  useEffect(() => {
    useThemeStore.getState().initTheme()
    useTabStore.getState().initFromStorage()
  }, [])

  useEffect(() => {
    const cleanup = initTransferListeners()
    return cleanup
  }, [initTransferListeners])

  useEffect(() => {
    if (!connected) {
      toggleConnectionDialog()
    }
  }, [])

  return (
    <TooltipProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden">
        <AppLayout />
        <ConnectionDialog open={showConnectionDialog} onOpenChange={toggleConnectionDialog} />
        <NewFolderDialog />
        <DeleteConfirmDialog />
        <Toaster />
      </div>
    </TooltipProvider>
  )
}
