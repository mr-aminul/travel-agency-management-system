import { query } from '../db.js'
import { syncTenantModules, syncTenantStatus } from './entitlements.js'
import {
  getPlanTemplate,
  periodEndFromNow,
  trialEndsAtFromNow,
  TRIAL_PLAN_ID,
  UAT_FORCE_TEST_PLAN,
  UAT_PLAN_ID,
} from './plans.js'

function mapBillingRow(row) {
  if (!row) return null
  return {
    tenantId: row.tenant_id,
    planId: row.plan_id,
    billingStatus: row.billing_status,
    planKind: row.plan_kind,
    trialEndsAt: row.trial_ends_at
      ? new Date(row.trial_ends_at).toISOString()
      : null,
    currentPeriodEnd: row.current_period_end
      ? new Date(row.current_period_end).toISOString()
      : null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    userLimit:
      row.user_limit == null ? null : Number(row.user_limit),
    subAgentLimit:
      row.sub_agent_limit == null ? null : Number(row.sub_agent_limit),
    storageLimitBytes:
      row.storage_limit_bytes == null
        ? null
        : Number(row.storage_limit_bytes),
    smsLimit: row.sms_limit == null ? null : Number(row.sms_limit),
    smsOverageBdt:
      row.sms_overage_bdt == null ? null : Number(row.sms_overage_bdt),
    /** Platform admin allow switch. Missing column / null → treated as on. */
    smsEnabled: row.sms_enabled !== false,
    /** Agency preference. Only effective when smsEnabled is on. */
    agencySmsEnabled: row.agency_sms_enabled !== false,
    /** Platform admin allow switch for email. */
    emailEnabled: row.email_enabled !== false,
    /** Agency email preference. Only effective when emailEnabled is on. */
    agencyEmailEnabled: row.agency_email_enabled !== false,
    gatewayCustomerId: row.gateway_customer_id || null,
    gatewaySubscriptionId: row.gateway_subscription_id || null,
    billingNotes: row.billing_notes || '',
    createdAt: row.created_at
      ? new Date(row.created_at).toISOString()
      : null,
    updatedAt: row.updated_at
      ? new Date(row.updated_at).toISOString()
      : null,
  }
}

export function isTrialExpired(billing) {
  if (!billing) return false
  if (billing.billingStatus !== 'trial' && billing.planKind !== 'trial') {
    return false
  }
  if (!billing.trialEndsAt) return false
  return new Date(billing.trialEndsAt).getTime() <= Date.now()
}

/** Access rules: active + past_due + live trial allowed; expired trial / suspended / canceled blocked. */
export function resolveAccess(billing) {
  if (!billing) {
    return {
      allowed: true,
      reason: 'unprovisioned',
      wall: null,
    }
  }
  if (billing.billingStatus === 'suspended') {
    return { allowed: false, reason: 'suspended', wall: 'suspended' }
  }
  if (billing.billingStatus === 'canceled') {
    return { allowed: false, reason: 'canceled', wall: 'expired' }
  }
  if (billing.billingStatus === 'past_due') {
    return { allowed: true, reason: 'past_due', wall: null, grace: true }
  }
  if (billing.billingStatus === 'active' || billing.planKind === 'comp') {
    return { allowed: true, reason: 'active', wall: null }
  }
  if (billing.billingStatus === 'trial' || billing.planKind === 'trial') {
    if (isTrialExpired(billing)) {
      return { allowed: false, reason: 'trial_expired', wall: 'expired' }
    }
    return { allowed: true, reason: 'trial', wall: null }
  }
  return { allowed: false, reason: 'unknown', wall: 'expired' }
}

export async function getTenantBilling(tenantId) {
  const id = String(tenantId ?? '').trim()
  if (!id) return null
  try {
    const result = await query(
      `select * from platform.tenant_billing where tenant_id = $1 limit 1`,
      [id],
    )
    return mapBillingRow(result.rows[0])
  } catch {
    return null
  }
}

