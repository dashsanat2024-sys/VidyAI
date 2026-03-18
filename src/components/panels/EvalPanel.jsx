import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { apiGet, apiPost, apiPostForm } from '../../utils/api'

// ── Grade helper ─────────────────────────────────────────────────────────────
function getGrade(pct) {
  if (pct >= 90) return { grade: 'A+', label: 'Outstanding',  color: '#065f46', bg: '#d1fae5' }
  if (pct >= 80) return { grade: 'A',  label: 'Excellent',    color: '#065f46', bg: '#d1fae5' }
  if (pct >= 70) return { grade: 'B+', label: 'Very Good',    color: '#1e40af', bg: '#dbeafe' }
  if (pct >= 60) return { grade: 'B',  label: 'Good',         color: '#1e40af', bg: '#dbeafe' }
  if (pct >= 50) return { grade: 'C',  label: 'Average',      color: '#92400e', bg: '#fef3c7' }
  if (pct >= 40) return { grade: 'D',  label: 'Below Average',color: '#92400e', bg: '#fef3c7' }
  return         { grade: 'F',  label: 'Fail',          color: '#991b1b', bg: '#fee2e2' }
}

// ── Print a full school-style parent report ───────────────────────────────────
function printParentReport({ evaluation, examMeta, schoolName, teacherName }) {
  const res    = evaluation.result || {}
  const pct    = res.percentage || 0
  const g      = getGrade(pct)
  const qwise  = res.question_wise || []
  const objQs  = qwise.filter(q => q.type === 'objective')
  const subjQs = qwise.filter(q => q.type === 'subjective')

  const win = window.open('', '_blank')
  win.document.write(`<!DOCTYPE html><html>
  <head>
    <title>Performance Report — ${evaluation.student_name || 'Student'}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Times New Roman',serif;font-size:11pt;color:#111;padding:30px 40px;background:#fff}
      /* Header */
      .logo-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
      .school-name{font-size:20pt;font-weight:800;letter-spacing:.5px;color:#1e293b}
      .report-badge{background:#1e293b;color:#fff;padding:4px 16px;border-radius:4px;font-size:10pt;font-weight:700;letter-spacing:1px}
      .hr-thick{border:none;border-top:3px solid #1e293b;margin:10px 0 6px}
      .hr-thin{border:none;border-top:1px solid #94a3b8;margin:6px 0}
      /* Student info strip */
      .info-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1.5px solid #1e293b;margin:14px 0}
      .info-cell{padding:8px 12px;border-right:1px solid #cbd5e1}
      .info-cell:last-child{border-right:none}
      .info-label{font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#64748b;margin-bottom:3px}
      .info-val{font-size:11pt;font-weight:700;color:#1e293b}
      /* Score hero */
      .score-section{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:14px;margin:16px 0}
      .score-card{border-radius:8px;padding:16px;text-align:center;border:1.5px solid #e2e8f0}
      .score-num{font-size:28pt;font-weight:800;line-height:1}
      .score-label{font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-top:6px;color:#64748b}
      /* Grade badge */
      .grade-badge{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26pt;font-weight:900;border:3px solid currentColor;margin:0 auto 6px}
      /* Progress bar */
      .progress-wrap{background:#e2e8f0;border-radius:50px;height:10px;margin:12px 0 4px;overflow:hidden}
      .progress-fill{height:100%;border-radius:50px;transition:.3s}
      /* Section title */
      .sec-title{font-size:12pt;font-weight:800;text-transform:uppercase;letter-spacing:.7px;border-bottom:2px solid #1e293b;padding-bottom:6px;margin:20px 0 12px;color:#1e293b}
      /* Question rows */
      .q-row{display:grid;grid-template-columns:36px 1fr 80px 70px 90px;gap:0;border-bottom:1px solid #f1f5f9;padding:8px 0;align-items:start}
      .q-row:last-child{border-bottom:none}
      .q-num{font-weight:800;color:#64748b;font-size:10pt}
      .q-text{font-size:10pt;line-height:1.5}
      .q-ans{font-size:9pt;color:#475569;padding:0 8px}
      .q-marks{font-size:10pt;font-weight:700;text-align:right;padding:0 8px}
      .q-status{font-size:9pt;font-weight:700;text-align:center}
      .correct{color:#065f46}.wrong{color:#991b1b}.partial{color:#92400e}
      .col-header{font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:#94a3b8;border-bottom:1.5px solid #cbd5e1;padding-bottom:6px;margin-bottom:4px}
      /* Feedback box */
      .feedback-box{background:#f8fafc;border-left:4px solid #3b82f6;padding:14px 18px;border-radius:0 8px 8px 0;margin:14px 0;font-size:10pt;line-height:1.7}
      /* Improvement table */
      .improvement-table{width:100%;border-collapse:collapse;font-size:10pt;margin-top:10px}
      .improvement-table th{background:#1e293b;color:#fff;padding:8px 12px;text-align:left;font-weight:700}
      .improvement-table td{padding:8px 12px;border-bottom:1px solid #e2e8f0}
      .improvement-table tr:last-child td{border-bottom:none}
      .improvement-table tr:nth-child(even) td{background:#f8fafc}
      /* Footer */
      .footer{margin-top:28px;padding-top:14px;border-top:1.5px solid #1e293b;display:flex;justify-content:space-between;align-items:flex-end;font-size:9.5pt}
      .signature-line{border-bottom:1px solid #64748b;min-width:160px;margin-top:28px}
      .watermark{font-size:8pt;color:#94a3b8}
      @media print{body{padding:16px 24px}@page{margin:10mm;size:A4}}
    </style>
  </head>
  <body>
    <!-- Header -->
    <div class="logo-row">
      <div>
        <div class="school-name">${schoolName || 'VidyAI Institution'}</div>
        <div style="font-size:10pt;color:#64748b;margin-top:2px">${examMeta?.syllabus_name || ''}</div>
      </div>
      <div class="report-badge">PERFORMANCE REPORT</div>
    </div>
    <div class="hr-thick"/>
    <div style="font-size:9pt;color:#64748b;text-align:right">Report generated: ${new Date().toLocaleDateString('en-IN', {day:'2-digit',month:'long',year:'numeric'})}</div>

    <!-- Student Info Strip -->
    <div class="info-strip">
      <div class="info-cell">
        <div class="info-label">Student Name</div>
        <div class="info-val">${evaluation.student_name || '—'}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Roll Number</div>
        <div class="info-val">${res.roll_no || '—'}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Class</div>
        <div class="info-val">${examMeta?.class || '—'}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Subject</div>
        <div class="info-val">${examMeta?.subject || examMeta?.syllabus_name?.split('—')[1]?.trim() || '—'}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1.5px solid #1e293b;border-top:none;margin-bottom:16px">
      <div class="info-cell">
        <div class="info-label">Exam Date</div>
        <div class="info-val">${examMeta?.exam_date || new Date().toLocaleDateString('en-IN')}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Teacher</div>
        <div class="info-val">${teacherName || examMeta?.teacher_name || '—'}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Exam ID</div>
        <div class="info-val" style="font-family:monospace;font-size:10pt">${evaluation.exam_id}</div>
      </div>
    </div>

    <!-- Score Hero -->
    <div class="score-section">
      <div class="score-card" style="border-color:${g.color}">
        <div class="grade-badge" style="color:${g.color};border-color:${g.color}">${g.grade}</div>
        <div class="score-label">${g.label}</div>
      </div>
      <div class="score-card">
        <div class="score-num" style="color:#1e293b">${res.total_awarded ?? 0}<span style="font-size:14pt;color:#94a3b8">/${res.total_possible ?? 0}</span></div>
        <div class="score-label">Marks Obtained</div>
      </div>
      <div class="score-card">
        <div class="score-num" style="color:${g.color}">${pct}%</div>
        <div class="score-label">Percentage</div>
        <div class="progress-wrap"><div class="progress-fill" style="width:${pct}%;background:${g.color}"></div></div>
      </div>
      <div class="score-card" style="background:${res.is_pass ? '#d1fae5' : '#fee2e2'};border-color:${res.is_pass ? '#065f46' : '#991b1b'}">
        <div class="score-num" style="color:${res.is_pass ? '#065f46' : '#991b1b'}">${res.is_pass ? '✓' : '✗'}</div>
        <div class="score-label" style="color:${res.is_pass ? '#065f46' : '#991b1b'}">${res.is_pass ? 'PASS' : 'FAIL'}</div>
        <div style="font-size:9pt;color:#64748b;margin-top:4px">Pass mark: 40%</div>
      </div>
    </div>

    ${objQs.length > 0 ? `
    <!-- Objective Questions -->
    <div class="sec-title">Section A — Objective Questions</div>
    <div class="q-row col-header">
      <div>Q#</div><div>Question</div><div>Student Ans.</div><div>Marks</div><div>Result</div>
    </div>
    ${objQs.map((q, i) => {
      const awarded = parseFloat(q.awarded_marks || 0)
      const max     = parseFloat(q.max_marks || 1)
      const correct = q.is_correct
      return `<div class="q-row">
        <div class="q-num">Q${i+1}</div>
        <div class="q-text">${q.student_answer ? q.question || '' : (q.question || '').substring(0,80)}</div>
        <div class="q-ans">${q.student_answer || '—'}</div>
        <div class="q-marks ${correct ? 'correct' : 'wrong'}">${awarded}/${max}</div>
        <div class="q-status ${correct ? 'correct' : 'wrong'}">${correct ? '✓ Correct' : '✗ Wrong'}</div>
      </div>`
    }).join('')}` : ''}

    ${subjQs.length > 0 ? `
    <!-- Subjective Questions -->
    <div class="sec-title">Section B — Subjective Questions</div>
    ${subjQs.map((q, i) => {
      const awarded = parseFloat(q.awarded_marks || 0)
      const max     = parseFloat(q.max_marks || 1)
      const partial = awarded > 0 && awarded < max
      const statusClass = awarded === max ? 'correct' : awarded === 0 ? 'wrong' : 'partial'
      const statusLabel = awarded === max ? '✓ Full Marks' : awarded === 0 ? '✗ No Marks' : `◑ ${awarded}/${max}`
      return `
      <div style="margin-bottom:16px;padding:14px;border:1px solid #e2e8f0;border-radius:8px;border-left:4px solid ${awarded===max?'#065f46':awarded===0?'#991b1b':'#d97706'}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div style="font-weight:700;font-size:10.5pt">Q${i + objQs.length + 1}. ${q.question || ''}</div>
          <div class="${statusClass}" style="font-weight:800;font-size:11pt;white-space:nowrap;margin-left:12px">${statusLabel}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px">
          <div style="background:#f0fdf4;padding:10px 12px;border-radius:6px">
            <div style="font-size:8pt;font-weight:800;color:#065f46;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">Student's Answer</div>
            <div style="font-size:10pt;line-height:1.5">${q.student_answer || '(No answer provided)'}</div>
          </div>
          <div style="background:#f8fafc;padding:10px 12px;border-radius:6px">
            <div style="font-size:8pt;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">Model Answer</div>
            <div style="font-size:10pt;line-height:1.5">${q.valid_answers?.[0] || '—'}</div>
          </div>
        </div>
        <div style="background:#fffbeb;padding:10px 12px;border-radius:6px;border-left:3px solid #f59e0b">
          <div style="font-size:8pt;font-weight:800;color:#92400e;text-transform:uppercase;margin-bottom:3px">AI Feedback</div>
          <div style="font-size:10pt;line-height:1.5">${q.feedback || 'See model answer above.'}</div>
          ${q.missing_points?.length ? `<div style="margin-top:8px;font-size:9pt;color:#64748b"><b>Missing points:</b> ${q.missing_points.join('; ')}</div>` : ''}
        </div>
      </div>`
    }).join('')}` : ''}

    <!-- AI Improvement Note -->
    ${res.improvement_prediction ? `
    <div class="sec-title">Areas for Improvement</div>
    <div class="feedback-box">${res.improvement_prediction}</div>` : ''}

    <!-- Summary Table -->
    <div class="sec-title">Performance Summary</div>
    <table class="improvement-table">
      <thead>
        <tr><th>Category</th><th>Questions</th><th>Marks Obtained</th><th>Total Marks</th><th>Score %</th></tr>
      </thead>
      <tbody>
        ${objQs.length ? `<tr>
          <td>Section A — Objective</td>
          <td>${objQs.length}</td>
          <td>${objQs.reduce((s,q)=>s+parseFloat(q.awarded_marks||0),0)}</td>
          <td>${objQs.reduce((s,q)=>s+parseFloat(q.max_marks||1),0)}</td>
          <td>${objQs.reduce((s,q)=>s+parseFloat(q.max_marks||1),0) ? Math.round(objQs.reduce((s,q)=>s+parseFloat(q.awarded_marks||0),0)/objQs.reduce((s,q)=>s+parseFloat(q.max_marks||1),0)*100) : 0}%</td>
        </tr>` : ''}
        ${subjQs.length ? `<tr>
          <td>Section B — Subjective</td>
          <td>${subjQs.length}</td>
          <td>${subjQs.reduce((s,q)=>s+parseFloat(q.awarded_marks||0),0)}</td>
          <td>${subjQs.reduce((s,q)=>s+parseFloat(q.max_marks||1),0)}</td>
          <td>${subjQs.reduce((s,q)=>s+parseFloat(q.max_marks||1),0) ? Math.round(subjQs.reduce((s,q)=>s+parseFloat(q.awarded_marks||0),0)/subjQs.reduce((s,q)=>s+parseFloat(q.max_marks||1),0)*100) : 0}%</td>
        </tr>` : ''}
        <tr style="font-weight:800;background:#f1f5f9">
          <td>TOTAL</td><td>${qwise.length}</td>
          <td>${res.total_awarded ?? 0}</td>
          <td>${res.total_possible ?? 0}</td>
          <td style="color:${g.color}">${pct}%</td>
        </tr>
      </tbody>
    </table>

    <!-- Footer -->
    <div class="footer">
      <div>
        <div class="signature-line"></div>
        <div style="margin-top:4px;font-size:9pt">${teacherName || 'Teacher'} — Signature</div>
      </div>
      <div style="text-align:center">
        <div class="signature-line"></div>
        <div style="margin-top:4px;font-size:9pt">Principal / HOD — Signature</div>
      </div>
      <div style="text-align:right">
        <div class="watermark">Evaluated by VidyAI · AI-Powered Examination System</div>
        <div class="watermark">Exam ID: ${evaluation.exam_id} · Eval ID: ${evaluation.evaluation_id}</div>
      </div>
    </div>
    <script>window.onload=()=>window.print()</script>
  </body></html>`)
  win.document.close()
}

