import { useEffect, useState } from 'react'
import { fetchAuthedBlob, isPlatformFileUrl } from '@/lib/fileStore'

/** A url an image or iframe can open. Stored files are fetched with the sign-in token. */
export function usePreviewUrl(source: string | undefined): {
  previewUrl: string | undefined
  previewFailed: boolean
} {
  const direct = Boolean(source) && !isPlatformFileUrl(source ?? '')
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(
    direct ? source : undefined,
  )
  const [previewFailed, setPreviewFailed] = useState(false)

  useEffect(() => {
    if (!source || !isPlatformFileUrl(source)) {
      setPreviewUrl(source)
      setPreviewFailed(false)
      return
    }

    let objectUrl: string | undefined
    let cancelled = false
    setPreviewUrl(undefined)
    setPreviewFailed(false)
    void fetchAuthedBlob(source)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setPreviewUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setPreviewFailed(true)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [source])

  return { previewUrl, previewFailed }
}
