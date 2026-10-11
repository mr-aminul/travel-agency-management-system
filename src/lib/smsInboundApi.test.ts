import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ApiError } from '@/lib/apiClient'
import { sendClientSmsViaApi } from '@/lib/smsInboundApi'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sendClientSmsViaApi', () => {
  it('posts to the platform send route', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          ok: true,
          mobile: '8801712345678',
          messageId: 'm1',
          senderId: '8809617602051',
        }),
    })

    await expect(
      sendClientSmsViaApi({ clientId: 'c-284', body: 'Hello' }),
    ).resolves.toEqual({
      ok: true,
      mobile: '8801712345678',
      messageId: 'm1',
      senderId: '8809617602051',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/platform/sms/send',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('surfaces provider error messages', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => JSON.stringify({ error: 'SMSQ rejected the send.' }),
    })

    await expect(
      sendClientSmsViaApi({ clientId: 'c-284', body: 'Hello' }),
    ).rejects.toThrow('SMSQ rejected the send.')
  })

  it('falls back when the error body has no message', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({}),
    })

    await expect(
      sendClientSmsViaApi({ clientId: 'c-284', body: 'Hello' }),
    ).rejects.toBeInstanceOf(Error)
  })
})
