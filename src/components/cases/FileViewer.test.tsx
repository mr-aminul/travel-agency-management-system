import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchAuthedBlob = vi.hoisted(() => vi.fn())

vi.mock('@/lib/fileStore', () => ({
  getStoredFile: () => ({
    id: 'file-server',
    fileName: 'passport.pdf',
    mimeType: 'application/pdf',
    size: 1200,
    url: '/api/platform/files/file-server',
  }),
  isPdfMime: (type: string) => type === 'application/pdf',
  isImageMime: (type: string) => type.startsWith('image/'),
  isTextMime: () => false,
  formatFileSize: () => '1.2 KB',
  isPlatformFileUrl: (url: string) => url.includes('/api/platform/files/'),
  fetchAuthedBlob,
}))

vi.mock('@/components/cases/PdfPreview', () => ({
  PdfPreview: ({ name, url }: { name: string; url: string }) => (
    <div role="img" aria-label={name} title={name} data-preview-url={url} />
  ),
}))

import { FileViewer } from '@/components/cases/FileViewer'

describe('FileViewer', () => {
  beforeEach(() => {
    fetchAuthedBlob.mockReset()
    URL.createObjectURL = vi.fn(() => 'blob:passport-preview')
    URL.revokeObjectURL = vi.fn()
  })

  it('shows the passport instead of the sign-in error', async () => {
    fetchAuthedBlob.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }))
    render(
      <FileViewer
        fileId="file-server"
        fileName="passport.pdf"
        mimeType="application/pdf"
      />,
    )

    expect(document.querySelector('iframe')).toBeNull()
    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'passport.pdf' })).toHaveAttribute(
        'data-preview-url',
        'blob:passport-preview',
      )
    })
    expect(fetchAuthedBlob).toHaveBeenCalledWith('/api/platform/files/file-server')
  })
})
