import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-channels'
import {
  listFavorites,
  addFavorite,
  removeFavorite
} from '../services/favorites/favorite.service'

export function registerFavoriteHandlers(): void {
  ipcMain.handle(IPC.FAVORITE_LIST, async () => {
    try {
      const favorites = listFavorites()
      return { success: true, data: favorites }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list favorites'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.FAVORITE_ADD, async (_event, bucketName: string) => {
    try {
      const favorite = addFavorite(bucketName)
      return { success: true, data: favorite }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add favorite'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.FAVORITE_REMOVE, async (_event, bucketName: string) => {
    try {
      removeFavorite(bucketName)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove favorite'
      return { success: false, error: message }
    }
  })
}
