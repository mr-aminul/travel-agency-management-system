export type ClientMessageChannel = 'sms' | 'email'

export type ClientMessageDirection = 'outbound' | 'inbound'

export type ClientMessageAttachment = {
  name: string
  dataUrl: string
  mimeType: string
}

export type ClientThreadMessage = {
  id: string
  tenantId: string
  clientId: string
  channel: ClientMessageChannel
  to: string
  body: string
  attachment?: ClientMessageAttachment
  direction: ClientMessageDirection
  createdAt: string
}

/** @deprecated Prefer ClientThreadMessage — kept for older SMS call sites. */
export type ClientSmsMessage = ClientThreadMessage & {
  toPhone: string
}

export type SendClientMessageInput = {
  clientId: string
  channel: ClientMessageChannel
  body: string
  attachment?: ClientMessageAttachment
}

export type SendClientSmsInput = {
  clientId: string
  body: string
  attachment?: ClientMessageAttachment
}
