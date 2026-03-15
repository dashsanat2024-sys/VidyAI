import { useApp } from '../../context/AppContext'

const PANEL_TITLES = {
  dashboard:            'Dashboard',
  curriculum:           'Curriculum Hub',
  'uk-curriculum':      'UK Curriculum',
  chat:                 'AI Study Chat',
  qgen:                 'Question Generator',
  eval:                 'Evaluation Central',
  qmaster:              'Question Master',
  'interactive-practice': 'Question Practice',
  institute:            'Institute Manager',
  analytics:            'Analytics',
  syllabus:             'Syllabus',
  practice:             'Practice',
}

export default function Topbar({ onMenuClick }) {
  const { activePanel, activeSyllabus } = useApp()
  const title = PANEL_TITLES[activePanel] || 'Page'

  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="mobile-menu-btn" onClick={onMenuClick}>☰</button>
        <h2>{title}</h2>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {activeSyllabus && (
          <div className="active-syl-pill">
            📚 <span>{activeSyllabus.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}
