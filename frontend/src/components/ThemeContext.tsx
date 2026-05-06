'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

interface ThemeCtx {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeCtx>({ theme: 'dark', toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // El script inline en `layout.tsx` ya aplicó `html.light` antes de hidratar
  // si correspondía. Sincronizamos el state de React con la clase real del
  // <html> para que el toggle no quede desfasado.
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('light')) {
      setTheme('light')
    }
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (next === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
    try { localStorage.setItem('ric-tema', next) } catch {}
  }

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
