/**
 * DegreeHubPanel.jsx — Arthavi Degree / College Learning Ecosystem
 *
 * A complete university-level learning platform:
 *   🎓 My Degree   — personalized profile (course, year, university)
 *   📝 Smart Notes — AI-generated unit-wise exam notes (via /api/chat)
 *   📋 PYQ Bank    — previous-year questions with multi-filter
 *   🛠 Skill Lab   — career-building courses with free resources
 *   📅 Exam Tracker— countdown + exam schedule for competitive exams
 */
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { apiPost } from '../../utils/api'

// ── Brand palette ─────────────────────────────────────────────────────────────
const C = {
  indigo:  '#6d28d9', indigoD: '#4338ca', indigoL: '#8b5cf6', indigoBg: '#eef2ff',
  green:   '#16a34a', greenBg: '#f0fdf4',
  amber:   '#d97706', amberBg: '#fffbeb',
  red:     '#dc2626', redBg:   '#fef2f2',
  blue:    '#2563eb', blueBg:  '#eff6ff',
  teal:    '#0d9488', tealBg:  '#f0fdfa',
  rose:    '#e11d48', roseBg:  '#fff1f2',
  orange:  '#ea580c', orangeBg:'#fff7ed',
  purple:  '#9333ea', purpleBg:'#f3e8ff',
  cyan:    '#0891b2', cyanBg:  '#ecfeff',
  slate:   '#64748b', border:  '#e2e8f0', panel: '#f8fafc',
}

const LS_PROFILE  = 'arthavi_degree_profile'
const LS_NOTES    = 'arthavi_degree_notes'
const LS_SKILLS   = 'arthavi_degree_skills'
const LS_EXAMS    = 'arthavi_tracked_exams'
const LS_PRACTICE = 'arthavi_degree_practice'   // { subjectId__unit: { attempts, correct } }
const LS_STUDYPLAN= 'arthavi_degree_studyplan'   // { planText, examName, examDate, generatedAt }
const LS_THISTORY = 'arthavi_degree_test_history' // [{ date,score,total,subject,type }]

// ─────────────────────────── STATIC DATA ──────────────────────────────────────

const COURSES = [
  { id:'bsc-cs',    label:'BSc Computer Science',        icon:'💻' },
  { id:'bsc-math',  label:'BSc Mathematics',              icon:'📐' },
  { id:'bsc-phy',   label:'BSc Physics',                  icon:'⚛️' },
  { id:'bcom',      label:'BCom (General)',               icon:'💰' },
  { id:'bcom-hons', label:'BCom Honours',                 icon:'📊' },
  { id:'ba-eco',    label:'BA Economics',                 icon:'📈' },
  { id:'ba-eng',    label:'BA English Literature',        icon:'📖' },
  { id:'bba',       label:'BBA / BBM',                    icon:'🏢' },
  { id:'bca',       label:'BCA',                          icon:'🖥️' },
  { id:'btech-cs',  label:'BTech Computer Science',       icon:'⚙️' },
  { id:'btech-ece', label:'BTech Electronics (ECE)',      icon:'📡' },
]

const YEARS = [
  { id:'1', label:'1st Year' },
  { id:'2', label:'2nd Year' },
  { id:'3', label:'3rd Year' },
  { id:'4', label:'4th Year (Hons / BTech)' },
]

const UNIVERSITIES = [
  'Delhi University (DU)','Mumbai University','Calicut University',
  'Osmania University','Pune University','Bangalore University',
  'Madras University','Calcutta University','Hyderabad University',
  'Utkal University (Odisha)','Berhampur University','Sambalpur University',
  'Gujarat University','Rajasthan University','Andhra University',
  'Anna University','VTU (Visvesvaraya)','JNTU Hyderabad',
  'Amity University','Symbiosis International','Other / Not Listed',
]

// Course → Year → Subjects ↓
const CURRICULUM = {
  'bsc-cs': {
    '1': [
      { id:'prog-c',   name:'Programming in C',       icon:'💻', units:['Introduction to C & Setup','Variables, Operators & Expressions','Control Structures & Loops','Functions & Recursion','Pointers & Dynamic Memory','Arrays, Strings & File Handling'] },
      { id:'math1',    name:'Mathematics I',          icon:'📐', units:['Limits & Continuity','Differentiation','Integration Techniques','Differential Equations','Sequences & Series'] },
      { id:'dig-elec', name:'Digital Electronics',    icon:'⚡', units:['Number Systems & Codes','Boolean Algebra & Logic Gates','Combinational Circuits','Sequential Circuits & Flip-Flops','Memory Devices & PLDs'] },
      { id:'eng1',     name:'English Communication',  icon:'📝', units:['Grammar & Vocabulary','Reading & Comprehension','Technical Writing','Presentation & Speaking Skills'] },
    ],
    '2': [
      { id:'ds',    name:'Data Structures',      icon:'🗂️', units:['Arrays & Linked Lists','Stacks & Queues','Trees & BST','Graphs (BFS/DFS)','Sorting & Searching Algorithms','Hashing Techniques'] },
      { id:'os',    name:'Operating Systems',    icon:'🖥️', units:['Process Management & Scheduling','CPU Scheduling Algorithms','Memory Management & Paging','File System Implementation','Deadlocks & Synchronization'] },
      { id:'dbms',  name:'Database Management',  icon:'🗄️', units:['ER Model & Relational Algebra','SQL — DDL & DML','Normalization (1NF–BCNF)','Transactions & ACID Properties','Indexing, Hashing & Query Optimization'] },
      { id:'python',name:'Python Programming',   icon:'🐍', units:['Python Basics & Data Types','OOP in Python','File & Exception Handling','Modules, Packages & Libraries','Data Analysis with Pandas & NumPy'] },
    ],
    '3': [
      { id:'cn',  name:'Computer Networks',      icon:'🌐', units:['OSI & TCP/IP Models','Data Link Layer & Framing','Network Layer & Routing Algorithms','Transport Layer (TCP/UDP)','Application Layer & Network Security'] },
      { id:'se',  name:'Software Engineering',   icon:'📋', units:['SDLC Models (Waterfall, Agile)','Requirements Engineering','System Design Principles','Software Testing Strategies','Project Management & Cost Estimation'] },
      { id:'ml',  name:'Machine Learning',       icon:'🤖', units:['Introduction to ML & Types','Linear & Logistic Regression','Decision Trees & Ensemble Methods','Clustering (K-Means, DBSCAN)','Neural Networks & Deep Learning Intro'] },
      { id:'web', name:'Web Technologies',       icon:'🌍', units:['HTML5 & CSS3 Fundamentals','JavaScript & DOM Manipulation','React.js Basics','Node.js & REST APIs','Web Security & Deployment'] },
    ],
  },
  'bcom': {
    '1': [
      { id:'fin-acc',  name:'Financial Accounting',  icon:'📒', units:['Accounting Concepts & GAAP','Journal, Ledger & Trial Balance','Final Accounts (Trading, P&L, BS)','Bank Reconciliation Statement','Depreciation Methods','Consignment & Joint Venture Accounts'] },
      { id:'biz-eco',  name:'Business Economics',    icon:'💹', units:['Demand, Supply & Equilibrium','Elasticity of Demand & Supply','Theory of Production & Cost','Market Structures (Perfect, Monopoly etc.)','Macroeconomics Overview'] },
      { id:'biz-math', name:'Business Mathematics',  icon:'🔢', units:['Simple & Compound Interest','Ratio, Proportion & Partnership','Matrices & Determinants','Linear Programming','Statistics & Probability Basics'] },
      { id:'biz-law',  name:'Business Law',          icon:'⚖️', units:['Indian Contract Act 1872','Sale of Goods Act 1930','Partnership Act 1932','Negotiable Instruments Act','Consumer Protection Act 2019'] },
    ],
    '2': [
      { id:'cost-acc', name:'Cost Accounting',       icon:'💸', units:['Cost Classification & Concepts','Material Cost Control','Labour Cost & Overheads','Marginal Costing & CVP Analysis','Standard Costing & Variance Analysis'] },
      { id:'corp-law', name:'Corporate Law',         icon:'🏛️', units:['Companies Act 2013 — Key Provisions','Formation & Incorporation','Share Capital & Debentures','Board of Directors & Meetings','Winding Up of Companies'] },
      { id:'fin-mgmt', name:'Financial Management',  icon:'💰', units:['Time Value of Money','Sources of Finance','Capital Budgeting (NPV, IRR, Payback)','Working Capital Management','Leverage & Capital Structure'] },
      { id:'biz-stat', name:'Business Statistics',   icon:'📊', units:['Measures of Central Tendency','Measures of Dispersion','Correlation & Regression','Index Numbers','Probability Distributions'] },
    ],
    '3': [
      { id:'tax',      name:'Income Tax',             icon:'🧾', units:['Residential Status & Scope','Income from Salary','Income from House Property','PGBP & Capital Gains','Deductions (80C–80U) & Tax Computation'] },
      { id:'audit',    name:'Auditing & Assurance',   icon:'🔍', units:['Auditing Concepts & Standards','Internal Controls & Risk Assessment','Vouching & Verification','Company Audit & Auditor Report','Special Audits (Tax, Cost)'] },
      { id:'mgmt-acc', name:'Management Accounting',  icon:'📈', units:['Budgetary Control','Standard Costing & Variances','Activity-Based Costing','Balanced Scorecard','Decision Making & Marginal Analysis'] },
      { id:'entrep',   name:'Entrepreneurship',       icon:'🚀', units:['Entrepreneurship & Innovation','Business Plan & Feasibility','Sources of Startup Funding (India)','Marketing for Startups','Startup Ecosystem — DPIIT, Startup India'] },
    ],
  },
  'ba-eco': {
    '1': [
      { id:'micro1', name:'Microeconomics I',           icon:'📈', units:["Consumer Theory & Utility","Indifference Curves & Budget Line","Theory of Production","Cost Analysis","Market Equilibrium & Price Theory"] },
      { id:'ind-eco', name:'Indian Economy',            icon:'🇮🇳', units:['Structure of the Indian Economy','Agriculture & Rural Development','Industrial Policy & Growth','Services Sector & IT','Contemporary Issues (Inflation, Unemployment)'] },
      { id:'eco-stat',name:'Statistics for Economics', icon:'📊', units:['Data Collection & Presentation','Measures of Central Tendency & Dispersion','Probability & Distributions','Regression Analysis','Time Series & Index Numbers'] },
      { id:'eco-eng', name:'English for Economists',   icon:'📝', units:['Economic Report Writing','Case Study Analysis','Data Interpretation & Presentation','Group Discussion & Seminars'] },
    ],
    '2': [
      { id:'macro1',  name:'Macroeconomics',           icon:'🌏', units:['National Income Accounting','Keynesian Theory & Multiplier','IS-LM Model','Inflation Theory & Policy','Monetary Policy & RBI'] },
      { id:'pub-fin', name:'Public Finance',           icon:'🏦', units:['Public Goods & Market Failure','Principles of Taxation','Government Expenditure & Budget','Fiscal Deficit & Public Debt','Federal Finance in India — GST & Finance Commission'] },
      { id:'dev-eco', name:'Development Economics',   icon:'🌱', units:['Theories of Economic Development','Poverty Measurement & Alleviation','Human Development Index','Sustainable Development Goals','Foreign Aid & FDI'] },
      { id:'econom',  name:'Introductory Econometrics',icon:'🔢', units:['Simple Linear Regression','Multiple Regression & Interpretation','Hypothesis Testing in Regression','Heteroscedasticity & Autocorrelation','Dummy Variables & Model Selection'] },
    ],
    '3': [
      { id:'int-eco',  name:'International Economics', icon:'🌐', units:['Theories of Trade (Comparative Advantage, HO)','Trade Policy — Tariffs & Quotas','Balance of Payments','Foreign Exchange & Exchange Rates','WTO & Regional Trade Agreements'] },
      { id:'agri-eco', name:'Agricultural Economics', icon:'🌾', units:['Land Revenue Systems in India','Agricultural Markets & APMCs','Green Revolution & Its Impact','MSP, Food Security & PDS','Farm Credit & Cooperative Structure'] },
      { id:'env-eco',  name:'Environmental Economics',icon:'🌿', units:['Externalities & Market Failure','Coase Theorem & Pollution Tax','Environmental Valuation Methods','Climate Change Economics','India\'s Environment Policy & NGT'] },
    ],
  },
  'bba': {
    '1': [
      { id:'mgmt-pr',  name:'Principles of Management',  icon:'🏢', units:['Evolution of Management Thought','Planning & Decision Making','Organising & Authority','Motivation Theories (Maslow, Herzberg)','Controlling & MIS'] },
      { id:'bba-acc',  name:'Business Accounting',        icon:'💰', units:['Accounting Equation & Concepts','Journal & Ledger Entries','Financial Statements Analysis','Ratio Analysis','Cash Flow Statement'] },
      { id:'bba-mkt',  name:'Marketing Management',       icon:'📣', units:['Marketing Concepts & Mix (4Ps)','Consumer Behaviour & Buying Process','Market Segmentation, Targeting & Positioning','Product Life Cycle & Branding','Digital Marketing Overview'] },
      { id:'bba-law',  name:'Business Law',               icon:'⚖️', units:['Indian Contract Act','Sale of Goods & Agency','Companies Act Basics','Labour Laws in India','Intellectual Property Rights'] },
    ],
    '2': [
      { id:'hrm',      name:'Human Resource Management',  icon:'👥', units:['HRM Concepts & Functions','Recruitment, Selection & Onboarding','Training & Development Methods','Performance Appraisal Systems','Compensation & Rewards Management'] },
      { id:'ops-mgmt', name:'Operations Management',      icon:'⚙️', units:['Production & Operations Concepts','Inventory Management (EOQ, JIT)','Quality Management (TQM, Six Sigma)','Supply Chain Management','Project Management (CPM, PERT)'] },
      { id:'fin-mgt2', name:'Financial Management',       icon:'📊', units:['Sources of Finance','Working Capital Management','Capital Budgeting Methods','Leverage Analysis','Financial Ratio Analysis'] },
      { id:'biz-comm', name:'Business Communication',     icon:'💬', units:['Effective Communication Process','Business Writing & Email Etiquette','Presentation Skills','Negotiation & Conflict Resolution','Cross-cultural Communication'] },
    ],
    '3': [
      { id:'strat-mgt',name:'Strategic Management',       icon:'♟️', units:['Strategic Analysis (SWOT, PESTLE, Porter\'s 5 Forces)','Corporate-Level Strategies','Business-Level Strategies (Porter\'s Generic)','Strategy Implementation & BSC','Corporate Governance & Ethics'] },
      { id:'ebiz',     name:'E-Business & Digital Mgmt',  icon:'🌐', units:['E-Commerce Models (B2B, B2C, C2C)','Digital Payment Ecosystems','Social Media & Content Marketing','Data Analytics for Business Decisions','Cybersecurity & Legal Issues in E-Business'] },
      { id:'entrep2',  name:'Entrepreneurship Development',icon:'🚀', units:['Opportunity Identification & Creativity','Business Plan Writing','Startup Funding in India (Angel, VC, Govt)','Legal Compliance for Startups','Revenue Models & Scaling Strategies'] },
    ],
  },
  'bca': {
    '1': [
      { id:'bca-c',   name:'Programming in C',          icon:'💻', units:['C Basics & Data Types','Control Flow & Loops','Functions & Pointers','Arrays, Strings & Structures','File Handling in C'] },
      { id:'bca-math',name:'Mathematics for Computing', icon:'📐', units:['Sets, Logic & Boolean Algebra','Relations & Functions','Graph Theory Basics','Number Theory & Combinatorics','Probability'] },
      { id:'bca-de',  name:'Digital Fundamentals',      icon:'⚡', units:['Number Systems & Conversion','Logic Gates & Boolean Simplification','Combinational Circuit Design','Sequential Circuits (Flip-Flops)','Computer Organisation Basics'] },
      { id:'bca-acc', name:'Accounts & Finance Basics', icon:'💰', units:['Accounting Principles & Concepts','Journal, Ledger & Trial Balance','Financial Statements','GST Overview','IT in Accounting (Tally)'] },
    ],
    '2': [
      { id:'bca-ds',  name:'Data Structures using C',   icon:'🗂️', units:['Arrays & Linked Lists','Stacks & Queues','Trees & Binary Search Trees','Graph Algorithms','Sorting & Searching'] },
      { id:'bca-java',name:'Java Programming',          icon:'☕', units:['OOP Concepts & Java Basics','Classes, Objects & Constructors','Inheritance, Polymorphism & Interfaces','Exception Handling & File I/O','Collections Framework & Java 8 Features'] },
      { id:'bca-dbms',name:'Database Systems',          icon:'🗄️', units:['ER Model & Relational Model','SQL Queries (DDL, DML, DCL)','Normalization (1NF–BCNF)','Transactions & Concurrency Control','PL/SQL & Stored Procedures'] },
      { id:'bca-os',  name:'Operating Systems',         icon:'🖥️', units:['OS Functions & Types','Process & Thread Management','CPU Scheduling','Memory Management','File Systems & Deadlock Handling'] },
    ],
    '3': [
      { id:'bca-web', name:'Web Development',           icon:'🌍', units:['HTML5, CSS3 & Responsive Design','JavaScript & jQuery','PHP & MySQL for Web','React.js / Angular Introduction','Final Year Project Planning'] },
      { id:'bca-net', name:'Computer Networks',         icon:'🌐', units:['Network Architecture & Topologies','Protocols (HTTP, FTP, DNS, DHCP)','TCP/IP Stack & IP Addressing','Network Security & Cryptography','Practical: Configure LAN, Wireshark'] },
      { id:'bca-proj',name:'Software Project (Minor)',  icon:'📋', units:['Project Scoping & SRS Writing','System Design (DFD, ER Diagram)','Coding Standards & Version Control','Testing: Unit, Integration, UAT','Deployment & Documentation'] },
    ],
  },
}

