import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'

const ThemeModeContext = createContext({ mode: 'system', resolvedMode: 'light', cycleMode: () => {} })

function detectSystemMode(){
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const STORAGE_KEY = 'ti_theme_mode'

export function ThemeModeProvider({ children }){
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'system' } catch { return 'system' }
  })
  const [systemMode, setSystemMode] = useState(detectSystemMode())

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => setSystemMode(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, mode) } catch {}
  }, [mode])

  const resolvedMode = mode === 'system' ? systemMode : mode

  const cycleMode = () => {
    setMode(prev => prev === 'system' ? 'light' : prev === 'light' ? 'dark' : 'system')
  }

  const theme = useMemo(() => createTheme({
    palette: {
      mode: resolvedMode,
      primary: { main: '#1976d2' },
      secondary: { main: '#9c27b0' }
    },
    shape: { borderRadius: 8 },
    components: { MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: 8 } } } },
    typography: { h1: { fontSize: '2rem', fontWeight: 600 }, h2: { fontSize: '1.6rem', fontWeight: 600 } }
  }), [resolvedMode])

  const value = useMemo(() => ({ mode, resolvedMode, cycleMode }), [mode, resolvedMode])

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}

export function useThemeMode(){
  return useContext(ThemeModeContext)
}
