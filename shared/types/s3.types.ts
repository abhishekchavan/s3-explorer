export interface S3Bucket {
  name: string
  creationDate?: string
  region?: string
  startingPrefix?: string // For buckets with restricted access to specific prefixes
}

export interface S3Object {
  key: string
  name: string
  size: number
  lastModified?: string
  storageClass?: string
  etag?: string
  isFolder: boolean
}

export interface ListObjectsRequest {
  bucket: string
  prefix?: string
  continuationToken?: string
  maxKeys?: number
  delimiter?: string
}

export interface ListObjectsResponse {
  objects: S3Object[]
  commonPrefixes: string[]
  continuationToken?: string
  isTruncated: boolean
  keyCount: number
}

export interface HeadObjectResponse {
  contentType?: string
  contentLength?: number
  lastModified?: string
  etag?: string
  storageClass?: string
  metadata?: Record<string, string>
}

export interface SearchObjectsRequest {
  bucket: string
  prefix?: string
  query: string
  maxResults?: number
}

export interface PresignedUrlRequest {
  bucket: string
  key: string
  expiresIn?: number
}

export interface GetObjectContentRequest {
  bucket: string
  key: string
  maxBytes?: number
}

export interface CopyObjectRequest {
  sourceBucket: string
  sourceKey: string
  destBucket: string
  destKey: string
}

export interface DeleteObjectsRequest {
  bucket: string
  keys: string[]
  recursive?: boolean
}

export interface CreateFolderRequest {
  bucket: string
  key: string
}
