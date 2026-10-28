/** Auto-fill tokens for document canvas templates. */

export type DocumentMergeGroup =
  | 'client'
  | 'passport'
  | 'agency'
  | 'document'

export type DocumentMergeField = {
  key: string
  label: string
  group: DocumentMergeGroup
  /** Short chip label shown in the editor. */
  chip: string
}

export const DOCUMENT_MERGE_GROUP_LABELS: Record<DocumentMergeGroup, string> = {
  client: 'Client',
  passport: 'Passport & ID',
  agency: 'Agency',
  document: 'Document',
}

export const DOCUMENT_MERGE_FIELDS: DocumentMergeField[] = [
  { key: 'name', label: 'Client name', chip: 'Client name', group: 'client' },
  {
    key: 'banglaName',
    label: 'Bangla name',
    chip: 'Bangla name',
    group: 'client',
  },
  {
    key: 'fatherName',
    label: 'Father name',
    chip: 'Father name',
    group: 'client',
  },
  {
    key: 'motherName',
    label: 'Mother name',
    chip: 'Mother name',
    group: 'client',
  },
  {
    key: 'spouseName',
    label: 'Spouse name',
    chip: 'Spouse name',
    group: 'client',
  },
  {
    key: 'dateOfBirth',
    label: 'Date of birth',
    chip: 'Date of birth',
    group: 'client',
  },
  { key: 'gender', label: 'Gender', chip: 'Gender', group: 'client' },
  {
    key: 'maritalStatus',
    label: 'Marital status',
    chip: 'Marital status',
    group: 'client',
  },
  {
    key: 'nationality',
    label: 'Nationality',
    chip: 'Nationality',
    group: 'client',
  },
  {
    key: 'placeOfBirth',
    label: 'Place of birth',
    chip: 'Place of birth',
    group: 'client',
  },
  {
    key: 'bloodGroup',
    label: 'Blood group',
    chip: 'Blood group',
    group: 'client',
  },
  { key: 'phone', label: 'Phone', chip: 'Phone', group: 'client' },
  { key: 'whatsapp', label: 'WhatsApp', chip: 'WhatsApp', group: 'client' },
  { key: 'email', label: 'Email', chip: 'Email', group: 'client' },
  { key: 'address', label: 'Address', chip: 'Address', group: 'client' },
  {
    key: 'presentAddress',
    label: 'Present address',
    chip: 'Present address',
    group: 'client',
  },
  {
    key: 'permanentAddress',
    label: 'Permanent address',
    chip: 'Permanent address',
    group: 'client',
  },
  { key: 'district', label: 'District', chip: 'District', group: 'client' },
  { key: 'upazila', label: 'Upazila', chip: 'Upazila', group: 'client' },
  {
    key: 'education',
    label: 'Education',
    chip: 'Education',
    group: 'client',
  },
  {
    key: 'profession',
    label: 'Profession',
    chip: 'Profession',
    group: 'client',
  },
  {
    key: 'skillTrade',
    label: 'Skill / trade',
    chip: 'Skill / trade',
    group: 'client',
  },
  {
    key: 'experience',
    label: 'Experience',
    chip: 'Experience',
    group: 'client',
  },
  {
    key: 'preferredCountry',
    label: 'Preferred country',
    chip: 'Preferred country',
    group: 'client',
  },
  {
    key: 'preferredJob',
    label: 'Preferred job',
    chip: 'Preferred job',
    group: 'client',
  },
  {
    key: 'expectedSalary',
    label: 'Expected salary',
    chip: 'Expected salary',
    group: 'client',
  },
  { key: 'branch', label: 'Branch', chip: 'Branch', group: 'client' },
  {
    key: 'clientId',
    label: 'Client ID',
    chip: 'Client ID',
    group: 'client',
  },
  {
    key: 'agentName',
    label: 'Sub-agent name',
    chip: 'Sub-agent',
    group: 'client',
  },

  { key: 'nid', label: 'NID', chip: 'NID', group: 'passport' },
  {
    key: 'passport',
    label: 'Passport number',
    chip: 'Passport no.',
    group: 'passport',
  },
  {
    key: 'passportExpiry',
    label: 'Passport expiry',
    chip: 'Passport expiry',
    group: 'passport',
  },
  {
    key: 'passportIssuedOn',
    label: 'Passport issued on',
    chip: 'Passport issued',
    group: 'passport',
  },
  {
    key: 'passportPlaceOfIssue',
    label: 'Passport place of issue',
    chip: 'Place of issue',
    group: 'passport',
  },

  {
    key: 'agencyName',
    label: 'Agency name',
    chip: 'Agency name',
    group: 'agency',
  },
  {
    key: 'agencyAddress',
    label: 'Agency address',
    chip: 'Agency address',
    group: 'agency',
  },
  {
    key: 'agencyMobile',
    label: 'Agency mobile',
    chip: 'Agency mobile',
    group: 'agency',
  },
  {
    key: 'agencyWebsite',
    label: 'Agency website',
    chip: 'Agency website',
    group: 'agency',
  },
  {
    key: 'license',
    label: 'Agency license number',
    chip: 'License no.',
    group: 'agency',
  },

  { key: 'date', label: 'Today’s date', chip: 'Date', group: 'document' },
  {
    key: 'country',
    label: 'Destination country',
    chip: 'Country',
    group: 'document',
  },
  {
    key: 'documentTitle',
    label: 'Document title',
    chip: 'Title',
    group: 'document',
  },
]

const FIELD_BY_KEY = new Map(
  DOCUMENT_MERGE_FIELDS.map((field) => [field.key, field]),
)

export function getDocumentMergeField(
  key: string,
): DocumentMergeField | undefined {
  return FIELD_BY_KEY.get(key)
}

export function documentMergeToken(key: string): string {
  return `{{${key}}}`
}

export const DEFAULT_CANVAS_BODY_HTML = `<p></p><p>To,</p><p></p><p>Subject: </p><p></p><p>Dear Sir/Madam,</p><p></p><p>This letter concerns our client <span data-type="mergeField" data-key="name" data-label="Client name" class="pd-doc-merge">Client name</span> (passport no. <span data-type="mergeField" data-key="passport" data-label="Passport no." class="pd-doc-merge">Passport no.</span>).</p><p></p><p>Agency: <span data-type="mergeField" data-key="agencyName" data-label="Agency name" class="pd-doc-merge">Agency name</span><br>License no.: <span data-type="mergeField" data-key="license" data-label="License no." class="pd-doc-merge">License no.</span><br>Date: <span data-type="mergeField" data-key="date" data-label="Date" class="pd-doc-merge">Date</span></p><p></p><p>Yours faithfully,</p><p><span data-type="mergeField" data-key="agencyName" data-label="Agency name" class="pd-doc-merge">Agency name</span></p>`
