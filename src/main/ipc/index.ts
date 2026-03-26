import { registerCredentialHandlers } from './credential.handlers'
import { registerS3Handlers } from './s3.handlers'
import { registerTransferHandlers } from './transfer.handlers'
import { registerBookmarkHandlers } from './bookmark.handlers'
import { registerFavoriteHandlers } from './favorite.handlers'
import { registerFilesystemHandlers } from './filesystem.handlers'
import { registerSftpHandlers } from './sftp.handlers'

export function registerAllHandlers(): void {
  registerCredentialHandlers()
  registerS3Handlers()
  registerTransferHandlers()
  registerBookmarkHandlers()
  registerFavoriteHandlers()
  registerFilesystemHandlers()
  registerSftpHandlers()
}
