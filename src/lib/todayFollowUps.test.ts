import { describe, expect, it } from 'vitest'
import {
  buildTodayFollowUps,
  pickDefaultTodayBucket,
  todayFollowUpsHeadline,
  todayFollowUpsTotal,
} from '@/lib/todayFollowUps'
import type { Case } from '@/types/case'
import type { Client } from '@/types/client'
import { TENANT_IDS } from '@/types/tenant'

function caseStub(overrides: Partial<Case> & Pick<Case, 'id' | 'clientName'>): Case {
  return {
    tenantId: TENANT_IDS.demo,
    clientId: 'c-1',
    service: 'Work Permit Visa',
    destination: 'Riyadh',
    status: 'In-Progress',
    priority: 'Normal',
    fee: 50000,
    paid: 0,
    balance: 0,
    documents: [],
    createdAt: '2026-08-01',
    updatedAt: '2026-08-01',
    ...overrides,
  }
}

const clients: Client[] = [
  {
    id: 'c-1',
    tenantId: TENANT_IDS.demo,
    name: 'Rahim',
    phone: '01700000000',
    activeCases: 1,
    createdAt: '2026-01-01',
  } as Client,
]

describe('todayFollowUps', () => {
  it('buckets money, docs, and stuck files', () => {
    const asOf = new Date('2026-10-15T12:00:00.000Z')
    const summary = buildTodayFollowUps({
      asOf,
      clients,
      requests: [],
      cases: [
        caseStub({
          id: 'case-money',
          clientName: 'Rahim',
          balance: 15000,
          paid: 35000,
          createdAt: '2026-07-01',
          updatedAt: '2026-09-01',
        }),
        caseStub({
          id: 'case-docs',
          clientName: 'Nusrat',
          clientId: 'c-2',
          balance: 0,
          updatedAt: '2026-10-10',
          documents: [
            {
              id: 'd1',
              name: 'Passport',
              required: true,
              status: 'missing',
            },
          ],
        }),
        caseStub({
          id: 'case-hold',
          clientName: 'Imran',
          clientId: 'c-3',
          status: 'On-Hold',
          updatedAt: '2026-10-12',
        }),
      ],
    })

    expect(summary.money.map((row) => row.title)).toEqual(['Rahim'])
    expect(summary.docs.map((row) => row.title)).toEqual(['Nusrat'])
    expect(summary.stuck.some((row) => row.title === 'Imran')).toBe(true)
    expect(todayFollowUpsTotal(summary)).toBeGreaterThanOrEqual(3)
    expect(todayFollowUpsHeadline(summary)).toMatch(/owe money/i)
    expect(pickDefaultTodayBucket(summary)).toBe('money')
  })

  it('reports a clear day when nothing needs chase', () => {
    const summary = buildTodayFollowUps({
      cases: [
        caseStub({
          id: 'case-done',
          clientName: 'Done',
          status: 'Completed',
          balance: 0,
          updatedAt: '2026-10-14',
        }),
      ],
      clients,
      requests: [],
      asOf: new Date('2026-10-15T12:00:00.000Z'),
    })
    expect(todayFollowUpsTotal(summary)).toBe(0)
    expect(todayFollowUpsHeadline(summary)).toMatch(/clear/i)
  })
})
