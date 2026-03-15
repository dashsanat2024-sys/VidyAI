import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { apiPost, speakText } from '../../utils/api'

const UK_YEARS = ['Year 1','Year 2','Year 3','Year 4','Year 5','Year 6','Year 7','Year 8','Year 9','Year 10','Year 11','Year 12','Year 13']
const UK_SUBJECTS_BY_KS = {
  ks1: ['English','Mathematics','Science','Computing','Art & Design','History','Geography','PE','Music'],
  ks2: ['English','Mathematics','Science','Computing','Art & Design','History','Geography','PE','Music','DT','Languages'],
  ks3: ['English','Mathematics','Science','Computing','History','Geography','PE','Music','Art & Design','DT','Languages','Citizenship','RE'],
  ks4: ['English Language','English Literature','Mathematics','Biology','Chemistry','Physics','Combined Science','Computing','History','Geography','Religious Studies','PE','Art & Design','DT','Music','Business Studies','French','Spanish','German'],
  ks5: ['Mathematics','Further Mathematics','English Literature','Biology','Chemistry','Physics','Economics','Psychology','History','Geography','Computer Science','Business Studies','Sociology','French','Spanish','German'],
}

function getKS(year) {
  const n = parseInt(year.replace('Year ', ''))
  if (n <= 2) return 'ks1'
  if (n <= 6) return 'ks2'
  if (n <= 9) return 'ks3'
  if (n <= 11) return 'ks4'
  return 'ks5'
}

