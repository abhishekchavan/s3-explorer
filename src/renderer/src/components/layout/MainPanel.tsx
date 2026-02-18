import { Cloud, Database } from 'lucide-react'
import { BreadcrumbNav } from '../browser/BreadcrumbNav'
import { SearchBar } from '../browser/SearchBar'
import { ObjectList } from '../browser/ObjectList'
import { PreviewPanel } from '../preview/PreviewPanel'
import { Button } from '../ui/button'
import { useConnectionStore } from '../../stores/connection.store'
import { useBrowserStore } from '../../stores/browser.store'
import { useUiStore } from '../../stores/ui.store'
import { Separator } from '../ui/separator'

export function MainPanel(): JSX.Element {
  const { connected } = useConnectionStore()
  const { currentBucket } = useBrowserStore()
  const { showPreview, toggleConnectionDialog } = useUiStore()

  if (!connected) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Cloud className="h-6 w-6 text-primary" />
          </div>
          <p className="text-lg font-medium">Welcome to S3 Browser Downloader</p>
          <p className="text-sm text-muted-foreground mt-1">
            Connect to AWS to browse your S3 buckets
          </p>
          <Button className="mt-4" size="sm" onClick={toggleConnectionDialog}>
            Connect
          </Button>
        </div>
      </div>
    )
  }

  if (!currentBucket) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Database className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium">Select a bucket</p>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a bucket from the sidebar to start browsing
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <BreadcrumbNav />
          <div className="ml-auto">
            <SearchBar />
          </div>
        </div>
        <ObjectList />
      </div>
      {showPreview && (
        <>
          <Separator orientation="vertical" />
          <PreviewPanel />
        </>
      )}
    </div>
  )
}
