'use client'

import useMediaQuery from '@mui/material/useMediaQuery'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

export type ThemeModePreference = 'light' | 'dark' | 'system'

interface ThemeModeContextValue {
  preference: ThemeModePreference
  setPreference: (mode: ThemeModePreference) => void
  resolvedMode: 'light' | 'dark'
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  preference: 'system',
  setPreference: () => {},
  resolvedMode: 'light',
})

export function ThemeModeProvider({
  children,
  initialMode = 'system',
}: {
  children: React.ReactNode
  initialMode?: ThemeModePreference
}) {
  const [preference, setPreferenceState] =
    useState<ThemeModePreference>(initialMode)
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')

  const setPreference = useCallback((mode: ThemeModePreference) => {
    setPreferenceState(mode)
    localStorage.setItem('themeMode', mode)
    // biome-ignore lint/suspicious/noDocumentCookie: intentional cookie write for theme persistence
    document.cookie = `themeMode=${mode}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
  }, [])

  const resolvedMode = useMemo<'light' | 'dark'>(
    () =>
      preference === 'system' ? (systemDark ? 'dark' : 'light') : preference,
    [preference, systemDark],
  )

  const value = useMemo(
    () => ({ preference, setPreference, resolvedMode }),
    [preference, setPreference, resolvedMode],
  )

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  )
}

export function useThemeMode() {
  return useContext(ThemeModeContext)
}
