export type Payment = {
  id: string
  tenantId: string
  clientId: string
  caseId: string
  /** Amount received (reduces case balance due). */
  amount: number
  method: string
  note?: string
  /** bKash/Nagad/bank reference for reconcile. */
  txnId?: string
  createdAt: string
}

export type CreatePaymentInput = {
  clientId: string
  caseId: string
  amount: number
  method?: string
  note?: string
  txnId?: string
}
