import { create } from 'zustand'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeStore {
  theme: Theme
  resolvedTheme: ResolvedTheme
  initTheme: () => void
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = 's3explorer-theme'

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement
  root.classList.add('transitioning')
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  // Remove transitioning class after animation completes
  setTimeout(() => root.classList.remove('transitioning'), 300)
}

export const useThemeStore = create<ThemeStore>()((set, get) => ({
  theme: 'system',
  resolvedTheme: 'dark',

  initTheme: () => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    const theme = stored || 'system'
    const resolved = theme === 'system' ? getSystemTheme() : theme
    applyTheme(resolved)
    set({ theme, resolvedTheme: resolved })

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () => {
      const current = get().theme
      if (current === 'system') {
        const newResolved = getSystemTheme()
        applyTheme(newResolved)
        set({ resolvedTheme: newResolved })
      }
    })
  },

  setTheme: (theme: Theme) => {
    localStorage.setItem(STORAGE_KEY, theme)
    const resolved = theme === 'system' ? getSystemTheme() : theme
    applyTheme(resolved)
    set({ theme, resolvedTheme: resolved })
  }
}))
