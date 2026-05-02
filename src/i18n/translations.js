/**
 * translations.js
 * English (en) and Odia (or) strings for the Arthavi platform.
 * UI strings use dot-notation keys; data arrays are nested objects.
 */

export const translations = {
  en: {
    // ── Nav ──────────────────────────────────────────────
    'nav.for_schools':   'For Schools',
    'nav.features':      'Features',
    'nav.how_it_works':  'How it Works',
    'nav.pricing':       'Pricing',
    'nav.try_demo':      'Try Demo  ✨',
    'nav.boards':        'Boards',
    'nav.sign_in':       'Sign In',
    'nav.get_started':   'Get Started Free →',

    // ── Hero ─────────────────────────────────────────────
    'hero.badge':        '🇮🇳 Built for Indian Schools — CBSE, ICSE & State Boards',
    'hero.h1_line1':     'Check 40 Answer Sheets',
    'hero.h1_line2':     'in Minutes — ',
    'hero.h1_highlight': 'Not Days.',
    'hero.chip1':        '✅ End Tuition Stress',
    'hero.chip2':        '⚡ Check 40 Papers in Minutes',
    'hero.chip3':        '📊 Real-Time Progress Tracking',
    'hero.chip4':        '🎓 AI Tutor 24/7',
    'hero.sub':          'Arthavi is an AI-powered system that helps schools reduce teacher workload, automate exams, and improve student performance — built for CBSE, ICSE & all State Boards.',
    'hero.cta_school':   '🏫 Start Free School Pilot',
    'hero.cta_demo':     '✨ Try Live Demo',
    'hero.cta_student':  '🚀 Start as Student',

    // ── Section headings ─────────────────────────────────
    'section.features':      'Everything You Need to Transform Your School',
    'section.how_it_works':  'Get Started in 4 Simple Steps',
    'section.stats_label':   'Why Schools Choose Arthavi',
    'section.pricing':       'Simple, Transparent Pricing',
    'section.testimonials':  'What Our Users Say',
    'section.boards':        'Supported Boards',

    // ── Stats ────────────────────────────────────────────
    stats: [
      { num: '₹50K+', label: 'Saved per Student/yr' },
      { num: '35+',   label: 'Boards Covered' },
      { num: '90%',   label: 'Less Evaluation Time' },
      { num: '24/7',  label: 'AI Tutor Available' },
    ],

    // ── Features ─────────────────────────────────────────
    features: [
      { icon: '🤖', color: '#F0EAFF', label: 'AI Tutor — Your Syllabus',      desc: 'Chat with AI trained on your exact textbook (CBSE, ICSE, State Boards). Like a personal tutor 24/7 — without paying ₹1,000/hour.' },
      { icon: '📝', color: '#FEF3C7', label: 'Practice → Instant Feedback',    desc: 'Unlimited AI-generated tests with mistake-level analysis. Students improve after every question, not just exams.' },
      { icon: '🎧', color: '#D1FAE5', label: 'Audio Lessons',                  desc: 'Listen to chapters like a podcast — perfect for travel, revision, and low-focus days. Turn passive time into learning time.' },
      { icon: '📊', color: '#FCE7F3', label: 'Full Parent Transparency',       desc: 'Automatic email reports and real-time progress tracking. No more chasing teachers for updates.' },
      { icon: '🧑‍🏫', color: '#EDF0F7', label: 'Teachers Save Hours',           desc: 'Generate question papers instantly. Bulk evaluate handwritten answer sheets — correct 40 papers in minutes, not days.' },
      { icon: '💸', color: '#CCFBF1', label: 'Cut Education Costs',            desc: 'No private tuition needed. No expensive test-prep subscriptions. Save ₹50,000+ per year per student.' },
    ],

    // ── Steps ────────────────────────────────────────────
    steps: [
      { n: '01', title: 'Choose Your Board',    desc: 'Select from CBSE, ICSE or any of 35+ state boards. Pick your class and subject.' },
      { n: '02', title: 'Load the Chapter',     desc: 'Official NCERT & state board chapter lists load instantly. Select one or many.' },
      { n: '03', title: 'Pick an AI Tool',      desc: 'Summarise, flashcard, practice, audio lesson or AI video — one tap.' },
      { n: '04', title: 'Learn & Evaluate',     desc: 'Study, generate exam papers, evaluate answer sheets, and share reports.' },
    ],

    // ── Panel titles (app Topbar) ────────────────────────
    'panel.dashboard':            'Dashboard',
    'panel.curriculum':           'Curriculum Hub',
    'panel.chat':                 'AI Study Chat',
    'panel.qgen':                 'Question Generator',
    'panel.eval':                 'Evaluation Central',
    'panel.qmaster':              'Question Master',
    'panel.interactive-practice': 'Question Practice',
    'panel.institute':            'Institute Manager',
    'panel.analytics':            'Analytics',
    'panel.syllabus':             'Syllabus',
    'panel.practice':             'Practice',
    'panel.reports':              'Reports',
    'panel.settings':             'Settings',
    'panel.quota':                'Quota Manager',
    'panel.visitor-log':          'Visitor Log',
    'panel.free-courses':         'SkillUp Hub',
    'panel.career-path':          'Career Compass',
    'panel.degree-hub':           'Degree Hub',
    'panel.senior-prep':          'Entrance Prep',

    // ── CurriculumPanel ─────────────────────────────────
    'cur.tool.summarise':  'Summarise',
    'cur.tool.flashcards': 'Flashcards',
    'cur.tool.questions':  'Questions',
    'cur.tool.audio':      'Audio Lesson',
    'cur.tool.video':      'AI Video',
    'cur.tool.practice':   'Practice',
    'cur.src.curriculum':  '📚 Curriculum',
    'cur.src.upload':      '📎 Upload Document',
    'cur.lbl.state':       'State / UT',
    'cur.lbl.board':       'Board',
    'cur.lbl.class':       'Class',
    'cur.lbl.subject':     'Subject',
    'cur.btn.load':        '📖 Load Chapters',
    'cur.btn.loading':     'Loading chapters…',
    'cur.btn.select_all':  'All',
    'cur.btn.select_none': 'None',
    'cur.fc.heading':      '🃏 Configure Flashcards',
    'cur.fc.count_label':  'Number of Flashcards',
    'cur.fc.gen_prefix':   '🃏 Generate',
    'cur.fc.gen_suffix':   'Flashcards',
    'cur.btn.cancel':      'Cancel',
    'cur.sum.heading':     '📝 Configure Summary Points',
    'cur.sum.generate':    '📝 Generate Summary',
    'cur.sum.auto':        '⚡ Auto (10 pts)',
    'cur.sum.custom':      '✏️ Custom',

    // ── Language toggle label ────────────────────────────
    'lang.toggle_label': 'ଓଡ଼ିଆ',
  },

  or: {
    // ── Nav ──────────────────────────────────────────────
    'nav.for_schools':   'ବିଦ୍ୟାଳୟ ପାଇଁ',
    'nav.features':      'ବୈଶିଷ୍ଟ୍ୟ',
    'nav.how_it_works':  'କିପରି କାମ କରେ',
    'nav.pricing':       'ମୂଲ୍ୟ',
    'nav.try_demo':      'ଡେମୋ ଦେଖନ୍ତୁ  ✨',
    'nav.boards':        'ବୋର୍ଡ',
    'nav.sign_in':       'ସାଇନ ଇନ',
    'nav.get_started':   'ମାଗଣାରେ ଆରମ୍ଭ →',

    // ── Hero ─────────────────────────────────────────────
    'hero.badge':        '🇮🇳 ଭାରତୀୟ ବିଦ୍ୟାଳୟ ପାଇଁ — CBSE, ICSE ଓ ରାଜ୍ୟ ବୋର୍ଡ',
    'hero.h1_line1':     'ମିନିଟ ମଧ୍ୟରେ ୪୦ ଉତ୍ତରପତ୍ର',
    'hero.h1_line2':     'ଯାଞ୍ଚ କରନ୍ତୁ — ',
    'hero.h1_highlight': 'ଦିନ ନୁହେଁ।',
    'hero.chip1':        '✅ ଟ୍ୟୁସନ ଚିଣ୍ତା ଦୂର',
    'hero.chip2':        '⚡ ମିନିଟରେ ୪୦ ପତ୍ର ଯାଞ୍ଚ',
    'hero.chip3':        '📊 ତୁରନ୍ତ ଅଗ୍ରଗତି ଟ୍ରାକ',
    'hero.chip4':        '🎓 AI ଶିକ୍ଷକ ୨୪/୭',
    'hero.sub':          'ଆର୍ଥବୀ ଏକ AI-ଚାଳିତ ପ୍ଲାଟଫର୍ମ ଯାହା ବିଦ୍ୟାଳୟଗୁଡ଼ିକୁ ଶିକ୍ଷକ ଭାର କମ, ପରୀକ୍ଷା ସ୍ୱୟଂ-ଚାଳନ, ଓ ଛାତ୍ର ଅଗ୍ରଗତି ଉନ୍ନତ କରିବାରେ ସାହାଯ୍ୟ କରେ — CBSE, ICSE ଓ ସମସ୍ତ ରାଜ୍ୟ ବୋର୍ଡ ପାଇଁ।',
    'hero.cta_school':   '🏫 ମାଗଣା ବିଦ୍ୟାଳୟ ପାଇଲଟ ଆରମ୍ଭ',
    'hero.cta_demo':     '✨ ଲାଇଭ ଡେମୋ ଦେଖନ୍ତୁ',
    'hero.cta_student':  '🚀 ଛାତ୍ର ଭାବେ ଆରମ୍ଭ',

    // ── Section headings ─────────────────────────────────
    'section.features':      'ଆପଣଙ୍କ ବିଦ୍ୟାଳୟ ପରିବର୍ତ୍ତନ ପାଇଁ ସମସ୍ତ ସୁବିଧା',
    'section.how_it_works':  '୪ ସହଜ ପଦକ୍ଷେପରେ ଆରମ୍ଭ',
    'section.stats_label':   'ବିଦ୍ୟାଳୟ କ\'ଣ ପାଇଁ ଆର୍ଥବୀ ବଛୁଛନ୍ତି',
    'section.pricing':       'ସ୍ୱଚ୍ଛ ଓ ସରଳ ମୂଲ୍ୟ',
    'section.testimonials':  'ଆମ ବ୍ୟବହାରକାରୀ କ\'ଣ କୁହନ୍ତି',
    'section.boards':        'ସମର୍ଥିତ ବୋର୍ଡ',

    // ── Stats ────────────────────────────────────────────
    stats: [
      { num: '₹50K+', label: 'ପ୍ରତି ଛାତ୍ର/ବର୍ଷ ସଞ୍ଚୟ' },
      { num: '35+',   label: 'ବୋର୍ଡ ଆଚ୍ଛାଦିତ' },
      { num: '90%',   label: 'ମୂଲ୍ୟାଙ୍କନ ସମୟ ହ୍ରାସ' },
      { num: '24/7',  label: 'AI ଶିକ୍ଷକ ଉପଲବ୍ଧ' },
    ],

    // ── Features ─────────────────────────────────────────
    features: [
      { icon: '🤖', color: '#F0EAFF', label: 'AI ଶିକ୍ଷକ — ଆପଣଙ୍କ ପାଠ୍ୟକ୍ରମ',    desc: 'ଆପଣଙ୍କ ଠିକ୍ ପାଠ୍ୟପୁସ୍ତକ (CBSE, ICSE, ରାଜ୍ୟ ବୋର୍ଡ) ଉପରେ ପ୍ରଶିକ୍ଷିତ AI ସହ ଚ୍ୟାଟ। ₹୧,୦୦୦/ଘଣ୍ଟା ବ୍ୟୟ ନ ହୋଇ ୨୪/୭ ଶିକ୍ଷକ।' },
      { icon: '📝', color: '#FEF3C7', label: 'ଅଭ୍ୟାସ → ତୁରନ୍ତ ମତାମତ',            desc: 'ଭୁଲ-ସ୍ତରରେ ବିଶ୍ଳେଷଣ ସହ ଅସୀମ AI-ଜନ୍ୟ ପରୀକ୍ଷା। ଛାତ୍ରମାନେ ପ୍ରତ୍ୟେକ ପ୍ରଶ୍ନ ପରେ ଉନ୍ନତ ହୁଅନ୍ତି।' },
      { icon: '🎧', color: '#D1FAE5', label: 'ଅଡ଼ିଓ ପାଠ',                          desc: 'ଅଧ୍ୟାୟ ଗୁଡ଼ିକ ପଡ଼କାଷ୍ଟ ଭଳି ଶୁଣନ୍ତୁ — ଯାତ୍ରା, ପୁନରାବୃତ୍ତି, ଓ ଶିଥିଳ ଦିନ ପାଇଁ ଆଦର୍ଶ।' },
      { icon: '📊', color: '#FCE7F3', label: 'ଅଭିଭାବକ ସ୍ୱଚ୍ଛତା',                   desc: 'ସ୍ୱୟଂ ଇମେଲ ରିପୋର୍ଟ ଓ ରିଅଲ-ଟାଇମ ଅଗ୍ରଗତି। ଶିକ୍ଷକଙ୍କ ପଛ ପଛ ବୁଲିବା ଆଉ ନୁହେଁ।' },
      { icon: '🧑‍🏫', color: '#EDF0F7', label: 'ଶିକ୍ଷକ ଘଣ୍ଟା ବଞ୍ଚାନ୍ତୁ',             desc: 'ତୁରନ୍ତ ପ୍ରଶ୍ନ ପତ୍ର ତିଆରି। ହସ୍ତଲିଖିତ ଉତ୍ତରପତ୍ର ବଡ଼ ସଂଖ୍ୟାରେ ଯାଞ୍ଚ — ମିନିଟ ମଧ୍ୟରେ ୪୦ ପତ୍ର।' },
      { icon: '💸', color: '#CCFBF1', label: 'ଶିକ୍ଷା ଖର୍ଚ୍ଚ ଘଟାନ୍ତୁ',               desc: 'ବ୍ୟକ୍ତିଗତ ଟ୍ୟୁସନ ଆଉ ଦରକାର ନାହିଁ। ମହଙ୍ଗା ସବ୍‌ସ୍କ୍ରିପ୍‌ସନ ନୁହେଁ। ପ୍ରତି ଛାତ୍ରରେ ₹୫୦,୦୦୦+ ବଞ୍ଚାନ୍ତୁ।' },
    ],

    // ── Steps ────────────────────────────────────────────
    steps: [
      { n: '01', title: 'ଆପଣଙ୍କ ବୋର୍ଡ ବଛନ୍ତୁ',      desc: 'CBSE, ICSE ବା ୩୫+ ରାଜ୍ୟ ବୋର୍ଡ ମଧ୍ୟରୁ ଗୋଟିଏ ବଛନ୍ତୁ। ଆପଣଙ୍କ ଶ୍ରେଣୀ ଓ ବିଷୟ ଚୁନନ୍ତୁ।' },
      { n: '02', title: 'ଅଧ୍ୟାୟ ଲୋଡ କରନ୍ତୁ',          desc: 'ଅଧ୍ୟକାରୀ NCERT ଓ ରାଜ୍ୟ ବୋର୍ଡ ଅଧ୍ୟାୟ ତାଲିକା ତୁରନ୍ତ ଲୋଡ। ଗୋଟିଏ ବା ଏକାଧିକ ବଛନ୍ତୁ।' },
      { n: '03', title: 'AI ଟୁଲ ବଛନ୍ତୁ',               desc: 'ସଂଖ୍ୟପ, ଫ୍ଲାଶ କାର୍ଡ, ଅଭ୍ୟାସ, ଅଡ଼ିଓ ପାଠ ବା AI ଭିଡ଼ିଓ — ଏକ ଟ୍ୟାପ।' },
      { n: '04', title: 'ଶିଖନ୍ତୁ ଓ ମୂଲ୍ୟାଙ୍କନ କରନ୍ତୁ', desc: 'ଅଧ୍ୟୟନ, ପ୍ରଶ୍ନ ପତ୍ର ତୈୟାର, ଉତ୍ତରପତ୍ର ଯାଞ୍ଚ, ଓ ରିପୋର୍ଟ ଶେୟାର।' },
    ],

    // ── Panel titles (app Topbar) ────────────────────────
    'panel.dashboard':            'ଡ୍ୟାଶବୋର୍ଡ',
    'panel.curriculum':           'ପାଠ୍ୟକ୍ରମ ହବ',
    'panel.chat':                 'AI ଅଧ୍ୟୟନ ଚ୍ୟାଟ',
    'panel.qgen':                 'ପ୍ରଶ୍ନ ଜନଣ',
    'panel.eval':                 'ମୂଲ୍ୟାଙ୍କନ କେନ୍ଦ୍ର',
    'panel.qmaster':              'ପ୍ରଶ୍ନ ମାଷ୍ଟର',
    'panel.interactive-practice': 'ପ୍ରଶ୍ନ ଅଭ୍ୟାସ',
    'panel.institute':            'ଅନୁଷ୍ଠାନ ପ୍ରବନ୍ଧକ',
    'panel.analytics':            'ବିଶ୍ଳେଷଣ',
    'panel.syllabus':             'ପାଠ୍ୟକ୍ରମ',
    'panel.practice':             'ଅଭ୍ୟାସ',
    'panel.reports':              'ରିପୋର୍ଟ',
    'panel.settings':             'ସେଟିଂ',
    'panel.quota':                'କୋଟା ପ୍ରବନ୍ଧକ',
    'panel.visitor-log':          'ଭ୍ରମଣ ଲଗ',
    'panel.free-courses':         'ଦକ୍ଷତା ହବ',
    'panel.career-path':          'କ୍ୟାରିଅର କମ୍ପାସ',
    'panel.degree-hub':           'ଡିଗ୍ରୀ ହବ',
    'panel.senior-prep':          'ପ୍ରବେଶ ପ୍ରସ୍ତୁତି',

    // ── CurriculumPanel ─────────────────────────────────
    'cur.tool.summarise':  'ସଂଖ୍ୟପ',
    'cur.tool.flashcards': 'ଫ୍ଲାଶ କାର୍ଡ',
    'cur.tool.questions':  'ପ୍ରଶ୍ନ',
    'cur.tool.audio':      'ଅଡ଼ିଓ ପାଠ',
    'cur.tool.video':      'AI ଭିଡ଼ିଓ',
    'cur.tool.practice':   'ଅଭ୍ୟାସ',
    'cur.src.curriculum':  '📚 ପାଠ୍ୟକ୍ରମ',
    'cur.src.upload':      '📎 ଡକ୍ୟୁମେଣ୍ଟ ଅପ୍‌ଲୋଡ',
    'cur.lbl.state':       'ରାଜ୍ୟ / UT',
    'cur.lbl.board':       'ବୋର୍ଡ',
    'cur.lbl.class':       'ଶ୍ରେଣୀ',
    'cur.lbl.subject':     'ବିଷୟ',
    'cur.btn.load':        '📖 ଅଧ୍ୟାୟ ଲୋଡ',
    'cur.btn.loading':     'ଅଧ୍ୟାୟ ଲୋଡ ହୁଉଛି…',
    'cur.btn.select_all':  'ସମସ୍ତ',
    'cur.btn.select_none': 'ଶୂନ',
    'cur.fc.heading':      '🃏 ଫ୍ଲାଶ କାର୍ଡ ସ୍ଥିର',
    'cur.fc.count_label':  'ଫ୍ଲାଶ କାର୍ଡ ସଂଖ୍ୟା',
    'cur.fc.gen_prefix':   '🃏 ତିଆରି',
    'cur.fc.gen_suffix':   'ଫ୍ଲାଶ କାର୍ଡ',
    'cur.btn.cancel':      'ବାତିଲ',
    'cur.sum.heading':     '📝 ସଂଖ୍ୟପ ପଏଣ୍ଟ ସ୍ଥିର',
    'cur.sum.generate':    '📝 ସଂଖ୍ୟପ ତିଆରି',
    'cur.sum.auto':        '⚡ ସ୍ୱୟଂ (10 ପଏଣ୍ଟ)',
    'cur.sum.custom':      '✏️ ଅନୁକୂଳ',

    // ── Language toggle label ────────────────────────────
    'lang.toggle_label': 'English',
  },
}
