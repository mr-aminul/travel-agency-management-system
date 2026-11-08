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
    title: 'Tourist files in one board',
    detail:
      'See every tourist case by stage. Keep passports, payments, and embassy status together.',
    vignette: 'board' as const,
  },
  {
    id: 'student',
    label: 'Student visa',
    title: 'Student docs without the chase',
    detail:
      'Track which papers are in, what is missing, and what the client still owes.',
    vignette: 'documents' as const,
  },
  {
    id: 'work',
    label: 'Work permit',
    title: 'Work files from intake to decision',
    detail:
      'Move each work permit through your stages and share status without long WhatsApp threads.',
    vignette: 'tracking' as const,
  },
  {
    id: 'hajj',
    label: 'Hajj & Umrah',
    title: 'Package payments in one place',
    detail:
      'See advance, balance, and due amounts next to each Hajj or Umrah file.',
    vignette: 'invoice' as const,
  },
  {
    id: 'tickets',
    label: 'Tickets & hotels',
    title: 'Tickets and bookings on the same desk',
    detail:
      'Run air tickets, hotels, and tours beside your visa files instead of in a separate sheet.',
    vignette: 'sms' as const,
  },
  {
    id: 'network',
    label: 'Sub agents',
    title: 'Grow through your referral network',
    detail:
      'Let sub agents send clients and follow progress on Growth and Business plans.',
    vignette: 'subAgents' as const,
  },
] as const

export const LANDING_FEATURES = [
  {
    title: 'See every file at a glance',
    detail: 'One board for tourist, student, work, Hajj, tickets, and more.',
    peek: 'board' as const,
    isPrimary: true,
  },
  {
    title: 'Collect what is still due',
    detail: 'Advance, balance, and due amount on the same file.',
    peek: 'pay' as const,
    isPrimary: false,
  },
  {
    title: 'Let clients check themselves',
    detail: 'Share a tracking link instead of answering the same call twice.',
    peek: 'track' as const,
    isPrimary: false,
  },
] as const

export const LANDING_CUSTOMIZATIONS = [
  {
    title: 'Any services you sell',
    icon: 'services' as const,
  },
  {
    title: 'Stages you define',
    icon: 'stages' as const,
  },
  {
    title: 'Checklists you set',
    icon: 'docs' as const,
  },
  {
    title: 'Fields you need',
    icon: 'fields' as const,
  },
] as const

export const LANDING_SWITCH_STEPS = [
  {
    number: '01',
    title: 'Create your agency',
    detail: 'Name the desk, invite the team, set stages.',
    icon: 'agency' as const,
  },
  {
    number: '02',
    title: 'Add client files',
    detail: 'Passport, payment, and status on one board.',
    icon: 'files' as const,
  },
  {
    number: '03',
    title: 'Share a tracking link',
    detail: 'Clients check themselves. You get fewer calls.',
    icon: 'link' as const,
  },
] as const

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
      'You get full use of the plan you pick for 14 days, so you can try real work before you pay.',
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
