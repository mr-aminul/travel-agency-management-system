/** Per-tenant rules for how sub-agent edits land in the agency workspace. */
export type SubAgentAccessSettings = {
  tenantId: string
  /**
   * When true, creates/updates from a logged-in sub-agent stay pending until
   * an approver accepts them. Default on for new agencies.
   */
  requireApproval: boolean
  /** Tenant member ids who may approve pending sub-agent changes. */
  approverMemberIds: string[]
}

export type PendingChangeEntityType =
  | 'client'
  | 'case'
  | 'document'
  | 'payment'
  | 'profile'

export type PendingChangeAction = 'create' | 'update' | 'delete'

export type PendingChangeStatus = 'pending' | 'approved' | 'rejected'

export type SubAgentPendingChange = {
  id: string
  tenantId: string
  subAgentId: string
  submittedByUserId: string
  submittedByName: string
  entityType: PendingChangeEntityType
  action: PendingChangeAction
  /** Existing entity id for update/delete; omitted for create. */
  entityId?: string
  /** Human-readable one-liner for the approvals inbox. */
  summary: string
  /** Full mutation payload applied on approve. */
  payload: unknown
  status: PendingChangeStatus
  createdAt: string
  reviewedAt?: string
  reviewedByUserId?: string
  reviewedByName?: string
  rejectReason?: string
}

/** Link between a CRM sub-agent and their login account. */
export type SubAgentLoginLink = {
  subAgentId: string
  tenantId: string
  userId: string
  email: string
  status: 'active' | 'invited' | 'disabled'
  invitedAt?: string
  activatedAt?: string
}
