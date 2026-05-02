/**
 * FreeCoursesPanel.jsx — Arthavi Admin Module
 * Curated free courses & certifications available in India from
 * Government platforms, top companies and online learning platforms.
 *
 * Features:
 *  - Search & filter by category, provider type, certificate type
 *  - Per-user course status tracking (localStorage)
 *  - External links open the official course/platform page
 *  - Beautiful branded UI matching Arthavi design system
 */
import { useState, useMemo } from 'react'

// ── Brand colours ──────────────────────────────────────────────────────────────
const C = {
  indigo: '#6d28d9',
  indigoD: '#4338ca',
  indigoL: '#8b5cf6',
  indigoBg: '#eef2ff',
  green: '#16a34a',
  greenBg: '#f0fdf4',
  amber: '#d97706',
  amberBg: '#fffbeb',
  red: '#dc2626',
  redBg: '#fef2f2',
  blue: '#2563eb',
  blueBg: '#eff6ff',
  purple: '#9333ea',
  purpleBg: '#f3e8ff',
  slate: '#64748b',
  border: '#e2e8f0',
  panel: '#f1f5f9',
}

// ── Certificate type definitions ───────────────────────────────────────────────
const CERT_TYPES = {
  FREE_CERT: { label: '🏆 Free Certificate', color: C.green, bg: C.greenBg, border: '#bbf7d0' },
  PAID_CERT: { label: '💳 Paid Certificate', color: C.amber, bg: C.amberBg, border: '#fde68a' },
  COURSE_ONLY: { label: '📖 Course Only', color: C.slate, bg: '#f1f5f9', border: C.border },
  FREE_BADGE: { label: '🎖 Free Badge', color: C.blue, bg: C.blueBg, border: '#bfdbfe' },
}

// ── Category definitions ───────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🌍' },
  { id: 'ai', label: 'AI & ML', icon: '🤖' },
  { id: 'cloud', label: 'Cloud Computing', icon: '☁️' },
  { id: 'data', label: 'Data Science', icon: '📊' },
  { id: 'web', label: 'Web & Dev', icon: '💻' },
  { id: 'cyber', label: 'Cybersecurity', icon: '🔐' },
  { id: 'marketing', label: 'Digital Marketing', icon: '📱' },
  { id: 'language', label: 'Languages', icon: '🗣️' },
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'govt', label: 'Govt Programs', icon: '🇮🇳' },
]

const PROVIDER_TYPES = ['All Providers', 'Government', 'Company', 'Platform', 'Academic']

const STATUS_OPTIONS = [
  { id: '', label: '— Not Started', color: C.slate },
  { id: 'enrolled', label: '📘 Enrolled', color: C.blue },
  { id: 'completed', label: '✅ Completed', color: C.green },
  { id: 'certified', label: '🏆 Certified', color: C.purple },
]

