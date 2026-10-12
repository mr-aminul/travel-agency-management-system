/** Placeholders staff can insert into SMS templates (synced from the client). */
export const SMS_TEMPLATE_ATTRIBUTES = [
  { key: 'clientId', label: 'Client ID', token: '{{clientId}}' },
  { key: 'name', label: 'Name', token: '{{name}}' },
  { key: 'banglaName', label: 'Bangla name', token: '{{banglaName}}' },
  { key: 'fatherName', label: 'Father name', token: '{{fatherName}}' },
  { key: 'motherName', label: 'Mother name', token: '{{motherName}}' },
  { key: 'dateOfBirth', label: 'Date of birth', token: '{{dateOfBirth}}' },
  { key: 'gender', label: 'Gender', token: '{{gender}}' },
  {
    key: 'maritalStatus',
    label: 'Marital status',
    token: '{{maritalStatus}}',
  },
  { key: 'nationality', label: 'Nationality', token: '{{nationality}}' },
  { key: 'placeOfBirth', label: 'Place of birth', token: '{{placeOfBirth}}' },
  { key: 'spouseName', label: 'Spouse name', token: '{{spouseName}}' },
  { key: 'bloodGroup', label: 'Blood group', token: '{{bloodGroup}}' },
  { key: 'phone', label: 'Phone', token: '{{phone}}' },
  { key: 'whatsapp', label: 'WhatsApp', token: '{{whatsapp}}' },
  { key: 'email', label: 'Email', token: '{{email}}' },
  { key: 'address', label: 'Address', token: '{{address}}' },
  {
    key: 'presentAddress',
    label: 'Present address',
    token: '{{presentAddress}}',
  },
  {
    key: 'permanentAddress',
    label: 'Permanent address',
    token: '{{permanentAddress}}',
  },
  { key: 'district', label: 'District', token: '{{district}}' },
  { key: 'upazila', label: 'Upazila', token: '{{upazila}}' },
  { key: 'education', label: 'Education', token: '{{education}}' },
  { key: 'profession', label: 'Profession', token: '{{profession}}' },
  { key: 'skillTrade', label: 'Skill / trade', token: '{{skillTrade}}' },
  { key: 'experience', label: 'Experience', token: '{{experience}}' },
  {
    key: 'previousOverseasExp',
    label: 'Previous overseas exp.',
    token: '{{previousOverseasExp}}',
  },
  {
    key: 'preferredCountry',
    label: 'Preferred country',
    token: '{{preferredCountry}}',
  },
  { key: 'preferredJob', label: 'Preferred job', token: '{{preferredJob}}' },
  {
    key: 'expectedSalary',
    label: 'Expected salary',
    token: '{{expectedSalary}}',
  },
  {
    key: 'contractAmount',
    label: 'Contract amount',
    token: '{{contractAmount}}',
  },
  { key: 'branch', label: 'Branch', token: '{{branch}}' },
  { key: 'nid', label: 'NID', token: '{{nid}}' },
  { key: 'passport', label: 'Passport', token: '{{passport}}' },
  {
    key: 'passportExpiry',
    label: 'Passport expiry',
    token: '{{passportExpiry}}',
  },
  {
    key: 'passportIssuedOn',
    label: 'Passport issued on',
    token: '{{passportIssuedOn}}',
  },
  {
    key: 'passportPlaceOfIssue',
    label: 'Passport place of issue',
    token: '{{passportPlaceOfIssue}}',
  },
  {
    key: 'trackingLink',
    label: 'Passport tracking link',
    token: '{{trackingLink}}',
  },
  { key: 'agentName', label: 'Agent name', token: '{{agentName}}' },
  { key: 'agencyName', label: 'Agency name', token: '{{agencyName}}' },
  {
    key: 'serviceName',
    label: 'Service name',
    token: '{{serviceName}}',
  },
  {
    key: 'statusLabel',
    label: 'Pipeline status',
    token: '{{statusLabel}}',
  },
] as const

export type SmsTemplateAttributeKey =
  (typeof SMS_TEMPLATE_ATTRIBUTES)[number]['key']

/** Suggested folder names — agencies can type any custom folder. */
export const SMS_TEMPLATE_FOLDER_SUGGESTIONS = [
  'General',
  'Passport',
  'Documents',
  'Payment',
  'Pipeline',
] as const

export type MessageTemplateChannel = 'sms' | 'email'

export type SmsTemplate = {
  id: string
  tenantId: string
  /** SMS templates appear under SMS template; email under Email template. */
  channel: MessageTemplateChannel
  /** Custom folder name shown under the channel button. */
  folder: string
  name: string
  /** Body with `{{attribute}}` tokens filled when sending. */
  body: string
  createdAt: string
}

export type SmsTemplateDraft = {
  channel: MessageTemplateChannel
  folder: string
  name: string
  body: string
}

export type SmsTemplateFolderGroup = {
  folder: string
  templates: SmsTemplate[]
}
