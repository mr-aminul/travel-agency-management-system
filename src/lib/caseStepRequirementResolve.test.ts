import { afterEach, describe, expect, it } from 'vitest'
import {
  LEISURE_USER,
  clearSession,
  writeSession,
} from '@/lib/authApi'
import { createCase } from '@/lib/casesStore'
import { createClient } from '@/lib/clientsStore'
import {
  getCaseStepRequirement,
  hydrateStepUploadsFromCase,
} from '@/lib/caseStepRequirementResolve'
import { validateStepCompletion } from '@/lib/caseStepRequirements'
import {
  resetServiceTemplates,
  saveServiceTemplate,
} from '@/lib/serviceTemplatesStore'
import { TENANT_IDS } from '@/types/tenant'

afterEach(() => {
  clearSession()
  resetServiceTemplates()
})

function asLeisure() {
  writeSession({
    user: LEISURE_USER,
    tenantId: TENANT_IDS.leisure,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

describe('case step Needs docs', () => {
  it('blocks completing a status until its Needs docs are uploaded', () => {
    asLeisure()
    saveServiceTemplate({
      serviceName: 'Tour Package',
      steps: [
        {
          id: 'enquiry',
          label: 'Enquiry',
          requiredDocumentIds: ['passport'],
        },
        { id: 'gone', label: 'Travelled', requiredDocumentIds: [] },
      ],
      documents: [{ id: 'passport', name: 'Passport', required: true }],
    })

    const client = createClient({
      name: 'Needs Docs Client',
      phone: `016${Date.now().toString().slice(-8)}`,
      primaryService: 'Tour Package',
      idChecked: true,
    })
    const file = createCase({
      clientId: client.id,
      service: 'Tour Package',
    })

    const requirement = getCaseStepRequirement(file, 'enquiry')
    expect(
      requirement.uploads.some(
        (upload) => upload.documentId === 'passport' && upload.required,
      ),
    ).toBe(true)

    const missing = validateStepCompletion(requirement, {
      fields: {
        destination: 'Cox',
        guests: '2',
        travelDates: 'Next week',
        notes: 'Family trip',
      },
      uploads: [],
    })
    expect(missing.ok).toBe(false)

    const withFile = validateStepCompletion(requirement, {
      fields: {
        destination: 'Cox',
        guests: '2',
        travelDates: 'Next week',
        notes: 'Family trip',
      },
      uploads: [
        {
          key: 'doc:passport',
          fileName: 'passport.pdf',
        },
      ],
    })
    expect(withFile.ok).toBe(true)
  })

  it('treats a document already on the file as satisfying Needs docs', () => {
    asLeisure()
    saveServiceTemplate({
      serviceName: 'Tour Package',
      steps: [
        {
          id: 'enquiry',
          label: 'Enquiry',
          requiredDocumentIds: ['passport'],
        },
        { id: 'gone', label: 'Travelled', requiredDocumentIds: [] },
      ],
      documents: [{ id: 'passport', name: 'Passport', required: true }],
    })

    const client = createClient({
      name: 'On File Client',
      phone: `017${Date.now().toString().slice(-8)}`,
      primaryService: 'Tour Package',
      idChecked: true,
    })
    const file = createCase({
      clientId: client.id,
      service: 'Tour Package',
    })
    const withDoc = {
      ...file,
      documents: file.documents.map((doc) =>
        doc.id === 'passport'
          ? {
              ...doc,
              status: 'under_review' as const,
              fileName: 'scan.pdf',
              fileId: 'file-1',
            }
          : doc,
      ),
    }

    const requirement = getCaseStepRequirement(withDoc, 'enquiry')
    const hydrated = hydrateStepUploadsFromCase(withDoc, requirement, {
      fields: {
        destination: 'Cox',
        guests: '2',
        travelDates: 'Next week',
        notes: 'Family trip',
      },
      uploads: [],
    })
    expect(validateStepCompletion(requirement, hydrated).ok).toBe(true)
  })
})
