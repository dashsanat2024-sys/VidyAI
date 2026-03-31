import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { apiPost, apiGet } from '../../utils/api'

// ── Add-custom-question form (used inside QGenPanel preview) ─────────────────────
function QGenCustomForm({ onAdd, onCancel }) {
  const [qType,    setQType]    = useState('obj')
  const [question, setQuestion] = useState('')
  const [opts,     setOpts]     = useState({ A: '', B: '', C: '', D: '' })
  const [answer,   setAnswer]   = useState('A')
  const [marks,    setMarks]    = useState(1)
  const [criteria, setCriteria] = useState('')

  const valid = question.trim() && (qType === 'subj' || (opts.A.trim() && opts.B.trim()))

  const handleAdd = () => {
    if (!valid) return
    const q = { type: qType, question: question.trim(), marks: parseFloat(marks) || 1, source: 'custom' }
    if (qType === 'obj') {
      q.options = Object.fromEntries(Object.entries(opts).filter(([, v]) => v.trim()))
      q.answer  = answer
    } else {
      q.evaluation_criteria = criteria
      q.answer = criteria || '(Teacher-defined)'
    }
    onAdd(q)
  }

  const chip = (active) => ({
    padding: '5px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: active ? '1.5px solid var(--indigo)' : '1.5px solid #c7d2fe',
    background: active ? 'var(--indigo)' : '#eef2ff',
    color: active ? '#fff' : 'var(--indigo)',
    transition: 'all .15s', userSelect: 'none',
  })

  return (
    <div style={{ marginTop: 16, padding: 18, background: '#f5f3ff', borderRadius: 12, border: '2px solid #ddd6fe' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, color: '#7c3aed', fontSize: 14 }}>➕ Add Custom Question</div>
        <button className="btn-outline" style={{ fontSize: 11, padding: '3px 10px' }} onClick={onCancel}>✕ Cancel</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <span style={chip(qType === 'obj')} onClick={() => setQType('obj')}>MCQ</span>
        <span style={chip(qType === 'subj')} onClick={() => setQType('subj')}>Written / Subjective</span>
      </div>

      <div className="fg" style={{ marginBottom: 10 }}>
        <label>Question *</label>
        <textarea className="fi" rows={3} value={question} placeholder="Type your question here…"
          style={{ resize: 'vertical', lineHeight: 1.5 }}
          onChange={e => setQuestion(e.target.value)} />
      </div>

      {qType === 'obj' && (
        <>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6, color: '#64748b', textTransform: 'uppercase' }}>Options (A & B required)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['A','B','C','D'].map(k => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span onClick={() => setAnswer(k)}
                    style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: answer === k ? '#059669' : '#eef2ff',
                      color: answer === k ? '#fff' : 'var(--indigo)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 11, cursor: 'pointer', userSelect: 'none' }}>{k}</span>
                  <input className="fi" placeholder={`Option ${k}${k <= 'B' ? ' *' : ''}`}
                    style={{ flex: 1, margin: 0 }}
                    value={opts[k]} onChange={e => setOpts(o => ({ ...o, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>
          {['A','B','C','D'].filter(k => opts[k].trim()).length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6, color: '#64748b', textTransform: 'uppercase' }}>Correct Answer</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['A','B','C','D'].filter(k => opts[k].trim()).map(k => (
                  <span key={k} style={chip(answer === k)} onClick={() => setAnswer(k)}>{k}: {opts[k].slice(0,18)}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {qType === 'subj' && (
        <div className="fg" style={{ marginBottom: 10 }}>
          <label>Marking Criteria / Rubric</label>
          <textarea className="fi" rows={2} value={criteria}
            placeholder="e.g. 1m: definition · 2m: explanation · 1m: example"
            style={{ resize: 'vertical', lineHeight: 1.5 }}
            onChange={e => setCriteria(e.target.value)} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div className="fg" style={{ marginBottom: 0, flex: '0 0 110px' }}>
          <label>Marks *</label>
          <input className="fi" type="number" min={0.5} step={0.5}
            value={marks} onChange={e => setMarks(e.target.value)} />
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn-submit indigo" style={{ marginTop: 0 }}
          onClick={handleAdd} disabled={!valid}>
          ✅ Add Question
        </button>
        <button className="btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

export default function QGenPanel({ showToast }) {
  const { token } = useAuth()
  const { syllabi, activeSyllabus, refreshData } = useApp()

  const [selectedSyl, setSelectedSyl]     = useState('')
  const [topic, setTopic]                 = useState('')
  const [chapters, setChapters]           = useState([])
  const [selChapters, setSelChapters]     = useState([])
  const [objCount, setObjCount]           = useState(5)
  const [subjCount, setSubjCount]         = useState(5)
  const [objMarks, setObjMarks]           = useState(1)
  const [subjMarks, setSubjMarks]         = useState(5)
  const [difficulty, setDifficulty]       = useState('medium')
  const [questions, setQuestions]         = useState([])
  const [loading, setLoading]             = useState(false)
  const [preview, setPreview]             = useState(false)
  const [previewTopic, setPreviewTopic]   = useState('')
  const [previewMeta, setPreviewMeta]     = useState({ syllabusName: '', chapters: [] })

  // Inline editing state
  const [editingMarksIdx, setEditingMarksIdx] = useState(-1)
  const [editingMarksVal, setEditingMarksVal] = useState('')
  const [showAddQ, setShowAddQ]               = useState(false)

  // Paper metadata
  const [schoolName, setSchoolName]       = useState('')
  const [studentName, setStudentName]     = useState('')
  const [rollNo, setRollNo]               = useState('')
  const [examDate, setExamDate]           = useState('')

  useEffect(() => {
    if (activeSyllabus && !selectedSyl) {
      setSelectedSyl(activeSyllabus.id)
      loadChapters(activeSyllabus.id)
    }
  }, [activeSyllabus])

  const loadChapters = async (sid) => {
    if (!sid) { setChapters([]); return }
    try {
      const data = await apiGet(`/syllabi/${sid}/chapters`, token)
      const chs = data.chapters || []
      setChapters(chs)
      setSelChapters(chs)
      if (data.name && !topic) setTopic(data.name)
    } catch { }
  }

  const toggleChapter = (c) => {
    setSelChapters(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  const generate = async () => {
    if (!selectedSyl) { showToast('Select a syllabus first', 'error'); return }
    const today = new Date().toISOString().slice(0, 10)
    if (examDate && examDate < today) { showToast('Exam date cannot be a past date', 'error'); return }
    setLoading(true)
    try {
      const syl = syllabi.find(s => s.id === selectedSyl)
      const parts = syl?.name?.split('-') || []
      const subject = parts.length > 1 ? parts[parts.length - 1].trim() : ''
      const data = await apiPost('/generate-questions', {
        syllabus_id: selectedSyl, topic: topic || 'General', subject,
        chapters: selChapters, objective_count: objCount, subjective_count: subjCount,
        objective_weightage: objMarks, subjective_weightage: subjMarks, difficulty
      }, token)
      setQuestions(data.questions || [])
      setPreviewTopic(data.syllabus_name || topic)
      setPreviewMeta({ syllabusName: data.syllabus_name || topic, chapters: data.chapters || selChapters })
      setPreview(true)
      showToast('Questions generated!', 'success')
      await refreshData()
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  const printPaper = () => {
    const win = window.open('', '_blank')
    const totalMarks = questions.reduce((s, q) => s + (q.marks || 0), 0)
    win.document.write(`
      <html><head><title>Question Paper - ${previewTopic}</title>
      <style>
        body{font-family:Georgia,serif;padding:40px;color:#111;line-height:1.7}
        h1{font-size:22px;text-align:center;margin-bottom:4px}
        .meta{text-align:center;font-size:13px;color:#555;margin-bottom:30px}
        .header-row{display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:20px}
        .q{margin-bottom:20px;page-break-inside:avoid}
        .q-num{font-weight:700;margin-right:8px}
        .opts{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0 0 20px;font-size:14px}
        .marks{font-size:12px;color:#555;float:right}
        .section-title{font-size:15px;font-weight:700;border-bottom:1px solid #ccc;margin:24px 0 12px;padding-bottom:4px;text-transform:uppercase;letter-spacing:1px}
      </style></head><body>
      <h1>${schoolName || 'VidyAI Examination'}</h1>
      <div class="meta">Subject: ${previewMeta.syllabusName || previewTopic} &nbsp;|&nbsp; Total Marks: ${totalMarks} &nbsp;|&nbsp; Date: ${examDate || new Date().toLocaleDateString()}</div>
      <div class="header-row">
        <div>Name: ${studentName || '___________________'}</div>
        <div>Roll No: ${rollNo || '______'}</div>
        <div>Marks Obtained: _______ / ${totalMarks}</div>
      </div>
      ${questions.filter(q => q.type === 'objective').length > 0 ? '<div class="section-title">Section A — Objective Questions</div>' : ''}
      ${questions.filter(q => q.type === 'objective').map((q, i) => `
        <div class="q">
          <span class="marks">[${q.marks} mark${q.marks > 1 ? 's' : ''}]</span>
          <span class="q-num">Q${i + 1}.</span>${q.question}
          ${q.options ? `<div class="opts">${Object.entries(q.options).map(([k, v]) => `<div>(${k}) ${v}</div>`).join('')}</div>` : ''}
        </div>`).join('')}
      ${questions.filter(q => q.type !== 'objective').length > 0 ? '<div class="section-title">Section B — Subjective Questions</div>' : ''}
      ${questions.filter(q => q.type !== 'objective').map((q, i) => `
        <div class="q">
          <span class="marks">[${q.marks} marks]</span>
          <span class="q-num">Q${i + 1}.</span>${q.question}
          <div style="margin-top:8px;border-bottom:1px solid #ddd;height:60px;"></div>
        </div>`).join('')}
      <script>window.print();<\/script>
      </body></html>`)
    win.document.close()
  }

  return (
    <div className="panel active">
      <div className="w-limit">
        {!preview ? (
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)', marginBottom: 20 }}>
              ❓ Generate Exam Paper
            </h3>

            {/* Step 1: Syllabus */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--indigo)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12 }}>1</div>
                Select Syllabus Source
              </div>
              <select className="fi sel" value={selectedSyl} onChange={e => { setSelectedSyl(e.target.value); loadChapters(e.target.value) }}>
                <option value="">— Choose Syllabus —</option>
                {syllabi.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Step 2: Chapters */}
            {chapters.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--indigo)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12 }}>2</div>
                  Select Chapters
                </div>
                <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:6, gap:8 }}>
                  <button className="btn-outline" style={{ fontSize:11, padding:'3px 10px' }} onClick={() => setSelChapters(chapters)}>Select All</button>
                  <button className="btn-outline" style={{ fontSize:11, padding:'3px 10px' }} onClick={() => setSelChapters([])}>Deselect All</button>
                </div>
                <div className="chips-wrap">
                  {chapters.map(c => (
                    <div key={c} title={c} className={`chip ${selChapters.includes(c) ? 'selected' : ''}`}
                      style={{ maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', borderRadius:8, fontWeight: selChapters.includes(c) ? 500 : 400 }}
                      onClick={() => toggleChapter(c)}>{c}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Config */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--indigo)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12 }}>3</div>
                Paper Configuration
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div className="fg"><label>Topic / Subject</label><input className="fi" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Photosynthesis" /></div>
                <div className="fg">
                  <label>Difficulty</label>
                  <select className="fi sel" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div className="fg"><label>Objective Questions</label><input className="fi" type="number" min={0} max={50} value={objCount} onChange={e => setObjCount(Number(e.target.value))} /></div>
                <div className="fg"><label>Obj. Marks Each</label><input className="fi" type="number" min={1} max={10} value={objMarks} onChange={e => setObjMarks(Number(e.target.value))} /></div>
                <div className="fg"><label>Subjective Questions</label><input className="fi" type="number" min={0} max={50} value={subjCount} onChange={e => setSubjCount(Number(e.target.value))} /></div>
                <div className="fg"><label>Subj. Marks Each</label><input className="fi" type="number" min={1} max={20} value={subjMarks} onChange={e => setSubjMarks(Number(e.target.value))} /></div>
              </div>
            </div>

            {/* Paper Header Info */}
            <div style={{ marginBottom: 20, padding: 16, background: 'var(--indigo3)', borderRadius: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--indigo)', fontSize: 13 }}>📄 Paper Header (optional)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                <div className="fg" style={{ marginBottom: 0 }}><label>School Name</label><input className="fi" placeholder="ABC School" value={schoolName} onChange={e => setSchoolName(e.target.value)} /></div>
                <div className="fg" style={{ marginBottom: 0 }}><label>Student Name</label><input className="fi" placeholder="Student Name" value={studentName} onChange={e => setStudentName(e.target.value)} /></div>
                <div className="fg" style={{ marginBottom: 0 }}><label>Roll Number</label><input className="fi" placeholder="101" value={rollNo} onChange={e => setRollNo(e.target.value)} /></div>
                <div className="fg" style={{ marginBottom: 0 }}><label>Exam Date</label><input className="fi" type="date" value={examDate} min={new Date().toISOString().slice(0, 10)} onChange={e => setExamDate(e.target.value)} /></div>
              </div>
            </div>

            <button className="btn-submit indigo" onClick={generate} disabled={loading}>
              {loading ? <><span className="spin" />Generating…</> : 'Generate Exam Paper →'}
            </button>
          </div>
        ) : (
          <div>
            {/* Preview Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)', marginBottom: 4 }}>📄 {previewMeta.syllabusName || previewTopic}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                  {previewMeta.chapters.length > 0 && (
                    <span style={{ background: 'var(--indigo3)', color: 'var(--indigo)', padding: '3px 10px', borderRadius: 50, fontSize: 11, fontWeight: 600 }}>
                      📚 {previewMeta.chapters.length} chapter{previewMeta.chapters.length !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>{questions.length} questions • Total: {questions.reduce((s, q) => s + (q.marks || 0), 0)} marks</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-outline" onClick={() => setPreview(false)}>← Regenerate</button>
                <button className="btn-saffron" onClick={printPaper}>🖨 Print Paper</button>
              </div>
            </div>

            {/* Questions List */}
            <div className="card" style={{ padding: 28 }}>
              {questions.map((q, i) => (
                <div key={i} style={{ paddingBottom: 20, marginBottom: 20, borderBottom: i < questions.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700 }}>{i + 1}. </span>{q.question}
                    </div>
                    {/* Editable marks badge */}
                    {editingMarksIdx === i ? (
                      <input
                        type="number" min={0.5} step={0.5} value={editingMarksVal} autoFocus
                        style={{ width: 64, padding: '3px 8px', borderRadius: 20, border: '2px solid var(--indigo)', fontSize: 12, fontWeight: 700, textAlign: 'center', marginLeft: 12, outline: 'none' }}
                        onChange={e => setEditingMarksVal(e.target.value)}
                        onBlur={() => {
                          const v = parseFloat(editingMarksVal)
                          if (!isNaN(v) && v > 0) setQuestions(prev => prev.map((qx, idx) => idx === i ? { ...qx, marks: v } : qx))
                          setEditingMarksIdx(-1)
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
                      />
                    ) : (
                      <span
                        onClick={() => { setEditingMarksIdx(i); setEditingMarksVal(q.marks) }}
                        title="Click to change marks"
                        style={{ background: 'var(--indigo3)', color: 'var(--indigo)', padding: '2px 10px', borderRadius: 50, fontSize: 11, fontWeight: 700, marginLeft: 12, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                        {q.marks} mark{q.marks > 1 ? 's' : ''} ✏️
                      </span>
                    )}
                  </div>
                  {q.options && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginTop: 8 }}>
                      {Object.entries(q.options).map(([k, v]) => (
                        <div key={k} style={{ background: '#fff', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, display: 'flex', gap: 8 }}>
                          <strong style={{ color: 'var(--indigo)' }}>{k}</strong> {v}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                    <span style={{ background: 'var(--green)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>ANS</span>
                    <span style={{ color: 'var(--green)', fontWeight: 600 }}>{q.answer}</span>
                    <span style={{ background: q.difficulty === 'hard' ? '#fef2f2' : q.difficulty === 'easy' ? '#d1fae5' : '#fffbeb', color: q.difficulty === 'hard' ? 'var(--red)' : q.difficulty === 'easy' ? 'var(--green)' : '#92400e', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, marginLeft: 4 }}>
                      {q.difficulty?.toUpperCase()}
                    </span>
                    {q.source === 'custom' && (
                      <span style={{ background: '#fffbeb', color: '#d97706', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, marginLeft: 4 }}>CUSTOM</span>
                    )}
                  </div>
                  {/* Marking criteria — editable for subjective/written questions */}
                  {q.type !== 'obj' && q.type !== 'objective' && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>✦ Marking Criteria</div>
                      <textarea
                        rows={2}
                        value={q.evaluation_criteria || ''}
                        placeholder="Set marking criteria / rubric (e.g. 1m for definition · 2m for explanation · 1m for example)…"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #fde68a', fontSize: 12, background: '#fffbeb', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none', lineHeight: 1.5 }}
                        onChange={e => {
                          const val = e.target.value
                          setQuestions(prev => prev.map((qx, idx) => idx === i ? { ...qx, evaluation_criteria: val } : qx))
                        }}
                      />
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Used by AI evaluator · Printed on answer key</div>
                    </div>
                  )}
                </div>
              ))}
              {/* Add custom question */}
              {showAddQ ? (
                <QGenCustomForm
                  onAdd={(q) => { setQuestions(prev => [...prev, { ...q, id: prev.length + 1 }]); setShowAddQ(false) }}
                  onCancel={() => setShowAddQ(false)}
                />
              ) : (
                <button
                  style={{ width: '100%', padding: '11px', marginTop: 10, borderRadius: 10,
                    border: '2px dashed #c7d2fe', background: '#eef2ff', color: '#3730a3',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={() => setShowAddQ(true)}>
                  ➕ Add Your Own Question
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
