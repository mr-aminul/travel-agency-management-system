import {
  validateCustomFieldValue as validateCustom,
  type ClientProfileFieldLike,
} from '@/lib/clientCustomFieldValidation'
import {
  validateOptionalDateOfBirth,
  validateOptionalEmail,
  validateOptionalNid,
  validateOptionalPassport,
  validateOptionalPersonName,
  validateOptionalText,
  validatePassportDates,
  validateRequiredName,
  validateRequiredPhone,
  trimmed,
} from '@/lib/fieldValidation'
import type { ClientProfileField } from '@/types/clientProfileField'

export {
  validateOptionalDateOfBirth,
  validateOptionalEmail,
  validateOptionalNid,
  validateOptionalPassport,
  validateOptionalPersonName,
  validateOptionalText,
  validatePassportDates,
  validateRequiredName,
  validateRequiredPhone,
} from '@/lib/fieldValidation'

export function validateCustomFieldValue(
  field: ClientProfileField,
  value: string,
): string | undefined {
  return validateCustom(field, value)
}

export type NewClientFormValues = {
  name: string
  phone: string
  email: string
  banglaName: string
  fatherName: string
  dateOfBirth: string
  placeOfBirth: string
  address: string
  nid: string
  passport: string
  passportIssuedOn: string
  passportExpiry: string
  passportPlaceOfIssue: string
  primaryService: string
  customFields: Record<string, string>
}

export type NewClientFormField =
  | keyof NewClientFormValues
  | `custom:${string}`

export function validateNewClientField(
  field: NewClientFormField,
  values: NewClientFormValues,
  options: {
    duplicateName?: string
    customFieldDefs: ClientProfileField[]
  },
): string | undefined {
  switch (field) {
    case 'name':
      return validateRequiredName(values.name)
    case 'phone':
      return validateRequiredPhone(values.phone, {
        duplicateName: options.duplicateName,
      })
    case 'email':
      return validateOptionalEmail(values.email)
    case 'banglaName':
      return validateOptionalPersonName(values.banglaName, 'Bangla name')
    case 'fatherName':
      return validateOptionalPersonName(values.fatherName, 'Father name')
    case 'dateOfBirth':
      return validateOptionalDateOfBirth(values.dateOfBirth)
    case 'placeOfBirth':
      return validateOptionalText(values.placeOfBirth, 'Place of birth')
    case 'address':
      return validateOptionalText(values.address, 'Address')
    case 'nid':
      return validateOptionalNid(values.nid)
    case 'passport':
      return validateOptionalPassport(values.passport)
    case 'passportPlaceOfIssue':
      return validateOptionalText(values.passportPlaceOfIssue, 'Place of issue')
    case 'passportIssuedOn':
      return validatePassportDates(
        values.passportIssuedOn,
        values.passportExpiry,
        values.passport,
      ).issuedOn
    case 'passportExpiry':
      return validatePassportDates(
        values.passportIssuedOn,
        values.passportExpiry,
        values.passport,
      ).expiry
    case 'primaryService':
      return trimmed(values.primaryService)
        ? undefined
        : 'Primary service is required.'
    case 'customFields':
      return undefined
    default: {
      if (!field.startsWith('custom:')) return undefined
      const id = field.slice('custom:'.length)
      const def = options.customFieldDefs.find((item) => item.id === id)
      if (!def) return undefined
      return validateCustom(def as ClientProfileFieldLike, values.customFields[id] ?? '')
    }
  }
}
