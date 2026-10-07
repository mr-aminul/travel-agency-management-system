import { describe, expect, it } from 'vitest'
import { DEMO_USER, writeSession } from '@/lib/authApi'
import {
  countClientDocumentAlerts,
  getClientIdentityRows,
  getClientServiceDocumentGroups,
  isIdentityCaseDocument,
} from '@/lib/clientDocuments'
import { createCase, getCaseById, recordIdentityDocument } from '@/lib/casesStore'
import { createClient, getClientById } from '@/lib/clientsStore'
import { TENANT_IDS } from '@/types/tenant'

describe('client documents inventory', () => {
  it('treats passport and national id as identity, not service papers', () => {
    expect(isIdentityCaseDocument('passport')).toBe(true)
    expect(isIdentityCaseDocument('nid')).toBe(true)
    expect(isIdentityCaseDocument('id')).toBe(true)
    expect(isIdentityCaseDocument('medical')).toBe(false)
    expect(isIdentityCaseDocument('ticket')).toBe(false)
  })

  it('lists identity once and keeps service papers on each file', () => {
    writeSession({
      user: DEMO_USER,
      tenantId: TENANT_IDS.full,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    const client = createClient({
      name: 'Docs Client',
      phone: `013${Date.now().toString().slice(-8)}`,
      passport: 'A11112222',
      nid: '1990111122222',
      primaryService: 'Work Permit Visa',
      idChecked: true,
    })
    const permit = createCase({
      clientId: client.id,
      service: 'Work Permit Visa',
    })
    const ticket = createCase({
      clientId: client.id,
      service: 'Air Ticket',
    })

    const identity = getClientIdentityRows(client, [permit, ticket])
    expect(identity.map((row) => row.kind)).toEqual(['passport', 'nid'])
    expect(identity[0]?.value).toBe('A11112222')
    expect(identity[1]?.value).toBe('1990111122222')
    // Client passport is already on the profile, so service files do not need a copy.
    expect(identity[0]?.needsCopy).toEqual([])
    expect(identity[0]?.value).toBe('A11112222')

    const groups = getClientServiceDocumentGroups([permit, ticket])
    expect(groups).toHaveLength(2)
    expect(groups[0]?.papers.some((doc) => doc.id === 'passport')).toBe(false)
    expect(groups[0]?.papers.map((doc) => doc.id)).toEqual(
      expect.arrayContaining(['medical', 'demand', 'bmet']),
    )
    expect(groups[1]?.papers.map((doc) => doc.id)).toEqual(
      expect.arrayContaining(['payment', 'ticket']),
    )
  })

  it('files identity onto the client and every service that uses it', () => {
    writeSession({
      user: DEMO_USER,
      tenantId: TENANT_IDS.full,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    const client = createClient({
      name: 'Identity File Client',
      phone: `019${Date.now().toString().slice(-8)}`,
      primaryService: 'Work Permit Visa',
      idChecked: true,
    })
    const permit = createCase({
      clientId: client.id,
      service: 'Work Permit Visa',
    })
    const ticket = createCase({
      clientId: client.id,
      service: 'Air Ticket',
    })

    recordIdentityDocument(client.id, 'passport', {
      fields: { number: 'C44556677', expiry: '2032-01-01' },
      detail: 'C44556677 · 2032-01-01',
      expiry: '2032-01-01',
      fileName: 'passport.pdf',
    })

    expect(getClientById(client.id)?.passport).toBe('C44556677')
    expect(getClientById(client.id)?.passportExpiry).toBe('2032-01-01')
    expect(getClientById(client.id)?.passportFile?.fileName).toBe('passport.pdf')
    expect(
      getCaseById(permit.id)?.documents.find((doc) => doc.id === 'passport')
        ?.fields?.number,
    ).toBe('C44556677')
    expect(
      getCaseById(ticket.id)?.documents.find((doc) => doc.id === 'passport')
        ?.fileName,
    ).toBe('passport.pdf')
  })

  it('counts identity and unlocked service docs that still need a file upload', () => {
    writeSession({
      user: DEMO_USER,
      tenantId: TENANT_IDS.full,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    const client = createClient({
      name: 'Alert Docs Client',
      phone: `017${Date.now().toString().slice(-8)}`,
      passport: 'P99887766',
      primaryService: 'Tourist Visa',
      idChecked: true,
    })
    const visa = createCase({
      clientId: client.id,
      service: 'Tourist Visa',
    })

    // Number alone must not clear the passport alert — scan is still missing.
    expect(countClientDocumentAlerts(client, [visa])).toBeGreaterThanOrEqual(2)

    recordIdentityDocument(client.id, 'passport', {
      fields: { number: 'P99887766' },
      detail: 'P99887766',
      fileName: 'passport-scan.pdf',
    })
    const refreshed = getClientById(client.id)!
    const refreshedCase = getCaseById(visa.id)!
    // Passport file attached; NID scan still missing.
    expect(countClientDocumentAlerts(refreshed, [refreshedCase])).toBeGreaterThanOrEqual(
      1,
    )
  })
})
