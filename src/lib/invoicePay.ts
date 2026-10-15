import { apiFetch, ApiError } from '@/lib/apiClient'
import type { CaseInvoice, InvoicePaymentLine } from '@/lib/caseInvoice'
import { shouldUseApiDataBackend } from '@/lib/data'

export const INVOICE_PAY_METHODS = [
  { value: 'bKash', label: 'bKash' },
  { value: 'Nagad', label: 'Nagad' },
  { value: 'Card', label: 'Card' },
] as const

export type InvoicePayMethod = (typeof INVOICE_PAY_METHODS)[number]['value']

export type InvoiceCheckout = {
  checkoutId: string
  mode: 'uddoktapay' | 'mock'
  amountBdt: number
  currency: string
  redirectUrl: string | null
}

const OVERLAY_PREFIX = 'pd-invoice-pay-overlay:'

function overlayKey(token: string): string {
  return `${OVERLAY_PREFIX}${token}`
}

function asNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

export function invoicePayErrorMessage(error: unknown, fallback: string): string {
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

export function mergeInvoicePayments(
  invoice: CaseInvoice,
  extra: InvoicePaymentLine[],
): CaseInvoice {
  const payments = [...invoice.payments]
  for (const line of extra) {
    if (!line?.id) continue
    if (!payments.some((row) => row.id === line.id)) payments.push(line)
  }
  const paidTotal = payments.reduce((sum, row) => sum + asNumber(row.amount), 0)
  const packageTotal = asNumber(invoice.packageTotal)
  const balanceDue = Math.max(0, packageTotal - paidTotal)
  return {
    ...invoice,
    payments,
    paidTotal,
    balanceDue,
    status: balanceDue <= 0 ? 'paid' : paidTotal > 0 ? 'partial' : 'unpaid',
  }
}

export function readInvoicePayOverlay(token: string): InvoicePaymentLine[] {
  if (!token || typeof sessionStorage === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(overlayKey(token))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const row = item as Record<string, unknown>
      const id = typeof row.id === 'string' ? row.id : ''
      const amount = asNumber(row.amount)
      if (!id || amount <= 0) return []
      return [
        {
          id,
          date: typeof row.date === 'string' ? row.date : '',
          method: typeof row.method === 'string' ? row.method : 'Online',
          note: typeof row.note === 'string' ? row.note : undefined,
          amount,
        },
      ]
    })
  } catch {
    return []
  }
}

export function rememberInvoicePayOverlay(
  token: string,
  line: InvoicePaymentLine,
): void {
  if (!token || typeof sessionStorage === 'undefined') return
  const next = mergeInvoicePayments(
    {
      invoiceNumber: '',
      issuedOn: '',
      caseRef: '',
      caseInternalId: '',
      service: '',
      agencyName: '',
      agencyAddress: '',
      agencyMobile: '',
      agencyWebsite: '',
      agencyLogoIsCustom: false,
      clientName: '',
      clientPhone: '',
      lineDescription: '',
      packageTotal: 0,
      paidTotal: 0,
      balanceDue: 0,
      payments: readInvoicePayOverlay(token),
      status: 'unpaid',
    },
    [line],
  ).payments
  sessionStorage.setItem(overlayKey(token), JSON.stringify(next))
}

export function overlayInvoice(invoice: CaseInvoice, token: string): CaseInvoice {
  return mergeInvoicePayments(invoice, readInvoicePayOverlay(token))
}

function localMockCheckout(amountBdt: number): InvoiceCheckout {
  return {
    checkoutId: `local-${Date.now().toString(36)}`,
    mode: 'mock',
    amountBdt,
    currency: 'BDT',
    redirectUrl: null,
  }
}

export async function startInvoiceCheckout(
  token: string,
  amountBdt: number,
): Promise<InvoiceCheckout> {
  if (!shouldUseApiDataBackend()) {
    return localMockCheckout(amountBdt)
  }
  try {
    const body = await apiFetch<{
      checkoutId: string
      mode: 'uddoktapay' | 'mock'
      amountBdt: number
      currency?: string
      redirectUrl?: string | null
    }>(`/api/platform/public/invoices/${encodeURIComponent(token)}/checkout`, {
      method: 'POST',
      skipAuth: true,
      body: {},
    })
    return {
      checkoutId: body.checkoutId,
      mode: body.mode,
      amountBdt: body.amountBdt,
      currency: body.currency || 'BDT',
      redirectUrl: body.redirectUrl ?? null,
    }
  } catch (error) {
    if (shouldUseApiDataBackend()) throw error
    return localMockCheckout(amountBdt)
  }
}

export async function completeMockInvoiceCheckout(input: {
  token: string
  checkoutId: string
  amountBdt: number
  method: InvoicePayMethod
}): Promise<{ invoice: CaseInvoice | null }> {
  const line: InvoicePaymentLine = {
    id: `pay-${input.checkoutId}`,
    date: new Date().toISOString().slice(0, 10),
    method: input.method,
    note: 'Paid online on shared invoice',
    amount: input.amountBdt,
  }

  if (shouldUseApiDataBackend() && !input.checkoutId.startsWith('local-')) {
    try {
      const body = await apiFetch<{ invoice?: CaseInvoice }>(
        `/api/platform/public/invoices/${encodeURIComponent(input.token)}/checkout/${encodeURIComponent(input.checkoutId)}/complete-mock`,
        {
          method: 'POST',
          skipAuth: true,
          body: { method: input.method },
        },
      )
      if (body.invoice) return { invoice: body.invoice }
    } catch (error) {
      if (error instanceof ApiError && error.status !== 403 && error.status !== 404) {
        throw error
      }
    }
  }

  rememberInvoicePayOverlay(input.token, line)
  return { invoice: null }
}

export function publicInvoicePayPath(token: string): string {
  return `/i/${encodeURIComponent(token)}/pay`
}

export function publicInvoiceViewPath(token: string, payment?: string): string {
  const path = `/i/${encodeURIComponent(token)}`
  return payment ? `${path}?payment=${encodeURIComponent(payment)}` : path
}
