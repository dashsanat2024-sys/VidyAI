/**
 * Sidebar.jsx — Arthavi Smart Learning
 * Role-based navigation: student / teacher / parent / institute_admin / admin
 *
 * ROLE JOURNEYS (by design):
 *   Student       → Learn: Curriculum → AI Tutor → Practice → Goal → Grow → Plan
 *   Teacher       → Create → Assign → Evaluate → Report  (tool dashboard feel)
 *   Parent        → Reports → Progress → Alerts  (clarity + assurance)
 *   Institute     → Manage teachers/students, bulk eval, analytics
 *   Admin         → Full system control
 */
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import Logo from '../shared/Logo'

// ─── Role→ which item IDs are visible (ordered) ────────────────────────────
const ROLE_NAV = {
  student: [
    {
      group: 'Learn', items: [
        { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
        { id: 'curriculum', icon: '📚', label: 'Curriculum Hub', badge: 'Start Here' },
        { id: 'chat', icon: '💬', label: 'AI Tutor' },
        { id: 'interactive-practice', icon: '🎯', label: 'Practice Mode' },
      ]
    },
    {
      group: 'Goal', items: [
        { id: 'senior-prep', icon: '🚀', label: 'Entrance Prep' },
        { id: 'degree-hub', icon: '🏛️', label: 'Degree Hub' },
      ]
    },
    {
      group: 'Grow', items: [
        { id: 'free-courses', icon: '🎓', label: 'SkillUp Hub' },
        { id: 'career-path', icon: '🧭', label: 'Career Compass' },
      ]
    },
  ],

  teacher: [
    {
      group: 'Create', items: [
        { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
        { id: 'qgen', icon: '✨', label: 'Quick QGen', badge: 'Fast' },
        { id: 'qmaster', icon: '📋', label: 'Question Master' },
      ]
    },
    {
      group: 'Teach', items: [
        { id: 'curriculum', icon: '📚', label: 'Curriculum Hub' },
        { id: 'interactive-practice', icon: '🎯', label: 'Assign Practice' },
      ]
    },
    {
      group: 'Evaluate', items: [
        { id: 'eval', icon: '📊', label: 'Evaluate' },
        { id: 'reports', icon: '📈', label: 'Reports' },
      ]
    },
  ],

  parent: [
    {
      group: 'My Child', items: [
        { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
        { id: 'reports', icon: '📈', label: 'Progress Reports', badge: 'Key' },
        { id: 'analytics', icon: '📉', label: 'Performance Charts' },
      ]
    },
    {
      group: 'Support', items: [
        { id: 'chat', icon: '💬', label: 'AI Study Support' },
      ]
    },
  ],

  institute_admin: [
    {
      group: 'Overview', items: [
        { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
        { id: 'institute', icon: '🏫', label: 'Campus Directory' },
        { id: 'analytics', icon: '📉', label: 'School Analytics' },
      ]
    },
    {
      group: 'Academics', items: [
        { id: 'qmaster', icon: '📋', label: 'Question Master' },
        { id: 'eval', icon: '📊', label: 'Bulk Evaluate' },
        { id: 'reports', icon: '📈', label: 'School Reports' },
      ]
    },
    {
      group: 'Manage', items: [
        { id: 'visitor-log', icon: '👥', label: 'Visitor Log' },
        { id: 'quota', icon: '🛡', label: 'Quota Manager' },
        { id: 'settings', icon: '⚙️', label: 'Settings' },
      ]
    },
  ],

  admin: [
    {
      group: 'Overview', items: [
        { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
        { id: 'analytics', icon: '📉', label: 'Analytics' },
        { id: 'visitor-log', icon: '👥', label: 'Visitor Logs' },
      ]
    },
    {
      group: 'Learn', items: [
        { id: 'curriculum', icon: '📚', label: 'Curriculum Hub' },
        { id: 'chat', icon: '💬', label: 'AI Tutor' },
        { id: 'interactive-practice', icon: '🎯', label: 'Practice Mode' },
      ]
    },
    {
      group: 'Grow', items: [
        { id: 'free-courses', icon: '🎓', label: 'SkillUp Hub' },
        { id: 'career-path', icon: '🧭', label: 'Career Compass' },
        { id: 'degree-hub', icon: '🏛️', label: 'Degree Hub' },
        { id: 'senior-prep', icon: '🚀', label: 'Entrance Prep' },
      ]
    },
    {
      group: 'Institutes', items: [
        { id: 'institute', icon: '🏫', label: 'Institute Manager' },
        { id: 'quota', icon: '🛡', label: 'Quota Manager' },
      ]
    },
    {
      group: 'Academics', items: [
        { id: 'qmaster', icon: '📋', label: 'Question Master' },
        { id: 'qgen', icon: '✨', label: 'Quick QGen' },
        { id: 'eval', icon: '📊', label: 'Evaluate' },
        { id: 'reports', icon: '📈', label: 'Reports' },
      ]
    },
    {
      group: 'System', items: [
        { id: 'finance', icon: '💹', label: 'Finance Manager', badge: 'New' },
        { id: 'settings', icon: '⚙️', label: 'Settings' },
      ]
    },
  ],
}

export default function Sidebar({ isOpen, onClose, onUpgrade }) {
  const { activePanel, setActivePanel, platformSettings } = useApp()
  const { me: user, logout } = useAuth()
  const role = user?.role || 'student'

  const navigate = (id) => {
    setActivePanel(id)
    onClose?.()
  }

  const groups = ROLE_NAV[role] || ROLE_NAV.student

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
            <Logo size={56} />
            <div>
              <div style={{
                color: '#fff', fontWeight: '800', fontSize: '14px',
                lineHeight: 1.2
              }}>Arthavi</div>
              <div style={{
                color: 'rgba(255,255,255,.45)', fontSize: '10px',
                textTransform: 'uppercase', letterSpacing: '1px'
              }}>Smart Learning</div>
            </div>
          </div>
        </div>

        {/* Role badge */}
        <div style={{ padding: '6px 16px 2px', marginBottom: 2 }}>
          <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: 100,
            fontSize: 10, fontWeight: 700, letterSpacing: '.05em',
            background: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.7)',
            textTransform: 'uppercase',
          }}>
            {{
              student: '👨‍🎓 Student',
              teacher: '🧑‍🏫 Teacher',
              parent: '👨‍👩‍👧 Parent',
              institute_admin: '🏫 Institute',
              admin: '⚙️ Admin',
            }[role] || role}
          </span>
        </div>

        {/* Navigation */}
        <nav className="sb-nav">
          {groups.map(group => {
            const visibleItems = group.items.filter(item => {
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
          {role === 'student' && !user?.plan && onUpgrade && (
            <button
              onClick={() => onUpgrade({ id: 'student-pro' })}
              style={{
                width: '100%', padding: '9px', borderRadius: '8px', marginBottom: 8,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                border: 'none', color: '#fff', fontSize: '12px', fontWeight: '700',
                cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.3,
              }}
            >
              ⚡ Upgrade to Pro — ₹149/mo
            </button>
          )}
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
