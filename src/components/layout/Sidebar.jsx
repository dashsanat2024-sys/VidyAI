import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'

// UK Curriculum removed from all roles per requirement 1
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
        <div className="sb-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="32" height="32" viewBox="0 0 48 48" fill="none" style={{ flexShrink:0 }}>
              <defs>
                <linearGradient id="sbG1" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#E8761A"/><stop offset="100%" stopColor="#F59E0B"/></linearGradient>
                <linearGradient id="sbG2" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#3730A3"/><stop offset="100%" stopColor="#6D28D9"/></linearGradient>
              </defs>
              <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#sbG1)"/>
              <rect x="9" y="10" width="13" height="26" rx="3" fill="white" opacity="0.95"/>
              <rect x="26" y="10" width="13" height="26" rx="3" fill="white" opacity="0.85"/>
              <rect x="22" y="9" width="4" height="28" rx="2" fill="url(#sbG2)" opacity="0.7"/>
              <text x="15.5" y="29" fontFamily="serif" fontSize="15" fontWeight="900" fill="#3730A3" textAnchor="middle">प</text>
              <circle cx="35" cy="12" r="3.5" fill="white" opacity="0.9"/>
              <circle cx="35" cy="12" r="1.5" fill="url(#sbG2)"/>
            </svg>
            <span style={{ fontFamily:'var(--serif)', fontSize:18, color:'#fff' }}>Parvidya</span>
          </div>
        </div>

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

        <div className="sb-footer">
          <div className="sb-user">
            <div className="sb-av">{me?.name?.[0]?.toUpperCase() || 'U'}</div>
            <div style={{ flex:1, overflow:'hidden' }}>
              <div className="sb-username">{me?.name || 'User'}</div>
              <div className="sb-role">{ROLE_LABELS[role] || role}</div>
            </div>
          </div>
          <button className="btn-outline"
            style={{ width:'100%', color:'#fff', borderColor:'rgba(255,255,255,.2)', fontSize:12 }}
            onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>
      <div className={`sb-overlay ${isOpen ? 'show' : ''}`} onClick={onClose} />
    </>
  )
}
