// ─────────────────────────────────────────────────────────────────────────────
// India Curriculum Master Data
// All 28 states + 8 UTs, every national + state board, subjects per class,
// hardcoded chapter lists, and official government PDF URLs
// ─────────────────────────────────────────────────────────────────────────────

// ── All Indian States & Union Territories ────────────────────────────────────
export const INDIA_STATES = [
  // States
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  // Union Territories
  'Andaman & Nicobar Islands', 'Chandigarh', 'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi (NCT)', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
]

// ── Board definitions per state ───────────────────────────────────────────────
// Each entry: { name, shortName, type: 'national'|'state', govUrl }
export const STATE_BOARDS = {
  'Andhra Pradesh':   [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'BSEAP (Andhra Pradesh Board)', shortName: 'BSEAP', type: 'state', govUrl: 'https://bse.ap.gov.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Arunachal Pradesh': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'CBSE (DIET Arunachal)', shortName: 'CBSE-AP', type: 'state', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Assam': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'SEBA (Assam Board)', shortName: 'SEBA', type: 'state', govUrl: 'https://sebaonline.org' },
    { name: 'AHSEC (Assam Higher Secondary)', shortName: 'AHSEC', type: 'state', govUrl: 'https://ahsec.nic.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Bihar': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'BSEB (Bihar Board)', shortName: 'BSEB', type: 'state', govUrl: 'https://biharboardonline.com' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Chhattisgarh': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'CGBSE (Chhattisgarh Board)', shortName: 'CGBSE', type: 'state', govUrl: 'https://cgbse.nic.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Goa': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'GBSHSE (Goa Board)', shortName: 'GBSHSE', type: 'state', govUrl: 'https://gbshse.info' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Gujarat': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'GSEB (Gujarat Board)', shortName: 'GSEB', type: 'state', govUrl: 'https://gseb.org' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Haryana': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'HBSE (Haryana Board)', shortName: 'HBSE', type: 'state', govUrl: 'https://bseh.org.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Himachal Pradesh': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'HPBOSE (HP Board)', shortName: 'HPBOSE', type: 'state', govUrl: 'https://hpbose.org' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Jharkhand': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'JAC (Jharkhand Board)', shortName: 'JAC', type: 'state', govUrl: 'https://jac.jharkhand.gov.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Karnataka': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'KSEEB (Karnataka Board)', shortName: 'KSEEB', type: 'state', govUrl: 'https://kseeb.kar.nic.in' },
    { name: 'PUC (Karnataka PU Board)', shortName: 'PUC', type: 'state', govUrl: 'https://pue.kar.nic.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Kerala': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'KBPE (Kerala Board)', shortName: 'KBPE', type: 'state', govUrl: 'https://keralapareekshabhavan.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Madhya Pradesh': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'MPBSE (MP Board)', shortName: 'MPBSE', type: 'state', govUrl: 'https://mpbse.nic.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Maharashtra': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'MSBSHSE (Maharashtra Board)', shortName: 'MSBSHSE', type: 'state', govUrl: 'https://mahahsscboard.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
    { name: 'IB (International Baccalaureate)', shortName: 'IB', type: 'national', govUrl: 'https://ibo.org' },
  ],
  'Manipur': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'BSEM (Manipur Board)', shortName: 'BSEM', type: 'state', govUrl: 'https://bsem.nic.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Meghalaya': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'MBOSE (Meghalaya Board)', shortName: 'MBOSE', type: 'state', govUrl: 'https://mbose.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Mizoram': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'MBSE (Mizoram Board)', shortName: 'MBSE', type: 'state', govUrl: 'https://mbse.edu.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Nagaland': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'NBSE (Nagaland Board)', shortName: 'NBSE', type: 'state', govUrl: 'https://nbsenagaland.com' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Odisha': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'BSE Odisha (Odisha Board)', shortName: 'BSE', type: 'state', govUrl: 'https://bseodisha.ac.in' },
    { name: 'CHSE Odisha (Higher Secondary)', shortName: 'CHSE', type: 'state', govUrl: 'https://chseodisha.nic.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Punjab': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'PSEB (Punjab Board)', shortName: 'PSEB', type: 'state', govUrl: 'https://pseb.ac.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Rajasthan': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'RBSE (Rajasthan Board)', shortName: 'RBSE', type: 'state', govUrl: 'https://rajeduboard.rajasthan.gov.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Sikkim': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'BSSS (Sikkim Board)', shortName: 'BSSS', type: 'state', govUrl: 'https://sikkimhrdd.org' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Tamil Nadu': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'TNBSE (Tamil Nadu Board)', shortName: 'TNBSE', type: 'state', govUrl: 'https://dge.tn.gov.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Telangana': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'BSETS (Telangana Board)', shortName: 'BSETS', type: 'state', govUrl: 'https://bse.telangana.gov.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Tripura': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'TBSE (Tripura Board)', shortName: 'TBSE', type: 'state', govUrl: 'https://tbse.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Uttar Pradesh': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'UPMSP (UP Board)', shortName: 'UPMSP', type: 'state', govUrl: 'https://upmsp.edu.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Uttarakhand': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'UBSE (Uttarakhand Board)', shortName: 'UBSE', type: 'state', govUrl: 'https://ubse.uk.gov.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'West Bengal': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'WBBSE (West Bengal Board — Sec.)', shortName: 'WBBSE', type: 'state', govUrl: 'https://wbbse.wb.gov.in' },
    { name: 'WBCHSE (West Bengal Board — HS)', shortName: 'WBCHSE', type: 'state', govUrl: 'https://wbchse.wb.gov.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  // UTs
  'Andaman & Nicobar Islands': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Chandigarh': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'PSEB (Punjab Board)', shortName: 'PSEB', type: 'state', govUrl: 'https://pseb.ac.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Dadra & Nagar Haveli and Daman & Diu': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'GSEB (Gujarat Board)', shortName: 'GSEB', type: 'state', govUrl: 'https://gseb.org' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Delhi (NCT)': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
    { name: 'NIOS (National Institute of Open Schooling)', shortName: 'NIOS', type: 'national', govUrl: 'https://nios.ac.in' },
    { name: 'DoE Delhi (Directorate of Education)', shortName: 'DoE', type: 'state', govUrl: 'https://www.edudel.nic.in' },
  ],
  'Jammu & Kashmir': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'JKBOSE (J&K Board)', shortName: 'JKBOSE', type: 'state', govUrl: 'https://jkbose.nic.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Ladakh': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'JKBOSE (J&K Board)', shortName: 'JKBOSE', type: 'state', govUrl: 'https://jkbose.nic.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Lakshadweep': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Puducherry': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'TBSE (Puducherry Board)', shortName: 'PBSE', type: 'state', govUrl: 'https://schooledn.py.gov.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
}

// ── Add ISC as a separate board to every state that has ICSE ─────────────────
// ICSE = Classes 1–10 (CISCE + Reference Books)
// ISC  = Classes 11–12 (CISCE only)
const _ISC_BOARD = { name: 'ISC (CISCE — Grades 11-12)', shortName: 'ISC', type: 'national', govUrl: 'https://cisce.org' }
Object.keys(STATE_BOARDS).forEach(state => {
  if (STATE_BOARDS[state].some(b => b.shortName === 'ICSE')) {
    STATE_BOARDS[state].push({ ..._ISC_BOARD })
  }
})

// ── Subjects per board and class range ───────────────────────────────────────
export function getSubjects(boardShortName, classNum) {
  const n = parseInt(classNum)
  // CBSE / NCERT based subjects
  // ISC is the CISCE senior secondary board (classes 11-12); treat like ICSE
  if (['CBSE', 'ICSE', 'ISC', 'NIOS', 'DoE', 'IB'].includes(boardShortName)) {
    if (n <= 2)  return ['English', 'Mathematics', 'Environmental Studies', 'Hindi', 'General Knowledge']
    if (n <= 5)  return ['English', 'Mathematics', 'Environmental Studies', 'Hindi', 'General Knowledge', 'Computer Science']
    if (n <= 8)  return ['English', 'Mathematics', 'Science', 'Social Science', 'Hindi', 'Sanskrit', 'Computer Science']
    if (n <= 10) return ['English', 'Mathematics', 'Science', 'Social Science', 'Hindi', 'Sanskrit', 'Computer Science', 'Physical Education']
    // 11-12
    if (boardShortName === 'ICSE' || boardShortName === 'ISC') {
      return ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
              'History', 'Geography', 'Economics', 'Commerce', 'Accounts', 'Business Studies', 'Sociology', 'Psychology']
    }
    return ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
            'History', 'Geography', 'Economics', 'Accountancy', 'Business Studies',
            'Political Science', 'Sociology', 'Psychology', 'Physical Education', 'Hindi', 'Physical Education']
  }

  // State board subjects (most follow NCERT pattern with local language addition)
  const stateBoards = ['BSEAP','SEBA','AHSEC','BSEB','CGBSE','GBSHSE','GSEB','HBSE',
    'HPBOSE','JAC','KSEEB','PUC','KBPE','MPBSE','MSBSHSE','BSEM','MBOSE','MBSE',
    'NBSE','BSE','CHSE','PSEB','RBSE','BSSS','TNBSE','BSETS','TBSE','UPMSP',
    'UBSE','WBBSE','WBCHSE','JKBOSE','PBSE']

  const localLangs = {
    'BSEAP': 'Telugu', 'TNBSE': 'Tamil', 'BSETS': 'Telugu', 'KSEEB': 'Kannada',
    'KBPE': 'Malayalam', 'MSBSHSE': 'Marathi', 'GSEB': 'Gujarati', 'RBSE': 'Rajasthani/Hindi',
    'WBBSE': 'Bengali', 'WBCHSE': 'Bengali', 'UPMSP': 'Hindi', 'BSEB': 'Hindi',
    'MPBSE': 'Hindi', 'HBSE': 'Hindi', 'PSEB': 'Punjabi', 'JKBOSE': 'Urdu/Kashmiri',
    'BSE': 'Odia', 'CHSE': 'Odia', 'SEBA': 'Assamese', 'AHSEC': 'Assamese',
    'JAC': 'Hindi', 'HPBOSE': 'Hindi', 'UBSE': 'Hindi', 'GBSHSE': 'Konkani/Marathi',
  }
  const lang = localLangs[boardShortName] || 'Regional Language'

  if (n <= 2)  return ['English', 'Mathematics', 'Environmental Studies', 'Hindi', lang]
  if (n <= 5)  return ['English', 'Mathematics', 'Environmental Studies', 'Hindi', lang, 'General Knowledge']
  if (n <= 8)  return ['English', 'Mathematics', 'Science', 'Social Science', 'Hindi', lang, 'Sanskrit']
  if (n <= 10) return ['English', 'Mathematics', 'Science', 'Social Science', 'Hindi', lang, 'Sanskrit', 'Computer Science']
  return ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
          'History', 'Geography', 'Economics', 'Accountancy', 'Business Studies', lang, 'Hindi']
}

