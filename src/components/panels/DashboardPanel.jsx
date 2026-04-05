import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { apiGet, apiPost, API_BASE } from '../../utils/api'

const APP_NAME = 'Arthavi'

function StatCard({ label, value, color, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-val" style={color ? { color } : {}}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function QuickCard({ icon, title, desc, onClick, badge }) {
  return (
    <div className="card glass" style={{ padding: 22, cursor: 'pointer', position: 'relative' }} onClick={onClick}>
      {badge && (
        <span style={{ position: 'absolute', top: 12, right: 12, background: 'var(--saffron)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 50, letterSpacing: '.3px' }}>
          {badge}
        </span>
      )}
      <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{desc}</div>
    </div>
  )
}

// ── Step-by-step guide for a role ─────────────────────────────────────────────
function HowToGuide({ steps, role }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 24 }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--indigo3)', border: '1.5px solid var(--indigo2)', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 13, color: 'var(--indigo)', width: '100%' }}>
        <span>📖</span>
        {open ? 'Hide' : `How to use ${APP_NAME} as ${role}`}
        <span style={{ marginLeft: 'auto' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: '#fff', borderRadius: 10, border: '1px solid #f1f5f9' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,var(--saffron),var(--saffron2))', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--indigo)', marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Student Dashboard ──────────────────────────────────────────────────────────
function StudentDashboard({ me, syllabi, docs, navigate }) {
  const STEPS = [
    { title: 'Go to Curriculum Hub', desc: 'Select your State, Board (e.g. CBSE), Class and Subject from the dropdown menus.' },
    { title: 'Load Chapters', desc: 'Click "Load Chapters" to fetch the official chapter list from the NCERT/State board database.' },
    { title: 'Summarise any chapter', desc: 'Select one or more chapters, then click "Summarise" to get a 10-point AI explanation.' },
    { title: 'Generate Flashcards', desc: 'Click "Flashcards", choose how many cards (5–20), and revise key concepts by flipping cards.' },
    { title: 'Practice Questions', desc: 'Click "Practice" to get AI-generated MCQ and subjective questions with instant feedback.' },
    { title: 'Listen to Audio Lessons', desc: 'Click "Audio Lesson" to hear an AI teacher explain the chapter out loud.' },
    { title: 'AI Study Chat', desc: 'Go to AI Study Chat, upload your textbook PDF or notes, and ask any doubt — the AI answers from your book.' },
  ]
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--indigo)', marginBottom: 4 }}>
          Good day, {me?.name?.split(' ')[0] || 'Student'}! 👋
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          {syllabi.length} syllabi loaded · {docs.length} documents available. Ready to study?
        </p>
      </div>
      <div className="stats-grid">
        <StatCard label="Syllabi Loaded"    value={syllabi.length} />
        <StatCard label="Documents"         value={docs.length} />
        <StatCard label="Practice Sessions" value="0" />
        <StatCard label="Learning Streak"   value="1 Day" />
      </div>
      <h3 style={{ marginBottom: 14, fontFamily: 'var(--serif)' }}>Quick Access</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        <QuickCard icon="🏛️" title="Curriculum Hub"      desc="Official NCERT & state board chapters with AI tools." onClick={() => navigate('curriculum')} badge="Start Here" />
        <QuickCard icon="💬" title="AI Study Chat"        desc="Chat with your uploaded textbooks." onClick={() => navigate('chat')} />
        <QuickCard icon="🎯" title="Question Practice"    desc="AI-generated practice questions." onClick={() => navigate('interactive-practice')} />
      </div>
      <HowToGuide steps={STEPS} role="a Student" />
    </>
  )
}

// ── Teacher Dashboard ──────────────────────────────────────────────────────────
function TeacherDashboard({ me, syllabi, docs, navigate }) {
  const STEPS = [
    { title: 'Curriculum Hub — Load your subject', desc: 'Select Board, Class and Subject. Load chapters. Use Summarise, Flashcards, Audio Lesson for class preparation.' },
    { title: 'Question Master — Create exam paper', desc: 'Go to Question Master. Select State/Board/Class/Subject. Choose question type (Mixed/Obj/Subj), count and difficulty.' },
    { title: 'Configure the paper header', desc: 'Enter school name, your name and exam date. These print on the paper.' },
    { title: 'Generate & customise questions', desc: 'Click Generate. Review all questions. Uncheck any you do not want. Add your own custom questions if needed.' },
    { title: 'Print student paper & answer key', desc: 'Click "Print Questions" for the student copy and "Print Answer Key" for your record. File is saved as Board_Class_Subject.' },
    { title: 'Save Exam — get Exam ID', desc: 'Click "Save Exam" to get a unique Exam ID. Keep this ID — it is used for evaluation.' },
    { title: 'Evaluation Central — evaluate answer sheets', desc: 'Go to Evaluation Central. Select the Exam ID. Upload a student\'s answer sheet (PDF/image). AI evaluates and scores it.' },
    { title: 'Multi-student PDF evaluation', desc: 'Upload a single PDF with all students\' answer sheets. AI automatically splits by student and evaluates each separately.' },
    { title: 'Print & email reports', desc: 'Print individual school-quality parent reports. Enter parent email and click "Send Report" to email results.' },
  ]
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--indigo)', marginBottom: 4 }}>
          Welcome, {me?.name?.split(' ')[0] || 'Teacher'}! 📚
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Manage classes, create papers, and evaluate students.</p>
      </div>
      <div className="stats-grid">
        <StatCard label="Questions Created" value="0" />
        <StatCard label="Exams Saved"       value="0" />
        <StatCard label="Syllabi Loaded"    value={syllabi.length} />
        <StatCard label="Avg. Class Score"  value="N/A" />
      </div>
      <h3 style={{ marginBottom: 14, fontFamily: 'var(--serif)' }}>Teaching Tools</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        <QuickCard icon="🏛️" title="Curriculum Hub"    desc="Load NCERT chapters, AI summaries, audio lessons." onClick={() => navigate('curriculum')} />
        <QuickCard icon="🖋️" title="Question Master"   desc="Create, print, and save exam papers." onClick={() => navigate('qmaster')} badge="Key Tool" />
        <QuickCard icon="📋" title="Evaluation Central" desc="AI-grade answer sheets and email parent reports." onClick={() => navigate('eval')} />
        <QuickCard icon="💬" title="AI Study Chat"     desc="AI tutor using your uploaded documents." onClick={() => navigate('chat')} />
        <QuickCard icon="🎯" title="Question Practice" desc="Live interactive practice sessions." onClick={() => navigate('interactive-practice')} />
      </div>
      <HowToGuide steps={STEPS} role="a Teacher" />
    </>
  )
}

