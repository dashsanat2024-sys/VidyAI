import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { apiPost, apiPostForm, speakText, stopSpeech, API_BASE } from '../../utils/api'

function Message({ role, text, sources }) {
  return (
    <div className={`msg ${role}`}>
      <div className="msg-bubble">{text}</div>
      {sources?.length > 0 && (
        <div style={{ fontSize: 10, color: 'var(--indigo2)', marginTop: 4, fontWeight: 600 }}>
          📎 Sources: {sources.join(', ')}
        </div>
      )}
    </div>
  )
}

export default function ChatPanel({ showToast }) {
  const { token } = useAuth()
  const { syllabi, activeSyllabus, setActiveSyllabus, removeSyllabus, refreshData } = useApp()

  const ARTHAVI_GREETING = {
    role: 'bot',
    text: "👋 Hi! I'm Arthavi, your AI Study Companion.\n\nSelect a knowledge source above (or upload a document) and ask me anything — I'll answer based on your exact syllabus.\n\nYou can also ask me general questions anytime!",
    sources: [],
    id: 'greeting',
  }

  const [messages,    setMessages]    = useState([ARTHAVI_GREETING])
  const [input,       setInput]       = useState('')
  const [typing,      setTyping]      = useState(false)
  const [selectedSyl, setSelectedSyl] = useState('')
  const [speaking,    setSpeaking]    = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [ocrProgress, setOcrProgress] = useState(null) // null | { status, docId, fileName }
  const bottomRef = useRef(null)
  const fileRef   = useRef(null)

  useEffect(() => {
    if (activeSyllabus?.id) setSelectedSyl(activeSyllabus.id)
  }, [activeSyllabus])

  // Stop any in-progress speech when this panel is unmounted or user
  // navigates away — prevents ghost audio after switching panels.
  useEffect(() => {
    return () => { stopSpeech(); setSpeaking(false) }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const addMsg = (role, text, sources = []) =>
    setMessages(prev => [...prev, { role, text, sources, id: Date.now() }])

  const sendChat = async () => {
    const q = input.trim()
    if (!q) return
    setInput('')
    addMsg('user', q)
    setTyping(true)
    try {
      const data = await apiPost('/chat', { question: q, syllabus_id: selectedSyl || undefined }, token)
      setTyping(false)
      if (data.answer) addMsg('bot', data.answer, data.sources)
      else if (data.error) addMsg('bot', `Error: ${data.error}`)
    } catch { showToast('Chat error', 'error'); setTyping(false) }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    const MAX_MB = 50
    if (file.size > MAX_MB * 1024 * 1024) {
      showToast(`File too large (max ${MAX_MB} MB). Try a smaller file.`, 'error')
      fileRef.current.value = ''; return
    }
    const fd = new FormData()
    fd.append('file', file)
    fd.append('syllabus_name', file.name.replace(/\.[^/.]+$/, ''))
    setUploading(true)
    setOcrProgress({ status: 'uploading', docId: null, fileName: file.name })
    try {
      const data = await apiPostForm('/upload', fd, token)
      await refreshData()
      if (data.syllabus_id) {
        setSelectedSyl(data.syllabus_id)
        setActiveSyllabus({ id: data.syllabus_id, name: data.syllabus_name || file.name })
      }
      if (data.ocr_queued) {
        setUploading(false)
        setOcrProgress({ status: 'ocr', docId: data.syllabus_id, fileName: file.name, startTime: Date.now() })
        // Poll for OCR completion
        const did = data.syllabus_id
        const poll = setInterval(async () => {
          try {
            const resp = await fetch(`${API_BASE}/documents/${did}/ocr-status`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            const st = await resp.json()
            if (st.status === 'ready') {
              clearInterval(poll)
              await refreshData()
              setOcrProgress(null)
              showToast(`Document ready! (${st.chunks} chunks indexed)`, 'success')
            } else if (st.status === 'failed') {
              clearInterval(poll)
              setOcrProgress(null)
              showToast('OCR could not extract text from this PDF. Try a text-based PDF or paste as .txt', 'warning')
            }
          } catch { clearInterval(poll); setOcrProgress(null) }
        }, 10000)  // poll every 10 seconds
      } else if (data.chunks === 0) {
        setUploading(false)
        setOcrProgress(null)
        showToast('Document saved but no text could be extracted.', 'warning')
      } else {
        setUploading(false)
        setOcrProgress(null)
        showToast(`Document indexed! (${data.chunks} text chunks ready)`, 'success')
      }
    } catch (e) {
      setUploading(false)
      setOcrProgress(null)
      const msg = (e.status === 413 || e.message?.includes('413'))
        ? 'File too large. Please try a smaller file (max 50 MB for documents, 25 MB for audio).'
        : (e.message || 'Upload failed')
      showToast(msg, 'error')
    }
    fileRef.current.value = ''
  }

  // Delete syllabus from backend and remove from local list
  const handleDeleteSyllabus = async () => {
    if (!selectedSyl) { showToast('Select a syllabus to remove', 'warning'); return }
    if (!window.confirm('Remove this syllabus from your list? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_BASE}/syllabi/${selectedSyl}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        removeSyllabus(selectedSyl)
        setSelectedSyl('')
        showToast('Syllabus removed', 'success')
      } else {
        const d = await res.json()
        showToast(d.error || 'Failed to remove', 'error')
      }
    } catch { showToast('Failed to remove', 'error') }
    setDeleting(false)
  }

  const handleSpeak = () => {
    // If already speaking, toggle it off
    if (speaking) { stopSpeech(); setSpeaking(false); return }
    const last = [...messages].reverse().find(m => m.role === 'bot')
    if (!last) { showToast('No AI response to read', 'warning'); return }
    setSpeaking(true)
    speakText(last.text, () => setSpeaking(false))
  }

  const quickPrompts = [
    'What are the main topics in this chapter?',
    'Give me 5 practice exam questions',
    'Explain the hardest topic simply',
    'What should I focus on for exams?',
    'Summarise the key concepts',
  ]

  const [sampleQs, setSampleQs] = useState(quickPrompts)
  const [sampleQsLoading, setSampleQsLoading] = useState(false)

  useEffect(() => {
    if (!selectedSyl) { setSampleQs(quickPrompts); return }
    setSampleQsLoading(true)
    fetch(`${API_BASE}/syllabi/${selectedSyl}/sample-questions`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { if (d.questions?.length) setSampleQs(d.questions.slice(0, 5)) })
      .catch(() => {})
      .finally(() => setSampleQsLoading(false))
  }, [selectedSyl])

  const selectedName = syllabi.find(s => s.id === selectedSyl)?.name || ''

  return (
    <div className="panel active">
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>

        {/* Header bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="fi sel" style={{ flex: 1, minWidth: 200 }}
            value={selectedSyl} onChange={e => setSelectedSyl(e.target.value)}>
            <option value="">— Select Knowledge Source (optional) —</option>
            {syllabi.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {/* Clear / Delete syllabus */}
          {selectedSyl && (
            <button
              onClick={handleDeleteSyllabus}
              disabled={deleting}
              title={`Remove "${selectedName}" from your list`}
              style={{ padding: '9px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 9, color: '#991b1b', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
              {deleting ? '…' : '🗑 Remove'}
            </button>
          )}

          <button className="btn-saffron" onClick={() => fileRef.current.click()}
            disabled={uploading || !!ocrProgress}
            style={{ whiteSpace: 'nowrap', opacity: (uploading || ocrProgress) ? 0.6 : 1 }}>
            {uploading ? <><span className="spin" style={{ width: 14, height: 14, borderWidth: 2 }}/> Uploading…</> : '📎 Upload Doc'}
          </button>
          <button className="btn-outline" onClick={handleSpeak} disabled={speaking} style={{ whiteSpace: 'nowrap' }}>
            {speaking ? '🔊 Speaking…' : '🔊 Listen'}
          </button>
          <button className="btn-outline" onClick={() => { stopSpeech(); setSpeaking(false); setMessages([]) }} style={{ whiteSpace: 'nowrap' }}>
            🗑 Clear Chat
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md,.mp3,.mp4,.wav,.m4a" style={{ display: 'none' }} onChange={handleFileUpload} />
        </div>

        {/* Upload / OCR progress banner */}
        {ocrProgress && (
          <div style={{
            marginBottom: 12, padding: '12px 18px', borderRadius: 12,
            background: ocrProgress.status === 'ocr'
              ? 'linear-gradient(135deg, #eff6ff, #dbeafe)'
              : 'linear-gradient(135deg, #fefce8, #fef9c3)',
            border: ocrProgress.status === 'ocr' ? '1.5px solid #93c5fd' : '1.5px solid #fde047',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ flexShrink: 0 }}>
              {ocrProgress.status === 'uploading' && <span className="spin" style={{ borderTopColor: '#d97706' }}/>}
              {ocrProgress.status === 'ocr' && <span className="spin" style={{ borderTopColor: '#2563eb' }}/>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: ocrProgress.status === 'ocr' ? '#1e40af' : '#92400e', marginBottom: 2 }}>
                {ocrProgress.status === 'uploading' && 'Uploading document…'}
                {ocrProgress.status === 'ocr' && 'Processing scanned PDF (OCR in progress)'}
              </div>
              <div style={{ fontSize: 12, color: ocrProgress.status === 'ocr' ? '#3b82f6' : '#b45309' }}>
                {ocrProgress.fileName}
                {ocrProgress.status === 'ocr' && ' — Extracting text from pages via AI. This may take a few minutes for large documents.'}
              </div>
              {ocrProgress.status === 'ocr' && (
                <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: 'rgba(59,130,246,.15)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                    animation: 'ocrPulse 2s ease-in-out infinite',
                  }}/>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--indigo)', marginBottom: 8 }}>
                  Arthavi — AI Study Companion
                </div>
                <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 440, margin: '0 auto 24px', lineHeight: 1.6 }}>
                  {syllabi.length === 0
                    ? 'Upload a PDF or text file to start. Arthavi will answer questions using only your document.'
                    : 'Select a syllabus above and ask any question. Arthavi answers using your materials.'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {sampleQsLoading
                    ? <span style={{ fontSize: 13, color: 'var(--muted)' }}>Loading sample questions…</span>
                    : sampleQs.map(p => (
                        <button key={p} className="chip selected" onClick={() => setInput(p)}>{p}</button>
                      ))
                  }
                </div>
              </div>
            )}
            {messages.map(m => <Message key={m.id} role={m.role} text={m.text} sources={m.sources} />)}
            {typing && (
              <div className="msg bot">
                <div className="msg-bubble" style={{ display: 'flex', gap: 6, padding: '14px 16px' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--muted2)', animation: `typingBounce 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chat-input-row">
            <input className="fi" style={{ flex: 1, borderRadius: 50, padding: '11px 20px' }}
              placeholder={selectedSyl ? `Ask about "${selectedName}"…` : 'Ask anything…'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()} />
            <button className="btn-saffron" onClick={sendChat} style={{ borderRadius: 50, padding: '11px 22px' }}>
              Send →
            </button>
          </div>
          <div style={{ padding: '8px 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {sampleQsLoading
              ? <span style={{ fontSize: 12, color: 'var(--muted)' }}>Loading suggestions…</span>
              : sampleQs.map(p => (
                  <button key={p} className="chip" style={{ fontSize: 12 }}
                    onClick={() => { setInput(p) }}>{p}</button>
                ))
            }
          </div>
        </div>
      </div>

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes ocrPulse {
          0% { width: 15%; opacity: .7; }
          50% { width: 85%; opacity: 1; }
          100% { width: 15%; opacity: .7; }
        }
      `}</style>
    </div>
  )
}
