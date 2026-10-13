import { apiFetch, ApiError } from '@/lib/apiClient'
import { authApiConfigured } from '@/lib/billing/platformFlag'
import { PLAN_CATALOG } from '@/lib/billing/planCatalog'
import type {
  BillingInvoice,
  BillingSnapshot,
  PaymentInstructions,
  PlanTemplate,
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
