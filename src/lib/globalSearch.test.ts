import { describe, expect, it } from 'vitest'
import { searchWorkspace } from '@/lib/globalSearch'
import type { Client } from '@/types/client'
import type { SubAgent } from '@/types/subAgent'
import { TENANT_IDS } from '@/types/tenant'

const rahim: Client = {
  id: 'c-284',
  tenantId: TENANT_IDS.full,
  name: 'Md. Rahim Uddin',
  phone: '01712345678',
  nid: '1990123456789',
  passport: 'A12345678',
  services: ['Work Permit Visa'],
  balance: 0,
  activeCases: 0,
  idChecked: true,
  createdAt: '2025-11-12',
}

const farhana: Client = {
  id: 'c-291',
  tenantId: TENANT_IDS.full,
  name: 'Farhana Akter',
  phone: '01819221100',
  passport: 'B98765432',
  services: ['Student Visa'],
  balance: 0,
  activeCases: 0,
  idChecked: true,
  createdAt: '2026-01-08',
}

const rakib: SubAgent = {
  id: 'AGT-T0001',
  tenantId: TENANT_IDS.full,
  name: 'Rakib Travels',
  phone: '01700001111',
  licenseNumber: 'RL-1001',
  status: 'Active',
  createdAt: '2024-01-10T08:00:00.000Z',
}

describe('searchWorkspace', () => {
  it('returns nothing until two characters are entered', () => {
    expect(searchWorkspace('A', { clients: [rahim], subAgents: [rakib] })).toEqual(
      [],
    )
  })

  it('finds a client by passport, nid, mobile, or id', () => {
    const sources = { clients: [rahim, farhana], subAgents: [rakib] }
    expect(searchWorkspace('A12345678', sources)[0]?.id).toBe('c-284')
    expect(searchWorkspace('1990123456789', sources)[0]?.id).toBe('c-284')
    expect(searchWorkspace('01712345678', sources)[0]?.id).toBe('c-284')
    expect(searchWorkspace('c-284', sources)[0]?.href).toBe('/clients/c-284')
  })

  it('finds a subAgent by agent id', () => {
    const hits = searchWorkspace('AGT-T0001', {
      clients: [rahim],
      subAgents: [rakib],
    })
    expect(hits[0]).toMatchObject({
      kind: 'subAgent',
      href: '/sub-agents/AGT-T0001',
    })
  })

  it('omits subAgents when none are supplied', () => {
    const hits = searchWorkspace('AGT-T0001', { clients: [rahim] })
    expect(hits).toEqual([])
  })
})
