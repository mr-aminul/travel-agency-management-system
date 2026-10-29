import { describe, expect, it } from 'vitest'
import {
  filterMergeFields,
  findMergeFieldMention,
} from '@/components/documents/mergeFieldMention'

describe('findMergeFieldMention', () => {
  it('detects @ at the start of text', () => {
    expect(findMergeFieldMention('@', 1)).toEqual({
      from: 0,
      to: 1,
      query: '',
    })
  })

  it('detects @ after whitespace with a query', () => {
    expect(findMergeFieldMention('Hello @pass', 11)).toEqual({
      from: 6,
      to: 11,
      query: 'pass',
    })
  })

  it('returns null when @ is mid-word', () => {
    expect(findMergeFieldMention('email@name', 10)).toBeNull()
  })
})

describe('filterMergeFields', () => {
  it('matches label, key, and group', () => {
    const byLabel = filterMergeFields('passport')
    expect(byLabel.some((field) => field.key === 'passport')).toBe(true)

    const byGroup = filterMergeFields('agency')
    expect(byGroup.every((field) => field.group === 'agency')).toBe(true)
  })
})