// ── Master Course Database ─────────────────────────────────────────────────────
const COURSES = [
  // ── GOVERNMENT ──────────────────────────────────────────────────────────────
  {
    id: 'swayam-ai',
    name: 'Introduction to Machine Learning',
    provider: 'SWAYAM / NPTEL',
    providerType: 'Government',
    category: 'ai',
    certType: 'FREE_CERT',
    duration: '12 weeks',
    level: 'Intermediate',
    url: 'https://swayam.gov.in',
    description: 'IIT-grade ML course with proctored exam. Certificate awarded free upon passing.',
    tags: ['NPTEL', 'IIT', 'India'],
    featured: true,
  },
  {
    id: 'swayam-python',
    name: 'Programming in Python',
    provider: 'SWAYAM / NPTEL',
    providerType: 'Government',
    category: 'web',
    certType: 'FREE_CERT',
    duration: '8 weeks',
    level: 'Beginner',
    url: 'https://swayam.gov.in',
    description: 'Python programming fundamentals by IIT professors on the SWAYAM national platform.',
    tags: ['Python', 'NPTEL', 'India'],
  },
  {
    id: 'swayam-data',
    name: 'Data Science for Engineers',
    provider: 'SWAYAM / NPTEL',
    providerType: 'Government',
    category: 'data',
    certType: 'FREE_CERT',
    duration: '12 weeks',
    level: 'Intermediate',
    url: 'https://swayam.gov.in',
    description: 'IIT Madras course on statistical methods, ML and data analysis. Proctored certificate exam.',
    tags: ['NPTEL', 'IIT Madras', 'Statistics'],
  },
  {
    id: 'skill-india-digital',
    name: 'Digital Skills for India',
    provider: 'Skill India Digital',
    providerType: 'Government',
    category: 'business',
    certType: 'FREE_CERT',
    duration: 'Self-paced',
    level: 'Beginner',
    url: 'https://www.skillindiadigital.gov.in',
    description: "Govt of India's free digital literacy, business & IT skills hub. Multiple free certifications.",
    tags: ['PMKVY', 'NSDC', 'India'],
    featured: true,
  },
  {
    id: 'pmkvy',
    name: 'PMKVY Skill Development',
    provider: 'Skill India / NSDC',
    providerType: 'Government',
    category: 'govt',
    certType: 'FREE_CERT',
    duration: 'Varies',
    level: 'Beginner',
    url: 'https://skillindiadigital.gov.in/schemes/pmkvy',
    description: 'Pradhan Mantri Kaushal Vikas Yojana — govt-funded vocational training with NSQF-aligned free certificates.',
    tags: ['PMKVY', 'Vocational', 'India'],
    featured: true,
  },
  {
    id: 'nasscom',
    name: 'FutureSkills Prime — AI & Data',
    provider: 'NASSCOM FutureSkills',
    providerType: 'Government',
    category: 'ai',
    certType: 'FREE_CERT',
    duration: 'Self-paced',
    level: 'Intermediate',
    url: 'https://futureskillsprime.in',
    description: 'MeitY & NASSCOM joint platform for AI, Big Data, Cloud and Blockchain. Subsidised / free for Indian learners.',
    tags: ['MeitY', 'NASSCOM', 'India'],
  },
  {
    id: 'ignou-egyan',
    name: 'IGNOU eGyanKosh Open Courses',
    provider: 'IGNOU / eGyanKosh',
    providerType: 'Government',
    category: 'govt',
    certType: 'FREE_CERT',
    duration: 'Semester-based',
    level: 'All Levels',
    url: 'http://egyankosh.ac.in/',
    description: "IGNOU's open digital library with free course materials and select certificate programmes.",
    tags: ['IGNOU', 'Distance Education', 'India'],
  },

  // ── GOOGLE ───────────────────────────────────────────────────────────────────
  {
    id: 'google-ai-essentials',
    name: 'Google AI Essentials',
    provider: 'Google',
    providerType: 'Company',
    category: 'ai',
    certType: 'FREE_CERT',
    duration: '~10 hours',
    level: 'Beginner',
    url: 'https://grow.google/intl/en_in/courses-and-tools/',
    description: 'Learn AI fundamentals and prompt engineering from Google. Free shareable certificate included.',
    tags: ['Google', 'Generative AI', 'Prompt Engineering'],
    featured: true,
  },
  {
    id: 'google-digital-garage',
    name: 'Fundamentals of Digital Marketing',
    provider: 'Google Digital Garage',
    providerType: 'Company',
    category: 'marketing',
    certType: 'FREE_CERT',
    duration: '40 hours',
    level: 'Beginner',
    url: 'https://learndigital.withgoogle.com/digitalgarage/course/digital-marketing',
    description: 'IAB-accredited free digital marketing certificate — one of the most popular free certs worldwide.',
    tags: ['Google', 'IAB', 'Marketing'],
    featured: true,
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics Certification',
    provider: 'Google Skillshop',
    providerType: 'Company',
    category: 'marketing',
    certType: 'FREE_CERT',
    duration: '4 hours',
    level: 'Beginner',
    url: 'https://skillshop.withgoogle.com',
    description: 'Free certification for Google Analytics 4. Globally recognised in digital analytics & marketing.',
    tags: ['Google', 'Analytics', 'GA4'],
  },
  {
    id: 'google-cloud-skills',
    name: 'Google Cloud Skills Boost',
    provider: 'Google Cloud',
    providerType: 'Company',
    category: 'cloud',
    certType: 'FREE_BADGE',
    duration: 'Self-paced',
    level: 'All Levels',
    url: 'https://www.cloudskillsboost.google',
    description: 'Hands-on GCP labs and quests. Earn free digital skill badges on AI, Data, DevOps and more.',
    tags: ['GCP', 'Google', 'Hands-on Labs'],
  },

  // ── MICROSOFT ────────────────────────────────────────────────────────────────
  {
    id: 'ms-learn-ai900',
    name: 'AI-900: Azure AI Fundamentals Path',
    provider: 'Microsoft Learn',
    providerType: 'Company',
    category: 'ai',
    certType: 'FREE_BADGE',
    duration: '8 hours',
    level: 'Beginner',
    url: 'https://learn.microsoft.com/en-us/training/paths/get-started-with-artificial-intelligence-on-azure/',
    description: 'Free Microsoft path preparing for the AI-900 exam with interactive sandboxes.',
    tags: ['Microsoft', 'Azure', 'AI'],
    featured: true,
  },
  {
    id: 'ms-learn-az900',
    name: 'AZ-900: Azure Fundamentals Path',
    provider: 'Microsoft Learn',
    providerType: 'Company',
    category: 'cloud',
    certType: 'FREE_BADGE',
    duration: '10 hours',
    level: 'Beginner',
    url: 'https://learn.microsoft.com/en-us/training/courses/az-900t00',
    description: 'Free Microsoft training path for the AZ-900 Azure Fundamentals certification.',
    tags: ['Microsoft', 'Azure', 'Cloud'],
  },
  {
    id: 'ms-github-foundations',
    name: 'GitHub Foundations Certification',
    provider: 'GitHub / Microsoft',
    providerType: 'Company',
    category: 'web',
    certType: 'FREE_CERT',
    duration: '8 hours',
    level: 'Beginner',
    url: 'https://learn.microsoft.com/en-us/collections/o1njfe825p602p',
    description: 'Free certification path to earn the official GitHub Foundations badge — valued by global recruiters.',
    tags: ['GitHub', 'Git', 'Microsoft'],
    featured: true,
  },
  {
    id: 'ms-learn-python',
    name: 'Python for Beginners',
    provider: 'Microsoft Learn',
    providerType: 'Company',
    category: 'web',
    certType: 'FREE_BADGE',
    duration: '2 hours',
    level: 'Beginner',
    url: 'https://learn.microsoft.com/en-us/training/paths/beginner-python/',
    description: "Microsoft's free Python introduction with interactive browser-based sandboxes.",
    tags: ['Microsoft', 'Python', 'Free'],
  },

  // ── IBM ──────────────────────────────────────────────────────────────────────
  {
    id: 'ibm-ai',
    name: 'Introduction to Artificial Intelligence',
    provider: 'IBM SkillsBuild',
    providerType: 'Company',
    category: 'ai',
    certType: 'FREE_CERT',
    duration: '6 hours',
    level: 'Beginner',
    url: 'https://skillsbuild.org/students/course-catalog/artificial-intelligence',
    description: "IBM's free AI fundamentals course with a digital credential badge on completion.",
    tags: ['IBM', 'AI', 'Badge'],
    featured: true,
  },
  {
    id: 'ibm-data-science',
    name: 'Data Science Fundamentals',
    provider: 'IBM SkillsBuild',
    providerType: 'Company',
    category: 'data',
    certType: 'FREE_CERT',
    duration: '8 hours',
    level: 'Beginner',
    url: 'https://skillsbuild.org/students/course-catalog/data-science',
    description: 'Free data science foundation course from IBM with a shareable digital badge.',
    tags: ['IBM', 'Data Science'],
  },
  {
    id: 'ibm-cybersecurity',
    name: 'Cybersecurity Fundamentals',
    provider: 'IBM SkillsBuild',
    providerType: 'Company',
    category: 'cyber',
    certType: 'FREE_CERT',
    duration: '10 hours',
    level: 'Beginner',
    url: 'https://skillsbuild.org/students/course-catalog/cybersecurity',
    description: 'Free cybersecurity course from IBM covering threats, vulnerabilities and enterprise security.',
    tags: ['IBM', 'Cybersecurity'],
  },

  // ── AWS ──────────────────────────────────────────────────────────────────────
  {
    id: 'aws-cloud-practitioner',
    name: 'AWS Cloud Practitioner Essentials',
    provider: 'AWS Skill Builder',
    providerType: 'Company',
    category: 'cloud',
    certType: 'FREE_BADGE',
    duration: '6 hours',
    level: 'Beginner',
    url: 'https://explore.skillbuilder.aws/learn/course/external/view/elearning/134/aws-cloud-practitioner-essentials',
    description: 'Free core course for the AWS Cloud Practitioner exam. Earn a digital badge from Amazon.',
    tags: ['AWS', 'Amazon', 'Cloud'],
    featured: true,
  },
  {
    id: 'aws-ml-foundations',
    name: 'Machine Learning Foundations on AWS',
    provider: 'AWS Skill Builder',
    providerType: 'Company',
    category: 'ai',
    certType: 'FREE_BADGE',
    duration: '6 hours',
    level: 'Beginner',
    url: 'https://explore.skillbuilder.aws/learn/course/external/view/elearning/22526/machine-learning-foundations-aws',
    description: 'Free AWS course on ML fundamentals — supervised, unsupervised learning and deep learning basics.',
    tags: ['AWS', 'ML', 'SageMaker'],
  },

  // ── NVIDIA ───────────────────────────────────────────────────────────────────
  {
    id: 'nvidia-dli',
    name: 'NVIDIA DLI — AI & Deep Learning',
    provider: 'NVIDIA',
    providerType: 'Company',
    category: 'ai',
    certType: 'FREE_CERT',
    duration: '8 hours',
    level: 'Intermediate',
    url: 'https://www.nvidia.com/en-in/training/online/',
    description: "Select free courses from NVIDIA's Deep Learning Institute with certificates in AI and Computer Vision.",
    tags: ['NVIDIA', 'GPU', 'Deep Learning'],
  },

  // ── CISCO ────────────────────────────────────────────────────────────────────
  {
    id: 'cisco-cybersecurity',
    name: 'Introduction to Cybersecurity',
    provider: 'Cisco Networking Academy',
    providerType: 'Company',
    category: 'cyber',
    certType: 'FREE_CERT',
    duration: '15 hours',
    level: 'Beginner',
    url: 'https://www.netacad.com/catalog/security',
    description: 'Globally recognised free certificate from Cisco on cyber threats, network security and privacy.',
    tags: ['Cisco', 'Networking', 'Security'],
    featured: true,
  },
  {
    id: 'cisco-python',
    name: 'Python Essentials (PCEP Prep)',
    provider: 'Cisco Networking Academy',
    providerType: 'Company',
    category: 'web',
    certType: 'FREE_CERT',
    duration: '30 hours',
    level: 'Beginner',
    url: 'https://www.netacad.com/catalog/python',
    description: 'Free Python Essentials course from Cisco preparing for the PCEP Python certification exam.',
    tags: ['Cisco', 'Python', 'PCEP'],
  },

  // ── META ─────────────────────────────────────────────────────────────────────
  {
    id: 'meta-blueprint',
    name: 'Meta Social Media Marketing',
    provider: 'Meta Blueprint',
    providerType: 'Company',
    category: 'marketing',
    certType: 'FREE_CERT',
    duration: '20 hours',
    level: 'Beginner',
    url: 'https://www.facebookblueprint.com/student/catalog',
    description: 'Free social media marketing certification from Meta/Facebook covering ads, analytics and content strategy.',
    tags: ['Meta', 'Facebook', 'Social Media'],
  },

  // ── HUBSPOT ──────────────────────────────────────────────────────────────────
  {
    id: 'hubspot',
    name: 'HubSpot Marketing Certifications',
    provider: 'HubSpot Academy',
    providerType: 'Company',
    category: 'marketing',
    certType: 'FREE_CERT',
    duration: '4 hours',
    level: 'Beginner',
    url: 'https://academy.hubspot.com/courses',
    description: 'Globally recognised free certifications in Inbound Marketing, Email, SEO and Social Media from HubSpot.',
    tags: ['HubSpot', 'Inbound', 'SEO', 'Email'],
    featured: true,
  },

  // ── SALESFORCE ───────────────────────────────────────────────────────────────
  {
    id: 'salesforce-trailhead',
    name: 'Salesforce Trailhead — CRM & AI',
    provider: 'Salesforce',
    providerType: 'Company',
    category: 'business',
    certType: 'FREE_BADGE',
    duration: 'Self-paced',
    level: 'All Levels',
    url: 'https://trailhead.salesforce.com',
    description: 'Free gamified learning for CRM, Salesforce admin, development and AI. Earn Trailblazer badges and superbadges.',
    tags: ['Salesforce', 'CRM', 'AI'],
  },

  // ── ORACLE ───────────────────────────────────────────────────────────────────
  {
    id: 'oracle-sql',
    name: 'SQL & Database Design',
    provider: 'Oracle Academy',
    providerType: 'Company',
    category: 'data',
    certType: 'FREE_CERT',
    duration: '10 hours',
    level: 'Beginner',
    url: 'https://education.oracle.com/learning-explorer',
    description: 'Free SQL and database design resources from Oracle Academy with a digital badge.',
    tags: ['Oracle', 'SQL', 'Database'],
  },

  // ── INTEL ────────────────────────────────────────────────────────────────────
  {
    id: 'intel-ai',
    name: 'AI For Everyone',
    provider: 'Intel AI Academy',
    providerType: 'Company',
    category: 'ai',
    certType: 'FREE_CERT',
    duration: '4 hours',
    level: 'Beginner',
    url: 'https://www.intel.com/content/www/us/en/developer/topic-technology/artificial-intelligence/overview.html',
    description: "Intel's free AI intro course with certificate covering AI concepts, applications and ethics.",
    tags: ['Intel', 'AI Ethics', 'Beginner'],
  },

  // ── INDIAN COMPANIES ─────────────────────────────────────────────────────────
  {
    id: 'infosys-springboard',
    name: 'Infosys Springboard — AI & Python',
    provider: 'Infosys Springboard',
    providerType: 'Company',
    category: 'ai',
    certType: 'FREE_CERT',
    duration: 'Self-paced',
    level: 'All Levels',
    url: 'https://infyspringboard.onwingspan.com',
    description: "Infosys's free learning platform with 800+ courses in AI, Python, Java and cloud. Free completion certificate.",
    tags: ['Infosys', 'India', 'Tech Skills'],
    featured: true,
  },
  {
    id: 'tcs-ion',
    name: 'TCS iON Career Edge',
    provider: 'TCS iON',
    providerType: 'Company',
    category: 'business',
    certType: 'FREE_CERT',
    duration: 'Self-paced',
    level: 'Beginner',
    url: 'https://www.tcsion.com/hub/career-edge/',
    description: 'TCS iON free courses for employability, digital literacy and vocational IT certifications. Trusted by Indian employers.',
    tags: ['TCS', 'India', 'Employability'],
    featured: true,
  },

  // ── PLATFORMS ────────────────────────────────────────────────────────────────
  {
    id: 'simplilearn-skillup',
    name: 'Simplilearn SkillUp Free Courses',
    provider: 'Simplilearn',
    providerType: 'Platform',
    category: 'data',
    certType: 'FREE_CERT',
    duration: 'Self-paced',
    level: 'Beginner',
    url: 'https://www.simplilearn.com/skillup-free-online-courses',
    description: "1000+ free courses in AI, Data, Python and Cloud from India's leading edtech platform with free certificates.",
    tags: ['Simplilearn', 'India', 'Tech'],
    featured: true,
  },
  {
    id: 'great-learning',
    name: 'Great Learning Academy',
    provider: 'Great Learning',
    providerType: 'Platform',
    category: 'ai',
    certType: 'FREE_CERT',
    duration: 'Self-paced',
    level: 'All Levels',
    url: 'https://www.mygreatlearning.com/academy',
    description: '1000+ free courses with certificates in AI, ML, Python, Cloud and Excel. Hugely popular in India.',
    tags: ['Great Learning', 'India', 'Free'],
    featured: true,
  },
  {
    id: 'kaggle',
    name: 'Kaggle Learn — AI & Data Science',
    provider: 'Kaggle / Google',
    providerType: 'Platform',
    category: 'data',
    certType: 'FREE_CERT',
    duration: 'Self-paced',
    level: 'Beginner',
    url: 'https://www.kaggle.com/learn',
    description: 'Free short courses in Python, Pandas, ML, Deep Learning and SQL. Each earns an official Kaggle certificate.',
    tags: ['Kaggle', 'Google', 'Data', 'Python'],
    featured: true,
  },
  {
    id: 'analytics-vidhya',
    name: 'Analytics Vidhya Free Courses',
    provider: 'Analytics Vidhya',
    providerType: 'Platform',
    category: 'data',
    certType: 'FREE_CERT',
    duration: 'Self-paced',
    level: 'All Levels',
    url: 'https://www.analyticsvidhya.com/courses/',
    description: "India's largest data science community. Free courses in ML, DL, NLP and Computer Vision with free certificates.",
    tags: ['Analytics Vidhya', 'India', 'Data Science'],
    featured: true,
  },
  {
    id: 'coursera-audit',
    name: 'Coursera — Audit University Courses',
    provider: 'Coursera',
    providerType: 'Platform',
    category: 'ai',
    certType: 'COURSE_ONLY',
    duration: 'Varies',
    level: 'All Levels',
    url: 'https://www.coursera.org',
    description: 'Audit thousands of courses from IIT, Stanford, Google, IBM for free. Certificate requires payment.',
    tags: ['Coursera', 'Universities', 'Audit'],
    featured: true,
  },
  {
    id: 'edx-audit',
    name: 'edX — Audit MIT & Harvard Courses',
    provider: 'edX',
    providerType: 'Platform',
    category: 'ai',
    certType: 'COURSE_ONLY',
    duration: 'Varies',
    level: 'All Levels',
    url: 'https://www.edx.org',
    description: 'Audit MIT, Harvard, IIM and top global university courses for free. Certificate requires payment.',
    tags: ['edX', 'MIT', 'Harvard', 'IIM'],
  },
  {
    id: 'udemy-free',
    name: 'Udemy Free Courses',
    provider: 'Udemy',
    providerType: 'Platform',
    category: 'web',
    certType: 'FREE_CERT',
    duration: 'Varies',
    level: 'All Levels',
    url: 'https://www.udemy.com/courses/free/',
    description: '5000+ free courses on Udemy covering development, business, design and personal growth. Free certificate of completion.',
    tags: ['Udemy', 'Varied'],
  },
  {
    id: 'linkedin-learning',
    name: 'LinkedIn Learning — 1-Month Free',
    provider: 'LinkedIn',
    providerType: 'Platform',
    category: 'business',
    certType: 'FREE_CERT',
    duration: '1 month trial',
    level: 'All Levels',
    url: 'https://www.linkedin.com/learning/',
    description: '20,000+ courses — first month free. Certificate adds directly to your LinkedIn profile.',
    tags: ['LinkedIn', 'Professional', 'Trial'],
  },
  {
    id: 'duolingo',
    name: 'Duolingo — Language Learning',
    provider: 'Duolingo',
    providerType: 'Platform',
    category: 'language',
    certType: 'FREE_CERT',
    duration: 'Self-paced',
    level: 'Beginner',
    url: 'https://www.duolingo.com',
    description: 'Free gamified language learning for English, French, Spanish, Hindi and 40+ more languages. Duolingo English Test accepted globally.',
    tags: ['Languages', 'English', 'Free'],
    featured: true,
  },

  // ── ACADEMIC ─────────────────────────────────────────────────────────────────
  {
    id: 'freecodecamp',
    name: 'freeCodeCamp Full-Stack Dev',
    provider: 'freeCodeCamp',
    providerType: 'Academic',
    category: 'web',
    certType: 'FREE_CERT',
    duration: '300+ hours',
    level: 'Beginner',
    url: 'https://www.freecodecamp.org',
    description: 'Completely free full-stack coding curriculum with verified certificates in JS, React, Python and ML.',
    tags: ['JavaScript', 'React', 'Python', 'HTML'],
    featured: true,
  },
  {
    id: 'cs50-x',
    name: 'CS50: Intro to Computer Science',
    provider: 'Harvard (edX)',
    providerType: 'Academic',
    category: 'web',
    certType: 'FREE_CERT',
    duration: '10 weeks',
    level: 'Beginner',
    url: 'https://cs50.harvard.edu/x',
    description: "Harvard's legendary CS course. Free to attend and earn a certificate. Globally respected by employers.",
    tags: ['Harvard', 'CS50', 'C', 'Python'],
    featured: true,
  },
  {
    id: 'cs50-ai',
    name: "CS50's Introduction to AI with Python",
    provider: 'Harvard (edX)',
    providerType: 'Academic',
    category: 'ai',
    certType: 'FREE_CERT',
    duration: '7 weeks',
    level: 'Intermediate',
    url: 'https://cs50.harvard.edu/ai',
    description: "Harvard's AI course covering search, ML, neural networks in Python. Free certificate from Harvard.",
    tags: ['Harvard', 'CS50', 'AI', 'Python'],
    featured: true,
  },
  {
    id: 'odin-project',
    name: 'The Odin Project — Full-Stack',
    provider: 'The Odin Project',
    providerType: 'Academic',
    category: 'web',
    certType: 'COURSE_ONLY',
    duration: '9–12 months',
    level: 'Beginner',
    url: 'https://www.theodinproject.com',
    description: 'Completely free, open-source full-stack curriculum in HTML, CSS, JS, Node, React. Highly respected in industry.',
    tags: ['Full-Stack', 'JavaScript', 'Node.js'],
  },
  {
    id: 'khan-academy',
    name: 'Khan Academy — Computing & Algorithms',
    provider: 'Khan Academy',
    providerType: 'Academic',
    category: 'web',
    certType: 'COURSE_ONLY',
    duration: 'Self-paced',
    level: 'Beginner',
    url: 'https://www.khanacademy.org/computing',
    description: 'Free world-class education in programming, algorithms and CS fundamentals. No formal certificate.',
    tags: ['Khan Academy', 'CS', 'Algorithms'],
  },
  {
    id: 'british-council',
    name: 'LearnEnglish — British Council',
    provider: 'British Council',
    providerType: 'Academic',
    category: 'language',
    certType: 'COURSE_ONLY',
    duration: 'Self-paced',
    level: 'All Levels',
    url: 'https://learnenglish.britishcouncil.org/skills',
    description: 'Free English learning resources from the British Council — grammar, vocabulary, listening and writing.',
    tags: ['English', 'British Council', 'Language'],
  },
]

