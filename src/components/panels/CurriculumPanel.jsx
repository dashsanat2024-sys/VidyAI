import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { apiPost, apiGet, speakText, stopSpeech } from '../../utils/api'
import {
  INDIA_STATES,
  STATE_BOARDS,
  getSubjects,
  getChapters,
  getPdfUrl,
} from '../../data/indiaCurriculum'

const CLASSES = Array.from({ length: 12 }, (_, i) => i + 1)

function AudioSection({ label, text, globalSpeaking, onSpeakStart, onSpeakEnd }) {
  const isMine = globalSpeaking === label
  return (
    <div className={`audio-section${isMine ? ' active' : ''}`}>
      <button
        className="audio-section-btn"
        style={{ background: isMine ? 'var(--indigo)' : 'linear-gradient(135deg,var(--saffron),var(--saffron2))' }}
        onClick={() => {
          if (isMine) { stopSpeech(); onSpeakEnd() }
          else { onSpeakStart(label); speakText(text, () => onSpeakEnd()) }
        }}
      >
        {isMine ? '⏹ Stop' : <><span>🔊</span><span>{label}</span></>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="audio-section-label">{label}</div>
        <p className="audio-section-text">
          {text?.substring(0, 200)}{text?.length > 200 ? '…' : ''}
        </p>
      </div>
    </div>
  )
}

function FlashCard({ question, answer }) {
  const [flipped, setFlipped] = useState(false)
  return (
    <div onClick={() => setFlipped(f => !f)} style={{ cursor: 'pointer', height: 170, perspective: 800 }}>
      <div style={{ width: '100%', height: '100%', transition: 'transform .45s', transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', background: 'var(--indigo3)', borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1.5px solid rgba(67,56,202,.2)' }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--indigo2)', marginBottom: 10 }}>Question</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--indigo)', lineHeight: 1.5 }}>{question}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 'auto', paddingTop: 8 }}>Tap to reveal answer</div>
        </div>
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'linear-gradient(135deg, var(--green), #10b981)', borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,.7)', marginBottom: 10 }}>Answer</div>
          <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.6 }}>{answer}</div>
        </div>
      </div>
    </div>
  )
}

