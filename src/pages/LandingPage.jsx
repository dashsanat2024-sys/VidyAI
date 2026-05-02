import Logo from '../components/shared/Logo'
import LangToggle from '../components/shared/LangToggle'

import { useState, useEffect, useRef } from 'react'
import AuthModal from '../components/auth/AuthModal'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { apiPost } from '../utils/api'

const BOARDS = ['CBSE','ICSE / ISC','Maharashtra Board','Tamil Nadu Board','Karnataka Board','Kerala Board','UP Board','Gujarat Board','Rajasthan Board','West Bengal Board','Telangana Board','NIOS']

const STATS = [
  { num: '₹50K+', label: 'Saved per Student/yr' },
  { num: '35+', label: 'Boards Covered' },
  { num: '90%', label: 'Less Evaluation Time' },
  { num: '24/7', label: 'AI Tutor Available' },
]

const FEATURES = [
  { icon: '🤖', color: '#F0EAFF', label: 'AI Tutor — Your Syllabus', desc: 'Chat with AI trained on your exact textbook (CBSE, ICSE, State Boards). Like a personal tutor 24/7 — without paying ₹1,000/hour.' },
  { icon: '📝', color: '#FEF3C7', label: 'Practice → Instant Feedback', desc: 'Unlimited AI-generated tests with mistake-level analysis. Students improve after every question, not just exams.' },
  { icon: '🎧', color: '#D1FAE5', label: 'Audio Lessons', desc: 'Listen to chapters like a podcast — perfect for travel, revision, and low-focus days. Turn passive time into learning time.' },
  { icon: '📊', color: '#FCE7F3', label: 'Full Parent Transparency', desc: 'Automatic email reports and real-time progress tracking. No more chasing teachers for updates.' },
  { icon: '🧑‍🏫', color: '#EDF0F7', label: 'Teachers Save Hours', desc: 'Generate question papers instantly. Bulk evaluate handwritten answer sheets — correct 40 papers in minutes, not days.' },
  { icon: '💸', color: '#CCFBF1', label: 'Cut Education Costs', desc: 'No private tuition needed. No expensive test-prep subscriptions. Save ₹50,000+ per year per student.' },
]

const STEPS = [
  { n: '01', title: 'Choose Your Board', desc: 'Select from CBSE, ICSE or any of 35+ state boards. Pick your class and subject.' },
  { n: '02', title: 'Load the Chapter', desc: 'Official NCERT & state board chapter lists load instantly. Select one or many.' },
  { n: '03', title: 'Pick an AI Tool', desc: 'Summarise, flashcard, practice, audio lesson or AI video — one tap.' },
  { n: '04', title: 'Learn & Evaluate', desc: 'Study, generate exam papers, evaluate answer sheets, and share reports.' },
]

const INR_TO_USD = 0.012
const ANNUAL_INCREASE_RATE = 0.1

const PRICING_PLANS = [
  // ── STUDENTS ──
  {
    id: 'free-student',
    name: 'Free — Student',
    price: 'INR 0 / month forever',
    approxUsd: '$0 / month',
    anchor: null,
    summary: 'For individual students discovering Arthavi and entering the paid funnel.',
    includes: [
      '3 chapter loads/month (any board)',
      '5 AI summaries/month',
      '10 flashcards/month',
      '5 practice questions/month',
      'AI Study Chat (3 sessions/month)',
    ],
    excludes: [
      'Audio lessons',
      'AI Video Teacher',
      'Download or print summaries',
      'Question Master access',
    ],
    cta: 'Start Free',
    role: 'student',
  },
  {
    id: 'student-pro',
    name: 'Student Pro',
    badge: 'MOST POPULAR',
    price: 'INR 149 / month',
    approxUsd: '~$1.79 / month',
    annual: 'INR 999/year — save 44%',
    anchor: 'Costs less than one private tuition session per month',
    summary: 'Full access for Class 9–12 board and entrance preparation.',
    includes: [
      'Unlimited chapters across 35+ boards',
      'Unlimited AI summaries (10-point format)',
      'Unlimited flashcards (5–20 per chapter)',
      'Unlimited practice with instant AI feedback',
      'Unlimited AI Study Chat for any PDF/textbook',
      'Audio lessons for all chapters',
      'AI Video Teacher (Ms. Vidya, 7-scene lessons)',
      'Download PDF summaries and flashcards',
      'Priority WhatsApp support',
    ],
    excludes: [],
    cta: 'Upgrade to Student Pro',
    role: 'student',
  },
  // ── TEACHERS ──
  {
    id: 'teacher-basic',
    name: 'Teacher Basic',
    price: 'INR 499 / month',
    approxUsd: '~$5.99 / month',
    annual: 'INR 4,999/year (save 2 months)',
    anchor: 'Fastest early revenue — fastest to close',
    summary: 'For individual teachers who want to cut evaluation time and generate better question papers.',
    includes: [
      '1 teacher account',
      'Question Master — unlimited paper generation',
      'AI evaluation up to 100 answer sheets/month',
      'Parent email reports after each evaluation',
      'Exam ID + answer key management',
      'Basic student performance analytics',
    ],
    excludes: [
      'Student accounts',
      'Bulk ZIP evaluation upload',
      'Custom report branding',
    ],
    cta: 'Start Teacher Plan',
    role: 'teacher',
  },
  {
    id: 'teacher-pro',
    name: 'Teacher Pro',
    badge: 'BEST FOR TEACHERS',
    price: 'INR 1,499 / month',
    approxUsd: '~$17.99 / month',
    annual: 'INR 14,999/year (save 2 months)',
    anchor: null,
    summary: 'For serious teachers, tutors, and home educators managing multiple classes.',
    includes: [
      '1 teacher account',
      'Unlimited paper generation (Question Master)',
      'Unlimited AI answer sheet evaluation',
      'Bulk ZIP evaluation upload',
      'Multi-student single PDF evaluation',
      'Up to 60 student accounts included',
      'Branded question papers with name/logo',
      'Parent email reports after each evaluation',
      'Full student performance dashboard',
      'Priority WhatsApp support',
    ],
    excludes: [],
    cta: 'Upgrade to Teacher Pro',
    role: 'teacher',
  },
  // ── COACHING ──
  {
    id: 'coaching',
    name: 'Coaching Institute',
    price: 'INR 99 / student / month',
    approxUsd: '~$1.19 / student / month',
    annual: 'Minimum 20 students (INR 1,980/month)',
    anchor: '500 students → ₹59,400/month revenue for Arthavi',
    summary: 'Scalable per-student pricing for JEE, NEET, and board coaching.',
    includes: [
      'Full Student Pro access for each enrolled student',
      'Institute admin dashboard with all student data',
      'Unlimited papers for tutors (Question Master)',
      'Unlimited AI answer sheet evaluation',
      'Batch leaderboard and student rankings',
      'Branded question papers with institute logo',
      'Parent email report after each evaluation',
      'Dedicated WhatsApp support line',
      'Monthly usage and performance report',
    ],
    excludes: [],
    cta: 'Get Coaching Plan',
    role: 'institute',
  },
  // ── ENTERPRISE ──
  {
    id: 'enterprise',
    name: 'Enterprise & Government',
    price: 'Custom pricing',
    approxUsd: 'Contact sales',
    annual: 'For 5+ schools, district deployments, and govt partnerships',
    anchor: null,
    summary: 'MOU and tender compliant deployment for chains, districts, and agencies.',
    includes: [
      'Custom school, teacher, and student allocations',
      'On-premise or private cloud data storage',
      '99.9% uptime SLA guarantee',
      'Dedicated account manager and onboarding team',
      'Custom onboarding workshops and teacher training',
      'Odia language UI (full translation on request)',
      'Annual billing with GST invoice + PO acceptance',
      'ERP integration with existing school systems',
      'Custom AI model fine-tuning on school content',
    ],
    excludes: [],
    cta: 'Contact Enterprise Team',
    role: 'school_admin',
  },
]

const TESTIMONIALS = [
  {
    quote: 'Arthavi cut my exam paper preparation from 3 hours to under 5 minutes. The AI-generated questions are better than what I was writing manually.',
    name: 'Mrs. Priya Sharma', role: 'Science Teacher', school: 'Delhi Public School', emoji: '👩‍🏫',
  },
  {
    quote: 'Our Class 10 board results improved by 23% after we introduced Arthavi summaries and flashcards. Students actually enjoy studying now.',
    name: 'Mr. Rajesh Kumar', role: 'Principal', school: "St. Xavier's School, Mumbai", emoji: '🏫',
  },
  {
    quote: 'The AI tutor answers my questions at midnight, never gets impatient, and uses examples from real life. I got 94% in my boards!',
    name: 'Ananya Iyer', role: 'Class 12 Student', school: 'Chennai', emoji: '🎒',
  },
]

// ─── DEMO SECTION ────────────────────────────────────────────
const DEMO_BOARDS_LIST = ['CBSE', 'ICSE / ISC', 'Maharashtra Board', 'Tamil Nadu Board']
const DEMO_CLASSES_LIST = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12']

