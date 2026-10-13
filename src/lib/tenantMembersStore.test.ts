import { afterEach, describe, expect, it } from 'vitest'
import { ABC_OWNER_USER } from '@/lib/authApi'
import {
  createTenantMember,
  getTenantMembers,
  memberCountByTenantId,
  resetTenantMembers,
} from '@/lib/tenantMembersStore'
import { createTenant, resetTenantEntitlements } from '@/lib/tenantsStore'
import { resetProvisionedLogins } from '@/lib/provisionedUsers'
import { TENANT_IDS } from '@/types/tenant'

afterEach(() => {
  resetTenantMembers()
  resetTenantEntitlements()
  resetProvisionedLogins()
})

describe('tenant members', () => {
  it('lists users under the demo agency', () => {
    const demo = getTenantMembers(TENANT_IDS.demo)
    expect(demo.some((member) => member.email === ABC_OWNER_USER.email)).toBe(
      true,
    )
    expect(demo.every((member) => member.tenantId === TENANT_IDS.demo)).toBe(
      true,
    )
    expect(memberCountByTenantId(TENANT_IDS.demo)).toBe(demo.length)
    const other = createTenant({ name: 'Other Agency' })
    expect(
      getTenantMembers(other.id).some(
        (member) => member.email === ABC_OWNER_USER.email,
      ),
    ).toBe(false)
  })

  it('creates a staff user with name, email, password, and agency', () => {
    const agency = createTenant({ name: 'River Tours' })
    const member = createTenantMember({
      tenantId: agency.id,
      name: 'Karim Uddin',
      email: 'karim@river-tours.example',
      password: 'secret12',
    })
    expect(member).toMatchObject({
      tenantId: agency.id,
      name: 'Karim Uddin',
      email: 'karim@river-tours.example',
      role: 'staff',
      status: 'active',
    })
  })

  it('rejects a duplicate email in the same agency', () => {
    expect(() =>
      createTenantMember({
        tenantId: TENANT_IDS.demo,
        name: 'Copy',
        email: ABC_OWNER_USER.email,
        password: 'secret12',
      }),
    ).toThrow(/already exists/i)
  })

  it('rejects create without a password', () => {
    const agency = createTenant({ name: 'Delta Travel' })
    expect(() =>
      createTenantMember({
        tenantId: agency.id,
        name: 'No Pass',
        email: 'nopass@delta.example',
        password: '',
      }),
    ).toThrow(/password/i)
  })
})
