import { describe, expect, it } from 'vitest'
import {
  countryFlagEmoji,
  destinationCountryOptions,
  formatCountryLabel,
} from '@/lib/destinationCountries'

describe('country flag labels', () => {
  it('returns the flag emoji for known destination countries', () => {
    expect(countryFlagEmoji('Saudi Arabia')).toBe('🇸🇦')
    expect(countryFlagEmoji('United States')).toBe('🇺🇸')
    expect(countryFlagEmoji('uae')).toBe('🇦🇪')
  })

  it('prefixes select labels with the flag and keeps plain values', () => {
    expect(formatCountryLabel('Bangladesh')).toBe('🇧🇩 Bangladesh')
    const options = destinationCountryOptions()
    const bangladesh = options.find((option) => option.value === 'Bangladesh')
    expect(bangladesh).toEqual({
      value: 'Bangladesh',
      label: '🇧🇩 Bangladesh',
    })
  })

  it('leaves unknown country names unflagged', () => {
    expect(formatCountryLabel('Narnia')).toBe('Narnia')
    expect(countryFlagEmoji('Narnia')).toBe('')
  })
})
