/**
 * CareerPathPanel.jsx — Arthavi Admin Module
 * Career Compass — India's comprehensive student career guidance hub.
 *
 * Features:
 *  - 5 major career sectors with govt & private paths
 *  - Free study material links (official govt + top sites)
 *  - Built-in Q&A practice per career path (MCQ coaching-style)
 *  - Exam calendar & eligibility details
 *  - Progress tracking via localStorage
 *  - Fully responsive, branded design
 */
import { useState, useMemo, useCallback } from 'react'

// ── Brand palette ──────────────────────────────────────────────────────────────
const C = {
  indigo:   '#6d28d9', indigoD: '#4338ca', indigoL: '#8b5cf6', indigoBg: '#eef2ff',
  green:    '#16a34a', greenBg: '#f0fdf4',
  amber:    '#d97706', amberBg: '#fffbeb',
  red:      '#dc2626', redBg:   '#fef2f2',
  blue:     '#2563eb', blueBg:  '#eff6ff',
  teal:     '#0d9488', tealBg:  '#f0fdfa',
  rose:     '#e11d48', roseBg:  '#fff1f2',
  orange:   '#ea580c', orangeBg:'#fff7ed',
  purple:   '#9333ea', purpleBg:'#f3e8ff',
  slate:    '#64748b', border:  '#e2e8f0', panel: '#f1f5f9',
}

// ── Sector definitions ─────────────────────────────────────────────────────────
const SECTORS = [
  { id: 'all',      label: 'All Sectors',   icon: '🌐', color: C.indigo,  bg: C.indigoBg  },
  { id: 'civil',    label: 'Civil Services',icon: '🏛️', color: C.blue,   bg: C.blueBg    },
  { id: 'defence',  label: 'Defence & Police',icon:'🎖️',color: C.red,    bg: C.redBg     },
  { id: 'railway',  label: 'Railways',      icon: '🚆', color: C.orange,  bg: C.orangeBg  },
  { id: 'banking',  label: 'Banking & PSU', icon: '🏦', color: C.green,   bg: C.greenBg   },
  { id: 'science',  label: 'Science & Research',icon:'🔬',color:C.teal,   bg: C.tealBg    },
  { id: 'teaching', label: 'Teaching',      icon: '📚', color: C.purple,  bg: C.purpleBg  },
  { id: 'private',  label: 'Private Sector',icon: '💼', color: C.amber,   bg: C.amberBg   },
  { id: 'state',    label: 'State Govt Jobs',icon:'🏢', color: C.rose,    bg: C.roseBg    },
  { id: 'parallel', label: 'While Studying', icon:'🎓', color: C.indigo,  bg: C.indigoBg  },
]

