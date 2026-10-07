import { describe, expect, it } from 'vitest'
import { computeBusinessHealth } from '@/lib/businessHealth'
import type { OwnerKpis } from '@/lib/dashboardInsights'
import type { PaperworkSummary } from '@/lib/dashboardOperations'

const kpis: OwnerKpis = {
  collected: 50000,
  collectedLast30Days: 20000,
  collectedPrev30Days: 10000,
  collectedMomChange: 1,
  outstanding: 50000,
  collectionRate: 0.5,
  bookedRevenue: 100000,
  averageTicket: 25000,
  openCases: 4,
  completedCases: 2,
  completionRate: 1 / 3,
  holdRate: 0,
  pendingRequests: 0,
  activeClients: 4,
  atRiskCount: 0,
  staleOpenCases: 0,
}

const paperwork: PaperworkSummary = {
  approved: 6,
  underReview: 0,
  missing: 4,
  notDue: 0,
  inHandRate: 0.6,
}

describe('computeBusinessHealth', () => {
  it('weights cash, flow, paperwork, and timeliness into one score', () => {
    const health = computeBusinessHealth({ kpis, paperwork, overdueDepartures: 1 })
    // 0.5×0.3 + 1×0.3 + 0.6×0.2 + 0.75×0.2
    expect(health.score).toBe(72)
  })

  it('calls a score below 75 one to watch', () => {
    const health = computeBusinessHealth({ kpis, paperwork, overdueDepartures: 1 })
    expect(health.verdict).toBe('watch')
  })

  it('names the weakest signal as the biggest drag', () => {
    const health = computeBusinessHealth({ kpis, paperwork, overdueDepartures: 1 })
    expect(health.weakest.id).toBe('cash')
  })

  it('treats an agency with no work yet as healthy rather than failing', () => {
    const empty: OwnerKpis = {
      ...kpis,
      collected: 0,
      outstanding: 0,
      collectionRate: 0,
      openCases: 0,
      atRiskCount: 0,
    }
    const health = computeBusinessHealth({
      kpis: empty,
      paperwork: { ...paperwork, inHandRate: 1 },
      overdueDepartures: 0,
    })
    expect(health.score).toBe(100)
  })

  it('flags an agency with weak signals as at risk', () => {
    const health = computeBusinessHealth({
      kpis: { ...kpis, collectionRate: 0.2, atRiskCount: 4 },
      paperwork: { ...paperwork, inHandRate: 0.3 },
      overdueDepartures: 3,
    })
    expect(health.verdict).toBe('at-risk')
  })
})
