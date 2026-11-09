import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type PdfPreviewProps = {
  url: string
  name: string
  compact?: boolean
  fill?: boolean
}

/** Pull the first embedded JPEG out of a PDF (common for phone/macOS scans). */
function extractJpegObjectUrl(bytes: Uint8Array): string | null {
  const soi = [0xff, 0xd8, 0xff] as const
  let start = -1
  for (let i = 0; i < bytes.length - 2; i += 1) {
    if (
      bytes[i] === soi[0] &&
      bytes[i + 1] === soi[1] &&
      bytes[i + 2] === soi[2]
    ) {
      start = i
      break
    }
  }
  if (start < 0) return null

  for (let i = start + 3; i < bytes.length - 1; i += 1) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd9) {
      const jpeg = bytes.subarray(start, i + 2)
      return URL.createObjectURL(new Blob([jpeg], { type: 'image/jpeg' }))
    }
  }
  return null
}

/**
 * PDF preview without the native iframe plugin (often paints a blank black
 * frame for blob URLs). Scan-style PDFs become an image; others fall back.
 */
export function PdfPreview({ url, name, compact, fill }: PdfPreviewProps) {
  const [imageUrl, setImageUrl] = useState<string | undefined>()
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | undefined

    void (async () => {
      setStatus('loading')
      setImageUrl(undefined)
      try {
        const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer())
        if (cancelled) return
        objectUrl = extractJpegObjectUrl(bytes) ?? undefined
        if (objectUrl) {
          setImageUrl(objectUrl)
          setStatus('ready')
          return
        }
        setStatus('fallback')
      } catch {
        if (!cancelled) setStatus('fallback')
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url])

  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center overflow-hidden p-4',
        fill
          ? 'min-h-0'
          : compact
            ? 'min-h-40 max-h-64'
            : 'min-h-48 max-h-[28rem]',
      )}
      role="img"
      aria-label={name}
      title={name}
    >
      {status === 'loading' ? (
        <div
          className="h-[70%] w-[min(100%,18rem)] animate-pulse rounded-md bg-foreground/6"
          aria-hidden
        />
      ) : null}
      {status === 'ready' && imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="block max-h-full max-w-full rounded-sm object-contain shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]"
        />
      ) : null}
      {status === 'fallback' ? (
        <div className="grid gap-2 p-5 text-center text-[0.8125rem] leading-snug text-muted-foreground">
          <p className="m-0">Inline preview isn’t available for this PDF.</p>
          <a
            className="font-medium text-primary underline-offset-2 hover:underline"
            href={url}
            download={name}
          >
            Download {name}
          </a>
        </div>
      ) : null}
    </div>
  )
}
