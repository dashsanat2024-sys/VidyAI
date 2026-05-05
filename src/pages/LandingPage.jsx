import { useState, useEffect, useRef } from 'react'
import Logo from '../components/shared/Logo'
import AuthModal from '../components/auth/AuthModal'
import { useAuth } from '../context/AuthContext'
import './LandingPage.css'

/** Drop PNG/JPG files into public/assets/lp/ — first URL that loads wins. */
const HERO_IMAGE_CANDIDATES = ['/assets/lp/hero-evaluation.png', '/assets/lp/arthavi-hero-40-papers-promo.png']
const SCREENSHOT_DASHBOARD = '/assets/lp/screenshot-dashboard.png'
const SCREENSHOT_EVAL = '/assets/lp/screenshot-evaluation.png'
const SCREENSHOT_PAPERS = '/assets/lp/screenshot-question-papers.png'
const SCREENSHOT_TUTOR = '/assets/lp/screenshot-ai-tutor.png'
const SCREENSHOT_PARENT = '/assets/lp/screenshot-parent-report.png'

/** Probes URL(s); returns chosen URL, false if none load, or null while checking. */
function useFirstWorkingImage(urls) {
  const list = typeof urls === 'string' ? [urls] : urls
  const key = list.join('|')
  const [resolved, setResolved] = useState(null)
  useEffect(() => {
    setResolved(null)
    let cancelled = false
    let i = 0
    const tryNext = () => {
      if (i >= list.length) {
        if (!cancelled) setResolved(false)
        return
      }
      const im = new Image()
      im.onload = () => {
        if (!cancelled) setResolved(list[i])
      }
      im.onerror = () => {
        i += 1
        tryNext()
      }
      im.src = list[i]
    }
    tryNext()
    return () => {
      cancelled = true
    }
  }, [key])
  return resolved
}

function ScrollReveal({ children, className = '' }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true)
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`lp-reveal ${visible ? 'lp-reveal-visible' : ''} ${className}`.trim()}>
      {children}
    </div>
  )
}

function ProductScreenshot({ src, alt, children }) {
  const ok = useFirstWorkingImage(src)
  if (ok === false) return children
  if (ok === null) return <div className="lp-shot-skeleton" aria-hidden />
  return (
    <figure className="lp-shot-figure">
      <img className="lp-product-shot" src={ok} alt={alt} loading="lazy" decoding="async" />
    </figure>
  )
}

function HeroPromoVisual() {
  const heroSrc = useFirstWorkingImage(HERO_IMAGE_CANDIDATES)
  return (
    <div className="lp-hero-promo">
      <div className="lp-hero-promo-badge" aria-hidden>40 sheets · ~5 min · marks + feedback</div>
      <div className="lp-hero-promo-img">
        {heroSrc === null ? (
          <div className="lp-hero-img-placeholder" aria-hidden />
        ) : heroSrc ? (
          <img
            src={heroSrc}
            alt="Upload 40 handwritten papers — get marks and feedback in about five minutes"
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className="lp-hero-img-fallback" role="img" aria-label="Upload 40 handwritten papers — get marks and feedback in about five minutes" />
        )}
      </div>
      <p className="lp-hero-promo-caption">From paper stacks → instant insights</p>
      <div className="lp-hero-promo-float lp-float-a">
        <span className="lp-float-ico" aria-hidden>📄</span>
        <div>
          <strong>Question paper ready</strong>
          <small>Marking scheme · ~30 sec</small>
        </div>
      </div>
      <div className="lp-hero-promo-float lp-float-b">
        <span className="lp-float-ico" aria-hidden>🤖</span>
        <div>
          <strong>AI tutor online</strong>
          <small>24/7 · Your syllabus</small>
        </div>
      </div>
    </div>
  )
}

