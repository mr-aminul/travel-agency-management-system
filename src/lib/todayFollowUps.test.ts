import { describe, expect, it } from 'vitest'
import {
  buildTodayFollowUps,
  pickDefaultTodayBucket,
  todayBucketsWithWork,
  todayFollowUpsHeadline,
  todayFollowUpsTotal,
} from '@/lib/todayFollowUps'
import type { Case } from '@/types/case'
import type { Client } from '@/types/client'
import type { SubAgentPendingChange } from '@/types/subAgentAccess'
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
  {
    id: 'c-2',
    tenantId: TENANT_IDS.demo,
    name: 'Nusrat',
    phone: '01700000001',
    activeCases: 1,
    createdAt: '2026-01-02',
  } as Client,
  {
    id: 'c-3',
    tenantId: TENANT_IDS.demo,
    name: 'Imran',
    phone: '01700000002',
    activeCases: 1,
    createdAt: '2026-01-03',
  } as Client,
]

function pendingStub(
  overrides: Partial<SubAgentPendingChange> & Pick<SubAgentPendingChange, 'id'>,
): SubAgentPendingChange {
  return {
    tenantId: TENANT_IDS.demo,
    subAgentId: 'sa-1',
    submittedByUserId: 'u-1',
    submittedByName: 'Karim',
    entityType: 'client',
    action: 'create',
    summary: 'New client: Farhana',
    payload: {},
    status: 'pending',
    createdAt: '2026-10-14T10:00:00.000Z',
    ...overrides,
  }
}

describe('todayFollowUps', () => {
  it('buckets payments, docs, needs-action, and approvals', () => {
    const asOf = new Date('2026-10-15T12:00:00.000Z')
    const summary = buildTodayFollowUps({
      asOf,
      clients,
      requests: [],
      includeApprovals: true,
      resolveSubAgentName: () => 'Delta Travels',
      pendingChanges: [pendingStub({ id: 'pc-1' })],
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

    expect(summary.money.items.map((row) => row.title)).toEqual(['Rahim'])
    expect(summary.docs.items.map((row) => row.title)).toEqual(['Nusrat'])
    expect(summary.stuck.items.some((row) => row.title === 'Imran')).toBe(true)
    expect(summary.approvals.items).toHaveLength(1)
    expect(summary.approvals.items[0]?.href).toBe('/approvals')
    expect(summary.approvals.items[0]?.detail).toMatch(/Delta Travels/)
    expect(todayFollowUpsTotal(summary)).toBeGreaterThanOrEqual(4)
    expect(todayFollowUpsHeadline(summary)).toMatch(/payments due/i)
    expect(pickDefaultTodayBucket(summary)).toBe('money')
    expect(todayBucketsWithWork(summary, { includeApprovals: true }).map((b) => b.id)).toEqual(
      expect.arrayContaining(['money', 'docs', 'stuck', 'approvals']),
    )
  })

  it('hides approvals unless includeApprovals is set', () => {
    const summary = buildTodayFollowUps({
      cases: [],
      clients,
      requests: [],
      pendingChanges: [pendingStub({ id: 'pc-2' })],
      asOf: new Date('2026-10-15T12:00:00.000Z'),
    })
    expect(summary.approvals.items).toHaveLength(0)
  })

  it('scopes approvals to a sub-agent when asked', () => {
    const summary = buildTodayFollowUps({
      cases: [],
      clients,
      requests: [],
      includeApprovals: true,
      approvalsScopeSubAgentId: 'sa-mine',
      pendingChanges: [
        pendingStub({ id: 'pc-mine', subAgentId: 'sa-mine' }),
        pendingStub({ id: 'pc-other', subAgentId: 'sa-other' }),
      ],
      asOf: new Date('2026-10-15T12:00:00.000Z'),
    })
    expect(summary.approvals.items.map((row) => row.id)).toEqual([
      'approvals:pc-mine',
    ])
  })

  it('returns every docs item without truncating', () => {
    const cases = Array.from({ length: 12 }, (_, index) =>
      caseStub({
        id: `case-docs-${index}`,
        clientId: `c-docs-${index}`,
        clientName: `Client ${String(index).padStart(2, '0')}`,
        documents: [
          {
            id: 'passport',
            name: 'Passport',
            required: true,
            status: 'missing',
          },
        ],
      }),
    )
    const docsClients = cases.map(
      (item) =>
        ({
          id: item.clientId,
          tenantId: TENANT_IDS.demo,
          name: item.clientName,
          phone: '01700000000',
          activeCases: 1,
          createdAt: '2026-01-01',
        }) as Client,
    )

    const summary = buildTodayFollowUps({
      cases,
      clients: docsClients,
      requests: [],
      asOf: new Date('2026-10-15T12:00:00.000Z'),
    })

    expect(summary.docs.items).toHaveLength(12)
    expect(todayFollowUpsHeadline(summary)).toBe('12 missing docs')
    expect(todayFollowUpsTotal(summary)).toBe(12)
  })

  it('hides pending requests when the client was deleted', () => {
    const summary = buildTodayFollowUps({
      cases: [
        caseStub({
          id: 'case-cancel',
          clientId: 'c-mv9yedor',
          clientName: 'Abdul Jabbar',
          service: 'Tourist Visa',
          status: 'Pending',
          updatedAt: '2026-10-14',
        }),
      ],
      clients: [],
      requests: [
        {
          id: 'req-orphan',
          tenantId: TENANT_IDS.demo,
          clientId: 'c-mv9yedor',
          caseId: 'case-cancel',
          fromStatus: 'Pending',
          toStatus: 'Cancelled',
          requestedAt: '2026-10-14T10:00:00.000Z',
          reviewStatus: 'Pending',
        },
      ],
      asOf: new Date('2026-10-15T12:00:00.000Z'),
    })

    expect(summary.stuck.items).toHaveLength(0)
    expect(todayFollowUpsTotal(summary)).toBe(0)
  })

  it('ignores not_due required docs when building the docs bucket', () => {
    const summary = buildTodayFollowUps({
      cases: [
        caseStub({
          id: 'case-later',
          clientName: 'Later',
          updatedAt: '2026-10-14',
          documents: [
            {
              id: 'medical',
              name: 'Medical',
              required: true,
              status: 'not_due',
            },
          ],
        }),
      ],
      clients,
      requests: [],
      asOf: new Date('2026-10-15T12:00:00.000Z'),
    })

    expect(summary.docs.items).toHaveLength(0)
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
    expect(todayFollowUpsHeadline(summary)).toMatch(/nothing due/i)
    expect(todayBucketsWithWork(summary)).toEqual([])
  })
})
