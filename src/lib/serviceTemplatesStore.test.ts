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
      serviceName: 'Leisure',
      steps: [
        { id: 'enquiry', label: 'Enquiry' },
        { id: 'permit', label: 'Permit' },
        { id: 'gone', label: 'Travelled' },
      ],
      documents: [
        { id: 'passport', name: 'Passport', required: true },
        { id: 'police', name: 'Police clearance', required: true },
      ],
    })

    expect(getStepDefs('Leisure').map((step) => step.label)).toEqual([
      'Enquiry',
      'Permit',
      'Travelled',
    ])
    expect(buildCaseDocuments('Leisure').map((doc) => doc.name)).toEqual([
      'Passport',
      'Police clearance',
    ])
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
      serviceName: 'Leisure',
      steps: [
        { id: 'enquiry', label: 'Enquiry' },
        { id: 'quote', label: 'Quote' },
        { id: 'confirmed', label: 'Confirmed' },
      ],
      documents: [{ id: 'id', name: 'Photo ID', required: true }],
    })
    saveServiceTemplate({
      serviceName: 'Leisure',
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

    expect(getStepDefs('Leisure').map((step) => step.id)).toEqual([
      'enquiry',
      'quote',
      'confirmed',
    ])
    expect(getStepDefs('Leisure', 'Malaysia').map((step) => step.label)).toEqual([
      'Enquiry',
      'eNTRI / visa',
      'Travelled',
    ])
    expect(
      getStepDefs('Leisure', 'Penang, Malaysia').map((step) => step.id),
    ).toEqual(['enquiry', 'visa', 'travelled'])
    expect(getStepDefs('Leisure', 'Thailand').map((step) => step.id)).toEqual([
      'enquiry',
      'quote',
      'confirmed',
    ])
    expect(
      buildCaseDocuments('Leisure', undefined, 'Malaysia').map((doc) => doc.name),
    ).toEqual(['Passport', 'eNTRI approval'])
    expect(buildCaseDocuments('Leisure').map((doc) => doc.name)).toEqual([
      'Photo ID',
    ])

    const client = createClient({
      name: 'Malaysia Traveller',
      phone: `015${Date.now().toString().slice(-8)}`,
      primaryService: 'Leisure',
      idChecked: true,
    })
    const file = createCase({
      clientId: client.id,
      service: 'Leisure',
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
