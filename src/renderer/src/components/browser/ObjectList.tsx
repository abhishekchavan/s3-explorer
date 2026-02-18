import { useCallback, useRef, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Folder,
  File,
  FileImage,
  FileText,
  FileCode,
  FileJson,
  FileSpreadsheet,
  FileArchive,
  ArrowUp,
  ArrowDown,
  Loader2
} from 'lucide-react'
import { useBrowserStore } from '../../stores/browser.store'
import { useSearchStore } from '../../stores/search.store'
import { useUiStore } from '../../stores/ui.store'
import { useDragDrop } from '../../hooks/useDragDrop'
import { ObjectContextMenu } from './ObjectContextMenu'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { cn, formatFileSize, formatRelativeTime, formatFullDateTime, getFileExtension, getMimeCategory } from '../../lib/utils'
import type { S3Object } from '@shared/types'

export function ObjectList(): JSX.Element {
  const {
    objects,
    loading,
    selectedKeys,
    sortField,
    sortDirection,
    currentPrefix,
    isTruncated,
    selectKey,
    toggleSelect,
    selectRange,
    setSort,
    navigateToPrefix,
    navigateUp,
    loadMore
  } = useBrowserStore()
  const { query, mode, searchResults } = useSearchStore()
  const { setPreviewObject } = useUiStore()

  const parentRef = useRef<HTMLDivElement>(null)

  const displayObjects = useMemo(() => {
    if (mode === 'search' && query) return searchResults
    if (mode === 'filter' && query) {
      return objects.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
    }
    return objects
  }, [objects, searchResults, query, mode])

  const virtualizer = useVirtualizer({
    count: displayObjects.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 20
  })

  const { dropZoneProps, isOver } = useDragDrop()

  const handleClick = useCallback(
    (e: React.MouseEvent, obj: S3Object) => {
      if (e.shiftKey) {
        selectRange(obj.key)
      } else if (e.metaKey || e.ctrlKey) {
        toggleSelect(obj.key)
      } else {
        selectKey(obj.key)
      }
    },
    [selectKey, toggleSelect, selectRange]
  )

  const handleDoubleClick = useCallback(
    (obj: S3Object) => {
      if (obj.isFolder) {
        navigateToPrefix(obj.key)
      } else {
        setPreviewObject(obj)
      }
    },
    [navigateToPrefix, setPreviewObject]
  )

  const handleSort = (field: 'name' | 'size' | 'lastModified'): void => {
    if (sortField === field) {
      setSort(field, sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSort(field, 'asc')
    }
  }

  const SortIcon = ({ field }: { field: string }): JSX.Element | null => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 ml-0.5" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-0.5" />
    )
  }

  if (loading && objects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative" {...dropZoneProps}>
      {isOver && (
        <div className="absolute inset-0 z-50 drop-zone-active flex items-center justify-center pointer-events-none">
          <p className="text-sm font-medium text-primary">Drop files to upload</p>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center h-7 px-3 text-[11px] font-medium text-muted-foreground border-b border-border bg-muted/30 shrink-0">
        <button className="flex items-center flex-1 min-w-0" onClick={() => handleSort('name')}>
          Name <SortIcon field="name" />
        </button>
        <button className="flex items-center w-24 shrink-0 justify-end" onClick={() => handleSort('size')}>
          Size <SortIcon field="size" />
        </button>
        <button
          className="flex items-center w-36 shrink-0 justify-end"
          onClick={() => handleSort('lastModified')}
        >
          Modified <SortIcon field="lastModified" />
        </button>
        <div className="w-24 shrink-0 text-right">Class</div>
      </div>

      {/* Back row */}
      {currentPrefix && (
        <button
          className="flex items-center h-8 px-3 text-sm hover:bg-accent/50 border-b border-border/50"
          onClick={navigateUp}
        >
          <Folder className="h-4 w-4 mr-2 text-muted-foreground" />
          <span className="text-muted-foreground">..</span>
        </button>
      )}

      {/* Virtualized list */}
      <div ref={parentRef} className="flex-1 overflow-auto relative">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const obj = displayObjects[virtualRow.index]
            const isSelected = selectedKeys.has(obj.key)
            const ext = getFileExtension(obj.key)

            return (
              <ObjectContextMenu key={obj.key} object={obj}>
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                  className={cn(
                    'flex items-center px-3 text-sm cursor-default hover:bg-accent/50 transition-colors',
                    isSelected && 'bg-primary/10 hover:bg-primary/15'
                  )}
                  onClick={(e) => handleClick(e, obj)}
                  onDoubleClick={() => handleDoubleClick(obj)}
                  draggable={!obj.isFolder}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', obj.key)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                >
                  <div className="flex items-center flex-1 min-w-0 gap-2">
                    <FileIcon extension={ext} isFolder={obj.isFolder} />
                    <span className="truncate">{obj.name}</span>
                  </div>
                  <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                    {obj.isFolder ? '-' : formatFileSize(obj.size)}
                  </span>
                  <span className="w-36 shrink-0 text-right text-xs text-muted-foreground">
                    {obj.lastModified ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">{formatRelativeTime(obj.lastModified)}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {formatFullDateTime(obj.lastModified)}
                        </TooltipContent>
                      </Tooltip>
                    ) : '-'}
                  </span>
                  <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                    {obj.storageClass || '-'}
                  </span>
                </div>
              </ObjectContextMenu>
            )
          })}
        </div>

        {isTruncated && (
          <div className="flex items-center justify-center py-3">
            <button
              className="text-xs text-primary hover:underline"
              onClick={loadMore}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Load more objects...'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function FileIcon({ extension, isFolder }: { extension: string; isFolder: boolean }): JSX.Element {
  const className = 'h-4 w-4 shrink-0'

  if (isFolder) return <Folder className={cn(className, 'text-blue-400')} />

  const category = getMimeCategory(extension)
  switch (category) {
    case 'image':
      return <FileImage className={cn(className, 'text-purple-400')} />
    case 'text':
      return <FileText className={cn(className, 'text-gray-400')} />
    case 'json':
      return <FileJson className={cn(className, 'text-yellow-400')} />
    case 'csv':
      return <FileSpreadsheet className={cn(className, 'text-green-400')} />
    default:
      if (['zip', 'gz', 'tar', 'rar', '7z'].includes(extension)) {
        return <FileArchive className={cn(className, 'text-orange-400')} />
      }
      if (['js', 'ts', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp'].includes(extension)) {
        return <FileCode className={cn(className, 'text-cyan-400')} />
      }
      return <File className={cn(className, 'text-muted-foreground')} />
  }
}
