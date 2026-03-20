import { useApp } from '../../context/AppContext'
import Logo from '../shared/Logo'

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
        <Logo size={24} full={true} />
      </div>
    </div>
  )
}
