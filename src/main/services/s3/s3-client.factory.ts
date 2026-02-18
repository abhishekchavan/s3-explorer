import { S3Client, GetBucketLocationCommand, HeadBucketCommand } from '@aws-sdk/client-s3'
import { getCredentialProvider, getCurrentRegion } from '../credentials/credential-manager'

const clientCache = new Map<string, S3Client>()
const bucketRegionCache = new Map<string, string>()

function buildClient(region: string): S3Client {
  const credentials = getCredentialProvider()
  return new S3Client({
    region,
    credentials
  })
}

export function getClient(region?: string): S3Client {
  const resolvedRegion = region || getCurrentRegion()
  const cached = clientCache.get(resolvedRegion)
  if (cached) {
    return cached
  }

  const client = buildClient(resolvedRegion)
  clientCache.set(resolvedRegion, client)
  return client
}

export async function getClientForBucket(bucket: string): Promise<S3Client> {
  // Check cache first
  const cached = bucketRegionCache.get(bucket)
  if (cached) {
    return getClient(cached)
  }

  // Try to get region via GetBucketLocation
  const region = await getBucketRegion(bucket)
  return getClient(region)
}

export async function getBucketRegion(bucket: string): Promise<string> {
  // Check cache first
  const cached = bucketRegionCache.get(bucket)
  if (cached) {
    return cached
  }

  // Try HeadBucket first - it returns region in error response
  try {
    const client = getClient('us-east-1')
    const command = new HeadBucketCommand({ Bucket: bucket })
    const response = await client.send(command)

    // If successful, check for region in response metadata
    const region = response.BucketRegion || 'us-east-1'
    bucketRegionCache.set(bucket, region)
    return region
  } catch (error: unknown) {
    const err = error as {
      $metadata?: { httpStatusCode?: number };
      BucketRegion?: string;
      name?: string;
      Code?: string;
    }

    // Extract region from error - AWS SDK v3 exposes BucketRegion on redirect errors
    if (err.BucketRegion) {
      bucketRegionCache.set(bucket, err.BucketRegion)
      return err.BucketRegion
    }

    // For AccessDenied, the region we used is correct
    if (err.name === 'AccessDenied' || err.Code === 'AccessDenied' || err.$metadata?.httpStatusCode === 403) {
      const region = 'us-east-1'
      bucketRegionCache.set(bucket, region)
      return region
    }

    // For 301 redirect without BucketRegion, try common regions
    if (err.$metadata?.httpStatusCode === 301 || err.name === 'PermanentRedirect') {
      return detectBucketRegion(bucket)
    }
  }

  // Fallback: try GetBucketLocation
  try {
    const client = getClient('us-east-1')
    const command = new GetBucketLocationCommand({ Bucket: bucket })
    const response = await client.send(command)
    const region = response.LocationConstraint || 'us-east-1'
    bucketRegionCache.set(bucket, region)
    return region
  } catch {
    // Fall back to current region
    const fallbackRegion = getCurrentRegion()
    bucketRegionCache.set(bucket, fallbackRegion)
    return fallbackRegion
  }
}

// Try to detect bucket region by probing common regions
export async function detectBucketRegion(bucket: string): Promise<string> {
  const regions = ['us-east-1', 'us-west-2', 'us-west-1', 'us-east-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1']

  for (const region of regions) {
    try {
      const client = getClient(region)
      const command = new HeadBucketCommand({ Bucket: bucket })
      await client.send(command)
      bucketRegionCache.set(bucket, region)
      return region
    } catch (error: unknown) {
      const err = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number }; BucketRegion?: string }

      // If we get BucketRegion in error, use it
      if (err.BucketRegion) {
        bucketRegionCache.set(bucket, err.BucketRegion)
        return err.BucketRegion
      }

      // If it's an access denied error (403), the region is correct but we lack permissions
      if (err.name === 'AccessDenied' || err.Code === 'AccessDenied' ||
          err.$metadata?.httpStatusCode === 403 || err.$metadata?.httpStatusCode === 404) {
        bucketRegionCache.set(bucket, region)
        return region
      }
      // Continue trying other regions for 301/400 errors
    }
  }

  const fallback = getCurrentRegion()
  return fallback
}

export function clearClients(): void {
  for (const client of clientCache.values()) {
    client.destroy()
  }
  clientCache.clear()
}
