import {
  emptyCustomFieldValues,
} from '@/lib/clientCustomFields'
import type { ClientInfoGapId } from '@/lib/clientMissingInfo'
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
} from '@/lib/fieldValidation'
import type {
  Client,
  ClientGender,
  ClientMaritalStatus,
} from '@/types/client'
import type { ClientProfileField } from '@/types/clientProfileField'

export type ClientProfileDraft = {
  name: string
  banglaName: string
  phone: string
  email: string
  address: string
  nid: string
  passport: string
  fatherName: string
  motherName: string
  dateOfBirth: string
  gender: ClientGender
  maritalStatus: string
  nationality: string
  placeOfBirth: string
  spouseName: string
  bloodGroup: string
  passportExpiry: string
  passportIssuedOn: string
  passportPlaceOfIssue: string
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
  branch: string
  customFields: Record<string, string>
}

export type ClientProfileSectionId =
  | 'reach'
  | 'travel'
  | 'personal'
  | 'family'
  | 'work'
  | 'places'
  | 'extra'

export const CLIENT_PROFILE_SECTIONS: {
  id: ClientProfileSectionId
  label: string
}[] = [
  { id: 'reach', label: 'Contact' },
  { id: 'travel', label: 'Travel ID' },
  { id: 'personal', label: 'Personal' },
  { id: 'family', label: 'Family' },
  { id: 'work', label: 'Work' },
  { id: 'places', label: 'Places' },
  { id: 'extra', label: 'Extra' },
]

export const MARITAL_VALUES = [
  'Single',
  'Married',
  'Divorced',
  'Widowed',
] as const

export const GENDER_OPTIONS = [
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

/** Draft keys owned by Documents — mirrored, never saved from Profile. */
export const IDENTITY_PROFILE_KEYS = new Set<keyof ClientProfileDraft>([
  'passport',
  'passportPlaceOfIssue',
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
  address: 'address',
  email: 'email',
}

export function sectionForGap(
  gapId: ClientInfoGapId,
): ClientProfileSectionId | 'documents' {
  if (
    gapId === 'passport' ||
    gapId === 'passportIssuedOn' ||
    gapId === 'passportExpiry' ||
    gapId === 'nid'
  ) {
    return 'documents'
  }
  return 'reach'
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
    address: client.address ?? '',
    nid: client.nid ?? '',
    passport: client.passport ?? '',
    fatherName: client.fatherName ?? '',
    motherName: client.motherName ?? '',
    dateOfBirth: client.dateOfBirth ?? '',
    gender: client.gender ?? 'Male',
    maritalStatus: client.maritalStatus ?? '',
    nationality: client.nationality ?? '',
    placeOfBirth: client.placeOfBirth ?? '',
    spouseName: client.spouseName ?? '',
    bloodGroup: client.bloodGroup ?? '',
    passportExpiry: client.passportExpiry ?? '',
    passportIssuedOn: client.passportIssuedOn ?? '',
    passportPlaceOfIssue: client.passportPlaceOfIssue ?? '',
    subAgentId: client.subAgentId ?? '',
    presentAddress: client.presentAddress ?? '',
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
    case 'placeOfBirth':
      return validateOptionalText(draft.placeOfBirth, 'Place of Birth')
    case 'nationality':
      return validateOptionalText(draft.nationality, 'Nationality')
    case 'address':
      return validateOptionalText(draft.address, 'Address')
    case 'presentAddress':
      return validateOptionalText(draft.presentAddress, 'Present Address')
    case 'permanentAddress':
      return validateOptionalText(draft.permanentAddress, 'Permanent Address')
    case 'district':
      return validateOptionalText(draft.district, 'District')
    case 'upazila':
      return validateOptionalText(draft.upazila, 'Upazila')
    case 'education':
      return validateOptionalText(draft.education, 'Education')
    case 'profession':
      return validateOptionalText(draft.profession, 'Profession')
    case 'skillTrade':
      return validateOptionalText(draft.skillTrade, 'Skill / Trade')
    case 'experience':
      return validateOptionalText(draft.experience, 'Experience')
    case 'previousOverseasExp':
      return validateOptionalText(
        draft.previousOverseasExp,
        'Overseas Experience',
      )
    case 'preferredCountry':
      return validateOptionalText(draft.preferredCountry, 'Preferred Country')
    case 'preferredJob':
      return validateOptionalText(draft.preferredJob, 'Preferred Job')
    case 'expectedSalary':
      return validateOptionalText(draft.expectedSalary, 'Expected Salary')
    case 'branch':
      return validateOptionalText(draft.branch, 'Branch')
    case 'passport':
      return validateOptionalPassport(draft.passport)
    case 'passportPlaceOfIssue':
      return validateOptionalText(draft.passportPlaceOfIssue, 'Place of Issue')
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
  'address',
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
