import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { apiPost } from '../../utils/api'
import Logo from '../shared/Logo'

const APP_NAME = 'Parvidya'

const ROLES = [
  { key: 'student', label: '🎒 Student', color: 'saffron', reqRoll: true },
  { key: 'teacher', label: '👩‍🏫 Teacher', color: 'green', reqRoll: false },
  { key: 'tutor', label: '📚 Tutor', color: 'green', reqRoll: false },
  { key: 'parent', label: '👨‍👩‍👧 Parent', color: 'indigo', reqRoll: false },
]

const LOGIN_TABS = [
  { key: 'student', label: '🎒 Student' },
  { key: 'teacher', label: '👩‍🏫 Teacher' },
  { key: 'parent', label: '👨‍👩‍👧 Parent' },
]

// ── Accessible OTP Input component ───────────────────────────────────────────
function OTPInput({ value, onChange }) {
  const refs = useRef([])

  // normalise value string to exactly 6 chars
  const digits = value.padEnd(6, ' ').slice(0, 6).split('')

  const focus = (i) => { if (refs.current[i]) refs.current[i].focus() }

  const handleInput = (e, i) => {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) return
    const ch = raw[raw.length - 1]
    const next = [...digits]
    next[i] = ch
    onChange(next.join('').trimEnd())
    if (i < 5) focus(i + 1)
  }

  const handleKeyDown = (e, i) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = [...digits]
      if (next[i].trim()) {
        next[i] = ' '
        onChange(next.join('').trimEnd())
      } else if (i > 0) {
        next[i - 1] = ' '
        onChange(next.join('').trimEnd())
        focus(i - 1)
      }
    } else if (e.key === 'ArrowLeft' && i > 0) focus(i - 1)
    else if (e.key === 'ArrowRight' && i < 5) focus(i + 1)
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted) {
      onChange(pasted.padEnd(6, ' ').trimEnd())
      focus(Math.min(pasted.length, 5))
    }
  }

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '18px 0' }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={d.trim()}
          onChange={e => handleInput(e, i)}
          onKeyDown={e => handleKeyDown(e, i)}
          onPaste={handlePaste}
          style={{
            width: 46, height: 54, textAlign: 'center', fontSize: 24, fontWeight: 800,
            border: d.trim() ? '2px solid var(--indigo)' : '1.5px solid #d0c8b8',
            borderRadius: 12, outline: 'none',
            background: d.trim() ? 'var(--indigo3)' : '#fafaf8',
            color: 'var(--indigo)', fontFamily: 'monospace', transition: '.15s',
            boxShadow: d.trim() ? '0 0 0 3px rgba(67,56,202,.12)' : 'none',
          }}
        />
      ))}
    </div>
  )
}

