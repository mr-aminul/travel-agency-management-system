/**
 * Public self-serve subscribe: create agency + owner, start Paymently checkout.
 */

import crypto from 'node:crypto'
import { createAgencyUser, loginWithPassword } from '../auth.js'
import { query } from '../db.js'
import { createCheckout } from './gateway.js'
import { getPlanTemplate, listPlanTemplates } from './plans.js'
import {
  ensureTenantBilling,
  updateBillingNotes,
} from './tenantBilling.js'

const RATE_WINDOW_MS = 15 * 60 * 1000
const RATE_MAX_PER_IP = 8
const recentByIp = new Map()

function trim(value) {
  return String(value ?? '').trim()
}

function normalizeEmail(value) {
  return trim(value).toLowerCase()
}

function slugify(name) {
  return trim(name)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function allowRate(ip) {
  const key = trim(ip) || 'unknown'
  const now = Date.now()
  const prior = (recentByIp.get(key) || []).filter(
    (ts) => now - ts < RATE_WINDOW_MS,
  )
  if (prior.length >= RATE_MAX_PER_IP) {
    recentByIp.set(key, prior)
    return false
  }
  prior.push(now)
  recentByIp.set(key, prior)
  return true
}

async function readKvArray(key) {
  const result = await query(
    `select value from platform.kv_store where key = $1`,
    [key],
  )
  const value = result.rows[0]?.value
  return Array.isArray(value) ? value : []
}

async function writeKv(key, value) {
  await query(
    `insert into platform.kv_store (key, value, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (key) do update set
       value = excluded.value,
       updated_at = now()`,
    [key, JSON.stringify(value)],
  )
}

async function readKvObject(key) {
  const result = await query(
    `select value from platform.kv_store where key = $1`,
    [key],
  )
  const value = result.rows[0]?.value
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}

function uniqueSlug(base, existing) {
  const root = base || `agency-${crypto.randomBytes(3).toString('hex')}`
  const taken = new Set(
    existing
      .map((t) => String(t?.slug || '').toLowerCase())
      .filter(Boolean),
  )
  if (!taken.has(root)) return root
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${root}-${i}`
    if (!taken.has(candidate)) return candidate
  }
  return `${root}-${crypto.randomBytes(3).toString('hex')}`
}

export async function listPublicCheckoutPlans() {
  const plans = await listPlanTemplates({ publicOnly: true })
  return plans.filter((plan) => !plan.features?.isTest)
}

export function isPublicCheckoutPlan(plan) {
  if (!plan || !plan.isPublic || plan.isActive === false) return false
  if (plan.features?.isTest) return false
  return true
}

/**
 * @param {{
 *   agencyName: string,
 *   ownerName: string,
 *   ownerEmail: string,
 *   ownerPassword: string,
 *   planId: string,
 *   returnUrl?: string,
 *   clientIp?: string,
 * }} input
 */
export async function createSelfServeSubscription(input) {
  if (!allowRate(input.clientIp)) {
    return {
      ok: false,
      status: 429,
      error: 'Too many signup attempts. Try again in a few minutes.',
    }
  }

  const agencyName = trim(input.agencyName)
  const ownerName = trim(input.ownerName)
  const ownerEmail = normalizeEmail(input.ownerEmail)
  const ownerPassword = String(input.ownerPassword ?? '')
  const planId = trim(input.planId)

  if (!agencyName || agencyName.length < 2) {
    return { ok: false, status: 400, error: 'Agency name is required.' }
  }
  if (!ownerName) {
    return { ok: false, status: 400, error: 'Owner name is required.' }
  }
  if (!ownerEmail || !ownerEmail.includes('@')) {
    return { ok: false, status: 400, error: 'A valid owner email is required.' }
  }
  if (!ownerPassword || ownerPassword.length < 8) {
    return {
      ok: false,
      status: 400,
      error: 'Password must be at least 8 characters.',
    }
  }
  if (!planId) {
    return { ok: false, status: 400, error: 'Choose a plan.' }
  }

  const plan = await getPlanTemplate(planId)
  if (!isPublicCheckoutPlan(plan)) {
    return {
      ok: false,
      status: 404,
      error: 'That plan is not available for online signup.',
    }
  }

  const emailExists = await query(
    `select id from platform.users where lower(email) = $1 limit 1`,
    [ownerEmail],
  )
  if (emailExists.rows[0]) {
    return {
      ok: false,
      status: 409,
      error: 'An account with this email already exists. Sign in instead.',
    }
  }

  const tenants = await readKvArray('pd-tenants-created')
  const tenantId = `tenant-${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`
  const slug = uniqueSlug(slugify(agencyName), tenants)
  const tenant = {
    id: tenantId,
    slug,
    name: agencyName,
    status: 'trial',
    enabledModules: [],
  }

  await writeKv('pd-tenants-created', [tenant, ...tenants])

  const userResult = await createAgencyUser({
    email: ownerEmail,
    name: ownerName,
    password: ownerPassword,
    tenantId,
    memberRole: 'owner',
    role: 'agency_user',
  })
  if (!userResult.ok) {
    await writeKv(
      'pd-tenants-created',
      tenants.filter((t) => t?.id !== tenantId),
    )
    return userResult
  }

  const members = await readKvArray('pd-tenant-members-created')
  const member = {
    id: userResult.body.user.id,
    tenantId,
    name: ownerName,
    email: ownerEmail,
    role: 'owner',
    status: 'active',
  }
  await writeKv('pd-tenant-members-created', [member, ...members])

  const profiles = await readKvObject('pd-agency-profiles')
  profiles[tenantId] = {
    ...(profiles[tenantId] && typeof profiles[tenantId] === 'object'
      ? profiles[tenantId]
      : {}),
    businessName: agencyName,
  }
  await writeKv('pd-agency-profiles', profiles)

  await ensureTenantBilling(tenantId)
  await updateBillingNotes(
    tenantId,
    `Self-serve signup · selected ${plan.name} (${plan.id}) · ${ownerEmail}`,
  )

  const checkout = await createCheckout({
    tenantId,
    planId: plan.id,
    returnUrl: trim(input.returnUrl) || undefined,
    customer: {
      fullName: ownerName,
      email: ownerEmail,
    },
    description: `Self-serve · ${plan.name} · ${agencyName}`,
  })

  const session = await loginWithPassword(ownerEmail, ownerPassword)
  const sessionBody = session.ok
    ? session.body
    : {
        accessToken: null,
        tenantId,
        user: userResult.body.user,
        signedInAt: new Date().toISOString(),
      }

  // Agency + owner are already stored for admin. If Paymently is down, still
  // return a session so the owner can open Billing and retry pay online.
  if (!checkout.ok) {
    return {
      ok: true,
      status: 201,
      body: {
        ...sessionBody,
        tenant,
        plan,
        invoice: null,
        redirectUrl: null,
        activated: false,
        mode: 'manual',
        checkoutError: checkout.error,
      },
    }
  }

  return {
    ok: true,
    status: 201,
    body: {
      ...sessionBody,
      tenant,
      plan,
      invoice: checkout.invoice,
      redirectUrl: checkout.redirectUrl,
      activated: Boolean(checkout.activated),
      mode: checkout.mode,
      instructions: checkout.instructions,
    },
  }
}
