/**
 * EvalPanel.jsx — Evaluation Central
 * Handles:
 *  - Single student scanned answer sheet evaluation
 *  - Async Celery task polling (image-diff OCR can take 30-90s)
 *  - Sync fallback response (no Redis)
 *  - Full result report with per-question breakdown
 *  - Multi-student and bulk evaluation tabs
 *  - Extraction mode badge (shows which OCR path was used)
 *  - Parent email report sending
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'

// ── API helper ────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || ''

async function apiFetch(path, opts = {}, token) {
  const res = await fetch(`${API}/api${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

// ── Extraction mode badge labels ──────────────────────────────────────────────
const MODE_LABELS = {
  image_diff_ocr:     { label: 'Image-Diff OCR',    color: '#16a34a', title: 'Handwriting isolated via pixel diff + GPT-4o Vision' },
  vision_ocr_pdf:     { label: 'Vision OCR',         color: '#2563eb', title: 'GPT-4o Vision on scanned PDF pages' },
  vision_ocr_enhanced:{ label: 'Enhanced Vision',    color: '#7c3aed', title: 'Contrast-enhanced GPT-4o Vision' },
  vision_ocr:         { label: 'Vision OCR',         color: '#2563eb', title: 'GPT-4o Vision on image' },
  parsed_pdf:         { label: 'Text Extraction',    color: '#0891b2', title: 'Text layer extracted from digital PDF' },
  gpt_text_parse:     { label: 'GPT Text Parse',     color: '#9333ea', title: 'GPT parsed raw PDF text layer' },
  llm_text_extract:   { label: 'LLM Extraction',     color: '#d97706', title: 'GPT-4o-mini extracted from text layer' },
  parsed_text:        { label: 'Text Parse',          color: '#64748b', title: 'Regex parsed plain text file' },
  multi_student_gpt4o:{ label: 'Multi-Student',      color: '#0891b2', title: 'Multi-student PDF split and evaluated' },
  multi_student_parallel:{ label: 'Parallel OCR',   color: '#16a34a', title: 'Parallel multi-student evaluation' },
  multi_student_celery:  { label: 'Async Multi',    color: '#7c3aed', title: 'Async Celery multi-student evaluation' },
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  panel: {
    minHeight: '100%',
    background: '#f8fafc',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    padding: '0',
  },
  header: {
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    padding: '20px 28px 0',
    position: 'sticky', top: 0, zIndex: 10,
  },
  headerTop: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '16px',
  },
  title: {
    fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0,
    display: 'flex', alignItems: 'center', gap: '10px',
  },
  tabs: {
    display: 'flex', gap: '0', borderBottom: 'none',
  },
  tab: (active) => ({
    padding: '10px 20px', border: 'none', background: 'none',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px',
    fontWeight: active ? '600' : '400',
    color: active ? '#6d28d9' : '#64748b',
    borderBottom: active ? '2px solid #6d28d9' : '2px solid transparent',
    transition: 'all .15s',
  }),
  body: { padding: '24px 28px' },
  card: {
    background: '#fff', borderRadius: '16px',
    border: '1px solid #e2e8f0', padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,.05)',
  },
  sectionTitle: {
    fontSize: '13px', fontWeight: '700', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: '16px',
  },
  formRow: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: '14px', marginBottom: '14px',
  },
  label: { fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' },
  input: {
    width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0',
    borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box', color: '#0f172a',
    transition: 'border-color .15s',
  },
  select: {
    width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0',
    borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box', color: '#0f172a',
    background: '#fff', cursor: 'pointer',
  },
  fileZone: (drag) => ({
    border: `2px dashed ${drag ? '#6d28d9' : '#cbd5e1'}`,
    borderRadius: '12px', padding: '32px',
    textAlign: 'center', cursor: 'pointer',
    background: drag ? '#faf5ff' : '#f8fafc',
    transition: 'all .2s',
  }),
  btn: (variant = 'primary') => ({
    padding: '11px 22px', borderRadius: '10px', border: 'none',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px',
    fontWeight: '600', transition: 'all .15s',
    ...(variant === 'primary' ? {
      background: 'linear-gradient(135deg,#6d28d9,#4f46e5)',
      color: '#fff', boxShadow: '0 2px 8px rgba(109,40,217,.25)',
    } : variant === 'danger' ? {
      background: '#fee2e2', color: '#dc2626',
    } : {
      background: '#f1f5f9', color: '#475569',
    }),
  }),
  badge: (mode) => {
    const m = MODE_LABELS[mode] || { label: mode, color: '#64748b' }
    return {
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
      fontWeight: '600', color: m.color,
      background: m.color + '18', border: `1px solid ${m.color}30`,
    }
  },
  scoreCard: (pct) => ({
    textAlign: 'center', padding: '20px 16px', borderRadius: '12px',
    background: pct >= 60 ? '#f0fdf4' : pct >= 40 ? '#fffbeb' : '#fef2f2',
    border: `1px solid ${pct >= 60 ? '#bbf7d0' : pct >= 40 ? '#fde68a' : '#fecaca'}`,
  }),
  qRow: (correct) => ({
    display: 'grid', gridTemplateColumns: '50px 1fr 120px 80px 80px',
    gap: '12px', alignItems: 'center',
    padding: '12px 16px', borderRadius: '8px',
    background: correct === true ? '#f0fdf4' : correct === false ? '#fef2f2' : '#f8fafc',
    border: `1px solid ${correct === true ? '#bbf7d0' : correct === false ? '#fecaca' : '#e2e8f0'}`,
    marginBottom: '8px', fontSize: '13px',
  }),
  progressBar: (pct, color) => ({
    height: '6px', borderRadius: '999px',
    background: '#e2e8f0', overflow: 'hidden', marginTop: '8px',
  }),
  progressFill: (pct, color) => ({
    height: '100%', width: `${Math.min(100, pct)}%`,
    background: color || (pct >= 60 ? '#16a34a' : pct >= 40 ? '#d97706' : '#dc2626'),
    borderRadius: '999px', transition: 'width .6s ease',
  }),
  spinner: {
    width: '40px', height: '40px', borderRadius: '50%',
    border: '3px solid #e2e8f0', borderTop: '3px solid #6d28d9',
    animation: 'spin 0.8s linear infinite',
  },
  alert: (type) => ({
    padding: '14px 18px', borderRadius: '10px', fontSize: '14px',
    marginBottom: '16px',
    ...(type === 'error' ? { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' } :
        type === 'success' ? { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' } :
        type === 'info' ? { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' } :
        { background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }),
  }),
}

// ── Subcomponent: TemplateDownloads ──────────────────────────────────────────
// Used by both EvalPanel and can be imported by QMasterPanel
function TemplateDownloads({ examId, token }) {
  if (!examId) return null

  const baseUrl = `${API}/api/exams/${examId}`

  const downloads = [
    {
      href:  `${baseUrl}/question-paper`,
      icon:  '📝',
      label: 'Question Paper',
      sub:   'Print & give to students',
      color: '#1e1b4b',
      bg:    '#eef2ff',
      border:'#c7d2fe',
    },
    {
      href:  `${baseUrl}/answer-sheet`,
      icon:  '🖊',
      label: 'Answer Sheet',
      sub:   'Students fill & return',
      color: '#065f46',
      bg:    '#f0fdf4',
      border:'#86efac',
      primary: true,
    },
    {
      href:  `${baseUrl}/answer-key`,
      icon:  '🔑',
      label: 'Answer Key',
      sub:   'Teacher use only',
      color: '#7f1d1d',
      bg:    '#fef2f2',
      border:'#fca5a5',
      teacherOnly: true,
    },
  ]

  return (
    <div style={{ marginTop: '10px', padding: '14px', borderRadius: '10px',
      background: '#f8fafc', border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
        📄 Print Templates
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {downloads.map(d => (
          <a
            key={d.label}
            href={`${d.href}?token=${token}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '10px 8px', borderRadius: '8px', textDecoration: 'none',
              background: d.bg, border: `1.5px solid ${d.border}`,
              transition: 'transform .15s, box-shadow .15s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,.1)' }}
            onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}
          >
            <span style={{ fontSize: '20px', marginBottom: '4px' }}>{d.icon}</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: d.color,
              textAlign: 'center', lineHeight: 1.2 }}>{d.label}</span>
            <span style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px',
              textAlign: 'center' }}>{d.sub}</span>
          </a>
        ))}
      </div>
      <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '8px', textAlign: 'center' }}>
        Workflow: Print Question Paper + Answer Sheet → Students complete → Scan Answer Sheet → Upload below
      </div>
    </div>
  )
}


// ── Subcomponent: ExamSelector ────────────────────────────────────────────────
function ExamSelector({ token, value, onChange }) {
  const [exams, setExams]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  const load = () => {
    setLoading(true); setError('')
    // Try /api/exams first (new alias), fall back to /api/questions (legacy)
    apiFetch('/exams', {}, token)
      .then(d => setExams(d.exams || []))
      .catch(() =>
        apiFetch('/questions', {}, token)
          .then(d => setExams(d.exams || []))
          .catch(e => setError(e.message))
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token])

  // Build a readable label: prefer syllabus_name, then subject+class, then topic
  const examLabel = (e) => {
    const name  = e.syllabus_name || e.subject || ''
    const cls   = e.class || e.class_name || ''
    const board = e.board || ''
    const meta  = [board, cls].filter(Boolean).join(' ')
    const counts = `${e.objective_count ?? 0}obj + ${e.subjective_count ?? 0}subj`
    const marks  = e.total_marks ? ` · ${e.total_marks}m` : ''
    const date   = e.exam_date ? ` · ${e.exam_date}` : ''
    return `${name}${meta ? ' — ' + meta : ''} [${counts}${marks}${date}]`
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={S.label}>Select Exam *</label>
        <button
          onClick={load}
          style={{ fontSize: '11px', color: '#6d28d9', background: 'none',
            border: 'none', cursor: 'pointer', padding: '0 0 4px' }}
        >
          ↻ Refresh
        </button>
      </div>
      {error && (
        <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '6px' }}>
          ⚠ {error}
        </div>
      )}
      <select
        style={S.select}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={loading}
      >
        <option value="">
          {loading ? 'Loading exams…' : exams.length === 0 ? '— No exams saved yet —' : '— Choose an exam —'}
        </option>
        {exams.map(e => (
          <option key={e.exam_id} value={e.exam_id}>
            {examLabel(e)}
          </option>
        ))}
      </select>
      {!loading && exams.length === 0 && (
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
          Go to <strong>Question Master</strong> → generate questions → click <strong>Save Exam</strong>
        </div>
      )}
    </div>
  )
}

// ── Subcomponent: FileDropZone ────────────────────────────────────────────────
function FileDropZone({ file, onChange, accept = '.pdf,.png,.jpg,.jpeg,.webp', label }) {
  const [drag, setDrag] = useState(false)
  const ref = useRef()

  const handle = f => {
    if (f) onChange(f)
  }

  return (
    <div
      style={S.fileZone(drag)}
      onClick={() => ref.current.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]) }}
    >
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }}
        onChange={e => handle(e.target.files[0])} />
      {file ? (
        <div>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📄</div>
          <div style={{ fontWeight: '600', color: '#6d28d9', fontSize: '14px' }}>{file.name}</div>
          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
            {(file.size / 1024).toFixed(1)} KB — click to change
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🖼️</div>
          <div style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>
            {label || 'Drop answer sheet here or click to browse'}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '6px' }}>
            PDF (scanned or digital), PNG, JPG, WEBP
          </div>
        </div>
      )}
    </div>
  )
}

// ── Subcomponent: ExtractionBadge ─────────────────────────────────────────────
function ExtractionBadge({ mode }) {
  const m = MODE_LABELS[mode]
  if (!m) return null
  return (
    <span style={S.badge(mode)} title={m.title}>
      <span>●</span> {m.label}
    </span>
  )
}

// ── Subcomponent: ScoreSummary ─────────────────────────────────────────────────
function ScoreSummary({ result }) {
  const { total_awarded = 0, total_possible = 0, percentage = 0,
          grade = 'F', is_pass = false, improvement_prediction = '' } = result

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '20px' }}>
      {[
        { label: 'Grade', value: grade,
          color: is_pass ? '#16a34a' : '#dc2626',
          bg: is_pass ? '#f0fdf4' : '#fef2f2' },
        { label: 'Marks', value: `${total_awarded}/${total_possible}`,
          color: '#1e293b', bg: '#f8fafc' },
        { label: 'Percentage', value: `${percentage}%`,
          color: percentage >= 60 ? '#16a34a' : percentage >= 40 ? '#d97706' : '#dc2626',
          bg: '#f8fafc' },
        { label: 'Result', value: is_pass ? '✓ Pass' : '✗ Fail',
          color: is_pass ? '#16a34a' : '#dc2626',
          bg: is_pass ? '#f0fdf4' : '#fef2f2' },
      ].map(item => (
        <div key={item.label} style={{
          ...S.scoreCard(percentage),
          background: item.bg,
          border: `1px solid ${item.color}30`,
        }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8',
            textTransform: 'uppercase', marginBottom: '6px' }}>{item.label}</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: item.color,
            lineHeight: 1 }}>{item.value}</div>
        </div>
      ))}
      {improvement_prediction && (
        <div style={{ gridColumn: '1/-1', padding: '12px 16px', borderRadius: '10px',
          background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1',
          fontSize: '13px' }}>
          💡 {improvement_prediction}
        </div>
      )}
    </div>
  )
}

// ── Subcomponent: QuestionTable ────────────────────────────────────────────────
function QuestionTable({ questions, questionWise }) {
  const qMap = {}
  ;(questions || []).forEach(q => { qMap[q.id] = q })

  const obj  = (questionWise || []).filter(q => q.type === 'objective')
  const subj = (questionWise || []).filter(q => q.type === 'subjective')

  return (
    <div>
      {obj.length > 0 && (
        <>
          <div style={S.sectionTitle}>Section A — Objective Questions</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '50px 1fr 140px 90px 90px',
            gap: '8px', padding: '8px 16px', marginBottom: '6px',
            fontSize: '11px', fontWeight: '700', color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '.04em',
          }}>
            <span>Q#</span><span>Question</span>
            <span>Student Ans.</span><span>Marks</span><span>Result</span>
          </div>
          {obj.map(ev => {
            const q = qMap[ev.question_id] || {}
            return (
              <div key={ev.question_id} style={S.qRow(ev.is_correct)}>
                <span style={{ fontWeight: '700', color: '#6d28d9' }}>Q{ev.question_id}</span>
                <span style={{ color: '#374151', fontSize: '12px' }}>
                  {q.question ? q.question.slice(0, 80) + (q.question.length > 80 ? '…' : '') : '—'}
                </span>
                <span style={{ fontWeight: '600',
                  color: ev.student_answer ? '#1e293b' : '#94a3b8' }}>
                  {ev.student_answer || '—'}
                </span>
                <span style={{ fontWeight: '600' }}>
                  {ev.awarded_marks}/{ev.max_marks}
                </span>
                <span style={{ fontSize: '12px', fontWeight: '600',
                  color: ev.is_correct ? '#16a34a' : '#dc2626' }}>
                  {ev.is_correct ? '✓ Correct' : '✗ Wrong'}
                </span>
              </div>
            )
          })}
        </>
      )}

      {subj.length > 0 && (
        <>
          <div style={{ ...S.sectionTitle, marginTop: '24px' }}>
            Section B — Subjective Questions
          </div>
          {subj.map(ev => {
            const q = qMap[ev.question_id] || {}
            return (
              <div key={ev.question_id} style={{
                background: '#fff', border: '1px solid #e2e8f0',
                borderRadius: '12px', padding: '18px', marginBottom: '12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ fontWeight: '700', color: '#6d28d9', fontSize: '15px' }}>
                    Q{ev.question_id}.
                  </span>
                  <span style={{ fontWeight: '700',
                    color: ev.awarded_marks > 0 ? '#16a34a' : '#dc2626', fontSize: '13px' }}>
                    {ev.awarded_marks > 0
                      ? `✓ ${ev.awarded_marks}/${ev.max_marks} marks`
                      : '✗ No Marks'}
                  </span>
                </div>

                {q.question && (
                  <div style={{ fontSize: '13px', color: '#374151',
                    marginBottom: '10px', fontWeight: '500' }}>
                    {q.question}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8',
                      textTransform: 'uppercase', marginBottom: '6px' }}>Student's Answer</div>
                    <div style={{ background: '#f8fafc', borderRadius: '8px',
                      padding: '10px 12px', fontSize: '13px', color: '#374151',
                      minHeight: '60px', border: '1px solid #e2e8f0' }}>
                      {ev.student_answer || (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                          (No answer provided)
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8',
                      textTransform: 'uppercase', marginBottom: '6px' }}>Model Answer</div>
                    <div style={{ background: '#f0fdf4', borderRadius: '8px',
                      padding: '10px 12px', fontSize: '13px', color: '#166534',
                      minHeight: '60px', border: '1px solid #bbf7d0' }}>
                      {(q.valid_answers || []).join(' / ') ||
                       (q.answer_key_points || []).join('; ') || '—'}
                    </div>
                  </div>
                </div>

                {ev.feedback && (
                  <div style={{ background: '#fffbeb', borderRadius: '8px',
                    padding: '10px 12px', marginBottom: '8px',
                    border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#92400e',
                      marginBottom: '4px', textTransform: 'uppercase' }}>AI Feedback</div>
                    <div style={{ fontSize: '13px', color: '#78350f' }}>{ev.feedback}</div>
                  </div>
                )}

                {ev.missing_points?.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '6px' }}>
                    <strong>Missing points:</strong>{' '}
                    {ev.missing_points.join('; ')}
                  </div>
                )}
                {ev.strengths?.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>
                    <strong>Strengths:</strong> {ev.strengths.join('; ')}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

// ── Subcomponent: AsyncPoller ──────────────────────────────────────────────────
function AsyncPoller({ taskId, token, onComplete, onError }) {
  const [step, setStep]       = useState('Processing answer sheet…')
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef(null)

  const STEP_LABELS = {
    extracting_answers: 'Extracting answers from scan…',
    ocr_extraction:     'Running handwriting OCR…',
    grading:            'Grading with AI…',
    splitting_pdf:      'Splitting multi-student PDF…',
    starting:           'Starting evaluation…',
  }

  useEffect(() => {
    let attempts = 0
    const MAX = 120   // 2 min max polling

    intervalRef.current = setInterval(async () => {
      attempts++
      if (attempts > MAX) {
        clearInterval(intervalRef.current)
        onError('Evaluation timed out. Please try again.')
        return
      }

      try {
        const data = await apiFetch(`/evaluate/status/${taskId}`, {}, token)

        if (data.step) {
          setStep(STEP_LABELS[data.step] || data.step.replace(/_/g, ' '))
        }
        if (data.completed != null && data.total) {
          setProgress(Math.round((data.completed / data.total) * 100))
        }

        if (data.status === 'completed') {
          clearInterval(intervalRef.current)
          onComplete(data)
        } else if (data.status === 'failed') {
          clearInterval(intervalRef.current)
          onError(data.error || 'Evaluation failed')
        }
      } catch (e) {
        // transient error — keep polling
      }
    }, 1500)

    return () => clearInterval(intervalRef.current)
  }, [taskId, token])

  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ ...S.spinner, margin: '0 auto 20px' }} />
      <div style={{ fontWeight: '600', color: '#374151', marginBottom: '8px' }}>{step}</div>
      <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
        This may take 30–90 seconds for scanned PDFs
      </div>
      {progress > 0 && (
        <div style={{ maxWidth: '300px', margin: '0 auto' }}>
          <div style={S.progressBar()}>
            <div style={S.progressFill(progress, '#6d28d9')} />
          </div>
          <div style={{ fontSize: '12px', color: '#6d28d9', marginTop: '6px' }}>
            {progress}%
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: Single Student Evaluation ────────────────────────────────────────────
function SingleEvalTab({ token, showToast }) {
  const [examId, setExamId]       = useState('')
  const [examData, setExamData]   = useState(null)
  const [file, setFile]           = useState(null)
  const [rollNo, setRollNo]       = useState('')
  const [studentName, setStudentName] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [loading, setLoading]     = useState(false)
  const [taskId, setTaskId]       = useState(null)
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState('')
  const [emailSending, setEmailSending] = useState(false)

  // Load exam metadata when exam selected
  useEffect(() => {
    if (!examId) { setExamData(null); return }
    apiFetch(`/exams/${examId}`, {}, token)
      .then(d => setExamData(d))
      .catch(() => {})
  }, [examId, token])

  const handleSubmit = async () => {
    if (!examId) return showToast('Please select an exam', 'error')
    if (!file)   return showToast('Please upload an answer sheet', 'error')
    setError(''); setResult(null); setTaskId(null); setLoading(true)

    try {
      const fd = new FormData()
      fd.append('exam_id',      examId)
      fd.append('answer_sheet', file)
      fd.append('roll_no',      rollNo)
      fd.append('student_name', studentName)
      fd.append('parent_email', parentEmail)

      const data = await apiFetch('/evaluate', {
        method: 'POST', body: fd,
      }, token)

      if (data.async && data.task_id) {
        setTaskId(data.task_id)   // trigger async poller
      } else {
        setResult(data)
        showToast('Evaluation complete!', 'success')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailReport = async () => {
    if (!result || !parentEmail) return
    setEmailSending(true)
    try {
      await apiFetch('/evaluations/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluation_id: result.evaluation_id,
          parent_email:  parentEmail,
          student_name:  studentName,
          exam_meta:     examData,
        }),
      }, token)
      showToast(`Report sent to ${parentEmail}`, 'success')
    } catch (e) {
      showToast('Failed to send email: ' + e.message, 'error')
    } finally {
      setEmailSending(false)
    }
  }

  const handleReset = () => {
    setResult(null); setTaskId(null); setFile(null)
    setError(''); setRollNo(''); setStudentName(''); setParentEmail('')
  }

  return (
    <div>
      {/* Form */}
      {!result && !taskId && (
        <>
          <div style={S.card}>
            <div style={S.sectionTitle}>Exam & Student Details</div>
            <ExamSelector token={token} value={examId} onChange={setExamId} />
            {examData && (
              <>
                <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '8px',
                  background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '13px', color: '#1d4ed8' }}>
                  📋 {examData.syllabus_name} — {examData.total_marks} total marks,{' '}
                  {examData.objective_count} objective + {examData.subjective_count} subjective
                </div>
                <TemplateDownloads examId={examId} token={token} />
              </>
            )}
            <div style={{ ...S.formRow, marginTop: '14px' }}>
              <div>
                <label style={S.label}>Student Name</label>
                <input style={S.input} value={studentName}
                  onChange={e => setStudentName(e.target.value)} placeholder="e.g. Rahul Sharma" />
              </div>
              <div>
                <label style={S.label}>Roll Number</label>
                <input style={S.input} value={rollNo}
                  onChange={e => setRollNo(e.target.value)} placeholder="e.g. 42" />
              </div>
            </div>
            <div>
              <label style={S.label}>Parent Email (for report)</label>
              <input style={S.input} type="email" value={parentEmail}
                onChange={e => setParentEmail(e.target.value)} placeholder="parent@email.com" />
            </div>
          </div>

          <div style={S.card}>
            <div style={S.sectionTitle}>Upload Answer Sheet</div>
            <div style={{ ...S.alert('info'), marginBottom: '16px' }}>
              💡 <strong>Upload the filled Answer Sheet PDF</strong> (scanned or photographed).{' '}
              Use the <em>Answer Sheet PDF</em> template above — it has large bubble circles for MCQ
              and ruled boxes for written answers, making OCR reliable.{' '}
              Accepts: scanned PDF, JPG, PNG, WEBP.
            </div>
            <FileDropZone file={file} onChange={setFile} />
          </div>

          {error && <div style={S.alert('error')}>⚠️ {error}</div>}

          <button
            style={{ ...S.btn('primary'), width: '100%', padding: '14px' }}
            onClick={handleSubmit}
            disabled={loading || !examId || !file}
          >
            {loading ? '⏳ Processing…' : '🔍 Evaluate Answer Sheet'}
          </button>
        </>
      )}

      {/* Async polling */}
      {taskId && !result && (
        <div style={S.card}>
          <AsyncPoller
            taskId={taskId}
            token={token}
            onComplete={data => { setResult(data); setTaskId(null); showToast('Evaluation complete!', 'success') }}
            onError={msg => { setError(msg); setTaskId(null) }}
          />
        </div>
      )}

      {/* Result */}
      {result && (
        <>
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                  📊 Evaluation Report
                </h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {result.student_name && (
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                      👤 {result.student_name}
                    </span>
                  )}
                  {result.roll_no && (
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                      · Roll: {result.roll_no}
                    </span>
                  )}
                  <ExtractionBadge mode={result.extraction_mode} />
                </div>
              </div>
              <button style={S.btn('ghost')} onClick={handleReset}>← New Evaluation</button>
            </div>

            <ScoreSummary result={result.result || {}} />

            {/* Progress bar */}
            <div style={S.progressBar()}>
              <div style={S.progressFill(result.result?.percentage || 0)} />
            </div>
          </div>

          <div style={S.card}>
            <QuestionTable
              questions={examData?.questions || []}
              questionWise={result.result?.question_wise || []}
            />
          </div>

          {parentEmail && (
            <div style={{ ...S.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                  📧 Send Report to Parent
                </div>
                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                  {parentEmail}
                </div>
              </div>
              <button
                style={S.btn('primary')}
                onClick={handleEmailReport}
                disabled={emailSending}
              >
                {emailSending ? 'Sending…' : 'Send Email Report'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Tab: Multi-Student (one combined PDF) ─────────────────────────────────────
function MultiStudentTab({ token, showToast }) {
  const [examId, setExamId]   = useState('')
  const [file, setFile]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [taskId, setTaskId]   = useState(null)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')

  const handleSubmit = async () => {
    if (!examId || !file) return showToast('Select exam and file first', 'error')
    setError(''); setResult(null); setTaskId(null); setLoading(true)

    try {
      const fd = new FormData()
      fd.append('exam_id',      examId)
      fd.append('answer_sheet', file)

      const data = await apiFetch('/evaluate/multi-student', {
        method: 'POST', body: fd,
      }, token)

      if (data.async && data.task_id) {
        setTaskId(data.task_id)
      } else {
        setResult(data)
        showToast(`${data.student_count || 0} students evaluated`, 'success')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {!result && !taskId && (
        <>
          <div style={S.card}>
            <div style={S.sectionTitle}>Combined Answer Sheet PDF</div>
            <div style={{ ...S.alert('info'), marginBottom: '16px' }}>
              📚 Upload a single PDF containing answer sheets from <strong>multiple students</strong>.
              The system will automatically detect and separate each student's answers.
            </div>
            <ExamSelector token={token} value={examId} onChange={setExamId} />
            <div style={{ marginTop: '14px' }}>
              <FileDropZone file={file} onChange={setFile} accept=".pdf"
                label="Drop combined answer sheet PDF here" />
            </div>
          </div>
          {error && <div style={S.alert('error')}>⚠️ {error}</div>}
          <button style={{ ...S.btn('primary'), width: '100%', padding: '14px' }}
            onClick={handleSubmit} disabled={loading || !examId || !file}>
            {loading ? '⏳ Processing…' : '👥 Evaluate All Students'}
          </button>
        </>
      )}

      {taskId && !result && (
        <div style={S.card}>
          <AsyncPoller taskId={taskId} token={token}
            onComplete={d => { setResult(d); setTaskId(null); showToast('Done!', 'success') }}
            onError={m => { setError(m); setTaskId(null) }} />
        </div>
      )}

      {result && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
              Class Results — {result.student_count} Students
            </h3>
            <button style={S.btn('ghost')} onClick={() => { setResult(null); setFile(null) }}>
              ← New Batch
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Class Average', value: `${result.class_average}%`, color: '#6d28d9' },
              { label: 'Pass', value: result.pass_count, color: '#16a34a' },
              { label: 'Fail', value: result.fail_count, color: '#dc2626' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '16px',
                background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8',
                  textTransform: 'uppercase', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          {(result.evaluations || []).map((ev, i) => (
            <div key={ev.evaluation_id} style={{ padding: '14px 16px', borderRadius: '10px',
              border: '1px solid #e2e8f0', marginBottom: '8px', background: '#fff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>
                  {ev.student_name || `Student ${i+1}`}
                </span>
                {ev.roll_no && (
                  <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '8px' }}>
                    Roll: {ev.roll_no}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontWeight: '700',
                  color: ev.result?.is_pass ? '#16a34a' : '#dc2626' }}>
                  {ev.result?.percentage || 0}%
                </span>
                <span style={{ fontSize: '12px',
                  color: ev.result?.is_pass ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                  {ev.result?.is_pass ? '✓ Pass' : '✗ Fail'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab: Bulk Evaluation (many separate files) ────────────────────────────────
function BulkEvalTab({ token, showToast }) {
  const [examId, setExamId]   = useState('')
  const [files, setFiles]     = useState([])
  const [loading, setLoading] = useState(false)
  const [taskId, setTaskId]   = useState(null)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')
  const fileRef = useRef()

  const handleSubmit = async () => {
    if (!examId || !files.length) return showToast('Select exam and files', 'error')
    setError(''); setResult(null); setTaskId(null); setLoading(true)
    try {
      const fd = new FormData()
      fd.append('exam_id', examId)
      files.forEach(f => fd.append('answer_sheets', f))
      const data = await apiFetch('/evaluate/bulk', { method: 'POST', body: fd }, token)
      if (data.async && data.task_id) {
        setTaskId(data.task_id)
      } else {
        setResult(data)
        showToast(`${data.total} evaluated`, 'success')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {!result && !taskId && (
        <>
          <div style={S.card}>
            <div style={S.sectionTitle}>Bulk Upload — One File Per Student</div>
            <ExamSelector token={token} value={examId} onChange={setExamId} />
            <div style={{ marginTop: '14px' }}>
              <input ref={fileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp"
                style={{ display: 'none' }}
                onChange={e => setFiles(Array.from(e.target.files))} />
              <div style={S.fileZone(false)} onClick={() => fileRef.current.click()}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📁</div>
                <div style={{ fontWeight: '600', color: '#374151' }}>
                  Select multiple answer sheet files
                </div>
                <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '6px' }}>
                  PDF, PNG, JPG — one file per student
                </div>
              </div>
              {files.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    {files.length} file(s) selected:
                  </div>
                  {files.map((f, i) => (
                    <div key={i} style={{ fontSize: '12px', color: '#64748b',
                      padding: '4px 8px', background: '#f8fafc', borderRadius: '6px',
                      marginBottom: '4px' }}>
                      📄 {f.name} ({(f.size/1024).toFixed(0)} KB)
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {error && <div style={S.alert('error')}>⚠️ {error}</div>}
          <button style={{ ...S.btn('primary'), width: '100%', padding: '14px' }}
            onClick={handleSubmit} disabled={loading || !examId || !files.length}>
            {loading ? '⏳ Processing…' : `📊 Evaluate ${files.length} Sheet${files.length !== 1 ? 's' : ''}`}
          </button>
        </>
      )}

      {taskId && !result && (
        <div style={S.card}>
          <AsyncPoller taskId={taskId} token={token}
            onComplete={d => { setResult(d); setTaskId(null); showToast('Done!', 'success') }}
            onError={m => { setError(m); setTaskId(null) }} />
        </div>
      )}

      {result && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
              Bulk Results — {result.total} evaluated
            </h3>
            <button style={S.btn('ghost')} onClick={() => { setResult(null); setFiles([]) }}>
              ← New Batch
            </button>
          </div>
          {(result.failures || []).length > 0 && (
            <div style={{ ...S.alert('warning'), marginBottom: '12px' }}>
              ⚠️ {result.failures.length} file(s) failed:{' '}
              {result.failures.map(f => f.file).join(', ')}
            </div>
          )}
          {(result.results || []).map((r, i) => (
            <div key={r.evaluation_id || i} style={{ padding: '12px 16px', borderRadius: '10px',
              border: '1px solid #e2e8f0', marginBottom: '8px', background: '#fff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '600', color: '#0f172a' }}>
                Roll: {r.roll_no || `#${i+1}`}
              </span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  {r.total_awarded}/{r.total_possible} marks
                </span>
                <span style={{ fontWeight: '700',
                  color: r.is_pass ? '#16a34a' : '#dc2626' }}>
                  {r.percentage}% {r.is_pass ? '✓' : '✗'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main EvalPanel ─────────────────────────────────────────────────────────────
export default function EvalPanel({ showToast }) {
  const { token } = useAuth()
  const [tab, setTab] = useState('single')

  const tabs = [
    { id: 'single', label: '📋 Single Student' },
    { id: 'multi',  label: '👥 Multi-Student PDF' },
    { id: 'bulk',   label: '📁 Bulk Upload' },
  ]

  return (
    <div style={S.panel}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        input:focus, select:focus { border-color: #6d28d9 !important; box-shadow: 0 0 0 3px rgba(109,40,217,.1); }
      `}</style>

      <div style={S.header}>
        <div style={S.headerTop}>
          <h1 style={S.title}>
            <span>📊</span> Evaluation Central
          </h1>
        </div>
        <div style={S.tabs}>
          {tabs.map(t => (
            <button key={t.id} style={S.tab(tab === t.id)} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={S.body}>
        {tab === 'single' && <SingleEvalTab token={token} showToast={showToast} />}
        {tab === 'multi'  && <MultiStudentTab token={token} showToast={showToast} />}
        {tab === 'bulk'   && <BulkEvalTab token={token} showToast={showToast} />}
      </div>
    </div>
  )
}
