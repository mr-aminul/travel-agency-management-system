import type {
  ServiceStepConfig,
  ServiceStepDecision,
  ServiceStepDecisionOption,
} from '@/types/serviceTemplate'

export const DECISION_FIELD_PREFIX = 'decision:'

export function decisionFieldKey(decisionKey: string): string {
  return `${DECISION_FIELD_PREFIX}${decisionKey}`
}

export function parseDecisionFieldKey(fieldKey: string): string | null {
  if (!fieldKey.startsWith(DECISION_FIELD_PREFIX)) return null
  const key = fieldKey.slice(DECISION_FIELD_PREFIX.length).trim()
  return key || null
}

export function normalizeDecisions(
  value: unknown,
): ServiceStepDecision[] | undefined {
  if (!Array.isArray(value)) return undefined
  const decisions = value
    .map((item): ServiceStepDecision | undefined => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        return undefined
      }
      const row = item as Record<string, unknown>
      const key = typeof row.key === 'string' ? row.key.trim() : ''
      const label = typeof row.label === 'string' ? row.label.trim() : ''
      if (!key || !label || !Array.isArray(row.options)) return undefined
      const options = row.options
        .map((option): ServiceStepDecisionOption | undefined => {
          if (
            typeof option !== 'object' ||
            option === null ||
            Array.isArray(option)
          ) {
            return undefined
          }
          const opt = option as Record<string, unknown>
          const optValue =
            typeof opt.value === 'string' ? opt.value.trim() : ''
          if (!optValue) return undefined
          const nextStepId =
            typeof opt.nextStepId === 'string' && opt.nextStepId.trim()
              ? opt.nextStepId.trim()
              : undefined
          return {
            value: optValue,
            ...(nextStepId ? { nextStepId } : {}),
            ...(opt.skipDocuments === true ? { skipDocuments: true } : {}),
          }
        })
        .filter((option): option is ServiceStepDecisionOption => option != null)
      if (options.length < 2) return undefined
      return { key, label, options }
    })
    .filter((item): item is ServiceStepDecision => item != null)
  return decisions.length ? decisions : undefined
}

/** Slug a label into a stable decision key. */
export function decisionKeyFromLabel(
  label: string,
  usedKeys: string[],
): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'decision'
  if (!usedKeys.includes(base)) return base
  let n = 2
  while (usedKeys.includes(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

export function defaultYesNoDecision(label: string, usedKeys: string[]): ServiceStepDecision {
  return {
    key: decisionKeyFromLabel(label, usedKeys),
    label: label.trim() || 'Decision',
    options: [
      { value: 'Yes' },
      { value: 'No', skipDocuments: true },
    ],
  }
}

export function findSelectedDecisionOption(
  decision: ServiceStepDecision,
  fields: Record<string, string> | undefined,
): ServiceStepDecisionOption | undefined {
  const raw = (fields?.[decisionFieldKey(decision.key)] ?? '').trim()
  if (!raw) return undefined
  return decision.options.find(
    (option) => option.value.toLowerCase() === raw.toLowerCase(),
  )
}

/** True when any answered decision on this step says skip documents. */
export function stepDecisionsSkipDocuments(
  step: ServiceStepConfig | undefined,
  fields: Record<string, string> | undefined,
): boolean {
  const decisions = step?.decisions
  if (!decisions?.length) return false
  return decisions.some((decision) => {
    const selected = findSelectedDecisionOption(decision, fields)
    return selected?.skipDocuments === true
  })
}

/**
 * First decision option with an explicit nextStepId wins.
 * Options without nextStepId keep the default linear path.
 */
export function matchDecisionNextStepId(
  step: ServiceStepConfig | undefined,
  fields: Record<string, string> | undefined,
  validStepIds: Set<string>,
): string | null {
  const decisions = step?.decisions
  if (!decisions?.length || !fields) return null
  for (const decision of decisions) {
    const selected = findSelectedDecisionOption(decision, fields)
    const nextStepId = selected?.nextStepId?.trim()
    if (nextStepId && validStepIds.has(nextStepId)) return nextStepId
  }
  return null
}

export function validateStepDecisions(
  steps: ServiceStepConfig[],
): string | undefined {
  const stepIds = new Set(steps.map((step) => step.id))
  for (const step of steps) {
    for (const decision of step.decisions ?? []) {
      if (!decision.label.trim()) {
        return `Name the decision on “${step.label || step.id}”.`
      }
      if ((decision.options?.length ?? 0) < 2) {
        return `Add at least two choices for “${decision.label}” on “${step.label || step.id}”.`
      }
      for (const option of decision.options) {
        if (!option.value.trim()) {
          return `Every choice on “${decision.label}” needs a label.`
        }
        if (option.nextStepId && !stepIds.has(option.nextStepId)) {
          return `Pick a valid next status for “${decision.label} = ${option.value}” on “${step.label || step.id}”.`
        }
        if (option.nextStepId === step.id) {
          return `“${decision.label} = ${option.value}” cannot point back to the same status.`
        }
      }
    }
  }
  return undefined
}