const getSubjects = (cId, yId) => CURRICULUM[cId]?.[yId] || [
  { id:'gs1', name:'Core Subject I',     icon:'📖', units:['Unit 1: Foundations','Unit 2: Core Concepts','Unit 3: Applications','Unit 4: Case Studies'] },
  { id:'gs2', name:'Core Subject II',    icon:'📗', units:['Unit 1: Introduction','Unit 2: Principles','Unit 3: Methods','Unit 4: Evaluation'] },
  { id:'gs3', name:'Elective / Optional',icon:'🎯', units:['Unit 1: Overview','Unit 2: Deep Dive','Unit 3: Problems','Unit 4: Practice'] },
]

// PYQ Database
const PYQS = [
  { id:'p1',  subject:'Programming in C',        year:'2023', university:'Delhi University (DU)',    marks:10, type:'long',  q:'Explain the concept of pointers in C with examples. Write a program to swap two numbers using pointers and explain call-by-value vs call-by-reference.' },
  { id:'p2',  subject:'Programming in C',        year:'2022', university:'Mumbai University',        marks:5,  type:'short', q:'What is the difference between structure and union in C? Give a practical example of each.' },
  { id:'p3',  subject:'Data Structures',         year:'2023', university:'Delhi University (DU)',    marks:15, type:'long',  q:'Explain AVL trees with rotations. Trace through insertion of the sequence 30, 20, 10, 25, 28 into an initially empty AVL tree, showing all rotations.' },
  { id:'p4',  subject:'Data Structures',         year:'2023', university:'Mumbai University',        marks:5,  type:'short', q:'Compare the time complexity of Quick Sort, Merge Sort, and Heap Sort in best, average, and worst cases. Which would you prefer for large datasets and why?' },
  { id:'p5',  subject:'Data Structures',         year:'2022', university:'Calicut University',       marks:10, type:'long',  q:'Explain BFS and DFS graph traversal algorithms with examples. Implement DFS using recursion and BFS using a queue. Analyze their time and space complexity.' },
  { id:'p6',  subject:'Operating Systems',       year:'2023', university:'Delhi University (DU)',    marks:10, type:'long',  q:"Explain Banker's Algorithm for deadlock avoidance with an example. Given: 5 processes, 3 resource types. Show the safe sequence if a safe state exists." },
  { id:'p7',  subject:'Operating Systems',       year:'2022', university:'Osmania University',       marks:5,  type:'short', q:'Compare FCFS, SJF, and Round Robin CPU scheduling. Draw Gantt charts for: Processes P1(8ms), P2(4ms), P3(9ms) with time quantum=4 for RR.' },
  { id:'p8',  subject:'Database Management',     year:'2023', university:'Delhi University (DU)',    marks:10, type:'long',  q:'What is normalization? Define FDs, 1NF, 2NF, and 3NF with examples. Convert the following relation to 3NF: Student(SID, SName, DID, DName, CID, Grade, InstructorID, IName).' },
  { id:'p9',  subject:'Database Management',     year:'2022', university:'Calicut University',       marks:5,  type:'short', q:'Write SQL queries to: (a) Find all employees with salary > ₹50,000, (b) Display department-wise average salary sorted by dept name, (c) List employees with no manager.' },
  { id:'p10', subject:'Computer Networks',       year:'2023', university:'Delhi University (DU)',    marks:15, type:'long',  q:'Explain the OSI reference model layer by layer with protocols at each layer. Compare OSI with TCP/IP. What are the advantages of layered architecture?' },
  { id:'p11', subject:'Computer Networks',       year:'2022', university:'Mumbai University',        marks:5,  type:'short', q:'What is subnetting? Divide 192.168.1.0/24 into 4 equal subnets. Show subnet address, broadcast, and usable range for each.' },
  { id:'p12', subject:'Machine Learning',        year:'2023', university:'Bangalore University',     marks:10, type:'long',  q:'Explain the k-Nearest Neighbors algorithm. How do you select optimal k? Compare Euclidean and Manhattan distance. What are the limitations of KNN for large datasets?' },
  { id:'p13', subject:'Financial Accounting',    year:'2023', university:'Delhi University (DU)',    marks:15, type:'long',  q:'From the following Trial Balance of M/s XYZ Traders (31st March 2023), prepare Trading & P&L Account and Balance Sheet. [Adjustments: closing stock ₹40,000; depreciation 10%; outstanding rent ₹5,000]' },
  { id:'p14', subject:'Financial Accounting',    year:'2022', university:'Mumbai University',        marks:10, type:'long',  q:'Explain SLM vs WDV depreciation. Calculate depreciation for 5 years for machinery costing ₹1,20,000, residual value ₹20,000, useful life 10 years. Show under both methods.' },
  { id:'p15', subject:'Income Tax',              year:'2023', university:'Delhi University (DU)',    marks:15, type:'long',  q:'Mr. Rajan earns ₹9,50,000 salary, HRA ₹1,44,000 (metro), LTA ₹60,000, PT ₹2,400. He invests ₹1,50,000 in ELSS and ₹50,000 in NPS (80CCD(1B)). Calculate taxable income under old regime for AY 2024-25.' },
  { id:'p16', subject:'Cost Accounting',         year:'2023', university:'Calicut University',       marks:10, type:'long',  q:'A firm produces 8,000 units. Fixed costs ₹1,60,000, VC ₹25/unit, SP ₹50/unit. Calculate: (i) BEP in units/value (ii) P/V ratio (iii) Margin of Safety at 10,000 units. What production is needed for ₹80,000 profit?' },
  { id:'p17', subject:'Financial Management',    year:'2023', university:'Pune University',          marks:10, type:'long',  q:'A project needs ₹6,00,000 investment. Cash flows: Y1: ₹1,80,000, Y2: ₹2,40,000, Y3: ₹2,80,000, Y4: ₹1,20,000. Calculate NPV at 12% and IRR. Should the project be accepted at 10% cost of capital?' },
  { id:'p18', subject:'Microeconomics',          year:'2023', university:'Delhi University (DU)',    marks:15, type:'long',  q:"Explain the Indifference Curve Analysis of consumer equilibrium. Derive the demand curve using Price Consumption Curve. How does it differ from Marshall's cardinal utility approach?" },
  { id:'p19', subject:'Macroeconomics',          year:'2023', university:'Delhi University (DU)',    marks:10, type:'long',  q:'Explain the IS-LM model. What happens to income and interest rate when (a) government increases spending and (b) RBI reduces money supply? Use diagrams.' },
  { id:'p20', subject:'Public Finance',          year:'2022', university:'Mumbai University',        marks:10, type:'long',  q:"Explain Wagner's Law of increasing state activities. Does it hold for India post-liberalization? What are the causes of growing public expenditure in developing economies?" },
  { id:'p21', subject:'Principles of Management',year:'2023',university:'Delhi University (DU)',    marks:10, type:'long',  q:"Critically evaluate Maslow's Hierarchy of Needs as a theory of motivation. How relevant is it in the modern digital workplace? Compare with Herzberg's Two-Factor Theory." },
  { id:'p22', subject:'Marketing Management',   year:'2023', university:'Pune University',           marks:10, type:'long',  q:'What is STP (Segmentation, Targeting, Positioning)? Analyse the STP strategy of Amazon India in the Indian e-commerce market. How has digital transformation changed STP?' },
  { id:'p23', subject:'Strategic Management',   year:'2023', university:'Bangalore University',      marks:15, type:'long',  q:"Perform a SWOT analysis of Jio's entry into Indian telecom (2016). Which of Porter's generic strategies did Reliance adopt? Evaluate its success using the value chain framework." },
  { id:'p24', subject:'Human Resource Management',year:'2022',university:'Mumbai University',        marks:5,  type:'short', q:'Distinguish between Training and Development. List and briefly explain four modern employee training methods used in the IT industry.' },
  { id:'p25', subject:'Python Programming',      year:'2023', university:'Calicut University',       marks:10, type:'long',  q:'Write Python programs to: (i) Find the second largest element in a list without sorting. (ii) Reverse a string using slicing. (iii) Read a CSV file and compute the average of numeric column.' },
]

// Skill Lab Courses
const SKILLS = [
  { id:'python',  icon:'🐍', name:'Python for Beginners',        category:'Coding',    color:C.indigo, bg:C.indigoBg,  duration:'4 weeks', level:'Beginner',
    outcome:'Write Python scripts, automate tasks, basic data analysis & web scraping.',
    topics:['Python syntax, variables & data types','Control flow: if/for/while/functions','OOP: Class, Inheritance, Encapsulation','File I/O, JSON handling & exceptions','NumPy, Pandas basics & Mini Project'],
    resources:[{l:'CS50P — Harvard Python (Free Certificate)',u:'https://cs50.harvard.edu/python/'},{l:'Python.org Official Tutorial',u:'https://docs.python.org/3/tutorial/'},{l:'NPTEL Python Course (Free Cert)',u:'https://nptel.ac.in'}] },
  { id:'webdev',  icon:'🌐', name:'Web Development Essentials',   category:'Coding',    color:C.blue,   bg:C.blueBg,    duration:'6 weeks', level:'Beginner',
    outcome:'Build a portfolio website and basic dynamic web apps from scratch.',
    topics:['HTML5 semantic structure & accessibility','CSS3 — Flexbox, Grid & responsive design','JavaScript ES6+ fundamentals','DOM manipulation & browser events','React intro + Mini Project: Portfolio'],
    resources:[{l:'The Odin Project (Full Free Curriculum)',u:'https://www.theodinproject.com'},{l:'freeCodeCamp Web Certification (Free)',u:'https://www.freecodecamp.org'},{l:'MDN Web Docs (Best Reference)',u:'https://developer.mozilla.org'}] },
  { id:'excel',   icon:'📊', name:'Excel & Data Analysis',        category:'Tools',     color:C.green,  bg:C.greenBg,   duration:'3 weeks', level:'Beginner',
    outcome:'Use Excel for accounting, statistics, business reporting and dashboards.',
    topics:['Formulas: VLOOKUP, INDEX-MATCH, IF, SUMIF','Pivot Tables, Charts & Data Visualisation','Data Validation, Conditional Formatting','Statistical functions & Regression in Excel','Project: Automated Sales Dashboard'],
    resources:[{l:'Microsoft Learn — Excel (Free)',u:'https://learn.microsoft.com/en-us/training/'},{l:'ExcelJet — Formula Reference (Free)',u:'https://exceljet.net'},{l:'Chandoo.org Excel Tutorials',u:'https://chandoo.org'}] },
  { id:'sql',     icon:'🗄️', name:'SQL & Database Essentials',    category:'Coding',    color:C.teal,   bg:C.tealBg,    duration:'2 weeks', level:'Beginner',
    outcome:'Write SQL queries for job interviews, data analysis, and web projects.',
    topics:['SELECT, WHERE, ORDER BY, LIMIT','JOINS — INNER, LEFT, RIGHT, FULL','GROUP BY, HAVING & aggregate functions','Subqueries, CTEs & Window functions','Project: Student/Employee Database System'],
    resources:[{l:'SQLZoo — Interactive SQL (Free)',u:'https://sqlzoo.net'},{l:'HackerRank SQL Practice (Free)',u:'https://www.hackerrank.com/domains/sql'},{l:'Mode Analytics SQL Tutorial',u:'https://mode.com/sql-tutorial/'}] },
  { id:'comm',    icon:'🗣️', name:'Communication & Soft Skills',  category:'Career',    color:C.orange, bg:C.orangeBg,  duration:'2 weeks', level:'Beginner',
    outcome:'Ace GD/PI rounds, job interviews, and professional communication.',
    topics:['Professional email & report writing','Presentation structure & delivery','Group Discussion strategy & vocabulary','HR interview — Tell me about yourself, Strengths','LinkedIn profile & personal branding'],
    resources:[{l:'SWAYAM English Communication (Free Cert)',u:'https://swayam.gov.in'},{l:'Coursera Communication Skills (Audit Free)',u:'https://www.coursera.org/learn/wharton-communication-skills'},{l:'TED Talks: How to Speak (Chris Anderson)',u:'https://www.ted.com/talks/chris_anderson_teds_secret_to_great_public_speaking'}] },
  { id:'digimark',icon:'📱', name:'Digital Marketing',            category:'Career',    color:C.rose,   bg:C.roseBg,    duration:'3 weeks', level:'Beginner',
    outcome:'Run real digital campaigns — SEO, Ads, social media and email marketing.',
    topics:['Digital marketing landscape & channels','SEO fundamentals & keyword research','Google Ads & Meta Ads basics','Social media strategy & content calendar','Google Analytics 4 & campaign measurement'],
    resources:[{l:'Google Digital Garage (Free Certificate)',u:'https://learndigital.withgoogle.com/digitalgarage'},{l:'HubSpot Marketing Certification (Free)',u:'https://academy.hubspot.com'},{l:'Meta Blueprint — Facebook & Instagram Ads (Free)',u:'https://www.facebook.com/business/learn'}] },
  { id:'fin-lit', icon:'💰', name:'Financial Literacy for Students',category:'Finance',  color:C.amber,  bg:C.amberBg,   duration:'2 weeks', level:'Beginner',
    outcome:'Manage money, invest wisely, and file your first income tax return.',
    topics:['Budgeting, emergency fund & insurance basics','Mutual funds & SIP — how to start','Understanding EPF, PPF & NPS','Filing ITR as a salaried fresher','UPI, credit cards & safe digital banking'],
    resources:[{l:'Zerodha Varsity (Best Free Investment Resource)',u:'https://zerodha.com/varsity/'},{l:'SEBI Investor Education (Official)',u:'https://investor.sebi.gov.in'},{l:'NISM Free Financial Market Modules',u:'https://www.nism.ac.in'}] },
  { id:'dsa-int', icon:'💡', name:'DSA — Campus Placement Prep',  category:'Coding',    color:C.purple, bg:C.purpleBg,  duration:'8 weeks', level:'Intermediate',
    outcome:'Crack coding rounds at product companies and campus placement tests.',
    topics:['Arrays, Strings & Two-Pointer patterns','Linked Lists — Reversal, Floyd Cycle','Stacks, Queues & Monotonic Stack','Trees, BST & Heaps','Graphs — BFS, DFS, Dijkstra, Union-Find','Dynamic Programming: Top 30 patterns'],
    resources:[{l:"Striver's A2Z DSA Sheet (Best Free Resource)",u:'https://takeuforward.org/strivers-a2z-dsa-course/'},{l:'LeetCode (Free tier, 2000+ problems)',u:'https://leetcode.com'},{l:'Interview Bit — Free DSA Track',u:'https://www.interviewbit.com/courses/programming/'}] },
]

// Exam Calendar
const EXAMS = [
  { id:'e1',  name:'UPSC CSE Prelims 2026',  date:'2026-06-08', org:'UPSC',            icon:'🏛️', color:C.indigo, cat:'Civil Services',  eligible:'Graduate (any discipline)' },
  { id:'e2',  name:'UGC NET June 2026',       date:'2026-06-25', org:'NTA',             icon:'🎓', color:C.purple, cat:'Teaching / JRF', eligible:'Post-graduate 55%' },
  { id:'e3',  name:'CUET PG 2026',            date:'2026-05-20', org:'NTA',             icon:'📚', color:C.cyan,   cat:'PG Admissions',  eligible:'Final year UG students' },
  { id:'e4',  name:'CA Foundation June 2026', date:'2026-06-15', org:'ICAI',            icon:'💰', color:C.amber,  cat:'Finance',         eligible:'Class 12 / BCom students' },
  { id:'e5',  name:'CS Foundation June 2026', date:'2026-06-20', org:'ICSI',            icon:'⚖️', color:C.blue,   cat:'Company Secretary',eligible:'Class 12 pass' },
  { id:'e6',  name:'SSC CGL 2026 Tier-I',     date:'2026-09-01', org:'SSC',             icon:'🏢', color:C.green,  cat:'Central Govt',   eligible:'Graduate (any discipline)' },
  { id:'e7',  name:'IBPS PO 2026',            date:'2026-10-04', org:'IBPS',            icon:'🏦', color:C.orange, cat:'Banking',         eligible:'Graduate up to age 26' },
  { id:'e8',  name:'CAT 2026',                date:'2026-11-23', org:'IIMs',            icon:'📊', color:C.rose,   cat:'MBA Entrance',    eligible:'Graduate (50% marks)' },
  { id:'e9',  name:'GATE 2027',               date:'2027-02-08', org:'IITs / IISc',     icon:'⚙️', color:C.teal,   cat:'Engineering PG', eligible:'Final year BE/BTech/BSc' },
  { id:'e10', name:'Campus Placements',       date:'2026-08-01', org:'Campus/College',  icon:'💼', color:C.green,  cat:'Jobs',            eligible:'Final year students' },
  { id:'e11', name:'GRE (Rolling Basis)',     date:'2026-12-31', org:'ETS',             icon:'🌍', color:C.indigo, cat:'Study Abroad',   eligible:'Any graduate, no age bar' },
  { id:'e12', name:'IELTS (Rolling Basis)',   date:'2026-12-31', org:'British Council', icon:'🇬🇧', color:C.blue,   cat:'English Test',   eligible:'Any student' },
]

