import type { SubAgentPendingChange } from '@/types/subAgentAccess'

/** Thrown when a sub-agent mutation was queued for agency approval instead of applied. */
export class PendingApprovalError extends Error {
  readonly change: SubAgentPendingChange

  constructor(change: SubAgentPendingChange) {
    super(
      'Submitted for agency approval. It will appear once an approver accepts it.',
    )
    this.name = 'PendingApprovalError'
    this.change = change
  }
}

export function isPendingApprovalError(
  error: unknown,
): error is PendingApprovalError {
  return error instanceof PendingApprovalError
}
