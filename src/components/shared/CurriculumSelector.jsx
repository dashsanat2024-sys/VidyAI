import { useState, useEffect } from 'react'
import { INDIA_STATES, STATE_BOARDS, getBoardMediums, boardNeedsStream, getSubjectsForStream, getBoardClasses, STREAMS } from '../../data/indiaCurriculum'

const C = {
  indigo: '#4f46e5', indigoDark: '#3730a3', indigoLight: '#eef2ff', indigoBorder: '#c7d2fe',
  slate: '#64748b', slateBorder: '#e2e8f0',
  purple: '#7c3aed', purpleLight: '#f5f3ff', purpleBorder: '#ddd6fe',
  red: '#dc2626', redLight: '#fef2f2', redBorder: '#fecaca',
  saffron: '#f59e0b', saffron2: '#d97706',
}

const S = {
  label: {
    fontSize: '12px', fontWeight: '700', color: C.slate,
    display: 'block', marginBottom: '8px',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  select: {
    width: '100%', padding: '11px 12px',
    border: `1.5px solid ${C.slateBorder}`, borderRadius: '10px',
    fontSize: '14px', fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box', color: '#0f172a', background: '#fff',
    cursor: 'pointer', transition: 'border-color .15s',
  },
  btn: (v = 'primary', extra = {}) => ({
    padding: '11px 24px', borderRadius: '10px', border: 'none',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px',
    fontWeight: '700', transition: 'all .15s', display: 'inline-flex',
    alignItems: 'center', gap: '8px', ...extra,
    ...(v === 'primary' ? {
      background: 'linear-gradient(135deg, var(--saffron, #f59e0b), var(--saffron2, #d97706))',
      color: '#fff',
    } : {
      background: '#fff', color: C.slate, border: `1px solid ${C.slateBorder}`
    }),
  }),
  spinner: {
    width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #fff', borderRadius: '50%',
    animation: 'spin .7s linear infinite', display: 'inline-block',
  },
}

/**
 * Shared CurriculumSelector component
 * UI aligned with Curriculum Hub (linear dropdowns + action buttons below)
 */
export default function CurriculumSelector({ token, onComplete, buttonLabel = "Load Chapters" }) {
  const [state, setState] = useState('')
  const [board, setBoard] = useState('')
  const [classNum, setClassNum] = useState('')
  const [subject, setSubject] = useState('')
  const [medium, setMedium] = useState('English')
  const [stream, setStream] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const boards = STATE_BOARDS[state] || []
  const classes = getBoardClasses(board)
  const availMediums = getBoardMediums(board)
  const showStream = boardNeedsStream(board, classNum)
  const subjects = board && classNum ? getSubjectsForStream(board, classNum, showStream ? stream : '') : []

  const handleLoad = async () => {
    if (!state || !board || !classNum || !subject) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/curriculum/chapters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          state,
          board: board,
          class: `Class ${classNum}`,
          subject,
          medium: medium || 'English',
          ...(showStream && stream ? { stream } : {})
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load chapters')

      onComplete({
        state,
        board,
        classNum,
        subject,
        medium: medium || 'English',
        stream: showStream ? stream : '',
        chapters: data.chapters || [],
        syllabus_id: data.syllabus_id,
        name: data.name
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const ready = state && board && classNum && subject

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Selection Grid: Exactly like Curriculum Hub */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '14px',
        alignItems: 'flex-end'
      }}>
        {/* State */}
        <div className="fg" style={{ marginBottom: 0 }}>
          <label style={S.label}>State / UT</label>
          <select style={S.select} value={state} onChange={e => { setState(e.target.value); setBoard(''); setClassNum(''); setSubject(''); setMedium('English'); setStream('') }}>
            <option value="">— Select State —</option>
            {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Board */}
        <div className="fg" style={{ marginBottom: 0 }}>
          <label style={S.label}>Board</label>
          <select style={S.select} value={board} onChange={e => { setBoard(e.target.value); setClassNum(''); setSubject(''); setMedium('English'); setStream('') }} disabled={!state}>
            <option value="">— Select Board —</option>
            {boards.map(b => <option key={b.shortName} value={b.shortName}>{b.name}</option>)}
          </select>
        </div>

        {/* Medium — only for boards that offer multiple mediums */}
        {availMediums && (
          <div className="fg" style={{ marginBottom: 0 }}>
            <label style={S.label}>Medium</label>
            <select style={S.select} value={medium} onChange={e => setMedium(e.target.value)} disabled={!board}>
              {availMediums.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}

        {/* Class */}
        <div className="fg" style={{ marginBottom: 0 }}>
          <label style={S.label}>Class</label>
          <select style={S.select} value={classNum} onChange={e => { setClassNum(e.target.value); setSubject(''); setStream('') }} disabled={!board}>
            <option value="">— Select Class —</option>
            {classes.map(c => <option key={c} value={c}>Class {c}</option>)}
          </select>
        </div>

        {/* Stream — only for Class 11-12 on applicable boards */}
        {showStream && (
          <div className="fg" style={{ marginBottom: 0 }}>
            <label style={S.label}>Stream</label>
            <select style={S.select} value={stream} onChange={e => { setStream(e.target.value); setSubject('') }} disabled={!classNum}>
              <option value="">— All Subjects —</option>
              {STREAMS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {/* Subject */}
        <div className="fg" style={{ marginBottom: 0 }}>
          <label style={S.label}>Subject</label>
          <select style={S.select} value={subject} onChange={e => setSubject(e.target.value)} disabled={!classNum}>
            <option value="">— Select Subject —</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Action Row */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          className="btn-saffron"
          style={{ ...S.btn('primary'), opacity: ready ? 1 : 0.5 }}
          onClick={handleLoad}
          disabled={!ready || loading}
        >
          {loading ? <span style={S.spinner} /> : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              📖 {buttonLabel}
            </span>
          )}
        </button>
      </div>

      {error && (
        <div style={{ color: C.red, fontSize: '13px', padding: '10px', background: C.redLight, borderRadius: '8px', border: `1px solid ${C.redBorder}`, marginTop: '8px' }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  )
}