// ── localStorage helpers ───────────────────────────────────────────────────────
const STORAGE_KEY = 'arthavi_course_status'
const loadStatus = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} } }
const saveStatus = (s) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { } }

// ── Provider type badge colours ───────────────────────────────────────────────
const PROV_COLORS = {
  Government: { bg: '#dcfce7', color: '#15803d' },
  Company: { bg: '#dbeafe', color: '#1d4ed8' },
  Platform: { bg: '#f3e8ff', color: '#7e22ce' },
  Academic: { bg: '#fef9c3', color: '#92400e' },
}

// ── CourseCard ─────────────────────────────────────────────────────────────────
function CourseCard({ course, status, onStatusChange }) {
  const cert = CERT_TYPES[course.certType]
  const cat = CATEGORIES.find(c => c.id === course.category) || {}
  const statusMeta = STATUS_OPTIONS.find(s => s.id === status) || STATUS_OPTIONS[0]
  const provColor = PROV_COLORS[course.providerType] || PROV_COLORS.Platform

  return (
    <div style={{
      background: '#fff',
      border: `1.5px solid ${course.featured ? '#c7d2fe' : C.border}`,
      borderRadius: '14px',
      padding: '18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      position: 'relative',
      transition: 'box-shadow .2s',
      boxShadow: course.featured
        ? '0 4px 16px rgba(109,40,217,.10)'
        : '0 1px 3px rgba(0,0,0,.04)',
    }}>
      {/* Popular ribbon */}
      {course.featured && (
        <div style={{
          position: 'absolute', top: '-1px', right: '14px',
          background: 'linear-gradient(135deg,#6d28d9,#4f46e5)',
          color: '#fff', fontSize: '10px', fontWeight: '700',
          padding: '2px 10px', borderRadius: '0 0 8px 8px',
          letterSpacing: '.05em', textTransform: 'uppercase',
        }}>⭐ Popular</div>
      )}

      {/* Course name + provider */}
      <div>
        <div style={{
          fontWeight: '700', fontSize: '14px', color: '#0f172a',
          lineHeight: '1.35', marginBottom: '5px', paddingRight: course.featured ? '60px' : 0
        }}>
          {course.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '11px', fontWeight: '700', padding: '2px 8px',
            borderRadius: '20px', background: provColor.bg, color: provColor.color,
          }}>{course.providerType}</span>
          <span style={{ fontSize: '12px', color: C.slate, fontWeight: '500' }}>{course.provider}</span>
        </div>
      </div>

      {/* Badge row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
        <span style={{
          fontSize: '11px', fontWeight: '600', padding: '2px 8px',
          borderRadius: '20px', background: C.indigoBg, color: C.indigo,
        }}>{cat.icon} {cat.label}</span>

        <span style={{
          fontSize: '11px', fontWeight: '700', padding: '2px 8px',
          borderRadius: '20px', background: cert.bg, color: cert.color,
          border: `1px solid ${cert.border}`,
        }}>{cert.label}</span>

        <span style={{
          fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
          background: '#f1f5f9', color: '#475569', fontWeight: '500',
        }}>⏱ {course.duration}</span>

        <span style={{
          fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
          background: '#f1f5f9', color: '#475569', fontWeight: '500',
        }}>{course.level}</span>
      </div>

      {/* Description */}
      <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: '1.55', flex: 1 }}>
        {course.description}
      </p>

      {/* Action row */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
        <a
          href={course.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: '1 1 110px',
            padding: '8px 14px', borderRadius: '8px',
            background: 'linear-gradient(135deg,#6d28d9,#4338ca)',
            color: '#fff', fontSize: '12px', fontWeight: '600',
            textDecoration: 'none', textAlign: 'center',
            display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', gap: '4px',
          }}
        >🔗 Go to Course</a>

        <select
          value={status}
          onChange={e => onStatusChange(course.id, e.target.value)}
          style={{
            flex: '1 1 110px',
            padding: '7px 10px', borderRadius: '8px', fontSize: '12px',
            fontFamily: 'inherit', fontWeight: '600', cursor: 'pointer', outline: 'none',
            border: `1.5px solid ${statusMeta.color}50`,
            background: `${statusMeta.color}15`,
            color: statusMeta.color,
          }}
        >
          {STATUS_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
    </div>
  )
}

