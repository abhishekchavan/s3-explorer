import { ChevronRight, Home } from 'lucide-react'
import { useBrowserStore } from '../../stores/browser.store'
import { Button } from '../ui/button'

export function BreadcrumbNav(): JSX.Element {
  const { currentBucket, currentPrefix, navigateToPrefix } = useBrowserStore()

  const parts = currentPrefix ? currentPrefix.split('/').filter(Boolean) : []

  return (
    <nav className="flex items-center gap-0.5 text-sm min-w-0 overflow-hidden">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs shrink-0"
        onClick={() => navigateToPrefix('')}
      >
        <Home className="h-3.5 w-3.5 mr-1" />
        {currentBucket}
      </Button>

      {parts.map((part, i) => {
        const prefix = parts.slice(0, i + 1).join('/') + '/'
        const isLast = i === parts.length - 1

        return (
          <div key={prefix} className="flex items-center gap-0.5 min-w-0">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {isLast ? (
              <span className="text-xs font-medium truncate">{part}</span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => navigateToPrefix(prefix)}
              >
                {part}
              </Button>
            )}
          </div>
        )
      })}
    </nav>
  )
}
