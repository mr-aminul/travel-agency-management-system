import type { AgencyProfile } from '@/lib/agencyProfile'
import {
  DEFAULT_BRAND_NAME,
  resolveBrandDisplay,
} from '@/lib/agencyProfile'
import { deriveClientBalance } from '@/lib/clientDerived'
import { formatBalance } from '@/lib/clientsStore'
import { formatDisplayDate } from '@/lib/formatDate'
import type { Case } from '@/types/case'
import type { Client } from '@/types/client'
import type { SubAgent } from '@/types/subAgent'

export type SubAgentReportColumnId =
  | 'name'
  | 'phone'
  | 'passport'
  | 'passportExpiry'
  | 'country'
  | 'nid'
  | 'email'
  | 'dateOfBirth'
  | 'age'
  | 'balance'
  | 'status'

export const SUB_AGENT_REPORT_COLUMNS: {
  id: SubAgentReportColumnId
  label: string
  required?: boolean
}[] = [
  { id: 'name', label: 'Name', required: true },
  { id: 'phone', label: 'Mobile' },
  { id: 'passport', label: 'Passport' },
  { id: 'passportExpiry', label: 'Passport expiry' },
  { id: 'country', label: 'Country' },
  { id: 'nid', label: 'NID' },
  { id: 'email', label: 'Email' },
  { id: 'dateOfBirth', label: 'Date of birth' },
  { id: 'age', label: 'Age' },
  { id: 'balance', label: 'Balance due' },
  { id: 'status', label: 'Status' },
]

/** Default report fields — balance/amount off until the user adds it. */
export const DEFAULT_SUB_AGENT_REPORT_COLUMNS: SubAgentReportColumnId[] = [
  'name',
  'phone',
  'passport',
  'country',
  'status',
]

export type SubAgentClientReportRow = {
  id: string
  name: string
  phone: string
  passport: string
  passportExpiry: string
  passportExpiryLabel: string
  country: string
  nid: string
  email: string
  dateOfBirth: string
  dateOfBirthLabel: string
  age: string
  balance: number
  balanceLabel: string
  status: string
}

export type SubAgentClientReport = {
  reportNumber: string
  issuedOn: string
  agencyName: string
  agencyAddress: string
  agencyMobile: string
  agencyWebsite: string
  agencyLogoUrl?: string
  agencyLogoIsCustom: boolean
  subAgentId: string
  subAgentName: string
  subAgentPhone: string
  subAgentLicense: string
  clientCount: number
  columns: SubAgentReportColumnId[]
  showAmountSummary: boolean
  totalOutstanding: number
  totalOutstandingLabel: string
  rows: SubAgentClientReportRow[]
}

export function normalizeReportColumns(
  columns: SubAgentReportColumnId[],
): SubAgentReportColumnId[] {
  const allowed = new Set(
    SUB_AGENT_REPORT_COLUMNS.map((column) => column.id),
  )
  const next: SubAgentReportColumnId[] = []
  for (const column of columns) {
    if (!allowed.has(column) || next.includes(column)) continue
    next.push(column)
  }
  if (!next.includes('name')) next.unshift('name')
  return next
}

export function moveReportColumn(
  columns: SubAgentReportColumnId[],
  columnId: SubAgentReportColumnId,
  direction: -1 | 1,
): SubAgentReportColumnId[] {
  const ordered = normalizeReportColumns(columns)
  const index = ordered.indexOf(columnId)
  if (index < 0) return ordered
  const target = index + direction
  if (target < 0 || target >= ordered.length) return ordered
  const next = [...ordered]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

/** Whole years completed from an ISO date-of-birth string. */
export function ageFromDateOfBirth(
  dateOfBirth?: string | null,
  onDate = new Date(),
): number | undefined {
  const trimmed = dateOfBirth?.trim()
  if (!trimmed) return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed)
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return undefined
  let age = onDate.getFullYear() - year
  const monthNow = onDate.getMonth() + 1
  const dayNow = onDate.getDate()
  if (monthNow < month || (monthNow === month && dayNow < day)) {
    age -= 1
  }
  return age >= 0 ? age : undefined
}

