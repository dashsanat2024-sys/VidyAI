import Logo from '../components/shared/Logo'

import { useState, useEffect, useRef } from 'react'
import AuthModal from '../components/auth/AuthModal'
import { apiPost } from '../utils/api'

const BOARDS = ['CBSE','ICSE / ISC','Maharashtra Board','Tamil Nadu Board','Karnataka Board','Kerala Board','UP Board','Gujarat Board','Rajasthan Board','West Bengal Board','Telangana Board','NIOS']

const STATS = [
  { num: '36', label: 'States & UTs' },
  { num: '35+', label: 'Boards Covered' },
  { num: '2M+', label: 'Questions Generated' },
  { num: '500+', label: 'Schools Onboarded' },
]

const FEATURES = [
  { icon: '📝', color: '#EEF2FF', label: 'AI Summariser', desc: '10-point chapter summaries with real-world examples. Exam-ready in seconds.' },
  { icon: '🃏', color: '#FEF3C7', label: 'Smart Flashcards', desc: 'Generate 5–20 Q&A cards per chapter. Flip to test yourself instantly.' },
  { icon: '🖋️', color: '#D1FAE5', label: 'Question Master', desc: 'Create printable exam papers with answer keys. Mixed or section-wise.' },
  { icon: '🔊', color: '#FCE7F3', label: 'Audio Lessons', desc: 'Listen to your chapter explained like a teacher — hands-free learning.' },
  { icon: '📹', color: '#E0F2FE', label: 'AI Video Teacher', desc: 'Ms. Vidya explains chapters with animated slides and examples.' },
  { icon: '📊', color: '#CCFBF1', label: 'Bulk Evaluation', desc: 'Upload answer sheets. AI grades, scores, and emails reports to parents.' },
]

const STEPS = [
  { n: '01', title: 'Choose Your Board', desc: 'Select from CBSE, ICSE or any of 35+ state boards. Pick your class and subject.' },
  { n: '02', title: 'Load the Chapter', desc: 'Official NCERT & state board chapter lists load instantly. Select one or many.' },
  { n: '03', title: 'Pick an AI Tool', desc: 'Summarise, flashcard, practice, audio lesson or AI video — one tap.' },
  { n: '04', title: 'Learn & Evaluate', desc: 'Study, generate exam papers, evaluate answer sheets, and share reports.' },
]

const TESTIMONIALS = [
  {
    quote: 'Paarthivi cut my exam paper preparation from 3 hours to under 5 minutes. The AI-generated questions are better than what I was writing manually.',
    name: 'Mrs. Priya Sharma', role: 'Science Teacher', school: 'Delhi Public School', emoji: '👩‍🏫',
  },
  {
    quote: 'Our Class 10 board results improved by 23% after we introduced Paarthivi summaries and flashcards. Students actually enjoy studying now.',
    name: 'Mr. Rajesh Kumar', role: 'Principal', school: "St. Xavier's School, Mumbai", emoji: '🏫',
  },
  {
    quote: 'The AI tutor answers my questions at midnight, never gets impatient, and uses examples from real life. I got 94% in my boards!',
    name: 'Ananya Iyer', role: 'Class 12 Student', school: 'Chennai', emoji: '🎒',
  },
]

