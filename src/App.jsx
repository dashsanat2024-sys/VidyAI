import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { LangProvider } from './context/LangContext'
import LandingPage from './pages/LandingPage'
import AppPage from './pages/AppPage'
import PaymentModal from './components/PaymentModal'
import { API_BASE } from './utils/api'

function Root() {
  const { isLoggedIn, token, me } = useAuth()
  const [paymentPlan, setPaymentPlan] = useState(null)

  const forceLanding =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('landing') === '1'

  // After login, check if a plan was pending from the landing page
  useEffect(() => {
    if (isLoggedIn) {
      const raw = sessionStorage.getItem('arthavi_pending_plan')
      if (raw) {
        try { setPaymentPlan(JSON.parse(raw)) } catch {}
        sessionStorage.removeItem('arthavi_pending_plan')
      }
    }
  }, [isLoggedIn])

  const openPayment = (plan) => setPaymentPlan(plan)

  return (
    <>
      {forceLanding
        ? <LandingPage onUpgrade={openPayment} />
        : isLoggedIn
          ? <AppProvider><AppPage onUpgrade={openPayment} /></AppProvider>
          : <LandingPage onUpgrade={openPayment} />
      }
      {paymentPlan && token && (
        <PaymentModal
          plan={paymentPlan}
          token={token}
          userEmail={me?.email || ''}
          userName={me?.name || ''}
          onClose={() => setPaymentPlan(null)}
          onSuccess={() => setPaymentPlan(null)}
        />
      )}
    </>
  )
}

export default function App() {
  // Warm up the Render backend on app load so it's ready when user hits Evaluate
  useEffect(() => {
    fetch(`${API_BASE}/health`).catch(() => {})
  }, [])

  return (
    <LangProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </LangProvider>
  )
}
