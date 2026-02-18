import {
  ListObjectsV2Command,
  HeadObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getClientForBucket } from './s3-client.factory'
import type {
  ListObjectsRequest,
  ListObjectsResponse,
  HeadObjectResponse,
  SearchObjectsRequest,
  S3Object
} from '@shared/types'
export async function listObjects(request: ListObjectsRequest): Promise<ListObjectsResponse> {
  const client = await getClientForBucket(request.bucket)

  const command = new ListObjectsV2Command({
    Bucket: request.bucket,
    Prefix: request.prefix || '',
    Delimiter: request.delimiter ?? '/',
    ContinuationToken: request.continuationToken,
    MaxKeys: request.maxKeys || 1000
  })

  const response = await client.send(command)

  const objects: S3Object[] = (response.Contents || [])
    .filter((obj) => obj.Key !== request.prefix) // filter out the prefix itself
    .map((obj) => {
      const key = obj.Key || ''
      const parts = key.split('/')
      const name = key.endsWith('/') ? parts[parts.length - 2] + '/' : parts[parts.length - 1]

      return {
        key,
        name,
        size: obj.Size || 0,
        lastModified: obj.LastModified?.toISOString(),
        storageClass: obj.StorageClass,
        etag: obj.ETag,
        isFolder: key.endsWith('/')
      }
    })

  const commonPrefixes = (response.CommonPrefixes || []).map((cp) => cp.Prefix || '')

  // Add folder entries for common prefixes
  const folderObjects: S3Object[] = commonPrefixes.map((prefix) => {
    const trimmed = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
    const parts = trimmed.split('/')
    const name = parts[parts.length - 1] + '/'

    return {
      key: prefix,
      name,
      size: 0,
      isFolder: true
    }
  })

  return {
    objects: [...folderObjects, ...objects],
    commonPrefixes,
    continuationToken: response.NextContinuationToken,
    isTruncated: response.IsTruncated || false,
    keyCount: response.KeyCount || 0
  }
}

export async function headObject(
  bucket: string,
  key: string
): Promise<HeadObjectResponse> {
  const client = await getClientForBucket(bucket)

  const command = new HeadObjectCommand({
    Bucket: bucket,
    Key: key
  })

  const response = await client.send(command)

  return {
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified?.toISOString(),
    etag: response.ETag,
    storageClass: response.StorageClass,
    metadata: response.Metadata
  }
}

export async function deleteObjects(
  bucket: string,
  keys: string[]
): Promise<{ deleted: string[]; errors: string[] }> {
  const client = await getClientForBucket(bucket)

  const deleted: string[] = []
  const errors: string[] = []

  // DeleteObjects supports max 1000 keys per request
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000)
    const command = new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: batch.map((key) => ({ Key: key })),
        Quiet: false
      }
    })

    const response = await client.send(command)

    if (response.Deleted) {
      for (const d of response.Deleted) {
        if (d.Key) deleted.push(d.Key)
      }
    }

    if (response.Errors) {
      for (const e of response.Errors) {
        errors.push(`${e.Key}: ${e.Message}`)
      }
    }
  }

  return { deleted, errors }
}

export async function deleteObjectsRecursive(
  bucket: string,
  prefix: string
): Promise<{ deleted: string[]; errors: string[] }> {
  const client = await getClientForBucket(bucket)

  const allKeys: string[] = []
  let continuationToken: string | undefined

  // List all objects under the prefix
  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken
    })

    const listResponse = await client.send(listCommand)

    if (listResponse.Contents) {
      for (const obj of listResponse.Contents) {
        if (obj.Key) allKeys.push(obj.Key)
      }
    }

    continuationToken = listResponse.NextContinuationToken
  } while (continuationToken)

  if (allKeys.length === 0) {
    return { deleted: [], errors: [] }
  }

  return deleteObjects(bucket, allKeys)
}

export async function createFolder(bucket: string, key: string): Promise<void> {
  const client = await getClientForBucket(bucket)

  // Ensure the key ends with /
  const folderKey = key.endsWith('/') ? key : key + '/'

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: folderKey,
    Body: ''
  })

  await client.send(command)
}

export async function getPresignedUrl(
  bucket: string,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = await getClientForBucket(bucket)

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  })

  const url = await getSignedUrl(client, command, { expiresIn })
  return url
}

export async function getObjectContent(
  bucket: string,
  key: string,
  maxBytes: number = 1024 * 1024 // Default 1MB
): Promise<{ content: string; truncated: boolean; contentType?: string }> {
  const client = await getClientForBucket(bucket)

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    Range: `bytes=0-${maxBytes - 1}`
  })

  const response = await client.send(command)

  const bodyStream = response.Body
  if (!bodyStream) {
    return { content: '', truncated: false, contentType: response.ContentType }
  }

  const bytes = await bodyStream.transformToByteArray()
  const content = Buffer.from(bytes).toString('utf-8')

  // Check if the content was truncated
  const totalSize = response.ContentLength || 0
  const contentRange = response.ContentRange
  let truncated = false

  if (contentRange) {
    // Format: bytes 0-N/total
    const match = contentRange.match(/\/(\d+)$/)
    if (match) {
      truncated = parseInt(match[1], 10) > maxBytes
    }
  } else {
    truncated = totalSize >= maxBytes
  }

  return { content, truncated, contentType: response.ContentType }
}

export async function searchObjects(
  request: SearchObjectsRequest,
  onResults: (results: S3Object[]) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  const client = await getClientForBucket(request.bucket)
  const maxResults = request.maxResults || 500
  const query = request.query.toLowerCase()

  let continuationToken: string | undefined
  let totalFound = 0

  do {
    if (abortSignal?.aborted) {
      return
    }

    const command = new ListObjectsV2Command({
      Bucket: request.bucket,
      Prefix: request.prefix || '',
      ContinuationToken: continuationToken,
      MaxKeys: 1000
    })

    const response = await client.send(command, {
      abortSignal
    })

    if (response.Contents) {
      const matching: S3Object[] = []

      for (const obj of response.Contents) {
        if (abortSignal?.aborted) return

        const key = obj.Key || ''
        // Match query as substring against the key
        if (key.toLowerCase().includes(query)) {
          const parts = key.split('/')
          const name = key.endsWith('/')
            ? parts[parts.length - 2] + '/'
            : parts[parts.length - 1]

          matching.push({
            key,
            name,
            size: obj.Size || 0,
            lastModified: obj.LastModified?.toISOString(),
            storageClass: obj.StorageClass,
            etag: obj.ETag,
            isFolder: key.endsWith('/')
          })
        }
      }

      if (matching.length > 0) {
        const remaining = maxResults - totalFound
        const batch = matching.slice(0, remaining)
        onResults(batch)
        totalFound += batch.length

        if (totalFound >= maxResults) {
          return
        }
      }
    }

    continuationToken = response.NextContinuationToken
  } while (continuationToken)
}
