import {
  getCaseComplianceDocuments,
  type ComplianceDocument,
} from '@/lib/caseDocuments'
import { formatDisplayDate } from '@/lib/formatDate'
import type { Case, CaseDocument } from '@/types/case'
import type { Client } from '@/types/client'

export type IdentityKind = 'passport' | 'nid'

export type IdentityCopyTarget = {
  caseId: string
  caseRef: string
  service: string
  document: ComplianceDocument
}

export type ClientIdentityRow = {
  kind: IdentityKind
  label: string
  value?: string
  meta?: string
  hasFile: boolean
  needsCopy: IdentityCopyTarget[]
  copiesOnFile: IdentityCopyTarget[]
}

export type ClientServiceDocumentGroup = {
  caseId: string
  caseRef: string
  service: string
  destination?: string
  papers: ComplianceDocument[]
  needed: number
}

export function identityKindForDocumentId(documentId: string): IdentityKind | null {
  if (documentId === 'passport') return 'passport'
  if (documentId === 'nid' || documentId === 'id') return 'nid'
  return null
}

export function isIdentityCaseDocument(documentId: string): boolean {
  return identityKindForDocumentId(documentId) !== null
}

function formatExpiry(value?: string): string | undefined {
  if (!value) return undefined
  return formatDisplayDate(value, value)
}

function copyTarget(item: Case, document: ComplianceDocument): IdentityCopyTarget {
  return {
    caseId: item.id,
    caseRef: item.caseId,
    service: item.service,
    document,
  }
}

function buildPassportRow(
  client: Client,
  cases: Case[],
): ClientIdentityRow {
  const needsCopy: IdentityCopyTarget[] = []
  const copiesOnFile: IdentityCopyTarget[] = []

  for (const item of cases) {
    const doc = getCaseComplianceDocuments(item).find(
      (entry) => identityKindForDocumentId(entry.id) === 'passport',
    )
    if (!doc) continue
    const hasRecord =
      doc.status === 'under_review' || doc.status === 'approved'
    if (hasRecord && (doc.fileName || doc.fields)) {
      copiesOnFile.push(copyTarget(item, doc))
    } else if (!doc.locked && doc.status === 'missing') {
      needsCopy.push(copyTarget(item, doc))
    }
  }

  const expiry = formatExpiry(client.passportExpiry)
  const issued = formatExpiry(client.passportIssuedOn)

  return {
    kind: 'passport',
    label: 'Passport',
    value: client.passport?.trim() || undefined,
    meta: [expiry ? `Expires ${expiry}` : null, issued ? `Issued ${issued}` : null]
      .filter(Boolean)
      .join(' · ') || undefined,
    hasFile: Boolean(client.passportFile || copiesOnFile.length),
    needsCopy,
    copiesOnFile,
  }
}

function buildNidRow(client: Client, cases: Case[]): ClientIdentityRow {
  const needsCopy: IdentityCopyTarget[] = []
  const copiesOnFile: IdentityCopyTarget[] = []

  for (const item of cases) {
    const doc = getCaseComplianceDocuments(item).find(
      (entry) => identityKindForDocumentId(entry.id) === 'nid',
    )
    if (!doc) continue
    const hasRecord =
      doc.status === 'under_review' || doc.status === 'approved'
    if (hasRecord && (doc.fileName || doc.fields)) {
      copiesOnFile.push(copyTarget(item, doc))
    } else if (!doc.locked && doc.status === 'missing') {
      needsCopy.push(copyTarget(item, doc))
    }
  }

  return {
    kind: 'nid',
    label: 'National ID',
    value: client.nid?.trim() || undefined,
    hasFile: Boolean(client.nidFile || copiesOnFile.length),
    needsCopy,
    copiesOnFile,
  }
}

export function getClientIdentityRows(
  client: Client,
  cases: Case[],
): ClientIdentityRow[] {
  return [buildPassportRow(client, cases), buildNidRow(client, cases)]
}

