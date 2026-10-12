import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './AuthContext'
import './index.css'
import App from './App.jsx'

localStorage.removeItem('daily_7day_challenge')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