// ── Official government PDF URLs ──────────────────────────────────────────────
// Keyed by (classKey, subjectKey) e.g. ('class10', 'science')
export const OFFICIAL_PDF_URLS = {
  // NCERT Science / EVS
  'class1_environmental studies':  'https://ncert.nic.in/textbook.php?aevs1=',
  'class2_environmental studies':  'https://ncert.nic.in/textbook.php?bevs1=',
  'class3_environmental studies':  'https://ncert.nic.in/textbook.php?cevs1=',
  'class4_environmental studies':  'https://ncert.nic.in/textbook.php?devs1=',
  'class5_environmental studies':  'https://ncert.nic.in/textbook.php?eevs1=',
  // Class 6 Science: new 2023-24 'Curiosity' textbook — direct PDF URL unavailable, Google fallback used
  'class7_science':                'https://ncert.nic.in/textbook.php?hesc2=',    // Old rationalized Science
  'class8_science':                'https://ncert.nic.in/textbook.php?hesc3=',
  'class9_science':                'https://ncert.nic.in/textbook.php?iesc1=',
  'class10_science':               'https://ncert.nic.in/textbook.php?jesc1=',
  'class11_physics':               'https://ncert.nic.in/textbook.php?leph1=',
  'class12_physics':               'https://ncert.nic.in/textbook.php?leph2=',
  'class11_chemistry':             'https://ncert.nic.in/textbook.php?lech1=',
  'class12_chemistry':             'https://ncert.nic.in/textbook.php?lech2=',
  'class11_biology':               'https://ncert.nic.in/textbook.php?lebo1=',
  'class12_biology':               'https://ncert.nic.in/textbook.php?lebo2=',
  // NCERT Mathematics
  'class1_mathematics':            'https://ncert.nic.in/textbook.php?aemh1=',
  'class2_mathematics':            'https://ncert.nic.in/textbook.php?bemh1=',
  'class3_mathematics':            'https://ncert.nic.in/textbook.php?cemh1=',
  'class4_mathematics':            'https://ncert.nic.in/textbook.php?demh1=',
  'class5_mathematics':            'https://ncert.nic.in/textbook.php?eemh1=',
  // Class 6 Mathematics: new 2023-24 'Ganita Prakash' textbook — direct PDF URL unavailable, Google fallback used
  'class7_mathematics':            'https://ncert.nic.in/textbook.php?hemh2=',    // Old rationalized Maths
  'class8_mathematics':            'https://ncert.nic.in/textbook.php?hemh3=',
  'class9_mathematics':            'https://ncert.nic.in/textbook.php?iemh1=',
  'class10_mathematics':           'https://ncert.nic.in/textbook.php?jemh1=',
  'class11_mathematics':           'https://ncert.nic.in/textbook.php?lemh1=',
  'class12_mathematics':           'https://ncert.nic.in/textbook.php?lemh2=',
  // NCERT English
  'class1_english':                'https://ncert.nic.in/textbook.php?aeen1=',
  'class2_english':                'https://ncert.nic.in/textbook.php?been1=',
  'class3_english':                'https://ncert.nic.in/textbook.php?ceen1=',
  'class4_english':                'https://ncert.nic.in/textbook.php?deen1=',
  'class5_english':                'https://ncert.nic.in/textbook.php?eeen1=',
  // Class 6 Honeysuckle: direct NCERT URL broken (404) — Google search fallback used
  // Class 7 Honeycomb: direct NCERT URL broken (404) — Google search fallback used
  'class8_english':                'https://ncert.nic.in/textbook.php?hehd1=',    // Honeydew
  'class9_english':                'https://ncert.nic.in/textbook.php?iebe1=',    // Beehive
  'class10_english':               'https://ncert.nic.in/textbook.php?jeff1=',    // First Flight
  'class11_english':               'https://ncert.nic.in/textbook.php?leen1=',
  'class12_english':               'https://ncert.nic.in/textbook.php?leen2=',
  // NCERT Hindi
  'class1_hindi':                  'https://ncert.nic.in/textbook.php?aehn1=',
  'class2_hindi':                  'https://ncert.nic.in/textbook.php?behn1=',
  'class3_hindi':                  'https://ncert.nic.in/textbook.php?cehn1=',
  'class4_hindi':                  'https://ncert.nic.in/textbook.php?dehn1=',
  'class5_hindi':                  'https://ncert.nic.in/textbook.php?eehn1=',
  'class6_hindi':                  'https://ncert.nic.in/textbook.php?hhvs1=',    // Vasant Part 1
  // Class 7 Vasant 2: direct NCERT URL not found — Google search fallback used
  // Class 8 Vasant 3: direct NCERT URL not found — Google search fallback used
  'class9_hindi':                  'https://ncert.nic.in/textbook.php?ihks1=',    // Kshitij 1
  'class10_hindi':                 'https://ncert.nic.in/textbook.php?jhks1=',    // Kshitij 2
  'class11_hindi':                 'https://ncert.nic.in/textbook.php?lehn1=',
  'class12_hindi':                 'https://ncert.nic.in/textbook.php?lehn2=',    // Antra / Vitan
  // NCERT Social Science — each class has 3–4 separate textbooks.
  // These primary URLs are kept for fallback; sub-book selector provides individual links.
  'class6_social science':         'https://ncert.nic.in/textbook.php?hess1=',    // Our Pasts (Class 6 history bundle)
  'class7_social science':         'https://ncert.nic.in/textbook.php?hess2=',    // Our Pasts (Class 7 history bundle)
  'class8_social science':         'https://ncert.nic.in/textbook.php?hess3=',    // Social & Political Life (Class 8)
  'class9_social science':         'https://ncert.nic.in/textbook.php?iess3=',    // India & Cont. World-I (History)
  'class10_social science':        'https://ncert.nic.in/textbook.php?jess3=',    // India & Cont. World-II (History),
  // NCERT Class 11-12 Humanities
  'class11_history':               'https://ncert.nic.in/textbook.php?lehs1=',
  'class12_history':               'https://ncert.nic.in/textbook.php?lehs2=',
  'class11_geography':             'https://ncert.nic.in/textbook.php?legy1=',
  'class12_geography':             'https://ncert.nic.in/textbook.php?legy2=',
  'class11_political science':     'https://ncert.nic.in/textbook.php?leps1=',
  'class12_political science':     'https://ncert.nic.in/textbook.php?leps2=',
  'class11_economics':             'https://ncert.nic.in/textbook.php?leec1=',
  'class12_economics':             'https://ncert.nic.in/textbook.php?leec2=',
  'class11_sociology':             'https://ncert.nic.in/textbook.php?leso1=',
  'class12_sociology':             'https://ncert.nic.in/textbook.php?leso2=',
  'class11_psychology':            'https://ncert.nic.in/textbook.php?lepy1=',
  'class12_psychology':            'https://ncert.nic.in/textbook.php?lepy2=',
  'class12_accountancy':           'https://ncert.nic.in/textbook.php?leac2=',
  'class12_business studies':      'https://ncert.nic.in/textbook.php?lebs2=',
  'class11_computer science':      'https://ncert.nic.in/textbook.php?lecs1=',
  'class12_computer science':      'https://ncert.nic.in/textbook.php?lecs2=',
  // Sanskrit
  'class6_sanskrit':               'https://ncert.nic.in/textbook.php?hesa1=',
  'class7_sanskrit':               'https://ncert.nic.in/textbook.php?hesa2=',
  'class8_sanskrit':               'https://ncert.nic.in/textbook.php?hesa3=',
  'class9_sanskrit':               'https://ncert.nic.in/textbook.php?iesa1=',
  'class10_sanskrit':              'https://ncert.nic.in/textbook.php?jesa1=',
}

