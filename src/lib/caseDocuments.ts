import type { LucideIcon } from 'lucide-react'
import { type BadgeVariant } from '@/components/ui'
import {
  BookOpen,
  Briefcase,
  ClipboardList,
  FileWarning,
  IdCard,
  Stethoscope,
  Ticket,
} from 'lucide-react'
import { getStepDef, getStepIndex, templateCountry } from '@/lib/caseChecklist'
import { findStepForDocument } from '@/lib/caseStepRequirements'
import { resolveServiceTemplateOverride } from '@/lib/serviceTemplatesStore'
import type { ServiceDocumentConfig } from '@/types/serviceTemplate'
import type {
  BuiltinServiceType,
  Case,
  CaseDocument,
  CaseDocumentIcon,
  CaseDocumentStatus,
  ServiceType,
} from '@/types/case'
import type { Client } from '@/types/client'

export type ComplianceDocument = CaseDocument & {
  iconComponent: LucideIcon
  locked: boolean
  /** Step that collects this document via progress upload. */
  sourceStepId?: string
  sourceStepLabel?: string
  /** Read-only guidance for the Documents tab. */
  collectionHint: string
}

const STATUS_BADGE: Record<
  CaseDocumentStatus,
  { label: string; variant: BadgeVariant }
> = {
  approved: { label: 'On file', variant: 'neutral' },
  under_review: { label: 'Saved', variant: 'neutral' },
  missing: { label: 'Open', variant: 'neutral' },
  not_due: { label: 'Later', variant: 'neutral' },
}

const ICON_MAP: Record<CaseDocumentIcon, LucideIcon> = {
  passport: BookOpen,
  nid: IdCard,
  medical: Stethoscope,
  demand: FileWarning,
  bmet: ClipboardList,
  offer: Briefcase,
  financial: ClipboardList,
  visa: FileWarning,
  vaccine: Stethoscope,
  package: ClipboardList,
  id: IdCard,
  itinerary: ClipboardList,
  deposit: FileWarning,
  payment: FileWarning,
  ticket: Ticket,
  other: ClipboardList,
}

export function complianceStatusMeta(status: CaseDocumentStatus) {
  return STATUS_BADGE[status]
}

export function documentIcon(icon: CaseDocumentIcon): LucideIcon {
  return ICON_MAP[icon]
}

type DocTemplate = Omit<CaseDocument, 'status' | 'detail' | 'expiry'> & {
  defaultStatus: CaseDocumentStatus
  defaultDetail: string
  defaultExpiry?: string | null
  /** Pull detail from client identity when available. */
  fromClient?: 'passport' | 'nid'
}

function manpowerTemplate(): DocTemplate[] {
  return [
    {
      id: 'passport',
      name: 'Machine Readable Passport',
      required: true,
      icon: 'passport',
      defaultStatus: 'missing',
      defaultDetail: 'Valid MRP required',
      fromClient: 'passport',
    },
    {
      id: 'nid',
      name: 'National Identity Card',
      required: true,
      icon: 'nid',
      defaultStatus: 'missing',
      defaultDetail: 'NID copy on file',
      defaultExpiry: 'Lifetime',
      fromClient: 'nid',
    },
    {
      id: 'medical',
      name: 'Medical Fitness Report',
      required: true,
      icon: 'medical',
      unlockStepId: 'medical',
      defaultStatus: 'not_due',
      defaultDetail: 'GAMCA / approved clinic',
    },
    {
      id: 'demand',
      name: 'Demand Letter',
      required: true,
      icon: 'demand',
      unlockStepId: 'selected',
      defaultStatus: 'not_due',
      defaultDetail: 'Employer authorization required',
    },
    {
      id: 'bmet',
      name: 'BMET Registration',
      required: true,
      icon: 'bmet',
      unlockStepId: 'clearance',
      defaultStatus: 'not_due',
      defaultDetail: 'Due after medical clearance',
    },
  ]
}

function studentTemplate(): DocTemplate[] {
  return [
    {
      id: 'passport',
      name: 'Machine Readable Passport',
      required: true,
      icon: 'passport',
      defaultStatus: 'missing',
      defaultDetail: 'Valid 6+ months',
      fromClient: 'passport',
    },
    {
      id: 'offer',
      name: 'University Offer Letter',
      required: true,
      icon: 'offer',
      unlockStepId: 'offer',
      defaultStatus: 'not_due',
      defaultDetail: 'Conditional / unconditional',
    },
    {
      id: 'financial',
      name: 'Financial Proof',
      required: true,
      icon: 'financial',
      unlockStepId: 'applied',
      defaultStatus: 'not_due',
      defaultDetail: 'Bank statements / sponsor letter',
    },
    {
      id: 'visa',
      name: 'Student Visa Application',
      required: true,
      icon: 'visa',
      unlockStepId: 'visa',
      defaultStatus: 'not_due',
      defaultDetail: 'Embassy file',
    },
  ]
}