// ─────────────────────────── MCQ BANK ─────────────────────────────────────────
// sIds: list of subject IDs this question applies to
const MCQ_BANK = [
  // ── Programming in C ──────────────────────────────────────────────────────
  { id:'c01', sIds:['bca-c','prog-c'], unit:'C Basics & Data Types',       diff:'easy',   q:'What is the size of int data type on a typical 32-bit system?',                           opts:['1 byte','2 bytes','4 bytes','8 bytes'],                                                                                   ans:2, exp:'On a 32-bit system int is 4 bytes (32 bits).' },
  { id:'c02', sIds:['bca-c','prog-c'], unit:'C Basics & Data Types',       diff:'easy',   q:'Which of the following is NOT a built-in C data type?',                                   opts:['int','float','string','char'],                                                                                            ans:2, exp:'C has no built-in "string" type; strings are char arrays.' },
  { id:'c03', sIds:['bca-c','prog-c'], unit:'C Basics & Data Types',       diff:'medium', q:'What does printf("%d", 5/2) output in C?',                                                opts:['2.5','2','3','Compile error'],                                                                                            ans:1, exp:'5/2 is integer division in C, result is 2.' },
  { id:'c04', sIds:['bca-c','prog-c'], unit:'Control Flow & Loops',        diff:'easy',   q:'Which loop always executes its body at least once?',                                      opts:['for','while','do-while','None'],                                                                                          ans:2, exp:'do-while checks condition after body, so body runs at least once.' },
  { id:'c05', sIds:['bca-c','prog-c'], unit:'Functions & Pointers',        diff:'medium', q:'Which operator accesses a struct member through a pointer?',                              opts:['.','->','*','&'],                                                                                                         ans:1, exp:'The -> (arrow) operator dereferences a pointer and accesses its member.' },
  { id:'c06', sIds:['bca-c','prog-c'], unit:'Functions & Pointers',        diff:'medium', q:'Which storage class retains its value between function calls?',                           opts:['auto','extern','static','register'],                                                                                      ans:2, exp:'A static local variable persists across function calls.' },
  { id:'c07', sIds:['bca-c','prog-c'], unit:'Arrays, Strings & Structures',diff:'easy',   q:'In C, a string is an array of chars ending with?',                                        opts:["'0'","'\\n'","'\\0'","' '"],                                                                                               ans:2, exp:"Strings are null-terminated; '\\0' marks the end." },
  { id:'c08', sIds:['bca-c','prog-c'], unit:'Arrays, Strings & Structures',diff:'medium', q:'Correct declaration for a 3×4 2D array in C?',                                           opts:['int a[4][3]','int a[3,4]','int a[3][4]','int a(3)(4)'],                                                                   ans:2, exp:'int a[rows][cols], so 3 rows 4 cols = int a[3][4].' },
  { id:'c09', sIds:['bca-c','prog-c'], unit:'File Handling in C',          diff:'medium', q:'Which function opens a file in C?',                                                        opts:['open()','fopen()','fileopen()','start()'],                                                                                ans:1, exp:'fopen() opens a file and returns a FILE pointer.' },
  { id:'c10', sIds:['bca-c','prog-c'], unit:'Functions & Pointers',        diff:'hard',   q:'int a=5; int *p=&a; printf("%d",*p) prints?',                                             opts:['Address of a','5','Garbage value','Compile error'],                                                                       ans:1, exp:'*p dereferences the pointer, yielding the value 5.' },
  // ── Data Structures ───────────────────────────────────────────────────────
  { id:'d01', sIds:['bca-ds','ds'], unit:'Stacks & Queues',                 diff:'easy',   q:'Which data structure follows LIFO?',                                                       opts:['Queue','Stack','Tree','Graph'],                                                                                           ans:1, exp:'Stack: Last-In-First-Out.' },
  { id:'d02', sIds:['bca-ds','ds'], unit:'Stacks & Queues',                 diff:'easy',   q:'BFS internally uses which data structure?',                                                opts:['Stack','Heap','Queue','Linked List'],                                                                                     ans:2, exp:'BFS uses a Queue to explore nodes level by level.' },
  { id:'d03', sIds:['bca-ds','ds'], unit:'Trees & Binary Search Trees',     diff:'medium', q:'In-order traversal of a BST gives nodes in?',                                             opts:['Random order','Reverse order','Ascending order','Level order'],                                                           ans:2, exp:'In-order (L→Root→R) of BST = ascending sorted output.' },
  { id:'d04', sIds:['bca-ds','ds'], unit:'Arrays & Linked Lists',           diff:'easy',   q:'Which is NOT a linear data structure?',                                                    opts:['Array','Stack','Tree','Queue'],                                                                                           ans:2, exp:'Tree is hierarchical (non-linear). Arrays, Stacks, Queues are linear.' },
  { id:'d05', sIds:['bca-ds','ds'], unit:'Sorting & Searching',             diff:'medium', q:'Time complexity of binary search on n elements?',                                         opts:['O(n)','O(n²)','O(log n)','O(n log n)'],                                                                                  ans:2, exp:'Binary search halves the space each step → O(log n).' },
  { id:'d06', sIds:['bca-ds','ds'], unit:'Sorting & Searching',             diff:'hard',   q:'Worst-case time complexity of Quick Sort?',                                                opts:['O(n log n)','O(n)','O(n²)','O(log n)'],                                                                                  ans:2, exp:'O(n²) when worst pivot chosen (sorted array, naive pivot).' },
  { id:'d07', sIds:['bca-ds','ds'], unit:'Sorting & Searching',             diff:'medium', q:'Space complexity of Merge Sort?',                                                          opts:['O(1)','O(log n)','O(n)','O(n²)'],                                                                                        ans:2, exp:'Merge Sort needs O(n) auxiliary space for temp arrays.' },
  { id:'d08', sIds:['bca-ds','ds'], unit:'Trees & Binary Search Trees',     diff:'medium', q:'A tree with n nodes has how many edges?',                                                  opts:['n','n+1','n-1','2n'],                                                                                                    ans:2, exp:'Any tree (acyclic connected graph) with n nodes has n-1 edges.' },
  { id:'d09', sIds:['bca-ds','ds'], unit:'Graph Algorithms',                diff:'hard',   q:"Dijkstra's algorithm finds?",                                                              opts:['Min spanning tree','Shortest path from source','Topological sort','SCC'],                                                 ans:1, exp:"Dijkstra finds single-source shortest paths in weighted graphs (non-negative)." },
  { id:'d10', sIds:['bca-ds','ds'], unit:'Stacks & Queues',                 diff:'medium', q:'Which structure is implicitly used by recursion?',                                         opts:['Queue','Stack','Heap','Array'],                                                                                           ans:1, exp:'Each recursive call adds a frame to the call stack.' },
  // ── Java Programming ──────────────────────────────────────────────────────
  { id:'j01', sIds:['bca-java'], unit:'OOP Concepts & Java Basics',         diff:'easy',   q:'Default value of an int instance field in Java?',                                         opts:['-1','null','undefined','0'],                                                                                              ans:3, exp:'Java initializes int fields to 0 automatically.' },
  { id:'j02', sIds:['bca-java'], unit:'Classes, Objects & Constructors',    diff:'easy',   q:'Which keyword calls the parent class constructor?',                                        opts:['this()','parent()','super()','base()'],                                                                                   ans:2, exp:'super() calls the parent constructor; must be first statement.' },
  { id:'j03', sIds:['bca-java'], unit:'Inheritance, Polymorphism & Interfaces', diff:'medium', q:'Method overloading is an example of?',                                               opts:['Runtime polymorphism','Dynamic dispatch','Compile-time polymorphism','Encapsulation'],                                    ans:2, exp:'Overloading is resolved at compile time based on signature.' },
  { id:'j04', sIds:['bca-java'], unit:'Exception Handling & File I/O',      diff:'easy',   q:'Keyword to explicitly throw an exception in Java?',                                       opts:['throws','throw','catch','error'],                                                                                         ans:1, exp:'"throw" explicitly throws; "throws" declares in method signature.' },
  { id:'j05', sIds:['bca-java'], unit:'OOP Concepts & Java Basics',         diff:'medium', q:'Java String objects are?',                                                                opts:['Mutable','Immutable','Both','Neither'],                                                                                   ans:1, exp:'Strings are immutable; modifications create a new String object.' },
  { id:'j06', sIds:['bca-java'], unit:'Collections Framework & Java 8 Features', diff:'medium', q:'Which collection does NOT allow duplicate elements?',                               opts:['ArrayList','LinkedList','HashSet','Vector'],                                                                              ans:2, exp:'HashSet stores unique elements using hashing.' },
  { id:'j07', sIds:['bca-java'], unit:'Inheritance, Polymorphism & Interfaces', diff:'medium', q:'How can a Java class inherit from multiple sources?',                                 opts:['Multiple class inheritance','Abstract class','Implementing multiple interfaces','Enum'],                                  ans:2, exp:"Java doesn't allow multiple class inheritance but allows implementing multiple interfaces." },
  { id:'j08', sIds:['bca-java'], unit:'Collections Framework & Java 8 Features', diff:'medium', q:'Which feature enables lambda expressions in Java 8?',                               opts:['Generics','Annotations','Functional Interfaces','Inner classes'],                                                         ans:2, exp:'Functional interfaces (single abstract method) are the basis for lambdas.' },
  { id:'j09', sIds:['bca-java'], unit:'Exception Handling & File I/O',      diff:'medium', q:'Which is an unchecked (RuntimeException) in Java?',                                      opts:['IOException','ClassNotFoundException','NullPointerException','FileNotFoundException'],                                    ans:2, exp:'NullPointerException extends RuntimeException — it is unchecked.' },
  { id:'j10', sIds:['bca-java'], unit:'Classes, Objects & Constructors',    diff:'hard',   q:'What makes a Java class abstract?',                                                        opts:['It has no constructor','It uses abstract keyword and may have abstract methods','It implements all methods','It is static'],  ans:1, exp:'abstract keyword; an abstract class can have abstract (no body) and concrete methods.' },
  // ── Database Systems ──────────────────────────────────────────────────────
  { id:'db01', sIds:['bca-dbms','dbms'], unit:'SQL Queries (DDL, DML, DCL)', diff:'easy',  q:'Which SQL command creates a new table?',                                                   opts:['INSERT','CREATE','ALTER','MAKE'],                                                                                         ans:1, exp:'CREATE TABLE is a DDL command.' },
  { id:'db02', sIds:['bca-dbms','dbms'], unit:'SQL Queries (DDL, DML, DCL)', diff:'easy',  q:'Which keyword removes duplicate rows from results?',                                      opts:['UNIQUE','DISTINCT','NO DUPS','FILTER'],                                                                                   ans:1, exp:'SELECT DISTINCT eliminates duplicates.' },
  { id:'db03', sIds:['bca-dbms','dbms'], unit:'Normalization (1NF–BCNF)',    diff:'medium', q:'3NF eliminates which type of dependency?',                                                opts:['Partial dependency','Multivalued dependency','Transitive dependency','Functional dependency'],                             ans:2, exp:'3NF removes transitive dependencies (non-key depending on non-key).' },
  { id:'db04', sIds:['bca-dbms','dbms'], unit:'ER Model & Relational Model', diff:'medium', q:'Foreign key ensures which integrity?',                                                    opts:['Domain','Entity','Referential','User-defined'],                                                                           ans:2, exp:'Foreign key enforces referential integrity between tables.' },
  { id:'db05', sIds:['bca-dbms','dbms'], unit:'Transactions & Concurrency Control', diff:'medium', q:'In ACID, "A" stands for?',                                                        opts:['Availability','Atomicity','Accuracy','Authentication'],                                                                   ans:1, exp:'Atomicity: all operations execute or none do.' },
  { id:'db06', sIds:['bca-dbms','dbms'], unit:'Transactions & Concurrency Control', diff:'hard',   q:'Dirty read occurs when?',                                                         opts:['Non-repeatable read','Phantom read','Reading uncommitted data from another transaction','Lost update'],                     ans:2, exp:"Dirty read: T1 reads T2's uncommitted data; if T2 rolls back, T1 read invalid data." },
  { id:'db07', sIds:['bca-dbms','dbms'], unit:'SQL Queries (DDL, DML, DCL)', diff:'medium', q:'HAVING clause filters?',                                                                  opts:['Rows before grouping','Column names','Groups after GROUP BY','Indexes'],                                                  ans:2, exp:'HAVING filters groups produced by GROUP BY; WHERE filters rows before grouping.' },
  { id:'db08', sIds:['bca-dbms','dbms'], unit:'PL/SQL & Stored Procedures',  diff:'medium', q:'A SQL VIEW is?',                                                                          opts:['Physical copy of a table','Virtual table from a SELECT query','Type of index','Transaction log'],                         ans:1, exp:'A view is a virtual table based on a stored SELECT query.' },
  { id:'db09', sIds:['bca-dbms','dbms'], unit:'ER Model & Relational Model', diff:'easy',   q:'A weak entity is depicted in ER diagram by?',                                            opts:['Single rectangle','Double rectangle','Diamond','Ellipse'],                                                                ans:1, exp:'Double rectangle represents a weak entity.' },
  { id:'db10', sIds:['bca-dbms','dbms'], unit:'Normalization (1NF–BCNF)',    diff:'medium', q:'2NF requires a relation to be in 1NF and?',                                               opts:['No transitive deps','No partial deps on composite PK','All attributes derived from PK','No multivalued deps'],            ans:1, exp:'2NF removes partial dependencies (non-key attribute depends on part of composite PK).' },
  // ── Operating Systems ─────────────────────────────────────────────────────
  { id:'o01', sIds:['bca-os','os'], unit:'CPU Scheduling',                   diff:'medium', q:'Which scheduling algorithm can cause starvation?',                                        opts:['FCFS','Round Robin','SJF/SRTF','Multilevel Queue'],                                                                       ans:2, exp:'SJF can starve long processes if short jobs keep arriving.' },
  { id:'o02', sIds:['bca-os','os'], unit:'Deadlocks & Synchronization',      diff:'medium', q:'Semaphore is primarily used for?',                                                        opts:['Memory allocation','CPU scheduling','Process synchronization','Virtual memory'],                                          ans:2, exp:'Semaphores control shared resource access and prevent race conditions.' },
  { id:'o03', sIds:['bca-os','os'], unit:'Memory Management',                diff:'medium', q:'A page fault occurs when?',                                                               opts:['CPU illegal instruction','Required page is NOT in RAM','Memory is full','Process terminates'],                            ans:1, exp:'Page fault: accessed page is in virtual address space but not in physical RAM.' },
  { id:'o04', sIds:['bca-os','os'], unit:'Memory Management',                diff:'hard',   q:'Thrashing refers to?',                                                                    opts:['Disk corruption','Too many processes for CPU','Excessive paging reducing CPU utilization','Memory fragmentation'],          ans:2, exp:'Thrashing: processes spend more time swapping pages than executing.' },
  { id:'o05', sIds:['bca-os','os'], unit:'Process & Thread Management',      diff:'easy',   q:'Threads in the same process share?',                                                      opts:['Stack','Program counter','Code, heap & globals','CPU registers'],                                                         ans:2, exp:'Threads share code, heap, globals; each has its own stack & registers.' },
  { id:'o06', sIds:['bca-os','os'], unit:'CPU Scheduling',                   diff:'easy',   q:'Round Robin scheduling uses?',                                                            opts:['Priority queue','Time quantum','Free list','Semaphore'],                                                                  ans:1, exp:'RR assigns fixed time quantum to each process in circular order.' },
  { id:'o07', sIds:['bca-os','os'], unit:'Deadlocks & Synchronization',      diff:'hard',   q:"Banker's Algorithm is used for?",                                                         opts:['Memory allocation','Deadlock detection','Deadlock avoidance','Page replacement'],                                         ans:2, exp:"Banker's avoids deadlock by only granting safe-state requests." },
  { id:'o08', sIds:['bca-os','os'], unit:'Memory Management',                diff:'medium', q:'Virtual memory allows execution of processes?',                                           opts:['Larger than physical RAM','Smaller than one page','Without TLB','In ROM'],                                                ans:0, exp:'Virtual memory extends RAM using disk so processes larger than RAM can run.' },
  { id:'o09', sIds:['bca-os','os'], unit:'Process & Thread Management',      diff:'easy',   q:'A process transitions from Running to Ready due to?',                                     opts:['I/O request','Context switch / time quantum expiry','Termination','Waiting for semaphore'],                               ans:1, exp:'Time quantum expiry (preemption) moves a process from Running to Ready queue.' },
  { id:'o10', sIds:['bca-os','os'], unit:'File Systems & Deadlock Handling', diff:'medium', q:'Circular wait is one of the Coffman conditions for?',                                    opts:['Starvation','Thrashing','Deadlock','Race condition'],                                                                     ans:2, exp:'Deadlock requires: Mutual exclusion, Hold&wait, No preemption, Circular wait.' },
  // ── Financial Accounting ──────────────────────────────────────────────────
  { id:'fa01', sIds:['fin-acc'], unit:'Accounting Concepts & GAAP',          diff:'easy',   q:'The fundamental accounting equation is?',                                                  opts:['Assets = Liabilities + Equity','Profit = Revenue × Cost','Assets + Equity = Liabilities','Revenue = Assets - Liabilities'],  ans:0, exp:'Assets = Liabilities + Owner\'s Equity — basis of the Balance Sheet.' },
  { id:'fa02', sIds:['fin-acc'], unit:'Accounting Concepts & GAAP',          diff:'easy',   q:'Assets recorded at original purchase price — which concept?',                             opts:['Going concern','Matching','Historical cost','Accrual'],                                                                   ans:2, exp:'Historical Cost concept: assets recorded at acquisition cost, not market value.' },
  { id:'fa03', sIds:['fin-acc'], unit:'Journal, Ledger & Trial Balance',     diff:'easy',   q:'Outstanding salary is classified as?',                                                    opts:['An asset','A liability','An income','A capital expense'],                                                                 ans:1, exp:'Outstanding salary = expense incurred not yet paid = current liability.' },
  { id:'fa04', sIds:['fin-acc'], unit:'Final Accounts (Trading, P&L, BS)',   diff:'medium', q:'Returns inward (Sales Returns) is deducted from?',                                       opts:['Purchases','Capital','Sales','Assets'],                                                                                   ans:2, exp:'Returns inward = sales returns = deducted from Gross Sales in Trading Account.' },
  { id:'fa05', sIds:['fin-acc'], unit:'Bank Reconciliation Statement',       diff:'medium', q:'Bank Reconciliation reconciles?',                                                         opts:['Cash book and petty cash','Cash book and bank statement','Debit and credit totals','Trading & gross profit'],              ans:1, exp:'BRS explains difference between cash book balance and bank statement balance.' },
  { id:'fa06', sIds:['fin-acc'], unit:'Depreciation Methods',                diff:'medium', q:'WDV depreciation is charged on?',                                                         opts:['Original cost every year','Reducing (book) value','Market value','Replacement cost'],                                     ans:1, exp:'WDV charges on reducing book value, so charge decreases each year.' },
  { id:'fa07', sIds:['fin-acc'], unit:'Final Accounts (Trading, P&L, BS)',   diff:'medium', q:'Closing stock appears in?',                                                               opts:['Only Trading Account','Only Balance Sheet','Both Trading Account & Balance Sheet','P&L and Balance Sheet'],               ans:2, exp:'Closing stock is credited in Trading Account and shown as current asset in Balance Sheet.' },
  { id:'fa08', sIds:['fin-acc'], unit:'Accounting Concepts & GAAP',          diff:'easy',   q:'"Business operates indefinitely" — which principle?',                                     opts:['Consistency','Going concern','Materiality','Prudence'],                                                                   ans:1, exp:'Going Concern: business assumed to continue, assets valued at cost not liquidation.' },
  { id:'fa09', sIds:['fin-acc'], unit:'Final Accounts (Trading, P&L, BS)',   diff:'medium', q:'Gross Profit = ?',                                                                        opts:['Net Sales - Total Expenses','Net Sales - COGS','Total Revenue - Net Profit','Revenue - Admin Costs'],                     ans:1, exp:'Gross Profit = Net Sales - Cost of Goods Sold (COGS). Shown in Trading Account.' },
  { id:'fa10', sIds:['fin-acc'], unit:'Depreciation Methods',                diff:'hard',   q:'SLM depreciation annual amount formula?',                                                 opts:['(Cost - Residual) / Life','Cost × Rate / 100','Cost - Book Value','Market Value / Life'],                                 ans:0, exp:'SLM annual depreciation = (Cost - Residual Value) ÷ Useful Life.' },
  // ── Business Economics ────────────────────────────────────────────────────
  { id:'be01', sIds:['biz-eco'], unit:'Demand, Supply & Equilibrium',        diff:'easy',   q:'Law of Demand: price rises → quantity demanded?',                                         opts:['Increases','Stays same','Decreases','First increases then decreases'],                                                    ans:2, exp:'Inverse (negative) relationship between price and demand.' },
  { id:'be02', sIds:['biz-eco'], unit:'Market Structures (Perfect, Monopoly etc.)', diff:'easy', q:'In perfect competition, which holds?',                                              opts:['MR only = Price','AR only = Price','MR = AR = Price','Price > MR'],                                                        ans:2, exp:'In perfect competition each firm is a price taker: P = MR = AR.' },
  { id:'be03', sIds:['biz-eco'], unit:'Elasticity of Demand & Supply',       diff:'medium', q:'Price elasticity > 1 means demand is?',                                                  opts:['Inelastic','Perfectly elastic','Elastic','Unit elastic'],                                                                 ans:2, exp:'|PED| > 1: 1% price change causes > 1% change in quantity demanded.' },
  { id:'be04', sIds:['biz-eco'], unit:'Market Structures (Perfect, Monopoly etc.)', diff:'easy', q:'A monopoly market has?',                                                            opts:['Many sellers one buyer','One seller no close substitutes','Few dominant sellers','Many sellers homogeneous product'],      ans:1, exp:'Monopoly: one seller, no close substitutes, significant pricing power.' },
  { id:'be05', sIds:['biz-eco'], unit:'Theory of Production & Cost',         diff:'medium', q:'At maximum Total Utility, Marginal Utility is?',                                         opts:['Maximum','Positive','Zero','Negative'],                                                                                   ans:2, exp:'MU = 0 at the peak of TU curve.' },
  { id:'be06', sIds:['biz-eco'], unit:'Macroeconomics Overview',              diff:'easy',   q:'GDP by expenditure method = ?',                                                           opts:['All incomes in economy','Value added at each stage','C + I + G + Net Exports','Total profits of firms'],                  ans:2, exp:'GDP = C (consumption) + I (investment) + G (govt spending) + NX (net exports).' },
  { id:'be07', sIds:['biz-eco'], unit:'Demand, Supply & Equilibrium',        diff:'medium', q:'Price floor above equilibrium causes?',                                                   opts:['Shortage','Equilibrium','Surplus (excess supply)','Hyper-inflation'],                                                     ans:2, exp:'Price floor > equilibrium → Qs > Qd = surplus.' },
  { id:'be08', sIds:['biz-eco'], unit:'Theory of Production & Cost',         diff:'medium', q:'Law of Diminishing Returns applies in?',                                                  opts:['All factors variable','One factor fixed + more variable added','Both factors fixed','Long run only'],                    ans:1, exp:'Short run: one input fixed, adding more variable input eventually reduces marginal product.' },
  { id:'be09', sIds:['biz-eco'], unit:'Elasticity of Demand & Supply',       diff:'hard',   q:'10% income rise → 5% fall in demand. Income elasticity = ?',                             opts:['0.5 (normal good)','-1.0','−0.5 (inferior good)','2.0 (luxury)'],                                                         ans:2, exp:'YED = % demand change / % income change = -5%/10% = -0.5 → inferior good.' },
  { id:'be10', sIds:['biz-eco'], unit:'Macroeconomics Overview',              diff:'medium', q:'Stagflation combines?',                                                                   opts:['Growth + Inflation','Stagnation + Deflation','High unemployment + High inflation','Low inflation + High growth'],         ans:2, exp:'Stagflation = stagnation + inflation: high unemployment AND high inflation simultaneously.' },
  // ── Cost Accounting ───────────────────────────────────────────────────────
  { id:'ca01', sIds:['cost-acc'], unit:'Marginal Costing & CVP Analysis',    diff:'easy',   q:'BEP in units = Fixed Cost ÷ ?',                                                           opts:['Total cost per unit','Contribution per unit','Variable cost per unit','Selling price per unit'],                          ans:1, exp:'BEP (units) = Fixed Cost ÷ Contribution per unit.' },
  { id:'ca02', sIds:['cost-acc'], unit:'Marginal Costing & CVP Analysis',    diff:'medium', q:'P/V Ratio = ?',                                                                           opts:['Fixed Cost / Sales','Contribution / Sales × 100','Profit / Variable Cost','Variable Cost / Sales'],                       ans:1, exp:'P/V Ratio = (Contribution ÷ Sales) × 100.' },
  { id:'ca03', sIds:['cost-acc'], unit:'Marginal Costing & CVP Analysis',    diff:'easy',   q:'Contribution = Sales − ?',                                                                opts:['Fixed Costs','Variable Costs','Total Costs','Profit'],                                                                    ans:1, exp:'Contribution = Sales − Variable Costs = amount to cover fixed costs + profit.' },
  { id:'ca04', sIds:['cost-acc'], unit:'Standard Costing & Variance Analysis', diff:'medium', q:'Material Price Variance = (SP − AP) × ?',                                             opts:['Standard Quantity','Actual Quantity','Budgeted Quantity','Production Units'],                                              ans:1, exp:'MPV = (Standard Price − Actual Price) × Actual Quantity purchased.' },
  { id:'ca05', sIds:['cost-acc'], unit:'Standard Costing & Variance Analysis', diff:'medium', q:'Std Cost ₹50, Actual Cost ₹55. Variance = ?',                                         opts:['₹5 Favorable','₹5 Adverse','₹105 Favorable','₹0'],                                                                       ans:1, exp:'Variance = Std − Actual = 50 − 55 = −5 = Adverse (actual exceeded standard).' },
  { id:'ca06', sIds:['cost-acc'], unit:'Labour Cost & Overheads',            diff:'medium', q:'Labour Efficiency Variance = (SH − AH) × ?',                                             opts:['Actual Rate','Standard Rate','Variable Rate','Overhead Rate'],                                                            ans:1, exp:'LEV = (Std Hours − Actual Hours) × Standard Rate.' },
  { id:'ca07', sIds:['cost-acc'], unit:'Marginal Costing & CVP Analysis',    diff:'hard',   q:'Margin of Safety = Actual Sales − ?',                                                     opts:['Variable Costs','Profit','Break-Even Sales','Fixed Costs'],                                                               ans:2, exp:'Margin of Safety = Actual Sales − BEP Sales = how much sales can fall before loss.' },
  { id:'ca08', sIds:['cost-acc'], unit:'Cost Classification & Concepts',     diff:'easy',   q:'Which cost remains constant regardless of output?',                                       opts:['Variable','Semi-variable','Fixed','Marginal'],                                                                            ans:2, exp:'Fixed costs (rent, salaries) do not change with production level in the short run.' },
  { id:'ca09', sIds:['cost-acc'], unit:'Material Cost Control',              diff:'medium', q:'EOQ minimizes the total of?',                                                             opts:['Purchase cost only','Ordering cost only','Ordering cost + Holding cost','Holding cost only'],                             ans:2, exp:'EOQ = order qty that minimizes (Ordering Cost + Carrying/Holding Cost).' },
  { id:'ca10', sIds:['cost-acc'], unit:'Labour Cost & Overheads',            diff:'medium', q:'Absorption costing differs from marginal costing by including _______ in product cost.',  opts:['Variable overheads only','All variable costs','Fixed manufacturing overheads','Selling costs'],                            ans:2, exp:'Absorption costing includes fixed manufacturing overheads in product cost; marginal treats them as period costs.' },
]

