import { GetObjectCommand } from '@aws-sdk/client-s3'
import { createWriteStream } from 'fs'
import { mkdir } from 'fs/promises'
import { dirname } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { getClientForBucket } from '../s3/s3-client.factory'

export interface DownloadProgress {
  bytesTransferred: number
  totalBytes: number
}

export interface DownloadOptions {
  bucket: string
  key: string
  localPath: string
  onProgress?: (progress: DownloadProgress) => void
  abortSignal?: AbortSignal
}

export async function downloadFile(options: DownloadOptions): Promise<void> {
  const { bucket, key, localPath, onProgress, abortSignal } = options

  const client = await getClientForBucket(bucket)

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  })

  const response = await client.send(command, { abortSignal })

  if (!response.Body) {
    throw new Error(`Empty response body for ${key}`)
  }

  const totalBytes = response.ContentLength || 0

  // Ensure the destination directory exists
  await mkdir(dirname(localPath), { recursive: true })

  const writeStream = createWriteStream(localPath)

  // Convert the response body to a Node.js Readable stream
  const bodyStream = response.Body as Readable

  let bytesTransferred = 0

  // Create a transform-like passthrough to track progress
  const progressTracker = new Readable({
    read() {
      // no-op: data is pushed in from the source
    }
  })

  bodyStream.on('data', (chunk: Buffer) => {
    if (abortSignal?.aborted) {
      bodyStream.destroy()
      writeStream.destroy()
      return
    }

    bytesTransferred += chunk.length
    progressTracker.push(chunk)

    if (onProgress) {
      onProgress({ bytesTransferred, totalBytes })
    }
  })

  bodyStream.on('end', () => {
    progressTracker.push(null)
  })

  bodyStream.on('error', (err) => {
    progressTracker.destroy(err)
  })

  try {
    await pipeline(progressTracker, writeStream)
  } catch (err) {
    // Clean up on abort
    if (abortSignal?.aborted) {
      writeStream.destroy()
      throw new Error('Download cancelled')
    }
    throw err
  }
}
