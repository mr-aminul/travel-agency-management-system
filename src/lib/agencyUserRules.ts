import {
  validateRequiredEmail,
  validateRequiredName,
  trimmed,
} from '@/lib/fieldValidation'
import type {
  CreateTenantInput,
  CreateTenantMemberInput,
  TenantMemberRole,
} from '@/types/tenant'

/**
 * Agency (tenant) field rules (locked):
 * - Required at create: name
 * - Optional at create: enabled modules (tuned in settings later), status
 * - Slug is derived from name — not a separate required field for staff
 *
 * Staff user (tenant member) field rules (locked):
 * - Required at create: name, email, which agency (tenantId)
 * - Role: owner | manager | staff (defaults to staff)
 * - Status defaults to invited
 * - Real passwords / IdP are not part of this freeze — demo login stays for now
 */

export type AgencyField = 'name'

export type StaffMemberField = 'name' | 'email' | 'tenantId' | 'role'

export const STAFF_MEMBER_ROLES: {
  value: TenantMemberRole
  label: string
}[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
]

export function slugifyAgencyName(name: string): string {
  return trimmed(name)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function validateAgencyField(
  field: AgencyField,
  values: Pick<CreateTenantInput, 'name'>,
): string | undefined {
  switch (field) {
    case 'name':
      return validateRequiredName(values.name, 'Agency name')
    default:
      return undefined
  }
}

export function agencyCreateErrors(
  values: Pick<CreateTenantInput, 'name'>,
): Partial<Record<AgencyField, string>> {
  const name = validateAgencyField('name', values)
  return name ? { name } : {}
}

export function validateStaffMemberField(
  field: StaffMemberField,
  values: CreateTenantMemberInput,
): string | undefined {
  switch (field) {
    case 'name':
      return validateRequiredName(values.name, 'Full name')
    case 'email':
      return validateRequiredEmail(values.email)
    case 'tenantId':
      return trimmed(values.tenantId) ? undefined : 'Select an agency.'
    case 'role': {
      const role = values.role ?? 'staff'
      if (role === 'owner' || role === 'manager' || role === 'staff') {
        return undefined
      }
      return 'Select a role.'
    }
    default:
      return undefined
  }
}

export function staffMemberCreateErrors(
  values: CreateTenantMemberInput,
): Partial<Record<StaffMemberField, string>> {
  const fields: StaffMemberField[] = ['name', 'email', 'tenantId', 'role']
  const errors: Partial<Record<StaffMemberField, string>> = {}
  for (const field of fields) {
    const error = validateStaffMemberField(field, values)
    if (error) errors[field] = error
  }
  return errors
}
