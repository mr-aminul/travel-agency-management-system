import { beforeEach, describe, expect, it } from 'vitest'
import { DATA_KEYS } from '@/lib/data/keys'
import {
  applyWorkspaceToSession,
  listWorkspacesForUser,
  withResolvedWorkspaces,
} from '@/lib/authWorkspaces'
import { upsertSubAgentLogin } from '@/lib/subAgentLoginsStore'
import type { AuthSession } from '@/lib/authApi'

describe('authWorkspaces', () => {
  beforeEach(() => {
    localStorage.removeItem(DATA_KEYS.subAgentLogins)
  })

  it('lists agency and partner workspaces for a linked login', () => {
    upsertSubAgentLogin({
      subAgentId: 'AGT-T0001',
      tenantId: 'tenant-full',
      userId: 'user-linked',
      email: 'both@example.com',
      status: 'active',
    })
    const workspaces = listWorkspacesForUser(
      {
        id: 'user-linked',
        email: 'both@example.com',
        name: 'Both',
        role: 'agency_user',
      },
      'tenant-full',
    )
    expect(workspaces.some((row) => row.kind === 'agency')).toBe(true)
    expect(workspaces.some((row) => row.kind === 'sub_agent')).toBe(true)
  })

  it('marks workspace pending when more than one option exists', () => {
    upsertSubAgentLogin({
      subAgentId: 'AGT-T0001',
      tenantId: 'tenant-full',
      userId: 'user-linked',
      email: 'both@example.com',
      status: 'active',
    })
    const base: AuthSession = {
      user: {
        id: 'user-linked',
        email: 'both@example.com',
        name: 'Both',
        role: 'agency_user',
      },
      tenantId: 'tenant-full',
      signedInAt: new Date().toISOString(),
    }
    const next = withResolvedWorkspaces(base)
    expect(next.workspacePending).toBe(true)
    expect((next.workspaces ?? []).length).toBeGreaterThan(1)
  })

  it('enters agency workspace when login intent is agency', () => {
    upsertSubAgentLogin({
      subAgentId: 'AGT-T0001',
      tenantId: 'tenant-full',
      userId: 'user-linked',
      email: 'both@example.com',
      status: 'active',
    })
    const base: AuthSession = {
      user: {
        id: 'user-linked',
        email: 'both@example.com',
        name: 'Both',
        role: 'agency_user',
      },
      tenantId: 'tenant-full',
      signedInAt: new Date().toISOString(),
    }
    const next = withResolvedWorkspaces(base, 'agency')
    expect(next.workspacePending).toBe(false)
    expect(next.user.role).toBe('agency_user')
  })

  it('enters partner workspace when login intent is sub_agent', () => {
    upsertSubAgentLogin({
      subAgentId: 'AGT-T0001',
      tenantId: 'tenant-full',
      userId: 'user-linked',
      email: 'both@example.com',
      status: 'active',
    })
    const base: AuthSession = {
      user: {
        id: 'user-linked',
        email: 'both@example.com',
        name: 'Both',
        role: 'agency_user',
      },
      tenantId: 'tenant-full',
      signedInAt: new Date().toISOString(),
    }
    const next = withResolvedWorkspaces(base, 'sub_agent')
    expect(next.user.role).toBe('sub_agent')
    expect(next.user.subAgentId).toBe('AGT-T0001')
  })

  it('rejects agency intent when the account is partner-only', () => {
    const base: AuthSession = {
      user: {
        id: 'user-sa',
        email: 'partner-only@example.com',
        name: 'Partner',
        role: 'sub_agent',
        subAgentId: 'AGT-T0001',
      },
      tenantId: 'tenant-full',
      signedInAt: new Date().toISOString(),
    }
    expect(() => withResolvedWorkspaces(base, 'agency')).toThrow(
      /no agency login/i,
    )
  })

  it('applies partner workspace onto the session', () => {
    const base: AuthSession = {
      user: {
        id: 'user-1',
        email: 'a@b.com',
        name: 'A',
        role: 'agency_user',
      },
      tenantId: 'tenant-full',
      signedInAt: new Date().toISOString(),
      workspaces: [
        {
          id: 'sub_agent:AGT-T0001',
          kind: 'sub_agent',
          tenantId: 'tenant-full',
          subAgentId: 'AGT-T0001',
          title: 'Sub agent of OneTrack',
          description: 'Partner',
        },
      ],
    }
    const next = applyWorkspaceToSession(base, base.workspaces![0]!)
    expect(next.user.role).toBe('sub_agent')
    expect(next.user.subAgentId).toBe('AGT-T0001')
    expect(next.workspacePending).toBe(false)
  })
})
