import {
  emptyCustomFieldValues,
} from '@/lib/clientCustomFields'
import type { ClientInfoGapId } from '@/lib/clientMissingInfo'
import {
  validateOptionalDateOfBirth,
  validateOptionalEmail,
  validateOptionalMoney,
  validateOptionalNid,
  validateOptionalPassport,
  validateOptionalPersonName,
  validateOptionalText,
  validatePassportDates,
  validateRequiredName,
  validateRequiredPhone,
} from '@/lib/fieldValidation'
import type {
  Client,
  ClientGender,
  ClientMaritalStatus,
} from '@/types/client'
import {
  CLIENT_PROFILE_SECTIONS,
  type ClientProfileField,
  type ClientProfileSectionId,
} from '@/types/clientProfileField'

export { CLIENT_PROFILE_SECTIONS }
export type { ClientProfileSectionId }

export type ClientProfileDraft = {
  name: string
  banglaName: string
  phone: string
  email: string
  whatsapp: string
  nid: string
  passport: string
  fatherName: string
  motherName: string
  dateOfBirth: string
  gender: ClientGender | ''
  maritalStatus: string
  nationality: string
  placeOfBirth: string
  spouseName: string
  bloodGroup: string
  passportExpiry: string
  passportIssuedOn: string
  /** Empty string = agency-direct (no referring sub agent). */
  subAgentId: string
  presentAddress: string
  permanentAddress: string
  district: string
  upazila: string
  education: string
  profession: string
  skillTrade: string
  experience: string
  previousOverseasExp: string
  preferredCountry: string
  preferredJob: string
  expectedSalary: string
  contractAmount: string
  branch: string
  customFields: Record<string, string>
}

const LEGACY_PROFILE_SECTION: Record<string, ClientProfileSectionId> = {
  reach: 'contact',
  places: 'contact',
  travel: 'identity',
  personal: 'identity',
}

/** Map a profile `section` query param, including older section ids. */
export function profileSectionFromParam(
  value: string | null,
): ClientProfileSectionId | undefined {
  if (!value) return undefined
  if (CLIENT_PROFILE_SECTIONS.some((section) => section.id === value)) {
    return value as ClientProfileSectionId
  }
  return LEGACY_PROFILE_SECTION[value]
}

export const MARITAL_VALUES = [
  'Single',
  'Married',
  'Divorced',
  'Widowed',
] as const

