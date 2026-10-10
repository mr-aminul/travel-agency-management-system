import type { CaseDocument } from '@/types/case'
import type {
  ServiceStepBranchRule,
  ServiceStepConfig,
} from '@/types/serviceTemplate'

export function normalizeBranchRules(
  value: unknown,
): ServiceStepBranchRule[] | undefined {
  if (!Array.isArray(value)) return undefined
  const rules = value
    .map((item) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        return undefined
      }
      const row = item as Record<string, unknown>
      const documentId =
        typeof row.documentId === 'string' ? row.documentId.trim() : ''
      const fieldKey =
        typeof row.fieldKey === 'string' ? row.fieldKey.trim() : ''
      const equals = typeof row.equals === 'string' ? row.equals.trim() : ''
      const nextStepId =
        typeof row.nextStepId === 'string' ? row.nextStepId.trim() : ''
      if (!documentId || !fieldKey || !equals || !nextStepId) return undefined
      return { documentId, fieldKey, equals, nextStepId }
    })
    .filter((item): item is ServiceStepBranchRule => item != null)
  return rules.length ? rules : undefined
}

/** First matching rule wins. Comparison is case-insensitive on the value. */
export function matchBranchNextStepId(
  step: ServiceStepConfig | undefined,
  documents: CaseDocument[],
  validStepIds: Set<string>,
): string | null {
  const rules = step?.branchRules
  if (!rules?.length) return null

  for (const rule of rules) {
    if (!validStepIds.has(rule.nextStepId)) continue
    const doc = documents.find((item) => item.id === rule.documentId)
    const value = (doc?.fields?.[rule.fieldKey] ?? '').trim()
    if (!value) continue
    if (value.toLowerCase() === rule.equals.trim().toLowerCase()) {
      return rule.nextStepId
    }
  }
  return null
}

export function validateStepBranchRules(
  steps: ServiceStepConfig[],
): string | undefined {
  const stepIds = new Set(steps.map((step) => step.id))
  for (const step of steps) {
    for (const rule of step.branchRules ?? []) {
      if (!rule.documentId.trim() || !rule.fieldKey.trim()) {
        return `Add a document field for a branch on “${step.label || step.id}”.`
      }
      if (!rule.equals.trim()) {
        return `Choose a value for a branch on “${step.label || step.id}”.`
      }
      if (!stepIds.has(rule.nextStepId)) {
        return `Pick a next status for a branch on “${step.label || step.id}”.`
      }
    }
  }
  return undefined
}
