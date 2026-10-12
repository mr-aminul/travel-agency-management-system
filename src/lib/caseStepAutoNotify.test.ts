import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEMO_USER,
  clearSession,
  writeSession,
} from '@/lib/authApi'
import { notifyCaseEnteredStep } from '@/lib/caseStepAutoNotify'
import { getClientById } from '@/lib/clientsStore'
import { resetClientMessages, listClientMessages } from '@/lib/clientMessagesStore'
import {
  resetServiceTemplates,
  saveServiceTemplate,
} from '@/lib/serviceTemplatesStore'
import { resetSmsTemplates } from '@/lib/smsTemplatesStore'
import type { Case } from '@/types/case'
import { TENANT_IDS } from '@/types/tenant'

vi.mock('@/lib/smsInboundApi', () => ({
  sendClientSmsViaApi: vi.fn(async () => ({ ok: true, to: '01712345678' })),
}))

vi.mock('@/lib/clientEmailApi', () => ({
  sendClientEmailViaApi: vi.fn(async () => ({
    ok: true,
    to: 'rahim.uddin@email.com',
    subject: 'Update',
  })),
}))

import { sendClientSmsViaApi } from '@/lib/smsInboundApi'
import { sendClientEmailViaApi } from '@/lib/clientEmailApi'

const CLIENT_ID = 'c-284'

afterEach(() => {
  clearSession()
  resetServiceTemplates()
  resetClientMessages()
  resetSmsTemplates()
  vi.mocked(sendClientSmsViaApi).mockClear()
  vi.mocked(sendClientEmailViaApi).mockClear()
})

beforeEach(() => {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.full,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
})

function sampleCase(overrides?: Partial<Case>): Case {
  const client = getClientById(CLIENT_ID)!
  return {
    id: 'case-1',
    tenantId: TENANT_IDS.full,
    caseId: 'TP-001',
    clientId: client.id,
    clientName: client.name,
    service: 'Tour Package',
    status: 'In-Progress',
    stage: 'Intake',
    currentStepId: 'enquiry',
    steps: {
      enquiry: { completedAt: null, detail: 'Opened' },
      gone: { completedAt: null },
    },
    documents: [],
    serviceFee: 0,
    balance: 0,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  }
}

describe('notifyCaseEnteredStep', () => {
  it('sends SMS and email when the status has auto-notify enabled', async () => {
    saveServiceTemplate({
      serviceName: 'Tour Package',
      steps: [
        {
          id: 'enquiry',
          label: 'Enquiry',
          autoNotify: { sms: true, email: true },
        },
        { id: 'gone', label: 'Travelled' },
      ],
      documents: [],
    })

    const item = sampleCase()
    await notifyCaseEnteredStep(item, 'enquiry')

    expect(sendClientSmsViaApi).toHaveBeenCalledTimes(1)
    expect(sendClientEmailViaApi).toHaveBeenCalledTimes(1)
    expect(listClientMessages(CLIENT_ID, 'sms')).toHaveLength(1)
    expect(listClientMessages(CLIENT_ID, 'email')).toHaveLength(1)

    const smsBody = vi.mocked(sendClientSmsViaApi).mock.calls[0]?.[0].body ?? ''
    expect(smsBody).toContain('Enquiry')
    expect(smsBody).toContain('Tour Package')
    expect(smsBody).toContain(CLIENT_ID)
  })

  it('skips send when auto-notify is off', async () => {
    saveServiceTemplate({
      serviceName: 'Tour Package',
      steps: [{ id: 'enquiry', label: 'Enquiry' }],
      documents: [],
    })

    await notifyCaseEnteredStep(sampleCase(), 'enquiry')
    expect(sendClientSmsViaApi).not.toHaveBeenCalled()
    expect(sendClientEmailViaApi).not.toHaveBeenCalled()
  })
})
