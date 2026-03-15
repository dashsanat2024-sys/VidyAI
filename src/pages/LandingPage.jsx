// ── Parvidya Professional Logo ─────────────────────────────────────────────
function ParvidyaLogo({ size = 40 }) {
  const s = size
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="pvGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E8761A"/>
          <stop offset="100%" stopColor="#F59E0B"/>
        </linearGradient>
        <linearGradient id="pvGrad2" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3730A3"/>
          <stop offset="100%" stopColor="#6D28D9"/>
        </linearGradient>
        <linearGradient id="pvGrad3" x1="24" y1="4" x2="24" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF7ED"/>
          <stop offset="100%" stopColor="#FED7AA"/>
        </linearGradient>
      </defs>
      {/* Outer shape — book arc */}
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#pvGrad)"/>
      {/* Inner white book pages */}
      <rect x="9" y="10" width="13" height="26" rx="3" fill="white" opacity="0.95"/>
      <rect x="26" y="10" width="13" height="26" rx="3" fill="white" opacity="0.85"/>
      {/* Spine */}
      <rect x="22" y="9" width="4" height="28" rx="2" fill="url(#pvGrad2)" opacity="0.7"/>
      {/* Devanagari प character */}
      <text x="15.5" y="29" fontFamily="serif" fontSize="15" fontWeight="900" fill="#3730A3" textAnchor="middle">प</text>
      {/* Star / knowledge dot above */}
      <circle cx="35" cy="12" r="3.5" fill="white" opacity="0.9"/>
      <circle cx="35" cy="12" r="1.5" fill="url(#pvGrad2)"/>
    </svg>
  )
}

import { useState, useEffect, useRef } from 'react'
import AuthModal from '../components/auth/AuthModal'

const BOARDS = ['CBSE','ICSE / ISC','Maharashtra Board','Tamil Nadu Board','Karnataka Board','Kerala Board','UP Board','Gujarat Board','Rajasthan Board','West Bengal Board','Telangana Board','NIOS']

