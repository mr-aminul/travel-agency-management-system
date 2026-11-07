import {
  JOURNEY_STOPS,
  PRICING_PLANS,
  SALES_EMAIL,
  SERVICE_TYPES,
  type PricingPerkIcon,
  type PricingPlan,
} from '@/components/landing/landingContent'

export {
  JOURNEY_STOPS,
  PRICING_PLANS,
  SALES_EMAIL,
  SERVICE_TYPES,
  type PricingPerkIcon,
  type PricingPlan,
}

export const SALES_MAILTO = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent('OneTrack — talk to Inventive Lab')}`

export const V2_AUDIENCES = [
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

export const V2_FEATURES = [
  {
    title: 'See every file at a glance',
    peek: 'board' as const,
  },
  {
    title: 'Collect what is still due',
    peek: 'pay' as const,
  },
  {
    title: 'Let clients check themselves',
    peek: 'track' as const,
  },
] as const

export const V2_CUSTOMIZATIONS = [
  {
    title: 'Your own services',
    detail: 'Add the lines you sell. Keep or hide the built-in ones.',
    icon: 'services' as const,
  },
  {
    title: 'Stages your way',
    detail: 'Rename and reorder each journey. Set a different path by country.',
    icon: 'stages' as const,
  },
  {
    title: 'Document checklists',
    detail: 'Required and optional papers per service, unlocked by stage.',
    icon: 'docs' as const,
  },
  {
    title: 'Client fields',
    detail: 'Capture the profile details your desk already asks for.',
    icon: 'fields' as const,
  },
] as const

export const V2_SWITCH_STEPS = [
  {
    number: '01',
    title: 'Create your agency',
    detail: 'Invite your team. Set your stages.',
    icon: 'agency' as const,
  },
  {
    number: '02',
    title: 'Add client files',
    detail: 'Docs and payment on one record.',
    icon: 'files' as const,
  },
  {
    number: '03',
    title: 'Share a tracking link',
    detail: 'Clients check progress themselves.',
    icon: 'link' as const,
  },
] as const

export const V2_FAQS = [
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