function DashboardInsightMockup() {
  const topics = [
    { label: 'Mechanics', pct: 88, c: 'var(--lp-purple-mid)' },
    { label: 'Photosynthesis', pct: 62, c: 'var(--lp-orange)' },
    { label: 'Organic Chem', pct: 74, c: 'var(--lp-purple)' },
    { label: 'Algebra', pct: 91, c: 'var(--lp-green)' },
  ]
  return (
    <div className="dash-mock">
      <div className="dash-mock-top">
        <div className="dash-mock-dots">
          <span style={{ background: '#FF5F57' }} />
          <span style={{ background: '#FFBD2E' }} />
          <span style={{ background: '#28CA41' }} />
        </div>
        <span>Arthavi · Evaluation insights</span>
      </div>
      <div className="dash-mock-body">
        <aside className="dash-side" aria-hidden>
          {['Dashboard', 'Papers', 'AI Eval', 'Analytics', 'Reports'].map((t) => (
            <div key={t} className="dash-side-i">{t}</div>
          ))}
        </aside>
        <main className="dash-main">
          <div className="dash-profile">
            <div>
              <strong>Arjun Sharma</strong>
              <span className="dash-profile-sub">Class 12 · Science · CBSE</span>
            </div>
            <span className="dash-pill-ok">Strong performance</span>
          </div>
          <div className="dash-cards-row">
            <div className="dash-card-score">
              <span className="dash-card-label">Your score</span>
              <div className="dash-card-big">8<span className="slash">/10</span></div>
              <p className="dash-card-hint">Great job — keep practising diagrams!</p>
            </div>
            <div className="dash-card-donut">
              <div className="dash-donut-wrap">
                <div
                  className="dash-donut"
                  style={{
                    background:
                      'conic-gradient(var(--lp-green) 0 252deg, var(--lp-amber) 252deg 306deg, var(--lp-red) 306deg 360deg)',
                  }}
                />
                <div className="dash-donut-hole">
                  <strong>80%</strong>
                  <span>overall</span>
                </div>
              </div>
            </div>
          </div>
          <div className="dash-panel">
            <div className="dash-panel-hd">Highlighted feedback</div>
            <ul className="dash-mistakes">
              <li><span className="dm-q">Newton&apos;s 3rd law</span><span className="dm-d">−1</span></li>
              <li><span className="dm-q">Photosynthesis steps</span><span className="dm-d">−1</span></li>
            </ul>
            <div className="dash-ai-tip">
              <strong>AI tip:</strong> Label forces on free-body diagrams; mention action–reaction pairs explicitly.
            </div>
          </div>
          <div className="dash-panel">
            <div className="dash-panel-hd">Topic-wise</div>
            <div className="dash-topics">
              {topics.map((t) => (
                <div key={t.label} className="dash-topic-row">
                  <span>{t.label}</span>
                  <div className="dash-topic-bar"><div style={{ width: `${t.pct}%`, background: t.c }} /></div>
                  <span className="dash-topic-pct">{t.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
      <div className="dash-mock-foot">
        Evaluated by Arthavi · 5 minutes · 40 papers · Instant parent-ready report
      </div>
    </div>
  )
}

function EvalMockup() {
  const results = [
    { name: 'Riya S.', score: 92, grade: 'A' },
    { name: 'Arjun K.', score: 78, grade: 'B+' },
    { name: 'Priya M.', score: 85, grade: 'A-' },
    { name: 'Dev R.', score: 71, grade: 'B' },
    { name: 'Sneha P.', score: 88, grade: 'A' },
  ]
  return (
    <div className="mk-frame mk-eval">
      <div className="mk-bar">
        <div className="mk-dots"><span className="d-r" /><span className="d-y" /><span className="d-g" /></div>
        <span>Arthavi · Bulk Evaluation</span>
      </div>
      <div className="mk-chips">
        {['01', '02', '03', '04', '05'].map((n) => (
          <div key={n} className="mk-chip">sheet_{n}.pdf</div>
        ))}
        <div className="mk-chip mk-chip-more">+35 more</div>
      </div>
      <div className="mk-proc">
        <span className="mk-proc-dot" />
        AI evaluating all 40 sheets simultaneously
      </div>
      <div className="mk-results">
        {results.map((r, i) => (
          <div key={i} className="mk-row">
            <span className="mk-name">{r.name}</span>
            <div className="mk-bar-bg"><div className="mk-bar-fill" style={{ width: `${r.score}%` }} /></div>
            <span className="mk-pct">{r.score}%</span>
            <span className={`mk-grade ${r.score >= 85 ? 'gA' : 'gB'}`}>{r.grade}</span>
          </div>
        ))}
      </div>
      <div className="mk-foot">
        <span>40 sheets · 4 min 32 sec</span>
        <span className="mk-saved">3.5 hrs saved</span>
      </div>
    </div>
  )
}

function ChatMockup() {
  return (
    <div className="mk-frame mk-chat">
      <div className="mk-bar">
        <div className="mk-dots"><span className="d-r" /><span className="d-y" /><span className="d-g" /></div>
        <div className="mk-chat-hd">
          <div className="mk-ai-av">A</div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Arthavi AI Tutor</div>
            <div className="mk-online"><span className="mk-online-dot" />Always available</div>
          </div>
        </div>
      </div>
      <div className="mk-msgs">
        <div className="mk-msg user">Explain Newton&apos;s 2nd law simply</div>
        <div className="mk-msg ai">F = ma. Force equals mass × acceleration. Push a heavy vs light box — lighter one moves faster!</div>
        <div className="mk-msg user">Give me 3 practice questions</div>
        <div className="mk-msg ai">
          <div className="mk-qs-head">Practice set</div>
          <div className="mk-qs">Q1. 5 kg box, 20 N force — find a.</div>
          <div className="mk-qs">Q2. Car 1200 kg, a = 3 m/s² — net force?</div>
          <div className="mk-qs">Q3. Compare force for 2 kg vs 8 kg at same a.</div>
        </div>
      </div>
      <div className="mk-input-row">
        <div className="mk-input">Ask anything from your syllabus...</div>
        <button type="button" className="mk-send">Send</button>
      </div>
    </div>
  )
}

function PaperAndMarkingMockup() {
  return (
    <div className="paper-split mk-frame" style={{ animation: 'none' }}>
      <div className="paper-split-top">
        <div className="mk-dots"><span className="d-r" /><span className="d-y" /><span className="d-g" /></div>
        <span>Question paper + Marking scheme</span>
        <span className="paper-split-badge">Generated</span>
      </div>
      <div className="paper-split-body">
        <div className="paper-col">
          <div className="paper-col-hd">Question paper</div>
          <div className="mk-ptags" style={{ margin: 0, borderRadius: 0 }}>
            {['CBSE', 'Class 10', 'Science', '80 marks', '90 min'].map((t) => (
              <span key={t} className="mk-ptag">{t}</span>
            ))}
          </div>
          <div className="paper-col-inner">
            <p className="paper-q"><strong>1.</strong> Define photosynthesis. <span className="paper-marks">(2)</span></p>
            <p className="paper-q"><strong>2.</strong> State Newton&apos;s second law. <span className="paper-marks">(2)</span></p>
            <p className="paper-q dim"><strong>3.</strong> Explain water cycle with diagram. <span className="paper-marks">(5)</span></p>
          </div>
        </div>
        <div className="paper-col paper-col-scheme">
          <div className="paper-col-hd">Marking scheme</div>
          <div className="scheme-rows">
            <div className="scheme-row"><span>Q1 — keywords: chlorophyll, sunlight, glucose</span><span className="scheme-pts">2</span></div>
            <div className="scheme-row"><span>Q2 — F = ma + one example</span><span className="scheme-pts">2</span></div>
            <div className="scheme-row"><span>Q3 — evaporation, condensation, precipitation + diagram</span><span className="scheme-pts">5</span></div>
          </div>
          <div className="scheme-total">Total · 80 marks · Answer key attached</div>
        </div>
      </div>
    </div>
  )
}

function ParentReportMockup() {
  const subs = [
    { n: 'Mathematics', pct: 88, c: 'linear-gradient(90deg, var(--lp-purple-mid), var(--lp-purple))' },
    { n: 'Science', pct: 51, c: 'linear-gradient(90deg, var(--lp-orange), var(--lp-orange-light))' },
    { n: 'English', pct: 92, c: 'linear-gradient(90deg, var(--lp-green), #22c55e)' },
  ]
  return (
    <div className="parent-report mk-frame" style={{ animation: 'none' }}>
      <div className="parent-report-head">
        <div>
          <div className="pr-title">Priya Sharma · Class X-A</div>
          <div className="pr-sub">Monthly report · Auto-sent to parent</div>
        </div>
        <div className="pr-score-block">
          <div className="pr-score">74%</div>
          <div className="pr-score-lbl">Overall</div>
        </div>
      </div>
      <div className="parent-report-body">
        {subs.map((s) => (
          <div key={s.n} className="pr-row">
            <div className="pr-meta"><span>{s.n}</span><strong>{s.pct}%</strong></div>
            <div className="pr-bar"><div style={{ width: `${s.pct}%`, background: s.c }} /></div>
          </div>
        ))}
        <div className="pr-insight">
          <span className="pr-dot" style={{ background: 'var(--lp-orange)' }} />
          <span><strong>Focus:</strong> Chemical equations in Science — a 5-day AI practice plan is ready.</span>
        </div>
      </div>
    </div>
  )
}

const VALUE_CARDS = [
  {
    n: '01',
    icon: '📄',
    title: '40 sheets in minutes',
    lines: ['Upload papers', '→ Get marks instantly', '→ See detailed feedback'],
    accent: 'purple',
  },
  {
    n: '02',
    icon: '📝',
    title: 'Papers + marking scheme',
    lines: ['Pick board, class, weightage', '→ Exam PDF + answer key', '→ CBSE, ICSE, 35+ boards'],
    accent: 'orange',
  },
  {
    n: '03',
    icon: '🤖',
    title: '24/7 AI tutor',
    lines: ['Syllabus-specific doubts', '→ Unlimited practice', '→ Audio-friendly explanations'],
    accent: 'green',
  },
  {
    n: '04',
    icon: '💰',
    title: 'Skip pricey tuition',
    lines: ['One platform', '→ Evaluation + practice + reports', '→ Fraction of tuition spend'],
    accent: 'amber',
  },
  {
    n: '05',
    icon: '🇮🇳',
    title: 'India-first curricula',
    lines: ['CBSE · ICSE · State boards', '→ Official chapter alignment', '→ Not generic international-only'],
    accent: 'purple',
  },
]

const audiencePanels = {
  schools: {
    tabLabel: 'Schools (Primary)',
    tabEmoji: '🏫',
    title: 'Schools & Teachers',
    shotSrc: SCREENSHOT_EVAL,
    shotAlt: 'Arthavi bulk AI evaluation results with scores and grades per student',
    bullets: [
      'Evaluate 40 handwritten papers in minutes',
      'Generate board-aligned papers + answer keys in 30 seconds',
      'Auto-send parent reports after every evaluation',
      'Spot at-risk students early with class-level analytics',
    ],
    visual: <EvalMockup />,
  },
  students: {
    tabLabel: 'Students',
    tabEmoji: '🎓',
    title: 'Students',
    shotSrc: SCREENSHOT_TUTOR,
    shotAlt: 'Arthavi AI tutor chat with syllabus-based explanations and practice',
    bullets: [
      '24/7 AI tutor for syllabus-specific doubt solving',
      'Unlimited chapter-wise practice with instant feedback',
      'Audio lessons for revision on the go',
      'Track progress and weak topics in one dashboard',
    ],
    visual: <ChatMockup />,
  },
  parents: {
    tabLabel: 'Parents',
    tabEmoji: '👨‍👩‍👧',
    title: 'Parents',
    shotSrc: SCREENSHOT_PARENT,
    shotAlt: 'Arthavi parent report with subject-wise progress and insights',
    bullets: [
      'Live visibility into subject-wise performance',
      'Automatic progress reports without follow-up',
      'Learning-gap alerts before exam time',
      'Reduce dependency on costly private tuition',
    ],
    visual: <ParentReportMockup />,
  },
}

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const { user } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [activeAudience, setActiveAudience] = useState('schools')

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const openAuth = (mode = 'login') => {
    setAuthMode(mode)
    setShowAuth(true)
  }

  return (
    <div className="lp-container">
      <div className="lp-top-bar">
        Arthavi helps schools evaluate exams in minutes, generate papers instantly, and give every student a 24/7 AI tutor.
      </div>

      <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
        <a href="/" className="lp-logo-link"><Logo full size={50} style={{ gap: 10 }} /></a>
        <div className="lp-nav-links">
          <a href="#schools">For Schools</a>
          <a href="#audience">For Students</a>
          <a href="#audience">For Parents</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className="lp-btn-group">
          {!user ? (
            <>
              <button type="button" onClick={() => openAuth('login')} className="lp-btn lp-btn-ghost">Sign In</button>
              <button type="button" onClick={() => openAuth('register')} className="lp-btn lp-btn-primary">Get Started Free</button>
            </>
          ) : (
            <a href="/app" className="lp-btn lp-btn-primary">Go to Dashboard</a>
          )}
        </div>
      </nav>

      <section className="lp-hero-wrap" id="schools">
        <div className="lp-hero-text lp-fade-in">
          <div className="lp-pill">AI-Powered · Built for Indian Schools</div>
          <h1 className="lp-h1">
            Grade 40 Answer Sheets in 5 Minutes — Not Days
          </h1>
          <p className="lp-sub">
            AI that evaluates handwritten papers, generates exam papers, and tutors every student — automatically.
          </p>
          <div className="lp-btn-group">
            <button type="button" onClick={() => openAuth('register')} className="lp-btn lp-btn-primary lp-btn-lg">Book a Free Demo</button>
            <a href="#showcase" className="lp-btn lp-btn-ghost lp-btn-lg">See product visuals</a>
          </div>
          <div className="lp-social-proof">
            <div className="lp-avs">
              <div className="lp-av" style={{ background: '#5035C8' }}>R</div>
              <div className="lp-av" style={{ background: '#FF6B2B' }}>P</div>
              <div className="lp-av" style={{ background: '#6B52D6' }}>A</div>
              <div className="lp-av" style={{ background: '#15A362' }}>S</div>
            </div>
            <span>Used by 2,400+ educators across India</span>
          </div>
        </div>
        <div className="lp-hero-visual lp-fade-in-delay">
          <HeroPromoVisual />
        </div>
      </section>

      <div className="lp-trust-strip">
        <div className="lp-trust-inner">
          {[
            { emoji: '⚡', num: '40', unit: '×', label: 'Faster evaluation' },
            { emoji: '📄', num: '30', unit: 's', label: 'Paper + scheme' },
            { emoji: '🤖', num: '24', unit: '/7', label: 'AI tutor' },
            { emoji: '🇮🇳', num: '35+', unit: '', label: 'Boards supported' },
          ].map((s, i) => (
            <div key={i} className="lp-trust-item" style={{ animationDelay: `${i * 0.07}s` }}>
              <span className="lp-trust-emoji" aria-hidden>{s.emoji}</span>
              <span className="lp-trust-big">
                <span className="lp-trust-num">{s.num}<span className="lp-trust-unit">{s.unit}</span></span>
              </span>
              <span className="lp-trust-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="lp-showcase-section" id="showcase">
        <div className="lp-section">
          <p className="lp-eyebrow lp-eyebrow-dark">Product preview</p>
          <h2 className="lp-h2">From Paper Stacks to Instant Insights</h2>
          <p className="lp-subheadline" style={{ textAlign: 'center', margin: '0 auto 40px' }}>
            What took hours now happens in minutes — with better feedback.
          </p>
          <ScrollReveal>
            <p className="lp-real-proof">Real student. Real paper. Real evaluation.</p>
            <ProductScreenshot
              src={SCREENSHOT_DASHBOARD}
              alt="Arthavi evaluation dashboard showing student score, topic breakdown, and AI feedback"
            >
              <DashboardInsightMockup />
            </ProductScreenshot>
          </ScrollReveal>
        </div>
      </section>

      <section className="lp-flyer-section">
        <div className="lp-section">
          <p className="lp-eyebrow lp-eyebrow-dark">Core value</p>
          <h2 className="lp-h2">Everything schools advertise — proven in the product</h2>
          <div className="lp-flyer-grid">
            {VALUE_CARDS.map((c) => (
              <div key={c.n} className={`lp-flyer-card accent-${c.accent}`}>
                <div className="lp-flyer-card-top">
                  <span className="lp-flyer-num">{c.n}</span>
                  <span className="lp-flyer-icon" aria-hidden>{c.icon}</span>
                </div>
                <h3 className="lp-flyer-title">{c.title}</h3>
                <div className="lp-flyer-desc">
                  {c.lines.map((line, li) => (
                    <span key={li} className="lp-flyer-line">{line}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-paper-showcase">
        <div className="lp-section lp-paper-showcase-inner">
          <div className="lp-paper-showcase-copy">
            <p className="lp-paper-hook">Create exam-ready papers in 30 seconds — with marking schemes included</p>
            <p className="lp-eyebrow lp-eyebrow-dark">Question papers</p>
            <h2 className="lp-h2 left">Instant papers — with marking schemes</h2>
            <p className="lp-subheadline">
              Pick board, class, and weightage. Print-ready PDF plus a line-by-line scheme for teachers.
            </p>
          </div>
          <ProductScreenshot
            src={SCREENSHOT_PAPERS}
            alt="Arthavi generated question paper and marking scheme side by side"
          >
            <PaperAndMarkingMockup />
          </ProductScreenshot>
        </div>
      </section>

      <section id="audience" className="lp-audience-section">
        <div className="lp-section">
          <div className="lp-aud-head">
            <p className="lp-eyebrow">Built for everyone</p>
            <h2 className="lp-h2 left lp-aud-title">One Platform for Schools, Students &amp; Parents</h2>
          </div>
          <div className="lp-tabs">
            {Object.keys(audiencePanels).map((key) => (
              <button
                key={key}
                type="button"
                className={`lp-tab ${activeAudience === key ? 'active' : ''} ${key === 'schools' ? 'lp-tab-primary' : ''}`}
                onClick={() => setActiveAudience(key)}
              >
                <span className="lp-tab-emoji" aria-hidden>{audiencePanels[key].tabEmoji}</span>
                {audiencePanels[key].tabLabel}
              </button>
            ))}
          </div>
          <div className={`lp-aud-panel ${activeAudience === 'schools' ? 'lp-aud-panel-primary' : ''}`}>
            <div className="lp-aud-grid">
              <div>
                <ul className="lp-checks dark">
                  {audiencePanels[activeAudience].bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="lp-feat-visual">
                <ProductScreenshot
                  key={activeAudience}
                  src={audiencePanels[activeAudience].shotSrc}
                  alt={audiencePanels[activeAudience].shotAlt}
                >
                  {audiencePanels[activeAudience].visual}
                </ProductScreenshot>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-cost-wrap" id="boards">
        <div className="lp-section" style={{ textAlign: 'center' }}>
          <h2 className="lp-h2" style={{ color: 'white' }}>Stop Paying ₹50,000 for Tuition</h2>
          <p className="lp-cost-sub">Same outcomes. Zero tuition stress.</p>
          <div className="lp-cost-grid">
            <div className="lp-cost-card bad">
              <div className="cost-label">Private tuition</div>
              <div className="cost-price">₹40–60K<small>/year</small></div>
              <ul>
                <li>Fixed schedule &amp; travel</li>
                <li>Often one subject at a time</li>
                <li>Limited visibility for parents</li>
              </ul>
            </div>
            <div className="vs-badge">VS</div>
            <div className="lp-cost-card good">
              <div className="cost-label">Arthavi</div>
              <div className="cost-price green">₹149<small>/month</small></div>
              <ul>
                <li>24/7 AI tutor + practice</li>
                <li>Bulk evaluation + papers</li>
                <li>Automated parent reports</li>
              </ul>
              <button type="button" onClick={() => openAuth('register')} className="lp-btn lp-btn-primary" style={{ width: '100%', marginTop: '24px' }}>Get started</button>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section" style={{ textAlign: 'center' }}>
        <h2 className="lp-h2">CBSE · ICSE · 35+ state boards</h2>
        <p className="lp-subheadline" style={{ margin: '0 auto 8px' }}>Built for the Indian school ecosystem — not a generic international-only stack.</p>
        <div className="lp-boards">
          {['CBSE', 'ICSE', 'IGCSE', 'Maharashtra', 'UP Board', 'Tamil Nadu', 'Karnataka', 'Kerala', 'Gujarat', 'Rajasthan', 'Bihar', 'West Bengal'].map((b) => (
            <span key={b} className="lp-board-chip">{b}</span>
          ))}
          <span className="lp-board-chip more">+23 more boards</span>
        </div>
      </section>

      <section className="lp-section lp-testimonials-section">
        <h2 className="lp-h2">Loved by teachers &amp; parents</h2>
        <p className="lp-school-logos" aria-label="Schools using Arthavi">
          <span className="lp-school-logo-pill">DPS Noida</span>
          <span className="lp-school-logo-pill">Ryan International</span>
          <span className="lp-school-logo-pill">Hyderabad families</span>
        </p>
        <div className="lp-grid-3" style={{ marginTop: '40px' }}>
          {[
            {
              q: '“Our whole-class physics stack — 40 papers — graded before my coffee cooled.”',
              name: 'Rajani Sharma',
              role: 'Maths teacher, DPS Noida',
              photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=128&h=128&fit=crop&crop=faces',
            },
            {
              q: '“Pass rates improved by 23% in one term.”',
              name: 'Principal Mehra',
              role: 'Ryan International, Bengaluru',
              photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=128&h=128&fit=crop&crop=faces',
            },
            {
              q: '“Science went from 51% to 79% in two months.”',
              name: 'Sunita Kapoor',
              role: 'Parent, Hyderabad',
              photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=128&h=128&fit=crop&crop=faces',
            },
          ].map((t, i) => (
            <div key={i} className={`lp-card lp-tcard${i === 1 ? ' lp-tcard-featured' : ''}`}>
              <div className="lp-stars">★★★★★</div>
              <p className="lp-card-desc">{t.q}</p>
              <div className="lp-tauthor">
                <img className="lp-tphoto" src={t.photo} alt="" width={48} height={48} loading="lazy" decoding="async" />
                <div>
                  <strong style={{ color: i === 1 ? '#fff' : 'var(--lp-primary)' }}>{t.name}</strong>
                  <div style={{ fontSize: '0.8rem', color: i === 1 ? 'rgba(255,255,255,0.65)' : 'var(--lp-muted)' }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="lp-section">
        <p className="lp-pricing-anchor">Costs less than one private tuition session per month</p>
        <h2 className="lp-h2">Simple, transparent pricing</h2>
        <p className="lp-subheadline" style={{ textAlign: 'center', margin: '0 auto 48px' }}>Start free. Scale when your school is ready.</p>
        <div className="lp-pricing-grid">
          <div className="lp-price-card">
            <div className="lp-tier">Student Pro</div>
            <div className="lp-price-tag">₹149<span>/mo</span></div>
            <ul className="lp-price-feats">
              <li>Unlimited chapters &amp; boards</li>
              <li>24/7 AI tutor</li>
              <li>Flashcards &amp; practice</li>
            </ul>
            <button type="button" onClick={() => openAuth('register')} className="lp-btn lp-btn-secondary" style={{ width: '100%' }}>Get started</button>
          </div>
          <div className="lp-price-card featured">
            <div className="lp-best-badge">⭐ Most Popular for Schools</div>
            <div className="lp-tier">School Starter</div>
            <div className="lp-price-tag">₹999<span>/mo</span></div>
            <ul className="lp-price-feats">
              <li>60 student seats</li>
              <li>Bulk AI evaluation</li>
              <li>Question generator</li>
              <li>Parent reports</li>
            </ul>
            <button type="button" onClick={() => openAuth('register')} className="lp-btn lp-btn-primary" style={{ width: '100%' }}>Start pilot</button>
          </div>
          <div className="lp-price-card">
            <div className="lp-tier">School Growth</div>
            <div className="lp-price-tag">₹2,499<span>/mo</span></div>
            <ul className="lp-price-feats">
              <li>Unlimited students</li>
              <li>Institution analytics</li>
              <li>Priority support</li>
            </ul>
            <button type="button" onClick={() => openAuth('register')} className="lp-btn lp-btn-secondary" style={{ width: '100%' }}>Contact sales</button>
          </div>
        </div>
      </section>

      <section className="lp-cta-wrap">
        <div className="lp-section" style={{ textAlign: 'center' }}>
          <h2 className="lp-h2" style={{ color: 'white', fontSize: 'clamp(2rem,4vw,3.2rem)' }}>Start Your Free School Pilot Today</h2>
          <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '1.2rem', marginBottom: '40px' }}>
            No setup. No risk. See results in your first week.
          </p>
          <button type="button" onClick={() => openAuth('register')} className="lp-btn lp-btn-cta">Start your free school pilot</button>
        </div>
      </section>

      <footer className="lp-footer">
        <Logo full size={50} dark style={{ gap: 10 }} />
        <div className="lp-footer-links">
          <a href="https://arthavi.in" target="_blank" rel="noreferrer">Website</a>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </div>
        <p className="lp-footer-position">
          Arthavi helps schools evaluate exams in minutes, generate papers instantly, and give every student a 24/7 AI tutor.
        </p>
        <p className="lp-footer-copy">© {new Date().getFullYear()} Arthavi Smart Learning. All rights reserved.</p>
      </footer>

      {showAuth && (
        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} initialMode={authMode} />
      )}
    </div>
  )
}
