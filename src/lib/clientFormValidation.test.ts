import { describe, expect, it } from 'vitest'
import {
  validateOptionalEmail,
  validateOptionalNid,
  validateOptionalPassport,
  validateRequiredName,
  validateRequiredPhone,
  validatePassportDates,
} from '@/lib/clientFormValidation'

describe('clientFormValidation', () => {
  it('requires a valid full name', () => {
    expect(validateRequiredName('')).toMatch(/required/i)
    expect(validateRequiredName('A')).toMatch(/2 characters/i)
    expect(validateRequiredName('12345')).toMatch(/valid full name/i)
    expect(validateRequiredName('Karim Uddin')).toBeUndefined()
  })

  it('requires a valid phone and flags duplicates', () => {
    expect(validateRequiredPhone('')).toMatch(/required/i)
    expect(validateRequiredPhone('asdasd')).toMatch(/digits only/i)
    expect(validateRequiredPhone('017')).toMatch(/10–15 digits/i)
    expect(validateRequiredPhone('01712345678')).toBeUndefined()
    expect(
      validateRequiredPhone('01712345678', { duplicateName: 'Karim' }),
    ).toMatch(/Karim/)
  })

  it('validates optional email only when filled', () => {
    expect(validateOptionalEmail('')).toBeUndefined()
    expect(validateOptionalEmail('not-an-email')).toMatch(/valid email/i)
    expect(validateOptionalEmail('client@email.com')).toBeUndefined()
  })

  it('validates passport and nid formats when filled', () => {
    expect(validateOptionalPassport('')).toBeUndefined()
    expect(validateOptionalPassport('AB')).toMatch(/6–12/i)
    expect(validateOptionalPassport('A1234567')).toBeUndefined()
    expect(validateOptionalNid('')).toBeUndefined()
    expect(validateOptionalNid('123')).toMatch(/10, 13, or 17/i)
    expect(validateOptionalNid('1234567890')).toBeUndefined()
  })

  it('requires expiry on or after issue date', () => {
    expect(
      validatePassportDates('2020-01-01', '2019-01-01').expiry,
    ).toMatch(/on or after/i)
    expect(validatePassportDates('2020-01-01', '2030-01-01')).toEqual({})
  })

  it('requires issue and expiry when passport number is set', () => {
    expect(validatePassportDates('', '', '')).toEqual({})
    expect(validatePassportDates('', '', 'A12345678')).toEqual({
      issuedOn: expect.stringMatching(/date of issue is required/i),
      expiry: expect.stringMatching(/date of expiry is required/i),
    })
    expect(
      validatePassportDates('2020-01-01', '2030-01-01', 'A12345678'),
    ).toEqual({})
  })
})
