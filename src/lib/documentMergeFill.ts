import { findSubAgentById } from '@/lib/subAgentsStore'
import type { AgencyProfile } from '@/lib/agencyProfile'
import type { Client } from '@/types/client'
import { getDocumentMergeField } from '@/types/documentMergeFields'

export type DocumentMergeContext = {
  client?: Client | null
  agency?: Pick<
    AgencyProfile,
    'businessName' | 'address' | 'mobile' | 'website'
  > | null
  license?: string
  date: string
  country?: string
  documentTitle?: string
}

function text(value: string | undefined | null): string {
  return value?.trim() ?? ''
}

export function documentMergeValue(
  key: string,
  context: DocumentMergeContext,
): string {
  const client = context.client
  switch (key) {
    case 'name':
      return text(client?.name)
    case 'banglaName':
      return text(client?.banglaName)
    case 'fatherName':
      return text(client?.fatherName)
    case 'motherName':
      return text(client?.motherName)
    case 'spouseName':
      return text(client?.spouseName)
    case 'dateOfBirth':
      return text(client?.dateOfBirth)
    case 'gender':
      return text(client?.gender)
    case 'maritalStatus':
      return text(client?.maritalStatus)
    case 'nationality':
      return text(client?.nationality)
    case 'placeOfBirth':
      return text(client?.placeOfBirth)
    case 'bloodGroup':
      return text(client?.bloodGroup)
    case 'phone':
      return text(client?.phone)
    case 'whatsapp':
      return text(client?.whatsapp)
    case 'email':
      return text(client?.email)
    case 'address':
      return text(client?.address)
    case 'presentAddress':
      return text(client?.presentAddress)
    case 'permanentAddress':
      return text(client?.permanentAddress)
    case 'district':
      return text(client?.district)
    case 'upazila':
      return text(client?.upazila)
    case 'education':
      return text(client?.education)
    case 'profession':
      return text(client?.profession)
    case 'skillTrade':
      return text(client?.skillTrade)
    case 'experience':
      return text(client?.experience)
    case 'preferredCountry':
      return text(client?.preferredCountry)
    case 'preferredJob':
      return text(client?.preferredJob)
    case 'expectedSalary':
      return text(client?.expectedSalary)
    case 'branch':
      return text(client?.branch)
    case 'clientId':
      return text(client?.id)
    case 'agentName': {
      const subAgentId = client?.subAgentId?.trim()
      if (!subAgentId) return ''
      return text(findSubAgentById(subAgentId)?.name)
    }
    case 'nid':
      return text(client?.nid)
    case 'passport':
      return text(client?.passport)
    case 'passportExpiry':
      return text(client?.passportExpiry)
    case 'passportIssuedOn':
      return text(client?.passportIssuedOn)
    case 'passportPlaceOfIssue':
      return text(client?.passportPlaceOfIssue)
    case 'agencyName':
      return text(context.agency?.businessName)
    case 'agencyAddress':
      return text(context.agency?.address)
    case 'agencyMobile':
      return text(context.agency?.mobile)
    case 'agencyWebsite':
      return text(context.agency?.website)
    case 'license':
      return text(context.license)
    case 'agency':
      return text(context.agency?.businessName)
    case 'date':
      return context.date
    case 'country':
      return text(context.country)
    case 'documentTitle':
      return text(context.documentTitle)
    default:
      return ''
  }
}

/**
 * Replace merge-field spans and `{{token}}` placeholders with live values.
 * Unknown tokens stay as-is so drafts remain readable.
 */
export function fillDocumentHtml(
  html: string,
  context: DocumentMergeContext,
): string {
  if (!html) return ''
  const withSpans = html.replace(
    /<span\b([^>]*\bdata-(?:type="mergeField"|merge-field|key)[^>]*)>([\s\S]*?)<\/span>/gi,
    (full, attrs: string) => {
      const keyMatch =
        attrs.match(/\bdata-key="([^"]+)"/i) ||
        attrs.match(/\bdata-merge-field="([^"]+)"/i)
      const key = keyMatch?.[1]?.trim()
      if (!key || !getDocumentMergeField(key)) return full
      const value = documentMergeValue(key, context)
      return escapeHtml(value || '—')
    },
  )

  return withSpans.replace(
    /\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g,
    (match, rawKey: string) => {
      if (!getDocumentMergeField(rawKey) && rawKey !== 'agency') return match
      const value = documentMergeValue(rawKey, context)
      return value || '—'
    },
  )
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
