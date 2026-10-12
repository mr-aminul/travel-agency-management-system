import type { ModuleId } from '@/types/tenant'

export type BillingStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'suspended'
  | 'canceled'

export type PlanKind = 'trial' | 'standard' | 'comp' | 'custom'

export type PlanTemplate = {
  id: string
  name: string
  description: string
  sortOrder: number
  priceBdt: number
  currency: string
  interval: 'month' | 'year'
  userLimit: number
  subAgentLimit: number
  storageLimitBytes: number
  smsLimit: number
  smsOverageBdt: number
  modules: ModuleId[] | string[]
  features: Record<string, unknown>
  isPublic: boolean
  isActive: boolean
}

export type TenantBilling = {
  tenantId: string
  planId: string | null
  billingStatus: BillingStatus
  planKind: PlanKind
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  userLimit: number | null
  subAgentLimit: number | null
  storageLimitBytes: number | null
  smsLimit: number | null
  smsOverageBdt: number | null
  gatewayCustomerId: string | null
  gatewaySubscriptionId: string | null
  billingNotes: string
  createdAt: string | null
  updatedAt: string | null
}

export type BillingInvoice = {
  id: string
  tenantId: string
  planId: string | null
  status: 'open' | 'pending_review' | 'paid' | 'void' | 'failed'
  amountBdt: number
  currency: string
  description: string
  periodStart: string | null
  periodEnd: string | null
  paymentMethod: string | null
  paymentReference: string | null
  paymentNote: string | null
  gatewayPaymentId: string | null
  paidAt: string | null
  verifiedBy: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type BillingAccess = {
  allowed: boolean
  reason: string
  wall: 'suspended' | 'expired' | null
  grace?: boolean
}

export type UsageTone = 'ok' | 'warn' | 'full'

export type BillingSnapshot = {
  tenantId: string
  billing: TenantBilling | null
  plan: PlanTemplate | null
  limits: {
    userLimit: number
    subAgentLimit: number
    storageLimitBytes: number
    smsLimit: number
    smsOverageBdt: number
  }
  usage: {
    users: number
    pendingInvites: number
    seatCommit: number
    subAgents: number
    storageBytes: number
    smsSent: number
    smsPeriod: string
  }
  tones: {
    users: UsageTone
    subAgents: UsageTone
    storage: UsageTone
    sms: UsageTone
  }
  access?: BillingAccess
  invoices?: BillingInvoice[]
  instructions?: PaymentInstructions
}

export type PaymentInstructions = {
  mode: 'manual' | 'external'
  bkash: string | null
  nagad: string | null
  bankName: string | null
  bankAccount: string | null
  bankRouting: string | null
  supportEmail: string
  note: string
}
