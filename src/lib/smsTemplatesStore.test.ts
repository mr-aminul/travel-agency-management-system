import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import {
  createSmsTemplate,
  deleteSmsTemplate,
  ensureSmsTemplateSeeds,
  groupSmsTemplatesByFolder,
  listSmsTemplates,
  renameSmsTemplateFolder,
  resetSmsTemplates,
  updateSmsTemplate,
} from '@/lib/smsTemplatesStore'
import { TENANT_IDS } from '@/types/tenant'

beforeEach(() => {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.full,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
  resetSmsTemplates()
})

afterEach(() => {
  resetSmsTemplates()
  clearSession()
})

describe('smsTemplatesStore', () => {
  it('seeds starter SMS and email templates into folders', () => {
    ensureSmsTemplateSeeds()
    expect(groupSmsTemplatesByFolder(undefined, 'sms').map((g) => g.folder)).toEqual([
      'Documents',
      'General',
      'Passport',
      'Payment',
      'Pipeline',
    ])
    expect(listSmsTemplates(undefined, 'sms').length).toBeGreaterThanOrEqual(6)
    expect(listSmsTemplates(undefined, 'email').length).toBeGreaterThanOrEqual(4)
  })

  it('stores templates under a custom folder name', () => {
    ensureSmsTemplateSeeds()
    createSmsTemplate({
      channel: 'sms',
      folder: 'Visa',
      name: 'Embassy appointment',
      body: 'Dear {{name}}, your appointment is confirmed. ID {{clientId}}.',
    })
    expect(
      groupSmsTemplatesByFolder(undefined, 'sms').some(
        (group) => group.folder === 'Visa',
      ),
    ).toBe(true)
  })

  it('renames a folder for all templates inside it', () => {
    ensureSmsTemplateSeeds()
    const renamed = renameSmsTemplateFolder(
      'General',
      'Front desk',
      undefined,
      'sms',
    )
    expect(renamed).toBeGreaterThan(0)
    expect(
      listSmsTemplates(undefined, 'sms').some(
        (item) => item.folder === 'Front desk',
      ),
    ).toBe(true)
    expect(
      listSmsTemplates(undefined, 'sms').some((item) => item.folder === 'General'),
    ).toBe(false)
  })

  it('edits a seed template body in place', () => {
    ensureSmsTemplateSeeds()
    const seed = listSmsTemplates(undefined, 'sms').find(
      (item) => item.name === 'Welcome',
    )
    if (!seed) throw new Error('Expected Welcome seed')
    const updated = updateSmsTemplate(seed.id, {
      channel: seed.channel,
      folder: seed.folder,
      name: seed.name,
      body: 'Hello {{name}} — ID {{clientId}}',
    })
    expect(updated.body).toBe('Hello {{name}} — ID {{clientId}}')
  })

  it('does not restore a deleted seed template', () => {
    ensureSmsTemplateSeeds()
    const seed = listSmsTemplates(undefined, 'sms').find(
      (item) => item.name === 'Welcome',
    )
    if (!seed) throw new Error('Expected Welcome seed')
    deleteSmsTemplate(seed.id)
    ensureSmsTemplateSeeds()
    expect(listSmsTemplates().some((item) => item.id === seed.id)).toBe(false)
  })
})
