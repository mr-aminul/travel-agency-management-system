import { describe, expect, it } from 'vitest'
import { getCaseComplianceDocuments } from '@/lib/caseDocuments'
import { completeCaseStepWithSync } from '@/lib/caseWorkflow'
import {
  createCase,
  getCaseById,
  recordCaseDocument,
} from '@/lib/casesStore'
import { createClient, getClientById } from '@/lib/clientsStore'
import { getPaymentsByCaseId } from '@/lib/paymentsStore'

describe('case tab sync', () => {
  it('records passport details from the documents modal', () => {
    const client = createClient({
      name: 'Sync Client',
      phone: `015${Date.now().toString().slice(-8)}`,
      primaryService: 'Ticketing',
      idChecked: true,
    })
    const created = createCase({
      title: 'Ticket docs',
      clientId: client.id,
      vertical: 'Ticketing',
    })

    const recorded = recordCaseDocument(created.id, 'passport', {
      fields: { number: 'A99887766', expiry: '2031-03-12' },
      detail: 'A99887766 · 2031-03-12',
      expiry: '2031-03-12',
    })

    expect(recorded?.documents.find((doc) => doc.id === 'passport')?.fields).toEqual(
      {
        number: 'A99887766',
        expiry: '2031-03-12',
      },
    )
    expect(recorded?.steps.request.uploads?.[0].fileName).toBe('A99887766')
    expect(getClientById(client.id)?.passport).toBe('A99887766')

    const docs = getCaseComplianceDocuments(recorded!)
    expect(docs.find((doc) => doc.id === 'passport')?.status).toBe(
      'under_review',
    )
  })

  it('files documents and payments from the progress step', () => {
    const client = createClient({
      name: 'Pay Client',
      phone: `014${Date.now().toString().slice(-8)}`,
      primaryService: 'Ticketing',
      idChecked: true,
      passport: 'P11223344',
    })
    const created = createCase({
      title: 'Ticket sync',
      clientId: client.id,
      vertical: 'Ticketing',
      balance: 20000,
    })

    expect(
      completeCaseStepWithSync(created.id, {
        fields: {
          route: 'DAC-DXB',
          travelDate: '2026-10-01',
          passengers: '1',
        },
        uploads: [{ key: 'passportCopy', fileName: 'passport.pdf' }],
      }).ok,
    ).toBe(true)

    expect(
      completeCaseStepWithSync(created.id, {
        fields: {
          airline: 'Emirates',
          fare: '18000',
          quotedOn: '2026-08-01',
        },
        uploads: [{ key: 'fareScreenshot', fileName: 'fare.png' }],
      }).ok,
    ).toBe(true)

    const paid = completeCaseStepWithSync(created.id, {
      fields: {
        amountPaid: '5000',
        paidOn: '2026-08-02',
        method: 'bKash',
      },
      uploads: [{ key: 'receipt', fileName: 'receipt.pdf' }],
    })
    expect(paid.ok).toBe(true)

    const fresh = getCaseById(created.id)
    expect(fresh).toBeTruthy()
    if (!fresh) return

    const docs = getCaseComplianceDocuments(fresh)
    const paymentDoc = docs.find((doc) => doc.id === 'payment')
    expect(paymentDoc?.status).toBe('under_review')
    expect(paymentDoc?.detail).toBe('receipt.pdf')

    const payments = getPaymentsByCaseId(created.id)
    expect(payments.some((item) => item.amount === 5000)).toBe(true)
    expect(fresh.balance).toBe(15000)
  })
})