function hajjTemplate(): DocTemplate[] {
  return [
    {
      id: 'passport',
      name: 'Machine Readable Passport',
      required: true,
      icon: 'passport',
      defaultStatus: 'missing',
      defaultDetail: 'Valid through return + 6 months',
      fromClient: 'passport',
    },
    {
      id: 'nid',
      name: 'National Identity Card',
      required: true,
      icon: 'nid',
      defaultStatus: 'missing',
      defaultDetail: 'NID copy on file',
      defaultExpiry: 'Lifetime',
      fromClient: 'nid',
    },
    {
      id: 'vaccine',
      name: 'Vaccination Certificate',
      required: true,
      icon: 'vaccine',
      unlockStepId: 'medical',
      defaultStatus: 'not_due',
      defaultDetail: 'Meningitis / required shots',
    },
    {
      id: 'visa',
      name: 'Hajj / Umrah Visa',
      required: true,
      icon: 'visa',
      unlockStepId: 'visa',
      defaultStatus: 'not_due',
      defaultDetail: 'Quota allocation',
    },
    {
      id: 'package',
      name: 'Package Confirmation',
      required: true,
      icon: 'package',
      unlockStepId: 'package',
      defaultStatus: 'not_due',
      defaultDetail: 'Operator booking form',
    },
  ]
}

function leisureTemplate(): DocTemplate[] {
  return [
    {
      id: 'id',
      name: 'Photo ID',
      required: true,
      icon: 'id',
      defaultStatus: 'missing',
      defaultDetail: 'NID or passport',
      fromClient: 'nid',
    },
    {
      id: 'itinerary',
      name: 'Confirmed Itinerary',
      required: true,
      icon: 'itinerary',
      unlockStepId: 'confirmed',
      defaultStatus: 'not_due',
      defaultDetail: 'Hotels + transfers',
    },
    {
      id: 'deposit',
      name: 'Booking Deposit Receipt',
      required: true,
      icon: 'deposit',
      unlockStepId: 'payment',
      defaultStatus: 'not_due',
      defaultDetail: 'Advance payment proof',
    },
  ]
}

function ticketingTemplate(): DocTemplate[] {
  return [
    {
      id: 'passport',
      name: 'Machine Readable Passport',
      required: true,
      icon: 'passport',
      defaultStatus: 'missing',
      defaultDetail: 'Name must match ticket',
      fromClient: 'passport',
    },
    {
      id: 'payment',
      name: 'Ticket Payment',
      required: true,
      icon: 'payment',
      unlockStepId: 'payment',
      defaultStatus: 'not_due',
      defaultDetail: 'Full fare or hold deposit',
    },
    {
      id: 'ticket',
      name: 'E-Ticket Issuance',
      required: true,
      icon: 'ticket',
      unlockStepId: 'issued',
      defaultStatus: 'not_due',
      defaultDetail: 'After payment clearance',
    },
  ]
}

function touristVisaTemplate(): DocTemplate[] {
  return [
    {
      id: 'passport',
      name: 'Machine Readable Passport',
      required: true,
      icon: 'passport',
      defaultStatus: 'missing',
      defaultDetail: 'Valid 6+ months',
      fromClient: 'passport',
    },
    {
      id: 'itinerary',
      name: 'Travel itinerary',
      required: true,
      icon: 'itinerary',
      unlockStepId: 'applied',
      defaultStatus: 'not_due',
      defaultDetail: 'Flights and hotel plan',
    },
    {
      id: 'visa',
      name: 'Tourist visa',
      required: true,
      icon: 'visa',
      unlockStepId: 'visa',
      defaultStatus: 'not_due',
      defaultDetail: 'Embassy file',
    },
  ]
}

function medicalVisaTemplate(): DocTemplate[] {
  return [
    {
      id: 'passport',
      name: 'Machine Readable Passport',
      required: true,
      icon: 'passport',
      defaultStatus: 'missing',
      defaultDetail: 'Valid 6+ months',
      fromClient: 'passport',
    },
    {
      id: 'medical',
      name: 'Hospital invitation',
      required: true,
      icon: 'medical',
      unlockStepId: 'medical',
      defaultStatus: 'not_due',
      defaultDetail: 'Treatment letter / appointment',
    },
    {
      id: 'visa',
      name: 'Medical visa',
      required: true,
      icon: 'visa',
      unlockStepId: 'visa',
      defaultStatus: 'not_due',
      defaultDetail: 'Embassy file',
    },
  ]
}

