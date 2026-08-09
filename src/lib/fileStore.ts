export type StoredFile = {
  id: string
  fileName: string
  mimeType: string
  size: number
  url: string
}

const files = new Map<string, StoredFile>()

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

export function storeFile(file: File): StoredFile {
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
  return stored
}

export function getStoredFile(id?: string | null): StoredFile | undefined {
  if (!id) return undefined
  return files.get(id)
}

export function revokeStoredFile(id?: string | null): void {
  if (!id) return
  const stored = files.get(id)
  if (!stored) return
  URL.revokeObjectURL(stored.url)
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