export const GENDER_OPTIONS = [
  { value: '', label: '-' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
]

export const MARITAL_OPTIONS = [
  { value: '', label: '-' },
  ...MARITAL_VALUES.map((value) => ({ value, label: value })),
]

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

export const BLOOD_GROUP_OPTIONS = [
  { value: '', label: '-' },
  ...BLOOD_GROUPS.map((value) => ({ value, label: value })),
]

export function parseMaritalStatus(
  value: string,
): ClientMaritalStatus | undefined {
  return MARITAL_VALUES.find((entry) => entry === value)
}

/**
 * Draft keys owned by Profile → Identity document workspace — mirrored in the
 * profile form, never saved from the form Save button.
 */
export const IDENTITY_PROFILE_KEYS = new Set<keyof ClientProfileDraft>([
  'passport',
  'passportIssuedOn',
  'passportExpiry',
  'nid',
])

export function isIdentityProfileField(key: keyof ClientProfileDraft): boolean {
  return IDENTITY_PROFILE_KEYS.has(key)
}

/** Profile draft keys that map to missing-info gap ids. */
export const PROFILE_GAP_FIELD: Record<
  ClientInfoGapId,
  keyof ClientProfileDraft
> = {
  passport: 'passport',
  passportIssuedOn: 'passportIssuedOn',
  passportExpiry: 'passportExpiry',
  nid: 'nid',
  address: 'presentAddress',
  email: 'email',
}

export function sectionForGap(
  gapId: ClientInfoGapId,
): ClientProfileSectionId | 'identity' {
  if (
    gapId === 'passport' ||
    gapId === 'passportIssuedOn' ||
    gapId === 'passportExpiry' ||
    gapId === 'nid'
  ) {
    return 'identity'
  }
  return 'contact'
}

export function toClientProfileDraft(
  client: Client,
  customFieldDefs: ClientProfileField[],
): ClientProfileDraft {
  return {
    name: client.name,
    banglaName: client.banglaName ?? '',
    phone: client.phone,
    email: client.email ?? '',
    whatsapp: client.whatsapp ?? '',
    nid: client.nid ?? '',
    passport: client.passport ?? '',
    fatherName: client.fatherName ?? '',
    motherName: client.motherName ?? '',
    dateOfBirth: client.dateOfBirth ?? '',
    gender: client.gender ?? '',
    maritalStatus: client.maritalStatus ?? '',
    nationality: client.nationality ?? '',
    placeOfBirth: client.placeOfBirth ?? '',
    spouseName: client.spouseName ?? '',
    bloodGroup: client.bloodGroup ?? '',
    passportExpiry: client.passportExpiry ?? '',
    passportIssuedOn: client.passportIssuedOn ?? '',
    subAgentId: client.subAgentId ?? '',
    presentAddress: client.presentAddress || client.address || '',
    permanentAddress: client.permanentAddress ?? '',
    district: client.district ?? '',
    upazila: client.upazila ?? '',
    education: client.education ?? '',
    profession: client.profession ?? '',
    skillTrade: client.skillTrade ?? '',
    experience: client.experience ?? '',
    previousOverseasExp: client.previousOverseasExp ?? '',
    preferredCountry: client.preferredCountry ?? '',
    preferredJob: client.preferredJob ?? '',
    expectedSalary: client.expectedSalary ?? '',
    contractAmount:
      client.contractAmount != null ? String(client.contractAmount) : '',
    branch: client.branch ?? '',
    customFields: emptyCustomFieldValues(
      customFieldDefs,
      client.customFields,
    ),
  }
}

export function clientProfileDraftsEqual(
  a: ClientProfileDraft,
  b: ClientProfileDraft,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function validateOptionalChoice(
  value: string,
  label: string,
  allowed: readonly string[],
): string | undefined {
  const text = value.trim()
  if (!text) return undefined
  if (!allowed.includes(text)) return `Choose a valid ${label.toLowerCase()}.`
  return undefined
}

export function profileFieldError(
  key: keyof ClientProfileDraft,
  draft: ClientProfileDraft,
  duplicateName?: string,
): string | undefined {
  switch (key) {
    case 'name':
      return validateRequiredName(draft.name)
    case 'phone':
      return validateRequiredPhone(draft.phone, { duplicateName })
    case 'email':
      return validateOptionalEmail(draft.email)
    case 'whatsapp':
      return draft.whatsapp.trim()
        ? validateRequiredPhone(draft.whatsapp, { label: 'WhatsApp' })
        : undefined
    case 'banglaName':
      return validateOptionalPersonName(draft.banglaName, 'Bangla Name')
    case 'fatherName':
      return validateOptionalPersonName(draft.fatherName, 'Father Name')
    case 'motherName':
      return validateOptionalPersonName(draft.motherName, 'Mother Name')
    case 'spouseName':
      return validateOptionalPersonName(draft.spouseName, 'Spouse Name')
    case 'dateOfBirth':
      return validateOptionalDateOfBirth(draft.dateOfBirth)
    case 'gender':
      return validateOptionalChoice(draft.gender, 'Gender', [
        'Male',
        'Female',
        'Other',
      ])
    case 'maritalStatus':
      return validateOptionalChoice(
        draft.maritalStatus,
        'Marital status',
        MARITAL_VALUES,
      )
    case 'bloodGroup':
      return validateOptionalChoice(
        draft.bloodGroup,
        'Blood group',
        BLOOD_GROUPS,
      )
    case 'placeOfBirth':
      return validateOptionalText(draft.placeOfBirth, 'Place of Birth')
    case 'nationality':
      return validateOptionalText(draft.nationality, 'Nationality')
    case 'presentAddress':
      return validateOptionalText(draft.presentAddress, 'Present Address', 500)
    case 'permanentAddress':
      return validateOptionalText(
        draft.permanentAddress,
        'Permanent Address',
        500,
      )
    case 'district':
      return validateOptionalText(draft.district, 'District')
    case 'upazila':
      return validateOptionalText(draft.upazila, 'Upazila')
    case 'education':
      return validateOptionalText(draft.education, 'Education')
    case 'profession':
      return validateOptionalText(draft.profession, 'Profession')
    case 'skillTrade':
      return validateOptionalText(draft.skillTrade, 'Skill / Trade', 200, 1)
    case 'experience':
      return validateOptionalText(draft.experience, 'Experience', 200, 1)
    case 'previousOverseasExp':
      return validateOptionalText(
        draft.previousOverseasExp,
        'Overseas Experience',
        200,
        1,
      )
    case 'preferredCountry':
      return validateOptionalText(draft.preferredCountry, 'Preferred Country')
    case 'preferredJob':
      return validateOptionalText(draft.preferredJob, 'Preferred Job', 200, 1)
    case 'expectedSalary':
      return validateOptionalMoney(draft.expectedSalary, 'Expected salary')
    case 'branch':
      return validateOptionalText(draft.branch, 'Branch', 200, 1)
    case 'passport':
      return validateOptionalPassport(draft.passport)
    case 'passportIssuedOn':
      return validatePassportDates(
        draft.passportIssuedOn,
        draft.passportExpiry,
        draft.passport,
      ).issuedOn
    case 'passportExpiry':
      return validatePassportDates(
        draft.passportIssuedOn,
        draft.passportExpiry,
        draft.passport,
      ).expiry
    case 'nid':
      return validateOptionalNid(draft.nid)
    default:
      return undefined
  }
}

/** Editable draft keys validated on save (identity excluded). */
export const EDITABLE_PROFILE_KEYS: (keyof ClientProfileDraft)[] = [
  'name',
  'banglaName',
  'phone',
  'email',
  'whatsapp',
  'subAgentId',
  'dateOfBirth',
  'gender',
  'placeOfBirth',
  'nationality',
  'bloodGroup',
  'fatherName',
  'motherName',
  'maritalStatus',
  'spouseName',
  'profession',
  'education',
  'skillTrade',
  'experience',
  'previousOverseasExp',
  'preferredCountry',
  'preferredJob',
  'expectedSalary',
  'branch',
  'presentAddress',
  'permanentAddress',
  'district',
  'upazila',
]
