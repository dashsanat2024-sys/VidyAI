import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { apiGet, apiPost } from '../../utils/api'
import {
  INDIA_STATES, STATE_BOARDS, getSubjects, getChapters, getPdfUrl
} from '../../data/indiaCurriculum'

const CLASSES = Array.from({ length: 12 }, (_, i) => i + 1)
const DIFFICULTY_OPTS = ['Easy', 'Medium', 'Hard', 'Mixed']
const QTYPE_OPTS = [
  { value: 'mixed',      label: '⚖️  Mixed (Obj + Subj)' },
  { value: 'objective',  label: '🔘 Objective Only (MCQ)' },
  { value: 'subjective', label: '✍️  Subjective Only' },
]

// ── Phase constants ──────────────────────────────────────────────────────────
const PHASE = { SETUP: 'setup', GENERATED: 'generated', SAVED: 'saved' }

// ── Tiny helper: difficulty badge ────────────────────────────────────────────
function DiffBadge({ diff }) {
  const map = {
    Easy:   { bg: '#d1fae5', color: '#065f46' },
    Medium: { bg: '#fef9c3', color: '#854d0e' },
    Hard:   { bg: '#fee2e2', color: '#991b1b' },
  }
  const s = map[diff] || { bg: '#e0e7ff', color: '#3730a3' }
  return (
    <span style={{ padding: '2px 9px', borderRadius: 50, fontSize: 10, fontWeight: 800,
      background: s.bg, color: s.color, letterSpacing: '.3px' }}>
      {(diff || 'Medium').toUpperCase()}
    </span>
  )
}

// ── Print utilities ──────────────────────────────────────────────────────────
function buildFileName(board, classNum, subject) {
  const safe = s => (s || '').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_')
  return `${safe(board)}_Class${classNum}_${safe(subject)}`
}

