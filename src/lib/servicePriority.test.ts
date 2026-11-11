import { describe, expect, it } from 'vitest'
import {
  isWorkDueOverdue,
  normalizeServicePriority,
  servicePriority,
} from '@/lib/servicePriority'

describe('servicePriority', () => {
  it('defaults unset and unknown values to Normal', () => {
    expect(normalizeServicePriority(undefined)).toBe('Normal')
    expect(normalizeServicePriority('')).toBe('Normal')
    expect(normalizeServicePriority('asap')).toBe('Normal')
    expect(servicePriority({})).toBe('Normal')
  })

  it('keeps known priorities', () => {
    expect(normalizeServicePriority('Urgent')).toBe('Urgent')
    expect(servicePriority({ priority: 'High' })).toBe('High')
  })
})

describe('isWorkDueOverdue', () => {
  it('is overdue when open and past due', () => {
    expect(
      isWorkDueOverdue(
        { dueDate: '2026-08-01', status: 'In-Progress' },
        '2026-08-10',
      ),
    ).toBe(true)
  })

  it('is not overdue when completed, missing, or still ahead', () => {
    expect(
      isWorkDueOverdue(
        { dueDate: '2026-08-01', status: 'Completed' },
        '2026-08-10',
      ),
    ).toBe(false)
    expect(
      isWorkDueOverdue({ status: 'Pending' }, '2026-08-10'),
    ).toBe(false)
    expect(
      isWorkDueOverdue(
        { dueDate: '2026-08-15', status: 'Pending' },
        '2026-08-10',
      ),
    ).toBe(false)
  })
})
