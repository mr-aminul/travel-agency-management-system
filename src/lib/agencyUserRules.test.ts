import { describe, expect, it } from 'vitest'
import {
  agencyCreateErrors,
  agencyWithOwnerCreateErrors,
  slugifyAgencyName,
  staffMemberCreateErrors,
} from '@/lib/agencyUserRules'

describe('agencyUserRules', () => {
  it('requires an agency name at create', () => {
    expect(agencyCreateErrors({ name: '' }).name).toMatch(/required/i)
    expect(agencyCreateErrors({ name: 'A' }).name).toMatch(/2 characters/i)
    expect(agencyCreateErrors({ name: 'Coastal Leisure' })).toEqual({})
  })

  it('requires agency name plus owner credentials', () => {
    expect(
      agencyWithOwnerCreateErrors({
        name: '',
        ownerName: '',
        ownerEmail: '',
        ownerPassword: '',
      }),
    ).toEqual({
      name: expect.stringMatching(/required/i),
      ownerName: expect.stringMatching(/required/i),
      ownerEmail: expect.stringMatching(/required/i),
      ownerPassword: expect.stringMatching(/required/i),
    })
    expect(
      agencyWithOwnerCreateErrors({
        name: 'Coastal Leisure',
        ownerName: 'Coastal Owner',
        ownerEmail: 'ops@coastal.example',
        ownerPassword: 'secret1',
      }),
    ).toEqual({})
  })

  it('derives a slug from the agency name', () => {
    expect(slugifyAgencyName('Coastal Leisure')).toBe('coastal-leisure')
  })

  it('requires staff name, email, agency, and password', () => {
    expect(
      staffMemberCreateErrors({
        tenantId: '',
        name: '',
        email: '',
        password: '',
      }),
    ).toEqual({
      name: expect.stringMatching(/required/i),
      email: expect.stringMatching(/required/i),
      tenantId: expect.stringMatching(/select an agency/i),
      password: expect.stringMatching(/required/i),
    })
    expect(
      staffMemberCreateErrors({
        tenantId: 'tenant-full',
        name: 'Shila Akter',
        email: 'shila@example.com',
        role: 'manager',
        password: 'secret1',
      }),
    ).toEqual({})
  })

  it('rejects an invalid staff email', () => {
    expect(
      staffMemberCreateErrors({
        tenantId: 'tenant-full',
        name: 'Shila Akter',
        email: 'not-an-email',
        password: 'secret1',
      }).email,
    ).toMatch(/valid email/i)
  })
})
