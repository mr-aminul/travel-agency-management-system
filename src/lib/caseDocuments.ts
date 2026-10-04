import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Briefcase,
  ClipboardList,
  FileWarning,
  IdCard,
  Stethoscope,
  Ticket,
} from 'lucide-react'
import type { BadgeVariant } from '@/components/ui'
import { getStepDef, getStepIndex } from '@/lib/caseChecklist'
import { findStepForDocument } from '@/lib/caseStepRequirements'
import type {
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

const TEMPLATES: Record<ServiceType, () => DocTemplate[]> = {
  Manpower: manpowerTemplate,
  Student: studentTemplate,
  'Hajj/Umrah': hajjTemplate,
  Leisure: leisureTemplate,
  Ticketing: ticketingTemplate,
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
): CaseDocument[] {
  return TEMPLATES[service]().map((template) => {
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
  const current = getStepIndex(item.service, item.currentStepId)
  const needed = getStepIndex(item.service, unlockStepId)
  if (item.status === 'Completed') return true
  return current >= needed
}

/**
 * Recompute document status from progress steps (uploads) + unlock position.
 * Documents are not independently editable — Progress is the source of truth.
 */
export function syncDocumentsWithProgress(item: Case): CaseDocument[] {
  return item.documents.map((doc) => {
    const collector = findStepForDocument(item.service, doc.id)
    const unlockStepId = collector?.requirement.stepId ?? doc.unlockStepId
    const unlocked = isStepUnlocked(item, unlockStepId)

    if (collector) {
      const stepRecord = item.steps[collector.requirement.stepId]
      const uploaded = stepRecord?.uploads?.find(
        (file) => file.key === collector.uploadKey,
      )
      const hasDetails =
        Boolean(doc.fields && Object.keys(doc.fields).length > 0) ||
        Boolean(uploaded?.fileName)
      if (hasDetails) {
        return {
          ...doc,
          unlockStepId,
          status:
            doc.status === 'approved'
              ? ('approved' as const)
              : ('under_review' as const),
          detail: doc.detail || uploaded?.fileName || 'Recorded',
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
      return {
        ...doc,
        unlockStepId,
        status: 'missing' as const,
        detail: doc.detail,
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
      ? getStepDef(item.service, sourceStepId)?.label
      : undefined
    const locked = !isStepUnlocked(item, sourceStepId)

    let collectionHint = 'On file'
    if (collector) {
      if (doc.status === 'under_review' || doc.status === 'approved') {
        collectionHint = `Filed in ${sourceStepLabel ?? 'progress'} step`
      } else if (locked) {
        collectionHint = `Unlocks at ${sourceStepLabel ?? 'later'} step`
      } else {
        collectionHint = `Complete “${sourceStepLabel ?? 'current'}” step to upload`
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
