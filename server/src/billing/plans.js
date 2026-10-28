import { query } from '../db.js'

export const TRIAL_DAYS = 14
export const TRIAL_PLAN_ID = 'growth'

/**
 * Temporary UAT default: every agency is on Test/comp with no billing wall.
 * Set false (and re-seed defaults) when leaving UAT / going paid-enforced.
 */
export const UAT_FORCE_TEST_PLAN = true
export const UAT_PLAN_ID = 'test'

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
      'UAT / first-client plan — unrestricted while we develop. Downgrade manually when ready.',
    sortOrder: 5,
    priceBdt: 0,
    currency: 'BDT',
    interval: 'month',
    userLimit: 10000,
    subAgentLimit: 10000,
    storageLimitBytes: 1024 * 1024 ** 3,
    smsLimit: 100000,
    smsOverageBdt: 0,
    modules: ['finance', 'documents', 'subAgents', 'hr', ...ALL_SERVICE_MODULES],
    features: { label: 'Test', isTest: true, uatUnrestricted: true },
    isPublic: false,
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
    features: {
      label: 'Growth',
      includesSubAgents: true,
      isHighlighted: true,
      badge: 'Popular',
    },
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

export async function listPlanTemplates({
  publicOnly = false,
  includeInactive = false,
} = {}) {
  try {
    const result = await query(
      `select * from platform.plan_templates
       where ($1::boolean = false or is_public = true)
         and ($2::boolean = true or is_active = true)
       order by sort_order asc, name asc`,
      [publicOnly, includeInactive],
    )
    if (result.rows.length) return result.rows.map(mapPlanRow)
  } catch {
    /* table may not exist yet */
  }
  return FALLBACK_PLANS.filter((plan) => {
    if (publicOnly && !plan.isPublic) return false
    if (!includeInactive && !plan.isActive) return false
    return true
  })
}

function normalizePlanId(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseNonNegInt(value, label) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, error: `${label} must be 0 or more.` }
  }
  return { ok: true, value: Math.round(n) }
}

function parseNonNegNumber(value, label) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, error: `${label} must be 0 or more.` }
  }
  return { ok: true, value: n }
}

function normalizeModules(raw) {
  if (!Array.isArray(raw)) return null
  const cleaned = [
    ...new Set(
      raw
        .map((item) => String(item ?? '').trim())
        .filter(Boolean),
    ),
  ]
  return cleaned
}

function buildFeatures(patchFeatures, name, modules, existingFeatures = {}) {
  const base =
    existingFeatures && typeof existingFeatures === 'object'
      ? { ...existingFeatures }
      : {}
  const incoming =
    patchFeatures && typeof patchFeatures === 'object' ? patchFeatures : {}
  const next = { ...base, ...incoming }
  next.label = String(next.label ?? name ?? '').trim() || name
  if (Object.prototype.hasOwnProperty.call(incoming, 'isTest')) {
    next.isTest = Boolean(incoming.isTest)
  }
  if (Object.prototype.hasOwnProperty.call(incoming, 'isHighlighted')) {
    next.isHighlighted = Boolean(incoming.isHighlighted)
  }
  if (Object.prototype.hasOwnProperty.call(incoming, 'badge')) {
    const badge = String(incoming.badge ?? '').trim()
    if (badge) next.badge = badge
    else delete next.badge
  }
  if (Object.prototype.hasOwnProperty.call(incoming, 'ctaLabel')) {
    const cta = String(incoming.ctaLabel ?? '').trim()
    if (cta) next.ctaLabel = cta
    else delete next.ctaLabel
  }
  if (Object.prototype.hasOwnProperty.call(incoming, 'marketingBullets')) {
    const bullets = Array.isArray(incoming.marketingBullets)
      ? incoming.marketingBullets
          .map((line) => String(line ?? '').trim())
          .filter(Boolean)
      : []
    if (bullets.length) next.marketingBullets = bullets
    else delete next.marketingBullets
  }
  const moduleSet = new Set(Array.isArray(modules) ? modules : [])
  next.includesSubAgents = moduleSet.has('subAgents')
  next.includesHr = moduleSet.has('hr')
  if (!next.isTest) delete next.isTest
  return next
}

