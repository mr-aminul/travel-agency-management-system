import { describe, expect, it } from 'vitest'
import { DEMO_USER, writeSession } from '@/lib/authApi'
import {
  buildIdentityCaseDocument,
  countClientDocumentAlerts,
  getClientIdentityRows,
  getClientServiceDocumentGroups,
  isIdentityCaseDocument,
} from '@/lib/clientDocuments'
import { getCaseComplianceDocuments } from '@/lib/caseDocuments'
import {
  createCase,
  getCaseById,
  projectClientIdentityOntoCases,
  reconcileClientIdentityFromCases,
  recordIdentityDocument,
  updateCase,
} from '@/lib/casesStore'
import { createClient, getClientById, updateClient } from '@/lib/clientsStore'
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

  it('pulls identity that only exists on a service file onto the client profile', () => {
    writeSession({
      user: DEMO_USER,
      tenantId: TENANT_IDS.full,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    const client = createClient({
      name: 'Drifted Identity Client',
      phone: `015${Date.now().toString().slice(-8)}`,
      primaryService: 'Work Permit Visa',
      idChecked: true,
    })
    const permit = createCase({
      clientId: client.id,
      service: 'Work Permit Visa',
    })
    updateCase(permit.id, {
      documents: getCaseById(permit.id)!.documents.map((doc) =>
        doc.id === 'passport'
          ? {
              ...doc,
              status: 'under_review' as const,
              detail: 'BH1122334',
              fields: {
                number: 'BH1122334',
                issuedOn: '2019-05-10',
                expiry: '2029-05-09',
              },
              fileName: 'passport.pdf',
              fileId: 'file-passport-1',
            }
          : doc,
      ),
    })

    expect(getClientById(client.id)?.passport).toBeUndefined()

    reconcileClientIdentityFromCases(client.id)

    const healed = getClientById(client.id)!
    expect(healed.passport).toBe('BH1122334')
    expect(healed.passportIssuedOn).toBe('2019-05-10')
    expect(healed.passportExpiry).toBe('2029-05-09')
    expect(healed.passportFile?.fileName).toBe('passport.pdf')

    const identity = buildIdentityCaseDocument(
      healed,
      [getCaseById(permit.id)!],
      'passport',
    )
    expect(identity.fields?.number).toBe('BH1122334')
  })

  it('mirrors client identity onto service files so they cannot drift', () => {
    writeSession({
      user: DEMO_USER,
      tenantId: TENANT_IDS.full,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    const client = createClient({
      name: 'Source of Truth Client',
      phone: `016${Date.now().toString().slice(-8)}`,
      passport: 'PROFILE99',
      nid: '1990999888777',
      primaryService: 'Work Permit Visa',
      idChecked: true,
    })
    const permit = createCase({
      clientId: client.id,
      service: 'Work Permit Visa',
    })
    const stale = getCaseById(permit.id)!
    stale.documents = stale.documents.map((doc) =>
      doc.id === 'passport'
        ? { ...doc, detail: 'STALE11', fields: { number: 'STALE11' } }
        : doc,
    )

    const overlay = getCaseComplianceDocuments(stale).find(
      (doc) => doc.id === 'passport',
    )
    expect(overlay?.fields?.number).toBe('PROFILE99')
    expect(overlay?.detail).toBe('PROFILE99')

    updateClient(client.id, { passport: 'PROFILE00' })
    projectClientIdentityOntoCases(client.id)
    expect(
      getCaseById(permit.id)?.documents.find((doc) => doc.id === 'passport')
        ?.fields?.number,
    ).toBe('PROFILE00')
  })
})
