/**
 * QMasterPanel.jsx — Question Master
 *
 * Cascading curriculum selector: State → Board → Class → Subject → Chapters
 * Then: configure question count/marks → Generate → Review → Save → Print Pack
 *
 * The saved Exam ID links directly to Evaluation Central for grading.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp }  from '../../context/AppContext'

const API = import.meta.env.VITE_API_URL || ''

async function apiFetch(path, opts = {}, token) {
  const res = await fetch(`${API}/api${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

// ── Colour tokens ──────────────────────────────────────────────────────────────
const C = {
  indigo:  '#4f46e5', indigoDark: '#3730a3', indigoLight: '#eef2ff', indigoBorder: '#c7d2fe',
  green:   '#059669', greenDark:  '#065f46', greenLight:  '#ecfdf5', greenBorder:  '#86efac',
  purple:  '#7c3aed', purpleLight:'#f5f3ff', purpleBorder:'#ddd6fe',
  slate:   '#64748b', slateLight: '#f8fafc', slateBorder: '#e2e8f0',
  red:     '#dc2626', redLight:   '#fef2f2', redBorder:   '#fecaca',
  amber:   '#d97706', amberLight: '#fffbeb', amberBorder: '#fde68a',
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const S = {
  panel: {
    minHeight: '100%',
    background: '#f8fafc',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  header: {
    background: '#fff',
    borderBottom: `1px solid ${C.slateBorder}`,
    padding: '20px 28px 16px',
    position: 'sticky', top: 0, zIndex: 10,
  },
  body: { padding: '24px 28px' },
  card: {
    background: '#fff', borderRadius: '14px',
    border: `1px solid ${C.slateBorder}`,
    padding: '22px', marginBottom: '18px',
    boxShadow: '0 1px 3px rgba(0,0,0,.05)',
  },
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
  input: {
    width: '100%', padding: '10px 12px',
    border: `1.5px solid ${C.slateBorder}`, borderRadius: '8px',
    fontSize: '14px', fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box', color: '#0f172a', transition: 'border-color .15s',
  },
  btn: (v = 'primary', extra = {}) => ({
    padding: '10px 20px', borderRadius: '10px', border: 'none',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px',
    fontWeight: '600', transition: 'all .15s', display: 'inline-flex',
    alignItems: 'center', gap: '6px', ...extra,
    ...(v === 'primary' ? {
      background: `linear-gradient(135deg,${C.purple},${C.indigo})`,
      color: '#fff', boxShadow: '0 2px 8px rgba(109,40,217,.25)',
    } : v === 'success' ? {
      background: C.greenLight, color: C.greenDark,
      border: `1.5px solid ${C.greenBorder}`,
    } : v === 'ghost' ? {
      background: C.slateLight, color: C.slate,
      border: `1px solid ${C.slateBorder}`,
    } : v === 'danger' ? {
      background: C.redLight, color: C.red,
      border: `1px solid ${C.redBorder}`,
    } : {}),
  }),
  chip: (active, color = C.indigo, lightColor = C.indigoLight, borderColor = C.indigoBorder) => ({
    padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '600',
    cursor: 'pointer', border: `1.5px solid ${active ? color : borderColor}`,
    background: active ? color : lightColor,
    color: active ? '#fff' : color,
    transition: 'all .15s', userSelect: 'none',
  }),
  sectionHeader: (bg, border, text) => ({
    padding: '8px 14px', borderRadius: '8px', fontSize: '11px',
    fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: '10px', background: bg, border: `1px solid ${border}`,
    color: text,
  }),
  spinner: {
    width: '18px', height: '18px', border: '2px solid #e2e8f0',
    borderTop: `2px solid ${C.purple}`, borderRadius: '50%',
    animation: 'spin .7s linear infinite', display: 'inline-block',
  },
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Select Curriculum', 'Configure', 'Review & Print']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '22px' }}>
      {steps.map((label, i) => {
        const done    = i < step
        const active  = i === step
        const color   = done ? C.green : active ? C.purple : C.slate
        const bg      = done ? C.greenLight : active ? C.purpleLight : '#fff'
        const border  = done ? C.greenBorder : active ? C.purpleBorder : C.slateBorder
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
              flex: 1, padding: '10px 8px', background: bg,
              border: `1.5px solid ${border}`, borderRadius: '10px',
              transition: 'all .2s' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%',
                background: color, color: '#fff', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                {done ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: '11px', fontWeight: '600', color,
                textAlign: 'center' }}>{label}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: '20px', height: '2px', flexShrink: 0,
                background: i < step ? C.green : C.slateBorder }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1: Cascading curriculum selector ─────────────────────────────────────
function CurriculumSelector({ token, onComplete }) {
  const [metadata, setMetadata]     = useState(null)   // full CURRICULUM_DATA
  const [state, setState]           = useState('')
  const [board, setBoard]           = useState('')
  const [cls, setCls]               = useState('')
  const [subject, setSubject]       = useState('')
  const [chapters, setChapters]     = useState([])
  const [selChapters, setSelChapters] = useState([])   // selected chapter subset
  const [syllabusId, setSyllabusId] = useState('')
  const [syllabusName, setSyllabusName] = useState('')
  const [loadingChapters, setLoadingChapters] = useState(false)
  const [error, setError]           = useState('')

  // Load full curriculum tree once
  useEffect(() => {
    apiFetch('/curriculum/metadata', {}, token)
      .then(d => setMetadata(d.metadata || {}))
      .catch(e => setError(e.message))
  }, [token])

  // Derived lists from selections
  const states  = metadata ? Object.keys(metadata).sort() : []
  const boards  = (metadata && state) ? Object.keys(metadata[state] || {}) : []
  const classes = (metadata && state && board)
    ? Object.keys(metadata[state]?.[board] || {}).sort((a, b) => {
        const na = parseInt(a.replace(/\D/g,''))
        const nb = parseInt(b.replace(/\D/g,''))
        return na - nb
      })
    : []
  const subjects = (metadata && state && board && cls)
    ? (metadata[state]?.[board]?.[cls] || [])
    : []

  // Reset downstream when upstream changes
  const handleState = (v) => {
    setState(v); setBoard(''); setCls(''); setSubject('')
    setChapters([]); setSelChapters([]); setSyllabusId('')
  }
  const handleBoard = (v) => {
    setBoard(v); setCls(''); setSubject('')
    setChapters([]); setSelChapters([]); setSyllabusId('')
  }
  const handleClass = (v) => {
    setCls(v); setSubject('')
    setChapters([]); setSelChapters([]); setSyllabusId('')
  }
  const handleSubject = async (v) => {
    setSubject(v); setChapters([]); setSelChapters([]); setSyllabusId('')
    if (!v) return
    setLoadingChapters(true); setError('')
    try {
      const d = await apiFetch('/curriculum/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board, class: cls, subject: v }),
      }, token)
      setChapters(d.chapters || [])
      setSyllabusId(d.syllabus_id || '')
      setSyllabusName(d.name || '')
      setSelChapters([])   // reset — teacher picks which chapters to include
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingChapters(false)
    }
  }

  const toggleChapter = (ch) => {
    setSelChapters(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    )
  }

  const handleContinue = () => {
    if (!syllabusId || !subject) return
    onComplete({
      syllabusId,
      syllabusName,
      state, board, cls, subject,
      chapters: selChapters.length > 0 ? selChapters : chapters,
      selectedChapters: selChapters,
      allChapters: chapters,
    })
  }

  const ready = syllabusId && subject

  return (
    <div style={S.card}>
      <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '18px',
        display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px' }}>🗺️</span> Select Curriculum
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '14px',
          background: C.redLight, color: C.red, fontSize: '13px',
          border: `1px solid ${C.redBorder}` }}>⚠️ {error}</div>
      )}

      {/* 4-column grid: State | Board | Class | Subject */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px', marginBottom: '16px' }}>

        {/* State */}
        <div>
          <label style={S.label}>State / Region</label>
          <select style={S.select} value={state} onChange={e => handleState(e.target.value)}>
            <option value="">— State —</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Board */}
        <div>
          <label style={S.label}>Board</label>
          <select style={S.select} value={board}
            onChange={e => handleBoard(e.target.value)} disabled={!state}>
            <option value="">— Board —</option>
            {boards.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Class */}
        <div>
          <label style={S.label}>Class</label>
          <select style={S.select} value={cls}
            onChange={e => handleClass(e.target.value)} disabled={!board}>
            <option value="">— Class —</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Subject — auto-populated from class selection */}
        <div>
          <label style={S.label}>
            Subject
            {loadingChapters && (
              <span style={{ marginLeft: '6px', display: 'inline-block',
                ...S.spinner }} />
            )}
          </label>
          <select style={S.select} value={subject}
            onChange={e => handleSubject(e.target.value)} disabled={!cls}>
            <option value="">— Subject —</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Summary pill when all four are selected */}
      {state && board && cls && subject && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 14px', borderRadius: '8px', marginBottom: '16px',
          background: C.purpleLight, border: `1px solid ${C.purpleBorder}` }}>
          <span style={{ fontSize: '14px' }}>📚</span>
          <span style={{ fontWeight: '600', color: C.purple, fontSize: '13px' }}>
            {board} · {cls} · {subject}
          </span>
          <span style={{ color: C.slate, fontSize: '12px', marginLeft: 'auto' }}>
            {state}
          </span>
        </div>
      )}

      {/* Chapter selection */}
      {chapters.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ ...S.label, marginBottom: 0 }}>
              Chapters ({selChapters.length === 0
                ? `All ${chapters.length} selected`
                : `${selChapters.length} of ${chapters.length} selected`})
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                style={{ ...S.btn('ghost', { fontSize: '11px', padding: '4px 10px' }) }}
                onClick={() => setSelChapters([])}
              >All chapters</button>
              <button
                style={{ ...S.btn('ghost', { fontSize: '11px', padding: '4px 10px' }) }}
                onClick={() => setSelChapters([...chapters])}
              >Select all</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px',
            maxHeight: '180px', overflowY: 'auto', padding: '10px',
            background: C.slateLight, borderRadius: '8px',
            border: `1px solid ${C.slateBorder}` }}>
            {chapters.map(ch => (
              <span
                key={ch}
                style={S.chip(selChapters.includes(ch), C.indigo, C.indigoLight, C.indigoBorder)}
                onClick={() => toggleChapter(ch)}
              >
                {selChapters.includes(ch) ? '✓ ' : ''}{ch}
              </span>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: C.slate, marginTop: '6px' }}>
            Leave all unselected to generate from the entire syllabus ·
            Click chapters to include only specific ones
          </div>
        </div>
      )}

      {/* Continue button */}
      <button
        style={{ ...S.btn('primary', { width: '100%', justifyContent: 'center',
          marginTop: '18px', padding: '13px', fontSize: '15px' }),
          opacity: ready ? 1 : 0.5, cursor: ready ? 'pointer' : 'not-allowed' }}
        onClick={handleContinue}
        disabled={!ready || loadingChapters}
      >
        {loadingChapters
          ? <><span style={S.spinner} /> Loading chapters…</>
          : <>Continue to Question Configuration →</>}
      </button>
    </div>
  )
}