function hotelTemplate(): DocTemplate[] {
  return [
    {
      id: 'id',
      name: 'Photo ID',
      required: true,
      icon: 'id',
      defaultStatus: 'missing',
      defaultDetail: 'NID or passport',
      fromClient: 'nid',
    },
    {
      id: 'itinerary',
      name: 'Hotel voucher',
      required: true,
      icon: 'itinerary',
      unlockStepId: 'confirmed',
      defaultStatus: 'not_due',
      defaultDetail: 'Booking confirmation',
    },
    {
      id: 'deposit',
      name: 'Booking deposit receipt',
      required: true,
      icon: 'deposit',
      unlockStepId: 'payment',
      defaultStatus: 'not_due',
      defaultDetail: 'Advance payment proof',
    },
  ]
}

const TEMPLATES: Record<BuiltinServiceType, () => DocTemplate[]> = {
  'Tourist Visa': touristVisaTemplate,
  'Student Visa': studentTemplate,
  'Work Permit Visa': manpowerTemplate,
  'Hajj/Umrah Visa': hajjTemplate,
  'Medical Visa': medicalVisaTemplate,
  'Air Ticket': ticketingTemplate,
  'Hotel Booking': hotelTemplate,
  'Tour Package': leisureTemplate,
}

function customTemplate(): DocTemplate[] {
  return [
    {
      id: 'passport',
      name: 'Passport',
      required: true,
      icon: 'passport',
      fromClient: 'passport',
      defaultStatus: 'missing',
      defaultDetail: 'Collect from client profile',
    },
    {
      id: 'payment',
      name: 'Payment receipt',
      required: false,
      icon: 'payment',
      unlockStepId: 'documents',
      defaultStatus: 'not_due',
      defaultDetail: 'If a deposit or fee was collected',
    },
    {
      id: 'other',
      name: 'Supporting document',
      required: false,
      icon: 'other',
      unlockStepId: 'documents',
      defaultStatus: 'not_due',
      defaultDetail: 'Any paper this service needs',
    },
  ]
}

function iconFromDocumentName(name: string): CaseDocumentIcon {
  const value = name.toLowerCase()
  if (value.includes('passport')) return 'passport'
  if (value.includes('nid') || value.includes('national')) return 'nid'
  if (value.includes('medical')) return 'medical'
  if (value.includes('vaccine')) return 'vaccine'
  if (value.includes('visa')) return 'visa'
  if (value.includes('ticket')) return 'ticket'
  if (value.includes('offer')) return 'offer'
  if (value.includes('payment') || value.includes('deposit')) return 'payment'
  return 'other'
}

function builtinTemplates(service: ServiceType): DocTemplate[] {
  return (TEMPLATES[service as BuiltinServiceType] ?? customTemplate)()
}

export function getDefaultDocumentConfigs(
  service: ServiceType,
): ServiceDocumentConfig[] {
  return builtinTemplates(service).map((template) => ({
    id: template.id,
    name: template.name,
    required: template.required,
    unlockStepId: template.unlockStepId,
  }))
}

function templatesFromConfig(docs: ServiceDocumentConfig[]): DocTemplate[] {
  return docs.map((doc) => ({
    id: doc.id,
    name: doc.name,
    required: doc.required,
    icon: iconFromDocumentName(doc.name),
    unlockStepId: doc.unlockStepId,
    defaultStatus: doc.unlockStepId ? 'not_due' : 'missing',
    defaultDetail: doc.required
      ? 'Required for this service'
      : 'Optional for this service',
  }))
}

function templatesFor(
  service: ServiceType,
  country?: string,
): () => DocTemplate[] {
  const override = resolveServiceTemplateOverride(service, country)
  if (override) {
    return () => templatesFromConfig(override.documents)
  }
  return () => builtinTemplates(service)
}

function resolveClientDetail(
  template: DocTemplate,
  client?: Client,
): { detail: string; status: CaseDocumentStatus; expiry: string | null } {
  if (template.fromClient === 'passport' && client?.passport) {
    return {
      detail: client.passport,
      status: 'approved',
      expiry: template.defaultExpiry ?? null,
    }
  }
  if (template.fromClient === 'nid' && client?.nid) {
    return {
      detail: client.nid,
      status: 'approved',
      expiry: template.defaultExpiry ?? 'Lifetime',
    }
  }
  return {
    detail: template.defaultDetail,
    status: template.defaultStatus,
    expiry: template.defaultExpiry ?? null,
  }
}

export function buildCaseDocuments(
  service: ServiceType,
  client?: Client,
  country?: string,
): CaseDocument[] {
  return templatesFor(service, country)().map((template) => {
    const resolved = resolveClientDetail(template, client)
    return {
      id: template.id,
      name: template.name,
      required: template.required,
      icon: template.icon,
      unlockStepId: template.unlockStepId,
      detail: resolved.detail,
      status: resolved.status,
      expiry: resolved.expiry,
    }
  })
}