export async function ensureTenantBilling(tenantId, { startTrial = true } = {}) {
  const id = String(tenantId ?? '').trim()
  if (!id) return null
  const existing = await getTenantBilling(id)
  if (existing) return existing
  if (!startTrial) return null

  // UAT: new agencies land on Test/comp (no trial expiry). Flip UAT_FORCE_TEST_PLAN off later.
  if (UAT_FORCE_TEST_PLAN) {
    const applied = await applyPlanToTenant({
      tenantId: id,
      planId: UAT_PLAN_ID,
      billingStatus: 'active',
      planKind: 'comp',
      currentPeriodEnd: periodEndFromNow('year'),
      syncModules: true,
    })
    return applied.billing ?? getTenantBilling(id)
  }

  const plan = await getPlanTemplate(TRIAL_PLAN_ID)
  const trialEnds = trialEndsAtFromNow()
  await query(
    `insert into platform.tenant_billing (
       tenant_id, plan_id, billing_status, plan_kind, trial_ends_at,
       user_limit, sub_agent_limit, storage_limit_bytes, sms_limit, sms_overage_bdt,
       created_at, updated_at
     ) values ($1, $2, 'trial', 'trial', $3, $4, $5, $6, $7, $8, now(), now())
     on conflict (tenant_id) do nothing`,
    [
      id,
      plan?.id ?? TRIAL_PLAN_ID,
      trialEnds.toISOString(),
      plan?.userLimit ?? 20,
      plan?.subAgentLimit ?? 30,
      plan?.storageLimitBytes ?? 40 * 1024 ** 3,
      plan?.smsLimit ?? 2000,
      plan?.smsOverageBdt ?? 0.4,
    ],
  )
  if (plan?.modules?.length) {
    await syncTenantModules(id, plan.modules)
  }
  await syncTenantStatus(id, 'trial')
  return getTenantBilling(id)
}

export async function applyPlanToTenant({
  tenantId,
  planId,
  billingStatus = 'active',
  planKind = 'standard',
  trialEndsAt = null,
  currentPeriodEnd = null,
  cancelAtPeriodEnd = false,
  overrides = {},
  gatewayCustomerId,
  gatewaySubscriptionId,
  syncModules = true,
}) {
  const id = String(tenantId ?? '').trim()
  const plan = await getPlanTemplate(planId)
  if (!id || !plan) {
    return { ok: false, status: 400, error: 'Plan or agency is required.' }
  }

  const periodEnd =
    currentPeriodEnd ||
    (billingStatus === 'active'
      ? periodEndFromNow(plan.interval)
      : null)

  const userLimit = overrides.userLimit ?? plan.userLimit
  const subAgentLimit = overrides.subAgentLimit ?? plan.subAgentLimit
  const storageLimitBytes =
    overrides.storageLimitBytes ?? plan.storageLimitBytes
  const smsLimit = overrides.smsLimit ?? plan.smsLimit
  const smsOverageBdt = overrides.smsOverageBdt ?? plan.smsOverageBdt

  await query(
    `insert into platform.tenant_billing (
       tenant_id, plan_id, billing_status, plan_kind, trial_ends_at,
       current_period_end, cancel_at_period_end,
       user_limit, sub_agent_limit, storage_limit_bytes, sms_limit, sms_overage_bdt,
       gateway_customer_id, gateway_subscription_id, updated_at, created_at
     ) values (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now(), now()
     )
     on conflict (tenant_id) do update set
       plan_id = excluded.plan_id,
       billing_status = excluded.billing_status,
       plan_kind = excluded.plan_kind,
       trial_ends_at = excluded.trial_ends_at,
       current_period_end = excluded.current_period_end,
       cancel_at_period_end = excluded.cancel_at_period_end,
       user_limit = excluded.user_limit,
       sub_agent_limit = excluded.sub_agent_limit,
       storage_limit_bytes = excluded.storage_limit_bytes,
       sms_limit = excluded.sms_limit,
       sms_overage_bdt = excluded.sms_overage_bdt,
       gateway_customer_id = coalesce(excluded.gateway_customer_id, platform.tenant_billing.gateway_customer_id),
       gateway_subscription_id = coalesce(excluded.gateway_subscription_id, platform.tenant_billing.gateway_subscription_id),
       updated_at = now()`,
    [
      id,
      plan.id,
      billingStatus,
      planKind,
      trialEndsAt,
      periodEnd ? new Date(periodEnd).toISOString() : null,
      Boolean(cancelAtPeriodEnd),
      userLimit,
      subAgentLimit,
      storageLimitBytes,
      smsLimit,
      smsOverageBdt,
      gatewayCustomerId || null,
      gatewaySubscriptionId || null,
    ],
  )

  if (syncModules) {
    await syncTenantModules(id, plan.modules)
  }

  const tenantStatus =
    billingStatus === 'suspended'
      ? 'suspended'
      : billingStatus === 'trial'
        ? 'trial'
        : 'active'
  await syncTenantStatus(id, tenantStatus)

  return { ok: true, billing: await getTenantBilling(id), plan }
}

