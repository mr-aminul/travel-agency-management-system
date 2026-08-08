import { describe, expect, it } from 'vitest'
import { getCurrentStepLabel, getNextStepDef } from '@/lib/caseChecklist'
import { getStepRequirement } from '@/lib/caseStepRequirements'
import {
  completeCurrentStep,
  createCase,
  getCaseById,
} from '@/lib/casesStore'
import { createClient } from '@/lib/clientsStore'

describe('case progress spine', () => {
  it('starts a new case on the first vertical step', () => {
    const client = createClient({
      name: 'Test Client',
      phone: `017${Date.now().toString().slice(-8)}`,
      primaryService: 'Manpower',
      idChecked: true,
    })
    const created = createCase({
      title: 'Test manpower case',
      clientId: client.id,
      vertical: 'Manpower',
    })

    expect(created.currentStepId).toBe('registered')
    expect(getCurrentStepLabel(created)).toBe('Registered')
    expect(getNextStepDef(created)?.id).toBe('shortlisted')
    expect(created.documents.length).toBeGreaterThan(0)
    expect(getStepRequirement('Manpower', 'registered')).toBeTruthy()
  })

  it('blocks advance when required step data is missing', () => {
    const client = createClient({
      name: 'Blocked Client',
      phone: `016${Date.now().toString().slice(-8)}`,
      primaryService: 'Student',
      idChecked: true,
    })
    const created = createCase({
      title: 'Canada student',
      clientId: client.id,
      vertical: 'Student',
    })

    const blocked = completeCurrentStep(created.id, { fields: {}, uploads: [] })
    expect(blocked.ok).toBe(false)
    expect(getCaseById(created.id)?.currentStepId).toBe('registered')
  })

  it('advances only after required fields and uploads are saved', () => {
    const client = createClient({
      name: 'Advance Client',
      phone: `018${Date.now().toString().slice(-8)}`,
      primaryService: 'Ticketing',
      idChecked: true,
    })
    const created = createCase({
      title: 'Test ticket',
      clientId: client.id,
      vertical: 'Ticketing',
      balance: 5000,
    })

    const advanced = completeCurrentStep(created.id, {
      fields: {
        route: 'DAC-JED',
        travelDate: '2026-09-12',
        passengers: '1',
      },
      uploads: [{ key: 'passportCopy', fileName: 'passport.pdf' }],
    })

    expect(advanced.ok).toBe(true)
    if (!advanced.ok) return
    expect(advanced.case.currentStepId).toBe('quoted')
    expect(advanced.case.status).toBe('In-Progress')
    expect(advanced.case.steps.request.completedAt).toBeTruthy()
    expect(advanced.case.steps.request.fields?.route).toBe('DAC-JED')
    expect(advanced.case.steps.request.uploads?.[0].fileName).toBe(
      'passport.pdf',
    )
  })
})
