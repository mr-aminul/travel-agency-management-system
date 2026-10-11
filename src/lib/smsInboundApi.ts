import { ApiError, apiFetch } from '@/lib/apiClient'

export type SendSmsResult = {
  ok: boolean
  mobile: string
  messageId: string | null
  senderId: string
}

export async function sendClientSmsViaApi(input: {
  clientId: string
  body: string
}): Promise<SendSmsResult> {
  try {
    return await apiFetch<SendSmsResult>('/api/platform/sms/send', {
      method: 'POST',
      body: {
        clientId: input.clientId,
        body: input.body,
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
      throw new Error(`Could not send SMS (${error.status}).`)
    }
    throw error
  }
}