export async function startTrialForTenant(tenantId, { days } = {}) {
  const plan = await getPlanTemplate(TRIAL_PLAN_ID)
  const ends = trialEndsAtFromNow(days)
  return applyPlanToTenant({
    tenantId,
    planId: plan?.id ?? TRIAL_PLAN_ID,
    billingStatus: 'trial',
    planKind: 'trial',
    trialEndsAt: ends.toISOString(),
    currentPeriodEnd: null,
  })
}

export async function setBillingStatus(tenantId, billingStatus, extras = {}) {
  const id = String(tenantId ?? '').trim()
  if (!id) return { ok: false, status: 400, error: 'Agency required.' }
  await ensureTenantBilling(id, { startTrial: false })
  await query(
    `update platform.tenant_billing
     set billing_status = $2,
         billing_notes = coalesce($3, billing_notes),
         cancel_at_period_end = coalesce($4, cancel_at_period_end),
         updated_at = now()
     where tenant_id = $1`,
    [
      id,
      billingStatus,
      extras.billingNotes ?? null,
      extras.cancelAtPeriodEnd ?? null,
    ],
  )
  const tenantStatus =
    billingStatus === 'suspended'
      ? 'suspended'
      : billingStatus === 'trial'
        ? 'trial'
        : 'active'
  await syncTenantStatus(id, tenantStatus)
  return { ok: true, billing: await getTenantBilling(id) }
}

export async function updateBillingNotes(tenantId, notes) {
  const id = String(tenantId ?? '').trim()
  await query(
    `insert into platform.tenant_billing (tenant_id, billing_notes, updated_at, created_at)
     values ($1, $2, now(), now())
     on conflict (tenant_id) do update
       set billing_notes = excluded.billing_notes, updated_at = now()`,
    [id, String(notes ?? '')],
  )
  return getTenantBilling(id)
}

/** Turn SMS allow on/off for one agency (platform admin). */
export async function setTenantSmsEnabled(tenantId, enabled) {
  const id = String(tenantId ?? '').trim()
  if (!id) return { ok: false, status: 400, error: 'Agency required.' }
  await ensureTenantBilling(id, { startTrial: false })
  const next = Boolean(enabled)
  await query(
    `insert into platform.tenant_billing (tenant_id, sms_enabled, updated_at, created_at)
     values ($1, $2, now(), now())
     on conflict (tenant_id) do update
       set sms_enabled = excluded.sms_enabled, updated_at = now()`,
    [id, next],
  )
  return { ok: true, billing: await getTenantBilling(id) }
}

/**
 * Agency opts SMS on/off for themselves.
 * Turning on is blocked when the platform admin has disallowed SMS.
 */
export async function setAgencySmsEnabled(tenantId, enabled) {
  const id = String(tenantId ?? '').trim()
  if (!id) return { ok: false, status: 400, error: 'Agency required.' }
  const billing = await ensureTenantBilling(id)
  if (!billing) {
    return { ok: false, status: 404, error: 'Billing not found for this agency.' }
  }
  const next = Boolean(enabled)
  if (next && billing.smsEnabled === false) {
    return {
      ok: false,
      status: 403,
      error:
        'SMS is turned off by the platform. Contact support if you need it back on.',
    }
  }
  await query(
    `update platform.tenant_billing
     set agency_sms_enabled = $2, updated_at = now()
     where tenant_id = $1`,
    [id, next],
  )
  return { ok: true, billing: await getTenantBilling(id) }
}

/** Turn email allow on/off for one agency (platform admin). */
export async function setTenantEmailEnabled(tenantId, enabled) {
  const id = String(tenantId ?? '').trim()
  if (!id) return { ok: false, status: 400, error: 'Agency required.' }
  await ensureTenantBilling(id, { startTrial: false })
  const next = Boolean(enabled)
  await query(
    `insert into platform.tenant_billing (tenant_id, email_enabled, updated_at, created_at)
     values ($1, $2, now(), now())
     on conflict (tenant_id) do update
       set email_enabled = excluded.email_enabled, updated_at = now()`,
    [id, next],
  )
  return { ok: true, billing: await getTenantBilling(id) }
}

