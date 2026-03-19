/**
 * QMasterPanel.jsx — Question Master
 *
 * Full workflow integration with Evaluation Central:
 * 1. Teacher generates questions from a syllabus
 * 2. Reviews and edits questions
 * 3. Saves the exam → gets Exam ID
 * 4. Downloads Print Pack (Question Paper + Answer Sheet in one PDF)
 *    OR downloads separately: Question Paper / Answer Sheet / Answer Key
 * 5. Distributes printed papers to students
 * 6. Students fill Answer Sheet → teacher scans → uploads in Evaluation Central
 *    using the SAME Exam ID (pre-linked automatically)
 *
 * The Exam ID is the link between QMaster and Evaluation Central.
 */

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'

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

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  panel:    { minHeight: '100%', background: '#f8fafc', fontFamily: "'DM Sans', system-ui, sans-serif" },
  header:   { background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '20px 28px 0',
               position: 'sticky', top: 0, zIndex: 10 },
  body:     { padding: '24px 28px' },
  card:     { background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0',
               padding: '22px', marginBottom: '18px', boxShadow: '0 1px 3px rgba(0,0,0,.05)' },
  label:    { fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' },
  input:    { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px',
               fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
               color: '#0f172a', transition: 'border-color .15s' },
  select:   { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px',
               fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
               color: '#0f172a', background: '#fff', cursor: 'pointer' },
  btn:      (v='primary') => ({
    padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', transition: 'all .15s',
    ...(v === 'primary' ? { background: 'linear-gradient(135deg,#6d28d9,#4f46e5)', color: '#fff',
          boxShadow: '0 2px 8px rgba(109,40,217,.25)' }
      : v === 'success' ? { background: '#f0fdf4', color: '#15803d', border: '1.5px solid #86efac' }
      : v === 'danger'  ? { background: '#fef2f2', color: '#dc2626' }
      : { background: '#f1f5f9', color: '#475569' }),
  }),
  sectionTitle: { fontSize: '12px', fontWeight: '700', color: '#94a3b8',
                   textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' },
  alert: (t) => ({
    padding: '12px 16px', borderRadius: '10px', fontSize: '13px', marginBottom: '14px',
    ...(t==='error'   ? {background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca'}
      : t==='success' ? {background:'#f0fdf4',color:'#15803d',border:'1px solid #86efac'}
      : t==='info'    ? {background:'#eff6ff',color:'#1d4ed8',border:'1px solid #bfdbfe'}
      :                 {background:'#fffbeb',color:'#d97706',border:'1px solid #fde68a'}),
  }),
}

// ── PrintActions: shown after exam is saved ────────────────────────────────────
function PrintActions({ examId, examName, onGoToEval }) {
  if (!examId) return null
  const base = `${API}/api/exams/${examId}`

  return (
    <div style={{ ...S.card, background: 'linear-gradient(135deg,#f0fdf4,#ecfdf5)',
      border: '1.5px solid #86efac' }}>
      {/* Success header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dcfce7',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
          flexShrink: 0 }}>✓</div>
        <div>
          <div style={{ fontWeight: '700', color: '#14532d', fontSize: '15px' }}>
            Exam saved — ready to print & distribute
          </div>
          <div style={{ fontSize: '12px', color: '#15803d', marginTop: '2px' }}>
            {examName || 'Custom Exam'}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>EXAM ID</div>
          <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: '700',
            color: '#6d28d9', background: '#ede9fe', padding: '3px 10px', borderRadius: '6px' }}>
            {examId}
          </div>
        </div>
      </div>

      {/* Primary action */}
      <a
        href={`${base}/combined-print?token=${token}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          padding: '14px', borderRadius: '12px', background: '#6d28d9', color: '#fff',
          textDecoration: 'none', fontWeight: '700', fontSize: '15px',
          marginBottom: '12px', boxShadow: '0 4px 12px rgba(109,40,217,.3)',
          transition: 'transform .15s, box-shadow .15s' }}
        onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 16px rgba(109,40,217,.4)' }}
        onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 12px rgba(109,40,217,.3)' }}
      >
        <span style={{ fontSize: '20px' }}>🖨️</span>
        <span>Download Print Pack (Question Paper + Answer Sheet)</span>
      </a>

      {/* Workflow steps */}
      <div style={{ background: 'rgba(255,255,255,.7)', borderRadius: '10px',
        padding: '12px 14px', marginBottom: '14px', border: '1px solid #d1fae5' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#065f46',
          marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
          Distribution Workflow
        </div>
        {[
          ['① Print', 'Print the Pack — it contains Question Paper + Answer Sheet together'],
          ['② Distribute', 'Give each student their Question Paper + Answer Sheet'],
          ['③ Students answer', 'MCQ: circle bubble A/B/C/D  ·  Written: write in ruled box'],
          ['④ Collect & scan', 'Collect the filled Answer Sheets and scan them (not question papers)'],
          ['⑤ Upload & grade', 'Go to Evaluation Central → select this exam → upload scanned sheets'],
        ].map(([step, desc]) => (
          <div key={step} style={{ display: 'flex', gap: '10px', marginBottom: '5px',
            fontSize: '12px', color: '#374151' }}>
            <span style={{ fontWeight: '700', color: '#6d28d9', minWidth: '60px' }}>{step}</span>
            <span>{desc}</span>
          </div>
        ))}
      </div>

      {/* Individual downloads */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px',
        marginBottom: '12px' }}>
        {[
          { href: `${base}/question-paper?token=${token}`, icon: '📝', label: 'Question Paper', sub: 'Questions only',
            color: '#1e1b4b', bg: '#eef2ff', border: '#c7d2fe' },
          { href: `${base}/answer-sheet?token=${token}`,   icon: '🖊', label: 'Answer Sheet',   sub: 'Bubbles + boxes',
            color: '#065f46', bg: '#f0fdf4', border: '#86efac' },
          { href: `${base}/answer-key?token=${token}`,     icon: '🔑', label: 'Answer Key',     sub: 'Teacher only',
            color: '#7f1d1d', bg: '#fef2f2', border: '#fca5a5' },
        ].map(d => (
          <a key={d.label} href={d.href} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '9px 6px', borderRadius: '8px', textDecoration: 'none',
              background: d.bg, border: `1.5px solid ${d.border}`,
              transition: 'transform .15s' }}
            onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform=''}
          >
            <span style={{ fontSize: '18px', marginBottom: '3px' }}>{d.icon}</span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: d.color }}>{d.label}</span>
            <span style={{ fontSize: '9px', color: '#6b7280', marginTop: '1px' }}>{d.sub}</span>
          </a>
        ))}
      </div>

      {/* Link to Evaluation Central */}
      <button
        onClick={onGoToEval}
        style={{ ...S.btn('ghost'), width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '8px', border: '1.5px solid #c7d2fe',
          background: '#eef2ff', color: '#3730a3' }}
      >
        <span>📊</span>
        <span>Go to Evaluation Central to grade uploaded answer sheets</span>
        <span>→</span>
      </button>
    </div>
  )
}

// ── QuestionCard: display and edit one question ────────────────────────────────
function QuestionCard({ q, index, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const isObj = q.type === 'objective'

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px',
      marginBottom: '10px', overflow: 'hidden', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 16px', cursor: 'pointer', background: '#fafafa' }}
        onClick={() => setExpanded(e => !e)}>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
          background: isObj ? '#eef2ff' : '#ecfdf5', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontWeight: '700',
          fontSize: '12px', color: isObj ? '#4f46e5' : '#059669' }}>
          Q{q.id}
        </div>
        <div style={{ flex: 1, fontSize: '13px', color: '#374151', fontWeight: '500' }}>
          {q.question?.slice(0, 90)}{q.question?.length > 90 ? '…' : ''}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
            background: isObj ? '#eef2ff' : '#ecfdf5',
            color: isObj ? '#4f46e5' : '#059669', fontWeight: '600' }}>
            {isObj ? 'MCQ' : 'Written'}</span>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>{q.marks}m</span>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '13px', color: '#1e293b', marginBottom: '10px',
            fontWeight: '500' }}>{q.question}</div>

          {isObj && q.options && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px',
              marginBottom: '10px' }}>
              {Object.entries(q.options).map(([k, v]) => (
                <div key={k} style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px',
                  background: q.answer?.toUpperCase() === k ? '#dcfce7' : '#f8fafc',
                  border: `1px solid ${q.answer?.toUpperCase() === k ? '#86efac' : '#e2e8f0'}`,
                  color: q.answer?.toUpperCase() === k ? '#15803d' : '#374151',
                  fontWeight: q.answer?.toUpperCase() === k ? '600' : '400' }}>
                  ({k}) {v} {q.answer?.toUpperCase() === k ? '✓' : ''}
                </div>
              ))}
            </div>
          )}

          {q.answer && (
            <div style={{ fontSize: '12px', color: '#15803d', background: '#f0fdf4',
              padding: '6px 10px', borderRadius: '6px', marginBottom: '8px',
              border: '1px solid #bbf7d0' }}>
              <strong>Answer:</strong> {q.answer}
            </div>
          )}

          {q.explanation && (
            <div style={{ fontSize: '12px', color: '#1d4ed8', background: '#eff6ff',
              padding: '6px 10px', borderRadius: '6px', marginBottom: '8px',
              border: '1px solid #bfdbfe' }}>
              <strong>Explanation:</strong> {q.explanation}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button style={{ ...S.btn('ghost'), fontSize: '12px', padding: '6px 14px' }}
              onClick={() => onEdit(index)}>✏️ Edit</button>
            <button style={{ ...S.btn('danger'), fontSize: '12px', padding: '6px 14px' }}
              onClick={() => onDelete(index)}>🗑 Remove</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main QMasterPanel ──────────────────────────────────────────────────────────
export function QMasterPanel({ showToast }) {
  const { token, user } = useAuth()

  // Syllabus
  const [syllabi, setSyllabi]       = useState([])
  const [syllabusId, setSyllabusId] = useState('')

  // Generation config
  const [topic, setTopic]           = useState('')
  const [objCount, setObjCount]     = useState(5)
  const [subjCount, setSubjCount]   = useState(3)
  const [objMarks, setObjMarks]     = useState(1)
  const [subjMarks, setSubjMarks]   = useState(4)
  const [difficulty, setDifficulty] = useState('mixed')

  // Exam metadata
  const [schoolName, setSchoolName] = useState(user?.institution || '')
  const [teacherName, setTeacherName] = useState(user?.name || '')
  const [examDate, setExamDate]     = useState(new Date().toISOString().slice(0,10))
  const [subject, setSubject]       = useState('')
  const [board, setBoard]           = useState('')
  const [cls, setCls]               = useState('')

  // Questions state
  const [questions, setQuestions]   = useState([])
  const [loading, setLoading]       = useState(false)
  const [saving, setSaving]         = useState(false)

  // Saved exam
  const [savedExamId, setSavedExamId]     = useState(null)
  const [savedExamName, setSavedExamName] = useState('')

  const [error, setError] = useState('')

  // Load syllabi
  useEffect(() => {
    apiFetch('/syllabi', {}, token)
      .then(d => setSyllabi(d.syllabi || []))
      .catch(() => {})
  }, [token])

  const handleGenerate = async () => {
    if (!syllabusId) return showToast('Select a syllabus first', 'error')
    if (objCount + subjCount === 0) return showToast('Set at least 1 question', 'error')
    setError(''); setLoading(true); setSavedExamId(null)

    try {
      const data = await apiFetch('/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syllabus_id: syllabusId,
          topic: topic || 'General',
          objective_count: objCount,
          subjective_count: subjCount,
          objective_weightage: objMarks,
          subjective_weightage: subjMarks,
          difficulty,
          school_name: schoolName,
          teacher_name: teacherName,
          exam_date: examDate,
          subject, board, class: cls,
        }),
      }, token)

      // generate-questions auto-saves — grab the exam_id and questions
      if (data.exam_id) {
        setSavedExamId(data.exam_id)
        setSavedExamName(data.syllabus_name || data.subject || 'Exam')
      }
      setQuestions(data.questions || [])
      showToast(`${(data.questions || []).length} questions generated`, 'success')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!questions.length) return showToast('Generate questions first', 'error')
    setSaving(true); setError('')

    try {
      const syl = syllabi.find(s => s.id === syllabusId) || {}
      const data = await apiFetch('/exams/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions,
          syllabus_id: syllabusId,
          syllabus_name: syl.name || '',
          topic: topic || 'General',
          school_name: schoolName,
          teacher_name: teacherName,
          exam_date: examDate,
          subject: subject || syl.subject || '',
          board:   board   || syl.board   || '',
          class:   cls     || syl.class_name || '',
          difficulty,
        }),
      }, token)

      setSavedExamId(data.exam_id)
      setSavedExamName(data.syllabus_name || data.subject || 'Exam')
      showToast('Exam saved — ready to print!', 'success')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (idx) => {
    setQuestions(qs => qs.filter((_, i) => i !== idx)
      .map((q, i) => ({ ...q, id: i + 1 })))
    setSavedExamId(null)
  }

  const totalMarks = questions.reduce((s, q) => s + parseFloat(q.marks || 0), 0)
  const objQs  = questions.filter(q => q.type === 'objective')
  const subjQs = questions.filter(q => q.type !== 'objective')

  return (
    <div style={S.panel}>
      <style>{`input:focus,select:focus{border-color:#6d28d9!important;box-shadow:0 0 0 3px rgba(109,40,217,.1)}`}</style>

      {/* Header */}
      <div style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#0f172a',
            display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📋</span> Question Master
          </h1>
          {questions.length > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex',
                alignItems: 'center', gap: '6px', padding: '6px 14px',
                background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{questions.length}</span> questions
                <span style={{ color: '#cbd5e1' }}>·</span>
                <span style={{ fontWeight: '700', color: '#6d28d9' }}>{totalMarks}</span> marks
              </div>
              <button style={S.btn('primary')} onClick={handleSave} disabled={saving}>
                {saving ? '⏳ Saving…' : '💾 Save Exam'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={S.body}>
        {/* Saved exam actions — shown prominently when exam is saved */}
        {savedExamId && (
          <PrintActions
            examId={savedExamId}
            examName={savedExamName}
            onGoToEval={() => {
              // Navigate to Evaluation Central — use app context if available
              if (window.__appSetPanel) window.__appSetPanel('eval')
              else showToast('Go to Evaluation Central and select Exam ID: ' + savedExamId, 'info')
            }}
          />
        )}

        {error && <div style={S.alert('error')}>⚠️ {error}</div>}

        {/* Configuration form */}
        <div style={S.card}>
          <div style={S.sectionTitle}>Exam Configuration</div>

          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Syllabus *</label>
            <select style={S.select} value={syllabusId}
              onChange={e => setSyllabusId(e.target.value)}>
              <option value="">— Select syllabus —</option>
              {syllabi.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Topic / Chapter</label>
            <input style={S.input} value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Chapter 3 — Polynomials, or leave blank for all topics" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
            marginBottom: '14px' }}>
            <div>
              <label style={S.label}>MCQ Questions</label>
              <input style={S.input} type="number" min="0" max="30"
                value={objCount} onChange={e => setObjCount(+e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Written Questions</label>
              <input style={S.input} type="number" min="0" max="20"
                value={subjCount} onChange={e => setSubjCount(+e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Difficulty</label>
              <select style={S.select} value={difficulty}
                onChange={e => setDifficulty(e.target.value)}>
                <option value="mixed">Mixed</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label style={S.label}>Marks per MCQ</label>
              <input style={S.input} type="number" min="0.5" step="0.5"
                value={objMarks} onChange={e => setObjMarks(+e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Marks per Written Q</label>
              <input style={S.input} type="number" min="1" step="1"
                value={subjMarks} onChange={e => setSubjMarks(+e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Exam Date</label>
              <input style={S.input} type="date" value={examDate}
                onChange={e => setExamDate(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={S.label}>School / Institution</label>
              <input style={S.input} value={schoolName} onChange={e => setSchoolName(e.target.value)}
                placeholder="School name" />
            </div>
            <div>
              <label style={S.label}>Teacher Name</label>
              <input style={S.input} value={teacherName} onChange={e => setTeacherName(e.target.value)}
                placeholder="Your name" />
            </div>
            <div>
              <label style={S.label}>Subject</label>
              <input style={S.input} value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Mathematics" />
            </div>
            <div>
              <label style={S.label}>Board / Class</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input style={S.input} value={board} onChange={e => setBoard(e.target.value)}
                  placeholder="CBSE" />
                <input style={{ ...S.input, width: '120px', flexShrink: 0 }}
                  value={cls} onChange={e => setCls(e.target.value)} placeholder="Class 10" />
              </div>
            </div>
          </div>

          <button style={{ ...S.btn('primary'), width: '100%', marginTop: '16px', padding: '13px' }}
            onClick={handleGenerate} disabled={loading || !syllabusId}>
            {loading ? '⏳ Generating questions…' : '✨ Generate Questions'}
          </button>
        </div>

        {/* Questions list */}
        {questions.length > 0 && (
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '16px' }}>
              <div style={S.sectionTitle}>
                Generated Questions ({objQs.length} MCQ · {subjQs.length} Written · {totalMarks} marks)
              </div>
              <button style={{ ...S.btn('ghost'), fontSize: '12px', padding: '6px 12px' }}
                onClick={handleGenerate} disabled={loading}>
                🔄 Regenerate
              </button>
            </div>

            {/* MCQ section */}
            {objQs.length > 0 && (
              <>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#4f46e5',
                  textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '8px',
                  padding: '6px 10px', background: '#eef2ff', borderRadius: '6px' }}>
                  Section A — Objective ({objQs.length} questions)
                </div>
                {objQs.map((q, i) => (
                  <QuestionCard key={q.id} q={q} index={i}
                    onEdit={() => showToast('Click on a field to edit', 'info')}
                    onDelete={() => handleDelete(i)} />
                ))}
              </>
            )}

            {/* Written section */}
            {subjQs.length > 0 && (
              <>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#059669',
                  textTransform: 'uppercase', letterSpacing: '.04em', margin: '12px 0 8px',
                  padding: '6px 10px', background: '#ecfdf5', borderRadius: '6px' }}>
                  Section B — Written ({subjQs.length} questions)
                </div>
                {subjQs.map((q, i) => (
                  <QuestionCard key={q.id} q={q} index={objQs.length + i}
                    onEdit={() => showToast('Click on a field to edit', 'info')}
                    onDelete={() => handleDelete(objQs.length + i)} />
                ))}
              </>
            )}

            {/* Save button */}
            {!savedExamId && (
              <button style={{ ...S.btn('primary'), width: '100%', marginTop: '16px', padding: '13px' }}
                onClick={handleSave} disabled={saving}>
                {saving ? '⏳ Saving…' : '💾 Save Exam & Get Print Links'}
              </button>
            )}
          </div>
        )}

        {/* Info box when no questions yet */}
        {questions.length === 0 && !loading && (
          <div style={{ ...S.alert('info') }}>
            <div style={{ fontWeight: '600', marginBottom: '6px' }}>How Question Master works</div>
            <div style={{ lineHeight: 1.7 }}>
              <strong>1.</strong> Select a syllabus → configure question count and marks →
              click <strong>Generate Questions</strong><br/>
              <strong>2.</strong> Review the questions → click <strong>Save Exam</strong><br/>
              <strong>3.</strong> Download the <strong>Print Pack</strong> (Question Paper + Answer Sheet)<br/>
              <strong>4.</strong> Distribute to students → collect filled Answer Sheets →
              scan and upload in <strong>Evaluation Central</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default QMasterPanel