// ── Parent Dashboard ───────────────────────────────────────────────────────────
function ParentDashboard({ me, navigate }) {
  const STEPS = [
    { title: 'Sign in as Parent', desc: 'On the login page select the "Parent" tab, enter your registered email and password.' },
    { title: 'View Child Progress — Analytics', desc: 'Click "Child Progress" in the left menu to see your child\'s exam scores, grades and performance trends over time.' },
    { title: 'Check Exam Reports', desc: 'Go to "Exam Reports" to view AI-generated performance reports including marks, grade, and teacher feedback for every exam your child has taken.' },
    { title: 'Receive email reports', desc: 'Your child\'s teacher can send a detailed performance report directly to your email after each evaluation. Check your inbox.' },
    { title: 'Use AI Study Chat', desc: 'Go to "AI Study Support" to get help with your child\'s subjects — ask questions and get instant explanations to support home learning.' },
    { title: 'Contact school', desc: 'If you have questions about a report or score, note down the Exam ID from the report and share it with the teacher for reference.' },
  ]
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--indigo)', marginBottom: 4 }}>
          Hello, {me?.name?.split(' ')[0] || 'Parent'}! 👨‍👩‍👧
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Track your child's progress and receive performance reports.</p>
      </div>
      <div className="stats-grid">
        <StatCard label="Exams Taken"     value="0" />
        <StatCard label="Avg. Score"      value="N/A" />
        <StatCard label="Study Streak"    value="1 Day" />
        <StatCard label="Pending Reports" value="0" />
      </div>
      <h3 style={{ marginBottom: 14, fontFamily: 'var(--serif)' }}>Parent Tools</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <QuickCard icon="📈" title="Child Progress"    desc="Detailed performance analytics and exam history." onClick={() => navigate('analytics')} badge="Start Here" />
        <QuickCard icon="📋" title="Exam Reports"      desc="View and download AI-generated evaluation reports." onClick={() => navigate('eval')} />
        <QuickCard icon="💬" title="AI Study Support"  desc="AI-powered tutoring to support home learning." onClick={() => navigate('chat')} />
      </div>
      <div className="card" style={{ padding: 22, marginTop: 20, borderLeft: '4px solid var(--saffron)', display: 'flex', gap: 14 }}>
        <span style={{ fontSize: 28 }}>📩</span>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--indigo)' }}>Performance Reports Sent to Your Email</div>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, margin: 0 }}>
            After each examination evaluation, your child's school will send a detailed AI-generated performance report directly to your registered email address. The report includes marks, grade, feedback, and areas to improve.
          </p>
        </div>
      </div>
      <HowToGuide steps={STEPS} role="a Parent" />
    </>
  )
}

