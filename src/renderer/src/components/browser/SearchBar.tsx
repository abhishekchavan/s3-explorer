import { useCallback, useRef } from 'react'
import { Search, Filter, X, Loader2 } from 'lucide-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { useSearchStore } from '../../stores/search.store'
import { useBrowserStore } from '../../stores/browser.store'
import { cn } from '../../lib/utils'

export function SearchBar(): JSX.Element {
  const { query, mode, searching, setQuery, setMode, executeSearch, cancelSearch } = useSearchStore()
  const { currentBucket, currentPrefix } = useBrowserStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)

      if (mode === 'search' && value.length > 0 && currentBucket) {
        debounceRef.current = setTimeout(() => {
          executeSearch(currentBucket, currentPrefix)
        }, 300)
      }
    },
    [mode, currentBucket, currentPrefix, setQuery, executeSearch]
  )

  const toggleMode = (): void => {
    const newMode = mode === 'filter' ? 'search' : 'filter'
    setMode(newMode)
    if (newMode === 'search' && query && currentBucket) {
      executeSearch(currentBucket, currentPrefix)
    }
  }

  const clear = (): void => {
    setQuery('')
    if (searching) cancelSearch()
    inputRef.current?.focus()
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-7 w-7', mode === 'search' && 'text-primary')}
        onClick={toggleMode}
        title={mode === 'filter' ? 'Switch to deep search' : 'Switch to quick filter'}
      >
        {mode === 'filter' ? <Filter className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
      </Button>
      <div className="relative">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={mode === 'filter' ? 'Filter...' : 'Search bucket...'}
          className="h-7 w-48 text-xs pr-7"
        />
        {(query || searching) && (
          <button
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={clear}
          >
            {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  )
}
