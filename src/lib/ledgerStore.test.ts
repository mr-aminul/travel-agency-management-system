import { afterEach, describe, expect, it } from 'vitest'
import { DATA_KEYS } from '@/lib/data/keys'
import {
  createManualLedgerEntry,
  deleteManualLedgerEntry,
  getManualLedgerEntries,
} from '@/lib/ledgerStore'
import { writeSession, DEMO_USER, clearSession } from '@/lib/authApi'
import { TENANT_IDS } from '@/types/tenant'

afterEach(() => {
  localStorage.removeItem(DATA_KEYS.ledgerEntries)
  clearSession()
  window.dispatchEvent(new Event('pd-data-rehydrated'))
})

describe('ledgerStore', () => {
  it('records a supplier payout and lists it for the active tenant', () => {
    writeSession({
      user: DEMO_USER,
      tenantId: TENANT_IDS.demo,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    const created = createManualLedgerEntry({
      direction: 'out',
      kind: 'supplier',
      amount: 12000,
      wallet: 'Bank',
      party: 'Biman BD',
      note: 'Ticket batch',
    })
    expect(created.party).toBe('Biman BD')
    const listed = getManualLedgerEntries(TENANT_IDS.demo)
    expect(listed.some((item) => item.id === created.id)).toBe(true)
    expect(deleteManualLedgerEntry(created.id)).toBe(true)
    expect(
      getManualLedgerEntries(TENANT_IDS.demo).some(
        (item) => item.id === created.id,
      ),
    ).toBe(false)
  })

  it('rejects zero amounts', () => {
    writeSession({
      user: DEMO_USER,
      tenantId: TENANT_IDS.demo,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    expect(() =>
      createManualLedgerEntry({
        direction: 'out',
        kind: 'expense',
        amount: 0,
        wallet: 'Cash',
      }),
    ).toThrow(/greater than zero/i)
  })
})
