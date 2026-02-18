import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type {
  ListObjectsRequest,
  PresignedUrlRequest,
  GetObjectContentRequest,
  CopyObjectRequest,
  DeleteObjectsRequest,
  CreateFolderRequest,
  SearchObjectsRequest
} from '@shared/types'
import { listBuckets, getBucketLocation } from '../services/s3/s3-bucket.service'
import {
  listObjects,
  headObject,
  deleteObjects,
  deleteObjectsRecursive,
  createFolder,
  getPresignedUrl,
  getObjectContent,
  searchObjects
} from '../services/s3/s3-object.service'
import { copyObject, moveObject } from '../services/s3/s3-copy.service'

let searchAbortController: AbortController | null = null

export function registerS3Handlers(): void {
  ipcMain.handle(IPC.S3_LIST_BUCKETS, async () => {
    try {
      const buckets = await listBuckets()
      return { success: true, data: buckets }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list buckets'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.S3_GET_BUCKET_LOCATION, async (_event, bucket: string) => {
    try {
      const location = await getBucketLocation(bucket)
      return { success: true, data: location }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get bucket location'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.S3_LIST_OBJECTS, async (_event, request: ListObjectsRequest) => {
    try {
      const result = await listObjects(request)
      return { success: true, data: result }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list objects'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.S3_HEAD_OBJECT, async (_event, bucket: string, key: string) => {
    try {
      const metadata = await headObject(bucket, key)
      return { success: true, data: metadata }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get object metadata'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.S3_DELETE_OBJECTS, async (_event, request: DeleteObjectsRequest) => {
    try {
      if (request.recursive) {
        for (const key of request.keys) {
          if (key.endsWith('/')) {
            await deleteObjectsRecursive(request.bucket, key)
          } else {
            await deleteObjects(request.bucket, [key])
          }
        }
      } else {
        await deleteObjects(request.bucket, request.keys)
      }
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete objects'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.S3_CREATE_FOLDER, async (_event, request: CreateFolderRequest) => {
    try {
      await createFolder(request.bucket, request.key)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create folder'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.S3_COPY_OBJECT, async (_event, request: CopyObjectRequest) => {
    try {
      await copyObject(request)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to copy object'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.S3_MOVE_OBJECT, async (_event, request: CopyObjectRequest) => {
    try {
      await moveObject(request)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to move object'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.S3_GET_PRESIGNED_URL, async (_event, request: PresignedUrlRequest) => {
    try {
      const url = await getPresignedUrl(request.bucket, request.key, request.expiresIn)
      return { success: true, data: url }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate presigned URL'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.S3_GET_OBJECT_CONTENT, async (_event, request: GetObjectContentRequest) => {
    try {
      const result = await getObjectContent(request.bucket, request.key, request.maxBytes)
      return { success: true, data: result.content }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get object content'
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.S3_SEARCH_OBJECTS, async (event: IpcMainInvokeEvent, request: SearchObjectsRequest) => {
    try {
      searchAbortController = new AbortController()
      await searchObjects(
        request,
        (objects) => {
          event.sender.send(IPC.SEARCH_RESULTS, { objects })
        },
        searchAbortController.signal
      )
      event.sender.send(IPC.SEARCH_COMPLETE)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed'
      event.sender.send(IPC.SEARCH_COMPLETE)
      return { success: false, error: message }
    } finally {
      searchAbortController = null
    }
  })

  ipcMain.handle(IPC.S3_CANCEL_SEARCH, async () => {
    try {
      if (searchAbortController) {
        searchAbortController.abort()
        searchAbortController = null
      }
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel search'
      return { success: false, error: message }
    }
  })
}
