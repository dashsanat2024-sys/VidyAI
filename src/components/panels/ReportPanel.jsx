/**
 * ReportPanel.jsx — Reporting Module
 *
 * Three tabs:
 *  1. Individual Reports  — list of all evaluations, filterable; per-student PDF download
 *  2. Class Report        — aggregate for one exam: charts, question difficulty, leaderboard
 *  3. Student History     — trend for one student across exams
 *
 * Backend endpoints used:
 *  GET /api/evaluations           — list with filters
 *  GET /api/evaluations/report/:id — PDF download
 *  GET /api/exams/:id/class-report — class aggregate
 *  GET /api/students/:roll/history — student trend
 *  GET /api/exams                 — exam selector
 *  POST /api/evaluations/send-report — email to parent
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'

const API = import.meta.env.VITE_API_URL || ''

async function apiFetch(path, opts = {}, token) {
  const res = await fetch(`${API}/api${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) { const e = new Error(data.error || `HTTP ${res.status}`); e.data = data; throw e }
  return data
}

// ── Colour tokens ──────────────────────────────────────────────────────────────
const C = {
  indigo: '#4f46e5', indigoLight: '#eef2ff', indigoBorder: '#c7d2fe',
  green:  '#059669', greenLight:  '#ecfdf5', greenBorder:  '#86efac',
  red:    '#dc2626', redLight:    '#fef2f2', redBorder:    '#fecaca',
  amber:  '#d97706', amberLight:  '#fffbeb', amberBorder:  '#fde68a',
  purple: '#7c3aed', purpleLight: '#f5f3ff', purpleBorder: '#ddd6fe',
  slate:  '#64748b', slateLight:  '#f8fafc', slateBorder:  '#e2e8f0',
}

const S = {
  panel:  { minHeight: '100%', background: '#f8fafc', fontFamily: "'DM Sans', system-ui, sans-serif" },
  header: { background: '#fff', borderBottom: `1px solid ${C.slateBorder}`,
             padding: '20px 28px 0', position: 'sticky', top: 0, zIndex: 10 },
  body:   { padding: '24px 28px' },
  card:   { background: '#fff', borderRadius: '14px', border: `1px solid ${C.slateBorder}`,
             padding: '20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,.05)' },
  label:  { fontSize: '12px', fontWeight: '700', color: C.slate,
             display: 'block', marginBottom: '5px',
             textTransform: 'uppercase', letterSpacing: '0.04em' },
  input:  { padding: '9px 12px', border: `1.5px solid ${C.slateBorder}`,
             borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit',
             outline: 'none', color: '#0f172a', width: '100%', boxSizing: 'border-box' },
  select: { padding: '9px 12px', border: `1.5px solid ${C.slateBorder}`,
             borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit',
             outline: 'none', color: '#0f172a', width: '100%', boxSizing: 'border-box',
             background: '#fff', cursor: 'pointer' },
  tab:    (a) => ({
    padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '14px', fontWeight: a ? '600' : '400',
    color: a ? C.purple : C.slate,
    borderBottom: `2px solid ${a ? C.purple : 'transparent'}`,
    transition: 'all .15s',
  }),
  btn:    (v='primary', extra={}) => ({
    padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '13px', fontWeight: '600',
    display: 'inline-flex', alignItems: 'center', gap: '5px', transition: 'all .15s', ...extra,
    ...(v==='primary' ? { background:`linear-gradient(135deg,${C.purple},${C.indigo})`,
          color: '#fff', boxShadow: '0 2px 8px rgba(124,58,237,.2)' }
      : v==='ghost'   ? { background: C.slateLight, color: C.slate, border:`1px solid ${C.slateBorder}` }
      : v==='success' ? { background: C.greenLight, color: C.green, border:`1px solid ${C.greenBorder}` }
      : v==='danger'  ? { background: C.redLight,   color: C.red,   border:`1px solid ${C.redBorder}` }
      : {}),
  }),
  spinner: { width:'18px', height:'18px', border:`2px solid ${C.slateBorder}`,
              borderTop:`2px solid ${C.purple}`, borderRadius:'50%',
              animation:'spin .7s linear infinite', display:'inline-block' },
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const grade_color = (pct) =>
  pct >= 70 ? C.green : pct >= 50 ? C.amber : C.red
const grade_bg = (pct) =>
  pct >= 70 ? C.greenLight : pct >= 50 ? C.amberLight : C.redLight

function GradeBadge({ pct, grade, size = 13 }) {
  return (
    <span style={{ fontSize: `${size}px`, fontWeight: '700', padding: '2px 8px',
      borderRadius: '6px', background: grade_bg(pct), color: grade_color(pct) }}>
      {grade}
    </span>
  )
}

function PctBar({ pct, height = 6 }) {
  return (
    <div style={{ height: `${height}px`, background: C.slateBorder,
      borderRadius: '999px', overflow: 'hidden', marginTop: '4px' }}>
      <div style={{ height: '100%', width: `${Math.min(100,pct)}%`,
        background: grade_color(pct), borderRadius: '999px',
        transition: 'width .6s ease' }} />
    </div>
  )
}

function StatCard({ label, value, sub, color, bg, border, icon }) {
  return (
    <div style={{ background: bg || C.slateLight, borderRadius: '12px',
      padding: '16px', border: `1px solid ${border || C.slateBorder}`,
      textAlign: 'center' }}>
      {icon && <div style={{ fontSize: '22px', marginBottom: '4px' }}>{icon}</div>}
      <div style={{ fontSize: '26px', fontWeight: '800', color: color || '#0f172a',
        lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '11px', fontWeight: '600', color: C.slate,
        marginTop: '4px', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: C.slate, marginTop: '2px' }}>{sub}</div>}
    </div>
  )
}

// ── ExamPicker: shared across tabs ────────────────────────────────────────────
function ExamPicker({ token, value, onChange }) {
  const [exams, setExams]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/exams', {}, token).then(d => setExams(d.exams || []))
      .catch(() => apiFetch('/questions', {}, token).then(d => setExams(d.exams || [])))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <select style={S.select} value={value} onChange={e => onChange(e.target.value)}
      disabled={loading}>
      <option value="">{loading ? 'Loading…' : '— Select Exam —'}</option>
      {exams.map(e => (
        <option key={e.exam_id} value={e.exam_id}>
          {e.syllabus_name || e.subject || 'Exam'} — {e.objective_count}obj +{' '}
          {e.subjective_count}subj ({e.total_marks}m)
          {e.exam_date ? ` · ${e.exam_date}` : ''}
        </option>
      ))}
    </select>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 1: Individual Reports
// ══════════════════════════════════════════════════════════════════════════════
function IndividualReports({ token, showToast }) {
  const [evals, setEvals]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [examFilter, setExam]   = useState('')
  const [nameFilter, setName]   = useState('')
  const [sending, setSending]   = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (examFilter) params.set('exam_id', examFilter)
    if (nameFilter) params.set('student_name', nameFilter)
    apiFetch(`/evaluations?${params}`, {}, token)
      .then(d => setEvals(d.evaluations || []))
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [token, examFilter, nameFilter])

  useEffect(() => { load() }, [load])

  const handleEmail = async (ev) => {
    if (!ev.parent_email) {
      showToast('No parent email recorded for this evaluation', 'error'); return
    }
    setSending(ev.evaluation_id)
    try {
      await apiFetch('/evaluations/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluation_id: ev.evaluation_id,
          parent_email:  ev.parent_email,
          student_name:  ev.student_name,
        }),
      }, token)
      showToast(`Report sent to ${ev.parent_email}`, 'success')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSending(null)
    }
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ ...S.card, padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px',
          alignItems: 'end' }}>
          <div>
            <label style={S.label}>Filter by Exam</label>
            <ExamPicker token={token} value={examFilter} onChange={setExam} />
          </div>
          <div>
            <label style={S.label}>Filter by Student Name</label>
            <input style={S.input} value={nameFilter} placeholder="Student name…"
              onChange={e => setName(e.target.value)} />
          </div>
          <button style={S.btn('ghost')} onClick={load}>🔄 Refresh</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'40px', color: C.slate }}>
          <div style={{ ...S.spinner, margin:'0 auto 12px' }} /><br/>Loading reports…
        </div>
      ) : evals.length === 0 ? (
        <div style={{ ...S.card, textAlign:'center', padding:'40px', color: C.slate }}>
          <div style={{ fontSize:'32px', marginBottom:'12px' }}>📊</div>
          <div style={{ fontWeight:'600', marginBottom:'6px' }}>No evaluations yet</div>
          <div style={{ fontSize:'13px' }}>
            Upload answer sheets in Evaluation Central to see reports here
          </div>
        </div>
      ) : (
        <div style={S.card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
            marginBottom:'14px' }}>
            <div style={{ fontWeight:'700', color:'#0f172a', fontSize:'15px' }}>
              {evals.length} Evaluation{evals.length !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize:'12px', color: C.slate }}>
              Pass rate: {Math.round(evals.filter(e=>e.is_pass).length/evals.length*100)}%
            </div>
          </div>

          {/* Table header */}
          <div style={{ display:'grid',
            gridTemplateColumns:'1fr 100px 80px 60px 70px 110px 80px',
            gap:'8px', padding:'8px 12px',
            background: C.slateLight, borderRadius:'8px',
            fontSize:'11px', fontWeight:'700', color: C.slate,
            textTransform:'uppercase', letterSpacing:'.04em', marginBottom:'6px' }}>
            <span>Student</span>
            <span>Exam</span>
            <span>Marks</span>
            <span>%</span>
            <span>Grade</span>
            <span>Date</span>
            <span>Actions</span>
          </div>

          {evals.map(ev => (
            <div key={ev.evaluation_id} style={{ display:'grid',
              gridTemplateColumns:'1fr 100px 80px 60px 70px 110px 80px',
              gap:'8px', padding:'10px 12px', borderRadius:'8px',
              border:`1px solid ${ev.is_pass ? C.greenBorder : C.redBorder}`,
              background: ev.is_pass ? '#fafffe' : '#fffafa',
              marginBottom:'6px', alignItems:'center', fontSize:'13px' }}>

              <div>
                <div style={{ fontWeight:'600', color:'#0f172a' }}>
                  {ev.student_name || '—'}
                </div>
                <div style={{ fontSize:'11px', color: C.slate }}>
                  Roll: {ev.roll_no || '—'}
                </div>
              </div>

              <div style={{ fontSize:'11px', color: C.slate, lineHeight:1.4 }}>
                {(ev.exam_name || ev.subject || '—').slice(0,20)}
              </div>

              <div style={{ fontWeight:'600' }}>
                {ev.total_awarded}/{ev.total_possible}
              </div>

              <div>
                <div style={{ fontWeight:'700', color: grade_color(ev.percentage) }}>
                  {ev.percentage}%
                </div>
                <PctBar pct={ev.percentage} />
              </div>

              <GradeBadge pct={ev.percentage} grade={ev.grade} />

              <div style={{ fontSize:'11px', color: C.slate }}>
                {ev.created_at?.slice(0,16).replace('T',' ')}
              </div>

              <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                <a
                  href={`${API}/api/evaluations/report/${ev.evaluation_id}?token=${token}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ ...S.btn('ghost', { fontSize:'11px', padding:'4px 8px',
                    textDecoration:'none', display:'inline-flex' }) }}
                >
                  📄 PDF
                </a>
                <button
                  style={S.btn('ghost', { fontSize:'11px', padding:'4px 8px' })}
                  disabled={sending === ev.evaluation_id}
                  onClick={() => handleEmail(ev)}
                >
                  {sending === ev.evaluation_id ? '…' : '📧'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 2: Class Report
// ══════════════════════════════════════════════════════════════════════════════
function ClassReport({ token, showToast }) {
  const [examId, setExamId]   = useState('')
  const [report, setReport]   = useState(null)
  const [loading, setLoading] = useState(false)

  const loadReport = async () => {
    if (!examId) return
    setLoading(true); setReport(null)
    try {
      const d = await apiFetch(`/exams/${examId}/class-report`, {}, token)
      setReport(d)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (examId) loadReport() }, [examId])

  return (
    <div>
      <div style={{ ...S.card, padding:'16px' }}>
        <label style={S.label}>Select Exam</label>
        <ExamPicker token={token} value={examId} onChange={setExamId} />
      </div>

      {loading && (
        <div style={{ textAlign:'center', padding:'40px' }}>
          <div style={{ ...S.spinner, margin:'0 auto 12px' }} />
        </div>
      )}

      {!loading && !examId && (
        <div style={{ ...S.card, textAlign:'center', padding:'48px', color: C.slate }}>
          <div style={{ fontSize:'36px', marginBottom:'12px' }}>🏫</div>
          <div style={{ fontWeight:'600', fontSize:'15px' }}>Select an exam to view the class report</div>
        </div>
      )}

      {report && !loading && (
        <>
          {/* Overview stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'12px',
            marginBottom:'16px' }}>
            <StatCard label="Students" value={report.total_students} icon="👥" />
            <StatCard label="Class Average" value={`${report.class_average}%`}
              color={grade_color(report.class_average)}
              bg={grade_bg(report.class_average)} icon="📊" />
            <StatCard label="Pass Rate" value={`${report.pass_rate}%`}
              color={report.pass_rate >= 60 ? C.green : C.red}
              bg={report.pass_rate >= 60 ? C.greenLight : C.redLight} icon="✅" />
            <StatCard label="Pass" value={report.pass_count} icon="✓"
              color={C.green} bg={C.greenLight} border={C.greenBorder} />
            <StatCard label="Fail" value={report.fail_count} icon="✗"
              color={C.red} bg={C.redLight} border={C.redBorder} />
          </div>

          {/* Score range */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px',
            marginBottom:'16px' }}>
            <div style={S.card}>
              <div style={{ fontWeight:'700', color:'#0f172a', marginBottom:'14px',
                display:'flex', alignItems:'center', gap:'8px' }}>
                <span>📈</span> Grade Distribution
              </div>
              {Object.entries(report.grade_distribution || {})
                .filter(([,v]) => v > 0)
                .sort(([a],[b]) => ['A+','A','B','C','D','F'].indexOf(a) -
                                   ['A+','A','B','C','D','F'].indexOf(b))
                .map(([grade, count]) => {
                  const pct = Math.round(count / report.total_students * 100)
                  const gPct = grade==='A+'?95: grade==='A'?85: grade==='B'?75:
                               grade==='C'?65: grade==='D'?55: 30
                  return (
                    <div key={grade} style={{ display:'flex', alignItems:'center',
                      gap:'10px', marginBottom:'8px' }}>
                      <div style={{ width:'28px', height:'28px', borderRadius:'6px',
                        background: grade_bg(gPct), color: grade_color(gPct),
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontWeight:'800', fontSize:'12px', flexShrink:0 }}>{grade}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', justifyContent:'space-between',
                          fontSize:'12px', marginBottom:'3px' }}>
                          <span style={{ fontWeight:'600' }}>{count} student{count!==1?'s':''}</span>
                          <span style={{ color: C.slate }}>{pct}%</span>
                        </div>
                        <div style={{ height:'8px', background: C.slateBorder,
                          borderRadius:'999px', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`,
                            background: grade_color(gPct), borderRadius:'999px' }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>

            <div style={S.card}>
              <div style={{ fontWeight:'700', color:'#0f172a', marginBottom:'14px',
                display:'flex', alignItems:'center', gap:'8px' }}>
                <span>⚠️</span> Weakest Questions
              </div>
              {(report.weak_questions || []).length === 0 ? (
                <div style={{ color: C.green, fontSize:'13px' }}>
                  ✓ No question below 50% accuracy
                </div>
              ) : (
                (report.weak_questions || []).map(q => (
                  <div key={q.question_id} style={{ marginBottom:'10px',
                    padding:'10px', borderRadius:'8px',
                    background: q.accuracy_pct < 30 ? C.redLight : C.amberLight,
                    border:`1px solid ${q.accuracy_pct < 30 ? C.redBorder : C.amberBorder}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between',
                      marginBottom:'4px' }}>
                      <span style={{ fontWeight:'700', fontSize:'12px',
                        color: q.accuracy_pct < 30 ? C.red : C.amber }}>
                        Q{q.question_id}
                      </span>
                      <span style={{ fontWeight:'700', fontSize:'12px',
                        color: q.accuracy_pct < 30 ? C.red : C.amber }}>
                        {q.accuracy_pct}% accuracy
                      </span>
                    </div>
                    <div style={{ fontSize:'12px', color:'#374151' }}>
                      {q.question?.slice(0,70)}{q.question?.length > 70 ? '…' : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Question accuracy table */}
          <div style={S.card}>
            <div style={{ fontWeight:'700', color:'#0f172a', marginBottom:'14px',
              display:'flex', alignItems:'center', gap:'8px' }}>
              <span>🎯</span> Question-wise Accuracy
            </div>
            <div style={{ display:'grid',
              gridTemplateColumns:'50px 1fr 70px 70px 80px',
              gap:'8px', padding:'6px 10px',
              background: C.slateLight, borderRadius:'6px',
              fontSize:'11px', fontWeight:'700', color: C.slate,
              textTransform:'uppercase', marginBottom:'6px' }}>
              <span>Q#</span><span>Question</span>
              <span>Type</span><span>Avg Marks</span><span>Accuracy</span>
            </div>
            {(report.question_accuracy || []).map(q => (
              <div key={q.question_id} style={{ display:'grid',
                gridTemplateColumns:'50px 1fr 70px 70px 80px',
                gap:'8px', padding:'8px 10px', borderRadius:'8px',
                background: q.accuracy_pct < 50 ? (q.accuracy_pct < 30 ? C.redLight : C.amberLight) : '#fff',
                border:`1px solid ${q.accuracy_pct < 50 ? (q.accuracy_pct < 30 ? C.redBorder : C.amberBorder) : C.slateBorder}`,
                marginBottom:'5px', alignItems:'center', fontSize:'12px' }}>
                <span style={{ fontWeight:'700',
                  color: q.accuracy_pct < 50 ? (q.accuracy_pct < 30 ? C.red : C.amber) : C.indigo }}>
                  Q{q.question_id}
                </span>
                <span style={{ color:'#374151' }}>
                  {q.question?.slice(0,60)}{q.question?.length > 60 ? '…' : ''}
                </span>
                <span style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'999px',
                  background: q.type==='objective' ? C.indigoLight : C.greenLight,
                  color: q.type==='objective' ? C.indigo : C.green, fontWeight:'600' }}>
                  {q.type==='objective' ? 'MCQ' : 'Written'}
                </span>
                <span style={{ fontWeight:'600' }}>
                  {q.avg_awarded}/{q.max_marks}
                </span>
                <div>
                  <span style={{ fontWeight:'700',
                    color: grade_color(q.accuracy_pct) }}>
                    {q.accuracy_pct}%
                  </span>
                  <PctBar pct={q.accuracy_pct} />
                </div>
              </div>
            ))}
          </div>

          {/* Student leaderboard */}
          <div style={S.card}>
            <div style={{ fontWeight:'700', color:'#0f172a', marginBottom:'14px',
              display:'flex', alignItems:'center', gap:'8px' }}>
              <span>🏆</span> Student Results
            </div>
            {(report.student_rows || []).map((s, i) => (
              <div key={s.evaluation_id} style={{ display:'flex', alignItems:'center',
                gap:'12px', padding:'10px 12px', borderRadius:'8px',
                border:`1px solid ${s.is_pass ? C.greenBorder : C.redBorder}`,
                background: s.is_pass ? '#fafffe' : '#fffafa',
                marginBottom:'6px' }}>
                <div style={{ width:'28px', height:'28px', borderRadius:'50%',
                  background: i < 3 ? ['#f59e0b','#94a3b8','#cd7c3a'][i] : C.slateLight,
                  color: i < 3 ? '#fff' : C.slate,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:'800', fontSize:'12px', flexShrink:0 }}>
                  {i+1}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:'600', fontSize:'14px', color:'#0f172a' }}>
                    {s.student_name || '—'}
                  </div>
                  <div style={{ fontSize:'11px', color: C.slate }}>
                    Roll: {s.roll_no || '—'}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:'700', fontSize:'16px',
                    color: grade_color(s.percentage) }}>
                    {s.percentage}%
                  </div>
                  <div style={{ fontSize:'11px', color: C.slate }}>
                    {s.total_awarded}/{s.total_possible} marks
                  </div>
                </div>
                <GradeBadge pct={s.percentage} grade={s.grade} size={14} />
                <a
                  href={`${API}/api/evaluations/report/${s.evaluation_id}?token=${token}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ ...S.btn('ghost', { fontSize:'11px', padding:'5px 10px',
                    textDecoration:'none', display:'inline-flex', flexShrink:0 }) }}
                >
                  📄 Report
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 3: Student History
// ══════════════════════════════════════════════════════════════════════════════
function StudentHistory({ token, showToast }) {
  const [rollNo, setRollNo]   = useState('')
  const [input, setInput]     = useState('')
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    const r = input.trim()
    if (!r) return
    setLoading(true); setHistory(null)
    try {
      const d = await apiFetch(`/students/${encodeURIComponent(r)}/history`, {}, token)
      setHistory(d); setRollNo(r)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const trendIcon  = history?.trend === 'improving' ? '📈' :
                     history?.trend === 'declining'  ? '📉' : '➡️'
  const trendColor = history?.trend === 'improving' ? C.green :
                     history?.trend === 'declining'  ? C.red   : C.amber

  return (
    <div>
      <div style={{ ...S.card, padding:'16px' }}>
        <label style={S.label}>Student Roll Number</label>
        <div style={{ display:'flex', gap:'10px' }}>
          <input style={{ ...S.input, flex:1 }} value={input} placeholder="Enter roll number…"
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()} />
          <button style={S.btn('primary')} onClick={load} disabled={loading || !input.trim()}>
            {loading ? <span style={S.spinner} /> : '🔍 Search'}
          </button>
        </div>
      </div>

      {!history && !loading && (
        <div style={{ ...S.card, textAlign:'center', padding:'48px', color: C.slate }}>
          <div style={{ fontSize:'36px', marginBottom:'12px' }}>👤</div>
          <div style={{ fontWeight:'600', fontSize:'15px' }}>
            Enter a roll number to view student history
          </div>
        </div>
      )}

      {history && (
        <>
          {/* Student overview */}
          <div style={{ ...S.card, background:`linear-gradient(135deg,${C.purpleLight},#faf5ff)`,
            border:`1.5px solid ${C.purpleBorder}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:'16px',
              marginBottom:'16px' }}>
              <div style={{ width:'52px', height:'52px', borderRadius:'50%',
                background: C.purple, color:'#fff', display:'flex',
                alignItems:'center', justifyContent:'center',
                fontWeight:'800', fontSize:'20px', flexShrink:0 }}>
                {(history.student_name || rollNo).slice(0,1).toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:'700', fontSize:'17px', color:'#0f172a' }}>
                  {history.student_name || `Roll No. ${rollNo}`}
                </div>
                <div style={{ fontSize:'13px', color: C.slate, marginTop:'2px' }}>
                  Roll: {rollNo} · {history.total_exams} exam{history.total_exams !== 1 ? 's' : ''} taken
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:'28px', fontWeight:'800',
                  color: grade_color(history.average) }}>{history.average}%</div>
                <div style={{ fontSize:'12px', color: C.slate }}>Overall Average</div>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
              <StatCard label="Exams Taken" value={history.total_exams} icon="📝" />
              <StatCard label="Average Score" value={`${history.average}%`}
                color={grade_color(history.average)} bg={grade_bg(history.average)} icon="📊" />
              <div style={{ background: grade_bg(history.average), borderRadius:'12px',
                padding:'16px', border:`1px solid ${C.purpleBorder}`, textAlign:'center' }}>
                <div style={{ fontSize:'28px', marginBottom:'4px' }}>{trendIcon}</div>
                <div style={{ fontWeight:'800', color: trendColor, fontSize:'14px',
                  textTransform:'capitalize' }}>{history.trend}</div>
                <div style={{ fontSize:'11px', color: C.slate, marginTop:'2px',
                  textTransform:'uppercase', letterSpacing:'.04em' }}>Trend</div>
              </div>
            </div>
          </div>

          {/* Performance timeline */}
          <div style={S.card}>
            <div style={{ fontWeight:'700', color:'#0f172a', marginBottom:'16px',
              display:'flex', alignItems:'center', gap:'8px' }}>
              <span>📅</span> Performance Timeline
            </div>

            {history.history.length === 0 ? (
              <div style={{ color: C.slate, textAlign:'center', padding:'20px' }}>
                No evaluation history found
              </div>
            ) : (
              history.history.map((h, i) => {
                const isFirst = i === 0
                const prev    = i > 0 ? history.history[i-1].percentage : null
                const delta   = prev !== null ? h.percentage - prev : null
                return (
                  <div key={h.evaluation_id} style={{ display:'flex', gap:'14px',
                    marginBottom:'12px' }}>
                    {/* Timeline dot */}
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
                      flexShrink:0 }}>
                      <div style={{ width:'14px', height:'14px', borderRadius:'50%',
                        background: grade_color(h.percentage), flexShrink:0 }} />
                      {i < history.history.length - 1 && (
                        <div style={{ width:'2px', flex:1, background: C.slateBorder,
                          marginTop:'4px', minHeight:'20px' }} />
                      )}
                    </div>
                    {/* Content */}
                    <div style={{ flex:1, padding:'12px 14px', borderRadius:'10px',
                      background: grade_bg(h.percentage),
                      border:`1px solid ${h.is_pass ? C.greenBorder : C.redBorder}`,
                      marginBottom:'4px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between',
                        alignItems:'flex-start' }}>
                        <div>
                          <div style={{ fontWeight:'600', fontSize:'14px', color:'#0f172a' }}>
                            {h.exam_name || h.subject || 'Exam'}
                          </div>
                          <div style={{ fontSize:'12px', color: C.slate, marginTop:'2px' }}>
                            {h.created_at?.slice(0,10)}
                          </div>
                        </div>
                        <div style={{ textAlign:'right', display:'flex',
                          alignItems:'center', gap:'8px' }}>
                          {delta !== null && (
                            <span style={{ fontSize:'12px', fontWeight:'700',
                              color: delta > 0 ? C.green : delta < 0 ? C.red : C.amber }}>
                              {delta > 0 ? `+${delta.toFixed(1)}%` :
                               delta < 0 ? `${delta.toFixed(1)}%` : '→'}
                            </span>
                          )}
                          <div>
                            <div style={{ fontWeight:'800', fontSize:'18px',
                              color: grade_color(h.percentage) }}>
                              {h.percentage}%
                            </div>
                            <div style={{ fontSize:'11px', color: C.slate }}>
                              {h.total_awarded}/{h.total_possible}m
                            </div>
                          </div>
                          <GradeBadge pct={h.percentage} grade={h.grade} />
                          <a href={`${API}/api/evaluations/report/${h.evaluation_id}?token=${token}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ ...S.btn('ghost', { fontSize:'11px', padding:'4px 8px',
                              textDecoration:'none', display:'inline-flex' }) }}>
                            📄
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Main ReportPanel
// ══════════════════════════════════════════════════════════════════════════════
export default function ReportPanel({ showToast }) {
  const { token } = useAuth()
  const [tab, setTab] = useState('individual')

  const tabs = [
    { id: 'individual', label: '📋 Individual Reports' },
    { id: 'class',      label: '🏫 Class Report'       },
    { id: 'history',    label: '📈 Student History'    },
  ]

  return (
    <div style={S.panel}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        input:focus, select:focus {
          border-color: ${C.purple} !important;
          box-shadow: 0 0 0 3px rgba(124,58,237,.1);
        }
      `}</style>

      <div style={S.header}>
        <div style={{ display:'flex', alignItems:'center', marginBottom:'0' }}>
          <h1 style={{ margin:0, fontSize:'22px', fontWeight:'700', color:'#0f172a',
            display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
            <span>📊</span> Reports
          </h1>
        </div>
        <div style={{ display:'flex', gap:'0' }}>
          {tabs.map(t => (
            <button key={t.id} style={S.tab(tab === t.id)} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={S.body}>
        {tab === 'individual' && <IndividualReports token={token} showToast={showToast} />}
        {tab === 'class'      && <ClassReport       token={token} showToast={showToast} />}
        {tab === 'history'    && <StudentHistory     token={token} showToast={showToast} />}
      </div>
    </div>
  )
}
