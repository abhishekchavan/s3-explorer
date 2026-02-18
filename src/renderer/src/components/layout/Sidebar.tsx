import { useState, useEffect, useRef } from 'react'
import {
  Database,
  Star,
  Search,
  X,
  BookmarkIcon,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Plus,
  AlertCircle,
  KeyRound,
  Loader2,
  FolderOpen
} from 'lucide-react'
import { ScrollArea } from '../ui/scroll-area'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '../ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useConnectionStore } from '../../stores/connection.store'
import { useBrowserStore } from '../../stores/browser.store'
import { useBookmarkStore } from '../../stores/bookmark.store'
import { useFavoriteStore } from '../../stores/favorite.store'
import { cn } from '../../lib/utils'
import type { S3Bucket, Bookmark } from '@shared/types'

interface CollapsibleSectionProps {
  label: string
  count: number
  defaultOpen?: boolean
  children: React.ReactNode
}

function CollapsibleSection({
  label,
  count,
  defaultOpen = true,
  children
}: CollapsibleSectionProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-accent/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-1">
          {isOpen ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
        </div>
        <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
          {count}
        </span>
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function Sidebar(): JSX.Element {
  const {
    connected,
    buckets,
    listBucketsError,
    addManualBucket,
    savedCredentials,
    loadSavedCredentials,
    connectSavedCredential,
    connecting,
    connectionInfo
  } = useConnectionStore()
  const { bookmarks, newlyAddedId, remove: removeBookmark, rename: renameBookmark } = useBookmarkStore()
  const { currentBucket, navigateToBucket, navigateToPrefix, currentPrefix } = useBrowserStore()
  const { favorites, load: loadFavorites, toggle: toggleFavorite } = useFavoriteStore()
  const [bucketFilter, setBucketFilter] = useState('')
  const bookmarksSectionRef = useRef<HTMLDivElement>(null)
  const newBookmarkRef = useRef<HTMLButtonElement>(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [bookmarkToRename, setBookmarkToRename] = useState<Bookmark | null>(null)
  const [newBookmarkName, setNewBookmarkName] = useState('')
  const [addBucketDialogOpen, setAddBucketDialogOpen] = useState(false)
  const [newBucketName, setNewBucketName] = useState('')
  const [newBucketRegion, setNewBucketRegion] = useState('')
  const [newBucketPrefix, setNewBucketPrefix] = useState('')
  const [connectingCredId, setConnectingCredId] = useState<string | null>(null)

  // Load saved credentials on mount
  useEffect(() => {
    loadSavedCredentials()
  }, [])

  const handleConnectSaved = async (id: string): Promise<void> => {
    setConnectingCredId(id)
    await connectSavedCredential(id)
    setConnectingCredId(null)
  }

  const handleAddBucket = (): void => {
    if (newBucketName.trim()) {
      // Normalize prefix to ensure it ends with / if not empty
      let prefix = newBucketPrefix.trim()
      if (prefix && !prefix.endsWith('/')) {
        prefix += '/'
      }
      addManualBucket(newBucketName.trim(), newBucketRegion.trim() || undefined, prefix || undefined)
      setAddBucketDialogOpen(false)
      setNewBucketName('')
      setNewBucketRegion('')
      setNewBucketPrefix('')
    }
  }

  const handleRenameBookmark = (bookmark: Bookmark): void => {
    setBookmarkToRename(bookmark)
    setNewBookmarkName(bookmark.label)
    setRenameDialogOpen(true)
  }

  const handleRenameSubmit = async (): Promise<void> => {
    if (bookmarkToRename && newBookmarkName.trim()) {
      await renameBookmark(bookmarkToRename.id, newBookmarkName.trim())
      setRenameDialogOpen(false)
      setBookmarkToRename(null)
      setNewBookmarkName('')
    }
  }

  const handleDeleteBookmark = async (id: string): Promise<void> => {
    await removeBookmark(id)
  }

  useEffect(() => {
    if (connected) {
      loadFavorites()
    }
  }, [connected])

  // Scroll to newly added bookmark and flash animation
  useEffect(() => {
    if (newlyAddedId && newBookmarkRef.current) {
      newBookmarkRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [newlyAddedId])

  const filter = bucketFilter.toLowerCase().trim()
  const filteredBuckets = filter
    ? buckets.filter((b) => b.name.toLowerCase().includes(filter))
    : buckets

  const favoriteBuckets = filteredBuckets.filter((b) => favorites.has(b.name))
  const otherBuckets = filteredBuckets.filter((b) => !favorites.has(b.name))

  const filteredBookmarks = filter
    ? bookmarks.filter(
        (bm) =>
          bm.label.toLowerCase().includes(filter) || bm.bucket.toLowerCase().includes(filter)
      )
    : bookmarks

  return (
    <div className="h-full flex flex-col bg-sidebar text-sidebar-foreground border-r border-border/50 shadow-sm">
      {/* Branded header */}
      <div className="px-3 py-2.5 flex items-center gap-2 border-b border-border">
        <Database className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-semibold">
          S3 <span className="text-primary">Browser</span>
        </span>
      </div>

      {/* Search input */}
      {connected && buckets.length > 0 && (
        <div className="px-2 pt-2 pb-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter buckets..."
              value={bucketFilter}
              onChange={(e) => setBucketFilter(e.target.value)}
              className="w-full h-7 pl-7 pr-7 text-xs bg-muted/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
            />
            {bucketFilter && (
              <button
                onClick={() => setBucketFilter('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center rounded-sm hover:bg-accent"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        {/* Saved Connections section - always visible */}
        {savedCredentials.length > 0 && (
          <CollapsibleSection label="Saved Connections" count={savedCredentials.length} defaultOpen={!connected}>
            <div className="px-1">
              {savedCredentials.map((cred) => {
                const isActive = connected && connectionInfo?.credentialId === cred.id
                const isConnecting = connectingCredId === cred.id
                return (
                  <button
                    key={cred.id}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left group',
                      isActive && 'bg-primary/15 text-primary border-l-2 border-l-primary font-medium'
                    )}
                    onClick={() => handleConnectSaved(cred.id)}
                    disabled={isConnecting || connecting}
                    title={cred.defaultBucket ? `${cred.defaultBucket}/${cred.defaultPrefix || ''}` : cred.region}
                  >
                    {isConnecting ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                    ) : (
                      <KeyRound
                        className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{cred.label}</div>
                      {cred.defaultBucket && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                          <FolderOpen className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{cred.defaultBucket}{cred.defaultPrefix ? `/${cred.defaultPrefix}` : ''}</span>
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <span className="text-[10px] text-primary shrink-0">Connected</span>
                    )}
                  </button>
                )
              })}
            </div>
          </CollapsibleSection>
        )}

        {connected ? (
          <div className="pb-2">
            {/* Favorites section */}
            {favoriteBuckets.length > 0 && (
              <CollapsibleSection label="Favorites" count={favoriteBuckets.length}>
                <div className="px-1">
                  {favoriteBuckets.map((bucket) => (
                    <BucketItem
                      key={`${bucket.name}-${bucket.startingPrefix || ''}`}
                      bucket={bucket}
                      isActive={currentBucket === bucket.name && currentPrefix === (bucket.startingPrefix || '')}
                      isFavorite={true}
                      onSelect={() => navigateToBucket(bucket.name, bucket.startingPrefix)}
                      onToggleFavorite={() => toggleFavorite(bucket.name)}
                    />
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* All Buckets section */}
            <div className="relative">
              <CollapsibleSection label="Buckets" count={otherBuckets.length}>
                <div className="px-1">
                  {otherBuckets.map((bucket) => (
                    <BucketItem
                      key={`${bucket.name}-${bucket.startingPrefix || ''}`}
                      bucket={bucket}
                      isActive={currentBucket === bucket.name && currentPrefix === (bucket.startingPrefix || '')}
                      isFavorite={false}
                      onSelect={() => navigateToBucket(bucket.name, bucket.startingPrefix)}
                      onToggleFavorite={() => toggleFavorite(bucket.name)}
                    />
                  ))}
                </div>
              </CollapsibleSection>
              {/* Add bucket button */}
              <button
                onClick={() => setAddBucketDialogOpen(true)}
                className="absolute right-2 top-1 p-1 rounded-md hover:bg-accent transition-colors"
                title="Add bucket manually"
              >
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* No results for filter */}
            {filteredBuckets.length === 0 && filter && (
              <div className="px-3 py-6 text-xs text-muted-foreground text-center">
                No matching buckets
              </div>
            )}

            {/* Empty bucket list or listing error */}
            {buckets.length === 0 && (
              <div className="px-3 py-4 text-center">
                {listBucketsError ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-left p-2 bg-amber-500/10 rounded-md border border-amber-500/20">
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-600 dark:text-amber-400">
                        <p className="font-medium">Cannot list buckets</p>
                        <p className="text-muted-foreground mt-1">
                          Your credentials may not have ListAllMyBuckets permission.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setAddBucketDialogOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add Bucket Manually
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No buckets found</p>
                )}
              </div>
            )}

            {/* Bookmarks section */}
            {connected && (
              <div ref={bookmarksSectionRef}>
                <CollapsibleSection
                  label="Bookmarks"
                  count={filteredBookmarks.length}
                  defaultOpen={filteredBookmarks.length > 0}
                >
                  {filteredBookmarks.length > 0 ? (
                    <div className="px-1">
                      {filteredBookmarks.map((bm) => {
                        const isNewlyAdded = bm.id === newlyAddedId
                        const isActive = currentBucket === bm.bucket && currentPrefix === bm.prefix
                        return (
                          <ContextMenu key={bm.id}>
                            <ContextMenuTrigger asChild>
                              <button
                                ref={isNewlyAdded ? newBookmarkRef : undefined}
                                className={cn(
                                  'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-all text-left group',
                                  isActive && 'bg-accent border-l-2 border-l-primary',
                                  isNewlyAdded && 'animate-bookmark-added'
                                )}
                                onClick={() => {
                                  navigateToBucket(bm.bucket)
                                  if (bm.prefix) {
                                    setTimeout(() => navigateToPrefix(bm.prefix), 100)
                                  }
                                }}
                              >
                                <BookmarkIcon
                                  className={cn(
                                    'h-3.5 w-3.5 text-yellow-500 shrink-0 transition-transform',
                                    isNewlyAdded && 'animate-bounce'
                                  )}
                                />
                                <span className="truncate flex-1">{bm.label}</span>
                                <Trash2
                                  className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteBookmark(bm.id)
                                  }}
                                />
                              </button>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-40">
                              <ContextMenuItem onClick={() => handleRenameBookmark(bm)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Rename
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                              <ContextMenuItem
                                onClick={() => handleDeleteBookmark(bm.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                      Right-click a folder to bookmark
                    </div>
                  )}
                </CollapsibleSection>
              </div>
            )}
          </div>
        ) : (
          <div className="px-3 py-8 text-sm text-muted-foreground text-center">
            Connect to view buckets
          </div>
        )}
      </ScrollArea>

      {/* Rename Bookmark Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Bookmark</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newBookmarkName}
              onChange={(e) => setNewBookmarkName(e.target.value)}
              placeholder="Bookmark name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSubmit()
                }
              }}
              autoFocus
            />
            {bookmarkToRename && (
              <p className="text-xs text-muted-foreground mt-2">
                {bookmarkToRename.bucket}/{bookmarkToRename.prefix || ''}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit} disabled={!newBookmarkName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Bucket Dialog */}
      <Dialog open={addBucketDialogOpen} onOpenChange={setAddBucketDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Bucket</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bucket Name</label>
              <Input
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value)}
                placeholder="my-bucket-name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newBucketName.trim()) {
                    handleAddBucket()
                  }
                }}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Starting Path <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                value={newBucketPrefix}
                onChange={(e) => setNewBucketPrefix(e.target.value)}
                placeholder="path/to/folder/"
              />
              <p className="text-xs text-muted-foreground">
                Use this if your credentials only have access to a specific path within the bucket.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Region <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                value={newBucketRegion}
                onChange={(e) => setNewBucketRegion(e.target.value)}
                placeholder="us-east-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddBucketDialogOpen(false)
                setNewBucketName('')
                setNewBucketRegion('')
                setNewBucketPrefix('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddBucket} disabled={!newBucketName.trim()}>
              Add Bucket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BucketItem({
  bucket,
  isActive,
  isFavorite,
  onSelect,
  onToggleFavorite
}: {
  bucket: S3Bucket
  isActive: boolean
  isFavorite: boolean
  onSelect: () => void
  onToggleFavorite: () => void
}): JSX.Element {
  const displayName = bucket.startingPrefix
    ? `${bucket.name}/${bucket.startingPrefix}`.replace(/\/+$/, '')
    : bucket.name

  return (
    <button
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left group',
        isActive && 'bg-primary/15 text-primary border-l-2 border-l-primary font-medium'
      )}
      onClick={onSelect}
      title={bucket.startingPrefix ? `${bucket.name}/${bucket.startingPrefix}` : bucket.name}
    >
      <Database
        className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-primary' : 'text-primary/70')}
      />
      <span className="truncate flex-1">{displayName}</span>
      <span
        role="button"
        tabIndex={-1}
        className={cn(
          'shrink-0 p-0.5 rounded-sm transition-colors',
          isFavorite
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100 hover:bg-accent-foreground/10'
        )}
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation()
            onToggleFavorite()
          }
        }}
      >
        <Star
          className={cn(
            'h-3 w-3 transition-colors',
            isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
          )}
        />
      </span>
      {bucket.region && (
        <span className="text-[10px] text-muted-foreground shrink-0">{bucket.region}</span>
      )}
    </button>
  )
}
