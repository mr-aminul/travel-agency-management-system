import { describe, expect, it } from 'vitest'
import {
  agencyCreateErrors,
  slugifyAgencyName,
  staffMemberCreateErrors,
} from '@/lib/agencyUserRules'

describe('agencyUserRules', () => {
  it('requires an agency name at create', () => {
    expect(agencyCreateErrors({ name: '' }).name).toMatch(/required/i)
    expect(agencyCreateErrors({ name: 'A' }).name).toMatch(/2 characters/i)
    expect(agencyCreateErrors({ name: 'Coastal Leisure' })).toEqual({})
  })

  it('derives a slug from the agency name', () => {
    expect(slugifyAgencyName('Coastal Leisure')).toBe('coastal-leisure')
  })

  it('requires staff name, email, and agency', () => {
    expect(
      staffMemberCreateErrors({
        tenantId: '',
        name: '',
        email: '',
      }),
    ).toEqual({
      name: expect.stringMatching(/required/i),
      email: expect.stringMatching(/required/i),
      tenantId: expect.stringMatching(/select an agency/i),
    })
    expect(
      staffMemberCreateErrors({
        tenantId: 'tenant-full',
        name: 'Shila Akter',
        email: 'shila@example.com',
        role: 'manager',
      }),
    ).toEqual({})
  })

  it('rejects an invalid staff email', () => {
    expect(
      staffMemberCreateErrors({
        tenantId: 'tenant-full',
        name: 'Shila Akter',
        email: 'not-an-email',
      }).email,
    ).toMatch(/valid email/i)
  })
})
