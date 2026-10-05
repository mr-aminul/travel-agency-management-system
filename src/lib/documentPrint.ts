import { formatDisplayDateFromDate } from '@/lib/formatDate'
import type { Client } from '@/types/client'
import type { PrintField, PrintPassengerRow } from '@/types/documentTemplate'

export function formatPrintDate(date = new Date()): string {
  return formatDisplayDateFromDate(date)
}

export function fillPrintPlaceholders(
  text: string,
  vars: { agency: string; license: string; date: string; country: string },
): string {
  return text
    .split('{{agency}}').join(vars.agency || '—')
    .split('{{license}}').join(vars.license || '—')
    .split('{{date}}').join(vars.date)
    .split('{{country}}').join(vars.country || '—')
}

export function clientToPrintRow(
  client: Client,
  sl: number,
): PrintPassengerRow {
  const year = client.dateOfBirth?.slice(0, 4) ?? ''
  return {
    id: client.id,
    sl,
    name: client.name,
    passport: client.passport ?? '',
    profession: client.profession ?? client.preferredJob ?? '',
    year,
    visaNumber: '',
    sponsorName: '',
    adviceNo: '',
    visaCount: '',
    jobTitle: client.preferredJob ?? client.profession ?? '',
    salary: client.expectedSalary ?? '',
    food: '',
    rent: '',
    tax: '',
    welfare: '',
    briefing: '',
    remarks: '',
  }
}

export function printCellValue(
  row: PrintPassengerRow,
  field: PrintField,
): string {
  const value = row[field]
  if (field === 'sl') return String(row.sl)
  return value ? String(value) : ''
}
