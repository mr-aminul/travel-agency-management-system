import { afterEach, describe, expect, it } from 'vitest'
import {
  DEMO_USER,
  clearSession,
  writeSession,
} from '@/lib/authApi'
import {
  createClient,
  getClientById,
  getClientsByPartnerId,
  reloadClientsFromStorage,
  resetClients,
} from '@/lib/clientsStore'
import { TENANT_IDS } from '@/types/tenant'

afterEach(() => {
  clearSession()
  resetClients()
})

describe('persisted public client intake', () => {
  it('keeps a submitted client on the sub agent after a reload', () => {
    const created = createClient(
      {
        name: 'Public Form Lead',
        phone: '01844445555',
        primaryService: 'Leisure',
        idChecked: true,
        partnerId: 'AGT-T0001',
      },
      { tenantId: TENANT_IDS.full },
    )

    const persisted = localStorage.getItem('pd-clients-created')
    expect(persisted).toBeTruthy()
    resetClients()
    expect(getClientById(created.id)).toBeUndefined()

    localStorage.setItem('pd-clients-created', persisted ?? '[]')
    reloadClientsFromStorage()

    writeSession({
      user: DEMO_USER,
      tenantId: TENANT_IDS.full,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })

    expect(getClientById(created.id)?.name).toBe('Public Form Lead')
    expect(
      getClientsByPartnerId('AGT-T0001').some((client) => client.id === created.id),
    ).toBe(true)
  })
})
