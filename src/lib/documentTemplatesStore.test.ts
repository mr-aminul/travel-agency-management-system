import { afterEach, describe, expect, it } from 'vitest'
import {
  DEMO_USER,
  LEISURE_USER,
  clearSession,
  writeSession,
} from '@/lib/authApi'
import {
  createDocumentTemplate,
  deleteDocumentTemplate,
  getDocumentTemplateById,
  listDocumentTemplates,
  resetDocumentTemplates,
  updateDocumentTemplate,
  validateDocumentTemplateName,
} from '@/lib/documentTemplatesStore'
import { embassyHeaderRows } from '@/types/documentTemplate'
import { TENANT_IDS } from '@/types/tenant'

afterEach(() => {
  clearSession()
  resetDocumentTemplates()
})

function asLeisure() {
  writeSession({
    user: LEISURE_USER,
    tenantId: TENANT_IDS.leisure,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

function asFull() {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.full,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

describe('document print templates', () => {
  it('seeds embassy and manpower print formats', () => {
    asFull()
    const names = listDocumentTemplates().map((item) => item.name)
    expect(names).toEqual(
      expect.arrayContaining([
        'Embassy List',
        'Visa Cancel List',
        'Mofa Barcode',
        'Putup List',
        'New Putup List',
        'Notesheet',
        'Notesheet (Female)',
        'Office Forwarding',
        'Agency Undertaking',
      ]),
    )
  })

  it('rejects duplicate names in the same agency', () => {
    asFull()
    expect(validateDocumentTemplateName('Embassy List')).toMatch(/already have/)
    expect(validateDocumentTemplateName('  ')).toMatch(/name/)
  })

  it('creates, updates, and deletes a print template', () => {
    asFull()
    const created = createDocumentTemplate({
      name: 'Mofa list',
      group: 'Embassy',
      layout: 'table',
      direction: 'rtl',
      title: 'بيان بالجوازات المقدمة',
      licenseNo: '864',
      headerRows: embassyHeaderRows(),
    })
    expect(created.licenseNo).toBe('864')
    expect(getDocumentTemplateById(created.id)?.layout).toBe('table')

    const updated = updateDocumentTemplate(created.id, {
      name: 'MOFA barcode sheet',
      group: 'Embassy',
      layout: 'table',
      direction: 'rtl',
      title: 'بيان',
      licenseNo: '900',
      headerRows: embassyHeaderRows(),
    })
    expect(updated?.name).toBe('MOFA barcode sheet')
    expect(updated?.licenseNo).toBe('900')

    expect(deleteDocumentTemplate(created.id)).toBe(true)
    expect(getDocumentTemplateById(created.id)).toBeUndefined()
  })

  it('keeps templates isolated between agencies', () => {
    asFull()
    createDocumentTemplate({
      name: 'Custom forwarding letter',
      group: 'Manpower',
      layout: 'letter',
      direction: 'ltr',
      title: 'Forwarding',
      licenseNo: '1',
      headerRows: [],
      letterIntro: 'Please find attached.',
    })

    asLeisure()
    expect(
      listDocumentTemplates().some(
        (item) => item.name === 'Custom forwarding letter',
      ),
    ).toBe(false)
    expect(validateDocumentTemplateName('Custom forwarding letter')).toBeUndefined()
  })
})
