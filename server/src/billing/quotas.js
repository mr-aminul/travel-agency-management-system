import { query } from '../db.js'
import { getPlanTemplate } from './plans.js'
import { ensureTenantBilling, getTenantBilling } from './tenantBilling.js'

function currentPeriodKey(date = new Date()) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${y}${m}`
}

async function countActiveUsers(tenantId) {
  const result = await query(
    `select count(*)::int as n
     from platform.users
     where tenant_id = $1
       and role = 'agency_user'
       and status = 'active'`,
    [tenantId],
  )
  return Number(result.rows[0]?.n ?? 0)
}

async function countPendingInvites(tenantId) {
  const result = await query(
    `select count(*)::int as n
     from platform.invites
     where tenant_id = $1
       and accepted_at is null
       and expires_at > now()
       and coalesce(sub_agent_id, '') = ''`,
    [tenantId],
  )
  return Number(result.rows[0]?.n ?? 0)
}

async function countSubAgents(tenantId) {
  const result = await query(
    `select value from platform.kv_store where key = 'pd-sub-agents-created'`,
  )
  const list = Array.isArray(result.rows[0]?.value) ? result.rows[0].value : []
  return list.filter(
    (item) =>
      item &&
      typeof item === 'object' &&
      item.tenantId === tenantId &&
      item.archivedAt == null &&
      item.deletedAt == null,
  ).length
}

async function sumStorageBytes(tenantId) {
  const result = await query(
    `select coalesce(sum(size_bytes), 0)::bigint as n
     from platform.files where tenant_id = $1`,
    [tenantId],
  )
  return Number(result.rows[0]?.n ?? 0)
}

async function smsSentThisMonth(tenantId) {
  const period = currentPeriodKey()
  try {
    const result = await query(
      `select sent_count from platform.sms_usage
       where tenant_id = $1 and period_yyyymm = $2`,
      [tenantId, period],
    )
    return Number(result.rows[0]?.sent_count ?? 0)
  } catch {
    return 0
  }
}

export async function incrementSmsUsage(tenantId, by = 1) {
  const period = currentPeriodKey()
  await query(
    `insert into platform.sms_usage (tenant_id, period_yyyymm, sent_count, updated_at)
     values ($1, $2, $3, now())
     on conflict (tenant_id, period_yyyymm) do update
       set sent_count = platform.sms_usage.sent_count + $3,
           updated_at = now()`,
    [tenantId, period, Math.max(1, Number(by) || 1)],
  )
}

function effectiveLimits(billing, plan) {
  return {
    userLimit: billing?.userLimit ?? plan?.userLimit ?? 0,
    subAgentLimit: billing?.subAgentLimit ?? plan?.subAgentLimit ?? 0,
    storageLimitBytes:
      billing?.storageLimitBytes ?? plan?.storageLimitBytes ?? 0,
    smsLimit: billing?.smsLimit ?? plan?.smsLimit ?? 0,
    smsOverageBdt: billing?.smsOverageBdt ?? plan?.smsOverageBdt ?? 0,
  }
}

function usageTone(used, limit) {
  if (limit <= 0) return used > 0 ? 'full' : 'ok'
  const ratio = used / limit
  if (ratio >= 1) return 'full'
  if (ratio >= 0.85) return 'warn'
  return 'ok'
}

export async function getUsageSnapshot(tenantId) {
  const id = String(tenantId ?? '').trim()
  const billing = await ensureTenantBilling(id)
  const plan = billing?.planId
    ? await getPlanTemplate(billing.planId)
    : null
  const limits = effectiveLimits(billing, plan)
  const [users, pendingInvites, subAgents, storageBytes, smsSent] =
    await Promise.all([
      countActiveUsers(id),
      countPendingInvites(id),
      countSubAgents(id),
      sumStorageBytes(id),
      smsSentThisMonth(id),
    ])

  return {
    tenantId: id,
    billing,
    plan,
    limits,
    usage: {
      users,
      pendingInvites,
      seatCommit: users + pendingInvites,
      subAgents,
      storageBytes,
      smsSent,
      smsPeriod: currentPeriodKey(),
    },
    tones: {
      users: usageTone(users + pendingInvites, limits.userLimit),
      subAgents: usageTone(subAgents, limits.subAgentLimit),
      storage: usageTone(storageBytes, limits.storageLimitBytes),
      sms: usageTone(smsSent, limits.smsLimit),
    },
  }
}

export async function assertCanAddUser(tenantId) {
  const snap = await getUsageSnapshot(tenantId)
  const { limits, usage } = snap
  if (usage.seatCommit >= limits.userLimit) {
    return {
      ok: false,
      status: 402,
      code: 'seat_limit',
      error: `User limit reached (${limits.userLimit}). Upgrade your plan to invite more people.`,
      snapshot: snap,
    }
  }
  return { ok: true, snapshot: snap }
}

export async function assertCanAddSubAgent(tenantId) {
  const snap = await getUsageSnapshot(tenantId)
  const { limits, usage } = snap
  if (limits.subAgentLimit <= 0) {
    return {
      ok: false,
      status: 402,
      code: 'sub_agent_not_in_plan',
      error: 'Sub agents are not included in your plan. Upgrade to Growth or Business.',
      snapshot: snap,
    }
  }
  if (usage.subAgents >= limits.subAgentLimit) {
    return {
      ok: false,
      status: 402,
      code: 'sub_agent_limit',
      error: `Sub agent limit reached (${limits.subAgentLimit}). Upgrade or remove inactive sub agents.`,
      snapshot: snap,
    }
  }
  return { ok: true, snapshot: snap }
}

export async function assertCanUpload(tenantId, incomingBytes = 0) {
  const snap = await getUsageSnapshot(tenantId)
  const { limits, usage } = snap
  const next = usage.storageBytes + Math.max(0, Number(incomingBytes) || 0)
  if (next > limits.storageLimitBytes) {
    return {
      ok: false,
      status: 402,
      code: 'storage_limit',
      error: 'Storage limit reached. Free space or upgrade your plan.',
      snapshot: snap,
    }
  }
  return { ok: true, snapshot: snap }
}

export async function assertCanSendSms(tenantId) {
  const snap = await getUsageSnapshot(tenantId)
  const { limits, usage } = snap
  // Soft allow overage when overage rate is set; hard block when rate is 0 and at cap.
  if (usage.smsSent >= limits.smsLimit && Number(limits.smsOverageBdt) <= 0) {
    return {
      ok: false,
      status: 402,
      code: 'sms_limit',
      error: 'Monthly SMS limit reached. Upgrade your plan for more messages.',
      snapshot: snap,
    }
  }
  return {
    ok: true,
    snapshot: snap,
    overage: usage.smsSent >= limits.smsLimit,
  }
}

export async function getTenantBillingOrEnsure(tenantId) {
  return (await getTenantBilling(tenantId)) || ensureTenantBilling(tenantId)
}