// ── Main Panel ─────────────────────────────────────────────────────────────────
export default function FreeCoursesPanel() {
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('all')
  const [provType, setProvType] = useState('All Providers')
  const [certFilter, setCertFilter] = useState('all')
  const [statuses, setStatuses] = useState(loadStatus)

  const handleStatus = (id, val) => {
    setStatuses(prev => {
      const next = { ...prev, [id]: val }
      saveStatus(next)
      return next
    })
  }

  const filtered = useMemo(() => {
    return COURSES.filter(course => {
      if (cat !== 'all' && course.category !== cat) return false
      if (provType !== 'All Providers' && course.providerType !== provType) return false
      if (certFilter === 'free' && course.certType !== 'FREE_CERT') return false
      if (certFilter === 'badge' && course.certType !== 'FREE_BADGE') return false
      if (certFilter === 'course' && course.certType !== 'COURSE_ONLY') return false
      if (certFilter === 'paid' && course.certType !== 'PAID_CERT') return false
      if (search) {
        const lq = search.toLowerCase()
        return course.name.toLowerCase().includes(lq)
          || course.provider.toLowerCase().includes(lq)
          || course.description.toLowerCase().includes(lq)
          || (course.tags || []).some(t => t.toLowerCase().includes(lq))
      }
      return true
    })
  }, [search, cat, provType, certFilter])

  const total = COURSES.length
  const freeCerts = COURSES.filter(c => c.certType === 'FREE_CERT').length
  const freeBadges = COURSES.filter(c => c.certType === 'FREE_BADGE').length
  const myDone = Object.values(statuses).filter(s => s === 'completed' || s === 'certified').length

  return (
    <div style={{ minHeight: '100%', background: C.panel, fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <style>{`
        @keyframes fc-in { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        .fc-card { animation: fc-in .22s ease both }
        .fc-chip  { transition: all .15s }
        .fc-chip:hover { opacity: .85 }
        .fc-search:focus { border-color: #6d28d9 !important; box-shadow: 0 0 0 3px rgba(109,40,217,.1); outline: none }
        @media(max-width:768px){
          .fc-hero   { padding: 18px 16px 0 !important }
          .fc-body   { padding: 16px 16px !important }
          .fc-stats  { grid-template-columns: repeat(2,1fr) !important }
          .fc-grid   { grid-template-columns: 1fr !important }
          .fc-cats   { gap: 5px !important; flex-wrap: nowrap !important }
          .fc-cats::-webkit-scrollbar { display: none }
          .fc-filters{ flex-wrap: wrap !important }
          .fc-search { flex: 1 1 100% !important }
          .fc-sel    { flex: 1 1 calc(50% - 6px) !important; min-width: 0 !important; font-size: 12px !important; padding: 8px 8px !important }
        }
      `}</style>

      {/* ── Hero Header ── */}
      <div className="fc-hero" style={{
        background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 55%,#4338ca 100%)',
        padding: '28px 32px 0',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: '20px', gap: '12px', flexWrap: 'wrap'
        }}>
          <div>
            <h1 style={{
              margin: 0, color: '#fff', fontSize: '22px', fontWeight: '800',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              🎓 SkillUp Hub
            </h1>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,.6)', fontSize: '13px' }}>
              Curated free courses &amp; certifications — Government · Companies · Platforms
            </p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(6px)',
            borderRadius: '12px', padding: '10px 18px',
            display: 'flex', gap: '20px',
          }}>
            {[
              { v: total, l: 'Courses' },
              { v: freeCerts, l: 'Free Certs' },
              { v: freeBadges, l: 'Badges' },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'center' }}>
                <div style={{ color: '#fff', fontWeight: '800', fontSize: '20px', lineHeight: 1 }}>{s.v}</div>
                <div style={{
                  color: 'rgba(255,255,255,.55)', fontSize: '10px',
                  textTransform: 'uppercase', letterSpacing: '.05em', marginTop: '2px'
                }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Category chips */}
        <div className="fc-cats" style={{
          display: 'flex', gap: '6px', overflowX: 'auto',
          WebkitOverflowScrolling: 'touch', paddingBottom: '16px',
        }}>
          {CATEGORIES.map(c => (
            <button key={c.id} className="fc-chip"
              onClick={() => setCat(c.id)}
              style={{
                padding: '7px 14px', borderRadius: '999px', border: 'none',
                fontSize: '12px', fontWeight: '600', fontFamily: 'inherit',
                cursor: 'pointer', flexShrink: 0,
                background: cat === c.id ? '#fff' : 'rgba(255,255,255,.13)',
                color: cat === c.id ? '#4338ca' : 'rgba(255,255,255,.85)',
                boxShadow: cat === c.id ? '0 2px 8px rgba(0,0,0,.15)' : 'none',
              }}
            >{c.icon} {c.label}</button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="fc-body" style={{ padding: '24px 32px', maxWidth: '1280px', margin: '0 auto' }}>

        {/* Stats row */}
        <div className="fc-stats" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
          gap: '14px', marginBottom: '24px',
        }}>
          {[
            { icon: '📚', label: 'Total Courses', value: total, color: C.indigo, bg: C.indigoBg },
            { icon: '🏆', label: 'Free Certificates', value: freeCerts, color: C.green, bg: C.greenBg },
            { icon: '🎖', label: 'Free Badges', value: freeBadges, color: C.blue, bg: C.blueBg },
            { icon: '✅', label: 'My Completions', value: myDone, color: C.purple, bg: C.purpleBg },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, border: `1.5px solid ${s.color}25`,
              borderRadius: '14px', padding: '18px 14px', textAlign: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,.04)',
            }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontWeight: '800', fontSize: '26px', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{
                fontSize: '11px', color: C.slate, marginTop: '5px', fontWeight: '600',
                textTransform: 'uppercase', letterSpacing: '.04em'
              }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search + filter bar */}
        <div className="fc-filters" style={{
          background: '#fff', border: `1px solid ${C.border}`, borderRadius: '14px',
          padding: '14px 16px', marginBottom: '20px',
          display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,.04)',
        }}>
          <input
            className="fc-search"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍  Search courses, providers, skills, tags…"
            style={{
              flex: '2 1 220px', padding: '10px 14px', borderRadius: '8px',
              border: `1.5px solid ${C.border}`, fontSize: '13px',
              fontFamily: 'inherit', color: '#0f172a',
              transition: 'border-color .15s',
            }}
          />
          <select value={provType} onChange={e => setProvType(e.target.value)} className="fc-sel" style={selStyle}>
            {PROVIDER_TYPES.map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={certFilter} onChange={e => setCertFilter(e.target.value)} className="fc-sel" style={selStyle}>
            <option value="all">All Certificate Types</option>
            <option value="free">🏆 Free Certificate</option>
            <option value="badge">🎖 Free Badge</option>
            <option value="course">📖 Course Only</option>
            <option value="paid">💳 Paid Certificate</option>
          </select>
          {(search || cat !== 'all' || provType !== 'All Providers' || certFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setCat('all'); setProvType('All Providers'); setCertFilter('all') }}
              style={{
                padding: '9px 14px', borderRadius: '8px', border: `1px solid ${C.border}`,
                background: '#f8fafc', color: C.slate, fontSize: '12px',
                fontFamily: 'inherit', fontWeight: '600', cursor: 'pointer',
              }}
            >✕ Clear</button>
          )}
        </div>

        {/* Result count */}
        <div style={{
          marginBottom: '16px', fontSize: '13px', color: C.slate, fontWeight: '600',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span style={{
            background: C.indigoBg, color: C.indigo, padding: '2px 10px',
            borderRadius: '20px', fontWeight: '700', fontSize: '13px',
          }}>{filtered.length}</span>
          course{filtered.length !== 1 ? 's' : ''} found
          {cat !== 'all' && <span> · <strong>{CATEGORIES.find(c => c.id === cat)?.label}</strong></span>}
          {provType !== 'All Providers' && <span> · <strong>{provType}</strong></span>}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.slate }}>
            <div style={{ fontSize: '48px', marginBottom: '14px' }}>🔍</div>
            <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '6px' }}>No courses found</div>
            <div style={{ fontSize: '13px' }}>Try adjusting your filters or search term</div>
          </div>
        ) : (
          <div className="fc-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(310px,1fr))',
            gap: '16px',
          }}>
            {filtered.map((course, i) => (
              <div key={course.id} className="fc-card"
                style={{ animationDelay: `${Math.min(i, 12) * 0.04}s` }}>
                <CourseCard
                  course={course}
                  status={statuses[course.id] || ''}
                  onStatusChange={handleStatus}
                />
              </div>
            ))}
          </div>
        )}

        {/* Footer note */}
        <div style={{
          marginTop: '32px', padding: '14px 18px', borderRadius: '10px',
          background: '#fff', border: `1px solid ${C.border}`,
          fontSize: '12px', color: C.slate, lineHeight: '1.6',
        }}>
          <strong>ℹ️ Note:</strong> Course status (Enrolled / Completed / Certified) is saved locally on this
          device. Click <em>Go to Course</em> to visit the official platform. Free certificate availability
          may change — always verify on the provider's website.
        </div>
      </div>
    </div>
  )
}

const selStyle = {
  flex: '1 1 150px', minWidth: 0, padding: '10px 12px', borderRadius: '8px',
  border: `1.5px solid #e2e8f0`, fontSize: '13px', fontFamily: 'inherit',
  outline: 'none', color: '#374151', background: '#fff', cursor: 'pointer',
}
