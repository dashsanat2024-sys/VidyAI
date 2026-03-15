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
  ],
  'Assam': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'SEBA (Assam Board)', shortName: 'SEBA', type: 'state', govUrl: 'https://sebaonline.org' },
    { name: 'AHSEC (Assam Higher Secondary)', shortName: 'AHSEC', type: 'state', govUrl: 'https://ahsec.nic.in' },
  ],
  'Bihar': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'BSEB (Bihar Board)', shortName: 'BSEB', type: 'state', govUrl: 'https://biharboardonline.com' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Chhattisgarh': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'CGBSE (Chhattisgarh Board)', shortName: 'CGBSE', type: 'state', govUrl: 'https://cgbse.nic.in' },
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
  ],
  'Jharkhand': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'JAC (Jharkhand Board)', shortName: 'JAC', type: 'state', govUrl: 'https://jac.jharkhand.gov.in' },
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
  ],
  'Meghalaya': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'MBOSE (Meghalaya Board)', shortName: 'MBOSE', type: 'state', govUrl: 'https://mbose.in' },
  ],
  'Mizoram': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'MBSE (Mizoram Board)', shortName: 'MBSE', type: 'state', govUrl: 'https://mbse.edu.in' },
  ],
  'Nagaland': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'NBSE (Nagaland Board)', shortName: 'NBSE', type: 'state', govUrl: 'https://nbsenagaland.com' },
  ],
  'Odisha': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'BSE Odisha (Odisha Board)', shortName: 'BSE', type: 'state', govUrl: 'https://bseodisha.ac.in' },
    { name: 'CHSE Odisha (Higher Secondary)', shortName: 'CHSE', type: 'state', govUrl: 'https://chseodisha.nic.in' },
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
  ],
  'Uttar Pradesh': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'UPMSP (UP Board)', shortName: 'UPMSP', type: 'state', govUrl: 'https://upmsp.edu.in' },
    { name: 'ICSE / ISC', shortName: 'ICSE', type: 'national', govUrl: 'https://cisce.org' },
  ],
  'Uttarakhand': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'UBSE (Uttarakhand Board)', shortName: 'UBSE', type: 'state', govUrl: 'https://ubse.uk.gov.in' },
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
  ],
  'Chandigarh': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'PSEB (Punjab Board)', shortName: 'PSEB', type: 'state', govUrl: 'https://pseb.ac.in' },
  ],
  'Dadra & Nagar Haveli and Daman & Diu': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'GSEB (Gujarat Board)', shortName: 'GSEB', type: 'state', govUrl: 'https://gseb.org' },
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
  ],
  'Ladakh': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'JKBOSE (J&K Board)', shortName: 'JKBOSE', type: 'state', govUrl: 'https://jkbose.nic.in' },
  ],
  'Lakshadweep': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
  ],
  'Puducherry': [
    { name: 'CBSE', shortName: 'CBSE', type: 'national', govUrl: 'https://cbseacademic.nic.in' },
    { name: 'TBSE (Puducherry Board)', shortName: 'PBSE', type: 'state', govUrl: 'https://schooledn.py.gov.in' },
  ],
}

