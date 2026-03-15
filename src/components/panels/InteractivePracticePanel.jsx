import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { apiPost } from '../../utils/api'

export default function InteractivePracticePanel({ showToast }) {
  const { token } = useAuth()
  const { syllabi, activeSyllabus, removeSyllabus } = useApp()

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

  useEffect(() => {
    if (activeSyllabus?.id && !selectedSyl) setSelectedSyl(activeSyllabus.id)
  }, [activeSyllabus])

  // Only own syllabi — no cross-user bleeding (AppContext already filters, but extra guard)
  const ownSyllabi = syllabi   // already scoped in AppContext

  const handleDeleteSyllabus = async () => {
    if (!selectedSyl) { showToast('Select a syllabus to remove', 'warning'); return }
    if (!window.confirm('Remove this syllabus from your list?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/syllabi/${selectedSyl}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) { removeSyllabus(selectedSyl); setSelectedSyl(''); showToast('Syllabus removed', 'success') }
      else { const d = await res.json(); showToast(d.error || 'Failed', 'error') }
    } catch { showToast('Failed to remove', 'error') }
    setDeleting(false)
  }

  const generate = async () => {
    if (!selectedSyl) { showToast('Please select a syllabus first', 'warning'); return }
    setLoading(true)
    const total = qCount
    let objCount = Math.floor(total / 2), subjCount = total - objCount
    if (qType === 'objective') { objCount = total; subjCount = 0 }
    if (qType === 'subjective') { objCount = 0; subjCount = total }
    try {
      const res = await apiPost('/curriculum/practice/generate', {
        syllabus_id: selectedSyl, objective_count: objCount, subjective_count: subjCount,
        topic: 'Comprehensive knowledge check'
      }, token)
      if (!res.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Server returned an unexpected response. Check the backend.')
      }
      const data = await res.json()
      if (data.error) throw new Error(data.error)
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
        const res = await apiPost('/curriculum/practice/evaluate', {
          question: q.question, model_answer: q.answer, student_answer: answers[i]
        }, token)
        const ev = await res.json()
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
      const res = await apiPost('/curriculum/practice/report', { attempts }, token)
      const reportData = await res.json()
      if (res.ok) setReport(reportData)
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div className="fg">
              <label>Knowledge Source</label>
              <select className="fi sel" value={selectedSyl} onChange={e => setSelectedSyl(e.target.value)}>
                <option value="">— Select Syllabus —</option>
                {ownSyllabi.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>Question Type</label>
              <select className="fi sel" value={qType} onChange={e => setQType(e.target.value)}>
                <option value="mixed">Mixed (Obj + Subj)</option>
                <option value="objective">Objective Only</option>
                <option value="subjective">Subjective Only</option>
              </select>
            </div>
            <div className="fg">
              <label>Number of Questions</label>
              <select className="fi sel" value={qCount} onChange={e => setQCount(Number(e.target.value))}>
                {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} Questions</option>)}
              </select>
            </div>
          </div>

          <button className="btn-submit indigo" onClick={generate} disabled={loading}>
            {loading ? <><span className="spin" />Generating Questions…</> : '🚀 Start Practice Session →'}
          </button>
          {selectedSyl && (
            <button onClick={handleDeleteSyllabus} disabled={deleting}
              style={{ marginTop: 10, padding: '8px 18px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, color: '#991b1b', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {deleting ? '…' : '🗑 Remove selected syllabus'}
            </button>
          )}
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
