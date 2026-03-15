import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import LandingPage from './pages/LandingPage'
import AppPage from './pages/AppPage'

function Root() {
  const { isLoggedIn } = useAuth()
  return isLoggedIn
    ? <AppProvider><AppPage /></AppProvider>
    : <LandingPage />
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  )
}
