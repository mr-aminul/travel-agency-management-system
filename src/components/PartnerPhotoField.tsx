import { useId, useRef, type ChangeEvent } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { Avatar, Button } from '@/components/ui'

const MAX_BYTES = 2 * 1024 * 1024

type PartnerPhotoFieldProps = {
  name?: string
  fallbackName?: string
  value?: string
  onChange: (photoUrl: string | undefined) => void
}

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () =>
      reject(reader.error ?? new Error('Unable to read image'))
    reader.readAsDataURL(file)
  })
}

export function PartnerPhotoField({
  name,
  fallbackName = 'Sub Agent',
  value,
  onChange,
}: PartnerPhotoFieldProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > MAX_BYTES) {
      window.alert('Please choose an image under 2 MB.')
      return
    }
    try {
      onChange(await readImageAsDataUrl(file))
    } catch {
      window.alert('Unable to read that image. Try another file.')
    }
  }

  return (
    <div className="pd-partner-photo">
      <Avatar name={name || fallbackName} src={value} size="xl" />
      <div className="pd-partner-photo__actions">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="pd-partner-photo__input"
          onChange={handleFile}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <Camera size={14} strokeWidth={2} aria-hidden />
          {value ? 'Change photo' : 'Upload photo'}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(undefined)}
          >
            <Trash2 size={14} strokeWidth={2} aria-hidden />
            Remove
          </Button>
        ) : null}
        <p className="pd-partner-photo__hint">JPG, PNG or WebP · max 2 MB</p>
      </div>
    </div>
  )
}
