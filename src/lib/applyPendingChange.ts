import { createClient, updateClient } from '@/lib/clientsStore'
import { createCase, updateCase } from '@/lib/casesStore'
import { markPendingChange } from '@/lib/subAgentPendingChanges'
import { beginApplyingApprovedChange, endApplyingApprovedChange } from '@/lib/subAgentScope'
import type { CreateClientInput, UpdateClientInput } from '@/types/client'
import type { CreateCaseInput, UpdateCaseInput } from '@/types/case'
import type { SubAgentPendingChange } from '@/types/subAgentAccess'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function applyApprovedPendingChange(
  change: SubAgentPendingChange,
  reviewer: { userId: string; name: string },
): SubAgentPendingChange {
  if (change.status !== 'pending') {
    throw new Error('This change was already reviewed.')
  }

  beginApplyingApprovedChange()
  try {
    const payload = change.payload
    if (change.entityType === 'client' && change.action === 'create') {
      if (!isRecord(payload) || !isRecord(payload.input)) {
        throw new Error('Invalid client create payload.')
      }
      createClient(payload.input as unknown as CreateClientInput, {
        tenantId:
          typeof payload.tenantId === 'string' ? payload.tenantId : undefined,
      })
    } else if (change.entityType === 'client' && change.action === 'update') {
      if (!isRecord(payload) || typeof payload.id !== 'string') {
        throw new Error('Invalid client update payload.')
      }
      updateClient(payload.id, payload.patch as UpdateClientInput)
    } else if (change.entityType === 'case' && change.action === 'create') {
      if (!isRecord(payload) || !isRecord(payload.input)) {
        throw new Error('Invalid service create payload.')
      }
      createCase(payload.input as unknown as CreateCaseInput)
    } else if (change.entityType === 'case' && change.action === 'update') {
      if (!isRecord(payload) || typeof payload.id !== 'string') {
        throw new Error('Invalid service update payload.')
      }
      updateCase(payload.id, payload.patch as UpdateCaseInput)
    } else {
      throw new Error('This change type cannot be applied yet.')
    }
  } finally {
    endApplyingApprovedChange()
  }

  const reviewed = markPendingChange(change.id, {
    status: 'approved',
    reviewedByUserId: reviewer.userId,
    reviewedByName: reviewer.name,
  })
  if (!reviewed) throw new Error('Could not mark change as approved.')
  return reviewed
}

export function rejectPendingChange(
  change: SubAgentPendingChange,
  reviewer: { userId: string; name: string },
  reason?: string,
): SubAgentPendingChange {
  const reviewed = markPendingChange(change.id, {
    status: 'rejected',
    reviewedByUserId: reviewer.userId,
    reviewedByName: reviewer.name,
    rejectReason: reason?.trim() || undefined,
  })
  if (!reviewed) throw new Error('Could not reject change.')
  return reviewed
}
