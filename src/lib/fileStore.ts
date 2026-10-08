import { getAccessToken } from '@/lib/authApi'
import { shouldUseApiDataBackend } from '@/lib/data'

export type StoredFile = {
  id: string
  fileName: string
  mimeType: string
  size: number
  url: string
}

const files = new Map<string, StoredFile>()

function apiBase(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (configured && configured.trim()) {
    return configured.replace(/\/$/, '')
  }
  return ''
}

function guessMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
    if (ext === 'jpg') return 'image/jpeg'
    if (ext === 'svg') return 'image/svg+xml'
    return `image/${ext}`
  }
  if (ext === 'pdf') return 'application/pdf'
  if (['txt', 'csv', 'md', 'json', 'log'].includes(ext)) return 'text/plain'
  if (['doc', 'docx'].includes(ext)) return 'application/msword'
  if (['xls', 'xlsx'].includes(ext)) return 'application/vnd.ms-excel'
  return 'application/octet-stream'
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.readAsDataURL(file)
  })
}

async function uploadToApi(file: File): Promise<StoredFile | null> {
  if (!shouldUseApiDataBackend()) return null
  const token = getAccessToken()
  if (!token) return null
  try {
    const data = await fileToBase64(file)
    const response = await fetch(`${apiBase()}/api/platform/files`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || guessMimeType(file.name),
        data,
      }),
    })
    if (!response.ok) return null
    const body = (await response.json()) as {
      id: string
      fileName: string
      mimeType: string
      size: number
      url: string
    }
    const absoluteUrl = body.url.startsWith('http')
      ? body.url
      : `${apiBase()}${body.url}`
    const stored: StoredFile = {
      id: body.id,
      fileName: body.fileName,
      mimeType: body.mimeType,
      size: body.size,
      url: absoluteUrl,
    }
    files.set(stored.id, stored)
    return stored
  } catch {
    return null
  }
}

/** Store a file durably via API when available; otherwise session blob URL. */
export async function storeFileAsync(file: File): Promise<StoredFile> {
  const uploaded = await uploadToApi(file)
  if (uploaded) return uploaded
  return storeFileLocal(file)
}

/** Sync local blob store (fallback / offline). Prefer storeFileAsync. */
export function storeFile(file: File): StoredFile {
  return storeFileLocal(file)
}

function storeFileLocal(file: File): StoredFile {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? `file-${crypto.randomUUID()}`
      : `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const mimeType = file.type || guessMimeType(file.name)
  const url = URL.createObjectURL(file)
  const stored: StoredFile = {
    id,
    fileName: file.name,
    mimeType,
    size: file.size,
    url,
  }
  files.set(id, stored)
  // Fire-and-forget durable upload when possible
  void uploadToApi(file).then((uploaded) => {
    if (!uploaded) return
    // Remap callers still holding the local id via dual entry
    files.set(id, { ...uploaded })
    files.set(uploaded.id, uploaded)
  })
  return stored
}

export function getStoredFile(id?: string | null): StoredFile | undefined {
  if (!id) return undefined
  const cached = files.get(id)
  if (cached) return cached
  if (id.startsWith('file-') && shouldUseApiDataBackend() && getAccessToken()) {
    const url = `${apiBase()}/api/platform/files/${id}`
    const stub: StoredFile = {
      id,
      fileName: id,
      mimeType: 'application/octet-stream',
      size: 0,
      url,
    }
    files.set(id, stub)
    return stub
  }
  return undefined
}

export function revokeStoredFile(id?: string | null): void {
  if (!id) return
  const stored = files.get(id)
  if (!stored) return
  if (stored.url.startsWith('blob:')) {
    URL.revokeObjectURL(stored.url)
  }
  files.delete(id)
}

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

export function isPdfMime(mimeType: string): boolean {
  return mimeType === 'application/pdf' || mimeType.endsWith('/pdf')
}

export function isTextMime(mimeType: string): boolean {
  return (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml'
  )
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
