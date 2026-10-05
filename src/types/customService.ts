export type CustomService = {
  id: string
  tenantId: string
  name: string
  description: string
  createdAt: string
}

export type CustomServiceDraft = {
  name: string
  description?: string
  /** Optional catalog icon id; omit to keep / use default. */
  iconId?: string | null
}
