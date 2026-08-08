import {
  completeCurrentStep,
  type CompleteStepResult,
} from '@/lib/casesStore'
import type { StepCompletionInput } from '@/lib/caseStepRequirements'
import { createPayment } from '@/lib/paymentsStore'

/**
 * Completes the current step and keeps related tabs in sync:
 * documents (via step uploads) + payments (when amountPaid is recorded).
 */
export function completeCaseStepWithSync(
  caseId: string,
  input: StepCompletionInput,
): CompleteStepResult {
  const result = completeCurrentStep(caseId, input)
  if (!result.ok) return result

  const amountRaw = input.fields.amountPaid?.replace(/,/g, '').trim()
  if (amountRaw) {
    const amount = Number(amountRaw)
    if (Number.isFinite(amount) && amount > 0) {
      try {
        createPayment({
          clientId: result.case.clientId,
          caseId: result.case.id,
          amount,
          method: input.fields.method?.trim() || 'Cash',
          note:
            input.fields.paidOn
              ? `Recorded with step on ${input.fields.paidOn}`
              : 'Recorded with progress step',
        })
      } catch {
        // Payment may fail if case already closed mid-flow; step data still saved.
      }
    }
  }

  return result
}
