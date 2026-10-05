import { afterEach, describe, expect, it } from 'vitest'
import {
  LEISURE_USER,
  clearSession,
  writeSession,
} from '@/lib/authApi'
import { getStepDefs } from '@/lib/caseChecklist'
import { buildCaseDocuments } from '@/lib/caseDocuments'
import { createCase } from '@/lib/casesStore'
import { createClient } from '@/lib/clientsStore'
import {
  getServiceTemplateOverride,
  renameServiceTemplate,
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

describe('service template overrides', () => {
  it('lets an agency set status steps and a document checklist', () => {
    asLeisure()
    saveServiceTemplate({
      serviceName: 'Tour Package',
      steps: [
        { id: 'enquiry', label: 'Enquiry' },
        { id: 'permit', label: 'Permit', requiredDocumentIds: ['police'] },
        { id: 'gone', label: 'Travelled' },
      ],
      documents: [
        { id: 'passport', name: 'Passport', required: true },
        { id: 'police', name: 'Police clearance', required: true },
      ],
    })

    expect(getStepDefs('Tour Package').map((step) => step.label)).toEqual([
      'Enquiry',
      'Permit',
      'Travelled',
    ])
    expect(buildCaseDocuments('Tour Package').map((doc) => doc.name)).toEqual([
      'Passport',
      'Police clearance',
    ])
    const saved = getServiceTemplateOverride('Tour Package')
    expect(
      saved?.steps.find((step) => step.id === 'permit')?.requiredDocumentIds,
    ).toEqual(['police'])
    expect(
      saved?.documents.find((doc) => doc.id === 'police')?.unlockStepId,
    ).toBe('permit')
  })

  it('renames a saved template with the service', () => {
    asLeisure()
    saveServiceTemplate({
      serviceName: 'Visa rush',
      steps: [{ id: 'intake', label: 'Intake' }],
      documents: [],
    })
    expect(renameServiceTemplate('Visa rush', 'Visa express')).toBe(true)
    expect(getServiceTemplateOverride('Visa rush')).toBeUndefined()
    expect(getServiceTemplateOverride('Visa express')?.steps[0].label).toBe(
      'Intake',
    )
  })

  it('keeps a country-specific journey and checklist without replacing the default', () => {
    asLeisure()
    saveServiceTemplate({
      serviceName: 'Tour Package',
      steps: [
        { id: 'enquiry', label: 'Enquiry' },
        { id: 'quote', label: 'Quote' },
        { id: 'confirmed', label: 'Confirmed' },
      ],
      documents: [{ id: 'id', name: 'Photo ID', required: true }],
    })
    saveServiceTemplate({
      serviceName: 'Tour Package',
      country: 'Malaysia',
      steps: [
        { id: 'enquiry', label: 'Enquiry' },
        { id: 'visa', label: 'eNTRI / visa' },
        { id: 'travelled', label: 'Travelled' },
      ],
      documents: [
        { id: 'passport', name: 'Passport', required: true },
        { id: 'entry', name: 'eNTRI approval', required: true },
      ],
    })

    expect(getStepDefs('Tour Package').map((step) => step.id)).toEqual([
      'enquiry',
      'quote',
      'confirmed',
    ])
    expect(getStepDefs('Tour Package', 'Malaysia').map((step) => step.label)).toEqual([
      'Enquiry',
      'eNTRI / visa',
      'Travelled',
    ])
    expect(
      getStepDefs('Tour Package', 'Penang, Malaysia').map((step) => step.id),
    ).toEqual(['enquiry', 'visa', 'travelled'])
    expect(getStepDefs('Tour Package', 'Thailand').map((step) => step.id)).toEqual([
      'enquiry',
      'quote',
      'confirmed',
    ])
    expect(
      buildCaseDocuments('Tour Package', undefined, 'Malaysia').map((doc) => doc.name),
    ).toEqual(['Passport', 'eNTRI approval'])
    expect(buildCaseDocuments('Tour Package').map((doc) => doc.name)).toEqual([
      'Photo ID',
    ])

    const client = createClient({
      name: 'Malaysia Traveller',
      phone: `015${Date.now().toString().slice(-8)}`,
      primaryService: 'Tour Package',
      idChecked: true,
    })
    const file = createCase({
      clientId: client.id,
      service: 'Tour Package',
      serviceCountry: 'Malaysia',
      destination: 'Penang, Malaysia',
    })
    expect(file.serviceCountry).toBe('Malaysia')
    expect(file.currentStepId).toBe('enquiry')
    expect(Object.keys(file.steps)).toEqual(['enquiry', 'visa', 'travelled'])
    expect(file.documents.map((doc) => doc.name)).toEqual([
      'Passport',
      'eNTRI approval',
    ])
  })
})
