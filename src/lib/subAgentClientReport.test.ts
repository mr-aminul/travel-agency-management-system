import { describe, expect, it } from 'vitest'
import {
  ageFromDateOfBirth,
  buildSubAgentClientReport,
  moveReportColumn,
  subAgentClientReportPdfFileName,
} from '@/lib/subAgentClientReport'
import type { AgencyProfile } from '@/lib/agencyProfile'
import type { Client } from '@/types/client'
import type { SubAgent } from '@/types/subAgent'

const subAgent: SubAgent = {
  id: 'AGT-1001',
  tenantId: 'tenant-full',
  name: 'S Badal Overseas',
  phone: '01827112598',
  licenseNumber: '2978',
  branch: 'Dhaka',
  status: 'Active',
  createdAt: '2026-10-29T00:00:00.000Z',
}

const clients: Client[] = [
  {
    id: 'CLT-1',
    tenantId: 'tenant-full',
    name: 'MD HASMOT ALI',
    phone: '01711111111',
    passport: 'A1234567',
    passportExpiry: '2030-08-20',
    preferredCountry: 'Saudi Arabia',
    dateOfBirth: '1995-04-12',
    services: [],
    balance: 5000,
    activeCases: 1,
    idChecked: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    subAgentId: 'AGT-1001',
  },
  {
    id: 'CLT-2',
    tenantId: 'tenant-full',
    name: 'MD EMAM HASAN',
    phone: '01722222222',
    services: [],
    balance: 0,
    activeCases: 0,
    idChecked: true,
    createdAt: '2026-10-02T00:00:00.000Z',
    subAgentId: 'AGT-1001',
  },
]

const profile: AgencyProfile = {
  businessName: 'Ismail Recruiting House',
  address: 'Dhaka',
  mobile: '01700000000',
  website: 'https://irhbd.com',
  profilePicture: null,
}

describe('buildSubAgentClientReport', () => {
  it('builds a branded report for selected clients only', () => {
    const report = buildSubAgentClientReport({
      subAgent,
      clients: [clients[0]],
      statusByClientId: new Map([['CLT-1', 'Pending']]),
      profile,
      issuedOn: '2026-11-04',
    })

    expect(report.agencyName).toBe('Ismail Recruiting House')
    expect(report.subAgentName).toBe('S Badal Overseas')
    expect(report.clientCount).toBe(1)
    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]?.name).toBe('MD HASMOT ALI')
    expect(report.rows[0]?.status).toBe('Pending')
    expect(report.columns).not.toContain('balance')
    expect(report.showAmountSummary).toBe(false)
    expect(report.totalOutstanding).toBe(0)
    expect(subAgentClientReportPdfFileName(report)).toBe(
      'sub-agent-clients-AGT-1001-20261104.pdf',
    )
  })

  it('shows amount summary only when balance column is included', () => {
    const report = buildSubAgentClientReport({
      subAgent,
      clients: [clients[0], clients[1]],
      statusByClientId: new Map([['CLT-1', 'Pending']]),
      profile,
      columns: ['name', 'balance'],
      issuedOn: '2026-11-04',
    })

    expect(report.columns).toEqual(['name', 'balance'])
    expect(report.showAmountSummary).toBe(true)
    expect(report.totalOutstanding).toBe(5000)
  })

  it('includes date of birth and age when those columns are selected', () => {
    const report = buildSubAgentClientReport({
      subAgent,
      clients: [clients[0]],
      statusByClientId: new Map([['CLT-1', 'Pending']]),
      profile,
      columns: ['name', 'dateOfBirth', 'age'],
      issuedOn: '2026-11-04',
    })

    expect(report.columns).toEqual(['name', 'dateOfBirth', 'age'])
    expect(report.rows[0]?.dateOfBirthLabel).toBe('12-Apr-1995')
    expect(report.rows[0]?.age).toBe(
      String(ageFromDateOfBirth('1995-04-12', new Date('2026-11-04'))),
    )
  })
})

describe('ageFromDateOfBirth', () => {
  it('returns completed years from an ISO date', () => {
    expect(ageFromDateOfBirth('1995-04-12', new Date('2026-11-04'))).toBe(31)
    expect(ageFromDateOfBirth('1995-12-01', new Date('2026-11-04'))).toBe(30)
    expect(ageFromDateOfBirth('')).toBeUndefined()
  })
})

describe('moveReportColumn', () => {
  it('reorders selected columns for table and PDF', () => {
    expect(
      moveReportColumn(['name', 'phone', 'passport'], 'phone', 1),
    ).toEqual(['name', 'passport', 'phone'])
    expect(
      moveReportColumn(
        ['name', 'phone', 'passportExpiry'],
        'passportExpiry',
        -1,
      ),
    ).toEqual(['name', 'passportExpiry', 'phone'])
  })
})

describe('passport expiry column', () => {
  it('formats passport expiry when included', () => {
    const report = buildSubAgentClientReport({
      subAgent,
      clients: [clients[0]],
      statusByClientId: new Map([['CLT-1', 'Pending']]),
      profile,
      columns: ['name', 'passportExpiry'],
      issuedOn: '2026-11-04',
    })

    expect(report.columns).toEqual(['name', 'passportExpiry'])
    expect(report.rows[0]?.passportExpiryLabel).toBe('20-Aug-2030')
  })
})


