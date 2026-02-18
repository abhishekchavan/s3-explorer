import { ipcMain, dialog, nativeImage, shell } from 'electron'
import { basename, isAbsolute } from 'path'
import { existsSync } from 'fs'
import { IPC } from '@shared/ipc-channels'
import { getMainWindow } from '../index'

function isValidLocalPath(filePath: string): boolean {
  return typeof filePath === 'string' && filePath.length > 0 && isAbsolute(filePath) && existsSync(filePath)
}

export function registerFilesystemHandlers(): void {
  ipcMain.handle(IPC.FS_SELECT_FILES, async () => {
    try {
      const window = getMainWindow()
      if (!window) return { success: false, error: 'No active window' }

      const result = await dialog.showOpenDialog(window, {
        properties: ['openFile', 'multiSelections']
      })

      if (result.canceled) return { success: true, data: [] }
      return { success: true, data: result.filePaths }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open file dialog'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.FS_SELECT_DIRECTORY, async () => {
    try {
      const window = getMainWindow()
      if (!window) return { success: false, error: 'No active window' }

      const result = await dialog.showOpenDialog(window, {
        properties: ['openDirectory']
      })

      if (result.canceled || result.filePaths.length === 0) return { success: true, data: null }
      return { success: true, data: result.filePaths[0] }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open directory dialog'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.FS_SELECT_DOWNLOAD_DIRECTORY, async () => {
    try {
      const window = getMainWindow()
      if (!window) return { success: false, error: 'No active window' }

      const result = await dialog.showOpenDialog(window, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Choose download location',
        buttonLabel: 'Save'
      })

      if (result.canceled || result.filePaths.length === 0) return { success: true, data: null }
      return { success: true, data: result.filePaths[0] }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open directory dialog'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.FS_SELECT_SAVE_PATH, async (_event, defaultName?: string) => {
    try {
      const window = getMainWindow()
      if (!window) return { success: false, error: 'No active window' }
      const safeDefaultName = defaultName ? basename(defaultName) : undefined

      const result = await dialog.showSaveDialog(window, {
        defaultPath: safeDefaultName
      })

      if (result.canceled || !result.filePath) return { success: true, data: null }
      return { success: true, data: result.filePath }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open save dialog'
      return { success: false, error: message }
    }
  })

  ipcMain.on(IPC.FS_START_DRAG, (_event, filePath: string) => {
    try {
      const window = getMainWindow()
      if (!window || !isValidLocalPath(filePath)) return

      window.webContents.startDrag({
        file: filePath,
        icon: nativeImage.createEmpty()
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown drag error'
      console.warn('Failed to start drag:', message)
    }
  })

  ipcMain.handle(IPC.APP_GET_PLATFORM, async () => {
    return process.platform
  })

  ipcMain.handle(IPC.FS_SHOW_IN_FINDER, async (_event, filePath: string) => {
    try {
      if (!isValidLocalPath(filePath)) {
        return { success: false, error: 'Invalid file path' }
      }
      shell.showItemInFolder(filePath)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to show in Finder'
      return { success: false, error: message }
    }
  })
}
