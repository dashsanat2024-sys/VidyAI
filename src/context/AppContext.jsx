import React, { createContext, useContext, useState, useCallback } from 'react'
import { apiGet } from '../utils/api'
import { useAuth } from './AuthContext'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const { token, me, logout } = useAuth()
  const [docs,          setDocs]          = useState([])
  const [syllabi,       setSyllabi]       = useState([])
  const [activeSyllabus,setActiveSyllabusState] = useState(null)
  const [adminStats,    setAdminStats]    = useState(null)
  const [activePanel,   setActivePanel]   = useState('dashboard')

  // ── Add a single new syllabus to the list (called after loadChapters) ──
  // Prevents full reload — other panels see the new entry immediately.
  const addSyllabus = useCallback((syl) => {
    if (!syl?.id) return
    setSyllabi(prev => {
      const exists = prev.find(s => s.id === syl.id)
      if (exists) {
        // Update in place (chapters may have been refreshed)
        return prev.map(s => s.id === syl.id ? { ...s, ...syl } : s)
      }
      return [...prev, syl]
    })
    setActiveSyllabusState(syl)
  }, [])

  // ── Set active syllabus (accepts object or id string) ─────────────────
  const setActiveSyllabus = useCallback((sylOrId) => {
    if (!sylOrId) { setActiveSyllabusState(null); return }
    if (typeof sylOrId === 'object') {
      // Make sure it is also in the syllabi list
      setSyllabi(prev => {
        const exists = prev.find(s => s.id === sylOrId.id)
        if (!exists) return [...prev, sylOrId]
        return prev.map(s => s.id === sylOrId.id ? { ...s, ...sylOrId } : s)
      })
      setActiveSyllabusState(sylOrId)
      return
    }
    // It is a string id — look up in current list
    setSyllabi(prev => {
      const found = prev.find(s => s.id === sylOrId)
      if (found) setActiveSyllabusState(found)
      return prev
    })
  }, [])

  // ── Remove a syllabus from local state ────────────────────────────────
  const removeSyllabus = useCallback((sid) => {
    setSyllabi(prev => prev.filter(s => s.id !== sid))
    setActiveSyllabusState(prev => (prev?.id === sid ? null : prev))
  }, [])

  // ── Full refresh from server ──────────────────────────────────────────
  const refreshData = useCallback(async () => {
    if (!token || !me) return
    try {
      const [dRes, sRes] = await Promise.all([
        apiGet('/documents', token),
        apiGet('/syllabi',   token),
      ])

      if (dRes.status === 401 || sRes.status === 401) { logout(); return }

      const [dData, sData] = await Promise.all([dRes.json(), sRes.json()])

      setDocs(dData.documents || [])

      // Strict client-side guard: only show this user's own syllabi
      const newSyllabi = (sData.syllabi || []).filter(s =>
        !s.owner_id || s.owner_id === me.id
      )
      setSyllabi(newSyllabi)

      // Set first syllabi as active if nothing active yet
      if (newSyllabi.length && !activeSyllabus) {
        setActiveSyllabusState(newSyllabi[0])
      }

      if (me?.role === 'school_admin' || me?.role === 'admin') {
        const aRes = await apiGet('/admin/stats', token).catch(() => null)
        if (aRes?.ok) setAdminStats(await aRes.json())
      }
    } catch (e) {
      console.error('refreshData error:', e)
    }
  }, [token, me, activeSyllabus, logout])

  return (
    <AppContext.Provider value={{
      docs, setDocs,
      syllabi, setSyllabi,
      activeSyllabus,
      setActiveSyllabus,
      addSyllabus,
      removeSyllabus,
      adminStats,
      activePanel, setActivePanel,
      refreshData,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