// Helper: get MCQs for a subject + optional unit filter
const getMCQs = (subjectId, unit = 'all') =>
  MCQ_BANK.filter(q => q.sIds.includes(subjectId) && (unit === 'all' || q.unit === unit))

const getDaysLeft = (d) => Math.ceil((new Date(d) - new Date()) / 86400000)

// ─────────────────────────── SMALL COMPONENTS ─────────────────────────────────

const Badge = ({ label, color, bg }) => (
  <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700, color, background:bg||color+'18', whiteSpace:'nowrap' }}>
    {label}
  </span>
)

function SectionHead({ icon, title, subtitle, color = C.indigo }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, background:`linear-gradient(135deg,${color}14,${color}06)`, border:`1.5px solid ${color}22`, borderRadius:16, padding:'16px 22px', marginBottom:24 }}>
      <span style={{ fontSize:30 }}>{icon}</span>
      <div>
        <h2 style={{ margin:0, fontSize:19, fontWeight:800, color, fontFamily:'var(--serif)' }}>{title}</h2>
        {subtitle && <p style={{ margin:'2px 0 0', fontSize:12.5, color:C.slate }}>{subtitle}</p>}
      </div>
    </div>
  )
}

function Pill({ label, active, color = C.indigo, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:'6px 14px', borderRadius:99, border:`1.5px solid ${active ? color : C.border}`,
      background: active ? color : '#fff', color: active ? '#fff' : C.slate,
      fontSize:12, fontWeight:600, cursor:'pointer', transition:'.15s', whiteSpace:'nowrap',
    }}>
      {label}
    </button>
  )
}

// ─────────────────────────── TABS ─────────────────────────────────────────────

const TABS = [
  { id:'dashboard', label:'🎓 My Degree'    },
  { id:'notes',     label:'📝 Smart Notes'  },
  { id:'practice',  label:'⚡ Practice'      },
  { id:'tests',     label:'🧪 Mock Tests'   },
  { id:'pyq',       label:'📋 PYQ Bank'     },
  { id:'doubt',     label:'💬 AI Doubt'     },
  { id:'planner',   label:'🗓 Study Planner'},
  { id:'skills',    label:'🛠 Skill Lab'    },
  { id:'exams',     label:'📅 Exam Tracker' },
]

// ─────────────────────────── MAIN PANEL ───────────────────────────────────────