// ── Subjects per board and class range ───────────────────────────────────────
export function getSubjects(boardShortName, classNum) {
  const n = parseInt(classNum)
  // CBSE / NCERT based subjects
  if (['CBSE', 'ICSE', 'NIOS', 'DoE', 'IB'].includes(boardShortName)) {
    if (n <= 2)  return ['English', 'Mathematics', 'Environmental Studies', 'Hindi', 'General Knowledge']
    if (n <= 5)  return ['English', 'Mathematics', 'Environmental Studies', 'Hindi', 'General Knowledge', 'Computer Science']
    if (n <= 8)  return ['English', 'Mathematics', 'Science', 'Social Science', 'Hindi', 'Sanskrit', 'Computer Science']
    if (n <= 10) return ['English', 'Mathematics', 'Science', 'Social Science', 'Hindi', 'Sanskrit', 'Computer Science', 'Physical Education']
    // 11-12
    if (boardShortName === 'ICSE') {
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
  // NCERT Science
  'class1_environmental studies':  'https://ncert.nic.in/textbook/pdf/aevs1dd.pdf',
  'class2_environmental studies':  'https://ncert.nic.in/textbook/pdf/bevs1dd.pdf',
  'class3_environmental studies':  'https://ncert.nic.in/textbook/pdf/cevs1dd.pdf',
  'class4_environmental studies':  'https://ncert.nic.in/textbook/pdf/devs1dd.pdf',
  'class5_environmental studies':  'https://ncert.nic.in/textbook/pdf/eevs1dd.pdf',
  'class6_science':                'https://ncert.nic.in/textbook/pdf/hesc1dd.pdf',
  'class7_science':                'https://ncert.nic.in/textbook/pdf/hesc2dd.pdf',
  'class8_science':                'https://ncert.nic.in/textbook/pdf/hesc3dd.pdf',
  'class9_science':                'https://ncert.nic.in/textbook/pdf/iesc1dd.pdf',
  'class10_science':               'https://ncert.nic.in/textbook/pdf/jesc101.pdf',
  'class11_physics':               'https://ncert.nic.in/textbook/pdf/leph101.pdf',
  'class12_physics':               'https://ncert.nic.in/textbook/pdf/leph201.pdf',
  'class11_chemistry':             'https://ncert.nic.in/textbook/pdf/lech101.pdf',
  'class12_chemistry':             'https://ncert.nic.in/textbook/pdf/lech201.pdf',
  'class11_biology':               'https://ncert.nic.in/textbook/pdf/lebo101.pdf',
  'class12_biology':               'https://ncert.nic.in/textbook/pdf/lebo201.pdf',
  // NCERT Mathematics
  'class1_mathematics':            'https://ncert.nic.in/textbook/pdf/aemh1dd.pdf',
  'class2_mathematics':            'https://ncert.nic.in/textbook/pdf/bemh1dd.pdf',
  'class3_mathematics':            'https://ncert.nic.in/textbook/pdf/cemh1dd.pdf',
  'class4_mathematics':            'https://ncert.nic.in/textbook/pdf/demh1dd.pdf',
  'class5_mathematics':            'https://ncert.nic.in/textbook/pdf/eemh1dd.pdf',
  'class6_mathematics':            'https://ncert.nic.in/textbook/pdf/hemh1dd.pdf',
  'class7_mathematics':            'https://ncert.nic.in/textbook/pdf/hemh2dd.pdf',
  'class8_mathematics':            'https://ncert.nic.in/textbook/pdf/hemh3dd.pdf',
  'class9_mathematics':            'https://ncert.nic.in/textbook/pdf/iemh1dd.pdf',
  'class10_mathematics':           'https://ncert.nic.in/textbook/pdf/jemh101.pdf',
  'class11_mathematics':           'https://ncert.nic.in/textbook/pdf/lemh101.pdf',
  'class12_mathematics':           'https://ncert.nic.in/textbook/pdf/lemh201.pdf',
  // NCERT English
  'class1_english':                'https://ncert.nic.in/textbook/pdf/aeen1dd.pdf',
  'class2_english':                'https://ncert.nic.in/textbook/pdf/been1dd.pdf',
  'class3_english':                'https://ncert.nic.in/textbook/pdf/ceen1dd.pdf',
  'class4_english':                'https://ncert.nic.in/textbook/pdf/deen1dd.pdf',
  'class5_english':                'https://ncert.nic.in/textbook/pdf/eeen1dd.pdf',
  'class6_english':                'https://ncert.nic.in/textbook/pdf/heen1dd.pdf',
  'class7_english':                'https://ncert.nic.in/textbook/pdf/heen2dd.pdf',
  'class8_english':                'https://ncert.nic.in/textbook/pdf/heen3dd.pdf',
  'class9_english':                'https://ncert.nic.in/textbook/pdf/ieen1dd.pdf',
  'class10_english':               'https://ncert.nic.in/textbook/pdf/jeff101.pdf',
  'class11_english':               'https://ncert.nic.in/textbook/pdf/leen101.pdf',
  'class12_english':               'https://ncert.nic.in/textbook/pdf/leen201.pdf',
  // NCERT Hindi
  'class1_hindi':                  'https://ncert.nic.in/textbook/pdf/aehn1dd.pdf',
  'class2_hindi':                  'https://ncert.nic.in/textbook/pdf/behn1dd.pdf',
  'class3_hindi':                  'https://ncert.nic.in/textbook/pdf/cehn1dd.pdf',
  'class4_hindi':                  'https://ncert.nic.in/textbook/pdf/dehn1dd.pdf',
  'class5_hindi':                  'https://ncert.nic.in/textbook/pdf/eehn1dd.pdf',
  'class6_hindi':                  'https://ncert.nic.in/textbook/pdf/hehn1dd.pdf',
  'class7_hindi':                  'https://ncert.nic.in/textbook/pdf/hehn2dd.pdf',
  'class8_hindi':                  'https://ncert.nic.in/textbook/pdf/hehn3dd.pdf',
  'class9_hindi':                  'https://ncert.nic.in/textbook/pdf/iehn1dd.pdf',
  'class10_hindi':                 'https://ncert.nic.in/textbook/pdf/jhks101.pdf',
  'class11_hindi':                 'https://ncert.nic.in/textbook/pdf/lehn101.pdf',
  'class12_hindi':                 'https://ncert.nic.in/textbook/pdf/lehn201.pdf',
  // NCERT Social Science
  'class6_social science':         'https://ncert.nic.in/textbook/pdf/hess1dd.pdf',
  'class7_social science':         'https://ncert.nic.in/textbook/pdf/hess2dd.pdf',
  'class8_social science':         'https://ncert.nic.in/textbook/pdf/hess3dd.pdf',
  'class9_social science':         'https://ncert.nic.in/textbook/pdf/iess1dd.pdf',
  'class10_social science':        'https://ncert.nic.in/textbook/pdf/jess101.pdf',
  // NCERT Class 11-12 Humanities
  'class11_history':               'https://ncert.nic.in/textbook/pdf/lehs101.pdf',
  'class12_history':               'https://ncert.nic.in/textbook/pdf/lehs201.pdf',
  'class11_geography':             'https://ncert.nic.in/textbook/pdf/legy101.pdf',
  'class12_geography':             'https://ncert.nic.in/textbook/pdf/legy201.pdf',
  'class11_political science':     'https://ncert.nic.in/textbook/pdf/leps101.pdf',
  'class12_political science':     'https://ncert.nic.in/textbook/pdf/leps201.pdf',
  'class11_economics':             'https://ncert.nic.in/textbook/pdf/leec101.pdf',
  'class12_economics':             'https://ncert.nic.in/textbook/pdf/leec201.pdf',
  'class11_sociology':             'https://ncert.nic.in/textbook/pdf/leso101.pdf',
  'class12_sociology':             'https://ncert.nic.in/textbook/pdf/leso201.pdf',
  'class11_psychology':            'https://ncert.nic.in/textbook/pdf/lepy101.pdf',
  'class12_psychology':            'https://ncert.nic.in/textbook/pdf/lepy201.pdf',
  'class12_accountancy':           'https://ncert.nic.in/textbook/pdf/leac201.pdf',
  'class12_business studies':      'https://ncert.nic.in/textbook/pdf/lebs201.pdf',
  'class11_computer science':      'https://ncert.nic.in/textbook/pdf/lecs101.pdf',
  'class12_computer science':      'https://ncert.nic.in/textbook/pdf/lecs201.pdf',
  // Sanskrit
  'class6_sanskrit':               'https://ncert.nic.in/textbook/pdf/hesa1dd.pdf',
  'class7_sanskrit':               'https://ncert.nic.in/textbook/pdf/hesa2dd.pdf',
  'class8_sanskrit':               'https://ncert.nic.in/textbook/pdf/hesa3dd.pdf',
  'class9_sanskrit':               'https://ncert.nic.in/textbook/pdf/iesa1dd.pdf',
  'class10_sanskrit':              'https://ncert.nic.in/textbook/pdf/jesa101.pdf',
}

// Helper: get PDF URL for a class+subject combo
export function getPdfUrl(classNum, subject) {
  const key = `class${classNum}_${subject.toLowerCase()}`
  return OFFICIAL_PDF_URLS[key] || null
}

// ── Hardcoded chapter database ─────────────────────────────────────────────
export const CHAPTERS_DB = {
  'class6_science': ['Ch 1: Food — Where Does it Come From?','Ch 2: Components of Food','Ch 3: Fibre to Fabric','Ch 4: Sorting Materials into Groups','Ch 5: Separation of Substances','Ch 6: Changes Around Us','Ch 7: Getting to Know Plants','Ch 8: Body Movements','Ch 9: The Living Organisms and Their Surroundings','Ch 10: Motion and Measurement of Distances','Ch 11: Light, Shadows and Reflections','Ch 12: Electricity and Circuits','Ch 13: Fun with Magnets','Ch 14: Water','Ch 15: Air Around Us','Ch 16: Garbage In, Garbage Out'],
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
  'class6_mathematics': ['Ch 1: Knowing Our Numbers','Ch 2: Whole Numbers','Ch 3: Playing with Numbers','Ch 4: Basic Geometrical Ideas','Ch 5: Understanding Elementary Shapes','Ch 6: Integers','Ch 7: Fractions','Ch 8: Decimals','Ch 9: Data Handling','Ch 10: Mensuration','Ch 11: Algebra','Ch 12: Ratio and Proportion','Ch 13: Symmetry','Ch 14: Practical Geometry'],
  'class7_mathematics': ['Ch 1: Integers','Ch 2: Fractions and Decimals','Ch 3: Data Handling','Ch 4: Simple Equations','Ch 5: Lines and Angles','Ch 6: The Triangle and its Properties','Ch 7: Congruence of Triangles','Ch 8: Comparing Quantities','Ch 9: Rational Numbers','Ch 10: Practical Geometry','Ch 11: Perimeter and Area','Ch 12: Algebraic Expressions','Ch 13: Exponents and Powers','Ch 14: Symmetry','Ch 15: Visualising Solid Shapes'],
  'class8_mathematics': ['Ch 1: Rational Numbers','Ch 2: Linear Equations in One Variable','Ch 3: Understanding Quadrilaterals','Ch 4: Practical Geometry','Ch 5: Data Handling','Ch 6: Squares and Square Roots','Ch 7: Cubes and Cube Roots','Ch 8: Comparing Quantities','Ch 9: Algebraic Expressions and Identities','Ch 10: Visualising Solid Shapes','Ch 11: Mensuration','Ch 12: Exponents and Powers','Ch 13: Direct and Inverse Proportions','Ch 14: Factorisation','Ch 15: Introduction to Graphs','Ch 16: Playing with Numbers'],
  'class9_mathematics': ['Ch 1: Number Systems','Ch 2: Polynomials','Ch 3: Coordinate Geometry','Ch 4: Linear Equations in Two Variables','Ch 5: Introduction to Euclid\'s Geometry','Ch 6: Lines and Angles','Ch 7: Triangles','Ch 8: Quadrilaterals','Ch 9: Areas of Parallelograms and Triangles','Ch 10: Circles','Ch 11: Constructions','Ch 12: Heron\'s Formula','Ch 13: Surface Areas and Volumes','Ch 14: Statistics','Ch 15: Probability'],
  'class10_mathematics': ['Ch 1: Real Numbers','Ch 2: Polynomials','Ch 3: Pair of Linear Equations in Two Variables','Ch 4: Quadratic Equations','Ch 5: Arithmetic Progressions','Ch 6: Triangles','Ch 7: Coordinate Geometry','Ch 8: Introduction to Trigonometry','Ch 9: Some Applications of Trigonometry','Ch 10: Circles','Ch 11: Constructions','Ch 12: Areas Related to Circles','Ch 13: Surface Areas and Volumes','Ch 14: Statistics','Ch 15: Probability'],
  'class11_mathematics': ['Ch 1: Sets','Ch 2: Relations and Functions','Ch 3: Trigonometric Functions','Ch 4: Principle of Mathematical Induction','Ch 5: Complex Numbers and Quadratic Equations','Ch 6: Linear Inequalities','Ch 7: Permutations and Combinations','Ch 8: Binomial Theorem','Ch 9: Sequences and Series','Ch 10: Straight Lines','Ch 11: Conic Sections','Ch 12: Introduction to Three Dimensional Geometry','Ch 13: Limits and Derivatives','Ch 14: Mathematical Reasoning','Ch 15: Statistics','Ch 16: Probability'],
  'class12_mathematics': ['Ch 1: Relations and Functions','Ch 2: Inverse Trigonometric Functions','Ch 3: Matrices','Ch 4: Determinants','Ch 5: Continuity and Differentiability','Ch 6: Application of Derivatives','Ch 7: Integrals','Ch 8: Application of Integrals','Ch 9: Differential Equations','Ch 10: Vector Algebra','Ch 11: Three Dimensional Geometry','Ch 12: Linear Programming','Ch 13: Probability'],
  'class6_social science': ['History Ch 1: What, Where, How and When?','History Ch 2: From Hunting-Gathering to Growing Food','History Ch 3: In the Earliest Cities','History Ch 4: What Books and Burials Tell Us','History Ch 5: Kingdoms, Kings and an Early Republic','History Ch 6: New Questions and Ideas','History Ch 7: Ashoka, the Emperor Who Gave Up War','History Ch 8: Vital Villages, Thriving Towns','History Ch 9: Traders, Kings and Pilgrims','History Ch 10: New Empires and Kingdoms','History Ch 11: Buildings, Paintings and Books','Geography Ch 1: The Earth in the Solar System','Geography Ch 2: Globe — Latitudes and Longitudes','Geography Ch 3: Motions of the Earth','Geography Ch 4: Maps','Geography Ch 5: Major Domains of the Earth','Geography Ch 6: Major Landforms of the Earth','Geography Ch 7: Our Country — India','Geography Ch 8: India — Climate, Vegetation and Wildlife','Civics Ch 1: Understanding Diversity','Civics Ch 2: Diversity and Discrimination','Civics Ch 3: What is Government?','Civics Ch 4: Key Elements of a Democratic Government','Civics Ch 5: Panchayati Raj','Civics Ch 6: Rural Administration','Civics Ch 7: Urban Administration','Civics Ch 8: Rural Livelihoods','Civics Ch 9: Urban Livelihoods'],
  'class9_social science': ['History Ch 1: The French Revolution','History Ch 2: Socialism in Europe and the Russian Revolution','History Ch 3: Nazism and the Rise of Hitler','History Ch 4: Forest Society and Colonialism','History Ch 5: Pastoralists in the Modern World','Geography Ch 1: India — Size and Location','Geography Ch 2: Physical Features of India','Geography Ch 3: Drainage','Geography Ch 4: Climate','Geography Ch 5: Natural Vegetation and Wildlife','Geography Ch 6: Population','Political Science Ch 1: What is Democracy? Why Democracy?','Political Science Ch 2: Constitutional Design','Political Science Ch 3: Electoral Politics','Political Science Ch 4: Working of Institutions','Political Science Ch 5: Democratic Rights','Economics Ch 1: The Story of Village Palampur','Economics Ch 2: People as Resource','Economics Ch 3: Poverty as a Challenge','Economics Ch 4: Food Security in India'],
  'class10_social science': ['History Ch 1: The Rise of Nationalism in Europe','History Ch 2: Nationalism in India','History Ch 3: The Making of a Global World','History Ch 4: The Age of Industrialisation','History Ch 5: Print Culture and the Modern World','Geography Ch 1: Resources and Development','Geography Ch 2: Forest and Wildlife Resources','Geography Ch 3: Water Resources','Geography Ch 4: Agriculture','Geography Ch 5: Minerals and Energy Resources','Geography Ch 6: Manufacturing Industries','Geography Ch 7: Lifelines of National Economy','Political Science Ch 1: Power Sharing','Political Science Ch 2: Federalism','Political Science Ch 3: Democracy and Diversity','Political Science Ch 4: Gender, Religion and Caste','Political Science Ch 5: Popular Struggles and Movements','Economics Ch 1: Development','Economics Ch 2: Sectors of the Indian Economy','Economics Ch 3: Money and Credit','Economics Ch 4: Globalisation and the Indian Economy'],
  'class10_english': ['First Flight Ch 1: A Letter to God','First Flight Ch 2: Nelson Mandela — Long Walk to Freedom','First Flight Ch 3: Two Stories About Flying','First Flight Ch 4: From the Diary of Anne Frank','First Flight Ch 5: The Hundred Dresses — I','First Flight Ch 6: The Hundred Dresses — II','First Flight Ch 7: Glimpses of India','First Flight Ch 8: Mijbil the Otter','First Flight Ch 9: Madam Rides the Bus','First Flight Ch 10: The Sermon at Benares','First Flight Ch 11: The Proposal','Footprints Ch 1: A Triumph of Surgery','Footprints Ch 2: The Thief\'s Story','Footprints Ch 3: The Midnight Visitor','Footprints Ch 4: A Question of Trust','Footprints Ch 5: Footprints Without Feet','Footprints Ch 6: The Making of a Scientist','Footprints Ch 7: The Necklace','Footprints Ch 8: The Hack Driver','Footprints Ch 9: Bholi','Footprints Ch 10: The Book That Saved the Earth'],
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
