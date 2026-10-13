import { afterEach, describe, expect, it } from 'vitest'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import {
  addClientActionItem,
  countOpenClientActionItems,
  listClientActionItems,
  removeClientActionItem,
  resetClientActionItems,
  setClientActionItemDone,
} from '@/lib/clientActionItemsStore'
import { TENANT_IDS } from '@/types/tenant'
import {
  createTenant,
  resetTenantEntitlements,
} from '@/lib/tenantsStore'

afterEach(() => {
  clearSession()
  resetClientActionItems()
  resetTenantEntitlements()
})

function asFull() {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.demo,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

describe('client action items', () => {
  it('adds an open action item for the client', () => {
    asFull()
    const created = addClientActionItem({
      clientId: 'c-284',
      text: '  Call about medical  ',
    })
    expect(created.text).toBe('Call about medical')
    expect(created.done).toBe(false)
    expect(listClientActionItems('c-284')).toEqual([
      expect.objectContaining({ id: created.id, text: 'Call about medical' }),
    ])
    expect(countOpenClientActionItems('c-284')).toBe(1)
  })

  it('rejects an empty action item', () => {
    asFull()
    expect(() =>
      addClientActionItem({ clientId: 'c-284', text: '   ' }),
    ).toThrow(/Write an action item/)
  })

  it('marks items done and sorts open ones first', () => {
    asFull()
    const first = addClientActionItem({
      clientId: 'c-284',
      text: 'Collect passport',
    })
    const second = addClientActionItem({
      clientId: 'c-284',
      text: 'Confirm departure',
    })
    setClientActionItemDone(first.id, true)

    const listed = listClientActionItems('c-284')
    expect(listed.map((item) => item.id)).toEqual([second.id, first.id])
    expect(listed[0]?.done).toBe(false)
    expect(listed[1]?.done).toBe(true)
    expect(listed[1]?.completedAt).toBeTruthy()
    expect(countOpenClientActionItems('c-284')).toBe(1)
  })

  it('removes an action item', () => {
    asFull()
    const created = addClientActionItem({
      clientId: 'c-284',
      text: 'Send quotation',
    })
    removeClientActionItem(created.id)
    expect(listClientActionItems('c-284')).toEqual([])
  })

  it('keeps action items on the tenant they were created from', () => {
    asFull()
    addClientActionItem({ clientId: 'c-284', text: 'Follow up tomorrow' })

    const other = createTenant({ name: 'Other Action Agency' })
    writeSession({
      user: DEMO_USER,
      tenantId: other.id,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    expect(listClientActionItems('c-284')).toEqual([])
  })
})
