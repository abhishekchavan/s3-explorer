import { CopyObjectCommand } from '@aws-sdk/client-s3'
import { getClientForBucket } from './s3-client.factory'
import { deleteObjects } from './s3-object.service'
import type { CopyObjectRequest } from '@shared/types'

export async function copyObject(request: CopyObjectRequest): Promise<void> {
  const client = await getClientForBucket(request.destBucket)

  const copySource = encodeURI(`${request.sourceBucket}/${request.sourceKey}`)

  const command = new CopyObjectCommand({
    Bucket: request.destBucket,
    Key: request.destKey,
    CopySource: copySource
  })

  await client.send(command)
}

export async function moveObject(request: CopyObjectRequest): Promise<void> {
  // Step 1: Copy the object to the destination
  await copyObject(request)

  // Step 2: Delete the source object
  await deleteObjects(request.sourceBucket, [request.sourceKey])
}

export async function copyFolder(
  sourceBucket: string,
  sourcePrefix: string,
  destBucket: string,
  destPrefix: string
): Promise<{ copied: number; errors: string[] }> {
  // Import listObjects here to avoid circular dependency at module level
  const { listObjects } = await import('./s3-object.service')

  let copied = 0
  const errors: string[] = []
  let continuationToken: string | undefined

  do {
    const response = await listObjects({
      bucket: sourceBucket,
      prefix: sourcePrefix,
      delimiter: '', // No delimiter to get all objects recursively
      continuationToken
    })

    for (const obj of response.objects) {
      if (obj.isFolder) continue

      const relativePath = obj.key.slice(sourcePrefix.length)
      const destKey = destPrefix + relativePath

      try {
        await copyObject({
          sourceBucket,
          sourceKey: obj.key,
          destBucket,
          destKey
        })
        copied++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        errors.push(`${obj.key}: ${message}`)
      }
    }

    continuationToken = response.continuationToken
  } while (continuationToken)

  return { copied, errors }
}

export async function moveFolder(
  sourceBucket: string,
  sourcePrefix: string,
  destBucket: string,
  destPrefix: string
): Promise<{ moved: number; errors: string[] }> {
  const { copied, errors } = await copyFolder(
    sourceBucket,
    sourcePrefix,
    destBucket,
    destPrefix
  )

  if (errors.length === 0 && copied > 0) {
    // Only delete source if all copies succeeded
    const { deleteObjectsRecursive } = await import('./s3-object.service')
    await deleteObjectsRecursive(sourceBucket, sourcePrefix)
  }

  return { moved: copied, errors }
}
