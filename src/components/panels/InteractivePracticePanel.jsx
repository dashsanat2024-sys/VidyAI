import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { apiPost, apiPostForm, API_BASE } from '../../utils/api'

import CurriculumSelector from '../shared/CurriculumSelector'

export default function InteractivePracticePanel({ showToast }) {
  const { token } = useAuth()
  const { syllabi, activeSyllabus, removeSyllabus, addSyllabus } = useApp()

  const [phase, setPhase]             = useState('setup')
  const [selectedSyl, setSelectedSyl] = useState('')
  const [qType, setQType]             = useState('mixed')
  const [qCount, setQCount]           = useState(10)
  const [questions, setQuestions]     = useState([])
  const [answers, setAnswers]         = useState({})
  const [loading, setLoading]         = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [report, setReport]           = useState(null)
  const [feedbacks, setFeedbacks]     = useState({})
  const [deleting, setDeleting]       = useState(false)

  // Source mode: 'curriculum' or 'upload'
  const [sourceMode,    setSourceMode]    = useState('curriculum')
  const [uploadLoading, setUploadLoading] = useState(false)
  const uploadRef = useRef(null)

  // Knowledge Source details for display
  const [sourceMeta, setSourceMeta]   = useState(null)

  useEffect(() => {
    if (activeSyllabus?.id && !selectedSyl) {
      setSelectedSyl(activeSyllabus.id)
      setSourceMeta({
        name: activeSyllabus.name,
        board: activeSyllabus.board,
        classNum: activeSyllabus.class_name || activeSyllabus.class,
        subject: activeSyllabus.subject
      })
    }
  }, [activeSyllabus])

  const handleSelectionComplete = (data) => {
    setSelectedSyl(data.syllabus_id)
    setSourceMeta({
      name: data.name,
      board: data.board,
      classNum: data.classNum,
      subject: data.subject
    })
    // Also register in AppContext if not already there
    addSyllabus({
      id: data.syllabus_id,
      name: data.name,
      board: data.board,
      class: data.classNum,
      subject: data.subject
    })
    showToast(`Syllabus loaded: ${data.name}`, 'success')
  }

  const handleDeleteSyllabus = async () => {
    if (!selectedSyl) { showToast('Select a syllabus to remove', 'warning'); return }
    if (!window.confirm('Remove this syllabus from your list?')) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_BASE}/syllabi/${selectedSyl}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) { 
        removeSyllabus(selectedSyl)
        setSelectedSyl('')
        setSourceMeta(null)
        showToast('Syllabus removed', 'success') 
      }
      else { const d = await res.json(); showToast(d.error || 'Failed', 'error') }
    } catch { showToast('Failed to remove', 'error') }
    setDeleting(false)
  }

  const handleDocUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadLoading(true)
    showToast('Processing document…', 'success')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('syllabus_name', file.name.replace(/\.[^/.]+$/, ''))
      const data = await apiPostForm('/upload', fd, token)
      const name = data.syllabus_name || file.name
      setSelectedSyl(data.syllabus_id)
      setSourceMeta({ name, board: 'Uploaded Document', classNum: '', subject: name })
      addSyllabus({ id: data.syllabus_id, name, board: 'Uploaded', class: '', subject: name })
      showToast(`✅ Document ready: ${name}`, 'success')
    } catch (err) {
      showToast(err.message || 'Upload failed', 'error')
    }
    setUploadLoading(false)
    if (uploadRef.current) uploadRef.current.value = ''
  }

  const generate = async () => {
    if (!selectedSyl) { showToast('Please select a syllabus first', 'warning'); return }
    setLoading(true)
    const total = qCount
    let objCount = Math.floor(total / 2), subjCount = total - objCount
    if (qType === 'objective') { objCount = total; subjCount = 0 }
    if (qType === 'subjective') { objCount = 0; subjCount = total }
    try {
      const data = await apiPost('/curriculum/practice/generate', {
        syllabus_id: selectedSyl, objective_count: objCount, subjective_count: subjCount,
        topic: 'Comprehensive knowledge check'
      }, token)
      setQuestions(data)
      setAnswers({})
      setFeedbacks({})
      setPhase('quiz')
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  const setAnswer = (idx, val) => setAnswers(prev => ({ ...prev, [idx]: val }))

  const submitAll = async () => {
    // Check all answered
    const unanswered = questions.findIndex((q, i) => {
      if (q.type === 'objective') return !answers[i]
      return !answers[i]?.trim()
    })
    if (unanswered !== -1) { showToast(`Please answer question ${unanswered + 1} first`, 'warning'); return }
    setSubmitting(true)
    showToast('AI is evaluating your answers…', 'info')

    // Evaluate each question
    const newFeedbacks = {}
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      try {
        const ev = await apiPost('/curriculum/practice/evaluate', {
          question: q.question,
          model_answer: q.answer,
          student_answer: answers[i],
          type: q.type,
          options: q.options || {}
        }, token)
        newFeedbacks[i] = ev
      } catch { newFeedbacks[i] = { is_correct: false, score: 0, feedback: 'Evaluation failed.' } }
    }
    setFeedbacks(newFeedbacks)

    // Get report
    try {
      const attempts = questions.map((q, i) => ({
        question: q.question, model_answer: q.answer,
        student_answer: answers[i], evaluation: newFeedbacks[i],
        is_correct: newFeedbacks[i]?.is_correct, score: newFeedbacks[i]?.score || 0
      }))
      const reportData = await apiPost('/curriculum/practice/report', { attempts }, token)
      setReport(reportData)
    } catch { }

    setPhase('report')
    setSubmitting(false)
  }

  const restart = () => {
    setPhase('setup')
    setQuestions([])
    setAnswers({})
    setFeedbacks({})
    setReport(null)
  }

  // ── SETUP ──
  if (phase === 'setup') return (
    <div className="panel active">
      <div className="w-limit">
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg,var(--indigo),var(--indigo2))', borderRadius: 14, display: 'grid', placeItems: 'center', fontSize: 22 }}>🎯</div>
            <div>
              <h3 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)', marginBottom: 2 }}>AI Practice Master</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Generate AI questions and get instant evaluation with feedback</p>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px 0', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', marginBottom: '14px' }}>
               <h4 style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                  1. Select Knowledge Source
               </h4>
               {/* Source mode toggle */}
               <div style={{ display: 'flex', gap: '6px' }}>
                 <button
                   onClick={() => setSourceMode('curriculum')}
                   style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: '.15s',
                     background: sourceMode === 'curriculum' ? '#4f46e5' : '#fff',
                     color: sourceMode === 'curriculum' ? '#fff' : '#4f46e5',
                     borderColor: '#4f46e5' }}>
                   📚 Curriculum
                 </button>
                 <button
                   onClick={() => setSourceMode('upload')}
                   style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: '.15s',
                     background: sourceMode === 'upload' ? '#d97706' : '#fff',
                     color: sourceMode === 'upload' ? '#fff' : '#d97706',
                     borderColor: '#d97706' }}>
                   📎 Upload Doc
                 </button>
               </div>
             </div>

             {sourceMode === 'curriculum' && (
               <div style={{ padding: '0 16px' }}>
                 <CurriculumSelector token={token} onComplete={handleSelectionComplete} buttonLabel="Load Practice Knowledge" />
               </div>
             )}

             {sourceMode === 'upload' && (
               <div style={{ padding: '0 16px' }}>
                 <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px', lineHeight: 1.6 }}>
                   Upload any PDF, Word, or text document — AI will generate practice questions directly from its content.
                 </p>
                 <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                   <button
                     onClick={() => uploadRef.current?.click()}
                     disabled={uploadLoading}
                     style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#d97706,#b45309)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, opacity: uploadLoading ? 0.7 : 1 }}>
                     {uploadLoading ? <><span className="spin" /> Processing…</> : <><span>📎</span> Choose File</>}
                   </button>
                   <span style={{ fontSize: '11px', color: '#64748b' }}>PDF, DOCX, TXT, MD supported</span>
                 </div>
                 <input ref={uploadRef} type="file" accept=".pdf,.docx,.txt,.md"
                   style={{ display: 'none' }} onChange={handleDocUpload} />
                 {sourceMeta && sourceMode === 'upload' && (
                   <div style={{ marginTop: 12, padding: '10px 14px', background: '#ecfdf5', border: '1px solid #86efac', borderRadius: 8, fontSize: 13, color: '#065f46', display: 'flex', alignItems: 'center', gap: 8 }}>
                     <span>✅</span> <strong>{sourceMeta.name}</strong> — ready for practice
                   </div>
                 )}
               </div>
             )}
          </div>

          {selectedSyl && sourceMeta && (
            <div style={{ background: 'var(--indigo3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--indigo2)', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                   <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--indigo)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>Target Syllabus</div>
                   <div style={{ fontWeight: '700', color: 'var(--text)', fontSize: '15px' }}>{sourceMeta.name}</div>
                   <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{sourceMeta.board} · Class {sourceMeta.classNum} · {sourceMeta.subject}</div>
                </div>
                <button onClick={handleDeleteSyllabus} disabled={deleting}
                  style={{ padding: '8px 16px', background: '#fee2e2', border: 'none', borderRadius: 8, color: '#991b1b', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                  {deleting ? '…' : 'Remove Syllabus'}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label>Question Type</label>
              <select className="fi sel" value={qType} onChange={e => setQType(e.target.value)}>
                <option value="mixed">Mixed (Obj + Subj)</option>
                <option value="objective">Objective Only</option>
                <option value="subjective">Subjective Only</option>
              </select>
            </div>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label>Number of Questions</label>
              <select className="fi sel" value={qCount} onChange={e => setQCount(Number(e.target.value))}>
                {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} Questions</option>)}
              </select>
            </div>
          </div>

          <button className="btn-submit indigo" onClick={generate} disabled={loading || !selectedSyl} style={{ height: '48px' }}>
            {loading ? <><span className="spin" />Generating Questions…</> : '🚀 Start Practice Session →'}
          </button>
        </div>
      </div>
    </div>
  )

  // ── QUIZ ──
  if (phase === 'quiz') return (
    <div className="panel active">
      <div className="w-limit">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)' }}>Practice Session</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>{questions.length} questions • Answer all before submitting</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-outline" onClick={() => { if (confirm('Quit? Progress will be lost.')) restart() }}>Exit</button>
            <button className="btn-submit indigo" style={{ width: 'auto', padding: '10px 24px' }} onClick={submitAll} disabled={submitting}>
              {submitting ? <><span className="spin" />Evaluating…</> : 'Submit All →'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {questions.map((q, i) => (
            <div key={i} className="card" style={{ padding: 24, borderLeft: '4px solid var(--indigo)' }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start' }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--indigo)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontWeight: 600, flex: 1 }}>{q.question}</span>
              </div>

              {q.type === 'objective' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                  {Object.entries(q.options || {}).map(([k, v]) => (
                    <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, border: `1.5px solid ${answers[i] === k ? 'var(--indigo2)' : '#e2e8f0'}`, background: answers[i] === k ? 'var(--indigo3)' : '#fff', cursor: 'pointer', transition: '.15s' }}>
                      <input type="radio" name={`q${i}`} value={k} checked={answers[i] === k} onChange={() => setAnswer(i, k)} style={{ accentColor: 'var(--indigo)' }} />
                      <span><strong>{k})</strong> {v}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  className="fi"
                  placeholder="Type your answer here…"
                  style={{ minHeight: 100 }}
                  value={answers[i] || ''}
                  onChange={e => setAnswer(i, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          <button className="btn-submit indigo" onClick={submitAll} disabled={submitting}>
            {submitting ? <><span className="spin" />Evaluating…</> : 'Submit All Answers →'}
          </button>
        </div>
      </div>
    </div>
  )

  // ── REPORT ──
  return (
    <div className="panel active">
      <div className="w-limit">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)' }}>📊 Practice Report</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-outline" onClick={restart}>← New Session</button>
            <button className="btn-saffron" onClick={() => window.print()}>🖨 Print</button>
          </div>
        </div>

        {report && (
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card"><div className="stat-label">Score</div><div className="stat-val" style={{ color: 'var(--indigo)' }}>{report.obtained_marks}/{report.total_marks}</div></div>
            <div className="stat-card"><div className="stat-label">Percentage</div><div className="stat-val" style={{ color: 'var(--saffron)' }}>{report.percentage}%</div></div>
            <div className="stat-card"><div className="stat-label">Predicted Grade</div><div className="stat-val" style={{ color: 'var(--green)' }}>{report.predicted_grade || '-'}</div></div>
          </div>
        )}
        {report?.overall_feedback && (
          <div className="card" style={{ padding: 20, marginBottom: 20, borderLeft: '4px solid var(--saffron)' }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--indigo)' }}>🤖 AI Feedback</div>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>{report.overall_feedback}</p>
          </div>
        )}

        {/* Per-question results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {questions.map((q, i) => {
            const fb = feedbacks[i] || {}
            const correct = fb.is_correct
            return (
              <div key={i} className="card" style={{ padding: 20, borderLeft: `4px solid ${correct ? 'var(--green)' : 'var(--red)'}` }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Q{i + 1}: {q.question}</div>
                <div style={{ background: correct ? '#f0fdf4' : '#fef2f2', padding: 12, borderRadius: 10, border: `1px solid ${correct ? '#bbf7d0' : '#fecaca'}`, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, color: correct ? '#166534' : '#991b1b', marginBottom: 4 }}>
                    {correct ? '✅ Correct!' : '❌ Needs Improvement'} {fb.score !== undefined && `(Score: ${fb.score}/10)`}
                  </div>
                  <p style={{ fontSize: 13, color: '#475569' }}>{fb.feedback}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>YOUR ANSWER</div>
                    <div style={{ fontSize: 13 }}>{answers[i] || '(no answer)'}</div>
                  </div>
                  <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>MODEL ANSWER</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{q.answer}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Learning Gaps */}
        {report?.learning_gaps?.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ marginBottom: 14, fontFamily: 'var(--serif)', color: 'var(--indigo)' }}>📌 Learning Gaps & Recommendations</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {report.learning_gaps.map((g, i) => (
                <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: 16, borderRadius: 12 }}>
                  <div style={{ fontWeight: 700, color: 'var(--indigo)', marginBottom: 6 }}>{g.topic}</div>
                  <div style={{ fontSize: 13, marginBottom: 6 }}><strong>Gap:</strong> {g.gap}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}><strong>Recommendation:</strong> {g.recommendation}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
