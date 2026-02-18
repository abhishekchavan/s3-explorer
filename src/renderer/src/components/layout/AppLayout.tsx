import { useState, useCallback, useEffect, useRef } from 'react'
import { TitleBar } from './TitleBar'
import { TabBar } from '../tabs/TabBar'
import { Sidebar } from './Sidebar'
import { MainPanel } from './MainPanel'
import { StatusBar } from './StatusBar'
import { TransferDrawer } from './TransferDrawer'

const MIN_SIDEBAR_WIDTH = 180
const MAX_SIDEBAR_WIDTH = 400
const DEFAULT_SIDEBAR_WIDTH = 224

export function AppLayout(): JSX.Element {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth')
    return saved ? Math.min(Math.max(Number(saved), MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH) : DEFAULT_SIDEBAR_WIDTH
  })
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing && sidebarRef.current) {
        const newWidth = e.clientX - sidebarRef.current.getBoundingClientRect().left
        const clampedWidth = Math.min(Math.max(newWidth, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH)
        setSidebarWidth(clampedWidth)
        localStorage.setItem('sidebarWidth', String(clampedWidth))
      }
    },
    [isResizing]
  )

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize)
      window.addEventListener('mouseup', stopResizing)
    }
    return () => {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
    }
  }, [isResizing, resize, stopResizing])

  return (
    <>
      <TitleBar />
      <TabBar />
      <div className="flex-1 flex overflow-hidden">
        <div
          ref={sidebarRef}
          className="shrink-0 border-r border-border overflow-hidden relative"
          style={{ width: sidebarWidth }}
        >
          <Sidebar />
          {/* Resize handle */}
          <div
            className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors ${isResizing ? 'bg-primary/50' : ''}`}
            onMouseDown={startResizing}
          />
        </div>
        <MainPanel />
      </div>
      <TransferDrawer />
      <StatusBar />
    </>
  )
}
