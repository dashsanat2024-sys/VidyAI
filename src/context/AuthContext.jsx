import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('vidyai_token') || '')
  const [me, setMe] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vidyai_user') || 'null') } catch { return null }
  })

  const login = useCallback((tok, user) => {
    setToken(tok)
    setMe(user)
    localStorage.setItem('vidyai_token', tok)
    localStorage.setItem('vidyai_user', JSON.stringify(user))
  }, [])

  const logout = useCallback(() => {
    setToken('')
    setMe(null)
    localStorage.removeItem('vidyai_token')
    localStorage.removeItem('vidyai_user')
  }, [])

  const value = useMemo(() => ({
    token, me, login, logout, isLoggedIn: !!token && !!me
  }), [token, me, login, logout])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
