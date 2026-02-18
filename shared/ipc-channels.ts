export const IPC = {
  // Credentials
  CREDENTIALS_LIST_PROFILES: 'credentials:list-profiles',
  CREDENTIALS_CONNECT_PROFILE: 'credentials:connect-profile',
  CREDENTIALS_CONNECT_MANUAL: 'credentials:connect-manual',
  CREDENTIALS_DISCONNECT: 'credentials:disconnect',
  CREDENTIALS_SAVE_MANUAL: 'credentials:save-manual',
  CREDENTIALS_DELETE_MANUAL: 'credentials:delete-manual',
  CREDENTIALS_LIST_SAVED: 'credentials:list-saved',
  CREDENTIALS_CONNECT_SAVED: 'credentials:connect-saved',

  // S3 Buckets
  S3_LIST_BUCKETS: 's3:list-buckets',
  S3_GET_BUCKET_LOCATION: 's3:get-bucket-location',

  // S3 Objects
  S3_LIST_OBJECTS: 's3:list-objects',
  S3_HEAD_OBJECT: 's3:head-object',
  S3_DELETE_OBJECTS: 's3:delete-objects',
  S3_CREATE_FOLDER: 's3:create-folder',
  S3_COPY_OBJECT: 's3:copy-object',
  S3_MOVE_OBJECT: 's3:move-object',
  S3_GET_PRESIGNED_URL: 's3:get-presigned-url',
  S3_GET_OBJECT_CONTENT: 's3:get-object-content',
  S3_SEARCH_OBJECTS: 's3:search-objects',
  S3_CANCEL_SEARCH: 's3:cancel-search',

  // Transfers
  TRANSFER_UPLOAD: 'transfer:upload',
  TRANSFER_UPLOAD_DIRECTORY: 'transfer:upload-directory',
  TRANSFER_DOWNLOAD: 'transfer:download',
  TRANSFER_PAUSE: 'transfer:pause',
  TRANSFER_RESUME: 'transfer:resume',
  TRANSFER_CANCEL: 'transfer:cancel',
  TRANSFER_RETRY: 'transfer:retry',
  TRANSFER_CLEAR_COMPLETED: 'transfer:clear-completed',

  // Transfer events (main -> renderer)
  TRANSFER_PROGRESS: 'transfer:progress',
  TRANSFER_STATUS: 'transfer:status',

  // Search events (main -> renderer)
  SEARCH_RESULTS: 'search:results',
  SEARCH_COMPLETE: 'search:complete',

  // Bookmarks
  BOOKMARK_LIST: 'bookmark:list',
  BOOKMARK_ADD: 'bookmark:add',
  BOOKMARK_UPDATE: 'bookmark:update',
  BOOKMARK_DELETE: 'bookmark:delete',
  BOOKMARK_REORDER: 'bookmark:reorder',

  // Favorites
  FAVORITE_LIST: 'favorite:list',
  FAVORITE_ADD: 'favorite:add',
  FAVORITE_REMOVE: 'favorite:remove',

  // Filesystem
  FS_SELECT_FILES: 'fs:select-files',
  FS_SELECT_DIRECTORY: 'fs:select-directory',
  FS_SELECT_DOWNLOAD_DIRECTORY: 'fs:select-download-directory',
  FS_SELECT_SAVE_PATH: 'fs:select-save-path',
  FS_START_DRAG: 'fs:start-drag',
  FS_SHOW_IN_FINDER: 'fs:show-in-finder',

  // App
  APP_GET_PLATFORM: 'app:get-platform'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