// ── Career Path Database ───────────────────────────────────────────────────────
const CAREERS = [
  // ── CIVIL SERVICES ──────────────────────────────────────────────────────────
  {
    id: 'ias',
    sector: 'civil',
    title: 'IAS / IPS / IFS (UPSC CSE)',
    icon: '🏛️',
    body: 'Union Public Service Commission Civil Services Exam — India\'s most prestigious exam for Group A & B central government posts.',
    eligibility: 'Graduate in any discipline. Age 21–32 (Gen), 21–35 (OBC), 21–37 (SC/ST).',
    conductedBy: 'UPSC',
    frequency: 'Once a year',
    difficulty: 'Very High',
    salary: '₹56,100 – ₹2,50,000/month',
    timeline: ['Prelims (June)', 'Mains (Sept)', 'Interview (Mar–Apr)', 'Result (May)'],
    materials: [
      { label: 'UPSC Official Syllabus & Notifications', url: 'https://upsc.gov.in' },
      { label: 'NCERT Books (Free PDFs)', url: 'https://ncert.nic.in/textbook.php' },
      { label: 'IGNOU Study Material', url: 'https://egyankosh.ac.in' },
      { label: 'Drishti IAS Free Notes', url: 'https://www.drishtiias.com/study-material' },
      { label: 'Vision IAS Current Affairs (Free)', url: 'https://www.visionias.in/resources/current-affairs-monthly' },
      { label: 'Mrunal Economy Lectures (YouTube)', url: 'https://www.youtube.com/@mrunalorg' },
      { label: 'ClearIAS Free Study Material', url: 'https://www.clearias.com/study-materials/' },
    ],
    tags: ['UPSC', 'IAS', 'IPS', 'IFS', 'CSE', 'Central Govt'],
    featured: true,
  },
  {
    id: 'oas',
    sector: 'civil',
    title: 'OAS / State PSC (Odisha)',
    icon: '🏢',
    body: 'Odisha Administrative Service — state government\'s premier civil services exam for Group A posts via OPSC.',
    eligibility: 'Graduate in any discipline. Age 21–38 (Gen), relaxation for reserved categories.',
    conductedBy: 'OPSC',
    frequency: 'Irregular, usually annual',
    difficulty: 'High',
    salary: '₹44,900 – ₹1,42,400/month',
    timeline: ['Prelims', 'Mains', 'Interview', 'Final Result'],
    materials: [
      { label: 'OPSC Official Site', url: 'https://www.opsc.gov.in' },
      { label: 'NCERT Books', url: 'https://ncert.nic.in/textbook.php' },
      { label: 'Odisha Govt. e-Books (SSEPD)', url: 'https://ssepd.gov.in' },
      { label: 'ClearIAS State PSC Resources', url: 'https://www.clearias.com/state-psc/' },
    ],
    tags: ['OAS', 'OPSC', 'Odisha', 'State PSC'],
    featured: true,
  },
  {
    id: 'upsc-ese',
    sector: 'civil',
    title: 'UPSC Engineering Services (ESE)',
    icon: '⚙️',
    body: 'Engineering Services Examination for central government engineering posts across Civil, Mechanical, Electrical, and Electronics branches.',
    eligibility: 'B.E./B.Tech in relevant engineering branch. Age 21–30.',
    conductedBy: 'UPSC',
    frequency: 'Once a year',
    difficulty: 'High',
    salary: '₹56,100 – ₹1,77,500/month',
    timeline: ['Prelims (Feb)', 'Mains (Jun)', 'Interview', 'Result'],
    materials: [
      { label: 'UPSC ESE Syllabus', url: 'https://upsc.gov.in/examinations/active-examinations/engineering-services-examination' },
      { label: 'Made Easy Free Notes', url: 'https://www.madeeasy.in/study-material/' },
      { label: 'NPTEL Engineering Courses', url: 'https://nptel.ac.in' },
    ],
    tags: ['ESE', 'UPSC', 'Engineering', 'Central Govt'],
  },

  // ── DEFENCE ─────────────────────────────────────────────────────────────────
  {
    id: 'nda',
    sector: 'defence',
    title: 'NDA — National Defence Academy',
    icon: '🎖️',
    body: 'Entry to Army, Navy & Air Force for 10+2 pass students. One of the most respected career paths in India.',
    eligibility: '10+2 pass (PCM for Navy/Air Force). Age 16.5–19.5 years. Male & Female.',
    conductedBy: 'UPSC',
    frequency: 'Twice a year (Apr & Sept exam)',
    difficulty: 'High',
    salary: 'Lt: ₹56,100 – ₹1,77,500/month + allowances',
    timeline: ['Written Exam', 'SSB Interview', 'Medical', 'Merit List', 'Training'],
    materials: [
      { label: 'NDA Official UPSC Page', url: 'https://upsc.gov.in/examinations/active-examinations/nda-na-examination-i' },
      { label: 'NDA Free Practice (Testbook)', url: 'https://testbook.com/nda' },
      { label: 'Adda247 NDA Study Material', url: 'https://www.adda247.com/defence-jobs/nda/' },
      { label: 'NCERT Maths & Science', url: 'https://ncert.nic.in/textbook.php' },
    ],
    tags: ['NDA', 'Army', 'Navy', 'Air Force', 'Defence'],
    featured: true,
  },
  {
    id: 'cds',
    sector: 'defence',
    title: 'CDS — Combined Defence Services',
    icon: '🪖',
    body: 'Entry to IMA, OTA, INA, AFA for graduates. Combined Defence Services Examination via UPSC.',
    eligibility: 'Graduate (IMA/INA/AFA: Engineering for AFA). Age 19–25 years.',
    conductedBy: 'UPSC',
    frequency: 'Twice a year',
    difficulty: 'High',
    salary: '₹56,100 – ₹1,77,500/month + allowances',
    timeline: ['Written Exam', 'SSB Interview', 'Medical', 'Training'],
    materials: [
      { label: 'UPSC CDS Notification', url: 'https://upsc.gov.in/examinations/active-examinations/combined-defence-services-examination-i' },
      { label: 'Army / Navy / Air Force Careers', url: 'https://joinindianarmy.nic.in' },
      { label: 'CDS Mock Tests (Gradeup)', url: 'https://byjusexamprep.com/cds-exam' },
    ],
    tags: ['CDS', 'IMA', 'OTA', 'Defence', 'Army'],
  },
  {
    id: 'constable-police',
    sector: 'defence',
    title: 'Police Constable / SI (State)',
    icon: '👮',
    body: 'State police recruitment for Constable and Sub-Inspector posts. High demand, stable career.',
    eligibility: '10+2 / Graduate depending on post. Age varies by state.',
    conductedBy: 'State Police Recruitment Boards',
    frequency: 'As per vacancies',
    difficulty: 'Medium',
    salary: '₹19,900 – ₹63,200/month',
    timeline: ['Written Exam', 'Physical Test', 'Medical', 'Document Verification'],
    materials: [
      { label: 'Odisha Police Recruitment', url: 'https://www.odishapolice.gov.in' },
      { label: 'SSC GD Preparation (Adda247)', url: 'https://www.adda247.com/ssc-gd-constable/' },
      { label: 'Testbook Police Free Mock', url: 'https://testbook.com/police-constable-exam' },
    ],
    tags: ['Police', 'Constable', 'SI', 'State Govt', 'Defence'],
  },

  // ── RAILWAYS ────────────────────────────────────────────────────────────────
  {
    id: 'rrb-ntpc',
    sector: 'railway',
    title: 'RRB NTPC — Non-Technical Popular Categories',
    icon: '🚆',
    body: 'Railway Recruitment Board exam for clerical, commercial & other non-technical posts. Lakhs of vacancies.',
    eligibility: '12th pass or Graduate depending on post. Age 18–33.',
    conductedBy: 'Railway Recruitment Board (RRB)',
    frequency: 'Every 1–2 years',
    difficulty: 'Medium',
    salary: '₹19,900 – ₹35,400/month',
    timeline: ['CBT 1 (Prelims)', 'CBT 2 (Mains)', 'Typing/Skill Test', 'Document Verification'],
    materials: [
      { label: 'RRB Official Portal', url: 'https://www.rrbcdg.gov.in' },
      { label: 'Indian Railway Recruitment (centralised)', url: 'https://www.indianrailways.gov.in/railwayboard/view_section.jsp?lang=0&id=0,1,304,366' },
      { label: 'RRB NTPC Free Mock (Testbook)', url: 'https://testbook.com/rrb-ntpc' },
      { label: 'Adda247 RRB Study Material', url: 'https://www.adda247.com/railway-jobs/rrb-ntpc/' },
    ],
    tags: ['RRB', 'NTPC', 'Railway', 'Central Govt'],
    featured: true,
  },
  {
    id: 'rrb-group-d',
    sector: 'railway',
    title: 'RRB Group D — Track Maintainer & Helper',
    icon: '🛤️',
    body: 'Entry-level railway jobs — Track Maintainer, Helper, Porter etc. Massive recruitment cycles.',
    eligibility: '10th pass + ITI. Age 18–36.',
    conductedBy: 'Railway Recruitment Board (RRB)',
    frequency: 'Every 1–3 years',
    difficulty: 'Low–Medium',
    salary: '₹18,000 – ₹22,000/month',
    timeline: ['CBT', 'PET (Physical Efficiency Test)', 'Medical', 'Document Verification'],
    materials: [
      { label: 'RRB Official Portal', url: 'https://www.rrbcdg.gov.in' },
      { label: 'Group D Free Mock Tests', url: 'https://testbook.com/rrb-group-d' },
    ],
    tags: ['RRB', 'Group D', 'Railway', 'Central Govt'],
  },
  {
    id: 'rrb-je',
    sector: 'railway',
    title: 'RRB JE — Junior Engineer',
    icon: '⚙️',
    body: 'Technical engineering posts in Indian Railways across Civil, Mechanical, Electrical and IT.',
    eligibility: 'Diploma / B.E. in relevant engineering. Age 18–36.',
    conductedBy: 'RRB',
    frequency: 'As per vacancies',
    difficulty: 'Medium–High',
    salary: '₹35,400 – ₹1,12,400/month',
    timeline: ['CBT 1', 'CBT 2', 'Document Verification'],
    materials: [
      { label: 'RRB JE Official', url: 'https://www.rrbcdg.gov.in' },
      { label: 'NPTEL Engineering', url: 'https://nptel.ac.in' },
      { label: 'Made Easy Notes', url: 'https://www.madeeasy.in' },
    ],
    tags: ['RRB', 'JE', 'Engineering', 'Railway'],
  },

  // ── BANKING & PSU ────────────────────────────────────────────────────────────
  {
    id: 'ibps-po',
    sector: 'banking',
    title: 'IBPS PO — Probationary Officer',
    icon: '🏦',
    body: 'Probationary Officer posts in public sector banks via IBPS. Fast career growth, good pay.',
    eligibility: 'Graduate in any discipline. Age 20–30.',
    conductedBy: 'IBPS',
    frequency: 'Once a year',
    difficulty: 'High',
    salary: '₹36,000 – ₹63,840/month (incl. allowances)',
    timeline: ['Prelims (Oct)', 'Mains (Nov)', 'Interview (Jan–Feb)', 'Result (Apr)'],
    materials: [
      { label: 'IBPS Official Site', url: 'https://www.ibps.in' },
      { label: 'Oliveboard Banking Free Mocks', url: 'https://www.oliveboard.in/bank-exams/' },
      { label: 'Adda247 IBPS PO', url: 'https://www.adda247.com/banking-jobs/ibps-po/' },
      { label: 'Testbook IBPS Free Notes', url: 'https://testbook.com/ibps-po' },
    ],
    tags: ['IBPS', 'PO', 'Banking', 'Bank Jobs'],
    featured: true,
  },
  {
    id: 'sbi-po',
    sector: 'banking',
    title: 'SBI PO — State Bank of India',
    icon: '💰',
    body: 'Premier banking exam for Probationary Officers in SBI — highest paid bank job entry.',
    eligibility: 'Graduate in any discipline. Age 21–30.',
    conductedBy: 'SBI',
    frequency: 'Once a year',
    difficulty: 'High',
    salary: '₹41,960 – ₹75,325/month (incl. allowances)',
    timeline: ['Prelims', 'Mains', 'GD + Interview', 'Final Result'],
    materials: [
      { label: 'SBI Careers Portal', url: 'https://bank.sbi/careers' },
      { label: 'SBI PO Free Mock (Oliveboard)', url: 'https://www.oliveboard.in/sbi-po/' },
      { label: 'Adda247 SBI PO', url: 'https://www.adda247.com/banking-jobs/sbi-po/' },
    ],
    tags: ['SBI', 'PO', 'Banking', 'Bank Jobs'],
  },
  {
    id: 'psu-gate',
    sector: 'banking',
    title: 'PSU Recruitment via GATE',
    icon: '🏭',
    body: 'BHEL, ONGC, NTPC, GAIL, IOCL and 50+ PSUs recruit engineers directly via GATE scores. No separate exam.',
    eligibility: 'B.E./B.Tech with valid GATE score. Age 18–28 (varies by PSU).',
    conductedBy: 'Individual PSUs (GATE score used)',
    frequency: 'GATE: Once a year (Feb)',
    difficulty: 'High',
    salary: '₹50,000 – ₹1,60,000/month (CTC)',
    timeline: ['GATE Exam (Feb)', 'PSU Shortlisting', 'GD/Interview', 'Joining'],
    materials: [
      { label: 'GATE Official Site (IITs)', url: 'https://gate2025.iitr.ac.in' },
      { label: 'NPTEL GATE Preparation', url: 'https://nptel.ac.in/courses/gate' },
      { label: 'Made Easy GATE', url: 'https://www.madeeasy.in/gate/' },
    ],
    tags: ['GATE', 'PSU', 'BHEL', 'ONGC', 'Engineering'],
    featured: true,
  },

  // ── SCIENCE & RESEARCH ───────────────────────────────────────────────────────
  {
    id: 'isro',
    sector: 'science',
    title: 'ISRO Scientist / Engineer',
    icon: '🚀',
    body: 'Indian Space Research Organisation recruits Scientist-Engineers through ICRB and centralised exams.',
    eligibility: 'B.E./B.Tech (Mech/Elec/CS/Electronics) with 65%+ marks. Age ≤35.',
    conductedBy: 'ISRO Centralised Recruitment Board',
    frequency: 'Irregular, usually annual',
    difficulty: 'Very High',
    salary: '₹56,100 – ₹1,77,500/month',
    timeline: ['Written Test', 'Interview', 'Medical', 'Joining'],
    materials: [
      { label: 'ISRO ICRB Official', url: 'https://www.isro.gov.in/Careers.html' },
      { label: 'NPTEL Aerospace & Space Tech', url: 'https://nptel.ac.in' },
      { label: 'ISRO Previous Papers (Testbook)', url: 'https://testbook.com/isro' },
    ],
    tags: ['ISRO', 'Scientist', 'Space', 'Engineering', 'Research'],
    featured: true,
  },
  {
    id: 'drdo',
    sector: 'science',
    title: 'DRDO Scientist',
    icon: '🔬',
    body: 'Defence Research & Development Organisation — cutting-edge defence tech R&D. Lateral and direct entries.',
    eligibility: 'B.E./B.Tech or M.Sc/Ph.D for Scientist B. Age ≤28 (Scientist B).',
    conductedBy: 'DRDO CEPTAM / RAC',
    frequency: 'Annual / as needed',
    difficulty: 'Very High',
    salary: '₹56,100 – ₹2,09,200/month',
    timeline: ['Written Exam', 'Descriptive Paper', 'Interview', 'Security Clearance'],
    materials: [
      { label: 'DRDO Official Recruitment', url: 'https://www.drdo.gov.in/careers' },
      { label: 'BARC OCES/DGFS (for Science grad)', url: 'https://www.barc.gov.in/recruit/' },
      { label: 'Testbook DRDO Notes', url: 'https://testbook.com/drdo' },
    ],
    tags: ['DRDO', 'Scientist', 'Defence', 'Research'],
  },
  {
    id: 'csir-net',
    sector: 'science',
    title: 'CSIR NET — Junior Research Fellowship',
    icon: '🧪',
    body: 'Council of Scientific & Industrial Research National Eligibility Test for JRF and Lectureship in science disciplines.',
    eligibility: 'M.Sc in relevant science. Age ≤28 for JRF.',
    conductedBy: 'NTA (on behalf of CSIR)',
    frequency: 'Twice a year (June & Dec)',
    difficulty: 'High',
    salary: 'JRF Stipend: ₹37,000 – ₹58,000/month',
    timeline: ['Application', 'Exam', 'Results', 'Fellowship Award'],
    materials: [
      { label: 'CSIR NET Official (NTA)', url: 'https://csirnet.nta.ac.in' },
      { label: 'CSIR free study material', url: 'https://www.csir.res.in' },
      { label: 'Unacademy CSIR Free', url: 'https://unacademy.com/goal/csir-ugc-net-life-sciences/MSLCS' },
    ],
    tags: ['CSIR', 'NET', 'JRF', 'Science', 'Research'],
  },

  // ── TEACHING ─────────────────────────────────────────────────────────────────
  {
    id: 'ugc-net',
    sector: 'teaching',
    title: 'UGC NET — Assistant Professor & JRF',
    icon: '🎓',
    body: 'National Eligibility Test for Assistant Professor in colleges/universities. Also qualifies for Junior Research Fellowship.',
    eligibility: 'Post-graduate in relevant subject with 55%+ marks. No age limit for AS P, ≤30 for JRF.',
    conductedBy: 'NTA',
    frequency: 'Twice a year (June & Dec)',
    difficulty: 'High',
    salary: 'Assistant Professor: ₹57,700 – ₹1,82,400/month',
    timeline: ['Apply (Feb/Aug)', 'Exam (Jun/Dec)', 'Results', 'Appointment'],
    materials: [
      { label: 'NTA UGC NET Portal', url: 'https://ugcnet.nta.ac.in' },
      { label: 'NTA Official Study Resources', url: 'https://nta.ac.in' },
      { label: 'e-PG Pathshala (UGC e-content)', url: 'https://epgp.inflibnet.ac.in' },
      { label: 'SWAYAM UGC NET Courses', url: 'https://swayam.gov.in' },
    ],
    tags: ['UGC', 'NET', 'Teaching', 'Professor', 'JRF'],
    featured: true,
  },
  {
    id: 'ctet-tet',
    sector: 'teaching',
    title: 'CTET / State TET — School Teacher',
    icon: '📖',
    body: 'Central & State Teacher Eligibility Tests for primary and upper primary school teachers in govt schools.',
    eligibility: 'D.El.Ed / B.Ed as applicable. Age varies by state/board.',
    conductedBy: 'NTA (CTET), State Education Boards (TET)',
    frequency: 'CTET: Twice a year. TET: Annual.',
    difficulty: 'Medium',
    salary: '₹35,400 – ₹1,12,400/month (PRT/TGT)',
    timeline: ['Application', 'Written Exam', 'Certificate', 'State Recruitment'],
    materials: [
      { label: 'CTET Official (NTA)', url: 'https://ctet.nic.in' },
      { label: 'Odisha TET (BSE Odisha)', url: 'https://bseodisha.ac.in' },
      { label: 'DIKSHA Teaching Platform', url: 'https://diksha.gov.in' },
      { label: 'Adda247 CTET Free Notes', url: 'https://www.adda247.com/teaching-jobs/ctet/' },
    ],
    tags: ['CTET', 'TET', 'Teacher', 'School', 'Teaching'],
  },

  // ── STATE GOVT ───────────────────────────────────────────────────────────────
  {
    id: 'ossc-chsl',
    sector: 'state',
    title: 'OSSC CHSL — Odisha Combined Higher Secondary',
    icon: '🏢',
    body: 'Odisha Staff Selection Commission — Combined Higher Secondary Level exam for non-technical state govt posts.',
    eligibility: '12th pass. Age 18–32.',
    conductedBy: 'OSSC',
    frequency: 'Irregular, as per vacancies',
    difficulty: 'Medium',
    salary: '₹19,900 – ₹37,700/month',
    timeline: ['CBT 1', 'CBT 2', 'Skill Test (if applicable)', 'Merit List'],
    materials: [
      { label: 'OSSC Official', url: 'https://www.ossc.gov.in' },
      { label: 'OPSC Official', url: 'https://www.opsc.gov.in' },
      { label: 'SSC Free Mock (Testbook)', url: 'https://testbook.com/ssc' },
    ],
    tags: ['OSSC', 'Odisha', 'State Govt', 'CHSL'],
    featured: true,
  },
  {
    id: 'ssc-cgl',
    sector: 'state',
    title: 'SSC CGL — Combined Graduate Level',
    icon: '📋',
    body: 'Staff Selection Commission — Graduate-level posts across central ministries, departments and agencies.',
    eligibility: 'Graduate in any discipline. Age 18–32 (most posts).',
    conductedBy: 'SSC',
    frequency: 'Once a year',
    difficulty: 'High',
    salary: '₹29,200 – ₹92,300/month',
    timeline: ['Tier 1 (CBT)', 'Tier 2 (CBT)', 'Tier 3 (Descriptive)', 'Skill Test'],
    materials: [
      { label: 'SSC Official', url: 'https://ssc.nic.in' },
      { label: 'SSC CGL Free Mock (Testbook)', url: 'https://testbook.com/ssc-cgl' },
      { label: 'Adda247 SSC CGL Notes', url: 'https://www.adda247.com/ssc-jobs/ssc-cgl/' },
    ],
    tags: ['SSC', 'CGL', 'Central Govt', 'Graduate'],
    featured: true,
  },

  // ── PRIVATE SECTOR ───────────────────────────────────────────────────────────
  {
    id: 'it-software',
    sector: 'private',
    title: 'IT & Software Industry',
    icon: '💻',
    body: 'India\'s largest private sector employer. TCS, Infosys, Wipro, HCL recruit lakhs annually. FAANG opportunities for top talent.',
    eligibility: 'B.Tech/BCA/BSc IT. CGPA ≥6.5 often required.',
    conductedBy: 'Campus Placement / Off-Campus / AMCAT / CoCubes',
    frequency: 'Year-round',
    difficulty: 'Medium–Very High (depends on company)',
    salary: '₹3.5 LPA – ₹50+ LPA',
    timeline: ['Aptitude Test', 'Technical Rounds', 'HR Round', 'Offer Letter'],
    materials: [
      { label: 'GeeksforGeeks DSA (Free)', url: 'https://www.geeksforgeeks.org/data-structures/' },
      { label: 'Leetcode Free Problems', url: 'https://leetcode.com/problemset/' },
      { label: 'TCS NQT Registration', url: 'https://www.tcsionhub.in/tcs-nqt' },
      { label: 'Infosys Springboard (Free)', url: 'https://infyspringboard.onwingspan.com' },
      { label: 'NASSCOM FutureSkills Prime', url: 'https://futureskillsprime.in' },
    ],
    tags: ['IT', 'Software', 'Private', 'TCS', 'Infosys', 'Tech'],
    featured: true,
  },
  {
    id: 'entrepreneurship',
    sector: 'private',
    title: 'Entrepreneurship & Startups',
    icon: '🚀',
    body: 'Build your own venture. Govt schemes (Startup India, MUDRA, MSME) provide funding. Great path for innovators.',
    eligibility: 'No fixed eligibility. Ideas + drive required.',
    conductedBy: 'Self / Incubators / Angel Networks',
    frequency: 'Ongoing',
    difficulty: 'Very High',
    salary: 'Variable — unlimited upside',
    timeline: ['Ideation', 'MVP', 'Funding', 'Scale'],
    materials: [
      { label: 'Startup India Portal', url: 'https://www.startupindia.gov.in' },
      { label: 'iStartup (Govt Incubation)', url: 'https://www.startupindia.gov.in/content/sih/en/ams-application.html' },
      { label: 'MUDRA Loans', url: 'https://www.mudra.org.in' },
      { label: 'Atal Innovation Mission', url: 'https://aim.gov.in' },
    ],
    tags: ['Startup', 'Entrepreneurship', 'MUDRA', 'Private'],
  },

  // ── WHILE STUDYING (PARALLEL) ────────────────────────────────────────────────
  {
    id: 'internships',
    sector: 'parallel',
    title: 'Internships & Apprenticeships',
    icon: '🏫',
    body: 'Earn while you learn. National Apprenticeship Training Scheme (NATS/NAPS) allows stipend-based industry training.',
    eligibility: 'Currently enrolled students in any degree/diploma.',
    conductedBy: 'NATS (Degree/Diploma), NAPS (ITI), Internshala',
    frequency: 'Year-round',
    difficulty: 'Low–Medium',
    salary: 'Stipend: ₹5,000 – ₹25,000/month',
    timeline: ['Register', 'Match with Employer', 'Train', 'Certificate'],
    materials: [
      { label: 'NATS — National Apprenticeship Training', url: 'https://www.nats.education.gov.in' },
      { label: 'NAPS — National Apprenticeship Promotion', url: 'https://www.apprenticeshipindia.gov.in' },
      { label: 'Internshala (Free Internships)', url: 'https://internshala.com' },
      { label: 'PM Internship Scheme 2024', url: 'https://pminternship.mca.gov.in' },
    ],
    tags: ['Internship', 'Apprenticeship', 'NATS', 'NAPS', 'Student'],
    featured: true,
  },
  {
    id: 'freelancing',
    sector: 'parallel',
    title: 'Freelancing While Studying',
    icon: '💰',
    body: 'Earn income while studying via platforms like Fiverr, Upwork, Toptal. Design, coding, writing, tutoring all work.',
    eligibility: 'Any skill — design, coding, content, tutoring etc.',
    conductedBy: 'Self (Fiverr, Upwork, Toptal, Chegg tutoring)',
    frequency: 'Flexible',
    difficulty: 'Low–High (depends on skill)',
    salary: '₹5,000 – ₹2,00,000+/month',
    timeline: ['Learn a Skill', 'Create Profile', 'Get Clients', 'Scale'],
    materials: [
      { label: 'Fiverr Learn (Free Intro)', url: 'https://learn.fiverr.com' },
      { label: 'Upwork Academy', url: 'https://www.upwork.com/resources/category/upwork-academy' },
      { label: 'SWAYAM Skill Courses', url: 'https://swayam.gov.in' },
      { label: 'Google Digital Garage (Free)', url: 'https://learndigital.withgoogle.com/digitalgarage' },
    ],
    tags: ['Freelance', 'Side Income', 'Student', 'Skills'],
  },
  {
    id: 'competitive-parallel',
    sector: 'parallel',
    title: 'Prepare for Competitive Exams (While Studying)',
    icon: '📝',
    body: 'Start preparing for UPSC/SSC/Bank/Railway from graduation itself. Early starters have a huge advantage.',
    eligibility: 'Students in final year or penultimate year of any degree.',
    conductedBy: 'Self-study + free platforms',
    frequency: 'Ongoing preparation',
    difficulty: 'High',
    salary: '—',
    timeline: ['Learn Syllabus', 'Build Foundation', 'Practice MCQs', 'Mock Tests'],
    materials: [
      { label: 'SWAYAM / NPTEL Free Courses', url: 'https://swayam.gov.in' },
      { label: 'Khan Academy (Maths/Reasoning)', url: 'https://khanacademy.org' },
      { label: 'Unacademy Free Lessons', url: 'https://unacademy.com' },
      { label: 'Testbook Free Mock Tests', url: 'https://testbook.com' },
      { label: 'Drishti IAS (Current Affairs)', url: 'https://www.drishtiias.com' },
    ],
    tags: ['Exam Prep', 'Student', 'UPSC', 'SSC', 'Parallel'],
    featured: true,
  },
]

