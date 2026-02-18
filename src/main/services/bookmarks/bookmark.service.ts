import Store from 'electron-store'
import { v4 as uuidv4 } from 'uuid'
import type { Bookmark } from '@shared/types'

interface BookmarkStoreSchema {
  bookmarks: Bookmark[]
}

const store = new Store<BookmarkStoreSchema>({
  name: 's3explorer-bookmarks',
  defaults: {
    bookmarks: []
  }
})

export function listBookmarks(): Bookmark[] {
  return store.get('bookmarks', [])
}

export function addBookmark(
  bookmark: Omit<Bookmark, 'id' | 'createdAt'>
): Bookmark {
  const bookmarks = store.get('bookmarks', [])

  const newBookmark: Bookmark = {
    id: uuidv4(),
    label: bookmark.label,
    bucket: bookmark.bucket,
    prefix: bookmark.prefix,
    connectionLabel: bookmark.connectionLabel,
    createdAt: Date.now()
  }

  bookmarks.push(newBookmark)
  store.set('bookmarks', bookmarks)

  return newBookmark
}

export function updateBookmark(
  id: string,
  updates: Partial<Omit<Bookmark, 'id' | 'createdAt'>>
): Bookmark | null {
  const bookmarks = store.get('bookmarks', [])
  const index = bookmarks.findIndex((b) => b.id === id)

  if (index === -1) {
    return null
  }

  const updated: Bookmark = {
    ...bookmarks[index],
    ...updates
  }

  bookmarks[index] = updated
  store.set('bookmarks', bookmarks)

  return updated
}

export function deleteBookmark(id: string): boolean {
  const bookmarks = store.get('bookmarks', [])
  const filtered = bookmarks.filter((b) => b.id !== id)

  if (filtered.length === bookmarks.length) {
    return false
  }

  store.set('bookmarks', filtered)
  return true
}

export function reorderBookmarks(orderedIds: string[]): Bookmark[] {
  const bookmarks = store.get('bookmarks', [])
  const bookmarkMap = new Map(bookmarks.map((b) => [b.id, b]))

  const reordered: Bookmark[] = []

  // First, add bookmarks in the specified order
  for (const id of orderedIds) {
    const bookmark = bookmarkMap.get(id)
    if (bookmark) {
      reordered.push(bookmark)
      bookmarkMap.delete(id)
    }
  }

  // Append any remaining bookmarks not in the orderedIds list
  for (const bookmark of bookmarkMap.values()) {
    reordered.push(bookmark)
  }

  store.set('bookmarks', reordered)
  return reordered
}
