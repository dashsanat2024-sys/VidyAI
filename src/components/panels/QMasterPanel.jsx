/**
 * QMasterPanel.jsx — Question Master
 *
 * Cascading curriculum selector: State → Board → Class → Subject → Chapters
 * Then: configure question count/marks → Generate → Review → Save → Print Pack
 *
 * The saved Exam ID links directly to Evaluation Central for grading.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp }  from '../../context/AppContext'
import SharedCurriculumSelector from '../shared/CurriculumSelector'

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
  const [sourceMode, setSourceMode] = useState('curriculum')  // 'curriculum' | 'upload'
  const [chapters, setChapters]       = useState([])
  const [selChapters, setSelChapters] = useState([])
  const [syllabusId, setSyllabusId]   = useState('')
  const [syllabusName, setSyllabusName] = useState('')
  const [meta, setMeta]               = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadedName,  setUploadedName]  = useState('')
  const uploadRef = useRef(null)

  const handleDocUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('syllabus_name', file.name.replace(/\.[^/.]+$/, ''))
      const res = await fetch(`${API}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setSyllabusId(data.syllabus_id || '')
      setSyllabusName(data.syllabus_name || file.name)
      setUploadedName(data.syllabus_name || file.name)
      setChapters(data.chapters || [])
      setSelChapters([])
      setMeta({ state: '', board: 'Uploaded Document', cls: '', subject: file.name.replace(/\.[^/.]+$/, '') })
    } catch (err) {
      alert(err.message || 'Upload failed')
    }
    setUploadLoading(false)
    if (uploadRef.current) uploadRef.current.value = ''
  }

  const handleSelectionComplete = (data) => {
    setChapters(data.chapters || [])
    setSyllabusId(data.syllabus_id || '')
    setSyllabusName(data.name || '')
    setMeta({
      state: data.state,
      board: data.board,
      cls: data.classNum,
      subject: data.subject
    })
    setSelChapters([]) // reset
  }

  const toggleChapter = (ch) => {
    setSelChapters(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    )
  }

  const handleContinue = () => {
    if (!syllabusId) return
    const completeMeta = meta || { state: '', board: '', cls: '', subject: syllabusName }
    onComplete({
      syllabusId,
      syllabusName,
      ...completeMeta,
      chapters: selChapters.length > 0 ? selChapters : chapters,
      selectedChapters: selChapters,
      allChapters: chapters,
    })
  }

  const ready = !!syllabusId

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a',
          display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🗺️</span> Select Curriculum
        </div>
        {/* Source mode toggle */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            style={{ ...S.btn(sourceMode === 'curriculum' ? 'primary' : 'ghost', { fontSize: '11px', padding: '5px 12px' }) }}
            onClick={() => setSourceMode('curriculum')}>
            📚 Curriculum
          </button>
          <button
            style={{ ...S.btn('ghost', { fontSize: '11px', padding: '5px 12px',
              background: sourceMode === 'upload' ? C.amberLight : undefined,
              borderColor: sourceMode === 'upload' ? C.amber : undefined,
              color: sourceMode === 'upload' ? C.amber : undefined }) }}
            onClick={() => setSourceMode('upload')}>
            📎 Upload Doc
          </button>
        </div>
      </div>

      {/* ── Curriculum flow ── */}
      {sourceMode === 'curriculum' && (
        <>
          <SharedCurriculumSelector
            token={token}
            onComplete={handleSelectionComplete}
            buttonLabel="Fetch Syllabus Chapters"
          />
          {meta && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 14px', borderRadius: '10px', marginTop: '16px', marginBottom: '16px',
              background: C.purpleLight, border: `1px solid ${C.purpleBorder}` }}>
              <span style={{ fontSize: '14px' }}>📚</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', color: C.purple, fontSize: '13px' }}>
                  {meta.board} · Class {meta.cls} · {meta.subject}
                </div>
                <div style={{ fontSize: '11px', color: C.slate, marginTop: '2px' }}>
                  {meta.state} · {syllabusName}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Upload Document flow ── */}
      {sourceMode === 'upload' && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', color: C.slate, marginBottom: '14px', lineHeight: 1.6 }}>
            Upload any PDF, Word, or text document — Arthavi will generate questions directly from its content.
          </p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              style={S.btn('primary', { opacity: uploadLoading ? 0.7 : 1 })}
              onClick={() => uploadRef.current?.click()}
              disabled={uploadLoading}>
              {uploadLoading ? '⏳ Processing…' : '📎 Choose File'}
            </button>
            <span style={{ fontSize: '11px', color: C.slate }}>PDF, DOCX, TXT, MD supported</span>
          </div>
          <input ref={uploadRef} type="file" accept=".pdf,.docx,.txt,.md"
            style={{ display: 'none' }} onChange={handleDocUpload} />
          {uploadedName && (
            <div style={{ marginTop: '12px', padding: '10px 14px', background: C.greenLight,
              border: `1px solid ${C.greenBorder}`, borderRadius: '8px', fontSize: '13px',
              color: C.greenDark, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✅</span> <strong>{uploadedName}</strong> — ready
            </div>
          )}
        </div>
      )}

      {/* Chapter selection (shown for both modes when chapters available) */}
      {chapters.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ ...S.label, marginBottom: 0 }}>
              Specify Chapters ({selChapters.length === 0
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
        disabled={!ready}
      >
        Continue to Question Configuration →
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
    const today = new Date().toISOString().slice(0, 10)
    if (!duration || duration < 1) { setError('Please enter a valid duration (minimum 1 minute)'); return }
    if (examDate && examDate < today) { setError('Exam date cannot be a past date'); return }
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
              min={new Date().toISOString().slice(0, 10)}
              onChange={e => setExamDate(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Duration (minutes)</label>
            <input style={S.input} type="number" value={duration} min={1} max={300} step={5}
              onChange={e => setDuration(Math.max(1, +e.target.value))} />
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
function QuestionCard({ q, onDelete, onMarksChange, onCriteriaChange }) {
  const [open, setOpen] = useState(false)
  const [editingMarks, setEditingMarks] = useState(false)
  const [criteriaVal, setCriteriaVal]   = useState(q.evaluation_criteria || '')
  const isObj = q.type === 'objective'
  const correct = q.answer?.toUpperCase()

  const commitMarks = (raw) => {
    setEditingMarks(false)
    const v = parseFloat(raw)
    if (!isNaN(v) && v > 0 && v !== q.marks) onMarksChange?.(v)
  }

  return (
    <div style={{ border: `1px solid ${C.slateBorder}`, borderRadius: '10px',
      marginBottom: '8px', overflow: 'hidden', background: '#fff' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px', cursor: 'pointer',
        background: open ? (isObj ? C.indigoLight : C.greenLight) : '#fafafa' }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ width: '26px', height: '26px', borderRadius: '6px', flexShrink: 0,
          background: q.source === 'custom' ? C.amber : (isObj ? C.indigo : C.green),
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
          {q.source === 'custom' && (
            <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '999px',
              background: C.amberLight, color: C.amber, fontWeight: '700',
              border: `1px solid ${C.amberBorder}` }}>Custom</span>
          )}
          {editingMarks ? (
            <input
              type="number" min={0.5} step={0.5} defaultValue={q.marks} autoFocus
              style={{ width: '52px', padding: '2px 6px', borderRadius: '6px',
                border: `1.5px solid ${C.purple}`, fontSize: '12px', fontWeight: '700',
                outline: 'none', textAlign: 'center' }}
              onClick={e => e.stopPropagation()}
              onBlur={e => commitMarks(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitMarks(e.target.value); e.stopPropagation() }}
            />
          ) : (
            <span
              style={{ fontSize: '12px', color: C.purple, fontWeight: '700', cursor: 'pointer',
                padding: '2px 8px', borderRadius: '6px',
                background: C.purpleLight, border: `1px solid ${C.purpleBorder}` }}
              title="Click to edit marks"
              onClick={e => { e.stopPropagation(); setEditingMarks(true) }}
            >
              {q.marks}m ✏️
            </span>
          )}
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
          {/* Editable marking criteria for written/subjective questions */}
          {!isObj && (
            <div style={{ marginBottom: '10px' }}>
              <label style={{ ...S.label, color: C.amber, marginBottom: '4px' }}>
                ✦ Marking Criteria / Rubric
              </label>
              <textarea
                rows={3}
                value={criteriaVal}
                placeholder="e.g. 1m for correct definition · 2m for explanation with example · 1m for diagram"
                style={{ ...S.input, resize: 'vertical', lineHeight: 1.5, fontSize: '12px',
                  width: '100%', boxSizing: 'border-box' }}
                onChange={e => setCriteriaVal(e.target.value)}
                onBlur={() => onCriteriaChange?.(criteriaVal)}
              />
              <div style={{ fontSize: '10px', color: C.slate, marginTop: '2px' }}>
                Auto-saved on focus-out · Shown in answer key · Used by AI evaluator
              </div>
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

// ── Custom Question Form ────────────────────────────────────────────────────────
function CustomQuestionForm({ onAdd, onCancel }) {
  const [qType,       setQType]       = useState('objective')
  const [question,    setQuestion]    = useState('')
  const [opts,        setOpts]        = useState({ A: '', B: '', C: '', D: '' })
  const [answer,      setAnswer]      = useState('A')
  const [marks,       setMarks]       = useState(1)
  const [modelAnswer, setModelAnswer] = useState('')
  const [criteria,    setCriteria]    = useState('')

  const valid = question.trim() && (qType === 'subjective' || (opts.A.trim() && opts.B.trim()))

  const handleAdd = () => {
    if (!valid) return
    const q = { type: qType, question: question.trim(), marks: parseFloat(marks) || 1, source: 'custom' }
    if (qType === 'objective') {
      q.options = Object.fromEntries(Object.entries(opts).filter(([, v]) => v.trim()))
      q.answer  = answer
    } else {
      q.answer              = modelAnswer.trim() || '(Teacher-defined)'
      q.model_answer        = modelAnswer.trim()
      q.evaluation_criteria = criteria
    }
    onAdd(q)
  }

  return (
    <div style={{ ...S.card, border: `2px solid ${C.purpleBorder}`, background: C.purpleLight, margin: '0 0 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontWeight: '700', color: C.purple, fontSize: '14px' }}>➕ Add Custom Question</div>
        <button style={S.btn('ghost', { fontSize: '12px', padding: '4px 10px' })} onClick={onCancel}>✕ Cancel</button>
      </div>

      {/* Question type selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        {[['objective','MCQ / Objective', C.indigo, C.indigoLight, C.indigoBorder],
          ['subjective','Written / Subjective', C.green, C.greenLight, C.greenBorder]
        ].map(([v, l, c, bg, br]) => (
          <span key={v} style={S.chip(qType === v, c, bg, br)} onClick={() => setQType(v)}>{l}</span>
        ))}
      </div>

      {/* Question text */}
      <div style={{ marginBottom: '12px' }}>
        <label style={S.label}>Question *</label>
        <textarea rows={3} value={question} placeholder="Type your question here…"
          style={{ ...S.input, resize: 'vertical', lineHeight: 1.5 }}
          onChange={e => setQuestion(e.target.value)} />
      </div>

      {/* MCQ options */}
      {qType === 'objective' && (
        <>
          <div style={{ marginBottom: '10px' }}>
            <label style={S.label}>Answer Options (A & B required)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {['A','B','C','D'].map(k => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{ width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                      background: answer === k ? C.green : C.indigoLight,
                      color: answer === k ? '#fff' : C.indigo,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: '700', fontSize: '11px', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setAnswer(k)}>{k}</span>
                  <input style={{ ...S.input, flex: 1 }}
                    placeholder={`Option ${k}${k === 'A' || k === 'B' ? ' *' : ''}`}
                    value={opts[k]} onChange={e => setOpts(o => ({ ...o, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={S.label}>Correct Answer</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['A','B','C','D'].filter(k => opts[k].trim()).map(k => (
                <span key={k} style={S.chip(answer === k, C.green, C.greenLight, C.greenBorder)}
                  onClick={() => setAnswer(k)}>{k}: {opts[k].slice(0,18)}</span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Subjective model answer + marking criteria */}
      {qType === 'subjective' && (
        <>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ ...S.label, color: C.green }}>Model Answer</label>
            <textarea rows={4} value={modelAnswer}
              placeholder="Write the ideal/expected answer here. Used by the AI evaluator to grade student responses."
              style={{ ...S.input, resize: 'vertical', lineHeight: 1.6, fontSize: '13px' }}
              onChange={e => setModelAnswer(e.target.value)} />
            <div style={{ fontSize: '11px', color: C.slate, marginTop: '3px' }}>
              The AI uses this as the reference answer when evaluating student submissions.
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ ...S.label, color: C.amber }}>Marking Criteria / Rubric</label>
            <textarea rows={2} value={criteria}
              placeholder="e.g. 1m: Correct definition · 2m: Explanation with example · 1m: Diagram"
              style={{ ...S.input, resize: 'vertical', lineHeight: 1.5, fontSize: '13px' }}
              onChange={e => setCriteria(e.target.value)} />
            <div style={{ fontSize: '11px', color: C.slate, marginTop: '3px' }}>
              Used by AI evaluator and printed on the answer key.
            </div>
          </div>
        </>
      )}

      {/* Marks + submit */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '14px' }}>
        <div style={{ flex: '0 0 110px' }}>
          <label style={S.label}>Marks *</label>
          <input style={S.input} type="number" min={0.5} step={0.5}
            value={marks} onChange={e => setMarks(e.target.value)} />
        </div>
        <div style={{ flex: 1, fontSize: '12px', color: valid ? C.green : C.slate, paddingBottom: '2px' }}>
          {valid ? '✅ Ready to add' : (qType === 'objective' ? 'Fill question + at least options A & B' : 'Fill in the question text')}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          style={{ ...S.btn('primary', { flex: 1, justifyContent: 'center' }),
            opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}
          onClick={handleAdd} disabled={!valid}>
          ✅ Add to Question Paper
        </button>
        <button style={S.btn('ghost')} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ── Step 3: Review questions + print actions ───────────────────────────────────
function ReviewAndPrint({ questions, examId, examMeta, token, onBack, onRegenerate, showToast, navigateTo }) {
  const [saving, setSaving]       = useState(false)
  const [savedId, setSavedId]     = useState(examId)   // generate-questions auto-saves
  const [qs, setQs]               = useState(questions)
  const [showAddQ, setShowAddQ]   = useState(false)

  const objQs  = qs.filter(q => q.type === 'objective')
  const subjQs = qs.filter(q => q.type !== 'objective')
  const total  = qs.reduce((s, q) => s + parseFloat(q.marks || 0), 0)

  const handleDelete = (idx) => {
    setQs(prev => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, id: i + 1 })))
    setSavedId(null)   // invalidate — need to re-save after edits
  }

  const handleAddQuestion = (q) => {
    setQs(prev => [...prev, { ...q, id: prev.length + 1 }])
    setSavedId(null)
    setShowAddQ(false)
  }

  const handleMarksChange = (qId, newMarks) => {
    setQs(prev => prev.map(q => q.id === qId ? { ...q, marks: newMarks } : q))
    setSavedId(null)
  }

  const handleCriteriaChange = (qId, criteria) => {
    setQs(prev => prev.map(q => q.id === qId ? { ...q, evaluation_criteria: criteria } : q))
    setSavedId(null)
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
            Questions ({qs.length})
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {savedId && (
              <button style={{ ...S.btn('ghost', { fontSize: '11px', padding: '5px 12px' }) }}
                onClick={handleSave} disabled={saving}>
                {saving ? '…' : '💾 Re-save after edits'}
              </button>
            )}
            <button
              style={S.btn(showAddQ ? 'ghost' : 'success', { fontSize: '12px', padding: '6px 14px' })}
              onClick={() => setShowAddQ(s => !s)}>
              {showAddQ ? '✕ Cancel' : '➕ Add Custom Question'}
            </button>
          </div>
        </div>
        {showAddQ && (
          <CustomQuestionForm
            onAdd={handleAddQuestion}
            onCancel={() => setShowAddQ(false)}
          />
        )}

        {objQs.length > 0 && (
          <>
            <div style={S.sectionHeader(C.indigoLight, C.indigoBorder, C.indigo)}>
              Section A — Objective ({objQs.length} questions · {objQs.reduce((s,q)=>s+q.marks,0)}m)
            </div>
            {objQs.map((q, i) => (
              <QuestionCard key={q.id} q={q}
                onDelete={() => handleDelete(qs.findIndex(x => x.id === q.id))}
                onMarksChange={(m) => handleMarksChange(q.id, m)}
                onCriteriaChange={(c) => handleCriteriaChange(q.id, c)} />
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
                onDelete={() => handleDelete(qs.findIndex(x => x.id === q.id))}
                onMarksChange={(m) => handleMarksChange(q.id, m)}
                onCriteriaChange={(c) => handleCriteriaChange(q.id, c)} />
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