// ── School Admin Dashboard ─────────────────────────────────────────────────────
function SchoolAdminDashboard({ me, adminStats, navigate, token, showToast }) {
  const stats = adminStats || {}
  const [docs, setDocs] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [showDocs, setShowDocs] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [settings, setSettings] = useState(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const loadDocs = async () => {
    setLoadingDocs(true)
    try {
      const data = await apiGet('/documents', token)
      setDocs(data.documents || [])
    } catch { }
    setLoadingDocs(false)
  }

  const deleteDoc = async (did, dname) => {
    if (!window.confirm(`Delete "${dname}"? This cannot be undone.`)) return
    setDeleting(did)
    try {
      await apiGet(`/documents`, token)    // list first (already have)
      const del = await fetch(`${API_BASE}/documents/${did}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (del.ok) {
        setDocs(prev => prev.filter(d => d.id !== did))
        showToast && showToast('Document deleted', 'success')
      } else {
        showToast && showToast('Failed to delete', 'error')
      }
    } catch { }
    setDeleting(null)
  }

  const loadSettings = async () => {
    try {
      const data = await apiGet('/admin/settings', token)
      setSettings(data.settings || {})
    } catch { }
  }

  const saveSettings = async () => {
    if (!settings) return
    setSavingSettings(true)
    try {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings)
      })
      const data = await res.json()
      if (res.ok) {
        setSettings(data.settings)
        showToast && showToast('Settings saved!', 'success')
      }
    } catch { }
    setSavingSettings(false)
  }

  useEffect(() => { loadSettings() }, [])

  const CONFIG_FIELDS = [
    { key: 'max_uploads_per_user',      label: 'Max uploads per user',           type: 'number', min: 1,  max: 100 },
    { key: 'max_uploads_student',       label: 'Max uploads — Student',          type: 'number', min: 0,  max: 50  },
    { key: 'max_uploads_teacher',       label: 'Max uploads — Teacher',          type: 'number', min: 0,  max: 100 },
    { key: 'max_flashcards_default',    label: 'Default flashcard count',        type: 'number', min: 5,  max: 30  },
    { key: 'max_questions_per_paper',   label: 'Max questions per exam paper',   type: 'number', min: 5,  max: 100 },
    { key: 'student_self_register',     label: 'Allow student self-registration',type: 'bool' },
    { key: 'tutor_approval_required',   label: 'Require admin approval for tutors', type: 'bool' },
    { key: 'show_answer_explanations',  label: 'Show answer explanations to students', type: 'bool' },
    { key: 'otp_required_for_signup',   label: 'Require OTP for sign-up',        type: 'bool' },
    { key: 'email_reports_enabled',     label: 'Enable parent email reports',    type: 'bool' },
  ]

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--indigo)', marginBottom: 4 }}>
          Institution Overview 🏫
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          {me?.institution || 'Your Institution'} — Manage staff, students, and settings.
        </p>
      </div>

      <div className="stats-grid">
        <StatCard label="Teachers"       value={stats.teacher_count ?? 0} />
        <StatCard label="Students"       value={stats.student_count ?? 0} />
        <StatCard label="Visitors"       value={stats.visitor_count ?? 0} color="var(--indigo)" />
        <StatCard label="Exams Created"  value={stats.exam_count   ?? 0} color="var(--saffron)" />
        <StatCard label="Evaluations"    value={stats.eval_count   ?? 0} />
        <StatCard label="Storage Used"   value={`${stats.storage_gb ?? '0.0'} GB`} />
      </div>

      <h3 style={{ marginBottom: 14, fontFamily: 'var(--serif)' }}>Quick Access</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 24 }}>
        <QuickCard icon="🏢" title="Campus Directory"   desc="Manage teachers and students." onClick={() => navigate('institute')} />
        <QuickCard icon="📈" title="School Analytics"   desc="Class performance and trends." onClick={() => navigate('analytics')} />
        <QuickCard icon="🖋️" title="Question Master"   desc="Create and manage exam papers." onClick={() => navigate('qmaster')} />
        <QuickCard icon="📋" title="Evaluation Central" desc="Bulk AI grading and parent reports." onClick={() => navigate('eval')} />
      </div>

      {/* ── App Settings ─────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 22, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showSettings ? 16 : 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--indigo)' }}>⚙️ Platform Settings</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {showSettings && (
              <button className="btn-saffron" style={{ padding: '7px 18px', fontSize: 12 }}
                onClick={saveSettings} disabled={savingSettings}>
                {savingSettings ? 'Saving…' : '✓ Save Settings'}
              </button>
            )}
            <button className="btn-outline" style={{ padding: '7px 16px', fontSize: 12 }}
              onClick={() => setShowSettings(v => !v)}>
              {showSettings ? '▲ Hide' : '▼ Configure'}
            </button>
          </div>
        </div>
        {showSettings && settings && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {CONFIG_FIELDS.map(f => (
              <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--paper)', borderRadius: 8, border: '1px solid #e8e0d0' }}>
                <label style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{f.label}</label>
                {f.type === 'bool' ? (
                  <button
                    onClick={() => setSettings(s => ({ ...s, [f.key]: !s[f.key] }))}
                    style={{ padding: '4px 14px', borderRadius: 50, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, fontFamily: 'var(--sans)',
                      background: settings[f.key] ? '#d1fae5' : '#fee2e2',
                      color: settings[f.key] ? '#065f46' : '#991b1b' }}>
                    {settings[f.key] ? 'ON' : 'OFF'}
                  </button>
                ) : (
                  <input
                    type="number" min={f.min} max={f.max}
                    value={settings[f.key] ?? ''}
                    onChange={e => setSettings(s => ({ ...s, [f.key]: parseInt(e.target.value) || 0 }))}
                    style={{ width: 72, padding: '5px 8px', borderRadius: 7, border: '1.5px solid var(--warm)', fontFamily: 'var(--sans)', fontSize: 13, textAlign: 'center' }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Uploaded Books Manager ────────────────────────────────────── */}
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showDocs ? 14 : 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--indigo)' }}>📚 Uploaded Books & Documents</div>
          <button className="btn-outline" style={{ padding: '7px 16px', fontSize: 12 }}
            onClick={() => { setShowDocs(v => !v); if (!showDocs) loadDocs() }}>
            {showDocs ? '▲ Hide' : '▼ Manage Uploads'}
          </button>
        </div>
        {showDocs && (
          <>
            {loadingDocs && <div style={{ padding: 20, textAlign: 'center' }}><span className="spinner" /></div>}
            {!loadingDocs && docs.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 0' }}>No uploaded documents found.</p>
            )}
            {!loadingDocs && docs.map(d => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>📄 {d.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {d.type} · {Math.round((d.size || 0) / 1024)} KB · {d.uploaded_at?.slice(0, 10)}
                  </div>
                </div>
                <button
                  onClick={() => deleteDoc(d.id, d.name)}
                  disabled={deleting === d.id}
                  style={{ padding: '5px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 7, color: '#991b1b', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                  {deleting === d.id ? '…' : '🗑 Delete'}
                </button>
              </div>
            ))}
            {!loadingDocs && docs.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
                {docs.length} document{docs.length !== 1 ? 's' : ''} — {Math.round(docs.reduce((s, d) => s + (d.size || 0), 0) / 1024)} KB total
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

// ── Platform Admin Dashboard ───────────────────────────────────────────────────
function PlatformAdminDashboard({ me, adminStats, navigate, token, showToast }) {
  const stats = adminStats || {}
  const [institutions, setInstitutions] = useState([])
  const [loadingInst, setLoadingInst] = useState(false)
  const [showInst, setShowInst] = useState(false)
  const [settings, setSettings] = useState(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [docs, setDocs] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [showDocs, setShowDocs] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const loadInstitutions = async () => {
    setLoadingInst(true)
    try {
      const data = await apiGet('/admin/institutions', token)
      setInstitutions(data.institutions || [])
    } catch { }
    setLoadingInst(false)
  }

  const loadSettings = async () => {
    try { const data = await apiGet('/admin/settings', token); setSettings(data.settings || {}) } catch { }
  }

  const saveSettings = async () => {
    if (!settings) return
    setSavingSettings(true)
    try {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings)
      })
      const data = await res.json()
      if (res.ok) { setSettings(data.settings); showToast && showToast('Settings saved!', 'success') }
    } catch { }
    setSavingSettings(false)
  }

  const loadDocs = async () => {
    setLoadingDocs(true)
    try { const data = await apiGet('/documents', token); setDocs(data.documents || []) } catch { }
    setLoadingDocs(false)
  }

  const deleteDoc = async (did, dname) => {
    if (!window.confirm(`Delete "${dname}"? This cannot be undone.`)) return
    setDeleting(did)
    try {
      const del = await fetch(`${API_BASE}/documents/${did}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      if (del.ok) { setDocs(prev => prev.filter(d => d.id !== did)); showToast && showToast('Document deleted', 'success') }
      else showToast && showToast('Failed to delete', 'error')
    } catch { }
    setDeleting(null)
  }

  useEffect(() => { loadSettings() }, [])

  const CONFIG_FIELDS = [
    { key: 'max_uploads_per_user',      label: 'Max uploads per user',             type: 'number', min: 1,  max: 100 },
    { key: 'max_uploads_student',       label: 'Max uploads — Student',            type: 'number', min: 0,  max: 50  },
    { key: 'max_uploads_teacher',       label: 'Max uploads — Teacher',            type: 'number', min: 0,  max: 100 },
    { key: 'max_flashcards_default',    label: 'Default flashcard count',          type: 'number', min: 5,  max: 30  },
    { key: 'max_questions_per_paper',   label: 'Max questions per exam paper',     type: 'number', min: 5,  max: 100 },
    { key: 'student_self_register',     label: 'Allow student self-registration',  type: 'bool' },
    { key: 'show_answer_explanations',  label: 'Show answer explanations',         type: 'bool' },
    { key: 'otp_required_for_signup',   label: 'Require OTP for sign-up',          type: 'bool' },
    { key: 'email_reports_enabled',     label: 'Enable parent email reports',      type: 'bool' },
  ]

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--indigo)', marginBottom: 4 }}>
          Platform Overview 🔐
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Global admin — all institutions, all users, platform settings.
        </p>
      </div>

      <div className="stats-grid">
        <StatCard label="Institutions"   value={stats.institute_count ?? 0} color="var(--saffron)" />
        <StatCard label="Teachers"       value={stats.teacher_count ?? 0} />
        <StatCard label="Students"       value={stats.student_count ?? 0} />
        <StatCard label="Parents"        value={stats.parent_count ?? 0} />
        <StatCard label="Exams Created"  value={stats.exam_count ?? 0} color="var(--indigo)" />
        <StatCard label="Evaluations"    value={stats.eval_count ?? 0} />
        <StatCard label="Visitors"       value={stats.visitor_count ?? 0} />
        <StatCard label="Storage Used"   value={`${stats.storage_gb ?? '0.0'} GB`} />
      </div>

      <h3 style={{ marginBottom: 14, fontFamily: 'var(--serif)' }}>Quick Access</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 24 }}>
        <QuickCard icon="🏢" title="All Users"           desc="Manage every user across all institutions." onClick={() => navigate('institute')} badge="Global" />
        <QuickCard icon="📈" title="Platform Analytics"  desc="Platform-wide performance and usage trends." onClick={() => navigate('analytics')} />
        <QuickCard icon="🖋️" title="Question Master"     desc="Create and manage exam papers." onClick={() => navigate('qmaster')} />
        <QuickCard icon="📋" title="Evaluation Central"  desc="AI grading and parent reports." onClick={() => navigate('eval')} />
      </div>

      {/* ── Institutions List ──────────────────────────────────────────── */}
      <div className="card" style={{ padding: 22, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showInst ? 16 : 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--indigo)' }}>🏫 Registered Institutions</div>
          <button className="btn-outline" style={{ padding: '7px 16px', fontSize: 12 }}
            onClick={() => { setShowInst(v => !v); if (!showInst) loadInstitutions() }}>
            {showInst ? '▲ Hide' : '▼ View All'}
          </button>
        </div>
        {showInst && (
          <>
            {loadingInst && <div style={{ padding: 20, textAlign: 'center' }}><span className="spinner" /></div>}
            {!loadingInst && institutions.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 0' }}>No institutions registered yet.</p>
            )}
            {!loadingInst && institutions.map((inst, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--indigo)' }}>🏫 {inst.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {inst.teacher_count} teachers · {inst.student_count} students · {inst.parent_count} parents
                    {inst.admins?.length ? ` · Admin: ${inst.admins.map(a => a.name).join(', ')}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--saffron)' }}>
                  {(inst.teacher_count || 0) + (inst.student_count || 0) + (inst.parent_count || 0)}
                  <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted)', marginLeft: 4 }}>users</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Platform Settings ──────────────────────────────────────────── */}
      <div className="card" style={{ padding: 22, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showSettings ? 16 : 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--indigo)' }}>⚙️ Platform Settings</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {showSettings && (
              <button className="btn-saffron" style={{ padding: '7px 18px', fontSize: 12 }}
                onClick={saveSettings} disabled={savingSettings}>
                {savingSettings ? 'Saving…' : '✓ Save Settings'}
              </button>
            )}
            <button className="btn-outline" style={{ padding: '7px 16px', fontSize: 12 }}
              onClick={() => setShowSettings(v => !v)}>
              {showSettings ? '▲ Hide' : '▼ Configure'}
            </button>
          </div>
        </div>
        {showSettings && settings && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {CONFIG_FIELDS.map(f => (
              <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--paper)', borderRadius: 8, border: '1px solid #e8e0d0' }}>
                <label style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{f.label}</label>
                {f.type === 'bool' ? (
                  <button onClick={() => setSettings(s => ({ ...s, [f.key]: !s[f.key] }))}
                    style={{ padding: '4px 14px', borderRadius: 50, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, fontFamily: 'var(--sans)',
                      background: settings[f.key] ? '#d1fae5' : '#fee2e2',
                      color: settings[f.key] ? '#065f46' : '#991b1b' }}>
                    {settings[f.key] ? 'ON' : 'OFF'}
                  </button>
                ) : (
                  <input type="number" min={f.min} max={f.max} value={settings[f.key] ?? ''}
                    onChange={e => setSettings(s => ({ ...s, [f.key]: parseInt(e.target.value) || 0 }))}
                    style={{ width: 72, padding: '5px 8px', borderRadius: 7, border: '1.5px solid var(--warm)', fontFamily: 'var(--sans)', fontSize: 13, textAlign: 'center' }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Uploaded Documents ─────────────────────────────────────────── */}
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showDocs ? 14 : 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--indigo)' }}>📚 Uploaded Books & Documents</div>
          <button className="btn-outline" style={{ padding: '7px 16px', fontSize: 12 }}
            onClick={() => { setShowDocs(v => !v); if (!showDocs) loadDocs() }}>
            {showDocs ? '▲ Hide' : '▼ Manage Uploads'}
          </button>
        </div>
        {showDocs && (
          <>
            {loadingDocs && <div style={{ padding: 20, textAlign: 'center' }}><span className="spinner" /></div>}
            {!loadingDocs && docs.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 0' }}>No uploaded documents found.</p>
            )}
            {!loadingDocs && docs.map(d => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>📄 {d.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.type} · {Math.round((d.size || 0) / 1024)} KB · {d.uploaded_at?.slice(0, 10)}</div>
                </div>
                <button onClick={() => deleteDoc(d.id, d.name)} disabled={deleting === d.id}
                  style={{ padding: '5px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 7, color: '#991b1b', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                  {deleting === d.id ? '…' : '🗑 Delete'}
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  )
}

// ── Main DashboardPanel ────────────────────────────────────────────────────────
export default function DashboardPanel({ showToast }) {
  const { me, token } = useAuth()
  const { syllabi, docs, adminStats, setActivePanel } = useApp()
  const role = me?.role || 'student'

  return (
    <div className="panel active" style={{ padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {role === 'student' && (
          <StudentDashboard me={me} syllabi={syllabi} docs={docs} navigate={setActivePanel} />
        )}
        {role === 'teacher' && (
          <TeacherDashboard me={me} syllabi={syllabi} docs={docs} navigate={setActivePanel} />
        )}
        {role === 'parent' && (
          <ParentDashboard me={me} navigate={setActivePanel} />
        )}
        {role === 'institute_admin' && (
          <SchoolAdminDashboard me={me} adminStats={adminStats} navigate={setActivePanel} token={token} showToast={showToast} />
        )}
        {role === 'admin' && (
          <PlatformAdminDashboard me={me} adminStats={adminStats} navigate={setActivePanel} token={token} showToast={showToast} />
        )}
      </div>
    </div>
  )
}