// Helper: get PDF URL for a class+subject combo
export function getPdfUrl(classNum, subject) {
  const key = `class${classNum}_${subject.toLowerCase()}`
  return OFFICIAL_PDF_URLS[key] || null
}

// Supplementary (second) textbook PDFs for subjects that have two books
export const SUPPLEMENTARY_PDF_URLS = {
  'class9_english':  'https://ncert.nic.in/textbook.php?iemo1=',   // Moments Supplementary Reader
  'class10_english': 'https://ncert.nic.in/textbook.php?jefp1=',   // Footprints without Feet
  'class9_hindi':    'https://ncert.nic.in/textbook.php?ihkr1=',   // Kritika Part 1
  'class10_hindi':   'https://ncert.nic.in/textbook.php?jhkr1=',   // Kritika Part 2
}

export function getSuppPdfUrl(classNum, subject) {
  return SUPPLEMENTARY_PDF_URLS[`class${classNum}_${subject.toLowerCase()}`] || null
}

// ── Social Science sub-books ──────────────────────────────────────────────────
// NCERT Social Science has 3–4 separate textbooks per class.
// Chapter prefixes in CHAPTERS_DB: "History Ch", "Geography Ch", "Civics Ch",
// "Political Science Ch", "Economics Ch"
// PDF codes verified via ncert.nic.in/textbook.php
export const SOCIAL_SCIENCE_SUB_BOOKS = {
  6: [
    { id: 'history',   label: '📜 History',   title: 'Our Pasts-I',                  pdf: null },
    { id: 'geography', label: '🌍 Geography', title: 'The Earth Our Habitat',         pdf: null },
    { id: 'civics',    label: '⚖️ Civics',    title: 'Social & Political Life-I',     pdf: null },
  ],
  7: [
    { id: 'history',   label: '📜 History',   title: 'Our Pasts-II',                 pdf: null },
    { id: 'geography', label: '🌍 Geography', title: 'Our Environment',              pdf: null },
    { id: 'civics',    label: '⚖️ Civics',    title: 'Social & Political Life-II',   pdf: null },
  ],
  8: [
    { id: 'history',   label: '📜 History',   title: 'Our Pasts-III',                pdf: null },
    { id: 'geography', label: '🌍 Geography', title: 'Resources & Development',      pdf: null },
    { id: 'civics',    label: '⚖️ Civics',    title: 'Social & Political Life-III',  pdf: null },
  ],
  9: [
    { id: 'geography', label: '🌍 Geography', title: 'Contemporary India-I',           pdf: 'https://ncert.nic.in/textbook.php?iess1=' },
    { id: 'history',   label: '📜 History',   title: 'India & Cont. World-I',          pdf: 'https://ncert.nic.in/textbook.php?iess3=' },
    { id: 'civics',    label: '⚖️ Civics',    title: 'Democratic Politics-I',          pdf: 'https://ncert.nic.in/textbook.php?iess4=' },
    { id: 'economics', label: '💰 Economics', title: 'Economics',                      pdf: 'https://ncert.nic.in/textbook.php?iess2=' },
  ],
  10: [
    { id: 'geography', label: '🌍 Geography', title: 'Contemporary India-II',          pdf: 'https://ncert.nic.in/textbook.php?jess1=' },
    { id: 'history',   label: '📜 History',   title: 'India & Cont. World-II',         pdf: 'https://ncert.nic.in/textbook.php?jess3=' },
    { id: 'civics',    label: '⚖️ Civics',    title: 'Democratic Politics-II',         pdf: 'https://ncert.nic.in/textbook.php?jess4=' },
    { id: 'economics', label: '💰 Economics', title: 'Understanding Eco. Development', pdf: 'https://ncert.nic.in/textbook.php?jess2=' },
  ],
}

