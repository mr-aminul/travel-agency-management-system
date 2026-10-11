import type { DocumentFormFieldDraft } from '@/types/documentFormField'
import type {
  ServiceDocumentConfig,
  ServiceStepBranchRule,
  ServiceStepConfig,
} from '@/types/serviceTemplate'

export type SelectFieldRef = {
  documentId: string
  documentName: string
  fieldKey: string
  fieldLabel: string
  options: string[]
}

/** One dropdown choice on a step — may or may not be wired to a next step yet. */
export type BranchSlot = {
  documentId: string
  documentName: string
  fieldKey: string
  fieldLabel: string
  equals: string
  nextStepId: string
}

const DEFAULT_SELECT_OPTIONS = ['Fit', 'Unfit']

export function listSelectFields(
  documents: ServiceDocumentConfig[],
  fieldsByDocId: Record<string, DocumentFormFieldDraft[]>,
  options?: { preferDocumentIds?: string[] },
): SelectFieldRef[] {
  const refs: SelectFieldRef[] = []
  for (const doc of documents) {
    for (const field of fieldsByDocId[doc.id] ?? []) {
      if (field.type !== 'select') continue
      const choices = (field.options ?? [])
        .map((item) => item.trim())
        .filter(Boolean)
      refs.push({
        documentId: doc.id,
        documentName: doc.name || 'Untitled',
        fieldKey: field.key,
        fieldLabel: field.label || field.key,
        options: choices.length > 0 ? choices : [...DEFAULT_SELECT_OPTIONS],
      })
    }
  }

  const preferred = options?.preferDocumentIds
  if (!preferred?.length) return refs

  const preferredSet = new Set(preferred)
  return [
    ...refs.filter((field) => preferredSet.has(field.documentId)),
    ...refs.filter((field) => !preferredSet.has(field.documentId)),
  ]
}

function ruleMatchesSlot(
  rule: ServiceStepBranchRule,
  slot: Pick<BranchSlot, 'documentId' | 'fieldKey' | 'equals'>,
) {
  return (
    rule.documentId === slot.documentId &&
    rule.fieldKey === slot.fieldKey &&
    rule.equals.trim().toLowerCase() === slot.equals.trim().toLowerCase()
  )
}

/** Every dropdown choice on documents this step needs — auto branches to wire. */
export function listBranchSlotsForStep(
  step: ServiceStepConfig,
  documents: ServiceDocumentConfig[],
  fieldsByDocId: Record<string, DocumentFormFieldDraft[]>,
): BranchSlot[] {
  const neededIds = step.requiredDocumentIds ?? []
  if (!neededIds.length) return []

  const selectFields = listSelectFields(documents, fieldsByDocId).filter(
    (field) => neededIds.includes(field.documentId),
  )
  const rules = step.branchRules ?? []
  const slots: BranchSlot[] = []

  for (const field of selectFields) {
    for (const equals of field.options) {
      const rule = rules.find((item) =>
        ruleMatchesSlot(item, {
          documentId: field.documentId,
          fieldKey: field.fieldKey,
          equals,
        }),
      )
      slots.push({
        documentId: field.documentId,
        documentName: field.documentName,
        fieldKey: field.fieldKey,
        fieldLabel: field.fieldLabel,
        equals,
        nextStepId: rule?.nextStepId ?? '',
      })
    }
  }

  return slots
}

export function upsertBranchRule(
  rules: ServiceStepBranchRule[] | undefined,
  rule: ServiceStepBranchRule,
): ServiceStepBranchRule[] {
  const next = (rules ?? []).filter((item) => !ruleMatchesSlot(item, rule))
  next.push(rule)
  return next
}

export function unwireBranchSlot(
  rules: ServiceStepBranchRule[] | undefined,
  slot: Pick<BranchSlot, 'documentId' | 'fieldKey' | 'equals'>,
): ServiceStepBranchRule[] | undefined {
  const next = (rules ?? []).filter((item) => !ruleMatchesSlot(item, slot))
  return next.length ? next : undefined
}

/** Drop saved rules whose dropdown choice no longer exists. */
export function pruneBranchRulesForFields(
  steps: ServiceStepConfig[],
  documents: ServiceDocumentConfig[],
  fieldsByDocId: Record<string, DocumentFormFieldDraft[]>,
): ServiceStepConfig[] {
  return steps.map((step) => {
    const slots = listBranchSlotsForStep(
      { ...step, branchRules: undefined },
      documents,
      fieldsByDocId,
    )
    if (!step.branchRules?.length) return step
    const nextRules = step.branchRules.filter((rule) =>
      slots.some((slot) => ruleMatchesSlot(rule, slot)),
    )
    if (nextRules.length === step.branchRules.length) return step
    return {
      ...step,
      branchRules: nextRules.length ? nextRules : undefined,
    }
  })
}

export function fieldToken(documentId: string, fieldKey: string) {
  return `${documentId}::${fieldKey}`
}

export function parseFieldToken(token: string): {
  documentId: string
  fieldKey: string
} {
  const [documentId = '', fieldKey = ''] = token.split('::')
  return { documentId, fieldKey }
}