export default function DegreeHubPanel({ showToast }) {
  const { token } = useAuth()

  // Profile
  const [profile, setProfile] = useState(() => { try { return JSON.parse(localStorage.getItem(LS_PROFILE) || 'null') } catch { return null } })
  const [setup, setSetup] = useState({ course:'', year:'', university:'' })

  // Navigation
  const [tab, setTab] = useState('dashboard')

  // Smart Notes
  const [notesSubject, setNotesSubject] = useState(null)   // subject object
  const [notesUnit, setNotesUnit] = useState(null)         // unit string
  const [notes, setNotes] = useState(() => { try { return JSON.parse(localStorage.getItem(LS_NOTES) || '{}') } catch { return {} } })
  const [notesLoading, setNotesLoading] = useState(false)
  const [notesError, setNotesError] = useState(null)

  // PYQ
  const [pyqUni, setPyqUni]     = useState('all')
  const [pyqSub, setPyqSub]     = useState('all')
  const [pyqYr, setPyqYr]       = useState('all')
  const [pyqType, setPyqType]   = useState('all')
  const [pyqOpen, setPyqOpen]   = useState(null)
  const [pyqSearch, setPyqSearch] = useState('')

  // Skills
  const [skillProgress, setSkillProgress] = useState(() => { try { return JSON.parse(localStorage.getItem(LS_SKILLS) || '{}') } catch { return {} } })
  const [skillOpen, setSkillOpen] = useState(null)
  const [skillCat, setSkillCat] = useState('All')

  // Exams
  const [trackedExams, setTrackedExams] = useState(() => { try { return JSON.parse(localStorage.getItem(LS_EXAMS) || '[]') } catch { return [] } })

  // Practice
  const [pracMode, setPracMode] = useState(null)       // null | 'quiz' | 'result'
  const [pracSub, setPracSub]   = useState(null)        // subject object
  const [pracUnit, setPracUnit] = useState('all')       // unit string | 'all'
  const [pracQs, setPracQs]     = useState([])          // shuffled MCQ array
  const [pracIdx, setPracIdx]   = useState(0)
  const [pracSel, setPracSel]   = useState(null)        // selected option index
  const [pracAnswers, setPracAnswers] = useState([])    // [{qId,selected,correct}]
  const [pracStats, setPracStats] = useState(() => { try { return JSON.parse(localStorage.getItem(LS_PRACTICE) || '{}') } catch { return {} } })
  const [pracRevealed, setPracRevealed] = useState(false)

  // Mock Tests
  const [testMode, setTestMode]   = useState(null)      // null | 'config' | 'running' | 'result'
  const [testType, setTestType]   = useState('unit')    // 'unit' | 'full'
  const [testSub, setTestSub]     = useState(null)
  const [testUnit, setTestUnit]   = useState('all')
  const [testQs, setTestQs]       = useState([])
  const [testAnswers, setTestAnswers] = useState({})    // { qId: selectedIdx }
  const [testCurrentIdx, setTestCurrentIdx] = useState(0)
  const [testHistory, setTestHistory] = useState(() => { try { return JSON.parse(localStorage.getItem(LS_THISTORY) || '[]') } catch { return [] } })
  const [testGenLoading, setTestGenLoading] = useState(false)

  // AI Doubt Solver
  const [doubtSub, setDoubtSub]     = useState(null)
  const [doubtMsgs, setDoubtMsgs]   = useState([{ role:'ai', text:"Hi! I'm your AI Doubt Solver 🤖\n\nSelect a subject above, then ask me anything — concepts, derivations, formulas, exam problems. I'll explain step-by-step!" }])
  const [doubtInput, setDoubtInput] = useState('')
  const [doubtLoading, setDoubtLoading] = useState(false)

  // Study Planner
  const [planExamName, setPlanExamName] = useState('')
  const [planExamDate, setPlanExamDate] = useState('')
  const [planLoading, setPlanLoading]   = useState(false)
  const [studyPlan, setStudyPlan]       = useState(() => { try { return JSON.parse(localStorage.getItem(LS_STUDYPLAN) || 'null') } catch { return null } })

  const saveProfile = (p) => {
    localStorage.setItem(LS_PROFILE, JSON.stringify(p))
    setProfile(p)
  }

  const saveNotes = (updated) => {
    localStorage.setItem(LS_NOTES, JSON.stringify(updated))
    setNotes(updated)
  }

  const saveSkillProgress = (updated) => {
    localStorage.setItem(LS_SKILLS, JSON.stringify(updated))
    setSkillProgress(updated)
  }

  const saveTrackedExams = (updated) => {
    localStorage.setItem(LS_EXAMS, JSON.stringify(updated))
    setTrackedExams(updated)
  }

  const courseInfo    = useMemo(() => COURSES.find(c => c.id === profile?.course), [profile])
  const subjects      = useMemo(() => profile ? getSubjects(profile.course, profile.year) : [], [profile])
  const notesKey      = notesSubject && notesUnit ? `${notesSubject.id}__${notesUnit}` : null
  const currentNotes  = notesKey ? notes[notesKey] : null

  // Generate Notes via AI
  const generateNotes = async () => {
    if (!notesSubject || !notesUnit) return
    setNotesLoading(true)
    setNotesError(null)
    try {
      const prompt = `You are an expert Indian university professor. Generate concise, structured exam-ready notes for a degree student.

Subject: ${notesSubject.name}
Unit: ${notesUnit}
Course: ${courseInfo?.label || profile?.course}
Year: Year ${profile?.year}

Format your response as:
**Overview** (2-3 lines on what this unit is about)

**Key Concepts** (5-8 bullet points, each concept explained in 1-2 sentences)

**Important Definitions** (3-5 key terms with precise definitions)

**Exam-Important Points** (4-6 points most likely to appear in exams — mark the most important ones with ⭐)

**Quick Revision Checklist** (short 5-point checklist — "I can explain...", "I know the formula for...")

Keep it dense, exam-focused, and free of fluff. Use Indian university exam style.`

      const data = await apiPost('/chat', { question: prompt, syllabus_id: undefined }, token)
      const content = data.answer || data.reply || data.response || (typeof data === 'string' ? data : 'Notes generated. Check the content.')
      const updated = { ...notes, [notesKey]: content }
      saveNotes(updated)
    } catch (e) {
      setNotesError(e.message || 'Could not generate notes. Please try again.')
    }
    setNotesLoading(false)
  }

  // ── PRACTICE helpers ─────────────────────────────────────────────────────
  const startPractice = (sub, unit = 'all') => {
    const pool = getMCQs(sub.id, unit)
    const qs   = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(10, pool.length))
    if (qs.length === 0) { alert('No questions available for this selection yet. Try "All Units".'); return }
    setPracSub(sub); setPracUnit(unit); setPracQs(qs)
    setPracIdx(0); setPracSel(null); setPracAnswers([]); setPracRevealed(false)
    setPracMode('quiz')
  }

  const revealPracAnswer = () => {
    if (pracSel === null) return
    setPracRevealed(true)
  }

  const nextPracQuestion = () => {
    const q       = pracQs[pracIdx]
    const correct = pracSel === q.ans
    const updated = [...pracAnswers, { qId: q.id, selected: pracSel, correct }]
    setPracAnswers(updated)
    if (pracIdx < pracQs.length - 1) {
      setPracIdx(i => i + 1); setPracSel(null); setPracRevealed(false)
    } else {
      const score = updated.filter(a => a.correct).length
      const key   = `${pracSub.id}__${pracUnit}`
      const prev  = pracStats[key] || { attempts: 0, correct: 0 }
      const ns    = { ...pracStats, [key]: { attempts: prev.attempts + updated.length, correct: prev.correct + score } }
      localStorage.setItem(LS_PRACTICE, JSON.stringify(ns))
      setPracStats(ns)
      setPracMode('result')
    }
  }

  // ── TESTS helpers ────────────────────────────────────────────────────────
  const buildTest = (sub, unit, count = 15) => {
    const pool = getMCQs(sub.id, unit)
    return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length))
  }

  const submitTest = () => {
    const score = testQs.reduce((acc, q) => acc + (testAnswers[q.id] === q.ans ? 1 : 0), 0)
    const entry = { date: new Date().toISOString(), score, total: testQs.length, subject: testSub?.name, unit: testUnit, type: testType }
    const hist  = [entry, ...testHistory].slice(0, 20)
    localStorage.setItem(LS_THISTORY, JSON.stringify(hist))
    setTestHistory(hist)
    setTestMode('result')
  }

  // ── AI DOUBT SOLVER ──────────────────────────────────────────────────────
  const sendDoubt = async () => {
    const msg = doubtInput.trim()
    if (!msg || doubtLoading) return
    setDoubtMsgs(m => [...m, { role:'user', text: msg }])
    setDoubtInput('')
    setDoubtLoading(true)
    try {
      const ctx = doubtSub ? `Subject: ${doubtSub.name} (${courseInfo?.label} Year ${profile?.year})` : `Course: ${courseInfo?.label} Year ${profile?.year}`
      const prompt = `You are an expert Indian university professor helping a degree student with doubts.
${ctx}
Student's question: ${msg}

Answer clearly and completely:
1. Start with a direct one-sentence answer
2. Explain the concept with examples (Indian university exam context)
3. Show formulas if applicable, clearly formatted
4. End with: "📝 Exam Tip: ..." (1 line)

Be concise but thorough. Use simple language.`
      const data = await apiPost('/chat', { question: prompt }, token)
      const text = data.answer || data.reply || data.response || 'No answer received.'
      setDoubtMsgs(m => [...m, { role:'ai', text }])
    } catch {
      setDoubtMsgs(m => [...m, { role:'ai', text: '⚠️ Could not get answer. Please try again.' }])
    }
    setDoubtLoading(false)
  }

  // ── STUDY PLANNER ────────────────────────────────────────────────────────
  const generateStudyPlan = async () => {
    if (!planExamName || !planExamDate) return
    setPlanLoading(true)
    try {
      const days    = Math.ceil((new Date(planExamDate) - new Date()) / 86400000)
      const subList = subjects.map(s => s.name).join(', ')
      const prompt  = `You are an expert academic coach. Create a realistic study plan for an Indian university student.
Student: ${courseInfo?.label}, Year ${profile?.year}
Subjects: ${subList}
Target: ${planExamName}
Days available: ${days} days (Exam date: ${planExamDate})

Generate a structured study plan:
**Subject Allocation** — How many days per subject
${days > 14 ? '**Week-by-Week Plan**' : '**Day-by-Day Plan**'} — Specific topics each day/week
**Revision Phase** (last 7 days) — What to revise
**Day-Before Strategy** — Final revision checklist
**Study Tips** — 4 practical tips for exam success

Format clearly with emojis. Keep it realistic and achievable.`
      const data    = await apiPost('/chat', { question: prompt }, token)
      const planText = data.answer || data.reply || data.response || ''
      const plan    = { planText, examName: planExamName, examDate: planExamDate, generatedAt: new Date().toISOString() }
      localStorage.setItem(LS_STUDYPLAN, JSON.stringify(plan))
      setStudyPlan(plan)
    } catch { /* silent */ }
    setPlanLoading(false)
  }

  // ── WEAK AREA COMPUTATION ────────────────────────────────────────────────
  const weakAreas = useMemo(() => {
    return Object.entries(pracStats)
      .filter(([, v]) => v.attempts >= 3 && v.correct / v.attempts < 0.6)
      .map(([key]) => {
        const [sId, ...unitParts] = key.split('__')
        const sub = subjects.find(s => s.id === sId)
        return { key, subName: sub?.name || sId, unit: unitParts.join('__') }
      })
  }, [pracStats, subjects])

  // ── FILTERED PYQs ───────────────────────────────────────────────────────────
  const filteredPyqs = useMemo(() => {
    return PYQS.filter(p => {
      if (pyqUni !== 'all' && p.university !== pyqUni) return false
      if (pyqSub !== 'all' && p.subject !== pyqSub) return false
      if (pyqYr !== 'all' && p.year !== pyqYr) return false
      if (pyqType !== 'all' && p.type !== pyqType) return false
      if (pyqSearch.trim() && !p.q.toLowerCase().includes(pyqSearch.toLowerCase()) && !p.subject.toLowerCase().includes(pyqSearch.toLowerCase())) return false
      return true
    })
  }, [pyqUni, pyqSub, pyqYr, pyqType, pyqSearch])

  const uniqueSubjects = useMemo(() => [...new Set(PYQS.map(p => p.subject))], [])
  const uniqueYears    = useMemo(() => [...new Set(PYQS.map(p => p.year))].sort().reverse(), [])
  const uniqueUnis     = useMemo(() => [...new Set(PYQS.map(p => p.university))], [])

  const skillCategories = ['All', ...new Set(SKILLS.map(s => s.category))]
  const filteredSkills  = skillCat === 'All' ? SKILLS : SKILLS.filter(s => s.category === skillCat)

  // ── ONBOARDING ──────────────────────────────────────────────────────────────
  if (!profile) {
    return (
      <div style={{ padding:'32px 24px', maxWidth:600, margin:'0 auto' }}>
        {/* Hero */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🎓</div>
          <h1 style={{ fontSize:26, fontWeight:900, color:C.indigo, margin:'0 0 8px', fontFamily:'var(--serif)' }}>
            Degree Hub
          </h1>
          <p style={{ color:C.slate, fontSize:14, lineHeight:1.7 }}>
            Your university learning ecosystem — smart notes, PYQs, skill courses, and exam tracker.
            <br/>Tell us about your degree to personalise your experience.
          </p>
        </div>

        {/* Step cards */}
        <div style={{ background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:20, padding:28, boxShadow:'0 4px 24px rgba(0,0,0,.07)' }}>
          <label style={{ display:'block', fontWeight:700, fontSize:13, color:C.indigo, marginBottom:8 }}>Select Your Course</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:24 }}>
            {COURSES.map(c => (
              <button key={c.id} onClick={() => setSetup(s => ({ ...s, course:c.id }))}
                style={{ padding:'8px 14px', borderRadius:10, border:`1.5px solid ${setup.course === c.id ? C.indigo : C.border}`, background: setup.course === c.id ? C.indigoBg : '#fff', color: setup.course === c.id ? C.indigo : C.slate, fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5, transition:'.15s' }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          <label style={{ display:'block', fontWeight:700, fontSize:13, color:C.indigo, marginBottom:8 }}>Current Year</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:24 }}>
            {YEARS.map(y => (
              <button key={y.id} onClick={() => setSetup(s => ({ ...s, year:y.id }))}
                style={{ padding:'8px 18px', borderRadius:10, border:`1.5px solid ${setup.year === y.id ? C.indigo : C.border}`, background: setup.year === y.id ? C.indigoBg : '#fff', color: setup.year === y.id ? C.indigo : C.slate, fontSize:12, fontWeight:600, cursor:'pointer', transition:'.15s' }}>
                {y.label}
              </button>
            ))}
          </div>

          <label style={{ display:'block', fontWeight:700, fontSize:13, color:C.indigo, marginBottom:8 }}>University</label>
          <select value={setup.university} onChange={e => setSetup(s => ({ ...s, university:e.target.value }))}
            style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:13, color:C.slate, marginBottom:28, background:'#fff' }}>
            <option value=''>— Select your university —</option>
            {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
          </select>

          <button
            disabled={!setup.course || !setup.year || !setup.university}
            onClick={() => saveProfile(setup)}
            style={{ width:'100%', padding:14, borderRadius:12, background: (!setup.course || !setup.year || !setup.university) ? '#c7d2fe' : `linear-gradient(135deg,${C.indigo},${C.indigoL})`, color:'#fff', border:'none', fontSize:15, fontWeight:700, cursor: (!setup.course || !setup.year || !setup.university) ? 'not-allowed' : 'pointer' }}>
            🚀 Start My Degree Journey
          </button>
        </div>
      </div>
    )
  }

  // ── MAIN APP ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding:'24px 20px', maxWidth:960, margin:'0 auto' }}>

      {/* ── HEADER ── */}
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24, flexWrap:'wrap' }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <span style={{ fontSize:28 }}>{courseInfo?.icon || '🎓'}</span>
            <div>
              <h1 style={{ margin:0, fontSize:20, fontWeight:900, color:C.indigo, fontFamily:'var(--serif)' }}>
                Degree Hub
              </h1>
              <p style={{ margin:0, fontSize:12, color:C.slate }}>
                {courseInfo?.label} · Year {profile.year} · {profile.university}
              </p>
            </div>
          </div>
        </div>
        <button onClick={() => { localStorage.removeItem(LS_PROFILE); setProfile(null) }}
          style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${C.border}`, background:'#fff', color:C.slate, fontSize:12, fontWeight:600, cursor:'pointer' }}>
          ✏️ Change Profile
        </button>
      </div>

      {/* ── TABS ── */}
      <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4, marginBottom:28 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'9px 16px', borderRadius:99, border:`1.5px solid ${tab === t.id ? C.indigo : C.border}`,
            background: tab === t.id ? C.indigo : '#fff',
            color: tab === t.id ? '#fff' : C.slate,
            fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', transition:'.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════ DASHBOARD ════════════════════════════════════ */}
      {tab === 'dashboard' && (
        <div>
          <SectionHead icon={courseInfo?.icon || '🎓'} title={`Welcome, ${courseInfo?.label} Student`} subtitle={`Year ${profile.year} · ${profile.university}`} color={C.indigo} />

          {/* Quick Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:14, marginBottom:28 }}>
            {[
              { icon:'📚', label:'Subjects', value:subjects.length, color:C.indigo },
              { icon:'📋', label:'PYQs Available', value:PYQS.length, color:C.blue },
              { icon:'🛠', label:'Skill Courses', value:SKILLS.length, color:C.green },
              { icon:'📅', label:'Upcoming Exams', value:EXAMS.filter(e => getDaysLeft(e.date) > 0).length, color:C.orange },
            ].map(s => (
              <div key={s.label} style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 18px', textAlign:'center' }}>
                <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
                <div style={{ fontSize:22, fontWeight:800, color:s.color, fontFamily:'var(--serif)' }}>{s.value}</div>
                <div style={{ fontSize:11, color:C.slate, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Subjects for this year */}
          <h3 style={{ fontSize:15, fontWeight:800, color:C.indigo, marginBottom:14 }}>
            📚 Your Subjects — Year {profile.year}
          </h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12, marginBottom:28 }}>
            {subjects.map(sub => {
              const genCount = sub.units.filter(u => notes[`${sub.id}__${u}`]).length
              return (
                <div key={sub.id}
                  onClick={() => { setTab('notes'); setNotesSubject(sub); setNotesUnit(null) }}
                  style={{ background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:14, padding:'16px 18px', cursor:'pointer', transition:'.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.indigo; e.currentTarget.style.background = C.indigoBg }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = '#fff' }}
                >
                  <div style={{ fontSize:22, marginBottom:8 }}>{sub.icon}</div>
                  <div style={{ fontWeight:700, fontSize:14, color:C.indigo, marginBottom:4 }}>{sub.name}</div>
                  <div style={{ fontSize:11, color:C.slate }}>{sub.units.length} units</div>
                  {genCount > 0 && (
                    <div style={{ marginTop:8 }}>
                      <Badge label={`${genCount} notes generated`} color={C.green} bg={C.greenBg} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Suggestion cards */}
          <h3 style={{ fontSize:15, fontWeight:800, color:C.indigo, marginBottom:14 }}>🚀 Get Started</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
            {[
              { icon:'📝', title:'Smart Notes',     desc:'AI exam-ready notes per unit.',                    action:() => setTab('notes'),    color:C.indigo },
              { icon:'⚡', title:'Practice MCQs',   desc:`${MCQ_BANK.length} questions across all subjects.`, action:() => setTab('practice'), color:C.amber },
              { icon:'🧪', title:'Mock Tests',      desc:'Timed unit & semester mocks.',                     action:() => setTab('tests'),    color:C.teal },
              { icon:'📋', title:'PYQ Bank',        desc:`${PYQS.length} real exam PYQs.`,                   action:() => setTab('pyq'),      color:C.blue },
              { icon:'💬', title:'AI Doubt Solver', desc:'Ask anything, get instant answers.',               action:() => setTab('doubt'),    color:C.purple },
              { icon:'🗓', title:'Study Planner',   desc:'AI daily plan for your exam.',                     action:() => setTab('planner'),  color:C.rose },
              { icon:'🛠', title:'Skill Lab',       desc:'Python, Excel, DSA & more.',                       action:() => setTab('skills'),   color:C.green },
              { icon:'📅', title:'Exam Tracker',    desc:'CAT, GATE, UGC NET countdowns.',                   action:() => setTab('exams'),    color:C.orange },
            ].map(c => (
              <div key={c.title} onClick={c.action}
                style={{ background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:14, padding:'18px', cursor:'pointer', transition:'.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = c.color; e.currentTarget.style.background = c.color+'0c' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = '#fff' }}>
                <div style={{ fontSize:24, marginBottom:8 }}>{c.icon}</div>
                <div style={{ fontWeight:700, fontSize:13, color:c.color, marginBottom:4 }}>{c.title}</div>
                <div style={{ fontSize:12, color:C.slate, lineHeight:1.5 }}>{c.desc}</div>
              </div>
            ))}
          </div>

          {/* Weak Areas panel */}
          {weakAreas.length > 0 && (
            <div style={{ marginTop:28, background:`linear-gradient(135deg,${C.red}0c,${C.redBg})`, border:`1.5px solid ${C.red}30`, borderRadius:16, padding:'20px 22px' }}>
              <div style={{ fontWeight:800, fontSize:14, color:C.red, marginBottom:12 }}>⚠️ Weak Areas Detected — Revise These!</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {weakAreas.map(w => (
                  <div key={w.key} onClick={() => { const s = subjects.find(s => s.id === w.key.split('__')[0]); if(s){ setPracSub(s); setPracUnit(w.unit); setTab('practice') } }}
                    style={{ padding:'6px 14px', borderRadius:99, background:'#fff', border:`1.5px solid ${C.red}50`, fontSize:12, fontWeight:700, color:C.red, cursor:'pointer' }}>
                    {w.subName} — {w.unit === 'all' ? 'Mixed' : w.unit}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════ SMART NOTES ══════════════════════════════════ */}
      {tab === 'notes' && (
        <div>
          <SectionHead icon='📝' title='AI Smart Notes' subtitle='Select a subject and unit — get exam-ready notes in seconds' color={C.indigo} />

          <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap:20, alignItems:'start' }}>
            {/* Subject selector */}
            <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:14, padding:16, position:'sticky', top:16 }}>
              <div style={{ fontSize:12, fontWeight:800, color:C.indigo, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>Subjects</div>
              {subjects.map(sub => (
                <div key={sub.id}>
                  <button onClick={() => { setNotesSubject(sub === notesSubject ? null : sub); setNotesUnit(null) }}
                    style={{ width:'100%', textAlign:'left', padding:'8px 10px', borderRadius:8, border:'none', background: notesSubject?.id === sub.id ? C.indigoBg : 'transparent', color: notesSubject?.id === sub.id ? C.indigo : C.slate, fontWeight: notesSubject?.id === sub.id ? 700 : 500, fontSize:13, cursor:'pointer', display:'flex', gap:8, alignItems:'center', marginBottom:2 }}>
                    <span>{sub.icon}</span> {sub.name}
                  </button>
                  {notesSubject?.id === sub.id && (
                    <div style={{ paddingLeft:12, marginBottom:8 }}>
                      {sub.units.map(u => {
                        const key = `${sub.id}__${u}`
                        const has = !!notes[key]
                        return (
                          <button key={u} onClick={() => setNotesUnit(u)}
                            style={{ width:'100%', textAlign:'left', padding:'6px 8px', borderRadius:6, border:'none', background: notesUnit === u ? C.indigo+'18' : 'transparent', color: notesUnit === u ? C.indigo : C.slate, fontSize:12, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', gap:6, marginBottom:2 }}>
                            <span>{u}</span>
                            {has && <span style={{ fontSize:9, background:C.greenBg, color:C.green, padding:'1px 5px', borderRadius:99, fontWeight:700 }}>✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Notes content */}
            <div>
              {!notesSubject && (
                <div style={{ textAlign:'center', padding:'60px 0', color:C.slate }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>📖</div>
                  <div style={{ fontWeight:600, fontSize:14 }}>Select a subject from the left to begin</div>
                </div>
              )}

              {notesSubject && !notesUnit && (
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                    <span style={{ fontSize:24 }}>{notesSubject.icon}</span>
                    <h3 style={{ margin:0, fontSize:17, fontWeight:800, color:C.indigo }}>{notesSubject.name}</h3>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10 }}>
                    {notesSubject.units.map(u => {
                      const key = `${notesSubject.id}__${u}`
                      const has = !!notes[key]
                      return (
                        <button key={u} onClick={() => setNotesUnit(u)}
                          style={{ padding:'14px', borderRadius:12, border:`1.5px solid ${has ? C.green : C.border}`, background: has ? C.greenBg : '#fff', color: has ? C.green : C.slate, textAlign:'left', cursor:'pointer', fontSize:13, fontWeight:has ? 700 : 500, transition:'.15s' }}>
                          {has ? '✅ ' : '📄 '}{u}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {notesSubject && notesUnit && (
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, color:C.slate }}>{notesSubject.name}</div>
                      <h3 style={{ margin:'2px 0 0', fontSize:17, fontWeight:800, color:C.indigo }}>{notesUnit}</h3>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      {currentNotes && (
                        <button onClick={() => { const updated = { ...notes }; delete updated[notesKey]; saveNotes(updated) }}
                          style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${C.border}`, background:'#fff', color:C.slate, fontSize:12, cursor:'pointer' }}>
                          🗑 Clear
                        </button>
                      )}
                      <button onClick={generateNotes} disabled={notesLoading}
                        style={{ padding:'8px 18px', borderRadius:8, border:'none', background: notesLoading ? '#c7d2fe' : `linear-gradient(135deg,${C.indigo},${C.indigoL})`, color:'#fff', fontSize:13, fontWeight:700, cursor: notesLoading ? 'not-allowed' : 'pointer' }}>
                        {notesLoading ? '⏳ Generating…' : currentNotes ? '🔄 Regenerate' : '✨ Generate Notes'}
                      </button>
                    </div>
                  </div>

                  {notesError && (
                    <div style={{ padding:'10px 14px', background:C.redBg, border:`1px solid #fca5a5`, borderRadius:8, color:C.red, fontSize:13, marginBottom:16 }}>
                      {notesError}
                    </div>
                  )}

                  {notesLoading && (
                    <div style={{ padding:'40px', textAlign:'center', color:C.slate }}>
                      <div style={{ fontSize:32, marginBottom:12, animation:'spin 1s linear infinite' }}>⏳</div>
                      <div style={{ fontSize:14, fontWeight:600 }}>AI is generating your exam notes…</div>
                      <div style={{ fontSize:12, marginTop:6 }}>Crafted for {courseInfo?.label} · Year {profile.year}</div>
                    </div>
                  )}

                  {!notesLoading && currentNotes && (
                    <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:16, padding:'24px 26px', lineHeight:1.8, fontSize:14, color:'#1e293b' }}>
                      <div style={{ whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                        {currentNotes.split('\n').map((line, i) => {
                          const isBold = line.startsWith('**') && line.includes('**')
                          if (isBold) {
                            const cleaned = line.replace(/\*\*/g, '')
                            return <div key={i} style={{ fontWeight:800, color:C.indigo, fontSize:15, marginTop:16, marginBottom:6 }}>{cleaned}</div>
                          }
                          if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
                            return <div key={i} style={{ paddingLeft:16, marginBottom:6, display:'flex', gap:8 }}><span style={{ color:C.indigo, flexShrink:0 }}>▸</span>{line.replace(/^[-•]\s/, '')}</div>
                          }
                          if (line.trim() === '') return <div key={i} style={{ height:8 }} />
                          return <div key={i} style={{ marginBottom:4 }}>{line}</div>
                        })}
                      </div>
                    </div>
                  )}

                  {!notesLoading && !currentNotes && (
                    <div style={{ padding:'48px', textAlign:'center', background:'#fff', border:`1.5px dashed ${C.border}`, borderRadius:16, color:C.slate }}>
                      <div style={{ fontSize:36, marginBottom:12 }}>✨</div>
                      <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>No notes yet for this unit</div>
                      <div style={{ fontSize:13 }}>Click "Generate Notes" to get AI-crafted exam notes in seconds</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ PRACTICE ═════════════════════════════════════ */}
      {tab === 'practice' && (
        <div>
          <SectionHead icon='⚡' title='Practice MCQs' subtitle={`${MCQ_BANK.length} questions across all subjects — drill by unit, track accuracy & fix weak areas`} color={C.amber} />

          {/* ── Picker Screen ── */}
          {!pracMode && (
            <div>
              {/* Stats strip */}
              {Object.keys(pracStats).length > 0 && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10, marginBottom:24 }}>
                  {subjects.map(sub => {
                    const total   = sub.units.reduce((a, u) => a + (pracStats[`${sub.id}__${u}`]?.attempts || 0), 0)
                    const correct = sub.units.reduce((a, u) => a + (pracStats[`${sub.id}__${u}`]?.correct  || 0), 0)
                    if (total === 0) return null
                    const pct = Math.round(correct / total * 100)
                    return (
                      <div key={sub.id} style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:12, padding:'14px' }}>
                        <div style={{ fontSize:13, fontWeight:700, color:C.indigo, marginBottom:6 }}>{sub.icon} {sub.name}</div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:6, background:'#e2e8f0', borderRadius:99, overflow:'hidden' }}>
                            <div style={{ width:`${pct}%`, height:'100%', background: pct >= 70 ? C.green : pct >= 40 ? C.amber : C.red, borderRadius:99 }} />
                          </div>
                          <span style={{ fontSize:11, fontWeight:800, color: pct >= 70 ? C.green : pct >= 40 ? C.amber : C.red }}>{pct}%</span>
                        </div>
                        <div style={{ fontSize:10, color:C.slate, marginTop:4 }}>{total} attempts</div>
                      </div>
                    )
                  }).filter(Boolean)}
                </div>
              )}

              {/* Subject picker */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
                {subjects.map(sub => {
                  const available = getMCQs(sub.id).length
                  return (
                    <div key={sub.id} style={{ background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:16, padding:'20px 22px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                        <span style={{ fontSize:26 }}>{sub.icon}</span>
                        <div>
                          <div style={{ fontWeight:800, fontSize:14, color:C.indigo }}>{sub.name}</div>
                          <div style={{ fontSize:11, color:C.slate }}>{available} questions available</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                        <button onClick={() => startPractice(sub, 'all')}
                          style={{ padding:'6px 14px', borderRadius:8, border:`1.5px solid ${C.amber}`, background:C.amberBg, color:C.amber, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                          ⚡ All Units
                        </button>
                        {sub.units.map(u => {
                          const cnt = getMCQs(sub.id, u).length
                          const key = `${sub.id}__${u}`
                          const st  = pracStats[key]
                          const pct = st ? Math.round(st.correct / st.attempts * 100) : null
                          return cnt > 0 ? (
                            <button key={u} onClick={() => startPractice(sub, u)}
                              style={{ padding:'5px 12px', borderRadius:8, border:`1.5px solid ${C.border}`, background:'#fff', color:C.slate, fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                              {u.length > 22 ? u.slice(0,22)+'…' : u}
                              {pct !== null && <span style={{ fontSize:10, fontWeight:800, color: pct>=70?C.green:pct>=40?C.amber:C.red }}>({pct}%)</span>}
                            </button>
                          ) : null
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Quiz Screen ── */}
          {pracMode === 'quiz' && pracQs.length > 0 && (() => {
            const q   = pracQs[pracIdx]
            const pct = Math.round((pracIdx / pracQs.length) * 100)
            return (
              <div style={{ maxWidth:680, margin:'0 auto' }}>
                {/* Header */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.amber }}>
                    {pracSub?.icon} {pracSub?.name} {pracUnit !== 'all' ? `— ${pracUnit}` : ''}
                  </div>
                  <button onClick={() => { setPracMode(null); setPracAnswers([]) }}
                    style={{ padding:'5px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:'#fff', fontSize:12, color:C.slate, cursor:'pointer' }}>
                    ✕ Exit
                  </button>
                </div>
                {/* Progress bar */}
                <div style={{ height:6, background:'#e2e8f0', borderRadius:99, marginBottom:20, overflow:'hidden' }}>
                  <div style={{ width:`${pct}%`, height:'100%', background:`linear-gradient(90deg,${C.amber},${C.orange})`, borderRadius:99, transition:'.3s' }} />
                </div>
                <div style={{ fontSize:12, color:C.slate, textAlign:'right', marginTop:-16, marginBottom:16 }}>
                  Q {pracIdx + 1} of {pracQs.length}
                </div>

                {/* Question card */}
                <div style={{ background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:18, padding:'28px 28px 22px', boxShadow:'0 4px 20px rgba(0,0,0,.06)' }}>
                  <div style={{ display:'flex', gap:10, marginBottom:20 }}>
                    <div style={{ background: q.diff==='hard' ? C.red+'18' : q.diff==='medium' ? C.amber+'18' : C.green+'18',
                        color: q.diff==='hard' ? C.red : q.diff==='medium' ? C.amber : C.green,
                        padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:700, flexShrink:0 }}>
                      {q.diff}
                    </div>
                  </div>
                  <div style={{ fontSize:16, fontWeight:600, color:'#1e293b', lineHeight:1.7, marginBottom:24 }}>{q.q}</div>

                  {/* Options */}
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {q.opts.map((opt, i) => {
                      let bg = '#fff', border = C.border, color = '#374151'
                      if (pracRevealed) {
                        if (i === q.ans)                   { bg = C.greenBg; border = C.green; color = C.green }
                        else if (i === pracSel && i !== q.ans) { bg = C.redBg;   border = C.red;   color = C.red }
                      } else if (pracSel === i) {
                        bg = C.amberBg; border = C.amber; color = C.amber
                      }
                      return (
                        <button key={i} onClick={() => { if (!pracRevealed) setPracSel(i) }}
                          style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:12, border:`1.5px solid ${border}`, background:bg, color, fontSize:14, textAlign:'left', cursor: pracRevealed ? 'default' : 'pointer', transition:'.15s' }}>
                          <span style={{ width:28, height:28, borderRadius:99, background: pracRevealed && i===q.ans ? C.green : pracRevealed && i===pracSel && i!==q.ans ? C.red : '#f1f5f9', color: (pracRevealed && (i===q.ans || i===pracSel)) ? '#fff' : C.slate, fontSize:12, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            {['A','B','C','D'][i]}
                          </span>
                          <span style={{ flex:1, lineHeight:1.5 }}>{opt}</span>
                          {pracRevealed && i === q.ans       && <span style={{ fontSize:16 }}>✅</span>}
                          {pracRevealed && i === pracSel && i !== q.ans && <span style={{ fontSize:16 }}>❌</span>}
                        </button>
                      )
                    })}
                  </div>

                  {/* Explanation */}
                  {pracRevealed && (
                    <div style={{ marginTop:18, padding:'14px 16px', background:'#fffbeb', border:`1px solid #fde68a`, borderRadius:10, fontSize:13, color:'#78350f', lineHeight:1.7 }}>
                      💡 <strong>Explanation:</strong> {q.exp}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
                    {!pracRevealed ? (
                      <button onClick={revealPracAnswer} disabled={pracSel === null}
                        style={{ padding:'10px 24px', borderRadius:10, background: pracSel===null ? '#e2e8f0' : `linear-gradient(135deg,${C.amber},${C.orange})`, color: pracSel===null ? C.slate : '#fff', border:'none', fontSize:14, fontWeight:700, cursor: pracSel===null ? 'not-allowed' : 'pointer' }}>
                        Check Answer
                      </button>
                    ) : (
                      <button onClick={nextPracQuestion}
                        style={{ padding:'10px 24px', borderRadius:10, background:`linear-gradient(135deg,${C.indigo},${C.indigoL})`, color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                        {pracIdx < pracQs.length - 1 ? 'Next Question →' : 'See Results →'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ── Result Screen ── */}
          {pracMode === 'result' && (() => {
            const score   = pracAnswers.filter(a => a.correct).length
            const pct     = Math.round(score / pracQs.length * 100)
            const grade   = pct >= 80 ? { label:'Excellent! 🏆', color:C.green } : pct >= 60 ? { label:'Good 👍', color:C.amber } : { label:'Keep Practising 📖', color:C.red }
            return (
              <div style={{ maxWidth:600, margin:'0 auto' }}>
                {/* Score circle */}
                <div style={{ textAlign:'center', padding:'32px 0 24px' }}>
                  <div style={{ display:'inline-flex', flexDirection:'column', alignItems:'center', justifyContent:'center', width:130, height:130, borderRadius:'50%', background:`conic-gradient(${grade.color} ${pct * 3.6}deg, #e2e8f0 0)`, boxShadow:`0 0 0 6px #fff, 0 0 0 8px ${grade.color}30` }}>
                    <span style={{ fontSize:24, fontWeight:900, color:grade.color }}>{pct}%</span>
                    <span style={{ fontSize:11, color:C.slate }}>Score</span>
                  </div>
                  <div style={{ marginTop:16, fontSize:18, fontWeight:800, color:grade.color }}>{grade.label}</div>
                  <div style={{ fontSize:13, color:C.slate, marginTop:4 }}>{score}/{pracQs.length} correct · {pracSub?.name} {pracUnit !== 'all' ? `— ${pracUnit}` : ''}</div>
                </div>

                {/* Answer breakdown */}
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
                  {pracQs.map((q, i) => {
                    const ans = pracAnswers[i]
                    return (
                      <div key={q.id} style={{ background:'#fff', border:`1px solid ${ans?.correct ? C.green+'40' : C.red+'40'}`, borderLeft:`4px solid ${ans?.correct ? C.green : C.red}`, borderRadius:10, padding:'12px 16px' }}>
                        <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                          <span style={{ fontSize:16, flexShrink:0 }}>{ans?.correct ? '✅' : '❌'}</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:'#1e293b', marginBottom:4 }}>{q.q}</div>
                            {!ans?.correct && (
                              <div style={{ fontSize:12, color:C.green }}>✓ Correct: {q.opts[q.ans]}</div>
                            )}
                            <div style={{ fontSize:11.5, color:C.slate, marginTop:4 }}>💡 {q.exp}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
                  <button onClick={() => startPractice(pracSub, pracUnit)}
                    style={{ padding:'10px 24px', borderRadius:10, background:`linear-gradient(135deg,${C.amber},${C.orange})`, color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    🔄 Practice Again
                  </button>
                  <button onClick={() => setPracMode(null)}
                    style={{ padding:'10px 24px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#fff', color:C.slate, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    ← Back
                  </button>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* ══════════════════════ MOCK TESTS ═══════════════════════════════════ */}
      {tab === 'tests' && (
        <div>
          <SectionHead icon='🧪' title='Mock Tests' subtitle='Timed unit & subject tests with performance analysis and history' color={C.teal} />

          {/* ── Home ── */}
          {testMode === null && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14, marginBottom:28 }}>
                {[
                  { type:'unit',   icon:'📝', title:'Unit Test',     desc:'10 questions from one unit. Quick 5-min drill.',  color:C.teal },
                  { type:'full',   icon:'📄', title:'Subject Mock',  desc:'15+ questions across all units. Full mock exam.',  color:C.purple },
                ].map(t => (
                  <div key={t.type} onClick={() => { setTestType(t.type); setTestSub(null); setTestUnit('all'); setTestMode('config') }}
                    style={{ background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:16, padding:'24px 22px', cursor:'pointer', transition:'.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = t.color; e.currentTarget.style.background = t.color+'0a' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = '#fff' }}>
                    <div style={{ fontSize:28, marginBottom:10 }}>{t.icon}</div>
                    <div style={{ fontWeight:800, fontSize:15, color:t.color, marginBottom:6 }}>{t.title}</div>
                    <div style={{ fontSize:13, color:C.slate, lineHeight:1.6 }}>{t.desc}</div>
                  </div>
                ))}
              </div>
              {/* History */}
              {testHistory.length > 0 && (
                <div>
                  <div style={{ fontWeight:800, fontSize:14, color:C.slate, marginBottom:12 }}>📊 Recent Test History</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {testHistory.slice(0, 5).map((h, i) => {
                      const pct = Math.round(h.score/h.total*100)
                      return (
                        <div key={i} style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                          <div style={{ width:44, height:44, borderRadius:99, background: pct>=70?C.greenBg:pct>=40?C.amberBg:C.redBg, display:'grid', placeItems:'center' }}>
                            <span style={{ fontSize:13, fontWeight:800, color: pct>=70?C.green:pct>=40?C.amber:C.red }}>{pct}%</span>
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{h.subject} {h.unit !== 'all' ? `— ${h.unit}` : ''}</div>
                            <div style={{ fontSize:11, color:C.slate }}>{h.score}/{h.total} · {new Date(h.date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Config ── */}
          {testMode === 'config' && (
            <div style={{ maxWidth:520 }}>
              <h3 style={{ fontSize:15, fontWeight:800, color:C.teal, marginBottom:18 }}>
                {testType === 'unit' ? '📝 Configure Unit Test' : '📄 Configure Subject Mock'}
              </h3>
              <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:14, padding:24 }}>
                <label style={{ display:'block', fontWeight:700, fontSize:13, color:C.teal, marginBottom:8 }}>Select Subject</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 }}>
                  {subjects.map(s => (
                    <button key={s.id} onClick={() => { setTestSub(s); setTestUnit('all') }}
                      style={{ padding:'7px 14px', borderRadius:9, border:`1.5px solid ${testSub?.id===s.id ? C.teal : C.border}`, background: testSub?.id===s.id ? C.tealBg : '#fff', color: testSub?.id===s.id ? C.teal : C.slate, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      {s.icon} {s.name}
                    </button>
                  ))}
                </div>
                {testSub && testType === 'unit' && (
                  <div style={{ marginBottom:20 }}>
                    <label style={{ display:'block', fontWeight:700, fontSize:13, color:C.teal, marginBottom:8 }}>Select Unit</label>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      <button onClick={() => setTestUnit('all')} style={{ padding:'6px 12px', borderRadius:8, border:`1.5px solid ${testUnit==='all' ? C.teal : C.border}`, background: testUnit==='all' ? C.tealBg : '#fff', color: testUnit==='all' ? C.teal : C.slate, fontSize:12, fontWeight:600, cursor:'pointer' }}>All Units</button>
                      {testSub.units.map(u => (
                        <button key={u} onClick={() => setTestUnit(u)} style={{ padding:'6px 12px', borderRadius:8, border:`1.5px solid ${testUnit===u ? C.teal : C.border}`, background: testUnit===u ? C.tealBg : '#fff', color: testUnit===u ? C.teal : C.slate, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                          {u.length>24 ? u.slice(0,24)+'…' : u}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {testSub && (
                  <button onClick={() => {
                    const qs = buildTest(testSub, testUnit, testType==='unit' ? 10 : 15)
                    if (qs.length === 0) { alert('No MCQs available for this selection yet.'); return }
                    setTestQs(qs); setTestAnswers({}); setTestCurrentIdx(0); setTestMode('running')
                  }} style={{ width:'100%', padding:13, borderRadius:10, background:`linear-gradient(135deg,${C.teal},${C.cyan})`, color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    🚀 Start Test — {testType==='unit' ? '10' : '15'} Questions
                  </button>
                )}
              </div>
              <button onClick={() => setTestMode(null)} style={{ marginTop:12, padding:'8px 16px', borderRadius:8, border:`1px solid ${C.border}`, background:'#fff', fontSize:13, color:C.slate, cursor:'pointer' }}>← Back</button>
            </div>
          )}

          {/* ── Running ── */}
          {testMode === 'running' && testQs.length > 0 && (() => {
            const q = testQs[testCurrentIdx]
            return (
              <div style={{ maxWidth:660, margin:'0 auto' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.teal }}>🧪 {testSub?.name}</div>
                  <div style={{ fontSize:12, color:C.slate }}>Q {testCurrentIdx+1}/{testQs.length} · Answered: {Object.keys(testAnswers).length}</div>
                </div>
                <div style={{ height:5, background:'#e2e8f0', borderRadius:99, marginBottom:20, overflow:'hidden' }}>
                  <div style={{ width:`${(testCurrentIdx/testQs.length)*100}%`, height:'100%', background:`linear-gradient(90deg,${C.teal},${C.cyan})`, borderRadius:99 }} />
                </div>
                <div style={{ background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:18, padding:'26px 26px 20px', boxShadow:'0 4px 20px rgba(0,0,0,.06)' }}>
                  <div style={{ fontSize:16, fontWeight:600, color:'#1e293b', lineHeight:1.7, marginBottom:22 }}>{q.q}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                    {q.opts.map((opt, i) => {
                      const sel = testAnswers[q.id] === i
                      return (
                        <button key={i} onClick={() => setTestAnswers(a => ({ ...a, [q.id]: i }))}
                          style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', borderRadius:11, border:`1.5px solid ${sel ? C.teal : C.border}`, background: sel ? C.tealBg : '#fff', color: sel ? C.teal : '#374151', fontSize:13.5, textAlign:'left', cursor:'pointer', transition:'.15s' }}>
                          <span style={{ width:26, height:26, borderRadius:99, background: sel ? C.teal : '#f1f5f9', color: sel ? '#fff' : C.slate, fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            {['A','B','C','D'][i]}
                          </span>
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:22, gap:10 }}>
                    <button onClick={() => setTestCurrentIdx(i => Math.max(0, i-1))} disabled={testCurrentIdx===0}
                      style={{ padding:'9px 18px', borderRadius:9, border:`1px solid ${C.border}`, background:'#fff', fontSize:13, color:C.slate, cursor:'pointer', opacity: testCurrentIdx===0?0.4:1 }}>← Prev</button>
                    <div style={{ display:'flex', gap:8 }}>
                      {testCurrentIdx < testQs.length-1
                        ? <button onClick={() => setTestCurrentIdx(i => i+1)} style={{ padding:'9px 22px', borderRadius:9, background:`linear-gradient(135deg,${C.teal},${C.cyan})`, color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer' }}>Next →</button>
                        : <button onClick={submitTest} style={{ padding:'9px 22px', borderRadius:9, background:`linear-gradient(135deg,${C.green},#15803d)`, color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer' }}>Submit Test ✓</button>
                      }
                    </div>
                  </div>
                </div>
                {/* Question navigator */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:18 }}>
                  {testQs.map((q,i) => (
                    <button key={i} onClick={() => setTestCurrentIdx(i)}
                      style={{ width:32, height:32, borderRadius:8, border:`1.5px solid ${testCurrentIdx===i ? C.teal : testAnswers[q.id]!==undefined ? C.green : C.border}`, background: testCurrentIdx===i ? C.teal : testAnswers[q.id]!==undefined ? C.greenBg : '#fff', color: testCurrentIdx===i ? '#fff' : testAnswers[q.id]!==undefined ? C.green : C.slate, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      {i+1}
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* ── Result ── */}
          {testMode === 'result' && (() => {
            const score = testQs.reduce((a, q) => a + (testAnswers[q.id]===q.ans ? 1:0), 0)
            const pct   = Math.round(score/testQs.length*100)
            const grade = pct>=80?{label:'Excellent 🏆',c:C.green}:pct>=60?{label:'Good 👍',c:C.amber}:{label:'Needs Work 📖',c:C.red}
            return (
              <div style={{ maxWidth:600, margin:'0 auto' }}>
                <div style={{ textAlign:'center', padding:'28px 0 20px' }}>
                  <div style={{ display:'inline-flex', flexDirection:'column', alignItems:'center', justifyContent:'center', width:120, height:120, borderRadius:'50%', border:`8px solid ${grade.c}`, boxShadow:`0 0 0 4px ${grade.c}22` }}>
                    <span style={{ fontSize:26, fontWeight:900, color:grade.c }}>{pct}%</span>
                    <span style={{ fontSize:10, color:C.slate }}>Score</span>
                  </div>
                  <div style={{ marginTop:14, fontSize:17, fontWeight:800, color:grade.c }}>{grade.label}</div>
                  <div style={{ fontSize:13, color:C.slate, marginTop:4 }}>{score}/{testQs.length} correct · {testSub?.name}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
                  {testQs.map(q => {
                    const userAns = testAnswers[q.id]
                    const correct = userAns === q.ans
                    return (
                      <div key={q.id} style={{ background:'#fff', border:`1px solid ${correct?C.green+'40':C.red+'40'}`, borderLeft:`4px solid ${correct?C.green:C.red}`, borderRadius:10, padding:'12px 16px' }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'#1e293b', marginBottom:6 }}>{q.q}</div>
                        {!correct && <div style={{ fontSize:12, color:C.red }}>Your answer: {userAns!==undefined ? q.opts[userAns] : '(not answered)'}</div>}
                        <div style={{ fontSize:12, color:C.green }}>✓ {q.opts[q.ans]}</div>
                        <div style={{ fontSize:11.5, color:C.slate, marginTop:4 }}>💡 {q.exp}</div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
                  <button onClick={() => { const qs = buildTest(testSub, testUnit, testType==='unit'?10:15); setTestQs(qs); setTestAnswers({}); setTestCurrentIdx(0); setTestMode('running') }}
                    style={{ padding:'10px 22px', borderRadius:10, background:`linear-gradient(135deg,${C.teal},${C.cyan})`, color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    🔄 Retake Test
                  </button>
                  <button onClick={() => setTestMode(null)}
                    style={{ padding:'10px 22px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#fff', color:C.slate, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    ← Back
                  </button>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* ══════════════════════ PYQ BANK ═════════════════════════════════════ */}
      {tab === 'pyq' && (
        <div>
          <SectionHead icon='📋' title='Previous Year Questions' subtitle={`${PYQS.length} real exam questions from top Indian universities — filter by subject, year & type`} color={C.blue} />

          {/* Filters */}
          <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:14, padding:'16px 18px', marginBottom:20 }}>
            <input value={pyqSearch} onChange={e => setPyqSearch(e.target.value)}
              placeholder='🔍 Search questions or subjects…'
              style={{ width:'100%', padding:'9px 14px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, marginBottom:14, boxSizing:'border-box' }} />

            <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:C.slate, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>University</div>
                <select value={pyqUni} onChange={e => setPyqUni(e.target.value)}
                  style={{ padding:'7px 10px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, color:C.slate, minWidth:180 }}>
                  <option value='all'>All Universities</option>
                  {uniqueUnis.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:C.slate, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>Subject</div>
                <select value={pyqSub} onChange={e => setPyqSub(e.target.value)}
                  style={{ padding:'7px 10px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, color:C.slate, minWidth:150 }}>
                  <option value='all'>All Subjects</option>
                  {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:C.slate, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>Year</div>
                <select value={pyqYr} onChange={e => setPyqYr(e.target.value)}
                  style={{ padding:'7px 10px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, color:C.slate }}>
                  <option value='all'>All Years</option>
                  {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:C.slate, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>Type</div>
                <div style={{ display:'flex', gap:6 }}>
                  {[['all','All'],['long','Long Ans'],['short','Short Ans']].map(([v,l]) => (
                    <Pill key={v} label={l} active={pyqType === v} color={C.blue} onClick={() => setPyqType(v)} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div style={{ fontSize:13, color:C.slate, marginBottom:14 }}>
            Showing <strong>{filteredPyqs.length}</strong> question{filteredPyqs.length !== 1 ? 's' : ''}
            {filteredPyqs.length !== PYQS.length && <span style={{ color:C.indigo, fontWeight:600 }}> (filtered from {PYQS.length})</span>}
          </div>

          {/* PYQ Cards */}
          {filteredPyqs.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px', color:C.slate }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🔍</div>
              <div style={{ fontWeight:600 }}>No questions match your filters</div>
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filteredPyqs.map(p => (
              <div key={p.id}
                style={{ background:'#fff', border:`1.5px solid ${pyqOpen === p.id ? C.blue : C.border}`, borderRadius:14, overflow:'hidden', transition:'.15s' }}>
                {/* Header */}
                <div onClick={() => setPyqOpen(pyqOpen === p.id ? null : p.id)}
                  style={{ padding:'14px 18px', cursor:'pointer', display:'flex', gap:12, alignItems:'flex-start' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:7 }}>
                      <Badge label={p.subject} color={C.blue} bg={C.blueBg} />
                      <Badge label={p.year} color={C.slate} bg='#f1f5f9' />
                      <Badge label={p.university} color={C.indigo} bg={C.indigoBg} />
                      <Badge label={p.type === 'long' ? 'Long Answer' : 'Short Answer'} color={p.type === 'long' ? C.orange : C.green} bg={p.type === 'long' ? C.orangeBg : C.greenBg} />
                      <Badge label={`${p.marks} marks`} color={C.red} bg={C.redBg} />
                    </div>
                    <div style={{ fontSize:13.5, color:'#1e293b', lineHeight:1.6, fontWeight:500 }}>
                      {pyqOpen === p.id ? p.q : p.q.slice(0,120) + (p.q.length > 120 ? '…' : '')}
                    </div>
                  </div>
                  <span style={{ color:C.slate, fontSize:14, flexShrink:0, marginTop:2 }}>{pyqOpen === p.id ? '▲' : '▼'}</span>
                </div>

                {/* Expanded: AI answer button placeholder */}
                {pyqOpen === p.id && (
                  <div style={{ padding:'0 18px 16px', borderTop:`1px solid ${C.border}`, paddingTop:14 }}>
                    <div style={{ fontSize:13, color:'#1e293b', lineHeight:1.8, marginBottom:14 }}>{p.q}</div>
                    <div style={{ fontSize:11.5, color:C.slate, fontStyle:'italic' }}>
                      💡 For a model answer, go to <strong>Smart Notes</strong>, select the relevant subject & unit, and generate AI notes covering this topic.
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════ AI DOUBT SOLVER ══════════════════════════════ */}
      {tab === 'doubt' && (
        <div style={{ maxWidth:720, margin:'0 auto' }}>
          <SectionHead icon='💬' title='AI Doubt Solver' subtitle='Ask any question — concepts, derivations, formulas, exam problems. Get instant step-by-step answers.' color={C.purple} />

          {/* Subject context selector */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:18, alignItems:'center' }}>
            <span style={{ fontSize:12, fontWeight:700, color:C.slate }}>Context:</span>
            <button onClick={() => setDoubtSub(null)}
              style={{ padding:'5px 12px', borderRadius:8, border:`1.5px solid ${!doubtSub ? C.purple : C.border}`, background: !doubtSub ? C.purpleBg : '#fff', color: !doubtSub ? C.purple : C.slate, fontSize:12, fontWeight:700, cursor:'pointer' }}>
              General
            </button>
            {subjects.map(s => (
              <button key={s.id} onClick={() => setDoubtSub(s)}
                style={{ padding:'5px 12px', borderRadius:8, border:`1.5px solid ${doubtSub?.id===s.id ? C.purple : C.border}`, background: doubtSub?.id===s.id ? C.purpleBg : '#fff', color: doubtSub?.id===s.id ? C.purple : C.slate, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                {s.icon} {s.name}
              </button>
            ))}
          </div>

          {/* Chat window */}
          <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:18, overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,.06)' }}>
            <div style={{ height:420, overflowY:'auto', padding:'20px 20px', display:'flex', flexDirection:'column', gap:16 }}>
              {doubtMsgs.map((m, i) => (
                <div key={i} style={{ display:'flex', gap:10, flexDirection: m.role==='user' ? 'row-reverse' : 'row', alignItems:'flex-start' }}>
                  <div style={{ width:32, height:32, borderRadius:99, background: m.role==='user' ? C.purple : `linear-gradient(135deg,${C.purple},${C.indigo})`, display:'grid', placeItems:'center', fontSize:14, flexShrink:0 }}>
                    {m.role==='user' ? '👤' : '🤖'}
                  </div>
                  <div style={{ maxWidth:'78%', background: m.role==='user' ? C.purple : C.purpleBg, border: m.role==='user' ? 'none' : `1px solid ${C.purple}22`, borderRadius: m.role==='user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px', padding:'12px 16px' }}>
                    {m.text.split('\n').map((line, li) => {
                      if (line.startsWith('**') && line.endsWith('**')) return <div key={li} style={{ fontWeight:800, fontSize:13.5, color: m.role==='user' ? '#fff' : C.purple, marginBottom:4, marginTop: li>0?8:0 }}>{line.replace(/\*\*/g,'')}</div>
                      if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) return <div key={li} style={{ display:'flex', gap:8, marginBottom:4 }}><span style={{ color: m.role==='user'?'rgba(255,255,255,.7)':C.purple, flexShrink:0 }}>▸</span><span style={{ fontSize:13, lineHeight:1.6, color: m.role==='user'?'rgba(255,255,255,.95)':'#374151' }}>{line.replace(/^[-•]\s/,'')}</span></div>
                      if (line.trim()==='') return <div key={li} style={{ height:6 }} />
                      return <p key={li} style={{ margin:'0 0 4px', fontSize:13, lineHeight:1.7, color: m.role==='user'?'#fff':'#374151' }}>{line}</p>
                    })}
                  </div>
                </div>
              ))}
              {doubtLoading && (
                <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <div style={{ width:32, height:32, borderRadius:99, background:`linear-gradient(135deg,${C.purple},${C.indigo})`, display:'grid', placeItems:'center', fontSize:14 }}>🤖</div>
                  <div style={{ background:C.purpleBg, border:`1px solid ${C.purple}22`, borderRadius:'4px 16px 16px 16px', padding:'14px 18px' }}>
                    <span style={{ display:'inline-block', width:6, height:6, background:C.purple, borderRadius:99, animation:'bounce .6s infinite' }} />{' '}
                    <span style={{ display:'inline-block', width:6, height:6, background:C.purple, borderRadius:99, animation:'bounce .6s .2s infinite' }} />{' '}
                    <span style={{ display:'inline-block', width:6, height:6, background:C.purple, borderRadius:99, animation:'bounce .6s .4s infinite' }} />
                  </div>
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:8, padding:'12px 16px', borderTop:`1px solid ${C.border}` }}>
              <input value={doubtInput} onChange={e => setDoubtInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendDoubt()}
                placeholder={doubtSub ? `Ask about ${doubtSub.name}…` : 'Type your question here…'}
                style={{ flex:1, padding:'10px 14px', border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:14, color:'#374151' }} />
              <button onClick={sendDoubt} disabled={!doubtInput.trim() || doubtLoading}
                style={{ padding:'10px 18px', borderRadius:10, background: !doubtInput.trim() || doubtLoading ? '#e2e8f0' : `linear-gradient(135deg,${C.purple},${C.indigo})`, color: !doubtInput.trim() || doubtLoading ? C.slate : '#fff', border:'none', fontSize:14, fontWeight:700, cursor: !doubtInput.trim() || doubtLoading ? 'not-allowed' : 'pointer' }}>
                {doubtLoading ? '⏳' : '→'}
              </button>
            </div>
          </div>

          {/* Sample questions */}
          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.slate, marginBottom:8 }}>🌟 Try asking:</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {(doubtSub ? [
                `Explain ${doubtSub.units[0]}`,
                `What is the most important formula in ${doubtSub.name}?`,
                `Give me 3 exam tips for ${doubtSub.name}`,
              ] : [
                'Explain recursion with an example',
                'What is normalization in DBMS?',
                'How to calculate BEP in cost accounting?',
                'What is the IS-LM model in Macroeconomics?',
              ]).map(q => (
                <button key={q} onClick={() => { setDoubtInput(q) }}
                  style={{ padding:'5px 12px', borderRadius:8, border:`1px solid ${C.purple}30`, background:C.purpleBg, color:C.purple, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ STUDY PLANNER ════════════════════════════════ */}
      {tab === 'planner' && (
        <div style={{ maxWidth:760, margin:'0 auto' }}>
          <SectionHead icon='🗓' title='AI Study Planner' subtitle='Enter your exam and get a personalised day-by-day study schedule generated by AI' color={C.rose} />

          {/* Input form */}
          <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:16, padding:'24px 26px', marginBottom:24 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:18 }}>
              <div>
                <label style={{ display:'block', fontWeight:700, fontSize:13, color:C.rose, marginBottom:6 }}>Exam / Goal Name</label>
                <input value={planExamName} onChange={e => setPlanExamName(e.target.value)}
                  placeholder='e.g. Semester Finals, UGC NET, CAT 2026'
                  style={{ width:'100%', padding:'10px 14px', border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, boxSizing:'border-box' }} />
              </div>
              <div>
                <label style={{ display:'block', fontWeight:700, fontSize:13, color:C.rose, marginBottom:6 }}>Exam Date</label>
                <input type='date' value={planExamDate} onChange={e => setPlanExamDate(e.target.value)}
                  style={{ width:'100%', padding:'10px 14px', border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, boxSizing:'border-box' }} />
              </div>
            </div>
            {planExamDate && (
              <div style={{ marginBottom:14, fontSize:13, color:C.slate }}>
                📆 {Math.ceil((new Date(planExamDate) - new Date()) / 86400000)} days remaining
                {' · '}Subjects: {subjects.map(s=>s.name).join(', ')}
              </div>
            )}
            <button onClick={generateStudyPlan} disabled={!planExamName || !planExamDate || planLoading}
              style={{ width:'100%', padding:13, borderRadius:10, background: !planExamName || !planExamDate || planLoading ? '#e2e8f0' : `linear-gradient(135deg,${C.rose},${C.red})`, color: !planExamName || !planExamDate || planLoading ? C.slate : '#fff', border:'none', fontSize:14, fontWeight:700, cursor: !planExamName || !planExamDate || planLoading ? 'not-allowed' : 'pointer' }}>
              {planLoading ? '⏳ Generating your personalised plan…' : '🗓 Generate Study Plan'}
            </button>
          </div>

          {/* Plan output */}
          {studyPlan && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:15, color:C.rose }}>{studyPlan.examName}</div>
                  <div style={{ fontSize:12, color:C.slate }}>
                    Generated {new Date(studyPlan.generatedAt).toLocaleDateString('en-IN', {day:'numeric',month:'short'})} · Exam {new Date(studyPlan.examDate).toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'})}
                  </div>
                </div>
                <button onClick={() => { localStorage.removeItem(LS_STUDYPLAN); setStudyPlan(null) }}
                  style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:'#fff', fontSize:12, color:C.slate, cursor:'pointer' }}>
                  🗑 Clear
                </button>
              </div>
              <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:16, padding:'24px 26px', lineHeight:1.8, fontSize:13.5, color:'#1e293b' }}>
                {studyPlan.planText.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.includes('**')) return <div key={i} style={{ fontWeight:800, color:C.rose, fontSize:15, marginTop:18, marginBottom:6 }}>{line.replace(/\*\*/g,'')}</div>
                  if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) return <div key={i} style={{ paddingLeft:16, marginBottom:5, display:'flex', gap:8 }}><span style={{ color:C.rose, flexShrink:0 }}>▸</span>{line.replace(/^[-•]\s/,'')}</div>
                  if (line.trim() === '') return <div key={i} style={{ height:8 }} />
                  if (line.trim().match(/^📅|^📚|^✅|^⭐|^🎯|^💡|^🧪/)) return <div key={i} style={{ fontWeight:700, color:'#374151', marginTop:8, marginBottom:4 }}>{line}</div>
                  return <div key={i} style={{ marginBottom:3 }}>{line}</div>
                })}
              </div>
            </div>
          )}

          {!studyPlan && !planLoading && (
            <div style={{ textAlign:'center', padding:'48px 24px', color:C.slate, background:'#fff', border:`1.5px dashed ${C.border}`, borderRadius:16 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🗓</div>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:6 }}>No study plan yet</div>
              <div style={{ fontSize:13 }}>Enter your exam details above and click Generate to get a personalised AI study plan</div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════ SKILL LAB ════════════════════════════════════ */}
      {tab === 'skills' && (
        <div>
          <SectionHead icon='🛠' title='Skill Lab' subtitle='Career-building courses with free resources — coding, tools, communication & finance' color={C.green} />

          {/* Category filter */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:22 }}>
            {skillCategories.map(c => (
              <Pill key={c} label={c} active={skillCat === c} color={C.green} onClick={() => setSkillCat(c)} />
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
            {filteredSkills.map(sk => {
              const prog = skillProgress[sk.id] || 'not-started'
              const isOpen = skillOpen === sk.id
              return (
                <div key={sk.id} style={{ background:'#fff', border:`1.5px solid ${isOpen ? sk.color : C.border}`, borderRadius:16, overflow:'hidden', transition:'.15s' }}>
                  {/* Card head */}
                  <div onClick={() => setSkillOpen(isOpen ? null : sk.id)} style={{ padding:'18px 18px 14px', cursor:'pointer' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                      <div style={{ width:46, height:46, borderRadius:12, background:sk.bg, display:'grid', placeItems:'center', fontSize:22, flexShrink:0 }}>
                        {sk.icon}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:800, fontSize:14, color:sk.color, lineHeight:1.3, marginBottom:4 }}>{sk.name}</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                          <Badge label={sk.category} color={sk.color} bg={sk.bg} />
                          <Badge label={sk.duration} color={C.slate} bg='#f1f5f9' />
                          <Badge label={sk.level} color={C.slate} bg='#f1f5f9' />
                        </div>
                      </div>
                      <span style={{ color:C.slate, fontSize:12, marginTop:2 }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                    <p style={{ margin:'10px 0 0', fontSize:12.5, color:C.slate, lineHeight:1.6 }}>
                      🎯 {sk.outcome}
                    </p>
                  </div>

                  {/* Progress selector */}
                  <div style={{ padding:'0 18px 14px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      {[['not-started','Not Started'],['in-progress','In Progress'],['completed','Completed']].map(([v,l]) => (
                        <button key={v} onClick={() => { const u = {...skillProgress, [sk.id]:v}; saveSkillProgress(u) }}
                          style={{ flex:1, padding:'5px 4px', borderRadius:7, border:`1px solid ${prog === v ? sk.color : C.border}`, background: prog === v ? sk.bg : '#fff', color: prog === v ? sk.color : C.slate, fontSize:10, fontWeight:700, cursor:'pointer', transition:'.15s' }}>
                          {v === 'not-started' ? '⬜' : v === 'in-progress' ? '🟡' : '✅'} {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isOpen && (
                    <div style={{ borderTop:`1px solid ${C.border}`, padding:'16px 18px' }}>
                      <div style={{ fontSize:12, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>What You'll Learn</div>
                      <ul style={{ margin:'0 0 16px', paddingLeft:16 }}>
                        {sk.topics.map(t => <li key={t} style={{ fontSize:12.5, color:'#334155', lineHeight:1.7 }}>{t}</li>)}
                      </ul>

                      <div style={{ fontSize:12, fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Free Resources</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {sk.resources.map(r => (
                          <a key={r.l} href={r.u} target='_blank' rel='noreferrer'
                            style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:8, background:sk.bg, border:`1px solid ${sk.color}28`, color:sk.color, fontSize:12, fontWeight:600, textDecoration:'none', transition:'.15s' }}>
                            <span>🔗</span> {r.l}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════ EXAM TRACKER ═════════════════════════════════ */}
      {tab === 'exams' && (
        <div>
          <SectionHead icon='📅' title='Exam & Competition Tracker' subtitle='Track competitive exam deadlines, countdowns, and eligibility — all in one place' color={C.orange} />

          {/* Tracked summary */}
          {trackedExams.length > 0 && (
            <div style={{ background:`linear-gradient(135deg,${C.orange}14,${C.amber}08)`, border:`1.5px solid ${C.amber}38`, borderRadius:16, padding:'18px 20px', marginBottom:24 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.amber, marginBottom:10 }}>📌 My Tracked Exams ({trackedExams.length})</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {trackedExams.map(eid => {
                  const ex = EXAMS.find(e => e.id === eid)
                  if (!ex) return null
                  const d = getDaysLeft(ex.date)
                  return (
                    <div key={eid} style={{ padding:'6px 12px', background:'#fff', borderRadius:99, border:`1px solid ${ex.color}38`, fontSize:12, fontWeight:700, color:ex.color, display:'flex', alignItems:'center', gap:6 }}>
                      {ex.icon} {ex.name}
                      <span style={{ background: d > 60 ? C.greenBg : d > 20 ? C.amberBg : C.redBg, color: d > 60 ? C.green : d > 20 ? C.amber : C.red, padding:'1px 6px', borderRadius:99, fontSize:10 }}>
                        {d > 0 ? `${d}d` : 'Past'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Exam list */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {EXAMS.map(ex => {
              const d = getDaysLeft(ex.date)
              const tracked = trackedExams.includes(ex.id)
              const urgent = d > 0 && d <= 30
              const past = d <= 0
              return (
                <div key={ex.id} style={{
                  background:'#fff', border:`1.5px solid ${tracked ? ex.color : C.border}`,
                  borderRadius:14, padding:'16px 18px', display:'flex', gap:14, alignItems:'center', flexWrap:'wrap',
                  opacity: past ? 0.55 : 1,
                }}>
                  {/* Icon + countdown */}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:64 }}>
                    <div style={{ width:52, height:52, borderRadius:12, background:ex.color+'14', display:'grid', placeItems:'center', fontSize:24, marginBottom:4 }}>{ex.icon}</div>
                    <div style={{ fontSize:10, fontWeight:800, color: past ? C.slate : d <= 30 ? C.red : d <= 90 ? C.amber : C.green, textAlign:'center', letterSpacing:.3 }}>
                      {past ? 'PAST' : `${d}d left`}
                    </div>
                  </div>

                  {/* Details */}
                  <div style={{ flex:1, minWidth:180 }}>
                    <div style={{ fontWeight:800, fontSize:14, color:ex.color, marginBottom:4 }}>{ex.name}</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:6 }}>
                      <Badge label={ex.org} color={ex.color} bg={ex.color+'14'} />
                      <Badge label={ex.cat} color={C.slate} bg='#f1f5f9' />
                      {urgent && !past && <Badge label='⚠ URGENT' color={C.red} bg={C.redBg} />}
                    </div>
                    <div style={{ fontSize:12, color:C.slate }}>👤 {ex.eligible}</div>
                    <div style={{ fontSize:12, color:C.slate, marginTop:2 }}>📆 {new Date(ex.date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</div>
                  </div>

                  {/* Track button */}
                  <button onClick={() => {
                    const updated = tracked ? trackedExams.filter(id => id !== ex.id) : [...trackedExams, ex.id]
                    saveTrackedExams(updated)
                  }} style={{
                    padding:'8px 16px', borderRadius:8, border:`1.5px solid ${tracked ? ex.color : C.border}`,
                    background: tracked ? ex.color : '#fff', color: tracked ? '#fff' : C.slate,
                    fontSize:12, fontWeight:700, cursor:'pointer', transition:'.15s', flexShrink:0,
                  }}>
                    {tracked ? '📌 Tracking' : '+ Track'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Spinner keyframe ── */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
