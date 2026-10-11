import { describe, expect, it } from 'vitest'
import {
  listBranchSlotsForStep,
  listSelectFields,
  pruneBranchRulesForFields,
  upsertBranchRule,
} from '@/lib/serviceBranchFields'

describe('listSelectFields', () => {
  it('includes dropdown fields and fills empty choices', () => {
    const refs = listSelectFields(
      [
        { id: 'medical', name: 'Medical', required: true },
        { id: 'passport', name: 'Passport', required: true },
      ],
      {
        medical: [
          {
            key: 'result',
            label: 'Result',
            type: 'select',
            options: [],
          },
        ],
        passport: [
          { key: 'number', label: 'Number', type: 'text' },
        ],
      },
    )
    expect(refs).toHaveLength(1)
    expect(refs[0]?.fieldKey).toBe('result')
    expect(refs[0]?.options).toEqual(['Fit', 'Unfit'])
  })

  it('prefers dropdowns on the source step documents', () => {
    const refs = listSelectFields(
      [
        { id: 'medical', name: 'Medical', required: true },
        { id: 'other', name: 'Other', required: false },
      ],
      {
        medical: [
          {
            key: 'result',
            label: 'Result',
            type: 'select',
            options: ['Fit', 'Unfit'],
          },
        ],
        other: [
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: ['A', 'B'],
          },
        ],
      },
      { preferDocumentIds: ['other'] },
    )
    expect(refs.map((field) => field.documentId)).toEqual(['other', 'medical'])
  })
})

describe('listBranchSlotsForStep', () => {
  it('creates an unwired slot for each dropdown choice on needed docs', () => {
    const slots = listBranchSlotsForStep(
      {
        id: 'registered',
        label: 'Registered',
        requiredDocumentIds: ['passport'],
      },
      [{ id: 'passport', name: 'Machine Readable Passport', required: true }],
      {
        passport: [
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: ['Fit', 'Unfit'],
          },
        ],
      },
    )
    expect(slots).toEqual([
      {
        documentId: 'passport',
        documentName: 'Machine Readable Passport',
        fieldKey: 'status',
        fieldLabel: 'Status',
        equals: 'Fit',
        nextStepId: '',
      },
      {
        documentId: 'passport',
        documentName: 'Machine Readable Passport',
        fieldKey: 'status',
        fieldLabel: 'Status',
        equals: 'Unfit',
        nextStepId: '',
      },
    ])
  })

  it('fills nextStepId when a rule is already wired', () => {
    const slots = listBranchSlotsForStep(
      {
        id: 'registered',
        label: 'Registered',
        requiredDocumentIds: ['passport'],
        branchRules: [
          {
            documentId: 'passport',
            fieldKey: 'status',
            equals: 'Fit',
            nextStepId: 'counselled',
          },
        ],
      },
      [{ id: 'passport', name: 'Passport', required: true }],
      {
        passport: [
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: ['Fit', 'Unfit'],
          },
        ],
      },
    )
    expect(slots.find((slot) => slot.equals === 'Fit')?.nextStepId).toBe(
      'counselled',
    )
    expect(slots.find((slot) => slot.equals === 'Unfit')?.nextStepId).toBe('')
  })

  it('upserts a branch rule without duplicating the same choice', () => {
    const rules = upsertBranchRule(
      [
        {
          documentId: 'passport',
          fieldKey: 'status',
          equals: 'Fit',
          nextStepId: 'a',
        },
      ],
      {
        documentId: 'passport',
        fieldKey: 'status',
        equals: 'Fit',
        nextStepId: 'b',
      },
    )
    expect(rules).toHaveLength(1)
    expect(rules[0]?.nextStepId).toBe('b')
  })

  it('prunes rules when a dropdown choice is removed', () => {
    const next = pruneBranchRulesForFields(
      [
        {
          id: 'registered',
          label: 'Registered',
          requiredDocumentIds: ['passport'],
          branchRules: [
            {
              documentId: 'passport',
              fieldKey: 'status',
              equals: 'Fit',
              nextStepId: 'a',
            },
            {
              documentId: 'passport',
              fieldKey: 'status',
              equals: 'Unfit',
              nextStepId: 'b',
            },
          ],
        },
      ],
      [{ id: 'passport', name: 'Passport', required: true }],
      {
        passport: [
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: ['Fit'],
          },
        ],
      },
    )
    expect(next[0]?.branchRules).toEqual([
      {
        documentId: 'passport',
        fieldKey: 'status',
        equals: 'Fit',
        nextStepId: 'a',
      },
    ])
  })
})
