import { afterEach, describe, expect, it } from 'vitest'
import {
  DEMO_USER,
  clearSession,
  writeSession,
} from '@/lib/authApi'
import {
  CLIENT_TRASH_RETENTION_DAYS,
  archiveClient,
  createClient,
  emptyClientTrash,
  getClientById,
  permanentlyDeleteFromTrash,
  purgeExpiredClientTrash,
  reloadClientsFromStorage,
  resetClients,
  restoreClientFromTrash,
  softDeleteClient,
  trashDaysRemaining,
  unarchiveClient,
} from '@/lib/clientsStore'
import { TENANT_IDS } from '@/types/tenant'

function signInFullTenant() {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.full,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

afterEach(() => {
  clearSession()
  resetClients()
})

describe('client archive and trash', () => {
  it('hides archived clients from the default active list lookup still works', () => {
    signInFullTenant()
    const created = createClient({
      name: 'Archive Me',
      phone: '01711112222',
      primaryService: 'Tour Package',
      idChecked: true,
    })

    archiveClient(created.id)
    expect(getClientById(created.id)?.archivedAt).toBeTruthy()

    unarchiveClient(created.id)
    expect(getClientById(created.id)?.archivedAt).toBeUndefined()
  })

  it('moves a deleted client to trash and restores it', () => {
    signInFullTenant()
    const created = createClient({
      name: 'Delete Me',
      phone: '01722223333',
      primaryService: 'Tour Package',
      idChecked: true,
    })

    softDeleteClient(created.id)
    expect(getClientById(created.id)).toBeUndefined()

    const restored = restoreClientFromTrash(created.id)
    expect(restored?.name).toBe('Delete Me')
    expect(getClientById(created.id)?.name).toBe('Delete Me')
  })

  it('keeps soft-deleted seed clients out of the list after reload', () => {
    signInFullTenant()
    softDeleteClient('c-284')
    expect(getClientById('c-284')).toBeUndefined()

    reloadClientsFromStorage()
    expect(getClientById('c-284')).toBeUndefined()

    restoreClientFromTrash('c-284')
    expect(getClientById('c-284')?.name).toBe('Md. Rahim Uddin')
  })

  it('permanently deletes from trash and does not revive seed clients', () => {
    signInFullTenant()
    softDeleteClient('c-291')
    permanentlyDeleteFromTrash('c-291')
    expect(getClientById('c-291')).toBeUndefined()

    reloadClientsFromStorage()
    expect(getClientById('c-291')).toBeUndefined()
  })

  it('purges trash entries older than the retention window', () => {
    signInFullTenant()
    const created = createClient({
      name: 'Expired Trash',
      phone: '01733334444',
      primaryService: 'Tour Package',
      idChecked: true,
    })
    softDeleteClient(created.id)

    const deletedAt = new Date(
      Date.now() - (CLIENT_TRASH_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000,
    ).toISOString()
    const raw = localStorage.getItem('pd-clients-trash')
    const parsed = JSON.parse(raw ?? '[]') as Array<{
      client: { id: string }
      deletedAt: string
    }>
    localStorage.setItem(
      'pd-clients-trash',
      JSON.stringify(
        parsed.map((entry) =>
          entry.client.id === created.id ? { ...entry, deletedAt } : entry,
        ),
      ),
    )
    reloadClientsFromStorage()
    expect(trashDaysRemaining(deletedAt)).toBe(0)
    expect(restoreClientFromTrash(created.id)).toBeUndefined()
    expect(purgeExpiredClientTrash()).toBe(0)
  })

  it('empties trash for the active tenant', () => {
    signInFullTenant()
    const created = createClient({
      name: 'Empty Me',
      phone: '01744445555',
      primaryService: 'Tour Package',
      idChecked: true,
    })
    softDeleteClient(created.id)
    expect(emptyClientTrash()).toBe(1)
    expect(restoreClientFromTrash(created.id)).toBeUndefined()
  })
})
