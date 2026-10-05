export type ClientSmsDirection = 'outbound'

export type ClientSmsMessage = {
  id: string
  tenantId: string
  clientId: string
  toPhone: string
  body: string
  direction: ClientSmsDirection
  createdAt: string
}

export type SendClientSmsInput = {
  clientId: string
  body: string
}
