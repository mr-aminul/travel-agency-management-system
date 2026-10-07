import { afterEach, describe, expect, it } from 'vitest'
import { signInWithPassword, signOut } from '@/lib/authApi'
import {
  resetProvisionedLogins,
  saveProvisionedLogin,
} from '@/lib/provisionedUsers'

afterEach(async () => {
  await signOut()
  resetProvisionedLogins()
})

describe('provisioned logins', () => {
  it('allows sign-in with an admin-set password when API is offline', async () => {
    await saveProvisionedLogin({
      id: 'user-river-owner',
      email: 'owner@river.example',
      name: 'River Owner',
      tenantId: 'tenant-river',
      password: 'river-pass',
    })

    const session = await signInWithPassword(
      'owner@river.example',
      'river-pass',
    )
    expect(session.user.email).toBe('owner@river.example')
    expect(session.tenantId).toBe('tenant-river')
  })

  it('rejects a wrong password for a provisioned account', async () => {
    await saveProvisionedLogin({
      id: 'user-river-owner-2',
      email: 'owner2@river.example',
      name: 'River Owner',
      tenantId: 'tenant-river',
      password: 'river-pass',
    })

    await expect(
      signInWithPassword('owner2@river.example', 'wrong'),
    ).rejects.toThrow(/incorrect/i)
  })
})