export default function AuthModal({ isOpen, onClose, defaultForm = 'login', defaultRole = 'student' }) {
  const { login } = useAuth()

  const [form, setForm] = useState(defaultForm)
  const [role, setRole] = useState(defaultRole)
  const [alert, setAlert] = useState(null)
  const [loading, setLoading] = useState(false)

  // Login
  const [lEmail, setLEmail] = useState('')
  const [lPw, setLPw] = useState('')
  const [lShowPw, setLShowPw] = useState(false)

  // Register  — step 1: personal info, step 2: account info, step 3: OTP
  const [regStep, setRegStep] = useState(1)
  const [rFn, setRFn] = useState('')
  const [rLn, setRLn] = useState('')
  const [rPhone, setRPhone] = useState('')
  const [rInst, setRInst] = useState('')
  const [rRoll, setRRoll] = useState('')
  const [rEmail, setREmail] = useState('')
  const [rPw, setRPw] = useState('')
  const [rPwC, setRPwC] = useState('')
  const [rShowPw, setRShowPw] = useState(false)

  // OTP
  const [otp, setOtp] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const timerRef = useRef(null)

  if (!isOpen) return null

  const showAlert = (msg, type = 'err') => setAlert({ msg, type })
  const clearAlert = () => setAlert(null)

  const resetRegister = () => {
    setRegStep(1)
    setRFn(''); setRLn(''); setRPhone(''); setRInst(''); setRRoll('')
    setREmail(''); setRPw(''); setRPwC(''); setRShowPw(false)
    setOtp(''); setOtpTimer(0)
    if (timerRef.current) clearInterval(timerRef.current)
    clearAlert()
  }

  const handleClose = () => { resetRegister(); onClose() }

  const switchToLogin = () => {
    setForm('login'); resetRegister(); clearAlert()
  }
  const switchToRegister = () => {
    setForm('register'); setRegStep(1); clearAlert()
    setOtp(''); setOtpTimer(0)
  }

  // ── Timer ────────────────────────────────────────────────────────────────
  const startTimer = (secs = 60) => {
    setOtpTimer(secs)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setOtpTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current); return 0 }
        return t - 1
      })
    }, 1000)
  }

  // ── Step 1 → Step 2 validation ───────────────────────────────────────────
  const goStep2 = () => {
    if (!rFn.trim()) { showAlert('First name is required'); return }
    if (role !== 'parent' && !rInst.trim()) { showAlert('School / Institution name is required'); return }
    if (rPhone && !/^\d{10}$/.test(rPhone)) { showAlert('Enter a valid 10-digit mobile number'); return }
    clearAlert()
    setRegStep(2)
  }

  // ── Send OTP ─────────────────────────────────────────────────────────────
  const sendOTP = async () => {
    const email = rEmail.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert('Enter a valid email address'); return
    }
    if (!rPw || rPw.length < 8) { showAlert('Password must be at least 8 characters'); return }
    if (rPw !== rPwC) { showAlert('Passwords do not match'); return }
    setOtpSending(true); clearAlert()
    try {
      const res = await apiPost('/auth/send-otp', { email, role, form: 'register' })
      const data = await res.json()
      if (!res.ok) { showAlert(data.error || 'Could not send OTP'); setOtpSending(false); return }
      setRegStep(3)
      startTimer()
      setOtp('')
      if (data.dev_otp) {
        setAlert({ msg: `[Dev mode] OTP: ${data.dev_otp}`, type: 'ok' })
      } else {
        setAlert({ msg: `OTP sent to ${email}. Check your inbox.`, type: 'ok' })
      }
    } catch { showAlert('Cannot reach server') }
    setOtpSending(false)
  }

  // ── Verify OTP + Create Account ──────────────────────────────────────────
  const verifyAndCreate = async () => {
    const clean = otp.replace(/\s/g, '')
    if (clean.length < 6) { showAlert('Enter the complete 6-digit OTP'); return }
    setOtpVerifying(true); clearAlert()
    try {
      const res = await apiPost('/auth/signup', {
        name: `${rFn} ${rLn}`.trim(),
        email: rEmail.trim().toLowerCase(),
        phone: rPhone.trim(),
        password: rPw,
        role,
        institution: rInst.trim(),
        roll_number: rRoll.trim(),
        otp: clean,
      })
      const data = await res.json()
      if (!res.ok) { showAlert(data.error || 'Registration failed'); setOtpVerifying(false); return }
      login(data.token, data.user)
      handleClose()
    } catch { showAlert('Cannot reach server') }
    setOtpVerifying(false)
  }

  // ── Login ────────────────────────────────────────────────────────────────
  const doLogin = async () => {
    if (!lEmail || !lPw) { showAlert('Enter email and password'); return }
    setLoading(true); clearAlert()
    try {
      const res = await apiPost('/auth/login', { email: lEmail.trim().toLowerCase(), password: lPw, role })
      const data = await res.json()
      if (!res.ok) { showAlert(data.error || 'Login failed'); setLoading(false); return }
      login(data.token, data.user)
      handleClose()
    } catch { showAlert('Cannot reach server') }
    setLoading(false)
  }

  const pwHints = [
    { ok: rPw.length >= 8, label: '8+ chars' },
    { ok: /[A-Z]/.test(rPw), label: 'Uppercase' },
    { ok: /\d/.test(rPw), label: 'Number' },
  ]

  const activeRoleData = ROLES.find(r => r.key === role) || ROLES[0]
  const btnCls = `btn-submit ${activeRoleData.color}`
  const otpDone = otp.replace(/\s/g, '').length === 6

  return (
    <div className="pv-overlay" onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="pv-modal">

        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <div className="pv-modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Parvidya mini-logo */}
            <Logo size={32} />
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--indigo)', fontWeight: 800 }}>
                {APP_NAME}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {form === 'login' ? 'Sign in to your account' : 'Create your free account'}
              </div>
            </div>
          </div>
          <button className="pv-close" onClick={handleClose} title="Close">✕</button>
        </div>

        <div className="pv-modal-body">

          {/* Alert */}
          {alert && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
              background: alert.type === 'ok' ? '#d1fae5' : '#fee2e2',
              color: alert.type === 'ok' ? '#065f46' : '#991b1b',
              border: `1px solid ${alert.type === 'ok' ? '#a7f3d0' : '#fca5a5'}`
            }}>
              {alert.msg}
            </div>
          )}

          {/* ── LOGIN ──────────────────────────────────────────────────── */}
          {form === 'login' && (
            <>
              {/* Role tabs */}
              <div style={{ display: 'flex', gap: 3, background: 'var(--paper)', borderRadius: 10, padding: 3, marginBottom: 18 }}>
                {LOGIN_TABS.map(t => (
                  <button key={t.key} onClick={() => { setRole(t.key); clearAlert() }}
                    style={{
                      flex: 1, padding: '7px 2px', fontSize: 10, fontWeight: 700, fontFamily: 'var(--sans)', borderRadius: 8, border: 'none', cursor: 'pointer', transition: '.2s',
                      background: role === t.key ? '#fff' : 'transparent',
                      color: role === t.key ? 'var(--indigo)' : 'var(--muted)',
                      boxShadow: role === t.key ? '0 1px 4px rgba(0,0,0,.12)' : 'none'
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="fg">
                <label>Email Address</label>
                <input className="fi" type="email" placeholder="you@school.edu.in"
                  value={lEmail} onChange={e => setLEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doLogin()} autoComplete="email" />
              </div>
              <div className="fg">
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="fi" type={lShowPw ? 'text' : 'password'} placeholder="••••••••"
                    value={lPw} onChange={e => setLPw(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && doLogin()}
                    style={{ paddingRight: 42 }} autoComplete="current-password" />
                  <button onClick={() => setLShowPw(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--muted)' }}>
                    {lShowPw ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <button className={btnCls} onClick={doLogin} disabled={loading}>
                {loading ? <><span className="spin" />Signing in…</> : 'Sign In →'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--muted)' }}>
                No account?{' '}
                <a onClick={switchToRegister} style={{ color: 'var(--saffron)', fontWeight: 700, cursor: 'pointer' }}>
                  Create one free →
                </a>
              </div>
            </>
          )}

          {/* ── REGISTER STEP 1: Personal Info ─────────────────────────── */}
          {form === 'register' && regStep === 1 && (
            <>
              {/* Role selector */}
              <div className="fg">
                <label>I am registering as</label>
                <select className="fi sel" value={role} onChange={e => { setRole(e.target.value); clearAlert() }}>
                  {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="fg" style={{ marginBottom: 0 }}>
                  <label>First Name *</label>
                  <input className="fi" placeholder="Ravi" value={rFn} onChange={e => setRFn(e.target.value)} autoComplete="given-name" />
                </div>
                <div className="fg" style={{ marginBottom: 0 }}>
                  <label>Last Name</label>
                  <input className="fi" placeholder="Kumar" value={rLn} onChange={e => setRLn(e.target.value)} autoComplete="family-name" />
                </div>
              </div>

              {role !== 'parent' && (
                <div className="fg">
                  <label>{role === 'student' ? 'School Name *' : 'School / Institution *'}</label>
                  <input className="fi" placeholder="e.g. Delhi Public School" value={rInst} onChange={e => setRInst(e.target.value)} />
                </div>
              )}
              {role === 'student' && (
                <div className="fg">
                  <label>Roll Number (optional)</label>
                  <input className="fi" placeholder="e.g. 101" value={rRoll} onChange={e => setRRoll(e.target.value)} />
                </div>
              )}

              <div className="fg">
                <label>Mobile Number (optional)</label>
                <div style={{ display: 'flex' }}>
                  <span style={{ padding: '11px 12px', background: 'var(--paper)', border: '1.5px solid var(--warm)', borderRight: 'none', borderRadius: '10px 0 0 10px', fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap', lineHeight: 1.2 }}>+91</span>
                  <input className="fi" type="tel" placeholder="9876543210" value={rPhone}
                    maxLength={10}
                    onChange={e => setRPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    style={{ borderRadius: '0 10px 10px 0', borderLeft: 'none' }}
                    autoComplete="tel" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button className="btn-outline" onClick={switchToLogin} style={{ flex: 1, padding: '11px 0' }}>
                  ✕ Cancel
                </button>
                <button className={btnCls} onClick={goStep2} style={{ flex: 2 }}>
                  Next — Account Details →
                </button>
              </div>
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--muted)' }}>
                Already registered?{' '}
                <a onClick={switchToLogin} style={{ color: 'var(--saffron)', fontWeight: 700, cursor: 'pointer' }}>Sign in →</a>
              </div>
            </>
          )}

          {/* ── REGISTER STEP 2: Account Info ──────────────────────────── */}
          {form === 'register' && regStep === 2 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--indigo3)', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 20, background: 'var(--indigo)', color: '#fff', width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  {rFn[0]?.toUpperCase() || '👤'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--indigo)' }}>{rFn} {rLn}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{ROLES.find(r => r.key === role)?.label} {rInst ? `· ${rInst}` : ''}</div>
                </div>
                <button onClick={() => { setRegStep(1); clearAlert() }}
                  style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--saffron)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                  Edit ✎
                </button>
              </div>

              <div className="fg">
                <label>Email Address *</label>
                <input className="fi" type="email" placeholder="you@school.edu.in"
                  value={rEmail} onChange={e => setREmail(e.target.value)} autoComplete="email" />
              </div>
              <div className="fg">
                <label>Password (min 8 characters) *</label>
                <div style={{ position: 'relative' }}>
                  <input className="fi" type={rShowPw ? 'text' : 'password'} placeholder="Create a strong password"
                    value={rPw} onChange={e => setRPw(e.target.value)} style={{ paddingRight: 42 }}
                    autoComplete="new-password" />
                  <button onClick={() => setRShowPw(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--muted)' }}>
                    {rShowPw ? '🙈' : '👁'}
                  </button>
                </div>
                {rPw.length > 0 && (
                  <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                    {pwHints.map(h => (
                      <span key={h.label} style={{ fontSize: 11, color: h.ok ? 'var(--green)' : 'var(--muted)' }}>
                        {h.ok ? '✓' : '○'} {h.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="fg">
                <label>Confirm Password *</label>
                <input className="fi" type="password" placeholder="Re-enter password"
                  value={rPwC} onChange={e => setRPwC(e.target.value)} autoComplete="new-password" />
                {rPwC && rPw !== rPwC && (
                  <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>Passwords do not match</div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-outline" onClick={() => { setRegStep(1); clearAlert() }} style={{ flex: 1, padding: '11px 0' }}>
                  ← Back
                </button>
                <button className={btnCls} onClick={sendOTP} disabled={otpSending} style={{ flex: 2 }}>
                  {otpSending ? <><span className="spin" />Sending OTP…</> : '📧 Send OTP to Email →'}
                </button>
              </div>
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <a onClick={resetRegister} style={{ fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
                  ✕ Cancel Sign-up
                </a>
              </div>
            </>
          )}

          {/* ── REGISTER STEP 3: OTP Verification ──────────────────────── */}
          {form === 'register' && regStep === 3 && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 44, marginBottom: 8 }}>📩</div>
                <div style={{ fontWeight: 800, color: 'var(--indigo)', fontSize: 17, marginBottom: 6 }}>
                  Verify your email
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65 }}>
                  We sent a 6-digit code to<br />
                  <strong style={{ color: 'var(--text)' }}>{rEmail}</strong>
                </div>
              </div>

              {/* OTP input */}
              <OTPInput value={otp} onChange={setOtp} />

              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
                {otpTimer > 0
                  ? <>Resend in <strong style={{ color: 'var(--indigo)' }}>{otpTimer}s</strong></>
                  : <a onClick={sendOTP} style={{ color: 'var(--saffron)', fontWeight: 700, cursor: 'pointer' }}>
                    Resend OTP
                  </a>
                }
              </div>

              <button className={btnCls} onClick={verifyAndCreate}
                disabled={otpVerifying || !otpDone}>
                {otpVerifying ? <><span className="spin" />Creating account…</> : '✓ Verify & Create Account →'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                <a onClick={() => { setRegStep(2); clearAlert(); setOtp('') }}
                  style={{ fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
                  ← Change email
                </a>
                <a onClick={resetRegister}
                  style={{ fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
                  ✕ Cancel Sign-up
                </a>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Progress dots for register */}
      {form === 'register' && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              width: s === regStep ? 22 : 8, height: 8, borderRadius: 4,
              background: s <= regStep ? '#fff' : 'rgba(255,255,255,.3)',
              transition: '.3s'
            }} />
          ))}
        </div>
      )}

      <style>{`
        .pv-overlay{display:flex;position:fixed;inset:0;background:rgba(20,16,12,.72);backdrop-filter:blur(10px);z-index:400;align-items:center;justify-content:center;padding:16px;flex-direction:column}
        .pv-modal{background:#fff;border-radius:22px;width:100%;max-width:420px;overflow:hidden;box-shadow:0 28px 90px rgba(0,0,0,.3);animation:pvIn .25s cubic-bezier(.34,1.56,.64,1)}
        @keyframes pvIn{from{transform:scale(.92) translateY(20px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
        .pv-modal-head{padding:22px 26px 0;display:flex;justify-content:space-between;align-items:center}
        .pv-modal-body{padding:18px 26px 28px;max-height:calc(100vh - 160px);overflow-y:auto}
        .pv-close{width:30px;height:30px;border-radius:50%;border:none;background:var(--paper);cursor:pointer;font-size:14px;color:var(--muted);transition:.2s}
        .pv-close:hover{background:#fee2e2;color:#991b1b}
        .fg label{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px;display:block}
      `}</style>
    </div>
  )
}