function validatePlanFields(input, { partial = false } = {}) {
  const next = {}

  if (!partial || input.name != null) {
    const name = String(input.name ?? '').trim()
    if (!name) return { ok: false, status: 400, error: 'Name is required.' }
    next.name = name
  }
  if (!partial || input.description != null) {
    next.description = String(input.description ?? '')
  }
  if (!partial || input.priceBdt != null) {
    const parsed = parseNonNegInt(input.priceBdt, 'Amount')
    if (!parsed.ok) return { ok: false, status: 400, error: parsed.error }
    next.priceBdt = parsed.value
  }
  if (!partial || input.currency != null) {
    const currency = String(input.currency ?? 'BDT').trim().toUpperCase() || 'BDT'
    next.currency = currency
  }
  if (!partial || input.interval != null) {
    const interval = String(input.interval ?? 'month').trim()
    if (interval !== 'month' && interval !== 'year') {
      return { ok: false, status: 400, error: 'Interval must be month or year.' }
    }
    next.interval = interval
  }
  if (!partial || input.userLimit != null) {
    const parsed = parseNonNegInt(input.userLimit, 'User limit')
    if (!parsed.ok) return { ok: false, status: 400, error: parsed.error }
    next.userLimit = parsed.value
  }
  if (!partial || input.subAgentLimit != null) {
    const parsed = parseNonNegInt(input.subAgentLimit, 'Sub agent limit')
    if (!parsed.ok) return { ok: false, status: 400, error: parsed.error }
    next.subAgentLimit = parsed.value
  }
  if (!partial || input.smsLimit != null) {
    const parsed = parseNonNegInt(input.smsLimit, 'SMS limit')
    if (!parsed.ok) return { ok: false, status: 400, error: parsed.error }
    next.smsLimit = parsed.value
  }
  if (!partial || input.smsOverageBdt != null) {
    const parsed = parseNonNegNumber(input.smsOverageBdt, 'SMS overage')
    if (!parsed.ok) return { ok: false, status: 400, error: parsed.error }
    next.smsOverageBdt = parsed.value
  }
  if (!partial || input.storageLimitBytes != null) {
    const parsed = parseNonNegInt(input.storageLimitBytes, 'Storage limit')
    if (!parsed.ok) return { ok: false, status: 400, error: parsed.error }
    next.storageLimitBytes = parsed.value
  }
  if (!partial || input.sortOrder != null) {
    const n = Number(input.sortOrder ?? 0)
    if (!Number.isFinite(n)) {
      return { ok: false, status: 400, error: 'Sort order invalid.' }
    }
    next.sortOrder = Math.round(n)
  }
  if (!partial || input.isPublic != null) {
    next.isPublic = input.isPublic == null ? true : Boolean(input.isPublic)
  }
  if (!partial || input.isActive != null) {
    next.isActive = input.isActive == null ? true : Boolean(input.isActive)
  }
  if (!partial || input.modules != null) {
    const modules = normalizeModules(input.modules)
    if (!modules) {
      return { ok: false, status: 400, error: 'Modules must be an array.' }
    }
    next.modules = modules
  }
  if (!partial || input.features != null) {
    next.features =
      input.features && typeof input.features === 'object'
        ? input.features
        : {}
  }

  return { ok: true, fields: next }
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

export async function createPlanTemplate(input = {}) {
  const id = normalizePlanId(input.id)
  if (!id || !/^[a-z][a-z0-9_-]{1,63}$/.test(id)) {
    return {
      ok: false,
      status: 400,
      error: 'Plan id must start with a letter and use a-z, 0-9, _ or -.',
    }
  }
  const existing = await getPlanTemplate(id)
  if (existing) {
    return { ok: false, status: 409, error: 'A plan with that id already exists.' }
  }

  const validated = validatePlanFields(
    {
      name: input.name,
      description: input.description ?? '',
      priceBdt: input.priceBdt ?? 0,
      currency: input.currency ?? 'BDT',
      interval: input.interval ?? 'month',
      userLimit: input.userLimit ?? 0,
      subAgentLimit: input.subAgentLimit ?? 0,
      storageLimitBytes: input.storageLimitBytes ?? 0,
      smsLimit: input.smsLimit ?? 0,
      smsOverageBdt: input.smsOverageBdt ?? 0,
      sortOrder: input.sortOrder ?? 100,
      isPublic: input.isPublic ?? true,
      isActive: input.isActive ?? true,
      modules: input.modules ?? ['finance', 'documents', ...ALL_SERVICE_MODULES],
      features: input.features ?? {},
    },
    { partial: false },
  )
  if (!validated.ok) return validated

  const fields = validated.fields
  fields.features = buildFeatures(
    fields.features,
    fields.name,
    fields.modules,
    {},
  )

  try {
    await query(
      `insert into platform.plan_templates (
         id, name, description, sort_order, price_bdt, currency, interval,
         user_limit, sub_agent_limit, storage_limit_bytes, sms_limit,
         sms_overage_bdt, modules, features, is_public, is_active
       ) values (
         $1, $2, $3, $4, $5, $6, $7,
         $8, $9, $10, $11,
         $12, $13::jsonb, $14::jsonb, $15, $16
       )`,
      [
        id,
        fields.name,
        fields.description,
        fields.sortOrder,
        fields.priceBdt,
        fields.currency,
        fields.interval,
        fields.userLimit,
        fields.subAgentLimit,
        fields.storageLimitBytes,
        fields.smsLimit,
        fields.smsOverageBdt,
        JSON.stringify(fields.modules),
        JSON.stringify(fields.features),
        fields.isPublic,
        fields.isActive,
      ],
    )
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Could not create plan.',
    }
  }

  return { ok: true, plan: await getPlanTemplate(id) }
}

