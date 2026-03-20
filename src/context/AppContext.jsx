/**
 * AppContext.jsx
 * Central state: active panel, syllabi data, documents, and admin stats.
 * Handles data fetching and synchronization across all panels.
 */
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { apiGet } from '../utils/api'

const AppCtx = createContext(null)

export function AppProvider({ children }) {
  const { token, isLoggedIn } = useAuth()
  const [activePanel, setActivePanelState] = useState('dashboard')
  const [refreshKey,  setRefreshKey]       = useState(0)

  // Data layers
  const [syllabi,      setSyllabi]      = useState([])
  const [docs,         setDocs]         = useState([])
  const [adminStats,   setAdminStats]   = useState({})
  const [platformSettings, setPlatformSettings] = useState({ sidebar: {} })
  const [activeSyllabus, setActiveSyllabus] = useState(null)

  const setActivePanel = useCallback((id) => {
    setActivePanelState(id)
  }, [])

  const navigateTo = useCallback((id) => {
    setActivePanelState(id)
    if (typeof window !== 'undefined') {
      window.__appSetPanel = setActivePanelState
    }
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
      // 1. Load user syllabi
      const res1 = await apiGet('/curriculum', token)
      const data1 = await res1.json()
      setSyllabi(data1.syllabi || [])

      // 2. Load documents
      const res2 = await apiGet('/documents', token)
      const data2 = await res2.json()
      setDocs(data2.documents || [])

      // 3. Load admin stats (if applicable)
      const res3 = await apiGet('/admin/stats', token)
      const data3 = await res3.json()
      setAdminStats(data3.stats || {})

      // 4. Load platform settings
      const res4 = await apiGet('/admin/settings', token)
      if (res4.ok) {
        const data4 = await res4.json()
        setPlatformSettings(data4.settings || { sidebar: {} })
      }

      setRefreshKey(k => k + 1)
    } catch (err) {
      console.error('[AppContext] refreshData failed:', err)
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

  return (
    <AppCtx.Provider value={{
      activePanel, setActivePanel, navigateTo,
      syllabi, setSyllabi, addSyllabus, removeSyllabus,
      docs, setDocs,
      adminStats, setAdminStats,
      platformSettings, setPlatformSettings,
      activeSyllabus, setActiveSyllabus,
      refreshData, refreshKey
    }}>
      {children}
    </AppCtx.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
