import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { apiPost, apiGet } from '../../utils/api'

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
      const res = await apiGet(`/syllabi/${sid}/chapters`, token)
      const data = await res.json()
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
    setLoading(true)
    try {
      const syl = syllabi.find(s => s.id === selectedSyl)
      const parts = syl?.name?.split('-') || []
      const subject = parts.length > 1 ? parts[parts.length - 1].trim() : ''
      const res = await apiPost('/generate-questions', {
        syllabus_id: selectedSyl, topic: topic || 'General', subject,
        chapters: selChapters, objective_count: objCount, subjective_count: subjCount,
        objective_weightage: objMarks, subjective_weightage: subjMarks, difficulty
      }, token)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed. Check your API key.')
      setQuestions(data.questions || [])
      setPreviewTopic(data.topic || topic)
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
      <div class="meta">Subject: ${previewTopic} &nbsp;|&nbsp; Total Marks: ${totalMarks} &nbsp;|&nbsp; Date: ${examDate || new Date().toLocaleDateString()}</div>
      <div class="header-row">
        <div>Name: ${studentName || '___________________'}</div>
        <div>Roll No: ${rollNo || '______'}</div>
        <div>Marks Obtained: _______ / ${totalMarks}</div>
      </div>
      ${questions.filter(q => q.type === 'obj').length > 0 ? '<div class="section-title">Section A — Objective Questions</div>' : ''}
      ${questions.filter(q => q.type === 'obj').map((q, i) => `
        <div class="q">
          <span class="marks">[${q.marks} mark${q.marks > 1 ? 's' : ''}]</span>
          <span class="q-num">Q${i + 1}.</span>${q.question}
          ${q.options ? `<div class="opts">${Object.entries(q.options).map(([k, v]) => `<div>(${k}) ${v}</div>`).join('')}</div>` : ''}
        </div>`).join('')}
      ${questions.filter(q => q.type === 'subj').length > 0 ? '<div class="section-title">Section B — Subjective Questions</div>' : ''}
      ${questions.filter(q => q.type === 'subj').map((q, i) => `
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
                <div className="chips-wrap">
                  {chapters.map(c => (
                    <div key={c} className={`chip ${selChapters.includes(c) ? 'selected' : ''}`} onClick={() => toggleChapter(c)}>{c}</div>
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
                <div className="fg" style={{ marginBottom: 0 }}><label>Exam Date</label><input className="fi" type="date" value={examDate} onChange={e => setExamDate(e.target.value)} /></div>
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
                <h3 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)' }}>📄 {previewTopic}</h3>
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>{questions.length} questions • Total: {questions.reduce((s, q) => s + (q.marks || 0), 0)} marks</p>
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
                    <span style={{ background: 'var(--indigo3)', color: 'var(--indigo)', padding: '2px 10px', borderRadius: 50, fontSize: 11, fontWeight: 700, marginLeft: 12, whiteSpace: 'nowrap' }}>
                      {q.marks} mark{q.marks > 1 ? 's' : ''}
                    </span>
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
