/**
 * LangContext.jsx
 * Provides language state ('en' | 'or') and a t(key) helper across the entire app.
 * Persists the user's choice in localStorage.
 */
import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { translations } from '../i18n/translations'

const LangCtx = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('arthavi_lang') || 'en' } catch { return 'en' }
  })

  const setLang = useCallback((l) => {
    setLangState(l)
    try { localStorage.setItem('arthavi_lang', l) } catch {}
  }, [])

  const toggleLang = useCallback(() => {
    setLang(lang === 'en' ? 'or' : 'en')
  }, [lang, setLang])

  /** Look up a string key; falls back to English if missing in Odia */
  const t = useCallback((key) => {
    return translations[lang]?.[key] ?? translations.en[key] ?? key
  }, [lang])

  /** Get a translated data array (stats, features, steps) */
  const td = useCallback((key) => {
    return translations[lang]?.[key] ?? translations.en[key] ?? []
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, toggleLang, t, td }), [lang, setLang, toggleLang, t, td])

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>
}

export function useLang() {
  const ctx = useContext(LangCtx)
  if (!ctx) throw new Error('useLang must be used inside LangProvider')
  return ctx
}
