import { readSession } from '@/lib/authApi'
import { readSubAgentAccessSettings } from '@/lib/subAgentAccessSettings'
import {
  submitPendingChange,
  type SubmitPendingChangeInput,
} from '@/lib/subAgentPendingChanges'
import type { Client } from '@/types/client'
import type { Case } from '@/types/case'
import type { SubAgentPendingChange } from '@/types/subAgentAccess'

/** While an approver applies a queued change, skip re-queuing. */
let applyingApprovedChange = false

export function beginApplyingApprovedChange() {
  applyingApprovedChange = true
}

export function endApplyingApprovedChange() {
  applyingApprovedChange = false
}

/** CRM sub-agent id for the signed-in sub agent, if any. */
export function getSessionSubAgentId(): string | undefined {
  const session = readSession()
  if (!session || session.user.role !== 'sub_agent') return undefined
  return session.user.subAgentId
}

export function isSubAgentSession(): boolean {
  return readSession()?.user.role === 'sub_agent'
}

export function filterClientsForSession(clients: Client[]): Client[] {
  const subAgentId = getSessionSubAgentId()
  if (!subAgentId) return clients
  return clients.filter((client) => client.subAgentId === subAgentId)
}

export function filterCasesForSession(
  cases: Case[],
  clients: Client[],
): Case[] {
  const subAgentId = getSessionSubAgentId()
  if (!subAgentId) return cases
  const allowed = new Set(
    clients
      .filter((client) => client.subAgentId === subAgentId)
      .map((client) => client.id),
  )
  return cases.filter((item) => allowed.has(item.clientId))
}

export function clientBelongsToSession(client: Client): boolean {
  const subAgentId = getSessionSubAgentId()
  if (!subAgentId) return true
  return client.subAgentId === subAgentId
}

/**
 * When the signed-in user is a sub-agent and the agency requires approval,
 * queue the change instead of applying it. Returns the queued row, or null
 * when the caller should apply immediately.
 */
export function queueOrApplySubAgentChange(
  input: Omit<
    SubmitPendingChangeInput,
    'subAgentId' | 'submittedByUserId' | 'submittedByName' | 'tenantId'
  > & { summary: string },
): { queued: SubAgentPendingChange } | { apply: true } {
  if (applyingApprovedChange) return { apply: true }
  const session = readSession()
  if (!session || session.user.role !== 'sub_agent' || !session.user.subAgentId) {
    return { apply: true }
  }
  const settings = readSubAgentAccessSettings(session.tenantId)
  if (!settings.requireApproval) {
    return { apply: true }
  }
  const queued = submitPendingChange({
    ...input,
    tenantId: session.tenantId,
    subAgentId: session.user.subAgentId,
    submittedByUserId: session.user.id,
    submittedByName: session.user.name,
  })
  return { queued }
}

export function canApproveSubAgentChanges(
  memberId: string | undefined,
  tenantId: string,
): boolean {
  if (!memberId) return false
  const settings = readSubAgentAccessSettings(tenantId)
  if (settings.approverMemberIds.length === 0) {
    // No explicit list yet — owners/managers can approve (checked by caller).
    return true
  }
  return settings.approverMemberIds.includes(memberId)
}