// ── Practice Q&A Database ──────────────────────────────────────────────────────
const PRACTICE_QA = {
  civil: [
    { q: 'Which article of the Indian Constitution deals with the Right to Equality?', options: ['Art 12–18', 'Art 19–22', 'Art 23–24', 'Art 25–28'], ans: 0, exp: 'Articles 12–18 deal with Right to Equality under Part III of the Constitution.' },
    { q: 'Who is known as the "Father of the Indian Constitution"?', options: ['Jawaharlal Nehru', 'B.R. Ambedkar', 'Rajendra Prasad', 'Sardar Patel'], ans: 1, exp: 'Dr. B.R. Ambedkar is widely regarded as the Father of the Indian Constitution as he chaired the Drafting Committee.' },
    { q: 'How many Fundamental Rights are guaranteed by the Indian Constitution?', options: ['5', '6', '7', '9'], ans: 1, exp: 'There are 6 Fundamental Rights: Equality, Freedom, Against Exploitation, Religion, Cultural & Education, Constitutional Remedies.' },
    { q: 'What does "Gross Domestic Product" (GDP) measure?', options: ['Government\'s revenue', 'Total market value of goods/services in a country', 'Foreign exchange reserves', 'National savings'], ans: 1, exp: 'GDP measures the total monetary value of all goods and services produced within a country\'s borders in a specific time period.' },
    { q: 'The Tropic of Cancer passes through how many Indian states?', options: ['6', '7', '8', '9'], ans: 2, exp: 'The Tropic of Cancer passes through 8 Indian states: Gujarat, Rajasthan, MP, Chhattisgarh, Jharkhand, West Bengal, Tripura, Mizoram.' },
    { q: 'Which UPSC exam is held for IPS and IFS officers?', options: ['CAPF', 'IES', 'Civil Services Examination', 'NDA'], ans: 2, exp: 'The UPSC Civil Services Examination (CSE) leads to IAS, IPS, IFS and other Group A services.' },
  ],
  defence: [
    { q: 'What does SSB stand for in the context of defence recruitment?', options: ['Services Selection Bureau', 'Services Selection Board', 'Special Services Battalion', 'Senior Services Branch'], ans: 1, exp: 'SSB stands for Services Selection Board — the 5-day selection process for officer-level entry into the armed forces.' },
    { q: 'NDA exam is conducted by which body?', options: ['Ministry of Defence', 'UPSC', 'Army HQ', 'NDA Pune'], ans: 1, exp: 'The NDA and NA examination is conducted by UPSC (Union Public Service Commission).' },
    { q: 'Minimum age for NDA entry is:', options: ['15 years', '16.5 years', '18 years', '17 years'], ans: 1, exp: 'The minimum age for NDA entry is 16.5 years and maximum is 19.5 years.' },
    { q: 'Physical Efficiency Test (PET) is mandatory for which exam?', options: ['IBPS PO', 'RRB Group D', 'UGC NET', 'IAS'], ans: 1, exp: 'RRB Group D recruitment includes a Physical Efficiency Test (PET) to assess physical fitness.' },
    { q: 'Which exam allows entry to Indian Air Force as an officer directly after graduation?', options: ['AFCAT', 'CDS', 'NDA', 'Both A and B'], ans: 3, exp: 'Both AFCAT and CDS (AFA entry) allow graduate-level entry into the Indian Air Force as commissioned officers.' },
  ],
  railway: [
    { q: 'RRB NTPC recruitment is for which type of railway posts?', options: ['Technical Engineering posts', 'Non-Technical Popular Category posts', 'Only Group D posts', 'Only Class-I officers'], ans: 1, exp: 'NTPC stands for Non-Technical Popular Category — posts like Junior Clerk, Commercial Apprentice, Traffic Assistant etc.' },
    { q: 'Railway recruitment exams are conducted in which mode?', options: ['Pen-paper only', 'Online CBT', 'Both modes', 'Interview-based'], ans: 1, exp: 'All RRB exams (NTPC, Group D, JE) are conducted in Computer Based Test (CBT) mode.' },
    { q: 'What is the minimum qualification for RRB Group D?', options: ['Graduate', '10th pass + ITI', '12th pass', 'Diploma'], ans: 1, exp: 'RRB Group D requires 10th pass or equivalent + ITI certificate for eligibility.' },
    { q: 'Indian Railways is under which ministry?', options: ['Dept of Transport', 'Ministry of Railways', 'Ministry of Infrastructure', 'NITI Aayog'], ans: 1, exp: 'Indian Railways operates under the Ministry of Railways, Government of India.' },
    { q: 'RRB JE exam is meant for candidates with:', options: ['12th pass', 'ITI certificate', 'Degree/Diploma in Engineering', 'Any graduate'], ans: 2, exp: 'RRB JE (Junior Engineer) requires a Diploma or Degree in relevant Engineering branches.' },
  ],
  banking: [
    { q: 'IBPS stands for:', options: ['Indian Banking and Professional Standard', 'Institute of Banking Personnel Selection', 'Indian Bureau of Payment Services', 'International Banking Promotion System'], ans: 1, exp: 'IBPS = Institute of Banking Personnel Selection — the body that conducts PO, Clerk and SO exams for public sector banks.' },
    { q: 'Which is the highest governance body for banks in India?', options: ['SEBI', 'IRDAI', 'RBI', 'NABARD'], ans: 2, exp: 'The Reserve Bank of India (RBI) is the central bank and the apex monetary authority that regulates all banks in India.' },
    { q: 'Repo Rate is decided by:', options: ['Finance Ministry', 'SEBI', 'RBI Monetary Policy Committee', 'NABARD'], ans: 2, exp: 'The RBI\'s Monetary Policy Committee (MPC) decides the Repo Rate — the rate at which RBI lends to commercial banks.' },
    { q: 'SBI PO exam has how many stages?', options: ['2', '3', '4', '1'], ans: 1, exp: 'SBI PO has 3 stages: Prelims, Mains, and Group Discussion + Interview.' },
    { q: 'GATE score is primarily used for admission to:', options: ['IIMs', 'IITs/NITs for M.Tech + PSU jobs', 'IAS Interview', 'Law colleges'], ans: 1, exp: 'GATE score is used for M.Tech admissions to IITs/NITs and also for direct recruitment in major PSUs like BHEL, ONGC, NTPC etc.' },
  ],
  science: [
    { q: 'ISRO was founded in which year?', options: ['1947', '1962', '1969', '1975'], ans: 2, exp: 'ISRO (Indian Space Research Organisation) was established on 15 August 1969, succeeding INCOSPAR.' },
    { q: 'CSIR NET is conducted by:', options: ['UPSC', 'NTA', 'UGC', 'DBT'], ans: 1, exp: 'The National Testing Agency (NTA) conducts the CSIR-UGC NET exam on behalf of CSIR.' },
    { q: 'DRDO is under which ministry?', options: ['Ministry of Science', 'Ministry of Defence', 'Ministry of Education', 'DST'], ans: 1, exp: 'DRDO (Defence Research & Development Organisation) is under the Department of Defence R&D, Ministry of Defence.' },
    { q: 'JRF stipend under CSIR NET is approximately:', options: ['₹14,000/month', '₹31,000/month', '₹37,000/month', '₹50,000/month'], ans: 2, exp: 'CSIR JRF (Junior Research Fellowship) provides a fellowship of ₹37,000/month for the first 2 years.' },
    { q: 'India\'s first satellite was called:', options: ['Rohini', 'Aryabhata', 'INSAT-1A', 'SLV-3'], ans: 1, exp: 'Aryabhata was India\'s first satellite, launched on 19 April 1975 with assistance from the Soviet Union.' },
  ],
  teaching: [
    { q: 'UGC NET Paper 1 is common for all disciplines and tests:', options: ['Subject knowledge', 'Teaching aptitude & research', 'Both A and B', 'Language skills'], ans: 1, exp: 'UGC NET Paper 1 tests Teaching Aptitude, Research Aptitude, Reasoning, Communication, and related areas — common for all candidates.' },
    { q: 'CTET is mandatory for teaching at which level?', options: ['College', 'Primary & Upper Primary (Class 1–8)', 'Secondary only', 'All school levels'], ans: 1, exp: 'CTET qualifies teachers for Class I–VIII (Primary: I–V, Upper Primary: VI–VIII) in central government schools.' },
    { q: 'DIKSHA platform is maintained by:', options: ['NCERT', 'Ministry of Education', 'UGC', 'Both A & B'], ans: 3, exp: 'DIKSHA (Digital Infrastructure for Knowledge Sharing) is maintained jointly by NCERT and MoE, used by teachers across India.' },
    { q: 'To become an Assistant Professor, which exam is required?', options: ['CTET', 'UGC NET', 'TGT', 'HTET'], ans: 1, exp: 'UGC NET (or GATE/PhD equivalence) is required to become an Assistant Professor in Indian universities and colleges.' },
  ],
  state: [
    { q: 'OSSC stands for:', options: ['Odisha State Service Commission', 'Odisha Staff Selection Commission', 'Odisha State Skill Corporation', 'Odisha Staff Services Council'], ans: 1, exp: 'OSSC = Odisha Staff Selection Commission — recruits candidates for various state government posts in Odisha.' },
    { q: 'OPSC conducts which exam for state administrative services?', options: ['OSSC CHSL', 'OAS (Odisha Administrative Service)', 'OPS CGL', 'OPAS'], ans: 1, exp: 'OPSC (Odisha Public Service Commission) conducts the Odisha Administrative Service (OAS) examination for Group A & B posts.' },
    { q: 'SSC CGL is a __ government recruitment exam:', options: ['State', 'Central', 'Both', 'Municipal'], ans: 1, exp: 'SSC CGL (Combined Graduate Level) is a Central Government recruitment exam conducted by the Staff Selection Commission.' },
    { q: 'Which of these is a state-level PSC exam?', options: ['UPSC CSE', 'SBI PO', 'OPSC OCS', 'RRB NTPC'], ans: 2, exp: 'OPSC OCS (Odisha Civil Services) is a state-level PSC exam. UPSC CSE, SBI PO and RRB NTPC are central exams.' },
  ],
  private: [
    { q: 'TCS NQT is a recruitment test conducted by:', options: ['Tata Consultancy Services', 'National Qualification Test', 'NASSCOM', 'CII'], ans: 0, exp: 'TCS NQT (National Qualifier Test) is TCS\'s own entrance and eligibility test for hiring fresher engineers.' },
    { q: 'Which platform is best for DSA practice?', options: ['Canva', 'Leetcode', 'Figma', 'AWS Console'], ans: 1, exp: 'LeetCode is the most widely used platform for Data Structures & Algorithms (DSA) practice for technical interviews.' },
    { q: 'AMCAT is conducted by which company?', options: ['Aspiring Minds (Mercer|Mettl)', 'TCS', 'Wipro', 'HCL'], ans: 0, exp: 'AMCAT is conducted by Aspiring Minds (now part of Mercer|Mettl) — used by 2,000+ companies for fresher hiring.' },
    { q: 'Startup India scheme was launched in which year?', options: ['2014', '2016', '2015', '2018'], ans: 2, exp: 'Startup India was launched by PM Narendra Modi on 16 January 2016 to promote entrepreneurship across India.' },
  ],
  parallel: [
    { q: 'NATS stands for:', options: ['National Apprenticeship Training Scheme', 'National Aptitude Test for Students', 'National Arts Training System', 'None'], ans: 0, exp: 'NATS = National Apprenticeship Training Scheme — a Ministry of Education initiative for degree/diploma apprenticeships.' },
    { q: 'PM Internship Scheme 2024 offers internships in:', options: ['Govt offices only', 'Top 500 companies in India', 'Public sector banks only', 'IITs/IIMs'], ans: 1, exp: 'The PM Internship Scheme 2024 places interns in the Top 500 companies by CSR spending, across all sectors.' },
    { q: 'Which platform offers free courses tied to SWAYAM?', options: ['Coursera', 'Udemy', 'NPTEL', 'LinkedIn Learning'], ans: 2, exp: 'NPTEL (National Programme on Technology Enhanced Learning) is the primary platform delivering SWAYAM courses from IITs/IIMs.' },
    { q: 'Fiverr is a platform for:', options: ['Competitive exam prep', 'Freelance services marketplace', 'Govt scholarship applications', 'Bank account management'], ans: 1, exp: 'Fiverr is a global online marketplace for freelance services — students can earn by offering skills like design, writing, coding.' },
    { q: 'MUDRA loans are given for:', options: ['Foreign education', 'Micro/small enterprise funding', 'Home loans only', 'Stock market investments'], ans: 1, exp: 'MUDRA (Micro Units Development & Refinance Agency) provides loans up to ₹20 lakh for micro and small enterprises and startups.' },
  ],
}

