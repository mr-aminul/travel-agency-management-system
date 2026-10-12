import { query } from '../db.js'

export const TRIAL_DAYS = 14
export const TRIAL_PLAN_ID = 'growth'

const ALL_SERVICE_MODULES = [
  'services.touristVisa',
  'services.studentVisa',
  'services.workPermitVisa',
  'services.hajjUmrahVisa',
  'services.medicalVisa',
  'services.airTicket',
  'services.hotelBooking',
  'services.tourPackage',
]

/** Fallback if DB seed has not run yet. */
export const FALLBACK_PLANS = [
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
    modules: ['finance', 'documents', 'subAgents', ...ALL_SERVICE_MODULES],
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
    modules: ['finance', 'documents', ...ALL_SERVICE_MODULES],
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
    modules: ['finance', 'documents', 'subAgents', ...ALL_SERVICE_MODULES],
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
    modules: [
      'finance',
      'documents',
      'subAgents',
      'hr',
      ...ALL_SERVICE_MODULES,
    ],
    features: {
      label: 'Business',
      includesSubAgents: true,
      includesHr: true,
    },
    isPublic: true,
    isActive: true,
  },
]

function mapPlanRow(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    sortOrder: Number(row.sort_order ?? 0),
    priceBdt: Number(row.price_bdt ?? 0),
    currency: row.currency || 'BDT',
    interval: row.interval || 'month',
    userLimit: Number(row.user_limit ?? 0),
    subAgentLimit: Number(row.sub_agent_limit ?? 0),
    storageLimitBytes: Number(row.storage_limit_bytes ?? 0),
    smsLimit: Number(row.sms_limit ?? 0),
    smsOverageBdt: Number(row.sms_overage_bdt ?? 0),
    modules: Array.isArray(row.modules) ? row.modules : [],
    features:
      row.features && typeof row.features === 'object' ? row.features : {},
    isPublic: row.is_public !== false,
    isActive: row.is_active !== false,
  }
}

export async function listPlanTemplates({ publicOnly = false } = {}) {
  try {
    const result = await query(
      `select * from platform.plan_templates
       where ($1::boolean = false or is_public = true)
         and is_active = true
       order by sort_order asc, name asc`,
      [publicOnly],
    )
    if (result.rows.length) return result.rows.map(mapPlanRow)
  } catch {
    /* table may not exist yet */
  }
  return FALLBACK_PLANS.filter((plan) => (publicOnly ? plan.isPublic : true))
}

export async function getPlanTemplate(planId) {
  const id = String(planId ?? '').trim()
  if (!id) return null
  try {
    const result = await query(
      `select * from platform.plan_templates where id = $1 limit 1`,
      [id],
    )
    const mapped = mapPlanRow(result.rows[0])
    if (mapped) return mapped
  } catch {
    /* fall through */
  }
  return FALLBACK_PLANS.find((plan) => plan.id === id) ?? null
}

/**
 * Admin update for catalog amounts / visibility.
 * Only whitelisted fields — modules stay on the Product / apply-plan flows.
 */
export async function updatePlanTemplate(planId, patch = {}) {
  const id = String(planId ?? '').trim()
  if (!id) {
    return { ok: false, status: 400, error: 'Plan id required.' }
  }
  const existing = await getPlanTemplate(id)
  if (!existing) {
    return { ok: false, status: 404, error: 'Plan not found.' }
  }

  const next = {
    name: existing.name,
    description: existing.description,
    priceBdt: existing.priceBdt,
    userLimit: existing.userLimit,
    subAgentLimit: existing.subAgentLimit,
    storageLimitBytes: existing.storageLimitBytes,
    smsLimit: existing.smsLimit,
    smsOverageBdt: existing.smsOverageBdt,
    isPublic: existing.isPublic,
    isActive: existing.isActive,
    sortOrder: existing.sortOrder,
  }

  if (patch.name != null) next.name = String(patch.name).trim() || existing.name
  if (patch.description != null) {
    next.description = String(patch.description)
  }
  if (patch.priceBdt != null) {
    const n = Number(patch.priceBdt)
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, status: 400, error: 'Amount must be 0 or more.' }
    }
    next.priceBdt = Math.round(n)
  }
  if (patch.userLimit != null) {
    const n = Number(patch.userLimit)
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, status: 400, error: 'User limit invalid.' }
    }
    next.userLimit = Math.round(n)
  }
  if (patch.subAgentLimit != null) {
    const n = Number(patch.subAgentLimit)
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, status: 400, error: 'Sub agent limit invalid.' }
    }
    next.subAgentLimit = Math.round(n)
  }
  if (patch.smsLimit != null) {
    const n = Number(patch.smsLimit)
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, status: 400, error: 'SMS limit invalid.' }
    }
    next.smsLimit = Math.round(n)
  }
  if (patch.smsOverageBdt != null) {
    const n = Number(patch.smsOverageBdt)
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, status: 400, error: 'SMS overage invalid.' }
    }
    next.smsOverageBdt = n
  }
  if (patch.storageLimitBytes != null) {
    const n = Number(patch.storageLimitBytes)
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, status: 400, error: 'Storage limit invalid.' }
    }
    next.storageLimitBytes = Math.round(n)
  }
  if (patch.isPublic != null) next.isPublic = Boolean(patch.isPublic)
  if (patch.isActive != null) next.isActive = Boolean(patch.isActive)
  if (patch.sortOrder != null) {
    const n = Number(patch.sortOrder)
    if (Number.isFinite(n)) next.sortOrder = Math.round(n)
  }

  try {
    await query(
      `update platform.plan_templates set
         name = $2,
         description = $3,
         price_bdt = $4,
         user_limit = $5,
         sub_agent_limit = $6,
         storage_limit_bytes = $7,
         sms_limit = $8,
         sms_overage_bdt = $9,
         is_public = $10,
         is_active = $11,
         sort_order = $12,
         updated_at = now()
       where id = $1`,
      [
        id,
        next.name,
        next.description,
        next.priceBdt,
        next.userLimit,
        next.subAgentLimit,
        next.storageLimitBytes,
        next.smsLimit,
        next.smsOverageBdt,
        next.isPublic,
        next.isActive,
        next.sortOrder,
      ],
    )
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Could not update plan.',
    }
  }

  return { ok: true, plan: await getPlanTemplate(id) }
}

export function trialEndsAtFromNow(days = TRIAL_DAYS) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

export function periodEndFromNow(interval = 'month') {
  const end = new Date()
  if (interval === 'year') {
    end.setFullYear(end.getFullYear() + 1)
  } else {
    end.setMonth(end.getMonth() + 1)
  }
  return end
}
