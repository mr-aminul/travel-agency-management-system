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
  /** Billing period shown on the ticket stub fare. */
  interval: 'month' | 'year'
  perks: readonly PricingPerk[]
  isFeatured?: boolean
}

const STARTER_PERKS: readonly PricingPerk[] = [
  { label: '5 team seats', icon: 'seats' },
  { label: 'All 8 services', icon: 'services' },
  { label: 'Payments & invoices', icon: 'payments' },
  { label: '10 GB storage', icon: 'storage' },
  { label: '300 SMS / mo', icon: 'sms' },
]

const GROWTH_PERKS: readonly PricingPerk[] = [
  { label: '20 team seats', icon: 'seats' },
  { label: '30 sub agents', icon: 'subAgents' },
  { label: 'Links & approvals', icon: 'links' },
  { label: '40 GB storage', icon: 'storage' },
  { label: '2,000 SMS / mo', icon: 'sms' },
]

const BUSINESS_PERKS: readonly PricingPerk[] = [
  { label: '60 team seats', icon: 'seats' },
  { label: '100 sub agents', icon: 'subAgents' },
  { label: 'HR & payroll', icon: 'hr' },
  { label: '100 GB storage', icon: 'storage' },
  { label: '8,000 SMS / mo', icon: 'sms' },
]

/** Mirrors the public monthly plans in `server/src/billing/plans.js`. */
export const PRICING_PLANS: readonly PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceBdt: 3000,
    seatCode: '05A',
    interval: 'month',
    perks: STARTER_PERKS,
  },
  {
    id: 'growth',
    name: 'Growth',
    priceBdt: 6500,
    seatCode: '20G',
    interval: 'month',
    isFeatured: true,
    perks: GROWTH_PERKS,
  },
  {
    id: 'business',
    name: 'Business',
    priceBdt: 14000,
    seatCode: '60F',
    interval: 'month',
    perks: BUSINESS_PERKS,
  },
]

/** Annual = 10× monthly (two months free). Same limits as the monthly twin. */
export const ANNUAL_PRICING_PLANS: readonly PricingPlan[] = [
  {
    id: 'starter-year',
    name: 'Starter',
    priceBdt: 30000,
    seatCode: '12C',
    interval: 'year',
    perks: STARTER_PERKS,
  },
  {
    id: 'growth-year',
    name: 'Growth',
    priceBdt: 65000,
    seatCode: '24D',
    interval: 'year',
    isFeatured: true,
    perks: GROWTH_PERKS,
  },
  {
    id: 'business-year',
    name: 'Business',
    priceBdt: 140000,
    seatCode: '48J',
    interval: 'year',
    perks: BUSINESS_PERKS,
  },
]

export const SALES_EMAIL = 'support@inventivelab.bd'

export const SALES_MAILTO = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent('OneTrack — talk to Inventive Lab')}`

export const LANDING_AUDIENCES = [
  {
    id: 'tourist',
    label: 'Tourist Visa',
    title: 'All Tourist Visa Files in One Place',
    detail:
      'From first passport to visa ready. Status, documents, and next step stay on one file.',
    vignette: 'board' as const,
  },
  {
    id: 'student',
    label: 'Student Visa',
    title: 'See Missing Documents Fast',
    detail:
      'Bank statement, offer letter, photo — know what you have and what the client still needs to give.',
    vignette: 'documents' as const,
  },
  {
    id: 'work',
    label: 'Work Permit',
    title: 'Send Clients a Tracking Link',
    detail:
      'One SMS with a link. Clients check status themselves. Fewer calls to your desk.',
    vignette: 'tracking' as const,
  },
  {
    id: 'hajj',
    label: 'Hajj & Umrah',
    title: 'Track Payments in One Place',
    detail:
      'See advance paid, balance left, and due amount on the same file.',
    vignette: 'invoice' as const,
  },
  {
    id: 'tickets',
    label: 'Tickets & Hotels',
    title: 'Tickets and Visas Together',
    detail:
      'Keep air tickets and hotels with the visa file. Get SMS when status changes.',
    vignette: 'sms' as const,
  },
  {
    id: 'network',
    label: 'Sub Agents',
    title: 'Work With Your Sub Agents',
    detail:
      'Sub agents send clients. You approve. They can follow progress.',
    vignette: 'subAgents' as const,
  },
] as const

/** Single continuous product film on the Features section. */
export const LANDING_FEATURE_SHOW = {
  title: 'Clients keep calling for updates',
} as const

export const LANDING_FAQS = [
  {
    question: 'Who is OneTrack for?',
    answer:
      'Travel and visa agencies that handle tourist, student, work, Hajj, Umrah, medical, ticket, hotel, and tour files.',
  },
  {
    question: 'Do I need a card for the trial?',
    answer:
      'No. Sign up with your agency name, email, and password. Choose a paid plan after 14 days.',
  },
  {
    question: 'What do I get in the trial?',
    answer:
      'Full use of the plan you pick for 14 days, so you can try real work before you pay.',
  },
  {
    question: 'How do we move from WhatsApp and Excel?',
    answer:
      'Start with the files open today. Add each one to the board. Keep WhatsApp for chat. Use OneTrack for the file record.',
  },
  {
    question: 'Can my sub agents use it?',
    answer:
      'Yes on Growth and Business. They can send clients and follow progress.',
  },
  {
    question: 'Does it replace WhatsApp?',
    answer:
      'No. You can still chat on WhatsApp. OneTrack holds the file status, documents, and payments.',
  },
  {
    question: 'How does pricing work?',
    answer:
      'You pay monthly or annually in Taka. Annual is two months free vs monthly. Plans differ by team seats, storage, SMS, and sub agents. No setup fee.',
  },
  {
    question: 'Can clients track their own file?',
    answer:
      'Yes. Send them a tracking link so they can check status without calling you.',
  },
  {
    question: 'Is my agency data separate?',
    answer:
      'Yes. Each agency has its own workspace. Your clients and files stay there.',
  },
  {
    question: 'Can I talk to someone before I start?',
    answer: `Email ${SALES_EMAIL}. Inventive Lab in Dhaka will reply and can show you the setup.`,
  },
] as const
