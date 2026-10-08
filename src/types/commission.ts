export type CommissionStatus = 'pending' | 'settled'

export type CommissionRule = {
  id: string
  tenantId: string
  subAgentId: string
  /** When set, only applies to that service type. */
  serviceType?: string
  percent: number
  flatAmount?: number
}

export type CommissionEntry = {
  id: string
  tenantId: string
  subAgentId: string
  caseId: string
  clientId: string
  amount: number
  status: CommissionStatus
  createdAt: string
  settledAt?: string
  /** Payment that triggered this commission, when known. */
  paymentId?: string
}

export type CommissionSettlement = {
  id: string
  tenantId: string
  subAgentId: string
  entryIds: string[]
  total: number
  settledAt: string
  note?: string
}