// Which chapter prefix maps to which sub-book id
export const SS_CHAPTER_PREFIX_MAP = {
  'history':           'history',
  'geography':         'geography',
  'civics':            'civics',
  'political science': 'civics',
  'economics':         'economics',
}

export function getSocialScienceSubBooks(classNum) {
  return SOCIAL_SCIENCE_SUB_BOOKS[parseInt(classNum)] || null
}

// ── Hardcoded chapter database ─────────────────────────────────────────────
export const CHAPTERS_DB = {
  // ── Science ────────────────────────────────────────────────────────────────
  'class6_science': ['Ch 1: The Wonderful World of Science','Ch 2: Diversity in the Living World','Ch 3: Mindful Eating: A Path to a Healthy Body','Ch 4: Exploring Magnets','Ch 5: Measurement of Length and Motion','Ch 6: Materials Around Us','Ch 7: Temperature and its Measurement','Ch 8: A Treat for Mosquitoes!','Ch 9: Methods of Separation','Ch 10: Living Creatures: Exploring their Characteristics','Ch 11: Nature\'s Treasures','Ch 12: Beyond Earth'],
  'class7_science': ['Ch 1: Nutrition in Plants','Ch 2: Nutrition in Animals','Ch 3: Fibre to Fabric','Ch 4: Heat','Ch 5: Acids, Bases and Salts','Ch 6: Physical and Chemical Changes','Ch 7: Weather, Climate and Adaptations','Ch 8: Winds, Storms and Cyclones','Ch 9: Soil','Ch 10: Respiration in Organisms','Ch 11: Transportation in Animals and Plants','Ch 12: Reproduction in Plants','Ch 13: Motion and Time','Ch 14: Electric Current and its Effects','Ch 15: Light','Ch 16: Water: A Precious Resource','Ch 17: Forests: Our Lifeline','Ch 18: Wastewater Story'],
  'class8_science': ['Ch 1: Crop Production and Management','Ch 2: Microorganisms — Friend and Foe','Ch 3: Synthetic Fibres and Plastics','Ch 4: Materials — Metals and Non-metals','Ch 5: Coal and Petroleum','Ch 6: Combustion and Flame','Ch 7: Conservation of Plants and Animals','Ch 8: Cell — Structure and Functions','Ch 9: Reproduction in Animals','Ch 10: Reaching the Age of Adolescence','Ch 11: Force and Pressure','Ch 12: Friction','Ch 13: Sound','Ch 14: Chemical Effects of Electric Current','Ch 15: Some Natural Phenomena','Ch 16: Light','Ch 17: Stars and the Solar System','Ch 18: Pollution of Air and Water'],
  'class9_science': ['Ch 1: Matter in Our Surroundings','Ch 2: Is Matter Around Us Pure?','Ch 3: Atoms and Molecules','Ch 4: Structure of the Atom','Ch 5: The Fundamental Unit of Life','Ch 6: Tissues','Ch 7: Diversity in Living Organisms','Ch 8: Motion','Ch 9: Force and Laws of Motion','Ch 10: Gravitation','Ch 11: Work and Energy','Ch 12: Sound','Ch 13: Why Do We Fall Ill?','Ch 14: Natural Resources','Ch 15: Improvement in Food Resources'],
  'class10_science': ['Ch 1: Chemical Reactions and Equations','Ch 2: Acids, Bases and Salts','Ch 3: Metals and Non-metals','Ch 4: Carbon and its Compounds','Ch 5: Periodic Classification of Elements','Ch 6: Life Processes','Ch 7: Control and Coordination','Ch 8: How do Organisms Reproduce?','Ch 9: Heredity and Evolution','Ch 10: Light — Reflection and Refraction','Ch 11: Human Eye and the Colourful World','Ch 12: Electricity','Ch 13: Magnetic Effects of Electric Current','Ch 14: Sources of Energy','Ch 15: Our Environment','Ch 16: Sustainable Management of Natural Resources'],
  'class11_physics': ['Ch 1: Physical World','Ch 2: Units and Measurements','Ch 3: Motion in a Straight Line','Ch 4: Motion in a Plane','Ch 5: Laws of Motion','Ch 6: Work, Energy and Power','Ch 7: System of Particles and Rotational Motion','Ch 8: Gravitation','Ch 9: Mechanical Properties of Solids','Ch 10: Mechanical Properties of Fluids','Ch 11: Thermal Properties of Matter','Ch 12: Thermodynamics','Ch 13: Kinetic Theory','Ch 14: Oscillations','Ch 15: Waves'],
  'class12_physics': ['Ch 1: Electric Charges and Fields','Ch 2: Electrostatic Potential and Capacitance','Ch 3: Current Electricity','Ch 4: Moving Charges and Magnetism','Ch 5: Magnetism and Matter','Ch 6: Electromagnetic Induction','Ch 7: Alternating Current','Ch 8: Electromagnetic Waves','Ch 9: Ray Optics and Optical Instruments','Ch 10: Wave Optics','Ch 11: Dual Nature of Radiation and Matter','Ch 12: Atoms','Ch 13: Nuclei','Ch 14: Semiconductor Electronics'],
  'class11_chemistry': ['Ch 1: Some Basic Concepts of Chemistry','Ch 2: Structure of Atom','Ch 3: Classification of Elements and Periodicity in Properties','Ch 4: Chemical Bonding and Molecular Structure','Ch 5: States of Matter','Ch 6: Thermodynamics','Ch 7: Equilibrium','Ch 8: Redox Reactions','Ch 9: Hydrogen','Ch 10: The s-Block Elements','Ch 11: The p-Block Elements','Ch 12: Organic Chemistry — Some Basic Principles','Ch 13: Hydrocarbons','Ch 14: Environmental Chemistry'],
  'class12_chemistry': ['Ch 1: The Solid State','Ch 2: Solutions','Ch 3: Electrochemistry','Ch 4: Chemical Kinetics','Ch 5: Surface Chemistry','Ch 6: General Principles of Isolation of Elements','Ch 7: The p-Block Elements','Ch 8: The d-and f-Block Elements','Ch 9: Coordination Compounds','Ch 10: Haloalkanes and Haloarenes','Ch 11: Alcohols, Phenols and Ethers','Ch 12: Aldehydes, Ketones and Carboxylic Acids','Ch 13: Amines','Ch 14: Biomolecules','Ch 15: Polymers','Ch 16: Chemistry in Everyday Life'],
  'class11_biology': ['Ch 1: The Living World','Ch 2: Biological Classification','Ch 3: Plant Kingdom','Ch 4: Animal Kingdom','Ch 5: Morphology of Flowering Plants','Ch 6: Anatomy of Flowering Plants','Ch 7: Structural Organisation in Animals','Ch 8: Cell — The Unit of Life','Ch 9: Biomolecules','Ch 10: Cell Cycle and Cell Division','Ch 11: Transport in Plants','Ch 12: Mineral Nutrition','Ch 13: Photosynthesis in Higher Plants','Ch 14: Respiration in Plants','Ch 15: Plant Growth and Development','Ch 16: Digestion and Absorption','Ch 17: Breathing and Exchange of Gases','Ch 18: Body Fluids and Circulation','Ch 19: Excretory Products and their Elimination','Ch 20: Locomotion and Movement','Ch 21: Neural Control and Coordination','Ch 22: Chemical Coordination and Integration'],
  'class12_biology': ['Ch 1: Reproduction in Organisms','Ch 2: Sexual Reproduction in Flowering Plants','Ch 3: Human Reproduction','Ch 4: Reproductive Health','Ch 5: Principles of Inheritance and Variation','Ch 6: Molecular Basis of Inheritance','Ch 7: Evolution','Ch 8: Human Health and Disease','Ch 9: Strategies for Enhancement in Food Production','Ch 10: Microbes in Human Welfare','Ch 11: Biotechnology — Principles and Processes','Ch 12: Biotechnology and its Applications','Ch 13: Organisms and Populations','Ch 14: Ecosystem','Ch 15: Biodiversity and Conservation','Ch 16: Environmental Issues'],
  // ── Mathematics ────────────────────────────────────────────────────────────
  'class6_mathematics': ['Ch 1: Patterns in Mathematics','Ch 2: Lines and Angles','Ch 3: Number Play','Ch 4: Data Handling and Presentation','Ch 5: Prime Time','Ch 6: Perimeter and Area','Ch 7: Fractions','Ch 8: Playing with Constructions','Ch 9: Symmetry','Ch 10: The Other Side of Zero'],
  'class7_mathematics': ['Ch 1: Integers','Ch 2: Fractions and Decimals','Ch 3: Data Handling','Ch 4: Simple Equations','Ch 5: Lines and Angles','Ch 6: The Triangle and its Properties','Ch 7: Congruence of Triangles','Ch 8: Comparing Quantities','Ch 9: Rational Numbers','Ch 10: Practical Geometry','Ch 11: Perimeter and Area','Ch 12: Algebraic Expressions','Ch 13: Exponents and Powers','Ch 14: Symmetry','Ch 15: Visualising Solid Shapes'],
  'class8_mathematics': ['Ch 1: Rational Numbers','Ch 2: Linear Equations in One Variable','Ch 3: Understanding Quadrilaterals','Ch 4: Practical Geometry','Ch 5: Data Handling','Ch 6: Squares and Square Roots','Ch 7: Cubes and Cube Roots','Ch 8: Comparing Quantities','Ch 9: Algebraic Expressions and Identities','Ch 10: Visualising Solid Shapes','Ch 11: Mensuration','Ch 12: Exponents and Powers','Ch 13: Direct and Inverse Proportions','Ch 14: Factorisation','Ch 15: Introduction to Graphs','Ch 16: Playing with Numbers'],
  'class9_mathematics': ['Ch 1: Number Systems','Ch 2: Polynomials','Ch 3: Coordinate Geometry','Ch 4: Linear Equations in Two Variables','Ch 5: Introduction to Euclid\'s Geometry','Ch 6: Lines and Angles','Ch 7: Triangles','Ch 8: Quadrilaterals','Ch 9: Areas of Parallelograms and Triangles','Ch 10: Circles','Ch 11: Constructions','Ch 12: Heron\'s Formula','Ch 13: Surface Areas and Volumes','Ch 14: Statistics','Ch 15: Probability'],
  'class10_mathematics': ['Ch 1: Real Numbers','Ch 2: Polynomials','Ch 3: Pair of Linear Equations in Two Variables','Ch 4: Quadratic Equations','Ch 5: Arithmetic Progressions','Ch 6: Triangles','Ch 7: Coordinate Geometry','Ch 8: Introduction to Trigonometry','Ch 9: Some Applications of Trigonometry','Ch 10: Circles','Ch 11: Constructions','Ch 12: Areas Related to Circles','Ch 13: Surface Areas and Volumes','Ch 14: Statistics','Ch 15: Probability'],
  'class11_mathematics': ['Ch 1: Sets','Ch 2: Relations and Functions','Ch 3: Trigonometric Functions','Ch 4: Principle of Mathematical Induction','Ch 5: Complex Numbers and Quadratic Equations','Ch 6: Linear Inequalities','Ch 7: Permutations and Combinations','Ch 8: Binomial Theorem','Ch 9: Sequences and Series','Ch 10: Straight Lines','Ch 11: Conic Sections','Ch 12: Introduction to Three Dimensional Geometry','Ch 13: Limits and Derivatives','Ch 14: Mathematical Reasoning','Ch 15: Statistics','Ch 16: Probability'],
  'class12_mathematics': ['Ch 1: Relations and Functions','Ch 2: Inverse Trigonometric Functions','Ch 3: Matrices','Ch 4: Determinants','Ch 5: Continuity and Differentiability','Ch 6: Application of Derivatives','Ch 7: Integrals','Ch 8: Application of Integrals','Ch 9: Differential Equations','Ch 10: Vector Algebra','Ch 11: Three Dimensional Geometry','Ch 12: Linear Programming','Ch 13: Probability'],
  // ── English ────────────────────────────────────────────────────────────────
  'class6_english': ['Honeysuckle Ch 1: Who Did Patrick\'s Homework?','Honeysuckle Ch 2: How the Dog Found Himself a New Master!','Honeysuckle Ch 3: Taro\'s Reward','Honeysuckle Ch 4: An Indian — American Woman in Space','Honeysuckle Ch 5: A Different Kind of School','Honeysuckle Ch 6: Who I Am','Honeysuckle Ch 7: Fair Play','Honeysuckle Ch 8: A Game of Chance','Honeysuckle Ch 9: Desert Animals','Honeysuckle Ch 10: The Banyan Tree','A Pact with the Sun Ch 1: A Tale of Two Birds','A Pact with the Sun Ch 2: The Friendly Mongoose','A Pact with the Sun Ch 3: The Shepherd\'s Treasure','A Pact with the Sun Ch 4: The Old-Clock Shop','A Pact with the Sun Ch 5: Tansen','A Pact with the Sun Ch 6: The Monkey and the Crocodile','A Pact with the Sun Ch 7: The Wonder Called Sleep','A Pact with the Sun Ch 8: A Pact with the Sun'],
  'class7_english': ['Honeycomb Ch 1: Three Questions','Honeycomb Ch 2: A Gift of Chappals','Honeycomb Ch 3: Gopal and the Hilsa Fish','Honeycomb Ch 4: The Ashes That Made Trees Bloom','Honeycomb Ch 5: Quality','Honeycomb Ch 6: Expert Detectives','Honeycomb Ch 7: The Invention of Vita-Wonk','Honeycomb Ch 8: Fire: Friend and Foe','Honeycomb Ch 9: A Bicycle in Good Repair','Honeycomb Ch 10: The Story of Cricket','An Alien Hand Ch 1: The Tiny Teacher','An Alien Hand Ch 2: Bringing Up Kittens','An Alien Hand Ch 3: The Desert','An Alien Hand Ch 4: The Cop and the Anthem','An Alien Hand Ch 5: Golu Grows a Nose','An Alien Hand Ch 6: I Want Something in a Cage','An Alien Hand Ch 7: Chandni','An Alien Hand Ch 8: The Bear Story','An Alien Hand Ch 9: A Tiger in the House','An Alien Hand Ch 10: An Alien Hand'],
  'class8_english': ['Honeydew Ch 1: The Best Christmas Present in the World','Honeydew Ch 2: The Tsunami','Honeydew Ch 3: Glimpses of the Past','Honeydew Ch 4: Bepin Choudhury\'s Lapse of Memory','Honeydew Ch 5: The Summit Within','Honeydew Ch 6: This is Jody\'s Fawn','Honeydew Ch 7: A Visit to Cambridge','Honeydew Ch 8: A Short Monsoon Diary','Honeydew Ch 9: The Great Stone Face — I','Honeydew Ch 10: The Great Stone Face — II','It So Happened Ch 1: How the Camel Got His Hump','It So Happened Ch 2: Children at Work','It So Happened Ch 3: The Selfish Giant','It So Happened Ch 4: The Treasure Within','It So Happened Ch 5: Princess September','It So Happened Ch 6: The Fight','It So Happened Ch 7: The Open Window','It So Happened Ch 8: Jalebis','It So Happened Ch 9: The Comet — I','It So Happened Ch 10: The Comet — II'],
  'class9_english': ['Beehive Ch 1: The Fun They Had','Beehive Ch 2: The Sound of Music','Beehive Ch 3: The Little Girl','Beehive Ch 4: A Truly Beautiful Mind','Beehive Ch 5: The Snake and the Mirror','Beehive Ch 6: My Childhood','Beehive Ch 7: Packing','Beehive Ch 8: Reach for the Top','Beehive Ch 9: The Bond of Love','Beehive Ch 10: Kathmandu','Beehive Ch 11: If I Were You','Moments Ch 1: The Lost Child','Moments Ch 2: The Adventures of Toto','Moments Ch 3: Iswaran the Storyteller','Moments Ch 4: In the Kingdom of Fools','Moments Ch 5: The Happy Prince','Moments Ch 6: Weathering the Storm in Ersama','Moments Ch 7: The Last Leaf','Moments Ch 8: A House Is Not a Home','Moments Ch 9: The Accidental Tourist','Moments Ch 10: The Beggar'],
  'class10_english': ['First Flight Ch 1: A Letter to God','First Flight Ch 2: Nelson Mandela — Long Walk to Freedom','First Flight Ch 3: Two Stories About Flying','First Flight Ch 4: From the Diary of Anne Frank','First Flight Ch 5: The Hundred Dresses — I','First Flight Ch 6: The Hundred Dresses — II','First Flight Ch 7: Glimpses of India','First Flight Ch 8: Mijbil the Otter','First Flight Ch 9: Madam Rides the Bus','First Flight Ch 10: The Sermon at Benares','First Flight Ch 11: The Proposal','Footprints Ch 1: A Triumph of Surgery','Footprints Ch 2: The Thief\'s Story','Footprints Ch 3: The Midnight Visitor','Footprints Ch 4: A Question of Trust','Footprints Ch 5: Footprints Without Feet','Footprints Ch 6: The Making of a Scientist','Footprints Ch 7: The Necklace','Footprints Ch 8: The Hack Driver','Footprints Ch 9: Bholi','Footprints Ch 10: The Book That Saved the Earth'],
  // ── Hindi ──────────────────────────────────────────────────────────────────
  'class6_hindi': ['Vasant Ch 1: Vah Chidiya Jo','Vasant Ch 2: Bachpan','Vasant Ch 3: Naadaan Dost','Vasant Ch 4: Chaand Se Thodi Si Gappe','Vasant Ch 5: Aksharon Ka Mahatv','Vasant Ch 6: Paar Nazar Ke','Vasant Ch 7: Saathi Haath Badhana','Vasant Ch 8: Aise Aise','Vasant Ch 9: Ticket Album','Vasant Ch 10: Jhaanse Ki Rani'],
  'class7_hindi': ['Vasant Ch 1: Hum Panchhi Unmukt Gagan Ke','Vasant Ch 2: Dadi Maa','Vasant Ch 3: Himaalaya Ki Betiyan','Vasant Ch 4: Kathaputli','Vasant Ch 5: Miti Ki Sondh','Vasant Ch 6: Rakt aur Hamara Sharir','Vasant Ch 7: Paapad Wali Gali','Vasant Ch 8: Shaame — Ek Kisaan','Vasant Ch 9: Chidiya Ki Bacchi','Vasant Ch 10: Apoorv Anubhav','Vasant Ch 11: Raheem Ke Dohe'],
  'class8_hindi': ['Vasant Ch 1: Dhwani','Vasant Ch 2: Lakh Ki Chudiyan','Vasant Ch 3: Bus Ki Yatra','Vasant Ch 4: Deewanon Ki Hasti','Vasant Ch 5: Chitthiyon Ki Anoothi Duniya','Vasant Ch 6: Bhagwan Ke Dakiye','Vasant Ch 7: Kya Nirash Hua Jaaye','Vasant Ch 8: Yeh Sabse Kathin Samay Nahi','Vasant Ch 9: Kabir Ki Saakhiyan','Vasant Ch 10: Hamare Watan Ki Dharohar'],
  'class9_hindi': ['Kshitij Ch 1: Do Baillon Ki Katha','Kshitij Ch 2: Rahul Sankrityayan — Lhasa Ki Or','Kshitij Ch 3: Upbhoktavaad Ki Sanskriti','Kshitij Ch 4: Saavanon Ke Geeton Ki Patjhad','Kshitij Ch 5: Nana Sahab Ki Putri — Devi Maina','Kshitij Ch 6: Premchand Ke Phate Joote','Kshitij Ch 7: Mere Bachpan Ke Din','Kshitij Ch 8: Ek Kutta Aur Ek Maina','Kritika Ch 1: Is Jal Pralay Mein','Kritika Ch 2: Mere Sang Ki Auraten','Kritika Ch 3: Reedh Ki Haddi'],
  'class10_hindi': ['Kshitij Ch 1: Surdas — Pad','Kshitij Ch 2: Tulsidas — Ram-Lakshman-Parshuram Samvad','Kshitij Ch 3: Dev — Savaiya aur Kavitt','Kshitij Ch 4: Jayashankar Prasad — Aatmakathya','Kshitij Ch 5: Suryakant Tripathi Nirala — Utsah, Aat Nahi Rahi','Kshitij Ch 6: Nagarjun — Yah Danturhit Muskan','Kshitij Ch 7: Girdhar — Fasal','Kshitij Ch 8: Rituraj — Ek Kahani Yah Bhi','Kritika Ch 1: Mata Ka Aanchal','Kritika Ch 2: George Pancham Ki Naak','Kritika Ch 3: Sana Sana Haath Jodi'],
  // ── Social Science ─────────────────────────────────────────────────────────
  'class6_social science': ['History Ch 1: What, Where, How and When?','History Ch 2: From Hunting-Gathering to Growing Food','History Ch 3: In the Earliest Cities','History Ch 4: What Books and Burials Tell Us','History Ch 5: Kingdoms, Kings and an Early Republic','History Ch 6: New Questions and Ideas','History Ch 7: Ashoka, The Emperor','History Ch 8: Vital Villages, Thriving Towns','History Ch 9: Traders, Kings and Pilgrims','History Ch 10: New Empires and Kingdoms','History Ch 11: Buildings, Paintings and Books','Geography Ch 1: The Earth in the Solar System','Geography Ch 2: Globe — Latitudes and Longitudes','Geography Ch 3: Motions of the Earth','Geography Ch 4: Maps','Geography Ch 5: Major Domains of the Earth','Geography Ch 6: Major Landforms of the Earth','Geography Ch 7: Our Country — India','Geography Ch 8: India — Climate, Vegetation and Wildlife','Civics Ch 1: Understanding Diversity','Civics Ch 2: Diversity and Discrimination','Civics Ch 3: What is Government?','Civics Ch 4: Key Elements of a Democratic Government','Civics Ch 5: Panchayati Raj','Civics Ch 6: Rural Administration','Civics Ch 7: Urban Administration'],
  'class7_social science': ['History Ch 1: Tracing Changes Through a Thousand Years','History Ch 2: New Kings and Kingdoms','History Ch 3: The Delhi Sultans','History Ch 4: The Mughal Empire','History Ch 5: Rulers and Buildings','History Ch 6: Towns, Traders and Craftspersons','History Ch 7: Tribes, Nomads and Settled Communities','History Ch 8: Devotional Paths to the Divine','History Ch 9: The Making of Regional Cultures','History Ch 10: Eighteenth-Century Political Formations','Geography Ch 1: Environment','Geography Ch 2: Inside Our Earth','Geography Ch 3: Our Changing Earth','Geography Ch 4: Air','Geography Ch 5: Water','Geography Ch 6: Natural Vegetation and Wildlife','Geography Ch 7: Human Environment — Settlement, Transport and Communication','Geography Ch 8: Human–Environment Interactions','Geography Ch 9: Life in the Deserts','Civics Ch 1: On Equality','Civics Ch 2: Role of the Government in Health','Civics Ch 3: How the State Government Works','Civics Ch 4: Growing Up as Boys and Girls','Civics Ch 5: Women Change the World','Civics Ch 6: Understanding Media','Civics Ch 7: Markets Around Us'],
  'class8_social science': ['History Ch 1: How, When and Where','History Ch 2: From Trade to Territory','History Ch 3: Ruling the Countryside','History Ch 4: Tribals, Dikus and the Vision of a Golden Age','History Ch 5: When People Rebel','History Ch 6: Weavers, Iron Smelters and Factory Owners','History Ch 7: Civilising the \'Native\', Educating the Nation','History Ch 8: Women, Caste and Reform','History Ch 9: The Making of the National Movement: 1870s–1947','History Ch 10: India After Independence','Geography Ch 1: Resources','Geography Ch 2: Land, Soil, Water, Natural Vegetation and Wildlife','Geography Ch 3: Mineral and Power Resources','Geography Ch 4: Agriculture','Geography Ch 5: Industries','Geography Ch 6: Human Resources','Civics Ch 1: The Indian Constitution','Civics Ch 2: Understanding Secularism','Civics Ch 3: Why Do We Need a Parliament?','Civics Ch 4: Understanding Laws','Civics Ch 5: Judiciary','Civics Ch 6: Understanding Our Criminal Justice System','Civics Ch 7: Understanding Marginalisation','Civics Ch 8: Confronting Marginalisation'],
  'class9_social science': ['History Ch 1: The French Revolution','History Ch 2: Socialism in Europe and the Russian Revolution','History Ch 3: Nazism and the Rise of Hitler','History Ch 4: Forest Society and Colonialism','History Ch 5: Pastoralists in the Modern World','Geography Ch 1: India — Size and Location','Geography Ch 2: Physical Features of India','Geography Ch 3: Drainage','Geography Ch 4: Climate','Geography Ch 5: Natural Vegetation and Wildlife','Geography Ch 6: Population','Political Science Ch 1: What is Democracy? Why Democracy?','Political Science Ch 2: Constitutional Design','Political Science Ch 3: Electoral Politics','Political Science Ch 4: Working of Institutions','Political Science Ch 5: Democratic Rights','Economics Ch 1: The Story of Village Palampur','Economics Ch 2: People as Resource','Economics Ch 3: Poverty as a Challenge','Economics Ch 4: Food Security in India'],
  'class10_social science': ['History Ch 1: The Rise of Nationalism in Europe','History Ch 2: Nationalism in India','History Ch 3: The Making of a Global World','History Ch 4: The Age of Industrialisation','History Ch 5: Print Culture and the Modern World','Geography Ch 1: Resources and Development','Geography Ch 2: Forest and Wildlife Resources','Geography Ch 3: Water Resources','Geography Ch 4: Agriculture','Geography Ch 5: Minerals and Energy Resources','Geography Ch 6: Manufacturing Industries','Geography Ch 7: Lifelines of National Economy','Political Science Ch 1: Power Sharing','Political Science Ch 2: Federalism','Political Science Ch 3: Democracy and Diversity','Political Science Ch 4: Gender, Religion and Caste','Political Science Ch 5: Popular Struggles and Movements','Economics Ch 1: Development','Economics Ch 2: Sectors of the Indian Economy','Economics Ch 3: Money and Credit','Economics Ch 4: Globalisation and the Indian Economy'],
  // ── Other subjects ─────────────────────────────────────────────────────────
  'class11_computer science': ['Ch 1: Computer Systems','Ch 2: Encoding Schemes and Number Systems','Ch 3: Emerging Trends','Ch 4: Problem Solving','Ch 5: Getting Started with Python','Ch 6: Flow of Control','Ch 7: Functions','Ch 8: Strings','Ch 9: Lists','Ch 10: Tuples and Dictionaries','Ch 11: Societal Impacts'],
  'class12_computer science': ['Ch 1: Exception Handling','Ch 2: File Handling','Ch 3: Stack','Ch 4: Queue','Ch 5: Sorting','Ch 6: Searching','Ch 7: Understanding Data','Ch 8: Database Concepts','Ch 9: SQL','Ch 10: Computer Networks','Ch 11: Societal Impacts'],
  'class11_economics': ['Part A Ch 1: Introduction to Statistics','Part A Ch 2: Collection of Data','Part A Ch 3: Organisation of Data','Part A Ch 4: Presentation of Data','Part A Ch 5: Measures of Central Tendency','Part A Ch 6: Measures of Dispersion','Part A Ch 7: Correlation','Part A Ch 8: Index Numbers','Part A Ch 9: Use of Statistical Tools','Part B Ch 1: Introduction to Microeconomics','Part B Ch 2: Consumer\'s Equilibrium and Demand','Part B Ch 3: Producer Behaviour and Supply','Part B Ch 4: Forms of Market and Price Determination','Part B Ch 5: Market Equilibrium'],
  'class12_economics': ['Part A Ch 1: Introduction to Macroeconomics','Part A Ch 2: National Income Accounting','Part A Ch 3: Money and Banking','Part A Ch 4: Determination of Income and Employment','Part A Ch 5: Government Budget and the Economy','Part A Ch 6: Open Economy Macroeconomics','Part B Ch 1: Introduction to Microeconomics','Part B Ch 2: Theory of Consumer Behaviour','Part B Ch 3: Production and Costs','Part B Ch 4: Theory of the Firm Under Perfect Competition','Part B Ch 5: Market Equilibrium','Part B Ch 6: Non-Competitive Markets'],
  'class12_accountancy': ['Ch 1: Accounting for Partnership — Basic Concepts','Ch 2: Change in Profit-Sharing Ratio','Ch 3: Admission of a Partner','Ch 4: Retirement and Death of a Partner','Ch 5: Dissolution of Partnership Firm','Ch 6: Accounting for Share Capital','Ch 7: Issue and Redemption of Debentures','Ch 8: Financial Statements of a Company','Ch 9: Analysis of Financial Statements','Ch 10: Accounting Ratios','Ch 11: Cash Flow Statement'],
  'class12_business studies': ['Ch 1: Nature and Significance of Management','Ch 2: Principles of Management','Ch 3: Business Environment','Ch 4: Planning','Ch 5: Organising','Ch 6: Staffing','Ch 7: Directing','Ch 8: Controlling','Ch 9: Financial Management','Ch 10: Financial Markets','Ch 11: Marketing Management','Ch 12: Consumer Protection'],
  'class11_history': ['Ch 1: From the Beginning of Time','Ch 2: Early Cities','Ch 3: An Empire Across Three Continents','Ch 4: The Central Islamic Lands','Ch 5: Nomadic Empires','Ch 6: The Three Orders','Ch 7: Changing Cultural Traditions','Ch 8: Confrontation of Cultures','Ch 9: The Industrial Revolution','Ch 10: Displacing Indigenous Peoples','Ch 11: Paths to Modernisation'],
  'class12_history': ['Ch 1: Bricks, Beads and Bones — The Harappan Civilisation','Ch 2: Kings, Farmers and Towns','Ch 3: Kinship, Caste and Class','Ch 4: Thinkers, Beliefs and Buildings','Ch 5: Through the Eyes of Travellers','Ch 6: Bhakti–Sufi Traditions','Ch 7: An Imperial Capital — Vijayanagara','Ch 8: Peasants, Zamindars and the State','Ch 9: Kings and Chronicles','Ch 10: Colonialism and the Countryside','Ch 11: Rebels and the Raj','Ch 12: Colonial Cities','Ch 13: Mahatma Gandhi and the Nationalist Movement','Ch 14: Understanding Partition','Ch 15: Framing the Constitution'],
  'class11_geography': ['Fundamentals Ch 1: Geography as a Discipline','Fundamentals Ch 2: The Origin and Evolution of the Earth','Fundamentals Ch 3: Interior of the Earth','Fundamentals Ch 4: Distribution of Oceans and Continents','Fundamentals Ch 5: Minerals and Rocks','Fundamentals Ch 6: Geomorphic Processes','Fundamentals Ch 7: Fluvial Landforms','Fundamentals Ch 8: Glacial Landforms','Fundamentals Ch 9: Wind, Frost and Mass Wasting','Fundamentals Ch 10: Atmosphere','Fundamentals Ch 11: Water in the Atmosphere','Fundamentals Ch 12: World Climate and Climate Change','Fundamentals Ch 13: Water (Oceans)','Fundamentals Ch 14: Movements of Ocean Water','Fundamentals Ch 15: Life on the Earth','Fundamentals Ch 16: Biodiversity and Conservation','India Ch 1: India — Location','India Ch 2: Structure and Physiography','India Ch 3: Drainage System','India Ch 4: Climate','India Ch 5: Natural Vegetation','India Ch 6: Soils','India Ch 7: Natural Hazards and Disasters'],
  'class12_geography': ['Part A Ch 1: Human Geography — Nature and Scope','Part A Ch 2: The World Population','Part A Ch 3: Population Composition','Part A Ch 4: Human Development','Part A Ch 5: Primary Activities','Part A Ch 6: Secondary Activities','Part A Ch 7: Tertiary and Quaternary Activities','Part A Ch 8: Transport and Communication','Part A Ch 9: International Trade','Part A Ch 10: Human Settlements','Part B Ch 1: Population — Distribution, Density, Growth and Composition','Part B Ch 2: Migration in India','Part B Ch 3: Human Development','Part B Ch 4: Human Settlements','Part B Ch 5: Land Resources and Agriculture','Part B Ch 6: Water Resources','Part B Ch 7: Mineral and Energy Resources','Part B Ch 8: Manufacturing Industries','Part B Ch 9: Planning and Sustainable Development','Part B Ch 10: Transport and Communication','Part B Ch 11: International Trade','Part B Ch 12: Geographical Perspective on Selected Issues'],
}