function isStepUnlocked(item: Case, unlockStepId?: string): boolean {
  if (!unlockStepId) return true
  const country = templateCountry(item)
  const current = getStepIndex(item.service, item.currentStepId, country)
  const needed = getStepIndex(item.service, unlockStepId, country)
  if (item.status === 'Completed') return true
  return current >= needed
}

/**
 * Recompute document status from progress steps (uploads) + unlock position.
 * Documents are not independently editable — Progress is the source of truth.
 */
function findProgressUploadForDocument(item: Case, documentId: string) {
  const catalogKey = `doc:${documentId}`
  for (const record of Object.values(item.steps)) {
    const uploaded = record.uploads?.find(
      (file) => file.key === catalogKey || file.key === documentId,
    )
    if (uploaded?.fileName) return uploaded
  }
  const collector = findStepForDocument(item.service, documentId)
  if (!collector) return undefined
  return item.steps[collector.requirement.stepId]?.uploads?.find(
    (file) => file.key === collector.uploadKey,
  )
}

export function syncDocumentsWithProgress(item: Case): CaseDocument[] {
  return item.documents.map((doc) => {
    const collector = findStepForDocument(item.service, doc.id)
    const unlockStepId = collector?.requirement.stepId ?? doc.unlockStepId
    const unlocked = isStepUnlocked(item, unlockStepId)
    const uploaded = findProgressUploadForDocument(item, doc.id)

    if (collector || uploaded || doc.unlockStepId) {
      const hasDetails =
        Boolean(doc.fields && Object.keys(doc.fields).length > 0) ||
        Boolean(uploaded?.fileName) ||
        Boolean(doc.fileName)
      if (
        doc.status === 'approved' ||
        doc.status === 'under_review' ||
        hasDetails
      ) {
        return {
          ...doc,
          unlockStepId,
          status:
            doc.status === 'approved'
              ? ('approved' as const)
              : ('under_review' as const),
          detail: doc.detail || uploaded?.fileName || doc.fileName || 'Recorded',
          fileName: doc.fileName || uploaded?.fileName,
          fileId: doc.fileId || uploaded?.fileId,
          mimeType: doc.mimeType || uploaded?.mimeType,
        }
      }
      if (!unlocked) {
        return {
          ...doc,
          unlockStepId,
          status: 'not_due' as const,
          detail: doc.detail,
        }
      }
      if (collector || doc.unlockStepId) {
        return {
          ...doc,
          unlockStepId,
          status: 'missing' as const,
          detail: doc.detail,
        }
      }
    }

    // Identity docs may already be approved from the client profile.
    if (doc.status === 'approved') return doc

    if (!unlocked && doc.status === 'missing') {
      return { ...doc, status: 'not_due' as const }
    }
    if (unlocked && doc.status === 'not_due') {
      return { ...doc, status: 'missing' as const }
    }
    return doc
  })
}

export function getCaseComplianceDocuments(
  item: Case,
): ComplianceDocument[] {
  const docs = syncDocumentsWithProgress(item)
  return docs.map((doc) => {
    const collector = findStepForDocument(item.service, doc.id)
    const sourceStepId = collector?.requirement.stepId ?? doc.unlockStepId
    const sourceStepLabel = sourceStepId
      ? getStepDef(item.service, sourceStepId, templateCountry(item))?.label
      : undefined
    const locked = !isStepUnlocked(item, sourceStepId)

    let collectionHint = 'On file'
    if (collector || doc.unlockStepId) {
      if (doc.status === 'under_review' || doc.status === 'approved') {
        collectionHint = `Filed in ${sourceStepLabel ?? 'progress'} step`
      } else if (locked) {
        collectionHint = `Needed at ${sourceStepLabel ?? 'later'} status`
      } else {
        collectionHint = `Upload in “${sourceStepLabel ?? 'current'}” to complete`
      }
    } else if (doc.status === 'approved') {
      collectionHint = 'From client profile'
    }

    return {
      ...doc,
      iconComponent: documentIcon(doc.icon),
      locked,
      sourceStepId,
      sourceStepLabel,
      collectionHint,
    }
  })
}

export function countMissingDocuments(item: Case): number {
  return getCaseComplianceDocuments(item).filter(
    (doc) => !doc.locked && doc.status === 'missing' && doc.required,
  ).length
}

/** Seed overrides for demo cases. */
export function withSeedDocumentStatuses(
  docs: CaseDocument[],
  overrides: Partial<Record<string, Partial<CaseDocument>>>,
): CaseDocument[] {
  return docs.map((doc) => {
    const patch = overrides[doc.id]
    return patch ? { ...doc, ...patch } : doc
  })
}
