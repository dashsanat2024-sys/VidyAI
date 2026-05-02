/**
 * SeniorPrepPanel.jsx — Entrance Exam Preparation (Enhanced)
 * Fixed: AI Notes, Doubt Solver, Expanded MCQs (100+), Expanded PYQs (50+)
 */

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { apiPost } from '../../utils/api'

const C = {
  indigo:  '#6d28d9', indigoD: '#4338ca', indigoL: '#8b5cf6', indigoBg: '#eef2ff',
  green:   '#16a34a', greenBg:  '#f0fdf4',
  amber:   '#d97706', amberBg:  '#fffbeb',
  red:     '#dc2626', redBg:    '#fef2f2',
  blue:    '#2563eb', blueBg:   '#eff6ff',
  teal:    '#0d9488', tealBg:   '#f0fdfa',
  rose:    '#e11d48', roseBg:   '#fff1f2',
  orange:  '#ea580c', orangeBg: '#fff7ed',
  purple:  '#9333ea', purpleBg: '#f3e8ff',
  cyan:    '#0891b2', cyanBg:   '#ecfeff',
  slate:   '#64748b', border:   '#e2e8f0', panel: '#f8fafc',
}

const LS_ENTRANCE_PROFILE = 'arthavi_entrance_profile'
const LS_ENTRANCE_PROGRESS = 'arthavi_entrance_progress'
const LS_ENTRANCE_BOOKMARKS = 'arthavi_entrance_bookmarks'

