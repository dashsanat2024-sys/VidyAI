import { useApp } from '../../context/AppContext'
import { useLang } from '../../context/LangContext'
import Logo from '../shared/Logo'
import LangToggle from '../shared/LangToggle'

export default function Topbar({ onMenuClick }) {
  const { activePanel, activeSyllabus } = useApp()
  const { t } = useLang()
  const title = t(`panel.${activePanel}`) || 'Page'

  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="mobile-menu-btn" onClick={onMenuClick} aria-label="Open menu">☰</button>
        <h2 style={{ margin: 0 }}>{title}</h2>
      </div>

      <div style={{ flex: 1 }} />

      {/* Active syllabus pill */}
      {activeSyllabus && (
        <div className="active-syl-pill">
          📚 <span>{activeSyllabus.name}</span>
        </div>
      )}

      {/* Language toggle */}
      <LangToggle />

      {/* Arthavi wordmark in topbar (desktop) */}
      <div className="topbar-brand" style={{
        display: 'flex', alignItems: 'center', gap: 8,
        paddingLeft: 16, borderLeft: '1px solid rgba(107,82,176,.15)',
        marginLeft: 8,
      }}>
        <Logo size={50} full={true} />
      </div>
    </div>
  )
}