function printQuestions({ questions, board, classNum, subject, meta, showAnswers }) {
  const fileName = buildFileName(board, classNum, subject)
  const totalMarks = questions.reduce((s, q) => s + (parseFloat(q.marks) || 1), 0)
  const objQs  = questions.filter(q => q.type === 'objective')
  const subjQs = questions.filter(q => q.type !== 'objective')

  const renderOptions = q => {
    if (!q.options || typeof q.options !== 'object') return ''
    return `<div class="options-grid">${
      Object.entries(q.options).map(([k, v]) =>
        `<div class="opt"><span class="opt-key">${k})</span> ${v}</div>`
      ).join('')
    }</div>`
  }

  const renderQ = (q, idx, sectionStart = 1) => {
    const num = sectionStart + idx
    const answerBlock = showAnswers
      ? `<div class="answer-block">
           <span class="ans-label">Answer:</span>
           <span class="ans-text">${q.answer || '—'}</span>
           ${q.explanation ? `<div class="explanation">Explanation: ${q.explanation}</div>` : ''}
         </div>`
      : q.type === 'objective'
        ? `<div class="answer-line">Answer: __________</div>`
        : `<div class="answer-space">${'<div class="ruled-line"></div>'.repeat(8)}</div>`
    return `
      <div class="question-block">
        <div class="q-header">
          <span class="q-num">Q${num}.</span>
          <span class="q-text">${q.question}</span>
          <span class="q-marks">[${q.marks || 1} mark${(q.marks || 1) > 1 ? 's' : ''}]</span>
        </div>
        ${renderOptions(q)}
        ${answerBlock}
      </div>`
  }

  const win = window.open('', '_blank')
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${fileName}${showAnswers ? '_ANSWER_KEY' : ''}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #111; padding: 32px 40px; }
        .school-header { text-align: center; border-bottom: 3px double #111; padding-bottom: 14px; margin-bottom: 20px; }
        .school-name   { font-size: 20pt; font-weight: 800; letter-spacing: 1px; }
        .exam-title    { font-size: 15pt; font-weight: 700; margin: 8px 0 4px; }
        .exam-meta     { font-size: 10pt; color: #444; }
        .info-row      { display: flex; justify-content: space-between; border: 1.5px solid #111; padding: 10px 16px; margin-bottom: 20px; border-radius: 4px; }
        .info-cell     { display: flex; flex-direction: column; gap: 6px; }
        .info-field    { font-size: 10pt; border-bottom: 1px solid #666; min-width: 160px; padding-bottom: 2px; }
        .info-label    { font-size: 8pt; color: #555; margin-bottom: 2px; }
        .instructions  { font-size: 9.5pt; background: #f8f8f8; border: 1px solid #ccc; padding: 10px 14px; border-radius: 4px; margin-bottom: 20px; line-height: 1.6; }
        .section-title { font-size: 12pt; font-weight: 700; border-bottom: 1.5px solid #111; padding-bottom: 6px; margin: 24px 0 14px; text-transform: uppercase; letter-spacing: .5px; }
        .question-block { margin-bottom: 18px; page-break-inside: avoid; }
        .q-header      { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 6px; }
        .q-num         { font-weight: 700; white-space: nowrap; }
        .q-text        { flex: 1; line-height: 1.5; }
        .q-marks       { font-size: 9.5pt; color: #555; white-space: nowrap; }
        .options-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin: 6px 0 6px 22px; }
        .opt           { font-size: 10.5pt; }
        .opt-key       { font-weight: 700; }
        .answer-line   { margin: 10px 0 0 22px; border-bottom: 1px solid #888; min-width: 200px; padding-bottom: 2px; font-size: 10pt; }
        .answer-space  { margin: 8px 0 0 22px; }
        .ruled-line    { border-bottom: 1px solid #ccc; height: 22px; margin-bottom: 2px; }
        .answer-block  { margin: 8px 0 0 22px; background: #f0fdf4; border-left: 4px solid #16a34a; padding: 8px 12px; border-radius: 0 4px 4px 0; }
        .ans-label     { font-weight: 700; color: #166534; margin-right: 8px; }
        .ans-text      { color: #166534; font-weight: 600; }
        .explanation   { font-size: 9.5pt; color: #555; margin-top: 6px; font-style: italic; }
        .marks-summary { font-size: 10pt; text-align: right; margin-top: 32px; border-top: 1px solid #ccc; padding-top: 10px; }
        .answer-key-banner { text-align:center; font-size:14pt; font-weight:800; color:#991b1b; border:2px solid #991b1b; padding:6px; border-radius:4px; margin-bottom:16px; letter-spacing:2px; }
        @media print {
          body { padding: 16px 24px; }
          @page { margin: 12mm; size: A4; }
        }
      </style>
    </head>
    <body>
      ${showAnswers ? '<div class="answer-key-banner">⚠ ANSWER KEY — FOR TEACHER USE ONLY</div>' : ''}
      <div class="school-header">
        <div class="school-name">${meta.schoolName || 'VidyAI School'}</div>
        <div class="exam-title">${subject} — ${board} Class ${classNum}</div>
        <div class="exam-meta">
          Total Marks: ${totalMarks} &nbsp;|&nbsp; Questions: ${questions.length}
          &nbsp;|&nbsp; Difficulty: ${meta.difficulty || 'Mixed'}
          &nbsp;|&nbsp; Date: ${meta.date || new Date().toLocaleDateString('en-IN')}
        </div>
      </div>

      ${!showAnswers ? `
      <div class="info-row">
        <div class="info-cell">
          <div class="info-label">STUDENT NAME</div>
          <div class="info-field">&nbsp;</div>
        </div>
        <div class="info-cell">
          <div class="info-label">ROLL NUMBER</div>
          <div class="info-field">&nbsp;</div>
        </div>
        <div class="info-cell">
          <div class="info-label">CLASS &amp; SECTION</div>
          <div class="info-field">Class ${classNum} &nbsp;</div>
        </div>
        <div class="info-cell">
          <div class="info-label">DATE</div>
          <div class="info-field">${meta.date || ''}&nbsp;</div>
        </div>
        <div class="info-cell">
          <div class="info-label">MARKS OBTAINED / TOTAL</div>
          <div class="info-field">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; / ${totalMarks}</div>
        </div>
      </div>

      <div class="instructions">
        <strong>General Instructions:</strong>
        Read all questions carefully before answering. •
        ${objQs.length > 0 ? `Section A has ${objQs.length} objective question(s) worth ${objQs.reduce((s,q)=>s+(parseFloat(q.marks)||1),0)} mark(s). Circle or write your answer clearly. •` : ''}
        ${subjQs.length > 0 ? `Section B has ${subjQs.length} subjective question(s) worth ${subjQs.reduce((s,q)=>s+(parseFloat(q.marks)||1),0)} mark(s). Use the ruled lines provided. •` : ''}
        All questions are compulsory unless stated otherwise. • Write neatly.
      </div>` : ''}

      ${objQs.length > 0 ? `
        <div class="section-title">Section A — Objective Questions (${objQs.length} × ${objQs[0]?.marks || 1} = ${objQs.reduce((s,q)=>s+(parseFloat(q.marks)||1),0)} Marks)</div>
        ${objQs.map((q, i) => renderQ(q, i, 1)).join('')}
      ` : ''}

      ${subjQs.length > 0 ? `
        <div class="section-title">Section B — Subjective Questions (${subjQs.length} Questions — ${subjQs.reduce((s,q)=>s+(parseFloat(q.marks)||1),0)} Marks)</div>
        ${subjQs.map((q, i) => renderQ(q, i, objQs.length + 1)).join('')}
      ` : ''}

      ${!showAnswers ? '' : `<div class="marks-summary">Total: ${totalMarks} Marks | Prepared by: ${meta.teacherName || 'Teacher'}</div>`}

      <script>
        document.title = '${fileName}${showAnswers ? '_ANSWER_KEY' : ''}';
        window.onload = () => window.print();
      </script>
    </body>
    </html>
  `)
  win.document.close()
}

// ─────────────────────────────────────────────────────────────────────────────
// Main QMasterPanel
// ─────────────────────────────────────────────────────────────────────────────
export function QMasterPanel({ showToast }) {
  const { token } = useAuth()

  // ── Phase ────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState(PHASE.SETUP)

  // ── Selector state ───────────────────────────────────────────────────────
  const [state,    setState]    = useState('Maharashtra')
  const [boards,   setBoards]   = useState([])
  const [board,    setBoard]    = useState(null)
  const [classNum, setClassNum] = useState(10)
  const [subjects, setSubjects] = useState([])
  const [subject,  setSubject]  = useState('')

  // ── Question config ──────────────────────────────────────────────────────
  const [qType,      setQType]      = useState('mixed')
  const [qCount,     setQCount]     = useState(10)
  const [difficulty, setDifficulty] = useState('Mixed')
  const [objMarks,   setObjMarks]   = useState(1)
  const [subjMarks,  setSubjMarks]  = useState(5)

  // ── Custom questions (add your own) ─────────────────────────────────────
  const [customQs, setCustomQs] = useState([])
  const [showAddQ,  setShowAddQ]  = useState(false)
  const [newQ, setNewQ] = useState({ question: '', type: 'objective', difficulty: 'Medium', marks: 1, options: { A: '', B: '', C: '', D: '' }, answer: '' })

  // ── Paper metadata ───────────────────────────────────────────────────────
  const [schoolName,   setSchoolName]   = useState('')
  const [teacherName,  setTeacherName]  = useState('')
  const [examDate,     setExamDate]     = useState(new Date().toISOString().slice(0, 10))

  // ── Generated questions ──────────────────────────────────────────────────
  const [generated,    setGenerated]    = useState([])   // all AI questions
  const [selected,     setSelected]     = useState([])   // indices selected to print
  const [generating,   setGenerating]   = useState(false)

  // ── Saved exam ───────────────────────────────────────────────────────────
  const [savedExamId,  setSavedExamId]  = useState(null)
  const [saving,       setSaving]       = useState(false)

  // ── Saved banks list ─────────────────────────────────────────────────────
  const [banks,        setBanks]        = useState([])
  const [banksLoading, setBanksLoading] = useState(false)
  const [showBanks,    setShowBanks]    = useState(false)

  // ── Populate boards when state changes ──────────────────────────────────
  useEffect(() => {
    const stateBoards = STATE_BOARDS[state] || []
    setBoards(stateBoards)
    const def = stateBoards.find(b => b.shortName === 'CBSE') || stateBoards[0] || null
    setBoard(def)
  }, [state])

  // ── Populate subjects when board/class changes ───────────────────────────
  useEffect(() => {
    if (!board) { setSubjects([]); setSubject(''); return }
    const subs = getSubjects(board.shortName, classNum)
    setSubjects(subs)
    setSubject(subs[0] || '')
  }, [board, classNum])

  // ── Compute obj/subj counts from qType + qCount ─────────────────────────
  const getObjSubjCounts = () => {
    const n = parseInt(qCount) || 10
    if (qType === 'objective')  return { obj: n, subj: 0 }
    if (qType === 'subjective') return { obj: 0, subj: n }
    const obj = Math.round(n * 0.6)
    return { obj, subj: n - obj }
  }

  // ── Generate questions via API ───────────────────────────────────────────
  const handleGenerate = async () => {
    if (!subject || !board) { showToast('Select a board, class and subject first', 'warning'); return }

    // Build / reuse syllabus ID
    const sid = `gov_${(board.shortName || 'CBSE').toLowerCase()}_class${classNum}_${subject.toLowerCase().replace(/[\s/]+/g, '_')}`
    // Register virtual syllabus so backend knows about it
    await apiPost('/syllabi/register-virtual', {
      syllabus_id: sid,
      name: `${board.shortName} Class ${classNum} — ${subject}`,
      chapters: getChapters(classNum, subject) || []
    }, token)

    const { obj, subj } = getObjSubjCounts()
    setGenerating(true)
    try {
      const res = await apiPost('/generate-questions', {
        syllabus_id:       sid,
        topic:             `${subject} — Class ${classNum}`,
        subject:           subject,
        objective_count:   obj,
        subjective_count:  subj,
        objective_weightage:  objMarks,
        subjective_weightage: subjMarks,
        difficulty:        difficulty === 'Mixed' ? undefined : difficulty.toLowerCase(),
        difficulty_distribution: difficulty === 'Mixed'
          ? { easy: 30, medium: 50, hard: 20 }
          : difficulty === 'Easy'   ? { easy: 100, medium: 0, hard: 0 }
          : difficulty === 'Hard'   ? { easy: 0,   medium: 0, hard: 100 }
          :                           { easy: 0,   medium: 100, hard: 0 },
      }, token)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')

      const aiQs = data.questions || []
      const allQs = [...aiQs, ...customQs]
      setGenerated(allQs)
      setSelected(allQs.map((_, i) => i))   // select all by default
      setPhase(PHASE.GENERATED)
      setSavedExamId(null)
      showToast(`${allQs.length} questions generated!`, 'success')
    } catch (e) {
      showToast(e.message, 'error')
    }
    setGenerating(false)
  }

  // ── Toggle question selection ────────────────────────────────────────────
  const toggleQ = idx => setSelected(prev =>
    prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
  )
  const selectAll  = () => setSelected(generated.map((_, i) => i))
  const selectNone = () => setSelected([])

  const selectedQs = selected.map(i => generated[i]).filter(Boolean)
  const totalMarks = selectedQs.reduce((s, q) => s + (parseFloat(q.marks) || 1), 0)

  // ── Print helpers ────────────────────────────────────────────────────────
  const meta = { schoolName, teacherName, difficulty, date: examDate }

  const doPrint = (showAnswers) => {
    if (selectedQs.length === 0) { showToast('Select at least one question', 'warning'); return }
    printQuestions({
      questions: selectedQs,
      board: board?.shortName || 'CBSE',
      classNum, subject, meta, showAnswers
    })
  }

  // ── Save exam to backend ─────────────────────────────────────────────────
  const saveExam = async () => {
    if (selectedQs.length === 0) { showToast('Select at least one question', 'warning'); return }
    setSaving(true)
    try {
      const sid = `gov_${(board?.shortName || 'CBSE').toLowerCase()}_class${classNum}_${subject.toLowerCase().replace(/[\s/]+/g, '_')}`
      const res = await apiPost('/exams/save', {
        syllabus_id:   sid,
        syllabus_name: `${board?.shortName} Class ${classNum} — ${subject}`,
        topic:         `${subject} — Class ${classNum}`,
        questions:     selectedQs,
      }, token)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSavedExamId(data.exam_id)
      setPhase(PHASE.SAVED)
      showToast(`Exam saved! ID: ${data.exam_id}`, 'success')
    } catch (e) { showToast(e.message, 'error') }
    setSaving(false)
  }

  // ── Reset / Refresh ──────────────────────────────────────────────────────
  const reset = () => {
    setPhase(PHASE.SETUP)
    setGenerated([])
    setSelected([])
    setSavedExamId(null)
    setCustomQs([])
    setShowAddQ(false)
  }

  // ── Fetch saved banks ────────────────────────────────────────────────────
  const fetchBanks = async () => {
    setBanksLoading(true)
    try {
      const res = await apiGet('/questions', token)
      const data = await res.json()
      setBanks(data.exams || [])
    } catch { }
    setBanksLoading(false)
  }

  // ── Add custom question ──────────────────────────────────────────────────
  const addCustomQ = () => {
    if (!newQ.question.trim()) { showToast('Question text is required', 'warning'); return }
    const q = {
      ...newQ,
      id:         Date.now(),
      marks:      parseFloat(newQ.marks) || (newQ.type === 'objective' ? 1 : 5),
      options:    newQ.type === 'objective' ? { ...newQ.options } : null,
      answer:     newQ.answer || '',
      explanation:'',
    }
    setCustomQs(prev => [...prev, q])
    setNewQ({ question: '', type: 'objective', difficulty: 'Medium', marks: 1, options: { A: '', B: '', C: '', D: '' }, answer: '' })
    showToast('Custom question added', 'success')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // ── PHASE: SETUP ─────────────────────────────────────────────────────────
  if (phase === PHASE.SETUP) return (
    <div className="panel active">
      <div style={{ maxWidth: 1060, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 28 }}>🖋️</div>
            <div>
              <h3 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)', margin: 0 }}>Question Master</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: '2px 0 0' }}>Generate, customise, print and save exam papers</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-outline" onClick={() => { setShowBanks(b => !b); if (!showBanks) fetchBanks() }} style={{ fontSize: 13, padding: '8px 18px' }}>
              📋 Saved Banks
            </button>
          </div>
        </div>

        {/* ── SAVED BANKS DRAWER ── */}
        {showBanks && (
          <div className="card" style={{ padding: 20, marginBottom: 20, background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, color: 'var(--indigo)' }}>📦 Saved Question Banks</div>
              <button className="btn-outline" onClick={fetchBanks} style={{ fontSize: 12, padding: '4px 12px' }}>🔄 Refresh</button>
            </div>
            {banksLoading && <div style={{ textAlign: 'center', padding: 20 }}><span className="spinner" /></div>}
            {!banksLoading && banks.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>No saved exams yet. Generate and save your first paper.</p>
            )}
            {banks.map(bank => (
              <div key={bank.exam_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--indigo)' }}>
                    🆔 {bank.exam_id}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {bank.syllabus_name || bank.topic} • {bank.questions?.length || 0} questions • {bank.total_marks || 0} marks
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ padding: '3px 10px', background: 'var(--indigo3)', borderRadius: 50, fontSize: 10, fontWeight: 700, color: 'var(--indigo)' }}>
                    {bank.objective_count || 0} obj + {bank.subjective_count || 0} subj
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SELECTOR CARD ── */}
        <div className="card" style={{ padding: 28, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--muted)', marginBottom: 14 }}>
            Step 1 — Select Curriculum
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label>State / UT</label>
              <select className="fi sel" value={state} onChange={e => setState(e.target.value)}>
                {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label>Board</label>
              <select className="fi sel" value={board?.name || ''} onChange={e => {
                const b = boards.find(bd => bd.name === e.target.value); setBoard(b || null)
              }}>
                {boards.length === 0 && <option value=''>— Select state —</option>}
                {boards.map(b => (
                  <option key={b.shortName} value={b.name}>
                    {b.type === 'national' ? '🇮🇳 ' : '🏫 '}{b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label>Class</label>
              <select className="fi sel" value={classNum} onChange={e => setClassNum(Number(e.target.value))}>
                {CLASSES.map(n => <option key={n} value={n}>Class {n}</option>)}
              </select>
            </div>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label>Subject</label>
              <select className="fi sel" value={subject} onChange={e => setSubject(e.target.value)} disabled={!subjects.length}>
                {subjects.length === 0 && <option>— Select board first —</option>}
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── QUESTION CONFIG CARD ── */}
        <div className="card" style={{ padding: 28, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--muted)', marginBottom: 14 }}>
            Step 2 — Question Settings
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 16 }}>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label>Question Type</label>
              <select className="fi sel" value={qType} onChange={e => setQType(e.target.value)}>
                {QTYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label>Total Questions</label>
              <select className="fi sel" value={qCount} onChange={e => setQCount(Number(e.target.value))}>
                {[5, 10, 15, 20, 25, 30].map(n => <option key={n} value={n}>{n} Questions</option>)}
              </select>
            </div>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label>Difficulty</label>
              <select className="fi sel" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                {DIFFICULTY_OPTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {qType !== 'subjective' && (
              <div className="fg" style={{ marginBottom: 0 }}>
                <label>Marks per Objective Q</label>
                <select className="fi sel" value={objMarks} onChange={e => setObjMarks(Number(e.target.value))}>
                  {[0.5, 1, 2].map(v => <option key={v} value={v}>{v} mark{v > 1 ? 's' : ''}</option>)}
                </select>
              </div>
            )}
            {qType !== 'objective' && (
              <div className="fg" style={{ marginBottom: 0 }}>
                <label>Marks per Subjective Q</label>
                <select className="fi sel" value={subjMarks} onChange={e => setSubjMarks(Number(e.target.value))}>
                  {[2, 3, 4, 5, 6, 8, 10].map(v => <option key={v} value={v}>{v} marks</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Distribution preview */}
          <div style={{ background: 'var(--indigo3)', borderRadius: 10, padding: '10px 16px', fontSize: 12, color: 'var(--indigo)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {(() => { const { obj, subj } = getObjSubjCounts(); return (
              <>
                {obj  > 0 && <span>🔘 {obj} Objective × {objMarks} = <strong>{obj * objMarks} marks</strong></span>}
                {subj > 0 && <span>✍️ {subj} Subjective × {subjMarks} = <strong>{subj * subjMarks} marks</strong></span>}
                <span style={{ marginLeft: 'auto', fontWeight: 800 }}>
                  Total: {obj * objMarks + subj * subjMarks} marks
                </span>
              </>
            )})()}
          </div>
        </div>

        {/* ── PAPER METADATA ── */}
        <div className="card" style={{ padding: 28, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--muted)', marginBottom: 14 }}>
            Step 3 — Paper Header (optional)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label>School / Institution Name</label>
              <input className="fi" placeholder="e.g. St. Xavier's School" value={schoolName} onChange={e => setSchoolName(e.target.value)} />
            </div>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label>Teacher / Prepared By</label>
              <input className="fi" placeholder="e.g. Mrs. Priya Sharma" value={teacherName} onChange={e => setTeacherName(e.target.value)} />
            </div>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label>Exam Date</label>
              <input className="fi" type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── ADD CUSTOM QUESTIONS ── */}
        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: customQs.length > 0 || showAddQ ? 16 : 0 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--muted)' }}>Step 4 — Add Your Own Questions (optional)</div>
              {customQs.length > 0 && <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4, fontWeight: 600 }}>✓ {customQs.length} custom question{customQs.length > 1 ? 's' : ''} added</div>}
            </div>
            <button
              onClick={() => setShowAddQ(v => !v)}
              style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--sans)', background: showAddQ ? 'var(--red)' : 'var(--indigo)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              {showAddQ ? '✕ Cancel' : '+ Add Question'}
            </button>
          </div>

          {/* Existing custom questions */}
          {customQs.length > 0 && !showAddQ && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {customQs.map((q, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <DiffBadge diff={q.difficulty} />
                  <span style={{ fontSize: 12, background: q.type === 'objective' ? 'var(--indigo3)' : '#fce7f3', color: q.type === 'objective' ? 'var(--indigo)' : '#9d174d', padding: '2px 8px', borderRadius: 50, fontWeight: 700 }}>
                    {q.type === 'objective' ? 'OBJ' : 'SUBJ'}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{q.question.substring(0, 80)}{q.question.length > 80 ? '…' : ''}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{q.marks}m</span>
                  <button onClick={() => setCustomQs(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Add form */}
          {showAddQ && (
            <div style={{ padding: 20, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}>
                <div className="fg" style={{ marginBottom: 0 }}>
                  <label>Type</label>
                  <select className="fi sel" value={newQ.type} onChange={e => setNewQ(q => ({ ...q, type: e.target.value }))}>
                    <option value="objective">Objective (MCQ)</option>
                    <option value="subjective">Subjective</option>
                  </select>
                </div>
                <div className="fg" style={{ marginBottom: 0 }}>
                  <label>Difficulty</label>
                  <select className="fi sel" value={newQ.difficulty} onChange={e => setNewQ(q => ({ ...q, difficulty: e.target.value }))}>
                    {['Easy', 'Medium', 'Hard'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="fg" style={{ marginBottom: 0 }}>
                  <label>Marks</label>
                  <input className="fi" type="number" min={0.5} step={0.5} value={newQ.marks} onChange={e => setNewQ(q => ({ ...q, marks: e.target.value }))} />
                </div>
              </div>
              <div className="fg">
                <label>Question Text</label>
                <textarea className="fi" rows={2} placeholder="Type your question here…" value={newQ.question} onChange={e => setNewQ(q => ({ ...q, question: e.target.value }))} />
              </div>
              {newQ.type === 'objective' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  {['A', 'B', 'C', 'D'].map(k => (
                    <div key={k} className="fg" style={{ marginBottom: 0 }}>
                      <label>Option {k}</label>
                      <input className="fi" placeholder={`Option ${k}`} value={newQ.options[k]} onChange={e => setNewQ(q => ({ ...q, options: { ...q.options, [k]: e.target.value } }))} />
                    </div>
                  ))}
                </div>
              )}
              <div className="fg" style={{ marginBottom: 12 }}>
                <label>{newQ.type === 'objective' ? 'Correct Answer (A / B / C / D)' : 'Model Answer'}</label>
                <input className="fi" placeholder={newQ.type === 'objective' ? 'e.g. B' : 'Type the model answer…'} value={newQ.answer} onChange={e => setNewQ(q => ({ ...q, answer: e.target.value }))} />
              </div>
              <button className="btn-submit indigo" style={{ width: 'auto', padding: '10px 28px' }} onClick={addCustomQ}>
                ✓ Add This Question
              </button>
            </div>
          )}
        </div>

        {/* ── GENERATE BUTTON ── */}
        <button
          className="btn-submit saffron"
          onClick={handleGenerate}
          disabled={generating || !subject || !board}
          style={{ fontSize: 15, padding: '15px 0', marginTop: 4 }}>
          {generating
            ? <><span className="spin" />Generating {qCount} questions…</>
            : <>🚀 Generate {qCount} Questions for {board?.shortName || '…'} Class {classNum} — {subject || '…'}</>
          }
        </button>
      </div>
    </div>
  )

  // ── PHASE: GENERATED ─────────────────────────────────────────────────────
  if (phase === PHASE.GENERATED) {
    const fileName = buildFileName(board?.shortName, classNum, subject)
    return (
      <div className="panel active">
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>

          {/* Top action bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)', margin: 0 }}>
                {board?.shortName} Class {classNum} — {subject}
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
                {generated.length} questions generated • {selectedQs.length} selected • {totalMarks} total marks
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={reset} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 13 }}>
                🔄 New Paper
              </button>
              <button onClick={() => doPrint(false)} className="btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 13, borderColor: 'var(--indigo)', color: 'var(--indigo)' }}>
                🖨 Print Questions
              </button>
              <button onClick={() => doPrint(true)} className="btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 13, borderColor: 'var(--green)', color: 'var(--green)' }}>
                🔑 Print Answer Key
              </button>
              <button onClick={saveExam} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--sans)', background: 'var(--indigo)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                {saving ? <><span className="spin" />Saving…</> : '💾 Save & Get Exam ID'}
              </button>
            </div>
          </div>

          {/* Selection controls */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--indigo)' }}>
              Select questions to print ({selectedQs.length}/{generated.length}):
            </span>
            <button className="btn-outline" style={{ padding: '4px 14px', fontSize: 12 }} onClick={selectAll}>All</button>
            <button className="btn-outline" style={{ padding: '4px 14px', fontSize: 12 }} onClick={selectNone}>None</button>
            <div style={{ marginLeft: 'auto', background: 'var(--indigo3)', padding: '6px 16px', borderRadius: 50, fontSize: 12, fontWeight: 700, color: 'var(--indigo)' }}>
              {totalMarks} total marks for selected
            </div>
          </div>

          {/* File name hint */}
          <div style={{ marginBottom: 14, padding: '8px 14px', background: '#f0fdf4', borderRadius: 8, fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
            📄 File will be saved as: <code style={{ background: '#dcfce7', padding: '2px 6px', borderRadius: 4 }}>{fileName}.pdf</code>
          </div>

          {/* Questions list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {generated.map((q, idx) => {
              const isSelected = selected.includes(idx)
              return (
                <div
                  key={idx}
                  onClick={() => toggleQ(idx)}
                  className="card"
                  style={{
                    padding: 20, cursor: 'pointer',
                    border: isSelected ? '2px solid var(--indigo2)' : '1.5px solid #e2e8f0',
                    background: isSelected ? '#fff' : '#fafafa',
                    transition: '.15s',
                    borderLeft: `5px solid ${q.type === 'objective' ? 'var(--indigo)' : 'var(--saffron)'}`,
                  }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    {/* Checkbox */}
                    <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${isSelected ? 'var(--indigo2)' : '#cbd5e1'}`, background: isSelected ? 'var(--indigo2)' : '#fff', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 1 }}>
                      {isSelected && <span style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>✓</span>}
                    </div>
                    {/* Q number */}
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--indigo)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {idx + 1}
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 50, fontSize: 10, fontWeight: 800, background: q.type === 'objective' ? 'var(--indigo3)' : '#fce7f3', color: q.type === 'objective' ? 'var(--indigo)' : '#9d174d' }}>
                          {q.type === 'objective' ? 'OBJECTIVE' : 'SUBJECTIVE'}
                        </span>
                        <DiffBadge diff={q.difficulty} />
                        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                          [{q.marks} mark{q.marks > 1 ? 's' : ''}]
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, lineHeight: 1.55, marginBottom: 10 }}>{q.question}</div>

                      {/* MCQ options */}
                      {q.type === 'objective' && q.options && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 10 }}>
                          {Object.entries(q.options).map(([k, v]) => (
                            <div key={k} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, display: 'flex', gap: 6 }}>
                              <strong style={{ color: 'var(--indigo)' }}>{k})</strong> {v}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Answer */}
                      {q.answer && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
                          <span style={{ background: 'var(--green)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 2 }}>ANS</span>
                          <span style={{ color: 'var(--green)', fontWeight: 600 }}>{q.answer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bottom action strip */}
          <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid #e2e8f0', padding: '14px 0', marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button onClick={reset} className="btn-outline" style={{ padding: '10px 20px', fontSize: 13 }}>🔄 New Paper</button>
            <button onClick={() => doPrint(false)} className="btn-saffron" style={{ padding: '10px 22px', fontSize: 13 }}>🖨 Print {selectedQs.length} Questions</button>
            <button onClick={() => doPrint(true)} style={{ padding: '10px 22px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--sans)', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}>🔑 Print Answer Key</button>
            <button onClick={saveExam} disabled={saving} style={{ padding: '10px 22px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--sans)', background: 'var(--indigo)', color: '#fff', border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .7 : 1 }}>
              {saving ? <><span className="spin" />Saving…</> : '💾 Save Exam'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── PHASE: SAVED ──────────────────────────────────────────────────────────
  return (
    <div className="panel active">
      <div style={{ maxWidth: 700, margin: '80px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
        <h3 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)', fontSize: 28, marginBottom: 12 }}>
          Exam Saved Successfully!
        </h3>
        <p style={{ color: 'var(--muted)', marginBottom: 28 }}>
          Your exam paper has been saved and assigned an Exam ID. Students can be evaluated using this ID in the Evaluation Central.
        </p>

        {/* Exam ID card */}
        <div style={{ background: 'var(--indigo3)', borderRadius: 16, padding: 28, marginBottom: 28, border: '2px solid var(--indigo2)' }}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--indigo2)', marginBottom: 8 }}>Exam ID</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 800, color: 'var(--indigo)', letterSpacing: 2 }}>
            {savedExamId}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
            {board?.shortName} • Class {classNum} • {subject} • {selectedQs.length} questions • {totalMarks} marks
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
          📋 Copy this Exam ID and use it in <strong>Evaluation Central</strong> when uploading student answer sheets for AI grading.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => doPrint(false)} className="btn-saffron" style={{ padding: '12px 28px' }}>🖨 Print Questions</button>
          <button onClick={() => doPrint(true)} style={{ padding: '12px 28px', fontWeight: 700, fontFamily: 'var(--sans)', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}>🔑 Print Answer Key</button>
          <button onClick={reset} className="btn-outline" style={{ padding: '12px 28px' }}>🔄 Create New Paper</button>
        </div>
      </div>
    </div>
  )
}