function pickCaseIdentityDocument(
  cases: Case[],
  kind: IdentityKind,
): CaseDocument | undefined {
  // Prefer a service file that already has a number or scan (raw docs — not
  // overlayed), so we never show case-only values that the profile cannot see.
  const matches = cases.flatMap((item) =>
    item.documents.filter((doc) => identityKindForDocumentId(doc.id) === kind),
  )
  return (
    matches.find((doc) => doc.fields?.number?.trim()) ??
    matches.find((doc) => doc.fileId || doc.fileName?.trim()) ??
    matches[0]
  )
}

export function buildIdentityCaseDocument(
  client: Client,
  cases: Case[],
  kind: IdentityKind,
): CaseDocument {
  const fromCase = pickCaseIdentityDocument(cases, kind)
  const scan = kind === 'passport' ? client.passportFile : client.nidFile
  // Client profile is the shared record Profile reads. Prefer it; fall back to
  // the service file only for gaps (heal via reconcileClientIdentityFromCases).
  const number =
    (kind === 'passport' ? client.passport?.trim() : client.nid?.trim()) ||
    fromCase?.fields?.number?.trim() ||
    undefined
  const expiry =
    (kind === 'passport' ? client.passportExpiry?.trim() : undefined) ||
    fromCase?.fields?.expiry?.trim() ||
    fromCase?.expiry?.trim() ||
    undefined
  const issuedOn =
    (kind === 'passport' ? client.passportIssuedOn?.trim() : undefined) ||
    fromCase?.fields?.issuedOn?.trim() ||
    undefined
  const placeOfIssue =
    (kind === 'passport' ? client.passportPlaceOfIssue?.trim() : undefined) ||
    fromCase?.fields?.placeOfIssue?.trim() ||
    undefined
  const hasRecord = Boolean(
    number || scan || fromCase?.fileId || fromCase?.fileName,
  )

  return {
    id: kind,
    name: kind === 'passport' ? 'Passport' : 'National ID',
    detail: number ?? '',
    status: hasRecord ? 'under_review' : 'missing',
    expiry: expiry ?? null,
    required: true,
    icon: kind,
    fields: {
      ...(number ? { number } : {}),
      ...(expiry ? { expiry } : {}),
      ...(issuedOn ? { issuedOn } : {}),
      ...(placeOfIssue ? { placeOfIssue } : {}),
    },
    fileName: scan?.fileName ?? fromCase?.fileName,
    fileId: scan?.fileId ?? fromCase?.fileId,
    mimeType: scan?.mimeType ?? fromCase?.mimeType,
  }
}

export function getCaseServicePapers(item: Case): ComplianceDocument[] {
  return getCaseComplianceDocuments(item).filter(
    (doc) => !isIdentityCaseDocument(doc.id),
  )
}

/** True when a scan/file is attached (number-only is not enough). */
export function documentHasFile(
  doc: Pick<CaseDocument, 'fileId' | 'fileName'>,
): boolean {
  return Boolean(doc.fileId || doc.fileName?.trim())
}

function identityHasFile(
  client: Client,
  cases: Case[],
  kind: IdentityKind,
): boolean {
  if (kind === 'passport' && client.passportFile) return true
  if (kind === 'nid' && client.nidFile) return true
  return documentHasFile(buildIdentityCaseDocument(client, cases, kind))
}

/**
 * Documents tab alert count: unlocked required papers / identity scans
 * still missing an uploaded file (status alone is not enough — a number
 * without a scan still needs attention).
 */
export function countClientDocumentAlerts(
  client: Client,
  cases: Case[],
): number {
  let count = 0

  for (const kind of ['passport', 'nid'] as const) {
    if (!identityHasFile(client, cases, kind)) count += 1
  }

  for (const group of getClientServiceDocumentGroups(cases)) {
    for (const paper of group.papers) {
      if (paper.locked || !paper.required) continue
      if (!documentHasFile(paper)) count += 1
    }
  }

  return count
}

export function getClientServiceDocumentGroups(
  cases: Case[],
): ClientServiceDocumentGroup[] {
  return cases.map((item) => {
    const papers = getCaseServicePapers(item)
    return {
      caseId: item.id,
      caseRef: item.caseId,
      service: item.service,
      destination: item.destination?.trim() || undefined,
      papers,
      needed: papers.filter(
        (doc) =>
          !doc.locked &&
          doc.required &&
          (!documentHasFile(doc) || doc.status === 'missing'),
      ).length,
    }
  })
}
