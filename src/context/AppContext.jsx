/**
 * AppContext.jsx
 * Central state: active panel, syllabi data, documents, and admin stats.
 * Handles data fetching and synchronization across all panels.
 */
import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { useAuth } from './AuthContext'
import { apiGet } from '../utils/api'

const AppCtx = createContext(null)
export function AppProvider({ children }) {
  const { token, me, isLoggedIn } = useAuth()
  const [activePanel, setActivePanelState] = useState('dashboard')
  const [refreshKey, setRefreshKey] = useState(0)

  // Data layers
  const [syllabi, setSyllabi] = useState([])
  const [docs, setDocs] = useState([])
  const [adminStats, setAdminStats] = useState({})
  const [platformSettings, setPlatformSettings] = useState({ sidebar: {} })
  const [activeSyllabus, setActiveSyllabus] = useState(null)

  const setActivePanel = useCallback((id) => {
    setActivePanelState(id)
  }, [])

  const navigateTo = useCallback((id) => {
    setActivePanelState(id)
  }, [])

  const addSyllabus = useCallback((syl) => {
    setSyllabi(prev => {
      if (prev.find(x => x.id === syl.id)) return prev
      return [...prev, syl]
    })
    setActiveSyllabus(syl)
  }, [])

  const removeSyllabus = useCallback((id) => {
    setSyllabi(prev => prev.filter(s => s.id !== id))
    if (activeSyllabus?.id === id) setActiveSyllabus(null)
  }, [activeSyllabus])

  const refreshData = useCallback(async () => {
    if (!token) return
    try {
      const isAdmin = me?.role === 'admin'

      // Fire all fetches in parallel instead of sequentially
      const [data1, data2, data3, data4] = await Promise.all([
        apiGet('/syllabi', token),
        apiGet('/documents', token),
        isAdmin ? apiGet('/admin/stats', token) : Promise.resolve({}),
        apiGet('/settings', token),
      ])

      setSyllabi(data1.syllabi || [])
      setDocs(data2.documents || [])
      if (isAdmin) setAdminStats(data3.stats || {})
      setPlatformSettings(data4.settings || { sidebar: {} })

    } catch (err) {
      console.error('[AppContext] refreshData failed:', err)
    }
  }, [token, me])

  const refreshSettings = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiGet('/settings', token)
      setPlatformSettings(data.settings || { sidebar: {} })
    } catch (err) {
      console.error('[AppContext] refreshSettings failed:', err)
    }
  }, [token])

  // Initial load when logged in
  useEffect(() => {
    if (isLoggedIn) refreshData()
  }, [isLoggedIn, refreshData])

  // Expose setPanel globally for non-React code
  if (typeof window !== 'undefined') {
    window.__appSetPanel = setActivePanelState
  }

  // Memoize context value to prevent re-rendering all consumers on every state change
  const ctxValue = useMemo(() => ({
    activePanel, setActivePanel, navigateTo,
    syllabi, setSyllabi, addSyllabus, removeSyllabus,
    docs, setDocs,
    adminStats, setAdminStats,
    platformSettings, setPlatformSettings,
    activeSyllabus, setActiveSyllabus,
    refreshData, refreshSettings, refreshKey
  }), [
    activePanel, setActivePanel, navigateTo,
    syllabi, addSyllabus, removeSyllabus,
    docs,
    adminStats,
    platformSettings,
    activeSyllabus,
    refreshData, refreshSettings, refreshKey
  ])

  return (
    <AppCtx.Provider value={ctxValue}>
      {children}
    </AppCtx.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
