import { PutObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { createReadStream, statSync } from 'fs'
import { lookup } from 'mime-types'
import { getClientForBucket } from '../s3/s3-client.factory'

const MULTIPART_THRESHOLD = 5 * 1024 * 1024 // 5 MB

export interface UploadProgress {
  bytesTransferred: number
  totalBytes: number
}

export interface UploadOptions {
  bucket: string
  key: string
  localPath: string
  onProgress?: (progress: UploadProgress) => void
  abortSignal?: AbortSignal
}

export async function uploadFile(options: UploadOptions): Promise<void> {
  const { bucket, key, localPath, onProgress, abortSignal } = options

  const client = await getClientForBucket(bucket)
  const fileStats = statSync(localPath)
  const totalBytes = fileStats.size
  const contentType = lookup(localPath) || 'application/octet-stream'

  if (totalBytes < MULTIPART_THRESHOLD) {
    await uploadSmallFile(client, bucket, key, localPath, totalBytes, contentType, onProgress, abortSignal)
  } else {
    await uploadMultipart(client, bucket, key, localPath, totalBytes, contentType, onProgress, abortSignal)
  }
}

async function uploadSmallFile(
  client: ReturnType<typeof getClientForBucket> extends Promise<infer T> ? T : never,
  bucket: string,
  key: string,
  localPath: string,
  totalBytes: number,
  contentType: string,
  onProgress?: (progress: UploadProgress) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  const stream = createReadStream(localPath)

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: stream,
    ContentType: contentType,
    ContentLength: totalBytes
  })

  await client.send(command, { abortSignal })

  if (onProgress) {
    onProgress({ bytesTransferred: totalBytes, totalBytes })
  }
}

async function uploadMultipart(
  client: ReturnType<typeof getClientForBucket> extends Promise<infer T> ? T : never,
  bucket: string,
  key: string,
  localPath: string,
  totalBytes: number,
  contentType: string,
  onProgress?: (progress: UploadProgress) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  const stream = createReadStream(localPath)

  const upload = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: stream,
      ContentType: contentType
    },
    queueSize: 4,
    partSize: MULTIPART_THRESHOLD,
    leavePartsOnError: false
  })

  if (abortSignal) {
    const onAbort = (): void => {
      upload.abort()
    }
    if (abortSignal.aborted) {
      upload.abort()
      throw new Error('Upload cancelled')
    }
    abortSignal.addEventListener('abort', onAbort, { once: true })
  }

  upload.on('httpUploadProgress', (progress) => {
    if (onProgress && progress.loaded !== undefined) {
      onProgress({
        bytesTransferred: progress.loaded,
        totalBytes: progress.total || totalBytes
      })
    }
  })

  await upload.done()
}
