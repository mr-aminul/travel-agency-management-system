import type { PlanTemplate } from '@/types/billing'
import type { ModuleId } from '@/types/tenant'

const ALL_SERVICES: ModuleId[] = [
  'services.touristVisa',
  'services.studentVisa',
  'services.workPermitVisa',
  'services.hajjUmrahVisa',
  'services.medicalVisa',
  'services.airTicket',
  'services.hotelBooking',
  'services.tourPackage',
]

/** Client-side mirror of seeded plan_templates (offline / marketing). */
export const PLAN_CATALOG: PlanTemplate[] = [
  {
    id: 'test',
    name: 'Test',
    description:
      'Zero-taka plan for payment gateway testing. Not for production agencies.',
    sortOrder: 5,
    priceBdt: 0,
    currency: 'BDT',
    interval: 'month',
    userLimit: 20,
    subAgentLimit: 30,
    storageLimitBytes: 40 * 1024 ** 3,
    smsLimit: 2000,
    smsOverageBdt: 0.4,
    modules: ['finance', 'documents', 'subAgents', ...ALL_SERVICES],
    features: { label: 'Test', isTest: true },
    isPublic: true,
    isActive: true,
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'For a small agency running its own files.',
    sortOrder: 10,
    priceBdt: 3000,
    currency: 'BDT',
    interval: 'month',
    userLimit: 5,
    subAgentLimit: 0,
    storageLimitBytes: 10 * 1024 ** 3,
    smsLimit: 300,
    smsOverageBdt: 0.5,
    modules: ['finance', 'documents', ...ALL_SERVICES],
    features: { label: 'Starter' },
    isPublic: true,
    isActive: true,
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'For agencies that scale through a referral network.',
    sortOrder: 20,
    priceBdt: 6500,
    currency: 'BDT',
    interval: 'month',
    userLimit: 20,
    subAgentLimit: 30,
    storageLimitBytes: 40 * 1024 ** 3,
    smsLimit: 2000,
    smsOverageBdt: 0.4,
    modules: ['finance', 'documents', 'subAgents', ...ALL_SERVICES],
    features: { label: 'Growth', includesSubAgents: true },
    isPublic: true,
    isActive: true,
  },
  {
    id: 'business',
    name: 'Business',
    description: 'For agencies running people and ops as one system.',
    sortOrder: 30,
    priceBdt: 14000,
    currency: 'BDT',
    interval: 'month',
    userLimit: 60,
    subAgentLimit: 100,
    storageLimitBytes: 100 * 1024 ** 3,
    smsLimit: 8000,
    smsOverageBdt: 0.3,
    modules: ['finance', 'documents', 'subAgents', 'hr', ...ALL_SERVICES],
    features: {
      label: 'Business',
      includesSubAgents: true,
      includesHr: true,
    },
    isPublic: true,
    isActive: true,
  },
]

export const TRIAL_PLAN_ID = 'growth'
export const TRIAL_DAYS = 14

export function planHighlights(plan: PlanTemplate): string[] {
  const lines = [
    `${plan.userLimit} users`,
    plan.subAgentLimit > 0
      ? `${plan.subAgentLimit} sub agents`
      : 'No sub agents',
    `${Math.round(plan.storageLimitBytes / 1024 ** 3)} GB storage`,
    `${plan.smsLimit.toLocaleString('en-BD')} SMS / month`,
  ]
  if (plan.modules.includes('hr')) lines.push('HR included')
  else lines.push('Payments & documents')
  return lines
}
