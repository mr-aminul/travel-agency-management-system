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
const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/
const DISPLAY_DATE = /^(\d{2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{4})$/

function formatParts(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${String(day).padStart(2, '0')}-${MONTHS[month - 1]}-${year}`
}

function formatClock(date: Date): string {
  const hours24 = date.getHours()
  const period = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 || 12
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours12}:${minutes} ${period}`
}

function parseDateOnlyLocal(value: string): Date | null {
  const match = ISO_DATE_ONLY.exec(value)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
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

/** Display timestamps as DD-MMM-YYYY h:mm AM/PM, e.g. 05-Oct-2026 2:30 PM. */
export function formatDisplayDateTime(
  value?: string | null,
  empty = '—',
): string {
  if (value == null) return empty
  const trimmed = value.trim()
  if (!trimmed) return empty
  if (DISPLAY_DATE.test(trimmed)) return trimmed

  const dateOnly = parseDateOnlyLocal(trimmed)
  if (dateOnly) {
    return `${formatDisplayDate(trimmed, empty)} ${formatClock(dateOnly)}`
  }

  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return formatDisplayDate(trimmed, empty)

  const day =
    formatParts(date.getFullYear(), date.getMonth() + 1, date.getDate()) ??
    formatDisplayDate(trimmed, empty)
  return `${day} ${formatClock(date)}`
}

export function formatDisplayDateFromDate(date: Date, empty = '—'): string {
  if (Number.isNaN(date.getTime())) return empty
  return (
    formatParts(date.getFullYear(), date.getMonth() + 1, date.getDate()) ??
    empty
  )
}
