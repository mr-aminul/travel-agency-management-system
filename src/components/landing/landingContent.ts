export const BOARD_STAGES = [
  'INTAKE',
  'DOCS IN',
  'SUBMITTED',
  'APPROVED',
  'DELIVERED',
] as const

export type BoardStage = (typeof BOARD_STAGES)[number]

export type BoardFile = {
  time: string
  client: string
  service: string
  destination: string
}

/** Sample files for the hero departures board. Names are illustrative. */
export const BOARD_FILES: readonly BoardFile[] = [
  { time: '09:40', client: 'R. HOSSAIN', service: 'STUDENT VISA', destination: 'TORONTO' },
  { time: '10:15', client: 'N. AKTER', service: 'UMRAH', destination: 'JEDDAH' },
  { time: '11:05', client: 'M. RAHMAN', service: 'WORK PERMIT', destination: 'DUBAI' },
  { time: '11:50', client: 'S. ISLAM', service: 'TOURIST VISA', destination: 'BANGKOK' },
  { time: '12:30', client: 'F. CHOWDHURY', service: 'MEDICAL VISA', destination: 'CHENNAI' },
  { time: '13:20', client: 'T. AHMED', service: 'AIR TICKET', destination: 'K. LUMPUR' },
  { time: '14:10', client: 'J. BEGUM', service: 'HOTEL', destination: 'MAKKAH' },
  { time: '15:00', client: 'A. KARIM', service: 'TOUR PACKAGE', destination: 'BALI' },
  { time: '15:45', client: 'L. SULTANA', service: 'STUDENT VISA', destination: 'LONDON' },
  { time: '16:30', client: 'H. MIAH', service: 'HAJJ', destination: 'MAKKAH' },
]

export const SERVICE_TYPES = [
  'Tourist visa',
  'Student visa',
  'Work permit',
  'Hajj & Umrah',
  'Medical visa',
  'Air tickets',
  'Hotel booking',
  'Tour packages',
] as const

export type JourneyStop = {
  code: string
  title: string
  body: string
}

export const JOURNEY_STOPS: readonly JourneyStop[] = [
  {
    code: 'INT',
    title: 'Intake',
    body: 'Add the client, or send them a link.',
  },
  {
    code: 'DOC',
    title: 'Documents',
    body: 'Checklist per service. Nothing missing.',
  },
  {
    code: 'SUB',
    title: 'Submitted',
    body: 'File moves. Client gets an SMS.',
  },
  {
    code: 'DEC',
    title: 'Decision',
    body: 'Approved, refused or on hold.',
  },
  {
    code: 'DLV',
    title: 'Delivered',
    body: 'Passport back. Invoice settled.',
  },
]

export type PricingPlan = {
  id: string
  name: string
  priceBdt: number
  tagline: string
  seatCode: string
  perks: readonly string[]
  isFeatured?: boolean
}

/** Mirrors the public plans in `server/src/billing/plans.js`. */
export const PRICING_PLANS: readonly PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceBdt: 3000,
    tagline: 'Small desk, own files.',
    seatCode: '05A',
    perks: [
      '5 team seats',
      'All 8 services',
      'Payments & invoices',
      '10 GB storage',
      '300 SMS / month',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    priceBdt: 6500,
    tagline: 'Scale with sub agents.',
    seatCode: '20K',
    isFeatured: true,
    perks: [
      '20 team seats',
      '30 sub agents',
      'Links & approvals',
      '40 GB storage',
      '2,000 SMS / month',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    priceBdt: 14000,
    tagline: 'Ops and HR together.',
    seatCode: '60F',
    perks: [
      '60 team seats',
      '100 sub agents',
      'HR & payroll',
      '100 GB storage',
      '8,000 SMS / month',
    ],
  },
]

export const SALES_EMAIL = 'support@inventivelab.bd'
