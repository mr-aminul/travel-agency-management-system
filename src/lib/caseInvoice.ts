import {
  DEFAULT_BRAND_NAME,
  resolveBrandDisplay,
  type AgencyProfile,
} from '@/lib/agencyProfile'
import { formatDisplayDate } from '@/lib/formatDate'
import { formatPaymentAmount } from '@/lib/paymentsStore'
import { caseBalanceDue, caseServiceFee } from '@/lib/caseMoney'
import type { Case } from '@/types/case'
import type { Client } from '@/types/client'
import type { Payment } from '@/types/payment'

export type InvoicePaymentLine = {
  id: string
  date: string
  method: string
  note?: string
  amount: number
}

export type CaseInvoice = {
  invoiceNumber: string
  issuedOn: string
  caseRef: string
  caseInternalId: string
  service: string
  destination?: string
  description?: string
  agencyName: string
  agencyAddress: string
  agencyMobile: string
  agencyWebsite: string
  agencyLogoUrl?: string
  agencyLogoIsCustom: boolean
  clientName: string
  clientPhone: string
  clientEmail?: string
  clientAddress?: string
  clientPassport?: string
  lineDescription: string
  packageTotal: number
  paidTotal: number
  balanceDue: number
  payments: InvoicePaymentLine[]
  status: 'paid' | 'partial' | 'unpaid'
}

export function invoiceNumberForCase(caseItem: Case): string {
  return `INV-${caseItem.caseId}`
}

export function formatInvoiceDate(value: string): string {
  return formatDisplayDate(value, value)
}

export function formatInvoiceAmount(amount: number): string {
  return formatPaymentAmount(amount)
}

/** Display website without protocol so it reads as www.example.com. */
export function formatInvoiceWebsite(website: string): string {
  return website.trim().replace(/^https?:\/\//i, '')
}

function latestPaymentDate(payments: Payment[], fallback: string): string {
  const dates = payments
    .map((item) => item.createdAt.slice(0, 10))
    .filter(Boolean)
    .sort()
  return dates[dates.length - 1] ?? fallback.slice(0, 10)
}

export function buildCaseInvoice(input: {
  caseItem: Case
  payments: Payment[]
  client?: Client
  profile: AgencyProfile
  defaultLogoUrl?: string
}): CaseInvoice {
  const { caseItem, payments, client, profile, defaultLogoUrl } = input
  const brand = resolveBrandDisplay(profile, defaultLogoUrl)
  const paidTotal = payments.reduce((sum, item) => sum + item.amount, 0)
  const packageTotal = caseServiceFee(caseItem, paidTotal)
  const balanceDue = caseBalanceDue(caseItem, paidTotal)
  const status: CaseInvoice['status'] =
    balanceDue <= 0 && paidTotal > 0
      ? 'paid'
      : paidTotal > 0
        ? 'partial'
        : 'unpaid'

  const destination = caseItem.destination?.trim()
  const lineDescription = destination
    ? `${caseItem.service} package — ${destination}`
    : `${caseItem.service} package`

  const sortedPayments = [...payments].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  )

  return {
    invoiceNumber: invoiceNumberForCase(caseItem),
    issuedOn: latestPaymentDate(sortedPayments, caseItem.createdAt),
    caseRef: caseItem.caseId,
    caseInternalId: caseItem.id,
    service: caseItem.service,
    destination,
    description: caseItem.description,
    agencyName: brand.name || DEFAULT_BRAND_NAME,
    agencyAddress: profile.address.trim(),
    agencyMobile: profile.mobile.trim(),
    agencyWebsite: profile.website.trim(),
    agencyLogoUrl: brand.logoUrl,
    agencyLogoIsCustom: brand.isCustomLogo,
    clientName: client?.name ?? caseItem.clientName,
    clientPhone: client?.phone ?? '',
    clientEmail: client?.email,
    clientAddress: client?.address,
    clientPassport: client?.passport,
    lineDescription,
    packageTotal,
    paidTotal,
    balanceDue,
    payments: sortedPayments.map((item) => ({
      id: item.id,
      date: item.createdAt,
      method: item.method,
      note: item.note,
      amount: item.amount,
    })),
    status,
  }
}
