import { ListBucketsCommand } from '@aws-sdk/client-s3'
import { getClient, getBucketRegion } from './s3-client.factory'
import type { S3Bucket } from '@shared/types'

export async function listBuckets(): Promise<S3Bucket[]> {
  const client = getClient()
  const command = new ListBucketsCommand({})
  const response = await client.send(command)

  const buckets: S3Bucket[] = (response.Buckets || []).map((bucket) => ({
    name: bucket.Name || '',
    creationDate: bucket.CreationDate?.toISOString()
  }))

  return buckets
}

export async function getBucketLocation(bucket: string): Promise<string> {
  return getBucketRegion(bucket)
}

export async function listBucketsWithRegions(): Promise<S3Bucket[]> {
  const buckets = await listBuckets()

  // Fetch regions in parallel with a concurrency limit
  const CONCURRENCY = 5
  const results: S3Bucket[] = []

  for (let i = 0; i < buckets.length; i += CONCURRENCY) {
    const batch = buckets.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.allSettled(
      batch.map(async (bucket) => {
        try {
          const region = await getBucketRegion(bucket.name)
          return { ...bucket, region }
        } catch {
          return bucket
        }
      })
    )

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      }
    }
  }

  return results
}
