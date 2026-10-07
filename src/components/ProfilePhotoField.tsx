import { useId, useRef, type ChangeEvent, type ReactNode } from 'react'
import { Camera, X } from 'lucide-react'
import { Avatar } from '@/components/ui'

const MAX_BYTES = 2 * 1024 * 1024

type ProfilePhotoFieldProps = {
  name?: string
  fallbackName?: string
  value?: string
  onChange: (photoUrl: string | undefined) => void
  encodeFile?: (file: File) => Promise<string>
  children?: ReactNode
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

export function ProfilePhotoField({
  name,
  fallbackName = 'Sub Agent',
  value,
  onChange,
  encodeFile,
  children,
}: ProfilePhotoFieldProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadLabel = value ? 'Change photo' : 'Upload photo'

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
      onChange(await (encodeFile ?? readImageAsDataUrl)(file))
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Unable to read that image. Try another file.',
      )
    }
  }

  return (
    <div className="pd-profile-photo">
      <div className="pd-profile-photo__control">
        <Avatar name={name || fallbackName} src={value} size="xl" />
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="pd-profile-photo__input"
          onChange={handleFile}
        />
        <button
          type="button"
          className="pd-profile-photo__upload"
          aria-label={uploadLabel}
          title="JPG, PNG or WebP · max 2 MB"
          onClick={() => inputRef.current?.click()}
        >
          <Camera size={18} strokeWidth={2} aria-hidden />
        </button>
        {value ? (
          <button
            type="button"
            className="pd-profile-photo__remove"
            aria-label="Remove photo"
            onClick={() => onChange(undefined)}
          >
            <X size={12} strokeWidth={2.5} aria-hidden />
          </button>
        ) : null}
      </div>
      {children ? (
        <div className="pd-profile-photo__name">{children}</div>
      ) : null}
    </div>
  )
}