// Lookup chapters by class number and subject name
export function getChapters(classNum, subject) {
  const key = `class${classNum}_${subject.toLowerCase()}`
  return CHAPTERS_DB[key] || null
}

// ── DIKSHA Board Mapping ─────────────────────────────────────────────────────
// Maps frontend board shortNames to DIKSHA API board filter values.
// ICSE/ISC is NOT on DIKSHA (CISCE is a private board and doesn't publish
// on the government platform). For ICSE, we use LLM fallback on the backend.
export const DIKSHA_BOARD_MAP = {
  CBSE: 'CBSE', NCERT: 'NCERT', NIOS: 'NIOS',
  BSEAP: 'State (Andhra Pradesh)', SEBA: 'State (Assam)', AHSEC: 'State (Assam)',
  BSEB: 'State (Bihar)', CGBSE: 'State (Chhattisgarh)', GBSHSE: 'State (Goa)',
  GSEB: 'State (Gujarat)', HBSE: 'State (Haryana)', HPBOSE: 'State (Himachal Pradesh)',
  JAC: 'State (Jharkhand)', KSEEB: 'State (Karnataka)', PUC: 'State (Karnataka)',
  KBPE: 'State (Kerala)', MPBSE: 'State (Madhya Pradesh)', MSBSHSE: 'State (Maharashtra)',
  BSEM: 'State (Manipur)', MBOSE: 'State (Meghalaya)', MBSE: 'State (Mizoram)',
  NBSE: 'State (Nagaland)', BSE: 'State (Odisha)', CHSE: 'State (Odisha)',
  PSEB: 'State (Punjab)', RBSE: 'State (Rajasthan)', BSSS: 'State (Sikkim)',
  TNBSE: 'State (Tamil Nadu)', BSETS: 'State (Telangana)', TBSE: 'State (Tripura)',
  UPMSP: 'State (Uttar Pradesh)', UBSE: 'State (Uttarakhand)',
  WBBSE: 'State (West Bengal)', WBCHSE: 'State (West Bengal)',
  JKBOSE: 'State (Jammu and Kashmir)', DoE: 'State (Delhi)',
  PBSE: 'UT (Puducherry)',
}

// Check if a board has DIKSHA textbook support
export function hasDikshaSupport(boardShortName) {
  return boardShortName in DIKSHA_BOARD_MAP
}

// Check if a board is CISCE-affiliated (ICSE classes 1-10, ISC classes 11-12)
// Neither is on DIKSHA; chapters come from LLM with source='cisce'.
export function isICSE(boardShortName) {
  return boardShortName === 'ICSE' || boardShortName === 'ISC'
}