// ── Build parent email HTML ───────────────────────────────────────────────────
function buildParentEmailHTML({ evaluation, examMeta, schoolName }) {
  const res = evaluation.result || {}
  const pct = res.percentage || 0
  const g   = getGrade(pct)
  return `
<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1e293b">
  <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
    <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:.5px">${schoolName || 'VidyAI Institution'}</div>
    <div style="font-size:13px;color:rgba(255,255,255,.7);margin-top:6px">Academic Performance Report</div>
  </div>
  <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:28px 32px">
    <p style="font-size:15px;margin-bottom:20px">Dear Parent / Guardian,</p>
    <p style="color:#64748b;font-size:14px;margin-bottom:24px">
      Please find below the academic performance report for your ward for the recent examination.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px">
      <tr><td style="padding:10px 14px;background:#f8fafc;font-weight:700;width:40%;border:1px solid #e2e8f0">Student Name</td><td style="padding:10px 14px;border:1px solid #e2e8f0">${evaluation.student_name || '—'}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8fafc;font-weight:700;border:1px solid #e2e8f0">Roll Number</td><td style="padding:10px 14px;border:1px solid #e2e8f0">${res.roll_no || '—'}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8fafc;font-weight:700;border:1px solid #e2e8f0">Subject</td><td style="padding:10px 14px;border:1px solid #e2e8f0">${examMeta?.subject || examMeta?.syllabus_name || '—'}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8fafc;font-weight:700;border:1px solid #e2e8f0">Exam Date</td><td style="padding:10px 14px;border:1px solid #e2e8f0">${examMeta?.exam_date || new Date().toLocaleDateString('en-IN')}</td></tr>
    </table>
    <div style="background:${g.bg};border:2px solid ${g.color};border-radius:10px;padding:20px;text-align:center;margin-bottom:24px">
      <div style="font-size:36px;font-weight:900;color:${g.color}">${g.grade}</div>
      <div style="font-size:22px;font-weight:800;color:${g.color};margin:4px 0">${pct}%</div>
      <div style="font-size:14px;color:${g.color};font-weight:600">${res.total_awarded}/${res.total_possible} marks — ${g.label}</div>
      <div style="margin-top:10px;font-size:13px;font-weight:700;color:${res.is_pass?'#065f46':'#991b1b'};background:${res.is_pass?'#d1fae5':'#fee2e2'};display:inline-block;padding:4px 16px;border-radius:50px">${res.is_pass?'✓ PASS':'✗ FAIL'} — Pass mark 40%</div>
    </div>
    ${res.improvement_prediction ? `
    <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:20px;font-size:13px;line-height:1.7">
      <strong>Teacher's Note:</strong> ${res.improvement_prediction}
    </div>` : ''}
    <p style="font-size:13px;color:#64748b;margin-bottom:20px">
      We encourage you to review this report with your child and discuss any areas that need attention. Please feel free to contact us if you have any queries.
    </p>
    <p style="font-size:13px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:16px;margin-top:20px">
      This report was automatically generated by VidyAI — AI-Powered Examination System.<br/>
      Exam ID: ${evaluation.exam_id} &nbsp;|&nbsp; Evaluation ID: ${evaluation.evaluation_id}
    </p>
  </div>
</div>`
}

