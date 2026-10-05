import type { CaseInvoice } from '@/lib/caseInvoice'
import { absolutePublicUrl } from '@/lib/publicUrl'

const SHARE_VERSION = 1

type InvoiceSharePayload = {
  v: number
  invoice: CaseInvoice
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(token: string): Uint8Array | null {
  const padded = token.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (padded.length % 4)) % 4
  try {
    const binary = atob(`${padded}${'='.repeat(padLength)}`)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  } catch {
    return null
  }
}

function isInvoiceStatus(value: unknown): value is CaseInvoice['status'] {
  return value === 'paid' || value === 'partial' || value === 'unpaid'
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function parsePayments(value: unknown): CaseInvoice['payments'] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const id = asString(row.id)
    if (!id) return []
    return [
      {
        id,
        date: asString(row.date),
        method: asString(row.method),
        note: asOptionalString(row.note),
        amount: asNumber(row.amount),
      },
    ]
  })
}

function parseInvoice(value: unknown): CaseInvoice | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const invoiceNumber = asString(row.invoiceNumber)
  const clientName = asString(row.clientName)
  const status = row.status
  if (!invoiceNumber || !clientName || !isInvoiceStatus(status)) return null

  const logoUrl = asOptionalString(row.agencyLogoUrl)

  return {
    invoiceNumber,
    issuedOn: asString(row.issuedOn),
    caseRef: asString(row.caseRef),
    caseInternalId: asString(row.caseInternalId),
    service: asString(row.service),
    destination: asOptionalString(row.destination),
    description: asOptionalString(row.description),
    agencyName: asString(row.agencyName),
    agencyAddress: asString(row.agencyAddress),
    agencyMobile: asString(row.agencyMobile),
    agencyWebsite: asString(row.agencyWebsite),
    agencyLogoUrl: logoUrl?.startsWith('data:') ? undefined : logoUrl,
    agencyLogoIsCustom: Boolean(row.agencyLogoIsCustom) && Boolean(logoUrl) && !logoUrl.startsWith('data:'),
    clientName,
    clientPhone: asString(row.clientPhone),
    clientEmail: asOptionalString(row.clientEmail),
    clientAddress: asOptionalString(row.clientAddress),
    clientPassport: asOptionalString(row.clientPassport),
    lineDescription: asString(row.lineDescription),
    packageTotal: asNumber(row.packageTotal),
    paidTotal: asNumber(row.paidTotal),
    balanceDue: asNumber(row.balanceDue),
    payments: parsePayments(row.payments),
    status,
  }
}

export function encodeInvoiceShare(invoice: CaseInvoice): string {
  const payload: InvoiceSharePayload = {
    v: SHARE_VERSION,
    invoice: parseInvoice(invoice) ?? invoice,
  }
  return toBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
}

export function decodeInvoiceShare(token: string | undefined): CaseInvoice | null {
  if (!token?.trim()) return null
  const bytes = fromBase64Url(token.trim())
  if (!bytes) return null
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const row = parsed as Record<string, unknown>
    if (row.v !== SHARE_VERSION) return null
    return parseInvoice(row.invoice)
  } catch {
    return null
  }
}

export function publicInvoicePath(invoice: CaseInvoice): string {
  return `i/${encodeInvoiceShare(invoice)}`
}

export function publicInvoiceUrl(invoice: CaseInvoice): string {
  return absolutePublicUrl(publicInvoicePath(invoice))
}

/** Normalize display fields so in-app and shared views render the same document. */
export function invoiceForDocument(
  invoice: CaseInvoice,
  defaultLogoUrl: string,
): CaseInvoice {
  const agencyLogoUrl = invoice.agencyLogoUrl ?? defaultLogoUrl
  return {
    ...invoice,
    agencyLogoUrl,
    agencyLogoIsCustom: Boolean(
      invoice.agencyLogoIsCustom && invoice.agencyLogoUrl,
    ),
  }
}

export async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const field = document.createElement('textarea')
    field.value = value
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    document.execCommand('copy')
    field.remove()
  }
}
