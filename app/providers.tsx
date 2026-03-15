'use client'

import CssBaseline from '@mui/material/CssBaseline'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { SnackbarProvider } from 'notistack'
import { useMemo } from 'react'
import { Provider } from 'react-redux'
import { store } from '@/lib/store'
import { ThemeModeProvider, useThemeMode } from '@/lib/themeModeContext'

function createAppTheme(mode: 'light' | 'dark') {
  const light = mode === 'light'
  return createTheme({
    palette: {
      mode,
      primary: {
        main: light ? '#4F46E5' : '#818CF8',
        light: light ? '#818CF8' : '#A5B4FC',
        dark: light ? '#3730A3' : '#4F46E5',
        contrastText: light ? '#ffffff' : '#0F172A',
      },
      secondary: {
        main: light ? '#9333EA' : '#C084FC',
        light: light ? '#C084FC' : '#E879F9',
        dark: light ? '#7E22CE' : '#9333EA',
        contrastText: light ? '#ffffff' : '#0F172A',
      },
      background: {
        default: light ? '#F8FAFC' : '#0F172A',
        paper: light ? '#FFFFFF' : '#1E293B',
      },
      text: {
        primary: light ? '#0F172A' : '#F1F5F9',
        secondary: light ? '#475569' : '#94A3B8',
        disabled: light ? '#94A3B8' : '#475569',
      },
      divider: light ? '#E2E8F0' : '#334155',
      error: { main: '#DC2626' },
      warning: { main: '#D97706' },
      success: { main: '#059669' },
      info: { main: '#0284C7' },
    },
    typography: {
      fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 500 },
      overline: { fontWeight: 600, letterSpacing: '0.08em' },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: {
          root: { borderColor: light ? '#E2E8F0' : '#334155' },
        },
      },
      MuiPaper: {
        styleOverrides: {
          outlined: { borderColor: light ? '#E2E8F0' : '#334155' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 500 },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 500 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500 },
        },
      },
      MuiTextField: {
        defaultProps: {
          slotProps: {
            inputLabel: {
              shrink: true,
            },
          },
          inputProps: {
            autoComplete: 'off',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#818CF8',
            },
          },
          input: {
            // makes native date/time picker controls (calendar icon, clock) render
            // in the correct color scheme so they're visible on dark backgrounds
            colorScheme: mode,
          },
        },
      },
      MuiInputLabel: {
        defaultProps: {
          shrink: true,
        },
        styleOverrides: {
          root: { fontWeight: 500 },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: { borderColor: light ? '#E2E8F0' : '#334155' },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: { fontWeight: 600 },
        },
      },
      MuiTooltip: {
        defaultProps: { arrow: true },
      },
    },
  })
}

function ThemedApp({ children }: { children: React.ReactNode }) {
  const { resolvedMode } = useThemeMode()
  const theme = useMemo(() => createAppTheme(resolvedMode), [resolvedMode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={3}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {children}
      </SnackbarProvider>
    </ThemeProvider>
  )
}

export function Providers({
  children,
  initialThemeMode,
}: {
  children: React.ReactNode
  initialThemeMode?: import('@/lib/themeModeContext').ThemeModePreference
}) {
  return (
    <Provider store={store}>
      <ThemeModeProvider initialMode={initialThemeMode}>
        <ThemedApp>{children}</ThemedApp>
      </ThemeModeProvider>
    </Provider>
  )
}
