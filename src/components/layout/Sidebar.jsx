/**
 * Sidebar.jsx — Paarthivi Smart Learning
 * Navigation sidebar matching the brand CSS (index.css).
 * Uses useApp() for panel switching, useAuth() for user info + role guards.
 */
import { useApp }  from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import Logo from '../shared/Logo'

const NAV = [
  {
    group: 'Learn',
    items: [
      { id: 'dashboard',            icon: '🏠', label: 'Dashboard'            },
      { id: 'chat',                 icon: '💬', label: 'AI Tutor'              },
      { id: 'curriculum',           icon: '📚', label: 'Curriculum Hub'        },
      { id: 'interactive-practice', icon: '🎯', label: 'Practice Mode'         },
    ],
  },
  {
    group: 'Teach',
    roles: ['teacher', 'tutor', 'school_admin', 'admin'],
    items: [
      { id: 'qmaster',  icon: '📋', label: 'Question Master' },
      { id: 'qgen',     icon: '✨', label: 'Quick QGen'      },
      { id: 'eval',     icon: '📊', label: 'Evaluate'        },
      { id: 'reports',  icon: '📈', label: 'Reports'         },
    ],
  },
  {
    group: 'Manage',
    roles: ['school_admin', 'admin'],
    items: [
      { id: 'institute', icon: '🏫', label: 'Institute'  },
      { id: 'analytics', icon: '📉', label: 'Analytics'  },
      { id: 'settings',  icon: '⚙️', label: 'Settings'   },
    ],
  },
]

export default function Sidebar({ isOpen, onClose }) {
  const { activePanel, setActivePanel, platformSettings } = useApp()
  const { me: user, logout }           = useAuth()
  const role = user?.role || 'student'

  const navigate = (id) => {
    setActivePanel(id)
    onClose?.()   // close mobile drawer
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sb-overlay${isOpen ? ' show' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar${isOpen ? ' open' : ''}`}>
        {/* Brand header */}
        <div className="sb-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Logo size={36} />
            <div>
              <div style={{ color: '#fff', fontWeight: '800', fontSize: '14px',
                lineHeight: 1.2 }}>Paarthivi</div>
              <div style={{ color: 'rgba(255,255,255,.45)', fontSize: '10px',
                textTransform: 'uppercase', letterSpacing: '1px' }}>Smart Learning</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sb-nav">
          {NAV.map(group => {
            // Role-gate entire group
            if (group.roles && !group.roles.includes(role)) return null
            
            // Check if ANY item in group is visible
            const visibleItems = group.items.filter(item => {
              if (item.roles && !item.roles.includes(role)) return false
              // Settings always visible for admin
              if (item.id === 'settings' && (role === 'admin' || role === 'school_admin')) return true
              // Check platform visibility settings
              if (platformSettings?.sidebar?.[item.id] === false) return false
              return true
            })

            if (visibleItems.length === 0) return null

            return (
              <div key={group.group}>
                <div className="nav-group-label">{group.group}</div>
                {visibleItems.map(item => {
                  const active = activePanel === item.id
                  return (
                    <div
                      key={item.id}
                      className={`nav-item${active ? ' active' : ''}`}
                      onClick={() => navigate(item.id)}
                    >
                      <span className="nav-item-icon">{item.icon}</span>
                      <span>{item.label}</span>
                      {item.badge && (
                        <span style={{
                          marginLeft: 'auto', background: '#ef4444', color: '#fff',
                          fontSize: '10px', fontWeight: '700', padding: '1px 6px',
                          borderRadius: '999px',
                        }}>{item.badge}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="sb-footer">
          <div className="sb-user">
            <div className="sb-av">
              {(user?.name || 'U').slice(0, 1).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sb-username">{user?.name || 'User'}</div>
              <div className="sb-role">{role}</div>
            </div>
          </div>
          <button
            style={{
              width: '100%', padding: '8px', borderRadius: '8px',
              background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)',
              color: 'rgba(255,255,255,.6)', fontSize: '12px', fontWeight: '600',
              cursor: 'pointer', fontFamily: 'inherit', transition: '.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.08)'}
            onClick={logout}
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
