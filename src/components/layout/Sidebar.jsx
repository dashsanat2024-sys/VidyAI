import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'

const NAV_GROUPS = {
  student: [
    {
      label: 'Core Learning',
      items: [
        { id: 'dashboard',            icon: '⊞',  label: 'Dashboard' },
        { id: 'curriculum',           icon: '🏛️',  label: 'Curriculum Hub' },
        { id: 'chat',                 icon: '💬',  label: 'AI Study Chat' },
        { id: 'interactive-practice', icon: '🎯',  label: 'Question Practice' },
      ]
    }
  ],
  teacher: [
    {
      label: 'Academic Hub',
      items: [
        { id: 'dashboard',            icon: '⊞',  label: 'Dashboard' },
        { id: 'curriculum',           icon: '🏛️',  label: 'Curriculum Hub' },
        { id: 'chat',                 icon: '💬',  label: 'AI Study Chat' },
        { id: 'qmaster',              icon: '🖋️',  label: 'Question Master' },
        { id: 'interactive-practice', icon: '🎯',  label: 'Question Practice' },
      ]
    },
    {
      label: 'Assessment',
      items: [
        { id: 'eval', icon: '📋', label: 'Evaluation Central' },
      ]
    }
  ],
  tutor: [
    {
      label: 'Academic Hub',
      items: [
        { id: 'dashboard',            icon: '⊞',  label: 'Dashboard' },
        { id: 'curriculum',           icon: '🏛️',  label: 'Curriculum Hub' },
        { id: 'chat',                 icon: '💬',  label: 'AI Study Chat' },
        { id: 'qmaster',              icon: '🖋️',  label: 'Question Master' },
        { id: 'interactive-practice', icon: '🎯',  label: 'Question Practice' },
      ]
    },
    {
      label: 'Assessment',
      items: [
        { id: 'eval', icon: '📋', label: 'Evaluation Central' },
      ]
    }
  ],
  parent: [
    {
      label: 'Parent Portal',
      items: [
        { id: 'dashboard', icon: '⊞',  label: 'Dashboard' },
        { id: 'analytics', icon: '📈',  label: 'Child Progress' },
        { id: 'eval',      icon: '📋',  label: 'Exam Reports' },
      ]
    }
  ],
  school_admin: [
    {
      label: 'Administration',
      items: [
        { id: 'dashboard',  icon: '⊞',  label: 'Dashboard' },
        { id: 'institute',  icon: '🏢',  label: 'Institute Manager' },
        { id: 'analytics',  icon: '📈',  label: 'Analytics' },
      ]
    },
    {
      label: 'Assessment',
      items: [
        { id: 'qmaster', icon: '🖋️', label: 'Question Master' },
        { id: 'eval',    icon: '📋', label: 'Evaluation Central' },
      ]
    }
  ],
  school: [
    {
      label: 'Administration',
      items: [
        { id: 'dashboard', icon: '⊞',  label: 'Dashboard' },
        { id: 'institute', icon: '🏢',  label: 'Institute Manager' },
        { id: 'analytics', icon: '📈',  label: 'Analytics' },
      ]
    },
    {
      label: 'Assessment',
      items: [
        { id: 'qmaster', icon: '🖋️', label: 'Question Master' },
        { id: 'eval',    icon: '📋', label: 'Evaluation Central' },
      ]
    }
  ],
  admin: [
    {
      label: 'Administration',
      items: [
        { id: 'dashboard',  icon: '⊞',  label: 'Dashboard' },
        { id: 'institute',  icon: '🏢',  label: 'User Management' },
        { id: 'analytics',  icon: '📈',  label: 'Analytics' },
      ]
    },
    {
      label: 'Content',
      items: [
        { id: 'curriculum', icon: '🏛️',  label: 'Curriculum Hub' },
        { id: 'qmaster',    icon: '🖋️',  label: 'Question Master' },
        { id: 'eval',       icon: '📋',  label: 'Evaluation Central' },
      ]
    }
  ],
}

const ROLE_LABELS = {
  student:     '🎒 Student',
  teacher:     '👩‍🏫 Teacher',
  tutor:       '📚 Tutor',
  parent:      '👨‍👩‍👧 Parent',
  school_admin:'🏫 School Admin',
  school:      '🏫 School',
  admin:       '⚙️ Admin',
}

export default function Sidebar({ isOpen, onClose }) {
  const { me, logout } = useAuth()
  const { activePanel, setActivePanel } = useApp()

  const role   = me?.role || 'student'
  const groups = NAV_GROUPS[role] || NAV_GROUPS.student

  const handleNav = (id) => {
    setActivePanel(id)
    if (window.innerWidth <= 768) onClose()
  }

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>

        {/* ── Brand Header ── */}
        <div className="sb-header">
          {/* Full horizontal logo — white version on dark background */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* PNG logo — use white-friendly version on dark sidebar */}
            <img
              src="/paarthivi-icon.png"
              alt="Paarthivi"
              style={{
                width: 36, height: 36,
                objectFit: 'contain',
                filter: 'brightness(0) invert(1)',  /* makes the coloured logo white */
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{
                fontFamily: 'var(--sans)', fontSize: 16, fontWeight: 800,
                color: '#fff', letterSpacing: '.3px', lineHeight: 1.1,
              }}>
                Paarthivi
              </div>
              <div style={{
                fontSize: 9, fontWeight: 600, color: 'rgba(167,139,250,.8)',
                letterSpacing: '.6px', textTransform: 'uppercase', marginTop: 1,
              }}>
                Smart Learning
              </div>
            </div>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="sb-nav">
          {groups.map(group => (
            <div key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              {group.items.map(item => (
                <div key={item.id}
                  className={`nav-item ${activePanel === item.id ? 'active' : ''}`}
                  onClick={() => handleNav(item.id)}>
                  <span className="nav-item-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </nav>

        {/* ── User footer ── */}
        <div className="sb-footer">
          <div className="sb-user">
            <div className="sb-av">{me?.name?.[0]?.toUpperCase() || 'U'}</div>
            <div style={{ flex:1, overflow:'hidden' }}>
              <div className="sb-username">{me?.name || 'User'}</div>
              <div className="sb-role">{ROLE_LABELS[role] || role}</div>
            </div>
          </div>
          <button className="btn-outline"
            style={{ width:'100%', color:'rgba(255,255,255,.8)', borderColor:'rgba(255,255,255,.2)', fontSize:12 }}
            onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>
      <div className={`sb-overlay ${isOpen ? 'show' : ''}`} onClick={onClose} />
    </>
  )
}