// ─── SUBJECT-AWARE DEMO CONTENT ──────────────────────────────────────────────
const DEMO_CONTENT = {
  'Mathematics': {
    chapterName: 'Real Numbers',
    topic: 'Real Numbers & Number Theory',
    summaryPoints: [
      'Every integer is a rational number — any integer n can be expressed as n/1, placing it within the rational number system.',
      'The Fundamental Theorem of Arithmetic: every composite number has a unique prime factorisation, regardless of the order of factors.',
      "Euclid's Division Lemma: for positive integers a and b, unique q and r exist such that a = bq + r, where 0 ≤ r < b.",
      'Irrational numbers (√2, π, √3) cannot be expressed as p/q; their decimal expansions are non-terminating and non-repeating.',
      'Key relation: for any two positive integers a and b — HCF(a,b) × LCM(a,b) = a × b.',
    ],
    flashcards: [
      { front: 'What is the Fundamental Theorem of Arithmetic?', back: 'Every composite number can be expressed as a product of primes in a unique way (order may differ). Example: 12 = 2² × 3.' },
      { front: "State Euclid's Division Lemma", back: 'For positive integers a and b: a = bq + r, where 0 ≤ r < b. Used to find the HCF of two numbers.' },
      { front: 'How are HCF and LCM related?', back: 'For any two numbers a and b: HCF(a,b) × LCM(a,b) = a × b. Use this shortcut to find one when the other is known.' },
    ],
    mcq: {
      q: 'The HCF of 26 and 91 is:',
      opts: ['13', '26', '91', '1'],
      correct: 0,
      explanation: "Using Euclid's division: 91 = 26×3 + 13, then 26 = 13×2 + 0. So HCF = 13. Options B and C are the original numbers; D (1) is trivially common but not the highest.",
    },
    mcqs: [
      { q: 'The HCF of 26 and 91 is:', opts: ['13', '26', '91', '7'], correct: 0, explanation: "91 = 26×3 + 13; 26 = 13×2 + 0. By Euclid's algorithm, HCF = 13." },
      { q: 'Which of the following is irrational?', opts: ['√4', '√9', '√2', '22/7'], correct: 2, explanation: '√4 = 2 and √9 = 3 are rational. 22/7 is rational. √2 = 1.41421… is non-terminating, non-repeating — irrational.' },
      { q: 'LCM(12, 18) = ?', opts: ['6', '24', '36', '72'], correct: 2, explanation: '12 = 2²×3; 18 = 2×3². LCM = 2²×3² = 36. Cross-check: 12×18 = 216 = HCF(6) × LCM(36) ✓' },
      { q: "Euclid's Division Lemma: a = bq + r, where r satisfies:", opts: ['0 ≤ r < a', '0 ≤ r < b', 'r > b', '0 < r ≤ b'], correct: 1, explanation: 'The remainder r must be ≥ 0 and strictly less than the divisor b. When r = 0, b divides a exactly.' },
      { q: 'If HCF(a, b) = 4 and LCM(a, b) = 48, then a × b = ?', opts: ['192', '44', '52', '12'], correct: 0, explanation: 'For any two numbers: HCF × LCM = a × b. So a × b = 4 × 48 = 192.' },
    ],
    sampleQuestions: [
      "What is Euclid's Division Algorithm and how do I use it to find HCF?",
      'How do I prove that √2 is irrational?',
      'What is the Fundamental Theorem of Arithmetic?',
      'How are HCF and LCM related to each other?',
      'Explain the difference between rational and irrational numbers with examples.',
    ],
    questions: [
      { n: 1, type: 'MCQ (1 mark)',           q: 'The product of two numbers is 1680 and their HCF is 12. Their LCM is:', opts: ['140', '120', '180', '200'], ans: 'A) 140' },
      { n: 2, type: 'Short Answer (2 marks)', q: 'Prove that √2 is irrational using contradiction.', ans: 'Assume √2 = p/q in lowest terms. Then p² = 2q², so p is even. Let p = 2k → q is also even. Contradiction — p, q not coprime.' },
      { n: 3, type: 'Long Answer (5 marks)',  q: 'Find HCF and LCM of 96 and 404 using prime factorisation. Verify that HCF × LCM = product of the two numbers.' },
    ],
    aiResponse: "Real Numbers include all rational and irrational numbers on the number line.\n\nKey Types:\n• Natural Numbers: 1, 2, 3, …\n• Integers: …, -2, -1, 0, 1, 2, …\n• Rational Numbers: p/q form, where q ≠ 0\n• Irrational Numbers: cannot be written as p/q (e.g., √2, π)\n\nFundamental Theorem of Arithmetic:\nEvery composite number = product of primes in exactly one unique way.\nExample: 360 = 2³ × 3² × 5\n\nEuclid's Division Algorithm (for HCF):\nFor a and b: write a = bq + r → apply repeatedly until r = 0. Last non-zero remainder = HCF.\n\nBoard Exam Tip: For HCF/LCM questions, always use prime factorisation — it's the fastest method and earns full marks!",
  },
  'Science': {
    chapterName: 'Chemical Reactions and Equations',
    topic: 'Photosynthesis',
    summaryPoints: [
      'A chemical reaction transforms reactants into products with new properties — evidence includes colour change, gas/precipitate, or temperature change.',
      'Chemical equations must be balanced: total atoms of each element equal on both sides — follows Law of Conservation of Mass.',
      'Types: combination (A+B→AB), decomposition (AB→A+B), displacement, double displacement, and oxidation-reduction (redox).',
      'Exothermic reactions release heat (combustion, respiration); endothermic reactions absorb heat (photosynthesis, electrolysis).',
      'Oxidation is loss of electrons/gain of oxygen; reduction is the reverse — they always occur together in redox reactions.',
    ],
    flashcards: [
      { front: 'What is a chemical equation?', back: 'A symbolic representation showing reactants (left) → products (right), separated by an arrow. Must be balanced.' },
      { front: 'Law of Conservation of Mass', back: 'Mass cannot be created or destroyed. Total reactant mass = total product mass in any chemical reaction.' },
      { front: 'What is a decomposition reaction?', back: 'A single compound breaks into 2+ simpler substances. Example: 2H₂O → 2H₂ + O₂ (electrolysis of water).' },
    ],
    mcq: {
      q: 'Which of the following is an example of a decomposition reaction?',
      opts: ['NaOH + HCl → NaCl + H₂O', '2H₂O → 2H₂ + O₂', 'Fe + CuSO₄ → FeSO₄ + Cu', 'CaO + H₂O → Ca(OH)₂'],
      correct: 1,
      explanation: 'Decomposition breaks one compound into simpler substances. Water decomposes into H₂ and O₂. Option A is neutralisation; C is displacement; D is combination.',
    },
    mcqs: [
      { q: 'Which of the following is an example of a decomposition reaction?', opts: ['NaOH + HCl → NaCl + H₂O', '2H₂O → 2H₂ + O₂', 'Fe + CuSO₄ → FeSO₄ + Cu', 'CaO + H₂O → Ca(OH)₂'], correct: 1, explanation: 'Decomposition: one compound breaks into simpler substances. A=neutralisation, C=displacement, D=combination.' },
      { q: '2Mg + O₂ → 2MgO is an example of which type of reaction?', opts: ['Decomposition', 'Displacement', 'Combination', 'Double Displacement'], correct: 2, explanation: 'Two or more substances combine to form a single product — this is a combination (synthesis) reaction.' },
      { q: 'CaCO₃ → CaO + CO₂ (on heating) is classified as:', opts: ['Combination', 'Decomposition', 'Displacement', 'Redox'], correct: 1, explanation: 'Calcium carbonate breaks into two simpler substances when heated — thermal decomposition reaction.' },
      { q: 'Respiration is classified as a _______ reaction.', opts: ['Combination', 'Reversible', 'Exothermic', 'Endothermic'], correct: 2, explanation: 'Respiration releases energy as heat, making it an exothermic reaction, just like combustion.' },
      { q: 'Zinc reacts with dilute H₂SO₄ to produce:', opts: ['ZnO and water', 'ZnSO₄ and H₂ gas', 'Zn(OH)₂ and SO₂', 'ZnS and H₂O'], correct: 1, explanation: 'Zn + H₂SO₄ → ZnSO₄ + H₂↑ — zinc displaces hydrogen from dilute sulfuric acid.' },
    ],
    sampleQuestions: [
      'What is the difference between exothermic and endothermic reactions?',
      'How do you balance a chemical equation step by step?',
      'What are the different types of chemical reactions with examples?',
      'Explain oxidation and reduction reactions with an example.',
      'What is the Law of Conservation of Mass and how does it apply to reactions?',
    ],
    questions: [
      { n: 1, type: 'MCQ (1 mark)',           q: 'Which gas is released as a by-product of photosynthesis?', opts: ['CO₂', 'N₂', 'O₂', 'H₂'], ans: 'C) O₂' },
      { n: 2, type: 'Short Answer (2 marks)', q: 'Define chlorophyll and state its role in photosynthesis.', ans: 'Green pigment in chloroplasts that absorbs sunlight for the light reactions of photosynthesis.' },
      { n: 3, type: 'Long Answer (5 marks)',  q: 'With a neat labelled diagram, explain the light-dependent and light-independent reactions of photosynthesis.' },
    ],
    aiResponse: "Photosynthesis is the process where plants convert light energy into chemical energy stored as glucose.\n\nEquation:\n6CO₂ + 6H₂O + Light Energy → C₆H₁₂O₆ + 6O₂\n\nWhere it happens — Chloroplasts:\n• Light reactions → Thylakoid membranes (produce ATP & NADPH)\n• Calvin Cycle → Stroma (produces glucose from CO₂)\n\nWhy it matters: Photosynthesis is the basis of nearly all food chains on Earth and produces the oxygen we breathe!\n\nCBSE Tip: Always draw a labelled chloroplast diagram for 5-mark questions.",
  },
  'English': {
    chapterName: 'A Letter to God',
    topic: 'A Letter to God',
    summaryPoints: [
      "The story is set in a valley where Lencho, a hardworking farmer, anxiously awaits rain for his corn crop.",
      "A hailstorm destroys the entire crop — Lencho writes a letter to God asking for 100 pesos to restart his farm.",
      "The postmaster, moved by Lencho's faith, collects contributions from staff and sends 70 pesos on behalf of 'God'.",
      "When Lencho receives less than asked, he writes a second letter accusing post office employees of theft.",
      "The story explores faith, irony, and the gap between Lencho's simple worldview and the postmaster's selfless generosity.",
    ],
    flashcards: [
      { front: 'Who is the protagonist in "A Letter to God"?', back: "Lencho — a hardworking but simple farmer with unshakeable faith in God and no awareness of human kindness around him." },
      { front: "What destroyed Lencho's crop?", back: 'A sudden hailstorm turned his corn fields into a white blanket of hailstones, destroying everything he had worked for.' },
      { front: 'What is the central irony of the story?', back: "The very people who helped Lencho (post office staff) are called 'thieves' because his absolute faith in God leaves no room for human kindness." },
    ],
    mcq: {
      q: "Why did Lencho call the post office employees 'a bunch of crooks'?",
      opts: ["They didn't deliver his letter", 'They opened his letter without permission', 'He received 70 pesos instead of 100', 'They laughed at his letter'],
      correct: 2,
      explanation: "Lencho had asked God for exactly 100 pesos. His faith was so absolute that when only 70 arrived, he assumed the post office staff must have stolen the remaining 30 pesos.",
    },
    mcqs: [
      { q: "Why did Lencho call the post office employees 'a bunch of crooks'?", opts: ["They didn't deliver his letter", 'They opened his letter without permission', 'He received 70 pesos instead of 100', 'They laughed at his letter'], correct: 2, explanation: 'His faith in God was absolute — he believed God sent exactly 100 pesos, so the missing 30 must have been stolen by the postal workers.' },
      { q: "What destroyed Lencho's crop?", opts: ['Drought', 'Floods', 'Hailstorm', 'Locusts'], correct: 2, explanation: 'A sudden hailstorm (large hailstones, not rain) turned his corn fields into a white blanket, destroying everything.' },
      { q: 'What did Lencho initially compare the large raindrops to?', opts: ['Silver coins', 'New coins', 'Pearls', 'Diamonds'], correct: 1, explanation: "Lencho compared the large drops to 'new coins' — the ten-cent pieces he needed to buy his crops." },
      { q: "What is the central literary device in 'A Letter to God'?", opts: ['Personification', 'Symbolism', 'Dramatic irony', 'Alliteration'], correct: 2, explanation: "Dramatic irony: readers know the postal workers are the helpers, but Lencho attributes help to God and accuses the same people of theft." },
      { q: 'How did the postmaster collect money for Lencho?', opts: ['From government funds', 'From his own salary and employee donations', 'He borrowed from a bank', 'He used postal stamps'], correct: 1, explanation: "The postmaster donated part of his own salary and also collected contributions from his colleagues as an act of charity on behalf of 'God'." },
    ],
    sampleQuestions: [
      "What is the central theme of 'A Letter to God'?",
      'Describe the character of Lencho and what his faith tells us about him.',
      'What is dramatic irony? Explain how it works in this story.',
      'Why do you think the postmaster helped Lencho? What does this reveal about human nature?',
      'How did Lencho react when he received the money? What does this say about blind faith?',
    ],
    questions: [
      { n: 1, type: 'MCQ (1 mark)',           q: 'What did Lencho initially compare the raindrops to?', opts: ['Silver coins', 'New coins', 'Pearls', 'Diamonds'], ans: 'B) New coins' },
      { n: 2, type: 'Short Answer (2 marks)', q: "Why was the postmaster surprised when he read Lencho's first letter?", ans: "A man wrote directly to God with complete faith that God would respond. The postmaster admired his unshakeable belief and decided to help." },
      { n: 3, type: 'Long Answer (5 marks)',  q: "Describe the central irony in 'A Letter to God'. What does it reveal about human nature and faith?" },
    ],
    aiResponse: '"A Letter to God" by G.L. Fuentes is a story about simple faith versus worldly logic.\n\nMain Characters:\n• Lencho — a poor farmer with unshakeable faith in God\n• The Postmaster — a kind man who goes beyond his duty to help\n\nKey Events:\n1. Lencho\'s corn crop destroyed by a hailstorm\n2. He writes a letter to God asking for 100 pesos\n3. The Postmaster collects 70 pesos from staff\n4. Lencho receives the money but accuses postal workers of theft\n\nCentral Theme: Irony — the very helpers are called thieves because Lencho\'s faith in God leaves no room for human kindness.\n\nBoard Exam Tip: For 3-mark answers, always mention the central irony — examiners specifically look for it!',
  },
  'Social Science': {
    chapterName: 'The Rise of Nationalism in Europe',
    topic: 'Nationalism in Europe',
    summaryPoints: [
      'Nationalism emerged as a political force in 19th-century Europe, valuing shared cultural, linguistic, and territorial identity.',
      "The French Revolution (1789) was a catalyst — it spread popular sovereignty: the nation should govern itself, not be ruled by kings.",
      "Napoleon's conquests spread the ideas of liberty and equality across Europe, fuelling nationalist movements even after his defeat.",
      'The Romantic movement (art, music, poetry) promoted a unique national spirit and cultural identity as worthy of political independence.',
      'By 1871, Germany and Italy were unified as nation-states through wars and diplomacy (led by Bismarck and Cavour respectively).',
    ],
    flashcards: [
      { front: 'What was the significance of the French Revolution for nationalism?', back: 'It spread popular sovereignty — the idea that a nation should be governed by its own people, not by an emperor or hereditary king.' },
      { front: 'Who was "Germania" and what did she symbolise?', back: 'An allegorical female figure of the German nation — depicted with a sword and oak crown to symbolise strength, heroism, and national unity.' },
      { front: 'What is a nation-state?', back: 'A politically independent state whose population shares a common identity — language, culture, history, and territory.' },
    ],
    mcq: {
      q: 'The Congress of Vienna (1815) was primarily aimed at:',
      opts: ['Unifying Germany under Prussia', 'Dismantling the Ottoman Empire', 'Restoring conservative governments across Europe', 'Creating a League of Nations'],
      correct: 2,
      explanation: "The Congress of Vienna, led by conservative powers Britain, Russia, Prussia, and Austria, aimed to restore Europe's pre-Napoleon monarchies and suppress liberal-nationalist ideas.",
    },
    mcqs: [
      { q: 'The Congress of Vienna (1815) was primarily aimed at:', opts: ['Unifying Germany under Prussia', 'Dismantling the Ottoman Empire', 'Restoring conservative governments across Europe', 'Creating a League of Nations'], correct: 2, explanation: "Metternich's Congress of Vienna restored pre-Napoleon monarchies and suppressed liberal-nationalist ideas across Europe." },
      { q: 'German unification was completed in the year:', opts: ['1848', '1861', '1871', '1815'], correct: 2, explanation: 'After the Franco-Prussian War, Bismarck proclaimed the unified German Empire at Versailles in 1871.' },
      { q: 'Who led the armed volunteers (Redshirts) through Southern Italy?', opts: ['Bismarck', 'Cavour', 'Mazzini', 'Garibaldi'], correct: 3, explanation: 'Giuseppe Garibaldi led the Redshirts who conquered southern Italy and handed territories to King Victor Emmanuel II.' },
      { q: "'Blood and Iron' policy is associated with:", opts: ['Garibaldi', 'Mazzini', 'Bismarck', 'Metternich'], correct: 2, explanation: 'Bismarck of Prussia believed unification required military strength (blood) and industrial power (iron) over idealist speeches.' },
      { q: 'The allegorical female figure representing the German nation was called:', opts: ['Marianne', 'Germania', 'Britannia', 'Italia'], correct: 1, explanation: 'Germania was depicted with a sword and oak crown, symbolising German national strength and unity.' },
    ],
    sampleQuestions: [
      'How did the French Revolution contribute to the rise of nationalism in Europe?',
      'What role did Bismarck play in German unification?',
      'What was the Congress of Vienna and what were its outcomes?',
      'Who were Garibaldi and Cavour and how did they unify Italy?',
      'What is the difference between a nation and a nation-state?',
    ],
    questions: [
      { n: 1, type: 'MCQ (1 mark)',           q: 'German unification was completed in which year?', opts: ['1848', '1861', '1871', '1815'], ans: 'C) 1871' },
      { n: 2, type: 'Short Answer (2 marks)', q: "What role did Bismarck play in German unification?", ans: "As Prussian Chancellor, Bismarck used 'blood and iron' — three wars (Denmark, Austria, France) to unify German states under Prussian leadership by 1871." },
      { n: 3, type: 'Long Answer (5 marks)',  q: 'Explain how Napoleon contributed to the growth of nationalism in Europe. Mention at least three specific ways.' },
    ],
    aiResponse: "Nationalism is the ideology that people sharing a common identity (language, culture, history) should form their own independent nation-state.\n\nKey Causes of European Nationalism:\n• French Revolution (1789) — sovereignty belongs to the people\n• Napoleon's wars — spread revolutionary ideas across Europe\n• Romantic movement — glorified national culture and language\n• Industrial Revolution — new social classes demanding political rights\n\nMajor Events:\n1. Frankfurt Parliament (1848) — failed German unification attempt\n2. Italian Unification 1861 — led by Cavour and Garibaldi\n3. German Unification 1871 — led by Bismarck (blood and iron policy)\n\nBoard Exam Tip: Remember key dates — French Revolution 1789, Congress of Vienna 1815, German unification 1871. These appear in MCQs every year!",
  },
}

const DEMO_CHAT_INIT = [
  { role: 'ai', text: "Hi! I'm Arthavi, your AI Study Companion. 👋\n\nI'm trained on your entire NCERT & state board curriculum. Ask me anything — from chapter basics to board exam tips!" },
]
const DEMO_GATE_COPY = {
  curriculum: { icon: '📚', title: "You've Seen the Curriculum Hub!", sub: 'Sign up to unlock AI summaries, flashcards, audio lessons, and video explanations for every chapter across all 35+ boards — personalised to your syllabus.' },
  practice:   { icon: '✏️',  title: "You've Tried Question Practice!", sub: 'Sign up to access thousands of practice questions per chapter, with instant AI feedback, score tracking, and personalised weak-area recommendations.' },
  tutor:      { icon: '🤖', title: "You've Met Arthavi, Your AI Tutor!", sub: 'Sign up to ask unlimited questions, get step-by-step explanations, and study 24/7 with an AI tutor that knows your entire curriculum.' },
  qmaster:    { icon: '📝', title: "You've Generated a Question Paper!", sub: 'Sign up to create full-length papers with answer keys, export to PDF, and evaluate student answer sheets using AI grading.' },
}

