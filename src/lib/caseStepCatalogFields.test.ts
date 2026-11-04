import { afterEach, describe, expect, it } from 'vitest'
import {
  DEMO_USER,
  clearSession,
  writeSession,
} from '@/lib/authApi'
import { createCase } from '@/lib/casesStore'
import { createClient } from '@/lib/clientsStore'
import { getCaseStepRequirement } from '@/lib/caseStepRequirementResolve'
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
    user: DEMO_USER,
    tenantId: TENANT_IDS.demo,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

describe('catalog-only step complete fields', () => {
  it('hides builtin Employer/date fields once a catalog flow is saved', () => {
    asLeisure()
    saveServiceTemplate({
      serviceName: 'Work Permit Visa',
      steps: [
        { id: 'registered', label: 'Registered' },
        {
          id: 'shortlisted',
          label: 'Tasheer',
          decisions: [
            {
              key: 'finger',
              label: 'Finger',
              options: [{ value: 'Yes' }, { value: 'No', skipDocuments: true }],
            },
          ],
          fields: [
            {
              key: 'clinic',
              label: 'Clinic name',
              type: 'text',
              required: true,
            },
          ],
        },
        { id: 'visa', label: 'Visa' },
      ],
      documents: [],
    })

    const client = createClient({
      name: 'Catalog Fields Client',
      phone: `016${Date.now().toString().slice(-8)}`,
      primaryService: 'Work Permit Visa',
      idChecked: true,
    })
    const file = createCase({
      clientId: client.id,
      service: 'Work Permit Visa',
    })

    const requirement = getCaseStepRequirement(file, 'shortlisted')
    const labels = requirement.fields.map((field) => field.label)
    expect(labels).toContain('Finger')
    expect(labels).toContain('Clinic name')
    expect(labels).not.toContain('Employer / demand')
    expect(labels).not.toContain('Shortlisted on')
  })
})
