const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/
const DISPLAY_DATE = /^(\d{2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{4})$/

function formatParts(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${String(day).padStart(2, '0')}-${MONTHS[month - 1]}-${year}`
}

/** Display dates as DD-MMM-YYYY, e.g. 05-Oct-2026. */
export function formatDisplayDate(
  value?: string | null,
  empty = '—',
): string {
  if (value == null) return empty
  const trimmed = value.trim()
  if (!trimmed) return empty
  if (DISPLAY_DATE.test(trimmed)) return trimmed

  const iso = ISO_DATE.exec(trimmed)
  if (iso) {
    const formatted = formatParts(Number(iso[1]), Number(iso[2]), Number(iso[3]))
    return formatted ?? trimmed
  }

  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return trimmed
  return (
    formatParts(date.getFullYear(), date.getMonth() + 1, date.getDate()) ??
    trimmed
  )
}

export function formatDisplayDateFromDate(date: Date, empty = '—'): string {
  if (Number.isNaN(date.getTime())) return empty
  return (
    formatParts(date.getFullYear(), date.getMonth() + 1, date.getDate()) ??
    empty
  )
}
