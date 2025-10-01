import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import App from './App'
import { AuthProvider } from './modules/auth/AuthContext'
import SnackbarProvider from './modules/common/SnackbarProvider'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#9c27b0' }
  },
  shape: { borderRadius: 8 },
  components: { MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: 8 } } } },
  typography: { h1: { fontSize: '2rem', fontWeight: 600 }, h2: { fontSize: '1.6rem', fontWeight: 600 } }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SnackbarProvider>
            <App />
          </SnackbarProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
