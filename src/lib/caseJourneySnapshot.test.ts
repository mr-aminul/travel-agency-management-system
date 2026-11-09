import { beforeEach, describe, expect, it } from 'vitest'
import { getStepDefsForCase } from '@/lib/caseChecklist'
import {
  captureJourneySnapshot,
  inferJourneySnapshotFromCase,
  resolveCaseJourneySnapshot,
} from '@/lib/caseJourneySnapshot'
import {
  createCase,
  ensureCaseAlignedWithCatalog,
  getCaseById,
  resetCases,
} from '@/lib/casesStore'
import { resetClients } from '@/lib/clientsStore'
import { buildServiceJourney } from '@/lib/serviceJourney'
import {
  resetServiceTemplates,
  saveServiceTemplate,
} from '@/lib/serviceTemplatesStore'
import type { Case } from '@/types/case'

describe('case journey snapshots', () => {
  beforeEach(() => {
    resetClients()
    resetCases()
    resetServiceTemplates()
  })

  it('pins the live catalog on a new file', () => {
    const created = createCase({
      clientId: 'c-284',
      service: 'Student Visa',
    })
    expect(created.journey?.steps.length).toBeGreaterThan(0)
    expect(getStepDefsForCase(created).map((step) => step.id)).toEqual(
      created.journey!.steps.map((step) => step.id),
    )
  })

  it('keeps an open file on its pinned journey after the catalog gains a stage', () => {
    const created = createCase({
      clientId: 'c-284',
      service: 'Student Visa',
    })
    const pinnedIds = created.journey!.steps.map((step) => step.id)

    saveServiceTemplate({
      serviceName: 'Student Visa',
      steps: [
        ...created.journey!.steps.map((step) => ({
          id: step.id,
          label: step.label,
        })),
        { id: 'biometrics', label: 'Biometrics' },
      ],
      documents: created.journey!.documents.map((doc) => ({
        id: doc.id,
        name: doc.name,
        required: doc.required,
        unlockStepId: doc.unlockStepId,
      })),
    })

    const live = ensureCaseAlignedWithCatalog(created.id)
    expect(live?.journey?.steps.map((step) => step.id)).toEqual(pinnedIds)
    expect(getStepDefsForCase(live!).map((step) => step.id)).toEqual(pinnedIds)
    expect(
      getStepDefsForCase(live!).some((step) => step.id === 'biometrics'),
    ).toBe(false)

    const fresh = createCase({
      clientId: 'c-284',
      service: 'Student Visa',
    })
    expect(fresh.journey?.steps.some((step) => step.id === 'biometrics')).toBe(
      true,
    )
  })

  it('does not invent new stages on a completed legacy file', () => {
    const closed: Case = {
      id: 'case-legacy-sv',
      tenantId: 'tenant-demo',
      caseId: 'SR-LEGACY',
      clientId: 'c-284',
      clientName: 'Md. Rahim Uddin',
      service: 'Student Visa',
      status: 'Completed',
      stage: 'Closed',
      currentStepId: 'departed',
      steps: {
        registered: { completedAt: '2025-01-01', detail: 'Done' },
        counselled: { completedAt: '2025-01-02', detail: 'Done' },
        applied: { completedAt: '2025-01-03', detail: 'Done' },
        offer: { completedAt: '2025-01-04', detail: 'Done' },
        visa: { completedAt: '2025-01-05', detail: 'Done' },
        ticket: { completedAt: '2025-01-06', detail: 'Done' },
        departed: { completedAt: '2025-01-07', detail: 'Done' },
      },
      documents: [
        {
          id: 'passport',
          name: 'Passport',
          detail: '',
          status: 'approved',
          expiry: null,
          required: true,
          icon: 'passport',
        },
      ],
      serviceFee: 1,
      balance: 0,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-07',
    }

    const inferred = inferJourneySnapshotFromCase(closed)
    expect(inferred.steps.map((step) => step.id)).toEqual([
      'registered',
      'counselled',
      'applied',
      'offer',
      'visa',
      'ticket',
      'departed',
    ])
    expect(inferred.steps.some((step) => step.id === 'biometrics')).toBe(false)

    const withPin = { ...closed, journey: inferred }
    const journey = buildServiceJourney(withPin, { hideUpcoming: false })
    expect(journey.steps.map((step) => step.id)).toEqual(
      inferred.steps.map((step) => step.id),
    )
  })

  it('captures today’s catalog for an open legacy file without a pin', () => {
    const open: Case = {
      id: 'case-open-legacy',
      tenantId: 'tenant-demo',
      caseId: 'SR-OPEN',
      clientId: 'c-284',
      clientName: 'Md. Rahim Uddin',
      service: 'Student Visa',
      status: 'In-Progress',
      stage: 'Processing',
      currentStepId: 'counselled',
      steps: {
        registered: { completedAt: '2026-01-01', detail: 'Done' },
        counselled: { completedAt: null, detail: 'In progress' },
      },
      documents: [],
      serviceFee: 1,
      balance: 1,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    }

    const resolved = resolveCaseJourneySnapshot(open)
    const live = captureJourneySnapshot('Student Visa')
    expect(resolved.steps.map((step) => step.id)).toEqual(
      live.steps.map((step) => step.id),
    )
  })

  it('pins demo files so later catalog edits do not rewrite them', () => {
    const seeded = getCaseById('case-103')
    expect(seeded?.journey?.steps.length).toBeGreaterThan(0)
    const before = seeded!.journey!.steps.map((step) => step.id)

    saveServiceTemplate({
      serviceName: 'Student Visa',
      steps: [
        ...seeded!.journey!.steps.map((step) => ({
          id: step.id,
          label: step.label,
        })),
        { id: 'extra-check', label: 'Extra check' },
      ],
      documents: (seeded!.journey?.documents ?? []).map((doc) => ({
        id: doc.id,
        name: doc.name,
        required: doc.required,
        unlockStepId: doc.unlockStepId,
      })),
    })

    const after = ensureCaseAlignedWithCatalog('case-103')
    expect(after?.journey?.steps.map((step) => step.id)).toEqual(before)
  })
})
