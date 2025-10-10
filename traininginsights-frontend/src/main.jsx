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

// Proactively register the service worker at app startup so Safari/iOS PWA has it ready
if ('serviceWorker' in navigator) {
  // Avoid registering during local dev with Vite HMR unless desired; adjust if needed
  const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  // Register in all environments since push needs an SW; harmless if duplicated later
  navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
    .then(reg => {
      // Wait until it's active/ready
      return navigator.serviceWorker.ready.then(() => reg)
    })
    .then(() => { try { console.log('[App] Service worker registered and ready'); } catch(e){} })
    .catch(err => { try { console.warn('[App] Service worker registration failed', err); } catch(e){} })
}