// ── Current Openings Database ─────────────────────────────────────────────────
// Note: These are the official permanent portals where fresh notifications are
// posted. Users click "Apply / View" to reach the live listing on the real site.
const OPENINGS = [
  // ── CENTRAL GOVT ────────────────────────────────────────────────────────────
  {
    id: 'upsc-active',
    sector: 'civil',
    type: 'govt',
    org: 'UPSC',
    title: 'UPSC Active Examinations',
    desc: 'All active UPSC notifications — CSE, ESE, CAPF, Geo Scientist, CMS, NDA and more. Updated as soon as notified.',
    eligibility: 'Varies by exam (Graduate / Engineering / 12th)',
    lastUpdated: 'Live',
    applyUrl: 'https://upsconline.nic.in/mainmenu.php',
    notifUrl: 'https://upsc.gov.in/examinations/active-examinations',
    tags: ['UPSC', 'IAS', 'IPS', 'IFS', 'ESE', 'NDA', 'CAPF'],
    featured: true,
  },
  {
    id: 'ssc-active',
    sector: 'state',
    type: 'govt',
    org: 'SSC',
    title: 'SSC — All Current Recruitments',
    desc: 'Staff Selection Commission live notifications: CGL, CHSL, MTS, CPO, GD Constable, JE and Stenographer.',
    eligibility: '10th / 12th / Graduate depending on post',
    lastUpdated: 'Live',
    applyUrl: 'https://ssc.nic.in/SSCFileServer/PortalManagement/UploadedFiles/notice_board.htm',
    notifUrl: 'https://ssc.nic.in',
    tags: ['SSC', 'CGL', 'CHSL', 'MTS', 'CPO', 'GD'],
    featured: true,
  },
  {
    id: 'rrb-active',
    sector: 'railway',
    type: 'govt',
    org: 'Indian Railways / RRB',
    title: 'Railway Recruitment — Active Notifications',
    desc: 'All RRB and RRC recruitment notifications: NTPC, Group D, JE, ALP, Paramedical and more on the centralised portal.',
    eligibility: '10th / ITI / Diploma / Graduate',
    lastUpdated: 'Live',
    applyUrl: 'https://www.rrbcdg.gov.in',
    notifUrl: 'https://www.indianrailways.gov.in/railwayboard/view_section.jsp?lang=0&id=0,1,304,366',
    tags: ['RRB', 'NTPC', 'Group D', 'ALP', 'JE', 'Railway'],
    featured: true,
  },
  {
    id: 'ibps-active',
    sector: 'banking',
    type: 'govt',
    org: 'IBPS',
    title: 'IBPS — Current Bank Recruitments',
    desc: 'IBPS PO, Clerk, SO, RRB Officer & Assistant — all active cycles. Covers 20+ public sector banks.',
    eligibility: 'Graduate (20–28 years for most posts)',
    lastUpdated: 'Live',
    applyUrl: 'https://www.ibps.in',
    notifUrl: 'https://www.ibps.in/notices/',
    tags: ['IBPS', 'PO', 'Clerk', 'SO', 'RRB', 'Bank'],
    featured: true,
  },
  {
    id: 'sbi-careers',
    sector: 'banking',
    type: 'govt',
    org: 'SBI',
    title: 'SBI Careers Portal',
    desc: 'SBI PO, SBI Clerk, SBI SO, SBI Apprentice and specialist officer notifications directly from State Bank of India.',
    eligibility: 'Graduate / CA / MBA depending on post',
    lastUpdated: 'Live',
    applyUrl: 'https://bank.sbi/careers',
    notifUrl: 'https://bank.sbi/careers',
    tags: ['SBI', 'PO', 'Clerk', 'SO', 'Banking'],
  },
  {
    id: 'isro-careers',
    sector: 'science',
    type: 'govt',
    org: 'ISRO',
    title: 'ISRO — Scientist & Engineer Vacancies',
    desc: 'ISRO Centralised Recruitment Board openings for Scientist/Engineer SC, SD posts in aerospace, electronics, CS and more.',
    eligibility: 'B.E./B.Tech with 65%+ (Age ≤35)',
    lastUpdated: 'Live',
    applyUrl: 'https://www.isro.gov.in/Careers.html',
    notifUrl: 'https://www.isro.gov.in/Careers.html',
    tags: ['ISRO', 'Scientist', 'Engineer', 'Space', 'Research'],
    featured: true,
  },
  {
    id: 'drdo-careers',
    sector: 'science',
    type: 'govt',
    org: 'DRDO',
    title: 'DRDO — Scientist & CEPTAM Posts',
    desc: 'Defence R&D Organisation vacancies for Scientist B, Technical Assistant (CEPTAM) and Junior Research Fellow.',
    eligibility: 'B.E./B.Tech / M.Sc / Ph.D depending on post',
    lastUpdated: 'Live',
    applyUrl: 'https://rac.gov.in',
    notifUrl: 'https://www.drdo.gov.in/careers',
    tags: ['DRDO', 'Scientist', 'CEPTAM', 'Defence', 'R&D'],
  },
  {
    id: 'nta-ugc-net',
    sector: 'teaching',
    type: 'govt',
    org: 'NTA',
    title: 'UGC NET — Assistant Professor & JRF',
    desc: 'National Eligibility Test for lectureship and Junior Research Fellowship. Conducted twice a year by NTA.',
    eligibility: 'Post-graduate with 55%+',
    lastUpdated: 'Live',
    applyUrl: 'https://ugcnet.nta.ac.in',
    notifUrl: 'https://ugcnet.nta.ac.in',
    tags: ['UGC', 'NET', 'JRF', 'Professor', 'Teaching'],
    featured: true,
  },
  {
    id: 'nta-ctet',
    sector: 'teaching',
    type: 'govt',
    org: 'CBSE / NTA',
    title: 'CTET — Central Teacher Eligibility Test',
    desc: 'CTET notification for Class I–VIII teacher qualification. Valid for Central Govt school appointments.',
    eligibility: 'D.El.Ed / B.Ed as applicable',
    lastUpdated: 'Live',
    applyUrl: 'https://ctet.nic.in',
    notifUrl: 'https://ctet.nic.in',
    tags: ['CTET', 'Teacher', 'NTA', 'Govt School'],
  },
  {
    id: 'opsc-active',
    sector: 'state',
    type: 'govt',
    org: 'OPSC',
    title: 'OPSC — Odisha Public Service Commission',
    desc: 'OAS, OCS, OFS, Assistant Section Officer and all current Odisha state civil services notifications.',
    eligibility: 'Graduate / Post-graduate depending on post',
    lastUpdated: 'Live',
    applyUrl: 'https://opscrecruitment.in',
    notifUrl: 'https://www.opsc.gov.in',
    tags: ['OPSC', 'OAS', 'Odisha', 'State PSC'],
    featured: true,
  },
  {
    id: 'ossc-active',
    sector: 'state',
    type: 'govt',
    org: 'OSSC',
    title: 'OSSC — Odisha Staff Selection Commission',
    desc: 'CHSL, CGL, Junior Assistant, Extension Officer and all current Odisha SSC posts.',
    eligibility: '10th / 12th / Graduate depending on post',
    lastUpdated: 'Live',
    applyUrl: 'https://www.ossc.gov.in',
    notifUrl: 'https://www.ossc.gov.in',
    tags: ['OSSC', 'Odisha', 'CHSL', 'State Govt'],
    featured: true,
  },
  {
    id: 'defence-joinindian',
    sector: 'defence',
    type: 'govt',
    org: 'Ministry of Defence',
    title: 'Join Indian Army / Navy / Air Force',
    desc: 'Official recruitment portals for all Army, Navy and Air Force entries — officer and soldier/sailor/airman cadres.',
    eligibility: '10th / 12th / Graduate / Engineering depending on entry',
    lastUpdated: 'Live',
    applyUrl: 'https://joinindianarmy.nic.in',
    notifUrl: 'https://joinindianarmy.nic.in',
    tags: ['Army', 'Navy', 'Air Force', 'Defence', 'NDA', 'CDS'],
    featured: true,
  },
  {
    id: 'psunaukri',
    sector: 'banking',
    type: 'govt',
    org: 'PSUs (BHEL/ONGC/NTPC/GAIL)',
    title: 'PSU Jobs — GATE-based Recruitment',
    desc: 'BHEL, ONGC, NTPC, GAIL, IOCL and 50+ PSUs recruit engineers annually through GATE scores. Check individual PSU portals.',
    eligibility: 'B.E./B.Tech with valid GATE score (Age ≤28 typically)',
    lastUpdated: 'Live',
    applyUrl: 'https://www.bhel.com/career',
    notifUrl: 'https://www.ongcindia.com/wps/wcm/connect/en/careers/',
    tags: ['PSU', 'GATE', 'BHEL', 'ONGC', 'NTPC', 'Engineering'],
  },
  {
    id: 'employment-news',
    sector: 'civil',
    type: 'govt',
    org: 'Govt of India',
    title: 'Employment News — All Central Govt Jobs',
    desc: 'Official weekly gazette of all central government job notifications across all departments and ministries.',
    eligibility: 'Varies by post',
    lastUpdated: 'Weekly',
    applyUrl: 'https://www.employmentnews.gov.in',
    notifUrl: 'https://www.employmentnews.gov.in',
    tags: ['Central Govt', 'All Departments', 'Employment News', 'Weekly'],
  },
  {
    id: 'ncs-portal',
    sector: 'civil',
    type: 'govt',
    org: 'Ministry of Labour',
    title: 'National Career Service Portal (NCS)',
    desc: 'One-stop platform for all govt and private job listings, skill courses, apprenticeships and career counselling.',
    eligibility: 'Any',
    lastUpdated: 'Live',
    applyUrl: 'https://www.ncs.gov.in',
    notifUrl: 'https://www.ncs.gov.in',
    tags: ['NCS', 'Govt Jobs', 'Private Jobs', 'All Sectors'],
    featured: true,
  },
  {
    id: 'pm-internship',
    sector: 'parallel',
    type: 'govt',
    org: 'Ministry of Corporate Affairs',
    title: 'PM Internship Scheme 2025',
    desc: '₹5,000/month stipend internships in India\'s Top 500 companies for youth aged 21–24. 1 lakh+ openings.',
    eligibility: 'Age 21–24, ITI/Diploma/Graduate, not in full-time education',
    lastUpdated: 'Live',
    applyUrl: 'https://pminternship.mca.gov.in',
    notifUrl: 'https://pminternship.mca.gov.in',
    tags: ['PM Internship', 'Stipend', 'Top 500 Companies', 'Youth'],
    featured: true,
  },

  // ── PRIVATE SECTOR ───────────────────────────────────────────────────────────
  {
    id: 'naukri',
    sector: 'private',
    type: 'private',
    org: 'Naukri.com',
    title: 'Naukri — India\'s #1 Job Portal',
    desc: 'India\'s largest private job platform. Search by skill, location, experience. 5 lakh+ active jobs across all sectors.',
    eligibility: 'Varies by job',
    lastUpdated: 'Live',
    applyUrl: 'https://www.naukri.com',
    notifUrl: 'https://www.naukri.com/fresher-jobs',
    tags: ['Private Jobs', 'IT', 'Finance', 'Sales', 'Engineering'],
    featured: true,
  },
  {
    id: 'linkedin-jobs',
    sector: 'private',
    type: 'private',
    org: 'LinkedIn',
    title: 'LinkedIn Jobs India',
    desc: 'Professional network job listings. Best for IT, management, startup and MNC roles. Apply with one click.',
    eligibility: 'Varies by job',
    lastUpdated: 'Live',
    applyUrl: 'https://www.linkedin.com/jobs/search/?location=India',
    notifUrl: 'https://www.linkedin.com/jobs/',
    tags: ['Private', 'MNC', 'LinkedIn', 'IT', 'Management'],
    featured: true,
  },
  {
    id: 'indeed-india',
    sector: 'private',
    type: 'private',
    org: 'Indeed',
    title: 'Indeed India — All Sectors',
    desc: 'Global job search engine with strong India coverage. Manufacturing, BPO, healthcare, teaching and IT listings.',
    eligibility: 'Varies by job',
    lastUpdated: 'Live',
    applyUrl: 'https://in.indeed.com',
    notifUrl: 'https://in.indeed.com',
    tags: ['Private', 'Indeed', 'All Sectors', 'Freshers'],
  },
  {
    id: 'internshala',
    sector: 'parallel',
    type: 'private',
    org: 'Internshala',
    title: 'Internshala — Internships & Entry-Level Jobs',
    desc: 'India\'s top internship platform. Thousands of paid and unpaid internships + fresher jobs across all streams.',
    eligibility: 'Students and recent graduates',
    lastUpdated: 'Live',
    applyUrl: 'https://internshala.com/internships',
    notifUrl: 'https://internshala.com',
    tags: ['Internship', 'Fresher', 'Student', 'Part-time', 'Remote'],
    featured: true,
  },
  {
    id: 'tcs-nqt',
    sector: 'private',
    type: 'private',
    org: 'TCS',
    title: 'TCS NQT — National Qualifier Test',
    desc: 'TCS\'s open recruitment test for freshers. Register year-round. High score unlocks direct interview invitations.',
    eligibility: 'B.E./B.Tech/MCA/M.Sc (2024/2025/2026 pass-outs)',
    lastUpdated: 'Live',
    applyUrl: 'https://learning.tcsionhub.in/hub/National/',
    notifUrl: 'https://www.tcs.com/careers/india/tcs-nqt',
    tags: ['TCS', 'NQT', 'IT', 'Fresher', 'Engineering'],
    featured: true,
  },
  {
    id: 'infosys-careers',
    sector: 'private',
    type: 'private',
    org: 'Infosys',
    title: 'Infosys Careers — Fresher & Lateral',
    desc: 'Infosys off-campus recruitment portal for freshers and experienced. InfyTQ is the preparation pathway.',
    eligibility: 'B.E./B.Tech/BCA/MCA with 60%+ and no active backlogs',
    lastUpdated: 'Live',
    applyUrl: 'https://career.infosys.com',
    notifUrl: 'https://career.infosys.com',
    tags: ['Infosys', 'IT', 'Fresher', 'Engineer'],
  },
  {
    id: 'wipro-careers',
    sector: 'private',
    type: 'private',
    org: 'Wipro',
    title: 'Wipro WILP & Elite National Talent Hunt',
    desc: 'Wipro\'s fresher hiring programs — WILP for engineers and Elite NTH for top performers.',
    eligibility: 'B.E./B.Tech 2024–2026 pass-outs',
    lastUpdated: 'Live',
    applyUrl: 'https://careers.wipro.com',
    notifUrl: 'https://careers.wipro.com/careers-home/',
    tags: ['Wipro', 'IT', 'WILP', 'Fresher'],
  },
  {
    id: 'govt-job-aggregator',
    sector: 'civil',
    type: 'govt',
    org: 'Sarkari Result / FreeJobAlert',
    title: 'Sarkari Result — Govt Job Aggregator',
    desc: 'Popular aggregator for all state and central government job notifications, admit cards and results.',
    eligibility: 'Varies by post',
    lastUpdated: 'Live',
    applyUrl: 'https://www.sarkariresult.com',
    notifUrl: 'https://www.freejobalert.com',
    tags: ['Sarkari', 'Admitcard', 'Results', 'All Govt Jobs'],
  },
]

