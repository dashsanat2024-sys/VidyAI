// ── QMaster Panel is now in QMasterPanel.jsx — re-export for compat ──────
export { QMasterPanel } from './QMasterPanel'

import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { apiGet, apiPost } from '../../utils/api'

// ── Role badge colours ─────────────────────────────────────────────────────
const ROLE_STYLE = {
  teacher:     { bg: '#d1fae5', color: '#065f46' },
  tutor:       { bg: '#d1fae5', color: '#065f46' },
  student:     { bg: 'var(--indigo3)', color: 'var(--indigo)' },
  parent:      { bg: '#fce7f3', color: '#9d174d' },
  school_admin:{ bg: '#e0f2fe', color: '#0369a1' },
  admin:       { bg: '#fee2e2', color: '#991b1b' },
}

// ── Institute Manager Panel ────────────────────────────────────────────────
export function InstitutePanel({ showToast }) {
  const { token } = useAuth()
  const { adminStats } = useApp()
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(false)
  const [filter,  setFilter]  = useState('all')
  const [editing, setEditing] = useState(null)   // user being edited
  const [editData,setEditData]= useState({})
  const [saving,  setSaving]  = useState(false)

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await apiGet('/admin/users', token)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch { }
    setLoading(false)
  }

  const startEdit = (u) => {
    setEditing(u.id)
    setEditData({ name: u.name, role: u.role, status: u.status || 'active', institution: u.institution || '' })
  }

  const saveEdit = async (uid) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editData)
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(prev => prev.map(u => u.id === uid ? { ...u, ...data.user } : u))
        setEditing(null)
        showToast && showToast('User updated', 'success')
      } else {
        const d = await res.json()
        showToast && showToast(d.error || 'Update failed', 'error')
      }
    } catch { showToast && showToast('Update failed', 'error') }
    setSaving(false)
  }

  const toggleStatus = async (u) => {
    const newStatus = u.status === 'suspended' ? 'active' : 'suspended'
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: newStatus } : x))
        showToast && showToast(`User ${newStatus}`, 'success')
      }
    } catch { }
  }

  const ALL_FILTER_TABS = ['all', 'teacher', 'tutor', 'student', 'parent', 'school_admin']
  const filtered = filter === 'all' ? users : users.filter(u => u.role === filter)

  return (
    <div className="panel active">
      <div style={{ maxWidth: 1060, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)', margin: 0 }}>🏢 Institute Manager</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
              {users.length} registered users · All sign-ups appear here automatically
            </p>
          </div>
          <button className="btn-saffron" onClick={fetchUsers} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            🔄 Refresh
          </button>
        </div>

        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card"><div className="stat-label">Teachers / Tutors</div><div className="stat-val">{adminStats?.teacher_count ?? users.filter(u => ['teacher','tutor'].includes(u.role)).length}</div></div>
          <div className="stat-card"><div className="stat-label">Students</div><div className="stat-val">{adminStats?.student_count ?? users.filter(u => u.role === 'student').length}</div></div>
          <div className="stat-card"><div className="stat-label">Parents</div><div className="stat-val">{adminStats?.parent_count ?? users.filter(u => u.role === 'parent').length}</div></div>
          <div className="stat-card"><div className="stat-label">Storage Used</div><div className="stat-val">{adminStats?.storage_gb ?? '0.0'} GB</div></div>
        </div>

        {/* Role filter tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--paper)', borderRadius: 12, padding: 4, marginBottom: 16, flexWrap: 'wrap' }}>
          {ALL_FILTER_TABS.map(r => (
            <button key={r} onClick={() => setFilter(r)}
              style={{ padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, fontFamily: 'var(--sans)',
                background: filter === r ? '#fff' : 'transparent',
                color: filter === r ? 'var(--text)' : 'var(--muted)',
                boxShadow: filter === r ? '0 1px 4px rgba(0,0,0,.1)' : 'none', transition: '.2s', textTransform: 'capitalize' }}>
              {r === 'all' ? `All (${users.length})` : `${r.replace('_', ' ')}s (${users.filter(u => u.role === r).length})`}
            </button>
          ))}
        </div>

        {loading && <div className="card" style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>}

        {!loading && filtered.length === 0 && (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>
              {filter === 'all'
                ? 'No users registered yet. Once users sign up, they will appear here.'
                : `No ${filter.replace('_',' ')}s found.`}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((u) => {
            const rs = ROLE_STYLE[u.role] || { bg: 'var(--paper)', color: 'var(--text)' }
            const isEditing = editing === u.id
            return (
              <div key={u.id} className="card"
                style={{ padding: '16px 20px', borderLeft: `4px solid ${u.status === 'suspended' ? 'var(--red)' : rs.color}`, opacity: u.status === 'suspended' ? 0.7 : 1 }}>

                {/* View mode */}
                {!isEditing && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {/* Avatar */}
                      <div style={{ width: 42, height: 42, borderRadius: '50%', background: rs.bg, display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0, border: `2px solid ${rs.color}40` }}>
                        {u.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{u.email}</div>
                        {u.institution && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>🏫 {u.institution}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {u.roll_number && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Roll: {u.roll_number}</span>}
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>Joined: {u.joined || '—'}</span>
                      <span style={{ padding: '3px 10px', borderRadius: 50, fontSize: 10, fontWeight: 800, background: rs.bg, color: rs.color, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                        {u.role.replace('_',' ')}
                      </span>
                      {u.status === 'suspended' && (
                        <span style={{ padding: '3px 10px', borderRadius: 50, fontSize: 10, fontWeight: 800, background: '#fee2e2', color: '#991b1b' }}>SUSPENDED</span>
                      )}
                      <button onClick={() => startEdit(u)}
                        style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--sans)', background: 'var(--indigo3)', color: 'var(--indigo)', border: '1px solid var(--indigo2)', borderRadius: 7, cursor: 'pointer' }}>
                        ✎ Edit
                      </button>
                      <button onClick={() => toggleStatus(u)}
                        style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--sans)', background: u.status === 'suspended' ? '#d1fae5' : '#fee2e2', color: u.status === 'suspended' ? '#065f46' : '#991b1b', border: 'none', borderRadius: 7, cursor: 'pointer' }}>
                        {u.status === 'suspended' ? '✓ Activate' : '⊘ Suspend'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Edit mode */}
                {isEditing && (
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--indigo)', marginBottom: 12 }}>✎ Editing: {u.email}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
                      <div className="fg" style={{ marginBottom: 0 }}>
                        <label>Full Name</label>
                        <input className="fi" value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} />
                      </div>
                      <div className="fg" style={{ marginBottom: 0 }}>
                        <label>Role</label>
                        <select className="fi sel" value={editData.role} onChange={e => setEditData(d => ({ ...d, role: e.target.value }))}>
                          {['student','teacher','tutor','parent','school_admin'].map(r => (
                            <option key={r} value={r}>{r.replace('_',' ')}</option>
                          ))}
                        </select>
                      </div>
                      <div className="fg" style={{ marginBottom: 0 }}>
                        <label>Status</label>
                        <select className="fi sel" value={editData.status} onChange={e => setEditData(d => ({ ...d, status: e.target.value }))}>
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                      <div className="fg" style={{ marginBottom: 0 }}>
                        <label>Institution</label>
                        <input className="fi" value={editData.institution} onChange={e => setEditData(d => ({ ...d, institution: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-submit indigo" style={{ width: 'auto', padding: '9px 24px', fontSize: 13 }}
                        onClick={() => saveEdit(u.id)} disabled={saving}>
                        {saving ? 'Saving…' : '✓ Save Changes'}
                      </button>
                      <button className="btn-outline" style={{ padding: '9px 18px', fontSize: 13 }}
                        onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Analytics Panel ────────────────────────────────────────────────────────
export function AnalyticsPanel({ showToast }) {
  const { token } = useAuth()
  const [exams, setExams] = useState([])
  const [selectedExam, setSelectedExam] = useState('')
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchExams() }, [])

  const fetchExams = async () => {
    try {
      const res = await apiGet('/questions', token)
      const data = await res.json()
      setExams(data.exams || [])
    } catch { }
  }

  const loadAnalytics = async (eid) => {
    if (!eid) return
    setLoading(true); setAnalytics(null)
    try {
      const res = await apiGet(`/exams/${eid}/analytics`, token)
      const d = await res.json()
      if (d.error) { showToast(d.error, 'error'); setLoading(false); return }
      setAnalytics(d)
    } catch { showToast('Analytics failed', 'error') }
    setLoading(false)
  }

  return (
    <div className="panel active">
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h3 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)', marginBottom: 20 }}>📈 School Analytics</h3>
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label>Select Exam to Analyse</label>
            <select className="fi sel" value={selectedExam} onChange={e => { setSelectedExam(e.target.value); loadAnalytics(e.target.value) }}>
              <option value="">— Choose Exam —</option>
              {exams.map(e => <option key={e.exam_id} value={e.exam_id}>{e.exam_id} · {e.syllabus_name || e.topic}</option>)}
            </select>
          </div>
        </div>
        {loading && <div className="card" style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>}
        {!loading && !analytics && !selectedExam && (
          <div className="card" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
            <h4 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)', marginBottom: 8 }}>Select an exam to view analytics</h4>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Class performance, learning gaps, and top performers will appear here.</p>
          </div>
        )}
        {analytics && (
          <>
            <div className="stats-grid" style={{ marginBottom: 20 }}>
              <div className="stat-card"><div className="stat-label">Submissions</div><div className="stat-val">{analytics.total_evaluations}</div></div>
              <div className="stat-card"><div className="stat-label">Class Average</div><div className="stat-val" style={{ color: 'var(--saffron)' }}>{analytics.class_average}%</div></div>
              <div className="stat-card"><div className="stat-label">Top Score</div><div className="stat-val" style={{ color: 'var(--green)' }}>{analytics.top_performers?.[0]?.percentage ?? '—'}%</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
              <div className="card" style={{ padding: 24 }}>
                <h4 style={{ marginBottom: 16 }}>📉 Learning Gaps</h4>
                {!analytics.learning_gaps?.length
                  ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>No significant gaps found.</p>
                  : analytics.learning_gaps.map((g, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#fffcf0', borderRadius: 8, borderLeft: '4px solid var(--saffron)', marginBottom: 8 }}>
                      <div><div style={{ fontWeight: 600, fontSize: 13 }}>Q#{g.index + 1}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>High failure rate</div></div>
                      <div style={{ fontWeight: 700, color: 'var(--red)' }}>{g.average}%</div>
                    </div>
                  ))}
              </div>
              <div className="card" style={{ padding: 24 }}>
                <h4 style={{ marginBottom: 16 }}>🏆 Top Performers</h4>
                {analytics.top_performers?.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span>{['🥇','🥈','🥉','✨','✨'][i] || '✨'}</span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>#{p.roll_no}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--green)' }}>{p.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
