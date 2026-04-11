import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import LandingPage from './pages/LandingPage'
import AppPage from './pages/AppPage'
import { API_BASE } from './utils/api'

function Root() {
  const { isLoggedIn } = useAuth()
  const forceLanding =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('landing') === '1'

  if (forceLanding) return <LandingPage />

  return isLoggedIn
    ? <AppProvider><AppPage /></AppProvider>
    : <LandingPage />
}

export default function App() {
  // Warm up the Render backend on app load so it's ready when user hits Evaluate
  useEffect(() => {
    fetch(`${API_BASE}/health`).catch(() => {})
  }, [])

  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  )
}
