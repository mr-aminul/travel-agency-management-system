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
}

export const JOURNEY_STOPS: readonly JourneyStop[] = [
  { code: 'INT', title: 'Intake' },
  { code: 'DOC', title: 'Documents' },
  { code: 'SUB', title: 'Submitted' },
  { code: 'DEC', title: 'Decision' },
  { code: 'DLV', title: 'Delivered' },
]

export type PricingPerkIcon =
  | 'seats'
  | 'services'
  | 'payments'
  | 'storage'
  | 'sms'
  | 'subAgents'
  | 'links'
  | 'hr'

export type PricingPerk = {
  label: string
  icon: PricingPerkIcon
}

export type PricingPlan = {
  id: string
  name: string
  priceBdt: number
  seatCode: string
  perks: readonly PricingPerk[]
  isFeatured?: boolean
}

/** Mirrors the public plans in `server/src/billing/plans.js`. */
export const PRICING_PLANS: readonly PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceBdt: 3000,
    seatCode: '05A',
    perks: [
      { label: '5 team seats', icon: 'seats' },
      { label: 'All 8 services', icon: 'services' },
      { label: 'Payments & invoices', icon: 'payments' },
      { label: '10 GB storage', icon: 'storage' },
      { label: '300 SMS / month', icon: 'sms' },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    priceBdt: 6500,
    seatCode: '20K',
    isFeatured: true,
    perks: [
      { label: '20 team seats', icon: 'seats' },
      { label: '30 sub agents', icon: 'subAgents' },
      { label: 'Links & approvals', icon: 'links' },
      { label: '40 GB storage', icon: 'storage' },
      { label: '2,000 SMS / month', icon: 'sms' },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    priceBdt: 14000,
    seatCode: '60F',
    perks: [
      { label: '60 team seats', icon: 'seats' },
      { label: '100 sub agents', icon: 'subAgents' },
      { label: 'HR & payroll', icon: 'hr' },
      { label: '100 GB storage', icon: 'storage' },
      { label: '8,000 SMS / month', icon: 'sms' },
    ],
  },
]

export const SALES_EMAIL = 'support@inventivelab.bd'
