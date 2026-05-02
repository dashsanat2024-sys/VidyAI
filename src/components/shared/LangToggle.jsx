/**
 * LangToggle.jsx
 * A small pill toggle button that switches between English and Odia.
 * Works on both dark (landing page) and light (app) backgrounds.
 *
 * Props:
 *   variant: 'light' (default, dark text on light bg — for nav/topbar)
 *            'dark'  (light text on dark bg — for dark backgrounds)
 */
import { useLang } from '../../context/LangContext'

export default function LangToggle({ variant = 'light' }) {
  const { lang, toggleLang, t } = useLang()

  const isDark = variant === 'dark'

  const containerStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0,
    borderRadius: 20,
    overflow: 'hidden',
    border: isDark ? '1.5px solid rgba(255,255,255,0.35)' : '1.5px solid rgba(107,82,176,0.3)',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    cursor: 'pointer',
    userSelect: 'none',
  }

  const baseBtn = {
    padding: '4px 10px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 12,
    fontFamily: 'inherit',
    transition: 'background 0.15s, color 0.15s',
    lineHeight: 1.4,
    whiteSpace: 'nowrap',
  }

  const activeStyle = isDark
    ? { background: 'rgba(255,255,255,0.9)', color: '#4A3890' }
    : { background: '#6B52B0', color: '#fff' }

  const inactiveStyle = isDark
    ? { background: 'transparent', color: 'rgba(255,255,255,0.75)' }
    : { background: 'transparent', color: '#6B52B0' }

  return (
    <div style={containerStyle} title="Switch language / ଭାଷା ବଦଳାନ୍ତୁ">
      <button
        style={{ ...baseBtn, ...(lang === 'en' ? activeStyle : inactiveStyle) }}
        onClick={() => lang !== 'en' && toggleLang()}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        style={{ ...baseBtn, ...(lang === 'or' ? activeStyle : inactiveStyle) }}
        onClick={() => lang !== 'or' && toggleLang()}
        aria-label="ଓଡ଼ିଆ ଭାଷା ବଛନ୍ତୁ"
      >
        {t('lang.toggle_label')}
      </button>
    </div>
  )
}
