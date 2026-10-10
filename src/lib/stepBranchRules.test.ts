import { afterEach, describe, expect, it } from 'vitest'
import {
  DEMO_USER,
  clearSession,
  writeSession,
} from '@/lib/authApi'
import { getNextStepDef } from '@/lib/caseChecklist'
import { createCase, getCaseById, resetCases, updateCase } from '@/lib/casesStore'
import { createClient, resetClients } from '@/lib/clientsStore'
import { resetDocumentFormFields } from '@/lib/documentFormFieldsStore'
import {
  resetServiceTemplates,
  saveServiceTemplate,
} from '@/lib/serviceTemplatesStore'
import { matchBranchNextStepId } from '@/lib/stepBranchRules'
import { TENANT_IDS } from '@/types/tenant'
import type { CaseDocument } from '@/types/case'

afterEach(() => {
  clearSession()
  resetCases()
  resetClients()
  resetServiceTemplates()
  resetDocumentFormFields()
})

function asFull() {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.full,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

describe('step branch rules', () => {
  it('picks the next step from a matching dropdown value', () => {
    const next = matchBranchNextStepId(
      {
        id: 'medical',
        label: 'Medical',
        branchRules: [
          {
            documentId: 'medical',
            fieldKey: 'result',
            equals: 'Fit',
            nextStepId: 'visa',
          },
          {
            documentId: 'medical',
            fieldKey: 'result',
            equals: 'Unfit',
            nextStepId: 'medical',
          },
        ],
      },
      [
        {
          id: 'medical',
          name: 'Medical',
          detail: '',
          status: 'under_review',
          expiry: null,
          required: true,
          icon: 'medical',
          fields: { result: 'Unfit' },
        } satisfies CaseDocument,
      ],
      new Set(['medical', 'visa', 'ticket']),
    )
    expect(next).toBe('medical')
  })

  it('routes a work-permit file to visa when medical result is Fit', () => {
    asFull()
    saveServiceTemplate({
      serviceName: 'Work Permit Visa',
      steps: [
        { id: 'registered', label: 'Registered' },
        {
          id: 'medical',
          label: 'Medical',
          requiredDocumentIds: ['medical'],
          branchRules: [
            {
              documentId: 'medical',
              fieldKey: 'result',
              equals: 'Fit',
              nextStepId: 'visa',
            },
            {
              documentId: 'medical',
              fieldKey: 'result',
              equals: 'Unfit',
              nextStepId: 'registered',
            },
          ],
        },
        { id: 'visa', label: 'Visa' },
        { id: 'departed', label: 'Departed' },
      ],
      documents: [
        { id: 'passport', name: 'Passport', required: true },
        { id: 'medical', name: 'Medical', required: true },
      ],
    })

    const client = createClient({
      name: 'Branch Client',
      phone: `017${Date.now().toString().slice(-8)}`,
      primaryService: 'Work Permit Visa',
      idChecked: true,
      passport: 'BP9988776',
    })
    const created = createCase({
      clientId: client.id,
      service: 'Work Permit Visa',
    })
    updateCase(created.id, {
      currentStepId: 'medical',
      documents: created.documents.map((doc) =>
        doc.id === 'medical'
          ? {
              ...doc,
              status: 'under_review',
              fields: {
                clinic: 'Popular',
                date: '2026-01-01',
                result: 'Fit',
              },
            }
          : doc,
      ),
    })

    const item = getCaseById(created.id)!
    expect(getNextStepDef(item)?.id).toBe('visa')
  })
})
