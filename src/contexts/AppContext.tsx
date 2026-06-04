import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'sepia'

interface AppContextValue {
  theme: ThemeMode
  toggleTheme: () => void
  isDark: boolean
}

const AppContext = createContext<AppContextValue | null>(null)

function readStoredOrSystemTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    // Storage can be blocked in private or restricted browsing contexts.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(readStoredOrSystemTheme)
  const isDark = theme === 'dark'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // Storage can be blocked in private or restricted browsing contexts.
    }
  }, [isDark, theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => current === 'dark' ? 'light' : 'dark')
  }, [])

  const value = useMemo(() => ({
    theme,
    toggleTheme,
    isDark,
  }), [isDark, theme, toggleTheme])

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}