/**
 * Agency opts email on/off for themselves.
 * Turning on is blocked when the platform admin has disallowed email.
 */
export async function setAgencyEmailEnabled(tenantId, enabled) {
  const id = String(tenantId ?? '').trim()
  if (!id) return { ok: false, status: 400, error: 'Agency required.' }
  const billing = await ensureTenantBilling(id)
  if (!billing) {
    return { ok: false, status: 404, error: 'Billing not found for this agency.' }
  }
  const next = Boolean(enabled)
  if (next && billing.emailEnabled === false) {
    return {
      ok: false,
      status: 403,
      error:
        'Email is turned off by the platform. Contact support if you need it back on.',
    }
  }
  await query(
    `update platform.tenant_billing
     set agency_email_enabled = $2, updated_at = now()
     where tenant_id = $1`,
    [id, next],
  )
  return { ok: true, billing: await getTenantBilling(id) }
}

export async function extendTrial(tenantId, days = 14) {
  const billing = await ensureTenantBilling(tenantId)
  const base =
    billing?.trialEndsAt && new Date(billing.trialEndsAt) > new Date()
      ? new Date(billing.trialEndsAt)
      : new Date()
  base.setDate(base.getDate() + Number(days || 14))
  return applyPlanToTenant({
    tenantId,
    planId: billing?.planId || TRIAL_PLAN_ID,
    billingStatus: 'trial',
    planKind: 'trial',
    trialEndsAt: base.toISOString(),
    overrides: {
      userLimit: billing?.userLimit,
      subAgentLimit: billing?.subAgentLimit,
      storageLimitBytes: billing?.storageLimitBytes,
      smsLimit: billing?.smsLimit,
      smsOverageBdt: billing?.smsOverageBdt,
    },
  })
}

export async function listTenantBillingSummaries() {
  try {
    const result = await query(
      `select b.*, p.name as plan_name, p.price_bdt
       from platform.tenant_billing b
       left join platform.plan_templates p on p.id = b.plan_id
       order by b.updated_at desc
       limit 500`,
    )
    return result.rows.map((row) => ({
      ...mapBillingRow(row),
      planName: row.plan_name || null,
      priceBdt: row.price_bdt == null ? null : Number(row.price_bdt),
    }))
  } catch {
    return []
  }
}

export async function bootstrapDemoTenantBilling() {
  // Only tenants already in the catalog / billing table — no hard-coded demo ids.
  const candidates = new Set()
  try {
    const created = await query(
      `select value from platform.kv_store where key = 'pd-tenants-created'`,
    )
    const list = Array.isArray(created.rows[0]?.value)
      ? created.rows[0].value
      : []
    for (const tenant of list) {
      if (tenant?.id) candidates.add(String(tenant.id))
    }
  } catch {
    /* ignore */
  }

  try {
    const billed = await query(`select tenant_id from platform.tenant_billing`)
    for (const row of billed.rows) {
      if (row?.tenant_id) candidates.add(String(row.tenant_id))
    }
  } catch {
    /* ignore */
  }

  for (const tenantId of candidates) {
    const existing = await getTenantBilling(tenantId)

    if (UAT_FORCE_TEST_PLAN) {
      // UAT: every agency on Test/comp — no trial walls for first clients.
      if (
        existing?.planId === UAT_PLAN_ID &&
        existing.billingStatus === 'active' &&
        existing.planKind === 'comp'
      ) {
        continue
      }
      await applyPlanToTenant({
        tenantId,
        planId: UAT_PLAN_ID,
        billingStatus: 'active',
        planKind: 'comp',
        currentPeriodEnd: periodEndFromNow('year'),
        syncModules: !existing,
      })
      continue
    }

    if (existing) continue
    await applyPlanToTenant({
      tenantId,
      planId: 'business',
      billingStatus: 'active',
      planKind: 'comp',
      currentPeriodEnd: periodEndFromNow('year'),
      syncModules: false,
    })
  }
}
