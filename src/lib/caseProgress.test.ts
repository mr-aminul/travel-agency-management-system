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
  it('starts a new case on the first service step', () => {
    const client = createClient({
      name: 'Test Client',
      phone: `017${Date.now().toString().slice(-8)}`,
      primaryService: 'Work Permit Visa',
      idChecked: true,
    })
    const created = createCase({
      clientId: client.id,
      service: 'Work Permit Visa',
    })

    expect(created.currentStepId).toBe('registered')
    expect(getCurrentStepLabel(created)).toBe('Registered')
    expect(getNextStepDef(created)?.id).toBe('shortlisted')
    expect(created.documents.length).toBeGreaterThan(0)
    expect(getStepRequirement('Work Permit Visa', 'registered')).toBeTruthy()
  })

  it('blocks advance when required step data is missing', () => {
    const client = createClient({
      name: 'Blocked Client',
      phone: `016${Date.now().toString().slice(-8)}`,
      primaryService: 'Student Visa',
      idChecked: true,
      passport: 'BP1234567',
    })
    const created = createCase({
      clientId: client.id,
      service: 'Student Visa',
    })

    const blocked = completeCurrentStep(created.id, { fields: {}, uploads: [] })
    expect(blocked.ok).toBe(false)
    expect(getCaseById(created.id)?.currentStepId).toBe('registered')
  })

  it('blocks advance when the client passport number is missing', () => {
    const client = createClient({
      name: 'No Passport Client',
      phone: `015${Date.now().toString().slice(-8)}`,
      primaryService: 'Air Ticket',
      idChecked: true,
    })
    const created = createCase({
      clientId: client.id,
      service: 'Air Ticket',
      balance: 5000,
    })

    const blocked = completeCurrentStep(created.id, {
      fields: {
        route: 'DAC-JED',
        travelDate: '2026-09-12',
        passengers: '1',
      },
      uploads: [{ key: 'passportCopy', fileName: 'passport.pdf' }],
    })

    expect(blocked.ok).toBe(false)
    if (blocked.ok) return
    expect(blocked.errors.form).toMatch(/passport number/i)
    expect(getCaseById(created.id)?.currentStepId).toBe('request')
  })

  it('advances only after required fields and uploads are saved', () => {
    const client = createClient({
      name: 'Advance Client',
      phone: `018${Date.now().toString().slice(-8)}`,
      primaryService: 'Air Ticket',
      idChecked: true,
      passport: 'AP9876543',
    })
    const created = createCase({
      clientId: client.id,
      service: 'Air Ticket',
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
