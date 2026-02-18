import { Sun, Moon } from 'lucide-react'
import { Button } from '../ui/button'
import { useThemeStore } from '../../stores/theme.store'

export function ThemeToggle(): JSX.Element {
  const { resolvedTheme, setTheme } = useThemeStore()

  const toggle = (): void => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggle} title="Toggle theme">
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  )
}