// ── Step 2: Question configuration + generation ───────────────────────────────
function QuestionConfig({ curriculum, token, user, onGenerated, onBack }) {
  const [objCount,   setObjCount]   = useState(6)
  const [subjCount,  setSubjCount]  = useState(4)
  const [objMarks,   setObjMarks]   = useState(1)
  const [subjMarks,  setSubjMarks]  = useState(4)
  const [difficulty, setDifficulty] = useState('mixed')
  const [schoolName, setSchoolName] = useState(user?.institution || '')
  const [teacherName,setTeacherName]= useState(user?.name || '')
  const [examDate,   setExamDate]   = useState(new Date().toISOString().slice(0,10))
  const [duration,   setDuration]   = useState(120)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const totalMarks = objCount * objMarks + subjCount * subjMarks

  const handleGenerate = async () => {
    setLoading(true); setError('')
    try {
      const body = {
        syllabus_id:          curriculum.syllabusId,
        topic:                curriculum.selectedChapters.length > 0
                                ? curriculum.selectedChapters.join(', ')
                                : curriculum.subject,
        chapters:             curriculum.selectedChapters,
        objective_count:      objCount,
        subjective_count:     subjCount,
        objective_weightage:  objMarks,
        subjective_weightage: subjMarks,
        difficulty,
        school_name:          schoolName,
        teacher_name:         teacherName,
        exam_date:            examDate,
        time_minutes:         duration,
        subject:              curriculum.subject,
        board:                curriculum.board,
        class:                curriculum.cls,
        class_name:           curriculum.cls,
        state:                curriculum.state,
      }
      const data = await apiFetch('/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }, token)

      onGenerated({
        questions:    data.questions || [],
        examId:       data.exam_id,
        examMeta: {
          syllabusId:   curriculum.syllabusId,
          syllabusName: curriculum.syllabusName,
          subject:      curriculum.subject,
          board:        curriculum.board,
          cls:          curriculum.cls,
          state:        curriculum.state,
          schoolName, teacherName, examDate, duration,
          difficulty,
          downloadUrls: data._download_urls || {},
        },
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const DIFF_OPTIONS = [
    { value: 'easy',   label: 'Easy',   color: C.green },
    { value: 'medium', label: 'Medium', color: C.amber },
    { value: 'hard',   label: 'Hard',   color: C.red },
    { value: 'mixed',  label: 'Mixed',  color: C.purple },
  ]

  return (
    <div>
      {/* Curriculum summary strip */}
      <div style={{ padding: '10px 16px', borderRadius: '10px', marginBottom: '16px',
        background: C.purpleLight, border: `1px solid ${C.purpleBorder}`,
        display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '18px' }}>📚</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '700', color: C.purple, fontSize: '14px' }}>
            {curriculum.syllabusName}
          </div>
          <div style={{ fontSize: '12px', color: C.slate, marginTop: '2px' }}>
            {curriculum.selectedChapters.length > 0
              ? `${curriculum.selectedChapters.length} chapters selected`
              : `All ${curriculum.allChapters.length} chapters`}
            {' · '}{curriculum.state}
          </div>
        </div>
        <button style={S.btn('ghost', { fontSize: '12px', padding: '6px 12px' })}
          onClick={onBack}>← Change</button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '14px',
          background: C.redLight, color: C.red, fontSize: '13px',
          border: `1px solid ${C.redBorder}` }}>⚠️ {error}</div>
      )}

      <div style={S.card}>
        <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '18px',
          display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚙️</span> Question Settings
        </div>

        {/* Question counts + marks */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px',
          marginBottom: '18px' }}>
          {[
            { label: 'MCQ Questions',    val: objCount,  set: setObjCount,  min: 0, max: 30 },
            { label: 'Written Questions',val: subjCount, set: setSubjCount, min: 0, max: 20 },
            { label: 'Marks per MCQ',    val: objMarks,  set: setObjMarks,  min: 0.5, step: 0.5 },
            { label: 'Marks per Written',val: subjMarks, set: setSubjMarks, min: 1, step: 1 },
          ].map(({ label, val, set, min, max, step }) => (
            <div key={label}>
              <label style={S.label}>{label}</label>
              <input style={S.input} type="number" value={val}
                min={min} max={max} step={step || 1}
                onChange={e => set(+e.target.value)} />
            </div>
          ))}
        </div>

        {/* Total marks display */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '18px',
          padding: '10px 14px', borderRadius: '8px',
          background: C.slateLight, border: `1px solid ${C.slateBorder}` }}>
          {[
            { label: 'Section A (MCQ)', value: `${objCount} × ${objMarks} = ${objCount*objMarks}m` },
            { label: 'Section B (Written)', value: `${subjCount} × ${subjMarks} = ${subjCount*subjMarks}m` },
            { label: 'Total Marks', value: `${totalMarks}m`, highlight: true },
            { label: 'Total Questions', value: objCount + subjCount },
          ].map(({ label, value, highlight }) => (
            <div key={label} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: C.slate, textTransform: 'uppercase',
                fontWeight: '600', letterSpacing: '0.04em' }}>{label}</div>
              <div style={{ fontSize: highlight ? '18px' : '16px', fontWeight: '700',
                color: highlight ? C.purple : '#0f172a', marginTop: '2px' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Difficulty */}
        <div style={{ marginBottom: '18px' }}>
          <label style={S.label}>Difficulty</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {DIFF_OPTIONS.map(({ value, label, color }) => (
              <span
                key={value}
                style={S.chip(difficulty === value, color,
                  difficulty === value ? color : '#fff',
                  difficulty === value ? color : C.slateBorder)}
                onClick={() => setDifficulty(value)}
              >{label}</span>
            ))}
          </div>
        </div>

        {/* Exam metadata */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px', marginBottom: '18px' }}>
          <div>
            <label style={S.label}>School / Institution</label>
            <input style={S.input} value={schoolName} placeholder="School name"
              onChange={e => setSchoolName(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Teacher Name</label>
            <input style={S.input} value={teacherName} placeholder="Your name"
              onChange={e => setTeacherName(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Exam Date</label>
            <input style={S.input} type="date" value={examDate}
              onChange={e => setExamDate(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Duration (minutes)</label>
            <input style={S.input} type="number" value={duration} min={15} step={15}
              onChange={e => setDuration(+e.target.value)} />
          </div>
        </div>

        <button
          style={{ ...S.btn('primary', { width: '100%', justifyContent: 'center',
            padding: '14px', fontSize: '15px' }),
            opacity: (objCount + subjCount) > 0 ? 1 : 0.5 }}
          onClick={handleGenerate}
          disabled={loading || (objCount + subjCount) === 0}
        >
          {loading
            ? <><span style={S.spinner} />  Generating {objCount + subjCount} questions…</>
            : <>✨ Generate {objCount + subjCount} Questions ({totalMarks} marks)</>}
        </button>
      </div>
    </div>
  )
}

// ── QuestionCard: collapsible question display ─────────────────────────────────
function QuestionCard({ q, onDelete }) {
  const [open, setOpen] = useState(false)
  const isObj = q.type === 'objective'
  const correct = q.answer?.toUpperCase()

  return (
    <div style={{ border: `1px solid ${C.slateBorder}`, borderRadius: '10px',
      marginBottom: '8px', overflow: 'hidden', background: '#fff' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px', cursor: 'pointer',
        background: open ? (isObj ? C.indigoLight : C.greenLight) : '#fafafa' }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ width: '26px', height: '26px', borderRadius: '6px', flexShrink: 0,
          background: isObj ? C.indigo : C.green,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: '700', fontSize: '11px', color: '#fff' }}>
          Q{q.id}
        </div>
        <div style={{ flex: 1, fontSize: '13px', color: '#1e293b', fontWeight: '500',
          lineHeight: 1.4 }}>
          {q.question?.slice(0, 100)}{q.question?.length > 100 ? '…' : ''}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
            background: isObj ? C.indigoLight : C.greenLight,
            color: isObj ? C.indigo : C.green, fontWeight: '600', border: `1px solid ${isObj ? C.indigoBorder : C.greenBorder}` }}>
            {isObj ? 'MCQ' : 'Written'}
          </span>
          <span style={{ fontSize: '11px', color: C.slate, fontWeight: '600' }}>
            {q.marks}m
          </span>
          <span style={{ fontSize: '12px', color: C.slate }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.slateBorder}` }}>
          <div style={{ fontSize: '13px', color: '#1e293b', marginBottom: '10px',
            fontWeight: '500', lineHeight: 1.6 }}>{q.question}</div>

          {isObj && q.options && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: '6px', marginBottom: '10px' }}>
              {Object.entries(q.options).map(([k, v]) => {
                const isCorrect = correct === k
                return (
                  <div key={k} style={{ padding: '7px 12px', borderRadius: '8px',
                    fontSize: '12px', border: `1.5px solid ${isCorrect ? C.greenBorder : C.slateBorder}`,
                    background: isCorrect ? C.greenLight : C.slateLight,
                    color: isCorrect ? C.greenDark : '#374151',
                    fontWeight: isCorrect ? '700' : '400',
                    display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                      background: isCorrect ? C.green : '#e2e8f0',
                      color: isCorrect ? '#fff' : C.slate,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: '700' }}>{k}</span>
                    {v}
                    {isCorrect && <span style={{ marginLeft: 'auto' }}>✓</span>}
                  </div>
                )
              })}
            </div>
          )}

          {q.answer && (
            <div style={{ fontSize: '12px', padding: '7px 12px', borderRadius: '7px',
              background: C.greenLight, border: `1px solid ${C.greenBorder}`,
              color: C.greenDark, marginBottom: '7px' }}>
              <strong>Answer:</strong> {q.answer}
            </div>
          )}
          {q.explanation && (
            <div style={{ fontSize: '12px', padding: '7px 12px', borderRadius: '7px',
              background: '#eff6ff', border: '1px solid #bfdbfe',
              color: '#1d4ed8', marginBottom: '7px', lineHeight: 1.5 }}>
              <strong>Explanation:</strong> {q.explanation}
            </div>
          )}
          {q.evaluation_criteria && (
            <div style={{ fontSize: '12px', padding: '7px 12px', borderRadius: '7px',
              background: C.amberLight, border: `1px solid ${C.amberBorder}`,
              color: '#92400e', marginBottom: '7px', lineHeight: 1.5 }}>
              <strong>Marking Criteria:</strong> {q.evaluation_criteria}
            </div>
          )}

          <button style={{ ...S.btn('danger', { fontSize: '12px', padding: '5px 12px',
            marginTop: '6px' }) }} onClick={onDelete}>
            🗑 Remove question
          </button>
        </div>
      )}
    </div>
  )
}

// ── Step 3: Review questions + print actions ───────────────────────────────────
function ReviewAndPrint({ questions, examId, examMeta, token, onBack, onRegenerate, showToast, navigateTo }) {
  const [saving, setSaving]       = useState(false)
  const [savedId, setSavedId]     = useState(examId)   // generate-questions auto-saves
  const [qs, setQs]               = useState(questions)

  const objQs  = qs.filter(q => q.type === 'objective')
  const subjQs = qs.filter(q => q.type !== 'objective')
  const total  = qs.reduce((s, q) => s + parseFloat(q.marks || 0), 0)

  const handleDelete = (idx) => {
    setQs(prev => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, id: i + 1 })))
    setSavedId(null)   // invalidate — need to re-save after edits
  }

  const handleSave = async () => {
    if (!qs.length) return
    setSaving(true)
    try {
      const syl = examMeta
      const data = await apiFetch('/exams/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions:    qs,
          syllabus_id:  syl.syllabusId,
          syllabus_name:syl.syllabusName,
          subject:      syl.subject,
          board:        syl.board,
          class:        syl.cls,
          state:        syl.state,
          school_name:  syl.schoolName,
          teacher_name: syl.teacherName,
          exam_date:    syl.examDate,
          time_minutes: syl.duration,
          difficulty:   syl.difficulty,
        }),
      }, token)
      setSavedId(data.exam_id)
      showToast('Exam saved — print links ready!', 'success')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const base = savedId ? `${API}/api/exams/${savedId}` : null

  return (
    <div>
      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px',
        marginBottom: '16px' }}>
        {[
          { label: 'Total Questions', value: qs.length, icon: '❓' },
          { label: 'MCQ', value: objQs.length, icon: '🔵', color: C.indigo },
          { label: 'Written', value: subjQs.length, icon: '🟢', color: C.green },
          { label: 'Total Marks', value: total, icon: '🏆', color: C.purple },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: '10px', padding: '12px',
            border: `1px solid ${C.slateBorder}`, textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            <div style={{ fontSize: '18px', marginBottom: '4px' }}>{icon}</div>
            <div style={{ fontSize: '22px', fontWeight: '800',
              color: color || '#0f172a' }}>{value}</div>
            <div style={{ fontSize: '11px', color: C.slate, fontWeight: '600' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Print actions — shown when saved */}
      {savedId && (
        <div style={{ ...S.card, background: 'linear-gradient(135deg,#f0fdf4,#ecfdf5)',
          border: `1.5px solid ${C.greenBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px',
            marginBottom: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%',
              background: C.greenLight, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>✓</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', color: C.greenDark, fontSize: '14px' }}>
                Exam saved — ready to distribute
              </div>
              <div style={{ fontSize: '12px', color: C.green, marginTop: '1px' }}>
                {examMeta.syllabusName}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: C.slate }}>EXAM ID</div>
              <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '700',
                color: C.purple, background: C.purpleLight,
                padding: '3px 10px', borderRadius: '6px', marginTop: '2px' }}>
                {savedId}
              </div>
            </div>
          </div>

          {/* Primary: Print Pack */}
          <a href={`${base}/combined-print?token=${token}`} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '10px', padding: '13px', borderRadius: '10px',
              background: C.purple, color: '#fff', textDecoration: 'none',
              fontWeight: '700', fontSize: '15px', marginBottom: '10px',
              boxShadow: '0 4px 12px rgba(124,58,237,.3)',
              transition: 'transform .15s, box-shadow .15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 16px rgba(124,58,237,.4)' }}
            onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 12px rgba(124,58,237,.3)' }}
          >
            🖨️ &nbsp; Download Print Pack (Question Paper + Answer Sheet)
          </a>

          {/* Workflow steps */}
          <div style={{ background: 'rgba(255,255,255,.8)', borderRadius: '8px',
            padding: '10px 12px', marginBottom: '10px',
            border: `1px solid ${C.greenBorder}` }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: C.greenDark,
              marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Distribution Workflow
            </div>
            {[
              ['① Print', 'Print the Pack — contains Question Paper + Answer Sheet together'],
              ['② Distribute', 'Give each student their set — one Question Paper + one Answer Sheet'],
              ['③ Students answer', 'MCQ: circle the bubble (A/B/C/D)  ·  Written: write in the ruled box'],
              ['④ Collect & scan', 'Collect filled Answer Sheets and scan them to PDF or photo'],
              ['⑤ Upload & grade', `Go to Evaluation Central → Select Exam ID: ${savedId} → Upload scans`],
            ].map(([step, desc]) => (
              <div key={step} style={{ display: 'flex', gap: '8px',
                fontSize: '12px', color: '#374151', marginBottom: '4px' }}>
                <span style={{ fontWeight: '700', color: C.purple,
                  minWidth: '55px', flexShrink: 0 }}>{step}</span>
                <span style={{ lineHeight: 1.4 }}>{desc}</span>
              </div>
            ))}
          </div>

          {/* Individual PDFs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '7px' }}>
            {[
              { href: `${base}/question-paper?token=${token}`, icon: '📝', label: 'Question Paper', sub: 'Questions only', color: C.indigoDark, bg: C.indigoLight, border: C.indigoBorder },
              { href: `${base}/answer-sheet?token=${token}`,   icon: '🖊', label: 'Answer Sheet',   sub: 'Bubbles + boxes', color: C.greenDark,  bg: C.greenLight,  border: C.greenBorder },
              { href: `${base}/answer-key?token=${token}`,     icon: '🔑', label: 'Answer Key',     sub: 'Teacher only',   color: '#7f1d1d',     bg: '#fef2f2',     border: '#fca5a5' },
            ].map(d => (
              <a key={d.label} href={d.href} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '8px 6px', borderRadius: '8px', textDecoration: 'none',
                  background: d.bg, border: `1.5px solid ${d.border}`,
                  transition: 'transform .15s' }}
                onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform=''}>
                <span style={{ fontSize: '16px', marginBottom: '2px' }}>{d.icon}</span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: d.color }}>{d.label}</span>
                <span style={{ fontSize: '9px', color: C.slate, marginTop: '1px' }}>{d.sub}</span>
              </a>
            ))}
          </div>
          {/* Go to Evaluation Central */}
          <button
            onClick={() => navigateTo?.('eval')}
            style={{ width: '100%', padding: '11px', borderRadius: '10px',
              background: '#eef2ff', border: '1.5px solid #c7d2fe',
              color: '#3730a3', fontWeight: '700', fontSize: '13px',
              cursor: 'pointer', fontFamily: 'inherit', marginTop: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            📊 Go to Evaluation Central → Upload Scanned Answer Sheets
          </button>
        </div>
      )}

      {/* Action buttons when not yet saved or after edits */}
      {!savedId && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <button style={{ ...S.btn('primary', { flex: 1, justifyContent: 'center',
            padding: '13px' }) }}
            onClick={handleSave} disabled={saving || !qs.length}>
            {saving ? <><span style={S.spinner} /> Saving…</> : '💾 Save Exam & Get Print Links'}
          </button>
          <button style={S.btn('ghost')} onClick={onRegenerate}>🔄 Regenerate</button>
          <button style={S.btn('ghost')} onClick={onBack}>← Back</button>
        </div>
      )}

      {savedId && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button style={S.btn('ghost')} onClick={onRegenerate}>🔄 Regenerate Questions</button>
          <button style={S.btn('ghost')} onClick={onBack}>← Change Curriculum</button>
        </div>
      )}

      {/* Question list */}
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '15px' }}>
            Questions
          </div>
          {savedId && (
            <button style={{ ...S.btn('ghost', { fontSize: '11px', padding: '5px 12px' }) }}
              onClick={handleSave} disabled={saving}>
              {saving ? '…' : '💾 Re-save after edits'}
            </button>
          )}
        </div>

        {objQs.length > 0 && (
          <>
            <div style={S.sectionHeader(C.indigoLight, C.indigoBorder, C.indigo)}>
              Section A — Objective ({objQs.length} questions · {objQs.reduce((s,q)=>s+q.marks,0)}m)
            </div>
            {objQs.map((q, i) => (
              <QuestionCard key={q.id} q={q}
                onDelete={() => handleDelete(qs.findIndex(x => x.id === q.id))} />
            ))}
          </>
        )}
        {subjQs.length > 0 && (
          <>
            <div style={{ ...S.sectionHeader(C.greenLight, C.greenBorder, C.green), marginTop: '12px' }}>
              Section B — Written ({subjQs.length} questions · {subjQs.reduce((s,q)=>s+q.marks,0)}m)
            </div>
            {subjQs.map((q, i) => (
              <QuestionCard key={q.id} q={q}
                onDelete={() => handleDelete(qs.findIndex(x => x.id === q.id))} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ── Main QMasterPanel ──────────────────────────────────────────────────────────
export function QMasterPanel({ showToast }) {
  const { token, me: user } = useAuth()
  const { navigateTo }  = useApp()
  const [step, setStep]               = useState(0)   // 0=curriculum 1=config 2=review
  const [curriculum, setCurriculum]   = useState(null)
  const [generated, setGenerated]     = useState(null)

  const handleCurriculumDone = (data) => {
    setCurriculum(data)
    setStep(1)
  }

  const handleGenerated = (data) => {
    setGenerated(data)
    setStep(2)
  }

  const handleBack = () => setStep(s => Math.max(0, s - 1))

  const handleRegenerate = () => setStep(1)

  return (
    <div style={S.panel}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        input:focus, select:focus {
          border-color: ${C.purple} !important;
          box-shadow: 0 0 0 3px rgba(124,58,237,.12);
        }
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px',
          marginBottom: '14px' }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#0f172a',
            display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📋</span> Question Master
          </h1>
          {curriculum && (
            <div style={{ marginLeft: 'auto', fontSize: '12px', color: C.slate,
              background: C.slateLight, padding: '5px 12px', borderRadius: '8px',
              border: `1px solid ${C.slateBorder}` }}>
              {curriculum.syllabusName}
            </div>
          )}
        </div>
        <StepBar step={step} />
      </div>

      <div style={S.body}>
        {step === 0 && (
          <CurriculumSelector token={token} onComplete={handleCurriculumDone} />
        )}
        {step === 1 && curriculum && (
          <QuestionConfig
            curriculum={curriculum}
            token={token}
            user={user}
            onGenerated={handleGenerated}
            onBack={handleBack}
          />
        )}
        {step === 2 && generated && (
          <ReviewAndPrint
            questions={generated.questions}
            examId={generated.examId}
            examMeta={generated.examMeta}
            token={token}
            onBack={() => setStep(0)}
            onRegenerate={handleRegenerate}
            showToast={showToast}
            navigateTo={navigateTo}
          />
        )}
      </div>
    </div>
  )
}

export default QMasterPanel
