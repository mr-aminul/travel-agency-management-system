import { describe, expect, it } from 'vitest'
import {
  DESTINATION_COUNTRIES,
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

  it('offers every country so a service can target any destination', () => {
    const names = DESTINATION_COUNTRIES.map((country) => country.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
    expect(names.length).toBeGreaterThanOrEqual(195)
    expect(names).toEqual(
      expect.arrayContaining([
        'kenya',
        'brazil',
        'philippines',
        'vietnam',
        'nigeria',
        'hong kong',
      ]),
    )
    const options = destinationCountryOptions()
    expect(options).toHaveLength(names.length)
    expect(options.find((option) => option.value === 'Kenya')).toEqual({
      value: 'Kenya',
      label: '🇰🇪 Kenya',
    })
  })
})