export default function CurriculumPanel({ showToast }) {
  const { token } = useAuth()
  const { setActiveSyllabus, addSyllabus, setActivePanel } = useApp()

  const [state,    setState]    = useState('Maharashtra')
  const [boards,   setBoards]   = useState([])
  const [board,    setBoard]    = useState(null)
  const [classNum, setClassNum] = useState(10)
  const [subjects, setSubjects] = useState([])
  const [subject,  setSubject]  = useState('')

  const [chapters,    setChapters]    = useState([])
  const [selChapters, setSelChapters] = useState([])
  const [pdfUrl,      setPdfUrl]      = useState(null)
  const [syllabus,    setSyllabus]    = useState(null)
  const [chapLoading, setChapLoading] = useState(false)

  const [activeMode,    setActiveMode]    = useState('')
  const [toolLoading,   setToolLoading]   = useState(false)
  const [result,        setResult]        = useState(null)
  const [flashcardCount, setFlashcardCount] = useState(10)
  const [showFcConfig,   setShowFcConfig]   = useState(false)

  // Summarise config — shown when selective chapters chosen
  const [showSumConfig,  setShowSumConfig]  = useState(false)
  const [sumMode,        setSumMode]        = useState('auto')   // 'auto' | 'custom'
  const [customPoints,   setCustomPoints]   = useState({})       // { [chapter]: n }

  const [globalSpeaking, setGlobalSpeaking] = useState(null)
  const [summarySpeak,   setSummarySpeak]   = useState(false)

  const [videoOpen,    setVideoOpen]    = useState(false)
  const [videoScript,  setVideoScript]  = useState([])
  const [currentSeg,   setCurrentSeg]   = useState(0)
  const [videoPlaying, setVideoPlaying] = useState(false)

  useEffect(() => {
    const stateBoards = STATE_BOARDS[state] || []
    setBoards(stateBoards)
    const def = stateBoards.find(b => b.shortName === 'CBSE') || stateBoards[0] || null
    setBoard(def)
    resetChapters()
  }, [state])

  useEffect(() => {
    if (!board) { setSubjects([]); setSubject(''); return }
    const subs = getSubjects(board.shortName, classNum)
    setSubjects(subs)
    setSubject(subs[0] || '')
    resetChapters()
  }, [board, classNum])

  // Stop all speech / video when navigating away from this panel
  useEffect(() => {
    return () => { stopSpeech(); setGlobalSpeaking(null); setSummarySpeak(false); setVideoPlaying(false) }
  }, [])

  const resetChapters = () => {
    setChapters([]); setSelChapters([]); setPdfUrl(null); setSyllabus(null)
    setResult(null); setActiveMode(''); stopSpeechAll()
  }

  const stopSpeechAll = () => {
    stopSpeech(); setGlobalSpeaking(null); setSummarySpeak(false); setVideoPlaying(false)
  }

  const loadChapters = async () => {
    if (!subject || !board) return
    setChapLoading(true); setResult(null); setActiveMode(''); stopSpeechAll()

    const localChapters = getChapters(classNum, subject)
    const localPdf      = getPdfUrl(classNum, subject)

    // Always call backend to register the user-scoped syllabus entry
    // even when chapters are known locally. This ensures the syllabus
    // gets a proper user-scoped ID that appears in other panels.
    let serverSyl = null
    try {
      const res  = await apiPost('/curriculum/chapters', {
        state, board: board.shortName, class: `Class ${classNum}`, subject
      }, token)
      const data = await res.json()
      if (res.ok && data.syllabus_id) {
        serverSyl = {
          id:       data.syllabus_id,
          name:     data.name || `${board.shortName} Class ${classNum} — ${subject}`,
          chapters: data.chapters || localChapters || [],
          pdf_url:  data.pdf_url || localPdf || null,
        }
      }
    } catch (e) {
      console.warn('[loadChapters] backend registration failed:', e.message)
    }

    const chapters = serverSyl?.chapters || localChapters || []
    const pdf      = serverSyl?.pdf_url  || localPdf      || null

    // Build final syl — prefer server id (user-scoped) over static local id
    const syl = serverSyl || {
      id:       `gov_${board.shortName.toLowerCase()}_class${classNum}_${subject.toLowerCase().replace(/[\s/]+/g,'_')}`,
      name:     `${board.shortName} Class ${classNum} — ${subject}`,
      chapters,
      pdf_url:  pdf,
    }

    // addSyllabus: adds to the syllabi array AND sets as activeSyllabus
    // → other panels (AI Study Chat, Question Practice) see it immediately
    addSyllabus(syl)
    setSyllabus(syl)
    setChapters(chapters)
    setSelChapters([...chapters])
    setPdfUrl(pdf)

    if (chapters.length > 0) {
      showToast(`${chapters.length} chapters loaded!`, 'success')
    } else {
      showToast('No chapters found — check your selection', 'warning')
    }
    setChapLoading(false)
  }

  const toggleChapter = c => setSelChapters(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])

  // Helper: distribute N points across M chapters as evenly as possible
  // Returns { [chapter]: pointCount }
  const distributePoints = (chs, total = 10) => {
    const base  = Math.floor(total / chs.length)
    const extra = total % chs.length
    return Object.fromEntries(chs.map((ch, i) => [ch, base + (i < extra ? 1 : 0)]))
  }

  const runTool = async (toolMode, overridePoints = null) => {
    if (!syllabus)            { showToast('Please load chapters first', 'warning'); return }
    if (!selChapters.length)  { showToast('Select at least one chapter', 'warning'); return }

    // ── Flashcard config picker ──────────────────────────────────────────────
    if (toolMode === 'flashcards' && !showFcConfig && result?.type !== 'flashcards') {
      setShowFcConfig(true)
      return
    }
    setShowFcConfig(false)
    setShowSumConfig(false)  // close adjuster panel on every new run

    setActiveMode(toolMode); setToolLoading(true); setResult(null); stopSpeechAll()

    try {
      // ──────────────────────────────────────────────────────────────────────
      // SUMMARISE — three cases:
      //  A) All chapters selected   → one combined call, 10 pts total
      //  B) Single chapter selected → one call, 10 pts
      //  C) Selective subset (2+)   → auto-distribute 10 pts across chapters
      //     (1 call per chapter); an inline adjuster appears AFTER results so
      //     the user can tweak and regenerate — NO blocking pre-flight screen.
      // ──────────────────────────────────────────────────────────────────────
      if (toolMode === 'summarise') {
        const allSelected = selChapters.length === chapters.length
        const singleChap  = selChapters.length === 1

        // ── Case A / B : combined or single ───────────────────────────────
        if (allSelected || singleChap) {
          const label = allSelected
            ? `${subject} — All ${selChapters.length} Chapters`
            : `${subject} — ${selChapters[0]}`
          const res  = await apiPost('/curriculum/summarise', {
            syllabus_id: syllabus.id, board: board?.shortName,
            class: `Class ${classNum}`, subject,
            chapters: selChapters, topic: label, point_count: 10,
          }, token)
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Summarise failed')
          setResult({ type: 'summarise', data: {
            multiChapter: false,
            summary:      data.summary || '',
            allChapters:  allSelected,
          }})
          setToolLoading(false)
          return
        }

        // ── Case C : selective subset ─────────────────────────────────────
        // Use overridePoints if the user clicked "Regenerate" from the adjuster,
        // otherwise auto-distribute 10 points evenly across selected chapters.
        const pts = overridePoints || distributePoints(selChapters, 10)

        // Sync the adjuster inputs to show what was used (so it reflects reality)
        if (!overridePoints) {
          setCustomPoints(pts)
          setSumMode('auto')
        }

        const summaries = []
        for (let i = 0; i < selChapters.length; i++) {
          const chapter = selChapters[i]
          const n       = Math.max(1, pts[chapter] || 2)
          const res     = await apiPost('/curriculum/summarise', {
            syllabus_id: syllabus.id, board: board?.shortName,
            class: `Class ${classNum}`, subject,
            chapters: [chapter], topic: `${subject} — ${chapter}`, point_count: n,
          }, token)
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Summarise failed')
          summaries.push({ chapter, summary: data.summary || '', pointCount: n })
        }
        const totalPts = Object.values(pts).reduce((a, b) => a + Number(b), 0)
        setResult({ type: 'summarise', data: {
          multiChapter: true, summaries,
          totalPoints:  totalPts,
          pointsUsed:   pts,
        }})
        setToolLoading(false)
        return
      }

      // ── All other tools ──────────────────────────────────────────────────
      const res  = await apiPost(`/curriculum/${toolMode}`, {
        syllabus_id: syllabus.id, board: board?.shortName,
        class: `Class ${classNum}`, subject, chapters: selChapters,
        topic: `${subject} — ${selChapters.slice(0,3).join(', ')}`,
        flashcard_count: toolMode === 'flashcards' ? flashcardCount : undefined,
      }, token)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `${toolMode} failed`)
      if (toolMode === 'video') {
        setVideoScript(data.script || []); setCurrentSeg(0)
        setVideoOpen(true); setVideoPlaying(false)
      }
      setResult({ type: toolMode, data })
    } catch (e) { showToast(e.message, 'error'); setActiveMode('') }
    setToolLoading(false)
  }

  const openPdf = () => {
    if (!pdfUrl) { showToast('No official PDF available for this selection', 'warning'); return }
    window.open(pdfUrl, '_blank', 'noopener,noreferrer')
  }

  const playSegment = useCallback((idx) => {
    if (idx >= videoScript.length) { setVideoPlaying(false); return }
    setCurrentSeg(idx)
    speakText(videoScript[idx]?.text || '', () => setTimeout(() => playSegment(idx + 1), 1600))
  }, [videoScript])

  const playVideo = () => { setVideoPlaying(true); playSegment(currentSeg) }
  const stopVideo = () => { stopSpeech(); setVideoPlaying(false) }
  const closeVideo = () => { stopVideo(); setVideoOpen(false) }

  const toggleSummarySpeak = () => {
    if (summarySpeak) { stopSpeech(); setSummarySpeak(false) }
    else {
      const text = result?.data?.summary || ''
      if (!text) return
      setSummarySpeak(true); speakText(text, () => setSummarySpeak(false))
    }
  }

  const tools = [
    { id: 'summarise',  icon: '📝', label: 'Summarise',    bg: 'var(--indigo3)' },
    { id: 'flashcards', icon: '🃏', label: 'Flashcards',   bg: 'var(--saffron-light)' },
    { id: 'questions',  icon: '❓', label: 'Questions',    bg: '#d1fae5' },
    { id: 'audio',      icon: '🔊', label: 'Audio Lesson', bg: '#fce7f3' },
    { id: 'video',      icon: '📹', label: 'AI Video',     bg: '#e0f2fe' },
    { id: 'practice',   icon: '🎯', label: 'Practice',     bg: '#ede9fe' },
  ]

  return (
    <div className="panel active">
      <div style={{ maxWidth: 1060, margin: '0 auto' }}>

        {/* SELECTOR CARD */}
        <div className="card" style={{ padding: 28, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
            <div style={{ fontSize: 28 }}>🏛️</div>
            <div>
              <h3 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)', margin: 0 }}>Indian Curriculum Hub</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: '2px 0 0' }}>
                All 36 states & UTs • 35+ national & state boards • Classes 1–12 • Official NCERT PDFs
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
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
                {boards.length === 0 && <option value=''>— Select state first —</option>}
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
                {subjects.length === 0 && <option>— Select board & class first —</option>}
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {board && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', background: board.type === 'national' ? 'var(--indigo3)' : '#d1fae5', borderRadius:50, fontSize:11, fontWeight:700, color: board.type === 'national' ? 'var(--indigo)' : 'var(--green)' }}>
                {board.type === 'national' ? '🇮🇳 National' : '🏫 State'} — {board.shortName}
              </span>
              <a href={board.govUrl} target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', background:'var(--paper)', borderRadius:50, fontSize:11, fontWeight:600, color:'var(--saffron)', border:'1px solid var(--warm)', textDecoration:'none' }}>
                🌐 Official Website ↗
              </a>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn-saffron" onClick={loadChapters} disabled={!subject || chapLoading}
              style={{ padding:'11px 28px', fontSize:14, display:'flex', alignItems:'center', gap:8 }}>
              {chapLoading ? <><span className="spin"/>Loading chapters…</> : <><span>📖</span> Load Chapters</>}
            </button>
            {pdfUrl && (
              <button onClick={openPdf}
                style={{ padding:'11px 24px', fontSize:14, fontWeight:700, fontFamily:'var(--sans)', background:'#fff', border:'2px solid var(--indigo)', color:'var(--indigo)', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', gap:8, transition:'.2s' }}
                onMouseOver={e => e.currentTarget.style.background='var(--indigo3)'}
                onMouseOut={e => e.currentTarget.style.background='#fff'}>
                <span>📄</span> Read Full PDF
              </button>
            )}
          </div>
        </div>

        {/* CHAPTERS */}
        {chapters.length > 0 && (
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div>
                <div style={{ fontWeight:700, color:'var(--indigo)', fontSize:15 }}>📚 {syllabus?.name}</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{selChapters.length} of {chapters.length} chapters selected</div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn-outline" style={{ padding:'5px 14px', fontSize:11 }} onClick={() => setSelChapters([...chapters])}>All</button>
                <button className="btn-outline" style={{ padding:'5px 14px', fontSize:11 }} onClick={() => setSelChapters([])}>None</button>
              </div>
            </div>
            <div className="chips-wrap" style={{ maxHeight:180, overflowY:'auto' }}>
              {chapters.map(c => (
                <div key={c} className={`chip ${selChapters.includes(c) ? 'selected' : ''}`} onClick={() => toggleChapter(c)} style={{ fontSize:12 }}>{c}</div>
              ))}
            </div>
          </div>
        )}

        {/* TOOL BUTTONS */}
        {chapters.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12, marginBottom:20 }}>
            {tools.map(t => (
              <button key={t.id}
                onClick={() => t.id === 'practice' ? setActivePanel('interactive-practice') : runTool(t.id)}
                disabled={toolLoading}
                style={{ padding:'18px 12px', background:t.bg, border: activeMode===t.id ? '2px solid var(--indigo2)' : '1.5px solid rgba(0,0,0,.06)', borderRadius:14, cursor:'pointer', textAlign:'center', transition:'.2s', fontFamily:'var(--sans)', opacity: toolLoading && activeMode!==t.id ? 0.6 : 1, boxShadow: activeMode===t.id ? '0 4px 16px rgba(67,56,202,.15)' : 'none' }}>
                <div style={{ fontSize:24, marginBottom:7 }}>{t.icon}</div>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{t.label}</div>
                {activeMode===t.id && toolLoading && <div style={{ marginTop:6 }}><span className="spin" style={{ borderTopColor:'var(--indigo)' }}/></div>}
              </button>
            ))}
          </div>
        )}

        {/* FLASHCARD COUNT CONFIGURATOR */}
        {showFcConfig && !toolLoading && (
          <div className="card" style={{ padding:24, marginBottom:20, border:'2px solid var(--saffron)', background:'var(--saffron-light)' }}>
            <div style={{ fontWeight:800, color:'var(--indigo)', marginBottom:12, fontSize:14 }}>🃏 Configure Flashcards</div>
            <div style={{ display:'flex', gap:14, alignItems:'flex-end', flexWrap:'wrap' }}>
              <div className="fg" style={{ marginBottom:0 }}>
                <label>Number of Flashcards</label>
                <select className="fi sel" value={flashcardCount} onChange={e => setFlashcardCount(Number(e.target.value))} style={{ width:180 }}>
                  {[5,8,10,12,15,20].map(n => <option key={n} value={n}>{n} flashcards</option>)}
                </select>
              </div>
              <button className="btn-saffron" onClick={() => runTool('flashcards')} style={{ padding:'11px 28px', fontSize:13 }}>
                🃏 Generate {flashcardCount} Flashcards
              </button>
              <button className="btn-outline" onClick={() => setShowFcConfig(false)} style={{ padding:'11px 18px', fontSize:13 }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* LOADING */}
        {toolLoading && (
          <div className="card" style={{ padding:48, textAlign:'center' }}>
            <span className="spinner"/>
            <p style={{ marginTop:18, color:'var(--muted)', fontSize:14 }}>AI is preparing your {activeMode}…</p>
          </div>
        )}

        {/* RESULT: SUMMARISE */}
        {!toolLoading && result?.type === 'summarise' && (() => {
          // Helper: parse one raw summary string into clean numbered lines
          const parseLines = (raw = '') => raw
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0)
            .map(l => l.replace(/^\d+[\.\)]\s*/, '').trim())
            .filter(l => l.length > 0)

          const SummaryLines = ({ lines, raw }) => (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {lines.map((line, idx) => (
                <div key={idx} style={{ display:'flex', gap:14, alignItems:'flex-start', padding:'12px 16px', background: idx % 2 === 0 ? '#f8fafc' : '#fff', borderRadius:10, border:'1px solid #f1f5f9' }}>
                  <span style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,var(--indigo),var(--indigo2))', color:'#fff', display:'grid', placeItems:'center', fontSize:12, fontWeight:800, flexShrink:0 }}>
                    {idx + 1}
                  </span>
                  <p style={{ margin:0, fontSize:14, lineHeight:1.75, color:'var(--text)' }}>{line}</p>
                </div>
              ))}
              {lines.length === 0 && (
                <div style={{ lineHeight:1.85, fontSize:14, color:'var(--text)', whiteSpace:'pre-wrap' }}>{raw}</div>
              )}
            </div>
          )

          // ── Single chapter OR all-chapters combined ────────────────────────
          if (!result.data.multiChapter) {
            const raw        = result.data.summary || ''
            const lines      = parseLines(raw)
            const allChaps   = result.data.allChapters
            return (
              <div className="card" style={{ padding:28 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                      <h4 style={{ fontFamily:'var(--serif)', color:'var(--indigo)', margin:0 }}>📝 Chapter Summary</h4>
                      {allChaps && (
                        <span style={{ background:'var(--green)', color:'#fff', fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:50 }}>
                          All {selChapters.length} chapters · 10 points
                        </span>
                      )}
                    </div>
                    <p style={{ color:'var(--muted)', fontSize:12, margin:0 }}>
                      {allChaps
                        ? `${syllabus?.name} — complete subject overview`
                        : `${syllabus?.name} — ${selChapters[0]}`}
                    </p>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn-outline" onClick={toggleSummarySpeak}
                      style={{ fontSize:12, padding:'6px 16px', display:'flex', alignItems:'center', gap:6,
                        background: summarySpeak ? 'var(--indigo)' : 'transparent',
                        color: summarySpeak ? '#fff' : 'var(--text)',
                        borderColor: summarySpeak ? 'var(--indigo)' : 'var(--warm)' }}>
                      {summarySpeak ? '⏹ Stop' : '🔊 Listen'}
                    </button>
                    {pdfUrl && (
                      <button onClick={openPdf} className="btn-outline" style={{ fontSize:12, padding:'6px 16px' }}>
                        📄 Full PDF
                      </button>
                    )}
                  </div>
                </div>
                <SummaryLines lines={lines} raw={raw} />
              </div>
            )
          }

          // ── Multiple chapters: one card per chapter + inline adjuster ────────
          const { summaries, totalPoints, pointsUsed } = result.data
          return (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

              {/* Header row */}
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <h4 style={{ fontFamily:'var(--serif)', color:'var(--indigo)', margin:0 }}>📝 Chapter Summaries</h4>
                <span style={{ background:'var(--indigo3)', color:'var(--indigo)', fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:50 }}>
                  {summaries.length} chapters
                </span>
                <span style={{ background:'var(--saffron-light)', color:'var(--saffron)', fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:50 }}>
                  {totalPoints || 10} pts total
                </span>
                {pdfUrl && (
                  <button onClick={openPdf} className="btn-outline" style={{ fontSize:12, padding:'5px 14px', marginLeft:'auto' }}>
                    📄 Full PDF
                  </button>
                )}
              </div>

              {/* Per-chapter result cards */}
              {summaries.map(({ chapter, summary, pointCount }, ci) => {
                const lines   = parseLines(summary)
                const speakId = `__summ_${ci}__`
                const isSpeaking = globalSpeaking === speakId
                return (
                  <div key={ci} className="card" style={{ padding:24 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, paddingBottom:12, borderBottom:'1px solid #f1f5f9' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,var(--saffron),var(--saffron2))', color:'#fff', display:'grid', placeItems:'center', fontSize:14, fontWeight:800, flexShrink:0 }}>
                          {ci + 1}
                        </span>
                        <div>
                          <div style={{ fontFamily:'var(--serif)', fontSize:15, color:'var(--indigo)', fontWeight:700 }}>{chapter}</div>
                          <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>
                            {lines.length} point{lines.length !== 1 ? 's' : ''}
                            {pointCount ? ` · requested ${pointCount}` : ''}
                          </div>
                        </div>
                      </div>
                      <button className="btn-outline"
                        onClick={() => {
                          if (isSpeaking) { stopSpeech(); setGlobalSpeaking(null) }
                          else { stopSpeech(); setGlobalSpeaking(speakId); speakText(summary, () => setGlobalSpeaking(null)) }
                        }}
                        style={{ fontSize:11, padding:'5px 14px', display:'flex', alignItems:'center', gap:5,
                          background: isSpeaking ? 'var(--indigo)' : 'transparent',
                          color: isSpeaking ? '#fff' : 'var(--text)',
                          borderColor: isSpeaking ? 'var(--indigo)' : 'var(--warm)' }}>
                        {isSpeaking ? '⏹ Stop' : '🔊 Listen'}
                      </button>
                    </div>
                    <SummaryLines lines={lines} raw={summary} />
                  </div>
                )
              })}

              {/* ── Inline point adjuster — always visible below results ──────── */}
              {/* User can tweak points per chapter and regenerate without losing  */}
              {/* the current results until they explicitly click Regenerate.      */}
              <div className="card" style={{ padding:22, border:'1.5px solid var(--indigo2)', background:'var(--indigo3)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <div>
                    <div style={{ fontWeight:700, color:'var(--indigo)', fontSize:14 }}>⚙️ Adjust Points per Chapter</div>
                    <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
                      Change how many summary points each chapter gets, then regenerate.
                    </div>
                  </div>
                  {/* Mode pills */}
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    {['auto','custom'].map(m => (
                      <button key={m}
                        onClick={() => {
                          setSumMode(m)
                          if (m === 'auto') setCustomPoints(distributePoints(selChapters, 10))
                        }}
                        style={{ padding:'5px 14px', borderRadius:50, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'var(--sans)', transition:'.15s',
                          background: sumMode === m ? 'var(--indigo)' : '#fff',
                          color:      sumMode === m ? '#fff' : 'var(--muted)',
                          border:     sumMode === m ? '1.5px solid var(--indigo)' : '1.5px solid var(--warm)' }}>
                        {m === 'auto' ? '⚡ Auto' : '✏️ Custom'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto preview — chips showing current distribution */}
                {sumMode === 'auto' && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
                    {selChapters.map(ch => {
                      const autoVal = distributePoints(selChapters, 10)[ch] || 0
                      return (
                        <div key={ch} style={{ padding:'5px 12px', borderRadius:50, background:'rgba(67,56,202,.1)', border:'1px solid rgba(67,56,202,.2)', fontSize:12, color:'var(--indigo)', fontWeight:600, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {ch} <span style={{ color:'var(--saffron)', fontWeight:800 }}>→ {autoVal} pt{autoVal !== 1 ? 's' : ''}</span>
                        </div>
                      )
                    })}
                    <div style={{ padding:'5px 12px', borderRadius:50, background:'var(--indigo)', color:'#fff', fontSize:12, fontWeight:700 }}>
                      Total: 10 pts ✓
                    </div>
                  </div>
                )}

                {/* Custom steppers */}
                {sumMode === 'custom' && (() => {
                  const totalAsgn = Object.values(customPoints).reduce((a,b) => a + Number(b), 0)
                  const isOver  = totalAsgn > 10
                  const isUnder = totalAsgn < 10
                  return (
                    <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
                      {selChapters.map(ch => (
                        <div key={ch} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 12px', background:'#fff', borderRadius:10, border:'1px solid var(--warm)' }}>
                          <div style={{ flex:1, fontSize:13, fontWeight:600, color:'var(--text)', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ch}</div>
                          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                            <button onClick={() => setCustomPoints(p => ({ ...p, [ch]: Math.max(1, (p[ch]||2) - 1) }))}
                              style={{ width:28, height:28, borderRadius:'50%', border:'1.5px solid var(--warm)', background:'var(--paper)', fontWeight:800, fontSize:16, cursor:'pointer', display:'grid', placeItems:'center', color:'var(--text)', fontFamily:'var(--sans)' }}>−</button>
                            <span style={{ width:28, textAlign:'center', fontWeight:800, fontSize:15, color: (customPoints[ch]||2) > 3 ? 'var(--green)' : 'var(--text)' }}>
                              {customPoints[ch] || 2}
                            </span>
                            <button onClick={() => setCustomPoints(p => ({ ...p, [ch]: Math.min(10, (p[ch]||2) + 1) }))}
                              style={{ width:28, height:28, borderRadius:'50%', border:'1.5px solid var(--warm)', background:'var(--paper)', fontWeight:800, fontSize:16, cursor:'pointer', display:'grid', placeItems:'center', color:'var(--text)', fontFamily:'var(--sans)' }}>+</button>
                            <span style={{ fontSize:11, color:'var(--muted)' }}>pts</span>
                          </div>
                        </div>
                      ))}
                      <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:12, color:'var(--muted)' }}>Total:</span>
                        <span style={{ fontSize:14, fontWeight:800, color: isOver ? 'var(--red)' : isUnder ? '#92400e' : 'var(--green)' }}>
                          {totalAsgn}/10 {isOver ? '⚠ over' : isUnder ? '— add more' : '✓'}
                        </span>
                      </div>
                    </div>
                  )
                })()}

                <button className="btn-saffron"
                  onClick={() => {
                    const pts = sumMode === 'auto' ? distributePoints(selChapters, 10) : customPoints
                    runTool('summarise', pts)
                  }}
                  style={{ padding:'10px 24px', fontSize:13, display:'flex', alignItems:'center', gap:8 }}>
                  🔄 Regenerate with {sumMode === 'auto' ? 'Auto Distribution' : 'Custom Points'}
                </button>
              </div>

            </div>
          )
        })()}

        {/* RESULT: FLASHCARDS */}
        {!toolLoading && result?.type === 'flashcards' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <h4 style={{ fontFamily:'var(--serif)', color:'var(--indigo)', margin:0 }}>🃏 Flashcards</h4>
                <p style={{ color:'var(--muted)', fontSize:12, margin:'3px 0 0' }}>
                  {result.data.flashcards?.length || 0} cards • Tap any card to flip
                </p>
              </div>
              <button className="btn-outline" onClick={() => setShowFcConfig(true)} style={{ fontSize:12, padding:'6px 16px' }}>
                ⚙️ Change Count
              </button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
              {(result.data.flashcards || []).map((fc,i) => <FlashCard key={i} question={fc.question} answer={fc.answer}/>)}
            </div>
          </div>
        )}

        {/* RESULT: QUESTIONS */}
        {!toolLoading && result?.type === 'questions' && (
          <div className="card" style={{ padding:28 }}>
            <h4 style={{ fontFamily:'var(--serif)', color:'var(--indigo)', marginBottom:18 }}>❓ Practice Questions</h4>
            {(result.data.questions || []).map((q,i) => (
              <div key={i} style={{ paddingBottom:18, marginBottom:18, borderBottom: i < result.data.questions.length-1 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ fontWeight:600, marginBottom:8, lineHeight:1.5 }}>
                  <span style={{ color:'var(--saffron)', marginRight:6 }}>{i+1}.</span>{q.question}
                </div>
                {q.answer && <div style={{ fontSize:13, color:'var(--green)', fontWeight:600, paddingLeft:16, borderLeft:'3px solid var(--green)' }}>{q.answer}</div>}
              </div>
            ))}
          </div>
        )}

        {/* RESULT: AUDIO LESSON */}
        {!toolLoading && result?.type === 'audio' && (
          <div className="card" style={{ padding:28 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <h4 style={{ fontFamily:'var(--serif)', color:'var(--indigo)', margin:0 }}>🔊 Audio Lesson</h4>
              {globalSpeaking && (
                <button onClick={() => { stopSpeech(); setGlobalSpeaking(null) }}
                  style={{ padding:'6px 14px', fontSize:12, fontWeight:700, background:'var(--red)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontFamily:'var(--sans)' }}>
                  ⏹ Stop All
                </button>
              )}
            </div>

            {/* Full lesson play button */}
            {result.data.summary && (
              <div style={{ marginBottom:16, padding:'14px 18px', background:'linear-gradient(135deg, var(--indigo3), #ede9fe)', borderRadius:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontWeight:700, color:'var(--indigo)', fontSize:13, marginBottom:2 }}>▶ Play Full Lesson</div>
                  <div style={{ fontSize:12, color:'var(--muted)' }}>Listen to the complete summary</div>
                </div>
                <button
                  onClick={() => {
                    if (globalSpeaking==='__full__') { stopSpeech(); setGlobalSpeaking(null) }
                    else { stopSpeech(); setGlobalSpeaking('__full__'); speakText(result.data.summary, () => setGlobalSpeaking(null)) }
                  }}
                  style={{ padding:'10px 20px', borderRadius:50, fontWeight:700, fontSize:13, background: globalSpeaking==='__full__' ? 'var(--indigo)' : 'linear-gradient(135deg,var(--saffron),var(--saffron2))', border:'none', color:'#fff', cursor:'pointer', fontFamily:'var(--sans)', display:'flex', alignItems:'center', gap:8 }}>
                  {globalSpeaking==='__full__' ? '⏹ Stop' : '🔊 Play'}
                </button>
              </div>
            )}

            {/* Individual sections */}
            {(result.data.sections || []).length > 0 && (
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:10 }}>Individual Sections</div>
                {result.data.sections.map((s,i) => (
                  <AudioSection key={i} label={s.label || `Section ${i+1}`} text={s.text || ''}
                    globalSpeaking={globalSpeaking}
                    onSpeakStart={label => { stopSpeech(); setGlobalSpeaking(label) }}
                    onSpeakEnd={() => setGlobalSpeaking(null)}
                  />
                ))}
              </div>
            )}

            {/* Fallback if no sections returned */}
            {(result.data.sections||[]).length===0 && result.data.summary && (
              <AudioSection label="Full Lesson" text={result.data.summary}
                globalSpeaking={globalSpeaking}
                onSpeakStart={label => { stopSpeech(); setGlobalSpeaking(label) }}
                onSpeakEnd={() => setGlobalSpeaking(null)}
              />
            )}
          </div>
        )}

      </div>

      {/* VIDEO OVERLAY — mobile safe: close button always sticky at top */}
      {videoOpen && (
        <div className="video-overlay open">

          {/* ── Sticky close row — visible on ALL screen sizes ── */}
          <div className="video-close-btn">
            <button onClick={closeVideo} aria-label="Close video">✕</button>
          </div>

          <div className="video-content-wrap">
            <div className="video-container">

              {/* Teacher avatar */}
              <div className="teacher-avatar-box">
                <div className="avatar-icon">👩‍🏫</div>
                <div style={{ color:'#fff', fontFamily:'var(--serif)', fontSize:16, marginTop:4 }}>Ms. Vidya</div>
                <div style={{ color:'rgba(255,255,255,.5)', fontSize:11 }}>AI Teacher</div>
                {videoPlaying && (
                  <div style={{ display:'flex', gap:4, marginTop:10 }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--saffron)', animation:`speakPulse .6s ${i*0.2}s infinite alternate` }}/>
                    ))}
                  </div>
                )}
              </div>

              {/* Slide stage */}
              <div className="slide-stage">
                {videoScript[currentSeg] && (
                  <div className="slide-active">
                    {videoScript[currentSeg].visual && (
                      <div style={{ background:'rgba(255,255,255,.08)', borderRadius:10, padding:'12px 16px', marginBottom:16, border:'1px solid rgba(255,255,255,.12)', fontFamily:'var(--mono)', fontSize:13, color:'#e2e8f0', whiteSpace:'pre-wrap', lineHeight:1.65, wordBreak:'break-word' }}>
                        {videoScript[currentSeg].visual}
                      </div>
                    )}
                    <div className="slide-title">{videoScript[currentSeg].segment || `Scene ${currentSeg+1}`}</div>
                    <div className="slide-text">{videoScript[currentSeg].text}</div>
                  </div>
                )}
                {/* Play/Stop controls inside slide */}
                <div style={{ marginTop:20, display:'flex', gap:10 }}>
                  {!videoPlaying
                    ? <button className="btn-saffron" onClick={playVideo} style={{ padding:'9px 22px' }}>▶ Play</button>
                    : <button onClick={stopVideo} style={{ padding:'9px 22px', background:'rgba(255,255,255,.15)', border:'1.5px solid rgba(255,255,255,.3)', color:'#fff', borderRadius:10, cursor:'pointer', fontWeight:700, fontFamily:'var(--sans)', fontSize:13 }}>⏹ Stop</button>
                  }
                </div>
              </div>

            </div>

            {/* Scene scrubber */}
            <div className="video-scrubber">
              {videoScript.map((seg,i) => (
                <button key={i} title={seg.segment || `Scene ${i+1}`}
                  onClick={() => { stopVideo(); setCurrentSeg(i) }}
                  style={{ width: i===currentSeg ? 24 : 8, height:8, borderRadius:4,
                    background: i===currentSeg ? 'var(--saffron)' : 'rgba(255,255,255,.3)',
                    border:'none', cursor:'pointer', transition:'.3s', padding:0, flexShrink:0 }}/>
              ))}
            </div>

            {videoScript[currentSeg] && (
              <div style={{ marginTop:8, color:'rgba(255,255,255,.45)', fontSize:11, textAlign:'center' }}>
                Scene {currentSeg+1} of {videoScript.length} — {videoScript[currentSeg].segment}
              </div>
            )}
          </div>
        </div>
      )}

      {/* speakPulse keyframe is defined in index.css */}
    </div>
  )
}
