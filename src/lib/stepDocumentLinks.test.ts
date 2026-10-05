import { describe, expect, it } from 'vitest'
import {
  syncDocumentUnlockSteps,
  toggleStepRequiredDocument,
  withRequiredDocumentIds,
} from '@/lib/stepDocumentLinks'

describe('stepDocumentLinks', () => {
  it('derives Needs docs from document unlock steps when unset', () => {
    const steps = withRequiredDocumentIds(
      [
        { id: 'applied', label: 'Visa applied' },
        { id: 'visa', label: 'Visa issued' },
      ],
      [
        { id: 'itinerary', name: 'Travel itinerary', required: true, unlockStepId: 'applied' },
        { id: 'visa', name: 'Tourist visa', required: true, unlockStepId: 'visa' },
      ],
    )
    expect(steps[0].requiredDocumentIds).toEqual(['itinerary'])
    expect(steps[1].requiredDocumentIds).toEqual(['visa'])
  })

  it('keeps a document on only one status when toggled', () => {
    const next = toggleStepRequiredDocument(
      [
        { id: 'applied', label: 'Visa applied', requiredDocumentIds: ['itinerary'] },
        { id: 'visa', label: 'Visa issued', requiredDocumentIds: [] },
      ],
      'visa',
      'itinerary',
    )
    expect(next[0].requiredDocumentIds).toEqual([])
    expect(next[1].requiredDocumentIds).toEqual(['itinerary'])
  })

  it('syncs unlockStepId from Needs docs on save', () => {
    const { steps, documents } = syncDocumentUnlockSteps(
      [
        { id: 'applied', label: 'Visa applied', requiredDocumentIds: ['itinerary'] },
        { id: 'visa', label: 'Visa issued', requiredDocumentIds: [] },
      ],
      [
        { id: 'itinerary', name: 'Travel itinerary', required: true, unlockStepId: 'visa' },
        { id: 'visa', name: 'Tourist visa', required: true, unlockStepId: 'visa' },
      ],
    )
    expect(steps[0].requiredDocumentIds).toEqual(['itinerary'])
    expect(documents.find((doc) => doc.id === 'itinerary')?.unlockStepId).toBe(
      'applied',
    )
    expect(documents.find((doc) => doc.id === 'visa')?.unlockStepId).toBeUndefined()
  })
})
