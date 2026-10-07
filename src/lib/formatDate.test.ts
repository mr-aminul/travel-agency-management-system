import { describe, expect, it } from 'vitest'
import {
  formatDisplayDate,
  formatDisplayDateFromDate,
  formatDisplayDateTime,
} from '@/lib/formatDate'

describe('formatDisplayDate', () => {
  it('formats ISO calendar dates as DD-MMM-YYYY', () => {
    expect(formatDisplayDate('2026-10-05')).toBe('05-Oct-2026')
    expect(formatDisplayDate('2026-01-15')).toBe('15-Jan-2026')
  })

  it('uses the calendar date from ISO datetimes', () => {
    expect(formatDisplayDate('2024-01-10T08:00:00.000Z')).toBe('10-Jan-2024')
  })

  it('leaves non-dates unchanged', () => {
    expect(formatDisplayDate('Lifetime')).toBe('Lifetime')
  })

  it('returns the empty placeholder when missing', () => {
    expect(formatDisplayDate(undefined)).toBe('—')
    expect(formatDisplayDate('')).toBe('—')
    expect(formatDisplayDate(null, '')).toBe('')
  })

  it('passes through values already in display format', () => {
    expect(formatDisplayDate('05-Oct-2026')).toBe('05-Oct-2026')
  })
})

describe('formatDisplayDateFromDate', () => {
  it('formats a local Date', () => {
    expect(formatDisplayDateFromDate(new Date(2026, 8, 5))).toBe('05-Sep-2026')
  })
})

describe('formatDisplayDateTime', () => {
  it('formats a local datetime as DD-MMM-YYYY h:mm AM/PM', () => {
    expect(
      formatDisplayDateTime(new Date(2026, 9, 5, 14, 30).toISOString()),
    ).toBe('05-Oct-2026 2:30 PM')
  })

  it('treats a calendar date as local midnight', () => {
    expect(formatDisplayDateTime('2026-10-05')).toBe('05-Oct-2026 12:00 AM')
  })

  it('returns the empty placeholder when missing', () => {
    expect(formatDisplayDateTime(undefined)).toBe('—')
    expect(formatDisplayDateTime('', '')).toBe('')
  })
})
