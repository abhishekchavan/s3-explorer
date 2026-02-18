import { X, Plus, Folder, Database } from 'lucide-react'
import { useTabStore } from '../../stores/tab.store'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { cn } from '@renderer/lib/utils'

export function TabBar(): JSX.Element {
  const { tabs, activeTabId, maxTabs, createTab, closeTab, switchTab } = useTabStore()

  const canAddTab = tabs.length < maxTabs
  const canCloseTab = tabs.length > 1

  const handleAddTab = (): void => {
    createTab()
  }

  const handleCloseTab = (e: React.MouseEvent, tabId: string): void => {
    e.stopPropagation()
    closeTab(tabId)
  }

  const handleMiddleClick = (e: React.MouseEvent, tabId: string): void => {
    if (e.button === 1 && canCloseTab) {
      e.preventDefault()
      closeTab(tabId)
    }
  }

  return (
    <div className="flex items-center h-9 bg-muted/50 border-b border-border px-1 gap-0.5 shrink-0">
      <div className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          const hasBucket = tab.browserState.currentBucket !== null

          return (
            <Tooltip key={tab.id}>
              <TooltipTrigger asChild>
                <div
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    'group flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer transition-colors max-w-[180px] min-w-[100px]',
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                  )}
                  onClick={() => switchTab(tab.id)}
                  onMouseDown={(e) => handleMiddleClick(e, tab.id)}
                >
                  {hasBucket ? (
                    tab.browserState.currentPrefix ? (
                      <Folder className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Database className="h-3.5 w-3.5 shrink-0" />
                    )
                  ) : (
                    <Database className="h-3.5 w-3.5 shrink-0 opacity-50" />
                  )}
                  <span className="text-xs font-medium truncate flex-1">{tab.title}</span>
                  {canCloseTab && (
                    <button
                      className={cn(
                        'h-4 w-4 rounded-sm flex items-center justify-center shrink-0 transition-colors',
                        isActive
                          ? 'opacity-60 hover:opacity-100 hover:bg-muted'
                          : 'opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-muted'
                      )}
                      onClick={(e) => handleCloseTab(e, tab.id)}
                      aria-label="Close tab"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[300px]">
                <p className="font-medium">{tab.title}</p>
                {hasBucket && (
                  <p className="text-xs opacity-80">
                    s3://{tab.browserState.currentBucket}
                    {tab.browserState.currentPrefix && `/${tab.browserState.currentPrefix}`}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={handleAddTab}
            disabled={!canAddTab}
            aria-label="New tab"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {canAddTab ? 'New tab' : `Maximum ${maxTabs} tabs reached`}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
