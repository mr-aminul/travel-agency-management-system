import { apiFetch, ApiError } from '@/lib/apiClient'
import { authApiConfigured } from '@/lib/billing/platformFlag'
import { PLAN_CATALOG } from '@/lib/billing/planCatalog'
import type {
  BillingInvoice,
  BillingSnapshot,
  PaymentInstructions,
  PlanTemplate,
  TenantBilling,
} from '@/types/billing'

const DEFAULT_INSTRUCTIONS: PaymentInstructions = {
  mode: 'manual',
  bkash: null,
  nagad: null,
  bankName: null,
  bankAccount: null,
  bankRouting: null,
  supportEmail: 'support@inventivelab.bd',
  note: 'Pay the invoice amount, then submit your transaction ID for verification.',
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const body = error.body
    if (
      body &&
      typeof body === 'object' &&
      'error' in body &&
      typeof (body as { error: unknown }).error === 'string'
    ) {
      return (body as { error: string }).error
    }
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export async function fetchBillingPlans(): Promise<{
  plans: PlanTemplate[]
  instructions: PaymentInstructions
}> {
  if (!authApiConfigured()) {
    return { plans: PLAN_CATALOG, instructions: DEFAULT_INSTRUCTIONS }
  }
  try {
    return await apiFetch<{
      plans: PlanTemplate[]
      instructions: PaymentInstructions
    }>('/api/platform/billing/plans')
  } catch {
    return { plans: PLAN_CATALOG, instructions: DEFAULT_INSTRUCTIONS }
  }
}

export async function fetchBillingMe(
  tenantId?: string,
): Promise<BillingSnapshot> {
  if (!authApiConfigured()) {
    throw new Error('Billing requires the platform API.')
  }
  const qs = tenantId
    ? `?tenantId=${encodeURIComponent(tenantId)}`
    : ''
  return apiFetch<BillingSnapshot>(`/api/platform/billing/me${qs}`)
}

export async function fetchPublicBillingPlans(): Promise<{
  plans: PlanTemplate[]
  instructions: PaymentInstructions
}> {
  if (!authApiConfigured()) {
    return {
      plans: PLAN_CATALOG.filter((plan) => !plan.features?.isTest),
      instructions: DEFAULT_INSTRUCTIONS,
    }
  }
  try {
    return await apiFetch<{
      plans: PlanTemplate[]
      instructions: PaymentInstructions
    }>('/api/platform/public/billing/plans', { skipAuth: true })
  } catch {
    return {
      plans: PLAN_CATALOG.filter((plan) => !plan.features?.isTest),
      instructions: DEFAULT_INSTRUCTIONS,
    }
  }
}

export type PublicSubscribeInput = {
  agencyName: string
  ownerName: string
  ownerEmail: string
  ownerPassword: string
  planId: string
  returnUrl?: string
}

export type PublicSubscribeResult = {
  accessToken: string | null
  expiresAt?: string
  tenantId: string
  signedInAt?: string
  user?: {
    id: string
    email: string
    name: string
    role: string
  }
  tenant: { id: string; name: string; slug: string }
  plan: PlanTemplate
  invoice: BillingInvoice
  redirectUrl: string | null
  activated?: boolean
  mode?: 'manual' | 'external' | 'uddoktapay'
  instructions?: PaymentInstructions
}

export async function publicSubscribe(
  input: PublicSubscribeInput,
): Promise<PublicSubscribeResult> {
  if (!authApiConfigured()) {
    throw new Error('Online signup needs the platform API.')
  }
  try {
    return await apiFetch<PublicSubscribeResult>(
      '/api/platform/public/subscribe',
      {
        method: 'POST',
        skipAuth: true,
        body: {
          ...input,
          returnUrl:
            input.returnUrl ||
            (typeof window !== 'undefined'
              ? `${window.location.origin}/billing`
              : undefined),
        },
      },
    )
  } catch (error) {
    throw new Error(errorMessage(error, 'Could not start signup checkout.'))
  }
}

export async function startCheckout(
  planId: string,
  tenantId?: string,
  returnUrl?: string,
) {
  try {
    return await apiFetch<{
      ok: boolean
      mode: 'manual' | 'external' | 'uddoktapay'
      invoice: BillingInvoice
      plan: PlanTemplate
      redirectUrl: string | null
      activated?: boolean
      instructions?: PaymentInstructions
    }>('/api/platform/billing/checkout', {
      method: 'POST',
      body: {
        planId,
        tenantId,
        returnUrl:
          returnUrl ||
          (typeof window !== 'undefined'
            ? `${window.location.origin}/billing`
            : undefined),
      },
    })
  } catch (error) {
    throw new Error(errorMessage(error, 'Could not start checkout.'))
  }
}

export async function submitInvoicePayment(input: {
  invoiceId: string
  paymentMethod: string
  paymentReference: string
  paymentNote?: string
}) {
  try {
    return await apiFetch<{ ok: boolean; invoice: BillingInvoice }>(
      `/api/platform/billing/invoices/${encodeURIComponent(input.invoiceId)}/submit-payment`,
      {
        method: 'POST',
        body: {
          paymentMethod: input.paymentMethod,
          paymentReference: input.paymentReference,
          paymentNote: input.paymentNote,
        },
      },
    )
  } catch (error) {
    throw new Error(errorMessage(error, 'Could not submit payment.'))
  }
}

export async function syncBilling(tenantId?: string) {
  return apiFetch('/api/platform/billing/sync', {
    method: 'POST',
    body: { tenantId },
  })
}

export async function cancelSubscription(tenantId?: string) {
  try {
    return await apiFetch('/api/platform/billing/cancel', {
      method: 'POST',
      body: { tenantId },
    })
  } catch (error) {
    throw new Error(errorMessage(error, 'Could not cancel subscription.'))
  }
}

/** Agency opt-in/out for SMS (only works when platform still allows SMS). */
export async function patchAgencySmsEnabled(
  agencySmsEnabled: boolean,
  tenantId?: string,
) {
  try {
    return await apiFetch<{
      billing: TenantBilling
      snapshot: BillingSnapshot
    }>('/api/platform/billing/sms', {
      method: 'PATCH',
      body: { agencySmsEnabled, tenantId },
    })
  } catch (error) {
    throw new Error(errorMessage(error, 'Could not update SMS setting.'))
  }
}

/** Agency opt-in/out for email (only works when platform still allows email). */
export async function patchAgencyEmailEnabled(
  agencyEmailEnabled: boolean,
  tenantId?: string,
) {
  try {
    return await apiFetch<{
      billing: TenantBilling
      snapshot: BillingSnapshot
    }>('/api/platform/billing/email', {
      method: 'PATCH',
      body: { agencyEmailEnabled, tenantId },
    })
  } catch (error) {
    throw new Error(errorMessage(error, 'Could not update email setting.'))
  }
}

export async function adminFetchTenantBilling(tenantId: string) {
  return apiFetch<BillingSnapshot>(
    `/api/platform/admin/billing/tenants/${encodeURIComponent(tenantId)}`,
  )
}

export async function adminApplyPlan(
  tenantId: string,
  body: Record<string, unknown>,
) {
  try {
    return await apiFetch(
      `/api/platform/admin/billing/tenants/${encodeURIComponent(tenantId)}/apply-plan`,
      { method: 'POST', body },
    )
  } catch (error) {
    throw new Error(errorMessage(error, 'Could not apply plan.'))
  }
}

export async function adminExtendTrial(tenantId: string, days = 14) {
  try {
    return await apiFetch(
      `/api/platform/admin/billing/tenants/${encodeURIComponent(tenantId)}/extend-trial`,
      { method: 'POST', body: { days } },
    )
  } catch (error) {
    throw new Error(errorMessage(error, 'Could not extend trial.'))
  }
}

export async function adminPatchBilling(
  tenantId: string,
  body: Record<string, unknown>,
) {
  try {
    return await apiFetch(
      `/api/platform/admin/billing/tenants/${encodeURIComponent(tenantId)}`,
      { method: 'PATCH', body },
    )
  } catch (error) {
    throw new Error(errorMessage(error, 'Could not update billing.'))
  }
}

/**
 * Set per-agency SMS quantity hard cap.
 * Uses PATCH when the API supports it; otherwise apply-plan with the same
 * plan/status so older production APIs still persist sms_limit.
 */
export async function adminSetSmsLimit(
  tenantId: string,
  smsLimit: number,
  snapshot: BillingSnapshot,
  enabledModules: string[] = [],
) {
  if (!Number.isInteger(smsLimit) || smsLimit < 0) {
    throw new Error('SMS quantity must be a whole number of 0 or more.')
  }

  try {
    await adminPatchBilling(tenantId, { smsLimit })
    const afterPatch = await adminFetchTenantBilling(tenantId)
    if (afterPatch.limits.smsLimit === smsLimit) {
      return afterPatch
    }
  } catch {
    /* older API — fall through to apply-plan */
  }

  const billing = snapshot.billing
  if (!billing?.planId) {
    throw new Error('Assign a plan before setting SMS quantity.')
  }

  await adminApplyPlan(tenantId, {
    planId: billing.planId,
    billingStatus: billing.billingStatus,
    planKind: billing.planKind,
    trialEndsAt: billing.trialEndsAt,
    currentPeriodEnd: billing.currentPeriodEnd,
    userLimit: snapshot.limits.userLimit,
    subAgentLimit: snapshot.limits.subAgentLimit,
    storageLimitBytes: snapshot.limits.storageLimitBytes,
    smsLimit,
    smsOverageBdt: 0,
    syncModules: false,
  })

  // Older APIs ignore syncModules:false and may wipe product toggles — restore.
  await restoreTenantModules(tenantId, enabledModules)

  const after = await adminFetchTenantBilling(tenantId)
  if (after.limits.smsLimit !== smsLimit) {
    throw new Error('SMS quantity did not save. Try again or redeploy the API.')
  }
  return after
}

/**
 * Set per-agency storage hard cap (bytes).
 * Same PATCH → apply-plan fallback as SMS quantity for older APIs.
 */
export async function adminSetStorageLimit(
  tenantId: string,
  storageLimitBytes: number,
  snapshot: BillingSnapshot,
  enabledModules: string[] = [],
) {
  if (!Number.isInteger(storageLimitBytes) || storageLimitBytes < 0) {
    throw new Error('Storage limit must be a whole number of bytes (0 or more).')
  }

  try {
    await adminPatchBilling(tenantId, { storageLimitBytes })
    const afterPatch = await adminFetchTenantBilling(tenantId)
    if (afterPatch.limits.storageLimitBytes === storageLimitBytes) {
      return afterPatch
    }
  } catch {
    /* older API — fall through to apply-plan */
  }

  const billing = snapshot.billing
  if (!billing?.planId) {
    throw new Error('Assign a plan before setting storage.')
  }

  await adminApplyPlan(tenantId, {
    planId: billing.planId,
    billingStatus: billing.billingStatus,
    planKind: billing.planKind,
    trialEndsAt: billing.trialEndsAt,
    currentPeriodEnd: billing.currentPeriodEnd,
    userLimit: snapshot.limits.userLimit,
    subAgentLimit: snapshot.limits.subAgentLimit,
    storageLimitBytes,
    smsLimit: snapshot.limits.smsLimit,
    smsOverageBdt: snapshot.limits.smsOverageBdt,
    syncModules: false,
  })

  await restoreTenantModules(tenantId, enabledModules)

  const after = await adminFetchTenantBilling(tenantId)
  if (after.limits.storageLimitBytes !== storageLimitBytes) {
    throw new Error('Storage limit did not save. Try again or redeploy the API.')
  }
  return after
}

async function restoreTenantModules(
  tenantId: string,
  modules: string[],
): Promise<void> {
  const readKey = async (key: string): Promise<unknown> => {
    try {
      const body = await apiFetch<{ value?: unknown }>(
        `/api/platform/kv/${encodeURIComponent(key)}`,
      )
      return body.value ?? null
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null
      return null
    }
  }

  const writeKey = async (key: string, value: unknown) => {
    await apiFetch(`/api/platform/kv/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: { value },
    })
  }

  const entitlementsRaw = await readKey('pd-tenant-entitlements')
  const entitlements =
    entitlementsRaw &&
    typeof entitlementsRaw === 'object' &&
    !Array.isArray(entitlementsRaw)
      ? { ...(entitlementsRaw as Record<string, unknown>) }
      : {}
  entitlements[tenantId] = modules
  await writeKey('pd-tenant-entitlements', entitlements)

  const createdRaw = await readKey('pd-tenants-created')
  if (Array.isArray(createdRaw)) {
    let changed = false
    const next = createdRaw.map((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return row
      const tenant = row as Record<string, unknown>
      if (tenant.id !== tenantId) return row
      changed = true
      return { ...tenant, enabledModules: modules }
    })
    if (changed) await writeKey('pd-tenants-created', next)
  }
}

export async function adminMarkInvoicePaid(invoiceId: string) {
  try {
    return await apiFetch(
      `/api/platform/admin/billing/invoices/${encodeURIComponent(invoiceId)}/mark-paid`,
      { method: 'POST', body: {} },
    )
  } catch (error) {
    throw new Error(errorMessage(error, 'Could not mark invoice paid.'))
  }
}

export async function adminListBilling() {
  return apiFetch<{
    tenants: Array<Record<string, unknown>>
    pendingInvoices: BillingInvoice[]
  }>('/api/platform/admin/billing/tenants')
}

export type AdminPlanInput = {
  id?: string
  name: string
  description?: string
  priceBdt: number
  currency?: string
  interval?: 'month' | 'year'
  userLimit: number
  subAgentLimit: number
  storageLimitBytes: number
  smsLimit: number
  smsOverageBdt: number
  sortOrder?: number
  isPublic?: boolean
  isActive?: boolean
  modules?: string[]
  features?: Record<string, unknown>
}

export async function adminListPlans() {
  return apiFetch<{ plans: PlanTemplate[] }>(
    '/api/platform/admin/billing/plans',
  )
}

export async function adminCreatePlan(body: AdminPlanInput) {
  try {
    return await apiFetch<{ ok: boolean; plan: PlanTemplate }>(
      '/api/platform/admin/billing/plans',
      { method: 'POST', body },
    )
  } catch (error) {
    throw new Error(errorMessage(error, 'Could not create plan.'))
  }
}

export async function adminUpdatePlan(
  planId: string,
  body: Partial<AdminPlanInput>,
) {
  try {
    return await apiFetch<{ ok: boolean; plan: PlanTemplate }>(
      `/api/platform/admin/billing/plans/${encodeURIComponent(planId)}`,
      { method: 'PATCH', body },
    )
  } catch (error) {
    throw new Error(errorMessage(error, 'Could not update plan.'))
  }
}

export async function adminDeletePlan(planId: string, hard = false) {
  try {
    const qs = hard ? '?hard=1' : ''
    return await apiFetch<{
      ok: boolean
      deleted: boolean
      hard: boolean
      plan?: PlanTemplate
      tenantCount?: number
    }>(
      `/api/platform/admin/billing/plans/${encodeURIComponent(planId)}${qs}`,
      { method: 'DELETE' },
    )
  } catch (error) {
    throw new Error(errorMessage(error, 'Could not delete plan.'))
  }
}

export async function adminCreateInvoice(input: {
  tenantId: string
  planId: string
  amountBdt?: number
  description?: string
}) {
  try {
    return await apiFetch<{
      ok: boolean
      invoice: BillingInvoice
      plan: PlanTemplate
    }>('/api/platform/admin/billing/invoices', {
      method: 'POST',
      body: input,
    })
  } catch (error) {
    throw new Error(errorMessage(error, 'Could not create invoice.'))
  }
}