export function buildClientReportRow(
  client: Client,
  status: string,
  balance = 0,
): SubAgentClientReportRow {
  const dateOfBirth = client.dateOfBirth?.trim() || ''
  const passportExpiry = client.passportExpiry?.trim() || ''
  const age = ageFromDateOfBirth(dateOfBirth)
  const due = Math.max(0, balance)
  return {
    id: client.id,
    name: client.name,
    phone: client.phone,
    passport: client.passport?.trim() || '—',
    passportExpiry,
    passportExpiryLabel: passportExpiry
      ? formatDisplayDate(passportExpiry, '—')
      : '—',
    country: client.preferredCountry?.trim() || '—',
    nid: client.nid?.trim() || '—',
    email: client.email?.trim() || '—',
    dateOfBirth,
    dateOfBirthLabel: dateOfBirth
      ? formatDisplayDate(dateOfBirth, '—')
      : '—',
    age: age == null ? '—' : String(age),
    balance: due,
    balanceLabel: formatBalance(due),
    status: status.trim() || '—',
  }
}

export function buildSubAgentClientReport(input: {
  subAgent: SubAgent
  clients: Client[]
  statusByClientId: Map<string, string>
  profile: AgencyProfile
  columns?: SubAgentReportColumnId[]
  defaultLogoUrl?: string
  issuedOn?: string
  cases?: readonly Case[]
}): SubAgentClientReport {
  const brand = resolveBrandDisplay(input.profile, input.defaultLogoUrl)
  const issuedOn = input.issuedOn ?? new Date().toISOString().slice(0, 10)
  const columns = normalizeReportColumns(
    input.columns ?? DEFAULT_SUB_AGENT_REPORT_COLUMNS,
  )
  const showAmountSummary = columns.includes('balance')
  const casesByClientId = new Map<string, Case[]>()
  for (const item of input.cases ?? []) {
    const list = casesByClientId.get(item.clientId)
    if (list) list.push(item)
    else casesByClientId.set(item.clientId, [item])
  }
  const rows = input.clients.map((client) =>
    buildClientReportRow(
      client,
      input.statusByClientId.get(client.id) ?? '—',
      deriveClientBalance(casesByClientId.get(client.id) ?? []),
    ),
  )
  const totalOutstanding = showAmountSummary
    ? rows.reduce((sum, row) => sum + row.balance, 0)
    : 0
  const safeId = input.subAgent.id.replace(/[^\w.-]+/g, '-') || 'sub-agent'
  return {
    reportNumber: `SCR-${safeId}-${issuedOn.replace(/[^\d]/g, '')}`,
    issuedOn,
    agencyName: brand.name || DEFAULT_BRAND_NAME,
    agencyAddress: input.profile.address.trim(),
    agencyMobile: input.profile.mobile.trim(),
    agencyWebsite: input.profile.website.trim(),
    agencyLogoUrl: brand.logoUrl,
    agencyLogoIsCustom: brand.isCustomLogo,
    subAgentId: input.subAgent.id,
    subAgentName: input.subAgent.name,
    subAgentPhone: input.subAgent.phone,
    subAgentLicense: input.subAgent.licenseNumber?.trim() || '',
    clientCount: rows.length,
    columns,
    showAmountSummary,
    totalOutstanding,
    totalOutstandingLabel: formatBalance(totalOutstanding),
    rows,
  }
}

export function formatReportWebsite(website: string): string {
  return website.trim().replace(/^https?:\/\//i, '')
}

export function formatReportDate(value: string): string {
  return formatDisplayDate(value, value)
}

export function reportColumnLabel(column: SubAgentReportColumnId): string {
  return (
    SUB_AGENT_REPORT_COLUMNS.find((item) => item.id === column)?.label ??
    column
  )
}

export function reportRowValue(
  row: SubAgentClientReportRow,
  column: SubAgentReportColumnId,
): string {
  switch (column) {
    case 'name':
      return row.name
    case 'phone':
      return row.phone || '—'
    case 'passport':
      return row.passport
    case 'passportExpiry':
      return row.passportExpiryLabel
    case 'country':
      return row.country
    case 'nid':
      return row.nid
    case 'email':
      return row.email
    case 'dateOfBirth':
      return row.dateOfBirthLabel
    case 'age':
      return row.age
    case 'balance':
      return row.balanceLabel
    case 'status':
      return row.status
  }
}

export function subAgentClientReportPdfFileName(
  report: Pick<SubAgentClientReport, 'subAgentId' | 'issuedOn'>,
) {
  const id = report.subAgentId.replace(/[^\w.-]+/g, '-') || 'sub-agent'
  const day = report.issuedOn.replace(/[^\d]/g, '') || 'report'
  return `sub-agent-clients-${id}-${day}.pdf`
}
