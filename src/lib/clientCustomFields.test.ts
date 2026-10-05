import { describe, expect, it } from 'vitest'
import {
  compactCustomFieldValues,
  emptyCustomFieldValues,
  missingRequiredCustomFields,
} from '@/lib/clientCustomFields'
import type { ClientProfileField } from '@/types/clientProfileField'

const profession: ClientProfileField = {
  id: 'cf-0001',
  tenantId: 'tenant-full',
  label: 'Profession',
  type: 'text',
  required: true,
  options: [],
  createdAt: '2026-01-01T00:00:00.000Z',
}

describe('client custom field values', () => {
  it('drops blank values and reports missing required fields', () => {
    const values = emptyCustomFieldValues([profession], { 'cf-0001': '  ' })
    expect(values['cf-0001']).toBe('')
    expect(compactCustomFieldValues({ 'cf-0001': ' Mason ' })).toEqual({
      'cf-0001': 'Mason',
    })
    expect(missingRequiredCustomFields([profession], values)).toEqual([
      'Profession',
    ])
  })
})
