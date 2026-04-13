/**
 * AdminPanel.jsx — Quota & Usage Management
 * Tabs: Role Quotas | Institution Overrides | User Overrides | Usage Report
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuth }  from '../../context/AuthContext'
import { apiGet, API_BASE }   from '../../utils/api'

// ── helpers ──────────────────────────────────────────────────────────────────
const ROLES = ['student', 'parent', 'teacher', 'institute_admin', 'admin']
const ROLE_LABEL = {
  student: 'Student', parent: 'Parent', teacher: 'Teacher',
  institute_admin: 'Inst. Admin', admin: 'Platform Admin',
}
const ROLE_COLOR = {
  student: '#3730a3', parent: '#9d174d', teacher: '#065f46',
  institute_admin: '#0369a1', admin: '#991b1b',
}

const fmtLimit = (v) => {
  if (v === -1 || v == null) return '∞'
  if (v === 0)  return 'Blocked'
  return String(v)
}

const inputStyle = {
  width: 64, padding: '4px 6px', borderRadius: 6,
  border: '1.5px solid #c7d2fe', fontSize: 12, textAlign: 'center',
  outline: 'none', fontFamily: 'inherit',
}

async function apiFetch(url, token, method = 'GET', body = null) {
  // url is like '/api/admin/quota-config'; strip the /api prefix since API_BASE includes it
  const fullUrl = API_BASE + url.replace(/^\/api/, '')
  const res = await fetch(fullUrl, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

// ── small reusable components ─────────────────────────────────────────────────
function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{
            padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13,
            cursor: 'pointer', border: 'none', fontFamily: 'inherit',
            background: active === t.id ? 'var(--indigo)' : '#eef2ff',
            color:      active === t.id ? '#fff' : 'var(--indigo)',
            transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5,
          }}>
          {t.label}
          {t.badge && (
            <span style={{
              background: active === t.id ? 'rgba(255,255,255,.25)' : '#6366f1',
              color: '#fff', fontSize: 9, fontWeight: 800,
              padding: '1px 5px', borderRadius: 999,
            }}>{t.badge}</span>
          )}
        </button>
      ))}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#64748b', textTransform: 'uppercase',
                    letterSpacing: '.05em', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

function SaveBtn({ saving, onClick, label = 'Save Changes' }) {
  return (
    <button onClick={onClick} disabled={saving}
      style={{ padding: '8px 20px', borderRadius: 8, background: 'var(--indigo)',
               color: '#fff', border: 'none', fontWeight: 700, fontSize: 13,
               cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
               opacity: saving ? .6 : 1 }}>
      {saving ? '⏳ Saving…' : label}
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  TAB 0 — Plan Presets
// ══════════════════════════════════════════════════════════════════════════════
function PlanPresetsTab({ config, token, callerRole, callerInst, showToast, onSaved }) {
  const [selectedRole, setSelectedRole] = useState('student')
  const [selectedInst, setSelectedInst] = useState(callerRole === 'institute_admin' ? callerInst : '')
  const [savingKey, setSavingKey] = useState('')

  const rolePresets = config?.quota_presets?.role_defaults || {}
  const instPresets = config?.quota_presets?.institution || {}
  const instOptions = Object.keys(config?.institution_overrides || {})

  const applyPreset = async (presetId, target) => {
    setSavingKey(`${presetId}:${target.type}`)
    try {
      await apiFetch('/api/admin/quota-presets/apply', token, 'POST', {
        preset_id: presetId,
        target,
      })
      showToast?.('Preset applied. You can fine-tune values in manual tabs.', 'success')
      onSaved?.()
    } catch (e) {
      showToast?.(e.message, 'error')
    }
    setSavingKey('')
  }

  return (
    <div>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
        Apply pricing-linked quota presets in one click, then fine-tune in{' '}
        <strong>Role Quotas</strong>, <strong>Institution Overrides</strong>, or{' '}
        <strong>User Overrides</strong>.
      </p>

      {callerRole !== 'admin' && (
        <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: 8,
                      fontSize: 13, color: '#1d4ed8', marginBottom: 16 }}>
          You can apply institution presets for your own institution and still edit quotas manually.
        </div>
      )}

      {callerRole === 'admin' && (
        <Section title="Role-Based Presets">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Apply to role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{ ...inputStyle, width: 'auto', textAlign: 'left', padding: '5px 8px' }}
            >
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {Object.entries(rolePresets).map(([id, preset]) => (
              <div key={id} className="card" style={{ padding: 14 }}>
                <div style={{ fontWeight: 700, color: 'var(--indigo)', marginBottom: 6 }}>{preset.label}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>{preset.summary}</div>
                <button
                  onClick={() => applyPreset(id, { type: 'role_default', role: selectedRole })}
                  disabled={Boolean(savingKey)}
                  style={{ padding: '6px 12px', borderRadius: 6, background: 'var(--indigo)', color: '#fff',
                           border: 'none', fontWeight: 600, fontSize: 12, cursor: savingKey ? 'not-allowed' : 'pointer',
                           fontFamily: 'inherit', opacity: savingKey ? 0.7 : 1 }}
                >
                  {savingKey === `${id}:role_default` ? 'Applying...' : `Apply to ${ROLE_LABEL[selectedRole]}`}
                </button>
              </div>
            ))}
            {Object.keys(rolePresets).length === 0 && (
              <div style={{ color: '#94a3b8', fontSize: 13 }}>No role presets available.</div>
            )}
          </div>
        </Section>
      )}

      <Section title="Institution Presets">
        {callerRole === 'admin' ? (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Institution</label>
            <input
              style={{ ...inputStyle, width: 240, textAlign: 'left' }}
              value={selectedInst}
              onChange={(e) => setSelectedInst(e.target.value)}
              placeholder="Type institution name"
              list="quota-inst-list"
            />
            <datalist id="quota-inst-list">
              {instOptions.map(inst => <option key={inst} value={inst} />)}
            </datalist>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
            Target institution: <strong>{callerInst || 'Not set'}</strong>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {Object.entries(instPresets).map(([id, preset]) => (
            <div key={id} className="card" style={{ padding: 14 }}>
              <div style={{ fontWeight: 700, color: 'var(--indigo)', marginBottom: 6 }}>{preset.label}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>{preset.summary}</div>
              <button
                onClick={() => {
                  const instTarget = callerRole === 'institute_admin' ? callerInst : selectedInst.trim()
                  if (!instTarget) {
                    showToast?.('Select an institution first', 'error')
                    return
                  }
                  applyPreset(id, { type: 'institution', institution: instTarget })
                }}
                disabled={Boolean(savingKey)}
                style={{ padding: '6px 12px', borderRadius: 6, background: '#0f766e', color: '#fff',
                         border: 'none', fontWeight: 600, fontSize: 12, cursor: savingKey ? 'not-allowed' : 'pointer',
                         fontFamily: 'inherit', opacity: savingKey ? 0.7 : 1 }}
              >
                {savingKey === `${id}:institution` ? 'Applying...' : 'Apply to Institution'}
              </button>
            </div>
          ))}
          {Object.keys(instPresets).length === 0 && (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>No institution presets available.</div>
          )}
        </div>
      </Section>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  TAB 1 — Role Defaults
// ══════════════════════════════════════════════════════════════════════════════
function RoleDefaultsTab({ config, features, canEdit, token, onSaved, showToast }) {
  const [edits,  setEdits]  = useState({})   // {role: {feature: value}}
  const [saving, setSaving] = useState(false)

  const roleDefaults = config?.role_defaults || {}
  const featureKeys  = Object.keys(features || {})

  // Track which cells have been edited
  const getVal = (role, feat) =>
    edits[role]?.[feat] !== undefined ? edits[role][feat]
      : String(roleDefaults[role]?.[feat] ?? 0)

  const setVal = (role, feat, val) =>
    setEdits(prev => ({
      ...prev,
      [role]: { ...(prev[role] || {}), [feat]: val },
    }))

  const handleSave = async () => {
    setSaving(true)
    try {
      // Convert strings to ints; 'unlimited' or empty → -1; 'blocked' or '0' → 0
      const payload = {}
      for (const [role, feats] of Object.entries(edits)) {
        payload[role] = {}
        for (const [feat, raw] of Object.entries(feats)) {
          const v = String(raw).trim().toLowerCase()
          payload[role][feat] = (v === '' || v === 'unlimited' || v === '∞' || v === '-1')
            ? -1 : (v === 'blocked' || v === '0') ? 0 : parseInt(v, 10)
        }
      }
      await apiFetch('/api/admin/quota-config/role-defaults', token, 'PATCH', payload)
      setEdits({})
      showToast?.('Role quotas saved', 'success')
      onSaved?.()
    } catch (e) { showToast?.(e.message, 'error') }
    setSaving(false)
  }

  const hasEdits = Object.keys(edits).length > 0

  return (
    <div>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
        Set default daily quotas per role. <strong>-1 or ∞</strong> = unlimited.{' '}
        <strong>0</strong> = blocked. Changes apply immediately to all users (unless overridden).
      </p>
      {!canEdit && (
        <div style={{ padding: '10px 14px', background: '#fef9c3', borderRadius: 8,
                      fontSize: 13, color: '#92400e', marginBottom: 16 }}>
          ⚠ You can view but not edit role defaults. Contact a platform admin.
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 700,
                           borderBottom: '2px solid #e2e8f0', minWidth: 200 }}>Feature</th>
              {ROLES.map(r => (
                <th key={r} style={{ padding: '10px 12px', textAlign: 'center',
                                     borderBottom: '2px solid #e2e8f0', minWidth: 80 }}>
                  <span style={{ background: ROLE_COLOR[r] + '20', color: ROLE_COLOR[r],
                                 padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>
                    {ROLE_LABEL[r]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {featureKeys.map((feat, fi) => (
              <tr key={feat} style={{ background: fi % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b',
                             borderBottom: '1px solid #f1f5f9' }}>
                  {features[feat]}
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400 }}>{feat}</div>
                </td>
                {ROLES.map(role => {
                  const val = getVal(role, feat)
                  const isUnlimited = ['institute_admin','admin'].includes(role)
                  return (
                    <td key={role} style={{ padding: '6px 8px', textAlign: 'center',
                                           borderBottom: '1px solid #f1f5f9' }}>
                      {isUnlimited && !canEdit ? (
                        <span style={{ color: '#6366f1', fontWeight: 700 }}>∞</span>
                      ) : canEdit ? (
                        <input style={inputStyle} value={val}
                          onChange={e => setVal(role, feat, e.target.value)}
                          placeholder="-1"
                          title="-1 = unlimited, 0 = blocked, or a number"
                        />
                      ) : (
                        <span style={{ color: val === '0' ? '#ef4444' : val === '-1' ? '#6366f1' : '#1e293b',
                                       fontWeight: 600 }}>
                          {fmtLimit(parseInt(val))}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && hasEdits && (
        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <SaveBtn saving={saving} onClick={handleSave} />
          <button onClick={() => setEdits({})}
            style={{ padding: '8px 20px', borderRadius: 8, border: '1.5px solid #c7d2fe',
                     background: '#fff', color: 'var(--indigo)', fontWeight: 600,
                     fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Discard
          </button>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  TAB 2 — Institution Overrides
// ══════════════════════════════════════════════════════════════════════════════
function InstitutionOverridesTab({ config, features, token, callerRole, callerInst, showToast, onSaved }) {
  const featureKeys = Object.keys(features || {})
  const instOverrides = config?.institution_overrides || {}

  // Build list: for admin = all institutions, for institute_admin = only their own
  const instList = callerRole === 'admin'
    ? Object.keys(instOverrides)
    : (callerInst ? [callerInst] : [])

  const [selectedInst, setSelectedInst]   = useState(instList[0] || '')
  const [newInstName,   setNewInstName]   = useState('')
  const [edits,         setEdits]         = useState({})  // {section: {feat: val}}
  const [saving,        setSaving]        = useState(false)

  const currentCfg = instOverrides[selectedInst] || {}

  const getVal = (section, feat) =>
    edits[section]?.[feat] !== undefined
      ? edits[section][feat]
      : String(currentCfg[section]?.[feat] ?? '')

  const setVal = (section, feat, val) =>
    setEdits(prev => ({
      ...prev,
      [section]: { ...(prev[section] || {}), [feat]: val },
    }))

  const handleSave = async (inst) => {
    setSaving(true)
    try {
      const toInt = (v) => {
        const s = String(v).trim().toLowerCase()
        if (s === '' || s === 'inherit' || s === '-') return null  // remove override
        if (s === '∞' || s === 'unlimited' || s === '-1') return -1
        if (s === 'blocked' || s === '0') return 0
        return parseInt(s, 10)
      }
      const payload = {}
      for (const section of ['user_daily', 'inst_daily']) {
        if (edits[section]) {
          payload[section] = {}
          for (const [feat, raw] of Object.entries(edits[section])) {
            payload[section][feat] = toInt(raw)
          }
        }
      }
      await apiFetch(`/api/admin/quota-config/institution/${encodeURIComponent(inst)}`,
                     token, 'PATCH', payload)
      setEdits({})
      showToast?.('Institution quotas saved', 'success')
      onSaved?.()
    } catch (e) { showToast?.(e.message, 'error') }
    setSaving(false)
  }

  const handleAdd = async () => {
    const n = newInstName.trim()
    if (!n) return
    try {
      await apiFetch(`/api/admin/quota-config/institution/${encodeURIComponent(n)}`,
                     token, 'PATCH', { user_daily: {}, inst_daily: {} })
      showToast?.(`Institution '${n}' added`, 'success')
      setNewInstName('')
      onSaved?.()
      setSelectedInst(n)
    } catch (e) { showToast?.(e.message, 'error') }
  }

  const handleDelete = async (inst) => {
    if (!window.confirm(`Remove all quota overrides for '${inst}'?`)) return
    try {
      await apiFetch(`/api/admin/quota-config/institution/${encodeURIComponent(inst)}`,
                     token, 'DELETE')
      showToast?.('Removed', 'success')
      onSaved?.()
      setSelectedInst('')
    } catch (e) { showToast?.(e.message, 'error') }
  }

  return (
    <div>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
        Override quotas for specific institutions.{' '}
        <strong>Per-user override</strong> replaces the role default for every user in the institution.{' '}
        <strong>Institution pool</strong> is a shared daily budget across all users in the institution.
        Leave blank to inherit role defaults.
      </p>

      {callerRole === 'admin' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <input style={{ ...inputStyle, width: 220, textAlign: 'left' }}
            placeholder="New institution name…" value={newInstName}
            onChange={e => setNewInstName(e.target.value)} />
          <button onClick={handleAdd}
            style={{ padding: '5px 14px', borderRadius: 6, background: 'var(--indigo)',
                     color: '#fff', border: 'none', fontWeight: 600, fontSize: 13,
                     cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
        </div>
      )}

      {instList.length === 0 && (
        <div style={{ color: '#94a3b8', fontSize: 13 }}>
          No institution overrides configured yet. Add one above.
        </div>
      )}

      {instList.length > 0 && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          {instList.map(inst => (
            <button key={inst} onClick={() => { setSelectedInst(inst); setEdits({}) }}
              style={{ padding: '6px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13,
                       cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                       background: selectedInst === inst ? 'var(--indigo)' : '#eef2ff',
                       color:      selectedInst === inst ? '#fff' : 'var(--indigo)' }}>
              🏫 {inst}
            </button>
          ))}
        </div>
      )}

      {selectedInst && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: 'var(--indigo)' }}>🏫 {selectedInst}</div>
            {callerRole === 'admin' && (
              <button onClick={() => handleDelete(selectedInst)}
                style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11,
                         background: '#fee2e2', color: '#991b1b', border: 'none',
                         cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
                🗑 Remove Overrides
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px',
                               borderBottom: '2px solid #e2e8f0', minWidth: 200 }}>Feature</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center',
                               borderBottom: '2px solid #e2e8f0', minWidth: 110 }}>
                    Per-User Daily Limit
                    <div style={{ fontSize: 10, fontWeight: 400, color: '#64748b' }}>
                      (per user in institution)
                    </div>
                  </th>
                  <th style={{ padding: '8px 10px', textAlign: 'center',
                               borderBottom: '2px solid #e2e8f0', minWidth: 120 }}>
                    Institution Daily Pool
                    <div style={{ fontSize: 10, fontWeight: 400, color: '#64748b' }}>
                      (shared across all users)
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {featureKeys.map((feat, fi) => (
                  <tr key={feat} style={{ background: fi % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding: '6px 10px', fontWeight: 600,
                                 borderBottom: '1px solid #f1f5f9' }}>
                      {features[feat]}
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'center',
                                 borderBottom: '1px solid #f1f5f9' }}>
                      <input style={inputStyle} value={getVal('user_daily', feat)}
                        onChange={e => setVal('user_daily', feat, e.target.value)}
                        placeholder="inherit" />
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'center',
                                 borderBottom: '1px solid #f1f5f9' }}>
                      <input style={inputStyle} value={getVal('inst_daily', feat)}
                        onChange={e => setVal('inst_daily', feat, e.target.value)}
                        placeholder="no pool" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
            <span>Blank = inherit role default</span>
            <span>·</span><span>-1 or ∞ = unlimited</span>
            <span>·</span><span>0 = blocked</span>
          </div>
          {Object.keys(edits).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <SaveBtn saving={saving} onClick={() => handleSave(selectedInst)} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  TAB 3 — User Overrides
// ══════════════════════════════════════════════════════════════════════════════
function UserOverridesTab({ config, features, token, showToast, onSaved }) {
  const featureKeys   = Object.keys(features || {})
  const userOverrides = config?.user_overrides || {}
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [selectedUid, setSelectedUid] = useState(null)
  const [edits,  setEdits]  = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiGet('/admin/users', token)
      .then(d => setUsers(d.users || []))
      .catch(() => {})
  }, [])

  const visibleUsers = users.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.institution?.toLowerCase().includes(search.toLowerCase())
  )

  const selectedUser = users.find(u => u.id === selectedUid)
  const overrides    = userOverrides[selectedUid] || {}

  const getVal = (feat) =>
    edits[feat] !== undefined ? edits[feat] : String(overrides[feat] ?? '')

  const handleSave = async () => {
    setSaving(true)
    try {
      const toInt = (v) => {
        const s = String(v).trim().toLowerCase()
        if (s === '' || s === 'inherit' || s === '-') return null
        if (s === '∞' || s === 'unlimited' || s === '-1') return -1
        if (s === 'blocked' || s === '0') return 0
        return parseInt(s, 10)
      }
      const payload = {}
      for (const [feat, raw] of Object.entries(edits)) {
        payload[feat] = toInt(raw)
      }
      await apiFetch(`/api/admin/quota-config/user/${selectedUid}`, token, 'PATCH', payload)
      setEdits({})
      showToast?.('User quotas saved', 'success')
      onSaved?.()
    } catch (e) { showToast?.(e.message, 'error') }
    setSaving(false)
  }

  const handleReset = async () => {
    if (!window.confirm('Remove all overrides for this user?')) return
    try {
      await apiFetch(`/api/admin/quota-config/user/${selectedUid}`, token, 'DELETE')
      showToast?.('Overrides removed', 'success')
      onSaved?.()
      setEdits({})
    } catch (e) { showToast?.(e.message, 'error') }
  }

  const usersWithOverride = new Set(Object.keys(userOverrides))

  return (
    <div className="uo-wrap" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
      {/* Left: user list */}
      <div>
        <input style={{ ...inputStyle, width: '100%', textAlign: 'left', marginBottom: 10 }}
          placeholder="🔍 Search users…" value={search}
          onChange={e => setSearch(e.target.value)} />
        <div style={{ maxHeight: 420, overflowY: 'auto', borderRadius: 8,
                      border: '1.5px solid #e2e8f0' }}>
          {visibleUsers.map(u => (
            <div key={u.id} onClick={() => { setSelectedUid(u.id); setEdits({}) }}
              style={{
                padding: '10px 12px', cursor: 'pointer', fontSize: 13,
                background: selectedUid === u.id ? '#eef2ff' : '#fff',
                borderBottom: '1px solid #f1f5f9',
                borderLeft: usersWithOverride.has(u.id) ? '3px solid var(--indigo)' : '3px solid transparent',
              }}>
              <div style={{ fontWeight: 600, color: '#1e293b' }}>{u.name}</div>
              <div style={{ color: '#64748b', fontSize: 11 }}>{u.role} · {u.institution || '—'}</div>
              {usersWithOverride.has(u.id) && (
                <span style={{ fontSize: 10, color: 'var(--indigo)', fontWeight: 700 }}>
                  ✦ has overrides
                </span>
              )}
            </div>
          ))}
          {visibleUsers.length === 0 && (
            <div style={{ padding: 16, color: '#94a3b8', fontSize: 13 }}>No users found</div>
          )}
        </div>
      </div>

      {/* Right: edit panel */}
      <div>
        {!selectedUser ? (
          <div style={{ color: '#94a3b8', fontSize: 13, padding: 20 }}>
            Select a user to configure individual quotas.
          </div>
        ) : (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedUser.name}</div>
                <div style={{ color: '#64748b', fontSize: 12 }}>
                  {selectedUser.email} · {selectedUser.role} · {selectedUser.institution || 'no institution'}
                </div>
              </div>
              {usersWithOverride.has(selectedUid) && (
                <button onClick={handleReset}
                  style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11,
                           background: '#fee2e2', color: '#991b1b', border: 'none',
                           cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
                  🗑 Reset to defaults
                </button>
              )}
            </div>

            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
              Leave blank to use institution / role defaults. -1 = unlimited. 0 = blocked.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6 }}>
              {featureKeys.map(feat => (
                <>
                  <div key={feat + '-label'} style={{ fontSize: 13, fontWeight: 600,
                                                       padding: '6px 0', color: '#1e293b' }}>
                    {features[feat]}
                  </div>
                  <input key={feat + '-input'} style={inputStyle}
                    value={getVal(feat)} placeholder="—"
                    onChange={e => setEdits(prev => ({ ...prev, [feat]: e.target.value }))} />
                </>
              ))}
            </div>

            {Object.keys(edits).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <SaveBtn saving={saving} onClick={handleSave} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  TAB 4 — Usage Report
// ══════════════════════════════════════════════════════════════════════════════
function UsageReportTab({ features, token, showToast }) {
  const featureKeys = Object.keys(features || {})
  const [days,      setDays]      = useState(7)
  const [featFilter,setFeatFilter]= useState('')
  const [report,    setReport]    = useState(null)
  const [totals,    setTotals]    = useState({})
  const [loading,   setLoading]   = useState(false)
  const [expanded,  setExpanded]  = useState({})    // date → bool

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ days })
      if (featFilter) params.set('feature', featFilter)
      const data = await apiFetch(`/api/admin/usage-report?${params}`, token)
      setReport(data.report || [])
      setTotals(data.totals || {})
    } catch (e) { showToast?.(e.message, 'error') }
    setLoading(false)
  }, [days, featFilter, token])

  useEffect(() => { fetchReport() }, [fetchReport])

  // Total calls across all features for the period
  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0)

  const topFeats = featureKeys
    .map(f => ({ f, count: totals[f] || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginRight: 6 }}>Days</label>
          {[1, 7, 14, 30].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                       cursor: 'pointer', border: 'none', fontFamily: 'inherit', marginRight: 4,
                       background: days === d ? 'var(--indigo)' : '#eef2ff',
                       color:      days === d ? '#fff' : 'var(--indigo)' }}>{d}d</button>
          ))}
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginRight: 6 }}>Feature</label>
          <select style={{ ...inputStyle, width: 'auto', textAlign: 'left', padding: '5px 8px' }}
            value={featFilter} onChange={e => setFeatFilter(e.target.value)}>
            <option value="">All features</option>
            {featureKeys.map(f => <option key={f} value={f}>{features[f]}</option>)}
          </select>
        </div>
        <button onClick={fetchReport} disabled={loading}
          style={{ padding: '6px 14px', borderRadius: 6, background: 'var(--indigo)',
                   color: '#fff', border: 'none', fontWeight: 600, fontSize: 13,
                   cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {loading ? '⏳' : '🔄'} Refresh
        </button>
      </div>

      {/* Summary cards */}
      {totals && (
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label">Total API Calls</div>
            <div className="stat-val">{grandTotal.toLocaleString()}</div>
          </div>
          {topFeats.map(({ f, count }) => (
            <div key={f} className="stat-card">
              <div className="stat-label">{features[f]}</div>
              <div className="stat-val">{count.toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* Daily breakdown */}
      {!report && loading && (
        <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading…</div>
      )}
      {report && report.map(day => {
        const userEntries = Object.entries(day.users || {})
        if (userEntries.length === 0) return null
        const open = expanded[day.date]
        return (
          <div key={day.date} className="card" style={{ marginBottom: 12, padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          cursor: 'pointer' }} onClick={() => setExpanded(p => ({ ...p, [day.date]: !open }))}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{day.date}</div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
                <span>{userEntries.length} active users</span>
                <span>{open ? '▲' : '▼'}</span>
              </div>
            </div>

            {open && (
              <div style={{ marginTop: 12, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ textAlign: 'left', padding: '6px 10px',
                                   borderBottom: '1px solid #e2e8f0', minWidth: 160 }}>User</th>
                      <th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0',
                                   textAlign: 'left', minWidth: 100 }}>Role</th>
                      {(featFilter ? [featFilter] : featureKeys).map(f => (
                        <th key={f} style={{ padding: '6px 8px', textAlign: 'center',
                                            borderBottom: '1px solid #e2e8f0', minWidth: 60, fontSize: 11 }}>
                          {features[f]?.split(' ')[0]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {userEntries.sort(([,a],[,b]) =>
                      Object.values(b).reduce((s,v)=>s+v,0) - Object.values(a).reduce((s,v)=>s+v,0)
                    ).map(([uid, feats]) => (
                      <tr key={uid}>
                        <td style={{ padding: '5px 10px', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ fontWeight: 600 }}>{feats.name || uid}</div>
                          <div style={{ color: '#94a3b8', fontSize: 10 }}>{feats.institution || ''}</div>
                        </td>
                        <td style={{ padding: '5px 10px', borderBottom: '1px solid #f1f5f9',
                                     color: ROLE_COLOR[feats.role] || '#64748b', fontSize: 11, fontWeight: 600 }}>
                          {feats.role || '?'}
                        </td>
                        {(featFilter ? [featFilter] : featureKeys).map(f => (
                          <td key={f} style={{ padding: '5px 8px', textAlign: 'center',
                                              borderBottom: '1px solid #f1f5f9',
                                              color: (feats[f] || 0) > 0 ? '#1e293b' : '#cbd5e1',
                                              fontWeight: (feats[f] || 0) > 0 ? 600 : 400 }}>
                            {feats[f] || 0}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Institution pool totals */}
                {Object.keys(day.institutions || {}).length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b',
                                  marginBottom: 6, textTransform: 'uppercase' }}>Institution Pools Used</div>
                    {Object.entries(day.institutions).map(([inst, feats]) => (
                      <div key={inst} style={{ fontSize: 12, color: '#1e293b', marginBottom: 2 }}>
                        <strong>{inst}:</strong>{' '}
                        {Object.entries(feats)
                          .filter(([f]) => !featFilter || f === featFilter)
                          .map(([f, c]) => `${features[f] || f}: ${c}`)
                          .join(' · ')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      {report?.every(d => Object.keys(d.users || {}).length === 0) && (
        <div style={{ color: '#94a3b8', fontSize: 13 }}>No usage data in this period.</div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  TAB 5 — Revenue Dashboard  (admin only)
// ══════════════════════════════════════════════════════════════════════════════
function RevenueTab({ token, showToast }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [period,  setPeriod]  = useState('monthly')   // monthly | weekly

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await apiFetch(`/api/admin/revenue?period=${period}`, token)
      setData(d)
    } catch {
      // Backend may not have this endpoint yet — use mock data for display
      setData({
        summary: { total_revenue: 0, active_subscriptions: 0, mrr: 0, arr: 0,
                   new_this_month: 0, churned_this_month: 0 },
        by_plan: [], by_institution: [], recent_transactions: [],
      })
    }
    setLoading(false)
  }, [token, period])

  useEffect(() => { load() }, [load])

  const C = {
    green: '#059669', greenL: '#ecfdf5', greenB: '#86efac',
    blue:  '#0284c7', blueL:  '#eff6ff', blueB:  '#bae6fd',
    amber: '#d97706', amberL: '#fffbeb', amberB: '#fde68a',
    indigo:'#4f46e5', indigoL:'#eef2ff', indigoB:'#c7d2fe',
    red:   '#dc2626', redL:   '#fef2f2', redB:   '#fecaca',
    slate: '#64748b', slateL: '#f8fafc', slateB: '#e2e8f0',
  }

  const card  = (extra={}) => ({ background: '#fff', borderRadius: 12, padding: 18,
    border: `1px solid ${C.slateB}`, boxShadow: '0 1px 3px rgba(0,0,0,.05)', ...extra })
  const stat  = (c, bg, b) => ({ background: bg, borderRadius: 12, padding: '16px',
    border: `1px solid ${b}`, textAlign: 'center' })
  const valtx = (c) => ({ fontSize: 26, fontWeight: 800, color: c, lineHeight: 1, display: 'block' })
  const labtx = { fontSize: 11, fontWeight: 700, color: C.slate, marginTop: 4,
    textTransform: 'uppercase', letterSpacing: '.04em', display: 'block' }
  const badge = (c, bg, b, extra={}) => ({
    padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
    color: c, background: bg, border: `1px solid ${b}`, ...extra,
  })

  const fmt = (n) => n == null ? '—' : '₹' + Number(n).toLocaleString('en-IN')

  const s = data?.summary || {}

  return (
    <div>
      {/* Period selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['monthly', 'weekly'].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', border: 'none', fontFamily: 'inherit',
              background: period === p ? C.indigo : C.indigoL,
              color:      period === p ? '#fff'   : C.indigo }}>
            {p === 'monthly' ? '📅 Monthly' : '📆 Weekly'}
          </button>
        ))}
        <button onClick={load} disabled={loading}
          style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 8, fontSize: 12,
            fontWeight: 600, cursor: 'pointer', border: `1px solid ${C.slateB}`,
            background: C.slateL, color: C.slate, fontFamily: 'inherit' }}>
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: C.slate }}>
          <div style={{ width: 28, height: 28, border: `3px solid ${C.slateB}`,
            borderTop: `3px solid ${C.indigo}`, borderRadius: '50%',
            animation: 'spin .7s linear infinite', margin: '0 auto 10px' }} />
          Loading revenue data…
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))',
            gap: 12, marginBottom: 20 }}>
            <div style={stat(C.green, C.greenL, C.greenB)}>
              <span style={valtx(C.green)}>{fmt(s.total_revenue)}</span>
              <span style={labtx}>Total Revenue</span>
            </div>
            <div style={stat(C.blue, C.blueL, C.blueB)}>
              <span style={valtx(C.blue)}>{fmt(s.mrr)}</span>
              <span style={labtx}>MRR</span>
            </div>
            <div style={stat(C.indigo, C.indigoL, C.indigoB)}>
              <span style={valtx(C.indigo)}>{fmt(s.arr)}</span>
              <span style={labtx}>ARR (Est.)</span>
            </div>
            <div style={stat(C.green, C.greenL, C.greenB)}>
              <span style={valtx(C.green)}>{s.active_subscriptions ?? 0}</span>
              <span style={labtx}>Active Subs</span>
            </div>
            <div style={stat(C.blue, C.blueL, C.blueB)}>
              <span style={valtx(C.blue)}>+{s.new_this_month ?? 0}</span>
              <span style={labtx}>New This Month</span>
            </div>
            <div style={stat(C.red, C.redL, C.redB)}>
              <span style={valtx(C.red)}>{s.churned_this_month ?? 0}</span>
              <span style={labtx}>Churned</span>
            </div>
          </div>

          {/* Plan breakdown */}
          <div style={card({ marginBottom: 16 })}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 8 }}>
              💼 Revenue by Plan
            </div>
            {(data?.by_plan || []).length === 0 ? (
              <div style={{ color: C.slate, fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                No plan revenue data yet — will populate as subscriptions are recorded.
              </div>
            ) : (
              (data.by_plan || []).map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderBottom: `1px solid ${C.slateB}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{p.plan_name}</div>
                    <div style={{ fontSize: 11, color: C.slate }}>{p.subscribers} subscribers · {fmt(p.per_unit)}/mo each</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: C.green }}>{fmt(p.revenue)}</div>
                    <div style={{ fontSize: 11, color: C.slate }}>{p.pct ?? 0}% of total</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Institution revenue */}
          <div style={card({ marginBottom: 16 })}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 8 }}>
              🏫 Revenue by Institution
            </div>
            {(data?.by_institution || []).length === 0 ? (
              <div style={{ color: C.slate, fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                No institution revenue data yet.
              </div>
            ) : (
              (data.by_institution || []).map((ins, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderBottom: `1px solid ${C.slateB}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: C.indigoL,
                    color: C.indigo, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{ins.institution}</div>
                    <div style={{ fontSize: 11, color: C.slate }}>{ins.plan} · {ins.users} users</div>
                  </div>
                  <div style={{ fontWeight: 800, color: C.green, fontSize: 14 }}>{fmt(ins.revenue)}</div>
                </div>
              ))
            )}
          </div>

          {/* Recent transactions */}
          <div style={card()}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 8 }}>
              🧾 Recent Transactions
            </div>
            {(data?.recent_transactions || []).length === 0 ? (
              <div style={{ color: C.slate, fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                Transactions will appear here once payments are recorded in the database.
              </div>
            ) : (
              (data.recent_transactions || []).map((tx, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderBottom: `1px solid ${C.slateB}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{tx.user_name}</div>
                    <div style={{ fontSize: 11, color: C.slate }}>{tx.plan} · {tx.date?.slice(0, 10)}</div>
                  </div>
                  <span style={badge(
                    tx.status === 'paid' ? C.green : C.amber,
                    tx.status === 'paid' ? C.greenL : C.amberL,
                    tx.status === 'paid' ? C.greenB : C.amberB,
                  )}>{tx.status}</span>
                  <div style={{ fontWeight: 800, fontSize: 14, color: C.green, minWidth: 80, textAlign: 'right' }}>
                    {fmt(tx.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  TAB 6 — Clean Slate  (admin only — dangerous, double-confirmed)
//  Allows purging all uploaded content for a specific user / institution / global
// ══════════════════════════════════════════════════════════════════════════════
function CleanSlateTab({ token, showToast }) {
  const [scope,    setScope]    = useState('user')       // user | institution | all
  const [target,   setTarget]   = useState('')
  const [confirm1, setConfirm1] = useState(false)
  const [confirm2, setConfirm2] = useState('')
  const [running,  setRunning]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [users,    setUsers]    = useState([])
  const [insts,    setInsts]    = useState([])

  useEffect(() => {
    apiFetch('/api/admin/users', token).then(d => setUsers(d.users || [])).catch(() => {})
    apiFetch('/api/admin/institutions', token).then(d => setInsts(d.institutions || [])).catch(() => {})
  }, [token])

  const SCOPES = [
    { id: 'user',        label: '👤 Single User',       desc: 'Purge all uploads, syllabus, and data for one user' },
    { id: 'institution', label: '🏫 Entire Institution', desc: 'Purge all data for every user in a school/institute' },
    { id: 'all',         label: '🌐 Full Platform Reset', desc: 'DANGER: Wipes ALL uploaded content platform-wide' },
  ]

  const TYPES = ['📄 Uploaded PDFs & Documents', '📚 Syllabus selections', '🖼 Uploaded images',
    '🔊 Generated audio', '🎬 Videos', '💬 Chat history', '📝 Saved exams & evaluations']

  const CONFIRM_PHRASE = scope === 'all'
    ? 'DELETE EVERYTHING'
    : scope === 'institution'
    ? `DELETE ${(target || 'INSTITUTION').toUpperCase()}`
    : `DELETE ${(target || 'USER').toUpperCase()}`

  const isReady = confirm1 && confirm2.trim().toUpperCase() === CONFIRM_PHRASE

  const runPurge = async () => {
    if (!isReady || running) return
    setRunning(true); setResult(null)
    try {
      const body = { scope, ...(scope !== 'all' ? { target } : {}) }
      const d = await apiFetch('/api/admin/clean-slate', token, 'POST', body)
      setResult({ ok: true, ...d })
      showToast?.('Clean Slate completed', 'success')
    } catch (e) {
      setResult({ ok: false, error: e.message })
      showToast?.(e.message, 'error')
    }
    setRunning(false)
    setConfirm1(false); setConfirm2('')
  }

  return (
    <div>
      {/* Warning banner */}
      <div style={{ background: '#fef2f2', border: '2px solid #fecaca', borderRadius: 12,
        padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 28, flexShrink: 0 }}>⚠️</span>
        <div>
          <div style={{ fontWeight: 800, color: '#991b1b', fontSize: 15, marginBottom: 4 }}>
            Destructive Operation — Data Cannot Be Recovered
          </div>
          <div style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.6 }}>
            Clean Slate permanently deletes selected data. Use this only when a school, individual,
            or account explicitly requests a full data reset. This cannot be undone.
          </div>
        </div>
      </div>

      {/* Scope selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase',
          letterSpacing: '.05em', marginBottom: 10 }}>1. Select Scope</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {SCOPES.map(s => (
            <div key={s.id} onClick={() => { setScope(s.id); setTarget(''); setConfirm1(false); setConfirm2('') }}
              style={{ flex: '1 1 200px', padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                border: `2px solid ${scope === s.id ? '#dc2626' : '#e2e8f0'}`,
                background: scope === s.id ? '#fef2f2' : '#fff',
                transition: 'all .15s' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: scope === s.id ? '#991b1b' : '#0f172a',
                marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* What will be deleted */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
        padding: '12px 16px', marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: '#92400e', marginBottom: 8,
          textTransform: 'uppercase', letterSpacing: '.04em' }}>What Gets Deleted</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
          {TYPES.map((t, i) => (
            <div key={i} style={{ fontSize: 12, color: '#78350f' }}>{t}</div>
          ))}
        </div>
      </div>

      {/* Target selector */}
      {scope !== 'all' && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#64748b', textTransform: 'uppercase',
            letterSpacing: '.05em', marginBottom: 8 }}>
            2. {scope === 'user' ? 'Select User' : 'Select Institution'}
          </div>
          {scope === 'user' ? (
            <select
              value={target} onChange={e => setTarget(e.target.value)}
              style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8,
                fontSize: 13, fontFamily: 'inherit', outline: 'none', minWidth: 280,
                background: '#fff', cursor: 'pointer' }}>
              <option value="">— Select a user —</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email}) — {u.role}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={target} onChange={e => setTarget(e.target.value)}
              style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8,
                fontSize: 13, fontFamily: 'inherit', outline: 'none', minWidth: 280,
                background: '#fff', cursor: 'pointer' }}>
              <option value="">— Select an institution —</option>
              {insts.map((inst, i) => (
                <option key={i} value={inst.name || inst}>{inst.name || inst}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Double confirmation */}
      {(scope === 'all' || target) && (
        <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 12,
          padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#991b1b', textTransform: 'uppercase',
            letterSpacing: '.05em', marginBottom: 14 }}>
            {scope === 'all' ? '3.' : '3.'} Confirm Deletion
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
            cursor: 'pointer', fontSize: 13, color: '#7f1d1d', fontWeight: 600 }}>
            <input type="checkbox" checked={confirm1} onChange={e => setConfirm1(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#dc2626', cursor: 'pointer' }} />
            I understand this action is <strong>permanent and irreversible</strong>
          </label>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#991b1b', fontWeight: 700, marginBottom: 6 }}>
              Type exactly: <code style={{ background: '#fee2e2', padding: '2px 6px',
                borderRadius: 4, fontSize: 12 }}>{CONFIRM_PHRASE}</code> to confirm
            </div>
            <input
              value={confirm2}
              onChange={e => setConfirm2(e.target.value)}
              placeholder={`Type ${CONFIRM_PHRASE}`}
              style={{ padding: '9px 12px', border: `1.5px solid ${confirm2.trim().toUpperCase() === CONFIRM_PHRASE ? '#16a34a' : '#fca5a5'}`,
                borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', width: '100%',
                boxSizing: 'border-box', color: '#0f172a',
                background: confirm2.trim().toUpperCase() === CONFIRM_PHRASE ? '#f0fdf4' : '#fff' }}
            />
          </div>
        </div>
      )}

      {/* Execute button */}
      <button
        onClick={runPurge}
        disabled={!isReady || running}
        style={{ padding: '11px 28px', borderRadius: 10, border: 'none',
          background: isReady ? 'linear-gradient(135deg,#dc2626,#991b1b)' : '#e2e8f0',
          color: isReady ? '#fff' : '#94a3b8',
          fontWeight: 800, fontSize: 14, cursor: isReady ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit', transition: 'all .2s' }}>
        {running ? '⏳ Running Clean Slate…' : '🗑 Execute Clean Slate'}
      </button>

      {/* Result */}
      {result && (
        <div style={{ marginTop: 20, padding: '14px 18px', borderRadius: 12,
          background: result.ok ? '#f0fdf4' : '#fef2f2',
          border: `1.5px solid ${result.ok ? '#86efac' : '#fca5a5'}` }}>
          <div style={{ fontWeight: 700, fontSize: 13,
            color: result.ok ? '#166534' : '#991b1b', marginBottom: 6 }}>
            {result.ok ? '✅ Clean Slate Complete' : '❌ Error'}
          </div>
          <div style={{ fontSize: 13, color: result.ok ? '#166534' : '#991b1b' }}>
            {result.ok
              ? `Deleted: ${result.documents_deleted ?? 0} documents, ${result.syllabi_deleted ?? 0} syllabi, ${result.chats_deleted ?? 0} chat sessions, ${result.evaluations_deleted ?? 0} evaluations.`
              : result.error}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  ROOT COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminPanel({ showToast }) {
  const { token, me: user } = useAuth()
  const [tab,    setTab]    = useState('roles')
  const [config, setConfig] = useState(null)
  const [loading,setLoading]= useState(false)

  const callerRole = user?.role || ''
  const callerInst = (user?.institution || '').trim()

  // Guard: only admin and institute_admin should use this panel
  const canAccess = ['admin', 'institute_admin'].includes(callerRole)

  const fetchConfig = useCallback(async () => {
    if (!canAccess) return   // don't call admin API for non-admin roles
    setLoading(true)
    try {
      const data = await apiFetch('/api/admin/quota-config', token)
      setConfig(data)
    } catch (e) { showToast?.(e.message, 'error') }
    setLoading(false)
  }, [token, canAccess])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  // Non-admin users should never reach this panel; bail before rendering anything
  if (!canAccess) return null

  const TABS = [
    ...(callerRole === 'admin' ? [{ id: 'presets',  label: '💼 Plan Presets'          }] : []),
    { id: 'roles',    label: '⚖ Role Quotas'           },
    { id: 'inst',     label: '🏫 Institution Overrides' },
    { id: 'users',    label: '👤 User Overrides'        },
    { id: 'report',   label: '📊 Usage Report'          },
    ...(callerRole === 'admin' ? [{ id: 'revenue',  label: '💰 Revenue',   badge: 'New' }] : []),
    ...(callerRole === 'admin' ? [{ id: 'cleanslate', label: '🗑 Clean Slate', badge: '⚠' }] : []),
  ]

  const features = config?.features || {}

  return (
    <div className="panel active">
      <style>{`
        @media (max-width: 768px) {
          .uo-wrap { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)', margin: 0 }}>
            🛡 Quota & Usage Management
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
            Configure daily usage limits per feature, per role, institution and individual user.
          </p>
        </div>

        <TabBar tabs={TABS} active={tab} onChange={setTab} />

        {loading && <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading configuration…</div>}

        {!loading && callerRole === 'admin' && tab === 'presets' && (
          <PlanPresetsTab
            config={config}
            token={token}
            callerRole={callerRole}
            callerInst={callerInst}
            showToast={showToast}
            onSaved={fetchConfig}
          />
        )}
        {!loading && tab === 'roles' && (
          <RoleDefaultsTab
            config={config} features={features}
            canEdit={config?.can_edit_role_defaults !== false}
            token={token} onSaved={fetchConfig} showToast={showToast}
          />
        )}
        {!loading && tab === 'inst' && (
          <InstitutionOverridesTab
            config={config} features={features}
            token={token} callerRole={callerRole} callerInst={callerInst}
            onSaved={fetchConfig} showToast={showToast}
          />
        )}
        {!loading && tab === 'users' && (
          <UserOverridesTab
            config={config} features={features}
            token={token} onSaved={fetchConfig} showToast={showToast}
          />
        )}
        {tab === 'report' && (
          <UsageReportTab features={features} token={token} showToast={showToast} />
        )}
        {tab === 'revenue' && (
          <RevenueTab token={token} showToast={showToast} />
        )}
        {tab === 'cleanslate' && (
          <CleanSlateTab token={token} showToast={showToast} />
        )}
      </div>
    </div>
  )
}