function useFadeIn() {
  const ref = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('lp-visible') }),
      { threshold: 0.08 }
    )
    const el = ref.current
    if (el) el.querySelectorAll('.lp-fade').forEach(x => obs.observe(x))
    return () => obs.disconnect()
  }, [])
  return ref
}

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalForm, setModalForm] = useState('login')
  const [modalRole, setModalRole] = useState('student')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pageRef = useFadeIn()

  const openModal = (form = 'login', role = 'student') => {
    setModalForm(form); setModalRole(role); setModalOpen(true)
  }

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    // Track visitor
    apiPost('/visitors/track', {})
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div id="lp" ref={pageRef}>

      {/* ════════════════════ NAV ════════════════════ */}
      <nav className={`lp-nav${scrolled ? ' lp-nav-scrolled' : ''}`}>
        <a className="lp-nav-brand" href="#">
          <Logo size={42} full={true} />
        </a>
        <div className="lp-nav-links">
          <a href="#roles">For Schools</a>
          <a href="#features">Features</a>
          <a href="#how">How it Works</a>
          <a href="#boards">Boards</a>
        </div>
        <div className="lp-nav-actions">
          <button className="lp-btn-ghost" onClick={() => openModal('login')}>Sign In</button>
          <button className="lp-btn-primary" onClick={() => openModal('register')}>Get Started Free →</button>
        </div>
        <button className="lp-hamburger" onClick={() => setMobileMenu(true)} aria-label="Open menu">
          <span/><span/><span/>
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenu && (
        <div className="lp-mobile-overlay" onClick={() => setMobileMenu(false)}>
          <div className="lp-mobile-drawer" onClick={e => e.stopPropagation()}>
            <div className="lp-mobile-top">
              <Logo size={36} full={true} />
              <button className="lp-mobile-close" onClick={() => setMobileMenu(false)}>✕</button>
            </div>
            <nav className="lp-mobile-links">
              {['#roles','#features','#how','#boards'].map((h, i) => (
                <a key={h} href={h} onClick={() => setMobileMenu(false)}>
                  {['For Schools','Features','How it Works','Boards'][i]}
                </a>
              ))}
            </nav>
            <div className="lp-mobile-btns">
              <button className="lp-btn-ghost" style={{ width:'100%' }} onClick={() => { setMobileMenu(false); openModal('login') }}>Sign In</button>
              <button className="lp-btn-primary" style={{ width:'100%' }} onClick={() => { setMobileMenu(false); openModal('register') }}>Get Started Free →</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ HERO ════════════════════ */}
      <section className="lp-hero">
        <div className="lp-hero-bg">
          <div className="lp-hero-blob lp-hero-blob1" />
          <div className="lp-hero-blob lp-hero-blob2" />
          <div className="lp-hero-grid" />
        </div>
        <div className="lp-hero-inner">
          <div className="lp-hero-badge lp-fade">
            <span className="lp-badge-dot"/>
            🇮🇳 Made for 36 Indian States &amp; UTs
          </div>
          <h1 className="lp-h1 lp-fade">
            The AI Teacher<br/>
            Every <span className="lp-gradient-text">Indian Student</span><br/>
            Deserves
          </h1>
          <p className="lp-hero-sub lp-fade">
            NCERT to State boards — AI summaries, question papers, answer sheet evaluation, audio lessons and live chat with your textbook. All in one platform.
          </p>
          <div className="lp-hero-ctas lp-fade">
            <button className="lp-btn-hero-primary" onClick={() => openModal('register')}>
              🚀 Start Learning Free
            </button>
            <button className="lp-btn-hero-sec" onClick={() => openModal('login')}>
              Already have an account →
            </button>
          </div>
          <div className="lp-stats lp-fade">
            {STATS.map(s => (
              <div key={s.label} className="lp-stat">
                <div className="lp-stat-num">{s.num}</div>
                <div className="lp-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Hero visual — product mockup */}
        <div className="lp-hero-mockup lp-fade">
          <div className="lp-mockup-card">
            <div className="lp-mockup-header">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <img src="/paarthivi-icon.png" alt="P" style={{ width:22, height:22, objectFit:"contain" }} />
                <span style={{ fontWeight:700, fontSize:13 }}>Curriculum Hub</span>
              </div>
              <span style={{ fontSize:11, color:'#94a3b8' }}>CBSE · Class 10</span>
            </div>
            <div className="lp-mockup-subject">📖 Science — Chapter 1: Chemical Reactions</div>
            <div className="lp-mockup-tools">
              {['📝 Summarise','🃏 Flashcards','❓ Questions','🔊 Audio','📹 Video'].map(t => (
                <div key={t} className="lp-mockup-tool">{t}</div>
              ))}
            </div>
            <div className="lp-mockup-summary">
              <div className="lp-mockup-point"><span>1</span>A chemical reaction changes reactants into products with new properties…</div>
              <div className="lp-mockup-point"><span>2</span>Indicators like litmus paper help identify acids and bases in a solution…</div>
              <div className="lp-mockup-point lp-mockup-point-muted"><span>3</span>Oxidation involves gain of oxygen or loss of hydrogen…</div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════ TRUST BAR ════════════════════ */}
      <div className="lp-trust-bar">
        {['🎓 NCERT & State Board Aligned', '🔊 AI Audio & Video Lessons', '❓ One-Click Question Papers', '📊 AI Evaluation & Parent Reports', '🇮🇳 All 36 States & UTs'].map(item => (
          <div key={item} className="lp-trust-item">
            <span>{item.split(' ')[0]}</span>
            <span>{item.split(' ').slice(1).join(' ')}</span>
          </div>
        ))}
      </div>

      {/* ════════════════════ FOR WHOM ════════════════════ */}
      <section className="lp-section lp-bg-cream" id="roles">
        <div className="lp-section-inner">
          <div className="lp-section-eyebrow">WHO IS IT FOR?</div>
          <h2 className="lp-h2">Built for Every Role<br/>in Indian Education</h2>
          <p className="lp-section-sub">From classroom teachers to students and parents — Parvidya has tools tailored to your role.</p>
          <div className="lp-roles-grid">
            {[
              { emoji:'🏫', name:'School / College', color:'#e0e7ff', accent:'#4338ca',
                features:['Multi-board, multi-class setup','Institution-wide performance analytics','Bulk evaluation with parent reports','Teacher & student account management','AI question banks per subject'],
                cta:'Register School →', role:'school_admin' },
              { emoji:'👩‍🏫', name:'Teacher / Tutor', color:'#dcfce7', accent:'#16a34a',
                features:['NCERT & state curricula auto-loaded','One-click printable exam papers with keys','AI bulk answer sheet evaluation','Detailed parent email reports','Audio & video lesson creation'],
                cta:'Join as Teacher →', role:'teacher' },
              { emoji:'🎒', name:'Student', color:'#fef9c3', accent:'#ca8a04',
                features:['10-point AI chapter summaries','Smart revision flashcards','AI tutor chat — ask anything','Question practice with instant feedback','Audio & video explanations'],
                cta:'Join as Student →', role:'student' },
              { emoji:'👨‍👩‍👧', name:'Parent', color:'#fce7f3', accent:'#9d174d',
                features:['AI performance reports by email','Track exam scores & grades','Learning gap identification','School communication hub','Child progress over time'],
                cta:'Join as Parent →', role:'parent' },
            ].map((r, i) => (
              <div key={r.name} className="lp-role-card lp-fade" style={{ '--card-color': r.color, '--card-accent': r.accent, animationDelay: `${i * 0.08}s` }}>
                <div className="lp-role-emoji">{r.emoji}</div>
                <div className="lp-role-name">{r.name}</div>
                <ul className="lp-role-features">
                  {r.features.map(f => <li key={f}>{f}</li>)}
                </ul>
                <button className="lp-role-cta" onClick={() => openModal('register', r.role)}>{r.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ FEATURES ════════════════════ */}
      <section className="lp-section lp-bg-white" id="features">
        <div className="lp-section-inner">
          <div className="lp-section-eyebrow">AI TOOLS</div>
          <h2 className="lp-h2">Six Powerful Tools,<br/>One Platform</h2>
          <p className="lp-section-sub">Every tool works with your curriculum — select board, class and subject to begin.</p>
          <div className="lp-features-grid">
            {FEATURES.map((f, i) => (
              <div key={f.label} className="lp-feature-card lp-fade" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="lp-feature-icon" style={{ background: f.color }}>{f.icon}</div>
                <div className="lp-feature-name">{f.label}</div>
                <p className="lp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ HOW IT WORKS ════════════════════ */}
      <section className="lp-section lp-how-section" id="how">
        <div className="lp-section-inner">
          <div className="lp-section-eyebrow lp-eyebrow-light">HOW IT WORKS</div>
          <h2 className="lp-h2" style={{ color:'#fff' }}>Up and Running<br/>in Four Steps</h2>
          <p className="lp-section-sub" style={{ color:'rgba(255,255,255,.65)' }}>No setup, no installation. Works on mobile, tablet and desktop.</p>
          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <div key={s.n} className="lp-step lp-fade" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="lp-step-num">{s.n}</div>
                <div className="lp-step-title">{s.title}</div>
                <p className="lp-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ BOARDS ════════════════════ */}
      <section className="lp-section lp-bg-paper" id="boards">
        <div className="lp-section-inner">
          <div className="lp-section-eyebrow">CURRICULUM BOARDS</div>
          <h2 className="lp-h2">Works with All Major<br/>Indian Boards</h2>
          <p className="lp-section-sub">Government textbooks from official sources — always accurate, always current.</p>
          <div className="lp-boards-wrap">
            {BOARDS.map(b => <div key={b} className="lp-board-pill">{b}</div>)}
          </div>
        </div>
      </section>

      {/* ════════════════════ TESTIMONIALS ════════════════════ */}
      <section className="lp-section lp-bg-white" id="testimonials">
        <div className="lp-section-inner">
          <div className="lp-section-eyebrow">TESTIMONIALS</div>
          <h2 className="lp-h2">Loved by Teachers<br/>and Students Across India</h2>
          <div className="lp-testi-grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={t.name} className="lp-testi-card lp-fade" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="lp-stars">★★★★★</div>
                <p className="lp-testi-quote">"{t.quote}"</p>
                <div className="lp-testi-author">
                  <div className="lp-testi-av">{t.emoji}</div>
                  <div>
                    <div className="lp-testi-name">{t.name}</div>
                    <div className="lp-testi-role">{t.role} · {t.school}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ CTA BANNER ════════════════════ */}
      <section className="lp-cta-banner">
        <div className="lp-cta-inner">
          <h2 className="lp-cta-heading">Start Teaching Smarter Today</h2>
          <p className="lp-cta-sub">Free to start. No credit card required. All Indian boards supported.</p>
          <div className="lp-cta-btns">
            <button className="lp-btn-primary lp-btn-xl" onClick={() => openModal('register')}>
              🚀 Create Free Account
            </button>
            <button className="lp-btn-ghost lp-btn-xl" style={{ color:'#fff', borderColor:'rgba(255,255,255,.4)' }}
              onClick={() => openModal('login')}>
              Sign In →
            </button>
          </div>
        </div>
      </section>

      {/* ════════════════════ FOOTER ════════════════════ */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-top">
            <div className="lp-footer-brand">
              <div style={{ marginBottom:16 }}>
                <Logo size={36} full={true} dark={true} />
              </div>
              <p style={{ fontSize:13, lineHeight:1.75, color:'rgba(255,255,255,.45)', maxWidth:260 }}>
                AI-powered education for every Indian school and student. Making quality learning accessible across all 36 states.
              </p>
            </div>
            {[
              { heading: 'Platform', links: ['For Schools','For Teachers','For Students','For Parents'] },
              { heading: 'Features', links: ['AI Summaries','Flashcards','Question Papers','Evaluation','Audio Lessons'] },
              { heading: 'Support',  links: ['Help Center','Contact Us','Privacy Policy','Terms of Use'] },
            ].map(col => (
              <div key={col.heading} className="lp-footer-col">
                <h4>{col.heading}</h4>
                <ul>{col.links.map(l => <li key={l}><a href="#">{l}</a></li>)}</ul>
              </div>
            ))}
          </div>
          <div className="lp-footer-bottom">
            <p>© 2025 Parvidya. Made with ❤️ for Indian Education · Smart Learning with AI</p>
            <p>hello@parvidya.in</p>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} defaultForm={modalForm} defaultRole={modalRole} />

      <style>{`
        #lp * { box-sizing:border-box; }
        #lp { font-family:var(--sans); color:var(--text); }

        /* ── Fade-in ── */
        .lp-fade { opacity:0; transform:translateY(24px); transition:opacity .55s ease, transform .55s ease; }
        .lp-visible { opacity:1; transform:none; }

        /* ── NAV ── */
        .lp-nav {
          position:fixed; top:0; left:0; right:0; z-index:200;
          height:68px; display:flex; align-items:center;
          padding:0 40px; gap:32px;
          background:rgba(248,247,255,.88);
          backdrop-filter:blur(18px);
          border-bottom:1px solid transparent;
          transition:background .25s, border-color .25s, box-shadow .25s;
        }
        .lp-nav-scrolled {
          background:rgba(248,247,255,.97);
          border-color:rgba(109,40,217,.12);
          box-shadow:0 2px 20px rgba(109,40,217,.08);
        }
        .lp-nav-brand { display:flex; align-items:center; gap:10px; text-decoration:none; flex-shrink:0; }
        .lp-brand-name { font-family:var(--sans); font-size:18px; font-weight:800; color:var(--brand-dark,#4C1D95); line-height:1.1; }
        .lp-brand-sub  { font-size:10px; color:var(--muted,#6B7280); letter-spacing:.3px; }
        .lp-nav-links  { display:flex; gap:28px; margin-left:auto; }
        .lp-nav-links a { font-size:14px; font-weight:500; color:var(--muted,#6B7280); text-decoration:none; transition:.15s; }
        .lp-nav-links a:hover { color:#7C3AED; }
        .lp-nav-actions { display:flex; gap:10px; }
        .lp-hamburger { display:none; flex-direction:column; gap:5px; background:none; border:none; cursor:pointer; padding:6px; margin-left:auto; }
        .lp-hamburger span { display:block; width:24px; height:2px; background:#4C1D95; border-radius:2px; }

        /* Buttons */
        .lp-btn-primary { padding:10px 22px; background:linear-gradient(135deg,#6D28D9,#7C3AED); border:none; border-radius:10px; color:#fff; font-family:var(--sans); font-size:13px; font-weight:700; cursor:pointer; transition:.2s; white-space:nowrap; }
        .lp-btn-primary:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(109,40,217,.4); }
        .lp-btn-ghost { padding:10px 22px; background:transparent; border:1.5px solid #DDD6FE; border-radius:10px; color:var(--text,#1E1B4B); font-family:var(--sans); font-size:13px; font-weight:600; cursor:pointer; transition:.2s; white-space:nowrap; }
        .lp-btn-ghost:hover { background:#EDE9FE; border-color:#8B5CF6; }
        .lp-btn-xl { padding:14px 32px; font-size:15px; border-radius:12px; }

        /* Mobile menu */
        .lp-mobile-overlay { position:fixed; inset:0; background:rgba(30,27,75,.55); z-index:1000; backdrop-filter:blur(6px); }
        .lp-mobile-drawer { position:absolute; top:0; right:0; width:min(320px,90vw); height:100%; background:#fff; padding:24px; display:flex; flex-direction:column; animation:slideInRight .25s ease; }
        @keyframes slideInRight { from{transform:translateX(100%)} to{transform:none} }
        .lp-mobile-top { display:flex; align-items:center; gap:10px; margin-bottom:32px; }
        .lp-mobile-close { margin-left:auto; background:none; border:none; font-size:22px; cursor:pointer; color:var(--muted,#6B7280); width:36px; height:36px; display:grid; place-items:center; }
        .lp-mobile-links { display:flex; flex-direction:column; gap:6px; flex:1; }
        .lp-mobile-links a { display:block; padding:13px 14px; border-radius:10px; color:var(--text,#1E1B4B); text-decoration:none; font-size:15px; font-weight:600; transition:.15s; }
        .lp-mobile-links a:hover { background:#EDE9FE; color:#6D28D9; }
        .lp-mobile-btns { display:flex; flex-direction:column; gap:10px; padding-top:20px; border-top:1px solid #DDD6FE; }

        /* ── HERO ── */
        .lp-hero { min-height:100vh; display:flex; align-items:center; position:relative; overflow:hidden; padding:90px 40px 60px; gap:60px; background:linear-gradient(135deg, #F8F7FF 0%, #EDE9FE 50%, #DBEAFE 100%); }
        .lp-hero-bg { position:absolute; inset:0; z-index:0; pointer-events:none; }
        .lp-hero-blob { position:absolute; border-radius:50%; filter:blur(80px); }
        .lp-hero-blob1 { width:600px; height:600px; right:-150px; top:50%; transform:translateY(-50%); background:radial-gradient(circle,rgba(109,40,217,.18),transparent 70%); }
        .lp-hero-blob2 { width:400px; height:400px; left:-80px; bottom:-60px; background:radial-gradient(circle,rgba(14,165,233,.15),transparent 70%); }
        .lp-hero-grid { position:absolute; inset:0; background-image:linear-gradient(rgba(109,40,217,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(109,40,217,.06) 1px,transparent 1px); background-size:52px 52px; }
        .lp-hero-inner { position:relative; z-index:1; flex:1; max-width:600px; }
        .lp-hero-badge { display:inline-flex; align-items:center; gap:8px; background:linear-gradient(135deg,#EDE9FE,#DBEAFE); border:1px solid rgba(109,40,217,.2); border-radius:50px; padding:7px 18px; font-size:12px; font-weight:700; color:#6D28D9; margin-bottom:28px; letter-spacing:.3px; text-transform:uppercase; }
        .lp-badge-dot { width:7px; height:7px; border-radius:50%; background:#7C3AED; animation:pd 2s infinite; flex-shrink:0; }
        .lp-h1 { font-family:var(--serif,serif); font-size:clamp(40px,5.5vw,72px); line-height:1.07; color:#1E1B4B; margin-bottom:22px; }
        .lp-gradient-text { background:linear-gradient(135deg,#6D28D9,#2563EB); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; font-style:italic; }
        .lp-hero-sub { font-size:clamp(15px,1.8vw,19px); color:#6B7280; line-height:1.75; margin-bottom:36px; max-width:520px; }
        .lp-hero-ctas { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:52px; }
        .lp-btn-hero-primary { padding:14px 32px; background:linear-gradient(135deg,#6D28D9,#2563EB); border:none; border-radius:12px; color:#fff; font-family:var(--sans); font-size:15px; font-weight:700; cursor:pointer; transition:.2s; box-shadow:0 4px 18px rgba(109,40,217,.35); }
        .lp-btn-hero-primary:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(109,40,217,.45); }
        .lp-btn-hero-sec { padding:14px 28px; background:transparent; border:1.5px solid #DDD6FE; border-radius:12px; color:#1E1B4B; font-family:var(--sans); font-size:15px; font-weight:600; cursor:pointer; transition:.2s; }
        .lp-btn-hero-sec:hover { background:#EDE9FE; border-color:#7C3AED; }
        .lp-stats { display:flex; gap:40px; flex-wrap:wrap; }
        .lp-stat-num { font-family:var(--serif,serif); font-size:clamp(28px,3.5vw,38px); color:#4C1D95; line-height:1; }
        .lp-stat-label { font-size:12px; color:#6B7280; margin-top:4px; font-weight:500; }

        /* Hero mockup */
        .lp-hero-mockup { position:relative; z-index:1; flex-shrink:0; width:360px; display:none; }
        .lp-mockup-card { background:#fff; border-radius:20px; padding:22px; border:1px solid #DDD6FE; box-shadow:0 20px 60px rgba(109,40,217,.12),0 4px 16px rgba(109,40,217,.06); }
        .lp-mockup-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid #EDE9FE; }
        .lp-mockup-subject { font-size:13px; font-weight:700; color:#4C1D95; margin-bottom:12px; }
        .lp-mockup-tools { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px; }
        .lp-mockup-tool { padding:5px 10px; background:#F0EEFF; border-radius:50px; font-size:11px; font-weight:600; color:#6D28D9; border:1px solid #DDD6FE; }
        .lp-mockup-summary { display:flex; flex-direction:column; gap:8px; }
        .lp-mockup-point { display:flex; gap:10px; align-items:flex-start; font-size:12px; color:#1E1B4B; line-height:1.55; }
        .lp-mockup-point span { width:20px; height:20px; border-radius:50%; background:linear-gradient(135deg,#6D28D9,#2563EB); color:#fff; display:grid; place-items:center; font-size:10px; font-weight:800; flex-shrink:0; }
        .lp-mockup-point-muted { opacity:.5; }

        /* ── TRUST BAR ── */
        .lp-trust-bar { background:linear-gradient(135deg,#4C1D95,#6D28D9,#1D4ED8); padding:16px 40px; display:flex; gap:32px; justify-content:center; flex-wrap:wrap; overflow:hidden; }
        .lp-trust-item { display:flex; align-items:center; gap:8px; color:rgba(255,255,255,.85); font-size:13px; font-weight:500; white-space:nowrap; }

        /* ── SECTIONS ── */
        .lp-section { padding:96px 40px; }
        .lp-section-inner { max-width:1200px; margin:0 auto; }
        .lp-bg-cream  { background:#F8F7FF; }
        .lp-bg-white  { background:#fff; }
        .lp-bg-paper  { background:#F0EEFF; }
        .lp-section-eyebrow { display:inline-block; font-size:11px; font-weight:800; letter-spacing:1.2px; color:#7C3AED; text-transform:uppercase; margin-bottom:12px; }
        .lp-eyebrow-light { color:rgba(255,255,255,.7); }
        .lp-h2 { font-family:var(--serif,serif); font-size:clamp(30px,4vw,50px); line-height:1.1; color:#1E1B4B; margin-bottom:16px; }
        .lp-section-sub { font-size:16px; color:#6B7280; line-height:1.75; max-width:540px; margin-bottom:0; }

        /* ── ROLES ── */
        .lp-roles-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:18px; margin-top:48px; }
        .lp-role-card { background:var(--card-color); border-radius:22px; padding:28px; border:1.5px solid transparent; transition:.25s; cursor:default; display:flex; flex-direction:column; }
        .lp-role-card:hover { transform:translateY(-4px); box-shadow:0 12px 40px rgba(109,40,217,.12); border-color:var(--card-accent); }
        .lp-role-emoji { font-size:38px; margin-bottom:14px; }
        .lp-role-name  { font-family:var(--serif,serif); font-size:21px; color:#1E1B4B; margin-bottom:14px; }
        .lp-role-features { list-style:none; display:flex; flex-direction:column; gap:7px; flex:1; margin-bottom:20px; }
        .lp-role-features li { font-size:12.5px; color:#1E1B4B; padding-left:18px; position:relative; line-height:1.5; }
        .lp-role-features li::before { content:'✓'; position:absolute; left:0; color:var(--card-accent,#6D28D9); font-weight:800; }
        .lp-role-cta { padding:10px 20px; background:#4C1D95; border:none; border-radius:10px; color:#fff; font-family:var(--sans); font-size:13px; font-weight:700; cursor:pointer; transition:.2s; align-self:flex-start; }
        .lp-role-cta:hover { background:#6D28D9; transform:translateY(-1px); }

        /* ── FEATURES ── */
        .lp-features-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:20px; margin-top:48px; }
        .lp-feature-card { background:#fff; border-radius:18px; padding:26px 22px; border:1px solid #DDD6FE; transition:.25s; }
        .lp-feature-card:hover { transform:translateY(-5px); box-shadow:0 14px 40px rgba(109,40,217,.12); }
        .lp-feature-icon { width:52px; height:52px; border-radius:14px; display:grid; place-items:center; font-size:24px; margin-bottom:16px; }
        .lp-feature-name { font-family:var(--serif,serif); font-size:17px; color:#1E1B4B; margin-bottom:8px; }
        .lp-feature-desc { font-size:13px; color:#6B7280; line-height:1.65; }

        /* ── HOW ── */
        .lp-how-section { background:linear-gradient(155deg,#2D1B69 0%,#4C1D95 50%,#1E3A8A 100%); position:relative; overflow:hidden; }
        .lp-how-section::before { content:''; position:absolute; inset:0; background:url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='1' fill='rgba(255,255,255,.05)'/%3E%3C/svg%3E"); }
        .lp-steps { display:grid; grid-template-columns:repeat(4,1fr); gap:4px; margin-top:52px; position:relative; }
        .lp-step { background:rgba(255,255,255,.07); border-radius:18px; padding:28px 22px; text-align:center; border:1px solid rgba(255,255,255,.1); transition:.25s; }
        .lp-step:hover { background:rgba(255,255,255,.12); }
        .lp-step-num { font-family:var(--serif,serif); font-size:32px; color:#A78BFA; margin-bottom:14px; display:block; }
        .lp-step-title { font-family:var(--serif,serif); font-size:18px; color:#fff; margin-bottom:10px; }
        .lp-step-desc { font-size:13px; color:rgba(255,255,255,.55); line-height:1.65; }

        /* ── BOARDS ── */
        .lp-boards-wrap { display:flex; gap:10px; flex-wrap:wrap; margin-top:36px; }
        .lp-board-pill { padding:10px 22px; border-radius:50px; background:#fff; border:1.5px solid #DDD6FE; font-size:13px; font-weight:600; color:#1E1B4B; transition:.2s; cursor:default; }
        .lp-board-pill:hover { border-color:#7C3AED; color:#6D28D9; background:#EDE9FE; }

        /* ── TESTIMONIALS ── */
        .lp-testi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-top:48px; }
        .lp-testi-card { background:#F0EEFF; border-radius:20px; padding:28px; border:1px solid #DDD6FE; transition:.25s; }
        .lp-testi-card:hover { transform:translateY(-3px); box-shadow:0 12px 40px rgba(109,40,217,.12); }
        .lp-stars { color:#7C3AED; font-size:15px; margin-bottom:12px; letter-spacing:2px; }
        .lp-testi-quote { font-size:14px; color:#1E1B4B; line-height:1.75; margin-bottom:18px; font-style:italic; }
        .lp-testi-author { display:flex; align-items:center; gap:12px; }
        .lp-testi-av { width:42px; height:42px; border-radius:50%; background:#DDD6FE; display:grid; place-items:center; font-size:20px; flex-shrink:0; }
        .lp-testi-name { font-size:14px; font-weight:700; color:#1E1B4B; }
        .lp-testi-role { font-size:11px; color:#6B7280; margin-top:2px; }

        /* ── CTA BANNER ── */
        .lp-cta-banner { background:linear-gradient(135deg,#4C1D95,#6D28D9,#1D4ED8); padding:80px 40px; text-align:center; }
        .lp-cta-inner  { max-width:680px; margin:0 auto; }
        .lp-cta-heading { font-family:var(--serif,serif); font-size:clamp(28px,4vw,44px); color:#fff; margin-bottom:14px; line-height:1.1; }
        .lp-cta-sub { font-size:16px; color:rgba(255,255,255,.8); margin-bottom:36px; line-height:1.65; }
        .lp-cta-btns { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; }

        /* ── FOOTER ── */
        .lp-footer { background:#1E1B4B; padding:64px 40px 32px; }
        .lp-footer-inner { max-width:1200px; margin:0 auto; }
        .lp-footer-top { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:48px; margin-bottom:48px; }
        .lp-footer-brand { }
        .lp-footer-col h4 { font-size:11px; font-weight:800; color:#fff; margin-bottom:16px; text-transform:uppercase; letter-spacing:1px; }
        .lp-footer-col ul { list-style:none; }
        .lp-footer-col ul li { margin-bottom:10px; }
        .lp-footer-col ul li a { font-size:13px; color:rgba(255,255,255,.4); text-decoration:none; transition:.2s; }
        .lp-footer-col ul li a:hover { color:#A78BFA; }
        .lp-footer-bottom { border-top:1px solid rgba(255,255,255,.08); padding-top:24px; display:flex; justify-content:space-between; align-items:center; font-size:12px; color:rgba(255,255,255,.35); flex-wrap:wrap; gap:8px; }

        /* ── RESPONSIVE ── */
        @media(min-width:1100px) { .lp-hero-mockup { display:block; } }
        @media(max-width:900px) {
          .lp-nav { padding:0 20px; }
          .lp-nav-links, .lp-nav-actions { display:none; }
          .lp-hamburger { display:flex; }
          .lp-hero { padding:90px 20px 52px; flex-direction:column; gap:0; }
          .lp-section { padding:64px 20px; }
          .lp-trust-bar { padding:16px 20px; gap:16px; }
          .lp-roles-grid { grid-template-columns:1fr 1fr; }
          .lp-testi-grid { grid-template-columns:1fr; }
          .lp-steps { grid-template-columns:1fr 1fr; gap:12px; }
          .lp-footer-top { grid-template-columns:1fr 1fr; gap:32px; }
          .lp-stats { gap:24px; }
          .lp-cta-banner { padding:60px 20px; }
        }
        @media(max-width:600px) {
          .lp-hero { padding:82px 16px 48px; }
          .lp-roles-grid { grid-template-columns:1fr; }
          .lp-features-grid { grid-template-columns:1fr 1fr; }
          .lp-steps { grid-template-columns:1fr; }
          .lp-footer-top { grid-template-columns:1fr; gap:28px; }
          .lp-hero-ctas { flex-direction:column; }
          .lp-btn-hero-primary, .lp-btn-hero-sec { width:100%; text-align:center; }
          .lp-cta-btns { flex-direction:column; align-items:center; }
          .lp-section { padding:52px 16px; }
          .lp-trust-bar { justify-content:flex-start; }
        }
      `}</style>
    </div>
  )
}