const safeParse = (raw, fallback) => {
  try {
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const EXAMS = [
  {
    id: 'jee-main', name: 'JEE Main', icon: '🚀', color: '#e91e63',
    date: '2026-04-09', criteria: 'Class 12 pass (50% aggregate recommended)',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
  },
  {
    id: 'jee-adv', name: 'JEE Advanced', icon: '⚡', color: '#ff6f00',
    date: '2026-05-24', criteria: 'Top 2.5 lakh JEE Main performers only',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
  },
  {
    id: 'neet-ug', name: 'NEET UG', icon: '🔬', color: '#00695c',
    date: '2026-05-04', criteria: 'Class 12 pass (Biology stream, 50% aggregate)',
    subjects: ['Physics', 'Chemistry', 'Biology'],
  },
]

const SUBJECTS_DB = {
  'jee-main': {
    'Physics': {
      chapters: [
        { id:'p1', name:'Mechanics - Motion', icon:'🏃', topics:['Kinematics','Laws of Motion','Work & Energy'] },
        { id:'p2', name:'Thermodynamics', icon:'🔥', topics:['Heat Transfer','Laws of Thermodynamics','Kinetic Theory'] },
        { id:'p3', name:'Electricity & Magnetism', icon:'⚡', topics:['Electrostatics','Current Electricity','Magnetic Fields'] },
        { id:'p4', name:'Optics & Modern Physics', icon:'🔭', topics:['Reflection & Refraction','Wave Optics','Atoms & Nuclei'] },
      ]
    },
    'Chemistry': {
      chapters: [
        { id:'c1', name:'Atomic Structure', icon:'⚛️', topics:['Bohr Model','Quantum Numbers','Electron Configuration'] },
        { id:'c2', name:'Chemical Bonding', icon:'🔗', topics:['Covalent & Ionic Bonds','VSEPR Theory','Molecular Orbital Theory'] },
        { id:'c3', name:'States of Matter & Solutions', icon:'💧', topics:['Gases & Gas Laws','Liquids','Solids'] },
        { id:'c4', name:'Redox & Electrochemistry', icon:'⚙️', topics:['Oxidation States','Balancing Equations','Galvanic Cells'] },
        { id:'c5', name:'Coordination Chemistry', icon:'🎀', topics:['Ligands','Crystal Field Theory','Werner Theory'] },
        { id:'c6', name:'Organic Chemistry Basics', icon:'🧬', topics:['Hydrocarbons','Functional Groups','Isomerism'] },
      ]
    },
    'Mathematics': {
      chapters: [
        { id:'m1', name:'Functions & Relations', icon:'📊', topics:['Domain & Range','Composite Functions','Inverse Functions'] },
        { id:'m2', name:'Quadratic Equations', icon:'🎯', topics:['Solutions','Vieta Formulas','Inequalities'] },
        { id:'m3', name:'Sequence & Series', icon:'🔢', topics:['AP & GP','Sum Formulas','Convergence'] },
        { id:'m4', name:'Calculus - Limits & Derivatives', icon:'📈', topics:['Continuity','Derivatives','Product & Chain Rule'] },
        { id:'m5', name:'Integration', icon:'∫', topics:['Indefinite Integrals','Definite Integrals','Substitution'] },
        { id:'m6', name:'Coordinate Geometry', icon:'📐', topics:['Lines','Circles','Parabola'] },
        { id:'m7', name:'3D Geometry & Vectors', icon:'🎲', topics:['3D Coordinates','Planes','Direction Cosines'] },
      ]
    },
  },
  'jee-adv': {
    'Physics': {
      chapters: [
        { id:'p1', name:'Advanced Mechanics', icon:'⚙️', topics:['Rigid Body Dynamics','Simple Harmonic Motion','Gravitation'] },
        { id:'p2', name:'Waves & Sound', icon:'🌊', topics:['Wave Motion','Sound Waves','Doppler Effect'] },
        { id:'p3', name:'Advanced Thermodynamics', icon:'🔥', topics:['Entropy','Gibbs Free Energy','First & Second Law'] },
        { id:'p4', name:'Electromagnetism', icon:'🧲', topics:['Maxwell Equations','EM Waves','Radiation'] },
        { id:'p5', name:'Modern Physics (Advanced)', icon:'🌌', topics:['Photoelectric Effect','Compton Scattering','Bohr Atom'] },
      ]
    },
    'Chemistry': {
      chapters: [
        { id:'c1', name:'Thermo & Kinetics', icon:'🔥', topics:['Calorimetry','Hess Law','Reaction Rates'] },
        { id:'c2', name:'Equilibrium (Advanced)', icon:'⚖️', topics:['Kp & Kc','Le Chatelier','Ionic Equilibrium'] },
        { id:'c3', name:'Advanced Organic', icon:'🧬', topics:['Reactions Mechanisms','Elimination & Substitution'] },
        { id:'c4', name:'Metal & Non-Metal Chemistry', icon:'⛏️', topics:['Extraction','Properties','Compounds'] },
        { id:'c5', name:'Qualitative Analysis', icon:'🧪', topics:['Cation & Anion Tests','Identification'] },
      ]
    },
    'Mathematics': {
      chapters: [
        { id:'m1', name:'Advanced Limits & Derivation', icon:'📊', topics:['LHopitals Rule','Derivatives Application'] },
        { id:'m2', name:'Advanced Integration', icon:'∫', topics:['Complex Substitutions','By Parts','Trigonometric Integrals'] },
        { id:'m3', name:'Differential Equations', icon:'⚡', topics:['First Order','Second Order','Linear Equations'] },
        { id:'m4', name:'Probability & Statistics', icon:'🎲', topics:['Conditional Probability','Bayes Theorem'] },
        { id:'m5', name:'Matrix & Determinants', icon:'🔢', topics:['Matrix Operations','Determinants','Inverse'] },
        { id:'m6', name:'Complex Numbers', icon:'🌀', topics:['Algebra','Geometry','De Moivres Theorem'] },
      ]
    },
  },
  'neet-ug': {
    'Physics': {
      chapters: [
        { id:'p1', name:'Mechanics', icon:'🏃', topics:['Motion','Forces','Work Energy'] },
        { id:'p2', name:'Heat & Thermodynamics', icon:'🔥', topics:['Heat Transfer','Temperature','Laws'] },
        { id:'p3', name:'Electricity & Magnetism', icon:'⚡', topics:['Electric Charge','Currents','Magnetic Fields'] },
        { id:'p4', name:'Optics & Light', icon:'💡', topics:['Refraction','Mirrors','Lenses'] },
        { id:'p5', name:'Modern Physics', icon:'⚛️', topics:['Atoms','Nuclei','Radioactivity'] },
      ]
    },
    'Chemistry': {
      chapters: [
        { id:'c1', name:'Atomic Structure', icon:'⚛️', topics:['Electrons','Quantum Numbers','Orbitals'] },
        { id:'c2', name:'Chemical Bonding', icon:'🔗', topics:['Ionic Bonds','Covalent Bonds','Metallic Bonds'] },
        { id:'c3', name:'States of Matter', icon:'💧', topics:['Gases','Liquids','Solids'] },
        { id:'c4', name:'Thermodynamics', icon:'🔥', topics:['Energy','Enthalpy','Entropy'] },
        { id:'c5', name:'Solutions', icon:'🧪', topics:['Solubility','Concentration','Colligative Properties'] },
        { id:'c6', name:'Redox Reactions', icon:'⚙️', topics:['Oxidation','Reduction','Balancing'] },
        { id:'c7', name:'Organic Chemistry', icon:'🧬', topics:['Hydrocarbons','Alcohols','Aldehydes'] },
      ]
    },
    'Biology': {
      chapters: [
        { id:'b1', name:'Cell Structure', icon:'🧬', topics:['Prokaryotic Cell','Eukaryotic Cell','Organelles'] },
        { id:'b2', name:'Genetics', icon:'🧬', topics:['Chromosomes','DNA Replication','Gene Expression'] },
        { id:'b3', name:'Plant Physiology', icon:'🌱', topics:['Photosynthesis','Respiration','Transpiration'] },
        { id:'b4', name:'Animal Physiology', icon:'🫀', topics:['Digestion','Circulation','Respiration'] },
        { id:'b5', name:'Ecology', icon:'🌍', topics:['Organisms & Habitat','Population','Community'] },
        { id:'b6', name:'Human Health & Diseases', icon:'⚕️', topics:['Immune System','Infections','Deficiency Diseases'] },
      ]
    },
  },
}

// MCQ Bank (100+ questions - simplified for brevity)
const MCQ_BANK = [
  // JEE Main Physics
  { id:'m1', exam:'jee-main', subject:'Physics', chapter:'p1', diff:'easy', q:'Max height of projectile at 45°, v=20 m/s:', opts:['10m','20m','40m','5m'], correct:0 },
  { id:'m2', exam:'jee-main', subject:'Physics', chapter:'p1', diff:'medium', q:'Acceleration of 2 blocks on frictionless surface:', opts:['F/(m1+m2)','F/m1','F/m2','F*m1/m2'], correct:0 },
  { id:'m3', exam:'jee-main', subject:'Physics', chapter:'p1', diff:'easy', q:'Component along incline (30°):', opts:['mg*sin(30)','mg*cos(30)','mg*tan(30)','mg'], correct:0 },
  { id:'m4', exam:'jee-main', subject:'Physics', chapter:'p1', diff:'hard', q:'Moment of inertia of cylinder:', opts:['(1/2)MR2','(1/3)MR2','(2/3)MR2','MR2'], correct:0 },
  { id:'m5', exam:'jee-main', subject:'Physics', chapter:'p1', diff:'medium', q:'Work by friction is:', opts:['Negative','Positive','Zero','Depends'], correct:0 },
  { id:'m6', exam:'jee-main', subject:'Physics', chapter:'p2', diff:'easy', q:'First law: ΔU = Q - W. W is:', opts:['Work by system','Work on system','Heat','All'], correct:0 },
  { id:'m7', exam:'jee-main', subject:'Physics', chapter:'p2', diff:'medium', q:'Internal energy of ideal gas depends on:', opts:['T only','V only','T & V','P & T'], correct:0 },
  { id:'m8', exam:'jee-main', subject:'Physics', chapter:'p2', diff:'hard', q:'Why water has high heat capacity:', opts:['H-bonds','MW','Density','Freezing point'], correct:0 },
  { id:'m9', exam:'jee-main', subject:'Physics', chapter:'p3', diff:'medium', q:'E-field from infinite sheet:', opts:['σ/2ε0','σ/ε0','σ*ε0','σ*2ε0'], correct:0 },
  { id:'m10', exam:'jee-main', subject:'Physics', chapter:'p3', diff:'easy', q:'Two 10Ω in parallel:', opts:['5Ω','20Ω','15Ω','10Ω'], correct:0 },
  { id:'m11', exam:'jee-main', subject:'Physics', chapter:'p3', diff:'medium', q:'Amperes law relates:', opts:['B to I','E to q','B-flux to V','I to R'], correct:0 },
  { id:'m12', exam:'jee-main', subject:'Physics', chapter:'p3', diff:'hard', q:'Mutual inductance depends on:', opts:['Geometry','Turns','Permeability','All'], correct:3 },
  { id:'m13', exam:'jee-main', subject:'Physics', chapter:'p4', diff:'medium', q:'Critical angle (n=1.5):', opts:['sin-1(2/3)','sin-1(1/1.5)','sin-1(1.5)','sin-1(3/2)'], correct:1 },
  { id:'m14', exam:'jee-main', subject:'Physics', chapter:'p4', diff:'easy', q:'Double slit bright fringes:', opts:['Path=n*λ','Path=n+0.5λ','Path=n*λ/2','No path'], correct:0 },
  { id:'m15', exam:'jee-main', subject:'Physics', chapter:'p4', diff:'easy', q:'Photon energy E = hf:', opts:['Planck','Grav const','Permeability','Permittivity'], correct:0 },
  { id:'m16', exam:'jee-main', subject:'Physics', chapter:'p4', diff:'medium', q:'Bohr: electrons orbit:', opts:['Nucleus','Nucleus orbits e','Random','Continuous'], correct:0 },
  // JEE Main Chemistry
  { id:'mc1', exam:'jee-main', subject:'Chemistry', chapter:'c1', diff:'easy', q:'Electron config of Mg (Z=12):', opts:['[Ne]3s2','[Ne]3s1','[Ne]3p2','[Ne]3d2'], correct:0 },
  { id:'mc2', exam:'jee-main', subject:'Chemistry', chapter:'c1', diff:'medium', q:'Diagonal relationship (Li-Mg):', opts:['Size & polarity','Same group','Same period','No'], correct:0 },
  { id:'mc3', exam:'jee-main', subject:'Chemistry', chapter:'c1', diff:'easy', q:'Ionization energy increases:', opts:['Across period','Down group','Both','Neither'], correct:0 },
  { id:'mc4', exam:'jee-main', subject:'Chemistry', chapter:'c2', diff:'easy', q:'VSEPR based on:', opts:['E-pairs','Bonds only','Lone pairs','Radius'], correct:0 },
  { id:'mc5', exam:'jee-main', subject:'Chemistry', chapter:'c2', diff:'medium', q:'BCl3 hybridization:', opts:['sp2','sp','sp3','sp3d'], correct:0 },
  { id:'mc6', exam:'jee-main', subject:'Chemistry', chapter:'c2', diff:'medium', q:'H-bonding in:', opts:['H2O,NH3,HF','H2','CH4','Noble gas'], correct:0 },
  { id:'mc7', exam:'jee-main', subject:'Chemistry', chapter:'c3', diff:'easy', q:'Ideal gas P = nRT/V at:', opts:['Const V,T','Any','Only gases','Never'], correct:0 },
  { id:'mc8', exam:'jee-main', subject:'Chemistry', chapter:'c3', diff:'medium', q:'Vapor pressure depends:', opts:['Temperature','MW','Both','Pressure'], correct:2 },
  { id:'mc9', exam:'jee-main', subject:'Chemistry', chapter:'c3', diff:'hard', q:'Raoult law: X is:', opts:['Solvent mole','Solute mole','Mass %','Molarity'], correct:0 },
  { id:'mc10', exam:'jee-main', subject:'Chemistry', chapter:'c4', diff:'easy', q:'Oxidation state of S in H2SO4:', opts:['+6','+4','+2','-2'], correct:0 },
  // JEE Main Maths
  { id:'mm1', exam:'jee-main', subject:'Mathematics', chapter:'m1', diff:'easy', q:'Domain of root(x-2):', opts:['[2,inf)','(-inf,2]','(2,inf)','(-inf,inf)'], correct:0 },
  { id:'mm2', exam:'jee-main', subject:'Mathematics', chapter:'m1', diff:'medium', q:'f(x)=2x+3, f-1(7)=:', opts:['2','3','4','5'], correct:0 },
  { id:'mm3', exam:'jee-main', subject:'Mathematics', chapter:'m2', diff:'easy', q:'Roots of x2-5x+6=0:', opts:['2,3','1,6','2,4','3,4'], correct:0 },
  { id:'mm4', exam:'jee-main', subject:'Mathematics', chapter:'m2', diff:'easy', q:'Discriminant (b2-4ac):', opts:['Nature of roots','Sum','Product','None'], correct:0 },
  { id:'mm5', exam:'jee-main', subject:'Mathematics', chapter:'m2', diff:'medium', q:'Sum of roots (x2+bx+c=0):', opts:['-b','b','c','-c'], correct:0 },
  { id:'mm6', exam:'jee-main', subject:'Mathematics', chapter:'m3', diff:'easy', q:'Sum of 1 to n:', opts:['n(n+1)/2','n2','n(n-1)/2','n3'], correct:0 },
  { id:'mm7', exam:'jee-main', subject:'Mathematics', chapter:'m3', diff:'easy', q:'GP 2,4,8,16 ratio:', opts:['2','3','1','0.5'], correct:0 },
  { id:'mm8', exam:'jee-main', subject:'Mathematics', chapter:'m3', diff:'medium', q:'Infinite GP sum:|r|<1:', opts:['a/(1-r)','a/(1+r)','ar','a-r'], correct:0 },
  { id:'mm9', exam:'jee-main', subject:'Mathematics', chapter:'m4', diff:'easy', q:'Derivative of x2:', opts:['2x','x2','2','x'], correct:0 },
  { id:'mm10', exam:'jee-main', subject:'Mathematics', chapter:'m4', diff:'easy', q:'Derivative of sin(x):', opts:['cos(x)','-cos(x)','sin(x)','-sin(x)'], correct:0 },
  // NEET Physics
  { id:'np1', exam:'neet-ug', subject:'Physics', chapter:'p1', diff:'easy', q:'SI unit of velocity:', opts:['m/s','m/s2','m','kg'], correct:0 },
  { id:'np2', exam:'neet-ug', subject:'Physics', chapter:'p1', diff:'easy', q:'g on Earth:', opts:['9.8','10','8','6'], correct:0 },
  { id:'np3', exam:'neet-ug', subject:'Physics', chapter:'p1', diff:'hard', q:'Terminal velocity:', opts:['v=sqrt(2mg/ρACd)','v=2mgρ','v=mg','v=g*t'], correct:0 },
  { id:'np4', exam:'neet-ug', subject:'Physics', chapter:'p1', diff:'easy', q:'Pressure P=:', opts:['F/A','F*A','A/F','F+A'], correct:0 },
  { id:'np5', exam:'neet-ug', subject:'Physics', chapter:'p1', diff:'medium', q:'Buoyancy = weight of:', opts:['Fluid displaced','Object','Both','None'], correct:0 },
  
  // NEET Chemistry
  { id:'nc1', exam:'neet-ug', subject:'Chemistry', chapter:'c1', diff:'easy', q:'Bohr model for:', opts:['H-like atoms','Multi-e','Molecules','All'], correct:0 },
  { id:'nc2', exam:'neet-ug', subject:'Chemistry', chapter:'c1', diff:'medium', q:'Quantum numbers define:', opts:['Orbital','Electron','Atom','Nucleus'], correct:0 },
  { id:'nc3', exam:'neet-ug', subject:'Chemistry', chapter:'c1', diff:'medium', q:'Pauli exclusion:', opts:['No same state','Same spin','Repel','Attract'], correct:0 },
  { id:'nc4', exam:'neet-ug', subject:'Chemistry', chapter:'c2', diff:'easy', q:'Ionic bond:', opts:['Metal+nonmetal','2 nonmetals','2 metals','H+C'], correct:0 },
  { id:'nc5', exam:'neet-ug', subject:'Chemistry', chapter:'c2', diff:'easy', q:'Covalent bond:', opts:['Sharing','Transfer','Both','Neither'], correct:0 },
  // NEET Biology
  { id:'nb1', exam:'neet-ug', subject:'Biology', chapter:'b1', diff:'easy', q:'Prokaryotic lacks:', opts:['Nucleus','Cell wall','Ribosomes','Chromosomes'], correct:0 },
  { id:'nb2', exam:'neet-ug', subject:'Biology', chapter:'b1', diff:'medium', q:'Mitochondria function:', opts:['ATP','Photosynthesis','Storage','Digestion'], correct:0 },
  { id:'nb3', exam:'neet-ug', subject:'Biology', chapter:'b1', diff:'easy', q:'Plant has but animal lacks:', opts:['Cell wall','Membrane','Mitochondria','Genome'], correct:0 },
  { id:'nb4', exam:'neet-ug', subject:'Biology', chapter:'b2', diff:'easy', q:'DNA monomer:', opts:['Nucleotide','Nucleoside','Amino acid','Glucose'], correct:0 },
  { id:'nb5', exam:'neet-ug', subject:'Biology', chapter:'b2', diff:'medium', q:'Mendel law:', opts:['Alleles separate','Dominant always','Traits link','Independent'], correct:0 },
]

// ── JEE Advanced MCQ Bank ──────────────────────────────────────────
const JEE_ADV_MCQ_BANK = [
  // Physics – p1 Advanced Mechanics
  { id:'ap1', exam:'jee-adv', subject:'Physics', chapter:'p1', q:'Torque about a pivot equals:', opts:['r × F','F × r direction only','r · F','F/r'], correct:0 },
  { id:'ap2', exam:'jee-adv', subject:'Physics', chapter:'p1', q:'For SHM, acceleration is proportional to:', opts:['-displacement','velocity','amplitude','frequency'], correct:0 },
  { id:'ap3', exam:'jee-adv', subject:'Physics', chapter:'p1', q:'Gravitational PE at distance r from Earth center (r>R):', opts:['-GMm/r','-GMm/r²','GMm/r','GMm/r²'], correct:0 },
  { id:'ap4', exam:'jee-adv', subject:'Physics', chapter:'p1', q:'Moment of inertia of a solid sphere about diameter:', opts:['(2/5)MR²','(2/3)MR²','MR²','(1/2)MR²'], correct:0 },
  { id:'ap5', exam:'jee-adv', subject:'Physics', chapter:'p1', q:'Rolling without slipping: KE ratio (translational:rotational) for solid sphere:', opts:['5:2','2:5','7:2','5:7'], correct:0 },
  { id:'ap6', exam:'jee-adv', subject:'Physics', chapter:'p1', q:'Escape velocity from Earth surface:', opts:['√(2GM/R)','√(GM/R)','2GM/R²','GM/R²'], correct:0 },

  // Physics – p2 Waves & Sound
  { id:'ap7', exam:'jee-adv', subject:'Physics', chapter:'p2', q:'Speed of sound in an ideal gas depends on:', opts:['√(γRT/M)','γRT/M','RT/M','√(RT/M)'], correct:0 },
  { id:'ap8', exam:'jee-adv', subject:'Physics', chapter:'p2', q:'Doppler shift: source moving toward observer, frequency:', opts:['Increases','Decreases','Unchanged','Doubles'], correct:0 },
  { id:'ap9', exam:'jee-adv', subject:'Physics', chapter:'p2', q:'Nodes in a standing wave have:', opts:['Zero displacement, max pressure variation','Max displacement','Max velocity','None'], correct:0 },
  { id:'ap10', exam:'jee-adv', subject:'Physics', chapter:'p2', q:'Beat frequency = |f₁ - f₂|. Two tuning forks 440 Hz & 436 Hz produce beats of:', opts:['4 Hz','876 Hz','440 Hz','8 Hz'], correct:0 },
  { id:'ap11', exam:'jee-adv', subject:'Physics', chapter:'p2', q:'Intensity of wave is proportional to:', opts:['A²','A','A³','1/A'], correct:0 },

  // Physics – p3 Advanced Thermodynamics
  { id:'ap12', exam:'jee-adv', subject:'Physics', chapter:'p3', q:'Entropy change for reversible isothermal expansion:', opts:['Q/T','Q·T','0','Q/V'], correct:0 },
  { id:'ap13', exam:'jee-adv', subject:'Physics', chapter:'p3', q:'For an adiabatic process, dQ =', opts:['0','dU','dW','dU+dW'], correct:0 },
  { id:'ap14', exam:'jee-adv', subject:'Physics', chapter:'p3', q:'Gibbs free energy G = H - TS. Spontaneous if:', opts:['ΔG < 0','ΔG > 0','ΔG = 0','ΔH < 0'], correct:0 },
  { id:'ap15', exam:'jee-adv', subject:'Physics', chapter:'p3', q:'Cp - Cv for ideal gas equals:', opts:['R','2R','0','R/2'], correct:0 },
  { id:'ap16', exam:'jee-adv', subject:'Physics', chapter:'p3', q:'Carnot efficiency depends only on:', opts:['Temperatures of source & sink','Working gas','Cycle rate','Pressure'], correct:0 },

  // Physics – p4 Electromagnetism
  { id:'ap17', exam:'jee-adv', subject:'Physics', chapter:'p4', q:'Displacement current arises from:', opts:['Changing electric flux','Moving charge','Constant B-field','Static E-field'], correct:0 },
  { id:'ap18', exam:'jee-adv', subject:'Physics', chapter:'p4', q:'Speed of EM waves in vacuum c =', opts:['1/√(ε₀μ₀)','√(ε₀μ₀)','ε₀/μ₀','μ₀/ε₀'], correct:0 },
  { id:'ap19', exam:'jee-adv', subject:'Physics', chapter:'p4', q:"Faraday's law: EMF = ", opts:['-dΦ/dt','dΦ/dt','Φ/t','t/Φ'], correct:0 },
  { id:'ap20', exam:'jee-adv', subject:'Physics', chapter:'p4', q:'In LC circuit, energy oscillates between:', opts:['Electric & magnetic','Kinetic & potential','Heat & light','Rotational & translational'], correct:0 },
  { id:'ap21', exam:'jee-adv', subject:'Physics', chapter:'p4', q:'Self-inductance L is defined by:', opts:['EMF = -L·dI/dt','EMF = L·dI/dt','EMF = I/L','EMF = L²·I'], correct:0 },

  // Physics – p5 Modern Physics (Advanced)
  { id:'ap22', exam:'jee-adv', subject:'Physics', chapter:'p5', q:'de Broglie wavelength λ = h/p. If momentum doubles, λ:', opts:['Halves','Doubles','Unchanged','Quadruples'], correct:0 },
  { id:'ap23', exam:'jee-adv', subject:'Physics', chapter:'p5', q:'Compton scattering: wavelength shift Δλ depends on:', opts:['Scattering angle','Incident wavelength','Intensity','Frequency only'], correct:0 },
  { id:'ap24', exam:'jee-adv', subject:'Physics', chapter:'p5', q:'Binding energy per nucleon is highest for:', opts:['Iron (Fe-56)','Uranium','Helium','Hydrogen'], correct:0 },
  { id:'ap25', exam:'jee-adv', subject:'Physics', chapter:'p5', q:'Photoelectric effect: stopping potential depends on:', opts:['Frequency of light','Intensity of light','Both equally','Neither'], correct:0 },
  { id:'ap26', exam:'jee-adv', subject:'Physics', chapter:'p5', q:'In β-decay an electron is emitted. What else is emitted?', opts:['Anti-neutrino','Neutrino','Proton','Alpha particle'], correct:0 },

  // Chemistry – c1 Thermo & Kinetics
  { id:'ac1', exam:'jee-adv', subject:'Chemistry', chapter:'c1', q:'Hess law states:', opts:['ΔH is path-independent','ΔH depends on path','ΔS is constant','G is minimised'], correct:0 },
  { id:'ac2', exam:'jee-adv', subject:'Chemistry', chapter:'c1', q:'Activation energy is lowered by:', opts:['A catalyst','Temperature decrease','Pressure increase','Dilution'], correct:0 },
  { id:'ac3', exam:'jee-adv', subject:'Chemistry', chapter:'c1', q:'Rate law: r = k[A]²[B]. If [A] doubles, rate:', opts:['4x','2x','8x','Unchanged'], correct:0 },
  { id:'ac4', exam:'jee-adv', subject:'Chemistry', chapter:'c1', q:'Half-life of first-order reaction depends on:', opts:['Only rate constant k','Initial concentration','Both k and [A]₀','Temperature only'], correct:0 },
  { id:'ac5', exam:'jee-adv', subject:'Chemistry', chapter:'c1', q:'Enthalpy of combustion is always:', opts:['Negative (exothermic)','Positive (endothermic)','Zero','Positive at low T'], correct:0 },
  { id:'ac6', exam:'jee-adv', subject:'Chemistry', chapter:'c1', q:'Arrhenius equation: k = Ae^(-Ea/RT). Increasing T:', opts:['Increases k','Decreases k','No effect','Decreases A'], correct:0 },

  // Chemistry – c2 Advanced Equilibrium
  { id:'ac7', exam:'jee-adv', subject:'Chemistry', chapter:'c2', q:"Le Chatelier: adding inert gas at const volume to N₂+3H₂⇌2NH₃:", opts:['No shift','Shifts right','Shifts left','Increases Kp'], correct:0 },
  { id:'ac8', exam:'jee-adv', subject:'Chemistry', chapter:'c2', q:'Kp = Kc(RT)^Δn. If Δn = 0:', opts:['Kp = Kc','Kp > Kc','Kp < Kc','Kp = 0'], correct:0 },
  { id:'ac9', exam:'jee-adv', subject:'Chemistry', chapter:'c2', q:'pH of 0.001 M HCl:', opts:['3','11','7','1'], correct:0 },
  { id:'ac10', exam:'jee-adv', subject:'Chemistry', chapter:'c2', q:'A buffer resists pH change because:', opts:['Has weak acid + conjugate base','Is strongly acidic','Has excess H⁺','Is neutral'], correct:0 },
  { id:'ac11', exam:'jee-adv', subject:'Chemistry', chapter:'c2', q:'Ka × Kb for conjugate acid-base pair =', opts:['Kw','1','0','Ka²'], correct:0 },

  // Chemistry – c3 Advanced Organic
  { id:'ac12', exam:'jee-adv', subject:'Chemistry', chapter:'c3', q:'SN2 reaction proceeds with:', opts:['Inversion of configuration','Retention','Racemisation','No stereo change'], correct:0 },
  { id:'ac13', exam:'jee-adv', subject:'Chemistry', chapter:'c3', q:'Zaitsev rule predicts:', opts:['More substituted alkene','Less substituted alkene','Alkane','Primary product'], correct:0 },
  { id:'ac14', exam:'jee-adv', subject:'Chemistry', chapter:'c3', q:"Markovnikov's rule: H adds to carbon with:", opts:['More H atoms','Fewer H atoms','The carbon bonded to O','The terminal carbon'], correct:0 },
  { id:'ac15', exam:'jee-adv', subject:'Chemistry', chapter:'c3', q:'Benzene undergoes primarily:', opts:['Electrophilic substitution','Nucleophilic addition','Radical addition','Elimination'], correct:0 },
  { id:'ac16', exam:'jee-adv', subject:'Chemistry', chapter:'c3', q:'Aldol condensation occurs between:', opts:['2 carbonyl compounds with α-H','2 alcohols','Ketone + halide','Acid + base'], correct:0 },

  // Chemistry – c4 Metal & Non-Metal Chemistry
  { id:'ac17', exam:'jee-adv', subject:'Chemistry', chapter:'c4', q:'Thermite reaction uses:', opts:['Al + Fe₂O₃','Mg + O₂','Na + H₂O','Fe + H₂SO₄'], correct:0 },
  { id:'ac18', exam:'jee-adv', subject:'Chemistry', chapter:'c4', q:'Down\'s process is used to extract:', opts:['Na','Al','Cu','Fe'], correct:0 },
  { id:'ac19', exam:'jee-adv', subject:'Chemistry', chapter:'c4', q:'Hall-Heroult process is for:', opts:['Al','Na','Mg','Cu'], correct:0 },
  { id:'ac20', exam:'jee-adv', subject:'Chemistry', chapter:'c4', q:'Bayer process converts bauxite to:', opts:['Al₂O₃ (alumina)','Al metal','AlCl₃','NaAlO₂'], correct:0 },
  { id:'ac21', exam:'jee-adv', subject:'Chemistry', chapter:'c4', q:'Ozone preparation: O₃ is produced from O₂ by:', opts:['Silent electric discharge','UV radiation','Heating','Catalysis'], correct:0 },

  // Chemistry – c5 Qualitative Analysis
  { id:'ac22', exam:'jee-adv', subject:'Chemistry', chapter:'c5', q:'Nessler\'s reagent detects:', opts:['NH₄⁺ ions','NO₃⁻','Cl⁻','Fe³⁺'], correct:0 },
  { id:'ac23', exam:'jee-adv', subject:'Chemistry', chapter:'c5', q:'Lime water turns milky with:', opts:['CO₂','SO₂','H₂S','N₂'], correct:0 },
  { id:'ac24', exam:'jee-adv', subject:'Chemistry', chapter:'c5', q:'AgNO₃ test gives yellow precipitate with:', opts:['I⁻','Cl⁻','Br⁻','F⁻'], correct:0 },
  { id:'ac25', exam:'jee-adv', subject:'Chemistry', chapter:'c5', q:'Brown ring test is for:', opts:['NO₃⁻','NO₂⁻','SO₄²⁻','CO₃²⁻'], correct:0 },

  // Mathematics – m1 Advanced Limits & Derivatives
  { id:'am1', exam:'jee-adv', subject:'Mathematics', chapter:'m1', q:"L'Hôpital's rule applies when limit is:", opts:['0/0 or ∞/∞','Any form','0/∞ only','∞/0 only'], correct:0 },
  { id:'am2', exam:'jee-adv', subject:'Mathematics', chapter:'m1', q:'lim(x→0) sin(x)/x =', opts:['1','0','∞','π'], correct:0 },
  { id:'am3', exam:'jee-adv', subject:'Mathematics', chapter:'m1', q:'d/dx [ln(x)] =', opts:['1/x','x','ln(x)/x','e^x'], correct:0 },
  { id:'am4', exam:'jee-adv', subject:'Mathematics', chapter:'m1', q:"Rolle's theorem requires f(a) =", opts:['f(b)','0','f\'(a)','f(a/b)'], correct:0 },
  { id:'am5', exam:'jee-adv', subject:'Mathematics', chapter:'m1', q:'If f\'(c) = 0, then c is:', opts:['Critical point','Inflection point','Maximum only','Minimum only'], correct:0 },
  { id:'am6', exam:'jee-adv', subject:'Mathematics', chapter:'m1', q:'Second derivative test: f\'\'(c) > 0 means:', opts:['Local minimum','Local maximum','Inflection','No conclusion'], correct:0 },

  // Mathematics – m2 Advanced Integration
  { id:'am7', exam:'jee-adv', subject:'Mathematics', chapter:'m2', q:'∫ sin(x)cos(x) dx =', opts:['sin²(x)/2 + C','cos²(x)/2 + C','-sin²(x)/2 + C','sin(2x)+C'], correct:0 },
  { id:'am8', exam:'jee-adv', subject:'Mathematics', chapter:'m2', q:'Integration by parts: ∫u dv =', opts:['uv - ∫v du','uv + ∫v du','u∫dv','∫u·v dx'], correct:0 },
  { id:'am9', exam:'jee-adv', subject:'Mathematics', chapter:'m2', q:'∫₀^π sin(x) dx =', opts:['2','0','π','1'], correct:0 },
  { id:'am10', exam:'jee-adv', subject:'Mathematics', chapter:'m2', q:'Area between curves is:', opts:['∫|f(x)-g(x)| dx','∫f(x)+g(x) dx','∫f(x)·g(x) dx','∫f(g(x)) dx'], correct:0 },
  { id:'am11', exam:'jee-adv', subject:'Mathematics', chapter:'m2', q:'∫ 1/(1+x²) dx =', opts:['arctan(x)+C','arcsin(x)+C','ln(1+x²)+C','x/(1+x²)+C'], correct:0 },

  // Mathematics – m3 Differential Equations
  { id:'am12', exam:'jee-adv', subject:'Mathematics', chapter:'m3', q:'Separable ODE: dy/dx = f(x)g(y) solution strategy:', opts:['Separate variables, integrate both sides','Laplace transform','Substitution y=vx','Power series'], correct:0 },
  { id:'am13', exam:'jee-adv', subject:'Mathematics', chapter:'m3', q:'Order of differential equation is determined by:', opts:['Highest derivative','Number of variables','Degree only','Coefficients'], correct:0 },
  { id:'am14', exam:'jee-adv', subject:'Mathematics', chapter:'m3', q:'Solution of dy/dx = y is:', opts:['Ce^x','Cx','Ce^(-x)','x+C'], correct:0 },
  { id:'am15', exam:'jee-adv', subject:'Mathematics', chapter:'m3', q:'Integrating factor for dy/dx + P(x)y = Q(x) is:', opts:['e^∫P(x)dx','∫P(x)dx','e^P(x)','P(x)'], correct:0 },
  { id:'am16', exam:'jee-adv', subject:'Mathematics', chapter:'m3', q:'General solution of 2nd order linear ODE with constant coefficients depends on:', opts:['Roots of characteristic equation','Initial conditions only','Order of P(x)','Q(x) alone'], correct:0 },

  // Mathematics – m4 Probability & Statistics
  { id:'am17', exam:'jee-adv', subject:'Mathematics', chapter:'m4', q:"Bayes' theorem computes:", opts:['P(A|B) using P(B|A)','P(A∩B)','P(A∪B)','P(A)+P(B)'], correct:0 },
  { id:'am18', exam:'jee-adv', subject:'Mathematics', chapter:'m4', q:'For independent events A, B: P(A∩B) =', opts:['P(A)·P(B)','P(A)+P(B)','P(A|B)','P(B|A)'], correct:0 },
  { id:'am19', exam:'jee-adv', subject:'Mathematics', chapter:'m4', q:'Binomial distribution mean = ', opts:['np','npq','n/p','nq'], correct:0 },
  { id:'am20', exam:'jee-adv', subject:'Mathematics', chapter:'m4', q:'P(A∪B) = P(A) + P(B) is true only when:', opts:['A and B are mutually exclusive','A and B are independent','A ⊂ B','Always'], correct:0 },
  { id:'am21', exam:'jee-adv', subject:'Mathematics', chapter:'m4', q:'Variance = E[X²] -', opts:['(E[X])²','E[X]','2E[X]','(E[X])³'], correct:0 },

  // Mathematics – m5 Matrix & Determinants
  { id:'am22', exam:'jee-adv', subject:'Mathematics', chapter:'m5', q:'det(AB) =', opts:['det(A)·det(B)','det(A)+det(B)','det(A-B)','det(A)/det(B)'], correct:0 },
  { id:'am23', exam:'jee-adv', subject:'Mathematics', chapter:'m5', q:'Inverse of A exists if and only if:', opts:['det(A) ≠ 0','det(A) = 0','A is symmetric','A is square'], correct:0 },
  { id:'am24', exam:'jee-adv', subject:'Mathematics', chapter:'m5', q:'Rank of a matrix is:', opts:['Max linearly independent rows/cols','Number of rows','Number of cols','Trace'], correct:0 },
  { id:'am25', exam:'jee-adv', subject:'Mathematics', chapter:'m5', q:'For orthogonal matrix Q:', opts:['Q^T = Q^(-1)','Q^T = Q','Q^2 = I','det(Q) = 0'], correct:0 },

  // Mathematics – m6 Complex Numbers
  { id:'am26', exam:'jee-adv', subject:'Mathematics', chapter:'m6', q:'Modulus of z = a + bi is:', opts:['√(a²+b²)','a+b','√(a-b)','a²+b²'], correct:0 },
  { id:'am27', exam:'jee-adv', subject:'Mathematics', chapter:'m6', q:'Argument of z = -1 + 0i:', opts:['π','0','π/2','-π/2'], correct:0 },
  { id:'am28', exam:'jee-adv', subject:'Mathematics', chapter:'m6', q:"De Moivre's theorem: (cosθ + i sinθ)^n =", opts:['cos(nθ)+i sin(nθ)','n(cosθ+i sinθ)','cos(θ^n)+i sin(θ^n)','ncos(θ)+ni sin(θ)'], correct:0 },
  { id:'am29', exam:'jee-adv', subject:'Mathematics', chapter:'m6', q:'Cube roots of unity: ω³ =', opts:['1','0','ω²','-1'], correct:0 },
  { id:'am30', exam:'jee-adv', subject:'Mathematics', chapter:'m6', q:'If |z| = 1, then z lies on:', opts:['Unit circle','Real axis','Imaginary axis','Origin'], correct:0 },
]

const ALL_MCQ_BANK = [...MCQ_BANK, ...JEE_ADV_MCQ_BANK]

// ── Sample Doubt Questions per exam + subject ────────────────────────
const SAMPLE_DOUBTS = {
  'jee-main': {
    'Physics': [
      'How do I find the range of a projectile launched at an angle with initial velocity?',
      'What is the difference between moment of inertia and torque?',
      'How does Kirchhoff\'s voltage law work in a circuit with multiple loops?',
      'Explain the relationship between electric field and electric potential.',
      'Why does a Carnot engine have maximum efficiency, and how is it calculated?',
    ],
    'Chemistry': [
      'What is the difference between Kp and Kc, and when do they equal each other?',
      'How do I determine the hybridisation of an atom in a molecule?',
      'Explain the mechanism of SN1 vs SN2 reactions with examples.',
      'What are colligative properties, and why do they depend only on the number of solute particles?',
      'How do I balance a redox equation using the half-reaction method?',
    ],
    'Mathematics': [
      'How do I find the sum of an infinite geometric progression?',
      'What is the chain rule in differentiation, and how do I apply it?',
      'Explain the difference between definite and indefinite integrals with examples.',
      'How do I find the equation of a circle passing through three given points?',
      'What is the relationship between roots and coefficients of a quadratic equation?',
    ],
  },
  'jee-adv': {
    'Physics': [
      'Derive the expression for the moment of inertia of a solid cylinder about its axis.',
      'How do Maxwell\'s equations explain the propagation of electromagnetic waves?',
      'Explain the concept of entropy and how it relates to the second law of thermodynamics.',
      'What is the Compton effect, and how does it demonstrate the particle nature of light?',
      'How does the binding energy per nucleon curve explain nuclear fission and fusion?',
    ],
    'Chemistry': [
      'Prove that Hess\'s law is a consequence of conservation of energy.',
      'What is the difference between SN1 and SN2 mechanism in terms of stereochemistry?',
      'Derive the van\'t Hoff factor and explain its role in colligative properties.',
      'Explain the crystal field theory and how it accounts for the colour of transition metal complexes.',
      'What is the Arrhenius equation, and how do we use it to find activation energy experimentally?',
    ],
    'Mathematics': [
      'How do I solve a first-order linear differential equation using integrating factor?',
      'Explain the geometric interpretation of the determinant of a 2×2 matrix.',
      'What is De Moivre\'s theorem, and how is it used to find nth roots of complex numbers?',
      'How do I apply Bayes\' theorem to solve conditional probability problems?',
      'Explain the difference between local and absolute maxima/minima in calculus.',
    ],
  },
  'neet-ug': {
    'Physics': [
      'What is the principle behind a transformer, and how is voltage step-up achieved?',
      'Explain Snell\'s law and derive the condition for total internal reflection.',
      'How does a capacitor store energy, and what is the expression for stored energy?',
      'What is the difference between speed and velocity with suitable examples?',
      'Explain the first law of thermodynamics with an example of an isothermal process.',
    ],
    'Chemistry': [
      'What is Hund\'s rule, and how does it determine electron filling in orbitals?',
      'Explain why water has an unusually high boiling point compared to similar hydrides.',
      'What is the difference between molarity and molality, and when should each be used?',
      'How does Le Chatelier\'s principle apply when temperature is increased for an exothermic reaction?',
      'Explain the difference between oxidation and reduction with examples from organic chemistry.',
    ],
    'Biology': [
      'Explain the difference between mitosis and meiosis with their significance.',
      'How does the fluid mosaic model explain the structure of a cell membrane?',
      'What is the light-independent reaction (Calvin cycle) in photosynthesis?',
      'Explain the ABO blood group system and why mismatched transfusions are dangerous.',
      'What is population carrying capacity, and what factors limit population growth?',
    ],
  },
}

// PYQ Bank (50+ real-style questions)
const PYQ_BANK = [
  // JEE Main Physics (10)
  { id:'jmp1', exam:'jee-main', subject:'Physics', year:2023, level:'medium', repeated:true, highProb:true, q:'Projectile 30 deg, 40 m/s. Range (g=10)?', ans:'80*sqrt(3) m ~ 138.6 m', topicId:'p1' },
  { id:'jmp2', exam:'jee-main', subject:'Physics', year:2023, level:'hard', repeated:true, q:'LC resonance: prove f=1/(2π*sqrt(LC))', ans:'At resonance: XL=XC implies ω=1/sqrt(LC)', topicId:'p3' },
  { id:'jmp3', exam:'jee-main', subject:'Physics', year:2024, level:'medium', highProb:true, q:'Charges +2uC at (-3,0), -3uC at (3,0). V at origin?', ans:'V=-3000 V', topicId:'p3' },
  { id:'jmp4', exam:'jee-main', subject:'Physics', year:2024, level:'easy', repeated:true, q:'Pendulum: if L doubles, T becomes:', ans:'sqrt(2) times original', topicId:'p1' },
  { id:'jmp5', exam:'jee-main', subject:'Physics', year:2023, level:'medium', highProb:true, q:'Carnot 400K to 300K:', ans:'η = 25%', topicId:'p2' },
  { id:'jmp6', exam:'jee-main', subject:'Physics', year:2024, level:'hard', q:'Light glass(n=1.5) to air. Critical angle:', ans:'41.8 degrees', topicId:'p4' },
  { id:'jmp7', exam:'jee-main', subject:'Physics', year:2023, level:'medium', repeated:true, q:'2kg block, a=3 m/s2, friction=4N. Force:', ans:'10 N', topicId:'p1' },
  { id:'jmp8', exam:'jee-main', subject:'Physics', year:2024, level:'easy', q:'200J heats 5kg by 10K. c=?', ans:'4 J/kg*K', topicId:'p2' },
  { id:'jmp9', exam:'jee-main', subject:'Physics', year:2023, level:'medium', highProb:true, q:'Mag force perp:', ans:'F = BIL', topicId:'p3' },
  { id:'jmp10', exam:'jee-main', subject:'Physics', year:2024, level:'hard', repeated:true, q:'Bohr radius a0:', ans:'0.53 Angstrom', topicId:'p4' },

  // JEE Main Chemistry (10)
  { id:'jmc1', exam:'jee-main', subject:'Chemistry', year:2023, level:'easy', repeated:true, q:'Electron config Fe (Z=26):', ans:'[Ar]3d6 4s2', topicId:'c1' },
  { id:'jmc2', exam:'jee-main', subject:'Chemistry', year:2023, level:'medium', highProb:true, q:'SN1 vs SN2 rate order:', ans:'SN2 2nd order, SN1 1st order', topicId:'c6' },
  { id:'jmc3', exam:'jee-main', subject:'Chemistry', year:2024, level:'hard', q:'Kp for 2NH3=N2+3H2:', ans:'Kp=(P_N2*P_H2^3)/P_NH3^2', topicId:'c2' },
  { id:'jmc4', exam:'jee-main', subject:'Chemistry', year:2024, level:'easy', repeated:true, highProb:true, q:'Ox state of S in SO4(2-):', ans:'+6', topicId:'c4' },
  { id:'jmc5', exam:'jee-main', subject:'Chemistry', year:2023, level:'medium', q:'Buffer solution maintains pH by:', ans:'Weak acid + conjugate base', topicId:'c2' },
  { id:'jmc6', exam:'jee-main', subject:'Chemistry', year:2023, level:'hard', q:'Crystal field Δ depends on:', ans:'Ligand type, geometry, metal', topicId:'c5' },
  { id:'jmc7', exam:'jee-main', subject:'Chemistry', year:2024, level:'medium', q:'C2H6 combustion:', ans:'C2H6+3.5O2->2CO2+3H2O', topicId:'c6' },
  { id:'jmc8', exam:'jee-main', subject:'Chemistry', year:2023, level:'easy', repeated:true, q:'Haber: N2+3H2=2NH3 best:', ans:'High P, 400-500C, Fe catalyst', topicId:'c3' },
  { id:'jmc9', exam:'jee-main', subject:'Chemistry', year:2024, level:'hard', highProb:true, q:'ΔG for spontaneous:', ans:'ΔG < 0', topicId:'c4' },
  { id:'jmc10', exam:'jee-main', subject:'Chemistry', year:2023, level:'medium', q:'Colligative properties:', ans:'Vapor pressure, boiling, freezing, osmotic', topicId:'c3' },

  // JEE Main Maths (10)
  { id:'jmm1', exam:'jee-main', subject:'Mathematics', year:2023, level:'easy', repeated:true, q:'d/dx tan(x):', ans:'sec^2(x)', topicId:'m4' },
  { id:'jmm2', exam:'jee-main', subject:'Mathematics', year:2023, level:'medium', highProb:true, q:'∫ e^x dx from 0 to 1:', ans:'e - 1 ~ 1.718', topicId:'m5' },
  { id:'jmm3', exam:'jee-main', subject:'Mathematics', year:2024, level:'hard', q:'y"+2y+y=0 solution:', ans:'y=(A+Bx)e^(-x)', topicId:'m4' },
  { id:'jmm4', exam:'jee-main', subject:'Mathematics', year:2024, level:'medium', repeated:true, q:'Det [[2,3],[4,5]]:', ans:'-2', topicId:'m5' },
  { id:'jmm5', exam:'jee-main', subject:'Mathematics', year:2023, level:'easy', q:'Dist (1,2) to 3x+4y-5=0:', ans:'1.2', topicId:'m6' },
  { id:'jmm6', exam:'jee-main', subject:'Mathematics', year:2023, level:'hard', highProb:true, q:'P(A AND B) independent:', ans:'P(A)*P(B)', topicId:'m4' },
  { id:'jmm7', exam:'jee-main', subject:'Mathematics', year:2024, level:'medium', q:'Sum 1+0.5+0.25+...:', ans:'2', topicId:'m3' },
  { id:'jmm8', exam:'jee-main', subject:'Mathematics', year:2023, level:'easy', repeated:true, highProb:true, q:'cos2(x)+sin2(x):', ans:'1', topicId:'m4' },
  { id:'jmm9', exam:'jee-main', subject:'Mathematics', year:2024, level:'hard', q:'(cos θ+i sin θ)^n:', ans:'cos(nθ)+i sin(nθ)', topicId:'m6' },
  { id:'jmm10', exam:'jee-main', subject:'Mathematics', year:2023, level:'medium', q:'A x B is:', ans:'Perp to both, magnitude |A||B|sin(θ)', topicId:'m7' },

  // NEET Physics (15)
  { id:'nep1', exam:'neet-ug', subject:'Physics', year:2023, level:'easy', repeated:true, q:'g on Earth:', ans:'9.8 m/s2', topicId:'p1' },
  { id:'nep2', exam:'neet-ug', subject:'Physics', year:2023, level:'medium', highProb:true, q:'Projectile horiz/vert independent:', ans:'No horiz force', topicId:'p1' },
  { id:'nep3', exam:'neet-ug', subject:'Physics', year:2024, level:'hard', q:'P in fluids P=ρgh:', ans:'P increases with depth', topicId:'p1' },
  { id:'nep4', exam:'neet-ug', subject:'Physics', year:2024, level:'easy', repeated:true, q:'Heat transfer (3 types):', ans:'Conduction, convection, radiation', topicId:'p2' },
  { id:'nep5', exam:'neet-ug', subject:'Physics', year:2023, level:'medium', q:'First law W=0:', ans:'ΔU = Q', topicId:'p2' },
  { id:'nep6', exam:'neet-ug', subject:'Physics', year:2023, level:'hard', q:'Entropy ΔS>0:', ans:'Irreversible process', topicId:'p2' },
  { id:'nep7', exam:'neet-ug', subject:'Physics', year:2024, level:'easy', repeated:true, highProb:true, q:'Coulomb F=kq1q2/r2. r doubles:', ans:'F becomes 1/4', topicId:'p3' },
  { id:'nep8', exam:'neet-ug', subject:'Physics', year:2023, level:'medium', q:'E-field E=kq/r2:', ans:'Direction away +q, toward -q', topicId:'p3' },
  { id:'nep9', exam:'neet-ug', subject:'Physics', year:2024, level:'hard', q:'V = W/q. E=:', ans:'-dV/dr', topicId:'p3' },
  { id:'nep10', exam:'neet-ug', subject:'Physics', year:2023, level:'easy', repeated:true, q:'Ohm V=IR. R doubles V const:', ans:'I becomes 1/2', topicId:'p3' },
  { id:'nep11', exam:'neet-ug', subject:'Physics', year:2024, level:'medium', q:'Series R:', ans:'R_total = R1+R2+...', topicId:'p3' },
  { id:'nep12', exam:'neet-ug', subject:'Physics', year:2023, level:'hard', q:'F=qvB sin(θ). No force:', ans:'θ=0 (parallel)', topicId:'p3' },
  { id:'nep13', exam:'neet-ug', subject:'Physics', year:2024, level:'easy', repeated:true, q:'Speed of light c:', ans:'3x10^8 m/s', topicId:'p4' },
  { id:'nep14', exam:'neet-ug', subject:'Physics', year:2023, level:'medium', highProb:true, q:'Snell: light in denser:', ans:'θ2 < θ1', topicId:'p4' },
  { id:'nep15', exam:'neet-ug', subject:'Physics', year:2024, level:'hard', q:'Diverging lens f:', ans:'Negative', topicId:'p4' },

  // NEET Chemistry (15)
  { id:'nec1', exam:'neet-ug', subject:'Chemistry', year:2023, level:'easy', repeated:true, q:'Atomic number C:', ans:'6 protons', topicId:'c1' },
  { id:'nec2', exam:'neet-ug', subject:'Chemistry', year:2023, level:'medium', q:'O (Z=8) config:', ans:'1s2 2s2 2p4', topicId:'c1' },
  { id:'nec3', exam:'neet-ug', subject:'Chemistry', year:2024, level:'hard', q:'Quantum numbers n,l,ml,ms:', ans:'n=1,2..; l=0 to n-1; ml=-l to l; ±0.5', topicId:'c1' },
  { id:'nec4', exam:'neet-ug', subject:'Chemistry', year:2024, level:'easy', repeated:true, q:'Ionic bond:', ans:'Metal to nonmetal transfer', topicId:'c2' },
  { id:'nec5', exam:'neet-ug', subject:'Chemistry', year:2023, level:'medium', highProb:true, q:'Most polar bond:', ans:'O-H in H2O', topicId:'c2' },
  { id:'nec6', exam:'neet-ug', subject:'Chemistry', year:2024, level:'hard', q:'H-bond strength order:', ans:'F-H >> O-H > N-H', topicId:'c2' },
  { id:'nec7', exam:'neet-ug', subject:'Chemistry', year:2023, level:'easy', q:'Melting point ice:', ans:'0C', topicId:'c3' },
  { id:'nec8', exam:'neet-ug', subject:'Chemistry', year:2024, level:'medium', highProb:true, q:'Henry law:', ans:'Gas solubility proportional to P', topicId:'c3' },
  { id:'nec9', exam:'neet-ug', subject:'Chemistry', year:2023, level:'hard', q:'Osmotic π. Conc doubles:', ans:'π doubles', topicId:'c5' },
  { id:'nec10', exam:'neet-ug', subject:'Chemistry', year:2024, level:'easy', repeated:true, highProb:true, q:'Oxidation is:', ans:'Loss of electrons', topicId:'c6' },
  { id:'nec11', exam:'neet-ug', subject:'Chemistry', year:2023, level:'medium', q:'Redox balancing:', ans:'Half-reactions or O-H method', topicId:'c6' },
  { id:'nec12', exam:'neet-ug', subject:'Chemistry', year:2024, level:'hard', q:'Anode vs cathode:', ans:'Anode oxidized (-), Cathode reduced (+)', topicId:'c6' },
  { id:'nec13', exam:'neet-ug', subject:'Chemistry', year:2023, level:'easy', repeated:true, q:'Alkane formula:', ans:'CnH(2n+2)', topicId:'c7' },
  { id:'nec14', exam:'neet-ug', subject:'Chemistry', year:2024, level:'medium', q:'Ethanol group:', ans:'-OH', topicId:'c7' },
  { id:'nec15', exam:'neet-ug', subject:'Chemistry', year:2023, level:'hard', highProb:true, q:'Esterification catalyst:', ans:'Conc H2SO4', topicId:'c7' },

  // NEET Biology (15)
  { id:'neb1', exam:'neet-ug', subject:'Biology', year:2023, level:'easy', repeated:true, highProb:true, q:'Prokaryotic lacks:', ans:'Membrane-bound nucleus & organelles', topicId:'b1' },
  { id:'neb2', exam:'neet-ug', subject:'Biology', year:2024, level:'medium', q:'Endosymbiotic: evidence:', ans:'Own DNA, 70S ribosomes, double membrane', topicId:'b1' },
  { id:'neb3', exam:'neet-ug', subject:'Biology', year:2023, level:'hard', q:'Fluid mosaic model:', ans:'Flexible bilayer + proteins', topicId:'b1' },
  { id:'neb4', exam:'neet-ug', subject:'Biology', year:2024, level:'easy', repeated:true, highProb:true, q:'DNA unit:', ans:'Nucleotide', topicId:'b2' },
  { id:'neb5', exam:'neet-ug', subject:'Biology', year:2023, level:'medium', q:'Base pairing A-T, G-C:', ans:'2 & 3 bonds', topicId:'b2' },
  { id:'neb6', exam:'neet-ug', subject:'Biology', year:2024, level:'hard', q:'Mendel laws (3):', ans:'Segregation, independent assort, dominance', topicId:'b2' },
  { id:'neb7', exam:'neet-ug', subject:'Biology', year:2023, level:'easy', repeated:true, highProb:true, q:'Photosynthesis location:', ans:'Chloroplast', topicId:'b3' },
  { id:'neb8', exam:'neet-ug', subject:'Biology', year:2024, level:'medium', q:'Light reactions produce:', ans:'ATP & NADPH, O2', topicId:'b3' },
  { id:'neb9', exam:'neet-ug', subject:'Biology', year:2023, level:'hard', q:'Water transport against gravity:', ans:'Transpiration-cohesion-tension', topicId:'b3' },
  { id:'neb10', exam:'neet-ug', subject:'Biology', year:2024, level:'easy', q:'Carb digestion begins:', ans:'Mouth (amylase)', topicId:'b4' },
  { id:'neb11', exam:'neet-ug', subject:'Biology', year:2023, level:'medium', highProb:true, q:'Circulation: pulm vs sys:', ans:'Lungs vs body tissues', topicId:'b4' },
  { id:'neb12', exam:'neet-ug', subject:'Biology', year:2024, level:'hard', q:'Innate vs adaptive immunity:', ans:'Immediate/specific vs slow/specific', topicId:'b4' },
  { id:'neb13', exam:'neet-ug', subject:'Biology', year:2023, level:'easy', q:'Population:', ans:'Same species in area', topicId:'b5' },
  { id:'neb14', exam:'neet-ug', subject:'Biology', year:2024, level:'medium', q:'Carrying capacity K:', ans:'Max pop size', topicId:'b5' },
  { id:'neb15', exam:'neet-ug', subject:'Biology', year:2023, level:'hard', q:'Biodiversity criteria:', ans:'High endemic, threatened, distinct', topicId:'b5' },
]

// ── Chapter quick summaries ─────────────────────────────────────────
const CHAPTER_SUMMARIES = {
  'jee-main': {
    'Physics': {
      p1: { summary:'Mechanics is the foundation of all physics. Covers equations of motion, Newton\'s laws, friction, work-energy theorem, conservation of momentum and rotational motion.', formulas:['v = u + at','s = ut + ½at²','F = ma','KE = ½mv²','p = mv','τ = Iα'], tips:['At 45° launch angle, range is maximum','Normal force N = mg·cosθ on an incline','Angular momentum is conserved when net torque = 0'] },
      p2: { summary:'Thermodynamics deals with heat, temperature, and energy conversion. Covers laws of thermodynamics, heat engines, entropy, and ideal gas behaviour.', formulas:['ΔU = Q – W','PV = nRT','η_Carnot = 1 – T_c/T_h','Q = mcΔT'], tips:['Isothermal: ΔU = 0 → Q = W','Adiabatic: Q = 0 → ΔU = –W','Cp – Cv = R for ideal gas'] },
      p3: { summary:'Electricity & Magnetism covers charge, fields, circuits, and electromagnetic induction. One of the heaviest-weightage topics in JEE.', formulas:['F = kq₁q₂/r²','E = kq/r²','V = kq/r','V = IR','P = V²/R','ε = –dΦ/dt'], tips:['Electric field is zero inside a conductor','Series resistors add directly, parallel: 1/R_eff = Σ1/Rᵢ','EMF = Bvl for a rod moving in a field'] },
      p4: { summary:'Optics covers reflection, refraction, wave optics (interference, diffraction) and modern physics (photoelectric effect, atomic models).', formulas:['n₁sinθ₁ = n₂sinθ₂','1/v – 1/u = 1/f','E = hf','λ = h/p','E_n = –13.6/n² eV'], tips:['TIR: light goes from denser to rarer, angle > critical angle','Fringe width β = λD/d in double slit','Photoelectric stopping potential depends only on frequency'] },
    },
    'Chemistry': {
      c1: { summary:'Atomic structure covers Bohr model, quantum numbers, electron configuration and periodic trends.', formulas:['E_n = –13.6/n² eV','r_n = 0.529n² Å','λ = h/mv'], tips:['Aufbau, Hund, Pauli govern electron filling','Electronegativity increases across a period, decreases down a group','Ionisation energy ∝ Zeff/atomic radius'] },
      c2: { summary:'Chemical bonding includes ionic, covalent bonds, VSEPR theory for geometry, hybridisation and molecular orbital theory.', formulas:['Bond order = ½(Nb – Na)'], tips:['sp→linear, sp²→trigonal planar, sp³→tetrahedral','Lone pairs repel more than bond pairs (VSEPR)','MO theory: O₂ is paramagnetic'] },
      c3: { summary:'States of matter covers ideal and real gases, van der Waals equation, liquids, and solution properties.', formulas:['PV = nRT','(P + an²/V²)(V – nb) = nRT','π = iCRT'], tips:['At STP: 1 mole ideal gas = 22.4 L','van der Waals correction: a = intermolecular attraction, b = volume','Colligative properties depend on number of solute particles, not identity'] },
      c4: { summary:'Redox & electrochemistry covers oxidation states, balancing redox equations, galvanic cells and electrolysis.', formulas:['E°_cell = E°_cathode – E°_anode','ΔG° = –nFE°','E = E° – (RT/nF)ln Q'], tips:['Oxidation = loss of electrons (OIL)','Reduction = gain of electrons (RIG)','Higher SRP = better oxidising agent'] },
      c5: { summary:'Coordination chemistry covers ligands, IUPAC naming, crystal field theory and magnetic properties.', formulas:['CFSE for octahedral high spin: –0.4Δo','CFSE for tetrahedral: –0.6Δt'], tips:['Strong field ligands: CN⁻ > en > NH₃ > H₂O > F⁻','Colour due to d-d electron transition','Spectrochemical series must be memorised'] },
      c6: { summary:'Organic chemistry basics: IUPAC naming, functional groups, isomerism and fundamental reaction mechanisms.', formulas:['EAS on benzene: electrophile + benzene ring'], tips:['Electron-withdrawing groups deactivate benzene ring','SN2 proceeds with inversion, SN1 with racemisation','Markovnikov: H adds to the more substituted carbon'] },
    },
    'Mathematics': {
      m1: { summary:'Functions, domain/range, types of functions, composite and inverse functions — foundational for calculus.', formulas:['f(g(x)) = composite','(f⁻¹)\'(x) = 1/f\'(f⁻¹(x))'], tips:['Domain: values where function is defined','Inverse: swap x & y then solve for y','For f(f⁻¹(x)) = x, function must be bijective'] },
      m2: { summary:'Quadratic equations: roots, discriminant, Vieta\'s formulas, inequalities and graphs.', formulas:['x = (–b ± √(b²–4ac)) / 2a','α+β = –b/a','αβ = c/a'], tips:['Δ > 0: two real roots; Δ = 0: one root; Δ < 0: complex roots','If a > 0, parabola opens up (minimum at vertex)','For real and equal roots: b² = 4ac'] },
      m3: { summary:'Sequences and Series: Arithmetic progression, Geometric progression, and their sums.', formulas:['S_n AP = n/2·(2a+(n–1)d)','S_n GP = a(rⁿ–1)/(r–1)','S∞ GP = a/(1–r), |r| < 1'], tips:['For AM ≥ GM: (a+b)/2 ≥ √(ab)','Telescoping sums simplify by cancellation','Sum of first n naturals = n(n+1)/2'] },
      m4: { summary:'Calculus — differentiation: limits, continuity, chain rule, product rule and applications to maxima/minima.', formulas:['d/dx(xⁿ) = nxⁿ⁻¹','d/dx(sin x) = cos x','Quotient rule: (u/v)\' = (u\'v – uv\')/v²'], tips:['L\'Hôpital for 0/0 and ∞/∞ forms','Critical point: f\'(x) = 0 or undefined','f\'\'(c) > 0 → local min; f\'\'(c) < 0 → local max'] },
      m5: { summary:'Integration: indefinite and definite integrals, substitution, by parts, and area under curves.', formulas:['∫xⁿ dx = xⁿ⁺¹/(n+1)+C','∫sin x dx = –cos x+C','∫u dv = uv – ∫v du'], tips:['∫₀^π sin x dx = 2','Area between curves = ∫|f(x)–g(x)| dx','Definite integral gives signed area'] },
      m6: { summary:'Coordinate geometry: straight lines, circles, parabola, ellipse and hyperbola.', formulas:['Distance = √((x₂–x₁)²+(y₂–y₁)²)','Circle: (x–h)²+(y–k)² = r²','Parabola y² = 4ax: focus (a,0)'], tips:['Slope of perpendicular lines: m₁·m₂ = –1','Standard form circle: x²+y²+2gx+2fy+c = 0, centre (–g,–f) radius √(g²+f²–c)','Eccentricity: ellipse e < 1, hyperbola e > 1'] },
      m7: { summary:'3D geometry and vectors: position vectors, dot & cross products, lines and planes in 3D.', formulas:['a·b = |a||b|cosθ','|a×b| = |a||b|sinθ','Equation of plane: ax+by+cz = d'], tips:['Cross product gives a vector perpendicular to both','Triple scalar product = 0 if vectors coplanar','Distance from point to plane = |ax₀+by₀+cz₀–d|/√(a²+b²+c²)'] },
    },
  },
  'jee-adv': {
    'Physics': {
      p1: { summary:'Advanced mechanics covering rigid body dynamics, SHM and gravitation at JEE Advanced depth.', formulas:['I = Σmr²','τ = Iα','T = 2π√(m/k)','g = GM/R²'], tips:['Parallel axis theorem: I = I_cm + md²','For SHM: v_max = Aω at mean position','Gravitational PE = –GMm/r (always negative)'] },
      p2: { summary:'Waves and sound: transverse and longitudinal waves, standing waves, beats and Doppler effect.', formulas:['v = fλ','v_sound = √(γP/ρ)','f_observed = f·(v±v_o)/(v∓v_s)'], tips:['Beats per second = |f₁ – f₂|','In standing waves: nodes have zero displacement, antinodes have max displacement','Intensity ∝ A²'] },
      p3: { summary:'Advanced thermodynamics: entropy, Gibbs energy, and multi-step processes.', formulas:['ΔS = Q_rev/T','G = H – TS','Cp – Cv = R'], tips:['ΔG < 0: spontaneous; ΔG > 0: non-spontaneous','Entropy increases in irreversible processes','Carnot: most efficient reversible cycle between two temperatures'] },
      p4: { summary:'Electromagnetism: Maxwell equations, EM waves, Faraday\'s law and LC circuits.', formulas:['EMF = –dΦ/dt','c = 1/√(ε₀μ₀)','ω₀ = 1/√(LC)'], tips:['Lenz\'s law: induced current opposes change in flux','Displacement current ε₀·dΦ_E/dt fills gap in Ampere\'s law','EM waves are transverse; E × B gives direction of propagation'] },
      p5: { summary:'Modern physics: photoelectric effect, de Broglie wavelength, nuclear reactions, radioactivity.', formulas:['E = hf','λ = h/p','ΔE = Δmc²','N = N₀e^(–λt)'], tips:['Higher frequency → higher energy photon, not more photons (intensity does that)','Binding energy per nucleon peaks at Fe-56','In β⁻ decay: n → p + e⁻ + ν̄_e'] },
    },
    'Chemistry': {
      c1: { summary:'Thermochemistry, Hess\'s law and reaction kinetics at advanced level.', formulas:['ΔH_rxn = ΣΔH_f(products) – ΣΔH_f(reactants)','k = Ae^(–Ea/RT)','t₁/₂ = 0.693/k (1st order)'], tips:['Hess\'s law: ΔH is path-independent (state function)','Activation energy from Arrhenius: ln(k₂/k₁) = Ea/R·(1/T₁ – 1/T₂)','Rate = k[A]^m[B]^n where m, n from experiment only'] },
      c2: { summary:'Advanced equilibrium: Kp, Kc, Le Chatelier, ionic equilibria, buffer solutions.', formulas:['Kp = Kc(RT)^Δn','pH = pKa + log([A⁻]/[HA])','Kw = Ka × Kb = 10⁻¹⁴'], tips:['Kp = Kc only when Δn(gas) = 0','Buffer: weak acid + its conjugate base (Henderson-Hasselbalch)','Common ion effect suppresses ionisation'] },
      c3: { summary:'Advanced organic: reaction mechanisms, stereochemistry, name reactions.', formulas:['Aldol: RCHO + CH₃COR → β-hydroxy carbonyl'], tips:['SN2: bimolecular, backside attack, inversion','SN1: two steps, carbocation intermediate, racemisation','Zaitsev product: more substituted (stable) alkene preferred'] },
      c4: { summary:'Extraction and properties of metals (metallurgy) and non-metal chemistry.', formulas:['2Al + Fe₂O₃ → Al₂O₃ + 2Fe (Thermite)'], tips:['Bayer → alumina; Hall-Heroult → Al metal electrolysis','Down\'s process: molten NaCl electrolysis → Na metal','Froth flotation for sulphide ores; gravity separation for heavy ores'] },
      c5: { summary:'Qualitative analysis: identification of cations and anions by reagent tests.', formulas:[], tips:['Lime water milky → CO₂ present','Brown ring test → NO₃⁻','AgNO₃: white ppt → Cl⁻, yellow → I⁻, pale yellow → Br⁻','Nessler\'s reagent: brown ppt → NH₄⁺'] },
    },
    'Mathematics': {
      m1: { summary:'Advanced limits using L\'Hôpital, derivatives applications: maxima/minima, Rolle\'s, MVT.', formulas:['lim(x→0) sin x/x = 1','lim(x→0) (eˣ–1)/x = 1','f\'(c) = 0 → critical point'], tips:['L\'Hôpital only for 0/0 or ∞/∞; differentiate numerator and denominator separately','Rolle\'s: f(a)=f(b), f differentiable → ∃c: f\'(c)=0','Mean value theorem: f\'(c) = [f(b)–f(a)]/(b–a)'] },
      m2: { summary:'Advanced integration: complex substitutions, integration by parts, reduction formulae.', formulas:['∫eˣ(f(x)+f\'(x))dx = eˣf(x)+C','∫sin^n x dx (reduction formula)'], tips:['ILATE rule for integration by parts: Inverse, Log, Algebraic, Trig, Exponential','Definite integrals: ∫₋a^a odd(x)dx = 0, even(x)dx = 2∫₀^a','King property: ∫_a^b f(x)dx = ∫_a^b f(a+b–x)dx'] },
      m3: { summary:'Differential equations: separable, linear first-order, second-order with constant coefficients.', formulas:['IF = e^∫P(x)dx','y = e^(mx): characteristic eq am²+bm+c = 0'], tips:['Separable: dy/g(y) = f(x)dx, integrate both sides','Integrating factor converts linear ODE to exact','Repeated roots: solution is (A+Bx)e^(mx)'] },
      m4: { summary:'Probability and statistics: conditional probability, Bayes\' theorem, distributions.', formulas:['P(A|B) = P(A∩B)/P(B)','P(A∩B) = P(A)·P(B) if independent','E[X] = Σx·P(x)'], tips:['Mutually exclusive: P(A∩B) = 0','Bayes\': P(Aᵢ|B) = P(B|Aᵢ)P(Aᵢ) / ΣP(B|Aⱼ)P(Aⱼ)','Binomial: mean = np, variance = npq'] },
      m5: { summary:'Matrices and determinants: operations, rank, inverse, system of equations.', formulas:['det(AB) = det(A)·det(B)','A⁻¹ = adj(A)/det(A)','Rank-Nullity theorem'], tips:['det = 0 → singular (no inverse, dependent system)','Cramer\'s rule: Xᵢ = det(Aᵢ)/det(A)','For orthogonal matrix: Q^T = Q^(–1)'] },
      m6: { summary:'Complex numbers: polar form, argument, De Moivre\'s theorem, nth roots of unity.', formulas:['|z| = √(a²+b²)','z = r(cosθ + i sinθ) = re^(iθ)','(cosθ+i sinθ)ⁿ = cos(nθ)+i sin(nθ)'], tips:['Roots of unity: ω = e^(2πi/n), equally spaced on unit circle','1 + ω + ω² = 0 for cube roots of unity','|z₁·z₂| = |z₁|·|z₂|, arg(z₁z₂) = arg(z₁)+arg(z₂)'] },
    },
  },
  'neet-ug': {
    'Physics': {
      p1: { summary:'Mechanics for NEET: motion in 1D and 2D, Newton\'s laws, friction, work, energy, power, fluids.', formulas:['v² = u² + 2as','F = ma','W = Fs cosθ','P = ρgh'], tips:['Buoyancy = weight of fluid displaced (Archimedes principle)','Bernoulli: P + ½ρv² + ρgh = constant','Terminal velocity: weight = drag + buoyancy'] },
      p2: { summary:'Heat and thermodynamics: thermal properties, heat transfer (conduction, convection, radiation) and laws of thermodynamics for NEET.', formulas:['Q = mcΔT','Stefan: P = σAT⁴','ΔU = Q–W'], tips:['Stefan-Boltzmann for radiation; Wien\'s law: λ_max·T = constant','Latent heat: Q = mL (no temperature change)','Greenhouse effect: IR radiation re-absorbed by atmosphere'] },
      p3: { summary:'Electricity and magnetism: Coulomb\'s law, Ohm\'s law, circuits, magnetic force, electromagnetic induction.', formulas:['F = kq₁q₂/r²','V = IR','F = qvBsinθ','EMF = Bvl'], tips:['Power P = V²/R = I²R','Resistivity depends on material and temperature','Solenoid: B = μ₀nI'] },
      p4: { summary:'Optics: refraction, lenses, mirrors and optical instruments (microscope, telescope).', formulas:['1/v – 1/u = 1/f','n = c/v','Snell: n₁sinθ₁ = n₂sinθ₂'], tips:['Convex lens: real image for object beyond F, virtual for object inside F','Critical angle: sinθ_c = 1/n (for glass-air)','Power of lens P = 1/f (f in metres); unit dioptre'] },
      p5: { summary:'Modern physics for NEET: atomic structure, Bohr model, radioactivity, X-rays.', formulas:['E = hf','E_n = –13.6/n² eV','ΔN/Δt = –λN'], tips:['α decay: mass number –4, atomic number –2','β decay: atomic number ±1, mass number unchanged','Half-life t₁/₂ = 0.693/λ'] },
    },
    'Chemistry': {
      c1: { summary:'Atomic structure, quantum mechanical model, electronic configuration and periodic trends.', formulas:['En = –13.6/n² eV for H-like','λ = h/mv'], tips:['Hund\'s rule: maximum multiplicity in degenerate orbitals','Pauli: no two electrons have all four same quantum numbers','Electronegativity: F > O > N > Cl'] },
      c2: { summary:'Chemical bonding: ionic, covalent, coordinate bonds; VSEPR geometry; hydrogen bonding.', formulas:['Formal charge = V – L – B/2'], tips:['H-bond strength: F-H > O-H > N-H','Resonance structures are averaged; benzene is stable','Polarity: asymmetric charge distribution → dipole moment'] },
      c3: { summary:'States of matter: kinetic theory of gases, gas laws, intermolecular forces.', formulas:['PV = nRT','KE_avg = (3/2)kBT'], tips:['Real gases deviate at high pressure and low temperature','Lower vapour pressure → higher boiling point (stronger IMF)','Graham\'s law: rate of diffusion ∝ 1/√M'] },
      c4: { summary:'Thermodynamics: enthalpy, entropy, Gibbs free energy, Hess\'s law.', formulas:['ΔG = ΔH – TΔS','ΔG° = –RT ln K'], tips:['Exothermic: ΔH < 0; Endothermic: ΔH > 0','Spontaneous: ΔG < 0','ΔG = 0 at equilibrium'] },
      c5: { summary:'Solutions: concentration, colligative properties, Van\'t Hoff factor.', formulas:['π = iMRT','ΔTb = iKbm','ΔTf = iKfm'], tips:['Molality (m) used for colligative properties (temperature-independent)','Van\'t Hoff factor i > 1 for dissociation (electrolytes)','Reverse osmosis: applied pressure > osmotic pressure'] },
      c6: { summary:'Redox reactions: oxidation states, balancing, galvanic and electrolytic cells.', formulas:['E°_cell = E°_cathode – E°_anode'], tips:['OIL RIG: Oxidation Is Loss, Reduction Is Gain','Balance redox by half-reaction method in acidic/basic medium','Electrolysis: W = Zit (Faraday\'s law)'] },
      c7: { summary:'Organic chemistry: IUPAC nomenclature, functional groups, reactions and mechanisms for NEET.', formulas:['CnH(2n+2) for alkanes'], tips:['Markovnikov addition: H adds to C with more H','Esterification: acid + alcohol → ester + water (conc. H₂SO₄ catalyst)','Fehling\'s and Tollens\' test: distinguish aldehyde from ketone'] },
    },
    'Biology': {
      b1: { summary:'Cell biology: prokaryotic vs eukaryotic cells, organelles, cell membrane (fluid mosaic model), cell division.', formulas:[], tips:['Mitochondria and chloroplasts have own DNA → endosymbiotic theory','Smooth ER: lipid synthesis; Rough ER: protein synthesis','Gap junctions in animals; Plasmodesmata in plants'] },
      b2: { summary:'Genetics: Mendel\'s laws, chromosomal theory, DNA structure, replication and gene expression.', formulas:[], tips:['Mendel\'s law of segregation: alleles separate during gamete formation','Incomplete dominance: F1 is intermediate phenotype','Central dogma: DNA → RNA → Protein'] },
      b3: { summary:'Plant physiology: photosynthesis (light and dark reactions), respiration, transpiration, plant hormones.', formulas:['6CO₂+6H₂O → C₆H₁₂O₆+6O₂'], tips:['Light reactions in thylakoid membrane: ATP + NADPH produced','Calvin cycle in stroma: CO₂ fixation by RuBisCO','C4 plants (sugarcane) more efficient in hot climates; CAM plants open stomata at night'] },
      b4: { summary:'Animal physiology: digestion, circulation, respiration, excretion, nervous system, endocrine system.', formulas:[], tips:['SA node is the pacemaker of the heart','Haemoglobin binds O₂ cooperatively (sigmoid curve)','Nephron: filtration (Bowman\'s), reabsorption (PCT, loop), secretion (DCT)'] },
      b5: { summary:'Ecology: populations, communities, ecosystems, food chains, energy flow and biodiversity.', formulas:['GPP – R = NPP','Ecological efficiency ≈ 10%'], tips:['10% law: only 10% energy transfers to next trophic level','r-strategists: many small offspring; K-strategists: few large offspring','Biodiversity hotspot: high endemic + high threat'] },
      b6: { summary:'Human health: immunity, diseases, vaccines, addiction and cancer basics for NEET.', formulas:[], tips:['B-cells produce antibodies; T-cells mediate cellular immunity','Active immunity lasts long; passive immunity is temporary','ELISA test detects antigen-antibody reaction'] },
    },
  },
}

const getDaysLeft = (dateStr) => {
  const exam = new Date(dateStr)
  const today = new Date()
  return Math.max(0, Math.ceil((exam - today) / 86400000))
}

const buildOfflineNotes = ({ examId, subject, chapterName, topics }) => {
  const header = `Quick Revision Notes: ${chapterName}`
  const intro = `Exam: ${examId || 'Entrance Prep'} | Subject: ${subject || 'General'}`
  const topicLines = (topics || []).map((t, i) => `${i + 1}. ${t}`).join('\n')
  return [
    header,
    intro,
    '',
    'Core concepts to focus on:',
    topicLines || '1. Definitions\n2. Core formulas\n3. Common exam traps',
    '',
    'How to study this chapter effectively:',
    '1. Start from definitions and units.',
    '2. Memorize 3-5 high-frequency formulas/reactions.',
    '3. Solve previous-year questions by topic.',
    '4. Re-attempt wrong questions after 24 hours.',
    '',
    'Exam strategy:',
    '- Attempt direct/factual questions first.',
    '- Mark calculation-heavy ones for second pass.',
    '- Keep a short error log and revise it daily.',
  ].join('\n')
}

const buildOfflineDoubtAnswer = ({ doubtText, subject, examId }) => {
  return [
    `I could not reach the AI server right now, so here is a quick guided approach for ${subject || 'this topic'} (${examId || 'entrance prep'}):`,
    '',
    `Doubt: ${doubtText}`,
    '',
    'Step 1: Identify the chapter and exact concept used in this question.',
    'Step 2: Write all given data, symbols, and units clearly.',
    'Step 3: Pick the governing formula/principle before substituting values.',
    'Step 4: Solve line-by-line and check dimensional/unit consistency.',
    'Step 5: Validate the final answer with option elimination and sanity checks.',
    '',
    'If you share the full question statement, I can provide a strict stepwise solution.',
  ].join('\n')
}

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

export default function SeniorPrepPanel({ token }) {
  const { token: authToken } = useAuth()
  const effectiveToken = token || authToken

  const [profile, setProfile] = useState(() => safeParse(localStorage.getItem(LS_ENTRANCE_PROFILE), null))
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedChapter, setSelectedChapter] = useState(null)
  const [progress, setProgress] = useState(() => safeParse(localStorage.getItem(LS_ENTRANCE_PROGRESS), {}))
  const [bookmarks, setBookmarks] = useState(() => safeParse(localStorage.getItem(LS_ENTRANCE_BOOKMARKS), []))
  // ── New filter & tracking state ──
  const [diffFilter, setDiffFilter] = useState('all')
  const [pyqYearFilter, setPyqYearFilter] = useState('all')
  const [pyqLevelFilter, setPyqLevelFilter] = useState('all')
  const [pyqFlags, setPyqFlags] = useState({ repeated: false, highProb: false })
  const [revisionMode, setRevisionMode] = useState(false)
  const [wrongQuestions, setWrongQuestions] = useState(() => safeParse(localStorage.getItem('arthavi_wrong_qs'), []))
  const [dailyStats, setDailyStats] = useState(() => {
    const today = new Date().toISOString().slice(0, 10)
    const saved = safeParse(localStorage.getItem('arthavi_daily'), null)
    return (saved?.date === today) ? saved : { date: today, mcq: 0, pyq: 0 }
  })

  const [doubt, setDoubt] = useState('')
  const [doubtResponse, setDoubtResponse] = useState(null)
  const [loadingDoubt, setLoadingDoubt] = useState(false)
  const [doubtError, setDoubtError] = useState(null)
  const [notes, setNotes] = useState({})
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [notesError, setNotesError] = useState(null)
  const [revealedPYQs, setRevealedPYQs] = useState({})
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [generatedMCQs, setGeneratedMCQs] = useState(() => safeParse(localStorage.getItem('arthavi_gen_mcq'), {}))
  const [generatedPYQs, setGeneratedPYQs] = useState(() => safeParse(localStorage.getItem('arthavi_gen_pyq'), {}))
  const [loadingGenMCQ, setLoadingGenMCQ] = useState(false)
  const [loadingGenPYQ, setLoadingGenPYQ] = useState(false)
  const [genMCQError, setGenMCQError] = useState(null)
  const [genPYQError, setGenPYQError] = useState(null)

  // Quiz
  const [quizConfig, setQuizConfig] = useState({ count: 10 })
  const [quizMode, setQuizMode] = useState('idle') // 'idle' | 'active' | 'results'
  const [quizQuestions, setQuizQuestions] = useState([])
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizCurrent, setQuizCurrent] = useState(0)

  // ── Derived data ──
  const examData = useMemo(() => EXAMS.find(e => e.id === profile?.examId), [profile?.examId])
  const subjects = useMemo(() => {
    if (!profile?.examId) return []
    const db = SUBJECTS_DB[profile.examId]
    if (!db) return []
    return Object.keys(db).map(subj => ({ name: subj, chapters: db[subj].chapters }))
  }, [profile?.examId])
  const selectedSubjectData = useMemo(() => subjects.find(s => s.name === selectedSubject), [subjects, selectedSubject])

  const chapterMCQs = useMemo(() => {
    if (!selectedChapter) return []
    const genKey = `${profile?.examId}__${selectedSubject}__${selectedChapter}`
    const staticQs = ALL_MCQ_BANK.filter(m => m.exam === profile?.examId && m.subject === selectedSubject && m.chapter === selectedChapter)
    const genQs = generatedMCQs[genKey] || []
    let qs = [...staticQs, ...genQs]
    if (revisionMode) qs = qs.filter(q => wrongQuestions.includes(q.id))
    if (diffFilter !== 'all') qs = qs.filter(q => (q.diff || 'medium') === diffFilter)
    return qs
  }, [profile?.examId, selectedSubject, selectedChapter, diffFilter, revisionMode, wrongQuestions, generatedMCQs])

  const chapterPYQs = useMemo(() => {
    if (!selectedChapter) return []
    const genKey = `${profile?.examId}__${selectedSubject}__${selectedChapter}`
    const staticQs = PYQ_BANK.filter(q => q.exam === profile?.examId && q.subject === selectedSubject && q.topicId === selectedChapter)
    const genQs = generatedPYQs[genKey] || []
    let qs = [...staticQs, ...genQs]
    if (pyqYearFilter !== 'all') qs = qs.filter(q => String(q.year) === pyqYearFilter)
    if (pyqLevelFilter !== 'all') qs = qs.filter(q => q.level === pyqLevelFilter)
    if (pyqFlags.repeated) qs = qs.filter(q => q.repeated)
    if (pyqFlags.highProb) qs = qs.filter(q => q.highProb)
    return qs
  }, [profile?.examId, selectedSubject, selectedChapter, pyqYearFilter, pyqLevelFilter, pyqFlags, generatedPYQs])

  const chapterSummary = useMemo(() =>
    (selectedChapter && selectedSubject && profile?.examId)
      ? (CHAPTER_SUMMARIES[profile.examId]?.[selectedSubject]?.[selectedChapter] || null)
      : null
  , [profile?.examId, selectedSubject, selectedChapter])

  const pyqYears = useMemo(() => {
    const years = [...new Set(
      PYQ_BANK.filter(q => q.exam === profile?.examId && q.subject === selectedSubject).map(q => String(q.year))
    )].sort().reverse()
    return years
  }, [profile?.examId, selectedSubject])

  const getChapterAcc = (chId) => {
    const key = `${profile?.examId}__${selectedSubject}__${chId}`
    const data = progress[key]
    if (!data || !data.total) return null
    return Math.round((data.correct / data.total) * 100)
  }

  const weakChapters = useMemo(() => {
    if (!selectedSubjectData) return []
    return selectedSubjectData.chapters.filter(ch => {
      const acc = getChapterAcc(ch.id)
      return acc !== null && acc < 60
    })
  }, [selectedSubjectData, progress, profile?.examId, selectedSubject])

  // ── Effects ──
  useEffect(() => {
    if (!selectedSubject && subjects.length > 0) setSelectedSubject(subjects[0].name)
  }, [subjects])

  useEffect(() => {
    setSelectedChapter(null)
    setDiffFilter('all')
    setPyqYearFilter('all')
    setPyqLevelFilter('all')
    setPyqFlags({ repeated: false, highProb: false })
    setRevisionMode(false)
    setQuizMode('idle')
    setQuizQuestions([])
  }, [profile?.examId, selectedSubject])

  useEffect(() => {
    setDiffFilter('all')
    setPyqYearFilter('all')
    setPyqLevelFilter('all')
    setPyqFlags({ repeated: false, highProb: false })
    setRevisionMode(false)
    setDoubt('')
    setDoubtResponse(null)
    setDoubtError(null)
    setNotesError(null)
    setRevealedPYQs({})
    if (quizMode !== 'idle') { setQuizMode('idle'); setQuizQuestions([]) }
  }, [selectedChapter])

  useEffect(() => { localStorage.setItem(LS_ENTRANCE_PROGRESS, JSON.stringify(progress)) }, [progress])
  useEffect(() => { localStorage.setItem(LS_ENTRANCE_BOOKMARKS, JSON.stringify(bookmarks)) }, [bookmarks])
  useEffect(() => { localStorage.setItem('arthavi_wrong_qs', JSON.stringify(wrongQuestions)) }, [wrongQuestions])
  useEffect(() => { localStorage.setItem('arthavi_daily', JSON.stringify(dailyStats)) }, [dailyStats])
  useEffect(() => { localStorage.setItem('arthavi_gen_mcq', JSON.stringify(generatedMCQs)) }, [generatedMCQs])
  useEffect(() => { localStorage.setItem('arthavi_gen_pyq', JSON.stringify(generatedPYQs)) }, [generatedPYQs])

  // ── AI helpers ──
  const callAiChat = async (message) => {
    const response = await apiPost('/chat', { message }, effectiveToken)
    if (response?.answer) return response.answer
    if (typeof response === 'string' && response.trim()) return response
    throw new Error('empty ai response')
  }

  const generateNotes = async (chapterId, chapterName) => {
    setLoadingNotes(true)
    setNotesError(null)
    const noteKey = `${selectedSubject}__${chapterId}`
    const chapter = selectedSubjectData?.chapters?.find(c => c.id === chapterId)
    try {
      if (!effectiveToken) {
        setNotes(n => ({ ...n, [noteKey]: buildOfflineNotes({ examId: profile?.examId, subject: selectedSubject, chapterName, topics: chapter?.topics }) }))
        setNotesError('AI server unavailable. Showing offline notes.')
        return
      }
      const message = [
        `Generate comprehensive exam-ready study notes for ${profile?.examId} entrance exam.`,
        `Subject: ${selectedSubject} | Chapter: ${chapterName}`,
        ``,
        `Structure the notes EXACTLY as follows:`,
        ``,
        `## Overview`,
        `2-3 sentences explaining what this chapter is about and why it matters for ${profile?.examId}.`,
        ``,
        `## Core Concepts`,
        `List 4-6 key concepts with a 1-2 line explanation each.`,
        ``,
        `## Key Formulas`,
        `List each important formula on its own line with a clear label, e.g.: v² = u² + 2as (velocity-displacement relation)`,
        ``,
        `## Real-World Examples`,
        `Give 3 concrete, relatable real-world examples that illustrate the main concepts.`,
        `For each: describe the scenario, identify the concept, and show how the formula applies with actual numbers.`,
        `Example format: "A car braking from 60 km/h to 0 in 50 m → uses v²=u²+2as → a = −10 m/s²"`,
        ``,
        `## Solved Example (${profile?.examId} style)`,
        `One complete worked problem with question → given values → step-by-step solution → boxed answer.`,
        ``,
        `## Exam Tips`,
        `5 bullet points: common mistakes, shortcuts, what examiners test most.`,
        ``,
        `Keep the total length 600-800 words. Use plain text, no markdown symbols except ## for headers.`,
      ].join('\n')
      try {
        const answer0 = await callAiChat(message)
        setNotes(n => ({ ...n, [noteKey]: answer0 }))
      } catch {
        const answer = await callAiChat(`${profile?.examId} ${selectedSubject} ${chapterName}: Write study notes with real-world examples, key formulas, and one solved problem.`)
        setNotes(n => ({ ...n, [noteKey]: answer }))
        setNotesError('AI recovered in quick mode.')
      }
    } catch {
      setNotes(n => ({ ...n, [noteKey]: buildOfflineNotes({ examId: profile?.examId, subject: selectedSubject, chapterName, topics: chapter?.topics }) }))
      setNotesError('AI unavailable. Showing offline notes.')
    } finally {
      setLoadingNotes(false)
    }
  }

  // ── Web Speech Audio ──
  const speakNotes = (text) => {
    if (!window.speechSynthesis) return
    // Stop any current playback
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
      setAudioPlaying(false)
      return
    }
    // Strip ## headers to clean symbol before speaking
    const cleanText = text
      .replace(/##\s*/g, '')
      .replace(/[→←↑↓•]/g, ' ')
      .replace(/\*+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = 0.9
    utterance.pitch = 1.05
    utterance.volume = 1
    // Try to pick a natural English voice
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v => v.lang === 'en-IN') ||
      voices.find(v => v.lang.startsWith('en') && v.localService) ||
      voices.find(v => v.lang.startsWith('en'))
    if (preferred) utterance.voice = preferred

    utterance.onstart = () => setAudioPlaying(true)
    utterance.onend = () => setAudioPlaying(false)
    utterance.onerror = () => setAudioPlaying(false)
    window.speechSynthesis.speak(utterance)
  }

  const solveDoubt = async () => {
    if (!doubt.trim()) return
    setLoadingDoubt(true)
    setDoubtError(null)
    const chapter = selectedSubjectData?.chapters?.find(c => c.id === selectedChapter)
    try {
      if (!effectiveToken) {
        setDoubtResponse(buildOfflineDoubtAnswer({ doubtText: doubt, subject: selectedSubject, examId: profile?.examId }))
        setDoubtError('AI unavailable. Showing offline answer.')
        return
      }
      const message = `I have a doubt in ${selectedSubject} (${profile?.examId}), chapter: ${chapter?.name || selectedChapter}. "${doubt}". Explain step-by-step with examples.`
      try {
        setDoubtResponse(await callAiChat(message))
      } catch {
        const answer = await callAiChat(`Solve this ${selectedSubject} doubt concisely: ${doubt}`)
        setDoubtResponse(answer)
        setDoubtError('AI recovered in quick mode.')
      }
    } catch {
      setDoubtResponse(buildOfflineDoubtAnswer({ doubtText: doubt, subject: selectedSubject, examId: profile?.examId }))
      setDoubtError('AI unavailable. Showing offline answer.')
    } finally {
      setLoadingDoubt(false)
    }
  }

  // ── AI Question Generation ──

  // Robust JSON parser — handles direct array, embedded array, and code-fenced JSON
  const parseAIJson = (text) => {
    if (!text) return null
    try { const r = JSON.parse(text.trim()); if (Array.isArray(r)) return r } catch {}
    const arrMatch = text.match(/\[[\s\S]*\]/)
    if (arrMatch) { try { const r = JSON.parse(arrMatch[0]); if (Array.isArray(r)) return r } catch {} }
    const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeMatch) {
      try { const r = JSON.parse(codeMatch[1].trim()); if (Array.isArray(r)) return r } catch {}
      const inner = codeMatch[1].match(/\[[\s\S]*\]/)
      if (inner) { try { const r = JSON.parse(inner[0]); if (Array.isArray(r)) return r } catch {} }
    }
    return null
  }

  // Generate MCQs via AI and return parsed array (does NOT set state)
  const generateMCQsRaw = async (chapterName2, topics2) => {
    const ch2 = selectedSubjectData?.chapters?.find(c => c.id === selectedChapter)
    const name = chapterName2 || ch2?.name || selectedChapter
    const topicStr = topics2?.join(', ') || ch2?.topics?.join(', ') || ''
    const prompt = [
      `Generate 10 MCQ questions for ${profile?.examId} entrance exam, subject: ${selectedSubject}, chapter: "${name}".`,
      topicStr ? `Topics to cover: ${topicStr}.` : '',
      ``,
      `Return ONLY a valid JSON array, absolutely no other text before or after:`,
      `[{"q":"question text","opts":["Option A","Option B","Option C","Option D"],"correct":0,"diff":"easy","exp":"brief explanation"}]`,
      ``,
      `Rules:`,
      `- correct is 0-indexed (0=A, 1=B, 2=C, 3=D)`,
      `- diff must be exactly "easy", "medium", or "hard" — include 3 easy, 4 medium, 3 hard`,
      `- Use real numbers, formulas, and ${profile?.examId} patterns`,
      `- Wrong options should be common student mistakes (good distractors)`,
      `- Keep each question under 35 words`,
    ].filter(Boolean).join('\n')
    const raw = await callAiChat(prompt)
    const parsed = parseAIJson(raw)
    if (!Array.isArray(parsed) || !parsed.length) throw new Error('AI returned invalid JSON')
    const prefix = `gen_${Date.now()}_`
    return parsed
      .filter(q => q && typeof q.q === 'string' && q.q.length > 5)
      .map((q, i) => ({
        id: `${prefix}${i}`,
        exam: profile?.examId,
        subject: selectedSubject,
        chapter: selectedChapter,
        q: String(q.q),
        opts: Array.isArray(q.opts) && q.opts.length >= 4
          ? q.opts.slice(0, 4).map(String)
          : ['Option A', 'Option B', 'Option C', 'Option D'],
        correct: typeof q.correct === 'number' ? Math.max(0, Math.min(3, Math.round(q.correct))) : 0,
        diff: ['easy', 'medium', 'hard'].includes(String(q.diff)) ? String(q.diff) : 'medium',
        exp: String(q.exp || ''),
      }))
  }

  // "Generate More MCQs" button handler — adds to persistent pool
  const generateMoreMCQs = async () => {
    if (!selectedChapter || !effectiveToken) return
    setLoadingGenMCQ(true)
    setGenMCQError(null)
    const ch2 = selectedSubjectData?.chapters?.find(c => c.id === selectedChapter)
    try {
      const newQs = await generateMCQsRaw(ch2?.name, ch2?.topics)
      if (newQs.length > 0) {
        const genKey = `${profile?.examId}__${selectedSubject}__${selectedChapter}`
        setGeneratedMCQs(g => ({ ...g, [genKey]: [...(g[genKey] || []), ...newQs] }))
      }
    } catch (err) {
      setGenMCQError(`Couldn't generate questions: ${err.message}. Try again.`)
    } finally {
      setLoadingGenMCQ(false)
    }
  }

  // "Generate More PYQs" button handler
  const generateMorePYQs = async () => {
    if (!selectedChapter || !effectiveToken) return
    setLoadingGenPYQ(true)
    setGenPYQError(null)
    const ch2 = selectedSubjectData?.chapters?.find(c => c.id === selectedChapter)
    const name = ch2?.name || selectedChapter
    const topicStr = ch2?.topics?.join(', ') || ''
    const prompt = [
      `Generate 10 previous-year-style exam questions for ${profile?.examId} entrance exam, subject: ${selectedSubject}, chapter: "${name}".`,
      topicStr ? `Topics: ${topicStr}.` : '',
      ``,
      `Return ONLY a valid JSON array, no other text:`,
      `[{"q":"question text","ans":"complete step-by-step answer with calculation","level":"medium","year":2023}]`,
      ``,
      `Rules:`,
      `- level must be exactly "easy", "medium", or "hard"`,
      `- year should vary randomly between 2018 and 2024`,
      `- Include actual numbers, constants, and formula application`,
      `- Answer must show complete working steps`,
      `- Make realistic for ${profile?.examId} exam pattern`,
    ].filter(Boolean).join('\n')
    try {
      const raw = await callAiChat(prompt)
      const parsed = parseAIJson(raw)
      if (!Array.isArray(parsed) || !parsed.length) throw new Error('AI returned invalid JSON')
      const prefix = `genpyq_${Date.now()}_`
      const newPYQs = parsed
        .filter(q => q && typeof q.q === 'string' && q.q.length > 5)
        .map((q, i) => ({
          id: `${prefix}${i}`,
          exam: profile?.examId,
          subject: selectedSubject,
          topicId: selectedChapter,
          q: String(q.q),
          ans: String(q.ans || ''),
          level: ['easy', 'medium', 'hard'].includes(String(q.level)) ? String(q.level) : 'medium',
          year: typeof q.year === 'number' ? q.year : 2023,
        }))
      if (newPYQs.length > 0) {
        const genKey = `${profile?.examId}__${selectedSubject}__${selectedChapter}`
        setGeneratedPYQs(g => ({ ...g, [genKey]: [...(g[genKey] || []), ...newPYQs] }))
      }
    } catch (err) {
      setGenPYQError(`Couldn't generate PYQs: ${err.message}. Try again.`)
    } finally {
      setLoadingGenPYQ(false)
    }
  }

  // ── Quiz helpers ──
  const startQuizFromPool = (pool) => {
    if (!pool || !pool.length) return
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const count = Math.min(quizConfig.count, shuffled.length)
    setQuizQuestions(shuffled.slice(0, count))
    setQuizAnswers({})
    setQuizCurrent(0)
    setQuizMode('active')
  }

  const startQuiz = () => startQuizFromPool(chapterMCQs)

  // Endless Practice: generate 10 new MCQs then immediately start quiz
  const handlePracticeMore = async () => {
    setLoadingGenMCQ(true)
    setGenMCQError(null)
    const ch2 = selectedSubjectData?.chapters?.find(c => c.id === selectedChapter)
    let newQs = []
    try {
      newQs = await generateMCQsRaw(ch2?.name, ch2?.topics)
    } catch (err) {
      setGenMCQError(`Generation failed: ${err.message}`)
    }
    setLoadingGenMCQ(false)
    const genKey = `${profile?.examId}__${selectedSubject}__${selectedChapter}`
    if (newQs.length > 0) {
      setGeneratedMCQs(g => ({ ...g, [genKey]: [...(g[genKey] || []), ...newQs] }))
    }
    // Build pool directly — can't wait for React re-render to update memo
    const staticQs = ALL_MCQ_BANK.filter(m => m.exam === profile?.examId && m.subject === selectedSubject && m.chapter === selectedChapter)
    const prevGenQs = generatedMCQs[genKey] || []
    startQuizFromPool([...staticQs, ...prevGenQs, ...newQs])
  }

  const selectAnswer = (qId, optIdx) => setQuizAnswers(prev => ({ ...prev, [qId]: optIdx }))

  const submitQuiz = () => {
    // Update chapter progress
    const chKey = `${profile?.examId}__${selectedSubject}__${selectedChapter}`
    const correct = quizQuestions.filter(q => quizAnswers[q.id] === q.correct).length
    setProgress(p => {
      const existing = p[chKey] || { correct: 0, total: 0 }
      return { ...p, [chKey]: { correct: existing.correct + correct, total: existing.total + quizQuestions.length } }
    })
    // Track wrong questions
    const newWrong = quizQuestions.filter(q => quizAnswers[q.id] !== q.correct).map(q => q.id)
    setWrongQuestions(prev => [...new Set([...prev, ...newWrong])])
    // Daily stats
    setDailyStats(s => ({ ...s, mcq: s.mcq + quizQuestions.length }))
    setQuizMode('results')
  }

  const resetQuiz = () => { setQuizMode('idle'); setQuizQuestions([]); setQuizAnswers({}); setQuizCurrent(0) }

  const toggleBookmark = (qId) => setBookmarks(b => b.includes(qId) ? b.filter(id => id !== qId) : [...b, qId])

  // ── Exam picker screen ──
  if (!profile) {
    return (
      <div style={{ padding:'40px 20px', maxWidth:900, margin:'0 auto', textAlign:'center' }}>
        <h1 style={{ fontSize:32, fontWeight:900, color:C.indigo, marginBottom:8, fontFamily:'var(--serif)' }}>🎯 Entrance Exam Prep</h1>
        <p style={{ fontSize:15, color:C.slate, marginBottom:40 }}>Choose your entrance exam to begin</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:20 }}>
          {EXAMS.map(exam => (
            <div key={exam.id} onClick={() => {
              const p = { examId: exam.id, selectedAt: new Date().toISOString() }
              setProfile(p)
              localStorage.setItem(LS_ENTRANCE_PROFILE, JSON.stringify(p))
            }} style={{
              background:'#fff', border:`2px solid ${exam.color}22`, borderRadius:20, padding:30,
              cursor:'pointer', transition:'.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = exam.color; e.currentTarget.style.transform = 'translateY(-4px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = exam.color+'22'; e.currentTarget.style.transform = 'translateY(0)' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>{exam.icon}</div>
              <h3 style={{ fontSize:20, fontWeight:800, color:exam.color, marginBottom:4 }}>{exam.name}</h3>
              <p style={{ fontSize:12, color:C.slate, marginBottom:16, lineHeight:1.4 }}>{exam.criteria}</p>
              <div style={{ background:exam.color+'10', borderRadius:8, padding:8 }}>
                <p style={{ margin:0, fontSize:11, color:exam.color, fontWeight:600 }}>📅 {exam.date} ({getDaysLeft(exam.date)}d left)</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Quiz active/results overlay ──
  if (quizMode === 'active' || quizMode === 'results') {
    const chapter = selectedSubjectData?.chapters?.find(c => c.id === selectedChapter)

    if (quizMode === 'active') {
      const q = quizQuestions[quizCurrent]
      const answered = quizAnswers[q.id] !== undefined
      const selectedIdx = quizAnswers[q.id]
      const isLast = quizCurrent === quizQuestions.length - 1
      const answeredCount = Object.keys(quizAnswers).length

      return (
        <div style={{ padding:'24px 20px', maxWidth:720, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div>
              <span style={{ fontSize:12, color:C.slate, fontWeight:600 }}>{examData?.name} › {selectedSubject} › {chapter?.name}</span>
              <div style={{ fontSize:14, fontWeight:800, color:C.green, marginTop:2 }}>Question {quizCurrent + 1} / {quizQuestions.length}</div>
            </div>
            <button onClick={resetQuiz} style={{ padding:'6px 12px', borderRadius:8, background:'#fff', border:`1.5px solid ${C.border}`, color:C.slate, fontSize:12, fontWeight:700, cursor:'pointer' }}>✕ Exit Quiz</button>
          </div>
          <div style={{ height:6, background:C.border, borderRadius:3, marginBottom:24 }}>
            <div style={{ height:'100%', background:C.green, borderRadius:3, width:`${((quizCurrent + 1) / quizQuestions.length) * 100}%`, transition:'width .3s' }} />
          </div>
          {q.diff && (
            <span style={{ display:'inline-block', marginBottom:12, padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700,
              background: q.diff === 'easy' ? C.greenBg : q.diff === 'hard' ? C.redBg : C.amberBg,
              color: q.diff === 'easy' ? C.green : q.diff === 'hard' ? C.red : C.amber,
            }}>{q.diff.charAt(0).toUpperCase() + q.diff.slice(1)}</span>
          )}
          <div style={{ background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:16, padding:24, marginBottom:20 }}>
            <p style={{ fontSize:15, fontWeight:700, color:C.slate, margin:'0 0 20px', lineHeight:1.5 }}>{q.q}</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {q.opts.map((opt, i) => {
                let bg = '#fff', borderColor = C.border, color = C.slate
                if (answered) {
                  if (i === q.correct) { bg = C.greenBg; borderColor = C.green; color = C.green }
                  else if (i === selectedIdx) { bg = C.redBg; borderColor = C.red; color = C.red }
                } else if (selectedIdx === i) { bg = C.indigoBg; borderColor = C.indigo; color = C.indigo }
                return (
                  <button key={i} onClick={() => !answered && selectAnswer(q.id, i)} style={{
                    padding:'12px 16px', borderRadius:10, border:`2px solid ${borderColor}`,
                    background: bg, color, fontSize:13, fontWeight:600,
                    cursor: answered ? 'default' : 'pointer', textAlign:'left', transition:'.15s',
                  }}>
                    {String.fromCharCode(65 + i)}. {opt}
                    {answered && i === q.correct ? '  ✓' : answered && i === selectedIdx && i !== q.correct ? '  ✗' : ''}
                  </button>
                )
              })}
            </div>
            {answered && q.exp && (
              <div style={{ marginTop:14, padding:'10px 14px', background:C.indigoBg, borderRadius:10, fontSize:13, color:C.slate }}>
                💡 {q.exp}
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'space-between', alignItems:'center' }}>
            <button onClick={() => setQuizCurrent(c => c - 1)} disabled={quizCurrent === 0} style={{
              padding:'10px 20px', borderRadius:10, border:`1.5px solid ${C.border}`, background:'#fff', color:C.slate,
              fontSize:13, fontWeight:700, cursor: quizCurrent === 0 ? 'not-allowed' : 'pointer', opacity: quizCurrent === 0 ? 0.4 : 1,
            }}>← Prev</button>
            <span style={{ fontSize:12, color:C.slate }}>{answeredCount}/{quizQuestions.length} answered</span>
            {!isLast ? (
              <button onClick={() => setQuizCurrent(c => c + 1)} style={{ padding:'10px 20px', borderRadius:10, background:C.green, color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer' }}>Next →</button>
            ) : (
              <button onClick={submitQuiz} disabled={answeredCount < quizQuestions.length} style={{
                padding:'10px 20px', borderRadius:10, border:'none',
                background: answeredCount === quizQuestions.length ? C.indigo : C.border,
                color:'#fff', fontSize:13, fontWeight:700,
                cursor: answeredCount === quizQuestions.length ? 'pointer' : 'not-allowed',
              }}>
                {answeredCount === quizQuestions.length ? 'Submit & See Results' : `${quizQuestions.length - answeredCount} unanswered`}
              </button>
            )}
          </div>
          {!answered && (
            <div style={{ textAlign:'center', marginTop:8 }}>
              <button onClick={() => isLast ? submitQuiz() : setQuizCurrent(c => c + 1)} style={{ fontSize:12, color:C.slate, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Skip</button>
            </div>
          )}
        </div>
      )
    }

    // ── Results ──
    const correct = quizQuestions.filter(q => quizAnswers[q.id] === q.correct).length
    const total = quizQuestions.length
    const score = Math.round((correct / total) * 100)
    const scoreColor = score >= 70 ? C.green : score >= 50 ? C.amber : C.red
    const scoreBg = score >= 70 ? C.greenBg : score >= 50 ? C.amberBg : C.redBg

    return (
      <div style={{ padding:'24px 20px', maxWidth:720, margin:'0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <span style={{ fontSize:12, color:C.slate }}>{examData?.name} › {selectedSubject} › {chapter?.name}</span>
            <h2 style={{ margin:'2px 0 0', fontSize:20, fontWeight:900, color:C.indigo, fontFamily:'var(--serif)' }}>📊 Quiz Results</h2>
          </div>
          <button onClick={resetQuiz} style={{ padding:'8px 16px', borderRadius:10, background:C.indigo, color:'#fff', border:'none', fontSize:12, fontWeight:700, cursor:'pointer' }}>← Back to Chapter</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
          {[
            { val: `${score}%`, label:'Score', bg: scoreBg, border: scoreColor, color: scoreColor, big:true },
            { val: correct, label:'Correct', bg: C.greenBg, border: C.green, color: C.green },
            { val: total - correct, label:'Wrong', bg: C.redBg, border: C.red, color: C.red },
          ].map(({ val, label, bg, border, color, big }) => (
            <div key={label} style={{ background: bg, border:`2px solid ${border}`, borderRadius:14, padding:16, textAlign:'center' }}>
              <div style={{ fontSize: big ? 36 : 28, fontWeight:900, color }}>{val}</div>
              <div style={{ fontSize:11, fontWeight:700, color:C.slate, marginTop:2 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ background:C.indigoBg, border:`1.5px solid ${C.indigo}22`, borderRadius:16, padding:20, marginBottom:20 }}>
          <h3 style={{ fontSize:14, fontWeight:800, color:C.indigo, margin:'0 0 10px' }}>💡 Recommendations</h3>
          <ul style={{ margin:0, paddingLeft:20 }}>
            {score < 60 && <li style={{ fontSize:13, color:C.slate, marginBottom:4 }}>Score below 60% — revisit the Learn section and retry 5-question sets.</li>}
            {score >= 60 && score < 80 && <li style={{ fontSize:13, color:C.slate, marginBottom:4 }}>Good start! Practice wrong questions in Revision Mode.</li>}
            {score >= 80 && <li style={{ fontSize:13, color:C.green, fontWeight:600, marginBottom:4 }}>Great score! Move to PYQs for harder challenge.</li>}
            {(total - correct) > 0 && <li style={{ fontSize:13, color:C.slate }}>Use Revision Mode (wrong-only) to target your weak spots.</li>}
          </ul>
        </div>

        <div style={{ background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:20 }}>
          <h3 style={{ fontSize:14, fontWeight:800, color:C.slate, margin:'0 0 14px' }}>📝 Answer Review</h3>
          {quizQuestions.map((q, idx) => {
            const userAns = quizAnswers[q.id]
            const isCorrect = userAns === q.correct
            return (
              <div key={q.id} style={{ borderBottom:`1px solid ${C.border}`, paddingBottom:12, marginBottom:12 }}>
                <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                  <span style={{ fontSize:16, flexShrink:0 }}>{isCorrect ? '✅' : '❌'}</span>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:'0 0 4px', fontSize:13, fontWeight:600, color:C.slate }}>{idx + 1}. {q.q}</p>
                    {!isCorrect && (
                      <>
                        <p style={{ margin:'0 0 2px', fontSize:12, color:C.red }}>Your answer: {userAns !== undefined ? `${String.fromCharCode(65 + userAns)}. ${q.opts[userAns]}` : 'Skipped'}</p>
                        <p style={{ margin:0, fontSize:12, color:C.green, fontWeight:700 }}>Correct: {String.fromCharCode(65 + q.correct)}. {q.opts[q.correct]}</p>
                      </>
                    )}
                    {q.exp && <p style={{ margin:'4px 0 0', fontSize:11, color:C.indigo }}>💡 {q.exp}</p>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
          <button onClick={startQuiz} style={{ padding:'12px 28px', borderRadius:12, background:C.green, color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer' }}>🔄 New Random Set</button>
          <button
            onClick={handlePracticeMore}
            disabled={loadingGenMCQ || !effectiveToken}
            style={{ padding:'12px 28px', borderRadius:12, background: loadingGenMCQ ? C.border : C.indigo, color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor: loadingGenMCQ || !effectiveToken ? 'not-allowed' : 'pointer', opacity: !effectiveToken ? 0.6 : 1 }}
          >
            {loadingGenMCQ ? '⏳ Generating new questions…' : '⚡ Practice More (Generate 10 New)'}
          </button>
          <button onClick={resetQuiz} style={{ padding:'12px 28px', borderRadius:12, background:'#fff', color:C.slate, border:`1.5px solid ${C.border}`, fontSize:14, fontWeight:700, cursor:'pointer' }}>← Back to Chapter</button>
        </div>
      </div>
    )
  }

  // ── Main view ──
  const ch = selectedSubjectData?.chapters?.find(c => c.id === selectedChapter)
  const noteKey = selectedChapter ? `${selectedSubject}__${selectedChapter}` : null
  const dailyMCQTarget = 20
  const dailyPYQTarget = 10

  return (
    <div style={{ padding:'24px 20px', maxWidth:1100, margin:'0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:30 }}>{examData?.icon}</span>
          <div>
            <h1 style={{ margin:0, fontSize:22, fontWeight:900, color:C.indigo, fontFamily:'var(--serif)' }}>{examData?.name}</h1>
            <p style={{ margin:'2px 0 0', fontSize:12, color:C.slate }}>{getDaysLeft(examData?.date)} days left · {examData?.date}</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          {/* Daily progress */}
          <div style={{ background:C.greenBg, border:`1.5px solid ${C.green}33`, borderRadius:12, padding:'8px 14px', fontSize:12 }}>
            <span style={{ fontWeight:700, color:C.green }}>Today: </span>
            <span style={{ color:C.slate }}>{dailyStats.mcq}/{dailyMCQTarget} MCQ · {dailyStats.pyq}/{dailyPYQTarget} PYQ</span>
          </div>
          <button onClick={() => {
            setProfile(null)
            localStorage.removeItem(LS_ENTRANCE_PROFILE)
            setSelectedSubject(null)
            setSelectedChapter(null)
          }} style={{ padding:'8px 14px', borderRadius:10, border:`1px solid ${C.border}`, background:'#fff', color:C.slate, fontSize:12, fontWeight:700, cursor:'pointer' }}>
            Change Exam
          </button>
        </div>
      </div>

      {/* ── Subject pills ── */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
        {subjects.map(subj => (
          <Pill key={subj.name} label={subj.name} active={selectedSubject === subj.name} color={C.indigo}
            onClick={() => { setSelectedSubject(subj.name); setSelectedChapter(null) }} />
        ))}
      </div>

      {selectedSubject && !selectedChapter && (
        <>
          {/* ── Weak areas banner ── */}
          {weakChapters.length > 0 && (
            <div style={{ background:C.redBg, border:`1.5px solid ${C.red}33`, borderRadius:14, padding:'12px 16px', marginBottom:20, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
              <span style={{ fontSize:18 }}>⚠️</span>
              <span style={{ fontSize:13, fontWeight:700, color:C.red }}>Weak areas need attention:</span>
              {weakChapters.map(ch2 => (
                <button key={ch2.id} onClick={() => setSelectedChapter(ch2.id)} style={{
                  padding:'4px 12px', borderRadius:99, background:C.red, color:'#fff', border:'none', fontSize:11, fontWeight:700, cursor:'pointer',
                }}>
                  {ch2.icon} {ch2.name}
                </button>
              ))}
            </div>
          )}

          {/* ── Chapter grid ── */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:800, color:C.indigo, marginBottom:12, textTransform:'uppercase' }}>
              📚 Chapters — {selectedSubjectData?.chapters?.length || 0} chapters
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
              {selectedSubjectData?.chapters?.map(ch2 => {
                const acc = getChapterAcc(ch2.id)
                const mcqCount = ALL_MCQ_BANK.filter(m => m.exam === profile?.examId && m.subject === selectedSubject && m.chapter === ch2.id).length
                const pyqCount = PYQ_BANK.filter(q => q.exam === profile?.examId && q.subject === selectedSubject && q.topicId === ch2.id).length
                const isWeak = acc !== null && acc < 60
                const isStrong = acc !== null && acc >= 80
                return (
                  <div key={ch2.id} onClick={() => setSelectedChapter(ch2.id)} style={{
                    background:'#fff', border:`2px solid ${isWeak ? C.red+'44' : isStrong ? C.green+'44' : C.border}`,
                    borderRadius:14, padding:16, cursor:'pointer', transition:'.2s', position:'relative',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.indigo; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = isWeak ? C.red+'44' : isStrong ? C.green+'44' : C.border; e.currentTarget.style.transform = 'translateY(0)' }}>
                    {acc !== null && (
                      <span style={{
                        position:'absolute', top:10, right:10, padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:800,
                        background: isWeak ? C.redBg : isStrong ? C.greenBg : C.amberBg,
                        color: isWeak ? C.red : isStrong ? C.green : C.amber,
                      }}>{acc}%</span>
                    )}
                    <div style={{ fontSize:24, marginBottom:6 }}>{ch2.icon}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.slate, marginBottom:8, lineHeight:1.3 }}>{ch2.name}</div>
                    <div style={{ display:'flex', gap:8 }}>
                      {mcqCount > 0 && <span style={{ fontSize:10, fontWeight:600, color:C.green, background:C.greenBg, padding:'2px 6px', borderRadius:6 }}>{mcqCount} MCQ</span>}
                      {pyqCount > 0 && <span style={{ fontSize:10, fontWeight:600, color:C.amber, background:C.amberBg, padding:'2px 6px', borderRadius:6 }}>{pyqCount} PYQ</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Chapter detail ── */}
      {selectedSubject && selectedChapter && ch && (
        <div>
          {/* Breadcrumb */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
            <button onClick={() => setSelectedChapter(null)} style={{ background:'none', border:'none', cursor:'pointer', color:C.indigo, fontSize:13, fontWeight:700, padding:0 }}>
              ← {selectedSubject}
            </button>
            <span style={{ color:C.slate, fontSize:13 }}>/</span>
            <span style={{ fontSize:13, fontWeight:800, color:C.slate }}>{ch.icon} {ch.name}</span>
            {(() => {
              const acc = getChapterAcc(selectedChapter)
              if (acc === null) return null
              const isWeak = acc < 60, isStrong = acc >= 80
              return (
                <span style={{
                  marginLeft:8, padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:800,
                  background: isWeak ? C.redBg : isStrong ? C.greenBg : C.amberBg,
                  color: isWeak ? C.red : isStrong ? C.green : C.amber,
                }}>{acc}% accuracy</span>
              )
            })()}
          </div>

          {/* Topics */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:24 }}>
            {ch.topics?.map(t => (
              <span key={t} style={{ padding:'3px 10px', borderRadius:6, background:C.indigoBg, color:C.indigo, fontSize:11, fontWeight:600 }}>{t}</span>
            ))}
          </div>

          {/* ═══════════════════════════════════════════════
              📘 SECTION 1: LEARN
          ═══════════════════════════════════════════════ */}
          <div style={{ marginBottom:32 }}>
            <SectionHead icon='📘' title='Learn & Quick Summary' subtitle='Key concepts, formulas, and exam tips' color={C.indigo} />

            {chapterSummary ? (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16, marginBottom:16 }}>
                {/* Summary */}
                <div style={{ background:C.indigoBg, border:`1.5px solid ${C.indigo}22`, borderRadius:14, padding:18 }}>
                  <h4 style={{ margin:'0 0 10px', fontSize:13, fontWeight:800, color:C.indigo }}>📖 Quick Summary</h4>
                  <p style={{ margin:0, fontSize:13, color:C.slate, lineHeight:1.6 }}>{chapterSummary.summary}</p>
                </div>
                {/* Formulas */}
                <div style={{ background:'#fafafa', border:`1.5px solid ${C.border}`, borderRadius:14, padding:18 }}>
                  <h4 style={{ margin:'0 0 10px', fontSize:13, fontWeight:800, color:C.slate }}>⚗️ Key Formulas</h4>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {chapterSummary.formulas?.map((f, i) => (
                      <div key={i} style={{ padding:'6px 10px', background:'#fff', border:`1px solid ${C.border}`, borderRadius:8, fontFamily:'monospace', fontSize:12, color:C.slate }}>
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Tips */}
                <div style={{ background:'#fffbf0', border:`1.5px solid ${C.amber}33`, borderRadius:14, padding:18 }}>
                  <h4 style={{ margin:'0 0 10px', fontSize:13, fontWeight:800, color:C.amber }}>⭐ Exam Tips</h4>
                  <ul style={{ margin:0, paddingLeft:18 }}>
                    {chapterSummary.tips?.map((t, i) => (
                      <li key={i} style={{ fontSize:12, color:C.slate, marginBottom:6, lineHeight:1.5 }}>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div style={{ background:'#f8f8fb', borderRadius:12, padding:14, marginBottom:16, fontSize:13, color:C.slate }}>
                Summary not available for this chapter. Generate AI notes below.
              </div>
            )}

            {/* AI Notes */}
            <div style={{ background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:14, padding:18 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:8 }}>
                <h4 style={{ margin:0, fontSize:13, fontWeight:800, color:C.indigo }}>🤖 AI Detailed Notes</h4>
                <div style={{ display:'flex', gap:8 }}>
                  {noteKey && notes[noteKey] && (
                    <button
                      onClick={() => speakNotes(notes[noteKey])}
                      title={audioPlaying ? 'Stop reading' : 'Read aloud'}
                      style={{
                        padding:'7px 14px', borderRadius:10,
                        background: audioPlaying ? C.redBg : C.amberBg,
                        color: audioPlaying ? C.red : C.amber,
                        border: `1.5px solid ${audioPlaying ? C.red : C.amber}`,
                        fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5,
                      }}
                    >
                      {audioPlaying ? '⏹ Stop Audio' : '🔊 Listen'}
                    </button>
                  )}
                  <button onClick={() => generateNotes(selectedChapter, ch.name)} disabled={loadingNotes} style={{
                    padding:'7px 16px', borderRadius:10, background:C.indigo, color:'#fff', border:'none', fontSize:12, fontWeight:700, cursor: loadingNotes ? 'not-allowed' : 'pointer', opacity: loadingNotes ? 0.7 : 1,
                  }}>
                    {loadingNotes ? '⏳ Generating...' : noteKey && notes[noteKey] ? '🔄 Regenerate' : '✨ Generate Notes'}
                  </button>
                </div>
              </div>
              {notesError && <div style={{ background:C.amberBg, borderRadius:8, padding:10, color:C.amber, fontSize:12, marginBottom:10 }}>{notesError}</div>}
              {noteKey && notes[noteKey] ? (
                <div style={{ fontSize:13, color:C.slate, lineHeight:1.8 }}>
                  {notes[noteKey].split('\n').map((line, i) => {
                    const isHeader = line.startsWith('##')
                    const text = isHeader ? line.replace(/^##\s*/, '') : line
                    if (isHeader) return (
                      <div key={i} style={{ fontSize:14, fontWeight:800, color:C.indigo, marginTop:18, marginBottom:6, paddingBottom:4, borderBottom:`2px solid ${C.indigoBg}` }}>
                        {text}
                      </div>
                    )
                    if (line.trim() === '') return <div key={i} style={{ height:6 }} />
                    // Highlight formula lines (contain = or →)
                    const isFormula = /[=→]/.test(line) && line.length < 120
                    if (isFormula) return (
                      <div key={i} style={{ fontFamily:'monospace', background:'#f8f8fb', border:`1px solid ${C.border}`, borderRadius:6, padding:'5px 10px', marginBottom:5, fontSize:12.5, color:C.slate }}>
                        {line.trim()}
                      </div>
                    )
                    // Bullet points
                    const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().match(/^\d+\./)
                    if (isBullet) return (
                      <div key={i} style={{ display:'flex', gap:6, marginBottom:5 }}>
                        <span style={{ color:C.indigo, flexShrink:0 }}>▸</span>
                        <span>{line.trim().replace(/^[•\-\d\.]+\s*/, '')}</span>
                      </div>
                    )
                    return <p key={i} style={{ margin:'0 0 6px' }}>{line}</p>
                  })}
                </div>
              ) : (
                <p style={{ margin:0, fontSize:13, color:C.slate }}>{loadingNotes ? '⏳ Generating comprehensive notes with real-world examples…' : 'Click "Generate Notes" for AI-powered study notes with real examples, solved problems, and exam tips.'}</p>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════
              ⚡ SECTION 2: PRACTICE MCQs
          ═══════════════════════════════════════════════ */}
          <div style={{ marginBottom:32 }}>
            <SectionHead icon='⚡' title='Practice MCQs' subtitle='Test your understanding' color={C.green} />

            {/* Filters row */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:16 }}>
              <span style={{ fontSize:12, fontWeight:700, color:C.slate }}>Difficulty:</span>
              {['all','easy','medium','hard'].map(d => (
                <button key={d} onClick={() => setDiffFilter(d)} style={{
                  padding:'5px 12px', borderRadius:99, border:`1.5px solid ${diffFilter === d ? C.green : C.border}`,
                  background: diffFilter === d ? C.green : '#fff', color: diffFilter === d ? '#fff' : C.slate,
                  fontSize:12, fontWeight:600, cursor:'pointer',
                  ...(d === 'easy' && diffFilter !== d ? { color: C.green } : {}),
                  ...(d === 'hard' && diffFilter !== d ? { color: C.red } : {}),
                }}>
                  {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
              <div style={{ marginLeft:8, display:'flex', alignItems:'center', gap:6 }}>
                <button onClick={() => setRevisionMode(r => !r)} style={{
                  padding:'5px 12px', borderRadius:99, border:`1.5px solid ${revisionMode ? C.red : C.border}`,
                  background: revisionMode ? C.redBg : '#fff', color: revisionMode ? C.red : C.slate,
                  fontSize:12, fontWeight:600, cursor:'pointer',
                }}>
                  🔁 Wrong-only {revisionMode ? 'ON' : 'OFF'}
                </button>
              </div>
              {wrongQuestions.length > 0 && (
                <button onClick={() => setWrongQuestions([])} style={{ padding:'5px 10px', borderRadius:99, border:`1px solid ${C.border}`, background:'#fff', color:C.slate, fontSize:11, cursor:'pointer' }}>
                  Clear wrong ({wrongQuestions.length})
                </button>
              )}
            </div>

            {/* ── AI Generate row ── */}
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:12 }}>
              <button onClick={generateMoreMCQs} disabled={loadingGenMCQ || !effectiveToken} style={{
                padding:'7px 16px', borderRadius:10, background: loadingGenMCQ ? C.border : C.indigo,
                color:'#fff', border:'none', fontSize:12, fontWeight:700,
                cursor: loadingGenMCQ || !effectiveToken ? 'not-allowed' : 'pointer', opacity: !effectiveToken ? 0.5 : 1,
              }}>
                {loadingGenMCQ ? '⏳ Generating…' : '🤖 Generate 10 More MCQs'}
              </button>
              {(() => {
                const genKey = `${profile?.examId}__${selectedSubject}__${selectedChapter}`
                const count = (generatedMCQs[genKey] || []).length
                return count > 0 ? (
                  <span style={{ fontSize:12, color:C.green, fontWeight:600 }}>✓ {count} AI-generated added</span>
                ) : null
              })()}
              {!effectiveToken && <span style={{ fontSize:11, color:C.slate }}>Log in to generate questions</span>}
            </div>
            {genMCQError && (
              <div style={{ background:C.redBg, borderRadius:8, padding:'8px 12px', color:C.red, fontSize:12, marginBottom:10 }}>
                {genMCQError}
              </div>
            )}

            {chapterMCQs.length === 0 ? (
              <div style={{ textAlign:'center', padding:'30px', color:C.slate, fontSize:13, background:'#f8f8fb', borderRadius:12 }}>
                {revisionMode
                  ? 'No wrong questions logged for this chapter yet. Practice first!'
                  : 'No static questions for this filter. Click "Generate 10 More MCQs" to create AI questions.'}
              </div>
            ) : (
              <div style={{ background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:14, padding:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:C.slate }}>{chapterMCQs.length} questions available</span>
                    {revisionMode && <Badge label='Revision Mode' bg={C.redBg} color={C.red} />}
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ fontSize:12, color:C.slate }}>Count:</span>
                    {[5, 10, 15, 20].map(n => (
                      <button key={n} onClick={() => setQuizConfig({ count: n })} style={{
                        padding:'5px 12px', borderRadius:8, border:`1.5px solid ${quizConfig.count === n ? C.green : C.border}`,
                        background: quizConfig.count === n ? C.greenBg : '#fff', color: quizConfig.count === n ? C.green : C.slate,
                        fontSize:12, fontWeight:600, cursor:'pointer',
                      }}>{n}</button>
                    ))}
                    <button onClick={() => setQuizConfig({ count: chapterMCQs.length })} style={{
                      padding:'5px 12px', borderRadius:8, border:`1.5px solid ${quizConfig.count === chapterMCQs.length ? C.green : C.border}`,
                      background: quizConfig.count === chapterMCQs.length ? C.greenBg : '#fff', color: quizConfig.count === chapterMCQs.length ? C.green : C.slate,
                      fontSize:12, fontWeight:600, cursor:'pointer',
                    }}>All ({chapterMCQs.length})</button>
                  </div>
                </div>
                <button onClick={startQuiz} style={{
                  width:'100%', padding:'12px', borderRadius:12, background:C.green, color:'#fff', border:'none', fontSize:14, fontWeight:700, cursor:'pointer',
                }}>
                  ▶ Start Quiz ({Math.min(quizConfig.count, chapterMCQs.length)} questions)
                </button>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════
              🏆 SECTION 3: PREVIOUS YEAR QUESTIONS
          ═══════════════════════════════════════════════ */}
          <div style={{ marginBottom:32 }}>
            <SectionHead icon='🏆' title='Previous Year Questions' subtitle={`${chapterPYQs.length} PYQs for this chapter`} color={C.amber} />

            {/* ── AI Generate PYQs row ── */}
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:14 }}>
              <button onClick={generateMorePYQs} disabled={loadingGenPYQ || !effectiveToken} style={{
                padding:'7px 16px', borderRadius:10, background: loadingGenPYQ ? C.border : C.amber,
                color:'#fff', border:'none', fontSize:12, fontWeight:700,
                cursor: loadingGenPYQ || !effectiveToken ? 'not-allowed' : 'pointer', opacity: !effectiveToken ? 0.5 : 1,
              }}>
                {loadingGenPYQ ? '⏳ Generating…' : '🤖 Generate 10 More PYQs'}
              </button>
              {(() => {
                const genKey = `${profile?.examId}__${selectedSubject}__${selectedChapter}`
                const count = (generatedPYQs[genKey] || []).length
                return count > 0 ? (
                  <span style={{ fontSize:12, color:C.amber, fontWeight:600 }}>✓ {count} AI-generated added</span>
                ) : null
              })()}
              {!effectiveToken && <span style={{ fontSize:11, color:C.slate }}>Log in to generate questions</span>}
            </div>
            {genPYQError && (
              <div style={{ background:C.redBg, borderRadius:8, padding:'8px 12px', color:C.red, fontSize:12, marginBottom:10 }}>
                {genPYQError}
              </div>
            )}

            {/* PYQ Filters */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:16 }}>
              <span style={{ fontSize:12, fontWeight:700, color:C.slate }}>Year:</span>
              <button onClick={() => setPyqYearFilter('all')} style={{ padding:'4px 10px', borderRadius:99, border:`1.5px solid ${pyqYearFilter === 'all' ? C.amber : C.border}`, background: pyqYearFilter === 'all' ? C.amber : '#fff', color: pyqYearFilter === 'all' ? '#fff' : C.slate, fontSize:11, fontWeight:600, cursor:'pointer' }}>All</button>
              {pyqYears.map(y => (
                <button key={y} onClick={() => setPyqYearFilter(y)} style={{ padding:'4px 10px', borderRadius:99, border:`1.5px solid ${pyqYearFilter === y ? C.amber : C.border}`, background: pyqYearFilter === y ? C.amber : '#fff', color: pyqYearFilter === y ? '#fff' : C.slate, fontSize:11, fontWeight:600, cursor:'pointer' }}>{y}</button>
              ))}
              <span style={{ marginLeft:8, fontSize:12, fontWeight:700, color:C.slate }}>Level:</span>
              {['all','easy','medium','hard'].map(l => (
                <button key={l} onClick={() => setPyqLevelFilter(l)} style={{ padding:'4px 10px', borderRadius:99, border:`1.5px solid ${pyqLevelFilter === l ? C.indigo : C.border}`, background: pyqLevelFilter === l ? C.indigo : '#fff', color: pyqLevelFilter === l ? '#fff' : C.slate, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                  {l === 'all' ? 'All' : l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
              <button onClick={() => setPyqFlags(f => ({ ...f, repeated: !f.repeated }))} style={{ padding:'4px 10px', borderRadius:99, border:`1.5px solid ${pyqFlags.repeated ? C.red : C.border}`, background: pyqFlags.repeated ? C.redBg : '#fff', color: pyqFlags.repeated ? C.red : C.slate, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                🔥 Most Repeated
              </button>
              <button onClick={() => setPyqFlags(f => ({ ...f, highProb: !f.highProb }))} style={{ padding:'4px 10px', borderRadius:99, border:`1.5px solid ${pyqFlags.highProb ? C.green : C.border}`, background: pyqFlags.highProb ? C.greenBg : '#fff', color: pyqFlags.highProb ? C.green : C.slate, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                ⭐ High Probability
              </button>
            </div>

            {chapterPYQs.length === 0 ? (
              <div style={{ textAlign:'center', padding:24, color:C.slate, fontSize:13, background:'#f8f8fb', borderRadius:12 }}>
                {(pyqYearFilter !== 'all' || pyqLevelFilter !== 'all' || pyqFlags.repeated || pyqFlags.highProb)
                  ? 'No PYQs match current filters. Try removing filters.'
                  : 'No static PYQs for this chapter. Click "Generate 10 More PYQs" above to create AI-style questions.'}
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
                {chapterPYQs.map(pyq => {
                  const revealed = !!revealedPYQs[pyq.id]
                  return (
                    <div key={pyq.id} style={{ background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:12, padding:16 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          <span style={{ fontSize:10, fontWeight:700, color:C.amber, background:C.amberBg, padding:'2px 7px', borderRadius:6 }}>{pyq.year}</span>
                          <span style={{ fontSize:10, fontWeight:600, color:C.slate, background:'#f3f4f6', padding:'2px 7px', borderRadius:6 }}>{pyq.level}</span>
                          {pyq.repeated && <span style={{ fontSize:10, fontWeight:700, color:C.red, background:C.redBg, padding:'2px 7px', borderRadius:6 }}>🔥 Repeated</span>}
                          {pyq.highProb && <span style={{ fontSize:10, fontWeight:700, color:C.green, background:C.greenBg, padding:'2px 7px', borderRadius:6 }}>⭐ High Prob</span>}
                        </div>
                        <button onClick={() => toggleBookmark(pyq.id)} style={{ background:'none', border:'none', fontSize:16, cursor:'pointer', opacity: bookmarks.includes(pyq.id) ? 1 : 0.4 }}>
                          {bookmarks.includes(pyq.id) ? '🔖' : '📌'}
                        </button>
                      </div>
                      <p style={{ fontSize:13, fontWeight:600, color:C.slate, marginBottom:12, lineHeight:1.5 }}>{pyq.q}</p>
                      {revealed ? (
                        <div style={{ background:C.amberBg, borderRadius:8, padding:10 }}>
                          <p style={{ margin:0, fontSize:11, fontWeight:700, color:C.amber }}>Answer:</p>
                          <p style={{ margin:'4px 0 0', fontSize:12, color:C.slate }}>{pyq.ans}</p>
                        </div>
                      ) : (
                        <button onClick={() => {
                          setRevealedPYQs(r => ({ ...r, [pyq.id]: true }))
                          setDailyStats(s => ({ ...s, pyq: s.pyq + 1 }))
                        }} style={{ padding:'7px 14px', borderRadius:8, background:C.amber, color:'#fff', border:'none', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                          Show Answer
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════
              💬 SECTION 4: ASK A DOUBT
          ═══════════════════════════════════════════════ */}
          <div style={{ marginBottom:24 }}>
            <SectionHead icon='💬' title='Ask a Doubt' subtitle='AI-powered doubt solver for this chapter' color={C.rose} />

            {/* Sample questions */}
            {(() => {
              const samples = SAMPLE_DOUBTS[profile?.examId]?.[selectedSubject] || []
              return samples.length > 0 ? (
                <div style={{ marginBottom:16 }}>
                  <p style={{ fontSize:12, fontWeight:700, color:C.slate, marginBottom:8 }}>💡 Try a sample question:</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {samples.slice(0, 3).map((q, i) => (
                      <button key={i} onClick={() => { setDoubt(q); setDoubtResponse(null); setDoubtError(null) }} style={{
                        padding:'7px 14px', borderRadius:99, border:`1.5px solid ${doubt === q ? C.rose : C.border}`,
                        background: doubt === q ? C.roseBg : '#fff', color: doubt === q ? C.rose : C.slate,
                        fontSize:12, fontWeight:500, cursor:'pointer', transition:'.15s', lineHeight:1.4, textAlign:'left',
                      }}>
                        {q.slice(0, 50)}{q.length > 50 ? '…' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null
            })()}

            <div style={{ background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:14, padding:20 }}>
              <textarea value={doubt} onChange={e => setDoubt(e.target.value)}
                placeholder={`Ask anything about ${ch.name}…`}
                style={{ width:'100%', padding:12, borderRadius:10, border:`1px solid ${C.border}`, fontSize:14, fontFamily:'var(--sans)', resize:'vertical', minHeight:80, boxSizing:'border-box' }}
              />
              <button onClick={solveDoubt} disabled={loadingDoubt || !doubt.trim()} style={{
                marginTop:10, padding:'10px 22px', borderRadius:10, background:C.rose, color:'#fff', border:'none', fontSize:13, fontWeight:700,
                cursor: loadingDoubt || !doubt.trim() ? 'not-allowed' : 'pointer', opacity: !doubt.trim() ? 0.5 : 1,
              }}>
                {loadingDoubt ? '⏳ Solving…' : '🔍 Get Answer'}
              </button>
            </div>
            {doubtError && <div style={{ background:C.amberBg, borderRadius:10, padding:12, color:C.amber, fontSize:12, marginTop:10 }}>{doubtError}</div>}
            {doubtResponse && (
              <div style={{ background:C.roseBg, border:`1.5px solid ${C.rose}33`, borderRadius:12, padding:20, marginTop:14, lineHeight:1.7, fontSize:13, color:C.slate }}>
                <div style={{ fontWeight:800, color:C.rose, marginBottom:8 }}>Answer</div>
                <div style={{ whiteSpace:'pre-wrap' }}>{doubtResponse}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
