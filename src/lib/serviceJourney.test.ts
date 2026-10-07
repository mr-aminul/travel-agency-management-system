import { describe, expect, it } from 'vitest'
import { findCasesByClientIdAnyTenant } from '@/lib/casesStore'
import { buildServiceJourney } from '@/lib/serviceJourney'

function workPermitCase() {
  const item = findCasesByClientIdAnyTenant('c-284').find(
    (entry) => entry.id === 'case-101',
  )
  if (!item) throw new Error('Missing seed case-101')
  return item
}

describe('buildServiceJourney', () => {
  it('matches the public tracking stages for the seed work-permit case', () => {
    const journey = buildServiceJourney(workPermitCase())

    expect(journey.stageLabel).toBe('Stage 5 of 9')
    expect(journey.completedCount).toBe(4)
    expect(journey.steps.map((step) => [step.label, step.state, step.dateLabel])).toEqual([
      ['Registered', 'done', '20-Nov-2025'],
      ['Shortlisted', 'done', '20-Nov-2025'],
      ['Interview', 'done', '20-Nov-2025'],
      ['Selected', 'done', '20-Nov-2025'],
      ['Medical', 'current', 'Now'],
      ['Visa', 'upcoming', 'Upcoming'],
      ['Clearance', 'upcoming', 'Upcoming'],
      ['Ticket', 'upcoming', 'Upcoming'],
      ['Departed', 'upcoming', 'Upcoming'],
    ])
    expect(journey.steps[4]?.note).toBe('GAMCA medical in progress')
  })

  it('prompts staff to complete the current step when it has no detail', () => {
    const item = workPermitCase()
    const withoutDetail = {
      ...item,
      steps: {
        ...item.steps,
        medical: { ...item.steps.medical, detail: undefined },
      },
    }

    expect(buildServiceJourney(withoutDetail).steps[4]?.note).toBeNull()
    expect(
      buildServiceJourney(withoutDetail, { interactive: true }).steps[4]?.note,
    ).toBe('Tap to complete')
  })
})
