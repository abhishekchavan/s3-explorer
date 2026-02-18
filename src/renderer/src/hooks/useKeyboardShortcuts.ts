import { useEffect } from 'react'
import { useBrowserStore } from '../stores/browser.store'
import { useUiStore } from '../stores/ui.store'
import { useTabStore } from '../stores/tab.store'

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const meta = e.metaKey || e.ctrlKey

      // Cmd+T - New tab
      if (meta && e.key === 't' && !e.shiftKey) {
        e.preventDefault()
        useTabStore.getState().createTab()
        return
      }

      // Cmd+W - Close tab
      if (meta && e.key === 'w' && !e.shiftKey) {
        e.preventDefault()
        const { tabs, activeTabId, closeTab } = useTabStore.getState()
        if (tabs.length > 1 && activeTabId) {
          closeTab(activeTabId)
        }
        return
      }

      // Cmd+Shift+[ - Previous tab
      if (meta && e.shiftKey && e.key === '[') {
        e.preventDefault()
        useTabStore.getState().previousTab()
        return
      }

      // Cmd+Shift+] - Next tab
      if (meta && e.shiftKey && e.key === ']') {
        e.preventDefault()
        useTabStore.getState().nextTab()
        return
      }

      // Cmd+N - Connect
      if (meta && e.key === 'n' && !e.shiftKey) {
        e.preventDefault()
        useUiStore.getState().toggleConnectionDialog()
        return
      }

      // Cmd+Shift+N - New folder
      if (meta && e.key === 'N' && e.shiftKey) {
        e.preventDefault()
        useUiStore.getState().showNewFolder()
        return
      }

      // Cmd+R - Refresh
      if (meta && e.key === 'r') {
        e.preventDefault()
        useBrowserStore.getState().refresh()
        return
      }

      // Cmd+F - Focus search
      if (meta && e.key === 'f') {
        e.preventDefault()
        const input = document.querySelector<HTMLInputElement>('[placeholder*="Filter"], [placeholder*="Search"]')
        input?.focus()
        return
      }

      // Cmd+A - Select all
      if (meta && e.key === 'a') {
        const active = document.activeElement
        if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return
        e.preventDefault()
        useBrowserStore.getState().selectAll()
        return
      }

      // Cmd+Backspace - Delete selected
      if (meta && e.key === 'Backspace') {
        e.preventDefault()
        const { selectedKeys } = useBrowserStore.getState()
        if (selectedKeys.size > 0) {
          useUiStore.getState().showDeleteConfirmDialog(Array.from(selectedKeys))
        }
        return
      }

      // Escape - Clear selection / close dialogs
      if (e.key === 'Escape') {
        useBrowserStore.getState().clearSelection()
        useUiStore.getState().hideDialogs()
        return
      }

      // Space - Toggle preview
      if (e.key === ' ') {
        const active = document.activeElement
        if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA' || active?.tagName === 'BUTTON') return
        e.preventDefault()
        useUiStore.getState().togglePreview()
        return
      }

      // Enter - Open folder / preview file
      if (e.key === 'Enter') {
        const active = document.activeElement
        if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA' || active?.tagName === 'BUTTON') return
        e.preventDefault()
        const { selectedKeys, objects, navigateToPrefix } = useBrowserStore.getState()
        if (selectedKeys.size === 1) {
          const key = Array.from(selectedKeys)[0]
          const obj = objects.find((o) => o.key === key)
          if (obj?.isFolder) {
            navigateToPrefix(obj.key)
          } else if (obj) {
            useUiStore.getState().setPreviewObject(obj)
            if (!useUiStore.getState().showPreview) useUiStore.getState().togglePreview()
          }
        }
        return
      }

      // Backspace - Navigate up
      if (e.key === 'Backspace' && !meta) {
        const active = document.activeElement
        if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return
        e.preventDefault()
        useBrowserStore.getState().navigateUp()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