export default function UKCurriculumPanel({ showToast }) {
  const { token } = useAuth()
  const { setUkActiveSyllabus } = useApp()

  const [year, setYear]         = useState('Year 10')
  const [subject, setSubject]   = useState('Mathematics')
  const [topics, setTopics]     = useState([])
  const [selTopics, setSelTopics] = useState([])
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [mode, setMode]         = useState('')
  const [speaking, setSpeaking] = useState(false)

  const ks = getKS(year)
  const subjects = UK_SUBJECTS_BY_KS[ks] || UK_SUBJECTS_BY_KS.ks4

  const loadTopics = async () => {
    setLoading(true); setTopics([]); setResult(null)
    try {
      const res = await apiPost('/uk-curriculum/topics', { year, subject }, token)
      const data = await res.json()
      const ts = data.topics || []
      setTopics(ts)
      setSelTopics(ts)
      const syl = { id: data.syllabus_id, name: `UK ${year} - ${subject}` }
      setUkActiveSyllabus(syl)
    } catch (e) { showToast('Failed to load topics', 'error') }
    setLoading(false)
  }

  const toggleTopic = (t) => setSelTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const runTool = async (toolMode) => {
    if (!topics.length) { showToast('Load topics first', 'warning'); return }
    setMode(toolMode); setLoading(true); setResult(null)
    try {
      const res = await apiPost(`/uk-curriculum/${toolMode}`, { year, subject, topics: selTopics }, token)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `${toolMode} failed`)
      setResult({ type: toolMode, data })
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  return (
    <div className="panel active">
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <span style={{ fontSize: 28 }}>🇬🇧</span>
            <div>
              <h3 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)' }}>UK National Curriculum</h3>
              <p style={{ color: 'var(--muted)', fontSize: 12 }}>Key Stage 1–5 • England, Wales, Scotland, Northern Ireland</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label>Year Group</label>
              <select className="fi sel" value={year} onChange={e => { setYear(e.target.value); setTopics([]); setResult(null) }}>
                {UK_YEARS.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label>Subject</label>
              <select className="fi sel" value={subject} onChange={e => setSubject(e.target.value)}>
                {subjects.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn-saffron" style={{ width: '100%' }} onClick={loadTopics} disabled={loading}>
                {loading && !topics.length ? <><span className="spin" />Loading…</> : '📖 Load Topics'}
              </button>
            </div>
          </div>

          {/* Key Stage badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--indigo3)', padding: '5px 16px', borderRadius: 50, fontSize: 12, fontWeight: 700, color: 'var(--indigo)' }}>
            📌 {ks.toUpperCase().replace('KS', 'Key Stage ')}
          </div>

          {topics.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Topics ({selTopics.length}/{topics.length})</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-outline" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => setSelTopics([...topics])}>All</button>
                  <button className="btn-outline" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => setSelTopics([])}>None</button>
                </div>
              </div>
              <div className="chips-wrap">
                {topics.map(t => <div key={t} className={`chip ${selTopics.includes(t) ? 'selected' : ''}`} onClick={() => toggleTopic(t)}>{t}</div>)}
              </div>
            </div>
          )}
        </div>

        {topics.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { id: 'summarise',  icon: '📝', label: 'Summary',       bg: 'var(--indigo3)' },
              { id: 'flashcards', icon: '🃏', label: 'Flashcards',    bg: 'var(--saffron-light)' },
              { id: 'questions',  icon: '❓', label: 'Questions',     bg: '#d1fae5' },
              { id: 'audio',      icon: '🔊', label: 'Audio Lesson',  bg: '#fce7f3' },
            ].map(t => (
              <button key={t.id} onClick={() => runTool(t.id)} disabled={loading}
                style={{ padding: '16px 12px', background: t.bg, border: '1.5px solid rgba(0,0,0,.06)', borderRadius: 14, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{t.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{t.label}</div>
              </button>
            ))}
          </div>
        )}

        {loading && <div className="card" style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /><p style={{ marginTop: 16, color: 'var(--muted)', fontSize: 14 }}>AI is preparing your content…</p></div>}

        {!loading && result?.type === 'summarise' && (
          <div className="card" style={{ padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h4 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)' }}>📝 {subject} Summary</h4>
              <button className="btn-outline" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => { setSpeaking(true); speakText(result.data.summary, () => setSpeaking(false)) }}>
                {speaking ? '⏹ Stop' : '🔊 Listen'}
              </button>
            </div>
            <p style={{ lineHeight: 1.8, fontSize: 14, whiteSpace: 'pre-wrap' }}>{result.data.summary}</p>
          </div>
        )}

        {!loading && result?.type === 'flashcards' && (
          <div>
            <h4 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)', marginBottom: 16 }}>🃏 Flashcards</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {(result.data.flashcards || []).map((fc, i) => {
                const [flip, setFlip] = useState(false)
                return (
                  <div key={i} onClick={() => setFlip(f => !f)} style={{ cursor: 'pointer', height: 150, perspective: 600 }}>
                    <div style={{ width: '100%', height: '100%', transition: 'transform .4s', transformStyle: 'preserve-3d', transform: flip ? 'rotateY(180deg)' : 'none', position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', background: 'var(--indigo3)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1.5px solid rgba(67,56,202,.2)' }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--indigo2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Question</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--indigo)', lineHeight: 1.5 }}>{fc.question}</div>
                      </div>
                      <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'linear-gradient(135deg,#047857,#10b981)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.7)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Answer</div>
                        <div style={{ fontSize: 12, color: '#fff', lineHeight: 1.5 }}>{fc.answer}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!loading && result?.type === 'questions' && (
          <div className="card" style={{ padding: 28 }}>
            <h4 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)', marginBottom: 16 }}>❓ Practice Questions</h4>
            {(result.data.questions || []).map((q, i) => (
              <div key={i} style={{ paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{i + 1}. {q.question}</div>
                {q.answer && <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>↳ {q.answer}</div>}
              </div>
            ))}
          </div>
        )}

        {!loading && result?.type === 'audio' && (
          <div className="card" style={{ padding: 28 }}>
            <h4 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)', marginBottom: 16 }}>🔊 Audio Lesson — {subject}</h4>
            {(result.data.sections || []).map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 16, padding: 16, background: 'var(--paper)', borderRadius: 10 }}>
                <button className="btn-saffron" style={{ padding: '8px 14px', borderRadius: 50, fontSize: 12, flexShrink: 0 }}
                  onClick={() => { setSpeaking(true); speakText(s.text, () => setSpeaking(false)) }}>
                  🔊 {s.label}
                </button>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--muted)' }}>{s.text?.substring(0, 120)}…</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
