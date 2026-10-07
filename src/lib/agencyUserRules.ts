import {
  validateRequiredEmail,
  validateRequiredName,
  validateRequiredPassword,
  trimmed,
} from '@/lib/fieldValidation'
import type {
  CreateTenantInput,
  CreateTenantMemberInput,
  TenantMemberRole,
} from '@/types/tenant'

/**
 * Agency (tenant) field rules:
 * - Required at create: name, plus first owner (name, email, initial password)
 * - Optional at create: enabled modules (tuned in settings later), status
 * - Slug is derived from name — not a separate required field for staff
 *
 * Staff user (tenant member) field rules:
 * - Required at create: name, email, which agency (tenantId), initial password
 * - Role: owner | manager | staff (defaults to staff)
 * - Status defaults to active once a password is set (user can sign in)
 * - Admin sets the initial password; share it out-of-band (no invite email yet)
 */

export type AgencyField = 'name'

export type AgencyOwnerField = 'ownerName' | 'ownerEmail' | 'ownerPassword'

export type StaffMemberField =
  | 'name'
  | 'email'
  | 'tenantId'
  | 'role'
  | 'password'

export type CreateAgencyWithOwnerInput = Pick<CreateTenantInput, 'name'> & {
  ownerName: string
  ownerEmail: string
  ownerPassword: string
}

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

export function agencyWithOwnerCreateErrors(
  values: CreateAgencyWithOwnerInput,
): Partial<Record<AgencyField | AgencyOwnerField, string>> {
  const errors: Partial<Record<AgencyField | AgencyOwnerField, string>> = {
    ...agencyCreateErrors(values),
  }
  const ownerName = validateRequiredName(values.ownerName, 'Owner name')
  if (ownerName) errors.ownerName = ownerName
  const ownerEmail = validateRequiredEmail(values.ownerEmail)
  if (ownerEmail) errors.ownerEmail = ownerEmail
  const ownerPassword = validateRequiredPassword(values.ownerPassword)
  if (ownerPassword) errors.ownerPassword = ownerPassword
  return errors
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
    case 'password':
      return validateRequiredPassword(values.password ?? '')
    default:
      return undefined
  }
}

export function staffMemberCreateErrors(
  values: CreateTenantMemberInput,
): Partial<Record<StaffMemberField, string>> {
  const fields: StaffMemberField[] = [
    'name',
    'email',
    'tenantId',
    'role',
    'password',
  ]
  const errors: Partial<Record<StaffMemberField, string>> = {}
  for (const field of fields) {
    const error = validateStaffMemberField(field, values)
    if (error) errors[field] = error
  }
  return errors
}