// ── localStorage helpers ───────────────────────────────────────────────────────
const LS_KEY = 'arthavi_career_progress'
const loadProgress = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {} } catch { return {} } }
const saveProgress = (d) => { try { localStorage.setItem(LS_KEY, JSON.stringify(d)) } catch {/**/ } }

// ── Difficulty badge ───────────────────────────────────────────────────────────
function DiffBadge({ level }) {
  const map = {
    'Low':        { bg: '#d1fae5', color: '#065f46' },
    'Low–Medium': { bg: '#d1fae5', color: '#065f46' },
    'Medium':     { bg: '#fef9c3', color: '#854d0e' },
    'Medium–High':{ bg: '#ffedd5', color: '#9a3412' },
    'High':       { bg: '#fee2e2', color: '#991b1b' },
    'Very High':  { bg: '#fce7f3', color: '#9d174d' },
  }
  const s = map[level] || { bg: C.panel, color: C.slate }
  return (
    <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px',
      borderRadius: '20px', background: s.bg, color: s.color,
      textTransform: 'uppercase', letterSpacing: '.04em' }}>
      {level}
    </span>
  )
}

// ── Career Card ────────────────────────────────────────────────────────────────
function CareerCard({ career, expanded, onToggle, progress, onProgress }) {
  const sector = SECTORS.find(s => s.id === career.sector) || SECTORS[0]
  const prog = progress[career.id] || 'not-started'

  const progOptions = [
    { id: 'not-started', label: '— Not Started',    color: C.slate  },
    { id: 'exploring',   label: '🔍 Exploring',      color: C.blue   },
    { id: 'preparing',   label: '📚 Preparing',      color: C.amber  },
    { id: 'appearing',   label: '✍️ Appearing',      color: C.orange },
    { id: 'achieved',    label: '🏆 Achieved',       color: C.green  },
  ]
  const curProg = progOptions.find(p => p.id === prog) || progOptions[0]

  return (
    <div style={{
      background: '#fff', borderRadius: '16px',
      border: `1.5px solid ${expanded ? sector.color + '60' : C.border}`,
      boxShadow: expanded ? `0 4px 24px ${sector.color}18` : '0 1px 4px rgba(0,0,0,.05)',
      transition: 'all .2s', overflow: 'hidden',
    }}>
      {/* Card header */}
      <div
        onClick={onToggle}
        style={{ padding: '16px', cursor: 'pointer', userSelect: 'none',
          display: 'flex', alignItems: 'flex-start', gap: '12px' }}
      >
        {/* Icon bubble */}
        <div style={{
          width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
          background: sector.bg, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '20px',
          border: `1.5px solid ${sector.color}25`,
        }}>{career.icon}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>{career.title}</span>
            {career.featured && (
              <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 7px',
                borderRadius: '20px', background: '#fef3c7', color: '#92400e',
                textTransform: 'uppercase', letterSpacing: '.04em' }}>⭐ Popular</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '5px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
              background: sector.bg, color: sector.color, fontWeight: '600' }}>
              {sector.icon} {sector.label}
            </span>
            <DiffBadge level={career.difficulty} />
            <span style={{ fontSize: '11px', color: C.slate }}>🏛 {career.conductedBy}</span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: C.slate, lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: expanded ? 'unset' : 2,
            WebkitBoxOrient: 'vertical', overflow: expanded ? 'visible' : 'hidden' }}>
            {career.body}
          </p>
        </div>

        <span style={{ fontSize: '18px', color: C.slate, flexShrink: 0, marginTop: '2px',
          transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>⌄</span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px' }}>
          {/* Key facts grid */}
          <div className="cp-detail-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', marginBottom: '16px',
          }}>
            {[
              { label: '✅ Eligibility',   value: career.eligibility },
              { label: '💼 Conducted By',  value: career.conductedBy },
              { label: '🔁 Frequency',     value: career.frequency   },
              { label: '💰 Salary Range',  value: career.salary      },
            ].map(f => (
              <div key={f.label} style={{
                background: C.panel, borderRadius: '10px', padding: '10px 12px',
              }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: C.slate,
                  textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '3px' }}>{f.label}</div>
                <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: '600', lineHeight: 1.4 }}>{f.value}</div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: C.slate,
              textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '8px' }}>📅 Exam Timeline</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {career.timeline.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{
                    background: C.indigoBg, color: C.indigo, fontSize: '11px', fontWeight: '700',
                    padding: '4px 10px', borderRadius: '20px', border: `1px solid ${C.indigo}25`,
                  }}>{step}</span>
                  {i < career.timeline.length - 1 && <span style={{ color: C.slate, fontSize: '12px' }}>→</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Free Study Materials */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: C.slate,
              textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '8px' }}>📚 Free Study Materials</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {career.materials.map((m, i) => (
                <a key={i} href={m.url} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 12px', borderRadius: '8px',
                    background: C.greenBg, border: `1px solid #bbf7d0`,
                    color: C.green, fontSize: '12px', fontWeight: '600',
                    textDecoration: 'none', transition: 'opacity .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '.75'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <span>🔗</span> {m.label}
                  <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: .6 }}>↗</span>
                </a>
              ))}
            </div>
          </div>

          {/* My Progress tracker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: C.slate }}>My Status:</span>
            <select
              value={prog}
              onChange={e => onProgress(career.id, e.target.value)}
              style={{
                padding: '7px 12px', borderRadius: '8px', fontSize: '12px',
                fontFamily: 'inherit', fontWeight: '600', cursor: 'pointer', outline: 'none',
                border: `1.5px solid ${curProg.color}50`,
                background: `${curProg.color}15`, color: curProg.color,
              }}
            >
              {progOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Practice Quiz Component ────────────────────────────────────────────────────
function PracticeQuiz({ sector, onClose }) {
  const allQs      = PRACTICE_QA[sector] || []
  const sectorMeta = SECTORS.find(s => s.id === sector)
  const maxQ       = allQs.length

  const [phase,    setPhase]    = useState('config')   // 'config' | 'quiz'
  const [qCount,   setQCount]   = useState(Math.min(5, maxQ))
  const [activeQs, setActiveQs] = useState([])
  const [qIdx,     setQIdx]     = useState(0)
  const [selected, setSelected] = useState(null)
  const [score,    setScore]    = useState(0)
  const [finished, setFinished] = useState(false)
  const [answers,  setAnswers]  = useState([])

  const pickQuestions = (count) =>
    [...allQs].sort(() => Math.random() - 0.5).slice(0, count)

  const startQuiz = (countOverride) => {
    const n = countOverride ?? qCount
    setActiveQs(pickQuestions(n))
    setQIdx(0); setSelected(null); setScore(0); setFinished(false); setAnswers([])
    setPhase('quiz')
  }

  const newSet = () => {
    setActiveQs(pickQuestions(qCount))
    setQIdx(0); setSelected(null); setScore(0); setFinished(false); setAnswers([])
  }

  const retry = () => {
    setQIdx(0); setSelected(null); setScore(0); setFinished(false); setAnswers([])
  }

  const handleAnswer = (idx) => {
    if (selected !== null) return
    const q = activeQs[qIdx]
    setSelected(idx)
    const correct = idx === q.ans
    if (correct) setScore(s => s + 1)
    setAnswers(prev => [...prev, { q: q.q, chosen: idx, correct, exp: q.exp, ans: q.ans, options: q.options }])
  }

  const next = () => {
    if (qIdx + 1 < activeQs.length) {
      setQIdx(i => i + 1); setSelected(null)
    } else {
      setFinished(true)
    }
  }

  // Unique count options capped at maxQ
  const countOptions = [...new Set([3, 5, 10, maxQ].filter(v => v <= maxQ))].sort((a, b) => a - b)

  if (!allQs.length) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '40px',
        textAlign: 'center', color: C.slate, maxWidth: '360px', width: '100%' }}>
        No practice questions for this sector yet. Coming soon!
        <br />
        <button onClick={onClose} style={{ marginTop: '16px', padding: '8px 20px',
          borderRadius: '8px', border: `1px solid ${C.border}`,
          cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>Close</button>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '560px',
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)',
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${sectorMeta?.color || C.indigo}, ${C.indigoL})`,
          padding: '20px 24px', borderRadius: '20px 20px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: '11px', fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: '.08em' }}>
              {sectorMeta?.icon} {sectorMeta?.label} Practice
            </div>
            <div style={{ color: '#fff', fontWeight: '800', fontSize: '16px', marginTop: '2px' }}>
              {phase === 'config' ? 'Configure Your Session'
               : finished ? 'Quiz Complete!'
               : `Question ${qIdx + 1} of ${activeQs.length}`}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: '8px',
            color: '#fff', fontSize: '18px', cursor: 'pointer', padding: '6px 10px',
          }}>✕</button>
        </div>

        <div style={{ padding: '24px' }}>

          {/* ── CONFIG PHASE ── */}
          {phase === 'config' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>{sectorMeta?.icon}</div>
                <div style={{ fontWeight: '800', fontSize: '17px', color: '#0f172a' }}>{sectorMeta?.label}</div>
                <div style={{ fontSize: '12px', color: C.slate, marginTop: '4px' }}>
                  {maxQ} questions available · Shuffled fresh every attempt
                </div>
              </div>

              {/* Quick-pick count buttons */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: C.slate,
                  textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '10px' }}>
                  📝 How many questions?
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {countOptions.map(n => (
                    <button key={n} onClick={() => setQCount(n)} style={{
                      flex: '1 1 56px', padding: '12px 6px', borderRadius: '10px',
                      border: `2px solid ${qCount === n ? (sectorMeta?.color || C.indigo) : C.border}`,
                      background: qCount === n ? (sectorMeta?.bg || C.indigoBg) : '#fff',
                      color: qCount === n ? (sectorMeta?.color || C.indigo) : C.slate,
                      fontFamily: 'inherit', fontWeight: '800', fontSize: '14px',
                      cursor: 'pointer', transition: 'all .15s',
                    }}>
                      {n === maxQ && !([3, 5, 10].includes(n)) ? `All (${n})` : n}
                    </button>
                  ))}
                </div>

                {/* Slider for custom count */}
                <div style={{
                  background: C.panel, borderRadius: '10px', padding: '12px 14px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    fontSize: '12px', color: C.slate, fontWeight: '600', marginBottom: '8px' }}>
                    <span>Custom: <strong style={{ color: sectorMeta?.color || C.indigo }}>{qCount} questions</strong></span>
                    <span>Bank: {maxQ} total</span>
                  </div>
                  <input type="range" min={1} max={maxQ} value={qCount}
                    onChange={e => setQCount(Number(e.target.value))}
                    style={{ width: '100%', accentColor: sectorMeta?.color || C.indigo }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    fontSize: '10px', color: C.slate, marginTop: '4px' }}>
                    <span>1</span><span>{maxQ}</span>
                  </div>
                </div>
              </div>

              {/* Feature chips */}
              <div style={{
                display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px',
              }}>
                {[
                  { icon: '🔀', text: 'Shuffled every time' },
                  { icon: '💡', text: 'Instant explanations' },
                  { icon: '📊', text: 'Score report at end' },
                ].map(f => (
                  <div key={f.text} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: C.panel, borderRadius: '20px', padding: '6px 12px',
                    fontSize: '11px', fontWeight: '600', color: '#374151',
                  }}>
                    <span>{f.icon}</span>{f.text}
                  </div>
                ))}
              </div>

              <button onClick={() => startQuiz()} style={{
                width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                background: `linear-gradient(135deg, ${sectorMeta?.color || C.indigo}, ${C.indigoL})`,
                color: '#fff', fontWeight: '800', fontSize: '15px',
                fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '.02em',
              }}>
                🚀 Start {qCount}-Question Practice
              </button>
            </div>
          )}

          {/* ── QUIZ PHASE ── */}
          {phase === 'quiz' && !finished && (() => {
            const q = activeQs[qIdx]
            return (
              <>
                {/* Progress bar */}
                <div style={{ background: C.panel, borderRadius: '99px', height: '6px', marginBottom: '4px' }}>
                  <div style={{
                    height: '6px', borderRadius: '99px',
                    background: `linear-gradient(90deg, ${sectorMeta?.color}, ${C.indigoL})`,
                    width: `${(qIdx / activeQs.length) * 100}%`, transition: 'width .3s',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  fontSize: '11px', color: C.slate, fontWeight: '600', marginBottom: '18px' }}>
                  <span>{qIdx}/{activeQs.length} done</span>
                  <span>Score: {score}/{qIdx}</span>
                </div>

                {/* Question */}
                <p style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a',
                  lineHeight: 1.55, marginBottom: '18px' }}>{q.q}</p>

                {/* Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {q.options.map((opt, i) => {
                    let bg = '#f8fafc', border = C.border, color = '#374151'
                    if (selected !== null) {
                      if (i === q.ans)  { bg = '#f0fdf4'; border = C.green;  color = C.green  }
                      if (i === selected && selected !== q.ans) { bg = '#fef2f2'; border = C.red; color = C.red }
                    }
                    return (
                      <button key={i} onClick={() => handleAnswer(i)} style={{
                        padding: '12px 16px', borderRadius: '10px', textAlign: 'left',
                        border: `1.5px solid ${border}`, background: bg, color,
                        fontSize: '13px', fontWeight: '600', fontFamily: 'inherit',
                        cursor: selected !== null ? 'default' : 'pointer',
                        transition: 'all .15s', display: 'flex', alignItems: 'center', gap: '10px',
                      }}>
                        <span style={{
                          minWidth: '24px', height: '24px', borderRadius: '50%',
                          background: selected !== null && i === q.ans ? C.green
                            : selected === i && i !== q.ans ? C.red : C.slate + '20',
                          color: selected !== null && (i === q.ans || i === selected) ? '#fff' : C.slate,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: '800',
                        }}>{String.fromCharCode(65 + i)}</span>
                        {opt}
                      </button>
                    )
                  })}
                </div>

                {/* Explanation */}
                {selected !== null && (
                  <div style={{
                    background: C.indigoBg, border: `1px solid ${C.indigo}25`,
                    borderRadius: '10px', padding: '12px 14px', marginBottom: '16px',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: C.indigo,
                      textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '4px' }}>💡 Explanation</div>
                    <p style={{ fontSize: '12px', color: '#374151', margin: 0, lineHeight: 1.6 }}>{q.exp}</p>
                  </div>
                )}

                {selected !== null && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setPhase('config')} style={{
                      padding: '11px 14px', borderRadius: '10px', border: `1.5px solid ${C.border}`,
                      background: '#f8fafc', color: C.slate, fontWeight: '700', fontSize: '12px',
                      fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0,
                    }}>⚙️ Config</button>
                    <button onClick={next} style={{
                      flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                      background: `linear-gradient(135deg, ${sectorMeta?.color || C.indigo}, ${C.indigoL})`,
                      color: '#fff', fontWeight: '800', fontSize: '14px',
                      fontFamily: 'inherit', cursor: 'pointer',
                    }}>
                      {qIdx + 1 < activeQs.length ? 'Next Question →' : 'See Results →'}
                    </button>
                  </div>
                )}
              </>
            )
          })()}

          {/* ── RESULTS PHASE ── */}
          {phase === 'quiz' && finished && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '56px', marginBottom: '12px' }}>
                {score === activeQs.length ? '🏆' : score >= activeQs.length * 0.6 ? '🎉' : '📚'}
              </div>
              <div style={{ fontWeight: '800', fontSize: '22px', color: '#0f172a', marginBottom: '8px' }}>
                {score}/{activeQs.length} Correct
              </div>
              <div style={{
                display: 'inline-block', padding: '6px 16px', borderRadius: '20px', marginBottom: '20px',
                fontSize: '13px', fontWeight: '700',
                background: score === activeQs.length ? C.greenBg : score >= activeQs.length * 0.6 ? C.amberBg : C.redBg,
                color: score === activeQs.length ? C.green : score >= activeQs.length * 0.6 ? C.amber : C.red,
              }}>
                {score === activeQs.length ? 'Perfect score! Excellent preparation!'
                 : score >= activeQs.length * 0.6 ? 'Good work! Keep practising!'
                 : 'Keep studying — every attempt makes you stronger!'}
              </div>

              {/* Answer review */}
              <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {answers.map((a, i) => (
                  <div key={i} style={{
                    background: a.correct ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${a.correct ? '#bbf7d0' : '#fecaca'}`,
                    borderRadius: '10px', padding: '10px 12px',
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '3px' }}>
                      {a.correct ? '✅' : '❌'} {a.q}
                    </div>
                    {!a.correct && (
                      <div style={{ fontSize: '11px', color: C.green }}>Correct: {a.options[a.ans]}</div>
                    )}
                    <div style={{ fontSize: '11px', color: C.slate, marginTop: '3px' }}>{a.exp}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={retry} style={{
                  flex: '1 1 90px', padding: '11px', borderRadius: '10px',
                  border: `1.5px solid ${C.border}`, background: '#f8fafc',
                  color: C.slate, fontWeight: '700', fontSize: '12px',
                  fontFamily: 'inherit', cursor: 'pointer',
                }}>🔄 Same Set</button>
                <button onClick={newSet} style={{
                  flex: '1 1 90px', padding: '11px', borderRadius: '10px',
                  border: `1.5px solid ${sectorMeta?.color || C.indigo}`,
                  background: sectorMeta?.bg || C.indigoBg,
                  color: sectorMeta?.color || C.indigo,
                  fontWeight: '700', fontSize: '12px',
                  fontFamily: 'inherit', cursor: 'pointer',
                }}>🔀 New Set</button>
                <button onClick={() => setPhase('config')} style={{
                  flex: '1 1 90px', padding: '11px', borderRadius: '10px', border: 'none',
                  background: `linear-gradient(135deg, ${sectorMeta?.color || C.indigo}, ${C.indigoL})`,
                  color: '#fff', fontWeight: '700', fontSize: '12px',
                  fontFamily: 'inherit', cursor: 'pointer',
                }}>⚙️ Change</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Panel ─────────────────────────────────────────────────────────────────
export default function CareerPathPanel() {
  const [activeSector, setActiveSector] = useState('all')
  const [search,       setSearch]       = useState('')
  const [expandedId,   setExpandedId]   = useState(null)
  const [progress,     setProgress]     = useState(loadProgress)
  const [quizSector,   setQuizSector]   = useState(null)
  const [activeTab,    setActiveTab]    = useState('paths')  // 'paths' | 'practice' | 'openings'
  const [openSector,   setOpenSector]   = useState('all')
  const [openType,     setOpenType]     = useState('all')   // 'all' | 'govt' | 'private'
  const [openSearch,   setOpenSearch]   = useState('')

  const handleProgress = useCallback((id, val) => {
    setProgress(prev => {
      const next = { ...prev, [id]: val }
      saveProgress(next)
      return next
    })
  }, [])

  const toggle = useCallback((id) => {
    setExpandedId(prev => prev === id ? null : id)
  }, [])

  const filtered = useMemo(() => {
    return CAREERS.filter(c => {
      if (activeSector !== 'all' && c.sector !== activeSector) return false
      if (search) {
        const lq = search.toLowerCase()
        return c.title.toLowerCase().includes(lq)
          || c.body.toLowerCase().includes(lq)
          || (c.tags || []).some(t => t.toLowerCase().includes(lq))
          || c.conductedBy.toLowerCase().includes(lq)
      }
      return true
    })
  }, [activeSector, search])

  const totalPaths    = CAREERS.length
  const myExploring  = Object.values(progress).filter(v => v === 'exploring' || v === 'preparing' || v === 'appearing').length
  const myAchieved   = Object.values(progress).filter(v => v === 'achieved').length
  const featuredCount = CAREERS.filter(c => c.featured).length

  // Which sectors have practice questions
  const practiseSectors = SECTORS.filter(s => s.id !== 'all' && PRACTICE_QA[s.id]?.length)

  const filteredOpenings = useMemo(() => {
    return OPENINGS.filter(o => {
      if (openSector !== 'all' && o.sector !== openSector) return false
      if (openType   !== 'all' && o.type   !== openType)   return false
      if (openSearch) {
        const lq = openSearch.toLowerCase()
        return o.title.toLowerCase().includes(lq)
          || o.org.toLowerCase().includes(lq)
          || o.desc.toLowerCase().includes(lq)
          || (o.tags || []).some(t => t.toLowerCase().includes(lq))
      }
      return true
    })
  }, [openSector, openType, openSearch])

  return (
    <div style={{ minHeight: '100%', background: C.panel, fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <style>{`
        @keyframes cp-in { from { opacity:0; translateY(8px) } to { opacity:1; transform:none } }
        .cp-card { animation: cp-in .22s ease both }
        .cp-chip { transition: all .15s }
        .cp-chip:hover { opacity: .85 }
        .cp-search:focus { border-color: #6d28d9 !important; box-shadow: 0 0 0 3px rgba(109,40,217,.1); outline: none }
        @media(max-width:768px){
          .cp-hero    { padding: 18px 16px 0 !important }
          .cp-body    { padding: 16px !important }
          .cp-stats   { grid-template-columns: repeat(2,1fr) !important }
          .cp-cats    { flex-wrap: nowrap !important }
          .cp-cats::-webkit-scrollbar { display: none }
          .cp-filters { flex-wrap: wrap !important }
          .cp-search  { flex: 1 1 100% !important }
          .cp-detail-grid { grid-template-columns: 1fr !important }
          .cp-prac-grid   { grid-template-columns: repeat(2,1fr) !important }
          .cp-open-grid   { grid-template-columns: 1fr !important }
        }
        @media(max-width:480px){
          .cp-prac-grid { grid-template-columns: 1fr !important }
        }
      `}</style>

      {/* ── Hero Header ── */}
      <div className="cp-hero" style={{
        background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 45%,#312e81 80%,#4338ca 100%)',
        padding: '28px 32px 0',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, color: '#fff', fontSize: '22px', fontWeight: '800',
              display: 'flex', alignItems: 'center', gap: '10px' }}>
              🧭 Career Compass
            </h1>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,.6)', fontSize: '12px' }}>
              India's complete student career guide — Govt · Defence · Railways · Research · Private
            </p>
          </div>
          {/* Mini stats */}
          <div style={{
            background: 'rgba(255,255,255,.1)', backdropFilter: 'blur(6px)',
            borderRadius: '12px', padding: '10px 18px',
            display: 'flex', gap: '20px',
          }}>
            {[
              { v: totalPaths,   l: 'Paths'    },
              { v: featuredCount,l: 'Popular'   },
              { v: myExploring,  l: 'Exploring' },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'center' }}>
                <div style={{ color: '#fff', fontWeight: '800', fontSize: '20px', lineHeight: 1 }}>{s.v}</div>
                <div style={{ color: 'rgba(255,255,255,.55)', fontSize: '10px',
                  textTransform: 'uppercase', letterSpacing: '.05em', marginTop: '2px' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '0', flexWrap: 'wrap' }}>
          {[
            { id: 'paths',    label: '🗺 Career Paths'      },
            { id: 'openings', label: '📋 Current Openings'  },
            { id: 'practice', label: '✍️ Practice & Prep'    },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: '700', fontSize: '13px',
              borderRadius: '10px 10px 0 0',
              background: activeTab === t.id ? '#fff' : 'rgba(255,255,255,.12)',
              color: activeTab === t.id ? C.indigoD : 'rgba(255,255,255,.8)',
              transition: 'all .15s',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* ── Tab: Career Paths ── */}
      {activeTab === 'paths' && (
        <div>
          {/* Sector chips strip */}
          <div style={{
            background: 'linear-gradient(135deg,#1e1b4b,#312e81)',
            padding: '0 32px 16px',
          }}>
            <div className="cp-cats" style={{
              display: 'flex', gap: '6px', overflowX: 'auto',
              WebkitOverflowScrolling: 'touch', paddingTop: '12px',
            }}>
              {SECTORS.map(s => (
                <button key={s.id} className="cp-chip"
                  onClick={() => setActiveSector(s.id)}
                  style={{
                    padding: '7px 14px', borderRadius: '999px', border: 'none',
                    fontSize: '12px', fontWeight: '600', fontFamily: 'inherit',
                    cursor: 'pointer', flexShrink: 0,
                    background: activeSector === s.id ? '#fff' : 'rgba(255,255,255,.13)',
                    color: activeSector === s.id ? C.indigoD : 'rgba(255,255,255,.85)',
                    boxShadow: activeSector === s.id ? '0 2px 8px rgba(0,0,0,.2)' : 'none',
                  }}
                >{s.icon} {s.label}</button>
              ))}
            </div>
          </div>

          <div className="cp-body" style={{ padding: '24px 32px', maxWidth: '1280px', margin: '0 auto' }}>
            {/* Stats row */}
            <div className="cp-stats" style={{
              display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
              gap: '14px', marginBottom: '22px',
            }}>
              {[
                { icon: '🗺️', label: 'Career Paths',   value: totalPaths,    color: C.indigo, bg: C.indigoBg },
                { icon: '⭐', label: 'Popular Paths',   value: featuredCount, color: C.amber,  bg: C.amberBg  },
                { icon: '📚', label: 'In Progress',     value: myExploring,   color: C.blue,   bg: C.blueBg   },
                { icon: '🏆', label: 'Achieved',        value: myAchieved,    color: C.green,  bg: C.greenBg  },
              ].map(s => (
                <div key={s.label} style={{
                  background: s.bg, border: `1.5px solid ${s.color}25`,
                  borderRadius: '14px', padding: '16px 14px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '22px', marginBottom: '5px' }}>{s.icon}</div>
                  <div style={{ fontWeight: '800', fontSize: '24px', color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: C.slate, marginTop: '4px', fontWeight: '600',
                    textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Search bar */}
            <div className="cp-filters" style={{
              background: '#fff', border: `1px solid ${C.border}`, borderRadius: '14px',
              padding: '14px 16px', marginBottom: '20px',
              display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap',
              boxShadow: '0 1px 4px rgba(0,0,0,.04)',
            }}>
              <input
                className="cp-search"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍  Search by career, exam name, body, skill…"
                style={{
                  flex: '1 1 220px', padding: '10px 14px', borderRadius: '8px',
                  border: `1.5px solid ${C.border}`, fontSize: '13px',
                  fontFamily: 'inherit', color: '#0f172a',
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{
                  padding: '9px 14px', borderRadius: '8px', border: `1px solid ${C.border}`,
                  background: '#f8fafc', color: C.slate, fontSize: '12px',
                  fontFamily: 'inherit', fontWeight: '600', cursor: 'pointer',
                }}>✕ Clear</button>
              )}
            </div>

            {/* Result count */}
            <div style={{ marginBottom: '14px', fontSize: '13px', color: C.slate, fontWeight: '600',
              display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                background: C.indigoBg, color: C.indigo, padding: '2px 10px',
                borderRadius: '20px', fontWeight: '700', fontSize: '13px',
              }}>{filtered.length}</span>
              path{filtered.length !== 1 ? 's' : ''} found
              {activeSector !== 'all' && <span> · <strong>{SECTORS.find(s => s.id === activeSector)?.label}</strong></span>}
            </div>

            {/* Career cards */}
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: C.slate }}>
                <div style={{ fontSize: '48px', marginBottom: '14px' }}>🔍</div>
                <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '6px' }}>No careers found</div>
                <div style={{ fontSize: '13px' }}>Try a different sector or search term</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filtered.map((career, i) => (
                  <div key={career.id} className="cp-card"
                    style={{ animationDelay: `${Math.min(i, 12) * 0.04}s` }}>
                    <CareerCard
                      career={career}
                      expanded={expandedId === career.id}
                      onToggle={() => toggle(career.id)}
                      progress={progress}
                      onProgress={handleProgress}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Practice & Prep ── */}
      {activeTab === 'practice' && (
        <div className="cp-body" style={{ padding: '24px 32px', maxWidth: '1280px', margin: '0 auto' }}>
          {/* Hero banner */}
          <div style={{
            background: 'linear-gradient(135deg,#1e1b4b,#4338ca)',
            borderRadius: '18px', padding: '24px', marginBottom: '24px',
            display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: '48px' }}>🎯</div>
            <div>
              <div style={{ color: '#fff', fontWeight: '800', fontSize: '18px' }}>Practice Like a Coaching Centre</div>
              <div style={{ color: 'rgba(255,255,255,.7)', fontSize: '13px', marginTop: '4px', lineHeight: 1.5 }}>
                Sector-wise MCQ practice with instant explanations — just like private coaching classes.<br />
                Select a sector below and start your timed practice session.
              </div>
            </div>
          </div>

          {/* Info strip */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px',
          }}
            className="cp-stats"
          >
            {[
              { icon: '📝', label: 'MCQ Format', desc: 'Multiple choice with 4 options per question' },
              { icon: '🔀', label: 'Random Sets', desc: 'Pick how many Qs — shuffled fresh every attempt' },
              { icon: '💡', label: 'Instant Explanations', desc: 'Detailed explanation after every answer' },
              { icon: '📊', label: 'Score Report', desc: 'Full review of right & wrong answers at end' },
            ].map(i => (
              <div key={i.label} style={{
                background: '#fff', border: `1.5px solid ${C.border}`,
                borderRadius: '14px', padding: '16px', display: 'flex', gap: '12px',
              }}>
                <div style={{ fontSize: '24px', flexShrink: 0 }}>{i.icon}</div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>{i.label}</div>
                  <div style={{ fontSize: '12px', color: C.slate, marginTop: '3px', lineHeight: 1.4 }}>{i.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Sector pick grid */}
          <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: '700', color: C.slate,
            textTransform: 'uppercase', letterSpacing: '.05em' }}>Choose a Sector to Practice</div>
          <div className="cp-prac-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px',
          }}>
            {practiseSectors.map(s => {
              const qCount = PRACTICE_QA[s.id]?.length || 0
              return (
                <button key={s.id} onClick={() => setQuizSector(s.id)} style={{
                  background: '#fff', border: `1.5px solid ${s.color}30`,
                  borderRadius: '14px', padding: '20px 16px', cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left',
                  transition: 'all .15s', boxShadow: '0 1px 4px rgba(0,0,0,.04)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.boxShadow = `0 4px 20px ${s.color}20` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = s.color + '30'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.04)' }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>{s.icon}</div>
                  <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>{s.label}</div>
                  <div style={{ fontSize: '11px', color: C.slate, marginBottom: '12px' }}>Up to {qCount} Questions</div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 14px', borderRadius: '999px',
                    background: s.bg, color: s.color, fontSize: '12px', fontWeight: '700',
                  }}>Configure & Start →</div>
                </button>
              )
            })}
          </div>

          {/* Tips section */}
          <div style={{
            background: '#fff', border: `1.5px solid ${C.border}`,
            borderRadius: '16px', padding: '20px 24px', marginTop: '24px',
          }}>
            <div style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a', marginBottom: '14px' }}>
              📖 Expert Preparation Tips
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '12px' }}>
              {[
                { icon: '🗓', tip: 'Create a daily study schedule and stick to it. Consistency beats cramming every time.' },
                { icon: '📰', tip: 'Read one quality newspaper daily (The Hindu / Indian Express) for current affairs.' },
                { icon: '📚', tip: 'Complete NCERT books (Class 6–12) before moving to advanced material for UPSC/SSC.' },
                { icon: '🧪', tip: 'Attempt at least 2 full-length mock tests per week in the last 3 months before your exam.' },
                { icon: '🔁', tip: 'Revise previous years\' papers — most exams repeat 30–40% of question patterns.' },
                { icon: '👥', tip: 'Join a study group or online community (Telegram, Discord) to stay motivated and share notes.' },
              ].map((t, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '10px', padding: '12px',
                  background: C.panel, borderRadius: '10px',
                }}>
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>{t.icon}</span>
                  <span style={{ fontSize: '12px', color: '#374151', lineHeight: 1.55 }}>{t.tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Current Openings ── */}
      {activeTab === 'openings' && (
        <div className="cp-body" style={{ padding: '24px 32px', maxWidth: '1280px', margin: '0 auto' }}>

          {/* Hero banner */}
          <div style={{
            background: 'linear-gradient(135deg,#065f46,#16a34a)',
            borderRadius: '18px', padding: '22px 24px', marginBottom: '22px',
            display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: '44px' }}>📋</div>
            <div>
              <div style={{ color: '#fff', fontWeight: '800', fontSize: '18px' }}>Current Job Openings</div>
              <div style={{ color: 'rgba(255,255,255,.75)', fontSize: '12px', marginTop: '4px', lineHeight: 1.55 }}>
                Live portals for Govt & Private openings — click <strong style={{color:'#bbf7d0'}}>View Notification</strong> to see latest details,
                then <strong style={{color:'#bbf7d0'}}>Apply Online</strong> to go directly to the official application page.
              </div>
            </div>
          </div>

          {/* Quick portal stats */}
          <div className="cp-stats" style={{
            display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '22px',
          }}>
            {[
              { icon: '🏛️', label: 'Govt Portals',   value: OPENINGS.filter(o=>o.type==='govt').length,    color: C.blue,   bg: C.blueBg    },
              { icon: '💼', label: 'Private Portals', value: OPENINGS.filter(o=>o.type==='private').length, color: C.amber,  bg: C.amberBg   },
              { icon: '⭐', label: 'Featured',        value: OPENINGS.filter(o=>o.featured).length,         color: C.orange, bg: C.orangeBg  },
              { icon: '🔍', label: 'Showing Now',     value: filteredOpenings.length,                       color: C.indigo, bg: C.indigoBg  },
            ].map(s => (
              <div key={s.label} style={{
                background: s.bg, border: `1.5px solid ${s.color}25`,
                borderRadius: '14px', padding: '14px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
                <div style={{ fontWeight: '800', fontSize: '22px', color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '10px', color: C.slate, marginTop: '4px', fontWeight: '600',
                  textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{
            background: '#fff', border: `1px solid ${C.border}`, borderRadius: '14px',
            padding: '14px 16px', marginBottom: '18px',
            display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap',
            boxShadow: '0 1px 4px rgba(0,0,0,.04)',
          }}>
            <input
              type="text"
              value={openSearch}
              onChange={e => setOpenSearch(e.target.value)}
              placeholder="🔍 Search by organisation, exam, skill, sector…"
              className="cp-search"
              style={{
                flex: '2 1 220px', padding: '10px 14px', borderRadius: '8px',
                border: `1.5px solid ${C.border}`, fontSize: '13px',
                fontFamily: 'inherit', color: '#0f172a',
              }}
            />
            {/* Type filter */}
            {['all','govt','private'].map(t => (
              <button key={t} onClick={() => setOpenType(t)} style={{
                padding: '8px 14px', borderRadius: '8px', border: `1.5px solid ${openType===t ? C.indigo : C.border}`,
                background: openType===t ? C.indigoBg : '#f8fafc',
                color: openType===t ? C.indigo : C.slate,
                fontFamily: 'inherit', fontWeight: '700', fontSize: '12px', cursor: 'pointer',
              }}>{ t==='all' ? '🌐 All' : t==='govt' ? '🏛️ Govt' : '💼 Private' }</button>
            ))}
            {/* Sector select */}
            <select
              value={openSector}
              onChange={e => setOpenSector(e.target.value)}
              style={{
                flex: '1 1 160px', minWidth: 0, padding: '9px 12px', borderRadius: '8px',
                border: `1.5px solid ${C.border}`, fontSize: '12px', fontFamily: 'inherit',
                color: '#374151', background: '#fff', cursor: 'pointer', outline: 'none',
              }}
            >
              {SECTORS.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
            </select>
            {(openSearch || openSector !== 'all' || openType !== 'all') && (
              <button onClick={() => { setOpenSearch(''); setOpenSector('all'); setOpenType('all') }} style={{
                padding: '9px 13px', borderRadius: '8px', border: `1px solid ${C.border}`,
                background: '#f8fafc', color: C.slate, fontSize: '12px',
                fontFamily: 'inherit', fontWeight: '600', cursor: 'pointer',
              }}>✕ Clear</button>
            )}
          </div>

          {/* Result count */}
          <div style={{ marginBottom: '14px', fontSize: '13px', color: C.slate, fontWeight: '600',
            display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              background: C.greenBg, color: C.green, padding: '2px 10px',
              borderRadius: '20px', fontWeight: '700', fontSize: '13px',
            }}>{filteredOpenings.length}</span>
            portal{filteredOpenings.length !== 1 ? 's' : ''} found
          </div>

          {/* Openings grid */}
          {filteredOpenings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: C.slate }}>
              <div style={{ fontSize: '48px', marginBottom: '14px' }}>🔍</div>
              <div style={{ fontWeight: '700', fontSize: '16px' }}>No openings found</div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>Try adjusting filters or search</div>
            </div>
          ) : (
            <div className="cp-open-grid" style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '14px',
            }}>
              {filteredOpenings.map((o, i) => {
                const sec = SECTORS.find(s => s.id === o.sector) || SECTORS[0]
                const typeColor = o.type === 'govt' ? C.blue : C.amber
                const typeBg    = o.type === 'govt' ? C.blueBg : C.amberBg
                const typeLabel = o.type === 'govt' ? '🏛️ Government' : '💼 Private'
                return (
                  <div key={o.id} className="cp-card"
                    style={{ animationDelay: `${Math.min(i,12)*0.04}s`,
                      background: '#fff', borderRadius: '16px',
                      border: `1.5px solid ${C.border}`,
                      boxShadow: '0 1px 6px rgba(0,0,0,.05)',
                      overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    }}
                  >
                    {/* Card top accent bar */}
                    <div style={{ height: '4px', background: `linear-gradient(90deg,${sec.color},${typeColor})` }} />

                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
                          background: sec.bg, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '18px',
                          border: `1.5px solid ${sec.color}25`,
                        }}>{sec.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a',
                            lineHeight: 1.3, marginBottom: '4px' }}>{o.title}</div>
                          <div style={{ fontSize: '11px', color: sec.color, fontWeight: '600' }}>{o.org}</div>
                        </div>
                        {o.featured && (
                          <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 7px',
                            borderRadius: '20px', background: '#fef3c7', color: '#92400e',
                            textTransform: 'uppercase', letterSpacing: '.04em', flexShrink: 0 }}>⭐ Hot</span>
                        )}
                      </div>

                      {/* Type + sector tags */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px',
                          borderRadius: '20px', background: typeBg, color: typeColor }}>{typeLabel}</span>
                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px',
                          borderRadius: '20px', background: sec.bg, color: sec.color }}>{sec.icon} {sec.label}</span>
                      </div>

                      {/* Description */}
                      <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.55, flex: 1 }}>
                        {o.desc}
                      </p>

                      {/* Eligibility */}
                      <div style={{
                        background: C.panel, borderRadius: '8px', padding: '8px 10px',
                        fontSize: '11px', color: '#374151', lineHeight: 1.4,
                      }}>
                        <span style={{ fontWeight: '700', color: C.slate }}>✅ Eligibility: </span>{o.eligibility}
                      </div>

                      {/* Updated badge */}
                      <div style={{ fontSize: '10px', color: C.slate, fontWeight: '600' }}>
                        🔄 Updated: <span style={{ color: C.green }}>{o.lastUpdated}</span>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                        <a href={o.notifUrl} target="_blank" rel="noopener noreferrer"
                          style={{
                            flex: 1, padding: '9px 10px', borderRadius: '8px',
                            border: `1.5px solid ${C.border}`,
                            background: '#f8fafc', color: '#374151',
                            fontSize: '11px', fontWeight: '700', textDecoration: 'none',
                            textAlign: 'center', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: '4px',
                          }}
                        >📄 View Notification</a>
                        <a href={o.applyUrl} target="_blank" rel="noopener noreferrer"
                          style={{
                            flex: 1, padding: '9px 10px', borderRadius: '8px', border: 'none',
                            background: `linear-gradient(135deg,${sec.color},${typeColor})`,
                            color: '#fff', fontSize: '11px', fontWeight: '700',
                            textDecoration: 'none', textAlign: 'center',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: '4px',
                          }}
                        >🖊️ Apply Online ↗</a>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Disclaimer */}
          <div style={{
            marginTop: '28px', background: C.amberBg, border: `1px solid #fde68a`,
            borderRadius: '12px', padding: '14px 16px',
            display: 'flex', gap: '10px', alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
            <div style={{ fontSize: '12px', color: '#92400e', lineHeight: 1.6 }}>
              <strong>Disclaimer:</strong> This panel links to official government portals and well-known private platforms.
              Always verify notification details, last dates and eligibility on the original official website before applying.
              Arthavi does not manage or store any application data.
            </div>
          </div>
        </div>
      )}

      {/* ── Practice Quiz Modal ── */}
      {quizSector && (
        <PracticeQuiz sector={quizSector} onClose={() => setQuizSector(null)} />
      )}
    </div>
  )
}
