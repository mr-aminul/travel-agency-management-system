import { describe, expect, it } from 'vitest'
import { LEISURE_USER } from '@/lib/authApi'
import {
  getTenantMembers,
  memberCountByTenantId,
} from '@/lib/tenantMembersStore'
import { TENANT_IDS } from '@/types/tenant'

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
})
