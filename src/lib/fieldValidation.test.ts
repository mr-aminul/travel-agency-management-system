import { describe, expect, it } from 'vitest'
import {
  validateOptionalEmail,
  validateOptionalMoney,
  validateRequiredEmail,
  validateRequiredMoney,
  validateRequiredPassword,
  validateRequiredPhone,
  validateRequiredSelect,
} from '@/lib/fieldValidation'

describe('fieldValidation', () => {
  it('validates money amounts', () => {
    expect(validateOptionalMoney('')).toBeUndefined()
    expect(validateOptionalMoney('12.345')).toMatch(/valid/i)
    expect(validateRequiredMoney('')).toMatch(/required/i)
    expect(validateRequiredMoney('0')).toMatch(/greater than 0/i)
    expect(validateRequiredMoney('1,000.50')).toBeUndefined()
  })

  it('validates login fields', () => {
    expect(validateRequiredEmail('bad')).toMatch(/valid email/i)
    expect(validateRequiredEmail('a@b.com')).toBeUndefined()
    expect(validateRequiredPassword('')).toMatch(/required/i)
    expect(validateRequiredPassword('ab')).toMatch(/8 characters/i)
    expect(validateRequiredPassword('demo1234')).toBeUndefined()
  })

  it('validates required selects and phones', () => {
    expect(validateRequiredSelect('', 'client')).toMatch(/select a client/i)
    expect(validateRequiredPhone('01712345678')).toBeUndefined()
  })
})
