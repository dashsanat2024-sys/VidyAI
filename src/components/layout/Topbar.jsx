import { useApp } from '../../context/AppContext'

const PANEL_TITLES = {
  dashboard:              'Dashboard',
  curriculum:             'Curriculum Hub',
  chat:                   'AI Study Chat',
  qgen:                   'Question Generator',
  eval:                   'Evaluation Central',
  qmaster:                'Question Master',
  'interactive-practice': 'Question Practice',
  institute:              'Institute Manager',
  analytics:              'Analytics',
  syllabus:               'Syllabus',
  practice:               'Practice',
}

export default function Topbar({ onMenuClick }) {
  const { activePanel, activeSyllabus } = useApp()
  const title = PANEL_TITLES[activePanel] || 'Page'

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

      {/* Paarthivi wordmark in topbar (desktop) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        paddingLeft: 16, borderLeft: '1px solid #EDE9FE',
        marginLeft: 8,
      }}>
        <img src="/paarthivi-icon.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
        <span style={{
          fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 13,
          color: '#4C1D95', letterSpacing: '.2px',
        }}>
          Paarthivi
        </span>
      </div>
    </div>
  )
}