function useFadeIn() {
  const ref = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: .1 })
    const el = ref.current
    if (el) { el.querySelectorAll('.fade-in').forEach(x => obs.observe(x)) }
    return () => obs.disconnect()
  }, [])
  return ref
}

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalForm, setModalForm] = useState('login')
  const [modalRole, setModalRole] = useState('student')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const sectionRef = useFadeIn()

  const openModal = (form = 'login', role = 'student') => {
    setModalForm(form); setModalRole(role); setModalOpen(true)
  }

  return (
    <div id="landing-page" ref={sectionRef}>
      {/* ── NAV ── */}
      <nav>
        <a className="nav-logo" href="#">
          <ParvidyaLogo size={42} />
          <div>
            <div className="nav-logo-name">Parvidya</div>
            <div className="nav-tagline">AI Education for Every Indian Classroom</div>
          </div>
        </a>
        <div className="nav-links">
          <a className="nav-link" href="#roles">For Schools</a>
          <a className="nav-link" href="#features">Features</a>
          <a className="nav-link" href="#how">How it Works</a>
          <a className="nav-link" href="#boards">Boards</a>
        </div>
        <div className="nav-ctas">
          <button className="btn-outline" onClick={() => openModal('login')}>Sign In</button>
          <button className="btn-saffron" onClick={() => openModal('register')}>Get Started Free →</button>
        </div>
        <button className="menu-toggle" onClick={() => setMobileMenuOpen(true)}>☰</button>
      </nav>

      {/* Mobile Menu */}
      <div className={`mobile-menu-overlay ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-inner">
          <button className="mobile-menu-close" onClick={() => setMobileMenuOpen(false)}>✕</button>
          <div className="mobile-menu-links">
            <a href="#roles" onClick={() => setMobileMenuOpen(false)}>For Schools</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how" onClick={() => setMobileMenuOpen(false)}>How it Works</a>
            <a href="#boards" onClick={() => setMobileMenuOpen(false)}>Boards</a>
            <button className="btn-outline" onClick={() => { setMobileMenuOpen(false); openModal('login') }}>Sign In</button>
            <button className="btn-saffron" onClick={() => { setMobileMenuOpen(false); openModal('register') }}>Get Started Free →</button>
          </div>
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-mandala" />
          <div className="hero-mandala2" />
          <div className="hero-grid" />
        </div>
        <div className="hero-inner">
          <div className="hero-badge"><div className="pulse-dot" />🇮🇳 Made for Indian Education</div>
          <h1>AI Tutor for<br />Every <em>Indian</em><br />Classroom</h1>
          <p className="hero-sub">
            From CBSE to State boards — generate question papers, evaluate answer sheets,
            create AI audio lessons, and chat with your textbooks. All in one platform.
          </p>
          <div className="hero-ctas">
            <button className="btn-hero-primary" onClick={() => openModal('register')}>
              🚀 Start Learning Free
            </button>
            <button className="btn-hero-sec" onClick={() => openModal('login')}>
              Sign In →
            </button>
          </div>
          <div className="hero-stats">
            <div className="hstat"><div className="hstat-num">12+</div><div className="hstat-label">Boards Supported</div></div>
            <div className="hstat"><div className="hstat-num">500+</div><div className="hstat-label">Schools Onboarded</div></div>
            <div className="hstat"><div className="hstat-num">2M+</div><div className="hstat-label">Questions Generated</div></div>
          </div>
        </div>
      </section>

      {/* ── FEATURE STRIP ── */}
      <div className="strip">
        {['🎓 NCERT & State Board Aligned','🔊 AI Audio & Video Lessons','❓ One-Click Question Papers','📊 Bulk AI Evaluation & Marking'].map(item => (
          <div key={item} className="strip-item">
            <span className="strip-icon">{item.split(' ')[0]}</span>
            {item.split(' ').slice(1).join(' ')}
          </div>
        ))}
      </div>

      {/* ── WHO IS IT FOR ── */}
      <section className="section roles-section" id="roles">
        <div className="section-inner">
          <div className="section-label">Who is it for?</div>
          <h2>Built for Every Role<br />in Indian Education</h2>
          <p className="section-sub">Whether you're a school administrator, classroom teacher, parent or eager student — Parvidya has tools tailored for you.</p>
          <div className="roles-grid">
            {[
              {
                cls: 'school', emoji: '🏫', name: 'School / College',
                desc: 'Save hundreds of hours on examination cycles. Generate papers, automate evaluations, and eliminate human bias in marking.',
                features: ['Multi-board & multi-class setup','Teacher and student account management','Institution-wide performance analytics','Parent communication system','Bulk evaluation reports'],
                cta: 'Register School →', role: 'school'
              },
              {
                cls: 'teacher', emoji: '👩‍🏫', name: 'Teacher / Tutor',
                desc: 'Create lesson plans, generate question papers, evaluate bulk answer sheets with 99.9% accuracy, and email detailed reports to parents instantly.',
                features: ['Auto-load NCERT & State curricula','AI Voice-Guided Audio Explanations','One-Click Exam Paper Generation','Printable question papers with keys','Interactive Video Lesson creation'],
                cta: 'Join as Teacher →', role: 'teacher'
              },
              {
                cls: 'student', emoji: '🎒', name: 'Student',
                desc: 'Study smarter — get AI summaries, practise with flashcards, take quizzes, and chat with your personal AI tutor any time.',
                features: ['🔊 Listen to AI-generated explanations','📹 Watch AI Teacher Video Lessons','Practice with interactive flashcards','AI study chat tutor for deep-dives','NCERT & Indian State curricula'],
                cta: 'Join as Student →', role: 'student'
              },
              {
                cls: 'parent', emoji: '👨‍👩‍👧', name: 'Parent',
                desc: 'Stay informed about your child\'s academic progress with AI-generated performance reports, exam results, and learning gap analysis.',
                features: ['Receive detailed AI performance reports','Track your child\'s exam scores','Learning gap identification','Direct communication with school','Progress comparison over time'],
                cta: 'Join as Parent →', role: 'student'
              }
            ].map((r, i) => (
              <div key={r.cls} className={`role-card ${r.cls} fade-in`} style={{ animationDelay: `${i * 0.1}s` }}>
                <span className="role-emoji">{r.emoji}</span>
                <div className="role-name">{r.name}</div>
                <p className="role-desc">{r.desc}</p>
                <ul className="role-features">{r.features.map(f => <li key={f}>{f}</li>)}</ul>
                <button className="btn-role" onClick={() => openModal('register', r.role)}>{r.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOOLS ── */}
      <section className="section" id="features">
        <div className="section-inner">
          <div className="section-label">AI Tools</div>
          <h2>Six Powerful Tools,<br />One Platform</h2>
          <p className="section-sub">Every tool works directly with your curriculum — just select your board, class, and subject.</p>
          <div className="tools-grid">
            {[
              { icon: '📝', bg: 'var(--indigo3)',       name: 'Summarise',           desc: 'Every chapter distilled into 5 key points with real-world Indian examples. Clear, simple, and exam-ready.' },
              { icon: '🃏', bg: 'var(--saffron-light)', name: 'Flashcards',          desc: '10 Q&A flashcards per chapter covering every important concept. Flip to reveal answers. Perfect for revision.' },
              { icon: '❓', bg: '#d1fae5',              name: 'Generate Questions',  desc: 'Choose how many objective and subjective questions. Generate printable question papers with school details.' },
              { icon: '🔊', bg: '#fce7f3',              name: 'AI Audio Lessons',    desc: 'Listen to high-quality audio explanations of complex topics. Teacher-like delivery for eyes-free learning.' },
              { icon: '📹', bg: '#e0f2fe',              name: 'AI Interactive Video',desc: 'Full-screen interactive lessons with Ms. Vidya — animated teacher with dynamic slides and real-world examples.' },
              { icon: '📊', bg: '#ccfbf1',              name: 'Bulk AI Evaluation',  desc: 'Upload hundreds of answer sheets at once. AI evaluates, marks, and generates individual student reports.' },
            ].map((t, i) => (
              <div key={t.name} className="tool-card fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="tool-icon-wrap" style={{ background: t.bg }}>{t.icon}</div>
                <div className="tool-name">{t.name}</div>
                <p className="tool-desc">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section how-section" id="how">
        <div className="section-inner">
          <div className="section-label">How It Works</div>
          <h2>Ready in 4 Steps</h2>
          <p className="section-sub">No setup required. Just pick your board and start learning.</p>
          <div className="steps-grid">
            {[
              { n: 1, title: 'Select Board & Class',  desc: 'Choose from CBSE, ICSE or any state board. Pick your class from 1 to 12.' },
              { n: 2, title: 'Pick a Subject',        desc: 'Subjects auto-populate for your board and class. Select one and load the textbook.' },
              { n: 3, title: 'Choose Chapters',       desc: 'Pick one, multiple, or all chapters from the government textbook.' },
              { n: 4, title: 'Automate & Evaluate',   desc: 'Generate papers, evaluate answer sheets in bulk, and email performance reports to parents.' },
            ].map((s, i) => (
              <div key={s.n} className="step fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="step-num">{s.n}</div>
                <div className="step-title">{s.title}</div>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOARDS ── */}
      <section className="section boards-section" id="boards">
        <div className="section-inner">
          <div className="section-label">Curriculum Boards</div>
          <h2>Works with All Major<br />Indian Boards</h2>
          <p className="section-sub">Government textbooks loaded from official sources — always accurate, always current.</p>
          <div className="boards-wrap">
            {BOARDS.map(b => <div key={b} className="board-pill">{b}</div>)}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="section" id="testimonials">
        <div className="section-inner">
          <div className="section-label">Testimonials</div>
          <h2>Loved by Teachers<br />and Students</h2>
          <div className="testi-grid">
            {[
              { stars: '★★★★★', quote: '"Parvidya has completely transformed how I prepare for class. I generate a full question paper for any chapter in under 2 minutes. It used to take me an entire evening."', emoji: '👩‍🏫', name: 'Priya Sharma', role: 'Science Teacher, Delhi Public School' },
              { stars: '★★★★★', quote: '"Our Class 10 board exam results improved by 23% after we started using Parvidya\'s summaries and flashcards. Students actually enjoy studying now."', emoji: '🏫', name: 'Rajesh Kumar', role: 'Principal, St. Xavier\'s School, Mumbai' },
              { stars: '★★★★★', quote: '"I used to spend hours studying and still feel confused. Now I chat with the AI tutor and it explains everything so simply — like a friend explaining, not a textbook."', emoji: '🎒', name: 'Ananya Iyer', role: 'Class 10 Student, Chennai' },
            ].map((t, i) => (
              <div key={t.name} className="testi-card fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="stars">{t.stars}</div>
                <p className="testi-quote">{t.quote}</p>
                <div className="testi-author">
                  <div className="testi-av">{t.emoji}</div>
                  <div><div className="testi-name">{t.name}</div><div className="testi-role">{t.role}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-col">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <ParvidyaLogo size={38} />
                <span style={{ fontFamily: 'var(--serif)', fontSize: 20, color: '#fff' }}>Parvidya</span>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.7 }}>AI-powered education for Indian schools and colleges. Making quality education accessible to every student.</p>
            </div>
            <div className="footer-col">
              <h4>Platform</h4>
              <ul>
                {['For Schools','For Teachers','For Students','Pricing'].map(l => <li key={l}><a href="#">{l}</a></li>)}
              </ul>
            </div>
            <div className="footer-col">
              <h4>Features</h4>
              <ul>
                {['AI Summaries','Flashcards','Question Papers','Evaluation'].map(l => <li key={l}><a href="#">{l}</a></li>)}
              </ul>
            </div>
            <div className="footer-col">
              <h4>Support</h4>
              <ul>
                {['Help Center','Contact Us','Privacy Policy','Terms of Use'].map(l => <li key={l}><a href="#">{l}</a></li>)}
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 Parvidya. Made with ❤️ for Indian Education.</p>
            <p>hello@parvidya.in</p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} defaultForm={modalForm} defaultRole={modalRole} />

      <style>{`
        nav { position:fixed; top:0; left:0; right:0; z-index:100; padding:0 40px; height:70px; display:flex; align-items:center; gap:32px; background:rgba(253,250,245,.92); backdrop-filter:blur(16px); border-bottom:1px solid rgba(232,224,208,.6); }
        .nav-logo { display:flex; align-items:center; gap:12px; text-decoration:none; }
        /* .nav-logo-icon replaced by ParvidyaLogo SVG component */
        .nav-logo-name { font-family:var(--serif); font-size:22px; color:var(--indigo); }
        .nav-tagline { font-size:11px; color:var(--muted); font-weight:500; letter-spacing:.3px; margin-top:-2px; }
        .nav-links { display:flex; gap:28px; margin-left:auto; }
        .nav-link { font-size:14px; font-weight:500; color:var(--muted); text-decoration:none; transition:.2s; }
        .nav-link:hover { color:var(--saffron); }
        .nav-ctas { display:flex; gap:10px; margin-left:12px; }
        .menu-toggle { display:none; background:none; border:none; font-size:28px; color:var(--indigo); cursor:pointer; margin-left:auto; padding:5px; }
        .mobile-menu-overlay { display:none; position:fixed; inset:0; background:rgba(28,25,23,0.95); z-index:1100; padding:40px; backdrop-filter:blur(10px); }
        .mobile-menu-overlay.open { display:flex; flex-direction:column; animation:fadeIn 0.3s ease; }
        .mobile-menu-inner { width:100%; height:100%; display:flex; flex-direction:column; }
        .mobile-menu-close { align-self:flex-end; background:none; border:none; color:#fff; font-size:40px; cursor:pointer; margin-bottom:40px; }
        .mobile-menu-links { display:flex; flex-direction:column; gap:25px; }
        .mobile-menu-links a { color:#fff; text-decoration:none; font-size:24px; font-weight:700; font-family:var(--serif); }
        .mobile-menu-links .btn-outline, .mobile-menu-links .btn-saffron { width:100%; text-align:center; padding:15px; font-size:16px; }

        .hero { min-height:100vh; display:flex; align-items:center; position:relative; overflow:hidden; padding:100px 40px 60px; }
        .hero-bg { position:absolute; inset:0; z-index:0; }
        .hero-mandala { position:absolute; right:-180px; top:50%; transform:translateY(-50%); width:700px; height:700px; opacity:.06; background:conic-gradient(from 0deg,var(--saffron),var(--indigo),var(--saffron),var(--indigo),var(--saffron),var(--indigo),var(--saffron),var(--indigo),var(--saffron)); border-radius:50%; animation:spin 60s linear infinite; }
        .hero-mandala2 { position:absolute; left:-120px; bottom:-100px; width:500px; height:500px; opacity:.04; background:conic-gradient(from 0deg,var(--saffron2),var(--indigo2),var(--saffron2),var(--indigo2),var(--saffron2)); border-radius:50%; animation:spin 40s linear infinite reverse; }
        .hero-grid { position:absolute; inset:0; background-image:linear-gradient(rgba(232,224,208,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(232,224,208,.4) 1px,transparent 1px); background-size:56px 56px; }
        .hero-inner { position:relative; z-index:1; max-width:700px; }
        .hero-badge { display:inline-flex; align-items:center; gap:8px; background:linear-gradient(135deg,var(--saffron-light),#ede9fe); border:1px solid rgba(232,118,26,.3); border-radius:50px; padding:7px 18px; font-size:12px; font-weight:700; color:var(--saffron); margin-bottom:32px; letter-spacing:.4px; text-transform:uppercase; }
        .pulse-dot { width:6px; height:6px; border-radius:50%; background:var(--saffron); animation:pd 2s infinite; }
        h1 { font-family:var(--serif); font-size:clamp(44px,6vw,80px); line-height:1.05; color:var(--indigo); margin-bottom:24px; }
        h1 em { font-style:italic; background:linear-gradient(135deg,var(--saffron),var(--saffron2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .hero-sub { font-size:18px; color:var(--muted); line-height:1.75; margin-bottom:40px; font-weight:400; max-width:560px; }
        .hero-ctas { display:flex; gap:14px; flex-wrap:wrap; margin-bottom:60px; }
        .hero-stats { display:flex; gap:48px; flex-wrap:wrap; }
        .hstat { text-align:left; }
        .hstat-num { font-family:var(--serif); font-size:38px; color:var(--indigo); line-height:1; }
        .hstat-label { font-size:13px; color:var(--muted); margin-top:4px; }

        .strip { background:linear-gradient(135deg,var(--indigo),var(--indigo2)); padding:18px 40px; display:flex; gap:40px; justify-content:center; flex-wrap:wrap; }
        .strip-item { display:flex; align-items:center; gap:10px; color:rgba(255,255,255,.85); font-size:13px; font-weight:500; }

        .section { padding:96px 40px; }
        .section-inner { max-width:1200px; margin:0 auto; }
        .section-label { display:inline-block; background:var(--saffron-light); border:1px solid rgba(232,118,26,.3); border-radius:50px; padding:5px 16px; font-size:11px; font-weight:700; color:var(--saffron); margin-bottom:16px; letter-spacing:.5px; text-transform:uppercase; }
        h2 { font-family:var(--serif); font-size:clamp(32px,4vw,52px); line-height:1.1; color:var(--indigo); margin-bottom:16px; }
        .section-sub { font-size:16px; color:var(--muted); line-height:1.75; margin-bottom:0; max-width:560px; }

        .roles-section { background:var(--cream); }
        .roles-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:20px; margin-top:48px; }
        .role-card { border-radius:24px; padding:32px; position:relative; overflow:hidden; border:1px solid var(--warm); }
        .role-card.school  { background:linear-gradient(160deg,#f0f4ff,#e8e4ff); }
        .role-card.teacher { background:linear-gradient(160deg,#f0fdf4,#e8f5e9); }
        .role-card.student { background:linear-gradient(160deg,var(--saffron-light),#fffdf0); }
        .role-card.parent  { background:linear-gradient(160deg,#fce7f3,#ffe4e6); }
        .role-emoji { font-size:40px; display:block; margin-bottom:16px; }
        .role-name { font-family:var(--serif); font-size:22px; color:var(--indigo); margin-bottom:10px; }
        .role-desc { font-size:13px; color:var(--muted); line-height:1.7; margin-bottom:20px; }
        .role-features { list-style:none; margin-bottom:24px; display:flex; flex-direction:column; gap:7px; }
        .role-features li { font-size:12px; color:var(--text); padding-left:16px; position:relative; }
        .role-features li::before { content:'✓'; position:absolute; left:0; color:var(--green); font-weight:700; }
        .btn-role { padding:10px 22px; background:var(--indigo); border:none; border-radius:10px; color:#fff; font-family:var(--sans); font-size:13px; font-weight:700; cursor:pointer; transition:.2s; }
        .btn-role:hover { background:var(--indigo2); transform:translateY(-1px); }

        .tools-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:20px; margin-top:48px; }
        .tool-card { background:#fff; border-radius:20px; padding:28px 24px; border:1px solid var(--warm); transition:.3s; }
        .tool-card:hover { transform:translateY(-4px); box-shadow:var(--shadow2); }
        .tool-icon-wrap { width:52px; height:52px; border-radius:14px; display:grid; place-items:center; font-size:24px; margin-bottom:16px; }
        .tool-name { font-family:var(--serif); font-size:17px; color:var(--indigo); margin-bottom:8px; }
        .tool-desc { font-size:13px; color:var(--muted); line-height:1.65; }

        .how-section { background:linear-gradient(160deg,var(--indigo),var(--indigo2)); position:relative; overflow:hidden; }
        .how-section h2, .how-section .section-label { color:#fff; }
        .how-section .section-label { background:rgba(255,255,255,.1); border-color:rgba(255,255,255,.2); color:rgba(255,255,255,.9); }
        .how-section .section-sub { color:rgba(255,255,255,.65); }
        .steps-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:2px; margin-top:56px; position:relative; }
        .step { background:rgba(255,255,255,.06); border-radius:20px; padding:32px 24px; text-align:center; border:1px solid rgba(255,255,255,.08); transition:.3s; }
        .step:hover { background:rgba(255,255,255,.1); }
        .step-num { width:56px; height:56px; border-radius:50%; background:linear-gradient(135deg,var(--saffron),var(--saffron2)); font-family:var(--serif); font-size:24px; color:#fff; display:grid; place-items:center; margin:0 auto 18px; box-shadow:0 6px 20px rgba(232,118,26,.4); }
        .step-title { font-family:var(--serif); font-size:18px; color:#fff; margin-bottom:10px; }
        .step-desc { font-size:13px; color:rgba(255,255,255,.55); line-height:1.65; }

        .boards-section { background:var(--paper); }
        .boards-wrap { display:flex; gap:12px; flex-wrap:wrap; margin-top:40px; }
        .board-pill { padding:11px 24px; border-radius:50px; background:#fff; border:1.5px solid var(--warm); font-size:13px; font-weight:600; color:var(--text); transition:.2s; cursor:default; }
        .board-pill:hover { border-color:var(--saffron); color:var(--saffron); background:var(--saffron-light); }

        .testi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-top:56px; }
        .testi-card { background:var(--paper); border-radius:20px; padding:32px; border:1px solid var(--warm); }
        .stars { color:var(--saffron2); font-size:14px; margin-bottom:14px; }
        .testi-quote { font-size:14px; color:var(--text); line-height:1.75; margin-bottom:20px; font-style:italic; }
        .testi-author { display:flex; align-items:center; gap:12px; }
        .testi-av { width:44px; height:44px; border-radius:50%; display:grid; place-items:center; font-size:22px; background:var(--warm); flex-shrink:0; }
        .testi-name { font-size:14px; font-weight:700; color:var(--indigo); }
        .testi-role { font-size:12px; color:var(--muted); }

        footer { background:var(--text); color:rgba(255,255,255,.55); padding:64px 40px 32px; }
        .footer-inner { max-width:1200px; margin:0 auto; }
        .footer-top { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:48px; margin-bottom:48px; }
        .footer-col h4 { font-size:12px; font-weight:700; color:#fff; margin-bottom:16px; text-transform:uppercase; letter-spacing:.8px; }
        .footer-col ul { list-style:none; }
        .footer-col ul li { margin-bottom:10px; }
        .footer-col ul li a { font-size:13px; color:rgba(255,255,255,.45); text-decoration:none; transition:.2s; }
        .footer-col ul li a:hover { color:#fff; }
        .footer-bottom { border-top:1px solid rgba(255,255,255,.08); padding-top:24px; display:flex; justify-content:space-between; align-items:center; font-size:12px; }

        @media(max-width:900px) {
          .roles-grid, .testi-grid { grid-template-columns:1fr; }
          .steps-grid { grid-template-columns:1fr 1fr; }
          .footer-top { grid-template-columns:1fr 1fr; }
          nav { padding:0 20px; }
          .nav-links, .nav-ctas { display:none; }
          .menu-toggle { display:block; }
          .hero { padding:100px 20px 60px; }
          .section { padding:64px 20px; }
        }
      `}</style>
    </div>
  )
}
