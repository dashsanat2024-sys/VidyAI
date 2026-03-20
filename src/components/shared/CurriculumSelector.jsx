import { useState, useEffect } from 'react'
import { INDIA_STATES, STATE_BOARDS, getSubjects } from '../panels/indiaCurriculum'

const C = {
  indigo:  '#4f46e5', indigoDark: '#3730a3', indigoLight: '#eef2ff', indigoBorder: '#c7d2fe',
  slate:   '#64748b', slateBorder: '#e2e8f0',
  purple:  '#7c3aed', purpleLight:'#f5f3ff', purpleBorder:'#ddd6fe',
  red:     '#dc2626', redLight:   '#fef2f2', redBorder:   '#fecaca',
}

const S = {
  label: {
    fontSize: '12px', fontWeight: '700', color: C.slate,
    display: 'block', marginBottom: '5px',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  select: {
    width: '100%', padding: '10px 12px',
    border: `1.5px solid ${C.slateBorder}`, borderRadius: '8px',
    fontSize: '14px', fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box', color: '#0f172a', background: '#fff',
    cursor: 'pointer', transition: 'border-color .15s',
  },
  btn: (v = 'primary', extra = {}) => ({
    padding: '10px 20px', borderRadius: '10px', border: 'none',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px',
    fontWeight: '600', transition: 'all .15s', display: 'inline-flex',
    alignItems: 'center', gap: '6px', ...extra,
    ...(v === 'primary' ? {
      background: `linear-gradient(135deg,${C.purple},${C.indigo})`,
      color: '#fff', boxShadow: '0 2px 8px rgba(109,40,217,.25)',
    } : {
      background: '#fff', color: C.slate, border: `1px solid ${C.slateBorder}`
    }),
  }),
  spinner: {
    width: '18px', height: '18px', border: '2px solid #e2e8f0',
    borderTop: `2px solid ${C.purple}`, borderRadius: '50%',
    animation: 'spin .7s linear infinite', display: 'inline-block',
  },
}

/**
 * Shared CurriculumSelector component
 * cascading: State -> Board -> Class -> Subject
 * 
 * Props:
 *  - token: string (for API calls)
 *  - onComplete: function({ state, board, classNum, subject, chapters, syllabus_id, name })
 *  - buttonLabel: string (default: "Load Chapters")
 */
export default function CurriculumSelector({ token, onComplete, buttonLabel = "Load Chapters" }) {
  const [state, setState]       = useState('')
  const [board, setBoard]       = useState('')
  const [classNum, setClassNum] = useState('')
  const [subject, setSubject]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const boards   = STATE_BOARDS[state] || []
  const classes  = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const subjects = board && classNum ? getSubjects(board, classNum) : []

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
          subject
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load chapters')
      
      onComplete({
        state,
        board,
        classNum,
        subject,
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
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {/* State */}
        <div>
          <label style={S.label}>State / UT</label>
          <select style={S.select} value={state} onChange={e => { setState(e.target.value); setBoard(''); setClassNum(''); setSubject('') }}>
            <option value="">— Select State —</option>
            {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Board */}
        <div>
          <label style={S.label}>Board</label>
          <select style={S.select} value={board} onChange={e => { setBoard(e.target.value); setSubject('') }} disabled={!state}>
            <option value="">— Select Board —</option>
            {boards.map(b => <option key={b.shortName} value={b.shortName}>{b.name}</option>)}
          </select>
        </div>

        {/* Class */}
        <div>
          <label style={S.label}>Class</label>
          <select style={S.select} value={classNum} onChange={e => { setClassNum(e.target.value); setSubject('') }} disabled={!board}>
            <option value="">— Select Class —</option>
            {classes.map(c => <option key={c} value={c}>Class {c}</option>)}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label style={S.label}>Subject</label>
          <select style={S.select} value={subject} onChange={e => setSubject(e.target.value)} disabled={!classNum}>
            <option value="">— Select Subject —</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ color: C.red, fontSize: '13px', padding: '10px', background: C.redLight, borderRadius: '8px', border: `1px solid ${C.redBorder}` }}>
          ⚠️ {error}
        </div>
      )}

      <button 
        style={{ ...S.btn('primary', { width: '100%', justifyContent: 'center', padding: '12px' }), opacity: ready ? 1 : 0.5 }}
        onClick={handleLoad}
        disabled={!ready || loading}
      >
        {loading ? <span style={S.spinner} /> : buttonLabel}
      </button>
    </div>
  )
}
