import { afterEach, describe, expect, it } from 'vitest'
import { LEISURE_USER } from '@/lib/authApi'
import {
  createTenantMember,
  getTenantMembers,
  memberCountByTenantId,
  resetTenantMembers,
} from '@/lib/tenantMembersStore'
import { createTenant, resetTenantEntitlements } from '@/lib/tenantsStore'
import { TENANT_IDS } from '@/types/tenant'

afterEach(() => {
  resetTenantMembers()
  resetTenantEntitlements()
})

describe('tenant members', () => {
  it('lists users under a single business and not others', () => {
    const leisure = getTenantMembers(TENANT_IDS.leisure)
    expect(leisure.some((member) => member.email === LEISURE_USER.email)).toBe(
      true,
    )
    expect(leisure.every((member) => member.tenantId === TENANT_IDS.leisure)).toBe(
      true,
    )
    expect(memberCountByTenantId(TENANT_IDS.leisure)).toBe(leisure.length)
    expect(
      getTenantMembers(TENANT_IDS.manpower).some(
        (member) => member.email === LEISURE_USER.email,
      ),
    ).toBe(false)
  })

  it('creates a staff user with name, email, and agency', () => {
    const agency = createTenant({ name: 'River Tours' })
    const member = createTenantMember({
      tenantId: agency.id,
      name: 'Karim Uddin',
      email: 'karim@river-tours.example',
    })
    expect(member).toMatchObject({
      tenantId: agency.id,
      name: 'Karim Uddin',
      email: 'karim@river-tours.example',
      role: 'staff',
      status: 'invited',
    })
  })

  it('rejects a duplicate email in the same agency', () => {
    expect(() =>
      createTenantMember({
        tenantId: TENANT_IDS.leisure,
        name: 'Copy',
        email: LEISURE_USER.email,
      }),
    ).toThrow(/already exists/i)
  })
})

