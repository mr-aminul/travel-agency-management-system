export type ClientActionItem = {
  id: string
  tenantId: string
  clientId: string
  text: string
  done: boolean
  createdAt: string
  completedAt?: string
}

export type CreateClientActionItemInput = {
  clientId: string
  text: string
}
