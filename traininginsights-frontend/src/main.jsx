import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Theme moved to dynamic ThemeModeProvider
import { ThemeModeProvider } from './modules/common/ThemeContext'
import App from './App'
import { AuthProvider } from './modules/auth/AuthContext'
import SnackbarProvider from './modules/common/SnackbarProvider'


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeModeProvider>
          <SnackbarProvider>
            <App />
          </SnackbarProvider>
        </ThemeModeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
