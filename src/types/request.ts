import type { CaseStatus } from '@/types/case'

export type RequestReviewStatus = 'Pending' | 'Approved' | 'Rejected'

export type StatusUpdateRequest = {
  id: string
  tenantId: string
  partnerId: string
  clientId: string
  caseId: string
  fromStatus: CaseStatus
  toStatus: CaseStatus
  remarks?: string
  requestedAt: string
  reviewStatus: RequestReviewStatus
  reviewedBy?: string
  reviewedAt?: string
  reviewRemarks?: string
}
