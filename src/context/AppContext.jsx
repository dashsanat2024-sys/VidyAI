/**
 * AppContext.jsx
 * Central state: active panel, global refresh trigger.
 * Also exposes navigateTo(panelId) so any component can switch panels.
 */
import { createContext, useContext, useState, useCallback } from 'react'

const AppCtx = createContext(null)

export function AppProvider({ children }) {
  const [activePanel, setActivePanelState] = useState('dashboard')
  const [refreshKey,  setRefreshKey]       = useState(0)

  const setActivePanel = useCallback((id) => {
    setActivePanelState(id)
  }, [])

  // Expose a navigateTo alias for use inside components
  const navigateTo = useCallback((id) => {
    setActivePanelState(id)
    // Make the panel key available globally for non-React code (e.g. QMasterPanel)
    if (typeof window !== 'undefined') {
      window.__appSetPanel = setActivePanelState
    }
  }, [])

  const refreshData = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  // Expose setPanel globally once on mount
  if (typeof window !== 'undefined') {
    window.__appSetPanel = setActivePanelState
  }

  return (
    <AppCtx.Provider value={{ activePanel, setActivePanel, navigateTo, refreshData, refreshKey }}>
      {children}
    </AppCtx.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
