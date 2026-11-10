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

export const SALES_MAILTO = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent('OneTrack — talk to Inventive Lab')}`

export const LANDING_AUDIENCES = [
  {
    id: 'tourist',
    label: 'Tourist visa',
    title: 'Every tourist file on one board',
    detail:
      'From passport intake to sticker ready — stage, documents, and next action stay on the same file.',
    vignette: 'board' as const,
  },
  {
    id: 'student',
    label: 'Student visa',
    title: 'See which document is still missing',
    detail:
      'Bank statement, offer letter, photo — know what is in and what the client still owes you.',
    vignette: 'documents' as const,
  },
  {
    id: 'work',
    label: 'Work permit',
    title: 'Give clients a tracking link',
    detail:
      'Send one SMS with the link. They check progress themselves instead of calling the desk again.',
    vignette: 'tracking' as const,
  },
  {
    id: 'hajj',
    label: 'Hajj & Umrah',
    title: 'Advance, balance, and due in one place',
    detail:
      'Package money often stays open for weeks. Keep paid and remaining due on the same file.',
    vignette: 'invoice' as const,
  },
  {
    id: 'tickets',
    label: 'Tickets & hotels',
    title: 'Tickets beside the visa file',
    detail:
      'Air tickets and hotels live on the same desk as the visa, with SMS when status changes.',
    vignette: 'sms' as const,
  },
  {
    id: 'network',
    label: 'Sub agents',
    title: 'Files from your network',
    detail:
      'Sub agents in Chattogram or Sylhet send clients. You approve, and they follow progress.',
    vignette: 'subAgents' as const,
  },
] as const

/** Single continuous product film on the Features section. */
export const LANDING_FEATURE_SHOW = {
  title: 'Every file from start to finish',
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
      'You pay monthly in Taka. Plans differ by team seats, storage, SMS, and sub agents. No setup fee.',
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
