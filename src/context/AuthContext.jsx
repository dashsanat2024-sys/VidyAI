import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('vidyai_token') || '')
  const [me, setMe] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vidyai_user') || 'null') } catch { return null }
  })

  const login = (tok, user) => {
    setToken(tok)
    setMe(user)
    localStorage.setItem('vidyai_token', tok)
    localStorage.setItem('vidyai_user', JSON.stringify(user))
  }

  const logout = () => {
    setToken('')
    setMe(null)
    localStorage.removeItem('vidyai_token')
    localStorage.removeItem('vidyai_user')
  }

  return (
    <AuthContext.Provider value={{ token, me, login, logout, isLoggedIn: !!token && !!me }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
