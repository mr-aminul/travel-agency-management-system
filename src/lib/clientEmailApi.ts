import { ApiError, apiFetch } from '@/lib/apiClient'
import type { ClientMessageAttachment } from '@/types/clientMessage'

export type SendClientEmailResult = {
  ok: boolean
  to: string
  subject: string
}

export async function sendClientEmailViaApi(input: {
  clientId: string
  subject: string
  text: string
  html?: string
  attachment?: ClientMessageAttachment
}): Promise<SendClientEmailResult> {
  try {
    return await apiFetch<SendClientEmailResult>('/api/platform/email/send', {
      method: 'POST',
      body: {
        clientId: input.clientId,
        subject: input.subject,
        text: input.text,
        html: input.html,
        attachment: input.attachment,
      },
    })
  } catch (error) {
    if (error instanceof ApiError) {
      const payload = error.body
      if (
        payload &&
        typeof payload === 'object' &&
        'error' in payload &&
        typeof (payload as { error: unknown }).error === 'string'
      ) {
        throw new Error((payload as { error: string }).error)
      }
      throw new Error(`Could not send email (${error.status}).`)
    }
    throw error
  }
}