function DemoSection({ onRegister }) {
  const [tab, setTab] = useState('curriculum')
  const [used, setUsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('arthavi_demo_used') || '{}') } catch { return {} }
  })
  const [gate, setGate] = useState(null)
  // Curriculum
  const [chBoard, setChBoard] = useState('')
  const [chClass, setChClass] = useState('')
  const [chSubject, setChSubject] = useState('')
  const [chTool, setChTool] = useState('')
  const [chResult, setChResult] = useState(null)
  const [chLoading, setChLoading] = useState(false)
  const [chFlipIdx, setChFlipIdx] = useState(null)
  // Practice
  const [prSubject, setPrSubject] = useState('')
  const [prAnswers, setPrAnswers] = useState({})
  const [prSubmitted, setPrSubmitted] = useState(false)
  // Tutor
  const [tutMsg, setTutMsg] = useState('')
  const [tutMessages, setTutMessages] = useState([...DEMO_CHAT_INIT])
  const [tutLoading, setTutLoading] = useState(false)
  const tutEndRef = useRef(null)
  // QMaster
  const [qmBoard, setQmBoard] = useState('CBSE')
  const [qmClass, setQmClass] = useState('Class 10')
  const [qmSubject, setQmSubject] = useState('Science')
  const [qmGenerated, setQmGenerated] = useState(false)
  const [qmLoading, setQmLoading] = useState(false)

  useEffect(() => { tutEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [tutMessages, tutLoading])

  // When user selects a subject in Curriculum Hub, auto-populate Practice tab
  useEffect(() => { if (chSubject && !prSubmitted) setPrSubject(chSubject) }, [chSubject])

  const markUsed = (feature) => {
    const updated = { ...used, [feature]: true }
    setUsed(updated)
    try { localStorage.setItem('arthavi_demo_used', JSON.stringify(updated)) } catch {}
    setTimeout(() => setGate(feature), 1400)
  }
  const runCurriculumTool = (tool) => {
    if (used.curriculum) { setGate('curriculum'); return }
    setChTool(tool); setChLoading(true); setChResult(null)
    setTimeout(() => { setChLoading(false); setChResult(tool); markUsed('curriculum') }, 1800)
  }
  const sendTutorMsg = () => {
    const msg = tutMsg.trim()
    if (!msg || used.tutor || tutLoading) return
    setTutMessages(m => [...m, { role: 'user', text: msg }]); setTutMsg(''); setTutLoading(true)
    setTimeout(() => { setTutLoading(false); setTutMessages(m => [...m, { role: 'ai', text: getDemoAIResponse(msg) }]); markUsed('tutor') }, 1800)
  }
  const generateQuestions = () => {
    if (used.qmaster) { setGate('qmaster'); return }
    setQmLoading(true)
    setTimeout(() => { setQmLoading(false); setQmGenerated(true); markUsed('qmaster') }, 2000)
  }

  // Subject-aware demo data — updates whenever curriculum tab subject changes
  const demoData = DEMO_CONTENT[chSubject] || DEMO_CONTENT['Science']
  const qmDemoData = DEMO_CONTENT[qmSubject] || DEMO_CONTENT['Science']

  // Pick AI response based on keywords in the user's message, then fall back to selected subject
  const getDemoAIResponse = (message) => {
    const q = (message || '').toLowerCase()
    if (/math|algebra|geometr|trigon|calculus|probabilit|statistic|integer|fraction|polynomial|hcf|lcm|real number|equation|theorem/.test(q))
      return DEMO_CONTENT['Mathematics'].aiResponse
    if (/english|poem|story|prose|novel|grammar|comprehension|passage|character|lencho|narrative|essay/.test(q))
      return DEMO_CONTENT['English'].aiResponse
    if (/history|geography|civics|econom|social|democracy|govern|nation|revolution|parliament|constitution|bismarck|france/.test(q))
      return DEMO_CONTENT['Social Science'].aiResponse
    return (DEMO_CONTENT[chSubject] || DEMO_CONTENT['Science']).aiResponse
  }
  const TABS = [
    { key: 'curriculum', icon: '📚', label: 'Curriculum Hub' },
    { key: 'practice',   icon: '✏️',  label: 'Question Practice' },
    { key: 'tutor',      icon: '🤖', label: 'AI Tutor' },
    { key: 'qmaster',    icon: '📝', label: 'Question Master' },
  ]
  return (
    <section className="lp-section lp-demo-section" id="demo">
      <div className="lp-section-inner">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="lp-demo-live-badge"><span className="lp-badge-dot" />Live Interactive Demo</div>
          <h2 className="lp-h2" style={{ textAlign: 'center', marginTop: 16 }}>Try Arthavi Before You Sign Up</h2>
          <p className="lp-section-sub" style={{ textAlign: 'center', margin: '0 auto' }}>
            Four powerful AI learning tools — one free interaction each. No account needed.
          </p>
        </div>
        {/* Tabs */}
        <div className="lp-demo-tabs">
          {TABS.map(t => (
            <button key={t.key}
              className={`lp-demo-tab${tab === t.key ? ' lp-dt-active' : ''}${used[t.key] ? ' lp-dt-used' : ''}`}
              onClick={() => setTab(t.key)}>
              <span className="lp-demo-tab-icon">{t.icon}</span>
              <span className="lp-demo-tab-label">{t.label}</span>
              {used[t.key] && <span className="lp-demo-tab-check">✓</span>}
            </button>
          ))}
        </div>
        {/* Panel box */}
        <div className="lp-demo-box">
          {/* CURRICULUM HUB */}
          {tab === 'curriculum' && (
            <div className="lp-demo-panel">
              <div className="lp-demo-panel-hdr">
                <div>
                  <div className="lp-demo-panel-title">📚 Curriculum Hub</div>
                  <div className="lp-demo-panel-hint">Select board, class &amp; subject → choose an AI tool</div>
                </div>
                {used.curriculum ? <span className="lp-demo-badge-used">✓ Demo Used</span> : <span className="lp-demo-badge-free">1 free attempt</span>}
              </div>
              <div className="lp-demo-selectors">
                <select className="lp-demo-select" value={chBoard} onChange={e => { setChBoard(e.target.value); setChResult(null); setChTool('') }} disabled={used.curriculum}>
                  <option value="">Select Board</option>
                  {DEMO_BOARDS_LIST.map(b => <option key={b}>{b}</option>)}
                </select>
                <select className="lp-demo-select" value={chClass} onChange={e => { setChClass(e.target.value); setChResult(null); setChTool('') }} disabled={!chBoard || used.curriculum}>
                  <option value="">Select Class</option>
                  {DEMO_CLASSES_LIST.map(c => <option key={c}>{c}</option>)}
                </select>
                <select className="lp-demo-select" value={chSubject} onChange={e => { setChSubject(e.target.value); setChResult(null); setChTool('') }} disabled={!chClass || used.curriculum}>
                  <option value="">Select Subject</option>
                  {['Science', 'Mathematics', 'English', 'Social Science'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              {!chBoard && (
                <div className="lp-demo-empty">
                  <div className="lp-demo-empty-icon">🎓</div>
                  <p>Select your board, class and subject above to explore AI-powered learning tools for your exact chapter.</p>
                </div>
              )}
              {chBoard && chClass && chSubject && !chResult && !chLoading && (
                <div className="lp-demo-chapter-row">
                  <div className="lp-demo-chapter-info-box">
                    <div className="lp-demo-tag-row">
                      <span className="lp-demo-tag">{chBoard}</span>
                      <span className="lp-demo-tag">{chClass}</span>
                      <span className="lp-demo-tag">{chSubject}</span>
                    </div>
                    <div className="lp-demo-chapter-name">📖 {demoData.chapterName}</div>
                    <div className="lp-demo-chapter-sub">Choose an AI tool to generate content instantly</div>
                  </div>
                  <div className="lp-demo-tool-btns">
                    {[
                      { key: 'summary',    icon: '📝', label: 'AI Summary',   desc: '5-point chapter overview' },
                      { key: 'flashcards', icon: '🃏', label: 'Flashcards',   desc: 'Tap to flip & test yourself' },
                      { key: 'questions',  icon: '❓', label: 'Practice Q&A', desc: 'MCQ with instant feedback' },
                    ].map(tool => (
                      <button key={tool.key} className="lp-demo-tool-btn" onClick={() => runCurriculumTool(tool.key)}>
                        <span className="lp-demo-tool-icon">{tool.icon}</span>
                        <div><div className="lp-demo-tool-label">{tool.label}</div><div className="lp-demo-tool-desc">{tool.desc}</div></div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chLoading && (
                <div className="lp-demo-loading">
                  <div className="lp-demo-spinner" />
                  <p>AI is generating your {chTool === 'summary' ? 'chapter summary' : chTool === 'flashcards' ? 'flashcards' : 'practice question'}…</p>
                </div>
              )}
              {chResult === 'summary' && (
                <div className="lp-demo-result-box">
                  <div className="lp-demo-result-title">📝 AI Summary — {demoData.chapterName}</div>
                  <ol className="lp-demo-summary-list">
                    {demoData.summaryPoints.map((p, i) => <li key={i}><span>{i + 1}</span><p>{p}</p></li>)}
                  </ol>
                  <div className="lp-demo-nudge">Want summaries for all chapters? <button onClick={() => setGate('curriculum')}>Sign up free →</button></div>
                </div>
              )}
              {chResult === 'flashcards' && (
                <div className="lp-demo-result-box">
                  <div className="lp-demo-result-title">🃏 Flashcards — {demoData.chapterName}</div>
                  <div className="lp-demo-fc-grid">
                    {demoData.flashcards.map((fc, i) => (
                      <div key={i} className={`lp-demo-fc${chFlipIdx === i ? ' lp-fc-flipped' : ''}`} onClick={() => setChFlipIdx(chFlipIdx === i ? null : i)}>
                        <div className="lp-demo-fc-inner">
                          <div className="lp-demo-fc-front"><span className="lp-demo-fc-label">Question</span><p>{fc.front}</p><span className="lp-demo-fc-hint">Tap to flip ↩</span></div>
                          <div className="lp-demo-fc-back"><span className="lp-demo-fc-label">Answer</span><p>{fc.back}</p><span className="lp-demo-fc-hint">Tap to flip back ↩</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="lp-demo-nudge">Want 20 flashcards per chapter? <button onClick={() => setGate('curriculum')}>Sign up free →</button></div>
                </div>
              )}
              {chResult === 'questions' && (
                <div className="lp-demo-result-box">
                  <div className="lp-demo-result-title">❓ Practice Question — {demoData.chapterName}</div>
                  <p className="lp-demo-mcq-q">{demoData.mcq.q}</p>
                  <div className="lp-demo-mcq-opts">
                    {demoData.mcq.opts.map((o, i) => (
                      <div key={i} className={`lp-demo-mcq-opt${i === demoData.mcq.correct ? ' lp-mcq-correct' : ''}`}>
                        <span>{String.fromCharCode(65 + i)}</span> {o}
                        {i === demoData.mcq.correct && <span className="lp-mcq-tick">✓</span>}
                      </div>
                    ))}
                  </div>
                  <div className="lp-demo-expl">💡 {demoData.mcq.explanation}</div>
                  <div className="lp-demo-nudge" style={{ marginTop: 12 }}>Practice more questions? <button onClick={() => setGate('curriculum')}>Sign up free →</button></div>
                </div>
              )}
            </div>
          )}
          {/* QUESTION PRACTICE */}
          {tab === 'practice' && (
            <div className="lp-demo-panel">
              <div className="lp-demo-panel-hdr">
                <div>
                  <div className="lp-demo-panel-title">✏️ Question Practice</div>
                  <div className="lp-demo-panel-hint">
                    {prSubject ? `${prSubject} · 5 practice questions` : 'Select a subject to load questions'}
                  </div>
                </div>
                {used.practice ? <span className="lp-demo-badge-used">✓ Demo Used</span> : <span className="lp-demo-badge-free">1 free attempt</span>}
              </div>
              <div style={{ padding: '12px 32px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <select className="lp-demo-select"
                  value={prSubject}
                  onChange={e => { setPrSubject(e.target.value); setPrAnswers({}); setPrSubmitted(false) }}
                  disabled={used.practice}>
                  <option value="">— Select Subject —</option>
                  {['Science', 'Mathematics', 'English', 'Social Science'].map(s => <option key={s}>{s}</option>)}
                </select>
                {!prSubject && chSubject && (
                  <button className="lp-demo-tool-btn"
                    style={{ padding: '6px 14px', fontSize: 12 }}
                    onClick={() => setPrSubject(chSubject)}>
                    Use "{chSubject}" from Curriculum Hub →
                  </button>
                )}
              </div>
              {!prSubject ? (
                <div className="lp-demo-empty">
                  <div className="lp-demo-empty-icon">✏️</div>
                  <p>Select a subject above to load 5 practice questions.
                    {chSubject && <> You picked <strong>{chSubject}</strong> in Curriculum Hub — click the button above.</>}
                  </p>
                </div>
              ) : (
                <div style={{ padding: '0 32px 28px' }}>
                  {(DEMO_CONTENT[prSubject]?.mcqs || []).map((mcq, qi) => {
                    const answered = prAnswers[qi] !== undefined
                    const correct = prSubmitted && prAnswers[qi] === mcq.correct
                    const wrong = prSubmitted && answered && prAnswers[qi] !== mcq.correct
                    return (
                      <div key={qi} style={{ marginBottom: 18, padding: 16, borderRadius: 10, background: prSubmitted ? (correct ? '#f0fdf4' : wrong ? '#fef2f2' : '#f8fafc') : '#f8fafc', border: `1.5px solid ${prSubmitted ? (correct ? '#86efac' : wrong ? '#fca5a5' : '#e2e8f0') : '#e2e8f0'}` }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', marginBottom: 10 }}>
                          <span style={{ color: 'var(--indigo)', marginRight: 6 }}>Q{qi + 1}.</span>{mcq.q}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {mcq.opts.map((opt, oi) => {
                            const isSel = prAnswers[qi] === oi
                            const isRight = prSubmitted && oi === mcq.correct
                            const isWrong = prSubmitted && isSel && oi !== mcq.correct
                            return (
                              <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, cursor: prSubmitted || used.practice ? 'default' : 'pointer', background: isRight ? '#dcfce7' : isWrong ? '#fee2e2' : isSel ? '#eef2ff' : 'white', border: `1px solid ${isRight ? '#86efac' : isWrong ? '#fca5a5' : isSel ? '#a5b4fc' : '#e2e8f0'}`, fontSize: 13 }}>
                                <input type="radio" name={`q${qi}`} value={oi} checked={isSel} disabled={prSubmitted || used.practice}
                                  onChange={() => setPrAnswers(a => ({ ...a, [qi]: oi }))} style={{ accentColor: 'var(--indigo)' }} />
                                <span style={{ fontWeight: 600, color: 'var(--indigo)', marginRight: 4 }}>{String.fromCharCode(65 + oi)})</span>
                                {opt}
                                {isRight && <span style={{ marginLeft: 'auto', color: '#16a34a', fontWeight: 700 }}>✓</span>}
                                {isWrong && <span style={{ marginLeft: 'auto', color: '#dc2626', fontWeight: 700 }}>✗</span>}
                              </label>
                            )
                          })}
                        </div>
                        {prSubmitted && (
                          <div style={{ marginTop: 8, fontSize: 12, color: '#475569', background: '#f1f5f9', borderRadius: 6, padding: '6px 10px' }}>
                            💡 {mcq.explanation}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {!prSubmitted
                    ? <button className="lp-demo-submit-btn"
                        onClick={() => { if (Object.keys(prAnswers).length === 0 || used.practice) return; setPrSubmitted(true); markUsed('practice') }}
                        disabled={Object.keys(prAnswers).length === 0 || used.practice}>
                        Check My Answers →
                      </button>
                    : (
                      <div className="lp-demo-nudge" style={{ marginTop: 8 }}>
                        {`Score: ${(DEMO_CONTENT[prSubject]?.mcqs || []).filter((m, i) => prAnswers[i] === m.correct).length} / 5 correct! `}
                        <button onClick={() => setGate('practice')}>Sign up for unlimited practice →</button>
                      </div>
                    )
                  }
                </div>
              )}
            </div>
          )}
          {/* AI TUTOR */}
          {tab === 'tutor' && (
            <div className="lp-demo-panel lp-demo-panel-chat">
              <div className="lp-demo-panel-hdr" style={{ padding: '24px 32px 16px', borderBottom: '1px solid #F0EAFF', margin: 0 }}>
                <div>
                  <div className="lp-demo-panel-title">🤖 AI Tutor — Arthavi</div>
                  <div className="lp-demo-panel-hint">
                    {chSubject ? `Tutoring context: ${chSubject} · ask anything about this subject` : 'Ask one question — trained on your entire syllabus'}
                  </div>
                </div>
                {used.tutor ? <span className="lp-demo-badge-used">✓ Demo Used</span> : <span className="lp-demo-badge-free">1 free message</span>}
              </div>
              {!chSubject && (
                <div style={{ padding: '10px 32px', background: '#faf7ff', borderBottom: '1px solid #F0EAFF', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13, color: '#6b7280' }}>
                  <span>💡 Select a subject in</span>
                  <button className="lp-demo-tool-btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setTab('curriculum')}>Curriculum Hub →</button>
                  <span>to get subject-specific starter questions here.</span>
                </div>
              )}
              {chSubject && !used.tutor && tutMessages.length <= 1 && DEMO_CONTENT[chSubject]?.sampleQuestions && (
                <div style={{ padding: '10px 32px 12px', borderBottom: '1px solid #F0EAFF', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {DEMO_CONTENT[chSubject].sampleQuestions.slice(0, 3).map(q => (
                    <button key={q} className="chip selected" style={{ fontSize: 12 }} onClick={() => setTutMsg(q)}>{q}</button>
                  ))}
                </div>
              )}
              <div className="lp-demo-chat-wrap">
                <div className="lp-demo-chat-msgs">
                  {tutMessages.map((m, i) => (
                    <div key={i} className={`lp-demo-msg lp-demo-msg-${m.role}`}>
                      {m.role === 'ai' && <div className="lp-demo-vidya-av">A</div>}
                      <div className="lp-demo-msg-bubble">
                        {m.text.split('\n').map((line, j) => <p key={j}>{line}</p>)}
                      </div>
                    </div>
                  ))}
                  {tutLoading && (
                    <div className="lp-demo-msg lp-demo-msg-ai">
                      <div className="lp-demo-vidya-av">A</div>
                      <div className="lp-demo-msg-bubble lp-demo-typing"><span /><span /><span /></div>
                    </div>
                  )}
                  <div ref={tutEndRef} />
                </div>
                <div className="lp-demo-chat-bar">
                  <input className="lp-demo-chat-inp"
                    placeholder={used.tutor ? 'Sign up for unlimited AI tutoring!' : chSubject ? `Ask about ${chSubject}…` : 'Ask Arthavi anything… e.g. "Explain Real Numbers"'}
                    value={tutMsg}
                    onChange={e => setTutMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendTutorMsg()}
                    disabled={used.tutor || tutLoading} />
                  <button className="lp-demo-chat-send" onClick={sendTutorMsg} disabled={!tutMsg.trim() || used.tutor || tutLoading}>
                    {tutLoading ? '…' : '↑'}
                  </button>
                </div>
                {!used.tutor && <p className="lp-demo-chat-note">💬 1 free message in demo · Sign up for unlimited 24/7 AI tutoring</p>}
                {used.tutor && <div className="lp-demo-nudge" style={{ padding: '10px 16px', textAlign: 'center' }}>Want unlimited AI tutoring? <button onClick={() => setGate('tutor')}>Sign up free →</button></div>}
              </div>
            </div>
          )}
          {/* QUESTION MASTER */}
          {tab === 'qmaster' && (
            <div className="lp-demo-panel">
              <div className="lp-demo-panel-hdr">
                <div>
                  <div className="lp-demo-panel-title">📝 Question Master</div>
                  <div className="lp-demo-panel-hint">Generate a sample question paper with answer key</div>
                </div>
                {used.qmaster ? <span className="lp-demo-badge-used">✓ Demo Used</span> : <span className="lp-demo-badge-free">1 free generation</span>}
              </div>
              <div className="lp-demo-qm-wrap">
                <div className="lp-demo-selectors">
                  {[
                    { val: qmBoard, set: setQmBoard, opts: ['CBSE', 'ICSE / ISC', 'Maharashtra Board'] },
                    { val: qmClass, set: setQmClass, opts: ['Class 9', 'Class 10', 'Class 11', 'Class 12'] },
                    { val: qmSubject, set: setQmSubject, opts: ['Science', 'Mathematics', 'English'] },
                  ].map((sel, i) => (
                    <select key={i} className="lp-demo-select" value={sel.val} onChange={e => sel.set(e.target.value)} disabled={qmGenerated}>
                      {sel.opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ))}
                </div>
                <div className="lp-demo-qm-config">
                  {[['Topic', qmDemoData.topic], ['Questions', '3 (Mixed types)'], ['Total Marks', '8'], ['Difficulty', 'Medium'], ['Answer Key', 'Included ✓']].map(([k, v]) => (
                    <div key={k} className="lp-demo-qm-cfg-row"><span>{k}</span><strong>{v}</strong></div>
                  ))}
                </div>
                {!qmGenerated && (
                  <button className="lp-demo-gen-btn" onClick={generateQuestions} disabled={qmLoading}>
                    {qmLoading ? <><span className="lp-demo-spinner-sm" /> Generating paper…</> : '⚡ Generate Question Paper'}
                  </button>
                )}
                {qmGenerated && (
                  <div className="lp-demo-paper">
                    <div className="lp-demo-paper-hdr">
                      <strong>{qmBoard} · {qmClass} · {qmSubject}</strong>
                      <span>Topic: Photosynthesis · 8 Marks</span>
                    </div>
                    {qmDemoData.questions.map((q, i) => (
                      <div key={i} className="lp-demo-paper-q">
                        <div className="lp-demo-paper-q-hdr">
                          <span className="lp-demo-paper-qnum">Q{q.n}.</span>
                          <span className="lp-demo-paper-qtype">{q.type}</span>
                        </div>
                        <p className="lp-demo-paper-qtext">{q.q}</p>
                        {q.opts && <div className="lp-demo-paper-opts">{q.opts.map((o, j) => <span key={j}>{String.fromCharCode(65 + j)}) {o}&nbsp;&nbsp;</span>)}</div>}
                        {q.ans && <div className="lp-demo-paper-ans">✓ {q.ans}</div>}
                      </div>
                    ))}
                    <div className="lp-demo-nudge" style={{ marginTop: 16 }}>Want full 40-question papers with PDF export? <button onClick={() => setGate('qmaster')}>Sign up free →</button></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {/* Bottom CTA */}
        <div className="lp-demo-cta-row">
          <div className="lp-demo-cta-text">
            <strong>🚀 Unlock everything — free to start</strong>
            <span>All AI tools · All 35+ boards · All chapters · No credit card needed</span>
          </div>
          <button className="lp-btn-primary lp-btn-xl" onClick={onRegister}>Create Free Account →</button>
        </div>
      </div>
      {/* Gate Modal */}
      {gate && (
        <div className="lp-demo-gate-overlay" onClick={() => setGate(null)}>
          <div className="lp-demo-gate-modal" onClick={e => e.stopPropagation()}>
            <button className="lp-demo-gate-close" onClick={() => setGate(null)}>✕</button>
            <div className="lp-demo-gate-ico">{DEMO_GATE_COPY[gate]?.icon}</div>
            <h3 className="lp-demo-gate-title">{DEMO_GATE_COPY[gate]?.title}</h3>
            <p className="lp-demo-gate-sub">{DEMO_GATE_COPY[gate]?.sub}</p>
            <div className="lp-demo-gate-feats">
              {['All 35+ boards & classes', 'Unlimited AI interactions', 'Question papers with PDF export', 'AI answer sheet evaluation'].map(f => (
                <div key={f} className="lp-demo-gate-feat"><span>✓</span>{f}</div>
              ))}
            </div>
            <div className="lp-demo-gate-btns">
              <button className="lp-btn-primary lp-btn-xl" style={{ width: '100%' }} onClick={() => { setGate(null); onRegister() }}>
                🚀 Create Free Account — It's Fast!
              </button>
              <button className="lp-btn-ghost" style={{ width: '100%' }} onClick={() => setGate(null)}>Keep Exploring Demo</button>
            </div>
            <p className="lp-demo-gate-note">✅ Free forever plan · No credit card · 2M+ students trust Arthavi</p>
          </div>
        </div>
      )}
    </section>
  )
}

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

export default function LandingPage({ onUpgrade }) {
  const { token } = useAuth()
  const { t, td } = useLang()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalForm, setModalForm] = useState('login')
  const [modalRole, setModalRole] = useState('student')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [coachingStudents, setCoachingStudents] = useState(20)
  const [pendingPlan, setPendingPlan] = useState(null)
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
          <Logo size={60} full />
        </a>
        <div className="lp-nav-links">
          <a href="#roles">{t('nav.for_schools')}</a>
          <a href="#features">{t('nav.features')}</a>
          <a href="#how">{t('nav.how_it_works')}</a>
          <a href="#pricing">{t('nav.pricing')}</a>
          <a href="#demo" style={{ color:'#6B52B0', fontWeight:700 }}>{t('nav.try_demo')}</a>
          <a href="#boards">{t('nav.boards')}</a>
        </div>
        <div className="lp-nav-actions">
          <LangToggle />
          <button className="lp-btn-ghost" onClick={() => openModal('login')}>{t('nav.sign_in')}</button>
          <button className="lp-btn-primary" onClick={() => openModal('register')}>{t('nav.get_started')}</button>
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
              <Logo size={52} full={true} />
              <button className="lp-mobile-close" onClick={() => setMobileMenu(false)}>✕</button>
            </div>
            <nav className="lp-mobile-links">
              {['#roles','#features','#how','#pricing','#demo','#boards'].map((h, i) => (
                <a key={h} href={h} onClick={() => setMobileMenu(false)}
                  style={h === '#demo' ? { color:'#6B52B0', background:'#F0EAFF' } : {}}>
                  {[t('nav.for_schools'),t('nav.features'),t('nav.how_it_works'),t('nav.pricing'),t('nav.try_demo'),t('nav.boards')][i]}
                </a>
              ))}
            </nav>
            <div className="lp-mobile-btns">
              <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}><LangToggle /></div>
              <button className="lp-btn-ghost" style={{ width:'100%' }} onClick={() => { setMobileMenu(false); openModal('login') }}>{t('nav.sign_in')}</button>
              <button className="lp-btn-primary" style={{ width:'100%' }} onClick={() => { setMobileMenu(false); openModal('register') }}>{t('nav.get_started')}</button>
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
            {t('hero.badge')}
          </div>
          <h1 className="lp-h1 lp-fade">
            {t('hero.h1_line1')}<br/>
            {t('hero.h1_line2')}<span className="lp-gradient-text">{t('hero.h1_highlight')}</span>
          </h1>
          <div className="lp-hero-chips lp-fade">
            <span className="lp-chip">{t('hero.chip1')}</span>
            <span className="lp-chip">{t('hero.chip2')}</span>
            <span className="lp-chip">{t('hero.chip3')}</span>
            <span className="lp-chip">{t('hero.chip4')}</span>
          </div>
          <p className="lp-hero-sub lp-fade">
            {t('hero.sub')}
          </p>
          <div className="lp-hero-ctas lp-fade">
            <button className="lp-btn-hero-primary" onClick={() => openModal('register', 'school_admin')}>
              {t('hero.cta_school')}
            </button>
            <a className="lp-btn-try-demo" href="#demo">
              {t('hero.cta_demo')}
            </a>
            <button className="lp-btn-hero-sec" onClick={() => openModal('register', 'student')}>
              {t('hero.cta_student')}
            </button>
          </div>
          <div className="lp-stats lp-fade">
            {td('stats').map(s => (
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
                <Logo size={40} />
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
        {['💰 Save ₹50,000+ per Year', '🤖 AI Tutor 24/7 — No Extra Cost', '⚡ Evaluate 40 Papers in Minutes', '📊 Real-Time Parent Reports', '🇮🇳 All 35+ Boards & State Curricula'].map(item => (
          <div key={item} className="lp-trust-item">
            <span>{item.split(' ')[0]}</span>
            <span>{item.split(' ').slice(1).join(' ')}</span>
          </div>
        ))}
      </div>

      {/* ════════════════════ FOR STUDENTS / FOR PARENTS ════════════════════ */}
      <section className="lp-section lp-qw-section">
        <div className="lp-section-inner">
          <div className="lp-qw-pain">Spend ₹50,000+ on tuitions every year?</div>
          <div className="lp-qw-hook">Get a <strong>24/7 Personal AI Tutor</strong> for a <span className="lp-qw-highlight">fraction</span> of the cost!</div>
          <div className="lp-qw-cols">
            <div className="lp-qw-card" style={{ '--qw-accent': '#2563EB', '--qw-bg': '#EFF6FF' }}>
              <div className="lp-qw-card-title">🎒 For Students</div>
              <ul className="lp-qw-list">
                <li>✅ CBSE, ICSE &amp; 35+ State Boards</li>
                <li>✅ Instant summaries &amp; flashcards</li>
                <li>✅ Practice tests + Audio lessons</li>
                <li>✅ AI Tutor 24/7 on any topic</li>
              </ul>
            </div>
            <div className="lp-qw-card" style={{ '--qw-accent': '#EA580C', '--qw-bg': '#FFF7ED' }}>
              <div className="lp-qw-card-title">👨‍👩‍👧‍👦 For Parents</div>
              <ul className="lp-qw-list">
                <li>✅ Save ₹50K+/yr, Ditch Tuitions!</li>
                <li>✅ Know Your Child's Progress</li>
                <li>✅ Real-time performance reports</li>
                <li>✅ No app download — works in browser!</li>
              </ul>
            </div>
          </div>
          {/* Feature icons row */}
          <div className="lp-qw-features">
            {[['🤖','AI Tutor 24/7'],['🃏','Smart Flashcards'],['📝','Practice Tests with Feedback'],['🔊','Audio Lessons'],['📋','Exam Paper Generator']].map(([icon, label]) => (
              <div key={label} className="lp-qw-feature-item">
                <span className="lp-qw-feature-icon">{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="lp-qw-cta-row">
            <a href="#demo" className="lp-btn-try-free">TRY IT FREE &nbsp;➡&nbsp; arthavi.in</a>
            <div className="lp-qw-badge">No App Download Needed · Works in Your Browser!</div>
          </div>
          {/* Result callouts */}
          <div className="lp-results-row">
            <div className="lp-result-card" style={{ '--rc-bg': '#FFF9C4' }}>🎯 Students: Score <strong>94%</strong> in Boards!</div>
            <div className="lp-result-card" style={{ '--rc-bg': '#C8F7C5' }}>💰 Parents: Save <strong>Big</strong> on Tuitions!</div>
            <div className="lp-result-card" style={{ '--rc-bg': '#DDEEFF' }}>⚡ Schools: Grade Exams in <strong>Minutes!</strong></div>
          </div>
        </div>
      </section>

      {/* ════════════════════ SCHOOL PAIN ════════════════════ */}
      <section className="lp-section lp-bg-white" id="pain">
        <div className="lp-section-inner">
          <div className="lp-section-eyebrow">THE REAL PROBLEM</div>
          <h2 className="lp-h2">Schools Are Still<br/>Running on Manual Work</h2>
          <p className="lp-section-sub">Every teacher, admin and parent faces the same bottlenecks — Arthavi solves all three.</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:24, marginTop:48 }}>
            <div style={{ padding:'32px 28px', borderRadius:20, border:'2px solid #fee2e2', background:'#fff5f5', textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:14 }}>⏰</div>
              <div style={{ fontWeight:800, fontSize:17, color:'#991b1b', marginBottom:10 }}>Time Lost</div>
              <p style={{ fontSize:14, color:'#6b7280', lineHeight:1.7 }}>Teachers spend 5–10 hours every week manually checking answer papers — time that could go to actual teaching.</p>
            </div>
            <div style={{ padding:'32px 28px', borderRadius:20, border:'2px solid #fde68a', background:'#fffbeb', textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:14 }}>🔁</div>
              <div style={{ fontWeight:800, fontSize:17, color:'#92400e', marginBottom:10 }}>Repetitive Work</div>
              <p style={{ fontSize:14, color:'#6b7280', lineHeight:1.7 }}>Question papers are manually created from scratch every single exam. Same effort, every time, for every subject.</p>
            </div>
            <div style={{ padding:'32px 28px', borderRadius:20, border:'2px solid #bfdbfe', background:'#eff6ff', textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:14 }}>📭</div>
              <div style={{ fontWeight:800, fontSize:17, color:'#1e40af', marginBottom:10 }}>No Visibility</div>
              <p style={{ fontSize:14, color:'#6b7280', lineHeight:1.7 }}>Parents and admins have no real-time insight into student performance until results arrive — weeks too late.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════ PROBLEM ════════════════════ */}
      <section className="lp-section lp-bg-cream" id="problem">
        <div className="lp-section-inner">
          <div className="lp-section-eyebrow">THE PROBLEM WE ALL FACE</div>
          <h2 className="lp-h2">Education Is Stressful,<br/>Expensive &amp; Inefficient</h2>
          <p className="lp-section-sub">Every stakeholder in Indian education is struggling — and spending too much doing it.</p>
          <div className="lp-roles-grid">
            {[
              { emoji:'👨‍👩‍👧‍👦', name:'Parents', color:'#fce7f3', accent:'#9d174d',
                items:['Paying ₹20,000–₹80,000/year for tuition','No clear visibility into child\'s progress','Constant stress around exams','Dependent on expensive coaching institutes','No consolidated progress reports'] },
              { emoji:'🎒', name:'Students', color:'#fef9c3', accent:'#ca8a04',
                items:['Don\'t fully understand concepts in class','Practice feels repetitive and boring','Doubts remain unresolved for days','Exam fear and lack of confidence','No personalised learning path'] },
              { emoji:'🏫', name:'Schools & Teachers', color:'#dcfce7', accent:'#16a34a',
                items:['Spend hours correcting answer sheets','Pressure to deliver results + admin work','Managing parents, reports & exams manually','No data on which students are struggling','Time-consuming question paper creation'] },
            ].map((r, i) => (
              <div key={r.name} className="lp-role-card lp-fade" style={{ '--card-color': r.color, '--card-accent': r.accent, animationDelay: `${i * 0.08}s` }}>
                <div className="lp-role-emoji">{r.emoji}</div>
                <div className="lp-role-name">{r.name}</div>
                <ul className="lp-role-features">
                  {r.items.map(f => <li key={f}>{f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ MEET ARTHAVI ════════════════════ */}
      <section className="lp-section lp-how-section">
        <div className="lp-section-inner" style={{ textAlign:'center' }}>
          <div className="lp-section-eyebrow lp-eyebrow-light">THE SOLUTION</div>
          <h2 className="lp-h2" style={{ color:'#fff' }}>Meet Arthavi</h2>
          <p className="lp-section-sub" style={{ color:'rgba(255,255,255,.8)', maxWidth:640, margin:'12px auto 0', fontSize:20, fontWeight:600 }}>
            One Platform. Every Academic Need Solved.
          </p>
          <p style={{ color:'rgba(255,255,255,.65)', maxWidth:620, margin:'20px auto 0', fontSize:16, lineHeight:1.85 }}>
            Arthavi is an AI-powered education system designed for Indian K-12 students, teachers, and schools. One platform for evaluation, practice, learning, and reporting — no tuition fees, no manual overhead.
          </p>
        </div>
      </section>

      {/* ════════════════════ FOR WHOM ════════════════════ */}
      <section className="lp-section lp-bg-cream" id="roles">
        <div className="lp-section-inner">
          <div className="lp-section-eyebrow">DESIGNED FOR YOU</div>
          <h2 className="lp-h2">Learn Smarter. Teach Better.<br/>Stay Informed.</h2>
          <p className="lp-section-sub">A dedicated experience for every role — students study smarter, teachers save hours, parents stay informed.</p>
          <div className="lp-roles-grid">
            {[
              { emoji:'🎒', name:'For Students', color:'#fef9c3', accent:'#ca8a04',
                features:['Ask doubts anytime — AI tutor knows your syllabus','Practice unlimited questions per chapter','Instant evaluation with mistake analysis','Track your improvement over time','Audio lessons for learning on the go'],
                cta:'🎒 Start Learning Free', role:'student' },
              { emoji:'👨‍👩‍👧‍👦', name:'For Parents', color:'#fce7f3', accent:'#9d174d',
                features:['Know exactly how your child is performing','Reduce dependency on expensive tuition','Get automatic progress reports by email','Real-time learning gap identification','No more chasing school for updates'],
                cta:'👨‍👩‍👧‍👦 View Sample Report', role:'parent' },
              { emoji:'🏫', name:'For Schools & Teachers', color:'#dcfce7', accent:'#16a34a',
                features:['Save hours on evaluation — 40 papers in minutes','Generate question papers with answer keys instantly','Improve student performance with AI insights','Manage everything in one dashboard','Automated parent communication & reports'],
                cta:'🏫 Book a Demo', role:'school_admin' },
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
          <div className="lp-section-eyebrow">CORE BENEFITS</div>
          <h2 className="lp-h2">Six Ways Arthavi<br/>Changes Education</h2>
          <p className="lp-section-sub">Every benefit is real, measurable, and immediate — for students, parents, and teachers alike.</p>
          <div className="lp-features-grid">
            {td('features').map((f, i) => (
              <div key={f.label} className="lp-feature-card lp-fade" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="lp-feature-icon" style={{ background: f.color }}>{f.icon}</div>
                <div className="lp-feature-name">{f.label}</div>
                <p className="lp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ SPECIALIZED LEARNING PATHS ════════════════════ */}
      <section className="lp-section lp-bg-paper" id="specialized">
        <div className="lp-section-inner">
          <div className="lp-section-eyebrow">SPECIALIZED LEARNING PATHS</div>
          <h2 className="lp-h2">Beyond the Syllabus —<br/>Prepare for Life After School</h2>
          <p className="lp-section-sub">Arthavi doesn't just help with board exams. Discover India's most comprehensive tools for entrance exams, degree prep, career planning, and skill development.</p>
          <div className="lp-sp-grid">

            {/* Entrance Prep */}
            <div className="lp-sp-card lp-sp-entrance lp-fade">
              <div className="lp-sp-card-header">
                <div className="lp-sp-icon">🎯</div>
                <div>
                  <div className="lp-sp-name">Entrance Prep</div>
                  <div className="lp-sp-tagline">JEE · NEET · Unlimited AI Practice</div>
                </div>
              </div>
              <ul className="lp-sp-list">
                <li>Chapter-wise MCQs for JEE Main, JEE Advanced &amp; NEET UG</li>
                <li>AI generates unlimited new questions — never run out of practice</li>
                <li>Previous Year Questions with Most Repeated &amp; High Probability tags</li>
                <li>Audio notes + AI Doubt Solver for every chapter</li>
                <li>Weak area detection, revision mode &amp; daily target tracker</li>
              </ul>
              <div className="lp-sp-tags">
                <span>JEE Main</span><span>JEE Advanced</span><span>NEET UG</span><span>AI Practice</span>
              </div>
              <button className="lp-sp-cta lp-sp-cta-entrance" onClick={() => openModal('register', 'student')}>
                Start Entrance Prep →
              </button>
            </div>

            {/* Career Compass */}
            <div className="lp-sp-card lp-sp-career lp-fade" style={{ animationDelay:'0.1s' }}>
              <div className="lp-sp-card-header">
                <div className="lp-sp-icon">🧭</div>
                <div>
                  <div className="lp-sp-name">Career Compass</div>
                  <div className="lp-sp-tagline">Explore · Plan · Achieve Your Goal</div>
                </div>
              </div>
              <ul className="lp-sp-list">
                <li>9 major career sectors: Civil Services, Defence, Banking, Railways &amp; more</li>
                <li>Detailed eligibility, exam calendars &amp; salary ranges for every path</li>
                <li>Free study material links from UPSC, NTA, SWAYAM &amp; official govt sites</li>
                <li>Built-in MCQ coaching practice for each career path</li>
                <li>Personal progress tracker to stay on target</li>
              </ul>
              <div className="lp-sp-tags">
                <span>UPSC</span><span>SSC</span><span>Banking</span><span>State Jobs</span>
              </div>
              <button className="lp-sp-cta lp-sp-cta-career" onClick={() => openModal('register', 'student')}>
                Explore Career Paths →
              </button>
            </div>

            {/* Degree Hub */}
            <div className="lp-sp-card lp-sp-degree lp-fade" style={{ animationDelay:'0.2s' }}>
              <div className="lp-sp-card-header">
                <div className="lp-sp-icon">🎓</div>
                <div>
                  <div className="lp-sp-name">Degree Hub</div>
                  <div className="lp-sp-tagline">AI-Powered Degree Prep System</div>
                </div>
              </div>
              <ul className="lp-sp-list">
                <li>Full AI engine for BCA, BSc CS, BCom, BA Economics, BBA &amp; more</li>
                <li>AI Smart Notes — auto-generate chapter summaries unit by unit</li>
                <li>Practice MCQs with smart weak-area detection across all subjects</li>
                <li>AI Mock Tests — unit tests, subject mocks with instant grading</li>
                <li>AI Doubt Solver — chat with AI on any concept, derivation or problem</li>
                <li>AI Study Planner — personalised day-by-day exam schedule</li>
              </ul>
              <div className="lp-sp-tags">
                <span>BCA</span><span>BCom</span><span>BSc CS</span><span>AI Doubt</span><span>Mock Tests</span>
              </div>
              <button className="lp-sp-cta lp-sp-cta-degree" onClick={() => openModal('register', 'student')}>
                Open Degree Hub →
              </button>
            </div>

            {/* SkillUp Hub */}
            <div className="lp-sp-card lp-sp-skill lp-fade" style={{ animationDelay:'0.3s' }}>
              <div className="lp-sp-card-header">
                <div className="lp-sp-icon">🎓</div>
                <div>
                  <div className="lp-sp-name">SkillUp Hub</div>
                  <div className="lp-sp-tagline">1000+ Free Courses &amp; Certifications</div>
                </div>
              </div>
              <ul className="lp-sp-list">
                <li>Curated free courses from Google, Microsoft, NPTEL, SWAYAM &amp; more</li>
                <li>AI/ML, Cloud, Data Science, Cybersecurity, Web Dev &amp; Digital Marketing</li>
                <li>Free certificates from top companies &amp; government platforms</li>
                <li>Track enrolled, in-progress and completed courses in one place</li>
                <li>India-first — includes SWAYAM, iGOT, PMKVY &amp; Skill India programs</li>
              </ul>
              <div className="lp-sp-tags">
                <span>AI &amp; ML</span><span>Cloud</span><span>Govt Certs</span><span>Free</span>
              </div>
              <button className="lp-sp-cta lp-sp-cta-skill" onClick={() => openModal('register', 'student')}>
                Browse Free Courses →
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ════════════════════ BEFORE vs AFTER ════════════════════ */}
      <section className="lp-section lp-bg-cream" id="comparison">
        <div className="lp-section-inner">
          <div className="lp-section-eyebrow">TRANSFORMATION</div>
          <h2 className="lp-h2">Before Arthavi<br/>vs After Arthavi</h2>
          <p className="lp-section-sub">See the difference Arthavi makes — for students, parents, and teachers.</p>
          <div style={{ overflowX:'auto', marginTop:40 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:480, borderRadius:16, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,.07)' }}>
              <thead>
                <tr>
                  <th style={{ padding:'16px 24px', background:'#fef2f2', color:'#991b1b', textAlign:'left', fontSize:15, fontWeight:700 }}>Before Arthavi ❌</th>
                  <th style={{ padding:'16px 24px', background:'#f0fdf4', color:'#166534', textAlign:'left', fontSize:15, fontWeight:700 }}>After Arthavi ✅</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['₹2,000/hour private tutors', '24/7 AI tutor — no extra cost'],
                  ['2–3 days for answer sheet evaluation', 'Entire class evaluated in minutes'],
                  ['No parent visibility into child\'s progress', 'Real-time progress reports & email alerts'],
                  ['Static, repetitive learning material', 'Adaptive AI-generated practice every time'],
                  ['Manual question paper creation (hours)', 'One-click question papers with answer keys'],
                  ['₹80,000+/year education spend', 'One platform. Fraction of the cost.'],
                ].map(([before, after], i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding:'14px 24px', color:'#64748b', fontSize:14, borderTop:'1px solid #e2e8f0' }}>❌ {before}</td>
                    <td style={{ padding:'14px 24px', color:'#16a34a', fontSize:14, fontWeight:600, borderTop:'1px solid #e2e8f0' }}>✅ {after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ════════════════════ COST COMPARISON ════════════════════ */}
      <section className="lp-section lp-bg-white" id="cost">
        <div className="lp-section-inner">
          <div className="lp-section-eyebrow">COST SAVINGS</div>
          <h2 className="lp-h2">Education Shouldn't Cost<br/>₹80,000 a Year</h2>
          <p className="lp-section-sub">The average Indian family spends ₹80,000+ on tuition and test prep annually. Arthavi changes that.</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px,1fr))', gap:24, maxWidth:720, margin:'40px auto 0' }}>
            <div style={{ background:'#fef2f2', borderRadius:20, padding:32, border:'2px solid #fecaca' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>😰</div>
              <div style={{ fontWeight:700, fontSize:19, color:'#991b1b', marginBottom:20 }}>What You Pay Today</div>
              {[['Private Tuition', '₹30,000/yr'],['Test Prep Apps', '₹50,000/yr'],['Grand Total', '₹80,000+/yr']].map(([label, amt]) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #fecaca' }}>
                  <span style={{ color:'#7f1d1d', fontSize:14 }}>{label}</span>
                  <span style={{ fontWeight:700, color:'#991b1b', fontSize:14 }}>{amt}</span>
                </div>
              ))}
            </div>
            <div style={{ background:'#f0fdf4', borderRadius:20, padding:32, border:'2px solid #86efac' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>🎉</div>
              <div style={{ fontWeight:700, fontSize:19, color:'#166534', marginBottom:20 }}>With Arthavi</div>
              <div style={{ color:'#15803d', fontSize:14, lineHeight:2.0, marginBottom:20 }}>
                ✅ AI Tutor (24/7, included)<br/>
                ✅ Unlimited Practice Tests<br/>
                ✅ Audio &amp; Video Lessons<br/>
                ✅ Automatic Parent Reports<br/>
                ✅ Teacher Evaluation Tools
              </div>
              <div style={{ fontWeight:800, fontSize:20, color:'#15803d', borderTop:'1px solid #86efac', paddingTop:16 }}>One platform. Fraction of the cost.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════ PRICING ════════════════════ */}
      <section className="lp-section lp-bg-paper" id="pricing">
        <div className="lp-section-inner">
          <div className="lp-section-eyebrow">PRICING</div>
          <h2 className="lp-h2">Simple, Scalable Pricing<br/>for Students and Schools</h2>
          <p className="lp-section-sub" style={{ maxWidth: 820 }}>
            Starts at less than ₹1 per student per day. All prices in INR — reviewed annually. Paid plans feel like a no-brainer.
          </p>

          <div className="lp-pricing-philosophy">
            💡 <strong>Pricing Philosophy:</strong> Free should be genuinely useful to drive word-of-mouth. Paid plans should feel like a no-brainer. Schools pay per student per year — every student added goes directly to Arthavi revenue.
            <br/><em style={{ color:'#6b52b0', fontWeight:600 }}>"Costs less than one private tuition session per month" — true for every plan.</em>
          </div>

          <div className="lp-pricing-grid">
            {PRICING_PLANS.map((plan) => (
              <article key={plan.id} className={`lp-price-card${plan.badge ? ' lp-price-card-popular' : ''}`}>
                {plan.badge && <div className="lp-price-badge">★ {plan.badge}</div>}
                <h3>{plan.name}</h3>
                <p className="lp-price-main">{plan.price}</p>
                <p className="lp-price-usd">{plan.approxUsd}</p>
                {plan.annual && <p className="lp-price-note">{plan.annual}</p>}
                <p className="lp-price-summary">{plan.summary}</p>
                {plan.anchor && (
                  <p style={{ fontSize:12, color:'#6b52b0', fontWeight:700, background:'#f0eaff', borderRadius:8, padding:'7px 12px', margin:'0' }}>💡 {plan.anchor}</p>
                )}

                <div className="lp-price-list-wrap">
                  <p className="lp-price-list-title">Included</p>
                  <ul className="lp-price-list">
                    {plan.includes.map((item) => <li key={item}>✓ {item}</li>)}
                  </ul>
                </div>

                {plan.excludes.length > 0 && (
                  <div className="lp-price-list-wrap lp-price-list-excl">
                    <p className="lp-price-list-title">Not included</p>
                    <ul className="lp-price-list">
                      {plan.excludes.map((item) => <li key={item}>✗ {item}</li>)}
                    </ul>
                  </div>
                )}

                <button
                  className={plan.badge ? 'lp-btn-primary' : 'lp-btn-ghost'}
                  onClick={() => {
                    if (plan.id === 'enterprise') {
                      window.location.href = 'mailto:sales@arthavi.in?subject=Enterprise%20Pricing%20Inquiry'
                      return
                    }
                    if (plan.id === 'free-student') {
                      openModal('register', plan.role)
                      return
                    }
                    // Paid plan
                    if (token) {
                      onUpgrade && onUpgrade(plan)
                    } else {
                      setPendingPlan(plan)
                      openModal('register', plan.role)
                    }
                  }}
                >
                  {plan.cta}
                </button>
              </article>
            ))}
          </div>

          <div className="lp-coaching-calc">
            <div>
              <h3>Coaching Institute Fee Estimator</h3>
              <p>INR 99 per student per month, minimum 20 students.</p>
            </div>
            <div className="lp-coaching-controls">
              <label htmlFor="coachingStudents">Students in your batch</label>
              <input
                id="coachingStudents"
                type="number"
                min="20"
                value={coachingStudents}
                onChange={(e) => setCoachingStudents(Math.max(20, Number(e.target.value) || 20))}
              />
            </div>
            <div className="lp-coaching-output">
              <p>Monthly Fee</p>
              <strong>
                INR {(Math.max(20, coachingStudents) * 99).toLocaleString('en-IN')} ({'$'}{(Math.max(20, coachingStudents) * 99 * INR_TO_USD).toFixed(2)})
              </strong>
            </div>
          </div>

          {/* School per-student/year pricing */}
          <div style={{ marginTop:52 }}>
            <div style={{ textAlign:'center', marginBottom:32 }}>
              <div style={{ display:'inline-block', padding:'4px 14px', borderRadius:100, background:'#eff6ff', color:'#1d4ed8', fontSize:12, fontWeight:700, letterSpacing:'.06em', marginBottom:12 }}>SCHOOL PLANS — PER STUDENT</div>
              <h3 style={{ fontSize:22, fontWeight:800, color:'#1e293b', margin:'0 0 8px' }}>Per-Student Pricing for Schools</h3>
              <p style={{ fontSize:14, color:'#6b7280' }}>500 students at ₹200 = <strong style={{ color:'#1e293b' }}>₹1 lakh/year</strong>. At ₹500 = <strong style={{ color:'#1e293b' }}>₹2.5 lakh/year</strong>. Pay only for enrolled students.</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:20, maxWidth:780, margin:'0 auto' }}>
              <div style={{ padding:'28px 24px', borderRadius:18, border:'1.5px solid #e2e8f0', background:'#fff', textAlign:'center' }}>
                <div style={{ fontWeight:800, fontSize:16, marginBottom:6 }}>Starter</div>
                <div style={{ fontSize:12, color:'#6b7280', marginBottom:16 }}>Small schools &amp; pilots</div>
                <div style={{ fontSize:28, fontWeight:900, color:'#1e293b', lineHeight:1.1 }}>₹200</div>
                <div style={{ fontSize:12, color:'#6b7280', marginBottom:4 }}>per student / year</div>
                <div style={{ fontSize:11, color:'#16a34a', fontWeight:700, marginBottom:16 }}>300 students → ₹60,000/yr</div>
                <ul style={{ listStyle:'none', padding:0, margin:'0 0 20px', display:'flex', flexDirection:'column', gap:8, textAlign:'left' }}>
                  {['Up to 300 students','AI evaluation (200 sheets/mo)','Question paper generation','Parent email reports'].map(f => <li key={f} style={{ fontSize:13, color:'#374151', paddingLeft:18, position:'relative' }}><span style={{ position:'absolute', left:0, color:'#16a34a', fontWeight:800 }}>✓</span>{f}</li>)}
                </ul>
                <button style={{ width:'100%', padding:'10px', borderRadius:10, border:'1.5px solid #e2e8f0', background:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }} onClick={() => openModal('register', 'school_admin')}>Get Started</button>
              </div>
              <div style={{ padding:'28px 24px', borderRadius:18, border:'2px solid #6366f1', background:'linear-gradient(135deg,#eff6ff,#eef2ff)', textAlign:'center', position:'relative' }}>
                <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:'#4f46e5', color:'#fff', borderRadius:100, padding:'3px 14px', fontSize:11, fontWeight:800 }}>★ MOST POPULAR</div>
                <div style={{ fontWeight:800, fontSize:16, marginBottom:6 }}>Growth</div>
                <div style={{ fontSize:12, color:'#6b7280', marginBottom:16 }}>Mid-size schools</div>
                <div style={{ fontSize:28, fontWeight:900, color:'#1e293b', lineHeight:1.1 }}>₹350</div>
                <div style={{ fontSize:12, color:'#6b7280', marginBottom:4 }}>per student / year</div>
                <div style={{ fontSize:11, color:'#4f46e5', fontWeight:700, marginBottom:16 }}>500 students → ₹1,75,000/yr</div>
                <ul style={{ listStyle:'none', padding:0, margin:'0 0 20px', display:'flex', flexDirection:'column', gap:8, textAlign:'left' }}>
                  {['Up to 800 students','Unlimited AI evaluation','Bulk ZIP evaluation upload','Custom report branding','Priority support'].map(f => <li key={f} style={{ fontSize:13, color:'#374151', paddingLeft:18, position:'relative' }}><span style={{ position:'absolute', left:0, color:'#4f46e5', fontWeight:800 }}>✓</span>{f}</li>)}
                </ul>
                <button style={{ width:'100%', padding:'10px', borderRadius:10, border:'none', background:'#4f46e5', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }} onClick={() => openModal('register', 'school_admin')}>Book Demo</button>
              </div>
              <div style={{ padding:'28px 24px', borderRadius:18, border:'1.5px solid #e2e8f0', background:'#fff', textAlign:'center' }}>
                <div style={{ fontWeight:800, fontSize:16, marginBottom:6 }}>Premium</div>
                <div style={{ fontSize:12, color:'#6b7280', marginBottom:16 }}>Large schools &amp; groups</div>
                <div style={{ fontSize:28, fontWeight:900, color:'#1e293b', lineHeight:1.1 }}>₹500</div>
                <div style={{ fontSize:12, color:'#6b7280', marginBottom:4 }}>per student / year</div>
                <div style={{ fontSize:11, color:'#b45309', fontWeight:700, marginBottom:16 }}>500 students → ₹2,50,000/yr</div>
                <ul style={{ listStyle:'none', padding:0, margin:'0 0 20px', display:'flex', flexDirection:'column', gap:8, textAlign:'left' }}>
                  {['Unlimited students','Dedicated account manager','On-site teacher training','Custom AI fine-tuning','SLA + priority uptime'].map(f => <li key={f} style={{ fontSize:13, color:'#374151', paddingLeft:18, position:'relative' }}><span style={{ position:'absolute', left:0, color:'#d97706', fontWeight:800 }}>✓</span>{f}</li>)}
                </ul>
                <button style={{ width:'100%', padding:'10px', borderRadius:10, border:'1.5px solid #fde68a', background:'#fffbeb', fontWeight:700, fontSize:13, cursor:'pointer' }} onClick={() => { window.location.href='mailto:sales@arthavi.in?subject=School%20Premium%20Plan' }}>Contact Sales</button>
              </div>
            </div>
            <p style={{ textAlign:'center', marginTop:18, fontSize:12, color:'#94a3b8' }}>All school plans include student + teacher accounts, admin dashboard, parent reports &amp; onboarding support.</p>
          </div>
        </div>
      </section>
      <section className="lp-section lp-bg-paper" id="why">
        <div className="lp-section-inner" style={{ textAlign:'center' }}>
          <div className="lp-section-eyebrow">WHY ARTHAVI</div>
          <h2 className="lp-h2">Built Specifically<br/>for India</h2>
          <p className="lp-section-sub">Not a global product retrofitted for India — built ground-up for the Indian education system.</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:20, maxWidth:900, margin:'40px auto 0', textAlign:'left' }}>
            {[
              { icon:'🇮🇳', text:'Covers CBSE, ICSE &amp; all 35+ State Boards with official NCERT &amp; government textbook content' },
              { icon:'🧠', text:'Powered by advanced AI (GPT-4o level intelligence) — not basic rule-based chatbots' },
              { icon:'🎓', text:'Designed specifically for Indian K-12 exam patterns, board structures, and student needs' },
              { icon:'👨‍👩‍👧', text:'Works for students, parents, and schools together — each with their own dashboard &amp; tools' },
            ].map((item, i) => (
              <div key={i} className="lp-fade" style={{ background:'#fff', borderRadius:16, padding:'24px 20px', boxShadow:'0 2px 12px rgba(0,0,0,.06)', display:'flex', gap:16, alignItems:'flex-start' }}>
                <span style={{ fontSize:28, flexShrink:0 }}>{item.icon}</span>
                <p style={{ margin:0, color:'#374151', fontSize:14, lineHeight:1.75, fontWeight:500 }} dangerouslySetInnerHTML={{ __html: item.text }} />
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
            {td('steps').map((s, i) => (
              <div key={s.n} className="lp-step lp-fade" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="lp-step-num">{s.n}</div>
                <div className="lp-step-title">{s.title}</div>
                <p className="lp-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DemoSection onRegister={() => openModal('register')} />

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
          <h2 className="lp-cta-heading">Start Your Free 30-Day School Pilot</h2>
          <p className="lp-cta-sub">No cost. No commitment. See results in weeks — less evaluation time, better student performance, full parent visibility.</p>
          <div className="lp-cta-btns">
            <button className="lp-btn-primary lp-btn-xl" onClick={() => openModal('register', 'school_admin')}>
              🏫 Start Free School Pilot
            </button>
            <button className="lp-btn-ghost lp-btn-xl" style={{ color:'#fff', borderColor:'rgba(255,255,255,.4)' }}
              onClick={() => openModal('register', 'student')}>
              🎒 Start as Student →
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
                <Logo size={52} full={true} dark={true} />
              </div>
              <p style={{ fontSize:13, lineHeight:1.75, color:'rgba(255,255,255,.45)', maxWidth:260 }}>
                Arthavi is an AI-powered education platform helping students learn smarter through technology, courses, notes, and AI tools.
              </p>
              <p style={{ fontSize:12, color:'rgba(255,255,255,.35)', marginTop:10 }}>📍 Odisha, India</p>
            </div>
            {[
              { heading: 'Platform', links: ['For Schools','For Teachers','For Students','For Parents'] },
              { heading: 'Features', links: ['AI Summaries','Flashcards','Question Papers','Evaluation','Audio Lessons'] },
              { heading: 'Legal',    links: ['Privacy Policy','Terms & Conditions','Refund Policy','Disclaimer','Contact'] },
            ].map(col => (
              <div key={col.heading} className="lp-footer-col">
                <h4>{col.heading}</h4>
                <ul>{col.links.map(l => <li key={l}><a href="#">{l}</a></li>)}</ul>
              </div>
            ))}
          </div>
          <div className="lp-footer-bottom">
            <p>© 2026 Arthavi. All rights reserved. Smart Learning with AI.</p>
            <p>hello@arthavi.in</p>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setPendingPlan(null) }}
        defaultForm={modalForm}
        defaultRole={modalRole}
        onSuccess={() => {
          if (pendingPlan) {
            sessionStorage.setItem('arthavi_pending_plan', JSON.stringify(pendingPlan))
          }
          setPendingPlan(null)
          setModalOpen(false)
        }}
      />

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
          background:#F4F0FF;
          backdrop-filter:blur(18px);
          border-bottom:1px solid rgba(107,82,176,.12);
          transition:background .25s, border-color .25s, box-shadow .25s;
        }
        .lp-nav-scrolled {
          background:#F4F0FF;
          border-color:rgba(107,82,176,.2);
          box-shadow:0 2px 12px rgba(107,82,176,.1);
        }
        .lp-nav-brand { display:flex; align-items:center; gap:10px; text-decoration:none; flex-shrink:0; }
        .lp-brand-name { font-family:var(--sans); font-size:18px; font-weight:800; color:#1B1A3E; line-height:1.1; }
        .lp-brand-sub  { font-size:10px; color:#6B6B6B; letter-spacing:.3px; }
        .lp-nav-links  { display:flex; gap:28px; margin-left:auto; }
        .lp-nav-links a { font-size:14px; font-weight:500; color:#4A3890; text-decoration:none; transition:.15s; }
        .lp-nav-links a:hover { color:#6B52B0; }
        .lp-nav-actions { display:flex; gap:10px; }
        .lp-hamburger { display:none; flex-direction:column; gap:5px; background:none; border:none; cursor:pointer; padding:6px; margin-left:auto; }
        .lp-hamburger span { display:block; width:24px; height:2px; background:#1B1A3E; border-radius:2px; }

        /* Buttons */
        .lp-btn-primary { padding:10px 22px; background:linear-gradient(135deg,#6B52B0,#4A3890); border:none; border-radius:10px; color:#fff; font-family:var(--sans); font-size:13px; font-weight:700; cursor:pointer; transition:.2s; white-space:nowrap; }
        .lp-btn-primary:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(107,82,176,.4); }
        .lp-btn-ghost { padding:10px 22px; background:transparent; border:1.5px solid #6B52B0; border-radius:10px; color:#4A3890; font-family:var(--sans); font-size:13px; font-weight:600; cursor:pointer; transition:.2s; white-space:nowrap; }
        .lp-btn-ghost:hover { background:rgba(107,82,176,.08); border-color:#4A3890; }
        .lp-btn-xl { padding:14px 32px; font-size:15px; border-radius:12px; }

        /* Mobile menu */
        .lp-mobile-overlay { position:fixed; inset:0; background:rgba(11,31,58,.88); z-index:1000; backdrop-filter:blur(6px); }
        .lp-mobile-drawer { position:absolute; top:0; right:0; width:min(320px,90vw); height:100%; background:#fff; padding:24px; display:flex; flex-direction:column; animation:slideInRight .25s ease; }
        @keyframes slideInRight { from{transform:translateX(100%)} to{transform:none} }
        .lp-mobile-top { display:flex; align-items:center; gap:10px; margin-bottom:32px; }
        .lp-mobile-close { margin-left:auto; background:none; border:none; font-size:22px; cursor:pointer; color:var(--muted,#6B7280); width:36px; height:36px; display:grid; place-items:center; }
        .lp-mobile-links { display:flex; flex-direction:column; gap:6px; flex:1; }
        .lp-mobile-links a { display:block; padding:13px 14px; border-radius:10px; color:var(--text,#1A1A1A); text-decoration:none; font-size:15px; font-weight:600; transition:.15s; }
        .lp-mobile-links a:hover { background:#F0EAFF; color:#6B52B0; }
        .lp-mobile-btns { display:flex; flex-direction:column; gap:10px; padding-top:20px; border-top:1px solid #D4D9E4; }

        /* ── HERO ── */
        .lp-hero { min-height:100vh; display:flex; align-items:center; position:relative; overflow:hidden; padding:90px 40px 60px; gap:60px; background:linear-gradient(135deg, #FFFFFF 0%, #F0EAFF 50%, #EDF0F7 100%); }
        .lp-hero-bg { position:absolute; inset:0; z-index:0; pointer-events:none; }
        .lp-hero-blob { position:absolute; border-radius:50%; filter:blur(80px); }
        .lp-hero-blob1 { width:600px; height:600px; right:-150px; top:50%; transform:translateY(-50%); background:radial-gradient(circle,rgba(107,82,176,.22),transparent 70%); }
        .lp-hero-blob2 { width:400px; height:400px; left:-80px; bottom:-60px; background:radial-gradient(circle,rgba(107,82,176,.15),transparent 70%); }
        .lp-hero-grid { position:absolute; inset:0; background-image:linear-gradient(rgba(107,82,176,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(107,82,176,.05) 1px,transparent 1px); background-size:52px 52px; }
        .lp-hero-inner { position:relative; z-index:1; flex:1; max-width:600px; }
        .lp-hero-badge { display:inline-flex; align-items:center; gap:8px; background:linear-gradient(135deg,#F0EAFF,#EDF0F7); border:1px solid rgba(107,82,176,.3); border-radius:50px; padding:7px 18px; font-size:12px; font-weight:700; color:#6B52B0; margin-bottom:28px; letter-spacing:.3px; text-transform:uppercase; }
        .lp-badge-dot { width:7px; height:7px; border-radius:50%; background:#6B52B0; animation:pd 2s infinite; flex-shrink:0; }
        .lp-h1 { font-family:var(--serif,serif); font-size:clamp(34px,4.2vw,62px); line-height:1.1; color:#1A1A1A; margin-bottom:20px; letter-spacing:-0.5px; }
        .lp-hero-chips { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:22px; }
        .lp-chip { display:inline-flex; align-items:center; gap:6px; padding:6px 14px; background:#fff; border:1.5px solid rgba(107,82,176,.2); border-radius:50px; font-size:12px; font-weight:600; color:#4A3890; white-space:nowrap; box-shadow:0 1px 4px rgba(107,82,176,.08); }
        .lp-gradient-text { background:linear-gradient(135deg,#6B52B0,#4A3890); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; font-style:italic; }
        .lp-hero-sub { font-size:clamp(15px,1.8vw,19px); color:#6B7280; line-height:1.75; margin-bottom:36px; max-width:520px; }
        .lp-hero-ctas { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:52px; }
        .lp-btn-hero-primary { padding:14px 32px; background:linear-gradient(135deg,#6B52B0,#4A3890); border:none; border-radius:12px; color:#fff; font-family:var(--sans); font-size:15px; font-weight:700; cursor:pointer; transition:.2s; box-shadow:0 4px 18px rgba(107,82,176,.4); }
        .lp-btn-hero-primary:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(107,82,176,.5); }
        .lp-btn-hero-sec { padding:14px 28px; background:transparent; border:1.5px solid #D4D9E4; border-radius:12px; color:#1A1A1A; font-family:var(--sans); font-size:15px; font-weight:600; cursor:pointer; transition:.2s; }
        .lp-btn-hero-sec:hover { background:#F0EAFF; border-color:#4A3890; }
        .lp-btn-try-demo { padding:14px 28px; background:linear-gradient(135deg,#F59E0B,#D97706); border:none; border-radius:12px; color:#fff; font-family:var(--sans); font-size:15px; font-weight:700; cursor:pointer; transition:.2s; text-decoration:none; display:inline-flex; align-items:center; box-shadow:0 4px 18px rgba(245,158,11,.35); }
        .lp-btn-try-demo:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(245,158,11,.5); }

        /* For Students / For Parents quick-wins section */
        .lp-qw-section { background:linear-gradient(160deg,#1B3A6B 0%,#0F2348 100%); padding:70px 0 60px; }
        .lp-qw-pain { text-align:center; color:rgba(255,255,255,.8); font-size:clamp(16px,2vw,22px); font-weight:600; margin-bottom:8px; }
        .lp-qw-hook { text-align:center; color:#fff; font-size:clamp(20px,2.5vw,28px); font-weight:800; margin-bottom:40px; }
        .lp-qw-hook strong { color:#F59E0B; }
        .lp-qw-highlight { color:#F59E0B; font-style:italic; text-decoration:underline; text-underline-offset:4px; }
        .lp-qw-cols { display:grid; grid-template-columns:1fr 1fr; gap:24px; max-width:860px; margin:0 auto 36px; }
        .lp-qw-card { background:var(--qw-bg); border:2.5px solid var(--qw-accent); border-radius:18px; padding:28px; }
        .lp-qw-card-title { font-size:17px; font-weight:800; color:var(--qw-accent); margin-bottom:14px; }
        .lp-qw-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:9px; }
        .lp-qw-list li { font-size:14px; font-weight:600; color:#1E293B; line-height:1.5; }
        .lp-qw-features { display:flex; gap:16px; flex-wrap:wrap; justify-content:center; margin:0 auto 32px; max-width:900px; }
        .lp-qw-feature-item { display:flex; flex-direction:column; align-items:center; gap:6px; background:rgba(255,255,255,.1); border-radius:12px; padding:14px 18px; min-width:110px; color:#fff; font-size:12px; font-weight:600; text-align:center; }
        .lp-qw-feature-icon { font-size:28px; }
        .lp-qw-cta-row { display:flex; flex-direction:column; align-items:center; gap:12px; margin-bottom:32px; }
        .lp-btn-try-free { display:inline-block; background:linear-gradient(135deg,#DC2626,#B91C1C); color:#fff; font-size:clamp(16px,2vw,22px); font-weight:900; padding:16px 48px; border-radius:50px; text-decoration:none; letter-spacing:.5px; box-shadow:0 6px 28px rgba(220,38,38,.45); transition:.2s; }
        .lp-btn-try-free:hover { transform:translateY(-3px); box-shadow:0 12px 40px rgba(220,38,38,.6); }
        .lp-qw-badge { color:rgba(255,255,255,.7); font-size:13px; font-weight:500; }
        .lp-results-row { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; max-width:860px; margin:0 auto 28px; }
        .lp-result-card { background:var(--rc-bg); border-radius:14px; padding:18px 20px; font-size:16px; font-weight:700; color:#1E293B; text-align:center; border:2px solid rgba(0,0,0,.07); }
        .lp-result-card strong { color:#6B52B0; }
        .lp-stats { display:flex; gap:40px; flex-wrap:wrap; }
        .lp-stat-num { font-family:var(--serif,serif); font-size:clamp(28px,3.5vw,38px); color:#6B52B0; line-height:1; }
        .lp-stat-label { font-size:12px; color:#6B7280; margin-top:4px; font-weight:500; }

        /* Hero mockup */
        .lp-hero-mockup { position:relative; z-index:1; flex-shrink:0; width:360px; display:none; }
        .lp-mockup-card { background:#fff; border-radius:20px; padding:22px; border:1px solid #D4D9E4; box-shadow:0 20px 60px rgba(107,82,176,.14),0 4px 16px rgba(107,82,176,.08); }
        .lp-mockup-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid #F0EAFF; }
        .lp-mockup-subject { font-size:13px; font-weight:700; color:#1B1A3E; margin-bottom:12px; }
        .lp-mockup-tools { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px; }
        .lp-mockup-tool { padding:5px 10px; background:#F0EAFF; border-radius:50px; font-size:11px; font-weight:600; color:#6B52B0; border:1px solid #D4D9E4; }
        .lp-mockup-summary { display:flex; flex-direction:column; gap:8px; }
        .lp-mockup-point { display:flex; gap:10px; align-items:flex-start; font-size:12px; color:#1A1A1A; line-height:1.55; }
        .lp-mockup-point span { width:20px; height:20px; border-radius:50%; background:linear-gradient(135deg,#6B52B0,#4A3890); color:#fff; display:grid; place-items:center; font-size:10px; font-weight:800; flex-shrink:0; }
        .lp-mockup-point-muted { opacity:.5; }

        /* ── TRUST BAR ── */
        .lp-trust-bar { background:linear-gradient(135deg,#1B1A3E,#6B52B0,#2A2858); padding:16px 40px; display:flex; gap:32px; justify-content:center; flex-wrap:wrap; overflow:hidden; }
        .lp-trust-item { display:flex; align-items:center; gap:8px; color:rgba(255,255,255,.85); font-size:13px; font-weight:500; white-space:nowrap; }

        /* ── SECTIONS ── */
        .lp-section { padding:96px 40px; }
        .lp-section-inner { max-width:1200px; margin:0 auto; }
        .lp-bg-cream  { background:#FFFFFF; }
        .lp-bg-white  { background:#fff; }
        .lp-bg-paper  { background:#EDF0F7; }
        .lp-section-eyebrow { display:inline-block; font-size:11px; font-weight:800; letter-spacing:1.2px; color:#6B52B0; text-transform:uppercase; margin-bottom:12px; }
        .lp-eyebrow-light { color:rgba(255,255,255,.7); }
        .lp-h2 { font-family:var(--serif,serif); font-size:clamp(30px,4vw,50px); line-height:1.1; color:#1A1A1A; margin-bottom:16px; }
        .lp-section-sub { font-size:16px; color:#6B7280; line-height:1.75; max-width:540px; margin-bottom:0; }

        /* ── ROLES ── */
        .lp-roles-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:18px; margin-top:48px; }
        .lp-role-card { background:var(--card-color); border-radius:22px; padding:28px; border:1.5px solid transparent; transition:.25s; cursor:default; display:flex; flex-direction:column; }
        .lp-role-card:hover { transform:translateY(-4px); box-shadow:0 12px 40px rgba(107,82,176,.14); border-color:var(--card-accent); }
        .lp-role-emoji { font-size:38px; margin-bottom:14px; }
        .lp-role-name  { font-family:var(--serif,serif); font-size:21px; color:#1A1A1A; margin-bottom:14px; }
        .lp-role-features { list-style:none; display:flex; flex-direction:column; gap:7px; flex:1; margin-bottom:20px; }
        .lp-role-features li { font-size:12.5px; color:#1A1A1A; padding-left:18px; position:relative; line-height:1.5; }
        .lp-role-features li::before { content:'✓'; position:absolute; left:0; color:var(--card-accent,#6B52B0); font-weight:800; }
        .lp-role-cta { padding:10px 20px; background:#1B1A3E; border:none; border-radius:10px; color:#fff; font-family:var(--sans); font-size:13px; font-weight:700; cursor:pointer; transition:.2s; align-self:flex-start; }
        .lp-role-cta:hover { background:#6B52B0; transform:translateY(-1px); }

        /* ── FEATURES ── */
        .lp-features-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:20px; margin-top:48px; }
        .lp-feature-card { background:#fff; border-radius:18px; padding:26px 22px; border:1px solid #D4D9E4; transition:.25s; }
        .lp-feature-card:hover { transform:translateY(-5px); box-shadow:0 14px 40px rgba(107,82,176,.14); }
        .lp-feature-icon { width:52px; height:52px; border-radius:14px; display:grid; place-items:center; font-size:24px; margin-bottom:16px; }
        .lp-feature-name { font-family:var(--serif,serif); font-size:17px; color:#1A1A1A; margin-bottom:8px; }
        .lp-feature-desc { font-size:13px; color:#6B7280; line-height:1.65; }

        /* ── SPECIALIZED PATHS ── */
        .lp-sp-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:24px; margin-top:52px; }
        .lp-sp-card { background:#fff; border-radius:22px; padding:32px; border:1px solid #D4D9E4; display:flex; flex-direction:column; gap:20px; transition:.3s; }
        .lp-sp-card:hover { transform:translateY(-6px); box-shadow:0 20px 50px rgba(107,82,176,.16); }
        .lp-sp-card-header { display:flex; align-items:center; gap:16px; }
        .lp-sp-icon { width:56px; height:56px; border-radius:16px; display:grid; place-items:center; font-size:28px; flex-shrink:0; }
        .lp-sp-entrance .lp-sp-icon { background:linear-gradient(135deg,#EDE9FE,#DDD6FE); }
        .lp-sp-career  .lp-sp-icon { background:linear-gradient(135deg,#DCFCE7,#BBF7D0); }
        .lp-sp-skill   .lp-sp-icon { background:linear-gradient(135deg,#FEF9C3,#FDE68A); }
        .lp-sp-degree  .lp-sp-icon { background:linear-gradient(135deg,#DBEAFE,#BFDBFE); }
        .lp-sp-name { font-family:var(--serif,serif); font-size:20px; color:#1A1A1A; margin-bottom:2px; }
        .lp-sp-tagline { font-size:12px; color:#6B7280; font-weight:600; letter-spacing:.02em; }
        .lp-sp-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px; flex:1; }
        .lp-sp-list li { font-size:13.5px; color:#374151; line-height:1.65; padding-left:22px; position:relative; }
        .lp-sp-list li::before { content:'✓'; position:absolute; left:0; font-weight:800; }
        .lp-sp-entrance .lp-sp-list li::before { color:#6B52B0; }
        .lp-sp-career  .lp-sp-list li::before { color:#16A34A; }
        .lp-sp-skill   .lp-sp-list li::before { color:#D97706; }
        .lp-sp-degree  .lp-sp-list li::before { color:#1D4ED8; }
        .lp-sp-tags { display:flex; gap:8px; flex-wrap:wrap; }
        .lp-sp-tags span { padding:4px 12px; border-radius:100px; font-size:11px; font-weight:700; border:1.5px solid; }
        .lp-sp-entrance .lp-sp-tags span { background:#F0EAFF; color:#6B52B0; border-color:#DDD6FE; }
        .lp-sp-career  .lp-sp-tags span { background:#F0FDF4; color:#15803D; border-color:#BBF7D0; }
        .lp-sp-skill   .lp-sp-tags span { background:#FFFBEB; color:#B45309; border-color:#FDE68A; }
        .lp-sp-degree  .lp-sp-tags span { background:#EFF6FF; color:#1D4ED8; border-color:#BFDBFE; }
        .lp-sp-cta { padding:13px 24px; border:none; border-radius:12px; font-family:var(--sans); font-size:14px; font-weight:700; cursor:pointer; transition:.2s; align-self:flex-start; }
        .lp-sp-cta:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.16); }
        .lp-sp-cta-entrance { background:linear-gradient(135deg,#6B52B0,#4A3890); color:#fff; }
        .lp-sp-cta-career   { background:linear-gradient(135deg,#16A34A,#15803D); color:#fff; }
        .lp-sp-cta-skill    { background:linear-gradient(135deg,#D97706,#B45309); color:#fff; }
        .lp-sp-cta-degree   { background:linear-gradient(135deg,#2563EB,#1D4ED8); color:#fff; }
        @media(max-width:700px){ .lp-sp-grid{ grid-template-columns:1fr; } .lp-sp-card{ padding:24px 20px; } }

        /* ── PRICING ── */
        .lp-pricing-philosophy {
          margin-top: 24px;
          background: #fff;
          border: 1px solid #d4d9e4;
          border-left: 5px solid #6B52B0;
          border-radius: 14px;
          padding: 16px 18px;
          font-size: 14px;
          line-height: 1.7;
          color: #374151;
        }
        .lp-pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
          margin-top: 28px;
        }
        .lp-price-card {
          background: #fff;
          border: 1.5px solid #d4d9e4;
          border-radius: 16px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
          box-shadow: 0 2px 10px rgba(107,82,176,.08);
        }
        .lp-price-card-popular {
          border-color: #6B52B0;
          box-shadow: 0 12px 24px rgba(107,82,176,.18);
        }
        .lp-price-badge {
          position: absolute;
          top: -10px;
          right: 14px;
          background: linear-gradient(135deg,#6B52B0,#4A3890);
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .08em;
          border-radius: 100px;
          padding: 4px 10px;
        }
        .lp-price-card h3 {
          margin: 0;
          font-family: var(--serif, serif);
          font-size: 22px;
          color: #1A1A1A;
          line-height: 1.2;
        }
        .lp-price-main {
          margin: 0;
          font-size: 24px;
          font-weight: 800;
          color: #4A3890;
        }
        .lp-price-usd {
          margin: 0;
          font-size: 12px;
          color: #6B7280;
        }
        .lp-price-note {
          margin: 0;
          font-size: 12px;
          color: #475569;
          font-weight: 600;
        }
        .lp-price-summary {
          margin: 2px 0 6px;
          font-size: 13px;
          line-height: 1.6;
          color: #6B7280;
        }
        .lp-price-list-wrap {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 12px;
        }
        .lp-price-list-excl {
          background: #fff7f7;
          border-color: #fee2e2;
        }
        .lp-price-list-title {
          margin: 0 0 6px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .06em;
          font-weight: 700;
          color: #64748b;
        }
        .lp-price-list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 6px;
        }
        .lp-price-list li {
          font-size: 12.5px;
          color: #334155;
          line-height: 1.45;
        }
        .lp-coaching-calc {
          margin-top: 20px;
          background: linear-gradient(135deg,#fff,#F8F5FF);
          border: 1px solid #d4d9e4;
          border-radius: 16px;
          padding: 18px;
          display: grid;
          grid-template-columns: 1.1fr .9fr .9fr;
          gap: 16px;
          align-items: center;
        }
        .lp-coaching-calc h3 {
          margin: 0;
          font-size: 21px;
          font-family: var(--serif, serif);
          color: #1A1A1A;
        }
        .lp-coaching-calc p {
          margin: 4px 0 0;
          font-size: 13px;
          color: #6B7280;
        }
        .lp-coaching-controls {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .lp-coaching-controls label {
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: .05em;
        }
        .lp-coaching-controls input {
          padding: 10px 12px;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          color: #1A1A1A;
        }
        .lp-coaching-output {
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 12px;
          text-align: center;
        }
        .lp-coaching-output p {
          margin: 0;
          font-size: 12px;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: .06em;
          font-weight: 700;
        }
        .lp-coaching-output strong {
          display: block;
          margin-top: 6px;
          font-size: 20px;
          color: #4A3890;
          line-height: 1.3;
        }

        /* ── HOW ── */
        .lp-how-section { background:linear-gradient(155deg,#1B1A3E 0%,#1B1A3E 50%,#2A2858 100%); position:relative; overflow:hidden; }
        .lp-how-section::before { content:''; position:absolute; inset:0; background:url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='1' fill='rgba(255,255,255,.05)'/%3E%3C/svg%3E"); }
        .lp-steps { display:grid; grid-template-columns:repeat(4,1fr); gap:4px; margin-top:52px; position:relative; }
        .lp-step { background:rgba(255,255,255,.07); border-radius:18px; padding:28px 22px; text-align:center; border:1px solid rgba(255,255,255,.1); transition:.25s; }
        .lp-step:hover { background:rgba(255,255,255,.12); }
        .lp-step-num { font-family:var(--serif,serif); font-size:32px; color:#6B52B0; margin-bottom:14px; display:block; }
        .lp-step-title { font-family:var(--serif,serif); font-size:18px; color:#fff; margin-bottom:10px; }
        .lp-step-desc { font-size:13px; color:rgba(255,255,255,.55); line-height:1.65; }

        /* ── BOARDS ── */
        .lp-boards-wrap { display:flex; gap:10px; flex-wrap:wrap; margin-top:36px; }
        .lp-board-pill { padding:10px 22px; border-radius:50px; background:#fff; border:1.5px solid #D4D9E4; font-size:13px; font-weight:600; color:#1A1A1A; transition:.2s; cursor:default; }
        .lp-board-pill:hover { border-color:#6B52B0; color:#6B52B0; background:#F0EAFF; }

        /* ── TESTIMONIALS ── */
        .lp-testi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-top:48px; }
        .lp-testi-card { background:#EDF0F7; border-radius:20px; padding:28px; border:1px solid #D4D9E4; transition:.25s; }
        .lp-testi-card:hover { transform:translateY(-3px); box-shadow:0 12px 40px rgba(107,82,176,.14); }
        .lp-stars { color:#6B52B0; font-size:15px; margin-bottom:12px; letter-spacing:2px; }
        .lp-testi-quote { font-size:14px; color:#1A1A1A; line-height:1.75; margin-bottom:18px; font-style:italic; }
        .lp-testi-author { display:flex; align-items:center; gap:12px; }
        .lp-testi-av { width:42px; height:42px; border-radius:50%; background:#D4D9E4; display:grid; place-items:center; font-size:20px; flex-shrink:0; }
        .lp-testi-name { font-size:14px; font-weight:700; color:#1A1A1A; }
        .lp-testi-role { font-size:11px; color:#6B7280; margin-top:2px; }

        /* ── CTA BANNER ── */
        .lp-cta-banner { background:linear-gradient(135deg,#1B1A3E,#6B52B0,#2A2858); padding:80px 40px; text-align:center; }
        .lp-cta-inner  { max-width:680px; margin:0 auto; }
        .lp-cta-heading { font-family:var(--serif,serif); font-size:clamp(28px,4vw,44px); color:#fff; margin-bottom:14px; line-height:1.1; }
        .lp-cta-sub { font-size:16px; color:rgba(255,255,255,.8); margin-bottom:36px; line-height:1.65; }
        .lp-cta-btns { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; }

        /* ── FOOTER ── */
        .lp-footer { background:#1B1A3E; padding:64px 40px 32px; }
        .lp-footer-inner { max-width:1200px; margin:0 auto; }
        .lp-footer-top { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:48px; margin-bottom:48px; }
        .lp-footer-brand { }
        .lp-footer-col h4 { font-size:11px; font-weight:800; color:#fff; margin-bottom:16px; text-transform:uppercase; letter-spacing:1px; }
        .lp-footer-col ul { list-style:none; }
        .lp-footer-col ul li { margin-bottom:10px; }
        .lp-footer-col ul li a { font-size:13px; color:rgba(255,255,255,.4); text-decoration:none; transition:.2s; }
        .lp-footer-col ul li a:hover { color:#6B52B0; }
        .lp-footer-bottom { border-top:1px solid rgba(255,255,255,.08); padding-top:24px; display:flex; justify-content:space-between; align-items:center; font-size:12px; color:rgba(255,255,255,.35); flex-wrap:wrap; gap:8px; }

        /* ── DEMO SECTION ── */
        .lp-demo-section { background: linear-gradient(160deg,#0F0D2A 0%,#1B1245 50%,#0F0D2A 100%); padding:100px 0; }
        .lp-demo-section .lp-h2 { color:#fff; }
        .lp-demo-section .lp-section-sub { color:rgba(255,255,255,.65); max-width:560px; }
        .lp-demo-live-badge { display:inline-flex; align-items:center; gap:8px; background:rgba(107,82,176,.25); border:1px solid rgba(107,82,176,.5); color:#A78BFA; border-radius:100px; padding:6px 16px; font-size:13px; font-weight:600; }
        .lp-badge-dot { width:8px; height:8px; border-radius:50%; background:#22C55E; animation:lp-pulse 2s infinite; }
        @keyframes lp-pulse { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(34,197,94,.4)} 50%{opacity:.8;box-shadow:0 0 0 6px rgba(34,197,94,0)} }

        .lp-demo-tabs { display:flex; gap:12px; margin-bottom:24px; flex-wrap:wrap; }
        .lp-demo-tab { display:flex; align-items:center; gap:10px; padding:12px 20px; border-radius:12px; border:1.5px solid rgba(107,82,176,.3); background:rgba(255,255,255,.04); color:rgba(255,255,255,.6); font-size:14px; font-weight:500; cursor:pointer; transition:.2s; white-space:nowrap; }
        .lp-demo-tab:hover { border-color:rgba(107,82,176,.7); color:#fff; background:rgba(107,82,176,.12); }
        .lp-dt-active { border-color:#6B52B0 !important; background:linear-gradient(135deg,#6B52B0,#4A3890) !important; color:#fff !important; box-shadow:0 4px 20px rgba(107,82,176,.4); }
        .lp-dt-used { border-color:rgba(34,197,94,.5) !important; }
        .lp-demo-tab-icon { font-size:18px; }
        .lp-demo-tab-label { flex:1; }
        .lp-demo-tab-check { width:20px; height:20px; border-radius:50%; background:#22C55E; color:#fff; font-size:11px; display:flex; align-items:center; justify-content:center; font-weight:700; }

        .lp-demo-box { background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,.35); min-height:440px; }
        .lp-demo-panel { padding:32px; }
        .lp-demo-panel-chat { padding:0; display:flex; flex-direction:column; }
        .lp-demo-panel-hdr { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; gap:16px; }
        .lp-demo-panel-title { font-size:18px; font-weight:700; color:#1B1A3E; }
        .lp-demo-panel-hint { font-size:13px; color:#6B7280; margin-top:4px; }
        .lp-demo-badge-free { background:#FEF3C7; color:#92400E; border:1px solid #FCD34D; border-radius:100px; padding:4px 12px; font-size:12px; font-weight:600; white-space:nowrap; }
        .lp-demo-badge-used { background:#D1FAE5; color:#065F46; border:1px solid #6EE7B7; border-radius:100px; padding:4px 12px; font-size:12px; font-weight:600; white-space:nowrap; }

        .lp-demo-selectors { display:flex; gap:12px; margin-bottom:24px; flex-wrap:wrap; }
        .lp-demo-select { flex:1; min-width:140px; padding:10px 14px; border:1.5px solid #E5E7EB; border-radius:10px; font-size:14px; color:#374151; background:#fff; cursor:pointer; transition:.2s; }
        .lp-demo-select:focus { outline:none; border-color:#6B52B0; box-shadow:0 0 0 3px rgba(107,82,176,.1); }
        .lp-demo-select:disabled { background:#F9FAFB; color:#9CA3AF; cursor:not-allowed; }

        .lp-demo-empty { text-align:center; padding:48px 24px; color:#9CA3AF; }
        .lp-demo-empty-icon { font-size:48px; margin-bottom:16px; }
        .lp-demo-empty p { font-size:14px; max-width:360px; margin:0 auto; }

        .lp-demo-chapter-row { background:#F8F5FF; border-radius:14px; padding:20px; display:flex; gap:20px; flex-direction:column; }
        .lp-demo-chapter-info-box { flex:1; }
        .lp-demo-tag-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px; }
        .lp-demo-tag { background:#EDE9FE; color:#6B52B0; border-radius:100px; padding:4px 10px; font-size:12px; font-weight:600; }
        .lp-demo-chapter-name { font-size:16px; font-weight:700; color:#1B1A3E; margin-bottom:4px; }
        .lp-demo-chapter-sub { font-size:13px; color:#6B7280; }
        .lp-demo-tool-btns { display:flex; gap:10px; flex-wrap:wrap; }
        .lp-demo-tool-btn { display:flex; align-items:center; gap:12px; padding:12px 16px; background:#fff; border:1.5px solid #E5E7EB; border-radius:12px; cursor:pointer; transition:.2s; flex:1; min-width:140px; }
        .lp-demo-tool-btn:hover { border-color:#6B52B0; background:#F8F5FF; transform:translateY(-2px); box-shadow:0 4px 12px rgba(107,82,176,.15); }
        .lp-demo-tool-icon { font-size:24px; }
        .lp-demo-tool-label { font-size:13px; font-weight:600; color:#1B1A3E; }
        .lp-demo-tool-desc { font-size:12px; color:#6B7280; }

        .lp-demo-loading { display:flex; align-items:center; gap:16px; padding:32px 24px; color:#6B7280; }
        .lp-demo-spinner { width:28px; height:28px; border:3px solid #EDE9FE; border-top-color:#6B52B0; border-radius:50%; animation:lp-spin .8s linear infinite; flex-shrink:0; }
        .lp-demo-spinner-sm { width:14px; height:14px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:lp-spin .8s linear infinite; display:inline-block; vertical-align:middle; margin-right:8px; }
        @keyframes lp-spin { to{transform:rotate(360deg)} }

        .lp-demo-result-box { background:#F8F5FF; border-radius:14px; padding:24px; border:1px solid #EDE9FE; }
        .lp-demo-result-title { font-size:15px; font-weight:700; color:#1B1A3E; margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid #EDE9FE; }
        .lp-demo-summary-list { list-style:none; padding:0; margin:0 0 16px; display:flex; flex-direction:column; gap:10px; }
        .lp-demo-summary-list li { display:flex; gap:12px; align-items:flex-start; }
        .lp-demo-summary-list li span { width:24px; height:24px; border-radius:50%; background:linear-gradient(135deg,#6B52B0,#4A3890); color:#fff; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }
        .lp-demo-summary-list li p { margin:0; font-size:14px; color:#374151; line-height:1.6; }

        .lp-demo-fc-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; margin-bottom:16px; }
        .lp-demo-fc { perspective:800px; min-height:140px; cursor:pointer; }
        .lp-demo-fc-inner { width:100%; height:100%; min-height:140px; position:relative; transform-style:preserve-3d; transition:transform .5s ease; border-radius:12px; }
        .lp-fc-flipped .lp-demo-fc-inner { transform:rotateY(180deg); }
        .lp-demo-fc-front, .lp-demo-fc-back { position:absolute; inset:0; border-radius:12px; backface-visibility:hidden; padding:16px; display:flex; flex-direction:column; gap:8px; }
        .lp-demo-fc-front { background:#fff; border:1.5px solid #E5E7EB; }
        .lp-demo-fc-back { background:linear-gradient(135deg,#6B52B0,#4A3890); color:#fff; transform:rotateY(180deg); border:none; }
        .lp-demo-fc-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; opacity:.6; }
        .lp-demo-fc-front .lp-demo-fc-label { color:#6B52B0; }
        .lp-demo-fc-front p, .lp-demo-fc-back p { font-size:13px; line-height:1.5; flex:1; margin:0; color:inherit; }
        .lp-demo-fc-back p { color:rgba(255,255,255,.9); }
        .lp-demo-fc-hint { font-size:11px; opacity:.5; text-align:right; }

        .lp-demo-mcq-q { font-size:15px; font-weight:600; color:#1B1A3E; margin-bottom:16px; }
        .lp-demo-mcq-opts { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
        .lp-demo-mcq-opt { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px; border:1.5px solid #E5E7EB; font-size:14px; color:#374151; }
        .lp-demo-mcq-opt span:first-child { width:24px; height:24px; border-radius:50%; background:#F3F4F6; font-size:12px; font-weight:700; color:#374151; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .lp-mcq-correct { background:#F0FDF4; border-color:#22C55E; color:#166534; }
        .lp-mcq-correct span:first-child { background:#22C55E; color:#fff; }
        .lp-mcq-tick { margin-left:auto; color:#22C55E; font-weight:700; }
        .lp-demo-expl { background:#FFFBEB; border:1px solid #FCD34D; border-radius:10px; padding:12px 16px; font-size:13px; color:#78350F; line-height:1.6; }

        .lp-demo-practice-card { background:#F8F5FF; border-radius:14px; padding:24px; border:1px solid #EDE9FE; }
        .lp-demo-practice-meta { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; align-items:center; font-size:12px; color:#6B7280; }
        .lp-demo-type-pill { background:#EDE9FE; color:#6B52B0; border-radius:100px; padding:3px 10px; font-weight:600; }
        .lp-demo-practice-q { font-size:16px; font-weight:600; color:#1B1A3E; margin-bottom:20px; }
        .lp-demo-practice-opts { display:flex; flex-direction:column; gap:10px; margin-bottom:20px; }
        .lp-demo-pr-opt { display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:12px; border:1.5px solid #E5E7EB; background:#fff; cursor:pointer; transition:.2s; font-size:14px; color:#374151; }
        .lp-demo-pr-opt:hover { border-color:#6B52B0; background:#F8F5FF; }
        .lp-pr-selected { border-color:#6B52B0 !important; background:#F8F5FF !important; }
        .lp-pr-correct  { border-color:#22C55E !important; background:#F0FDF4 !important; color:#166534 !important; }
        .lp-pr-wrong    { border-color:#EF4444 !important; background:#FEF2F2 !important; color:#991B1B !important; }
        .lp-demo-pr-letter { width:28px; height:28px; border-radius:50%; background:#F3F4F6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .lp-pr-icon { margin-left:auto; font-weight:700; }
        .lp-pr-check { color:#22C55E; }
        .lp-pr-cross  { color:#EF4444; }
        .lp-demo-submit-btn { width:100%; padding:14px; background:linear-gradient(135deg,#6B52B0,#4A3890); color:#fff; border:none; border-radius:12px; font-size:15px; font-weight:700; cursor:pointer; transition:.2s; }
        .lp-demo-submit-btn:disabled { opacity:.5; cursor:not-allowed; }
        .lp-demo-submit-btn:not(:disabled):hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(107,82,176,.4); }
        .lp-demo-pr-feedback { display:flex; flex-direction:column; gap:12px; }
        .lp-demo-pr-verdict { padding:12px 16px; border-radius:10px; font-weight:700; font-size:15px; }
        .lp-verdict-ok { background:#F0FDF4; color:#166534; }
        .lp-verdict-no { background:#FEF2F2; color:#991B1B; }

        .lp-demo-chat-wrap { display:flex; flex-direction:column; height:460px; }
        .lp-demo-chat-msgs { flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:16px; }
        .lp-demo-msg { display:flex; gap:10px; align-items:flex-start; }
        .lp-demo-msg-user { flex-direction:row-reverse; }
        .lp-demo-vidya-av { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,#6B52B0,#4A3890); color:#fff; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .lp-demo-msg-bubble { background:#F3F4F6; border-radius:14px; padding:12px 16px; max-width:78%; }
        .lp-demo-msg-bubble p { margin:0 0 4px; font-size:13px; color:#374151; line-height:1.6; }
        .lp-demo-msg-bubble p:last-child { margin-bottom:0; }
        .lp-demo-msg-ai .lp-demo-msg-bubble { background:#F8F5FF; border:1px solid #EDE9FE; }
        .lp-demo-msg-user .lp-demo-msg-bubble { background:#6B52B0; }
        .lp-demo-msg-user .lp-demo-msg-bubble p { color:#fff; }
        .lp-demo-typing span { display:inline-block; width:6px; height:6px; background:#6B52B0; border-radius:50%; animation:lp-bounce 1s ease infinite; margin:0 2px; }
        .lp-demo-typing span:nth-child(2){animation-delay:.15s}
        .lp-demo-typing span:nth-child(3){animation-delay:.3s}
        @keyframes lp-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        .lp-demo-chat-bar { display:flex; gap:8px; padding:12px 16px; border-top:1px solid #F0EAFF; }
        .lp-demo-chat-inp { flex:1; padding:10px 14px; border:1.5px solid #E5E7EB; border-radius:10px; font-size:14px; color:#374151; }
        .lp-demo-chat-inp:focus { outline:none; border-color:#6B52B0; }
        .lp-demo-chat-inp:disabled { background:#F9FAFB; cursor:not-allowed; }
        .lp-demo-chat-send { width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg,#6B52B0,#4A3890); color:#fff; border:none; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; transition:.2s; flex-shrink:0; }
        .lp-demo-chat-send:disabled { opacity:.4; cursor:not-allowed; }
        .lp-demo-chat-note { font-size:12px; color:#9CA3AF; text-align:center; padding:8px 16px; margin:0; border-top:1px solid #F0EAFF; }

        .lp-demo-qm-wrap { display:flex; flex-direction:column; gap:20px; }
        .lp-demo-qm-config { display:grid; grid-template-columns:1fr 1fr; gap:8px; background:#F8F5FF; border-radius:12px; padding:16px; border:1px solid #EDE9FE; }
        .lp-demo-qm-cfg-row { display:flex; justify-content:space-between; align-items:center; padding:6px 8px; background:#fff; border-radius:8px; font-size:13px; }
        .lp-demo-qm-cfg-row span { color:#6B7280; }
        .lp-demo-qm-cfg-row strong { color:#1B1A3E; }
        .lp-demo-gen-btn { padding:14px; background:linear-gradient(135deg,#6B52B0,#4A3890); color:#fff; border:none; border-radius:12px; font-size:15px; font-weight:700; cursor:pointer; transition:.2s; display:flex; align-items:center; justify-content:center; gap:8px; }
        .lp-demo-gen-btn:disabled { opacity:.7; cursor:not-allowed; }
        .lp-demo-gen-btn:not(:disabled):hover { transform:translateY(-2px); box-shadow:0 6px 24px rgba(107,82,176,.45); }
        .lp-demo-paper { background:#F8F5FF; border-radius:14px; padding:20px; border:1px solid #EDE9FE; }
        .lp-demo-paper-hdr { display:flex; justify-content:space-between; align-items:center; padding-bottom:14px; border-bottom:1px solid #EDE9FE; margin-bottom:16px; font-size:13px; color:#374151; flex-wrap:wrap; gap:8px; }
        .lp-demo-paper-hdr strong { color:#1B1A3E; font-size:14px; }
        .lp-demo-paper-q { background:#fff; border-radius:10px; padding:14px 16px; margin-bottom:10px; border:1px solid #E5E7EB; }
        .lp-demo-paper-q-hdr { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
        .lp-demo-paper-qnum { font-size:14px; font-weight:800; color:#6B52B0; }
        .lp-demo-paper-qtype { background:#EDE9FE; color:#6B52B0; border-radius:100px; padding:2px 10px; font-size:11px; font-weight:600; }
        .lp-demo-paper-qtext { font-size:14px; color:#1B1A3E; margin:0 0 8px; }
        .lp-demo-paper-opts { font-size:13px; color:#4B5563; margin-bottom:8px; }
        .lp-demo-paper-ans { font-size:12px; font-weight:600; color:#059669; background:#F0FDF4; border-radius:8px; padding:6px 10px; }

        .lp-demo-nudge { font-size:13px; color:#6B7280; }
        .lp-demo-nudge button { background:none; border:none; color:#6B52B0; font-weight:700; cursor:pointer; font-size:13px; }
        .lp-demo-nudge button:hover { text-decoration:underline; }

        .lp-demo-cta-row { margin-top:40px; display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,.06); border:1px solid rgba(107,82,176,.3); border-radius:16px; padding:24px 32px; gap:20px; flex-wrap:wrap; }
        .lp-demo-cta-text { display:flex; flex-direction:column; gap:4px; }
        .lp-demo-cta-text strong { font-size:17px; font-weight:700; color:#fff; }
        .lp-demo-cta-text span { font-size:14px; color:rgba(255,255,255,.6); }

        .lp-demo-gate-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(4px); z-index:9000; display:flex; align-items:center; justify-content:center; padding:20px; }
        .lp-demo-gate-modal { background:#fff; border-radius:20px; padding:40px; max-width:480px; width:100%; position:relative; animation:lp-modal-in .25s ease; }
        @keyframes lp-modal-in { from{opacity:0;transform:scale(.92) translateY(20px)} to{opacity:1;transform:none} }
        .lp-demo-gate-close { position:absolute; top:16px; right:16px; background:#F3F4F6; border:none; border-radius:50%; width:32px; height:32px; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; color:#374151; transition:.15s; }
        .lp-demo-gate-close:hover { background:#E5E7EB; }
        .lp-demo-gate-ico { font-size:48px; text-align:center; margin-bottom:16px; }
        .lp-demo-gate-title { font-size:20px; font-weight:800; color:#1B1A3E; text-align:center; margin-bottom:8px; }
        .lp-demo-gate-sub { font-size:14px; color:#4B5563; text-align:center; line-height:1.7; margin-bottom:24px; }
        .lp-demo-gate-feats { display:flex; flex-direction:column; gap:8px; margin-bottom:24px; background:#F8F5FF; border-radius:12px; padding:16px; }
        .lp-demo-gate-feat { display:flex; align-items:center; gap:10px; font-size:14px; color:#374151; }
        .lp-demo-gate-feat span { width:20px; height:20px; border-radius:50%; background:#6B52B0; color:#fff; font-size:11px; display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0; }
        .lp-demo-gate-btns { display:flex; flex-direction:column; gap:10px; margin-bottom:16px; }
        .lp-demo-gate-note { font-size:12px; color:#9CA3AF; text-align:center; }

        @media(max-width:900px){ .lp-demo-tabs{ flex-direction:row; overflow-x:auto; flex-wrap:nowrap; padding-bottom:4px; -webkit-overflow-scrolling:touch; scrollbar-width:none; } .lp-demo-tabs::-webkit-scrollbar{ display:none; } .lp-demo-tab{ flex-shrink:0; justify-content:flex-start; } .lp-demo-cta-row{ flex-direction:column; align-items:flex-start; } }
        @media(max-width:600px){ .lp-demo-box{ border-radius:14px; } .lp-demo-panel{ padding:20px; } .lp-demo-fc-grid{ grid-template-columns:1fr; } .lp-demo-qm-config{ grid-template-columns:1fr; } .lp-demo-gate-modal{ padding:28px 20px; } }

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
          .lp-coaching-calc { grid-template-columns: 1fr; }
        }
        @media(max-width:600px) {
          .lp-hero { padding:82px 16px 48px; }
          .lp-roles-grid { grid-template-columns:1fr; }
          .lp-features-grid { grid-template-columns:1fr 1fr; }
          .lp-steps { grid-template-columns:1fr; }
          .lp-footer-top { grid-template-columns:1fr; gap:28px; }
          .lp-hero-ctas { flex-direction:column; }
          .lp-btn-hero-primary, .lp-btn-hero-sec, .lp-btn-try-demo { width:100%; text-align:center; justify-content:center; }
          .lp-cta-btns { flex-direction:column; align-items:center; }
          .lp-section { padding:52px 16px; }
          .lp-trust-bar { justify-content:flex-start; }
          .lp-qw-cols { grid-template-columns:1fr; }
          .lp-results-row { grid-template-columns:1fr; }
          .lp-btn-try-free { padding:14px 32px; font-size:16px; }
          .lp-pricing-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