/** Admin update for every catalog field including modules and features. */
export async function updatePlanTemplate(planId, patch = {}) {
  const id = String(planId ?? '').trim()
  if (!id) {
    return { ok: false, status: 400, error: 'Plan id required.' }
  }
  const existing = await getPlanTemplate(id)
  if (!existing) {
    return { ok: false, status: 404, error: 'Plan not found.' }
  }

  const validated = validatePlanFields(patch, { partial: true })
  if (!validated.ok) return validated

  const next = {
    name: existing.name,
    description: existing.description,
    priceBdt: existing.priceBdt,
    currency: existing.currency,
    interval: existing.interval,
    userLimit: existing.userLimit,
    subAgentLimit: existing.subAgentLimit,
    storageLimitBytes: existing.storageLimitBytes,
    smsLimit: existing.smsLimit,
    smsOverageBdt: existing.smsOverageBdt,
    isPublic: existing.isPublic,
    isActive: existing.isActive,
    sortOrder: existing.sortOrder,
    modules: existing.modules,
    features: existing.features,
    ...validated.fields,
  }

  next.features = buildFeatures(
    validated.fields.features ?? existing.features,
    next.name,
    next.modules,
    existing.features,
  )

  try {
    await query(
      `update platform.plan_templates set
         name = $2,
         description = $3,
         price_bdt = $4,
         currency = $5,
         interval = $6,
         user_limit = $7,
         sub_agent_limit = $8,
         storage_limit_bytes = $9,
         sms_limit = $10,
         sms_overage_bdt = $11,
         modules = $12::jsonb,
         features = $13::jsonb,
         is_public = $14,
         is_active = $15,
         sort_order = $16,
         updated_at = now()
       where id = $1`,
      [
        id,
        next.name,
        next.description,
        next.priceBdt,
        next.currency,
        next.interval,
        next.userLimit,
        next.subAgentLimit,
        next.storageLimitBytes,
        next.smsLimit,
        next.smsOverageBdt,
        JSON.stringify(next.modules),
        JSON.stringify(next.features),
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

export async function deletePlanTemplate(planId, { hard = false } = {}) {
  const id = String(planId ?? '').trim()
  if (!id) {
    return { ok: false, status: 400, error: 'Plan id required.' }
  }
  const existing = await getPlanTemplate(id)
  if (!existing) {
    return { ok: false, status: 404, error: 'Plan not found.' }
  }

  if (id === TRIAL_PLAN_ID) {
    return {
      ok: false,
      status: 400,
      error: 'The trial plan cannot be deleted. Deactivate it instead.',
    }
  }

  let tenantCount = 0
  try {
    const usage = await query(
      `select count(*)::int as count
       from platform.tenant_billing
       where plan_id = $1`,
      [id],
    )
    tenantCount = Number(usage.rows[0]?.count ?? 0)
  } catch {
    tenantCount = 0
  }

  if (hard) {
    if (tenantCount > 0) {
      return {
        ok: false,
        status: 409,
        error: `Cannot delete: ${tenantCount} agenc${tenantCount === 1 ? 'y' : 'ies'} still use this plan.`,
      }
    }
    try {
      await query(`delete from platform.plan_templates where id = $1`, [id])
    } catch (error) {
      return {
        ok: false,
        status: 500,
        error: error instanceof Error ? error.message : 'Could not delete plan.',
      }
    }
    return { ok: true, deleted: true, hard: true }
  }

  const deactivated = await updatePlanTemplate(id, { isActive: false })
  if (!deactivated.ok) return deactivated
  return {
    ok: true,
    deleted: false,
    hard: false,
    plan: deactivated.plan,
    tenantCount,
  }
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
