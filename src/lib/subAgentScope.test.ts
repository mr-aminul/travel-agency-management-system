import { beforeEach, describe, expect, it } from 'vitest'
import { DATA_KEYS } from '@/lib/data/keys'
import { writeSession, clearSession } from '@/lib/authApi'
import {
  beginApplyingApprovedChange,
  endApplyingApprovedChange,
  queueOrApplySubAgentChange,
} from '@/lib/subAgentScope'
import {
  defaultSubAgentAccessSettings,
  saveSubAgentAccessSettings,
} from '@/lib/subAgentAccessSettings'

describe('queueOrApplySubAgentChange', () => {
  beforeEach(() => {
    clearSession()
    localStorage.removeItem(DATA_KEYS.subAgentAccessSettings)
    localStorage.removeItem(DATA_KEYS.subAgentPendingChanges)
    endApplyingApprovedChange()
  })

  it('applies immediately for agency users', () => {
    writeSession({
      user: {
        id: 'user-1',
        email: 'ops@agency.test',
        name: 'Ops',
        role: 'agency_user',
      },
      tenantId: 'tenant-full',
      signedInAt: new Date().toISOString(),
    })
    const result = queueOrApplySubAgentChange({
      entityType: 'client',
      action: 'create',
      summary: 'New client',
      payload: {},
    })
    expect(result).toEqual({ apply: true })
  })

  it('queues when sub-agent and approval required', () => {
    saveSubAgentAccessSettings({
      ...defaultSubAgentAccessSettings('tenant-full'),
      requireApproval: true,
    })
    writeSession({
      user: {
        id: 'user-sa',
        email: 'partner@test.com',
        name: 'Partner',
        role: 'sub_agent',
        subAgentId: 'AGT-T0001',
      },
      tenantId: 'tenant-full',
      signedInAt: new Date().toISOString(),
    })
    const result = queueOrApplySubAgentChange({
      entityType: 'client',
      action: 'create',
      summary: 'New client: Karim',
      payload: { name: 'Karim' },
    })
    expect('queued' in result).toBe(true)
    if ('queued' in result) {
      expect(result.queued.status).toBe('pending')
      expect(result.queued.subAgentId).toBe('AGT-T0001')
    }
  })

  it('applies for sub-agent when approval is off', () => {
    saveSubAgentAccessSettings({
      ...defaultSubAgentAccessSettings('tenant-full'),
      requireApproval: false,
    })
    writeSession({
      user: {
        id: 'user-sa',
        email: 'partner@test.com',
        name: 'Partner',
        role: 'sub_agent',
        subAgentId: 'AGT-T0001',
      },
      tenantId: 'tenant-full',
      signedInAt: new Date().toISOString(),
    })
    expect(
      queueOrApplySubAgentChange({
        entityType: 'client',
        action: 'create',
        summary: 'New client',
        payload: {},
      }),
    ).toEqual({ apply: true })
  })

  it('skips queue while applying an approved change', () => {
    saveSubAgentAccessSettings({
      ...defaultSubAgentAccessSettings('tenant-full'),
      requireApproval: true,
    })
    writeSession({
      user: {
        id: 'user-sa',
        email: 'partner@test.com',
        name: 'Partner',
        role: 'sub_agent',
        subAgentId: 'AGT-T0001',
      },
      tenantId: 'tenant-full',
      signedInAt: new Date().toISOString(),
    })
    beginApplyingApprovedChange()
    expect(
      queueOrApplySubAgentChange({
        entityType: 'client',
        action: 'create',
        summary: 'New client',
        payload: {},
      }),
    ).toEqual({ apply: true })
    endApplyingApprovedChange()
  })
})
