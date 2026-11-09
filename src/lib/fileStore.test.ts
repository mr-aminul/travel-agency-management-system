import { beforeEach, describe, expect, it, vi } from 'vitest'
import { writeSession, type AuthUser } from '@/lib/authApi'
import {
  fetchAuthedBlob,
  isPlatformFileUrl,
  withSessionPreview,
  type StoredFile,
} from '@/lib/fileStore'

const local: StoredFile = {
  id: 'file-local',
  fileName: 'passport.pdf',
  mimeType: 'application/pdf',
  size: 10,
  url: 'blob:passport',
}

const uploaded: StoredFile = {
  id: 'file-server',
  fileName: 'passport.pdf',
  mimeType: 'application/pdf',
  size: 10,
  url: '/api/platform/files/file-server',
}

describe('file preview urls', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('keeps the on-screen copy after the file is stored', () => {
    expect(withSessionPreview(local, uploaded).url).toBe('blob:passport')
  })

  it('knows which urls need a sign-in token', () => {
    expect(isPlatformFileUrl('/api/platform/files/file-server')).toBe(true)
    expect(isPlatformFileUrl('blob:passport')).toBe(false)
  })

  it('sends the sign-in token when loading a stored file', async () => {
    writeSession({
      user: { id: 'user-1', email: 'a@b.c', name: 'Aminul', role: 'owner' } as AuthUser,
      tenantId: 'tenant-1',
      signedInAt: '2026-11-09T00:00:00.000Z',
      accessToken: 'tok',
    })
    const fetchMock = vi.fn(
      async () =>
        new Response('%PDF', {
          status: 200,
          headers: { 'content-type': 'application/pdf' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const blob = await fetchAuthedBlob('/api/platform/files/file-server')
    expect(blob.size).toBeGreaterThan(0)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/platform/files/file-server',
      expect.objectContaining({
        headers: { Authorization: 'Bearer tok' },
      }),
    )

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Authentication required.' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    )
    await expect(fetchAuthedBlob('/api/platform/files/file-server')).rejects.toThrow(
      'Could not load file.',
    )
  })
})
