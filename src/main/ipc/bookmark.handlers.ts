import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type { Bookmark } from '@shared/types'
import {
  listBookmarks,
  addBookmark,
  updateBookmark,
  deleteBookmark,
  reorderBookmarks
} from '../services/bookmarks/bookmark.service'

export function registerBookmarkHandlers(): void {
  ipcMain.handle(IPC.BOOKMARK_LIST, async () => {
    try {
      const bookmarks = listBookmarks()
      return { success: true, data: bookmarks }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list bookmarks'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.BOOKMARK_ADD, async (_event, bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => {
    try {
      const created = addBookmark(bookmark)
      return { success: true, data: created }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add bookmark'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.BOOKMARK_UPDATE, async (_event, id: string, updates: Partial<Bookmark>) => {
    try {
      const updated = updateBookmark(id, updates)
      return { success: true, data: updated }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update bookmark'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.BOOKMARK_DELETE, async (_event, id: string) => {
    try {
      deleteBookmark(id)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete bookmark'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.BOOKMARK_REORDER, async (_event, orderedIds: string[]) => {
    try {
      const bookmarks = reorderBookmarks(orderedIds)
      return { success: true, data: bookmarks }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reorder bookmarks'
      return { success: false, error: message }
    }
  })
}
