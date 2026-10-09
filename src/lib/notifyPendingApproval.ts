import { isPendingApprovalError } from '@/lib/pendingApprovalError'

/**
 * If `error` is a queued sub-agent change, show a friendly confirmation and
 * return true so callers can stop navigation / close modals without treating
 * it as a hard failure.
 */
export function notifyIfPendingApproval(error: unknown): boolean {
  if (!isPendingApprovalError(error)) return false
  window.alert(error.message)
  return true
}