// ── Components for individual results (Fixes illegal hook usage in loops) ───
function EvaluationResultItem({ evaluation, examMeta, schoolName, teacherName, emailSending, sendReportEmail }) {
  const [email, setEmail] = useState(evaluation.parent_email || '')
  const r = evaluation.result || {}
  const g = getGrade(r.percentage || 0)

  return (
    <div className="card" style={{ padding: 24, marginBottom: 14, borderLeft: `6px solid ${g.color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--indigo)' }}>{evaluation.student_name || 'Student'}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            Roll: {r.roll_no || '—'} • Exam: {evaluation.exam_id} • Eval ID: {evaluation.evaluation_id}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => printParentReport({ evaluation, examMeta, schoolName, teacherName })}
            style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--sans)', background: 'var(--indigo)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            🖨 Print Report
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ textAlign: 'center', padding: 16, background: g.bg, borderRadius: 10, border: `1.5px solid ${g.color}` }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: g.color }}>{g.grade}</div>
          <div style={{ fontSize: 11, color: g.color, fontWeight: 700 }}>{g.label}</div>
        </div>
        <div style={{ textAlign: 'center', padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{r.total_awarded ?? 0}<span style={{ fontSize: 13, color: 'var(--muted)' }}>/{r.total_possible ?? 0}</span></div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>Marks</div>
        </div>
        <div style={{ textAlign: 'center', padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: g.color }}>{r.percentage ?? 0}%</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>Percentage</div>
        </div>
        <div style={{ textAlign: 'center', padding: 16, background: r.is_pass ? '#d1fae5' : '#fee2e2', borderRadius: 10, border: `1px solid ${r.is_pass ? '#065f46' : '#991b1b'}` }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: r.is_pass ? '#065f46' : '#991b1b' }}>{r.is_pass ? '✓' : '✗'}</div>
          <div style={{ fontSize: 11, color: r.is_pass ? '#065f46' : '#991b1b', fontWeight: 800 }}>{r.is_pass ? 'PASS' : 'FAIL'}</div>
        </div>
      </div>

      {r.improvement_prediction && (
        <div style={{ padding: '12px 16px', background: '#fffbeb', borderLeft: '4px solid #f59e0b', borderRadius: '0 8px 8px 0', fontSize: 13, marginBottom: 16 }}>
          <strong>AI Note:</strong> {r.improvement_prediction}
        </div>
      )}

      {evaluation.extraction_debug?.questions?.length > 0 && (
        <details style={{ marginBottom: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
          <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 800, color: 'var(--indigo)' }}>
            Extraction Debug ({evaluation.extraction_debug.mode || 'unknown'}) • Parsed {evaluation.extraction_debug.parsed_answers_count || 0}/{evaluation.extraction_debug.expected_questions_count || 0}
          </summary>
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, background: '#fff', border: '1px solid #e2e8f0' }}>
              <thead style={{ background: '#f1f5f9' }}>
                <tr>
                  {['Q', 'Type', 'Student Ans', 'Expected', 'Match', 'Score'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evaluation.extraction_debug.questions.map((q, idx) => (
                  <tr key={`${q.question_id}-${idx}`} style={{ borderTop: '1px solid #eef2f7' }}>
                    <td style={{ padding: '8px 10px' }}>Q{q.question_id}</td>
                    <td style={{ padding: '8px 10px', textTransform: 'capitalize' }}>{q.type}</td>
                    <td style={{ padding: '8px 10px' }}>{q.submitted_answer || '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{(q.expected_answers || []).join(', ') || '—'}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: q.type === 'objective' ? (q.objective_match ? 'var(--green)' : 'var(--red)') : 'var(--muted)' }}>
                      {q.type === 'objective' ? (q.objective_match ? 'MATCH' : 'MISMATCH') : 'SUBJECTIVE'}
                    </td>
                    <td style={{ padding: '8px 10px' }}>{q.awarded_marks ?? 0}/{q.max_marks ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '14px 16px', background: 'var(--paper)', borderRadius: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--indigo)', whiteSpace: 'nowrap' }}>📧 Send to Parent:</span>
        <input className="fi" type="email" placeholder="parent@email.com" value={email} onChange={e => setEmail(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <button onClick={() => sendReportEmail(evaluation, email)} disabled={emailSending[evaluation.evaluation_id]}
          style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--sans)', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {emailSending[evaluation.evaluation_id] ? <><span className="spin" />Sending…</> : '📧 Send Report'}
        </button>
      </div>
    </div>
  )
}

function BulkResultRow({ ev, i, examMeta, schoolName, teacherName, emailSending, sendReportEmail, setActiveReport }) {
  const [email, setEmail] = useState(ev.parent_email || '')
  const r = ev.result || {}
  const g = getGrade(r.percentage || 0)

  return (
    <tr style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', cursor: 'pointer' }}
      onClick={e => { if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') setActiveReport(ev) }}>
      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{i + 1}</td>
      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{ev.student_name || '—'}</td>
      <td style={{ padding: '10px 12px' }}>{r.roll_no || '—'}</td>
      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{r.total_awarded ?? 0}/{r.total_possible ?? 0}</td>
      <td style={{ padding: '10px 12px', fontWeight: 800, color: g.color }}>{r.percentage ?? 0}%</td>
      <td style={{ padding: '10px 12px' }}>
        <span style={{ padding: '2px 10px', borderRadius: 50, fontSize: 11, fontWeight: 800, background: g.bg, color: g.color }}>{g.grade}</span>
      </td>
      <td style={{ padding: '10px 12px', fontWeight: 700, color: r.is_pass ? 'var(--green)' : 'var(--red)' }}>
        {r.is_pass ? '✓ Pass' : '✗ Fail'}
      </td>
      <td style={{ padding: '8px 12px' }}>
        <button onClick={e => { e.stopPropagation(); printParentReport({ evaluation: ev, examMeta, schoolName, teacherName }) }}
          style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--sans)', background: 'var(--indigo3)', color: 'var(--indigo)', border: '1px solid var(--indigo2)', borderRadius: 6, cursor: 'pointer' }}>
          🖨 Print
        </button>
      </td>
      <td style={{ padding: '8px 12px' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input className="fi" type="email" placeholder="parent@email.com" value={email} onChange={e2 => setEmail(e2.target.value)} onClick={e => e.stopPropagation()} style={{ padding: '4px 10px', fontSize: 11, width: 160 }} />
          <button onClick={e => { e.stopPropagation(); sendReportEmail(ev, email) }} disabled={emailSending[ev.evaluation_id]}
            style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--sans)', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {emailSending[ev.evaluation_id] ? '…' : '📧 Send'}
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Multi-student class report ────────────────────────────────────────────────
function printClassReport({ evaluations, examMeta, schoolName }) {
  const win = window.open('', '_blank')
  const sorted = [...evaluations].sort((a, b) => (b.result?.percentage || 0) - (a.result?.percentage || 0))
  const avg = evaluations.length
    ? Math.round(evaluations.reduce((s, e) => s + (e.result?.percentage || 0), 0) / evaluations.length)
    : 0
  const passCount = evaluations.filter(e => e.result?.is_pass).length

  win.document.write(`<!DOCTYPE html><html><head>
  <title>Class Report — ${examMeta?.syllabus_name || 'Exam'}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:11pt;padding:28px 36px;color:#1e293b}
    .header{text-align:center;border-bottom:3px solid #1e293b;padding-bottom:14px;margin-bottom:18px}
    .school{font-size:20pt;font-weight:800}.sub{font-size:11pt;color:#64748b;margin-top:4px}
    .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:16px 0}
    .stat{border:1.5px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center}
    .stat-num{font-size:24pt;font-weight:800;color:#1e293b}.stat-lbl{font-size:8pt;text-transform:uppercase;letter-spacing:.5px;color:#64748b;margin-top:4px}
    table{width:100%;border-collapse:collapse;font-size:10pt;margin-top:16px}
    th{background:#1e293b;color:#fff;padding:9px 12px;text-align:left;font-weight:700}
    td{padding:8px 12px;border-bottom:1px solid #f1f5f9}
    tr:nth-child(even) td{background:#f8fafc}
    .pass{color:#065f46;font-weight:700}.fail{color:#991b1b;font-weight:700}
    .grade{display:inline-block;padding:2px 10px;border-radius:50px;font-weight:800;font-size:9pt}
    @media print{body{padding:14px 20px}@page{margin:8mm;size:A4 landscape}}
  </style></head>
  <body>
    <div class="header">
      <div class="school">${schoolName || 'VidyAI Institution'}</div>
      <div class="sub">Class Performance Report — ${examMeta?.syllabus_name || 'Examination'}</div>
      <div class="sub">Date: ${examMeta?.exam_date || new Date().toLocaleDateString('en-IN')} &nbsp;|&nbsp; Exam ID: ${examMeta?.exam_id || '—'}</div>
    </div>
    <div class="stats">
      <div class="stat"><div class="stat-num">${evaluations.length}</div><div class="stat-lbl">Total Students</div></div>
      <div class="stat"><div class="stat-num">${avg}%</div><div class="stat-lbl">Class Average</div></div>
      <div class="stat"><div class="stat-num" style="color:#065f46">${passCount}</div><div class="stat-lbl">Passed</div></div>
      <div class="stat"><div class="stat-num" style="color:#991b1b">${evaluations.length - passCount}</div><div class="stat-lbl">Failed</div></div>
    </div>
    <table>
      <thead><tr>
        <th>Rank</th><th>Student Name</th><th>Roll No.</th>
        <th>Marks</th><th>Percentage</th><th>Grade</th><th>Result</th>
      </tr></thead>
      <tbody>
        ${sorted.map((ev, i) => {
          const r = ev.result || {}
          const g = getGrade(r.percentage || 0)
          return `<tr>
            <td style="font-weight:700">${i+1}${i===0?' 🥇':i===1?' 🥈':i===2?' 🥉':''}</td>
            <td>${ev.student_name || '—'}</td>
            <td>${r.roll_no || '—'}</td>
            <td>${r.total_awarded ?? 0}/${r.total_possible ?? 0}</td>
            <td style="font-weight:700">${r.percentage ?? 0}%</td>
            <td><span class="grade" style="background:${g.bg};color:${g.color}">${g.grade}</span></td>
            <td class="${r.is_pass ? 'pass' : 'fail'}">${r.is_pass ? '✓ Pass' : '✗ Fail'}</td>
          </tr>`
        }).join('')}
      </tbody>
    </table>
    <div style="margin-top:20px;font-size:9pt;color:#94a3b8;text-align:right">
      Generated by VidyAI AI Evaluation System · ${new Date().toLocaleDateString('en-IN')}
    </div>
    <script>window.onload=()=>window.print()</script>
  </body></html>`)
  win.document.close()
}

// ─────────────────────────────────────────────────────────────────────────────
export default function EvalPanel({ showToast }) {
  const { token } = useAuth()

  const [exams,         setExams]         = useState([])
  const [selectedExam,  setSelectedExam]  = useState('')
  const [examMeta,      setExamMeta]      = useState(null)
  const [evalMode,      setEvalMode]      = useState('single')
  const [answerFile,    setAnswerFile]    = useState(null)
  const [rollNo,        setRollNo]        = useState('')
  const [studentName,   setStudentName]   = useState('')
  const [parentEmail,   setParentEmail]   = useState('')
  const [schoolName,    setSchoolName]    = useState('')
  const [teacherName,   setTeacherName]   = useState('')
  const [loading,       setLoading]       = useState(false)
  const [analytics,     setAnalytics]     = useState(null)
  const [showKey,       setShowKey]       = useState(false)
  const [answerKey,     setAnswerKey]     = useState(null)
  const [evaluations,   setEvaluations]   = useState([])
  const [bulkResults,   setBulkResults]   = useState(null)
  const [emailSending,  setEmailSending]  = useState({})
  const [activeReport,  setActiveReport]  = useState(null) // evaluation for inline view
  const fileRef = useRef(null)

  useEffect(() => { fetchExams() }, [])

  // ── Load all saved exams from Question Master ────────────────────────────
  const fetchExams = async () => {
    try {
      const res  = await apiGet('/questions', token)
      const data = await res.json()
      setExams(data.exams || [])
    } catch { }
  }

  // ── When exam selected, load its full metadata ───────────────────────────
  const handleExamSelect = async (eid) => {
    setSelectedExam(eid)
    setAnalytics(null)
    setAnswerKey(null)
    setShowKey(false)
    setEvaluations([])
    setBulkResults(null)
    setActiveReport(null)
    if (!eid) { setExamMeta(null); return }
    try {
      const res  = await apiGet(`/exams/${eid}`, token)
      const data = await res.json()
      setExamMeta(data)
      if (data.school_name) setSchoolName(data.school_name)
      if (data.teacher_name) setTeacherName(data.teacher_name)
    } catch { setExamMeta(null) }
  }

  // ── Analytics ────────────────────────────────────────────────────────────
  const loadAnalytics = async () => {
    if (!selectedExam) return
    try {
      const res = await apiGet(`/exams/${selectedExam}/analytics`, token)
      const d   = await res.json()
      if (d.error) { showToast(d.error, 'warning'); return }
      setAnalytics(d)
    } catch { showToast('Analytics not available yet', 'warning') }
  }

  // ── Answer Key ───────────────────────────────────────────────────────────
  const viewAnswerKey = async () => {
    if (!selectedExam) { showToast('Select an exam first', 'error'); return }
    try {
      const res  = await apiGet(`/exams/${selectedExam}`, token)
      const data = await res.json()
      setAnswerKey(data)
      setShowKey(true)
    } catch { showToast('Failed to load answer key', 'error') }
  }

  // ── Single evaluation ────────────────────────────────────────────────────
  const submitSingleEval = async () => {
    if (!selectedExam) { showToast('Select an exam first', 'error'); return }
    if (!answerFile)   { showToast('Upload an answer sheet (PDF or image)', 'error'); return }
    setLoading(true)
    const fd = new FormData()
    fd.append('answer_sheet',  answerFile)
    fd.append('exam_id',       selectedExam)
    fd.append('roll_no',       rollNo)
    fd.append('student_name',  studentName)
    fd.append('parent_email',  parentEmail)
    try {
      const res  = await apiPostForm('/evaluate', fd, token)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Evaluation failed')
      setEvaluations(prev => [data, ...prev])
      setActiveReport(data)
      showToast('Evaluation complete!', 'success')
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  // ── Multi-student PDF evaluation ─────────────────────────────────────────
  const submitMultiEval = async () => {
    if (!selectedExam) { showToast('Select an exam first', 'error'); return }
    if (!answerFile)   { showToast('Upload a PDF or image file', 'error'); return }
    setLoading(true)
    const fd = new FormData()
    fd.append('answer_sheet', answerFile)
    fd.append('exam_id',      selectedExam)
    try {
      const res  = await apiPostForm('/evaluate/multi-student', fd, token)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Multi-student evaluation failed')
      setBulkResults(data)
      setEvaluations(prev => [...(data.evaluations || []), ...prev])
      showToast(`${data.student_count} student(s) evaluated!`, 'success')
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  // ── Bulk (multiple files) ────────────────────────────────────────────────
  const submitBulkEval = async () => {
    if (!selectedExam) { showToast('Select an exam first', 'error'); return }
    if (!answerFile)   { showToast('Upload a ZIP or multiple PDFs', 'error'); return }
    setLoading(true)
    const fd = new FormData()
    fd.append('answer_sheets', answerFile)
    fd.append('exam_id',       selectedExam)
    try {
      const res  = await apiPostForm('/evaluate/bulk', fd, token)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Bulk evaluation failed')
      setBulkResults(data)
      showToast(`${data.total || 0} sheets evaluated!`, 'success')
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  // ── Send report email ────────────────────────────────────────────────────
  const sendReportEmail = async (evaluation, emailAddr) => {
    if (!emailAddr) { showToast('Enter a parent email address', 'warning'); return }
    const key = evaluation.evaluation_id
    setEmailSending(prev => ({ ...prev, [key]: true }))
    try {
      const html = buildParentEmailHTML({ evaluation, examMeta, schoolName })
      const res  = await apiPost('/evaluations/send-report', {
        evaluation_id: evaluation.evaluation_id,
        parent_email:  emailAddr,
        student_name:  evaluation.student_name,
        html_report:   html,
        exam_meta:     examMeta,
      }, token)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Email failed')
      showToast(`Report sent to ${emailAddr}`, 'success')
    } catch (e) { showToast(e.message, 'error') }
    setEmailSending(prev => ({ ...prev, [key]: false }))
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="panel active">
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>

        {/* ── HEADER + EXAM SELECTOR ─────────────────────────────────────── */}
        <div className="card" style={{ padding: 26, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 26 }}>📋</div>
            <div>
              <h3 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)', margin: 0 }}>Evaluation Central</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: '2px 0 0' }}>
                Select an Exam ID from Question Master, evaluate answer sheets, generate and email parent reports
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="fg" style={{ flex: 1, minWidth: 260, marginBottom: 0 }}>
              <label>Exam ID (from Question Master)</label>
              <select className="fi sel" value={selectedExam} onChange={e => handleExamSelect(e.target.value)}>
                <option value="">— Select Saved Exam —</option>
                {exams.length === 0 && <option disabled>No saved exams — generate & save in Question Master first</option>}
                {exams.map(e => (
                  <option key={e.exam_id} value={e.exam_id}>
                    {e.exam_id} · {e.syllabus_name || e.topic || ''} · {e.questions?.length || 0}Q · {e.total_marks || 0}M
                  </option>
                ))}
              </select>
            </div>
            <button className="btn-outline" onClick={viewAnswerKey} disabled={!selectedExam}
              style={{ padding: '11px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              🔑 Answer Key
            </button>
            <button className="btn-outline" onClick={loadAnalytics} disabled={!selectedExam}
              style={{ padding: '11px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              📊 Analytics
            </button>
            <button className="btn-outline" onClick={fetchExams}
              style={{ padding: '11px 14px', fontSize: 13 }} title="Refresh exam list">
              🔄
            </button>
          </div>

          {/* Exam meta pill */}
          {examMeta && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {[
                { label: examMeta.board, icon: '🏫' },
                { label: examMeta.class ? `Class ${examMeta.class}` : null, icon: '📚' },
                { label: examMeta.subject || examMeta.syllabus_name, icon: '📖' },
                { label: `${examMeta.questions?.length || 0} Questions`, icon: '❓' },
                { label: `${examMeta.total_marks || 0} Total Marks`, icon: '🏆' },
              ].filter(x => x.label).map((x, i) => (
                <span key={i} style={{ padding: '3px 12px', background: 'var(--indigo3)', borderRadius: 50, fontSize: 11, fontWeight: 600, color: 'var(--indigo)' }}>
                  {x.icon} {x.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── PAPER HEADER FIELDS ────────────────────────────────────────── */}
        <div className="card" style={{ padding: 20, marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--muted)', marginBottom: 12 }}>Report Header (used in printed reports)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div className="fg" style={{ marginBottom: 0 }}><label>School / Institution Name</label><input className="fi" value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="e.g. St. Xavier's School" /></div>
            <div className="fg" style={{ marginBottom: 0 }}><label>Teacher / Prepared By</label><input className="fi" value={teacherName} onChange={e => setTeacherName(e.target.value)} placeholder="e.g. Mrs. Priya Sharma" /></div>
          </div>
        </div>

        {/* ── EVALUATION MODE TABS ───────────────────────────────────────── */}
        <div className="card" style={{ padding: 24, marginBottom: 18 }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--paper)', borderRadius: 12, padding: 4, marginBottom: 22, width: 'fit-content' }}>
            {[
              { key: 'single',       label: '📄 Single Student' },
              { key: 'multi',        label: '📑 Multi-Student PDF' },
              { key: 'bulk',         label: '📦 Bulk Upload (ZIP)' },
            ].map(m => (
              <button key={m.key} onClick={() => setEvalMode(m.key)}
                style={{ padding: '9px 20px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: 'var(--sans)', fontSize: 12, background: evalMode === m.key ? '#fff' : 'transparent', color: evalMode === m.key ? 'var(--text)' : 'var(--muted)', boxShadow: evalMode === m.key ? '0 1px 4px rgba(0,0,0,.1)' : 'none', transition: '.2s' }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Single student */}
          {evalMode === 'single' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
                <div className="fg" style={{ marginBottom: 0 }}><label>Student Name</label><input className="fi" value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Ravi Kumar" /></div>
                <div className="fg" style={{ marginBottom: 0 }}><label>Roll Number</label><input className="fi" value={rollNo} onChange={e => setRollNo(e.target.value)} placeholder="101" /></div>
                <div className="fg" style={{ marginBottom: 0 }}><label>Parent Email (optional)</label><input className="fi" type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} placeholder="parent@email.com" /></div>
              </div>
              <div className="fg">
                <label>Answer Sheet (PDF or Image)</label>
                <input className="fi" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" ref={fileRef} onChange={e => setAnswerFile(e.target.files[0])} />
              </div>
              <button className="btn-submit indigo" onClick={submitSingleEval} disabled={loading || !selectedExam}>
                {loading ? <><span className="spin" />Evaluating…</> : '▶ Submit for AI Evaluation'}
              </button>
            </div>
          )}

          {/* Multi-student PDF */}
          {evalMode === 'multi' && (
            <div>
              <div style={{ background: '#fffbeb', border: '1.5px solid #f59e0b', padding: 16, borderRadius: 10, marginBottom: 16, fontSize: 13, lineHeight: 1.7 }}>
                <strong>📑 Multi-Student PDF Mode:</strong> Upload a single PDF that contains answer sheets from multiple students. AI will automatically detect each student's section, extract their answers, and evaluate each one separately.
                <br />Format: Each student section should begin with their name and/or roll number.
              </div>
              <div className="fg">
                <label>Combined Answer Sheet PDF (all students in one file)</label>
                <input className="fi" type="file" accept=".pdf" onChange={e => setAnswerFile(e.target.files[0])} />
              </div>
              <button className="btn-submit indigo" onClick={submitMultiEval} disabled={loading || !selectedExam}>
                {loading ? <><span className="spin" />AI is extracting each student's answers…</> : '▶ Evaluate All Students in PDF'}
              </button>
            </div>
          )}

          {/* Bulk ZIP */}
          {evalMode === 'bulk' && (
            <div>
              <div style={{ background: 'var(--indigo3)', padding: 16, borderRadius: 10, marginBottom: 16, fontSize: 13, lineHeight: 1.7, color: 'var(--indigo)' }}>
                <strong>📦 Bulk Upload:</strong> Upload a ZIP file containing individual student answer sheets (each file = one student). AI evaluates all sheets, generates reports, and optionally emails parents.
              </div>
              <div className="fg">
                <label>Bulk Answer Sheets (ZIP file)</label>
                <input className="fi" type="file" accept=".zip,.pdf" onChange={e => setAnswerFile(e.target.files[0])} />
              </div>
              <button className="btn-submit indigo" onClick={submitBulkEval} disabled={loading || !selectedExam}>
                {loading ? <><span className="spin" />Processing…</> : '🚀 Start Bulk Evaluation'}
              </button>
            </div>
          )}
        </div>

        {/* ── ANALYTICS ─────────────────────────────────────────────────── */}
        {analytics && (
          <div style={{ marginBottom: 18 }}>
            <div className="stats-grid">
              <div className="stat-card"><div className="stat-label">Total Submissions</div><div className="stat-val">{analytics.total_evaluations}</div></div>
              <div className="stat-card"><div className="stat-label">Class Average</div><div className="stat-val" style={{ color: 'var(--saffron)' }}>{analytics.class_average}%</div></div>
              <div className="stat-card"><div className="stat-label">Highest Score</div><div className="stat-val" style={{ color: 'var(--green)' }}>{analytics.top_performers?.[0]?.percentage ?? '—'}%</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
              <div className="card" style={{ padding: 22 }}>
                <h4 style={{ marginBottom: 14, fontFamily: 'var(--serif)' }}>📉 Learning Gaps</h4>
                {!analytics.learning_gaps?.length
                  ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>No significant gaps. Class performed well.</p>
                  : analytics.learning_gaps.map((g, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#fffcf0', borderRadius: 8, borderLeft: '4px solid var(--saffron)', marginBottom: 8 }}>
                      <div><div style={{ fontWeight: 600, fontSize: 13 }}>Question #{g.index + 1}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>High failure rate</div></div>
                      <div style={{ fontWeight: 700, color: 'var(--red)' }}>{g.average}%</div>
                    </div>
                  ))}
              </div>
              <div className="card" style={{ padding: 22 }}>
                <h4 style={{ marginBottom: 14, fontFamily: 'var(--serif)' }}>🏆 Top Performers</h4>
                {analytics.top_performers?.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{['🥇','🥈','🥉','✨','✨'][i] || '✨'}</span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{p.roll_no || '—'}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--green)' }}>{p.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
            {evaluations.length > 1 && (
              <div style={{ marginTop: 12 }}>
                <button onClick={() => printClassReport({ evaluations, examMeta, schoolName })}
                  style={{ padding: '10px 22px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--sans)', background: 'var(--indigo)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  🖨 Print Full Class Report
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── MULTI/BULK RESULTS TABLE ───────────────────────────────────── */}
        {bulkResults && (bulkResults.evaluations || bulkResults.results) && (
          <div className="card" style={{ padding: 24, marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h4 style={{ fontFamily: 'var(--serif)', color: 'var(--indigo)', margin: 0 }}>
                  {bulkResults.student_count || bulkResults.total} Students Evaluated
                </h4>
                <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>
                  Click a row to view individual report • Print class report for records
                </p>
              </div>
              <button onClick={() => printClassReport({ evaluations: bulkResults.evaluations || [], examMeta, schoolName })}
                style={{ padding: '9px 18px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--sans)', background: 'var(--indigo)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                🖨 Class Report
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--indigo)' }}>
                    {['#', 'Student', 'Roll No.', 'Marks', '%', 'Grade', 'Result', 'Report', 'Email to Parent'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', color: '#fff', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(bulkResults.evaluations || []).map((ev, i) => (
                    <BulkResultRow
                      key={ev.evaluation_id || i}
                      ev={ev} i={i}
                      examMeta={examMeta}
                      schoolName={schoolName}
                      teacherName={teacherName}
                      emailSending={emailSending}
                      sendReportEmail={sendReportEmail}
                      setActiveReport={setActiveReport}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SINGLE EVALUATION RESULT ──────────────────────────────────── */}
        {evaluations.length > 0 && !bulkResults && (
          <div style={{ marginBottom: 18 }}>
            {evaluations.map((ev, i) => (
              <EvaluationResultItem
                key={ev.evaluation_id || i}
                evaluation={ev}
                examMeta={examMeta}
                schoolName={schoolName}
                teacherName={teacherName}
                emailSending={emailSending}
                sendReportEmail={sendReportEmail}
              />
            ))}
          </div>
        )}

        {/* ── ANSWER KEY OVERLAY ────────────────────────────────────────── */}
        {showKey && answerKey && (
          <div className="results-overlay open">
            <div className="results-modal" style={{ maxWidth: 860 }}>
              <div className="results-header">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>🔑 Answer Key — {answerKey.exam_id}</div>
                  <div style={{ fontSize: 12, opacity: .75, marginTop: 2 }}>
                    {answerKey.syllabus_name} • {answerKey.questions?.length || 0} questions • {answerKey.total_marks || 0} total marks
                  </div>
                </div>
                <button onClick={() => setShowKey(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>✕</button>
              </div>
              <div className="results-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {answerKey.questions?.map((q, i) => (
                  <div key={i} style={{ padding: 20, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', borderLeft: `6px solid ${q.type === 'objective' ? 'var(--indigo)' : 'var(--saffron)'}` }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                      <span style={{ fontWeight: 800, color: 'var(--indigo)', whiteSpace: 'nowrap' }}>Q{i + 1}.</span>
                      <span style={{ fontWeight: 600, flex: 1, lineHeight: 1.5 }}>{q.question}</span>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 50, fontSize: 10, fontWeight: 800, background: q.type === 'objective' ? 'var(--indigo3)' : '#fce7f3', color: q.type === 'objective' ? 'var(--indigo)' : '#9d174d' }}>
                          {q.type === 'objective' ? 'OBJ' : 'SUBJ'}
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: 50, fontSize: 10, fontWeight: 700, background: '#f1f5f9', color: 'var(--muted)' }}>
                          {q.marks}m
                        </span>
                      </div>
                    </div>
                    {q.type === 'objective' && q.options && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        {Object.entries(q.options).map(([k, v]) => (
                          <div key={k} style={{ padding: '7px 12px', background: '#f8fafc', borderRadius: 8, fontSize: 13, border: '1px solid #e2e8f0', display: 'flex', gap: 6 }}>
                            <strong style={{ color: 'var(--indigo)' }}>{k})</strong> {v}
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ background: 'var(--indigo3)', padding: '10px 14px', borderRadius: 8, fontWeight: 700, color: 'var(--indigo)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ background: 'var(--green)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>ANSWER</span>
                      <span>{q.answer || (q.valid_answers || []).join(' / ')}</span>
                    </div>
                    {q.explanation && (
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', padding: '8px 12px', background: '#f8fafc', borderRadius: 6, lineHeight: 1.6 }}>
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
