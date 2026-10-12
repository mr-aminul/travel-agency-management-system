import { clientTrackingUrl } from '@/lib/publicUrl'
import { findSubAgentById } from '@/lib/subAgentsStore'
import type { Client } from '@/types/client'
import {
  SMS_TEMPLATE_ATTRIBUTES,
  type SmsTemplateAttributeKey,
} from '@/types/smsTemplate'

export type SmsTemplateFillContext = {
  client: Client
  agencyName?: string
  /** Case service label — used by pipeline status messages. */
  serviceName?: string
  /** Pipeline status label the file just entered. */
  statusLabel?: string
}

function text(value: string | undefined | null): string {
  return value?.trim() ?? ''
}

function attributeValue(
  key: SmsTemplateAttributeKey,
  context: SmsTemplateFillContext,
): string {
  const { client, agencyName, serviceName, statusLabel } = context
  switch (key) {
    case 'clientId':
      return client.id
    case 'name':
      return text(client.name)
    case 'banglaName':
      return text(client.banglaName)
    case 'fatherName':
      return text(client.fatherName)
    case 'motherName':
      return text(client.motherName)
    case 'dateOfBirth':
      return text(client.dateOfBirth)
    case 'gender':
      return text(client.gender)
    case 'maritalStatus':
      return text(client.maritalStatus)
    case 'nationality':
      return text(client.nationality)
    case 'placeOfBirth':
      return text(client.placeOfBirth)
    case 'spouseName':
      return text(client.spouseName)
    case 'bloodGroup':
      return text(client.bloodGroup)
    case 'phone':
      return text(client.phone)
    case 'whatsapp':
      return text(client.whatsapp)
    case 'email':
      return text(client.email)
    case 'address':
      return text(client.address)
    case 'presentAddress':
      return text(client.presentAddress)
    case 'permanentAddress':
      return text(client.permanentAddress)
    case 'district':
      return text(client.district)
    case 'upazila':
      return text(client.upazila)
    case 'education':
      return text(client.education)
    case 'profession':
      return text(client.profession)
    case 'skillTrade':
      return text(client.skillTrade)
    case 'experience':
      return text(client.experience)
    case 'previousOverseasExp':
      return text(client.previousOverseasExp)
    case 'preferredCountry':
      return text(client.preferredCountry)
    case 'preferredJob':
      return text(client.preferredJob)
    case 'expectedSalary':
      return text(client.expectedSalary)
    case 'contractAmount':
      return client.contractAmount != null ? String(client.contractAmount) : ''
    case 'branch':
      return text(client.branch)
    case 'nid':
      return text(client.nid)
    case 'passport':
      return text(client.passport)
    case 'passportExpiry':
      return text(client.passportExpiry)
    case 'passportIssuedOn':
      return text(client.passportIssuedOn)
    case 'passportPlaceOfIssue':
      return text(client.passportPlaceOfIssue)
    case 'trackingLink':
      return clientTrackingUrl(client.passport)
    case 'agentName': {
      const subAgentId = client.subAgentId?.trim()
      if (!subAgentId) return ''
      return text(findSubAgentById(subAgentId)?.name)
    }
    case 'agencyName':
      return text(agencyName)
    case 'serviceName':
      return text(serviceName)
    case 'statusLabel':
      return text(statusLabel)
    default:
      return ''
  }
}

/**
 * Replace `{{clientId}}`-style tokens with live client / agency values.
 * Unknown tokens are left as-is.
 */
export function fillSmsTemplate(
  body: string,
  context: SmsTemplateFillContext,
): string {
  return body.replace(
    /\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g,
    (match, rawKey: string) => {
      const key = rawKey as SmsTemplateAttributeKey
      const known = SMS_TEMPLATE_ATTRIBUTES.some((item) => item.key === key)
      if (!known) return match
      return attributeValue(key, context)
    },
  )
}
